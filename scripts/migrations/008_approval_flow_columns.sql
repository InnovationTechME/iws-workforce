-- 008_approval_flow_columns.sql
-- PR #7: Payroll approval flow & locking — add missing columns for
-- owner rejection, unlock tracking, and timesheet→batch back-pointer.

-- 1. Add owner_rejection_reason to payroll_batches
ALTER TABLE payroll_batches
  ADD COLUMN IF NOT EXISTS owner_rejection_reason TEXT;

-- 2. Add unlock tracking columns
ALTER TABLE payroll_batches
  ADD COLUMN IF NOT EXISTS unlock_reason TEXT,
  ADD COLUMN IF NOT EXISTS unlocked_by TEXT,
  ADD COLUMN IF NOT EXISTS unlocked_at TIMESTAMPTZ;

-- 3. Add payroll_batch_id FK on timesheet_headers
ALTER TABLE timesheet_headers
  ADD COLUMN IF NOT EXISTS payroll_batch_id UUID
    REFERENCES payroll_batches(id) ON DELETE SET NULL;

-- 4. Backfill: link existing timesheet headers to their batch by month+year
UPDATE timesheet_headers th
SET payroll_batch_id = (
  SELECT id FROM payroll_batches pb
  WHERE pb.month = th.month AND pb.year = th.year
  LIMIT 1
)
WHERE th.payroll_batch_id IS NULL
  AND EXISTS (
    SELECT 1 FROM payroll_batches pb
    WHERE pb.month = th.month AND pb.year = th.year
  );

-- 5. Index for efficient batch→timesheet lookups
CREATE INDEX IF NOT EXISTS idx_timesheet_headers_payroll_batch_id
  ON timesheet_headers(payroll_batch_id);

-- 6. Drop the duplicate unique constraint (cosmetic cleanup)
ALTER TABLE payroll_batches
  DROP CONSTRAINT IF EXISTS payroll_batches_month_year_key;
-- payroll_batches_month_year_unique remains.
