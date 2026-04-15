-- 006_dob_and_sync.sql
-- Round D follow-up
-- Adds workers.date_of_birth and backfills the denormalised identity
-- fields on workers from their documents rows. Onboarding already writes
-- both places via lib/onboardingService.saveOnboardingDoc; the missing
-- link was the worker-profile Documents tab (lib/documentService.
-- upsertDocument), which is fixed in the same PR. This migration
-- reconciles existing rows that were saved before the fix.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS; each UPDATE only writes where
-- the workers column is still NULL.

BEGIN;

-- 1. DOB column -------------------------------------------------------------
ALTER TABLE public.workers
  ADD COLUMN IF NOT EXISTS date_of_birth date;

-- 1a. DOB column on offers too, so direct-staff DOB captured at offer time
-- can flow through to the worker row when the offer is accepted.
ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS date_of_birth date;

-- 2. Backfill workers.emirates_id from documents.eid_number ----------------
UPDATE public.workers w
SET emirates_id = d.eid_number
FROM public.documents d
WHERE d.worker_id = w.id
  AND d.doc_type = 'emirates_id'
  AND d.eid_number IS NOT NULL
  AND w.emirates_id IS NULL;

-- 3. Backfill workers.emirates_id_expiry from documents.expiry_date --------
UPDATE public.workers w
SET emirates_id_expiry = d.expiry_date
FROM public.documents d
WHERE d.worker_id = w.id
  AND d.doc_type = 'emirates_id'
  AND d.expiry_date IS NOT NULL
  AND w.emirates_id_expiry IS NULL;

-- 4. Backfill workers.visa_number from documents.visa_number ---------------
UPDATE public.workers w
SET visa_number = d.visa_number
FROM public.documents d
WHERE d.worker_id = w.id
  AND d.doc_type = 'uae_visa'
  AND d.visa_number IS NOT NULL
  AND w.visa_number IS NULL;

-- 5. Backfill workers.visa_expiry from documents.expiry_date ---------------
UPDATE public.workers w
SET visa_expiry = d.expiry_date
FROM public.documents d
WHERE d.worker_id = w.id
  AND d.doc_type = 'uae_visa'
  AND d.expiry_date IS NOT NULL
  AND w.visa_expiry IS NULL;

-- 6. Backfill workers.passport_number from documents.passport_number -------
UPDATE public.workers w
SET passport_number = d.passport_number
FROM public.documents d
WHERE d.worker_id = w.id
  AND d.doc_type = 'passport_copy'
  AND d.passport_number IS NOT NULL
  AND w.passport_number IS NULL;

-- 7. Backfill workers.passport_expiry from documents.expiry_date -----------
UPDATE public.workers w
SET passport_expiry = d.expiry_date
FROM public.documents d
WHERE d.worker_id = w.id
  AND d.doc_type = 'passport_copy'
  AND d.expiry_date IS NOT NULL
  AND w.passport_expiry IS NULL;

COMMIT;
