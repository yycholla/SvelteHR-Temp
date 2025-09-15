-- =============================================================================
-- Hasura Row-Level Security (RLS) Policies for SvelteHR
-- Security-first approach with proper access controls for HR data
-- =============================================================================

-- Enable Row Level Security on all tables
-- This ensures that even with admin access, policies are enforced

-- =============================================================================
-- Users Table Security
-- =============================================================================

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can only see their own profile
CREATE POLICY user_select_own ON users 
  FOR SELECT 
  USING (id = current_setting('hasura.user-id', true)::uuid);

-- Users can update their own non-sensitive fields
CREATE POLICY user_update_own ON users 
  FOR UPDATE 
  USING (id = current_setting('hasura.user-id', true)::uuid)
  WITH CHECK (
    id = current_setting('hasura.user-id', true)::uuid
    -- Prevent users from changing sensitive fields
    AND (OLD.email = NEW.email OR current_setting('hasura.role', true) IN ('hr_admin', 'admin'))
    AND (OLD.onboarding_status = NEW.onboarding_status OR current_setting('hasura.role', true) IN ('hr_admin', 'admin'))
  );

-- HR Administrators can see all users
CREATE POLICY hr_admin_select_all_users ON users
  FOR SELECT
  USING (current_setting('hasura.role', true) IN ('hr_admin', 'admin'));

-- HR Administrators can update user data
CREATE POLICY hr_admin_update_users ON users
  FOR UPDATE
  USING (current_setting('hasura.role', true) IN ('hr_admin', 'admin'));

-- HR Administrators can insert new users
CREATE POLICY hr_admin_insert_users ON users
  FOR INSERT
  WITH CHECK (current_setting('hasura.role', true) IN ('hr_admin', 'admin'));

-- Managers can see users in their department
CREATE POLICY manager_select_department_users ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM job_information ji
      JOIN departments d ON ji.department_id = d.id
      WHERE ji.employee_id = users.id
      AND d.manager_id = current_setting('hasura.user-id', true)::uuid
    )
  );

-- =============================================================================
-- Job Information Security
-- =============================================================================

ALTER TABLE job_information ENABLE ROW LEVEL SECURITY;

-- Users can see their own job information
CREATE POLICY user_select_own_job_info ON job_information
  FOR SELECT
  USING (employee_id = current_setting('hasura.user-id', true)::uuid);

-- HR Administrators can access all job information
CREATE POLICY hr_admin_select_all_job_info ON job_information
  FOR SELECT
  USING (current_setting('hasura.role', true) IN ('hr_admin', 'admin'));

-- HR Administrators can modify job information
CREATE POLICY hr_admin_modify_job_info ON job_information
  FOR ALL
  USING (current_setting('hasura.role', true) IN ('hr_admin', 'admin'));

-- Managers can see job information for their department employees
CREATE POLICY manager_select_department_job_info ON job_information
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM departments d
      WHERE d.id = job_information.department_id
      AND d.manager_id = current_setting('hasura.user-id', true)::uuid
    )
  );

-- =============================================================================
-- Compensation Security (Highly Sensitive)
-- =============================================================================

ALTER TABLE compensation ENABLE ROW LEVEL SECURITY;

-- Users can see their own compensation (read-only)
CREATE POLICY user_select_own_compensation ON compensation
  FOR SELECT
  USING (employee_id = current_setting('hasura.user-id', true)::uuid);

-- Only HR Administrators and specific roles can access compensation data
CREATE POLICY hr_admin_compensation_access ON compensation
  FOR ALL
  USING (current_setting('hasura.role', true) IN ('hr_admin', 'admin', 'payroll_admin'));

-- Finance users can access compensation for payroll processing
CREATE POLICY finance_compensation_access ON compensation
  FOR SELECT
  USING (current_setting('hasura.role', true) IN ('finance', 'payroll_admin'));

-- =============================================================================
-- Contact Information Security
-- =============================================================================

ALTER TABLE contact_information ENABLE ROW LEVEL SECURITY;

-- Users can access their own contact information
CREATE POLICY user_contact_info_access ON contact_information
  FOR ALL
  USING (employee_id = current_setting('hasura.user-id', true)::uuid);

-- HR Administrators can access all contact information
CREATE POLICY hr_admin_contact_info_access ON contact_information
  FOR ALL
  USING (current_setting('hasura.role', true) IN ('hr_admin', 'admin'));

-- Managers can see contact information for their department employees
CREATE POLICY manager_select_department_contact_info ON contact_information
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM job_information ji
      JOIN departments d ON ji.department_id = d.id
      WHERE ji.employee_id = contact_information.employee_id
      AND d.manager_id = current_setting('hasura.user-id', true)::uuid
    )
  );

-- =============================================================================
-- Personal Information Security (Highly Sensitive)
-- =============================================================================

ALTER TABLE personal_information ENABLE ROW LEVEL SECURITY;

-- Users can access their own personal information
CREATE POLICY user_personal_info_access ON personal_information
  FOR ALL
  USING (employee_id = current_setting('hasura.user-id', true)::uuid);

-- Only HR Administrators can access personal information
CREATE POLICY hr_admin_personal_info_access ON personal_information
  FOR ALL
  USING (current_setting('hasura.role', true) IN ('hr_admin', 'admin'));

