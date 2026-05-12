-- Migration 015: simple payroll deductions + subcontract payroll split
--
-- Rules:
--   * Permanent Staff: monthly salary + allowances + OT, less explicit
--     unauthorised-absence NWNP and warning/penalty deductions.
--   * Office Staff: monthly salary + allowances, less warning/penalty deductions.
--   * Contract Worker: flat hourly pay, less warning/penalty deductions.
--   * Subcontract Worker: excluded from Innovation payroll; supplier workers are
--     billed through supplier_timesheet_summaries.

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
  IF EXISTS (SELECT 1 FROM payroll_batches WHERE month = p_month AND year = p_year) THEN
    RAISE EXCEPTION 'Payroll batch already exists for %', p_month_label;
  END IF;

  SELECT COUNT(*) INTO v_unapproved
    FROM timesheet_headers
   WHERE month = p_month AND year = p_year
     AND status != 'hr_approved';
  IF v_unapproved > 0 THEN
    RAISE EXCEPTION '% timesheet(s) not yet HR-approved for this period', v_unapproved;
  END IF;

  INSERT INTO payroll_batches (month, year, month_label, status)
  VALUES (p_month, p_year, p_month_label, 'draft')
  RETURNING id INTO v_batch_id;

  -- Contract workers: simple flat hourly pay.
  WITH agg AS (
    SELECT
      tl.worker_id,
      SUM(tl.total_hours) AS sum_total_hours,
      SUM(tl.normal_hours) AS sum_normal_hours,
      SUM(tl.ot_hours) AS sum_ot_hours,
      SUM(tl.holiday_hours) AS sum_holiday_hours
    FROM timesheet_lines tl
    JOIN timesheet_headers th ON th.id = tl.header_id
    WHERE th.month = p_month AND th.year = p_year AND th.status = 'hr_approved'
    GROUP BY tl.worker_id
  ),
  warning_penalties AS (
    SELECT worker_id, SUM(COALESCE(penalty_amount, 0)) AS amount
    FROM warnings
    WHERE EXTRACT(MONTH FROM issued_date)::int = p_month
      AND EXTRACT(YEAR FROM issued_date)::int = p_year
      AND COALESCE(penalty_amount, 0) > 0
    GROUP BY worker_id
  ),
  confirmed_penalties AS (
    SELECT worker_id, SUM(COALESCE(amount, 0)) AS amount
    FROM penalty_deductions
    WHERE COALESCE(status, 'pending') = 'confirmed'
      AND warning_id IS NULL
      AND COALESCE(month, EXTRACT(MONTH FROM created_at)::int) = p_month
      AND COALESCE(year, EXTRACT(YEAR FROM created_at)::int) = p_year
    GROUP BY worker_id
  )
  INSERT INTO payroll_lines (
    batch_id, worker_id, basic_salary,
    housing_allowance, transport_allowance, food_allowance, other_allowance, allowances_total,
    base_hourly_rate, rate_used,
    ot1_hours, ot1_pay, ot2_hours, ot2_pay,
    total_hours, gross_pay,
    iloe_deduction, nwnp_deduction, penalty_deductions, other_deductions, deductions_total, net_pay,
    payment_method, c3_status, payroll_type, ramadan_mode
  )
  SELECT
    v_batch_id,
    w.id,
    ROUND(COALESCE(agg.sum_total_hours, 0) * COALESCE(w.hourly_rate, 0), 2),
    0, 0, 0, 0, 0,
    COALESCE(w.hourly_rate, 0),
    COALESCE(w.hourly_rate, 0),
    COALESCE(agg.sum_ot_hours, 0),
    0,
    COALESCE(agg.sum_holiday_hours, 0),
    0,
    COALESCE(agg.sum_total_hours, 0),
    ROUND(COALESCE(agg.sum_total_hours, 0) * COALESCE(w.hourly_rate, 0), 2),
    0,
    0,
    ROUND(COALESCE(wp.amount, 0) + COALESCE(cp.amount, 0), 2),
    0,
    ROUND(COALESCE(wp.amount, 0) + COALESCE(cp.amount, 0), 2),
    GREATEST(0, ROUND(COALESCE(agg.sum_total_hours, 0) * COALESCE(w.hourly_rate, 0), 2) - ROUND(COALESCE(wp.amount, 0) + COALESCE(cp.amount, 0), 2)),
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
  JOIN agg ON agg.worker_id = w.id
  LEFT JOIN warning_penalties wp ON wp.worker_id = w.id
  LEFT JOIN confirmed_penalties cp ON cp.worker_id = w.id
  WHERE w.category = 'Contract Worker'
    AND w.status = 'active';

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_line_count := v_rows;

  -- Permanent staff: salary + allowances + OT, less explicit unauthorised absence.
  WITH agg AS (
    SELECT
      tl.worker_id,
      SUM(tl.total_hours) AS sum_total_hours,
      SUM(tl.ot_hours) AS sum_ot_hours,
      SUM(tl.holiday_hours) AS sum_holiday_hours,
      SUM(
        CASE
          WHEN tl.absence_status = 'unauthorised_absent'
           AND COALESCE(tl.is_rest_day, false) = false
           AND COALESCE(tl.is_public_holiday, false) = false
          THEN GREATEST(0, 8 - COALESCE(tl.total_hours, 0))
          ELSE 0
        END
      ) AS unpaid_absent_hours
    FROM timesheet_lines tl
    JOIN timesheet_headers th ON th.id = tl.header_id
    WHERE th.month = p_month AND th.year = p_year AND th.status = 'hr_approved'
    GROUP BY tl.worker_id
  ),
  warning_penalties AS (
    SELECT worker_id, SUM(COALESCE(penalty_amount, 0)) AS amount
    FROM warnings
    WHERE EXTRACT(MONTH FROM issued_date)::int = p_month
      AND EXTRACT(YEAR FROM issued_date)::int = p_year
      AND COALESCE(penalty_amount, 0) > 0
    GROUP BY worker_id
  ),
  confirmed_penalties AS (
    SELECT worker_id, SUM(COALESCE(amount, 0)) AS amount
    FROM penalty_deductions
    WHERE COALESCE(status, 'pending') = 'confirmed'
      AND warning_id IS NULL
      AND COALESCE(month, EXTRACT(MONTH FROM created_at)::int) = p_month
      AND COALESCE(year, EXTRACT(YEAR FROM created_at)::int) = p_year
    GROUP BY worker_id
  ),
  calc AS (
    SELECT
      w.*,
      COALESCE(agg.sum_total_hours, 0) AS sum_total_hours,
      COALESCE(agg.sum_ot_hours, 0) AS sum_ot_hours,
      COALESCE(agg.sum_holiday_hours, 0) AS sum_holiday_hours,
      COALESCE(agg.unpaid_absent_hours, 0) AS unpaid_absent_hours,
      ROUND(COALESCE(w.monthly_salary, 0) / 30.0 / 8.0, 4) AS base_rate,
      COALESCE(w.housing_allowance, 0) + COALESCE(w.transport_allowance, 0)
        + COALESCE(w.food_allowance, 0) + COALESCE(w.other_allowance, 0) AS allowances,
      ROUND(COALESCE(wp.amount, 0) + COALESCE(cp.amount, 0), 2) AS penalties
    FROM workers w
    LEFT JOIN agg ON agg.worker_id = w.id
    LEFT JOIN warning_penalties wp ON wp.worker_id = w.id
    LEFT JOIN confirmed_penalties cp ON cp.worker_id = w.id
    WHERE w.category = 'Permanent Staff'
      AND w.status = 'active'
  ),
  final_calc AS (
    SELECT
      *,
      ROUND(sum_ot_hours * base_rate * 1.25, 2) AS ot1_calc,
      ROUND(sum_holiday_hours * base_rate * 1.50, 2) AS ot2_calc,
      ROUND(unpaid_absent_hours * base_rate, 2) AS nwnp_calc
    FROM calc
  )
  INSERT INTO payroll_lines (
    batch_id, worker_id, basic_salary,
    housing_allowance, transport_allowance, food_allowance, other_allowance, allowances_total,
    base_hourly_rate, rate_used,
    ot1_hours, ot1_pay, ot2_hours, ot2_pay,
    total_hours, gross_pay,
    iloe_deduction, nwnp_deduction, penalty_deductions, other_deductions, deductions_total, net_pay,
    payment_method, c3_status, payroll_type, ramadan_mode
  )
  SELECT
    v_batch_id,
    id,
    COALESCE(monthly_salary, 0),
    COALESCE(housing_allowance, 0),
    COALESCE(transport_allowance, 0),
    COALESCE(food_allowance, 0),
    COALESCE(other_allowance, 0),
    allowances,
    base_rate,
    NULL,
    sum_ot_hours,
    ot1_calc,
    sum_holiday_hours,
    ot2_calc,
    sum_total_hours,
    ROUND(COALESCE(monthly_salary, 0) + allowances + ot1_calc + ot2_calc, 2),
    0,
    nwnp_calc,
    penalties,
    0,
    ROUND(nwnp_calc + penalties, 2),
    GREATEST(0, ROUND(COALESCE(monthly_salary, 0) + allowances + ot1_calc + ot2_calc, 2) - ROUND(nwnp_calc + penalties, 2)),
    payment_method,
    c3_status,
    'salaried_with_ot',
    COALESCE(
      (SELECT bool_or(th.ramadan_mode)
         FROM timesheet_headers th
        WHERE th.month = p_month AND th.year = p_year AND th.status = 'hr_approved'),
      false
    )
  FROM final_calc;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_line_count := v_line_count + v_rows;

  -- Office staff: simple monthly salary, no timesheet requirement.
  WITH warning_penalties AS (
    SELECT worker_id, SUM(COALESCE(penalty_amount, 0)) AS amount
    FROM warnings
    WHERE EXTRACT(MONTH FROM issued_date)::int = p_month
      AND EXTRACT(YEAR FROM issued_date)::int = p_year
      AND COALESCE(penalty_amount, 0) > 0
    GROUP BY worker_id
  ),
  confirmed_penalties AS (
    SELECT worker_id, SUM(COALESCE(amount, 0)) AS amount
    FROM penalty_deductions
    WHERE COALESCE(status, 'pending') = 'confirmed'
      AND warning_id IS NULL
      AND COALESCE(month, EXTRACT(MONTH FROM created_at)::int) = p_month
      AND COALESCE(year, EXTRACT(YEAR FROM created_at)::int) = p_year
    GROUP BY worker_id
  ),
  calc AS (
    SELECT
      w.*,
      COALESCE(w.housing_allowance, 0) + COALESCE(w.transport_allowance, 0)
        + COALESCE(w.food_allowance, 0) + COALESCE(w.other_allowance, 0) AS allowances,
      ROUND(COALESCE(wp.amount, 0) + COALESCE(cp.amount, 0), 2) AS penalties
    FROM workers w
    LEFT JOIN warning_penalties wp ON wp.worker_id = w.id
    LEFT JOIN confirmed_penalties cp ON cp.worker_id = w.id
    WHERE w.category = 'Office Staff'
      AND w.status = 'active'
  )
  INSERT INTO payroll_lines (
    batch_id, worker_id, basic_salary,
    housing_allowance, transport_allowance, food_allowance, other_allowance, allowances_total,
    base_hourly_rate, rate_used,
    ot1_hours, ot1_pay, ot2_hours, ot2_pay,
    total_hours, gross_pay,
    iloe_deduction, nwnp_deduction, penalty_deductions, other_deductions, deductions_total, net_pay,
    payment_method, c3_status, payroll_type, ramadan_mode
  )
  SELECT
    v_batch_id,
    id,
    COALESCE(monthly_salary, 0),
    COALESCE(housing_allowance, 0),
    COALESCE(transport_allowance, 0),
    COALESCE(food_allowance, 0),
    COALESCE(other_allowance, 0),
    allowances,
    ROUND(COALESCE(monthly_salary, 0) / 30.0 / 8.0, 4),
    NULL,
    0, 0, 0, 0,
    NULL,
    ROUND(COALESCE(monthly_salary, 0) + allowances, 2),
    0,
    0,
    penalties,
    0,
    penalties,
    GREATEST(0, ROUND(COALESCE(monthly_salary, 0) + allowances, 2) - penalties),
    payment_method,
    c3_status,
    'salaried_no_ot',
    false
  FROM calc;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_line_count := v_line_count + v_rows;

  UPDATE payroll_batches SET
    total_gross      = (SELECT COALESCE(SUM(gross_pay), 0) FROM payroll_lines WHERE batch_id = v_batch_id),
    total_deductions = (SELECT COALESCE(SUM(deductions_total), 0) FROM payroll_lines WHERE batch_id = v_batch_id),
    total_net        = (SELECT COALESCE(SUM(net_pay), 0) FROM payroll_lines WHERE batch_id = v_batch_id),
    wps_total        = (SELECT COALESCE(SUM(net_pay), 0) FROM payroll_lines WHERE batch_id = v_batch_id AND payment_method = 'WPS'),
    non_wps_total    = (SELECT COALESCE(SUM(net_pay), 0) FROM payroll_lines WHERE batch_id = v_batch_id AND payment_method = 'Non-WPS'),
    cash_total       = (SELECT COALESCE(SUM(net_pay), 0) FROM payroll_lines WHERE batch_id = v_batch_id AND payment_method = 'Cash'),
    worker_count     = v_line_count,
    status           = 'calculated',
    updated_at       = now()
  WHERE id = v_batch_id;

  RETURN v_batch_id;
END;
$$;
