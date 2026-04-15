# STATE.md

> Per CLAUDE.md §4 — current state, what's built, what's broken, active priority.
> Update at the end of every session. Stale state is worse than none.

Last updated: 2026-04-15

---

## Persistence reality (corrects CLAUDE.md §6)

`@supabase/supabase-js ^2.103.0` **is** installed and wired. The Offers page,
Onboarding page, Documents page, Worker profile, and Payroll already read
and write through `lib/supabaseClient.js`. CLAUDE.md §6's statement that
"`package.json` contains no database client" is out of date.

Two clients exist:

- `lib/supabaseClient.js` — anon client, for client-side calls under RLS.
- `lib/supabase.js` — **new this PR** — service-role client, for server-side
  mutations that need to bypass RLS. Never import from a client component.

Env variables consumed: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`.

---

## Round C — Onboarding checklist restructure (IT Direct Staff track)

Landed on branch `feat/onboarding-checklist-restructure`.

**What changed:**
- `lib/documentRegister.js` — `direct_staff_permanent` and
  `direct_staff_office` templates reordered to match CLAUDE.md §5.3.1
  (12-item order, Medical Fitness at #4, Labour Card demoted to WARNING
  at #7). `health_card` dropped from both direct-staff templates.
  Contract-worker and subcontractor templates untouched.
- `lib/storageService.js` — new `buildOnboardingPath(worker, docType, file, ref)`
  implements §5.3.2 path shape `{worker_number}/{doc_type}/{name_safe}_{doc_type}_{ref}.{ext}`.
  `uploadWorkerDocument` accepts optional 4th `ref` arg; legacy callers
  without a ref keep today's path shape for backward compatibility.
  `getSignedUrl` now transparently handles JSON-array multi-file refs;
  new `getSignedUrls` returns the whole array.
- `lib/onboardingService.js` — new `saveOnboardingDoc`,
  `setMedicalFitnessPass`, `setMedicalFitnessFail`, `validateBlockingDocs`.
  `completeOnboarding` now validates blocking evidence and stamps
  `uploaded_at` on any blocking row that lacks it. Medical Fitness Fail
  follows CLAUDE.md §5.3.4: `workers.medical_failed=true`,
  `workers.status='inactive'`, HR Inbox task `task_type='medical_fail_review'`,
  **no auto-blacklist**. The denormalised `workers` identity/policy columns
  stay in sync via `denormalisedWorkerUpdates` on each save.
- `lib/offerService.js` — `acceptOffer` now upserts a `documents` row with
  `doc_type='offer_letter'`, `file_url='letter-archive::offers/…'`,
  `status='valid'`, `is_blocking=false` so checklist item #1 renders with
  evidence after Accept.
- `components/onboarding/` — eight per-doc-type forms
  (PassportCopyForm, PassportPhotoUpload, UAEVisaForm, EmiratesIDForm,
  MedicalFitnessToggle, LabourCardForm, HealthInsuranceForm,
  WorkmensCompForm) plus `OnboardingDocSection` dispatcher and eight
  field sub-components under `components/onboarding/fields/`.
- `app/onboarding/page.js` — checklist drawer now renders via
  `OnboardingDocSection` instead of the generic `DocumentUploadForm`.
  `blockingStatus` updated so Labour Card (warning) does not block,
  Medical Fitness requires `medical_result='pass'`, Emirates ID
  requires both `front_file_url` and `back_file_url`.

**Migration pending (not executed by this PR):**
`scripts/migrations/003_onboarding_checklist_metadata.sql` — adds 13 new
columns to `public.documents`, a `medical_result` CHECK, `medical_failed`
boolean on `public.workers`, and four partial indexes. Idempotent.
Must be applied via Supabase SQL editor before the code is deployed.

**Retired:**
`scripts/migrations/002_offers_onboarding.sql` — deleted. That schema
was applied directly via Supabase MCP before PR #2 merged; keeping the
file in the repo was a trap.

**Explicit scope notes:**
- No change to Contract Worker or Supplier tracks.
- No change to `components/DocumentUploadForm.js` — still used by the
  worker-profile Documents tab, Documents queue, and certification
  uploads.
- No backfill of existing 240 document rows (230 currently missing
  metadata). Historical rows show as metadata-incomplete on the Documents
  tab until the next renewal naturally captures it. Separate future PR.
- `workers` identity/policy columns kept in place as a denormalised
  read cache, written by `saveOnboardingDoc`. Deprecation is a separate
  future PR.

---

## Offer → Onboarding handoff — FIXED in this PR

### Before

- "Mark Signed" button flipped `offers.status = 'signed'` and did nothing else.
- "→ Onboarding" was a plain `<Link href="/onboarding">`, no side-effect.
- `/onboarding` reads `workers WHERE status='onboarding'`. Since no worker
  row was ever created from a signed offer, signed offers never appeared.
- No signed-PDF capture anywhere.

### After

- "Mark Sent" still flips draft → sent.
- "Mark Signed" replaced by green **"✓ Accept & Upload Signed Offer"** button.
  Opens a drawer requiring a PDF upload; on confirm calls `acceptOffer()` in
  `lib/offerService.js` which:
    1. uploads the PDF to `letter-archive` bucket at
       `offers/{ref_number}/signed_{DDMMYYYY}.{ext}`,
    2. inserts a `workers` row with `status='onboarding'`, `entry_track='direct_staff'`,
    3. seeds the per-track document register via `initialiseWorkerDocuments()`,
    4. creates an `onboarding` row linked to the offer via new `offer_id` column,
    5. writes back `offers.status='accepted'`, `worker_id`, `signed_offer_url`,
       `decided_at`, `decided_by`.
  Idempotent on existing `worker_id`.
- "Rescind" replaced by red **"✕ Reject"** button → sets `offers.status='rejected'`,
  no upload, no worker, no onboarding row. Guarded against rejecting offers that
  already have a worker.
- Accepted candidates appear automatically in `/onboarding` (no code change to
  the onboarding page — it already filters `workers WHERE status='onboarding'`).
- Status colour map and filter dropdown updated to surface `accepted` / `rejected`
  while still rendering legacy `signed` / `rescinded` rows correctly.

### Schema migration (pending — run manually)

`scripts/migrations/002_offers_onboarding.sql` has been created but not
executed. Jo will run it in the Supabase SQL editor after review. It:

- Extends `offers.status` CHECK to include `accepted`, `rejected` (keeps
  `signed`, `rescinded` valid for legacy rows — no data migration).
- Adds `offers.signed_offer_url`, `offers.decided_at`, `offers.decided_by`.
- Adds `onboarding.offer_id` with FK to `offers(id)`.
- Enables RLS on both tables with three policies (all roles read;
  owner + hr_admin write).

---

## Retired this PR

- `data/mockOffers.js` — deleted.
- `data/mockOnboarding.js` — deleted.
- `lib/mockStore.js` — removed imports, seed spreads, and all eight helper
  functions (`getOffers`, `getOffer`, `addOffer`, `updateOffer`,
  `getOnboardingRecords`, `getOnboardingRecord`, `addOnboardingRecord`,
  `updateOnboardingRecord`). Dashboard stat `onboardingActive` now returns 0
  and `onboardingBlockers` now returns `[]` — if the HR Inbox or Dashboard
  needs these figures live, swap to `getOnboardingRecords()` from
  `lib/onboardingService.js` (async).

---

## Known issues still open (from CLAUDE.md §7)

1. ~~Offer → Onboarding handoff broken.~~ **Fixed this PR** (pending migration run).
2. Timesheets do not flow to payroll. Same-shape bug in a different pair of pages; out of scope here.
3. Office Staff template still treats Workmen's Compensation as blocking — fix in `lib/documentRegister.js`. Flagged in prior reviews, not shipped.
4. Track 3 printed payment label still says "Bank Transfer" / WPS wording in
   `lib/letterTemplates.js` and `app/payroll-run/page.js`. Flagged, not shipped.
5. Hardcoded client dropdowns.
6. No month restriction on timesheet uploads.
7. No payroll locking after approval.
8. No payroll history view.
9. Inconsistent worker name/ID display across pages.

---

## Repo doc layout

Per CLAUDE.md §4, the four load-bearing docs are:

- `CLAUDE.md` (repo root) — rules, stack, business rules summary, guardrails.
- `docs/STATE.md` — this file.
- `docs/business-rules.md` — UAE-specific operational logic.
- `docs/data-model.md` — entities, relationships, status enums.

Additional reference docs currently in `docs/`:
`workflows.md`, `ui-patterns.md`, `db-migrations-policy.md`,
`onboarding-tracks-insurance-wc-payroll-rules.md`.
CLAUDE.md §4 proposes folding these into the four load-bearing docs; not
done yet.
