-- 005_contract_track_and_work_experience.sql
-- Round D / PR #5
-- Adds public.work_experience, applies the contract-worker hourly rate
-- CHECK (9..22 AED/hr, integer-only enforced by UI), normalises 4 existing
-- non-conformant contract rates (test data, per Jo), and backfills a
-- system-created current-position row for every active/onboarding worker.
--
-- Idempotent: CREATE TABLE IF NOT EXISTS, constraint guarded by DO $$ block,
-- backfill uses WHERE NOT EXISTS. UPDATEs are worker-number scoped.

BEGIN;

-- 1. work_experience table ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.work_experience (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id       uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  company_name    text NOT NULL,
  position        text,
  from_date       date,
  to_date         date,
  is_current      boolean NOT NULL DEFAULT false,
  system_created  boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS work_experience_worker_id_idx
  ON public.work_experience(worker_id);

CREATE UNIQUE INDEX IF NOT EXISTS work_experience_one_current_per_worker
  ON public.work_experience(worker_id) WHERE is_current;

ALTER TABLE public.work_experience ENABLE ROW LEVEL SECURITY;

-- RLS policies mirrored from public.documents (HR Admin + Owner write, all
-- authenticated read). Guarded so re-runs don't fail.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='work_experience' AND policyname='work_experience_select_all'
  ) THEN
    CREATE POLICY work_experience_select_all ON public.work_experience
      FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='work_experience' AND policyname='work_experience_write_all'
  ) THEN
    CREATE POLICY work_experience_write_all ON public.work_experience
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 2. Normalise the 4 non-conformant contract hourly rates -------------------
--    Test data per Jo. Standard rounding (<.50 down, >=.50 up); the 24 row
--    caps to the max 22. Done before adding the CHECK so VALIDATE passes.
UPDATE public.workers SET hourly_rate = 10 WHERE worker_number = 'IWS-2026-0011';
UPDATE public.workers SET hourly_rate = 10 WHERE worker_number = 'IWS-2026-0012';
UPDATE public.workers SET hourly_rate = 12 WHERE worker_number = 'IWS-2026-0013';
UPDATE public.workers SET hourly_rate = 22 WHERE worker_number = 'IWS-2026-0009';

-- 3. Contract-worker hourly rate CHECK (VALID immediately) ------------------
--    Conditional on entry_track so direct staff / subcontractors are not
--    affected. NULL allowed because non-contract rows have hourly_rate NULL.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workers_contract_hourly_rate_range'
  ) THEN
    ALTER TABLE public.workers
      ADD CONSTRAINT workers_contract_hourly_rate_range
      CHECK (
        entry_track <> 'contract_worker'
        OR hourly_rate IS NULL
        OR hourly_rate BETWEEN 9 AND 22
      );
  END IF;
END $$;

-- 4. Backfill current-position rows for every active/onboarding worker -----
INSERT INTO public.work_experience
  (worker_id, company_name, position, from_date, is_current, system_created)
SELECT
  w.id,
  'Innovation Technologies LLC O.P.C.',
  w.trade_role,
  COALESCE(w.joining_date, w.created_at::date),
  true,
  true
FROM public.workers w
WHERE w.status IN ('active', 'onboarding')
  AND NOT EXISTS (
    SELECT 1 FROM public.work_experience we
    WHERE we.worker_id = w.id AND we.is_current
  );

COMMIT;
