# IWS Backup And Restore Plan

Date: 2026-04-28

## Goal

If the app or database needs to be rebuilt, IWS must be able to restore:

- Source code.
- Vercel environment variables.
- Supabase database tables.
- Supabase storage bucket files.
- Migration history and seed/reference data.

## What Must Be Backed Up

### Code

- GitHub repository: `InnovationTechME/iws-workforce`
- Branches and pull requests.
- SQL migration files under `scripts/migrations`.
- Seed/audit scripts under `scripts`.

### Supabase Database

Back up all operational tables, especially:

- `workers`
- `suppliers`
- `supplier_rates`
- `supplier_timesheet_summaries`
- `documents`
- `offers`
- `onboarding`
- `timesheet_headers`
- `timesheet_lines`
- `payroll_batches`
- `payroll_lines`
- `offboarding`
- `warnings`
- `letters`
- `public_holidays`

Supabase documents daily backups and Point-in-Time Recovery options in the official backup docs. Use managed backups/PITR for production, and also keep a manual logical dump for restore drills.

### Supabase Storage

Back up all files in these buckets:

- `worker-documents`
- `worker-photos`
- `worker-certifications`
- `payslips`
- `timesheet-uploads`
- `letter-archive`

Database backups do not guarantee an independent copy of every storage object in a format IWS can rehydrate alone. Treat storage export as a separate backup job.

### Vercel Configuration

Keep an inventory of environment variable names, but never commit secret values.

Critical variables include:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Supabase service-role key, if used only for private scripts or server-side admin jobs.

## Backup Schedule

Recommended production setup:

- Supabase managed backups enabled.
- Point-in-Time Recovery enabled once real payroll/compliance data is live.
- Daily logical database dump to private backup storage.
- Daily storage bucket copy.
- Weekly restore drill into a staging Supabase project.

## Manual Database Backup

Use the Supabase CLI or `pg_dump` with the project connection string.

Example shape:

```powershell
supabase db dump --db-url "<SUPABASE_DB_CONNECTION_STRING>" -f backups\iws-data.sql --use-copy --data-only
```

Do not paste the connection string, database password, service-role key, or `.env.local` into chats, tickets, or commits.

## Manual Storage Backup

Create a storage export job that:

1. Lists every object in each IWS bucket.
2. Downloads each object to a private backup folder.
3. Stores a manifest with bucket, path, size, hash, and timestamp.
4. Uploads the backup folder to private cloud storage.

The manifest matters because document rows store `bucket::path`, and restore must put files back at the same bucket/path where possible.

## Restore Drill

1. Create a new Supabase staging project.
2. Apply schema migrations.
3. Restore database dump.
4. Recreate storage buckets.
5. Upload storage objects using the backup manifest.
6. Configure Vercel environment variables.
7. Deploy the app to a protected preview.
8. Run smoke checks:
   - `/workers`
   - `/documents`
   - `/suppliers`
   - `/timesheets/grid`
   - `/payroll`
   - `/offboarding-exit`
9. Open one worker with documents, payslips, letters, and timesheets.
10. Generate a test signed URL for one document file.

## Recovery Targets

Recommended starting targets:

- RPO: maximum 24 hours of data loss until PITR is enabled, then reduce to under 1 hour.
- RTO: restore usable staging system within 4 hours.

These targets should be tightened before live payroll use.

## Production Cutover Rule

Before real production use:

1. Run `npm run data:audit`.
2. Identify and remove demo/test rows only after explicit approval.
3. Confirm backups are working.
4. Run a restore drill.
5. Enable real authentication.
