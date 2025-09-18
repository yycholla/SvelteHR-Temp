-- Migration: Complete PostGraphile Authorization System
-- Created: 2024-12-17T12:00:00.000Z
-- Implements JWT authentication with PostGraphile following official best practices
-- Supports both HS256 (shared secret) and RS256/JWK verification patterns

-- UP
-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create PostGraphile schema structure
CREATE SCHEMA IF NOT EXISTS hr_public;
CREATE SCHEMA IF NOT EXISTS hr_private;
CREATE SCHEMA IF NOT EXISTS hr_hidden;

-- JWT token type for PostGraphile claims
CREATE TYPE hr_public.jwt_token AS (
  role TEXT,
  user_id UUID,
  exp BIGINT,
  iat BIGINT,
  role_level INTEGER,
  permissions TEXT[]
);

-- User roles table with 4-tier hierarchy
CREATE TABLE hr_public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  level INTEGER NOT NULL CHECK (level >= 0 AND level <= 100),
  permissions JSONB NOT NULL DEFAULT '[]',
  is_system_role BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users table with authentication
CREATE TABLE hr_public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  onboarding_status TEXT NOT NULL DEFAULT 'Pending',
  job_title VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT true,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User role assignments with temporal validity
CREATE TABLE hr_public.user_role_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES hr_public.user_roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES hr_public.users(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_active_role_assignment UNIQUE(user_id, role_id, is_active) DEFERRABLE INITIALLY DEFERRED
);

-- JWT tokens table for session management
CREATE TABLE hr_public.jwt_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_revoked BOOLEAN NOT NULL DEFAULT false,
  revoked_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT
);

-- Auth sessions for refresh token management
CREATE TABLE hr_public.auth_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_accessed TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT,
  is_revoked BOOLEAN NOT NULL DEFAULT false
);

-- Login attempts for security tracking
CREATE TABLE hr_public.login_attempts (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  ip_address INET NOT NULL,
  success BOOLEAN NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  error_code VARCHAR(50),
  user_agent TEXT
);

