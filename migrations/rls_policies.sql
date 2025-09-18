-- PostgreSQL Row-Level Security Policies for PostGraphile JWT Integration
-- Created: 2024-12-17T12:30:00.000Z
-- Implements RLS policies that work with JWT claims for secure data access

-- Enable RLS on all sensitive tables
ALTER TABLE hr_public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.user_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.jwt_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Create PostgreSQL roles for PostGraphile JWT integration
DO $$
BEGIN
  -- Drop roles if they exist to avoid conflicts
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hr_guest') THEN
    DROP ROLE hr_guest;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hr_employee') THEN
    DROP ROLE hr_employee;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hr_manager') THEN
    DROP ROLE hr_manager;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hr_admin') THEN
    DROP ROLE hr_admin;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hr_super_admin') THEN
    DROP ROLE hr_super_admin;
  END IF;

  -- Create roles
  CREATE ROLE hr_guest;
  CREATE ROLE hr_employee;
  CREATE ROLE hr_manager;
  CREATE ROLE hr_admin;
  CREATE ROLE hr_super_admin;
END
$$;

-- Grant schema usage
GRANT USAGE ON SCHEMA hr_public TO hr_guest, hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT USAGE ON SCHEMA hr_private TO hr_employee, hr_manager, hr_admin, hr_super_admin;

-- Grant sequence usage for serial columns
GRANT USAGE ON ALL SEQUENCES IN SCHEMA hr_public TO hr_guest, hr_employee, hr_manager, hr_admin, hr_super_admin;

-- RLS Policy for users table
-- Users can see their own data + admins/HR can see all users
CREATE POLICY users_select_policy ON hr_public.users
  FOR SELECT
  USING (
    id = hr_private.current_user_id() OR
    hr_private.current_user_role_level() >= 80 OR
    current_user IN ('hr_admin', 'hr_super_admin')
  );

-- Users can update their own data + admins/HR can update all users
CREATE POLICY users_update_policy ON hr_public.users
  FOR UPDATE
  USING (
    id = hr_private.current_user_id() OR
    hr_private.current_user_role_level() >= 80 OR
    current_user IN ('hr_admin', 'hr_super_admin')
  );

-- Only admins can insert new users
CREATE POLICY users_insert_policy ON hr_public.users
  FOR INSERT
  WITH CHECK (
    hr_private.current_user_role_level() >= 100 OR
    current_user = 'hr_super_admin'
  );

-- Only admins can delete users (soft delete recommended)
CREATE POLICY users_delete_policy ON hr_public.users
  FOR DELETE
  USING (
    hr_private.current_user_role_level() >= 100 OR
    current_user = 'hr_super_admin'
  );

-- RLS Policy for user_roles table
-- All authenticated users can read roles, only admins can modify
CREATE POLICY user_roles_select_policy ON hr_public.user_roles
  FOR SELECT
  USING (
    hr_private.current_user_id() IS NOT NULL OR
    current_user IN ('hr_employee', 'hr_manager', 'hr_admin', 'hr_super_admin')
  );

-- Only super admins can modify roles
CREATE POLICY user_roles_modify_policy ON hr_public.user_roles
  FOR ALL
  USING (
    hr_private.current_user_role_level() >= 100 OR
    current_user = 'hr_super_admin'
  );

-- RLS Policy for user_role_assignments table
-- Users can see their own assignments + admins can see all
CREATE POLICY user_role_assignments_select_policy ON hr_public.user_role_assignments
  FOR SELECT
  USING (
    user_id = hr_private.current_user_id() OR
    hr_private.current_user_role_level() >= 80 OR
    current_user IN ('hr_admin', 'hr_super_admin')
  );

-- Only admins can modify role assignments
CREATE POLICY user_role_assignments_modify_policy ON hr_public.user_role_assignments
  FOR INSERT
  WITH CHECK (
    hr_private.current_user_role_level() >= 80 OR
    current_user IN ('hr_admin', 'hr_super_admin')
  );

CREATE POLICY user_role_assignments_update_policy ON hr_public.user_role_assignments
  FOR UPDATE
  USING (
    hr_private.current_user_role_level() >= 80 OR
    current_user IN ('hr_admin', 'hr_super_admin')
  );

-- RLS Policy for jwt_tokens table
-- Users can only see their own tokens
CREATE POLICY jwt_tokens_policy ON hr_public.jwt_tokens
  FOR ALL
  USING (
    user_id = hr_private.current_user_id() OR
    hr_private.current_user_role_level() >= 100 OR
    current_user = 'hr_super_admin'
  );

-- RLS Policy for auth_sessions table
-- Users can only see their own sessions
CREATE POLICY auth_sessions_policy ON hr_public.auth_sessions
  FOR ALL
  USING (
    user_id = hr_private.current_user_id() OR
    hr_private.current_user_role_level() >= 100 OR
    current_user = 'hr_super_admin'
  );