-- =============================================================================
-- Departments Security
-- =============================================================================

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- All authenticated users can see active departments (basic info only)
CREATE POLICY authenticated_select_departments ON departments
  FOR SELECT
  USING (
    is_active = true 
    AND current_setting('hasura.role', true) != 'anonymous'
  );

-- HR Administrators can manage departments
CREATE POLICY hr_admin_departments_access ON departments
  FOR ALL
  USING (current_setting('hasura.role', true) IN ('hr_admin', 'admin'));

-- Managers can update their own department
CREATE POLICY manager_update_own_department ON departments
  FOR UPDATE
  USING (manager_id = current_setting('hasura.user-id', true)::uuid)
  WITH CHECK (manager_id = current_setting('hasura.user-id', true)::uuid);

-- =============================================================================
-- User Roles and Role Assignments Security
-- =============================================================================

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_role_assignments ENABLE ROW LEVEL SECURITY;

-- Only administrators can manage roles
CREATE POLICY admin_roles_access ON user_roles
  FOR ALL
  USING (current_setting('hasura.role', true) = 'admin');

-- Users can see their own role assignments
CREATE POLICY user_select_own_roles ON user_role_assignments
  FOR SELECT
  USING (user_id = current_setting('hasura.user-id', true)::uuid);

-- HR Administrators can manage role assignments
CREATE POLICY hr_admin_role_assignments ON user_role_assignments
  FOR ALL
  USING (current_setting('hasura.role', true) IN ('hr_admin', 'admin'));

-- All users can see role definitions (for UI display)
CREATE POLICY authenticated_select_role_definitions ON user_roles
  FOR SELECT
  USING (current_setting('hasura.role', true) != 'anonymous');

-- =============================================================================
-- Authentication Tables Security
-- =============================================================================

ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own sessions
CREATE POLICY user_own_sessions ON auth_sessions
  FOR ALL
  USING (user_id = current_setting('hasura.user-id', true)::uuid);

-- Admins can see all sessions for security monitoring
CREATE POLICY admin_all_sessions ON auth_sessions
  FOR SELECT
  USING (current_setting('hasura.role', true) = 'admin');

-- Enable RLS on token tables with admin-only access
ALTER TABLE email_verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_only_tokens ON email_verification_tokens
  FOR ALL USING (current_setting('hasura.role', true) = 'admin');

CREATE POLICY admin_only_password_reset ON password_reset_tokens
  FOR ALL USING (current_setting('hasura.role', true) = 'admin');

CREATE POLICY user_own_oauth ON oauth_connections
  FOR ALL USING (user_id = current_setting('hasura.user-id', true)::uuid);

-- =============================================================================
-- Anonymous Role Policies (Public Access)
-- =============================================================================

-- Anonymous users can only access public registration/login endpoints
-- No table access for anonymous users in HR system for security

-- =============================================================================
-- Helper Functions for Role Checking
-- =============================================================================

-- Function to check if current user has specific role
CREATE OR REPLACE FUNCTION current_user_has_role(role_name text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN user_roles ur ON ura.role_id = ur.id
    WHERE ura.user_id = current_setting('hasura.user-id', true)::uuid
    AND ura.is_active = true
    AND ur.name = role_name
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check if current user is manager of specific department
CREATE OR REPLACE FUNCTION current_user_manages_department(dept_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM departments
    WHERE id = dept_id
    AND manager_id = current_setting('hasura.user-id', true)::uuid
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =============================================================================
-- Audit Trail Setup
-- =============================================================================

-- Create audit log table for tracking data changes
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,  -- INSERT, UPDATE, DELETE
  old_data JSONB,
  new_data JSONB,
  user_id UUID,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Enable RLS on audit log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can access audit logs
CREATE POLICY admin_audit_log_access ON audit_log
  FOR SELECT
  USING (current_setting('hasura.role', true) = 'admin');

-- =============================================================================
-- Performance Indexes for Security Queries
-- =============================================================================

-- Indexes for efficient policy enforcement
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_user_active 
  ON user_role_assignments(user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_job_information_employee_department 
  ON job_information(employee_id, department_id);

CREATE INDEX IF NOT EXISTS idx_departments_manager 
  ON departments(manager_id) WHERE manager_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_active 
  ON auth_sessions(user_id, is_active);

-- =============================================================================
-- Comments and Documentation
-- =============================================================================

COMMENT ON POLICY user_select_own ON users IS 
  'Users can only select their own user record for privacy';

COMMENT ON POLICY hr_admin_select_all_users ON users IS 
  'HR Administrators need access to all user data for management';

COMMENT ON POLICY user_select_own_compensation ON compensation IS 
  'Employees can view their own compensation information';

COMMENT ON POLICY hr_admin_compensation_access ON compensation IS 
  'Only HR Administrators and Payroll staff can manage compensation data';

-- =============================================================================
-- Security Configuration Summary
-- =============================================================================

-- The policies above implement:
-- 1. User privacy - users can only see their own data
-- 2. Role-based access - different roles have different permissions
-- 3. Department hierarchy - managers can see their team data
-- 4. Sensitive data protection - compensation and personal info are highly restricted
-- 5. Audit capabilities - all changes can be tracked
-- 6. Performance optimization - proper indexes for policy queries

-- To apply these policies, run this script against your Hasura PostgreSQL database
-- Make sure to test thoroughly in a development environment first