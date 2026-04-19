# IWS — Rules Locked

**Version:** 1.0  
**Date locked:** 2026-04-18  
**Status:** Pending Jo's sign-off before PR #9 diagnose runs

This document consolidates every payroll, timesheet, OT, absence, sick
leave, and penalty rule we've clarified across the PR #6 → PR #9
sessions. It supersedes any contradictory rule anywhere else in CLAUDE.md,
the repo, offer letters, or previous diagnose reports.

Rules marked **[CORRECTED]** are places where I (Claude) initially got
it wrong and Jo corrected me — kept visible so we don't regress.

Rules marked **[NEW]** are decisions made during the PR #9 scoping round
that didn't exist before.

Rules marked **[MOHRE-VERIFIED]** were searched against live MOHRE/UAE
government sources in April 2026 before locking.

---

## 1. Worker Categories and Payroll Types

Four categories. Each maps to exactly one payroll type. No worker
sits in two categories.

| Category | Payroll Type | Timesheet Required? |
|---|---|---|
| Permanent Staff | `salaried_with_ot` | Yes |
| Office Staff | `salaried_no_ot` | No |
| Contract Worker | `flat_hourly` | Yes |
| Subcontract Worker | `flat_hourly` | Yes |

**[NEW]** The `payroll_type` column currently holds `monthly` / `hourly`
which conflates Permanent and Office under the same label. PR #9
renames the values to the three above.

---

## 2. Workweek and Rest Day [CORRECTED, MOHRE-VERIFIED]

- Innovation workweek: **Monday through Saturday** (6 days, 8 hours/day)
- Default rest day: **Sunday**
- Per-worker override: HR can set an individual worker's rest day to
  **Saturday** instead of Sunday. When overridden, that worker's
  Saturday becomes their rest day (OT2 premium) and their Sunday
  becomes a normal working day (8hr threshold).
- Night shift: no premium, no different treatment. OT rates below are
  the only tiers regardless of time of day.

**Implementation:** new column `workers.rest_day` with values `sunday`
(default) or `saturday`.

**[CORRECTED]** I initially assumed UAE-default Friday as rest day.
Jo corrected: Innovation works Mon–Sat with Sunday off. Friday is a
normal working day at Innovation.

---

## 3. Overtime Rules

### 3.1 Normal months (non-Ramadan)

