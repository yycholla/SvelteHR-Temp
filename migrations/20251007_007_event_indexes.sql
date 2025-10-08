-- Migration: Create performance indexes for events
-- Feature: 025-events-flesh-out
-- Date: 2025-10-07

BEGIN;

-- Event query indexes
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_end_time ON events(end_time);
CREATE INDEX IF NOT EXISTS idx_events_visibility ON events(visibility);
CREATE INDEX IF NOT EXISTS idx_events_creator ON events(created_by);
CREATE INDEX IF NOT EXISTS idx_events_recurrence ON events(recurrence_id) WHERE recurrence_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);

-- GiST index for temporal overlaps (conflict detection)
-- This enables fast queries like: WHERE tsrange(start_time, end_time) && tsrange($1, $2)
CREATE INDEX IF NOT EXISTS idx_events_time_range ON events USING GIST (tsrange(start_time, end_time));

-- Composite index for common event listing queries
CREATE INDEX IF NOT EXISTS idx_events_visibility_start ON events(visibility, start_time DESC);

-- RSVP lookup indexes
CREATE INDEX IF NOT EXISTS idx_attendees_event ON event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_attendees_employee ON event_attendees(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendees_status ON event_attendees(rsvp_status);
CREATE INDEX IF NOT EXISTS idx_attendees_composite ON event_attendees(employee_id, event_id, rsvp_status);

COMMIT;
