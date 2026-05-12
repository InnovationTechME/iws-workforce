-- Migration 016: restrict private storage object policies to signed-in users.
--
-- Buckets remain private. Authenticated users can still upload, replace, read,
-- and delete documents through the app; anonymous users no longer match these
-- broad storage policies.

DROP POLICY IF EXISTS allow_all_letter_archive ON storage.objects;
DROP POLICY IF EXISTS allow_all_payslips ON storage.objects;
DROP POLICY IF EXISTS allow_all_timesheet_uploads ON storage.objects;
DROP POLICY IF EXISTS allow_all_worker_certifications ON storage.objects;
DROP POLICY IF EXISTS allow_all_worker_documents ON storage.objects;
DROP POLICY IF EXISTS allow_all_worker_photos ON storage.objects;

CREATE POLICY authenticated_all_letter_archive
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'letter-archive')
  WITH CHECK (bucket_id = 'letter-archive');

CREATE POLICY authenticated_all_payslips
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'payslips')
  WITH CHECK (bucket_id = 'payslips');

CREATE POLICY authenticated_all_timesheet_uploads
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'timesheet-uploads')
  WITH CHECK (bucket_id = 'timesheet-uploads');

CREATE POLICY authenticated_all_worker_certifications
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'worker-certifications')
  WITH CHECK (bucket_id = 'worker-certifications');

CREATE POLICY authenticated_all_worker_documents
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'worker-documents')
  WITH CHECK (bucket_id = 'worker-documents');

CREATE POLICY authenticated_all_worker_photos
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'worker-photos')
  WITH CHECK (bucket_id = 'worker-photos');
