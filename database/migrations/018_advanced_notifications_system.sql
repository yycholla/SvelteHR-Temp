-- Migration: Advanced Notifications System
-- Created: 2025-09-15
-- Description: Comprehensive notification system with templates, channels, preferences, and real-time delivery

-- Create ENUM types for notification system
CREATE TYPE hr_public.notification_channel AS ENUM (
    'IN_APP',
    'EMAIL', 
    'SMS',
    'PUSH',
    'SLACK',
    'TEAMS',
    'WEBHOOK'
);

CREATE TYPE hr_public.notification_priority AS ENUM (
    'LOW',
    'NORMAL', 
    'HIGH',
    'URGENT',
    'CRITICAL'
);

CREATE TYPE hr_public.notification_category AS ENUM (
    'SYSTEM',
    'WORKFLOW',
    'APPROVAL',
    'REMINDER',
    'ALERT',
    'ANNOUNCEMENT',
    'TIME_OFF',
    'PAYROLL',
    'PERFORMANCE',
    'DOCUMENT',
    'SECURITY'
);

CREATE TYPE hr_public.delivery_status AS ENUM (
    'PENDING',
    'SENT',
    'DELIVERED', 
    'READ',
    'FAILED',
    'BOUNCED',
    'CLICKED'
);

CREATE TYPE hr_public.digest_frequency AS ENUM (
    'NONE',
    'IMMEDIATE',
    'HOURLY',
    'DAILY',
    'WEEKLY'
);

-- Notification templates for consistent messaging
CREATE TABLE hr_public.notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Template identification
    template_key VARCHAR(100) UNIQUE NOT NULL, -- 'employee_hired', 'time_off_approved', etc.
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category hr_public.notification_category NOT NULL,
    
    -- Template content (supports variable interpolation)
    subject_template TEXT NOT NULL,
    body_template TEXT NOT NULL,
    action_url_template TEXT,
    
    -- Default settings
    default_priority hr_public.notification_priority DEFAULT 'NORMAL',
    default_channels hr_public.notification_channel[] DEFAULT ARRAY['IN_APP'],
    
    -- Versioning and lifecycle
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    previous_version_id UUID REFERENCES hr_public.notification_templates(id),
    
    -- Access control
    created_by UUID NOT NULL REFERENCES hr_public.users(id),
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT template_key_format CHECK (template_key ~ '^[a-z0-9_]+$'),
    CONSTRAINT template_version_valid CHECK (version > 0)
);

-- User notification preferences
CREATE TABLE hr_public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- User and scope
    user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    category hr_public.notification_category,
    template_key VARCHAR(100),
    
    -- Channel preferences
    enabled_channels hr_public.notification_channel[] DEFAULT ARRAY['IN_APP'],
    disabled_channels hr_public.notification_channel[] DEFAULT ARRAY[]::hr_public.notification_channel[],
    
    -- Delivery preferences
    digest_frequency hr_public.digest_frequency DEFAULT 'IMMEDIATE',
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- Filtering preferences
    min_priority hr_public.notification_priority DEFAULT 'LOW',
    keywords_include TEXT[], -- Only notifications containing these keywords
    keywords_exclude TEXT[], -- Exclude notifications with these keywords
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT user_category_unique UNIQUE(user_id, category, template_key),
    CONSTRAINT quiet_hours_valid CHECK (
        (quiet_hours_start IS NULL AND quiet_hours_end IS NULL) OR
        (quiet_hours_start IS NOT NULL AND quiet_hours_end IS NOT NULL)
    )
);

-- Enhanced notifications table (extends existing basic table)
-- Note: We'll enhance the existing table rather than recreate it
ALTER TABLE hr_public.notifications 
ADD COLUMN IF NOT EXISTS category hr_public.notification_category DEFAULT 'SYSTEM',
ADD COLUMN IF NOT EXISTS priority hr_public.notification_priority DEFAULT 'NORMAL',
ADD COLUMN IF NOT EXISTS template_key VARCHAR(100),
ADD COLUMN IF NOT EXISTS template_data JSONB,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS source_type VARCHAR(100), -- 'workflow', 'system', 'user', etc.
ADD COLUMN IF NOT EXISTS source_id UUID, -- ID of the source object
ADD COLUMN IF NOT EXISTS parent_notification_id UUID REFERENCES hr_public.notifications(id),
ADD COLUMN IF NOT EXISTS thread_id UUID; -- For grouping related notifications

-- Update existing type column to be an enum
DO $$
BEGIN
    -- Create enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type_enum') THEN
        CREATE TYPE hr_public.notification_type_enum AS ENUM (
            'info', 'success', 'warning', 'error', 'WORKFLOW', 'APPROVAL', 'REMINDER', 'ALERT'
        );
    END IF;
