-- Migration: PostGraphile Schema Setup and JWT Integration
-- Created: 2024-12-13T05:00:00.000Z
-- Optimizes existing schema for PostGraphile with JWT authentication and proper role structure

-- UP
-- Create PostGraphile-specific schema structure
-- Use hr_public schema for PostGraphile (recommended practice)
CREATE SCHEMA IF NOT EXISTS hr_public;

-- Create hr_private schema for internal functions
CREATE SCHEMA IF NOT EXISTS hr_private;

-- Create hr_hidden schema for sensitive data (not exposed to GraphQL)
CREATE SCHEMA IF NOT EXISTS hr_hidden;

-- Enable extensions for JWT and other functionality
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- JWT Type definition for PostGraphile
CREATE TYPE hr_public.jwt_token AS (
  role TEXT,
  user_id UUID,
  exp BIGINT,
  iat BIGINT
);

-- PostGraphile-compatible user roles table in hr_public schema
CREATE TABLE hr_public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  level INTEGER NOT NULL CHECK (level >= 0 AND level <= 100),
  permissions JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comment for PostGraphile GraphQL name generation
COMMENT ON TABLE hr_public.user_roles IS 'User roles for role-based access control';

-- PostGraphile-compatible users table in hr_public schema
CREATE TABLE hr_public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  onboarding_status TEXT NOT NULL DEFAULT 'PreHire',
  job_title VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT true,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_login TIMESTAMPTZ,
  gdpr_anonymized BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comment for GraphQL naming
COMMENT ON TABLE hr_public.users IS 'User accounts and profiles for the HR system';

-- PostGraphile-compatible departments table
CREATE TABLE hr_public.departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  budget NUMERIC(12,2) CHECK (budget >= 0),
  parent_department_id UUID REFERENCES hr_public.departments(id),
  manager_id UUID REFERENCES hr_public.users(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comment for GraphQL naming
COMMENT ON TABLE hr_public.departments IS 'Organizational departments with hierarchy support';

-- PostGraphile-compatible job information table
CREATE TABLE hr_public.job_information (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID UNIQUE NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
  job_title VARCHAR(255) NOT NULL,
  department_id UUID REFERENCES hr_public.departments(id),
  manager_id UUID REFERENCES hr_public.users(id),
  hire_date DATE NOT NULL,
  employment_type TEXT NOT NULL DEFAULT 'FullTime',
  is_remote BOOLEAN NOT NULL DEFAULT false,
  location VARCHAR(255),
  reports_to UUID REFERENCES hr_public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comment for GraphQL naming
COMMENT ON TABLE hr_public.job_information IS 'Employee job details and assignments';

-- Move sensitive data to hr_hidden schema (not exposed to GraphQL)
CREATE TABLE hr_hidden.compensation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID UNIQUE NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
  pay_rate NUMERIC(10,2) NOT NULL CHECK (pay_rate >= 0),
  pay_type TEXT NOT NULL DEFAULT 'Salary',
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  effective_date DATE NOT NULL,
  bank_account_number TEXT,
  bank_routing_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE hr_hidden.personal_information (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID UNIQUE NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
  date_of_birth DATE,
  gender TEXT,
  nationality VARCHAR(100),
  social_security_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Authentication tables in hr_public schema
CREATE TABLE hr_public.auth_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
  ip_address INET NOT NULL,
  user_agent TEXT NOT NULL,
  refresh_token_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  revoked_at TIMESTAMPTZ,
  revoked_reason VARCHAR(100)
);

-- Comment for GraphQL naming
COMMENT ON TABLE hr_public.auth_sessions IS 'User authentication sessions and tokens';

CREATE TABLE hr_public.login_attempts (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  ip_address INET NOT NULL,
  success BOOLEAN NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  error_code VARCHAR(50),
  user_agent TEXT
);

-- Comment for GraphQL naming
COMMENT ON TABLE hr_public.login_attempts IS 'Security tracking for login attempts';

CREATE TABLE hr_public.password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comment for GraphQL naming
COMMENT ON TABLE hr_public.password_reset_tokens IS 'Password reset tokens for security';

-- Role assignments table
CREATE TABLE hr_public.user_role_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES hr_public.user_roles(id) ON DELETE CASCADE,
  assigned_by_user_id UUID REFERENCES hr_public.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role_id, is_active) WHERE is_active = true
);

-- Comment for GraphQL naming
COMMENT ON TABLE hr_public.user_role_assignments IS 'User role assignments with temporal tracking';

