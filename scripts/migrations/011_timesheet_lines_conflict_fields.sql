-- Migration 011: Add conflict-resolution fields + unique constraint to timesheet_lines
-- PR #9 — per IWS_RULES_LOCKED.md §4.3, §6, §10

ALTER TABLE timesheet_lines
  ADD COLUMN IF NOT EXISTS is_rest_day BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS absence_status TEXT DEFAULT NULL
    CHECK (absence_status IS NULL OR absence_status IN (
      'conflict',
      'unauthorised_absent',
      'sick_certified',
      'approved_leave',
      'short_day_authorised',
      'resolved_error'
    )),
  ADD COLUMN IF NOT EXISTS sick_cert_reference TEXT,
  ADD COLUMN IF NOT EXISTS approved_leave_type TEXT
    CHECK (approved_leave_type IS NULL OR approved_leave_type IN ('annual','emergency','unpaid')),
  ADD COLUMN IF NOT EXISTS absence_note TEXT;

-- Unique constraint for grid upsert support
-- First check for duplicates (should be 0):
-- SELECT worker_id, work_date, header_id, COUNT(*)
-- FROM timesheet_lines GROUP BY 1, 2, 3 HAVING COUNT(*) > 1;

ALTER TABLE timesheet_lines
  ADD CONSTRAINT timesheet_lines_unique_worker_date_header
    UNIQUE (worker_id, work_date, header_id);

-- Verify columns:
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name='timesheet_lines'
--   AND column_name IN ('is_rest_day','absence_status','sick_cert_reference','approved_leave_type','absence_note');
-- Expect 5 rows.

-- Verify constraint:
-- SELECT conname FROM pg_constraint
-- WHERE conrelid='timesheet_lines'::regclass AND contype='u';
-- Expect timesheet_lines_unique_worker_date_header.
