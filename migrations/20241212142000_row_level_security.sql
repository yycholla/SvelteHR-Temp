-- Migration: Row-Level Security Policies
-- Created: 2024-12-12T14:20:00.000Z
-- Implements comprehensive RLS policies for data security and RBAC

-- UP
-- Enable Row-Level Security on all sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_information ENABLE ROW LEVEL SECURITY;
ALTER TABLE compensation ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_information ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_information ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

-- Users table RLS policies
CREATE POLICY user_select_own ON users
    FOR SELECT
    USING (id = NULLIF(current_setting('hasura.user-id', true), '')::UUID);

CREATE POLICY hr_admin_select_all_users ON users
    FOR SELECT
    TO hr_admin
    USING (true);

CREATE POLICY manager_select_department_users ON users
    FOR SELECT
    TO manager
    USING (
        id = NULLIF(current_setting('hasura.user-id', true), '')::UUID
        OR 
        EXISTS (
            SELECT 1
            FROM job_information ji
            JOIN departments d ON ji.department_id = d.id
            WHERE ji.employee_id = users.id
              AND d.manager_id = NULLIF(current_setting('hasura.user-id', true), '')::UUID
        )
    );

CREATE POLICY admin_select_all_users ON users
    FOR SELECT
    TO admin
    USING (true);

CREATE POLICY employee_select_active_users ON users
    FOR SELECT
    TO employee
    USING (
        id = NULLIF(current_setting('hasura.user-id', true), '')::UUID
        OR 
        (is_active = true AND onboarding_status = 'Active')
    );

-- Users table insert policies
CREATE POLICY hr_admin_insert_users ON users
    FOR INSERT
    TO hr_admin
    WITH CHECK (true);

CREATE POLICY admin_insert_users ON users
    FOR INSERT
    TO admin
    WITH CHECK (true);

-- Users table update policies
CREATE POLICY user_update_own ON users
    FOR UPDATE
    USING (id = NULLIF(current_setting('hasura.user-id', true), '')::UUID)
    WITH CHECK (id = NULLIF(current_setting('hasura.user-id', true), '')::UUID);

CREATE POLICY manager_update_department_users ON users
    FOR UPDATE
    TO manager
    USING (
        id = NULLIF(current_setting('hasura.user-id', true), '')::UUID
        OR 
        EXISTS (
            SELECT 1
            FROM job_information ji
            JOIN departments d ON ji.department_id = d.id
            WHERE ji.employee_id = users.id
              AND d.manager_id = NULLIF(current_setting('hasura.user-id', true), '')::UUID
        )
    )
    WITH CHECK (
        id = NULLIF(current_setting('hasura.user-id', true), '')::UUID
        OR 
        EXISTS (
            SELECT 1
            FROM job_information ji
            JOIN departments d ON ji.department_id = d.id
            WHERE ji.employee_id = users.id
              AND d.manager_id = NULLIF(current_setting('hasura.user-id', true), '')::UUID
        )
    );

CREATE POLICY hr_admin_update_users ON users
    FOR UPDATE
    TO hr_admin
    USING (true)
    WITH CHECK (true);

CREATE POLICY admin_update_users ON users
    FOR UPDATE
    TO admin
    USING (true)
    WITH CHECK (true);

-- Users table delete policies
CREATE POLICY admin_delete_users ON users
    FOR DELETE
    TO admin
    USING (true);

-- Compensation table RLS policies (highly sensitive)
CREATE POLICY user_select_own_compensation ON compensation
    FOR SELECT
    USING (employee_id = NULLIF(current_setting('hasura.user-id', true), '')::UUID);

CREATE POLICY hr_admin_compensation_access ON compensation
    FOR SELECT
    TO hr_admin
    USING (true);

CREATE POLICY finance_compensation_access ON compensation
    FOR SELECT
    TO finance
    USING (true);

CREATE POLICY admin_compensation_access ON compensation
    FOR ALL
    TO admin
    USING (true)
    WITH CHECK (true);

-- Personal information table RLS policies (highly sensitive)
CREATE POLICY user_personal_info_access ON personal_information
    FOR SELECT
    USING (employee_id = NULLIF(current_setting('hasura.user-id', true), '')::UUID);

CREATE POLICY hr_admin_personal_info_access ON personal_information
    FOR ALL
    TO hr_admin
    USING (true)
    WITH CHECK (true);

CREATE POLICY admin_personal_info_access ON personal_information
    FOR ALL
    TO admin
    USING (true)
    WITH CHECK (true);

-- Contact information table RLS policies
CREATE POLICY user_contact_info_access ON contact_information
    FOR SELECT
    USING (employee_id = NULLIF(current_setting('hasura.user-id', true), '')::UUID);

CREATE POLICY hr_admin_contact_info_access ON contact_information
    FOR ALL
    TO hr_admin
    USING (true)
    WITH CHECK (true);

