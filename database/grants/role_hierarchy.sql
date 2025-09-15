-- PostGraphile HR System - Role Hierarchy Setup
-- Creates PostgreSQL roles with hierarchical permissions for HR system

-- Create base roles for HR system
CREATE ROLE hr_guest NOLOGIN NOINHERIT;
CREATE ROLE hr_employee NOLOGIN NOINHERIT;
CREATE ROLE hr_manager NOLOGIN NOINHERIT;
CREATE ROLE hr_admin NOLOGIN NOINHERIT;
CREATE ROLE hr_super_admin NOLOGIN NOINHERIT;

-- Set up role inheritance hierarchy
-- hr_guest -> hr_employee -> hr_manager -> hr_admin -> hr_super_admin
GRANT hr_guest TO hr_employee;
GRANT hr_employee TO hr_manager;
GRANT hr_manager TO hr_admin;
GRANT hr_admin TO hr_super_admin;

-- Grant all roles to the application user so it can SET ROLE
GRANT hr_guest TO postgraphile_app;
GRANT hr_employee TO postgraphile_app;
GRANT hr_manager TO postgraphile_app;
GRANT hr_admin TO postgraphile_app;
GRANT hr_super_admin TO postgraphile_app;

-- Set role-specific permissions on schemas
-- Guest: No access to any schema
-- Employee: Read access to public schema only
GRANT USAGE ON SCHEMA hr_public TO hr_employee;

-- Manager: Read access to public, limited write access
GRANT USAGE ON SCHEMA hr_public TO hr_manager;

-- HR Admin: Full access to public and private schemas
GRANT USAGE ON SCHEMA hr_public TO hr_admin;
GRANT USAGE ON SCHEMA hr_private TO hr_admin;

-- Super Admin: Full access to all schemas
GRANT USAGE ON SCHEMA hr_public TO hr_super_admin;
GRANT USAGE ON SCHEMA hr_private TO hr_super_admin;
GRANT USAGE ON SCHEMA hr_hidden TO hr_super_admin;

-- Function permissions (will be set after functions are created)
-- Note: Specific table permissions will be handled by Row Level Security (RLS)
-- The roles above are used primarily for:
-- 1. PostGraphile JWT role assignment
-- 2. RLS policy enforcement
-- 3. Function execution permissions

COMMENT ON ROLE hr_guest IS 'Unauthenticated users - no access to HR data';
COMMENT ON ROLE hr_employee IS 'Regular employees - access to own data only';
COMMENT ON ROLE hr_manager IS 'Department managers - access to department data';
COMMENT ON ROLE hr_admin IS 'HR administrators - access to all employee data';
COMMENT ON ROLE hr_super_admin IS 'System administrators - full system access';