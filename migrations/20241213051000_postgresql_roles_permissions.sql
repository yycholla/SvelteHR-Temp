-- Migration: PostgreSQL Roles and Permissions for PostGraphile
-- Created: 2024-12-13T05:10:00.000Z
-- Sets up PostgreSQL roles and permissions for PostGraphile with proper security

-- UP
-- Create PostgreSQL roles for PostGraphile access control
-- These roles will be used by the JWT authentication system

-- Create role hierarchy
CREATE ROLE hr_guest;
CREATE ROLE hr_employee;
CREATE ROLE hr_manager;
CREATE ROLE hr_admin;
CREATE ROLE hr_super_admin;

-- Set up role inheritance
GRANT hr_guest TO hr_employee;
GRANT hr_employee TO hr_manager;
GRANT hr_manager TO hr_admin;
GRANT hr_admin TO hr_super_admin;

-- Create database user for PostGraphile application
-- This user will be used by the PostGraphile server
-- Note: In production, this should have very limited permissions
CREATE ROLE postgraphile_application WITH
    NOLOGIN
    NOSUPERUSER
    NOCREATEDB
    NOCREATEROLE;

-- Grant basic permissions to application role
GRANT CONNECT ON DATABASE hr_system TO postgraphile_application;
GRANT USAGE ON SCHEMA hr_public TO postgraphile_application;
GRANT USAGE ON SCHEMA hr_private TO postgraphile_application;
GRANT USAGE ON SCHEMA hr_hidden TO postgraphile_application;

-- Grant SELECT permissions on all tables in hr_public
GRANT SELECT ON ALL TABLES IN SCHEMA hr_public TO postgraphile_application;

-- Grant USAGE on all sequences in hr_public
GRANT USAGE ON ALL SEQUENCES IN SCHEMA hr_public TO postgraphile_application;

-- Grant EXECUTE on all functions in hr_public and hr_private
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA hr_public TO postgraphile_application;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA hr_private TO postgraphile_application;

-- Grant specific permissions to PostgreSQL roles based on access level

-- hr_guest: Minimal read-only access
GRANT SELECT ON hr_public.departments TO hr_guest;
GRANT SELECT ON hr_public.user_roles TO hr_guest;

-- hr_employee: Can view basic data and their own data
GRANT SELECT ON hr_public.departments TO hr_employee;
GRANT SELECT ON hr_public.user_roles TO hr_employee;
GRANT SELECT, INSERT, UPDATE ON hr_public.contact_information TO hr_employee;
GRANT SELECT ON hr_public.notifications TO hr_employee;
GRANT SELECT ON hr_public.job_information TO hr_employee;

-- hr_manager: Can manage department-related data
GRANT SELECT, INSERT, UPDATE ON hr_public.departments TO hr_manager;
GRANT SELECT ON hr_public.users TO hr_manager;
GRANT SELECT ON hr_public.user_roles TO hr_manager;
GRANT SELECT ON hr_public.user_role_assignments TO hr_manager;
GRANT SELECT, INSERT, UPDATE ON hr_public.contact_information TO hr_manager;
GRANT SELECT ON hr_public.notifications TO hr_manager;
GRANT SELECT ON hr_public.job_information TO hr_manager;
GRANT INSERT, UPDATE ON hr_public.job_information TO hr_manager;
GRANT SELECT ON hr_public.auth_sessions TO hr_manager;

-- hr_admin: Full access to most HR data (except highly sensitive)
GRANT SELECT, INSERT, UPDATE ON hr_public.users TO hr_admin;
GRANT SELECT, INSERT, UPDATE ON hr_public.user_roles TO hr_admin;
GRANT SELECT, INSERT, UPDATE ON hr_public.user_role_assignments TO hr_admin;
GRANT SELECT, INSERT, UPDATE ON hr_public.contact_information TO hr_admin;
GRANT SELECT, INSERT, UPDATE ON hr_public.job_information TO hr_admin;
GRANT SELECT ON hr_hidden.compensation TO hr_admin;
GRANT SELECT ON hr_hidden.personal_information TO hr_admin;
GRANT SELECT, INSERT, UPDATE ON hr_public.departments TO hr_admin;
GRANT SELECT ON hr_public.auth_sessions TO hr_admin;
GRANT SELECT ON hr_public.login_attempts TO hr_admin;
GRANT SELECT ON hr_public.password_reset_tokens TO hr_admin;
GRANT SELECT, INSERT, UPDATE ON hr_public.notifications TO hr_admin;

