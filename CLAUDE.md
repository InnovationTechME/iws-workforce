# CLAUDE.md

> Operating manual for Claude Code working on this repository.
> Read this in full before proposing or making any change.
> This file is the single source of truth. If anything in the codebase contradicts it, surface the contradiction — do not silently follow the code.

---

## 1. What this project is

**IWS (Innovation Workforce System)** — internal workforce management platform for **Innovation Technologies LLC O.P.C.**, a technical staffing and industrial manpower company based in Musaffah, Abu Dhabi, UAE.

The system covers the full employee lifecycle for three worker categories:

- **Direct employees / office staff** — monthly salary, OT applies, on Innovation visa, paid via WPS (Endered/C3).
- **Contracted hourly workers** — flat hourly rate, no OT premium (public holidays at 150% only), on Innovation visa, paid via WPS.
- **Subcontractors** — flat hourly rate, no OT premium, on their **own visa**, paid **Non-WPS** (C3 Card).

Three user roles: **Owner**, **HR Admin**, **Operations**.

The product is operational, not a prototype. Real workers, real payroll, real UAE labour-law exposure. Treat every change accordingly.

---

## 2. Stack (actual, as installed)

- **Framework:** Next.js 14.2.35 (App Router, JavaScript — **no TypeScript**)
- **UI:** Tailwind CSS 3.4 (clean white background, single accent `#0d9488` teal; section header colour `#0891b2` teal)
- **Document generation:** `jspdf` + `jspdf-autotable` (PDFs), `jszip` (worker pack ZIP), `xlsx` (spreadsheet export)
- **Dates:** `date-fns`
- **Persistence:** **NONE INSTALLED.** All data lives in in-memory mock stores under `data/`. Supabase is provisioned but not wired in. See §6.
- **Deployment:** Vercel, auto-deploy from `master` → https://iws-workforce.vercel.app
- **Local dev:** `npm run dev` on `localhost:3004` (port set in script or env)

**Do not add dependencies without explicit approval.** If a task seems to require a new package, stop and propose it in the report instead.

---

## 3. Repo structure (current)

```
iws-workforce/
├── .claude/              # Claude Code config (lean — do not bloat)
├── app/                  # Next.js App Router routes (19 routes total)
├── components/           # Shared UI components
├── data/                 # In-memory mock data stores (13 of them)
├── lib/                  # Domain logic: documentRegister.js, letterTemplates.js, payroll math, etc.
├── public/               # Static assets, logo
├── docs/                 # ← create when needed; see §4
├── README.md
├── CLAUDE.md             # this file
├── next.config.mjs
├── tailwind.config.js
├── jsconfig.json
└── package.json
```

---

## 4. Documentation files (the only ones that matter)

Keep documentation tight. These four files together replace the 10-file maze proposed elsewhere:

1. **`CLAUDE.md`** (this file) — rules, stack, business rules summary, guardrails.
2. **`docs/STATE.md`** — what's built, what's broken, current priority. Update at end of every session.
3. **`docs/business-rules.md`** — full UAE-specific operational logic (payroll formulas, document requirements, offer letter terms).
4. **`docs/data-model.md`** — entities, relationships, status enums. Keep in sync with whatever persistence layer ends up live.

Do not create `ROADMAP.md`, `TASKS.md`, `ui-patterns.md`, `db-migrations-policy.md` as separate files. Fold their critical points into the four above.

---

## 5. Critical business rules (encode these exactly)

### 5.1 Worker categories & payroll

| Category | Rate model | OT weekday | OT Fri/holiday | Threshold | Visa | Payment |
|---|---|---|---|---|---|---|
| Direct employee | Monthly salary | 125% | 150% | 8h (6h Ramadan) | Innovation | WPS via Endered/C3 |
| Office staff | Monthly salary | 125% | 150% | 8h (6h Ramadan) | Innovation | WPS via Endered/C3 |
| Contracted hourly | Flat hourly | none | 150% (public holiday only) | n/a | Innovation | WPS via Endered/C3 |
| Subcontractor | Flat hourly | none | 150% (public holiday only) | n/a | Own | **Non-WPS — C3 Card** |

- **Office staff are timesheet-exempt.**
- Public holiday premium (150%) applies to **all** categories.
- Ramadan mode reduces the OT threshold to 6 hours for salaried categories only.

### 5.2 Offer letter terms (from real templates)

