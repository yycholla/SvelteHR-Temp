-- Migration: Add sessions table for axum-login session storage
-- Created: 2025-10-15
-- Description: Creates the sessions table required by tower-sessions for storing user session data

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    data BYTEA NOT NULL,
    expiry_date TIMESTAMPTZ NOT NULL
);

-- Create index on expiry_date for efficient cleanup of expired sessions
CREATE INDEX IF NOT EXISTS idx_sessions_expiry_date ON sessions (expiry_date);

-- Add RLS policy to ensure users can only access their own sessions
-- Note: This assumes sessions are tied to user authentication
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see sessions they own (if session data contains user_id)
-- This is a basic policy; more complex policies may be needed based on application requirements
CREATE POLICY sessions_user_access ON sessions
    FOR ALL USING (
        -- Extract user_id from session data if stored as JSON
        -- This is a placeholder; actual implementation depends on how session data is structured
        CASE
            WHEN data IS NOT NULL THEN true  -- Allow access for now; refine based on actual session structure
            ELSE false
        END
    );

-- Add comment for documentation
COMMENT ON TABLE sessions IS 'Stores user session data for axum-login authentication system';
COMMENT ON COLUMN sessions.id IS 'Unique session identifier (UUID or similar)';
COMMENT ON COLUMN sessions.data IS 'Serialized session data (encrypted/user info)';
COMMENT ON COLUMN sessions.expiry_date IS 'When the session expires and can be cleaned up';