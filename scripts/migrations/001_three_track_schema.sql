-- ============================================================
-- Migration 001 — Three-track worker system
-- Adds entry_track, suppliers, supplier_rates, supplier_timesheet_summaries
-- Run in Supabase SQL Editor (Dashboard → SQL)
-- ============================================================

-- 1A — entry_track on workers
ALTER TABLE workers
ADD COLUMN IF NOT EXISTS entry_track text
  CHECK (entry_track IN ('direct_staff', 'contract_worker', 'subcontractor_company_worker'))
  DEFAULT 'contract_worker';

UPDATE workers SET entry_track = 'direct_staff'
WHERE category IN ('Permanent Staff', 'Office Staff');

UPDATE workers SET entry_track = 'contract_worker'
WHERE category = 'Contract Worker';

UPDATE workers SET entry_track = 'subcontractor_company_worker'
WHERE category = 'Subcontract Worker';

-- 1B — suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_person text,
  email text,
  phone text,
  address text,
  trade_speciality text,
  po_number text,
  po_value numeric DEFAULT 0,
  po_start_date date,
  po_end_date date,
  payment_terms text DEFAULT '30 days',
  active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all" ON suppliers;
CREATE POLICY "service_role_all" ON suppliers FOR ALL TO public USING (true);

-- 1C — supplier_rates
CREATE TABLE IF NOT EXISTS supplier_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES suppliers(id) ON DELETE CASCADE,
  trade_role text NOT NULL,
  hourly_rate numeric NOT NULL,
  effective_from date NOT NULL,
  effective_to date,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE supplier_rates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all" ON supplier_rates;
CREATE POLICY "service_role_all" ON supplier_rates FOR ALL TO public USING (true);

-- 1D — supplier_id + supplier_rate on workers
ALTER TABLE workers ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES suppliers(id);
ALTER TABLE workers ADD COLUMN IF NOT EXISTS supplier_rate numeric;

-- 1E — supplier_timesheet_summaries
CREATE TABLE IF NOT EXISTS supplier_timesheet_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES suppliers(id),
  month integer CHECK (month >= 1 AND month <= 12),
  year integer,
  month_label text,
  total_workers integer DEFAULT 0,
  total_hours numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  po_number text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'invoiced', 'paid')),
  sent_at timestamptz,
  sent_by text,
  invoice_received boolean DEFAULT false,
  invoice_number text,
  invoice_amount numeric,
  invoice_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE supplier_timesheet_summaries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all" ON supplier_timesheet_summaries;
CREATE POLICY "service_role_all" ON supplier_timesheet_summaries FOR ALL TO public USING (true);

-- 1F — seed 5 placeholder suppliers
INSERT INTO suppliers (name, trade_speciality, po_number, po_value, po_start_date, po_end_date, payment_terms, notes)
VALUES
  ('Supplier Company 1', 'Scaffolding & Access', 'PO-2026-001', 0, '2026-01-01', '2026-12-31', '30 days', 'Update with real company name and PO details'),
  ('Supplier Company 2', 'Marine & Rigging', 'PO-2026-002', 0, '2026-01-01', '2026-12-31', '30 days', 'Update with real company name and PO details'),
  ('Supplier Company 3', 'Civil & Structural', 'PO-2026-003', 0, '2026-01-01', '2026-12-31', '30 days', 'Update with real company name and PO details'),
  ('Supplier Company 4', 'Mechanical & Piping', 'PO-2026-004', 0, '2026-01-01', '2026-12-31', '30 days', 'Update with real company name and PO details'),
  ('Supplier Company 5', 'Electrical & Instrumentation', 'PO-2026-005', 0, '2026-01-01', '2026-12-31', '30 days', 'Update with real company name and PO details')
ON CONFLICT DO NOTHING;
