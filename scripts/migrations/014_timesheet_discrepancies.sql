-- Migration 014: Persist timesheet reconciliation discrepancies
-- Supports client/supplier monthly timesheet comparison before payroll approval.

CREATE TABLE IF NOT EXISTS timesheet_discrepancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  header_id UUID NOT NULL REFERENCES timesheet_headers(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES workers(id) ON DELETE SET NULL,
  client_worker_id TEXT,
  client_worker_name TEXT NOT NULL,
  client_trade TEXT,
  iws_worker_name TEXT,
  iws_hours NUMERIC(10,2) NOT NULL DEFAULT 0,
  client_hours NUMERIC(10,2) NOT NULL DEFAULT 0,
  difference NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','resolved','ignored')),
  resolution TEXT,
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,
  source_file_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_timesheet_discrepancies_header_status
  ON timesheet_discrepancies(header_id, status);

CREATE INDEX IF NOT EXISTS idx_timesheet_discrepancies_worker
  ON timesheet_discrepancies(worker_id);

CREATE OR REPLACE FUNCTION set_timesheet_discrepancies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_timesheet_discrepancies_updated_at ON timesheet_discrepancies;
CREATE TRIGGER trg_timesheet_discrepancies_updated_at
BEFORE UPDATE ON timesheet_discrepancies
FOR EACH ROW EXECUTE FUNCTION set_timesheet_discrepancies_updated_at();