-- Contact information table
CREATE TABLE hr_public.contact_information (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID UNIQUE NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
  email VARCHAR(255),
  phone_number VARCHAR(50),
  work_phone_number VARCHAR(50),
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  address_city VARCHAR(100),
  address_state VARCHAR(100),
  address_postal_code VARCHAR(20),
  address_country VARCHAR(100) DEFAULT 'United States',
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(50),
  emergency_contact_relationship VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comment for GraphQL naming
COMMENT ON TABLE hr_public.contact_information IS 'Employee contact details and emergency information';

-- Notifications table  
CREATE TABLE hr_public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comment for GraphQL naming
COMMENT ON TABLE hr_public.notifications IS 'System notifications and alerts for users';

-- Updated at trigger function
CREATE OR REPLACE FUNCTION hr_private.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated at triggers to all hr_public tables
CREATE TRIGGER update_hr_public_users_updated_at 
    BEFORE UPDATE ON hr_public.users
    FOR EACH ROW EXECUTE FUNCTION hr_private.update_updated_at_column();

CREATE TRIGGER update_hr_public_departments_updated_at 
    BEFORE UPDATE ON hr_public.departments
    FOR EACH ROW EXECUTE FUNCTION hr_private.update_updated_at_column();

CREATE TRIGGER update_hr_public_user_roles_updated_at 
    BEFORE UPDATE ON hr_public.user_roles
    FOR EACH ROW EXECUTE FUNCTION hr_private.update_updated_at_column();

CREATE TRIGGER update_hr_public_user_role_assignments_updated_at 
    BEFORE UPDATE ON hr_public.user_role_assignments
    FOR EACH ROW EXECUTE FUNCTION hr_private.update_updated_at_column();

CREATE TRIGGER update_hr_public_job_information_updated_at 
    BEFORE UPDATE ON hr_public.job_information
    FOR EACH ROW EXECUTE FUNCTION hr_private.update_updated_at_column();

CREATE TRIGGER update_hr_public_contact_information_updated_at 
    BEFORE UPDATE ON hr_public.contact_information
    FOR EACH ROW EXECUTE FUNCTION hr_private.update_updated_at_column();

CREATE TRIGGER update_hr_public_notifications_updated_at 
    BEFORE UPDATE ON hr_public.notifications
    FOR EACH ROW EXECUTE FUNCTION hr_private.update_updated_at_column();

-- Insert default roles for PostGraphile system
INSERT INTO hr_public.user_roles (name, description, level, permissions) VALUES
('hr_guest', 'Guest role with minimal access', 0, '["read_basic"]'),
('hr_employee', 'Standard employee access', 20, '["read_basic", "read_own_data", "write_own_data"]'),
('hr_manager', 'Department manager access', 60, '["read_basic", "read_own_data", "write_own_data", "read_department_users", "approve_timeoff"]'),
('hr_admin', 'HR administrator with full employee data access', 80, '["read_basic", "read_own_data", "write_own_data", "read_department_users", "write_department_users", "read_compensation", "write_compensation", "read_reports", "write_reports"]'),
('hr_super_admin', 'Full system administrator access', 100, '["all"]');

-- Insert default departments
INSERT INTO hr_public.departments (name, description, budget) VALUES
('Engineering', 'Software development and technical operations', 2000000.00),
('Human Resources', 'Employee relations and organizational development', 500000.00),
('Finance', 'Financial planning and accounting', 300000.00),
('Marketing', 'Marketing and brand management', 800000.00),
('Sales', 'Sales and business development', 1200000.00),
('Operations', 'Operations and process management', 600000.00);

-- Insert default admin user (password: admin123 - bcrypt hash for 'admin')
INSERT INTO hr_public.users (email, password_hash, display_name, onboarding_status, job_title, is_active) VALUES
('admin@postgraphile-hr.com', '$2b$10$k8Y4WlZvnVBzG4p5R6M8HOfYlqMhNV5wP3ZWJXvTwmJ8Qk2Hn7vxS', 'PostGraphile Administrator', 'Active', 'System Administrator', true);

-- Assign admin role to default admin user
INSERT INTO hr_public.user_role_assignments (user_id, role_id, assigned_by_user_id)
SELECT u.id, r.id, u.id
FROM hr_public.users u, hr_public.user_roles r
WHERE u.email = 'admin@postgraphile-hr.com' AND r.name = 'hr_super_admin';

-- Performance indexes for PostGraphile queries
CREATE INDEX idx_hr_public_users_email ON hr_public.users(email);
CREATE INDEX idx_hr_public_users_active ON hr_public.users(is_active, onboarding_status);
CREATE INDEX idx_hr_public_users_display_name ON hr_public.users(display_name);
CREATE INDEX idx_hr_public_users_job_title ON hr_public.users(job_title) WHERE job_title IS NOT NULL;

CREATE INDEX idx_hr_public_departments_name ON hr_public.departments(name);
CREATE INDEX idx_hr_public_departments_active ON hr_public.departments(is_active);
CREATE INDEX idx_hr_public_departments_manager_id ON hr_public.departments(manager_id) WHERE manager_id IS NOT NULL;
CREATE INDEX idx_hr_public_departments_parent ON hr_public.departments(parent_department_id) WHERE parent_department_id IS NOT NULL;

CREATE INDEX idx_hr_public_job_info_employee_id ON hr_public.job_information(employee_id);
CREATE INDEX idx_hr_public_job_info_department_id ON hr_public.job_information(department_id);
CREATE INDEX idx_hr_public_job_info_manager_id ON hr_public.job_information(manager_id) WHERE manager_id IS NOT NULL;
CREATE INDEX idx_hr_public_job_info_department_title ON hr_public.job_information(department_id, job_title);

CREATE INDEX idx_hr_public_role_assignments_user_id ON hr_public.user_role_assignments(user_id, is_active);
CREATE INDEX idx_hr_public_role_assignments_role_id ON hr_public.user_role_assignments(role_id, is_active);
CREATE INDEX idx_hr_public_role_assignments_active ON hr_public.user_role_assignments(is_active, assigned_at);

CREATE INDEX idx_hr_public_user_roles_name ON hr_public.user_roles(name);
CREATE INDEX idx_hr_public_user_roles_level ON hr_public.user_roles(level);

CREATE INDEX idx_hr_public_auth_sessions_user_id ON hr_public.auth_sessions(user_id);
CREATE INDEX idx_hr_public_auth_sessions_active ON hr_public.auth_sessions(is_active, expires_at);

CREATE INDEX idx_hr_public_contact_info_employee_id ON hr_public.contact_information(employee_id);

CREATE INDEX idx_hr_public_notifications_user_id ON hr_public.notifications(user_id, created_at);
CREATE INDEX idx_hr_public_notifications_user_unread ON hr_public.notifications(user_id, is_read) WHERE is_read = false;

-- Full-text search indexes
CREATE INDEX idx_hr_public_users_search ON hr_public.users USING gin(to_tsvector('english', display_name || ' ' || COALESCE(job_title, '')));
CREATE INDEX idx_hr_public_departments_search ON hr_public.departments USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Partial indexes for performance
CREATE INDEX idx_hr_public_active_employees ON hr_public.users(id) WHERE is_active = true AND onboarding_status = 'Active';
CREATE INDEX idx_hr_public_active_departments ON hr_public.departments(id) WHERE is_active = true;
CREATE INDEX idx_hr_public_current_sessions ON hr_public.auth_sessions(user_id, last_activity_at) WHERE is_active = true;

-- DOWN
-- Drop indexes first
DROP INDEX IF EXISTS idx_hr_public_current_sessions;
DROP INDEX IF EXISTS idx_hr_public_active_departments;
DROP INDEX IF EXISTS idx_hr_public_active_employees;
DROP INDEX IF EXISTS idx_hr_public_departments_search;
DROP INDEX IF EXISTS idx_hr_public_users_search;
DROP INDEX IF EXISTS idx_hr_public_notifications_user_unread;
DROP INDEX IF EXISTS idx_hr_public_notifications_user_id;
DROP INDEX IF EXISTS idx_hr_public_contact_info_employee_id;
DROP INDEX IF EXISTS idx_hr_public_auth_sessions_active;
DROP INDEX IF EXISTS idx_hr_public_auth_sessions_user_id;
DROP INDEX IF EXISTS idx_hr_public_user_roles_level;
DROP INDEX IF EXISTS idx_hr_public_user_roles_name;
DROP INDEX IF EXISTS idx_hr_public_role_assignments_active;
DROP INDEX IF EXISTS idx_hr_public_role_assignments_role_id;
DROP INDEX IF EXISTS idx_hr_public_role_assignments_user_id;
DROP INDEX IF EXISTS idx_hr_public_job_info_department_title;
DROP INDEX IF EXISTS idx_hr_public_job_info_manager_id;
DROP INDEX IF EXISTS idx_hr_public_job_info_department_id;
DROP INDEX IF EXISTS idx_hr_public_job_info_employee_id;
DROP INDEX IF EXISTS idx_hr_public_departments_parent;
DROP INDEX IF EXISTS idx_hr_public_departments_manager_id;
DROP INDEX IF EXISTS idx_hr_public_departments_active;
DROP INDEX IF EXISTS idx_hr_public_departments_name;
DROP INDEX IF EXISTS idx_hr_public_users_job_title;
DROP INDEX IF EXISTS idx_hr_public_users_display_name;
DROP INDEX IF EXISTS idx_hr_public_users_active;
DROP INDEX IF EXISTS idx_hr_public_users_email;

-- Drop triggers
DROP TRIGGER IF EXISTS update_hr_public_notifications_updated_at ON hr_public.notifications;
DROP TRIGGER IF EXISTS update_hr_public_contact_information_updated_at ON hr_public.contact_information;
DROP TRIGGER IF EXISTS update_hr_public_job_information_updated_at ON hr_public.job_information;
DROP TRIGGER IF EXISTS update_hr_public_user_role_assignments_updated_at ON hr_public.user_role_assignments;
DROP TRIGGER IF EXISTS update_hr_public_user_roles_updated_at ON hr_public.user_roles;
DROP TRIGGER IF EXISTS update_hr_public_departments_updated_at ON hr_public.departments;
DROP TRIGGER IF EXISTS update_hr_public_users_updated_at ON hr_public.users;

-- Drop function
DROP FUNCTION IF EXISTS hr_private.update_updated_at_column();

-- Drop tables in correct order to respect foreign keys
DROP TABLE IF EXISTS hr_public.notifications CASCADE;
DROP TABLE IF EXISTS hr_public.contact_information CASCADE;
DROP TABLE IF EXISTS hr_public.user_role_assignments CASCADE;
DROP TABLE IF EXISTS hr_public.password_reset_tokens CASCADE;
DROP TABLE IF EXISTS hr_public.login_attempts CASCADE;
DROP TABLE IF EXISTS hr_public.auth_sessions CASCADE;
DROP TABLE IF EXISTS hr_public.job_information CASCADE;
DROP TABLE IF EXISTS hr_public.departments CASCADE;
DROP TABLE IF EXISTS hr_public.user_roles CASCADE;
DROP TABLE IF EXISTS hr_public.users CASCADE;

-- Drop hidden schema tables
DROP TABLE IF EXISTS hr_hidden.personal_information CASCADE;
DROP TABLE IF EXISTS hr_hidden.compensation CASCADE;

-- Drop schemas
DROP SCHEMA IF EXISTS hr_hidden CASCADE;
DROP SCHEMA IF EXISTS hr_private CASCADE;
DROP SCHEMA IF EXISTS hr_public CASCADE;

-- Drop type
DROP TYPE IF EXISTS hr_public.jwt_token;

-- METADATA
-- {
--   "version": 1,
--   "description": "PostGraphile-compatible database schema with JWT support",
--   "tables": [
--     {
--       "table": {
--         "schema": "hr_public",
--         "name": "users"
--       },
--       "configuration": {
--         "custom_root_fields": {
--           "select": "users",
--           "select_by_pk": "user",
--           "select_aggregate": "users_aggregate"
--         }
--       }
--     },
--     {
--       "table": {
--         "schema": "hr_public",
--         "name": "user_roles"
--       }
--     },
--     {
--       "table": {
--         "schema": "hr_public",
--         "name": "user_role_assignments"
--       }
--     },
--     {
--       "table": {
--         "schema": "hr_public",
--         "name": "departments"
--       }
--     },
--     {
--       "table": {
--         "schema": "hr_public",
--         "name": "job_information"
--       }
--     },
--     {
--       "table": {
--         "schema": "hr_public",
--         "name": "contact_information"
--       }
--     },
--     {
--       "table": {
--         "schema": "hr_public",
--         "name": "auth_sessions"
--       }
--     },
--     {
--       "table": {
--         "schema": "hr_public",
--         "name": "notifications"
--       }
--     }
--   ],
--   "relationships": [
--     {
--       "name": "jobInformation",
--       "using": {
--         "foreign_key_constraint_on": "employee_id"
--       }
--     },
--     {
--       "name": "contactInformation",
--       "using": {
--         "foreign_key_constraint_on": "employee_id"
--       }
--     },
--     {
--       "name": "userRoleAssignments",
--       "using": {
--         "foreign_key_constraint_on": "user_id"
--       }
--     }
--   ]
-- }
-- END

-- PERFORMANCE
-- {
--   "indexes": [
--     {
--       "table": "hr_public.users",
--       "columns": ["email"],
--       "unique": true,
--       "name": "hr_public_users_email_unique"
--     }
--   ]
-- }
-- END