-- Security audit log
CREATE TABLE hr_public.security_audit_log (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES hr_public.users(id),
  event_type VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Helper functions for JWT claims retrieval
CREATE OR REPLACE FUNCTION hr_private.current_user_id()
RETURNS UUID AS $$
  SELECT NULLIF(current_setting('jwt.claims.user_id', true), '')::UUID;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION hr_private.current_user_role()
RETURNS TEXT AS $$
  SELECT NULLIF(current_setting('jwt.claims.role', true), '');
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION hr_private.current_user_role_level()
RETURNS INTEGER AS $$
  SELECT NULLIF(current_setting('jwt.claims.role_level', true), '')::INTEGER;
$$ LANGUAGE SQL STABLE;

-- Password hashing function using bcrypt
CREATE OR REPLACE FUNCTION hr_private.crypt_password(password TEXT)
RETURNS TEXT
LANGUAGE SQL
AS $$
  SELECT crypt(password, gen_salt('bf', 10));
$$;

-- Password verification function
CREATE OR REPLACE FUNCTION hr_private.verify_password(password TEXT, hash TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
AS $$
  SELECT (hash = crypt(password, hash));
$$;

-- Authentication function compatible with PostGraphile JWT patterns
CREATE OR REPLACE FUNCTION hr_private.authenticate(
  email_param TEXT,
  password_param TEXT,
  client_ip INET DEFAULT NULL,
  user_agent_param TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  user_data JSONB,
  jwt_claims hr_public.jwt_token,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = hr_public, hr_private, pg_temp
AS $$
DECLARE
  user_record hr_public.users%ROWTYPE;
  role_record hr_public.user_roles%ROWTYPE;
  max_attempts INTEGER := 5;
  lockout_duration INTERVAL := INTERVAL '15 minutes';
BEGIN
  -- Check if user exists and is active
  SELECT * INTO user_record
  FROM hr_public.users
  WHERE email = email_param AND is_active = true;

  IF NOT FOUND THEN
    -- Log failed attempt
    INSERT INTO hr_public.login_attempts (email, ip_address, success, user_agent, error_code)
    VALUES (email_param, client_ip, false, user_agent_param, 'USER_NOT_FOUND');

    RETURN QUERY SELECT false, NULL::JSONB, NULL::hr_public.jwt_token, 'Invalid email or password';
    RETURN;
  END IF;

  -- Check if account is locked
  IF user_record.locked_until IS NOT NULL AND user_record.locked_until > NOW() THEN
    INSERT INTO hr_public.login_attempts (email, ip_address, success, user_agent, error_code)
    VALUES (email_param, client_ip, false, user_agent_param, 'ACCOUNT_LOCKED');

    RETURN QUERY SELECT false, NULL::JSONB, NULL::hr_public.jwt_token, 'Account temporarily locked';
    RETURN;
  END IF;

  -- Verify password
  IF NOT hr_private.verify_password(password_param, user_record.password_hash) THEN
    -- Increment failed attempts
    UPDATE hr_public.users
    SET failed_login_attempts = failed_login_attempts + 1,
        locked_until = CASE
            WHEN failed_login_attempts + 1 >= max_attempts THEN NOW() + lockout_duration
            ELSE NULL
        END
    WHERE id = user_record.id;

    -- Log failed attempt
    INSERT INTO hr_public.login_attempts (email, ip_address, success, user_agent, error_code)
    VALUES (email_param, client_ip, false, user_agent_param, 'INVALID_PASSWORD');

    RETURN QUERY SELECT false, NULL::JSONB, NULL::hr_public.jwt_token, 'Invalid email or password';
    RETURN;
  END IF;

  -- Get user's highest active role
  SELECT ur.* INTO role_record
  FROM hr_public.user_roles ur
  JOIN hr_public.user_role_assignments ura ON ur.id = ura.role_id
  WHERE ura.user_id = user_record.id
    AND ura.is_active = true
    AND (ura.valid_until IS NULL OR ura.valid_until > NOW())
  ORDER BY ur.level DESC
  LIMIT 1;

  -- Reset failed attempts and update last login
  UPDATE hr_public.users
  SET failed_login_attempts = 0,
      locked_until = NULL,
      last_login = NOW()
  WHERE id = user_record.id;

  -- Log successful attempt
  INSERT INTO hr_public.login_attempts (email, ip_address, success, user_agent)
  VALUES (email_param, client_ip, true, user_agent_param);

  -- Return success with user data and JWT claims
  RETURN QUERY SELECT
    true,
    jsonb_build_object(
      'id', user_record.id,
      'email', user_record.email,
      'displayName', user_record.display_name,
      'onboardingStatus', user_record.onboarding_status,
      'jobTitle', user_record.job_title,
      'isActive', user_record.is_active,
      'lastLogin', user_record.last_login,
      'role', COALESCE(role_record.name, 'employee'),
      'roleLevel', COALESCE(role_record.level, 20),
      'permissions', COALESCE(role_record.permissions, '[]'::jsonb)
    ),
    ROW(
      CASE
        WHEN role_record.level >= 100 THEN 'hr_super_admin'
        WHEN role_record.level >= 80 THEN 'hr_admin'
        WHEN role_record.level >= 60 THEN 'hr_manager'
        WHEN role_record.level >= 20 THEN 'hr_employee'
        ELSE 'hr_guest'
      END,
      user_record.id,
      EXTRACT(epoch FROM (NOW() + INTERVAL '15 minutes'))::BIGINT,
      EXTRACT(epoch FROM NOW())::BIGINT,
      COALESCE(role_record.level, 20),
      ARRAY(SELECT jsonb_array_elements_text(COALESCE(role_record.permissions, '[]'::jsonb)))
    )::hr_public.jwt_token,
    NULL::TEXT;
END;
$$;

-- JWT token generation for PostGraphile
CREATE OR REPLACE FUNCTION hr_public.jwt_token_claims(user_row hr_public.users)
RETURNS hr_public.jwt_token
LANGUAGE sql
STABLE
AS $$
  SELECT ROW(
    CASE
      WHEN COALESCE(ur.level, 0) >= 100 THEN 'hr_super_admin'
      WHEN COALESCE(ur.level, 0) >= 80 THEN 'hr_admin'
      WHEN COALESCE(ur.level, 0) >= 60 THEN 'hr_manager'
      WHEN COALESCE(ur.level, 0) >= 20 THEN 'hr_employee'
      ELSE 'hr_guest'
    END,
    user_row.id,
    EXTRACT(epoch FROM (NOW() + INTERVAL '15 minutes'))::BIGINT,
    EXTRACT(epoch FROM NOW())::BIGINT,
    COALESCE(ur.level, 20),
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(ur.permissions, '[]'::jsonb)))
  )::hr_public.jwt_token
  FROM hr_public.user_roles ur
  JOIN hr_public.user_role_assignments ura ON ur.id = ura.role_id
  WHERE ura.user_id = user_row.id
    AND ura.is_active = true
    AND (ura.valid_until IS NULL OR ura.valid_until > NOW())
  ORDER BY ur.level DESC
  LIMIT 1;
$$;

-- Token validation function for middleware
CREATE OR REPLACE FUNCTION hr_private.validate_jwt_token(token_hash_param TEXT)
RETURNS TABLE(
  is_valid BOOLEAN,
  user_id UUID,
  role TEXT,
  role_level INTEGER,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = hr_public, hr_private, pg_temp
AS $$
DECLARE
  token_record hr_public.jwt_tokens%ROWTYPE;
  user_record hr_public.users%ROWTYPE;
  role_record hr_public.user_roles%ROWTYPE;
BEGIN
  -- Find token
  SELECT * INTO token_record
  FROM hr_public.jwt_tokens
  WHERE token_hash = token_hash_param
    AND is_revoked = false
    AND expires_at > NOW();

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::INTEGER, 'Invalid or expired token';
    RETURN;
  END IF;

  -- Check if user still exists and is active
  SELECT * INTO user_record
  FROM hr_public.users
  WHERE id = token_record.user_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::INTEGER, 'User not found or inactive';
    RETURN;
  END IF;

  -- Get user's current role
  SELECT ur.* INTO role_record
  FROM hr_public.user_roles ur
  JOIN hr_public.user_role_assignments ura ON ur.id = ura.role_id
  WHERE ura.user_id = user_record.id
    AND ura.is_active = true
    AND (ura.valid_until IS NULL OR ura.valid_until > NOW())
  ORDER BY ur.level DESC
  LIMIT 1;

  RETURN QUERY SELECT
    true,
    user_record.id,
    CASE
      WHEN COALESCE(role_record.level, 0) >= 100 THEN 'hr_super_admin'
      WHEN COALESCE(role_record.level, 0) >= 80 THEN 'hr_admin'
      WHEN COALESCE(role_record.level, 0) >= 60 THEN 'hr_manager'
      WHEN COALESCE(role_record.level, 0) >= 20 THEN 'hr_employee'
      ELSE 'hr_guest'
    END,
    COALESCE(role_record.level, 20),
    NULL::TEXT;
END;
$$;

-- Permission checking function
CREATE OR REPLACE FUNCTION hr_private.has_permission(permission_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS(
    SELECT 1
    FROM hr_public.user_roles ur
    JOIN hr_public.user_role_assignments ura ON ur.id = ura.role_id
    WHERE ura.user_id = hr_private.current_user_id()
      AND ura.is_active = true
      AND (ura.valid_until IS NULL OR ura.valid_until > NOW())
      AND (
        ur.permissions ? permission_name OR
        ur.permissions ? 'all' OR
        ur.level >= 100
      )
  );
$$;

-- Session cleanup function
CREATE OR REPLACE FUNCTION hr_private.cleanup_expired_tokens()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Clean up expired JWT tokens
  DELETE FROM hr_public.jwt_tokens
  WHERE expires_at < NOW() OR is_revoked = true;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- Clean up expired auth sessions
  DELETE FROM hr_public.auth_sessions
  WHERE expires_at < NOW() OR is_revoked = true;

  RETURN deleted_count;
END;
$$;

-- Updated at trigger function
CREATE OR REPLACE FUNCTION hr_private.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON hr_public.users
  FOR EACH ROW EXECUTE FUNCTION hr_private.update_updated_at_column();

CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON hr_public.user_roles
  FOR EACH ROW EXECUTE FUNCTION hr_private.update_updated_at_column();

CREATE TRIGGER update_user_role_assignments_updated_at
  BEFORE UPDATE ON hr_public.user_role_assignments
  FOR EACH ROW EXECUTE FUNCTION hr_private.update_updated_at_column();

-- Performance indexes
CREATE INDEX idx_users_email ON hr_public.users(email);
CREATE INDEX idx_users_active ON hr_public.users(is_active) WHERE is_active = true;
CREATE INDEX idx_user_roles_name ON hr_public.user_roles(name);
CREATE INDEX idx_user_roles_level ON hr_public.user_roles(level);
CREATE INDEX idx_role_assignments_user_active ON hr_public.user_role_assignments(user_id, is_active);
CREATE INDEX idx_role_assignments_role_active ON hr_public.user_role_assignments(role_id, is_active);
CREATE INDEX idx_jwt_tokens_user_id ON hr_public.jwt_tokens(user_id);
CREATE INDEX idx_jwt_tokens_expires ON hr_public.jwt_tokens(expires_at) WHERE is_revoked = false;
CREATE INDEX idx_auth_sessions_user_id ON hr_public.auth_sessions(user_id);
CREATE INDEX idx_auth_sessions_expires ON hr_public.auth_sessions(expires_at) WHERE is_revoked = false;
CREATE INDEX idx_login_attempts_email_time ON hr_public.login_attempts(email, attempted_at);
CREATE INDEX idx_login_attempts_ip_time ON hr_public.login_attempts(ip_address, attempted_at);

-- Insert system roles based on specification
INSERT INTO hr_public.user_roles (name, description, level, permissions, is_system_role) VALUES
('admin', 'System administrator with full access', 100, '["all"]', true),
('hr', 'HR administrator with employee data access', 80, '["read_users", "write_users", "read_compensation", "write_compensation", "read_personal_info", "write_personal_info", "read_reports", "write_reports"]', true),
('manager', 'Department manager with team access', 60, '["read_users", "read_department_users", "write_department_users", "approve_timeoff", "read_reports"]', true),
('employee', 'Standard employee access', 20, '["read_own_data", "write_own_data", "read_directory", "submit_timeoff"]', true);

-- Insert test users with proper bcrypt hashes
-- Password for all test users: "password123"
INSERT INTO hr_public.users (email, password_hash, display_name, onboarding_status, job_title, is_active) VALUES
('admin@postgraphile-hr.com', '$2b$10$kFqh9KsxOO044lZBSlAi.OjoMoAqA5JfwcYr8jB7tq0Aeqb9Y6DQC', 'System Administrator', 'Active', 'System Administrator', true),
('hr@postgraphile-hr.com', '$2b$10$kFqh9KsxOO044lZBSlAi.OjoMoAqA5JfwcYr8jB7tq0Aeqb9Y6DQC', 'HR Manager', 'Active', 'HR Manager', true),
('manager@postgraphile-hr.com', '$2b$10$kFqh9KsxOO044lZBSlAi.OjoMoAqA5JfwcYr8jB7tq0Aeqb9Y6DQC', 'Department Manager', 'Active', 'Engineering Manager', true),
('employee@postgraphile-hr.com', '$2b$10$kFqh9KsxOO044lZBSlAi.OjoMoAqA5JfwcYr8jB7tq0Aeqb9Y6DQC', 'John Doe', 'Active', 'Software Engineer', true);

-- Assign roles to test users
INSERT INTO hr_public.user_role_assignments (user_id, role_id, assigned_by)
SELECT u.id, r.id, u.id
FROM hr_public.users u, hr_public.user_roles r
WHERE (u.email, r.name) IN (
  ('admin@postgraphile-hr.com', 'admin'),
  ('hr@postgraphile-hr.com', 'hr'),
  ('manager@postgraphile-hr.com', 'manager'),
  ('employee@postgraphile-hr.com', 'employee')
);

-- Comments for PostGraphile introspection
COMMENT ON TABLE hr_public.users IS 'User accounts and authentication';
COMMENT ON TABLE hr_public.user_roles IS 'Role definitions for RBAC';
COMMENT ON TABLE hr_public.user_role_assignments IS 'User role assignments with temporal validity';
COMMENT ON TABLE hr_public.jwt_tokens IS 'JWT token management for sessions';
COMMENT ON TABLE hr_public.auth_sessions IS 'Authentication sessions and refresh tokens';
COMMENT ON TABLE hr_public.login_attempts IS 'Security audit trail for login attempts';
COMMENT ON TABLE hr_public.security_audit_log IS 'Comprehensive security event logging';

COMMENT ON FUNCTION hr_public.jwt_token_claims(hr_public.users) IS 'Generate JWT claims for user authentication';
COMMENT ON FUNCTION hr_private.authenticate(TEXT, TEXT, INET, TEXT) IS 'Authenticate user with email and password';
COMMENT ON FUNCTION hr_private.validate_jwt_token(TEXT) IS 'Validate JWT token and return user info';
COMMENT ON FUNCTION hr_private.has_permission(TEXT) IS 'Check if current user has specific permission';

-- Grant appropriate permissions
GRANT USAGE ON SCHEMA hr_public TO PUBLIC;
GRANT SELECT ON ALL TABLES IN SCHEMA hr_public TO PUBLIC;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA hr_public TO PUBLIC;

-- DOWN
-- Drop grants
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA hr_public FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA hr_public FROM PUBLIC;
REVOKE ALL ON SCHEMA hr_public FROM PUBLIC;

-- Drop comments
COMMENT ON FUNCTION hr_private.has_permission(TEXT) IS NULL;
COMMENT ON FUNCTION hr_private.validate_jwt_token(TEXT) IS NULL;
COMMENT ON FUNCTION hr_private.authenticate(TEXT, TEXT, INET, TEXT) IS NULL;
COMMENT ON FUNCTION hr_public.jwt_token_claims(hr_public.users) IS NULL;
COMMENT ON TABLE hr_public.security_audit_log IS NULL;
COMMENT ON TABLE hr_public.login_attempts IS NULL;
COMMENT ON TABLE hr_public.auth_sessions IS NULL;
COMMENT ON TABLE hr_public.jwt_tokens IS NULL;
COMMENT ON TABLE hr_public.user_role_assignments IS NULL;
COMMENT ON TABLE hr_public.user_roles IS NULL;
COMMENT ON TABLE hr_public.users IS NULL;

-- Drop indexes
DROP INDEX IF EXISTS idx_login_attempts_ip_time;
DROP INDEX IF EXISTS idx_login_attempts_email_time;
DROP INDEX IF EXISTS idx_auth_sessions_expires;
DROP INDEX IF EXISTS idx_auth_sessions_user_id;
DROP INDEX IF EXISTS idx_jwt_tokens_expires;
DROP INDEX IF EXISTS idx_jwt_tokens_user_id;
DROP INDEX IF EXISTS idx_role_assignments_role_active;
DROP INDEX IF EXISTS idx_role_assignments_user_active;
DROP INDEX IF EXISTS idx_user_roles_level;
DROP INDEX IF EXISTS idx_user_roles_name;
DROP INDEX IF EXISTS idx_users_active;
DROP INDEX IF EXISTS idx_users_email;

-- Drop triggers
DROP TRIGGER IF EXISTS update_user_role_assignments_updated_at ON hr_public.user_role_assignments;
DROP TRIGGER IF EXISTS update_user_roles_updated_at ON hr_public.user_roles;
DROP TRIGGER IF EXISTS update_users_updated_at ON hr_public.users;

-- Drop functions
DROP FUNCTION IF EXISTS hr_private.update_updated_at_column();
DROP FUNCTION IF EXISTS hr_private.cleanup_expired_tokens();
DROP FUNCTION IF EXISTS hr_private.has_permission(TEXT);
DROP FUNCTION IF EXISTS hr_private.validate_jwt_token(TEXT);
DROP FUNCTION IF EXISTS hr_public.jwt_token_claims(hr_public.users);
DROP FUNCTION IF EXISTS hr_private.authenticate(TEXT, TEXT, INET, TEXT);
DROP FUNCTION IF EXISTS hr_private.verify_password(TEXT, TEXT);
DROP FUNCTION IF EXISTS hr_private.crypt_password(TEXT);
DROP FUNCTION IF EXISTS hr_private.current_user_role_level();
DROP FUNCTION IF EXISTS hr_private.current_user_role();
DROP FUNCTION IF EXISTS hr_private.current_user_id();

-- Drop tables
DROP TABLE IF EXISTS hr_public.security_audit_log CASCADE;
DROP TABLE IF EXISTS hr_public.login_attempts CASCADE;
DROP TABLE IF EXISTS hr_public.auth_sessions CASCADE;
DROP TABLE IF EXISTS hr_public.jwt_tokens CASCADE;
DROP TABLE IF EXISTS hr_public.user_role_assignments CASCADE;
DROP TABLE IF EXISTS hr_public.user_roles CASCADE;
DROP TABLE IF EXISTS hr_public.users CASCADE;

-- Drop schemas
DROP SCHEMA IF EXISTS hr_hidden CASCADE;
DROP SCHEMA IF EXISTS hr_private CASCADE;
DROP SCHEMA IF EXISTS hr_public CASCADE;

-- Drop type
DROP TYPE IF EXISTS hr_public.jwt_token;

-- METADATA
-- {
--   "version": "1.0.0",
--   "description": "Complete PostGraphile authorization system with JWT support",
--   "features": [
--     "JWT authentication with PostGraphile integration",
--     "4-tier role hierarchy (Admin:100, HR:80, Manager:60, Employee:20)",
--     "Temporal role assignments with validity periods",
--     "bcrypt password hashing with proper salt rounds",
--     "Comprehensive security audit logging",
--     "Token management with expiration and revocation",
--     "Permission-based access control",
--     "Account lockout protection against brute force",
--     "Performance-optimized indexes for JWT operations",
--     "PostGraphile-compatible schema structure and naming"
--   ],
--   "security": [
--     "Row-level security policies ready for implementation",
--     "JWT claims extraction functions for PostgreSQL RLS",
--     "Secure password handling with bcrypt",
--     "Session management with refresh token support",
--     "Comprehensive audit trail for compliance"
--   ]
-- }
-- END