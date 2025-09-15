-- Migration: Create Database Roles and Permissions
-- Created: 2025-01-16
-- Description: Creates PostgreSQL roles for PostGraphile and implements role hierarchy

-- Drop existing roles if they exist (for development/testing)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hr_super_admin') THEN
        DROP ROLE hr_super_admin;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hr_admin') THEN
        DROP ROLE hr_admin;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hr_manager') THEN
        DROP ROLE hr_manager;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hr_employee') THEN
        DROP ROLE hr_employee;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hr_guest') THEN
        DROP ROLE hr_guest;
    END IF;
EXCEPTION 
    WHEN insufficient_privilege THEN
        RAISE NOTICE 'Some roles could not be dropped due to insufficient privileges';
END $$;

-- Create hierarchical roles for the HR system
-- Each role inherits permissions from the role below it

-- Base role for unauthenticated users
CREATE ROLE hr_guest NOLOGIN;

-- Role for regular employees
CREATE ROLE hr_employee NOLOGIN;
GRANT hr_guest TO hr_employee;

-- Role for managers
CREATE ROLE hr_manager NOLOGIN;
GRANT hr_employee TO hr_manager;

-- Role for HR administrators
CREATE ROLE hr_admin NOLOGIN;
GRANT hr_manager TO hr_admin;

-- Role for super administrators
CREATE ROLE hr_super_admin NOLOGIN;
GRANT hr_admin TO hr_super_admin;

-- Grant basic schema usage to all roles
GRANT USAGE ON SCHEMA hr_public TO hr_guest;
GRANT USAGE ON SCHEMA hr_private TO hr_admin; -- Only admin+ can access private schema
GRANT USAGE ON SCHEMA hr_hidden TO hr_employee; -- Hidden schema for internal functions

-- Guest role permissions (unauthenticated users)
-- Minimal access - only public authentication functions
GRANT EXECUTE ON FUNCTION hr_public.authenticate(TEXT, TEXT) TO hr_guest;
GRANT EXECUTE ON FUNCTION hr_public.refresh_token(TEXT) TO hr_guest;

-- Employee role permissions (authenticated users)
-- Can view own data and use basic functions

-- Table permissions for employees
GRANT SELECT ON hr_public.departments TO hr_employee;
GRANT SELECT ON hr_public.employees TO hr_employee; -- RLS will limit what they see

-- Time-off permissions for employees
GRANT SELECT, INSERT ON hr_public.time_off_requests TO hr_employee;
GRANT UPDATE ON hr_public.time_off_requests TO hr_employee; -- RLS limits to own records

-- Performance review permissions for employees  
GRANT SELECT ON hr_public.performance_reviews TO hr_employee; -- RLS limits access

-- Function permissions for employees
GRANT EXECUTE ON FUNCTION hr_public.logout() TO hr_employee;
GRANT EXECUTE ON FUNCTION hr_public.change_password(TEXT, TEXT) TO hr_employee;
GRANT EXECUTE ON FUNCTION hr_public.request_time_off(hr_public.time_off_type, DATE, DATE, TEXT) TO hr_employee;
GRANT EXECUTE ON FUNCTION hr_public.get_my_recent_auth_events(INTEGER) TO hr_employee;

-- Computed field permissions for employees
GRANT EXECUTE ON FUNCTION hr_public.employee_full_name(hr_public.employees) TO hr_employee;
GRANT EXECUTE ON FUNCTION hr_public.employee_department_path(hr_public.employees) TO hr_employee;
GRANT EXECUTE ON FUNCTION hr_public.employee_tenure_days(hr_public.employees) TO hr_employee;
GRANT EXECUTE ON FUNCTION hr_public.department_path(hr_public.departments) TO hr_employee;

-- Sequence permissions for employees (for inserts)
GRANT USAGE ON SEQUENCE hr_public.time_off_requests_id_seq TO hr_employee;

-- Manager role permissions (additional permissions beyond employee)
-- Can manage direct reports and approve time-off

