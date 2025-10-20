-- Migration: Add sessions table for tower-sessions (axum-login session storage)
-- Created: 2025-10-17
-- Description: Creates the sessions table required by tower-sessions for storing user session data
-- This table is used by the Rust GraphQL backend with axum-login authentication

-- Create sessions table (tower-sessions expects this exact schema)
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    data BYTEA NOT NULL,
    expiry_date TIMESTAMPTZ NOT NULL
);

-- Create index on expiry_date for efficient cleanup of expired sessions
CREATE INDEX IF NOT EXISTS idx_sessions_expiry_date ON sessions (expiry_date);

-- Add comments for documentation
COMMENT ON TABLE sessions IS 'Stores user session data for tower-sessions/axum-login authentication system';
COMMENT ON COLUMN sessions.id IS 'Unique session identifier (cookie value)';
COMMENT ON COLUMN sessions.data IS 'Serialized session data (user info, roles, etc.)';
COMMENT ON COLUMN sessions.expiry_date IS 'When the session expires and can be cleaned up';
