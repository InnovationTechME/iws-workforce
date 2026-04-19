-- Migration 013: Rename payroll_type values + update RPC
-- PR #9 — per IWS_RULES_LOCKED.md §1, §10
-- Four stages: expand CHECK → backfill → update RPC → tighten CHECK

-- Stage A: Expand CHECK to allow both old and new values during migration
ALTER TABLE payroll_lines
  DROP CONSTRAINT IF EXISTS payroll_lines_payroll_type_check;
ALTER TABLE payroll_lines
  ADD CONSTRAINT payroll_lines_payroll_type_check
    CHECK (payroll_type IN ('monthly','hourly','salaried_with_ot','salaried_no_ot','flat_hourly'));

-- Stage B: Backfill 14 existing rows
UPDATE payroll_lines pl
SET payroll_type = CASE
  WHEN w.category = 'Permanent Staff' THEN 'salaried_with_ot'
  WHEN w.category = 'Office Staff' THEN 'salaried_no_ot'
  WHEN w.category IN ('Contract Worker','Subcontract Worker') THEN 'flat_hourly'
  ELSE pl.payroll_type
END
FROM workers w
WHERE pl.worker_id = w.id;

-- Stage C: Update RPC to write new payroll_type values going forward
-- ONLY 3 lines changed from 007_payroll_pipeline.sql:
--   Branch 4a: 'hourly' → 'flat_hourly'
--   Branch 4b: 'monthly' → 'salaried_with_ot'
--   Branch 4c: 'monthly' → 'salaried_no_ot'
-- Everything else is byte-identical.

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

  -- 4. Hourly workers (Contract + Subcontract) — PURE FLAT RATE (Option A).
  -- total_hours × hourly_rate for all hours. No OT premium. No holiday premium.
  -- Per Jo's rule: contract/subcontract workers are flat rate, no exceptions.
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
    v_batch_id,
    w.id,
    -- basic_salary: total_hours * hourly_rate (pure flat rate)
    ROUND(COALESCE(agg.sum_total_hours, 0) * w.hourly_rate, 2),
    -- allowances: zero for hourly workers
    0, 0, 0, 0, 0,
    -- base_hourly_rate + rate_used snapshot
    w.hourly_rate,
    w.hourly_rate,
    -- ot1: stored for info, pay = 0 (flat rate — no weekday OT premium)
    COALESCE(agg.sum_ot_hours, 0),
    0,
    -- ot2: hours stored for info, pay = 0 (flat rate — no holiday premium)
    COALESCE(agg.sum_holiday_hours, 0),
    0,
    -- total_hours
    COALESCE(agg.sum_total_hours, 0),
    -- gross_pay = total_hours * hourly_rate (flat, no premium)
    ROUND(COALESCE(agg.sum_total_hours, 0) * w.hourly_rate, 2),
    -- deductions: 0 for PR #6
    0,
    -- net_pay = gross (no deductions in v1)
    ROUND(COALESCE(agg.sum_total_hours, 0) * w.hourly_rate, 2),
    -- payment method from worker
    w.payment_method,
    w.c3_status,
    'flat_hourly',
    COALESCE(
      (SELECT bool_or(th.ramadan_mode)
         FROM timesheet_headers th
        WHERE th.month = p_month AND th.year = p_year AND th.status = 'hr_approved'),
      false
    )
  FROM workers w
  JOIN (
    SELECT
      tl.worker_id,
      SUM(tl.total_hours)   AS sum_total_hours,
      SUM(tl.normal_hours)  AS sum_normal_hours,
      SUM(tl.ot_hours)      AS sum_ot_hours,
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

  -- 5. Insert Permanent Staff lines (monthly salary + OT from timesheets if any)
  --    Branch on category — ignore hourly_rate even if populated.
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
    v_batch_id,
    w.id,
    w.monthly_salary,
    COALESCE(w.housing_allowance, 0),
    COALESCE(w.transport_allowance, 0),
    COALESCE(w.food_allowance, 0),
    COALESCE(w.other_allowance, 0),
    COALESCE(w.housing_allowance, 0) + COALESCE(w.transport_allowance, 0)
      + COALESCE(w.food_allowance, 0) + COALESCE(w.other_allowance, 0),
    -- base hourly = monthly / 30 / 8
    ROUND(w.monthly_salary / 30.0 / 8.0, 4),
    NULL,  -- rate_used is NULL for salaried workers
    -- OT1: weekday OT at 125%
    COALESCE(agg.sum_ot_hours, 0),
    ROUND(COALESCE(agg.sum_ot_hours, 0) * (w.monthly_salary / 30.0 / 8.0) * 1.25, 2),
    -- OT2: Friday/holiday at 150%
    COALESCE(agg.sum_holiday_hours, 0),
    ROUND(COALESCE(agg.sum_holiday_hours, 0) * (w.monthly_salary / 30.0 / 8.0) * 1.50, 2),
    -- total hours
    COALESCE(agg.sum_total_hours, 0),
    -- gross = salary + allowances + OT1 + OT2
    ROUND(
      w.monthly_salary
      + COALESCE(w.housing_allowance, 0) + COALESCE(w.transport_allowance, 0)
      + COALESCE(w.food_allowance, 0) + COALESCE(w.other_allowance, 0)
      + COALESCE(agg.sum_ot_hours, 0) * (w.monthly_salary / 30.0 / 8.0) * 1.25
      + COALESCE(agg.sum_holiday_hours, 0) * (w.monthly_salary / 30.0 / 8.0) * 1.50
    , 2),
    0,
    ROUND(
      w.monthly_salary
      + COALESCE(w.housing_allowance, 0) + COALESCE(w.transport_allowance, 0)
      + COALESCE(w.food_allowance, 0) + COALESCE(w.other_allowance, 0)
      + COALESCE(agg.sum_ot_hours, 0) * (w.monthly_salary / 30.0 / 8.0) * 1.25
      + COALESCE(agg.sum_holiday_hours, 0) * (w.monthly_salary / 30.0 / 8.0) * 1.50
    , 2),
    w.payment_method,
    w.c3_status,
    'salaried_with_ot',
    COALESCE(
      (SELECT bool_or(th.ramadan_mode)
         FROM timesheet_headers th
        WHERE th.month = p_month AND th.year = p_year AND th.status = 'hr_approved'),
      false
    )
  FROM workers w
  LEFT JOIN (
    SELECT
      tl.worker_id,
      SUM(tl.total_hours)   AS sum_total_hours,
      SUM(tl.ot_hours)      AS sum_ot_hours,
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

  -- 6. Insert Office Staff lines (no timesheets, flat monthly)
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
    v_batch_id,
    w.id,
    w.monthly_salary,
    COALESCE(w.housing_allowance, 0),
    COALESCE(w.transport_allowance, 0),
    COALESCE(w.food_allowance, 0),
    COALESCE(w.other_allowance, 0),
    COALESCE(w.housing_allowance, 0) + COALESCE(w.transport_allowance, 0)
      + COALESCE(w.food_allowance, 0) + COALESCE(w.other_allowance, 0),
    ROUND(w.monthly_salary / 30.0 / 8.0, 4),
    NULL,  -- rate_used is NULL for salaried workers
    0, 0, 0, 0,  -- no OT for office staff
    NULL,         -- no timesheet hours
    -- gross = salary + allowances
    ROUND(
      w.monthly_salary
      + COALESCE(w.housing_allowance, 0) + COALESCE(w.transport_allowance, 0)
      + COALESCE(w.food_allowance, 0) + COALESCE(w.other_allowance, 0)
    , 2),
    0,
    ROUND(
      w.monthly_salary
      + COALESCE(w.housing_allowance, 0) + COALESCE(w.transport_allowance, 0)
      + COALESCE(w.food_allowance, 0) + COALESCE(w.other_allowance, 0)
    , 2),
    w.payment_method,
    w.c3_status,
    'salaried_no_ot',
    false
  FROM workers w
  WHERE w.category = 'Office Staff'
    AND w.status = 'active';

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_line_count := v_line_count + v_rows;

  -- 7. Update batch with totals
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

-- Stage D: Tighten CHECK — remove old values
ALTER TABLE payroll_lines
  DROP CONSTRAINT payroll_lines_payroll_type_check;
ALTER TABLE payroll_lines
  ADD CONSTRAINT payroll_lines_payroll_type_check
    CHECK (payroll_type IN ('salaried_with_ot','salaried_no_ot','flat_hourly'));

-- Verify:
-- SELECT payroll_type, COUNT(*) FROM payroll_lines GROUP BY payroll_type;
-- Expect 3 groups: salaried_with_ot, salaried_no_ot, flat_hourly. NO 'monthly' or 'hourly'.