-- hr_super_admin: Full access including sensitive data and system management
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA hr_public TO hr_super_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA hr_private TO hr_super_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA hr_hidden TO hr_super_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA hr_public TO hr_super_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA hr_private TO hr_super_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA hr_hidden TO hr_super_admin;

-- Grant schema usage to all roles
GRANT USAGE ON SCHEMA hr_public TO hr_guest, hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT USAGE ON SCHEMA hr_private TO hr_manager, hr_admin, hr_super_admin;

-- Grant permission to use utility functions to all roles
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA hr_private TO hr_guest, hr_employee, hr_manager, hr_admin, hr_super_admin;

-- Create a default role that can be switched to
-- This allows the JWT system to work with role switching
ALTER ROLE postgraphile_application SET ROLE hr_guest;

-- Create function for role validation (will be used by RLS policies)
CREATE OR REPLACE FUNCTION hr_private.validate_role_access(required_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = hr_public, hr_private, public
AS $$
BEGIN
    -- Check if current role has the required access level
    -- This will be called by RLS policies
    RETURN EXISTS (
        SELECT 1 
        FROM (
            SELECT 'hr_super_admin' as role_level, 100 as access_level UNION ALL
            SELECT 'hr_admin', 80 UNION ALL
            SELECT 'hr_manager', 60 UNION ALL
            SELECT 'hr_employee', 20 UNION ALL
            SELECT 'hr_guest', 0
        ) role_levels
        WHERE role_levels.role_level = required_role
        AND (
            -- Super admin has access to everything
            current_user = 'hr_super_admin' OR
            -- Check role hierarchy using current effective role
            (SELECT CASE 
                WHEN current_user = 'hr_admin' THEN 80
                WHEN current_user = 'hr_manager' THEN 60
                WHEN current_user = 'hr_employee' THEN 20
                WHEN current_user = 'hr_guest' THEN 0
                ELSE 0
            END) >= role_levels.access_level
        )
    );
END;
$$;

-- Create function to get current user's maximum role level
CREATE OR REPLACE FUNCTION hr_private.get_current_role_level()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = hr_public, hr_private, public
AS $$
BEGIN
    RETURN CASE 
        WHEN current_user = 'hr_super_admin' THEN 100
        WHEN current_user = 'hr_admin' THEN 80
        WHEN current_user = 'hr_manager' THEN 60
        WHEN current_user = 'hr_employee' THEN 20
        WHEN current_user = 'hr_guest' THEN 0
        ELSE 0
    END;
END;
$$;

-- Create function to check if user can access specific user data
CREATE OR REPLACE FUNCTION hr_private.can_access_user_data(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = hr_public, hr_private, public
AS $$
DECLARE
    current_role_level INTEGER;
BEGIN
    SELECT hr_private.get_current_role_level() INTO current_role_level;
    
    -- Super admin can access everything
    IF current_role_level >= 100 THEN
        RETURN true;
    END IF;
    
    -- HR admin can access most user data
    IF current_role_level >= 80 THEN
        RETURN true;
    END IF;
    
    -- Manager can access users in their department
    IF current_role_level >= 60 THEN
        RETURN EXISTS (
            SELECT 1
            FROM hr_public.job_information ji
            JOIN hr_public.departments d ON ji.department_id = d.id
            WHERE ji.employee_id = target_user_id
              AND d.manager_id = (
                  SELECT ji2.employee_id 
                  FROM hr_public.job_information ji2 
                  WHERE ji2.employee_id = ji.employee_id 
                  LIMIT 1
              )
        );
    END IF;
    
    -- Employees can only access their own data via application logic
    -- This will be handled at the application level with JWT claims
    RETURN false;
END;
$$;

-- Create function for role switching validation
CREATE OR REPLACE FUNCTION hr_private.validate_role_switch(target_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = hr_public, hr_private, public
AS $$
DECLARE
    current_role_level INTEGER;
    target_role_level INTEGER;
BEGIN
    -- Get current role level
    SELECT hr_private.get_current_role_level() INTO current_role_level;
    
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
    
    -- Can only switch to roles at or below current level
    RETURN current_role_level >= target_role_level;
END;
$$;

-- Grant execute permissions on security functions
GRANT EXECUTE ON FUNCTION hr_private.validate_role_access(TEXT) TO hr_guest, hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT EXECUTE ON FUNCTION hr_private.get_current_role_level() TO hr_guest, hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT EXECUTE ON FUNCTION hr_private.can_access_user_data(UUID) TO hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT EXECUTE ON FUNCTION hr_private.validate_role_switch(TEXT) TO hr_employee, hr_manager, hr_admin, hr_super_admin;

-- Set default permissions for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA hr_public 
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO hr_super_admin;
    
ALTER DEFAULT PRIVILEGES IN SCHEMA hr_public 
    GRANT SELECT, INSERT, UPDATE ON TABLES TO hr_admin;
    
ALTER DEFAULT PRIVILEGES IN SCHEMA hr_public 
    GRANT SELECT, INSERT, UPDATE ON TABLES TO hr_manager;
    
ALTER DEFAULT PRIVILEGES IN SCHEMA hr_public 
    GRANT SELECT, INSERT, UPDATE ON TABLES TO hr_employee;
    
ALTER DEFAULT PRIVILEGES IN SCHEMA hr_public 
    GRANT SELECT ON TABLES TO hr_guest;

ALTER DEFAULT PRIVILEGES IN SCHEMA hr_public 
    GRANT USAGE ON SEQUENCES TO hr_super_admin, hr_admin, hr_manager, hr_employee, hr_guest;

-- Create performance indexes for role-based queries
CREATE INDEX idx_hr_public_users_role_lookup ON hr_public.users(is_active, onboarding_status);
CREATE INDEX idx_hr_public_job_info_department_role ON hr_public.job_information(department_id, employment_type);
CREATE INDEX idx_hr_public_departments_role_manager ON hr_public.departments(manager_id, is_active);

-- DOWN
-- Drop indexes
DROP INDEX IF EXISTS idx_hr_public_departments_role_manager;
DROP INDEX IF EXISTS idx_hr_public_job_info_department_role;
DROP INDEX IF EXISTS idx_hr_public_users_role_lookup;

-- Revoke default privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA hr_public 
    REVOKE ALL ON SEQUENCES FROM hr_guest, hr_employee, hr_manager, hr_admin, hr_super_admin;
    
ALTER DEFAULT PRIVILEGES IN SCHEMA hr_public 
    REVOKE ALL ON TABLES FROM hr_guest, hr_employee, hr_manager, hr_admin, hr_super_admin;

-- Revoke execute permissions on functions
REVOKE EXECUTE ON FUNCTION hr_private.validate_role_switch(TEXT) FROM hr_employee, hr_manager, hr_admin, hr_super_admin;
REVOKE EXECUTE ON FUNCTION hr_private.can_access_user_data(UUID) FROM hr_employee, hr_manager, hr_admin, hr_super_admin;
REVOKE EXECUTE ON FUNCTION hr_private.get_current_role_level() FROM hr_guest, hr_employee, hr_manager, hr_admin, hr_super_admin;
REVOKE EXECUTE ON FUNCTION hr_private.validate_role_access(TEXT) FROM hr_guest, hr_employee, hr_manager, hr_admin, hr_super_admin;

-- Drop functions
DROP FUNCTION IF EXISTS hr_private.validate_role_switch(TEXT);
DROP FUNCTION IF EXISTS hr_private.can_access_user_data(UUID);
DROP FUNCTION IF EXISTS hr_private.get_current_role_level();
DROP FUNCTION IF EXISTS hr_private.validate_role_access(TEXT);

-- Reset application role
ALTER ROLE postgraphile_application SET ROLE NONE;

-- Drop application role
DROP ROLE IF EXISTS postgraphile_application;

-- Revoke role grants
REVOKE hr_guest FROM hr_employee;
REVOKE hr_employee FROM hr_manager;
REVOKE hr_manager FROM hr_admin;
REVOKE hr_admin FROM hr_super_admin;

-- Drop roles
DROP ROLE IF EXISTS hr_super_admin;
DROP ROLE IF EXISTS hr_admin;
DROP ROLE IF EXISTS hr_manager;
DROP ROLE IF EXISTS hr_employee;
DROP ROLE IF EXISTS hr_guest;

-- METADATA
-- {
--   "version": 1,
--   "description": "PostgreSQL roles and permissions setup for PostGraphile security"
-- }
-- END

-- PERFORMANCE
-- {
--   "notes": "Created performance indexes for role-based queries"
-- }
-- END