END $$;

-- Notification delivery tracking
CREATE TABLE hr_public.notification_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- References
    notification_id UUID NOT NULL REFERENCES hr_public.notifications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    
    -- Delivery details
    channel hr_public.notification_channel NOT NULL,
    status hr_public.delivery_status DEFAULT 'PENDING',
    
    -- Channel-specific data
    channel_address TEXT, -- email address, phone number, webhook URL, etc.
    external_id TEXT, -- ID from external service (email provider, SMS service, etc.)
    
    -- Delivery tracking
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    
    -- Error handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    next_retry_at TIMESTAMPTZ,
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT delivery_status_timestamps CHECK (
        (status = 'SENT' AND sent_at IS NOT NULL) OR
        (status = 'DELIVERED' AND delivered_at IS NOT NULL) OR 
        (status = 'READ' AND read_at IS NOT NULL) OR
        (status = 'FAILED' AND failed_at IS NOT NULL) OR
        (status IN ('PENDING', 'BOUNCED', 'CLICKED'))
    ),
    CONSTRAINT retry_logic CHECK (retry_count <= max_retries)
);

-- Notification subscriptions (for following specific items)
CREATE TABLE hr_public.notification_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Subscriber
    user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    
    -- What they're subscribing to
    resource_type VARCHAR(100) NOT NULL, -- 'time_off_request', 'employee', 'department', etc.
    resource_id UUID NOT NULL,
    
    -- Subscription preferences
    categories hr_public.notification_category[] DEFAULT ARRAY['ALERT', 'WORKFLOW'],
    channels hr_public.notification_channel[] DEFAULT ARRAY['IN_APP'],
    
    -- Subscription lifecycle
    subscribed_at TIMESTAMPTZ DEFAULT NOW(),
    unsubscribed_at TIMESTAMPTZ,
    is_active BOOLEAN GENERATED ALWAYS AS (unsubscribed_at IS NULL) STORED,
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT user_resource_unique UNIQUE(user_id, resource_type, resource_id),
    CONSTRAINT subscription_lifecycle CHECK (
        (unsubscribed_at IS NULL) OR 
        (unsubscribed_at >= subscribed_at)
    )
);

-- Notification digest summary
CREATE TABLE hr_public.notification_digests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Digest details
    user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    frequency hr_public.digest_frequency NOT NULL,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    
    -- Content
    notification_count INTEGER NOT NULL DEFAULT 0,
    categories_summary JSONB, -- Count per category
    priority_summary JSONB, -- Count per priority
    digest_content TEXT, -- Formatted digest content
    
    -- Delivery
    sent_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT digest_period_valid CHECK (period_end > period_start),
    CONSTRAINT digest_count_valid CHECK (notification_count >= 0)
);

-- Create indexes for performance
CREATE INDEX idx_notification_templates_key ON hr_public.notification_templates(template_key) WHERE is_active = true;
CREATE INDEX idx_notification_templates_category ON hr_public.notification_templates(category, is_active);

CREATE INDEX idx_notification_preferences_user ON hr_public.notification_preferences(user_id);
CREATE INDEX idx_notification_preferences_category ON hr_public.notification_preferences(category);
CREATE INDEX idx_notification_preferences_digest ON hr_public.notification_preferences(digest_frequency) WHERE digest_frequency != 'IMMEDIATE';

