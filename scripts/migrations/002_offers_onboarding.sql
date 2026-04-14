-- 002_offers_onboarding.sql
-- Wires the Offer -> Onboarding handoff.
-- Safe to run against a database that already has `offers`, `workers`, and
-- `onboarding` tables from prior migrations. Every DDL statement is idempotent.
--
-- What this migration does:
--   1. Extends `offers.status` CHECK to include 'accepted' and 'rejected'
--      while keeping legacy 'signed' and 'rescinded' valid (backward-compat).
--   2. Adds the columns the Accept flow needs on `offers`:
--        signed_offer_url, decided_at, decided_by
--      (worker_id is assumed to exist already — see Questions for Jo #2 in the
--      diagnose report; if absent, uncomment the ADD COLUMN line below.)
--   3. Adds `offer_id` to the existing `onboarding` table so the onboarding
--      row can be traced back to the source offer. Does NOT rename the table.
--   4. Adds supporting indexes.
--   5. Enables RLS and creates minimal policies for roles: owner, hr_admin,
--      operations. Role is read from the JWT claim `role`.
--
-- Not included (out of scope for this migration):
--   - Creating `offers` or `onboarding` from scratch.
--   - Migrating existing 'signed' rows to 'accepted' or 'rescinded' to
--     'rejected'. Existing rows stay on legacy values; new writes use the
--     new values.
--   - Storage bucket creation. Signed offer PDFs land in the existing
--     `letter-archive` bucket under `offers/{ref_number}/...`.

BEGIN;

-- ─── offers table ──────────────────────────────────────────────────────────

-- Extend status CHECK to include new values. Drop old constraint by name
-- guardedly, then re-add. The constraint name may differ; try common ones.
DO $$
DECLARE c RECORD;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
     WHERE conrelid = 'public.offers'::regclass
       AND contype = 'c'
       AND pg_get_constraintdef(oid) ILIKE '%status%IN%'
  LOOP
    EXECUTE format('ALTER TABLE public.offers DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.offers
  ADD CONSTRAINT offers_status_check
  CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'signed', 'rescinded'));

-- New columns for the Accept flow (all nullable, no defaults that would
-- rewrite existing rows).
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS signed_offer_url text;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS decided_at       timestamptz;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS decided_by       text;

-- worker_id already exists in the current schema per lib/offerService.js
-- `getOfferByWorker`. If it does not, uncomment:
-- ALTER TABLE public.offers
--   ADD COLUMN IF NOT EXISTS worker_id uuid REFERENCES public.workers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS offers_status_idx    ON public.offers(status);
CREATE INDEX IF NOT EXISTS offers_worker_id_idx ON public.offers(worker_id);

-- ─── onboarding table ─────────────────────────────────────────────────────

ALTER TABLE public.onboarding
  ADD COLUMN IF NOT EXISTS offer_id uuid REFERENCES public.offers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS onboarding_offer_id_idx ON public.onboarding(offer_id);

-- ─── RLS ──────────────────────────────────────────────────────────────────

ALTER TABLE public.offers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding ENABLE ROW LEVEL SECURITY;

-- offers: all three roles may read; only owner + hr_admin may write.
DROP POLICY IF EXISTS offers_read_all       ON public.offers;
DROP POLICY IF EXISTS offers_write_hr_owner ON public.offers;

CREATE POLICY offers_read_all
  ON public.offers FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY offers_write_hr_owner
  ON public.offers FOR ALL
  USING     ((auth.jwt() ->> 'role') IN ('owner', 'hr_admin'))
  WITH CHECK ((auth.jwt() ->> 'role') IN ('owner', 'hr_admin'));

-- onboarding: same matrix.
DROP POLICY IF EXISTS onboarding_read_all       ON public.onboarding;
DROP POLICY IF EXISTS onboarding_write_hr_owner ON public.onboarding;

CREATE POLICY onboarding_read_all
  ON public.onboarding FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY onboarding_write_hr_owner
  ON public.onboarding FOR ALL
  USING     ((auth.jwt() ->> 'role') IN ('owner', 'hr_admin'))
  WITH CHECK ((auth.jwt() ->> 'role') IN ('owner', 'hr_admin'));

COMMIT;
