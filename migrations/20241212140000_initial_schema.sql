-- Migration: Initial SvelteHR Database Schema
-- Created: 2024-12-12T14:00:00.000Z
-- Mirrors GelDB structure with PostgreSQL optimizations for sub-200ms performance

-- UP
-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create custom types and enums
CREATE TYPE onboarding_status_enum AS ENUM (
    'PreHire',
    'Onboarding', 
    'Active',
    'Leave',
    'Terminated',
    'Alumni'
);

CREATE TYPE employment_type_enum AS ENUM (
    'FullTime',
    'PartTime',
    'Contract',
    'Intern',
    'Consultant'
);

CREATE TYPE pay_type_enum AS ENUM (
    'Salary',
    'Hourly',
    'Commission',
    'Contract'
);

CREATE TYPE gender_enum AS ENUM (
    'Male',
    'Female',
    'Other',
    'PreferNotToSay'
);

CREATE TYPE leave_type_enum AS ENUM (
    'Vacation',
    'Sick',
    'Personal',
    'Maternity',
    'Paternity',
    'Bereavement',
    'Unpaid'
);

-- Core Users table - central hub as specified
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    onboarding_status onboarding_status_enum NOT NULL DEFAULT 'PreHire',
    job_title VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    last_login TIMESTAMPTZ,
    gdpr_anonymized BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Departments table with hierarchy support
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    budget NUMERIC(12,2) CHECK (budget >= 0),
    parent_department_id UUID REFERENCES departments(id),
    manager_id UUID REFERENCES users(id),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User roles for RBAC
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    level INTEGER NOT NULL CHECK (level >= 0 AND level <= 100),
    permissions JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Role assignments with temporal tracking
CREATE TABLE user_role_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES user_roles(id) ON DELETE CASCADE,
    assigned_by_user_id UUID REFERENCES users(id),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add unique constraint for active assignments separately
CREATE UNIQUE INDEX unique_active_user_role ON user_role_assignments(user_id, role_id) WHERE is_active = true;

