# Backup And Recovery Guide

Last updated: 2026-05-11

This guide explains what protects IWS Workforce data and what to do if something is deleted or changed by accident.

## 1. Where Data Lives

The system uses Supabase:

- Database: Postgres tables such as workers, suppliers, documents, timesheets, payroll, warnings, and offboarding.
- Auth: Supabase Auth users and sessions.
- Storage: uploaded files such as worker documents, certifications, photos, letters, payslips, and timesheet uploads.

The deployed website on Vercel does not permanently store operational data. It reads and writes to Supabase.

## 2. Platform Backups

Supabase provides database backups depending on the project plan. Supabase documentation explains that daily backups are available on paid plans, and point-in-time recovery is a separate option with a much smaller recovery window.

Important limitation: Supabase database backups do not include files stored through Supabase Storage. Storage files need their own export or retention plan.

Official reference: https://supabase.com/docs/guides/platform/backups

## 3. Local Operational Export

This repository now includes a read-only export script:

```powershell
node scripts/exportOperationalBackup.mjs
```

This creates a local folder like:

```text
backups/iws-backup-2026-05-11-132000000Z/
```

It exports:

- Core database tables as JSON.
- Storage bucket metadata.
- A `manifest.json` summary with row counts and any skipped tables or buckets.

To also download Storage files:

```powershell
node scripts/exportOperationalBackup.mjs --storage-files
```

The `backups/` folder is ignored by git so private operational data is not committed.

## 4. Before Any Risky Change

Before deleting records, bulk editing, importing old records, re-running payroll, or cleaning live data:

1. Run the data audit:

```powershell
npm run data:audit
```

2. Export database metadata:

```powershell
node scripts/exportOperationalBackup.mjs
```

3. If uploaded files might be affected, export Storage files too:

```powershell
node scripts/exportOperationalBackup.mjs --storage-files
```

4. Confirm the backup folder contains `manifest.json`.
5. Confirm important tables have expected row counts.
6. Keep the backup folder until the change has been reviewed and accepted.

## 5. If Something Is Deleted Accidentally

Act quickly.

1. Stop using the affected screen.
2. Do not run cleanup, seed, or reset scripts.
3. Record what was deleted, who noticed it, and the approximate time.
4. Check whether the record exists in the latest local export.
5. Check Supabase dashboard backups and point-in-time recovery availability.
6. If a restore is needed, decide whether to restore the whole database or manually recreate the specific records from export.

Database restore can cause downtime and may replace newer changes. Do not restore the whole database casually.

## 6. If A File Is Deleted Accidentally

Database restore alone will not restore Supabase Storage files.

Use this order:

1. Check whether the file exists in a local export made with `--storage-files`.
2. Check whether HR/accounts has the original uploaded file.
3. Re-upload the file to the correct worker.
4. Confirm the document row points to the new file.
5. Record that the file was restored.

## 7. Recommended Next Safety Improvements

The current system should be improved with:

- Soft delete for important records instead of hard delete where each workflow allows it.
- A restore screen for recently deleted audited records.
- Audit log table for create, update, delete, approve, and payroll actions.
- Distribution log for payslips, warnings, letters, and document packs.
- Scheduled Storage export or external file backup.
- Monthly restore drill so backups are proven, not just assumed.

## 8. What Can Still Be Lost

Data can still be lost if:

- A user permanently deletes a row and there is no recent backup.
- A Storage file is deleted and no file export exists.
- The Supabase project itself is deleted.
- Someone imports bad data over good data without a backup.
- A full database restore overwrites newer legitimate changes.

The safest habit is simple: backup first, change second, review third.
