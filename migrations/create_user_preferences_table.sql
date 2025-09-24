-- Create user preferences table for storing user settings like theme, language, etc.

CREATE TABLE IF NOT EXISTS hr_public.user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    preference_key VARCHAR(255) NOT NULL,
    preference_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

    UNIQUE(user_id, preference_key)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON hr_public.user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_key ON hr_public.user_preferences(preference_key);

-- Create update timestamp trigger
CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON hr_public.user_preferences
    FOR EACH ROW EXECUTE PROCEDURE hr_public.update_updated_at_column();

-- Set up Row Level Security
ALTER TABLE hr_public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see and modify their own preferences
CREATE POLICY user_preferences_policy ON hr_public.user_preferences
    FOR ALL TO hr_employee, hr_manager, hr_admin, hr_super_admin
    USING (user_id = (current_setting('jwt.claims.user_id', true))::uuid)
    WITH CHECK (user_id = (current_setting('jwt.claims.user_id', true))::uuid);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON hr_public.user_preferences TO hr_employee, hr_manager, hr_admin, hr_super_admin;

-- Add table comment for PostGraphile introspection
COMMENT ON TABLE hr_public.user_preferences IS 'User-specific preferences and settings like theme, language, notifications, etc.';
COMMENT ON COLUMN hr_public.user_preferences.preference_key IS 'The setting key (e.g., theme, language, notifications)';
COMMENT ON COLUMN hr_public.user_preferences.preference_value IS 'The setting value (stored as text, can be JSON for complex values)';

-- Insert sample preferences for existing users
INSERT INTO hr_public.user_preferences (user_id, preference_key, preference_value) VALUES
-- Admin user preferences
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'theme', 'dark'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'language', 'en'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'notifications_email', 'true'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'dashboard_layout', 'compact'),

-- Manager preferences
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'theme', 'light'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'language', 'en'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'notifications_email', 'true'),

-- Employee preferences
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'theme', 'light'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'language', 'en'),
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'theme', 'dark'),
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'language', 'en'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'theme', 'light'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'language', 'en')
ON CONFLICT (user_id, preference_key) DO NOTHING;