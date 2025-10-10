-- Migration: Complete Events System Setup
-- Date: 2025-10-10
-- Purpose: Consolidated events, attendees, waitlist, comments, history, and notifications

BEGIN;

-- ========================================
-- EVENTS TABLE (already exists, add missing columns)
-- ========================================

-- Add recurring events and capacity columns
ALTER TABLE hr_public.events
ADD COLUMN IF NOT EXISTS rrule TEXT,
ADD COLUMN IF NOT EXISTS recurrence_id UUID REFERENCES hr_public.events(id),
ADD COLUMN IF NOT EXISTS max_capacity INT CHECK (max_capacity > 0),
ADD COLUMN IF NOT EXISTS waitlist_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);

COMMENT ON COLUMN hr_public.events.rrule IS 'RFC 5545 RRULE string for recurring events';
COMMENT ON COLUMN hr_public.events.recurrence_id IS 'Parent event ID if this is a recurring event exception';
COMMENT ON COLUMN hr_public.events.max_capacity IS 'Maximum number of attendees (null = unlimited)';
COMMENT ON COLUMN hr_public.events.waitlist_enabled IS 'Whether waitlist is enabled when capacity is reached';
COMMENT ON COLUMN hr_public.events.image_url IS 'URL path to event image (max 10 MB, optimized by Sharp)';

-- ========================================
-- EVENT_WAITLIST TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS hr_public.event_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES hr_public.events(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES hr_public.users(id),
  position INT NOT NULL CHECK (position > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, employee_id),
  UNIQUE (event_id, position)
);

COMMENT ON TABLE hr_public.event_waitlist IS 'Waitlist entries for events at capacity';
COMMENT ON COLUMN hr_public.event_waitlist.position IS 'Position in waitlist queue (FIFO ordering)';

CREATE INDEX idx_waitlist_event ON hr_public.event_waitlist(event_id, position);
CREATE INDEX idx_waitlist_employee ON hr_public.event_waitlist(employee_id);

-- ========================================
-- EVENT_COMMENTS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS hr_public.event_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES hr_public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES hr_public.users(id),
  content TEXT NOT NULL CHECK (LENGTH(TRIM(content)) > 0 AND LENGTH(content) <= 5000),
  mentions UUID[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

COMMENT ON TABLE hr_public.event_comments IS 'User comments and discussions on events';
COMMENT ON COLUMN hr_public.event_comments.mentions IS 'Array of employee IDs mentioned in comment with @ syntax';
COMMENT ON COLUMN hr_public.event_comments.content IS 'Comment text (1-5000 characters after trimming)';

CREATE INDEX idx_comments_event ON hr_public.event_comments(event_id);
CREATE INDEX idx_comments_user ON hr_public.event_comments(user_id);
CREATE INDEX idx_comments_created_at ON hr_public.event_comments(created_at DESC);

-- Full-text search on comments
CREATE INDEX idx_comments_fulltext ON hr_public.event_comments
USING GIN(to_tsvector('english', content));

-- ========================================
-- EVENT_HISTORY TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS hr_public.event_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES hr_public.events(id) ON DELETE CASCADE,
  changed_by UUID NOT NULL REFERENCES hr_public.users(id),
  change_type TEXT NOT NULL CHECK (change_type IN ('created', 'updated', 'deleted', 'ownership_transfer', 'attendee_added', 'attendee_removed')),
  field_name VARCHAR(100),
  old_value JSONB,
  new_value JSONB,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE hr_public.event_history IS E'@omit create,update,delete\nImmutable audit trail of event changes';
COMMENT ON COLUMN hr_public.event_history.change_type IS 'Type of change: created, updated, deleted, ownership_transfer, attendee_added, attendee_removed';

CREATE INDEX idx_history_event ON hr_public.event_history(event_id, changed_at DESC);
CREATE INDEX idx_history_changed_by ON hr_public.event_history(changed_by);
CREATE INDEX idx_history_change_type ON hr_public.event_history(change_type);

-- ========================================
-- EVENT_NOTIFICATIONS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS hr_public.event_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES hr_public.users(id),
  event_id UUID NOT NULL REFERENCES hr_public.events(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('invite', 'change', 'cancel', 'remove', 'comment', 'mention', 'waitlist', 'reminder')),
  message TEXT NOT NULL CHECK (LENGTH(message) BETWEEN 1 AND 500),
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE hr_public.event_notifications IS 'Notifications for event-related activities';
COMMENT ON COLUMN hr_public.event_notifications.type IS 'Notification type: invite, change, cancel, remove, comment, mention, waitlist, reminder';

CREATE INDEX idx_notifications_user ON hr_public.event_notifications(user_id, read, created_at DESC);
CREATE INDEX idx_notifications_event ON hr_public.event_notifications(event_id);
CREATE INDEX idx_notifications_type ON hr_public.event_notifications(type);
CREATE INDEX idx_notifications_unread ON hr_public.event_notifications(user_id, created_at DESC) WHERE read = FALSE;

-- ========================================
-- NOTIFICATION_PREFERENCES TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS hr_public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES hr_public.users(id),
  event_invites BOOLEAN NOT NULL DEFAULT TRUE,
  event_changes BOOLEAN NOT NULL DEFAULT TRUE,
  event_reminders BOOLEAN NOT NULL DEFAULT TRUE,
  comment_mentions BOOLEAN NOT NULL DEFAULT TRUE,
  waitlist_updates BOOLEAN NOT NULL DEFAULT TRUE,
  reminder_times INT[] NOT NULL DEFAULT ARRAY[60, 1440]
);