CREATE POLICY manager_contact_info_access ON contact_information
    FOR SELECT
    TO manager
    USING (
        employee_id = NULLIF(current_setting('hasura.user-id', true), '')::UUID
        OR 
        EXISTS (
            SELECT 1
            FROM job_information ji
            JOIN departments d ON ji.department_id = d.id
            WHERE ji.employee_id = contact_information.employee_id
              AND d.manager_id = NULLIF(current_setting('hasura.user-id', true), '')::UUID
        )
    );

CREATE POLICY admin_contact_info_access ON contact_information
    FOR ALL
    TO admin
    USING (true)
    WITH CHECK (true);

-- Departments table RLS policies
CREATE POLICY authenticated_select_departments ON departments
    FOR SELECT
    TO employee, manager, hr_admin, admin
    USING (is_active = true);

CREATE POLICY manager_update_own_department ON departments
    FOR UPDATE
    TO manager
    USING (manager_id = NULLIF(current_setting('hasura.user-id', true), '')::UUID)
    WITH CHECK (manager_id = NULLIF(current_setting('hasura.user-id', true), '')::UUID);

CREATE POLICY hr_admin_department_access ON departments
    FOR ALL
    TO hr_admin
    USING (true)
    WITH CHECK (true);

CREATE POLICY admin_department_access ON departments
    FOR ALL
    TO admin
    USING (true)
    WITH CHECK (true);

-- Job information table RLS policies
CREATE POLICY user_job_info_access ON job_information
    FOR SELECT
    USING (employee_id = NULLIF(current_setting('hasura.user-id', true), '')::UUID);

CREATE POLICY manager_job_info_access ON job_information
    FOR SELECT
    TO manager
    USING (
        employee_id = NULLIF(current_setting('hasura.user-id', true), '')::UUID
        OR 
        EXISTS (
            SELECT 1
            FROM departments d
            WHERE d.id = job_information.department_id
              AND d.manager_id = NULLIF(current_setting('hasura.user-id', true), '')::UUID
        )
    );

CREATE POLICY hr_admin_job_info_access ON job_information
    FOR ALL
    TO hr_admin
    USING (true)
    WITH CHECK (true);

CREATE POLICY admin_job_info_access ON job_information
    FOR ALL
    TO admin
    USING (true)
    WITH CHECK (true);

-- User role assignments RLS policies
CREATE POLICY user_role_assignments_access ON user_role_assignments
    FOR SELECT
    USING (user_id = NULLIF(current_setting('hasura.user-id', true), '')::UUID);

CREATE POLICY hr_admin_role_assignments_access ON user_role_assignments
    FOR ALL
    TO hr_admin
    USING (true)
    WITH CHECK (true);

CREATE POLICY admin_role_assignments_access ON user_role_assignments
    FOR ALL
    TO admin
    USING (true)
    WITH CHECK (true);

-- Auth sessions RLS policies
CREATE POLICY user_own_sessions ON auth_sessions
    FOR SELECT
    USING (user_id = NULLIF(current_setting('hasura.user-id', true), '')::UUID);

CREATE POLICY admin_all_sessions ON auth_sessions
    FOR ALL
    TO admin
    USING (true)
    WITH CHECK (true);

-- Notifications RLS policies
CREATE POLICY user_own_notifications ON notifications
    FOR ALL
    USING (user_id = NULLIF(current_setting('hasura.user-id', true), '')::UUID)
    WITH CHECK (user_id = NULLIF(current_setting('hasura.user-id', true), '')::UUID);

CREATE POLICY admin_all_notifications ON notifications
    FOR ALL
    TO admin
    USING (true)
    WITH CHECK (true);

-- Audit log RLS policies (admin only)
CREATE POLICY admin_audit_log_access ON audit_log
    FOR SELECT
    TO admin
    USING (true);

-- Security audit log RLS policies (admin only)
CREATE POLICY admin_security_audit_access ON security_audit_log
    FOR SELECT
    TO admin
    USING (true);

-- Password reset tokens RLS policies (admin only for security)
CREATE POLICY admin_password_reset_access ON password_reset_tokens
    FOR ALL
    TO admin
    USING (true)
    WITH CHECK (true);

