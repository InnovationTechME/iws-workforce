# IWS Workforce Operations Manual

Last updated: 2026-05-11

This guide explains how the live IWS Workforce System should be operated day to day. It is written for management, HR, accounts, and payroll users.

## 1. What The System Is For

IWS keeps one operational record for each person from offer or onboarding through documents, site attendance, payroll, warnings, payslips, and offboarding.

The live app is here:

- Production: https://iws-workforce.vercel.app
- Data store: Supabase project `llchnjpxcluvvsyeoooh`

## 2. Login And Roles

The app uses Supabase Auth. Users must sign in before they can access the dashboard. Anonymous access should redirect to login.

Current role model:

- Owner: full management control.
- Management: dashboard, approvals, payroll review.
- HR admin: onboarding, worker records, warnings, documents, offboarding.
- Accounts or payroll: payroll, supplier summaries, payslips.

Only one real owner login has been confirmed in the current live system. New role accounts should be created with `scripts/createRoleUsers.mjs` after the required `IWS_*` environment variables are set.

## 3. Why Workers And Records Are Still Showing

The dashboard workers and records are coming from the live Supabase database, not from front-end mock cards.

Before the 2026-05-11 cleanup, the live system contained:

- 24 worker records.
- 4 supplier records.
- 158 document records.
- 3 timesheet headers.
- 4 payroll batches.
- 2 offboarding records.

After approval, a full database and Storage backup was taken, then operational worker, supplier, document, timesheet, payroll, offboarding, client, and uploaded file records were cleared. The system is now ready for real starting records.

## 4. Companies And Subcontract Workers

For subcontract workers, add the supplier company first.

Recommended order:

1. Create or confirm the supplier company.
2. Confirm the supplier is active.
3. Add supplier rates or purchase order details where needed.
4. Onboard the subcontract worker.
5. Assign the worker to that supplier during onboarding.

Do not onboard subcontract workers into a placeholder supplier. The audit currently flags two existing subcontract workers assigned to an inactive or placeholder supplier and these should be repaired.

## 5. Worker Numbering

Worker numbers should not be reused once they have been assigned.

Reason:

- The number may appear on documents, payroll records, payslips, warnings, emails, exported files, and historical reports.
- Reusing a number can make audit history unreliable.

Recommended approach:

- Import existing records using the agreed IWS number format.
- Keep old leavers with status `inactive` or `offboarded`.
- Use new numbers only for new people.

## 6. Onboarding

Use onboarding to create the worker and collect required documents.

Typical flow:

1. Select worker type:
   - Direct staff.
   - Contract worker.
   - Subcontract worker.
   - Office staff.
2. Enter identity and employment details.
3. Upload required documents.
4. Check blocking document status.
5. Resolve warnings or missing evidence.
6. Complete onboarding only when the person is ready to become active.

Document uploads should create real Supabase Storage files and document rows. Avoid test names such as demo, sample, test, placeholder, or qqq.

## 7. Documents And Certifications

Documents belong to a worker record. Certifications should be tracked with expiry dates where applicable.

Normal actions:

- Upload passport, visa, Emirates ID, labour card, insurance, medical fitness, workmen compensation, certification, and supporting files.
- Replace expired or incorrect files by uploading a corrected document.
- Review expired documents from the dashboard and documents queue.

Do not delete documents unless you are certain they were uploaded to the wrong person or are legally unsafe to retain. Prefer marking records inactive or superseded when history matters.

## 8. Timesheets

Timesheets are the source for monthly payroll.

Recommended monthly flow:

1. Upload or create the monthly timesheet.
2. Confirm the month and client/site.
3. Review missing days, absence, overtime, and discrepancies.
4. Repair worker matches before payroll.
5. Lock or approve the timesheet once checked.

Timesheet edits should be made before payroll approval. If a payroll has already been approved, treat changes as a correction and record why the change was made.

## 9. Payroll

Payroll should stay simple:

1. Select the month.
2. Review workers included in payroll.
3. Check absence deductions, overtime, allowances, and advances.
4. Confirm subcontract workers are excluded from direct employee payroll and appear in supplier summaries instead.
5. Generate payroll lines.
6. Review totals.
7. Submit for approval.
8. Approve only after HR/accounts review.
9. Generate payslips.

Absent hours should reduce pay where the payroll rule requires it. The payslip should show the deduction breakdown so the worker can understand the net amount.

## 10. Approvals

Approvals should be used for payroll and other high-risk actions.

Recommended approval rules:

- Payroll generation can be prepared by HR/accounts.
- Payroll approval should be done by management or owner.
- Any deletion, mass cleanup, or payroll re-run should be backed up first.
- Corrections after approval should be recorded as adjustments, not hidden edits.

## 11. Payslips And Warnings

Current app behavior creates payslip and warning records/files inside the system. Deliveries can be recorded in `Delivery Log`, and worker profiles include quick `Log Sent` actions for payslips, warnings, and letters.

Recommended distribution options:

- Email from a verified company address using a transactional provider.
- WhatsApp/manual delivery with a recorded sent date.
- Internal download pack for HR to distribute.

For audit, every distribution should record:

- Worker.
- Document type.
- File or message sent.
- Sent date and time.
- Sent by.
- Delivery method.
- Status such as queued, sent, failed, recorded, or acknowledged.

If a payslip or warning is sent manually, HR should record it in `Delivery Log` immediately after sending.

## 12. Warnings

Warnings should be tied to the worker and should remain visible until resolved.

Normal flow:

1. Create warning.
2. Attach or generate warning document.
3. Review with worker.
4. Record delivery.
5. Mark as resolved only when management decides it is closed.

## 13. Offboarding

Use offboarding when a worker leaves, is terminated, or fails a required process.

Normal flow:

1. Open offboarding case.
2. Set reason and last working date.
3. Stop future payroll inclusion if applicable.
4. Calculate final dues or deductions.
5. Collect final documents and acknowledgements.
6. Mark the worker inactive or offboarded.
7. Close the file only after payroll/accounts confirms.

## 14. Importing Existing Records

Use the CSV import template when moving existing records into the system:

- Supplier template: `import-templates/suppliers.csv`
- Worker template: `import-templates/existing-workers.csv`
- Dry run suppliers: `npm run data:import-suppliers -- import-templates/suppliers.csv --dry-run`
- Dry run workers: `npm run data:import-workers -- import-templates/existing-workers.csv --dry-run`

Always dry-run first. Check worker number conflicts before importing.

## 15. Pre-Cleanup Checklist

Before deleting or archiving any operational data:

1. Run `npm run data:audit`.
2. Run `node scripts/exportOperationalBackup.mjs`.
3. If uploaded files matter, run `node scripts/exportOperationalBackup.mjs --storage-files`.
4. Review the backup manifest.
5. Decide whether each record is real, duplicate, placeholder, or test data.
6. Archive before permanent delete where possible.

## 16. Current Known Data Cleanup Items

The current live audit shows:

- No obvious demo/test workers by name or number.
- No subcontract workers missing a supplier.
- Two subcontract workers assigned to an inactive or placeholder supplier.
- One inactive/placeholder supplier named `Supplier Assignment Pending`.

These should be fixed deliberately. The safest repair is to reassign the two workers to the correct supplier, then archive or delete the placeholder supplier only if nothing else uses it.
