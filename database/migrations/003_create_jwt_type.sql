-- Migration: Create JWT Token Type
-- Created: 2025-01-16
-- Description: Creates JWT token composite type and related authentication structures

-- JWT token composite type for PostGraphile authentication
CREATE TYPE hr_public.jwt_token AS (
    role TEXT,
    exp INTEGER,
    employee_id INTEGER,
    department_id INTEGER,
    role_level INTEGER,
    is_admin BOOLEAN,
    permissions TEXT[]
);

-- JWT claims type for internal use
CREATE TYPE hr_hidden.jwt_claims AS (
    employee_id INTEGER,
    department_id INTEGER,
    role_level INTEGER,
    email TEXT,
    full_name TEXT,
    is_admin BOOLEAN,
    permissions TEXT[]
);

-- Role mapping type
CREATE TYPE hr_hidden.role_mapping AS (
    role_level INTEGER,
    postgresql_role TEXT,
    role_name TEXT,
    permissions TEXT[]
);

-- Session management type
CREATE TYPE hr_hidden.session_info AS (
    employee_id INTEGER,
    session_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE
);

-- Authentication result type
CREATE TYPE hr_public.auth_result AS (
    jwt_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    employee hr_public.employees
);

-- Define role level constants and permissions
CREATE TABLE hr_hidden.role_permissions (
    id SERIAL PRIMARY KEY,
    role_level INTEGER UNIQUE NOT NULL,
    postgresql_role TEXT NOT NULL,
    role_name TEXT NOT NULL,
    permissions TEXT[] NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT role_permissions_level_valid CHECK (role_level IN (0, 20, 60, 80, 100))
);

-- Insert default role permissions
INSERT INTO hr_hidden.role_permissions (role_level, postgresql_role, role_name, permissions, description) VALUES
(0, 'hr_guest', 'Guest', ARRAY['public_access'], 'Unauthenticated users'),
(20, 'hr_employee', 'Employee', ARRAY[
    'view_own_profile',
    'update_own_profile',
    'view_own_timeoff',
    'request_timeoff',
    'view_own_reviews',
    'view_company_directory'
], 'Regular employees'),
(60, 'hr_manager', 'Manager', ARRAY[
    'view_own_profile',
    'update_own_profile',
    'view_own_timeoff',
    'request_timeoff',
    'view_own_reviews',
    'view_company_directory',
    'view_department_employees',
    'approve_timeoff',
    'conduct_reviews',
    'view_department_reports'
], 'Department managers'),
(80, 'hr_admin', 'HR Administrator', ARRAY[
    'view_own_profile',
    'update_own_profile',
    'view_own_timeoff',
    'request_timeoff',
    'view_own_reviews',
    'view_company_directory',
    'view_all_employees',
    'manage_employees',
    'approve_all_timeoff',
    'manage_reviews',
    'view_all_reports',
    'manage_compensation',
    'manage_departments'
], 'HR administrators'),
(100, 'hr_super_admin', 'Super Administrator', ARRAY[
    'view_own_profile',
    'update_own_profile',
    'view_own_timeoff',
    'request_timeoff',
    'view_own_reviews',
    'view_company_directory',
    'view_all_employees',
    'manage_employees',
    'approve_all_timeoff',
    'manage_reviews',
    'view_all_reports',
    'manage_compensation',
    'manage_departments',
    'system_administration',
    'audit_access',
    'manage_security'
], 'System administrators');

-- Function to get role mapping
CREATE OR REPLACE FUNCTION hr_hidden.get_role_mapping(p_role_level INTEGER)
RETURNS hr_hidden.role_mapping
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
    result hr_hidden.role_mapping;
BEGIN
    SELECT 
        rp.role_level,
        rp.postgresql_role,
        rp.role_name,
        rp.permissions
    INTO result
    FROM hr_hidden.role_permissions rp
    WHERE rp.role_level = p_role_level;
    
    IF NOT FOUND THEN
        -- Default to guest role
        SELECT 
            rp.role_level,
            rp.postgresql_role,
            rp.role_name,
            rp.permissions
        INTO result
        FROM hr_hidden.role_permissions rp
        WHERE rp.role_level = 0;
    END IF;
    
    RETURN result;
END;
$$;