-- RLS Policy for login_attempts table
-- Only admins can see login attempts for security monitoring
CREATE POLICY login_attempts_policy ON hr_public.login_attempts
  FOR SELECT
  USING (
    hr_private.current_user_role_level() >= 80 OR
    current_user IN ('hr_admin', 'hr_super_admin')
  );

-- Allow all roles to insert login attempts (for authentication function)
CREATE POLICY login_attempts_insert_policy ON hr_public.login_attempts
  FOR INSERT
  WITH CHECK (true);

-- RLS Policy for security_audit_log table
-- Only admins can see audit logs
CREATE POLICY security_audit_log_select_policy ON hr_public.security_audit_log
  FOR SELECT
  USING (
    hr_private.current_user_role_level() >= 80 OR
    current_user IN ('hr_admin', 'hr_super_admin')
  );

-- Allow all roles to insert audit logs (for system functions)
CREATE POLICY security_audit_log_insert_policy ON hr_public.security_audit_log
  FOR INSERT
  WITH CHECK (true);

-- Grant appropriate table permissions to each role
-- hr_guest: Very limited access
GRANT SELECT ON hr_public.user_roles TO hr_guest;

-- hr_employee: Can read basic data and manage own profile
GRANT SELECT ON hr_public.users TO hr_employee;
GRANT UPDATE ON hr_public.users TO hr_employee;
GRANT SELECT ON hr_public.user_roles TO hr_employee;
GRANT SELECT ON hr_public.user_role_assignments TO hr_employee;
GRANT SELECT, INSERT, UPDATE ON hr_public.jwt_tokens TO hr_employee;
GRANT SELECT, INSERT, UPDATE ON hr_public.auth_sessions TO hr_employee;

-- hr_manager: Employee permissions + team management
GRANT SELECT ON hr_public.users TO hr_manager;
GRANT UPDATE ON hr_public.users TO hr_manager;
GRANT SELECT ON hr_public.user_roles TO hr_manager;
GRANT SELECT ON hr_public.user_role_assignments TO hr_manager;
GRANT SELECT, INSERT, UPDATE ON hr_public.jwt_tokens TO hr_manager;
GRANT SELECT, INSERT, UPDATE ON hr_public.auth_sessions TO hr_manager;
GRANT SELECT ON hr_public.login_attempts TO hr_manager;

-- hr_admin: Full HR access
GRANT SELECT, INSERT, UPDATE ON hr_public.users TO hr_admin;
GRANT SELECT ON hr_public.user_roles TO hr_admin;
GRANT SELECT, INSERT, UPDATE ON hr_public.user_role_assignments TO hr_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON hr_public.jwt_tokens TO hr_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON hr_public.auth_sessions TO hr_admin;
GRANT SELECT, INSERT ON hr_public.login_attempts TO hr_admin;
GRANT SELECT, INSERT ON hr_public.security_audit_log TO hr_admin;

-- hr_super_admin: Full system access
GRANT ALL ON ALL TABLES IN SCHEMA hr_public TO hr_super_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA hr_public TO hr_super_admin;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA hr_public TO hr_super_admin;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA hr_private TO hr_super_admin;

-- Function to set JWT claims in session for testing
CREATE OR REPLACE FUNCTION hr_private.set_jwt_claims(
  user_id_param UUID,
  role_param TEXT,
  role_level_param INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('jwt.claims.user_id', user_id_param::TEXT, true);
  PERFORM set_config('jwt.claims.role', role_param, true);
  PERFORM set_config('jwt.claims.role_level', role_level_param::TEXT, true);
END;
$$;

-- Function to clear JWT claims
CREATE OR REPLACE FUNCTION hr_private.clear_jwt_claims()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('jwt.claims.user_id', '', true);
  PERFORM set_config('jwt.claims.role', '', true);
  PERFORM set_config('jwt.claims.role_level', '', true);
END;
$$;

-- Grant execute permissions on JWT helper functions
GRANT EXECUTE ON FUNCTION hr_private.set_jwt_claims(UUID, TEXT, INTEGER) TO hr_guest, hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT EXECUTE ON FUNCTION hr_private.clear_jwt_claims() TO hr_guest, hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT EXECUTE ON FUNCTION hr_private.current_user_id() TO hr_guest, hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT EXECUTE ON FUNCTION hr_private.current_user_role() TO hr_guest, hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT EXECUTE ON FUNCTION hr_private.current_user_role_level() TO hr_guest, hr_employee, hr_manager, hr_admin, hr_super_admin;

-- Comments for documentation
COMMENT ON POLICY users_select_policy ON hr_public.users IS 'Users can see their own data, admins see all';
COMMENT ON POLICY user_roles_select_policy ON hr_public.user_roles IS 'All authenticated users can read roles';
COMMENT ON POLICY jwt_tokens_policy ON hr_public.jwt_tokens IS 'Users can only access their own tokens';
COMMENT ON FUNCTION hr_private.set_jwt_claims(UUID, TEXT, INTEGER) IS 'Set JWT claims in session for RLS testing';
COMMENT ON FUNCTION hr_private.clear_jwt_claims() IS 'Clear JWT claims from session';