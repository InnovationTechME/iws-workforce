-- Adds operational safety tables for audit logs, deleted-record snapshots,
-- and payslip/warning/letter delivery tracking.

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id text,
  action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  actor_id uuid DEFAULT auth.uid(),
  actor_role text DEFAULT COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', 'unknown'),
  source text NOT NULL DEFAULT 'database_trigger',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.deleted_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table text NOT NULL,
  record_id text,
  record_data jsonb NOT NULL,
  deleted_by uuid DEFAULT auth.uid(),
  deleted_role text DEFAULT COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', 'unknown'),
  deleted_at timestamptz NOT NULL DEFAULT now(),
  restore_status text NOT NULL DEFAULT 'available' CHECK (restore_status IN ('available', 'restored', 'ignored')),
  restored_at timestamptz,
  restored_by uuid,
  restore_note text
);

CREATE TABLE IF NOT EXISTS public.document_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid REFERENCES public.workers(id) ON DELETE SET NULL,
  worker_number text,
  worker_name text,
  delivery_type text NOT NULL CHECK (delivery_type IN ('payslip', 'warning', 'letter', 'document_pack', 'other')),
  linked_table text,
  linked_record_id uuid,
  file_ref text,
  method text NOT NULL DEFAULT 'manual' CHECK (method IN ('manual', 'email', 'whatsapp', 'download', 'printed', 'other')),
  recipient text,
  status text NOT NULL DEFAULT 'recorded' CHECK (status IN ('queued', 'sent', 'failed', 'recorded', 'acknowledged')),
  sent_at timestamptz,
  acknowledged_at timestamptz,
  sent_by text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deleted_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_logs_authenticated_read ON public.audit_logs;
CREATE POLICY audit_logs_authenticated_read
  ON public.audit_logs FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS audit_logs_authenticated_insert ON public.audit_logs;
CREATE POLICY audit_logs_authenticated_insert
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS deleted_records_authenticated_read ON public.deleted_records;
CREATE POLICY deleted_records_authenticated_read
  ON public.deleted_records FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS deleted_records_authenticated_insert ON public.deleted_records;
CREATE POLICY deleted_records_authenticated_insert
  ON public.deleted_records FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS deleted_records_authenticated_update ON public.deleted_records;
CREATE POLICY deleted_records_authenticated_update
  ON public.deleted_records FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS document_deliveries_authenticated_all ON public.document_deliveries;
CREATE POLICY document_deliveries_authenticated_all
  ON public.document_deliveries FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.deleted_records TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.document_deliveries TO authenticated;

CREATE OR REPLACE FUNCTION public.set_document_deliveries_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_document_deliveries_updated_at ON public.document_deliveries;
CREATE TRIGGER set_document_deliveries_updated_at
  BEFORE UPDATE ON public.document_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION public.set_document_deliveries_updated_at();

CREATE OR REPLACE FUNCTION public.log_audit_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_record_id text;
BEGIN
  v_record_id := COALESCE(NEW.id::text, OLD.id::text);

  INSERT INTO public.audit_logs (
    table_name,
    record_id,
    action,
    old_data,
    new_data
  )
  VALUES (
    TG_TABLE_NAME,
    v_record_id,
    TG_OP,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.capture_deleted_record()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.deleted_records (
    source_table,
    record_id,
    record_data
  )
  VALUES (
    TG_TABLE_NAME,
    OLD.id::text,
    to_jsonb(OLD)
  );
  RETURN OLD;
END;
$$;

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'workers',
    'suppliers',
    'supplier_rates',
    'documents',
    'certifications',
    'warnings',
    'letters',
    'tasks',
    'timesheet_headers',
    'timesheet_lines',
    'timesheet_discrepancies',
    'supplier_timesheet_summaries',
    'payroll_batches',
    'payroll_lines',
    'payroll_adjustments',
    'offboarding',
    'onboarding',
    'offers',
    'clients',
    'attendance',
    'leave_records',
    'public_holidays',
    'work_experience'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', 'iws_audit_' || t, t);
      EXECUTE format(
        'CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.log_audit_change()',
        'iws_audit_' || t,
        t
      );

      EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', 'iws_deleted_' || t, t);
      EXECUTE format(
        'CREATE TRIGGER %I BEFORE DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.capture_deleted_record()',
        'iws_deleted_' || t,
        t
      );
    END IF;
  END LOOP;
END;
$$;
