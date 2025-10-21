-- Rollback Migration: Remove Missing Event Columns
-- Date: 2025-10-14
-- Description: Removes columns added by 20251014_001_add_missing_event_columns.sql
-- WARNING: This will permanently delete data in these columns

BEGIN;

-- Drop constraint first
ALTER TABLE hr_public.events
DROP CONSTRAINT IF EXISTS events_image_aspect_ratio_required;

-- Drop index
DROP INDEX IF EXISTS hr_public.idx_events_recurrence_end_date;

-- Drop columns
ALTER TABLE hr_public.events
DROP COLUMN IF EXISTS recurrence_end_date,
DROP COLUMN IF EXISTS image_aspect_ratio;

COMMIT;
