# PR #9 — Diagnose Report

**Date:** 2026-04-19
**Branch:** `feat/pr-9-timesheet-grid`
**Commit:** `26bf927`
**Author:** Claude Code (diagnose only — no edits, no commits)

---

## Executive Summary

**(a) Is the RPC math correct?** YES. The `generate_payroll_batch` RPC has three branches that correctly implement Rules Locked §§5.1–5.3. Contract/Subcontract workers get flat-rate pay with OT pay hardcoded to 0. Permanent Staff get `basic/30/8 × 1.25` for OT1 and `× 1.50` for OT2. Office Staff get basic + allowances with no OT. PR #9 does NOT need to modify the RPC math.

**(b) Where does the OT-split logic belong?** Option C — both. Client-side `splitHours()` for instant feedback as HR types, server-side validation on Save All as the authoritative split. The RPC trusts `timesheet_lines.ot_hours` and `holiday_hours` as inputs — garbage in, garbage out — so the split must be correct at capture time.

**(c) Is scope deliverable in one PR?** Yes, but it's the largest PR yet. The grid UI is the bulk of the work. The other 8 items are surgical 5–30 line changes each. Recommend implementing in the order proposed in §11.3 so each piece can be tested independently.

---

## Section 1 — Verify `generate_payroll_batch` RPC

### 1.1 Full Source

Found in `scripts/migrations/007_payroll_pipeline.sql` lines 33–269.

```sql
CREATE OR REPLACE FUNCTION public.generate_payroll_batch(
  p_month       INTEGER,
  p_year        INTEGER,
  p_month_label TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch_id   UUID;
  v_unapproved INTEGER;
  v_line_count INTEGER := 0;
  v_rows       INTEGER;
BEGIN
  -- 1. Guard: no duplicate batch
  IF EXISTS (SELECT 1 FROM payroll_batches WHERE month = p_month AND year = p_year) THEN
    RAISE EXCEPTION 'Payroll batch already exists for %', p_month_label;
  END IF;

  -- 2. Guard: all timesheets for this period must be hr_approved
  SELECT COUNT(*) INTO v_unapproved
    FROM timesheet_headers
   WHERE month = p_month AND year = p_year
     AND status != 'hr_approved';
  IF v_unapproved > 0 THEN
    RAISE EXCEPTION '% timesheet(s) not yet HR-approved for this period', v_unapproved;
  END IF;

  -- 3. Create batch
  INSERT INTO payroll_batches (month, year, month_label, status)
  VALUES (p_month, p_year, p_month_label, 'draft')
  RETURNING id INTO v_batch_id;

  -- 4a. Contract + Subcontract — flat hourly, no OT premium
  INSERT INTO payroll_lines (
    batch_id, worker_id, basic_salary,
    housing_allowance, transport_allowance, food_allowance, other_allowance, allowances_total,
    base_hourly_rate, rate_used,
    ot1_hours, ot1_pay, ot2_hours, ot2_pay,
    total_hours, gross_pay,
    deductions_total, net_pay,
    payment_method, c3_status, payroll_type, ramadan_mode
  )
  SELECT
    v_batch_id, w.id,
    ROUND(COALESCE(agg.sum_total_hours, 0) * w.hourly_rate, 2),
    0, 0, 0, 0, 0,
    w.hourly_rate, w.hourly_rate,
    COALESCE(agg.sum_ot_hours, 0),
    0,                                          -- ot1_pay = 0 (FLAT)
    COALESCE(agg.sum_holiday_hours, 0),
    0,                                          -- ot2_pay = 0 (FLAT)
    COALESCE(agg.sum_total_hours, 0),
    ROUND(COALESCE(agg.sum_total_hours, 0) * w.hourly_rate, 2),
    0,
    ROUND(COALESCE(agg.sum_total_hours, 0) * w.hourly_rate, 2),
    w.payment_method, w.c3_status,
    'hourly',
    COALESCE(
      (SELECT bool_or(th.ramadan_mode) FROM timesheet_headers th
       WHERE th.month = p_month AND th.year = p_year AND th.status = 'hr_approved'), false
    )
  FROM workers w
  JOIN (
    SELECT tl.worker_id,
      SUM(tl.total_hours) AS sum_total_hours,
      SUM(tl.normal_hours) AS sum_normal_hours,
      SUM(tl.ot_hours) AS sum_ot_hours,
      SUM(tl.holiday_hours) AS sum_holiday_hours
    FROM timesheet_lines tl
    JOIN timesheet_headers th ON th.id = tl.header_id
    WHERE th.month = p_month AND th.year = p_year AND th.status = 'hr_approved'
    GROUP BY tl.worker_id
  ) agg ON agg.worker_id = w.id
  WHERE w.category IN ('Contract Worker', 'Subcontract Worker')
    AND w.status = 'active';

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_line_count := v_rows;

  -- 4b. Permanent Staff — monthly + OT
  INSERT INTO payroll_lines (
    batch_id, worker_id, basic_salary,
    housing_allowance, transport_allowance, food_allowance, other_allowance, allowances_total,
    base_hourly_rate, rate_used,
    ot1_hours, ot1_pay, ot2_hours, ot2_pay,
    total_hours, gross_pay,
    deductions_total, net_pay,
    payment_method, c3_status, payroll_type, ramadan_mode
  )
  SELECT
    v_batch_id, w.id,
    w.monthly_salary,
    COALESCE(w.housing_allowance, 0), COALESCE(w.transport_allowance, 0),
    COALESCE(w.food_allowance, 0), COALESCE(w.other_allowance, 0),
    COALESCE(w.housing_allowance,0) + COALESCE(w.transport_allowance,0)
      + COALESCE(w.food_allowance,0) + COALESCE(w.other_allowance,0),
    ROUND(w.monthly_salary / 30.0 / 8.0, 4),
    NULL,
    COALESCE(agg.sum_ot_hours, 0),
    ROUND(COALESCE(agg.sum_ot_hours, 0) * (w.monthly_salary / 30.0 / 8.0) * 1.25, 2),
    COALESCE(agg.sum_holiday_hours, 0),
    ROUND(COALESCE(agg.sum_holiday_hours, 0) * (w.monthly_salary / 30.0 / 8.0) * 1.50, 2),
    COALESCE(agg.sum_total_hours, 0),
    ROUND(
      w.monthly_salary
      + COALESCE(w.housing_allowance,0) + COALESCE(w.transport_allowance,0)
      + COALESCE(w.food_allowance,0) + COALESCE(w.other_allowance,0)
      + COALESCE(agg.sum_ot_hours, 0) * (w.monthly_salary / 30.0 / 8.0) * 1.25
      + COALESCE(agg.sum_holiday_hours, 0) * (w.monthly_salary / 30.0 / 8.0) * 1.50
    , 2),
    0,
    ROUND(
      w.monthly_salary
      + COALESCE(w.housing_allowance,0) + COALESCE(w.transport_allowance,0)
      + COALESCE(w.food_allowance,0) + COALESCE(w.other_allowance,0)
      + COALESCE(agg.sum_ot_hours, 0) * (w.monthly_salary / 30.0 / 8.0) * 1.25
      + COALESCE(agg.sum_holiday_hours, 0) * (w.monthly_salary / 30.0 / 8.0) * 1.50
    , 2),
    w.payment_method, w.c3_status,
    'monthly',
    COALESCE(
      (SELECT bool_or(th.ramadan_mode) FROM timesheet_headers th
       WHERE th.month = p_month AND th.year = p_year AND th.status = 'hr_approved'), false
    )
  FROM workers w
  LEFT JOIN (
    SELECT tl.worker_id,
      SUM(tl.total_hours) AS sum_total_hours,
      SUM(tl.ot_hours) AS sum_ot_hours,
      SUM(tl.holiday_hours) AS sum_holiday_hours
    FROM timesheet_lines tl
    JOIN timesheet_headers th ON th.id = tl.header_id
    WHERE th.month = p_month AND th.year = p_year AND th.status = 'hr_approved'
    GROUP BY tl.worker_id
  ) agg ON agg.worker_id = w.id
  WHERE w.category = 'Permanent Staff'
    AND w.status = 'active';

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_line_count := v_line_count + v_rows;

  -- 4c. Office Staff — flat monthly, no timesheets
  INSERT INTO payroll_lines (
    batch_id, worker_id, basic_salary,
    housing_allowance, transport_allowance, food_allowance, other_allowance, allowances_total,
    base_hourly_rate, rate_used,
    ot1_hours, ot1_pay, ot2_hours, ot2_pay,
    total_hours, gross_pay,
    deductions_total, net_pay,
    payment_method, c3_status, payroll_type, ramadan_mode
  )
  SELECT
    v_batch_id, w.id,
    w.monthly_salary,
    COALESCE(w.housing_allowance, 0), COALESCE(w.transport_allowance, 0),
    COALESCE(w.food_allowance, 0), COALESCE(w.other_allowance, 0),
    COALESCE(w.housing_allowance,0) + COALESCE(w.transport_allowance,0)
      + COALESCE(w.food_allowance,0) + COALESCE(w.other_allowance,0),
    ROUND(w.monthly_salary / 30.0 / 8.0, 4),
    NULL,
    0, 0, 0, 0,   -- no OT for office staff
    NULL,          -- no timesheet hours
    ROUND(
      w.monthly_salary
      + COALESCE(w.housing_allowance,0) + COALESCE(w.transport_allowance,0)
      + COALESCE(w.food_allowance,0) + COALESCE(w.other_allowance,0)
    , 2),
    0,
    ROUND(
      w.monthly_salary
      + COALESCE(w.housing_allowance,0) + COALESCE(w.transport_allowance,0)
      + COALESCE(w.food_allowance,0) + COALESCE(w.other_allowance,0)
    , 2),
    w.payment_method, w.c3_status,
    'monthly',
    false
  FROM workers w
  WHERE w.category = 'Office Staff'
    AND w.status = 'active';

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_line_count := v_line_count + v_rows;

  -- 5. Update batch with totals
  UPDATE payroll_batches SET
    total_gross      = (SELECT COALESCE(SUM(gross_pay), 0)  FROM payroll_lines WHERE batch_id = v_batch_id),
    total_deductions = (SELECT COALESCE(SUM(deductions_total), 0) FROM payroll_lines WHERE batch_id = v_batch_id),
    total_net        = (SELECT COALESCE(SUM(net_pay), 0)    FROM payroll_lines WHERE batch_id = v_batch_id),
    wps_total        = (SELECT COALESCE(SUM(net_pay), 0)    FROM payroll_lines WHERE batch_id = v_batch_id AND payment_method = 'WPS'),
    non_wps_total    = (SELECT COALESCE(SUM(net_pay), 0)    FROM payroll_lines WHERE batch_id = v_batch_id AND payment_method = 'Non-WPS'),
    cash_total       = (SELECT COALESCE(SUM(net_pay), 0)    FROM payroll_lines WHERE batch_id = v_batch_id AND payment_method = 'Cash'),
    worker_count     = v_line_count,
    status           = 'calculated',
    updated_at       = now()
  WHERE id = v_batch_id;

  RETURN v_batch_id;
END;
$$;
```