-- Additional table permissions for managers
GRANT UPDATE ON hr_public.employees TO hr_manager; -- RLS limits to direct reports
GRANT UPDATE ON hr_public.time_off_requests TO hr_manager; -- For approval workflow
GRANT INSERT, UPDATE ON hr_public.performance_reviews TO hr_manager;

-- Function permissions for managers
GRANT EXECUTE ON FUNCTION hr_public.process_time_off_request(INTEGER, TEXT, TEXT) TO hr_manager;
GRANT EXECUTE ON FUNCTION hr_public.create_performance_review(INTEGER, INTEGER, TEXT) TO hr_manager;
GRANT EXECUTE ON FUNCTION hr_public.update_performance_review(INTEGER, DECIMAL, TEXT, TEXT, TEXT, TEXT, TEXT, hr_public.review_status) TO hr_manager;

-- Computed field permissions for managers
GRANT EXECUTE ON FUNCTION hr_public.employee_direct_reports(hr_public.employees) TO hr_manager;
GRANT EXECUTE ON FUNCTION hr_public.employee_can_manage(hr_public.employees) TO hr_manager;
GRANT EXECUTE ON FUNCTION hr_public.department_employee_count(hr_public.departments) TO hr_manager;
GRANT EXECUTE ON FUNCTION hr_public.department_subdepartments(hr_public.departments) TO hr_manager;
GRANT EXECUTE ON FUNCTION hr_public.time_off_request_can_approve(hr_public.time_off_requests) TO hr_manager;
GRANT EXECUTE ON FUNCTION hr_public.time_off_request_can_modify(hr_public.time_off_requests) TO hr_manager;
GRANT EXECUTE ON FUNCTION hr_public.performance_review_can_view(hr_public.performance_reviews) TO hr_manager;
GRANT EXECUTE ON FUNCTION hr_public.performance_review_can_edit(hr_public.performance_reviews) TO hr_manager;

-- Sequence permissions for managers
GRANT USAGE ON SEQUENCE hr_public.performance_reviews_id_seq TO hr_manager;

-- HR Admin role permissions (additional permissions beyond manager)
-- Can manage all employees, view sensitive data, create departments

-- Full table permissions for HR admins
GRANT SELECT, INSERT, UPDATE, DELETE ON hr_public.employees TO hr_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON hr_public.departments TO hr_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON hr_public.time_off_requests TO hr_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON hr_public.performance_reviews TO hr_admin;

-- Access to private schema for HR admins
GRANT SELECT, INSERT, UPDATE, DELETE ON hr_private.employee_account TO hr_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON hr_private.employee_compensation TO hr_admin;
GRANT SELECT ON hr_private.auth_log TO hr_admin;

-- Access to hidden schema for calculated data
GRANT SELECT, INSERT, UPDATE, DELETE ON hr_hidden.time_off_balances TO hr_admin;
GRANT SELECT ON hr_hidden.role_permissions TO hr_admin;

-- Function permissions for HR admins
GRANT EXECUTE ON FUNCTION hr_public.create_employee(TEXT, TEXT, TEXT, INTEGER, INTEGER, DATE, INTEGER, TEXT) TO hr_admin;
GRANT EXECUTE ON FUNCTION hr_public.terminate_employee(INTEGER, DATE, TEXT) TO hr_admin;
GRANT EXECUTE ON FUNCTION hr_public.update_employee_role(INTEGER, INTEGER, INTEGER, INTEGER) TO hr_admin;
GRANT EXECUTE ON FUNCTION hr_public.create_department(TEXT, TEXT, INTEGER) TO hr_admin;
GRANT EXECUTE ON FUNCTION hr_public.get_auth_statistics(INTEGER) TO hr_admin;

-- All sequence permissions for HR admins
GRANT USAGE ON SEQUENCE hr_public.employees_id_seq TO hr_admin;
GRANT USAGE ON SEQUENCE hr_public.departments_id_seq TO hr_admin;
GRANT USAGE ON SEQUENCE hr_private.employee_account_id_seq TO hr_admin;
GRANT USAGE ON SEQUENCE hr_private.employee_compensation_id_seq TO hr_admin;
GRANT USAGE ON SEQUENCE hr_hidden.time_off_balances_id_seq TO hr_admin;

