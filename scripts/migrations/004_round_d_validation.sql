-- 004_round_d_validation.sql
-- Round D / PR #4
-- Adds onboarding.backfilled, normalises legacy nationality rows, applies
-- allow-list + EID format CHECK constraints, and backfills onboarding rows
-- for the 24 workers that pre-date the §5.3.5 invariant.
--
-- Idempotent: safe to re-run. ALTERs guarded by IF NOT EXISTS / DO $$ blocks.
-- The onboarding backfill uses WHERE NOT EXISTS.

BEGIN;

-- 1. onboarding.backfilled flag -----------------------------------------------
ALTER TABLE public.onboarding
  ADD COLUMN IF NOT EXISTS backfilled boolean NOT NULL DEFAULT false;

-- 2. Normalise legacy nationality values (country form -> demonym) ------------
--    Runs before the CHECK constraint so the constraint can be applied VALID.
UPDATE public.workers SET nationality = 'Indian'      WHERE nationality = 'India';
UPDATE public.workers SET nationality = 'Nepali'      WHERE nationality = 'Nepal';
UPDATE public.workers SET nationality = 'Nigerian'    WHERE nationality = 'Nigeria';
UPDATE public.workers SET nationality = 'Filipino'    WHERE nationality = 'Philippines';
UPDATE public.workers SET nationality = 'Bangladeshi' WHERE nationality = 'Bangladesh';
UPDATE public.workers SET nationality = 'Afghan'      WHERE nationality = 'Afghanistan';

-- 3. workers.nationality allow-list CHECK (VALID) -----------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.workers'::regclass
       AND conname  = 'workers_nationality_allowed'
  ) THEN
    ALTER TABLE public.workers
      ADD CONSTRAINT workers_nationality_allowed
      CHECK (nationality IS NULL OR nationality IN (
        'Emirati','British','Indian','Nepali','Pakistani','Filipino',
        'Ghanaian','Zambian','Ethiopian','Nigerian','Ugandan',
        'Bangladeshi','Syrian','Sri Lankan','Afghan','Omani',
        'Other'
      ));
  END IF;
END $$;

-- 4. workers.emirates_id format CHECK (VALID — 0 current violations) ----------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.workers'::regclass
       AND conname  = 'workers_emirates_id_format'
  ) THEN
    ALTER TABLE public.workers
      ADD CONSTRAINT workers_emirates_id_format
      CHECK (emirates_id IS NULL OR emirates_id ~ '^784-\d{4}-\d{7}-\d$');
  END IF;
END $$;

-- 5. documents.eid_number format CHECK ---------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.documents'::regclass
       AND conname  = 'documents_eid_number_format'
  ) THEN
    ALTER TABLE public.documents
      ADD CONSTRAINT documents_eid_number_format
      CHECK (eid_number IS NULL OR eid_number ~ '^784-\d{4}-\d{7}-\d$');
  END IF;
END $$;

-- 6. Backfill onboarding rows for workers that lack one (expected: 24) --------
INSERT INTO public.onboarding (
  worker_id, offer_id, completed_at,
  has_passport, has_photo, has_medical_cert, has_signed_offer,
  has_emirates_id, has_uae_visa, has_labour_card, has_iloe_cert,
  has_health_insurance, has_workmen_comp,
  backfilled, created_at, updated_at
)
SELECT
  w.id,
  NULL,
  w.created_at,
  COALESCE((SELECT bool_or(file_url IS NOT NULL) FROM public.documents d WHERE d.worker_id = w.id AND d.doc_type = 'passport_copy'),         false),
  COALESCE((SELECT bool_or(file_url IS NOT NULL) FROM public.documents d WHERE d.worker_id = w.id AND d.doc_type = 'passport_photo'),        false),
  false,
  COALESCE((SELECT bool_or(file_url IS NOT NULL) FROM public.documents d WHERE d.worker_id = w.id AND d.doc_type = 'offer_letter'),          false),
  COALESCE((SELECT bool_or(file_url IS NOT NULL) FROM public.documents d WHERE d.worker_id = w.id AND d.doc_type = 'emirates_id'),           false),
  COALESCE((SELECT bool_or(file_url IS NOT NULL) FROM public.documents d WHERE d.worker_id = w.id AND d.doc_type = 'uae_visa'),              false),
  COALESCE((SELECT bool_or(file_url IS NOT NULL) FROM public.documents d WHERE d.worker_id = w.id AND d.doc_type = 'labour_card'),           false),
  COALESCE((SELECT bool_or(file_url IS NOT NULL) FROM public.documents d WHERE d.worker_id = w.id AND d.doc_type = 'iloe_certificate'),      false),
  COALESCE((SELECT bool_or(file_url IS NOT NULL) FROM public.documents d WHERE d.worker_id = w.id AND d.doc_type = 'health_insurance'),      false),
  COALESCE((SELECT bool_or(file_url IS NOT NULL) FROM public.documents d WHERE d.worker_id = w.id AND d.doc_type = 'workmen_compensation'),  false),
  true,
  w.created_at,
  now()
FROM public.workers w
WHERE NOT EXISTS (SELECT 1 FROM public.onboarding o WHERE o.worker_id = w.id);

COMMIT;
