-- Migration: Create notifications table
-- Feature: 019-we-need-to - Task T016
-- Purpose: Enable in-app and email notifications with read/unread tracking and RLS

-- Create notification type enum
CREATE TYPE hr_public.notification_type AS ENUM (
    'info',
    'warning',
    'success',
    'error',
    'task_assigned',
    'task_completed',
    'leave_request',
    'performance_review',
    'event_reminder',
    'system_announcement'
);

-- Create notification category enum
CREATE TYPE hr_public.notification_category AS ENUM (
    'system',
    'task',
    'leave',
    'performance',
    'event',
    'hr',
    'department'
);

-- Create resource type enum for related resources
CREATE TYPE hr_public.resource_type AS ENUM (
    'task',
    'leave_request',
    'performance_review',
    'event',
    'user',
    'department',
    'goal',
    'report'
);

-- Create notifications table
CREATE TABLE hr_public.notifications (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    recipient_id uuid NOT NULL,
    type hr_public.notification_type NOT NULL,
    category hr_public.notification_category NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    related_resource_type hr_public.resource_type,
    related_resource_id uuid,
    read_status boolean DEFAULT false NOT NULL,
    delivered_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT notifications_pkey PRIMARY KEY (id),
    CONSTRAINT notifications_title_not_empty CHECK (length(TRIM(BOTH FROM title)) > 0),
    CONSTRAINT notifications_message_not_empty CHECK (length(TRIM(BOTH FROM message)) > 0),
    CONSTRAINT notifications_read_at_logic CHECK (
        (read_status = true AND read_at IS NOT NULL) OR
        (read_status = false AND read_at IS NULL)
    )
);

-- Add foreign key constraint
ALTER TABLE hr_public.notifications
    ADD CONSTRAINT notifications_recipient_id_fkey
    FOREIGN KEY (recipient_id)
    REFERENCES hr_public.users(id)
    ON DELETE CASCADE;

-- Create indexes for common queries
CREATE INDEX notifications_recipient_id_idx ON hr_public.notifications(recipient_id);
CREATE INDEX notifications_read_status_idx ON hr_public.notifications(read_status);
CREATE INDEX notifications_type_idx ON hr_public.notifications(type);
CREATE INDEX notifications_category_idx ON hr_public.notifications(category);
CREATE INDEX notifications_created_at_idx ON hr_public.notifications(created_at DESC);
CREATE INDEX notifications_unread_recipient_idx ON hr_public.notifications(recipient_id, read_status)
    WHERE read_status = false;

-- Grant permissions to appropriate roles
GRANT SELECT ON hr_public.notifications TO hr_guest, hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT INSERT ON hr_public.notifications TO hr_manager, hr_admin, hr_super_admin;
GRANT UPDATE (read_status, read_at) ON hr_public.notifications TO hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT DELETE ON hr_public.notifications TO hr_admin, hr_super_admin;

-- Add comments for documentation
COMMENT ON TABLE hr_public.notifications IS 'User notifications for in-app and email delivery with read tracking';
COMMENT ON COLUMN hr_public.notifications.recipient_id IS 'User who receives the notification';
COMMENT ON COLUMN hr_public.notifications.type IS 'Type of notification (info, warning, success, error, etc.)';
COMMENT ON COLUMN hr_public.notifications.category IS 'Category for filtering and organization';
COMMENT ON COLUMN hr_public.notifications.related_resource_type IS 'Type of related resource (task, event, etc.)';
COMMENT ON COLUMN hr_public.notifications.related_resource_id IS 'ID of related resource for navigation';
COMMENT ON COLUMN hr_public.notifications.read_status IS 'Whether notification has been read by recipient';
COMMENT ON COLUMN hr_public.notifications.delivered_at IS 'When notification was delivered';
COMMENT ON COLUMN hr_public.notifications.read_at IS 'When notification was marked as read';