-- Create helper function for role-based access control
CREATE OR REPLACE FUNCTION check_role_hierarchy(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_level INTEGER;
    target_user_level INTEGER;
    current_user_id UUID := NULLIF(current_setting('hasura.user-id', true), '')::UUID;
BEGIN
    -- Admin can access everything
    IF current_user_has_role('Admin') THEN
        RETURN true;
    END IF;

    -- Users can access their own data
    IF current_user_id = target_user_id THEN
        RETURN true;
    END IF;

    -- Get role levels
    SELECT get_user_role_level(current_user_id) INTO current_user_level;
    SELECT get_user_role_level(target_user_id) INTO target_user_level;

    -- Higher level roles can access lower level roles
    RETURN current_user_level > target_user_level;
END;
$$;

-- Grant necessary permissions to roles
GRANT USAGE ON SCHEMA public TO employee, manager, hr_admin, admin, finance;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO employee, manager, hr_admin, admin, finance;
GRANT INSERT, UPDATE ON users, departments, job_information, contact_information TO hr_admin, admin;
GRANT INSERT, UPDATE ON compensation, personal_information TO hr_admin, admin, finance;
GRANT DELETE ON ALL TABLES IN SCHEMA public TO admin;

-- Grant execute permissions on functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO employee, manager, hr_admin, admin, finance;

-- Create indexes to support RLS policy performance
CREATE INDEX IF NOT EXISTS idx_rls_users_manager ON job_information(employee_id, department_id);
CREATE INDEX IF NOT EXISTS idx_rls_departments_manager ON departments(manager_id, is_active);
CREATE INDEX IF NOT EXISTS idx_rls_role_assignments_user ON user_role_assignments(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_rls_sessions_user ON auth_sessions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_rls_notifications_user ON notifications(user_id, is_read);

-- DOWN
DROP INDEX IF EXISTS idx_rls_notifications_user;
DROP INDEX IF EXISTS idx_rls_sessions_user;
DROP INDEX IF EXISTS idx_rls_role_assignments_user;
DROP INDEX IF EXISTS idx_rls_departments_manager;
DROP INDEX IF EXISTS idx_rls_users_manager;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM employee, manager, hr_admin, admin, finance;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM employee, manager, hr_admin, admin, finance;
REVOKE USAGE ON SCHEMA public FROM employee, manager, hr_admin, admin, finance;

DROP FUNCTION IF EXISTS check_role_hierarchy(UUID);

-- Drop all RLS policies
DROP POLICY IF EXISTS admin_password_reset_access ON password_reset_tokens;
DROP POLICY IF EXISTS admin_security_audit_access ON security_audit_log;
DROP POLICY IF EXISTS admin_audit_log_access ON audit_log;
DROP POLICY IF EXISTS admin_all_notifications ON notifications;
DROP POLICY IF EXISTS user_own_notifications ON notifications;
DROP POLICY IF EXISTS admin_all_sessions ON auth_sessions;
DROP POLICY IF EXISTS user_own_sessions ON auth_sessions;
DROP POLICY IF EXISTS admin_role_assignments_access ON user_role_assignments;
DROP POLICY IF EXISTS hr_admin_role_assignments_access ON user_role_assignments;
DROP POLICY IF EXISTS user_role_assignments_access ON user_role_assignments;
DROP POLICY IF EXISTS admin_job_info_access ON job_information;
DROP POLICY IF EXISTS hr_admin_job_info_access ON job_information;
DROP POLICY IF EXISTS manager_job_info_access ON job_information;
DROP POLICY IF EXISTS user_job_info_access ON job_information;
DROP POLICY IF EXISTS admin_department_access ON departments;
DROP POLICY IF EXISTS hr_admin_department_access ON departments;
DROP POLICY IF EXISTS manager_update_own_department ON departments;
DROP POLICY IF EXISTS authenticated_select_departments ON departments;
DROP POLICY IF EXISTS admin_contact_info_access ON contact_information;
DROP POLICY IF EXISTS manager_contact_info_access ON contact_information;
DROP POLICY IF EXISTS hr_admin_contact_info_access ON contact_information;
DROP POLICY IF EXISTS user_contact_info_access ON contact_information;
DROP POLICY IF EXISTS admin_personal_info_access ON personal_information;
DROP POLICY IF EXISTS hr_admin_personal_info_access ON personal_information;
DROP POLICY IF EXISTS user_personal_info_access ON personal_information;
DROP POLICY IF EXISTS admin_compensation_access ON compensation;
DROP POLICY IF EXISTS finance_compensation_access ON compensation;
DROP POLICY IF EXISTS hr_admin_compensation_access ON compensation;
DROP POLICY IF EXISTS user_select_own_compensation ON compensation;
DROP POLICY IF EXISTS admin_delete_users ON users;
DROP POLICY IF EXISTS admin_update_users ON users;
DROP POLICY IF EXISTS hr_admin_update_users ON users;
DROP POLICY IF EXISTS manager_update_department_users ON users;
DROP POLICY IF EXISTS user_update_own ON users;
DROP POLICY IF EXISTS admin_insert_users ON users;
DROP POLICY IF EXISTS hr_admin_insert_users ON users;
DROP POLICY IF EXISTS employee_select_active_users ON users;
DROP POLICY IF EXISTS admin_select_all_users ON users;
DROP POLICY IF EXISTS manager_select_department_users ON users;
DROP POLICY IF EXISTS hr_admin_select_all_users ON users;
DROP POLICY IF EXISTS user_select_own ON users;

-- Disable Row-Level Security
ALTER TABLE security_audit_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE personal_information DISABLE ROW LEVEL SECURITY;
ALTER TABLE contact_information DISABLE ROW LEVEL SECURITY;
ALTER TABLE compensation DISABLE ROW LEVEL SECURITY;
ALTER TABLE job_information DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_role_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE departments DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;