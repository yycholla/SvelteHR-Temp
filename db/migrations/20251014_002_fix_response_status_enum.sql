-- Migration: Fix event_attendees.response_status to use rsvp_status enum type
-- Issue: Column is VARCHAR(20) but should be hr_public.rsvp_status enum
-- This aligns with the Rust GraphQL model which expects the enum type

-- Step 1: Alter the column type to use the enum
ALTER TABLE hr_public.event_attendees
ALTER COLUMN response_status TYPE hr_public.rsvp_status
USING response_status::hr_public.rsvp_status;

-- Note: This migration is safe because:
-- 1. The rsvp_status enum already exists with values: 'pending', 'accepted', 'declined', 'tentative'
-- 2. The column already has a NOT NULL constraint and DEFAULT 'pending'
-- 3. USING clause ensures existing VARCHAR values are cast to enum
-- 4. All existing values should be valid enum values
