-- Create user_sessions table for axum-login session management
-- Migration: 20251015_001_create_user_sessions

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Add constraints
    CONSTRAINT user_sessions_expires_at_check CHECK (expires_at > created_at),
    CONSTRAINT user_sessions_last_activity_check CHECK (last_activity >= created_at)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active) WHERE is_active = true;

-- Create partial index for active sessions by user (enforces single active session constraint)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_sessions_active_user
ON user_sessions(user_id) WHERE is_active = true;

-- Add RLS policies for security
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own sessions
CREATE POLICY user_sessions_own_sessions ON user_sessions
    FOR ALL USING (user_id = current_user_id());

-- System can manage all sessions (for cleanup, etc.)
CREATE POLICY user_sessions_system_access ON user_sessions
    FOR ALL USING (current_user_role() IN ('system_admin', 'hr_admin'));

-- Add comments for documentation
COMMENT ON TABLE user_sessions IS 'User session data for axum-login authentication system';
COMMENT ON COLUMN user_sessions.id IS 'Unique session identifier';
COMMENT ON COLUMN user_sessions.user_id IS 'Reference to the authenticated user';
COMMENT ON COLUMN user_sessions.session_token IS 'Secure session token stored in cookies';
COMMENT ON COLUMN user_sessions.created_at IS 'When the session was created';
COMMENT ON COLUMN user_sessions.expires_at IS 'When the session expires (30 minutes from last activity)';
COMMENT ON COLUMN user_sessions.last_activity IS 'Last user activity timestamp for session refresh';
COMMENT ON COLUMN user_sessions.ip_address IS 'Client IP address for security logging';
COMMENT ON COLUMN user_sessions.user_agent IS 'Client user agent for security logging';
COMMENT ON COLUMN user_sessions.is_active IS 'Whether the session is currently active';