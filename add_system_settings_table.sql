-- Create system_settings table for storing application configuration
-- Maps to system_settings.rs model

CREATE TABLE IF NOT EXISTS hr_public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR NOT NULL UNIQUE,
    settings JSONB NOT NULL DEFAULT '{}',
    updated_by UUID REFERENCES hr_public.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create index for faster category lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON hr_public.system_settings(category) WHERE deleted_at IS NULL;

-- Create index for updated_by foreign key
CREATE INDEX IF NOT EXISTS idx_system_settings_updated_by ON hr_public.system_settings(updated_by);

-- Insert default developer settings
INSERT INTO hr_public.system_settings (category, settings)
VALUES (
    'developer',
    '{"show_debug_info": false, "show_performance_metrics": false, "log_level": "info"}'::jsonb
)
ON CONFLICT (category) DO NOTHING;

-- Insert default email settings
INSERT INTO hr_public.system_settings (category, settings)
VALUES (
    'email',
    '{"smtp_enabled": false, "from_address": "noreply@mountainhr.dev"}'::jsonb
)
ON CONFLICT (category) DO NOTHING;

-- Insert default notification settings
INSERT INTO hr_public.system_settings (category, settings)
VALUES (
    'notifications',
    '{"email_notifications": true, "push_notifications": false, "digest_frequency": "daily"}'::jsonb
)
ON CONFLICT (category) DO NOTHING;

COMMENT ON TABLE hr_public.system_settings IS 'Application-wide configuration settings organized by category';
COMMENT ON COLUMN hr_public.system_settings.category IS 'Setting category (e.g., developer, email, notifications)';
COMMENT ON COLUMN hr_public.system_settings.settings IS 'JSON blob containing category-specific settings';
COMMENT ON COLUMN hr_public.system_settings.updated_by IS 'User who last updated these settings';
