-- Migration: Create event_notifications table
-- Feature: 025-events-flesh-out
-- Date: 2025-10-07

BEGIN;

-- Create notifications table
CREATE TABLE IF NOT EXISTS event_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES employees(id),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('invite', 'change', 'cancel', 'remove', 'comment', 'mention', 'waitlist', 'reminder')),
  message TEXT NOT NULL CHECK (LENGTH(message) BETWEEN 1 AND 500),
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for notification queries
CREATE INDEX idx_notifications_user ON event_notifications(user_id, read, created_at DESC);
CREATE INDEX idx_notifications_event ON event_notifications(event_id);
CREATE INDEX idx_notifications_type ON event_notifications(type);
CREATE INDEX idx_notifications_unread ON event_notifications(user_id, created_at DESC) WHERE read = FALSE;

-- Add table comment
COMMENT ON TABLE event_notifications IS 'Notifications for event-related activities';
COMMENT ON COLUMN event_notifications.type IS 'Notification type: invite, change, cancel, remove, comment, mention, waitlist, reminder';
COMMENT ON COLUMN event_notifications.message IS 'User-friendly notification message (1-500 characters)';

COMMIT;
