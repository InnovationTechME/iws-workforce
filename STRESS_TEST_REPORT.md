# IWS Full Stress Test Report

Date: 2026-04-28
Branch: `phase1/supabase-mock-purge`

## What Was Tested

- Generated a realistic monthly Excel timesheet and parsed it with `parseClientTimesheet`.
- Smoke-tested key browser routes on `localhost:3000`.
- Created controlled stress data through Supabase-backed tables and storage:
  - Offer row.
  - Accepted/onboarding worker row.
  - Signed offer file in `letter-archive`.
  - Passport copy file in `worker-documents`.
  - Document register rows.
  - Warning record.
  - Letter register row.
  - Supplier monthly summary.
- Re-ran lint and production build.

## Results

### Excel Parser

Generated file:

`C:\Users\youse\AppData\Local\Temp\iws-stress-timesheet-jan-2027.xlsx`

Parser result:

- Month/year detected: January 2027.
- Workers parsed: 4.
- Total hours parsed: 988.
- Matched known demo workers: 3.
- Unmatched worker correctly flagged: 1.

This proves the parser can read a normal monthly sheet and identify unmatched workers. The remaining risk is UI upload persistence, because the current browser automation surface cannot attach files to hidden file inputs reliably. That still needs a manual browser upload or a dedicated Playwright test.

### Browser Routes

Routes checked after fixes:

- `/documents`
- `/warnings`
- `/workers/5b6a76e9-5b8d-441a-91c7-f2e63fce618c`
- `/suppliers`
- `/payroll`
- `/timesheets/grid`
- `/offers`
- `/onboarding`
- `/offboarding-exit`

Result:

- No server error pages.
- No captured console errors on these routes.
- Worker profile initially looked like "Worker not found" before client data finished loading, then rendered correctly after waiting for load.

### Stress Worker Created

- Worker: `IWS-2026-0035`
- Name: `DEMO Stress Direct 20260428070052`
- Category: Permanent Staff
- Status: onboarding

Created/verified related data:

- 1 accepted offer.
- 1 onboarding row.
- 2 document rows.
- 1 warning row.
- 1 letter row.
- 1 supplier monthly summary.

### Bugs Found And Fixed

- Warnings page was reading from Supabase but creating/updating through `mockStore`; warning creation would not persist. Fixed by wiring it to `warningService`.
- Worker/warning letter generation was creating references and letter records through the mock stub; generated letters were not saved. Fixed by adding `lib/letterService.js` and wiring worker/warning flows to Supabase.
- App letter/warning names did not match DB constraints. Fixed mapping so the UI can use clear names while the DB receives allowed values.

## Still Risky

- Authentication is still not real. The system still relies on the current PIN/mock role pattern.
- Excel upload UI still needs a real browser file-upload test.
- Supplier monthly summaries exist, but automatic generation from timesheets/reconciliation is not complete.
- Offboarding has exit documents and a settlement draft area, but full EOS/final settlement is still not production-safe.
- Attendance, leave, inbox, and parts of worker profile still have mock/stub dependencies.
- Stress/demo rows now exist in the database and must be cleaned before production cutover.

## Next Safe Work

1. Build a proper automated timesheet upload/import test.
2. Add supplier summary generation from approved supplier timesheet lines.
3. Finish Supabase migration of warnings, leave, attendance, inbox, and remaining worker-profile sections.
4. Implement real authentication and audit trail.
5. Keep EOS/final settlement in a separate dedicated PR.
