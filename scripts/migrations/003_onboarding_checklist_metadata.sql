-- 003_onboarding_checklist_metadata.sql
--
-- Adds per-doc-type metadata columns to public.documents, adds medical_failed
-- to public.workers, and a check constraint for medical_result.
--
-- Additive and idempotent. Does NOT drop any existing columns on public.workers
-- — the workers identity/policy columns remain as a denormalised read cache,
-- written by the service layer when a document is saved.
--
-- RUN MANUALLY VIA SUPABASE SQL EDITOR (or MCP). Not executed by the code PR.

BEGIN;

-- ─── documents: per-doc-type metadata ───────────────────────────────────

-- Passport Copy
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS passport_number   text;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS issuing_country   text;

-- UAE Visa
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS visa_number       text;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS visa_type         text;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS issuing_emirate   text;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS sponsor           text;

-- Emirates ID
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS eid_number        text;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS front_file_url    text;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS back_file_url     text;

-- Health Insurance + Workmen's Compensation
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS policy_number     text;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS policy_reference  text;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS provider          text;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS coverage_type     text;

-- Medical Fitness — pass/fail (no file)
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS medical_result    text;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid='public.documents'::regclass
       AND conname='documents_medical_result_check'
  ) THEN
    ALTER TABLE public.documents
      ADD CONSTRAINT documents_medical_result_check
      CHECK (medical_result IS NULL OR medical_result IN ('pass','fail'));
  END IF;
END $$;

-- ─── workers: medical_failed ─────────────────────────────────────────────

ALTER TABLE public.workers
  ADD COLUMN IF NOT EXISTS medical_failed boolean NOT NULL DEFAULT false;

-- ─── indexes ─────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS documents_passport_number_idx
  ON public.documents(passport_number) WHERE passport_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS documents_eid_number_idx
  ON public.documents(eid_number)      WHERE eid_number      IS NOT NULL;
CREATE INDEX IF NOT EXISTS documents_visa_number_idx
  ON public.documents(visa_number)     WHERE visa_number     IS NOT NULL;
CREATE INDEX IF NOT EXISTS documents_policy_number_idx
  ON public.documents(policy_number)   WHERE policy_number   IS NOT NULL;

COMMIT;
