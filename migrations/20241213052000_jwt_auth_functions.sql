-- Migration: JWT Authentication Functions for PostGraphile
-- Created: 2024-12-13T05:20:00.000Z
-- PostgreSQL-native JWT authentication with role switching for PostGraphile

-- UP
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- JWT token table for PostGraphile
CREATE TABLE hr_public.jwt_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  role TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_revoked BOOLEAN NOT NULL DEFAULT false,
  revoked_at TIMESTAMPTZ
);

-- Comment for GraphQL naming
COMMENT ON TABLE hr_public.jwt_tokens IS 'JWT tokens for authentication and session management';

-- JWT type for claims
CREATE OR REPLACE FUNCTION hr_public.jwt_token_claims(user_row hr_public.users)
RETURNS hr_public.jwt_token AS $$
SELECT ROW(
    COALESCE((SELECT ur.name 
     FROM hr_public.user_roles ur 
     JOIN hr_public.user_role_assignments ura ON ur.id = ura.role_id 
     WHERE ura.user_id = user_row.id AND ura.is_active = true 
       AND (ura.expires_at IS NULL OR ura.expires_at > NOW())
     ORDER BY ur.level DESC LIMIT 1), 'hr_guest'),
    user_row.id,
    EXTRACT(EPOCH FROM (NOW() + INTERVAL '15 minutes'))::BIGINT,
    EXTRACT(EPOCH FROM NOW())::BIGINT
)::hr_public.jwt_token;
$$ LANGUAGE sql STABLE;

-- Comment for PostGraphile computed field
COMMENT ON FUNCTION hr_public.jwt_token_claims(hr_public.users) IS 'Generate JWT claims for user authentication';