- 8 hours/day, 6 days/week
- Notice: 30 days from company, 60 days from employee
- Probation: 3 months, extendable to 6
- Unauthorised absence: 2-day deduction per absent day
- Contract type: **Fixed-term (3 years)**
- Section header colour: **`#0891b2`** (teal)

**Two template variants:**
- **Field workers** — return air ticket every 2 years, leave after 2 years
- **Office staff** — annual air ticket, annual leave

**Food allowance is variable per worker** — entered individually, never hard-coded.

**ILOE insurance belongs in visa/onboarding documentation only. It must NEVER appear in offer letters.**

### 5.3 Worker pack / document register

- Always **cover page first**.
- Compliance document is **Workmen's Compensation**, NOT medical insurance.
- For **Office Staff**, Workmen's Compensation is **not blocking** (do not gate the pack on it).
- Track 3 (Subcontractors / Non-WPS) printed payment label must read **"C3 Card (Non-WPS)"** — not "Bank Transfer", not WPS wording.

### 5.3.1 Onboarding checklist behaviour (IT Direct Staff track)

**Order of items (top to bottom in the checklist drawer):**
1. Offer Letter (signed) — already on file from Offers flow
2. Passport Copy — BLOCKING
3. Passport Photo — BLOCKING
4. Medical Fitness — **Pass/Fail toggle only, no file upload**. Fail → trigger blacklist workflow and stop. Pass → tick and continue.
5. Emirates ID — BLOCKING (front + back files, EID number, expiry)
6. UAE Visa — BLOCKING (visa number, type, sponsor, issuing emirate, expiry)
7. Labour Card / MOHRE — **WARNING ONLY, not blocking** (worker can be made Active without it)
8. Health Insurance — BLOCKING for Convert to Active (policy number, provider, expiry)
9. Workmen's Compensation — BLOCKING for Convert to Active (provider, policy ref, expiry)
10. Employment Contract — OPTIONAL
11. ILOE Certificate — OPTIONAL (never appears in offer letters per §5.2)
12. Worker Policy Manual — OPTIONAL

**Per-document required metadata (beyond file + expiry):**
- Passport Copy: passport number, issuing country, issue date. Accept either single multi-page PDF OR multiple image uploads (user picks per upload).
- Passport Photo: file only.
- UAE Visa: visa number, visa type, sponsor (default = Innovation Technologies LLC O.P.C.), issuing emirate, issue date.
- Emirates ID: EID number (15 digits), front file, back file.
- Health Insurance: policy number, provider, coverage type.
- Workmen's Compensation: provider, policy reference, policy number.

### 5.3.2 File storage naming convention

Supabase Storage uploads must be named human-readably, not as raw UUIDs:
```
{worker_number}/{doc_type}/{worker_name_safe}_{doc_type}_{ref_or_date}.{ext}

Example:
IWS-2026-0030/passport_copy/Innovation_LLC_passport_A12345678.pdf
IWS-2026-0030/emirates_id/Innovation_LLC_eid_784-1990-1234567-1.pdf
```

### 5.3.3 Convert to Active behaviour

When "Convert to Active" runs on an onboarding worker:
- All documents uploaded during onboarding **must auto-link** to the worker's `documents` table entries. Do NOT re-request files already on file.
- Worker `status` flips from `onboarding` to `active`.
- Onboarding row stays in DB for audit but is removed from the active onboarding queue.
- The Documents tab on the worker profile becomes the single source of truth from this point on.

### 5.3.4 Medical Fitness Fail handling

Medical Fitness is a Pass/Fail toggle (no file upload required).

**If toggled Fail:**
- Set `worker.medical_failed = true` (new boolean column on workers table).
- Set `worker.status = 'inactive'` and remove from onboarding queue.
- Do NOT auto-create a blacklist entry. Medical fail and conduct-based blacklist are legally and operationally different in UAE and must stay separate.
- Create an HR Inbox task for Ops: "Medical fitness fail for {worker_name} — review and decide on visa cancellation / blacklist / refund eligibility."
- The onboarding record stays in DB for audit.

**If toggled Pass:**
- Tick the checklist item and continue onboarding.

Rationale: a failed DHA medical fitness test (communicable disease, etc.) prevents residency visa issuance but is not performance or conduct misconduct. Conflating them in one `blacklist` table will cause audit and legal-exposure problems. Blacklisting is an explicit Ops decision, not an automatic system action.

### 5.3.5 Onboarding as the only path to worker status