### 1.2 Branch-by-Branch Walk-Through

**Branch 4a — Contract + Subcontract Workers**

- **WHERE clause:** `w.category IN ('Contract Worker', 'Subcontract Worker') AND w.status = 'active'`
- **Basic salary:** `ROUND(COALESCE(agg.sum_total_hours, 0) * w.hourly_rate, 2)` — total hours × flat rate
- **OT1 pay:** Hardcoded `0` ✅
- **OT2 pay:** Hardcoded `0` ✅
- **Gross pay:** Same as basic: `total_hours × hourly_rate`
- **Allowances:** All zero ✅
- **Uses INNER JOIN** on timesheet aggregate — workers without timesheet lines are excluded (correct: no hours = no pay)
- **Rules Locked §5.3 match:** ✅ PASS

**Branch 4b — Permanent Staff**

- **WHERE clause:** `w.category = 'Permanent Staff' AND w.status = 'active'`
- **Basic salary:** `w.monthly_salary`
- **OT1 pay:** `COALESCE(agg.sum_ot_hours, 0) * (w.monthly_salary / 30.0 / 8.0) * 1.25` ✅
- **OT2 pay:** `COALESCE(agg.sum_holiday_hours, 0) * (w.monthly_salary / 30.0 / 8.0) * 1.50` ✅
- **Gross:** `monthly_salary + allowances + OT1 + OT2` ✅
- **Uses LEFT JOIN** on timesheet aggregate — Permanent Staff get their salary even without timesheet lines (correct: monthly salary is base)
- **Rules Locked §5.1 match:** ✅ PASS

**Branch 4c — Office Staff**

- **WHERE clause:** `w.category = 'Office Staff' AND w.status = 'active'`
- **No timesheet JOIN** — correct ✅
- **OT1/OT2 hours and pay:** All hardcoded `0` ✅
- **total_hours:** `NULL` ✅
- **Gross:** `monthly_salary + allowances` ✅
- **Rules Locked §5.2 match:** ✅ PASS

### 1.3 Specific Confirmations

- ✅ Branch 4a: `ot1_pay` and `ot2_pay` are literal `0` even when ot_hours > 0
- ✅ Branch 4b: `ot1_pay = ot_hours × (basic / 30 / 8 × 1.25)`, `ot2_pay = holiday_hours × (basic / 30 / 8 × 1.50)`
- ✅ Branch 4c: Both OT pays are `0`, no timesheet JOIN

### 1.4 Verdict

**RPC math is correct.** All three branches match Rules Locked §§5.1–5.3 exactly. PR #9 does NOT modify the RPC — the fix is at the capture step only (getting correct values into `timesheet_lines.normal_hours`, `ot_hours`, `holiday_hours` before the RPC reads them).

