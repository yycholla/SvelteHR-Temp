-- Create system_settings table for application-wide configuration
-- Only accessible to system_admin role

CREATE TABLE IF NOT EXISTS hr_public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL, -- general, authentication, notifications, security
    settings JSONB NOT NULL DEFAULT '{}', -- Flexible key-value storage
    updated_by UUID REFERENCES hr_public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    -- Ensure one row per category
    CONSTRAINT unique_category UNIQUE (category)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON hr_public.system_settings(category) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_system_settings_deleted_at ON hr_public.system_settings(deleted_at) WHERE deleted_at IS NULL;

-- Add comments
COMMENT ON TABLE hr_public.system_settings IS 'System-wide configuration settings (system_admin only)';
COMMENT ON COLUMN hr_public.system_settings.category IS 'Settings category (general, authentication, notifications, security)';
COMMENT ON COLUMN hr_public.system_settings.settings IS 'JSONB key-value pairs for category settings';
COMMENT ON COLUMN hr_public.system_settings.updated_by IS 'User who last updated these settings';
COMMENT ON COLUMN hr_public.system_settings.deleted_at IS 'Soft delete timestamp';

-- Insert default system settings
INSERT INTO hr_public.system_settings (category, settings) VALUES
('general', jsonb_build_object(
    'system_name', 'SvelteHR',
    'system_email', 'admin@mountainhr.dev',
    'timezone', 'UTC',
    'date_format', 'YYYY-MM-DD',
    'language', 'en'
)),
('authentication', jsonb_build_object(
    'session_timeout', 3600,
    'password_min_length', 8,
    'require_uppercase', true,
    'require_numbers', true,
    'require_special_chars', true,
    'max_login_attempts', 5
)),
('notifications', jsonb_build_object(
    'email_enabled', true,
    'slack_enabled', false,
    'webhooks_enabled', false,
    'notify_on_user_create', true,
    'notify_on_role_change', true
)),
('security', jsonb_build_object(
    'enforce_https', true,
    'allow_api_access', true,
    'ip_whitelist', '',
    'cors_origins', '*',
    'rate_limit_enabled', true,
    'max_requests_per_minute', 60
))
ON CONFLICT (category) DO NOTHING;

-- RLS Policy: Only system_admin can access system_settings
ALTER TABLE hr_public.system_settings ENABLE ROW LEVEL SECURITY;

-- Policy: system_admin can view all settings
CREATE POLICY system_settings_select_policy ON hr_public.system_settings
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM hr_public.user_role_assignments ura
            JOIN hr_public.roles r ON r.name = ura.role_name
            WHERE ura.user_id = current_setting('app.user_id', true)::uuid
                AND r.name = 'system_admin'
                AND ura.deleted_at IS NULL
                AND r.deleted_at IS NULL
        )
    );

-- Policy: system_admin can insert settings
CREATE POLICY system_settings_insert_policy ON hr_public.system_settings
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM hr_public.user_role_assignments ura
            JOIN hr_public.roles r ON r.name = ura.role_name
            WHERE ura.user_id = current_setting('app.user_id', true)::uuid
                AND r.name = 'system_admin'
                AND ura.deleted_at IS NULL
                AND r.deleted_at IS NULL
        )
    );

-- Policy: system_admin can update settings
CREATE POLICY system_settings_update_policy ON hr_public.system_settings
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM hr_public.user_role_assignments ura
            JOIN hr_public.roles r ON r.name = ura.role_name
            WHERE ura.user_id = current_setting('app.user_id', true)::uuid
                AND r.name = 'system_admin'
                AND ura.deleted_at IS NULL
                AND r.deleted_at IS NULL
        )
    );

-- Policy: system_admin can soft delete settings
CREATE POLICY system_settings_delete_policy ON hr_public.system_settings
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM hr_public.user_role_assignments ura
            JOIN hr_public.roles r ON r.name = ura.role_name
            WHERE ura.user_id = current_setting('app.user_id', true)::uuid
                AND r.name = 'system_admin'
                AND ura.deleted_at IS NULL
                AND r.deleted_at IS NULL
        )
    );