-- Job information linked to users and departments
CREATE TABLE job_information (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_title VARCHAR(255) NOT NULL,
    department_id UUID REFERENCES departments(id),
    manager_id UUID REFERENCES users(id),
    hire_date DATE NOT NULL,
    employment_type employment_type_enum NOT NULL DEFAULT 'FullTime',
    is_remote BOOLEAN NOT NULL DEFAULT false,
    location VARCHAR(255),
    reports_to UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Compensation information - highly sensitive
CREATE TABLE compensation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pay_rate NUMERIC(10,2) NOT NULL CHECK (pay_rate >= 0),
    pay_type pay_type_enum NOT NULL DEFAULT 'Salary',
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    effective_date DATE NOT NULL,
    -- Bank details excluded from GraphQL schema for security
    bank_account_number TEXT, -- Encrypted
    bank_routing_number TEXT, -- Encrypted
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Contact information
CREATE TABLE contact_information (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

-- Personal information - highly sensitive, PII
CREATE TABLE personal_information (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date_of_birth DATE,
    gender gender_enum,
    nationality VARCHAR(100),
    -- SSN excluded from GraphQL schema for security
    social_security_number TEXT, -- Encrypted
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Authentication sessions for JWT token management
CREATE TABLE auth_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

-- Login attempts for security tracking
CREATE TABLE login_attempts (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    ip_address INET NOT NULL,
    success BOOLEAN NOT NULL,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    error_code VARCHAR(50),
    user_agent TEXT
);

-- Password reset tokens
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Security audit log
CREATE TABLE security_audit_log (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    event_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comprehensive audit log for all data changes
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    table_name VARCHAR(255) NOT NULL,
    record_id UUID NOT NULL,
    operation VARCHAR(10) NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications for real-time updates
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'info',
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance-optimized indexes
-- Users table indexes (most frequently queried)
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active, onboarding_status);
CREATE INDEX idx_users_display_name ON users(display_name);
CREATE INDEX idx_users_job_title ON users(job_title) WHERE job_title IS NOT NULL;
CREATE INDEX idx_users_onboarding_status ON users(onboarding_status);

-- Departments indexes
CREATE INDEX idx_departments_name ON departments(name);
CREATE INDEX idx_departments_active ON departments(is_active);
CREATE INDEX idx_departments_manager_id ON departments(manager_id) WHERE manager_id IS NOT NULL;
CREATE INDEX idx_departments_parent ON departments(parent_department_id) WHERE parent_department_id IS NOT NULL;

-- Job information indexes (critical for employee directory)
CREATE INDEX idx_job_info_employee_id ON job_information(employee_id);
CREATE INDEX idx_job_info_department_id ON job_information(department_id);
CREATE INDEX idx_job_info_manager_id ON job_information(manager_id) WHERE manager_id IS NOT NULL;
CREATE INDEX idx_job_info_department_title ON job_information(department_id, job_title);
CREATE INDEX idx_job_info_hire_date ON job_information(hire_date);
CREATE INDEX idx_job_info_employment_type ON job_information(employment_type);

-- Role assignment indexes
CREATE INDEX idx_role_assignments_user_id ON user_role_assignments(user_id, is_active);
CREATE INDEX idx_role_assignments_role_id ON user_role_assignments(role_id, is_active);
CREATE INDEX idx_role_assignments_active ON user_role_assignments(is_active, assigned_at);

-- User roles indexes
CREATE INDEX idx_user_roles_name ON user_roles(name);
CREATE INDEX idx_user_roles_level ON user_roles(level);
CREATE INDEX idx_user_roles_active ON user_roles(is_active);

-- Authentication session indexes
CREATE INDEX idx_auth_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX idx_auth_sessions_active ON auth_sessions(is_active, expires_at);
CREATE INDEX idx_auth_sessions_token_hash ON auth_sessions(refresh_token_hash);
CREATE INDEX idx_auth_sessions_expires_at ON auth_sessions(expires_at);

-- Login attempts indexes for security analysis
CREATE INDEX idx_login_attempts_email ON login_attempts(email, attempted_at);
CREATE INDEX idx_login_attempts_ip ON login_attempts(ip_address, attempted_at);
CREATE INDEX idx_login_attempts_success ON login_attempts(success, attempted_at);

-- Compensation indexes (sensitive data, limited access)
CREATE INDEX idx_compensation_employee_id ON compensation(employee_id);
CREATE INDEX idx_compensation_effective_date ON compensation(effective_date);

-- Contact information indexes
CREATE INDEX idx_contact_info_employee_id ON contact_information(employee_id);
CREATE INDEX idx_contact_info_email ON contact_information(email) WHERE email IS NOT NULL;

-- Personal information indexes (highly sensitive)
CREATE INDEX idx_personal_info_employee_id ON personal_information(employee_id);

-- Audit log indexes for compliance and investigation
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id, created_at);
CREATE INDEX idx_audit_log_table_record ON audit_log(table_name, record_id, created_at);
CREATE INDEX idx_audit_log_operation ON audit_log(operation, created_at);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

-- Security audit log indexes
CREATE INDEX idx_security_audit_user_id ON security_audit_log(user_id, created_at);
CREATE INDEX idx_security_audit_event_type ON security_audit_log(event_type, created_at);
CREATE INDEX idx_security_audit_success ON security_audit_log(success, created_at);

-- Notifications indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id, created_at);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_expires_at ON notifications(expires_at) WHERE expires_at IS NOT NULL;

-- Password reset tokens indexes
CREATE INDEX idx_password_reset_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX idx_password_reset_expires ON password_reset_tokens(expires_at);

-- Full-text search indexes for employee directory
CREATE INDEX idx_users_search ON users USING gin(to_tsvector('english', display_name || ' ' || COALESCE(job_title, '')));
CREATE INDEX idx_departments_search ON departments USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Partial indexes for performance optimization
CREATE INDEX idx_active_employees ON users(id) WHERE is_active = true AND onboarding_status = 'Active';
CREATE INDEX idx_active_departments ON departments(id) WHERE is_active = true;
CREATE INDEX idx_current_sessions ON auth_sessions(user_id, last_activity_at) WHERE is_active = true;

-- Updated at triggers for automatic timestamp management
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON user_roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_role_assignments_updated_at BEFORE UPDATE ON user_role_assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_information_updated_at BEFORE UPDATE ON job_information
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compensation_updated_at BEFORE UPDATE ON compensation
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contact_information_updated_at BEFORE UPDATE ON contact_information
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_personal_information_updated_at BEFORE UPDATE ON personal_information
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audit trigger function for comprehensive logging
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_log (
        user_id,
        table_name,
        record_id,
        operation,
        old_values,
        new_values,
        ip_address,
        user_agent
    ) VALUES (
        NULLIF(current_setting('hasura.user-id', true), ''),
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
        NULLIF(current_setting('hasura.client-ip', true), ''),
        NULLIF(current_setting('hasura.user-agent', true), '')
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to sensitive tables
CREATE TRIGGER audit_users_trigger
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_compensation_trigger
    AFTER INSERT OR UPDATE OR DELETE ON compensation
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_personal_information_trigger
    AFTER INSERT OR UPDATE OR DELETE ON personal_information
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_user_role_assignments_trigger
    AFTER INSERT OR UPDATE OR DELETE ON user_role_assignments
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Insert seed data for roles
INSERT INTO user_roles (name, description, level, permissions) VALUES
('Admin', 'Full system administrator access', 100, '["all"]'),
('HR Admin', 'HR administrator with access to all employee data', 80, '["read_users", "write_users", "read_compensation", "write_compensation", "read_personal_info", "write_personal_info", "read_reports", "write_reports"]'),
('Manager', 'Department manager with limited administrative access', 60, '["read_users", "read_department_users", "write_department_users", "approve_timeoff", "read_reports"]'),
('Employee', 'Standard employee access', 20, '["read_own_data", "write_own_data", "read_directory", "submit_timeoff"]'),
('Finance', 'Financial access for payroll and compensation', 70, '["read_users", "read_compensation", "write_compensation", "read_reports"]');

-- Insert seed data for departments
INSERT INTO departments (name, description, budget) VALUES
('Engineering', 'Software development and technical operations', 2000000.00),
('Human Resources', 'Employee relations and organizational development', 500000.00),
('Finance', 'Financial planning and accounting', 300000.00),
('Marketing', 'Marketing and brand management', 800000.00),
('Sales', 'Sales and business development', 1200000.00);

-- Insert default admin user (password: admin123)
INSERT INTO users (email, password_hash, display_name, onboarding_status, job_title, is_active) VALUES
('admin@svelteHR.com', '$2b$10$k8Y4WlZvnVBzG4p5R6M8HOfYlqMhNV5wP3ZWJXvTwmJ8Qk2Hn7vxS', 'System Administrator', 'Active', 'System Administrator', true);

-- Assign admin role to default admin user
INSERT INTO user_role_assignments (user_id, role_id, assigned_by_user_id)
SELECT u.id, r.id, u.id
FROM users u, user_roles r
WHERE u.email = 'admin@svelteHR.com' AND r.name = 'Admin';

-- DOWN
DROP TRIGGER IF EXISTS audit_user_role_assignments_trigger ON user_role_assignments;
DROP TRIGGER IF EXISTS audit_personal_information_trigger ON personal_information;
DROP TRIGGER IF EXISTS audit_compensation_trigger ON compensation;
DROP TRIGGER IF EXISTS audit_users_trigger ON users;

DROP TRIGGER IF EXISTS update_personal_information_updated_at ON personal_information;
DROP TRIGGER IF EXISTS update_contact_information_updated_at ON contact_information;
DROP TRIGGER IF EXISTS update_compensation_updated_at ON compensation;
DROP TRIGGER IF EXISTS update_job_information_updated_at ON job_information;
DROP TRIGGER IF EXISTS update_user_role_assignments_updated_at ON user_role_assignments;
DROP TRIGGER IF EXISTS update_user_roles_updated_at ON user_roles;
DROP TRIGGER IF EXISTS update_departments_updated_at ON departments;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;

DROP FUNCTION IF EXISTS audit_trigger_function();
DROP FUNCTION IF EXISTS update_updated_at_column();

DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS security_audit_log CASCADE;
DROP TABLE IF EXISTS password_reset_tokens CASCADE;
DROP TABLE IF EXISTS login_attempts CASCADE;
DROP TABLE IF EXISTS auth_sessions CASCADE;
DROP TABLE IF EXISTS personal_information CASCADE;
DROP TABLE IF EXISTS contact_information CASCADE;
DROP TABLE IF EXISTS compensation CASCADE;
DROP TABLE IF EXISTS job_information CASCADE;
DROP TABLE IF EXISTS user_role_assignments CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP TYPE IF EXISTS leave_type_enum;
DROP TYPE IF EXISTS gender_enum;
DROP TYPE IF EXISTS pay_type_enum;
DROP TYPE IF EXISTS employment_type_enum;
DROP TYPE IF EXISTS onboarding_status_enum;

-- METADATA
-- {
--   "version": 3,
--   "tables": [
--     {
--       "table": {
--         "schema": "public",
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
--         "schema": "public", 
--         "name": "departments"
--       }
--     },
--     {
--       "table": {
--         "schema": "public",
--         "name": "user_roles"
--       }
--     },
--     {
--       "table": {
--         "schema": "public",
--         "name": "user_role_assignments"
--       }
--     },
--     {
--       "table": {
--         "schema": "public",
--         "name": "job_information"
--       }
--     },
--     {
--       "table": {
--         "schema": "public",
--         "name": "compensation"
--       }
--     },
--     {
--       "table": {
--         "schema": "public",
--         "name": "contact_information"
--       }
--     },
--     {
--       "table": {
--         "schema": "public",
--         "name": "personal_information"
--       }
--     },
--     {
--       "table": {
--         "schema": "public",
--         "name": "auth_sessions"
--       }
--     },
--     {
--       "table": {
--         "schema": "public",
--         "name": "audit_log"
--       }
--     },
--     {
--       "table": {
--         "schema": "public",
--         "name": "notifications"
--       }
--     }
--   ],
--   "relationships": [
--     {
--       "name": "job_information",
--       "using": {
--         "foreign_key_constraint_on": "employee_id"
--       }
--     },
--     {
--       "name": "contact_information", 
--       "using": {
--         "foreign_key_constraint_on": "employee_id"
--       }
--     },
--     {
--       "name": "personal_information",
--       "using": {
--         "foreign_key_constraint_on": "employee_id"
--       }
--     },
--     {
--       "name": "compensation",
--       "using": {
--         "foreign_key_constraint_on": "employee_id"
--       }
--     },
--     {
--       "name": "user_role_assignments",
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
--       "table": "users",
--       "columns": ["email"],
--       "unique": true,
--       "name": "idx_users_email_performance"
--     },
--     {
--       "table": "users", 
--       "columns": ["is_active", "onboarding_status"],
--       "name": "idx_users_active_status_performance"
--     },
--     {
--       "table": "job_information",
--       "columns": ["department_id", "job_title"],
--       "name": "idx_job_department_role_performance"
--     },
--     {
--       "table": "user_role_assignments",
--       "columns": ["user_id", "is_active"],
--       "name": "idx_role_assignments_active_performance"
--     }
--   ],
--   "constraints": [
--     {
--       "table": "compensation",
--       "name": "chk_compensation_pay_rate_positive",
--       "type": "check",
--       "definition": "CHECK (pay_rate >= 0)"
--     },
--     {
--       "table": "departments",
--       "name": "chk_departments_budget_positive",
--       "type": "check", 
--       "definition": "CHECK (budget >= 0)"
--     }
--   ]
-- }
-- END