**One minor note:** Both branch 4b (Permanent Staff) and 4c (Office Staff) write `payroll_type = 'monthly'`. After PR #9's enum rename, branch 4b should write `'salaried_with_ot'` and 4c should write `'salaried_no_ot'`. This is a controlled RPC update bundled with the migration — see §6.

---

## Section 2 — Current Timesheet Capture Path

### 2.1 Current Code Location

**File:** `app/timesheets/page.js` (273 lines)
**Roles:** No role gating — any authenticated user can access.
**Main functions:**
- `handleFileUpload()` (line 62) — parses Excel, matches workers
- `handleSaveAndPayroll()` (line 82) — writes to mock store, saves to localStorage
- `handleApproval()` (line 114) — updates header status in mock store

**Critical issue:** This page imports from `../../lib/mockStore` (line 8), NOT from `lib/timesheetService.js`. It writes to in-memory mock arrays, not to Supabase. The data never reaches the database. The Supabase-backed `timesheetService.js` exists (line 1: `import { supabase } from './supabaseClient'`) but is only used by `app/payroll-run/page.js`.

### 2.2 How Current Code Populates Split Columns

The timesheets page calls `calculateHourlyPay()` from mockStore (line 97):

```javascript
const calc = calculateHourlyPay(worker, dateStr, hrs)
```

But in `lib/mockStore.js` line 158:

```javascript
export const calculateHourlyPay = (_worker, _date, _hours) => 0
```

**This is a stub that returns `0`.** It returns a number, not an object with `normal_hours`/`ot_hours`/`holiday_hours` properties. The code on line 98-100 reads `calc.normal_hours`, `calc.ot_hours`, `calc.holiday_hours` — all of which resolve to `undefined` → `0`.

**Result:** All split columns are always zero regardless of input. There is:
- ❌ **No 8hr threshold logic anywhere**
- ❌ **No 6hr Ramadan threshold logic anywhere**
- ❌ **No Friday detection logic** (irrelevant per Rules Locked §2 — Friday is a normal working day)
- ❌ **No rest-day (Sunday) detection logic**
- ❌ **No public_holidays table lookup** in the capture path
- ❌ No split logic of any kind — the entire capture path is a dead end writing to mock stores

### 2.3 Flag Columns on `timesheet_lines`

From the REST API sample, the schema has these columns:

| Column | Type | Present? |
|---|---|---|
| `id` | uuid | ✅ |
| `header_id` | uuid | ✅ |
| `worker_id` | uuid | ✅ |
| `work_date` | date | ✅ |
| `total_hours` | numeric | ✅ |
| `normal_hours` | numeric | ✅ |
| `ot_hours` | numeric | ✅ |
| `holiday_hours` | numeric | ✅ |
| `is_public_holiday` | boolean | ✅ |
| `is_friday` | boolean | ✅ |
| `pay_amount` | numeric | ✅ |
| `client_hours` | numeric | ✅ |
| `discrepancy` | numeric | ✅ |
| `created_at` | timestamptz | ✅ |

**Missing column needed for PR #9:** `is_rest_day` boolean — not present. Only `is_friday` exists (which per Rules Locked §2 is irrelevant — Friday is a normal working day at Innovation). Need to add `is_rest_day` column.

**Current flag values across all 160 rows:**
- `is_friday = false` on all rows
- `is_public_holiday = false` on all rows

Neither flag is populated. The seeded March data was bulk-inserted without day-type classification.

### 2.4 Permanent Staff Capture Path

**Confirmed blocker.** There are:
- 4 active Permanent Staff workers: Arun Kumar (IWS-2026-0001), Priya Menon (IWS-2026-0010), Innovation LLC (IWS-2026-0030), Innovation LLC (IWS-2026-0032)
- **Zero** `timesheet_lines` rows for any of them
- The March payroll lines for these 4 workers show `total_hours = 0`, `ot1_hours = 0`, `ot2_hours = 0`

The RPC uses a LEFT JOIN for Permanent Staff, so they get their base salary even without timesheet lines. But OT is always zero because there are no hours to sum.

**Why they can't enter hours today:**
1. The timesheets page (`app/timesheets/page.js`) only supports client-named Excel uploads
2. There is no "Innovation Internal" client in the `clients` table (4 clients exist: ADSB, Gulf Marine, Harbor Fit-Out, ADNOC Offshore — all external)
3. Even if a timesheet were uploaded, it writes to the mock store, not Supabase
4. The payroll-run page reads from Supabase via `timesheetService.js`, not from the mock store

### 2.5 Uniqueness Constraint

Cannot query `pg_constraint` via REST API. However, the `timesheet_lines` table does NOT have a unique constraint on `(worker_id, work_date, header_id)` based on the migration files. The migration `007_payroll_pipeline.sql` creates the table without such a constraint.

**Action needed:** Add unique constraint for grid upsert support:
```sql
ALTER TABLE timesheet_lines
ADD CONSTRAINT uq_timesheet_lines_worker_date_header
UNIQUE (worker_id, work_date, header_id);
```

---

## Section 3 — Master Grid UI Design

### 3.1 Route

**Recommendation: Option A** — `/timesheets/grid?client=X&month=Y&year=Z`

Justification:
- Query params are simpler than dynamic segments for a page that always has all three selectors visible in the toolbar
- The month/year/client combination is a transient view state, not a persistent resource
- Avoids slug-encoding issues with client names like "Abu Dhabi Ship Building (ADSB)"
- Existing `/timesheets` page can link to `/timesheets/grid` with pre-filled params

### 3.2 Grid Shape

Per Rules Locked §4.1:

```
┌─────────────────────────────────────────────────────────────────┐
│ [Month ▼] [Client ▼] [☐ Ramadan] [Upload Excel] [Save All] [Generate Payroll] │
├────────────┬─────┬─────┬─────┬───...───┬─────┬───────────────┤
│ Worker     │ D1  │ D2  │ D3  │   ...   │ D31 │ Norm│OT1│OT2│Tot│
├────────────┼─────┼─────┼─────┼───...───┼─────┼───────────────┤
│ Arun Kumar │ [8] │ [10]│ [_] │         │     │  16 │  2 │  0│ 18│
│ IWS-0001   │     │     │     │         │     │     │    │   │   │
├────────────┼─────┼─────┼─────┼───...───┼─────┼───────────────┤
│ ...        │     │     │     │         │     │     │    │   │   │
├────────────┼─────┼─────┼─────┼───...───┼─────┼───────────────┤
│ Daily Total│  24 │  30 │   0 │         │     │     │    │   │   │
└────────────┴─────┴─────┴─────┴───...───┴─────┴───────────────┘
```

**Column styling:**
- Rest-day cells (Sunday default, Saturday if overridden): **amber** background
- Public holiday cells: **red** background with holiday name tooltip
- Friday cells: **no special styling** (Friday = normal working day per §2)
- Unsaved cells: yellow outline
- Absent-flagged cells: red text

