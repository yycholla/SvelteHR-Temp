-- HR User Journeys Migration: Create Notifications Table
-- Created: 2025-01-25T14:00:06.000Z
--
-- This migration creates the notifications table for system-wide communication.
-- Supports multi-channel delivery, read status tracking, and action-required notifications.

BEGIN;

-- Create notifications table
CREATE TABLE hr_public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES hr_public.users(id),

  -- Notification content
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  notification_type VARCHAR(50) NOT NULL,
  priority VARCHAR(10) NOT NULL DEFAULT 'NORMAL',

  -- Delivery channels
  send_email BOOLEAN NOT NULL DEFAULT TRUE,
  send_push BOOLEAN NOT NULL DEFAULT TRUE,
  send_sms BOOLEAN NOT NULL DEFAULT FALSE,

  -- Status tracking
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  read_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,

  -- Related entity (for context and navigation)
  related_entity_type VARCHAR(50),
  related_entity_id UUID,

  -- Action required
  requires_action BOOLEAN NOT NULL DEFAULT FALSE,
  action_url TEXT,
  action_deadline TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES hr_public.users(id),
  updated_by UUID REFERENCES hr_public.users(id)
);

-- Add constraints for notification_type values
ALTER TABLE hr_public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (notification_type IN ('APPROVAL', 'DEADLINE', 'SYSTEM', 'TRAINING', 'REMINDER', 'WELCOME', 'ANNOUNCEMENT', 'GOAL_UPDATE', 'REVIEW_DUE', 'LEAVE_STATUS', 'TIME_ENTRY'));

-- Add constraints for priority values
ALTER TABLE hr_public.notifications
  ADD CONSTRAINT notifications_priority_check
  CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT'));

-- Add constraints for status values
ALTER TABLE hr_public.notifications
  ADD CONSTRAINT notifications_status_check
  CHECK (status IN ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED'));

-- Add constraints for related_entity_type values
ALTER TABLE hr_public.notifications
  ADD CONSTRAINT notifications_entity_type_check
  CHECK (related_entity_type IS NULL OR related_entity_type IN ('time_entry', 'leave_request', 'goal', 'performance_review', 'expense', 'training_enrollment', 'user', 'department'));

-- Add constraint to ensure action deadline is in the future if set
ALTER TABLE hr_public.notifications
  ADD CONSTRAINT notifications_action_deadline_check
  CHECK (action_deadline IS NULL OR action_deadline > created_at);

-- Add constraint to ensure read_at is after created_at
ALTER TABLE hr_public.notifications
  ADD CONSTRAINT notifications_read_at_check
  CHECK (read_at IS NULL OR read_at >= created_at);

-- Create indexes for performance
CREATE INDEX idx_notifications_recipient_id ON hr_public.notifications(recipient_id);
CREATE INDEX idx_notifications_sender_id ON hr_public.notifications(sender_id) WHERE sender_id IS NOT NULL;
CREATE INDEX idx_notifications_status ON hr_public.notifications(status);
CREATE INDEX idx_notifications_type ON hr_public.notifications(notification_type);
CREATE INDEX idx_notifications_priority ON hr_public.notifications(priority);
CREATE INDEX idx_notifications_created_at ON hr_public.notifications(created_at);
CREATE INDEX idx_notifications_recipient_status ON hr_public.notifications(recipient_id, status);
CREATE INDEX idx_notifications_recipient_unread ON hr_public.notifications(recipient_id, created_at) WHERE status != 'READ';
CREATE INDEX idx_notifications_related_entity ON hr_public.notifications(related_entity_type, related_entity_id) WHERE related_entity_type IS NOT NULL;
CREATE INDEX idx_notifications_action_required ON hr_public.notifications(requires_action, action_deadline) WHERE requires_action = true;

-- Create composite index for dashboard queries (unread notifications by recipient)
CREATE INDEX idx_notifications_dashboard ON hr_public.notifications(recipient_id, status, priority, created_at)
WHERE status IN ('PENDING', 'SENT', 'DELIVERED');

-- Create function to auto-update notification status
CREATE OR REPLACE FUNCTION hr_public.update_notification_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark as read when read_at is set
  IF NEW.read_at IS NOT NULL AND (OLD.read_at IS NULL OR OLD.status != 'READ') THEN
    NEW.status := 'READ';
  END IF;

  -- Mark as delivered when delivered_at is set
  IF NEW.delivered_at IS NOT NULL AND NEW.status = 'SENT' THEN
    NEW.status := 'DELIVERED';
  END IF;

  -- Set updated_at
  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating notification status
CREATE TRIGGER tr_update_notification_status
  BEFORE UPDATE ON hr_public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION hr_public.update_notification_status();

-- Create notification preferences table for user-specific settings
CREATE TABLE hr_public.user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,

  -- Channel preferences by notification type
  notification_type VARCHAR(50) NOT NULL,
  email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sms_enabled BOOLEAN NOT NULL DEFAULT FALSE,

  -- Timing preferences
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '07:00',
  weekend_notifications BOOLEAN NOT NULL DEFAULT FALSE,

  -- Digest settings
  daily_digest_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  weekly_digest_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  digest_time TIME DEFAULT '09:00',

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  UNIQUE(user_id, notification_type)
);

