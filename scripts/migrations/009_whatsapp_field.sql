-- Migration 009: Add WhatsApp number field to workers
-- PR #8 — Print & Export Pipeline

ALTER TABLE workers ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;
