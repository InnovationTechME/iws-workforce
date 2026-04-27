# IWS Data Strategy

## Production Principle

Production starts clean. It should not contain mock workers, fake payroll, fake offboarding records, placeholder suppliers, or test documents.

Keep only reference/setup data:

- Company identity and payroll rules.
- Worker categories and onboarding tracks.
- Document type definitions.
- Trade roles and approved rate bands.
- UAE public holidays.
- Real client/supplier companies when confirmed by IWS.

## Demo/Test Principle

Demo data is allowed only in development or preview environments, and it should be generated as a complete lifecycle. Do not manually scatter fake rows into random tables.

A proper demo story should create:

1. Supplier company and supplier rates.
2. Supplier company workers.
3. Direct staff and contract workers.
4. Required document register rows.
5. Activated workers.
6. Monthly timesheet headers and lines.
7. Payroll batch and payroll lines through the payroll RPC where available.
8. Offboarding record with exit checklist and settlement amount.

Demo rows must be easy to identify. Use `DEMO-` worker numbers, supplier names, PO numbers, notes, or month labels.

## Current State

The app is mixed:

- Most core records are real Supabase rows.
- Some rows are clearly demo/test data.
- A few old pages still import `lib/mockStore.js`, which is now an empty compatibility stub.

Remaining mock-backed or partial pages should be migrated PR-by-PR:

- `app/attendance/page.js`
- `app/inbox/page.js`
- `app/leave/page.js`
- `app/offers/page.js`
- `app/warnings/page.js`
- parts of `app/workers/[id]/page.js`

## Clean Production Cutover

Before production use:

1. Run `node scripts/auditDemoData.mjs`.
2. Review the report with IWS.
3. Back up Supabase.
4. Remove only confirmed demo/test operational data.
5. Keep reference data.
6. Create the first real supplier/client/worker records through the app.

Deletion must be a separate, explicit action. Do not add automatic cleanup to seed scripts.

## Demo Rebuild

Use `node scripts/seedDemoLifecycle.mjs` only for development/preview databases.

That script is idempotent and should create a small complete demo flow without deleting existing rows.
