-- Migration 007: Payroll Pipeline RPC
-- Adds rate_used column, unique constraint, indexes, and the generate_payroll_batch RPC.
-- DO NOT RUN MANUALLY — applied via Supabase MCP after review.

-- 1. Add rate_used column to payroll_lines (snapshot of hourly_rate at batch time)
ALTER TABLE public.payroll_lines
  ADD COLUMN IF NOT EXISTS rate_used NUMERIC(8,2);

COMMENT ON COLUMN public.payroll_lines.rate_used
  IS 'Snapshot of workers.hourly_rate at batch-generation time. NULL for monthly-salaried workers.';

-- 2. Unique constraint to prevent duplicate batches per month
ALTER TABLE public.payroll_batches
  ADD CONSTRAINT payroll_batches_month_year_unique UNIQUE (month, year);

-- 3. Indexes to speed up the RPC
CREATE INDEX IF NOT EXISTS idx_timesheet_lines_header_worker
  ON public.timesheet_lines (header_id, worker_id);

CREATE INDEX IF NOT EXISTS idx_timesheet_headers_month_year_status
  ON public.timesheet_headers (month, year, status);

CREATE INDEX IF NOT EXISTS idx_payroll_batches_month_year
  ON public.payroll_batches (month, year);

-- 4. The RPC — atomic batch generation
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
    RAISE EXCEPTION 'Payroll batch already exists for % %', p_month_label, p_year;
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

  -- 4. Insert hourly worker lines (Contract Worker + Subcontract Worker)
  --    Branch on category — ignore monthly_salary even if populated.
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
    -- basic_salary: total_hours * hourly_rate (flat rate — OT hours included at same rate)
    COALESCE(agg.sum_total_hours, 0) * w.hourly_rate,
    -- allowances: zero for hourly workers
    0, 0, 0, 0, 0,
    -- base_hourly_rate + rate_used snapshot
    w.hourly_rate,
    w.hourly_rate,
    -- ot1: stored for info, pay = 0 (flat rate — no weekday OT premium)
    COALESCE(agg.sum_ot_hours, 0),
    0,
    -- ot2: holiday premium = holiday_hours * rate * 0.50 (the extra 50% on top of base)
    COALESCE(agg.sum_holiday_hours, 0),
    ROUND(COALESCE(agg.sum_holiday_hours, 0) * w.hourly_rate * 0.50, 2),
    -- total_hours
    COALESCE(agg.sum_total_hours, 0),
    -- gross_pay = basic + holiday premium
    ROUND(
      (COALESCE(agg.sum_total_hours, 0) * w.hourly_rate)
      + (COALESCE(agg.sum_holiday_hours, 0) * w.hourly_rate * 0.50)
    , 2),
    -- deductions: 0 for PR #6
    0,
    -- net_pay = gross (no deductions in v1)
    ROUND(
      (COALESCE(agg.sum_total_hours, 0) * w.hourly_rate)
      + (COALESCE(agg.sum_holiday_hours, 0) * w.hourly_rate * 0.50)
    , 2),
    -- payment method from worker
    w.payment_method,
    w.c3_status,
    'hourly',
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
    'monthly',
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
    'monthly',
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
