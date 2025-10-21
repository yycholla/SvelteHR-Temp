-- Migration: Add scope and organizer fields to event_attendees
-- Date: 2025-10-10
-- Purpose: Add RSVP scope for recurring events and organizer designation
--          Priority: P3 (Low - Enhancements)

BEGIN;

-- ========================================
-- Create rsvp_scope ENUM type
-- ========================================

DO $$
BEGIN
  -- Create rsvp_scope ENUM if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rsvp_scope') THEN
    CREATE TYPE hr_public.rsvp_scope AS ENUM ('this_event', 'all_events');
  END IF;
END $$;

COMMENT ON TYPE hr_public.rsvp_scope IS
'RSVP scope for recurring events: this_event (single occurrence) or all_events (entire series)';

-- ========================================
-- Add scope and organizer fields
-- ========================================

ALTER TABLE hr_public.event_attendees
ADD COLUMN IF NOT EXISTS scope hr_public.rsvp_scope;

ALTER TABLE hr_public.event_attendees
ADD COLUMN IF NOT EXISTS is_organizer BOOLEAN NOT NULL DEFAULT false;

-- ========================================
-- Add column comments
-- ========================================

COMMENT ON COLUMN hr_public.event_attendees.scope IS
'RSVP scope for recurring events: this_event (applies to single occurrence) or all_events (applies to entire recurring series). NULL for non-recurring events.';

COMMENT ON COLUMN hr_public.event_attendees.is_organizer IS
'Whether this attendee is an event organizer with edit permissions. Organizers can modify event details, manage waitlist, and send announcements.';

-- ========================================
-- Create index for organizer queries
-- ========================================

CREATE INDEX IF NOT EXISTS idx_event_attendees_organizer
ON hr_public.event_attendees(event_id, is_organizer)
WHERE is_organizer = true;

-- Update table statistics
ANALYZE hr_public.event_attendees;

COMMIT;