-- Super Admin role permissions (additional permissions beyond HR admin)
-- System administration and full access

-- Grant all permissions on all sequences to super admin
GRANT USAGE ON ALL SEQUENCES IN SCHEMA hr_public TO hr_super_admin;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA hr_private TO hr_super_admin;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA hr_hidden TO hr_super_admin;

-- Grant schema creation permissions to super admin
GRANT CREATE ON DATABASE hr_system TO hr_super_admin;

-- Grant access to system functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA hr_hidden TO hr_super_admin;

-- PostGraphile application role (used by PostGraphile server)
-- This role needs to be able to switch to other roles via SET ROLE
CREATE ROLE postgraphile_app LOGIN PASSWORD 'dev_password_change_in_production';

-- Grant postgraphile_app the ability to assume any HR role
GRANT hr_guest TO postgraphile_app;
GRANT hr_employee TO postgraphile_app;
GRANT hr_manager TO postgraphile_app;
GRANT hr_admin TO postgraphile_app;
GRANT hr_super_admin TO postgraphile_app;

-- PostGraphile needs access to schema information
GRANT USAGE ON SCHEMA information_schema TO postgraphile_app;
GRANT SELECT ON information_schema.tables TO postgraphile_app;
GRANT SELECT ON information_schema.columns TO postgraphile_app;
GRANT SELECT ON information_schema.key_column_usage TO postgraphile_app;
GRANT SELECT ON information_schema.table_constraints TO postgraphile_app;

-- PostGraphile needs access to PostgreSQL system catalogs
GRANT SELECT ON pg_catalog.pg_class TO postgraphile_app;
GRANT SELECT ON pg_catalog.pg_attribute TO postgraphile_app;
GRANT SELECT ON pg_catalog.pg_type TO postgraphile_app;
GRANT SELECT ON pg_catalog.pg_namespace TO postgraphile_app;
GRANT SELECT ON pg_catalog.pg_proc TO postgraphile_app;
GRANT SELECT ON pg_catalog.pg_constraint TO postgraphile_app;
GRANT SELECT ON pg_catalog.pg_description TO postgraphile_app;
GRANT SELECT ON pg_catalog.pg_index TO postgraphile_app;

-- Function to set role based on JWT claims
-- This function will be called by PostGraphile to switch to appropriate role
CREATE OR REPLACE FUNCTION hr_hidden.set_role_from_jwt()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    jwt_role TEXT;
    jwt_role_level INTEGER;
BEGIN
    -- Get role from JWT claims
    jwt_role := current_setting('jwt.claims.role', true);
    jwt_role_level := current_setting('jwt.claims.role_level', true)::INTEGER;
    
    -- Validate and set role
    IF jwt_role IS NOT NULL AND jwt_role IN ('hr_guest', 'hr_employee', 'hr_manager', 'hr_admin', 'hr_super_admin') THEN
        -- Verify role level matches role name
        IF (jwt_role = 'hr_super_admin' AND jwt_role_level = 100) OR
           (jwt_role = 'hr_admin' AND jwt_role_level = 80) OR
           (jwt_role = 'hr_manager' AND jwt_role_level = 60) OR
           (jwt_role = 'hr_employee' AND jwt_role_level = 20) OR
           (jwt_role = 'hr_guest' AND jwt_role_level = 0) THEN
            
            EXECUTE format('SET ROLE %I', jwt_role);
        ELSE
            -- Role level doesn't match role name - default to guest
            SET ROLE hr_guest;
        END IF;
    ELSE
        -- Invalid or missing role - default to guest
        SET ROLE hr_guest;
    END IF;
END;
$$;

-- Grant execute permission on role switching function to postgraphile_app
GRANT EXECUTE ON FUNCTION hr_hidden.set_role_from_jwt() TO postgraphile_app;