**Core architectural rule: no worker can exist in `public.workers` without a corresponding `public.onboarding` row.** This is enforced at both UI and DB level.

**UI level:**
- The "Add Worker" button on the Workers register is kept but re-routed — clicking it opens the onboarding "Add to track" drawer, not a direct-create worker form.
- If the selected track is **Direct Staff** (Permanent Staff / Office Staff): the drawer requires creating an offer first (existing Offers flow). Direct staff workers never appear in `workers` until an offer is accepted.
- If the selected track is **Contract Workers** or **Supplier Company Workers**: the drawer creates a `workers` row AND the matching `onboarding` row in a single atomic server-side action. Contract and supplier workers never receive offer letters.
- Direct worker creation (`INSERT INTO workers` without an onboarding record) is removed from all code paths.

**DB level:**
- A server-side trigger or a database check ensures the invariant. Exact mechanism (trigger, foreign key with deferred constraint, or application-only enforcement) is a Round D decision — pick the one with the smallest blast radius given the 240 existing docs and in-flight code.

**Backfill of existing 25 active workers:**
- All workers created before this rule existed must get a backfilled `onboarding` row.
- Backfill rows are marked with a `backfilled = true` flag (new boolean on `onboarding`) so they can be distinguished from genuine onboarding records.
- `completed_at` set to the worker's `created_at` date.
- Checklist boolean fields (`has_passport`, etc.) reflect whichever documents exist for that worker in `public.documents` with `file_url IS NOT NULL`.

### 5.3.6 Onboarding-level validation rules (enforced at save time)

- **Passport expiry:** must be at least **7 months** from the worker's joining date. Validated at both the Offer creation (for direct staff) and the "Add to track" drawer (for contract/supplier). Reject save with clear error message naming the gap.
- **Emirates ID format:** must match `784-XXXX-XXXXXXX-X` (17 chars including dashes, 15 digits total). Regex: `^784-\d{4}-\d{7}-\d$`. Use a masked input on the form; reject save if the raw value fails the regex.
- **Nationality:** stored as text but the UI is a dropdown. Permitted values (v1): `Emirati, British, Indian, Nepali, Pakistani, Filipino, Ghanaian, Zambian, Ethiopian, Nigerian, Ugandan`. List is editable only in code (no separate nationalities admin page in Round D). Add a `nationality` CHECK constraint on workers to match, but include an `'Other'` fallback so the constraint doesn't break on legacy rows with unexpected values.
- **Contract Worker hourly rate:** dropdown select, values `9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22` AED/hour only. Stored as numeric on workers. No free-text entry.

### 5.3.7 Contract Worker onboarding track (corrections)

Required documents for a Contract Worker onboarding record:
1. Passport Copy (BLOCKING)
2. ID Copy (BLOCKING) — this is the Emirates ID, same format as §5.3.6
3. Workmen's Compensation (BLOCKING) — provider, policy ref, policy number, expiry, name-highlight confirmation
4. Passport Visa Copy (BLOCKING) — needed specifically for worker-pack generation

Contract workers do **NOT** receive Innovation Technologies health insurance. Remove health insurance from the Contract Worker checklist entirely.

Hourly rate: dropdown 9–22 AED per §5.3.6.

### 5.3.8 Worker profile — Work Experience field

On the worker profile, the Work Experience section must auto-populate "Innovation Technologies" as the current position in the shipyard. This is used when generating worker packs. The worker can have additional past experience entries added manually, but the current position row is system-created on Convert-to-Active and cannot be deleted.

### 5.4 Offboarding

- Offboarding requires **7 mandatory checklist items** completed before a worker file can be closed.
- This rule exists specifically to prevent double-payment after departure. Do not loosen it.

### 5.5 Offer → Onboarding transition (currently broken — see §7)

Required flow:

```
Draft → Sent → [Accepted + signed offer uploaded] → Onboarding
                   OR
              → Rejected → closed (history only, no onboarding record)
```

UI requirements on the Offers page:
- Big **green** "Accept & Upload Signed Offer" button
- Big **red** "Reject" button
- Acceptance must require the signed PDF before status flips
- Signed offers must auto-appear in the Onboarding queue

### 5.6 Company identifiers (use these exact values everywhere)

- Economic Licence: `CN-5087790`
- VAT/TRN: `104184776300003`
- MOHRE: `1979124`
- ADCCI: `8800059661`
- Phone: `+971 2 333 6633`
- WhatsApp: `+971 56 244 6666`
- Email: `info@innovationtech.me`
- Website: `www.innovationtech.me`