-- Function to validate JWT token structure
CREATE OR REPLACE FUNCTION hr_hidden.validate_jwt_token(token hr_public.jwt_token)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
    -- Check required fields are present
    IF token.role IS NULL OR 
       token.exp IS NULL OR 
       token.employee_id IS NULL OR 
       token.department_id IS NULL OR 
       token.role_level IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check token hasn't expired
    IF token.exp < EXTRACT(epoch FROM CURRENT_TIMESTAMP) THEN
        RETURN FALSE;
    END IF;
    
    -- Check role level is valid
    IF token.role_level NOT IN (0, 20, 60, 80, 100) THEN
        RETURN FALSE;
    END IF;
    
    -- Check role matches role level
    DECLARE
        expected_role TEXT;
    BEGIN
        SELECT postgresql_role INTO expected_role
        FROM hr_hidden.role_permissions
        WHERE role_level = token.role_level;
        
        IF expected_role != token.role THEN
            RETURN FALSE;
        END IF;
    END;
    
    RETURN TRUE;
END;
$$;

-- Function to create JWT token from employee data
CREATE OR REPLACE FUNCTION hr_hidden.create_jwt_token(
    p_employee hr_public.employees,
    p_expires_in_minutes INTEGER DEFAULT 15
) RETURNS hr_public.jwt_token
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
    token hr_public.jwt_token;
    role_info hr_hidden.role_mapping;
BEGIN
    -- Get role mapping
    role_info := hr_hidden.get_role_mapping(p_employee.role_level);
    
    -- Build JWT token
    token.role := role_info.postgresql_role;
    token.exp := EXTRACT(epoch FROM (CURRENT_TIMESTAMP + (p_expires_in_minutes || ' minutes')::INTERVAL))::INTEGER;
    token.employee_id := p_employee.id;
    token.department_id := p_employee.department_id;
    token.role_level := p_employee.role_level;
    token.is_admin := (p_employee.role_level >= 80);
    token.permissions := role_info.permissions;
    
    RETURN token;
END;
$$;

-- Function to extract claims from JWT token for RLS policies
CREATE OR REPLACE FUNCTION hr_hidden.extract_jwt_claims(token hr_public.jwt_token)
RETURNS hr_hidden.jwt_claims
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
    claims hr_hidden.jwt_claims;
    emp hr_public.employees;
BEGIN
    -- Validate token first
    IF NOT hr_hidden.validate_jwt_token(token) THEN
        RAISE EXCEPTION 'Invalid JWT token';
    END IF;
    
    -- Get employee details
    SELECT * INTO emp
    FROM hr_public.employees
    WHERE id = token.employee_id AND status = 'ACTIVE';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Employee not found or inactive';
    END IF;
    
    -- Build claims
    claims.employee_id := token.employee_id;
    claims.department_id := token.department_id;
    claims.role_level := token.role_level;
    claims.email := emp.email;
    claims.full_name := emp.first_name || ' ' || emp.last_name;
    claims.is_admin := token.is_admin;
    claims.permissions := token.permissions;
    
    RETURN claims;
END;
$$;

-- Indexes for role permissions
CREATE INDEX idx_role_permissions_role_level ON hr_hidden.role_permissions(role_level);
CREATE INDEX idx_role_permissions_postgresql_role ON hr_hidden.role_permissions(postgresql_role);

-- Comments for documentation
COMMENT ON TYPE hr_public.jwt_token IS 'JWT token structure for PostGraphile authentication';
COMMENT ON TYPE hr_hidden.jwt_claims IS 'JWT claims extracted for internal use';
COMMENT ON TYPE hr_hidden.role_mapping IS 'Role level to PostgreSQL role mapping';
COMMENT ON TYPE hr_public.auth_result IS 'Authentication result with tokens and employee data';

COMMENT ON TABLE hr_hidden.role_permissions IS 'Role level definitions and permissions mapping';
COMMENT ON FUNCTION hr_hidden.get_role_mapping(INTEGER) IS 'Gets PostgreSQL role and permissions for role level';
COMMENT ON FUNCTION hr_hidden.validate_jwt_token(hr_public.jwt_token) IS 'Validates JWT token structure and expiration';
COMMENT ON FUNCTION hr_hidden.create_jwt_token(hr_public.employees, INTEGER) IS 'Creates JWT token from employee data';
COMMENT ON FUNCTION hr_hidden.extract_jwt_claims(hr_public.jwt_token) IS 'Extracts claims from JWT token for RLS';