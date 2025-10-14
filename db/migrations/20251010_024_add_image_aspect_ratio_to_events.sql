-- Migration: Add image_aspect_ratio column to events table
-- Date: 2025-10-13
-- Purpose: Support aspect ratio constraint for event images (16:9 or 9:16)

-- Add image_aspect_ratio column with CHECK constraint
ALTER TABLE hr_public.events
    ADD COLUMN IF NOT EXISTS image_aspect_ratio VARCHAR(10)
    CHECK (image_aspect_ratio IN ('16:9', '9:16'));

-- Add comment explaining the column
COMMENT ON COLUMN hr_public.events.image_aspect_ratio IS 'Image aspect ratio constraint: 16:9 (landscape) or 9:16 (portrait)';

-- Note: No index needed as this is a low-cardinality column used only for validation