### 3.3 Per-Cell Split Logic

**Recommendation: Option C — both.** Client-side preview, server validates.

- Client-side: instant recompute on `onChange` for immediate feedback in the right-panel summary
- Server-side: `splitHours()` runs again on Save All and is the authoritative source

Function signature:

```javascript
/**
 * @param {number} totalHours - HR-entered total (already capped at 16)
 * @param {'working'|'rest_day'|'public_holiday'} dayType
 * @param {boolean} ramadanMode
 * @returns {{ normal_hours: number, ot_hours: number, holiday_hours: number }}
 */
function splitHours(totalHours, dayType, ramadanMode) {
  if (totalHours <= 0) return { normal_hours: 0, ot_hours: 0, holiday_hours: 0 }
  if (dayType === 'rest_day' || dayType === 'public_holiday') {
    return { normal_hours: 0, ot_hours: 0, holiday_hours: totalHours }
  }
  // Working day
  const threshold = ramadanMode ? 6 : 8
  const normal = Math.min(totalHours, threshold)
  const ot = totalHours - normal
  return { normal_hours: normal, ot_hours: ot, holiday_hours: 0 }
}
```

This matches Rules Locked §4.6 examples exactly:
- 10 on Monday, no Ramadan → `{8, 2, 0}` ✅
- 7 on Monday, Ramadan → `{6, 1, 0}` ✅
- 10 on Sunday (rest) → `{0, 0, 10}` ✅
- 8 on Eid → `{0, 0, 8}` ✅

### 3.4 Data Persistence

Each cell = one `timesheet_lines` row keyed on `(worker_id, work_date, header_id)`.

**Proposed approach:**
- Upsert via `ON CONFLICT (worker_id, work_date, header_id) DO UPDATE`
- Save All button sends batch upsert (all cells in one RPC call, not 31×N individual calls)
- Per-cell save state indicator: saving → saved → error
- Auto-save NOT recommended — Save All is explicit and safer for a payroll surface

**Schema change needed:** Add unique constraint (see §2.5).

### 3.5 "Innovation Internal" Pseudo-Client

**Recommendation: Option A** — INSERT a real `clients` row with `is_internal = true`.

```sql
ALTER TABLE clients ADD COLUMN is_internal BOOLEAN DEFAULT FALSE;
INSERT INTO clients (name, code, is_internal)
VALUES ('Innovation Internal', 'INNOVATION', TRUE);
```

**Why not Option B (NULL client_id):**
- NULL semantics are ambiguous — could mean "unassigned" or "error"
- The RPC joins on `timesheet_headers.client_id` → a NULL would require special-case handling
- A real row keeps the grid selector uniform — HR picks "Innovation Internal" from the same dropdown

### 3.6 Day Classification Utility

**Proposed:** `lib/dateUtils.js`

```javascript
/**
 * @param {Date|string} workDate
 * @param {string} workerRestDay - 'sunday' or 'saturday'
 * @param {Array<{date: string, name: string}>} publicHolidays
 * @returns {'working'|'rest_day'|'public_holiday'}
 */
export function classifyDay(workDate, workerRestDay, publicHolidays) {
  const d = new Date(workDate)
  const dateStr = d.toISOString().split('T')[0]
  // Public holidays take precedence
  if (publicHolidays.some(h => h.date === dateStr)) return 'public_holiday'
  // Rest day check
  const dayOfWeek = d.getDay() // 0=Sun, 6=Sat
  if (workerRestDay === 'sunday' && dayOfWeek === 0) return 'rest_day'
  if (workerRestDay === 'saturday' && dayOfWeek === 6) return 'rest_day'
  return 'working'
}
```

**Public holidays verification:** 11 rows seeded for 2026 ✅
- New Year (Jan 1), Eid Al Fitr (Mar 30-Apr 1), Arafat+Eid Al Adha (Jun 6-9), Islamic New Year (Jul 28), UAE National Day (Dec 2-3)

### 3.7 Edit-Until-Generate Lock

**Recommendation:** Detect via `payroll_batches.status`.

When "Generate Payroll" creates a batch for month M/year Y, the grid for that month becomes read-only. Detect by:

```javascript
const batch = await getPayrollBatchByMonthYear(month, year)
const isLocked = batch && batch.status !== 'deleted'
```

