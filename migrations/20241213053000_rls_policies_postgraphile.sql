-- Migration: Row-Level Security Policies for PostGraphile
-- Created: 2024-12-13T05:30:00.000Z
-- Comprehensive RLS policies optimized for PostGraphile with JWT authentication

-- UP
-- Enable Row-Level Security on all tables in hr_public schema
ALTER TABLE hr_public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.user_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.job_information ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.contact_information ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.jwt_tokens ENABLE ROW LEVEL SECURITY;

-- Users table RLS policies
CREATE POLICY users_select_own ON hr_public.users
    FOR SELECT
    USING (
        id = current_setting('jwt.claims.user_id', true)::UUID
        OR current_setting('jwt.claims.role', true) IN ('hr_admin', 'hr_super_admin')
        OR (current_setting('jwt.claims.role', true) = 'hr_manager'
            AND EXISTS (
                SELECT 1 FROM hr_public.job_information ji
                JOIN hr_public.departments d ON ji.department_id = d.id
                WHERE ji.employee_id = hr_public.users.id
                  AND d.manager_id = current_setting('jwt.claims.user_id', true)::UUID
            ))
        OR (current_setting('jwt.claims.role', true) = 'hr_employee'
            AND hr_public.users.is_active = true
            AND hr_public.users.onboarding_status = 'Active')
    );

CREATE POLICY users_insert ON hr_public.users
    FOR INSERT
    WITH CHECK (
        current_setting('jwt.claims.role', true) IN ('hr_admin', 'hr_super_admin')
    );

CREATE POLICY users_update ON hr_public.users
    FOR UPDATE
    USING (
        id = current_setting('jwt.claims.user_id', true)::UUID
        OR current_setting('jwt.claims.role', true) IN ('hr_admin', 'hr_super_admin')
    )
    WITH CHECK (
        id = current_setting('jwt.claims.user_id', true)::UUID
        OR current_setting('jwt.claims.role', true) IN ('hr_admin', 'hr_super_admin')
    );

CREATE POLICY users_delete ON hr_public.users
    FOR DELETE
    USING (
        current_setting('jwt.claims.role', true) = 'hr_super_admin'
    );

-- Departments table RLS policies
CREATE POLICY departments_select ON hr_public.departments
    FOR SELECT
    USING (
        is_active = true
        OR current_setting('jwt.claims.role', true) IN ('hr_admin', 'hr_super_admin')
    );

CREATE POLICY departments_insert ON hr_public.departments
    FOR INSERT
    WITH CHECK (
        current_setting('jwt.claims.role', true) IN ('hr_admin', 'hr_super_admin')
    );

CREATE POLICY departments_update ON hr_public.departments
    FOR UPDATE
    USING (
        current_setting('jwt.claims.role', true) IN ('hr_admin', 'hr_super_admin')
        OR (current_setting('jwt.claims.role', true) = 'hr_manager'
            AND manager_id = current_setting('jwt.claims.user_id', true)::UUID)
    )
    WITH CHECK (
        current_setting('jwt.claims.role', true) IN ('hr_admin', 'hr_super_admin')
        OR (current_setting('jwt.claims.role', true) = 'hr_manager'
            AND manager_id = current_setting('jwt.claims.user_id', true)::UUID)
    );

-- Job information RLS policies
CREATE POLICY job_info_select ON hr_public.job_information
    FOR SELECT
    USING (
        employee_id = current_setting('jwt.claims.user_id', true)::UUID
        OR current_setting('jwt.claims.role', true) IN ('hr_admin', 'hr_super_admin')
        OR (current_setting('jwt.claims.role', true) = 'hr_manager'
            AND EXISTS (
                SELECT 1 FROM hr_public.departments d
                WHERE d.id = hr_public.job_information.department_id
                  AND d.manager_id = current_setting('jwt.claims.user_id', true)::UUID
            ))
    );

CREATE POLICY job_info_modify ON hr_public.job_information
    FOR ALL
    USING (
        current_setting('jwt.claims.role', true) IN ('hr_admin', 'hr_super_admin')
    )
    WITH CHECK (
        current_setting('jwt.claims.role', true) IN ('hr_admin', 'hr_super_admin')
    );

-- Contact information RLS policies
CREATE POLICY contact_info_select ON hr_public.contact_information
    FOR SELECT
    USING (
        employee_id = current_setting('jwt.claims.user_id', true)::UUID
        OR current_setting('jwt.claims.role', true) IN ('hr_admin', 'hr_super_admin')
        OR (current_setting('jwt.claims.role', true) = 'hr_manager'
            AND EXISTS (
                SELECT 1 FROM hr_public.job_information ji
                JOIN hr_public.departments d ON ji.department_id = d.id
                WHERE ji.employee_id = hr_public.contact_information.employee_id
                  AND d.manager_id = current_setting('jwt.claims.user_id', true)::UUID
            ))
    );

CREATE POLICY contact_info_update ON hr_public.contact_information
    FOR UPDATE
    USING (
        employee_id = current_setting('jwt.claims.user_id', true)::UUID
        OR current_setting('jwt.claims.role', true) IN ('hr_admin', 'hr_super_admin')
    )
    WITH CHECK (
        employee_id = current_setting('jwt.claims.user_id', true)::UUID
        OR current_setting('jwt.claims.role', true) IN ('hr_admin', 'hr_super_admin')
    );

-- User role assignments RLS policies
CREATE POLICY role_assignments_select ON hr_public.user_role_assignments
    FOR SELECT
    USING (
        user_id = current_setting('jwt.claims.user_id', true)::UUID
        OR current_setting('jwt.claims.role', true) IN ('hr_admin', 'hr_super_admin')
    );

