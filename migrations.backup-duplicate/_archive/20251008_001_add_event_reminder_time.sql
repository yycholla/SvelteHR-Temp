-- Migration: Add reminder_time column to event_attendees
-- Feature: 026-integrate-ui-components
-- Date: 2025-10-08
-- Description: Add support for per-attendee event reminder notifications
--
-- This migration adds the reminder_time column to the event_attendees table,
-- allowing users to set personalized reminder times (in minutes before the event)
-- for events they have accepted or tentatively accepted.

-- Add reminder_time column to event_attendees table (with explicit schema)
ALTER TABLE hr_public.event_attendees
ADD COLUMN IF NOT EXISTS reminder_time INTEGER;

-- Add column comment for documentation
COMMENT ON COLUMN hr_public.event_attendees.reminder_time IS
  'Minutes before event to send reminder notification (NULL = no reminder). Examples: 15 = 15 min, 60 = 1 hour, 1440 = 1 day, 10080 = 1 week';

-- Create index for efficient reminder queries (for notification service to find upcoming reminders)
CREATE INDEX IF NOT EXISTS idx_event_attendees_reminder_time
ON hr_public.event_attendees(reminder_time)
WHERE reminder_time IS NOT NULL;

-- Create composite index for notification service queries (find reminders for upcoming events)
CREATE INDEX IF NOT EXISTS idx_event_attendees_reminder_lookup
ON hr_public.event_attendees(event_id, employee_id, reminder_time)
WHERE reminder_time IS NOT NULL;
