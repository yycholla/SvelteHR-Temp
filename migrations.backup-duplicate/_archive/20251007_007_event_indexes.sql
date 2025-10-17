-- Migration: Create performance indexes for events
-- Feature: 025-events-flesh-out
-- Date: 2025-10-07

BEGIN;

-- Event query indexes
CREATE INDEX IF NOT EXISTS idx_events_start_time ON hr_public.events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_end_time ON hr_public.events(end_time);
CREATE INDEX IF NOT EXISTS idx_events_is_public ON hr_public.events(is_public);
CREATE INDEX IF NOT EXISTS idx_events_organizer ON hr_public.events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_recurrence ON hr_public.events(recurrence_id) WHERE recurrence_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_type ON hr_public.events(event_type);

-- GiST index for temporal overlaps (conflict detection)
-- This enables fast queries like: WHERE tstzrange(start_time, end_time) && tstzrange($1, $2)
-- Using tstzrange because start_time and end_time are timestamp with time zone
CREATE INDEX IF NOT EXISTS idx_events_time_range ON hr_public.events USING GIST (tstzrange(start_time, end_time));

-- Composite index for common event listing queries
CREATE INDEX IF NOT EXISTS idx_events_is_public_start ON hr_public.events(is_public, start_time DESC);

-- RSVP lookup indexes
CREATE INDEX IF NOT EXISTS idx_attendees_event ON hr_public.event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_attendees_employee ON hr_public.event_attendees(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendees_status ON hr_public.event_attendees(response_status);
CREATE INDEX IF NOT EXISTS idx_attendees_composite ON hr_public.event_attendees(employee_id, event_id, response_status);

COMMIT;