COMMENT ON TABLE hr_public.notification_preferences IS 'User-configurable notification settings';
COMMENT ON COLUMN hr_public.notification_preferences.reminder_times IS 'Array of minutes before event to send reminders (e.g., [60, 1440] = 1 hour and 1 day)';

-- ========================================
-- EVENTS INDEXES
-- ========================================

CREATE INDEX IF NOT EXISTS idx_events_end_time ON hr_public.events(end_time);
CREATE INDEX IF NOT EXISTS idx_events_is_public ON hr_public.events(is_public);
CREATE INDEX IF NOT EXISTS idx_events_organizer ON hr_public.events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_recurrence ON hr_public.events(recurrence_id) WHERE recurrence_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_type ON hr_public.events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_time_range ON hr_public.events USING GIST (tstzrange(start_time, end_time));
CREATE INDEX IF NOT EXISTS idx_events_is_public_start ON hr_public.events(is_public, start_time DESC);

-- Full-text search on events
CREATE INDEX IF NOT EXISTS idx_events_title_fulltext ON hr_public.events
USING GIN(to_tsvector('english', title));

CREATE INDEX IF NOT EXISTS idx_events_description_fulltext ON hr_public.events
USING GIN(to_tsvector('english', COALESCE(description, '')));

-- EVENT_ATTENDEES indexes (table already exists)
CREATE INDEX IF NOT EXISTS idx_attendees_status ON hr_public.event_attendees(response_status);
CREATE INDEX IF NOT EXISTS idx_attendees_composite ON hr_public.event_attendees(employee_id, event_id, response_status);

-- ========================================
-- WAITLIST PROMOTION FUNCTION
-- ========================================

CREATE OR REPLACE FUNCTION promote_from_waitlist()
RETURNS TRIGGER AS $$
DECLARE
  next_waitlist RECORD;
  event_waitlist_enabled BOOLEAN;
BEGIN
  IF OLD.response_status = 'accepted' AND NEW.response_status = 'declined' THEN
    SELECT waitlist_enabled INTO event_waitlist_enabled
    FROM hr_public.events
    WHERE id = NEW.event_id;

    IF event_waitlist_enabled THEN
      SELECT id, employee_id, event_id, position
      INTO next_waitlist
      FROM hr_public.event_waitlist
      WHERE event_id = NEW.event_id
      ORDER BY position
      LIMIT 1;

      IF FOUND THEN
        INSERT INTO hr_public.event_attendees (event_id, employee_id, response_status)
        VALUES (next_waitlist.event_id, next_waitlist.employee_id, 'pending')
        ON CONFLICT (event_id, employee_id) DO UPDATE SET response_status = 'pending';

        DELETE FROM hr_public.event_waitlist WHERE id = next_waitlist.id;

        INSERT INTO hr_public.event_notifications (user_id, event_id, type, message)
        VALUES (
          next_waitlist.employee_id,
          next_waitlist.event_id,
          'waitlist',
          'A spot opened up for this event! You have been moved from the waitlist.'
        );

        UPDATE hr_public.event_waitlist
        SET position = position - 1
        WHERE event_id = NEW.event_id AND position > next_waitlist.position;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS waitlist_promotion_trigger ON hr_public.event_attendees;
CREATE TRIGGER waitlist_promotion_trigger
AFTER UPDATE ON hr_public.event_attendees
FOR EACH ROW
EXECUTE FUNCTION promote_from_waitlist();

-- ========================================
-- ROW LEVEL SECURITY
-- ========================================

ALTER TABLE hr_public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.event_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.event_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.event_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Events policies
DROP POLICY IF EXISTS events_select_policy ON hr_public.events;
CREATE POLICY events_select_policy ON hr_public.events
  FOR SELECT USING (
    is_public = TRUE OR
    id IN (SELECT event_id FROM hr_public.event_attendees WHERE employee_id = current_setting('app.current_user_id', true)::UUID) OR
    organizer_id = current_setting('app.current_user_id', true)::UUID
  );

DROP POLICY IF EXISTS events_insert_policy ON hr_public.events;
CREATE POLICY events_insert_policy ON hr_public.events
  FOR INSERT WITH CHECK (organizer_id = current_setting('app.current_user_id', true)::UUID);

DROP POLICY IF EXISTS events_update_policy ON hr_public.events;
CREATE POLICY events_update_policy ON hr_public.events
  FOR UPDATE USING (organizer_id = current_setting('app.current_user_id', true)::UUID);

DROP POLICY IF EXISTS events_delete_policy ON hr_public.events;
CREATE POLICY events_delete_policy ON hr_public.events
  FOR DELETE USING (organizer_id = current_setting('app.current_user_id', true)::UUID);

-- Attendees policies
DROP POLICY IF EXISTS attendees_select_policy ON hr_public.event_attendees;
CREATE POLICY attendees_select_policy ON hr_public.event_attendees
  FOR SELECT USING (
    event_id IN (SELECT id FROM hr_public.events WHERE is_public = TRUE) OR
    employee_id = current_setting('app.current_user_id', true)::UUID OR
    event_id IN (SELECT id FROM hr_public.events WHERE organizer_id = current_setting('app.current_user_id', true)::UUID)
  );

-- Notifications policies
DROP POLICY IF EXISTS notifications_own_policy ON hr_public.event_notifications;
CREATE POLICY notifications_own_policy ON hr_public.event_notifications
  FOR ALL USING (user_id = current_setting('app.current_user_id', true)::UUID);

-- Preferences policies
DROP POLICY IF EXISTS preferences_own_policy ON hr_public.notification_preferences;
CREATE POLICY preferences_own_policy ON hr_public.notification_preferences
  FOR ALL USING (user_id = current_setting('app.current_user_id', true)::UUID);

COMMIT;