---

## 6. The persistence reality (read this carefully)

**As of the current `master` commit, `package.json` contains no database client.** All 13 data stores in `data/` are JavaScript modules holding in-memory arrays. State does not survive a page reload or a server restart. This is why:

- "Signed" offer status never reaches the Onboarding page (no shared persistent store)
- Uploaded timesheets never reach the payroll page (same reason)
- "Saved" data appears to vanish

**Supabase is provisioned at the platform level but not connected in code.**

Two paths forward — pick one explicitly before the next round of bug-fixing, because every "wiring" bug below is really this same root cause:

- **Path A — Wire Supabase now.** Install `@supabase/supabase-js`, create `lib/supabase.js`, migrate the 13 mock stores to tables one module at a time (offers and onboarding first, since that's the active bug). This is the right answer for a real product.
- **Path B — Keep mocks but make them survive.** Move the `data/` stores into a single server-side module persisted to a JSON file or to `localStorage` for client-only state. Faster, but a dead-end — you will rip it out.

**Recommendation: Path A, starting with the offers + onboarding tables.** Do not try to migrate all 13 stores in one PR.

Until persistence is decided, every "fix the handoff" task is masking the same underlying problem.

---

## 7. Known issues (current priority order)

1. **Offer → Onboarding handoff broken.** Signed offers do not appear in Onboarding. Root cause = no shared persistence (see §6).
2. **Timesheets do not flow to payroll.** Same root cause.
3. **Office Staff template** still treats Workmen's Compensation as blocking — fix in `lib/documentRegister.js`.
4. **Track 3 printed payment label** still says "Bank Transfer" / WPS wording — fix in `lib/letterTemplates.js` and `app/payroll-run/page.js`.
5. Hardcoded client dropdowns (should be data-driven).
6. No month restriction on timesheet uploads.
7. No payroll locking after approval.
8. No payroll history view.
9. Inconsistent worker name/ID display across pages.

---

## 8. How Claude Code must work on this repo

### 8.1 The two-step rule (non-negotiable)

For every non-trivial task:

**Step 1 — Diagnose only.** Report:
- Files and functions involved (with line references where useful)
- What currently happens
- What should happen
- The smallest safe change to close the gap
- Risks and what could break

**Step 2 — Implement only after explicit approval.** Touch only the files listed in Step 1 unless re-approved.

This rule exists because broader-than-requested changes have caused drift on this repo before.

### 8.2 Scope discipline

- **No dependency additions** without explicit approval.
- **No schema changes** mixed into a code PR. Schema/data backfills are separate, controlled PRs.
- **No payroll math changes** without a dedicated review — payroll math is a regulated surface.
- **No broad redesigns.** Surgical edits only.
- **No placeholders, no `TODO` stubs.** Production-ready code or no code.
- **Preserve existing routes and page structure** unless the task is explicitly a routing change.
- **Reuse existing components.** Do not duplicate page logic into new files.

### 8.3 Reporting

Every PR description must include:
- Files changed (exhaustive list)
- Manual test checklist
- Anything intentionally left out of scope
- Any rule in this file that the change conflicts with (and why)

### 8.4 Wording and labels

Use UAE manpower terminology. WPS, Non-WPS, C3, MOHRE, Endered, Workmen's Compensation — exact spellings. Do not invent friendlier alternatives.

### 8.5 When in doubt

Stop and ask. A clarifying question is always cheaper than an unwound PR.

---

## 9. What NOT to touch without explicit approval

- Payroll calculation logic in `lib/`
- Offer letter templates in `lib/letterTemplates.js` (legal exposure)
- Document register rules in `lib/documentRegister.js` (compliance exposure)
- Company identifier constants (§5.6)
- Routing structure under `app/`
- The 7-item offboarding checklist
- Anything involving the words "delete", "drop", "truncate", or "force-push"

---

## 10. Environment

- **Local dev:** `npm run dev` → `localhost:3004`
- **Production:** https://iws-workforce.vercel.app (auto-deploy on push to `master`)
- **Repo:** https://github.com/InnovationTechME/iws-workforce
- **Node:** match Vercel's current default
- **Branch model:** work on feature branches, PR into `master`. Vercel preview deployment per PR.

---

*Last updated: 2026-04-14. Update this file whenever a rule changes — stale rules are worse than no rules.*
