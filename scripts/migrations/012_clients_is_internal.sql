-- Migration 012: Add is_internal flag to clients + Innovation Internal row
-- PR #9 — per IWS_RULES_LOCKED.md §4.2

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT false;

INSERT INTO clients (name, is_internal)
VALUES ('Innovation Internal', true)
ON CONFLICT (name) DO NOTHING;

-- Verify:
-- SELECT id, name, is_internal FROM clients
-- WHERE is_internal = true OR name = 'Innovation Internal';
-- Expect 1 row: Innovation Internal with is_internal=true.