| Day | Threshold | Rule |
|---|---|---|
| Working days (Mon–Sat, or worker's 6 assigned days if rest-day override) | 8 hours | Hours 1–8 = normal (covered by basic). Hours > 8 = **OT1 at 1.25×** |
| Rest day (Sunday by default, Saturday if overridden) | None | Every hour = **OT2 at 1.50×** |
| UAE public holidays / Eid | None | Every hour = **OT2 at 1.50×** |

### 3.2 Ramadan months

| Day | Threshold | Rule |
|---|---|---|
| Working days | **6 hours** (reduced from 8) | Hours 1–6 = normal. Hours > 6 = **OT1 at 1.25×** |
| Rest day | None | Every hour = **OT2 at 1.50×** (unchanged) |
| UAE public holidays / Eid | None | Every hour = **OT2 at 1.50×** (unchanged) |

**[MOHRE-VERIFIED]** Ramadan 2-hour reduction applies to all private
sector employees regardless of religion or fasting status, per MOHRE
Feb 2026 announcement and Federal Decree-Law 33/2021.

### 3.3 Rate formulas (Permanent Staff only)

- OT1 rate = `basic_salary / 30 / 8 × 1.25`
- OT2 rate = `basic_salary / 30 / 8 × 1.50`

Where `basic_salary` is the monthly basic (not including allowances).

### 3.4 Ramadan mode control

**[NEW]** Per-month toggle on the master timesheet grid. HR ticks
"Ramadan mode" for the months where Ramadan falls. Affects threshold
only; does not change rest-day or holiday premium rules.

Ramadan 2026: Feb 18 – Mar 19 (informational — HR ticks manually).

### 3.5 OT rules by category

Only Permanent Staff get OT1/OT2 premiums. The rules above apply to
them only.

- **Office Staff:** Never receive OT under any circumstances. Monthly
  salary covers all hours.
- **Contract + Subcontract Workers:** Flat hourly rate × total hours.
  No premium for OT, no premium for rest days, no premium for public
  holidays. Hours can still be captured for audit purposes (split
  into normal/OT/holiday buckets for record-keeping) but pay is
  computed from total hours only.

**[CORRECTED]** Earlier in the session I implied the RPC's OT
computation for subcontractors was a bug. Reading the source, it
correctly zeroes OT pay for flat-hourly workers even when OT hours
are recorded. That's by design and matches the rule.

---

## 4. Master Timesheet Grid [NEW]

### 4.1 Shape

- One grid per client per month (replaces the existing client-upload
  flow as the primary capture path; upload remains as a quick-fill
  option)
- Rows: workers assigned to that client, sorted by worker_number
- Columns: days 1 to 28/29/30/31 for the month
- Cell content: total hours worked that day (numeric, one decimal
  place)
- Friday cells: no special styling (Friday is a normal working day)
- Rest-day cells (Sunday by default, Saturday for overridden workers):
  highlighted amber
- Public holiday cells: highlighted red, labeled with holiday name
- Top toolbar: month selector, client selector, Ramadan-mode toggle,
  Upload Excel button, Save All, Generate Payroll
- Right panel: per-worker totals (normal hours, OT1, OT2, total)

### 4.2 Innovation Internal client [NEW]

A pseudo-client called "Innovation Internal" exists for Permanent
Staff direct-hire hours. Treated identically to a real client in the
UI.

Implementation: either a `clients` table row with a flag, or a NULL
`client_id`. PR #9 diagnose picks the cleaner approach.

### 4.3 Cell input behaviour [NEW]

- HR types total hours. System auto-splits into
  `normal_hours / ot_hours / holiday_hours` based on day type,
  Ramadan mode, and threshold.
- **16-hour hard cap:** if HR types more than 16, system stores 16.
- **< 4 hours rule:** triggers unauthorised-absent flag (see §6 below).
- **Blank cells:**
  - During grid editing: "not yet entered" — no flag
  - During payroll generation: treated as unauthorised absent

### 4.4 Edit window [NEW]

Cells are editable after save until "Generate Payroll" is clicked for
that batch. Once payroll generates, the grid for that month locks and
becomes read-only. Unlock is owner-level only (same rule as payroll
unlock from PR #7).

### 4.5 Upload Excel quick-fill [NEW]

On any grid, HR can click "Upload Excel" to pre-fill cells from a
client-provided Excel or PDF-exported spreadsheet. System best-effort
parses, fills cells in yellow highlight ("needs review"), HR edits
and confirms before saving. Unmatched workers (names in Excel not in
grid) surface as a "could not match" list at top.

### 4.6 Split logic examples

All examples for Permanent Staff. (Contract/Subcontract split is
informational only — pay is flat.)

| HR types | Day type | Ramadan? | normal_hours | ot_hours | holiday_hours |
|---|---|---|---:|---:|---:|
| 10 | Monday | No | 8 | 2 | 0 |
| 8 | Tuesday | No | 8 | 0 | 0 |
| 12 | Wednesday | No | 8 | 4 | 0 |
| 7 | Monday | **Yes** | 6 | 1 | 0 |
| 10 | Sunday (rest day) | No | 0 | 0 | 10 |
| 8 | Saturday (Eid day 1) | No | 0 | 0 | 8 |
| 10 | Friday | No | 8 | 2 | 0 |
| 17 | Any | Any | 16 (capped) | (computed off 16) | (computed off 16) |
| 0 or blank | Working day | Any | 0 | 0 | 0 + **absent flag** |
| 3 | Working day | Any | 0 | 0 | 0 + **absent flag** |

---

## 5. Payroll Computation

### 5.1 Permanent Staff

```
gross = monthly_basic
      + housing_allowance + transport_allowance + food_allowance + other_allowance
      + SUM(ot_hours_across_month) × (basic/30/8 × 1.25)
      + SUM(holiday_hours_across_month) × (basic/30/8 × 1.50)
```

Net pay = gross − deductions (NWNP for absent days, disciplinary
penalties per §7).

### 5.2 Office Staff

```
gross = monthly_basic
      + housing_allowance + transport_allowance + food_allowance + other_allowance
```

No timesheet input. No OT. Deductions still possible if HR records
absences manually.

### 5.3 Contract Worker / Subcontract Worker

```
gross = SUM(total_hours_across_month) × hourly_rate
```

No OT. No allowances. Flat calculation. Net pay = gross (no typical
deductions for flat-hourly workers since there's no salary to deduct
from).

---

## 6. Absence Rules [PARTIALLY NEW]

### 6.1 The < 4 hours rule [NEW]

On a normal working day (not rest day, not public holiday):
- Cell value < 4 hours OR blank-at-payroll-time → flagged as
  **unauthorised absence**
- HR can attach a sick certificate or approved-leave reason to the
  flag, which removes it (see §6.3)

### 6.2 Rest days and public holidays are exempt [NEW]

The < 4 hours rule does not apply to:
- Sunday (or Saturday if rest-day override)
- UAE public holidays / Eid days

Worker is entitled to those days off at full pay. Zero hours on a
rest day / holiday is normal. If they do work, OT2 premium applies.

### 6.3 Sick certificate / approved leave attachment [NEW]

HR can mark a flagged day as:
- **Sick with valid certificate** — applies sick leave rules (§8)
- **Approved leave** (annual, emergency, unpaid) — no absence
  consequence
- **Short day — authorised** — worker worked < 4 hours for a valid
  reason (site closed, medical emergency, etc.), pay actual hours

Without attachment, at payroll-generation time the flag becomes a
confirmed unauthorised absence.

### 6.4 Consequences by category

| Category | Action on confirmed unauthorised absence |
|---|---|
| Permanent Staff | **NWNP deduction** applied automatically: `(basic / 30) + (allowances / 30)` for that day. Day also logged in disciplinary record. |
| Contract / Subcontract Worker | Hours **zero out** for that day — worker earns nothing for that day. No separate penalty (already lose the day's pay). Day logged in disciplinary record for pattern tracking. |
| Office Staff | N/A in grid — HR records absences manually in existing Attendance module. NWNP applies same as Permanent Staff. |

**[CORRECTED]** The old offer letter rule of "automatic 2-day penalty
per absent day" is REMOVED. Disciplinary penalties now come via the
separate warning-letter workflow in §7.

### 6.5 Weekend extension rule

Carry-over from previous IWS documentation, still applies:

- If a worker has an unauthorised absence on **Saturday** (day before
  Sunday rest day), the **Sunday** also becomes unpaid (NWNP doubled:
  Sat + Sun)
- If absence is on **Monday** (day after Sunday rest day), the
  **Sunday** also becomes unpaid (Sun + Mon)
- If absence is on **both Saturday AND Monday**, the full 3 days are
  unpaid (Sat + Sun + Mon)
- Applies only to Permanent Staff (monthly paid). Contract/Subcontract
  already zero-out for absent days so no extension logic needed.

For workers with Saturday rest-day override: same logic inverted
around Saturday.

### 6.6 Escalation thresholds

Preserved from existing IWS rules:

- **3 unauthorised absences in any 90 days** → 3-day suspension
- **5 in 6 months** → formal warning + 3–7 day suspension
- **7 consecutive or 20 non-consecutive in 12 months** → immediate
  dismissal under **Article 44(7)** of Federal Decree-Law 33/2021
- **Forged medical certificate** → immediate dismissal + criminal
  referral (Article 44)

---

## 7. Disciplinary Penalty Workflow [NEW]

### 7.1 Legal basis [MOHRE-VERIFIED]

- **Article 39** of Federal Decree-Law 33/2021: employers may deduct
  a maximum of **5 days wages per month** as a disciplinary penalty
- Requires a written disciplinary code communicated to employees
  (satisfied by offer letter reference + worker handbook)
- Penalty must be notified in writing with: violation description,
  penalty type, penalty extent, reasons, consequences of repetition,
  right to grievance
- Penalty must be imposed within **60 days** of conclusion of
  investigation
- Investigation must begin within **30 days** of discovery
- Worker has right to file grievance with MOHRE

### 7.2 Application model

**[NEW]** HR-discretionary, two paths:
1. **Warning-letter path:** HR issues a warning letter. Within the
   letter, HR selects penalty (0, 2, 3, 4, or 5 days).
2. **Standalone penalty path:** HR issues a penalty notice without a
   preceding warning. Same penalty selection.

Both paths require HR to:
- Record the violation description
- Select penalty days (dropdown: none, 2, 3, 4, 5)
- Enter reasons
- Enter consequences of repetition
- Submit — generates PDF and applies deduction to next payroll

### 7.3 Penalty amount calculation

- Deduction AED = `penalty_days × (basic_salary / 30)`, **rounded to
  nearest 100 AED**
- Example: basic 6,200 AED, 3-day penalty = 3 × 206.67 = 620 → rounded
  to 600

### 7.4 5-day monthly cap [MOHRE-VERIFIED, HARD BLOCK]

- System sums all penalty deductions for a worker in the current
  payroll month
- If adding a new penalty would push the monthly total above 5 days,
  system **hard-blocks the save** with error message showing current
  total and what would be allowed
- No override. HR must wait for next month or reduce penalty days.

### 7.5 Auto-generated penalty notice PDF [NEW]

System auto-generates a penalty notice letter PDF on save. Pattern:
reuses jsPDF pipeline from PR #8 (same html2canvas approach as
payslips).

Letter must include per Article 39:
- Company header (Innovation Technologies LLC O.P.C.)
- Worker name, worker number, date
- Violation description (HR input)
- Investigation summary (HR input, optional but recommended)
- Article 39 reference
- Penalty type: salary deduction
- Penalty extent: X days × AED Y (rounded)
- Reasons (HR input)
- Consequences of repetition (HR input with template suggestion)
- Right to grievance with MOHRE
- Company signatory line (digital — "Digitally issued via IWS")
- Footer with company license, TRN, MOHRE number

### 7.6 Offer letter language change [NEW]

Remove the line:
> "2-day salary deduction per day of unauthorised absence"

Replace with:
> "Any violation of company policy or UAE Labour Law, including
> unauthorised absence, may result in disciplinary action under
> Article 39 of Federal Decree-Law 33/2021 and the company's written
> disciplinary code. Penalties will be determined and notified in
> writing in accordance with UAE law, and may include salary
> deduction up to the legal maximum of 5 days per month."

---

## 8. Sick Leave [MOHRE-VERIFIED]

Per **Article 31** of Federal Decree-Law 33/2021:

- **90 days per year** post-probation (continuous or intermittent)
- **First 15 days:** full pay
- **Days 16–45:** half pay
- **Days 46–90:** unpaid
- **During probation:** no paid sick leave (unpaid only)
- Certificate must be from DHA (Dubai), DOH (Abu Dhabi), or MOHAP
  (other emirates) licensed facility
- Submission deadline: **within 48 hours** of absence (Innovation's
  stricter rule; UAE law allows 3 days)
- Forged certificate = immediate dismissal per Article 44 + criminal
  referral

**No changes in PR #9.** Preserved as-is from existing IWS
documentation.

---

## 9. Payslip Template Changes [NEW, carried from PR #8 feedback]

### 9.1 Remove

- "Authorised Signatory" block
- Signature line
- (Reason: payslips are digitally signed by IWS and distributed via
  WhatsApp/email per PR #13)

### 9.2 Add for Permanent Staff

- Show OT1 rate on payslip even when OT1 hours = 0:
  `OT1 rate: AED X.XX/hr (payable for hours > 8 on working days)`
- Show OT2 rate on payslip even when OT2 hours = 0:
  `OT2 rate: AED X.XX/hr (payable for rest day and public holiday work)`
- Reason: workers see what each OT hour would earn them

### 9.3 Category-based variant

| Category | Payslip variant |
|---|---|
| Permanent Staff | Monthly basic + allowances + OT1 line + OT2 line (even at zero) |
| Office Staff | Monthly basic + allowances only. No OT lines. |
| Contract / Subcontract | Hours × rate. No allowances. No OT lines. |

Template branches on `worker.category`, not on `payroll_type`.

---

## 10. Data Integrity Rules [NEW]

- Grid cell values must be non-negative numbers with 0 or 1 decimal place
- Hard cap: 16 hours per cell
- Timesheet_lines unique constraint: `(worker_id, work_date, header_id)`
  — one row per worker per day per client. Enforced at DB level.
- `payroll_type` column values restricted to: `salaried_with_ot`,
  `salaried_no_ot`, `flat_hourly`. Old values (`monthly`, `hourly`)
  migrated via a data migration in PR #9.
- `rest_day` column on workers: defaults `'sunday'`, constrained to
  (`'sunday'`, `'saturday'`).

---

## 11. Out of Scope for PR #9

These surfaced during scoping but are deferred:

- Full offboarding workflow (PR #10)
- Final settlement UI (PR #10)
- 360° worker profile consolidation (PR #11)
- Supplier timesheet upload pipeline (PR #12)
- WhatsApp/email payslip + penalty-notice distribution (PR #13)
- Attendance page rework (stays as-is; used for Office Staff absences)

One small fix bundled into PR #9 because we're already in the payroll
pipeline: **`/offboarding-exit` worker dropdown fix** (currently empty,
5-minute Supabase query issue).

---

## 12. Data Migration Strategy [NEW, CONFIRMED]

Jo confirmed: **keep everything, don't wipe.** PR #9 builds on
current state.

- Existing March 2026 batch: **leave as-is** (wrong numbers, kept as
  reference)
- Existing 14 payroll_lines: `payroll_type` values migrated from
  `monthly`/`hourly` to the three new values via data migration
- Existing 3 timesheet_headers + 160 timesheet_lines: preserved, but
  new grid UI writes to same tables
- 29 workers, 213 documents: untouched
- 16 auto-seeded WhatsApp numbers from PR #8: **separate decision
  pending** — Jo to decide wipe or keep

April 2026 is the first batch generated via the new pipeline.

---

## 13. End-to-End Validation Walkthrough [DEFERRED TO AFTER PR #10]

Jo's plan: after PR #9 (timesheet grid + payroll math) and PR #10
(offboarding) both ship, pick one real worker and take them through:

1. Onboarding
2. Daily timesheet entry via grid
3. OT + allowances computed correctly
4. Warning letter issued with 2-day penalty
5. Penalty appears on next payslip with auto-generated notice letter
6. Payslip delivered (WhatsApp when PR #13 ships, print+hand-deliver
   until then)
7. Eventually: offboarding + final settlement

This is the validation sprint, not a PR. Stress-tests the whole
pipeline against real workflow.

---

## 14. Worker Communication — WhatsApp Strategy [NEW]

### 14.1 Two-phase rollout

**Phase 1 (folded into PR #9):** `wa.me` click-to-chat bridge.
HR clicks a WhatsApp button on a worker profile or next to a payslip
download. WhatsApp Web/desktop opens with the worker's number
pre-filled. HR manually attaches the payslip PDF (already downloaded
from IWS) and types/pastes a short bilingual message. Zero cost,
zero external setup, works immediately. Good enough for monthly
payroll runs at 200 staff while Phase 2 is built.

**Phase 2 (PR #13 — separate workstream, starts in parallel after
PR #10):** Full Meta Cloud API integration. IWS sends payslips,
warning letters, and penalty notices programmatically. HR clicks
"Send Payslips" on a locked payroll batch; all 200 go out
automatically to workers' registered WhatsApp numbers with the
correct language template.

Running cost Phase 2: ~AED 14-20/month for 200 staff monthly payroll.
Setup cost: AED 0 from Meta; one-off 2-3 weeks of setup time
(business verification + template approvals + integration).

### 14.2 Language support [NEW]

- Initial template languages: **English + Hindi**
- Column `workers.preferred_language` added in PR #9, values
  `en` (default) or `hi`. Extensible later to `ur`, `bn`, etc.
  if you hire non-Hindi-speaking labour.
- Phase 1 (wa.me): HR picks which language to type based on
  `preferred_language` shown on the profile. System offers
  bilingual starter text HR can paste.
- Phase 2 (Cloud API): IWS picks template variant automatically
  based on `preferred_language`.

### 14.3 Meta Cloud API setup prerequisites [DEFERRED TO PR #13]

Jo does these outside of Claude Code work (they take 5+ business
days of Meta review):

1. Create Meta Business Manager account at business.facebook.com
2. Upload Innovation Technologies trade licence + TRN for business
   verification (2-5 days review)
3. Designate a phone number as the WhatsApp Business sender
   (dedicated Innovation number or new SIM; cannot be a personal
   WhatsApp number)
4. Create 4 core message templates in Meta Template Manager:
   - `payslip_available` (EN + Hindi)
   - `warning_letter_issued` (EN + Hindi)
   - `penalty_notice_issued` (EN + Hindi)
   - `general_announcement` (EN + Hindi)
   Each template awaits Meta approval (1-3 days per template)

Claude Code work in PR #13 only starts after the above are live.

### 14.4 wa.me link format [FOR PR #9]

```
https://wa.me/{normalised_number}?text={url_encoded_message}
```

Where `{normalised_number}` is the worker's `whatsapp_number`
stripped of `+`, spaces, and special chars. Example for a UAE
number `+971 50 123 4567` → `971501234567`.

Starter message templates for HR to paste, shown inline next to the
WhatsApp button on payslip surfaces:

- EN: "Innovation Technologies — Your March 2026 payslip is attached.
  Net pay: AED X,XXX. For queries, contact HR at +971 2 333 6633."
- HI: "Innovation Technologies — आपकी March 2026 की payslip संलग्न है।
  Net: AED X,XXX. सवाल के लिए HR से संपर्क करें: +971 2 333 6633."

---

## 15. Infrastructure — Supabase Pro Upgrade [PREREQUISITE]

**Decision:** Jo upgrades Supabase from Free to Pro BEFORE PR #9
migrations land in production.

**Why:**
- **Point-in-time recovery (PITR):** restore to any minute, not just
  daily snapshots. Protects against accidental payroll data loss.
- **No 7-day-inactivity pause:** DB always live, no wake-up latency
- **Larger DB + storage limits:** Free tier 500MB/1GB becomes
  constraining as timesheet grid generates ~800 rows/month minimum

**Cost:** USD 25/month base (~AED 92). Likely total USD 25-35/month
at IWS scale.

**Action:** Jo does this via Supabase dashboard → Settings → Billing
→ Upgrade to Pro. 2-minute task, no code changes needed on IWS side.

**Blocker status:** PR #9 can be DEVELOPED on Free. It must not be
MERGED to production until Pro is active, so PITR covers the April
payroll run. PR #9 diagnose prompt will include a pre-merge checklist
item: "Confirm Supabase plan = Pro before merging."

---

## 16. Documents & Policies Portal [PR #9.5 SCOPE — elevated from PR #10]

Jo flagged during scoping: "we need to be able to download [handbook]
and have it easily accessible on the platform... maybe a possible
documents and policies section to quickly access certain documents".

**Regulatory context [MOHRE-VERIFIED]:** Per Article 14 of Cabinet
Resolution No. 1 of 2022 (Executive Regulations of Federal
Decree-Law 33/2021), Innovation — with 50+ workers on UAE visa — is
legally required to:

- Adopt written internal work regulations covering work instructions,
  penalties, promotions, rewards, termination procedures, daily
  working hours, weekly rest days, official holidays, safety measures
- Inform workers of these regulations in a language they understand
- Establish a clear grievance system for 50+ worker employers
- Make regulations available for MOHRE inspection

Handbook content exists in code (`lib/workerPolicyManualTemplate.js`,
built April 12, bilingual EN/Hindi, 28 policies). What's missing is
distribution, audit trail, and a Documents & Policies portal.

**Priority escalation [NEW]:** Jo's flag that Innovation has 50+
workers on visa moves this work from PR #10 to a dedicated **PR #9.5**
mini-sprint immediately after PR #9 merges. Rationale: regulatory
exposure is real and current; MOHRE inspections at companies of this
size happen; every penalty applied without a distributed handbook is
legally weaker.

---

## 17. PR #9.5 — Handbook Distribution & Documents Portal [NEW]

### 17.1 Scope summary

Pure handbook and policy distribution work. No other scope bundled.
Ships 1-2 days after PR #9 merges to production.

### 17.2 Handbook audit (FIRST STEP)

Claude Code reads `lib/workerPolicyManualTemplate.js` and produces
a written audit mapping each of the 28 existing policies against the
Article 14 required-coverage list:

Required coverage per Article 14 + Rules Locked §§2-9:
1. Working hours (Rules §2, §3) — must match current table
2. Weekly rest days (§2)
3. Official holidays
4. OT rules (§3) — must match new Mon-Sat/Sunday-rest, 8hr/6hr-Ramadan
5. Disciplinary code (§7) — MUST match warning-letter + standalone
   penalty + 2-5 day range + 5-day monthly cap + Article 39 reference
6. Grievance procedure — required for 50+ worker employers
7. Termination procedures (Articles 42, 44)
8. Safety measures and PPE
9. Sick leave rules (§8) — 90 days Article 31 breakdown
10. Absence policy (§6) — < 4 hour rule, weekend extension, NWNP
11. Probation rules (Article 9)
12. EOS gratuity (Article 51)

Audit output: gap list + update plan. No code changes until Jo
approves the audit.

### 17.3 Handbook template updates

After audit approval:
- Update disciplinary code section to match Rules Locked §7 exactly
  (new penalty workflow, not old 2-day-auto-deduction rule)
- Add/update grievance procedure section (if missing or weak)
- Add Rules Locked §2 rest-day override mechanism
- Sync OT threshold to 8hr normal / 6hr Ramadan
- Preserve bilingual EN/Hindi structure throughout
- Bump handbook version number to v2.0 (current implicit v1.0)

### 17.4 Handbook bundled with onboarding pack

- When a worker signs their offer, IWS auto-generates:
  - Offer letter (bilingual EN/Hindi — see §17.5 below)
  - Handbook v2.0 (bilingual, attached as Annexure A)
  - Worker pack cover page
  - Everything bundled into a single worker-specific PDF written
    to `worker-documents` bucket
- `documents` row created with `doc_type='worker_policy_manual'`,
  linked to worker, `status='valid'`, `handbook_version='v2.0'`

### 17.5 Offer letter changes

Two separate changes:

**(A) Bilingual layout.** Existing offer letter is English only.
Update to two-column EN/Hindi OR EN on main pages + Hindi translation
appended. Jo picks layout preference at implementation time.

**(B) Handbook acknowledgement line.** Add to offer letter:

```
English:
"I acknowledge that I have received the Employee Handbook
(Annexure A) in English and Hindi, that it has been explained to
me in a language I understand, and I agree to abide by its terms
and all company policies contained therein."

Hindi:
"मैं स्वीकार करता हूँ कि मुझे कर्मचारी हैंडबुक (अनुबंध A) अंग्रेजी और
हिंदी में प्राप्त हुई है, इसे मुझे ऐसी भाषा में समझाया गया है जो मैं समझता हूँ,
और मैं इसकी शर्तों और इसमें निहित सभी कंपनी नीतियों का पालन करने के
लिए सहमत हूँ।"
```

Worker signs the offer → signs the handbook acknowledgement implicitly.

### 17.6 Database changes

New column on `offers`:
- `handbook_acknowledged BOOLEAN DEFAULT FALSE`
- `handbook_version TEXT` (e.g., 'v2.0')
- `handbook_acknowledged_at TIMESTAMPTZ`

Set to true + version + timestamp automatically when offer signed.

### 17.7 Backfill for existing 25 active workers

Existing workers never received the handbook. PR #9.5 includes a
backfill flow:

- HR visits `/documents/policies` → Backfill tab
- Sees list of 25 active workers with "Handbook not yet issued"
- Clicks "Generate + Issue" on each worker
- System generates handbook PDF for that worker, writes to storage,
  creates documents row
- HR prints the separate "Handbook Receipt" single-page form (per
  worker, bilingual)
- Worker signs physical form, HR uploads scan, system marks
  `handbook_acknowledged=true`

Alternative: mass backfill via bulk-sign session where HR gathers
workers and distributes in person with acknowledgement sheets —
same UI supports both.

### 17.8 Documents & Policies admin portal [NEW]

New route: `/documents/policies`

**Tab 1: Master Templates** (downloadable PDFs)
- Employee Handbook v2.0 (EN + Hindi)
- Offer Letter Template — Field Worker (EN + Hindi)
- Offer Letter Template — Office Staff (EN + Hindi)
- Warning Letter Template (EN + Hindi)
- Penalty Notice Template (EN + Hindi)
- Grievance Form Template (EN + Hindi)
- Handbook Acknowledgement Receipt Form (EN + Hindi)

**Tab 2: Available Policies** [NEW — from Jo's ask]
A list view of every policy in the handbook, each individually
downloadable. Lets HR print one-page policy references (e.g. just
the safety policy for a site visit briefing) without printing the
full handbook.

**Tab 3: Backfill** (see §17.7)

**Tab 4: Version History**
Shows each handbook version published, date, which workers
acknowledged which version.

### 17.9 Storage bucket addition

New storage bucket: `company-templates`
- Holds master handbook PDFs, offer letter templates, all policy docs
- Admin-only read + write access via RLS

### 17.10 Legal/compliance notes

- PR #9.5 does NOT introduce cryptographic digital signatures.
  Worker signatures on handbook remain physical-paper scans for now.
- PR #9.5 satisfies Article 14 "informed workers in a language they
  understand" via the bilingual handbook + bilingual acknowledgement
- Digital cryptographic signing = separate future project requiring
  UAE TSP certificate (~AED 2,000-5,000/year). Not in this scope.

### 17.11 Deliverables checklist

- [ ] Handbook audit report with gap analysis
- [ ] Updated `lib/workerPolicyManualTemplate.js` → v2.0
- [ ] Updated `lib/offerLetterTemplate.js` (or equivalent) with
      bilingual layout and acknowledgement line
- [ ] Migration: add handbook fields to `offers` table
- [ ] Migration: create `company-templates` storage bucket
- [ ] New page: `app/documents/policies/page.js` with 4 tabs
- [ ] Handbook bundled into onboarding pack generator
- [ ] Backfill flow tested on 25 existing active workers
- [ ] Grievance procedure added/updated if missing
- [ ] Safety procedure for MOHRE inspection: HR can produce
      handbook + worker's signed acknowledgement within 5 minutes

---

## Sign-off checklist for Jo

Before I write the PR #9 diagnose prompt, please confirm:

- [ ] §1 Worker categories and payroll type names are correct
- [ ] §2 Workweek + rest day rules (Mon-Sat, Sunday default,
      Saturday override) are correct
- [ ] §3 OT thresholds and formulas are correct
- [ ] §4 Master timesheet grid shape is what you want
- [ ] §5 Payroll computation formulas are correct
- [ ] §6 Absence rules (< 4hr, weekend extension, category
      differences) are correct
- [ ] §7 Penalty workflow (warning letter OR standalone, 2-5 days,
      rounded to 100 AED, 5-day monthly hard cap, auto-PDF) is
      correct
- [ ] §8 Sick leave rules unchanged — correct
- [ ] §9 Payslip template changes are correct
- [ ] §10 Data integrity rules are correct
- [ ] §11 Out-of-scope list is correct
- [ ] §12 Migration strategy (keep everything) is correct
- [ ] §13 Walkthrough timing (after PR #9 + PR #10) is correct
- [ ] §14 WhatsApp plan (wa.me bridge in PR #9, Meta Cloud API
      in PR #13, EN+Hindi templates) is correct
- [ ] §15 Supabase Pro upgrade confirmed as pre-merge blocker
- [ ] §16 Documents & Policies portal elevated to PR #9.5 (not PR #10)
- [ ] §17 PR #9.5 scope (audit + handbook update + bilingual offer
      letter + backfill 25 workers + portal) is correct

If all 17 check, PR #9 diagnose prompt gets written.

If any single rule is wrong, correct it here and we update this doc
before writing anything else. This doc is the single source of truth.
