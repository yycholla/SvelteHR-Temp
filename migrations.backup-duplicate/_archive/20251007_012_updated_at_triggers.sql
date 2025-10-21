-- Migration: Add updated_at auto-update triggers
-- Feature: 025-events-flesh-out
-- Date: 2025-10-07

BEGIN;

-- Function to auto-update updated_at timestamp (reusable)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to events table
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at
BEFORE UPDATE ON hr_public.events
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Attach trigger to event_attendees table
DROP TRIGGER IF EXISTS update_attendees_updated_at ON event_attendees;
CREATE TRIGGER update_attendees_updated_at
BEFORE UPDATE ON hr_public.event_attendees
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Attach trigger to event_comments table
DROP TRIGGER IF EXISTS update_comments_updated_at ON event_comments;
CREATE TRIGGER update_comments_updated_at
BEFORE UPDATE ON hr_public.event_comments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMENT ON FUNCTION update_updated_at_column() IS 'Automatically updates the updated_at timestamp on row updates';

COMMIT;
