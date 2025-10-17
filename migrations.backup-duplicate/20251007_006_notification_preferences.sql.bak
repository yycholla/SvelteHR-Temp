-- Migration: Create notification_preferences table
-- Feature: 025-events-flesh-out
-- Date: 2025-10-07

BEGIN;

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES employees(id),
  event_invites BOOLEAN NOT NULL DEFAULT TRUE,
  event_changes BOOLEAN NOT NULL DEFAULT TRUE,
  event_reminders BOOLEAN NOT NULL DEFAULT TRUE,
  comment_mentions BOOLEAN NOT NULL DEFAULT TRUE,
  waitlist_updates BOOLEAN NOT NULL DEFAULT TRUE,
  reminder_times INT[] NOT NULL DEFAULT ARRAY[60, 1440] -- [1 hour, 1 day] in minutes
);

-- Add table comment
COMMENT ON TABLE notification_preferences IS 'User-configurable notification settings';
COMMENT ON COLUMN notification_preferences.event_invites IS 'Notify when invited to events';
COMMENT ON COLUMN notification_preferences.event_changes IS 'Notify when event details change';
COMMENT ON COLUMN notification_preferences.event_reminders IS 'Send event reminders';
COMMENT ON COLUMN notification_preferences.comment_mentions IS 'Notify when mentioned in comments';
COMMENT ON COLUMN notification_preferences.waitlist_updates IS 'Notify on waitlist status changes';
COMMENT ON COLUMN notification_preferences.reminder_times IS 'Array of minutes before event to send reminders (e.g., [60, 1440] = 1 hour and 1 day)';

COMMIT;