-- Add constraint for notification_type in preferences
ALTER TABLE hr_public.user_notification_preferences
  ADD CONSTRAINT user_notification_preferences_type_check
  CHECK (notification_type IN ('APPROVAL', 'DEADLINE', 'SYSTEM', 'TRAINING', 'REMINDER', 'WELCOME', 'ANNOUNCEMENT', 'GOAL_UPDATE', 'REVIEW_DUE', 'LEAVE_STATUS', 'TIME_ENTRY'));

-- Create indexes for notification preferences
CREATE INDEX idx_user_notification_preferences_user_id ON hr_public.user_notification_preferences(user_id);
CREATE INDEX idx_user_notification_preferences_type ON hr_public.user_notification_preferences(notification_type);
CREATE INDEX idx_user_notification_preferences_user_type ON hr_public.user_notification_preferences(user_id, notification_type);

-- Create function to create notification with user preferences
CREATE OR REPLACE FUNCTION hr_public.create_notification(
  p_recipient_id UUID,
  p_sender_id UUID,
  p_title VARCHAR(200),
  p_message TEXT,
  p_notification_type VARCHAR(50),
  p_priority VARCHAR(10) DEFAULT 'NORMAL',
  p_related_entity_type VARCHAR(50) DEFAULT NULL,
  p_related_entity_id UUID DEFAULT NULL,
  p_requires_action BOOLEAN DEFAULT FALSE,
  p_action_url TEXT DEFAULT NULL,
  p_action_deadline TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
  user_prefs RECORD;
  send_email BOOLEAN := TRUE;
  send_push BOOLEAN := TRUE;
  send_sms BOOLEAN := FALSE;
BEGIN
  -- Get user preferences for this notification type
  SELECT email_enabled, push_enabled, sms_enabled
  INTO user_prefs
  FROM hr_public.user_notification_preferences
  WHERE user_id = p_recipient_id
  AND notification_type = p_notification_type;

  -- Apply user preferences if they exist
  IF FOUND THEN
    send_email := user_prefs.email_enabled;
    send_push := user_prefs.push_enabled;
    send_sms := user_prefs.sms_enabled;
  END IF;

  -- Create the notification
  INSERT INTO hr_public.notifications (
    recipient_id,
    sender_id,
    title,
    message,
    notification_type,
    priority,
    send_email,
    send_push,
    send_sms,
    related_entity_type,
    related_entity_id,
    requires_action,
    action_url,
    action_deadline,
    created_by
  ) VALUES (
    p_recipient_id,
    p_sender_id,
    p_title,
    p_message,
    p_notification_type,
    p_priority,
    send_email,
    send_push,
    send_sms,
    p_related_entity_type,
    p_related_entity_id,
    p_requires_action,
    p_action_url,
    p_action_deadline,
    COALESCE(p_sender_id, p_recipient_id)
  ) RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to mark notifications as read
CREATE OR REPLACE FUNCTION hr_public.mark_notifications_read(
  p_user_id UUID,
  p_notification_ids UUID[] DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Mark specific notifications as read, or all unread notifications for user
  UPDATE hr_public.notifications
  SET read_at = NOW(),
      status = 'READ',
      updated_at = NOW()
  WHERE recipient_id = p_user_id
  AND status != 'read'
  AND (p_notification_ids IS NULL OR id = ANY(p_notification_ids));

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get user notifications with pagination
CREATE OR REPLACE FUNCTION hr_public.get_user_notifications(
  p_user_id UUID,
  p_status VARCHAR(20) DEFAULT NULL,
  p_notification_type VARCHAR(50) DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  title VARCHAR(200),
  message TEXT,
  notification_type VARCHAR(50),
  priority VARCHAR(10),
  status VARCHAR(20),
  requires_action BOOLEAN,
  action_url TEXT,
  action_deadline TIMESTAMPTZ,
  related_entity_type VARCHAR(50),
  related_entity_id UUID,
  sender_name TEXT,
  created_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  is_overdue BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.id,
    n.title,
    n.message,
    n.notification_type,
    n.priority,
    n.status,
    n.requires_action,
    n.action_url,
    n.action_deadline,
    n.related_entity_type,
    n.related_entity_id,
    s.display_name as sender_name,
    n.created_at,
    n.read_at,
    (n.requires_action AND n.action_deadline < NOW()) as is_overdue
  FROM hr_public.notifications n
  LEFT JOIN hr_public.users s ON n.sender_id = s.id
  WHERE n.recipient_id = p_user_id
  AND (p_status IS NULL OR n.status = p_status)
  AND (p_notification_type IS NULL OR n.notification_type = p_notification_type)
  ORDER BY
    CASE n.priority
      WHEN 'URGENT' THEN 1
      WHEN 'HIGH' THEN 2
      WHEN 'NORMAL' THEN 3
      WHEN 'LOW' THEN 4
    END,
    n.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function to get notification statistics for dashboard
CREATE OR REPLACE FUNCTION hr_public.get_notification_stats(p_user_id UUID)
RETURNS TABLE(
  total_unread INTEGER,
  high_priority_unread INTEGER,
  action_required_unread INTEGER,
  overdue_actions INTEGER,
  total_today INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(CASE WHEN n.status != 'read' THEN 1 END)::INTEGER as total_unread,
    COUNT(CASE WHEN n.status != 'read' AND n.priority IN ('HIGH', 'URGENT') THEN 1 END)::INTEGER as high_priority_unread,
    COUNT(CASE WHEN n.status != 'read' AND n.requires_action THEN 1 END)::INTEGER as action_required_unread,
    COUNT(CASE WHEN n.requires_action AND n.action_deadline < NOW() THEN 1 END)::INTEGER as overdue_actions,
    COUNT(CASE WHEN n.created_at::DATE = CURRENT_DATE THEN 1 END)::INTEGER as total_today
  FROM hr_public.notifications n
  WHERE n.recipient_id = p_user_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function to clean up old notifications
CREATE OR REPLACE FUNCTION hr_public.cleanup_old_notifications(
  p_retention_days INTEGER DEFAULT 90
)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete read notifications older than retention period
  DELETE FROM hr_public.notifications
  WHERE status = 'read'
  AND read_at < NOW() - INTERVAL '1 day' * p_retention_days;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to send bulk notifications (for announcements)
CREATE OR REPLACE FUNCTION hr_public.send_bulk_notification(
  p_sender_id UUID,
  p_title VARCHAR(200),
  p_message TEXT,
  p_notification_type VARCHAR(50),
  p_priority VARCHAR(10) DEFAULT 'NORMAL',
  p_recipient_filter JSONB DEFAULT '{}'::JSONB
)
RETURNS INTEGER AS $$
DECLARE
  notification_count INTEGER;
  recipient_query TEXT;
BEGIN
  -- Build dynamic query based on filter criteria
  recipient_query := 'SELECT id FROM hr_public.users WHERE employment_status = ''active''';

  -- Add department filter if specified
  IF p_recipient_filter ? 'department_ids' THEN
    recipient_query := recipient_query || ' AND department_id = ANY(ARRAY[' ||
      array_to_string(
        ARRAY(SELECT jsonb_array_elements_text(p_recipient_filter->'department_ids')),
        ','
      ) || ']::UUID[])';
  END IF;

  -- Add role level filter if specified
  IF p_recipient_filter ? 'min_role_level' THEN
    recipient_query := recipient_query || ' AND role_level >= ' ||
      (p_recipient_filter->>'min_role_level')::INTEGER;
  END IF;

  -- Add manager filter if specified
  IF p_recipient_filter ? 'manager_ids' THEN
    recipient_query := recipient_query || ' AND manager_id = ANY(ARRAY[' ||
      array_to_string(
        ARRAY(SELECT jsonb_array_elements_text(p_recipient_filter->'manager_ids')),
        ','
      ) || ']::UUID[])';
  END IF;

  -- Insert notifications for all matching users
  EXECUTE format('
    INSERT INTO hr_public.notifications (
      recipient_id, sender_id, title, message, notification_type, priority, created_by
    )
    SELECT u.id, $1, $2, $3, $4, $5, $1
    FROM (%s) u',
    recipient_query
  ) USING p_sender_id, p_title, p_message, p_notification_type, p_priority;

  GET DIAGNOSTICS notification_count = ROW_COUNT;
  RETURN notification_count;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON hr_public.notifications TO hr_graphile_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON hr_public.user_notification_preferences TO hr_graphile_role;
GRANT EXECUTE ON FUNCTION hr_public.update_notification_status() TO hr_graphile_role;
GRANT EXECUTE ON FUNCTION hr_public.create_notification(UUID, UUID, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, UUID, BOOLEAN, TEXT, TIMESTAMPTZ) TO hr_graphile_role;
GRANT EXECUTE ON FUNCTION hr_public.mark_notifications_read(UUID, UUID[]) TO hr_graphile_role;
GRANT EXECUTE ON FUNCTION hr_public.get_user_notifications(UUID, VARCHAR, VARCHAR, INTEGER, INTEGER) TO hr_graphile_role;
GRANT EXECUTE ON FUNCTION hr_public.get_notification_stats(UUID) TO hr_graphile_role;
GRANT EXECUTE ON FUNCTION hr_public.cleanup_old_notifications(INTEGER) TO hr_graphile_role;
GRANT EXECUTE ON FUNCTION hr_public.send_bulk_notification(UUID, VARCHAR, TEXT, VARCHAR, VARCHAR, JSONB) TO hr_graphile_role;

-- Enable RLS (will be configured in separate RLS migration)
ALTER TABLE hr_public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Add table and column comments
COMMENT ON TABLE hr_public.notifications IS 'System-wide notifications with multi-channel delivery and action tracking';
COMMENT ON TABLE hr_public.user_notification_preferences IS 'User-specific notification delivery preferences by type';

COMMENT ON COLUMN hr_public.notifications.recipient_id IS 'User who will receive this notification';
COMMENT ON COLUMN hr_public.notifications.sender_id IS 'User who sent this notification (NULL for system notifications)';
COMMENT ON COLUMN hr_public.notifications.notification_type IS 'Type: APPROVAL, DEADLINE, SYSTEM, TRAINING, REMINDER, etc.';
COMMENT ON COLUMN hr_public.notifications.priority IS 'Priority: LOW, NORMAL, HIGH, URGENT';
COMMENT ON COLUMN hr_public.notifications.status IS 'Status: PENDING, SENT, DELIVERED, READ, FAILED';
COMMENT ON COLUMN hr_public.notifications.related_entity_type IS 'Type of related entity for context navigation';
COMMENT ON COLUMN hr_public.notifications.related_entity_id IS 'ID of related entity for context navigation';
COMMENT ON COLUMN hr_public.notifications.requires_action IS 'Whether notification requires user action';
COMMENT ON COLUMN hr_public.notifications.action_url IS 'URL for required action (relative or absolute)';
COMMENT ON COLUMN hr_public.notifications.action_deadline IS 'Deadline for required action';

COMMENT ON FUNCTION hr_public.update_notification_status() IS 'Auto-updates notification status based on read and delivery timestamps';
COMMENT ON FUNCTION hr_public.create_notification(UUID, UUID, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, UUID, BOOLEAN, TEXT, TIMESTAMPTZ) IS 'Creates notification respecting user preferences';
COMMENT ON FUNCTION hr_public.mark_notifications_read(UUID, UUID[]) IS 'Marks specified or all unread notifications as read';
COMMENT ON FUNCTION hr_public.get_user_notifications(UUID, VARCHAR, VARCHAR, INTEGER, INTEGER) IS 'Retrieves user notifications with pagination and filtering';
COMMENT ON FUNCTION hr_public.get_notification_stats(UUID) IS 'Returns notification statistics for dashboard display';
COMMENT ON FUNCTION hr_public.cleanup_old_notifications(INTEGER) IS 'Removes old read notifications beyond retention period';
COMMENT ON FUNCTION hr_public.send_bulk_notification(UUID, VARCHAR, TEXT, VARCHAR, VARCHAR, JSONB) IS 'Sends notifications to multiple users based on filter criteria';

COMMIT;