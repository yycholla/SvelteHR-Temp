-- Migration: Add recurring events support to events table
-- Feature: 025-events-flesh-out
-- Date: 2025-10-07

BEGIN;

-- Add columns for recurring events support
ALTER TABLE hr_public.events
ADD COLUMN IF NOT EXISTS rrule TEXT,
ADD COLUMN IF NOT EXISTS recurrence_id UUID REFERENCES hr_public.events(id),
ADD COLUMN IF NOT EXISTS max_capacity INT CHECK (max_capacity > 0),
ADD COLUMN IF NOT EXISTS waitlist_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);

-- Add comments for documentation
COMMENT ON COLUMN hr_public.events.rrule IS 'RFC 5545 RRULE string for recurring events';
COMMENT ON COLUMN hr_public.events.recurrence_id IS 'Parent event ID if this is a recurring event exception';
COMMENT ON COLUMN hr_public.events.max_capacity IS 'Maximum number of attendees (null = unlimited)';
COMMENT ON COLUMN hr_public.events.waitlist_enabled IS 'Whether waitlist is enabled when capacity is reached';
COMMENT ON COLUMN hr_public.events.image_url IS 'URL path to event image (max 10 MB, optimized by Sharp)';

COMMIT;