CREATE INDEX idx_notifications_user_unread ON hr_public.notifications(user_id, created_at DESC) WHERE is_read = false;
CREATE INDEX idx_notifications_category_priority ON hr_public.notifications(category, priority, created_at DESC);
CREATE INDEX idx_notifications_expires ON hr_public.notifications(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_notifications_thread ON hr_public.notifications(thread_id) WHERE thread_id IS NOT NULL;

CREATE INDEX idx_notification_deliveries_status ON hr_public.notification_deliveries(status, created_at);
CREATE INDEX idx_notification_deliveries_retry ON hr_public.notification_deliveries(next_retry_at) WHERE status = 'FAILED' AND retry_count < max_retries;
CREATE INDEX idx_notification_deliveries_channel ON hr_public.notification_deliveries(channel, status);

CREATE INDEX idx_notification_subscriptions_resource ON hr_public.notification_subscriptions(resource_type, resource_id) WHERE is_active = true;
CREATE INDEX idx_notification_subscriptions_user ON hr_public.notification_subscriptions(user_id) WHERE is_active = true;

CREATE INDEX idx_notification_digests_user_frequency ON hr_public.notification_digests(user_id, frequency, period_start);
CREATE INDEX idx_notification_digests_unsent ON hr_public.notification_digests(user_id, frequency) WHERE sent_at IS NULL;

-- Insert default notification templates
INSERT INTO hr_public.notification_templates (
    template_key, name, description, category, subject_template, body_template, 
    default_priority, default_channels, created_by
) VALUES 
(
    'workflow_started',
    'Workflow Started',
    'Notification when a workflow is triggered',
    'WORKFLOW',
    'Workflow Started: {{workflow_name}}',
    'A new workflow "{{workflow_name}}" has been started for {{resource_name}}. You can track its progress in your dashboard.',
    'NORMAL',
    ARRAY['IN_APP', 'EMAIL'],
    (SELECT id FROM hr_public.users WHERE email = 'admin@postgraphile-hr.com')
),
(
    'approval_required',
    'Approval Required',
    'Notification when approval is needed',
    'APPROVAL', 
    'Approval Required: {{subject}}',
    'Your approval is required for: {{subject}}. Please review and respond within {{deadline}} hours.',
    'HIGH',
    ARRAY['IN_APP', 'EMAIL', 'PUSH'],
    (SELECT id FROM hr_public.users WHERE email = 'admin@postgraphile-hr.com')
),
(
    'time_off_approved',
    'Time Off Approved',
    'Notification when time off request is approved',
    'TIME_OFF',
    'Time Off Request Approved',
    'Your time off request from {{start_date}} to {{end_date}} has been approved by {{approver_name}}.',
    'NORMAL',
    ARRAY['IN_APP', 'EMAIL'],
    (SELECT id FROM hr_public.users WHERE email = 'admin@postgraphile-hr.com')
),
(
    'document_requires_signature',
    'Document Signature Required',
    'Notification when a document needs to be signed',
    'DOCUMENT',
    'Document Signature Required: {{document_name}}',
    'Please review and sign the document "{{document_name}}". This document requires your signature by {{due_date}}.',
    'HIGH',
    ARRAY['IN_APP', 'EMAIL'],
    (SELECT id FROM hr_public.users WHERE email = 'admin@postgraphile-hr.com')
),
(
    'security_alert',
    'Security Alert',
    'Notification for security-related events',
    'SECURITY',
    'Security Alert: {{alert_type}}',
    'A security event has been detected: {{alert_message}}. Please review your account activity and contact IT if you notice anything suspicious.',
    'URGENT',
    ARRAY['IN_APP', 'EMAIL', 'SMS'],
    (SELECT id FROM hr_public.users WHERE email = 'admin@postgraphile-hr.com')
);

-- Insert default user preferences for existing users
INSERT INTO hr_public.notification_preferences (
    user_id, category, enabled_channels, digest_frequency, min_priority
)
SELECT 
    u.id,
    'SYSTEM',
    ARRAY['IN_APP', 'EMAIL'],
    'IMMEDIATE',
    'NORMAL'
FROM hr_public.users u
WHERE NOT EXISTS (
    SELECT 1 FROM hr_public.notification_preferences np 
    WHERE np.user_id = u.id AND np.category = 'SYSTEM'
);

-- Add PostGraphile comments
COMMENT ON TABLE hr_public.notification_templates IS '@name NotificationTemplate
Reusable templates for generating consistent notifications';

COMMENT ON TABLE hr_public.notification_preferences IS '@name NotificationPreference  
User preferences for notification delivery and formatting';

COMMENT ON TABLE hr_public.notification_deliveries IS '@name NotificationDelivery
Tracking delivery status across different channels';

COMMENT ON TABLE hr_public.notification_subscriptions IS '@name NotificationSubscription
User subscriptions to specific resources for automatic notifications';

COMMENT ON TABLE hr_public.notification_digests IS '@name NotificationDigest
Periodic digest summaries of notifications';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON hr_public.notification_templates TO hr_admin, hr_super_admin;
GRANT SELECT ON hr_public.notification_templates TO hr_manager, hr_employee;

GRANT SELECT, INSERT, UPDATE, DELETE ON hr_public.notification_preferences TO hr_employee, hr_manager, hr_admin, hr_super_admin;

GRANT SELECT, INSERT, UPDATE ON hr_public.notification_deliveries TO hr_admin, hr_super_admin;
GRANT SELECT ON hr_public.notification_deliveries TO hr_manager, hr_employee;

GRANT SELECT, INSERT, UPDATE, DELETE ON hr_public.notification_subscriptions TO hr_employee, hr_manager, hr_admin, hr_super_admin;

GRANT SELECT ON hr_public.notification_digests TO hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT INSERT, UPDATE ON hr_public.notification_digests TO hr_admin, hr_super_admin;