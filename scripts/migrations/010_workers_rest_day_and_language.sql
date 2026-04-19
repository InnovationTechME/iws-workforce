-- Migration 010: Add rest_day and preferred_language columns to workers
-- PR #9 — per IWS_RULES_LOCKED.md §2 (rest day) and §14.2 (language)

ALTER TABLE workers
  ADD COLUMN IF NOT EXISTS rest_day TEXT DEFAULT 'sunday'
    CHECK (rest_day IN ('sunday','saturday')),
  ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en'
    CHECK (preferred_language IN ('en','hi'));

-- Verify:
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name='workers' AND column_name IN ('rest_day','preferred_language');
-- Expect 2 rows.