-- Authentication function for PostGraphile
CREATE OR REPLACE FUNCTION hr_private.authenticate_user(email_param TEXT, password_param TEXT, client_ip INET, user_agent TEXT)
RETURNS TABLE(
    success BOOLEAN,
    user_id UUID,
    role TEXT,
    error_message TEXT,
    session_data JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = hr_public, hr_private, public
AS $$
DECLARE
    user_record hr_public.users%ROWTYPE;
    password_valid BOOLEAN;
    role_level INTEGER;
    max_attempts INTEGER := 5;
    lockout_duration INTERVAL := INTERVAL '15 minutes';
BEGIN
    -- Check if user exists
    SELECT * INTO user_record 
    FROM hr_public.users 
    WHERE email = email_param AND is_active = true;
    
    IF NOT FOUND THEN
        -- Log failed attempt
        INSERT INTO hr_public.login_attempts (email, ip_address, success, user_agent, error_code)
        VALUES (email_param, client_ip, false, user_agent, 'USER_NOT_FOUND');
        
        RETURN QUERY SELECT false, NULL, 'hr_guest', 'Invalid email or password', NULL::JSONB;
        RETURN;
    END IF;
    
    -- Check if account is locked
    IF user_record.locked_until IS NOT NULL AND user_record.locked_until > NOW() THEN
        INSERT INTO hr_public.login_attempts (email, ip_address, success, user_agent, error_code)
        VALUES (email_param, client_ip, false, user_agent, 'ACCOUNT_LOCKED');
        
        RETURN QUERY SELECT false, NULL, 'hr_guest', 'Account temporarily locked', NULL::JSONB;
        RETURN;
    END IF;
    
    -- Validate password
    -- Note: In production, use proper password hashing like bcrypt
    -- For now, using simple comparison - replace with actual bcrypt validation
    SELECT (password_hash = crypt(password_param, password_hash)) INTO password_valid
    FROM hr_public.users 
    WHERE id = user_record.id;
    
    IF NOT password_valid THEN
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
        VALUES (email_param, client_ip, false, user_agent, 'INVALID_PASSWORD');
        
        RETURN QUERY SELECT false, NULL, 'hr_guest', 'Invalid email or password', NULL::JSONB;
        RETURN;
    END IF;
    
    -- Authentication successful - get user's highest role
    SELECT COALESCE(MAX(ur.level), 0) INTO role_level
    FROM hr_public.user_roles ur
    JOIN hr_public.user_role_assignments ura ON ur.id = ura.role_id
    WHERE ura.user_id = user_record.id AND ura.is_active = true
      AND (ura.expires_at IS NULL OR ura.expires_at > NOW());
    
    -- Determine user role based on level
    DECLARE user_role TEXT := CASE
        WHEN role_level >= 100 THEN 'hr_super_admin'
        WHEN role_level >= 80 THEN 'hr_admin'
        WHEN role_level >= 60 THEN 'hr_manager'
        WHEN role_level >= 20 THEN 'hr_employee'
        ELSE 'hr_guest'
    END;
    
    -- Reset failed attempts and update last login
    UPDATE hr_public.users 
    SET failed_login_attempts = 0,
        locked_until = NULL,
        last_login = NOW()
    WHERE id = user_record.id;
    
    -- Log successful attempt
    INSERT INTO hr_public.login_attempts (email, ip_address, success, user_agent)
    VALUES (email_param, client_ip, true, user_agent);
    
    -- Return session data
    RETURN QUERY SELECT 
        true, 
        user_record.id, 
        user_role, 
        NULL::TEXT,
        jsonb_build_object(
            'user_id', user_record.id,
            'email', user_record.email,
            'display_name', user_record.display_name,
            'role', user_role,
            'role_level', role_level
        );
END;
$$;

-- JWT token generation function
CREATE OR REPLACE FUNCTION hr_private.generate_jwt_token(user_id UUID, requested_role TEXT = NULL)
RETURNS TABLE(
    token TEXT,
    expires_at TIMESTAMPTZ,
    role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = hr_public, hr_private, public
AS $$
DECLARE
    user_record hr_public.users%ROWTYPE;
    effective_role TEXT;
    user_role_level INTEGER;
    requested_role_level INTEGER;
    jwt_secret TEXT := current_setting('app.jwt_secret', true);
BEGIN
    -- Get user record
    SELECT * INTO user_record FROM hr_public.users WHERE id = user_id;
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Get user's actual role level
    SELECT COALESCE(MAX(ur.level), 0) INTO user_role_level
    FROM hr_public.user_roles ur
    JOIN hr_public.user_role_assignments ura ON ur.id = ura.role_id
    WHERE ura.user_id = user_record.id AND ura.is_active = true
      AND (ura.expires_at IS NULL OR ura.expires_at > NOW());
    
    -- Determine effective role
    IF requested_role IS NOT NULL THEN
        -- Check if requested role is valid
        SELECT access_level INTO requested_role_level
        FROM (
            SELECT 'hr_super_admin' as role_level, 100 as access_level UNION ALL
            SELECT 'hr_admin', 80 UNION ALL
            SELECT 'hr_manager', 60 UNION ALL
            SELECT 'hr_employee', 20 UNION ALL
            SELECT 'hr_guest', 0
        ) role_levels
        WHERE role_levels.role_level = requested_role;
        
        -- Can only switch to roles at or below user's level
        IF user_role_level >= requested_role_level THEN
            effective_role := requested_role;
        ELSE
            effective_role := CASE user_role_level
                WHEN 100 THEN 'hr_super_admin'
                WHEN 80 THEN 'hr_admin'
                WHEN 60 THEN 'hr_manager'
                WHEN 20 THEN 'hr_employee'
                ELSE 'hr_guest'
            END;
        END IF;
    ELSE
        -- Use default role (highest available)
        effective_role := CASE user_role_level
            WHEN 100 THEN 'hr_super_admin'
            WHEN 80 THEN 'hr_admin'
            WHEN 60 THEN 'hr_manager'
            WHEN 20 THEN 'hr_employee'
            ELSE 'hr_guest'
        END;
    END IF;
    
    -- Generate JWT token (implementation placeholder)
    -- In a real implementation, you'd use a proper JWT library
    -- For now, return a mock token structure
    RETURN QUERY SELECT 
        'mock_jwt_token_' || user_id || '_' || effective_role,
        NOW() + INTERVAL '15 minutes',
        effective_role;
END;
$$;

-- JWT token validation function for PostGraphile pgSettings
CREATE OR REPLACE FUNCTION hr_private.validate_jwt_token(token_text TEXT)
RETURNS TABLE(
    user_id UUID,
    role TEXT,
    is_valid BOOLEAN,
    error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = hr_public, hr_private, public
AS $$
DECLARE
    token_record hr_public.jwt_tokens%ROWTYPE;
    jwt_secret TEXT := current_setting('app.jwt_secret', true);
BEGIN
    -- Check if token exists and is not revoked
    SELECT * INTO token_record
    FROM hr_public.jwt_tokens
    WHERE token_hash = crypt(token_text, token_hash)  -- This is a placeholder - use proper JWT validation
      AND is_revoked = false
      AND expires_at > NOW();
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT NULL, NULL, false, 'Invalid or expired token';
        RETURN;
    END IF;
    
    -- Check if user still exists and is active
    IF NOT EXISTS (SELECT 1 FROM hr_public.users WHERE id = token_record.user_id AND is_active = true) THEN
        RETURN QUERY SELECT NULL, NULL, false, 'User not found or inactive';
        RETURN;
    END IF;
    
    -- Return valid token data
    RETURN QUERY SELECT 
        token_record.user_id,
        token_record.role,
        true,
        NULL;
END;
$$;

-- Role switching function for PostGraphile
CREATE OR REPLACE FUNCTION hr_private.switch_user_role(user_id UUID, target_role TEXT)
RETURNS TABLE(
    success BOOLEAN,
    new_role TEXT,
    error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = hr_public, hr_private, public
AS $$
DECLARE
    user_role_level INTEGER;
    target_role_level INTEGER;
BEGIN
    -- Get user's maximum role level
    SELECT COALESCE(MAX(ur.level), 0) INTO user_role_level
    FROM hr_public.user_roles ur
    JOIN hr_public.user_role_assignments ura ON ur.id = ura.role_id
    WHERE ura.user_id = user_id AND ura.is_active = true
      AND (ura.expires_at IS NULL OR ura.expires_at > NOW());
    
    -- Get target role level
    SELECT access_level INTO target_role_level
    FROM (
        SELECT 'hr_super_admin' as role_level, 100 as access_level UNION ALL
        SELECT 'hr_admin', 80 UNION ALL
        SELECT 'hr_manager', 60 UNION ALL
        SELECT 'hr_employee', 20 UNION ALL
        SELECT 'hr_guest', 0
    ) role_levels
    WHERE role_levels.role_level = target_role;
    
    -- Validate role switch
    IF user_role_level >= target_role_level THEN
        RETURN QUERY SELECT true, target_role, NULL;
    ELSE
        RETURN QUERY SELECT false, NULL, 'Insufficient privileges for role switch';
    END IF;
END;
$$;

-- Session cleanup function
CREATE OR REPLACE FUNCTION hr_private.cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Clean up expired JWT tokens
    DELETE FROM hr_public.jwt_tokens
    WHERE expires_at < NOW()
    OR is_revoked = true;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Clean up expired auth sessions
    DELETE FROM hr_public.auth_sessions
    WHERE expires_at < NOW()
    OR is_revoked = true;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Password hashing function (placeholder - use bcrypt in production)
CREATE OR REPLACE FUNCTION hr_private.hash_password(password_text TEXT)
RETURNS TEXT AS $$
BEGIN
    -- This is a placeholder - use proper bcrypt hashing in production
    RETURN crypt(password_text, gen_salt('bf'));
END;
$$ LANGUAGE plpgsql;

-- Check if user has specific permission
CREATE OR REPLACE FUNCTION hr_private.user_has_permission(userId UUID, permissionName TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = hr_public, hr_private, public
AS $$
DECLARE
    hasPermission BOOLEAN := false;
BEGIN
    SELECT EXISTS(
        SELECT 1
        FROM hr_public.user_roles ur
        JOIN hr_public.user_role_assignments ura ON ur.id = ura.role_id
        WHERE ura.user_id = userId
          AND ura.is_active = true
          AND (ura.expires_at IS NULL OR ura.expires_at > NOW())
          AND permissionName = ANY(ur.permissions)
    ) INTO hasPermission;
    
    RETURN hasPermission;
END;
$$;

-- Create indexes for JWT performance
CREATE INDEX idx_hr_public_jwt_tokens_user_id ON hr_public.jwt_tokens(user_id);
CREATE INDEX idx_hr_public_jwt_tokens_expires_at ON hr_public.jwt_tokens(expires_at);
CREATE INDEX idx_hr_public_jwt_tokens_revoked ON hr_public.jwt_tokens(is_revoked, expires_at);

-- Grant permissions on JWT tables and functions
GRANT SELECT, INSERT, UPDATE ON hr_public.jwt_tokens TO hr_guest, hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT EXECUTE ON FUNCTION hr_public.jwt_token_claims(hr_public.users) TO hr_guest, hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT EXECUTE ON FUNCTION hr_private.authenticate_user(TEXT, TEXT, INET, TEXT) TO hr_guest, hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT EXECUTE ON FUNCTION hr_private.generate_jwt_token(UUID, TEXT) TO hr_guest, hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT EXECUTE ON FUNCTION hr_private.validate_jwt_token(TEXT) TO hr_guest, hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT EXECUTE ON FUNCTION hr_private.switch_user_role(UUID, TEXT) TO hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT EXECUTE ON FUNCTION hr_private.cleanup_expired_sessions() TO hr_manager, hr_admin, hr_super_admin;
GRANT EXECUTE ON FUNCTION hr_private.hash_password(TEXT) TO hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT EXECUTE ON FUNCTION hr_private.user_has_permission(UUID, TEXT) TO hr_guest, hr_employee, hr_manager, hr_admin, hr_super_admin;

-- Comment functions for documentation
COMMENT ON FUNCTION hr_private.authenticate_user(TEXT, TEXT, INET, TEXT) IS 'Authenticate user with email and password';
COMMENT ON FUNCTION hr_private.generate_jwt_token(UUID, TEXT) IS 'Generate JWT token for user with optional role switch';
COMMENT ON FUNCTION hr_private.validate_jwt_token(TEXT) IS 'Validate JWT token and return user info';
COMMENT ON FUNCTION hr_private.switch_user_role(UUID, TEXT) IS 'Switch user role if permitted';
COMMENT ON FUNCTION hr_private.cleanup_expired_sessions() IS 'Clean up expired sessions and tokens';
COMMENT ON FUNCTION hr_private.user_has_permission(UUID, TEXT) IS 'Check if user has specific permission';

-- DOWN
-- Drop indexes
DROP INDEX IF EXISTS idx_hr_public_jwt_tokens_revoked;
DROP INDEX IF EXISTS idx_hr_public_jwt_tokens_expires_at;
DROP INDEX IF EXISTS idx_hr_public_jwt_tokens_user_id;

-- Drop comments
DROP COMMENT ON FUNCTION hr_private.user_has_permission(UUID, TEXT);
DROP COMMENT ON FUNCTION hr_private.cleanup_expired_sessions();
DROP COMMENT ON FUNCTION hr_private.switch_user_role(UUID, TEXT);
DROP COMMENT ON FUNCTION hr_private.validate_jwt_token(TEXT);
DROP COMMENT ON FUNCTION hr_private.generate_jwt_token(UUID, TEXT);
DROP COMMENT ON FUNCTION hr_private.authenticate_user(TEXT, TEXT, INET, TEXT);

-- Revoke permissions
REVOKE EXECUTE ON FUNCTION hr_private.user_has_permission(UUID, TEXT) FROM hr_guest, hr_employee, hr_manager, hr_admin, hr_super_admin;
REVOKE EXECUTE ON FUNCTION hr_private.hash_password(TEXT) FROM hr_guest, hr_employee, hr_manager, hr_admin, hr_super_admin;
REVOKE EXECUTE ON FUNCTION hr_private.cleanup_expired_sessions() FROM hr_manager, hr_admin, hr_super_admin;
REVOKE EXECUTE ON FUNCTION hr_private.switch_user_role(UUID, TEXT) FROM hr_employee, hr_manager, hr_admin, hr_super_admin;
REVOKE EXECUTE ON FUNCTION hr_private.validate_jwt_token(TEXT) FROM hr_guest, hr_employee, hr_manager, hr_admin, hr_super_admin;
REVOKE EXECUTE ON FUNCTION hr_private.generate_jwt_token(UUID, TEXT) FROM hr_guest, hr_employee, hr_manager, hr_admin, hr_super_admin;
REVOKE EXECUTE ON FUNCTION hr_private.authenticate_user(TEXT, TEXT, INET, TEXT) FROM hr_guest, hr_employee, hr_manager, hr_admin, hr_super_admin;
REVOKE EXECUTE ON FUNCTION hr_public.jwt_token_claims(hr_public.users) FROM hr_guest, hr_employee, hr_manager, hr_admin, hr_super_admin;

REVOKE ALL ON hr_public.jwt_tokens FROM hr_guest, hr_employee, hr_manager, hr_admin, hr_super_admin;

-- Drop functions
DROP FUNCTION IF EXISTS hr_private.user_has_permission(UUID, TEXT);
DROP FUNCTION IF EXISTS hr_private.hash_password(TEXT);
DROP FUNCTION IF EXISTS hr_private.cleanup_expired_sessions();
DROP FUNCTION IF EXISTS hr_private.switch_user_role(UUID, TEXT);
DROP FUNCTION IF EXISTS hr_private.validate_jwt_token(TEXT);
DROP FUNCTION IF EXISTS hr_private.generate_jwt_token(UUID, TEXT);
DROP FUNCTION IF EXISTS hr_private.authenticate_user(TEXT, TEXT, INET, TEXT);
DROP FUNCTION IF EXISTS hr_public.jwt_token_claims(hr_public.users);

-- Drop table
DROP TABLE IF EXISTS hr_public.jwt_tokens CASCADE;

-- Drop type
DROP TYPE IF EXISTS hr_public.jwt_token;

-- Drop extension
DROP EXTENSION IF EXISTS "pgcrypto";
DROP EXTENSION IF EXISTS "uuid-ossp";

-- METADATA
-- {
--   "version": 1,
--   "description": "JWT authentication system for PostGraphile with role switching"
-- }
-- END

-- PERFORMANCE
-- {
--   "indexes_created": "Performance indexes for JWT token queries"
-- }
-- END