-- Create function to reset role (for security)
CREATE OR REPLACE FUNCTION hr_hidden.reset_role()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER  
AS $$
BEGIN
    RESET ROLE;
END;
$$;

GRANT EXECUTE ON FUNCTION hr_hidden.reset_role() TO postgraphile_app;

-- Row Level Security setup function
-- This ensures RLS is properly configured after role setup
CREATE OR REPLACE FUNCTION hr_hidden.ensure_rls_enabled()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    -- Force enable RLS on all tables
    ALTER TABLE hr_public.departments FORCE ROW LEVEL SECURITY;
    ALTER TABLE hr_public.employees FORCE ROW LEVEL SECURITY; 
    ALTER TABLE hr_public.time_off_requests FORCE ROW LEVEL SECURITY;
    ALTER TABLE hr_public.performance_reviews FORCE ROW LEVEL SECURITY;
    
    -- Private schema tables - extra security
    ALTER TABLE hr_private.employee_account ENABLE ROW LEVEL SECURITY;
    ALTER TABLE hr_private.employee_compensation ENABLE ROW LEVEL SECURITY;
    ALTER TABLE hr_private.auth_log ENABLE ROW LEVEL SECURITY;
    
    -- Hidden schema tables
    ALTER TABLE hr_hidden.time_off_balances ENABLE ROW LEVEL SECURITY;
END;
$$;

-- Execute RLS setup
SELECT hr_hidden.ensure_rls_enabled();

-- Create policies for private schema tables

-- Employee account access (HR admin only, plus self-service functions)
CREATE POLICY "employee_account_hr_admin_full" ON hr_private.employee_account
    FOR ALL USING (current_setting('jwt.claims.role_level', true)::INTEGER >= 80);

-- Employee compensation access (HR admin only)
CREATE POLICY "employee_compensation_hr_admin_only" ON hr_private.employee_compensation
    FOR ALL USING (current_setting('jwt.claims.role_level', true)::INTEGER >= 80);

-- Auth log access (HR admin for statistics, employees for own events)
CREATE POLICY "auth_log_admin_and_own" ON hr_private.auth_log
    FOR SELECT USING (
        current_setting('jwt.claims.role_level', true)::INTEGER >= 80
        OR employee_id = current_setting('jwt.claims.employee_id', true)::INTEGER
    );

-- Time off balances (employees can see own, managers can see direct reports, HR admin all)
CREATE POLICY "time_off_balances_hierarchical" ON hr_hidden.time_off_balances
    FOR SELECT USING (
        current_setting('jwt.claims.role_level', true)::INTEGER >= 80
        OR employee_id = current_setting('jwt.claims.employee_id', true)::INTEGER
        OR (
            current_setting('jwt.claims.role_level', true)::INTEGER >= 60
            AND EXISTS (
                SELECT 1 FROM hr_public.employees e
                WHERE e.id = employee_id
                AND e.manager_id = current_setting('jwt.claims.employee_id', true)::INTEGER
                AND e.department_id = current_setting('jwt.claims.department_id', true)::INTEGER
            )
        )
    );

-- Comments for documentation
COMMENT ON ROLE hr_guest IS 'Unauthenticated users - minimal access for login';
COMMENT ON ROLE hr_employee IS 'Regular employees - view own data, request time off';
COMMENT ON ROLE hr_manager IS 'Department managers - manage direct reports, approve requests';
COMMENT ON ROLE hr_admin IS 'HR administrators - full employee management, sensitive data access';
COMMENT ON ROLE hr_super_admin IS 'System administrators - full system access';
COMMENT ON ROLE postgraphile_app IS 'PostGraphile application role - can assume other roles based on JWT';

COMMENT ON FUNCTION hr_hidden.set_role_from_jwt() IS 'Sets PostgreSQL role based on JWT claims for request';
COMMENT ON FUNCTION hr_hidden.reset_role() IS 'Resets PostgreSQL role to default for security';
COMMENT ON FUNCTION hr_hidden.ensure_rls_enabled() IS 'Ensures Row Level Security is enabled on all tables';