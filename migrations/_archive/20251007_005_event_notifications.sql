-- Migration: Create event_notifications table
-- Feature: 025-events-flesh-out
-- Date: 2025-10-07

BEGIN;

-- Create notifications table
CREATE TABLE IF NOT EXISTS hr_public.event_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES hr_public.users(id),
  event_id UUID NOT NULL REFERENCES hr_public.events(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('invite', 'change', 'cancel', 'remove', 'comment', 'mention', 'waitlist', 'reminder')),
  message TEXT NOT NULL CHECK (LENGTH(message) BETWEEN 1 AND 500),
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for notification queries
CREATE INDEX idx_notifications_user ON hr_public.event_notifications(user_id, read, created_at DESC);
CREATE INDEX idx_notifications_event ON hr_public.event_notifications(event_id);
CREATE INDEX idx_notifications_type ON hr_public.event_notifications(type);
CREATE INDEX idx_notifications_unread ON hr_public.event_notifications(user_id, created_at DESC) WHERE read = FALSE;

-- Add table comment
COMMENT ON TABLE hr_public.event_notifications IS 'Notifications for event-related activities';
COMMENT ON COLUMN hr_public.event_notifications.type IS 'Notification type: invite, change, cancel, remove, comment, mention, waitlist, reminder';
COMMENT ON COLUMN hr_public.event_notifications.message IS 'User-friendly notification message (1-500 characters)';

COMMIT;