No new column needed. The existing `payroll_batches` table already has the required state. Unlock = Owner deletes/resets the batch (existing PR #7 flow).

**Why not a new `grid_locked` column:** Adding another lock state creates synchronisation risk between `payroll_batches.status` and `timesheet_headers.grid_locked`. Single source of truth is better.

### 3.8 16-Hour Hard Cap

**Recommendation:** `onBlur` normalise.

```javascript
const onCellBlur = (value) => {
  let v = parseFloat(value)
  if (isNaN(v) || v < 0) v = 0
  if (v > 16) v = 16
  v = Math.round(v * 10) / 10  // 1 decimal place
  return v
}
```

- `onBlur` rather than `onChange` so HR can type "17" and see it clamped when they leave the cell
- Visual feedback: brief flash / tooltip "Capped to 16h" when clamping occurs
- Input `type="number"` with `step="0.5"` and `max="16"` for HTML-level hint

### 3.9 Blank Cell Semantics

Per Rules Locked §4.3 + §6.3:

**During edit:**
- Blank = no `timesheet_lines` row exists (NULL). No flag.

**During Generate Payroll:**
- System iterates all `worker × working_day` combinations for the month
- For each working day where no `timesheet_lines` row exists (or total_hours = 0): flag as unauthorised absent
- For days where total_hours > 0 but < 4: also flag (Rules Locked §6.1)

**Proposed storage:**
- Blank = row does NOT exist (no synthetic zero rows during edit)
- Generate Payroll synthesises missing rows with `total_hours = 0, normal_hours = 0, ot_hours = 0, holiday_hours = 0` and a status flag
- Add column: `timesheet_lines.absence_status TEXT DEFAULT NULL` with values:
  - `NULL` = normal
  - `'unauthorised'` = blank or < 4h on working day, unflagged
  - `'sick_cert'` = HR attached sick certificate
  - `'approved_leave'` = HR approved leave
  - `'short_authorised'` = < 4h but authorised

---

## Section 4 — Excel Upload Quick-Fill

### 4.1 Existing XLSX Parsing

Found in 3 files:

1. **`lib/excelParser.js`** — Primary parser. Functions:
   - `parseClientTimesheet(file)` — parses Excel, detects headers, extracts daily hours
   - `validateTimesheetMonth(parsedData, selectedMonth, selectedYear)` — validates month/year match
   - `matchWorkerToIWS(clientName, iwsWorkers)` — name matching (exact → first name → last name → word overlap)
   
2. **`app/payroll-run/page.js`** — imports from `lib/timesheetService.js` (Supabase-backed)

3. **`app/timesheet-reconcile/page.js`** — reconciliation page, also imports xlsx

**The existing `lib/excelParser.js` is well-structured** and handles:
- Auto-detect month/year from header rows
- Auto-detect name column and day columns
- Special values (S/O, A, MC, etc.)
- Total/rate/gross column detection

### 4.2 Proposed Flow for Grid Quick-Fill

1. HR opens grid for client X, month Y
2. Clicks "Upload Excel" → file picker modal
3. On select: `parseClientTimesheet(file)` runs (reuse existing parser)
4. Match rows to workers by `matchWorkerToIWS()` (reuse existing matcher)
5. Pre-fill grid cells with yellow highlight ("needs review")
6. Unmatched workers shown in dismissable banner at top
7. HR reviews cells, edits as needed
8. Clicks "Save All" — saves all cells (yellow → white)

**Match logic recommendation:** Use existing `matchWorkerToIWS()` — it already does exact → first-name → last-name → word-overlap matching. Good enough for the 25-worker scale.

### 4.3 ADSB Format

3 existing timesheet headers in DB are for:
- "Company A — Al Faris Industrial Services"
- "Company B — Gulf Peak Contracting LLC"
- "Company C — Delta Force Manpower Solutions"

None are ADSB. The ADSB format is not yet in the system. The parser's auto-detection should handle standard formats. ADSB-specific column mapping can be added if/when a real ADSB timesheet is provided.

### 4.4 Edge Cases

- **Excel has workers not in grid:** Show in "Couldn't match" list, skip cells
- **Excel has fewer workers:** Blank cells remain blank
- **Excel totals mismatch:** Warn with banner showing expected vs actual, don't block
- **Merged cells / formulas:** `xlsx` library handles formulas by reading computed values. Merged cells read from top-left cell. The existing parser handles this via `defval: ''`.

---

## Section 5 — Payslip Template Patches

### 5.1 "Authorised Signatory" — Locations to Remove

In `lib/letterTemplates.js`:

**Payslip (flat rate variant):** Line 374
```html
<div style="font-size:7pt;color:#475569">Authorised Signatory: ____________________</div>
```

**Payslip (monthly salaried variant):** Lines 425-426
```html
<div style="font-size:7pt;color:#475569;margin-bottom:3px">Authorised Signatory</div>
<div style="font-size:7pt;color:#475569">Signature: ____________________</div>
```

**Propose:** Remove the entire signatory `div` block from both variants. Replace with:
```html
<div style="font-size:7pt;color:#94a3b8;text-align:right">Digitally issued via IWS</div>
```

**Note:** The "Authorised Signatory" in `offerLetterHTML` (line 148), `experienceLetterHTML` (line 253), and `resignationAcceptanceHTML` (line 476) should NOT be removed — those are physical-signature documents, not digitally distributed payslips.

### 5.2 OT Rate Display for Permanent Staff

**Current conditional (lines 397-398):**
```javascript
${(pl.ot_hours||0) > 0 ? `<tr>...OT Weekday...</tr>` : ''}
${(pl.holiday_hours||0) > 0 ? `<tr>...OT Fri/Holiday...</tr>` : ''}
```

OT lines only render when hours > 0. Per Rules Locked §9.2, they must render **always** for Permanent Staff (showing the rate even at zero).

**Proposed new conditional:**
```javascript
${(!isOffice) ? `<tr><td style="padding:3px 0;color:#d97706">OT1 Weekday (${pl.ot_hours||0}h × ${fmtAED(baseRate)} × 1.25)</td><td style="text-align:right;color:#d97706">${fmtAED(ot1Pay)}</td></tr>` : ''}
${(!isOffice) ? `<tr><td style="padding:3px 0;color:#dc2626">OT2 Rest/Holiday (${pl.holiday_hours||0}h × ${fmtAED(baseRate)} × 1.50)</td><td style="text-align:right;color:#dc2626">${fmtAED(ot2Pay)}</td></tr>` : ''}
```

When `ot_hours = 0`, this renders: `OT1 Weekday (0h × AED 25.83 × 1.25) — AED 0.00`
This shows the worker their OT rate even when no OT was worked.

**Office Staff:** `isOffice = true` → OT lines hidden entirely ✅

### 5.3 Category-Based Variant

**Current branching:** `isFlat` (Contract/Subcontract) vs everything else, with `isOffice` sub-branch.

The current structure already has the three variants in place:
1. `isFlat` → hours × rate, no allowances, no OT lines (lines 331-376)
2. `isOffice` → basic + itemised allowances, no OT lines (lines 392-396)
3. Permanent Staff → basic + allowances + OT1 + OT2 (lines 379-398)

**After PR #9:** The `isFlat` check uses `worker.category`. The `isOffice` check also uses `worker.category`. Both are already category-based — no change to branching logic needed.

The only change is removing the `> 0` conditional on OT lines for Permanent Staff (§5.2 above).

---

## Section 6 — `payroll_type` Enum Rename

### 6.1 Current Values Distribution

From REST API query of all 14 `payroll_lines` rows:

| payroll_type | count |
|---|---|
| `hourly` | 8 |
| `monthly` | 6 |

### 6.2 Column Type

From the sample row, `payroll_type` is a `text` column (not a Postgres ENUM type). It likely has a CHECK constraint. The migration file (`007_payroll_pipeline.sql`) would define this.

### 6.3 Proposed Migration: `010_payroll_type_values.sql`

```sql
-- Step 1: If there's a CHECK constraint, drop it temporarily
ALTER TABLE payroll_lines DROP CONSTRAINT IF EXISTS payroll_lines_payroll_type_check;

-- Step 2: Backfill existing rows
UPDATE payroll_lines pl
SET payroll_type = CASE
  WHEN w.category = 'Permanent Staff' THEN 'salaried_with_ot'
  WHEN w.category = 'Office Staff'    THEN 'salaried_no_ot'
  ELSE 'flat_hourly'
END
FROM workers w
WHERE pl.worker_id = w.id;

-- Step 3: Add new CHECK constraint
ALTER TABLE payroll_lines
ADD CONSTRAINT payroll_lines_payroll_type_check
CHECK (payroll_type IN ('salaried_with_ot', 'salaried_no_ot', 'flat_hourly'));

-- Step 4: Verify
-- SELECT payroll_type, COUNT(*) FROM payroll_lines GROUP BY 1;
-- Expected: salaried_with_ot=4, salaried_no_ot=2, flat_hourly=8
```

### 6.4 RPC Update

Must also `CREATE OR REPLACE` the `generate_payroll_batch` function to write new values:
- Branch 4a: `'flat_hourly'` (was `'hourly'`)
- Branch 4b: `'salaried_with_ot'` (was `'monthly'`)
- Branch 4c: `'salaried_no_ot'` (was `'monthly'`)

**Ordering:** Migration must run BEFORE the RPC update. Otherwise the new RPC writes values that violate the old CHECK.

Actually — the migration drops the old CHECK and adds the new one in one go. The RPC update can be in the same migration file since it's a `CREATE OR REPLACE`. Recommended: include both in `010_payroll_type_values.sql`.

---

## Section 7 — Workers Table: `rest_day` + `preferred_language`

### 7.1 Current Workers Schema

From REST API sample, the workers table has these columns (relevant subset):

| Column | Present? |
|---|---|
| `id`, `worker_number`, `first_name`, `last_name`, `full_name` | ✅ |
| `nationality`, `passport_number`, `passport_expiry` | ✅ |
| `category`, `status`, `trade_role` | ✅ |
| `monthly_salary`, `hourly_rate` | ✅ |
| `housing_allowance`, `transport_allowance`, `food_allowance`, `other_allowance` | ✅ |
| `payment_method`, `c3_status`, `endered_id` | ✅ |
| `whatsapp_number`, `email` | ✅ |
| `joining_date`, `date_of_birth` | ✅ |
| `emirates_id`, `emirates_id_expiry`, `visa_number`, `visa_expiry` | ✅ |
| `medical_failed` | ✅ |
| `rest_day` | ❌ **MISSING** |
| `preferred_language` | ❌ **MISSING** |

### 7.2 Proposed Migration: `011_workers_rest_day_and_language.sql`

```sql
ALTER TABLE workers
ADD COLUMN rest_day TEXT DEFAULT 'sunday'
  CHECK (rest_day IN ('sunday', 'saturday'));

ALTER TABLE workers
ADD COLUMN preferred_language TEXT DEFAULT 'en'
  CHECK (preferred_language IN ('en', 'hi'));

-- Backfill: all 25 active workers get defaults (sunday rest, en language)
-- No UPDATE needed — DEFAULT handles it.

-- Verification:
-- SELECT rest_day, preferred_language, COUNT(*) FROM workers GROUP BY 1, 2;
-- Expected: sunday/en = 25 (plus any inactive)
```

### 7.3 UI Placement

In `app/workers/[id]/page.js`:

- **`rest_day`:** Dropdown near the "Category" field in the profile info section. Label: "Rest Day". Options: "Sunday (default)" / "Saturday".
- **`preferred_language`:** Dropdown near the "WhatsApp Number" field. Label: "Preferred Language". Options: "English" / "Hindi (हिंदी)".

Both should be editable inline (same pattern as the existing WhatsApp number edit).

---

## Section 8 — wa.me Click-to-Chat Bridge

### 8.1 Current WhatsApp Display

Found in `app/workers/[id]/page.js` line 250:
```javascript
{worker.whatsapp_number
  ? <a href={`https://wa.me/${worker.whatsapp_number.replace(/\D/g,'')}`}
       target="_blank" rel="noreferrer" style={{color:'#0d9488'}}>
      {worker.whatsapp_number}
    </a>
  : '—'}
