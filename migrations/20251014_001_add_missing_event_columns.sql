-- Migration: Add Missing Event Columns for Feature 027
-- Date: 2025-10-14
-- Description: Adds columns that exist in Rust API but are missing from database schema
--
-- Added columns:
-- - recurrence_end_date: End date for recurring events (5-year limit enforced)
-- - image_aspect_ratio: Image aspect ratio constraint (16:9 or 9:16)
--
-- Reference: graphql-rust-server/src/models/event.rs (lines 116, 120)

BEGIN;

-- Add recurrence_end_date for 5-year recurring event limit
ALTER TABLE hr_public.events
ADD COLUMN IF NOT EXISTS recurrence_end_date TIMESTAMPTZ;

COMMENT ON COLUMN hr_public.events.recurrence_end_date IS 'End date for recurring events. Maximum 5 years from start date (enforced in application layer).';

-- Add image_aspect_ratio for event images
ALTER TABLE hr_public.events
ADD COLUMN IF NOT EXISTS image_aspect_ratio VARCHAR(10) CHECK (image_aspect_ratio IN ('16:9', '9:16'));

COMMENT ON COLUMN hr_public.events.image_aspect_ratio IS 'Event image aspect ratio constraint: 16:9 (landscape) or 9:16 (portrait). Required when image_url is set.';

-- Create index for querying events by recurrence end date
CREATE INDEX IF NOT EXISTS idx_events_recurrence_end_date
ON hr_public.events(recurrence_end_date)
WHERE recurrence_end_date IS NOT NULL;

COMMENT ON INDEX hr_public.idx_events_recurrence_end_date IS 'Index for finding recurring events by end date';

-- Add constraint: if image_url is set, image_aspect_ratio must also be set
ALTER TABLE hr_public.events
ADD CONSTRAINT events_image_aspect_ratio_required
CHECK (
  (image_url IS NULL) OR
  (image_url IS NOT NULL AND image_aspect_ratio IS NOT NULL)
);

COMMENT ON CONSTRAINT events_image_aspect_ratio_required ON hr_public.events IS 'Ensures aspect ratio is specified when event image is uploaded';

COMMIT;