CREATE POLICY role_assignments_modify ON hr_public.user_role_assignments
    FOR ALL
    USING (
        current_setting('jwt.claims.role', true) IN ('hr_admin', 'hr_super_admin')
    )
    WITH CHECK (
        current_setting('jwt.claims.role', true) IN ('hr_admin', 'hr_super_admin')
    );

-- Notifications RLS policies
CREATE POLICY notifications_select ON hr_public.notifications
    FOR SELECT
    USING (
        user_id = current_setting('jwt.claims.user_id', true)::UUID
        OR current_setting('jwt.claims.role', true) IN ('hr_admin', 'hr_super_admin')
    );

CREATE POLICY notifications_modify ON hr_public.notifications
    FOR ALL
    USING (
        user_id = current_setting('jwt.claims.user_id', true)::UUID
        OR current_setting('jwt.claims.role', true) IN ('hr_admin', 'hr_super_admin')
    )
    WITH CHECK (
        user_id = current_setting('jwt.claims.user_id', true)::UUID
        OR current_setting('jwt.claims.role', true) IN ('hr_admin', 'hr_super_admin')
    );

-- JWT tokens RLS policies
CREATE POLICY jwt_tokens_own ON hr_public.jwt_tokens
    FOR ALL
    USING (
        user_id = current_setting('jwt.claims.user_id', true)::UUID
        OR current_setting('jwt.claims.role', true) IN ('hr_admin', 'hr_super_admin')
    )
    WITH CHECK (
        user_id = current_setting('jwt.claims.user_id', true)::UUID
        OR current_setting('jwt.claims.role', true) IN ('hr_admin', 'hr_super_admin')
    );

-- Auth sessions RLS policies
CREATE POLICY auth_sessions_own ON hr_public.auth_sessions
    FOR ALL
    USING (
        user_id = current_setting('jwt.claims.user_id', true)::UUID
        OR current_setting('jwt.claims.role', true) IN ('hr_admin', 'hr_super_admin')
    )
    WITH CHECK (
        user_id = current_setting('jwt.claims.user_id', true)::UUID
        OR current_setting('jwt.claims.role', true) IN ('hr_admin', 'hr_super_admin')
    );

-- Create RLS bypass for application role (PostGraphile server)
ALTER TABLE hr_public.users OWNER TO postgraphile_application;
ALTER TABLE hr_public.departments OWNER TO postgraphile_application;
ALTER TABLE hr_public.user_role_assignments OWNER TO postgraphile_application;
ALTER TABLE hr_public.job_information OWNER TO postgraphile_application;
ALTER TABLE hr_public.contact_information OWNER TO postgraphile_application;
ALTER TABLE hr_public.auth_sessions OWNER TO postgraphile_application;
ALTER TABLE hr_public.notifications OWNER TO postgraphile_application;
ALTER TABLE hr_public.jwt_tokens OWNER TO postgraphile_application;

-- Grant necessary permissions for RLS to work properly
GRANT ALL ON SCHEMA hr_public TO postgraphile_application;
GRANT ALL ON ALL TABLES IN SCHEMA hr_public TO postgraphile_application;
GRANT ALL ON ALL SEQUENCES IN SCHEMA hr_public TO postgraphile_application;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA hr_public TO postgraphile_application;

-- Create performance indexes for RLS
CREATE INDEX idx_rls_jwt_claims ON hr_public.users((current_setting('jwt.claims.user_id', true)::UUID));
CREATE INDEX idx_rls_departments_manager ON hr_public.departments(manager_id, is_active);
CREATE INDEX idx_rls_job_info_employee ON hr_public.job_information(employee_id, department_id);

-- DOWN
-- Drop indexes
DROP INDEX IF EXISTS idx_rls_job_info_employee;
DROP INDEX IF EXISTS idx_rls_departments_manager;
DROP INDEX IF EXISTS idx_rls_jwt_claims;

-- Drop all RLS policies
DROP POLICY IF EXISTS auth_sessions_own ON hr_public.auth_sessions;
DROP POLICY IF EXISTS jwt_tokens_own ON hr_public.jwt_tokens;
DROP POLICY IF EXISTS notifications_modify ON hr_public.notifications;
DROP POLICY IF EXISTS notifications_select ON hr_public.notifications;
DROP POLICY IF EXISTS role_assignments_modify ON hr_public.user_role_assignments;
DROP POLICY IF EXISTS role_assignments_select ON hr_public.user_role_assignments;
DROP POLICY IF EXISTS contact_info_update ON hr_public.contact_information;
DROP POLICY IF EXISTS contact_info_select ON hr_public.contact_information;
DROP POLICY IF EXISTS job_info_modify ON hr_public.job_information;
DROP POLICY IF EXISTS job_info_select ON hr_public.job_information;
DROP POLICY IF EXISTS departments_update ON hr_public.departments;
DROP POLICY IF EXISTS departments_insert ON hr_public.departments;
DROP POLICY IF EXISTS departments_select ON hr_public.departments;
DROP POLICY IF EXISTS users_delete ON hr_public.users;
DROP POLICY IF EXISTS users_update ON hr_public.users;
DROP POLICY IF EXISTS users_insert ON hr_public.users;
DROP POLICY IF EXISTS users_select_own ON hr_public.users;

-- Disable RLS
ALTER TABLE hr_public.jwt_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.auth_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.contact_information DISABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.job_information DISABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.user_role_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.departments DISABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.users DISABLE ROW LEVEL SECURITY;