```

A basic `wa.me` link already exists on the worker profile! But it has no starter text and no bilingual support.

### 8.2 Starter Constants

**Proposed new file:** `lib/whatsappTemplates.js`

```javascript
export const STARTERS = {
  payslip_en: "Innovation Technologies — Your {month} payslip is ready. Please find it attached. Net pay: AED {net}. For queries, contact HR at +971 2 333 6633.",
  payslip_hi: "Innovation Technologies — आपकी {month} की payslip तैयार है। कृपया संलग्न देखें। Net: AED {net}. सवाल के लिए HR से संपर्क करें: +971 2 333 6633.",
  general_en: "Innovation Technologies — Message from HR.",
  general_hi: "Innovation Technologies — HR से संदेश।"
}

export function buildWaLink(whatsappNumber, template, vars = {}) {
  if (!whatsappNumber) return null
  const num = whatsappNumber.replace(/\D/g, '')
  let text = template
  for (const [k, v] of Object.entries(vars)) {
    text = text.replace(`{${k}}`, v)
  }
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`
}
```

### 8.3 Surface Points

**(a) `/workers/[id]`** — Enhance existing wa.me link (line 250) to use `general_en` or `general_hi` based on `worker.preferred_language`. Add a small WhatsApp icon button.

**(b) `/payroll-run` Step 5** — Per-row button next to existing PDF download. Uses `payslip_en`/`payslip_hi` with `{month}` and `{net}` substituted from the payroll line data.

### 8.4 UX

Button opens wa.me link in new tab. Desktop WhatsApp picks up. HR manually attaches the downloaded PDF. This is Phase 1 per Rules Locked §14.1 — zero cost, zero setup, works immediately.

---

## Section 9 — Offer Letter Change

### 9.1 Offer Letter Template Location

`lib/letterTemplates.js`, function `offerLetterHTML()` starting line 90.

### 9.2 Old 2-Day Deduction Wording

**Line 138:**
```html
<li><strong>Unauthorized Absence:</strong> 2 days' salary deducted per day of unauthorized absence.</li>
```

### 9.3 Replacement

Replace line 138 with Rules Locked §7.6 language:

```html
<li><strong>Disciplinary Action:</strong> Any violation of company policy or UAE Labour Law, including unauthorised absence, may result in disciplinary action under Article 39 of Federal Decree-Law 33/2021 and the company&rsquo;s written disciplinary code. Penalties will be determined and notified in writing in accordance with UAE law, and may include salary deduction up to the legal maximum of 5 days per month.</li>
```

### 9.4 Scope

Template change only. Does NOT affect historical signed offer letters in storage. New offers generated from this point forward use the new language.

**CLAUDE.md §9 note:** This file is listed under "What NOT to touch without explicit approval." The prompt explicitly authorises this change as part of PR #9 scope.

---

## Section 10 — Offboarding Dropdown Fix

### 10.1 Current Code

`app/offboarding-exit/page.js` lines 29-32:

```javascript
useEffect(() => {
  setRecords(getOffboarding())
  setWorkers(getVisibleWorkers())
  setRoleState(getRole())
}, [])
```

Line 219 — the worker dropdown:
```javascript
<select ... value={form.worker_id} onChange={...}>
  <option value="">Select active worker</option>
  {workers.filter(w => w.active !== false).map(w =>
    <option key={w.id} value={w.id}>{w.full_name} ({w.worker_number})</option>
  )}
</select>
```

### 10.2 Root Cause

**The page imports from `../../lib/mockStore`** (line 8). In `lib/mockStore.js`:

```javascript
// line 45
export function getVisibleWorkers() { return [] }
// line 138
export const getOffboarding = () => []
```

Both functions return empty arrays. The dropdown is empty because `getVisibleWorkers()` always returns `[]`.

This is the same pattern seen in the timesheets page — mock stores are stubs, all data is in Supabase but the page reads from the mock.

### 10.3 Proposed Fix

Replace mock imports with Supabase-backed service calls:

```javascript
// Change import from:
import { getOffboarding, getVisibleWorkers, ... } from '../../lib/mockStore'

// To:
import { getActiveWorkers } from '../../lib/workerService'
import { getOffboardingRecords } from '../../lib/offboardingService'
```

Then update the `useEffect`:
```javascript
useEffect(() => {
  async function load() {
    const [w, r] = await Promise.all([
      getActiveWorkers(),
      getOffboardingRecords()
    ])
    setWorkers(w)
    setRecords(r)
    setRoleState(getRole())
  }
  load()
}, [])
```

**Check:** `lib/workerService.js` and `lib/offboardingService.js` both exist and import from Supabase client. This is a ~10-line wiring fix.

---

## Section 11 — Proposed PR #9 Plan

### 11.1 Migrations

**Migration 010: `010_payroll_type_values.sql`**
```sql
-- Drop old CHECK
ALTER TABLE payroll_lines DROP CONSTRAINT IF EXISTS payroll_lines_payroll_type_check;

-- Backfill
UPDATE payroll_lines pl
SET payroll_type = CASE
  WHEN w.category = 'Permanent Staff' THEN 'salaried_with_ot'
  WHEN w.category = 'Office Staff'    THEN 'salaried_no_ot'
  ELSE 'flat_hourly'
END
FROM workers w WHERE pl.worker_id = w.id;

-- New CHECK
ALTER TABLE payroll_lines
ADD CONSTRAINT payroll_lines_payroll_type_check
CHECK (payroll_type IN ('salaried_with_ot', 'salaried_no_ot', 'flat_hourly'));

-- Update RPC to write new values
CREATE OR REPLACE FUNCTION public.generate_payroll_batch(...)
-- [same body, replace 'hourly' with 'flat_hourly', 'monthly' with 'salaried_with_ot'/'salaried_no_ot']
```

Verification: `SELECT payroll_type, COUNT(*) FROM payroll_lines GROUP BY 1;`
Expected: `salaried_with_ot=4, salaried_no_ot=2, flat_hourly=8`

**Migration 011: `011_workers_rest_day_and_language.sql`**
```sql
ALTER TABLE workers ADD COLUMN rest_day TEXT DEFAULT 'sunday' CHECK (rest_day IN ('sunday','saturday'));
ALTER TABLE workers ADD COLUMN preferred_language TEXT DEFAULT 'en' CHECK (preferred_language IN ('en','hi'));
```

Verification: `SELECT rest_day, preferred_language, COUNT(*) FROM workers GROUP BY 1, 2;`

**Migration 012: `012_innovation_internal_client.sql`**
```sql
ALTER TABLE clients ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT FALSE;
INSERT INTO clients (name, code, is_internal) VALUES ('Innovation Internal', 'INNOVATION', TRUE);
```

Verification: `SELECT name, code, is_internal FROM clients WHERE is_internal = TRUE;`

**Migration 013: `013_timesheet_grid_support.sql`**
```sql
-- Uniqueness for upsert
ALTER TABLE timesheet_lines
ADD CONSTRAINT uq_timesheet_lines_worker_date_header
UNIQUE (worker_id, work_date, header_id);

-- Rest-day flag (replaces misleading is_friday)
ALTER TABLE timesheet_lines ADD COLUMN IF NOT EXISTS is_rest_day BOOLEAN DEFAULT FALSE;

-- Absence status
ALTER TABLE timesheet_lines ADD COLUMN IF NOT EXISTS absence_status TEXT DEFAULT NULL
  CHECK (absence_status IN (NULL, 'unauthorised', 'sick_cert', 'approved_leave', 'short_authorised'));
```

Verification: `SELECT conname FROM pg_constraint WHERE conrelid = 'timesheet_lines'::regclass AND contype = 'u';`

### 11.2 Files

**NEW:**
| File | Purpose |
|---|---|
| `app/timesheets/grid/page.js` | Master timesheet grid UI |
| `lib/timesheetGridLogic.js` | `splitHours()`, `classifyDay()`, grid state management |
| `lib/dateUtils.js` | `classifyDay()` day-type classifier |
| `lib/whatsappTemplates.js` | Bilingual starter text + `buildWaLink()` |

**MODIFIED:**
| File | Purpose |
|---|---|
| `app/timesheets/page.js` | Add "Open Grid" link/button to navigate to grid |
| `app/workers/[id]/page.js` | Add `rest_day`, `preferred_language` fields + enhanced wa.me button |
| `app/payroll-run/page.js` | Add wa.me button per payslip row in Step 5 |
| `lib/letterTemplates.js` | Payslip: strip Authorised Signatory, always-show OT rates. Offer: §7.6 language |
| `app/offboarding-exit/page.js` | Switch from mockStore to Supabase services |

### 11.3 Implementation Order

1. **Migrations (010, 011, 012, 013)** — Foundation. No code depends on old values after this.
2. **`lib/dateUtils.js` + `lib/timesheetGridLogic.js` + `lib/whatsappTemplates.js`** — Pure functions, unit-testable in isolation.
3. **Payslip + offer letter changes in `lib/letterTemplates.js`** — Isolated template edits, browser-testable by generating a payslip.
4. **Master grid UI (`app/timesheets/grid/page.js`)** — The big piece. Depends on dateUtils + gridLogic + migrations.
5. **Excel upload integration on grid** — Layer on top of working grid. Reuses existing `lib/excelParser.js`.
6. **wa.me buttons** — Small wiring in worker profile + payroll-run. Depends on whatsappTemplates.js.
7. **Offboarding dropdown fix** — Standalone, no dependencies on other items.

**Justification:** Migrations first so the DB schema supports everything. Pure functions next so the grid has its logic ready. Template changes are isolated and low-risk. Grid is the main piece. Excel quick-fill layers on top. wa.me and offboarding are independent small fixes.

### 11.4 Test Plan

| # | Scenario | Expected Result |
|---|---|---|
| 1 | Friday on Mon–Sat workweek | Classified as `working`, no special styling |
| 2 | Sunday for default worker (rest_day='sunday') | Classified as `rest_day`, amber cell, all hours → holiday_hours |
| 3 | Saturday for overridden worker (rest_day='saturday') | Classified as `rest_day`, amber cell |
| 4 | Sunday for rest_day='saturday' worker | Classified as `working`, normal threshold applies |
| 5 | March 30/31, April 1 (Eid 2026) | Classified as `public_holiday`, red cell, tooltip shows name |
| 6 | Ramadan ON + "7" on Monday | Split: `{normal: 6, ot: 1, holiday: 0}` |
| 7 | Ramadan OFF + "10" on Monday | Split: `{normal: 8, ot: 2, holiday: 0}` |
| 8 | "10" on Sunday (rest day) | Split: `{normal: 0, ot: 0, holiday: 10}` |
| 9 | "17" on any day | Stored as 16, split computed off 16 |
| 10 | "3" on working day | Stored as 3, absent flag triggered (< 4h) |
| 11 | Blank cell during edit | No row, no flag |
| 12 | Blank cell during Generate Payroll | Synthesised as 0, flagged unauthorised absent |
| 13 | Permanent Staff grid → payroll | Correct OT1/OT2 pay based on split hours |
| 14 | Contract Worker grid → payroll | Flat rate × total hours, ot_pay = 0 |
| 15 | Office Staff | No grid entry, basic + allowances only |
| 16 | Excel perfect match | All matched workers pre-fill yellow |
| 17 | Excel partial match | Unmatched list shown at top |
| 18 | Excel ADSB format | Parses if provided; otherwise N/A |
| 19 | Offboarding dropdown | Shows 25 active workers from Supabase |
| 20 | Payslip — Permanent Staff | Basic + allowances + OT1 line (with rate) + OT2 line (with rate), no signatory |
| 21 | Payslip — Office Staff | Basic + allowances, no OT lines, no signatory |
| 22 | Payslip — Contract/Subcontract | Hours × rate, no allowances, no OT, no signatory |
| 23 | wa.me button — English worker | Opens wa.me with English starter text |
| 24 | wa.me button — Hindi worker | Opens wa.me with Hindi starter text |
| 25 | Offer letter — new language | §7.6 text replaces old 2-day deduction |

### 11.5 Out of Scope

- **Penalty workflow UI** (warning letter + penalty selection + auto-PDF) → PR #10
- **Warning + penalty notice auto-PDF** → PR #10
- **Handbook distribution + Documents portal** → PR #9.5
- **Category rename (Permanent Staff → IWS Site Staff)** → PR #9.5
- **Onboarding validation rules (DOB, salary, gender)** → PR #9.5
- **Offboarding flow itself** → PR #10
- **Security + RLS hardening** → PR #10
- **Supplier timesheet reconciliation** → PR #12
- **Meta Cloud API WhatsApp** → PR #13

### 11.6 Risks / Gotchas

1. **Existing March 2026 data:** 160 timesheet_lines with `is_friday=false`, `is_public_holiday=false` across all rows. Per Rules Locked §12: leave as-is. March data stays as reference with incorrect splits.

2. **Grid is desktop-first.** 31 columns are hostile to mobile. Known limitation, not a blocker for HR who use desktop.

3. **`payroll_type` migration must precede RPC update.** The migration drops the old CHECK and adds the new one before the RPC writes new values. Both in same migration file to ensure atomicity.

4. **Generate Payroll grid-lock coupling.** The grid checks `payroll_batches` for the month. If a batch exists with status != 'deleted', the grid is read-only. Circular dependency risk: none — the batch is created BY Generate Payroll, which reads FROM the grid. One-directional.

5. **New columns inherit RLS.** The default `SELECT true` policy on `workers` and `timesheet_lines` will apply to new columns. This is fine for now but flagged for PR #10 RLS hardening.

6. **Uniqueness constraint on existing data.** The 160 existing timesheet_lines rows must not have duplicates on `(worker_id, work_date, header_id)` or the constraint will fail. Quick verification query needed before migration:
   ```sql
   SELECT worker_id, work_date, header_id, COUNT(*)
   FROM timesheet_lines GROUP BY 1, 2, 3 HAVING COUNT(*) > 1;
   ```
   Expected: 0 rows (each line was bulk-seeded with unique date per worker).

7. **Two Permanent Staff workers named "Innovation LLC"** (IWS-2026-0030, IWS-2026-0032). These appear to be test/placeholder workers, not real staff. May cause confusion in the grid. Flag for Jo.

---

## Section 12 — Confirm Version + State

### 12.1 Current Deployed Commit SHA

```
26bf92726f7ff6b6050f875d60ead81aecc86417
```

### 12.2 Latest Supabase Migration Applied

Cannot query `supabase_migrations.schema_migrations` via REST API (not in public schema). Based on the `workers` table having `whatsapp_number`, `date_of_birth`, `medical_failed` columns, migrations 001–009 are all applied.

**Local migration files:**
- `001_three_track_schema.sql`
- `003_onboarding_checklist_metadata.sql`
- `004_round_d_validation.sql`
- `005_contract_track_and_work_experience.sql`
- `006_dob_and_sync.sql`
- `007_payroll_pipeline.sql`
- `008_approval_flow_columns.sql`
- `009_whatsapp_field.sql`

Note: `002_` is missing from the sequence. This is either intentional (skipped) or a gap. Not a blocker.

### 12.3 Active Worker Count

**25** ✅ (confirmed via REST API `Content-Range: 0-24/25`)

Category breakdown:
| Category | Count |
|---|---|
| Permanent Staff | 4 |
| Office Staff | 2 |
| Contract Worker | 8 |
| Subcontract Worker | 11 |
| **Total** | **25** |

### 12.4 Client Count

**4 clients** ✅

| Name |
|---|
| Abu Dhabi Ship Building (ADSB) |
| Gulf Marine Engineering LLC |
| Harbor Fit-Out Contracting LLC |
| ADNOC Offshore Contractors |

No "Innovation Internal" client exists yet — confirms migration 012 is needed.

### 12.5 March 2026 Batch State

```json
{
  "status": "calculated",
  "ops_approval_status": "pending",
  "owner_approval_status": "pending"
}
```

✅ Matches expected state. Batch was generated but not yet approved through the 4-gate flow.

### 12.6 Uncommitted Migrations

**Local files:** 001, 003, 004, 005, 006, 007, 008, 009 (8 files)
**Applied (inferred from schema):** All 8 applied.
**New migrations for PR #9:** 010, 011, 012, 013 — none applied yet (as expected for a diagnose step).

No mismatch detected.

---

## Open Questions for Jo

1. **Workers named "Innovation LLC" (IWS-2026-0030, IWS-2026-0032):** These two Permanent Staff workers appear to be test data. Should they be cleaned up before April payroll, or left as-is?

2. **Absence status storage:** The report proposes adding `absence_status` to `timesheet_lines`. An alternative is a separate `absence_flags` table with richer metadata (sick cert file URL, approved-by, approved-at). Which approach — column on timesheet_lines (simpler, PR #9) or separate table (richer, but more schema)?

3. **Ramadan mode for March 2026:** The existing 3 timesheet headers have `ramadan_mode = false`. Ramadan 2026 was Feb 18 – Mar 19. Should March be treated as Ramadan (partial) or non-Ramadan? This affects the OT threshold for Permanent Staff.

4. **ADSB timesheet format:** No ADSB timesheets are in the system yet, despite ADSB being a client. When HR gets the first ADSB Excel, should we add ADSB-specific parsing or rely on the auto-detect parser?

5. **Grid auto-save vs manual Save All:** The report recommends manual Save All (explicit, safer for payroll). Jo, do you prefer auto-save with debounce (faster for HR, riskier) or Save All (safer)?

6. **Supabase Pro upgrade:** Per Rules Locked §15, PR #9 can be developed on Free but must not merge to production until Pro is active. Has the upgrade been done?

---

*Report generated 2026-04-19. No files edited. No commits made. No migrations applied.*
