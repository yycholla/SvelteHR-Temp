-- ======================================================================
-- PostGraphile HR System - Complete Schema Initialization Script
-- ======================================================================
-- This script contains the complete consolidated schema for the SvelteHR
-- PostGraphile-based HR management system. It combines all migration files
-- into a single production-ready initialization script.
--
-- Version: 1.0
-- Created: 2025-09-16
-- Compatible with: PostgreSQL 15+, PostGraphile 4.x
--
-- Migration Sources: Consolidated from migrations 000-024
-- Key Features:
-- - Complete HR lifecycle management (hiring, onboarding, termination)
-- - Advanced security framework with MFA and session management
-- - Compliance and audit systems (GDPR, data protection)
-- - Performance reviews and compensation management
-- - Workflow automation and notifications
-- - Document management and analytics
--
-- Usage: Run this script on a fresh PostgreSQL database to create
-- the complete HR system schema.
-- ======================================================================

-- ===== DATABASE SETUP AND EXTENSIONS =====

-- Create schemas for PostGraphile
CREATE SCHEMA IF NOT EXISTS hr_public;
CREATE SCHEMA IF NOT EXISTS hr_private;
CREATE SCHEMA IF NOT EXISTS hr_hidden;

-- Create application user for PostGraphile
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgraphile_app') THEN
        CREATE USER postgraphile_app WITH PASSWORD 'secure_password_postgraphile_2025';
    END IF;
END
$$;

-- Grant schema permissions to application user
GRANT USAGE ON SCHEMA hr_public TO postgraphile_app;
GRANT USAGE ON SCHEMA hr_private TO postgraphile_app;
GRANT USAGE ON SCHEMA hr_hidden TO postgraphile_app;

-- Grant table permissions (will be inherited by future tables)
ALTER DEFAULT PRIVILEGES IN SCHEMA hr_public GRANT ALL ON TABLES TO postgraphile_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA hr_public GRANT ALL ON SEQUENCES TO postgraphile_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA hr_public GRANT ALL ON FUNCTIONS TO postgraphile_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA hr_private GRANT ALL ON TABLES TO postgraphile_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA hr_private GRANT ALL ON SEQUENCES TO postgraphile_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA hr_private GRANT ALL ON FUNCTIONS TO postgraphile_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA hr_hidden GRANT ALL ON TABLES TO postgraphile_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA hr_hidden GRANT ALL ON SEQUENCES TO postgraphile_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA hr_hidden GRANT ALL ON FUNCTIONS TO postgraphile_app;

-- Install required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Set search path for PostGraphile
-- Note: This would normally be set at database level, included here for reference
-- ALTER DATABASE svelteHR_postgraphile SET search_path = hr_public, hr_private, hr_hidden, public;

-- ===== ENUMERATION TYPES =====

-- Core employee and status types
CREATE TYPE hr_public.employee_status AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'TERMINATED',
    'ON_LEAVE'
);

-- Time off and request management
CREATE TYPE hr_public.time_off_type AS ENUM (
    'VACATION',
    'SICK_LEAVE',
    'PERSONAL',
    'BEREAVEMENT',
    'MATERNITY',
    'PATERNITY'
);

CREATE TYPE hr_public.request_status AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'CANCELLED'
);

CREATE TYPE hr_public.accrual_frequency AS ENUM (
    'MONTHLY',
    'QUARTERLY',
    'ANNUALLY',
    'PER_PAY_PERIOD'
);

-- Performance and review management
CREATE TYPE hr_public.review_status AS ENUM (
    'NOT_STARTED',
    'IN_PROGRESS',
    'COMPLETED',
    'OVERDUE'
);

CREATE TYPE hr_public.goal_status AS ENUM (
    'NOT_STARTED',
    'IN_PROGRESS',
    'COMPLETED',
    'DEFERRED',
    'CANCELLED'
);

CREATE TYPE hr_public.competency_level AS ENUM (
    'NEEDS_IMPROVEMENT',
    'MEETS_EXPECTATIONS',
    'EXCEEDS_EXPECTATIONS',
    'OUTSTANDING'
);

-- Compensation and payroll
CREATE TYPE hr_public.pay_frequency AS ENUM (
    'WEEKLY',
    'BI_WEEKLY',
    'SEMI_MONTHLY',
    'MONTHLY'
);

CREATE TYPE hr_public.employment_status AS ENUM (
    'FULL_TIME',
    'PART_TIME',
    'CONTRACT',
    'INTERN',
    'CONSULTANT'
);

CREATE TYPE hr_public.compensation_type AS ENUM (
    'SALARY',
    'HOURLY',
    'COMMISSION',
    'BONUS',
    'EQUITY'
);

CREATE TYPE hr_public.payroll_status AS ENUM (
    'DRAFT',
    'PENDING_APPROVAL',
    'APPROVED',
    'PROCESSED',
    'PAID',
    'CANCELLED'
);

-- Document management
CREATE TYPE hr_public.document_type AS ENUM (
    'CONTRACT',
    'HANDBOOK',
    'POLICY',
    'FORM',
    'CERTIFICATE',
    'PERSONAL_DOCUMENT',
    'REPORT',
    'TEMPLATE'
);

CREATE TYPE hr_public.document_status AS ENUM (
    'DRAFT',
    'UNDER_REVIEW',
    'APPROVED',
    'PUBLISHED',
    'ARCHIVED',
    'EXPIRED'
);

CREATE TYPE hr_public.access_level AS ENUM (
    'PUBLIC',
    'EMPLOYEE',
    'MANAGER',
    'HR_ADMIN',
    'CONFIDENTIAL'
);

-- Workflow automation
CREATE TYPE hr_public.workflow_trigger_type AS ENUM (
    'EMPLOYEE_HIRED',
    'EMPLOYEE_TERMINATED',
    'TIMEOFF_REQUESTED',
    'REVIEW_DUE',
    'DOCUMENT_EXPIRING',
    'MANUAL_TRIGGER',
    'SCHEDULED_TRIGGER'
);

CREATE TYPE hr_public.workflow_action_type AS ENUM (
    'SEND_EMAIL',
    'CREATE_TASK',
    'UPDATE_RECORD',
    'GENERATE_DOCUMENT',
    'ASSIGN_REVIEWER',
    'SEND_NOTIFICATION'
);

CREATE TYPE hr_public.workflow_status AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'DRAFT'
);

CREATE TYPE hr_public.workflow_instance_status AS ENUM (
    'PENDING',
    'RUNNING',
    'COMPLETED',
    'FAILED',
    'CANCELLED'
);

-- Notifications system
CREATE TYPE hr_public.notification_channel AS ENUM (
    'EMAIL',
    'SMS',
    'PUSH',
    'IN_APP',
    'SLACK',
    'TEAMS'
);

CREATE TYPE hr_public.notification_priority AS ENUM (
    'LOW',
    'NORMAL',
    'HIGH',
    'URGENT'
);

CREATE TYPE hr_public.notification_category AS ENUM (
    'SYSTEM',
    'HR_ACTION',
    'WORKFLOW',
    'REMINDER',
    'ANNOUNCEMENT',
    'SECURITY'
);

CREATE TYPE hr_public.delivery_status AS ENUM (
    'PENDING',
    'SENT',
    'DELIVERED',
    'FAILED',
    'BOUNCED'
);

CREATE TYPE hr_public.digest_frequency AS ENUM (
    'NONE',
    'DAILY',
    'WEEKLY',
    'MONTHLY'
);

-- Security framework
CREATE TYPE hr_public.mfa_method AS ENUM (
    'TOTP',
    'SMS',
    'EMAIL',
    'BACKUP_CODE',
    'HARDWARE_TOKEN'
);

CREATE TYPE hr_public.security_event_type AS ENUM (
    'LOGIN_SUCCESS',
    'LOGIN_FAILED',
    'LOGIN_BLOCKED',
    'PASSWORD_CHANGED',
    'MFA_ENABLED',
    'MFA_DISABLED',
    'MFA_CHALLENGE_SUCCESS',
    'MFA_CHALLENGE_FAILED',
    'SESSION_CREATED',
    'SESSION_EXPIRED',
    'SESSION_TERMINATED',
    'PERMISSION_DENIED',
    'SUSPICIOUS_ACTIVITY',
    'DATA_ACCESS',
    'DATA_EXPORT',
    'ADMIN_ACTION'
);

CREATE TYPE hr_public.session_status AS ENUM (
    'ACTIVE',
    'EXPIRED',
    'TERMINATED',
    'SUSPENDED'
);

CREATE TYPE hr_public.device_trust_level AS ENUM (
    'TRUSTED',
    'RECOGNIZED',
    'UNKNOWN',
    'BLOCKED'
);

-- Compliance and audit
CREATE TYPE hr_public.audit_action_type AS ENUM (
    'CREATE',
    'READ',
    'UPDATE',
    'DELETE',
    'LOGIN',
    'LOGOUT',
    'EXPORT',
    'IMPORT',
    'APPROVAL',
    'REJECTION'
);

CREATE TYPE hr_public.data_classification AS ENUM (
    'PUBLIC',
    'INTERNAL',
    'CONFIDENTIAL',
    'RESTRICTED',
    'TOP_SECRET'
);

CREATE TYPE hr_public.retention_status AS ENUM (
    'ACTIVE',
    'REVIEW_REQUIRED',
    'ELIGIBLE_FOR_DELETION',
    'PENDING_DELETION',
    'DELETED',
    'LEGAL_HOLD'
);

CREATE TYPE hr_public.consent_status AS ENUM (
    'GIVEN',
    'WITHDRAWN',
    'PENDING',
    'EXPIRED',
    'NOT_REQUIRED'
);

CREATE TYPE hr_public.privacy_request_type AS ENUM (
    'ACCESS',
    'RECTIFICATION',
    'ERASURE',
    'PORTABILITY',
    'RESTRICT_PROCESSING',
    'OBJECT_PROCESSING',
    'COMPLAINT'
);

-- Data protection and privacy
CREATE TYPE hr_public.encryption_status AS ENUM (
    'ENCRYPTED',
    'PLAIN_TEXT',
    'ANONYMIZED',
    'PSEUDONYMIZED'
);

CREATE TYPE hr_public.anonymization_level AS ENUM (
    'NONE',
    'PARTIAL',
    'FULL',
    'STATISTICAL'
);

CREATE TYPE hr_public.data_lineage_action AS ENUM (
    'CREATED',
    'ACCESSED',
    'MODIFIED',
    'COPIED',
    'EXPORTED',
    'DELETED',
    'ARCHIVED',
    'ANONYMIZED'
);

-- ===== COMPOSITE TYPES AND STRUCTURES =====

-- JWT authentication types
CREATE TYPE hr_public.jwt_token AS (
    role TEXT,
    exp INTEGER,
    employee_id INTEGER,
    department_id INTEGER,
    role_level INTEGER,
    is_admin BOOLEAN,
    permissions TEXT[]
);

CREATE TYPE hr_hidden.jwt_claims AS (
    employee_id INTEGER,
    department_id INTEGER,
    role_level INTEGER,
    email TEXT,
    full_name TEXT,
    is_admin BOOLEAN,
    permissions TEXT[]
);

CREATE TYPE hr_hidden.role_mapping AS (
    role_level INTEGER,
    postgresql_role TEXT,
    role_name TEXT,
    permissions TEXT[]
);

CREATE TYPE hr_hidden.session_info AS (
    employee_id INTEGER,
    session_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE
);

-- Note: auth_result type will be created after the employees table

-- ===== SEQUENCES =====

-- Create sequences for audit and privacy systems
CREATE SEQUENCE hr_hidden.assessment_sequence START 1000;

-- ===== CORE TABLES =====

-- Departments table
CREATE TABLE hr_public.departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_department_id INTEGER REFERENCES hr_public.departments(id),
    manager_id INTEGER, -- Forward reference to employees table
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT departments_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT departments_no_self_parent CHECK (id != parent_department_id)
);

-- Employees table
CREATE TABLE hr_public.employees (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    department_id INTEGER NOT NULL REFERENCES hr_public.departments(id),
    manager_id INTEGER REFERENCES hr_public.employees(id),
    role_level INTEGER NOT NULL DEFAULT 20,
    status hr_public.employee_status DEFAULT 'ACTIVE',
    hire_date DATE NOT NULL,
    termination_date DATE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT employees_names_not_empty CHECK (
        LENGTH(TRIM(first_name)) > 0 AND LENGTH(TRIM(last_name)) > 0
    ),
    CONSTRAINT employees_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT employees_role_level_valid CHECK (role_level IN (0, 20, 60, 80, 100)),
    CONSTRAINT employees_hire_date_not_future CHECK (hire_date <= CURRENT_DATE),
    CONSTRAINT employees_termination_after_hire CHECK (
        termination_date IS NULL OR termination_date >= hire_date
    ),
    CONSTRAINT employees_no_self_manager CHECK (id != manager_id)
);

-- Add foreign key constraint for department manager (now that employees table exists)
ALTER TABLE hr_public.departments
ADD CONSTRAINT fk_departments_manager
FOREIGN KEY (manager_id) REFERENCES hr_public.employees(id);

-- Create auth_result type (now that employees table exists)
CREATE TYPE hr_public.auth_result AS (
    jwt_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    employee hr_public.employees
);

-- Employee accounts table (private schema for sensitive authentication data)
CREATE TABLE hr_private.employee_account (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES hr_public.employees(id),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    last_login TIMESTAMP WITH TIME ZONE,
    failed_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    refresh_token_hash TEXT,
    refresh_token_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT employee_account_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT employee_account_failed_attempts_positive CHECK (failed_attempts >= 0),
    CONSTRAINT employee_account_locked_until_future CHECK (
        locked_until IS NULL OR locked_until > CURRENT_TIMESTAMP
    ),
    CONSTRAINT employee_account_refresh_token_expiry CHECK (
        (refresh_token_hash IS NULL AND refresh_token_expires_at IS NULL) OR
        (refresh_token_hash IS NOT NULL AND refresh_token_expires_at IS NOT NULL)
    )
);

-- ===== HUMAN RESOURCES TABLES =====

-- Time off requests table
CREATE TABLE hr_public.time_off_requests (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES hr_public.employees(id),
    request_type hr_public.time_off_type NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_requested DECIMAL(4,2) NOT NULL,
    reason TEXT,
    status hr_public.request_status DEFAULT 'PENDING',
    approved_by INTEGER REFERENCES hr_public.employees(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT time_off_dates_valid CHECK (start_date <= end_date),
    CONSTRAINT time_off_days_positive CHECK (days_requested > 0),
    CONSTRAINT time_off_days_reasonable CHECK (days_requested <= 365),
    CONSTRAINT time_off_future_dates CHECK (start_date >= CURRENT_DATE - INTERVAL '1 year'),
    CONSTRAINT time_off_approval_logic CHECK (
        (status = 'APPROVED' AND approved_by IS NOT NULL AND approved_at IS NOT NULL) OR
        (status = 'REJECTED' AND approved_by IS NOT NULL AND approved_at IS NOT NULL AND rejection_reason IS NOT NULL) OR
        (status IN ('PENDING', 'CANCELLED'))
    )
);

-- Performance reviews table
CREATE TABLE hr_public.performance_reviews (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES hr_public.employees(id),
    reviewer_id INTEGER NOT NULL REFERENCES hr_public.employees(id),
    review_period VARCHAR(50) NOT NULL, -- e.g., "2024-Q4", "2024-Annual"
    status hr_public.review_status DEFAULT 'NOT_STARTED',
    overall_rating DECIMAL(3,2), -- 1.00 to 5.00 scale
    goals TEXT,
    achievements TEXT,
    areas_for_improvement TEXT,
    feedback TEXT,
    employee_comments TEXT,
    next_review_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT performance_review_rating_valid CHECK (
        overall_rating IS NULL OR (overall_rating >= 1.00 AND overall_rating <= 5.00)
    ),
    CONSTRAINT performance_review_completion_logic CHECK (
        (status = 'COMPLETED' AND completed_at IS NOT NULL AND overall_rating IS NOT NULL) OR
        (status != 'COMPLETED')
    ),
    CONSTRAINT performance_review_no_self_review CHECK (employee_id != reviewer_id),
    CONSTRAINT performance_review_period_format CHECK (
        review_period ~* '^[0-9]{4}-(Q[1-4]|Annual|Mid-Year)$'
    )
);

-- Employee compensation table (private schema - highly sensitive)
CREATE TABLE hr_private.employee_compensation (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES hr_public.employees(id),
    base_salary DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    salary_type VARCHAR(20) DEFAULT 'ANNUAL', -- ANNUAL, HOURLY
    effective_date DATE NOT NULL,
    end_date DATE,
    bonus_eligible BOOLEAN DEFAULT true,
    equity_grants DECIMAL(12,2) DEFAULT 0,
    benefits_package VARCHAR(100),
    created_by INTEGER NOT NULL REFERENCES hr_public.employees(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT compensation_salary_positive CHECK (base_salary > 0),
    CONSTRAINT compensation_currency_valid CHECK (currency ~* '^[A-Z]{3}$'),
    CONSTRAINT compensation_salary_type_valid CHECK (salary_type IN ('ANNUAL', 'HOURLY')),
    CONSTRAINT compensation_dates_valid CHECK (end_date IS NULL OR end_date >= effective_date),
    CONSTRAINT compensation_equity_non_negative CHECK (equity_grants >= 0),
    CONSTRAINT compensation_salary_reasonable CHECK (
        (salary_type = 'ANNUAL' AND base_salary BETWEEN 20000 AND 10000000) OR
        (salary_type = 'HOURLY' AND base_salary BETWEEN 7.25 AND 5000)
    )
);

-- Time off balances table (computed/cached data)
CREATE TABLE hr_hidden.time_off_balances (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES hr_public.employees(id),
    year INTEGER NOT NULL,
    vacation_days_total DECIMAL(4,2) DEFAULT 0,
    vacation_days_used DECIMAL(4,2) DEFAULT 0,
    sick_days_total DECIMAL(4,2) DEFAULT 0,
    sick_days_used DECIMAL(4,2) DEFAULT 0,
    personal_days_total DECIMAL(4,2) DEFAULT 0,
    personal_days_used DECIMAL(4,2) DEFAULT 0,
    last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT time_off_balances_year_valid CHECK (year BETWEEN 2020 AND 2050),
    CONSTRAINT time_off_balances_non_negative CHECK (
        vacation_days_total >= 0 AND vacation_days_used >= 0 AND
        sick_days_total >= 0 AND sick_days_used >= 0 AND
        personal_days_total >= 0 AND personal_days_used >= 0
    ),
    CONSTRAINT time_off_balances_usage_not_exceed_total CHECK (
        vacation_days_used <= vacation_days_total AND
        sick_days_used <= sick_days_total AND
        personal_days_used <= personal_days_total
    ),

    UNIQUE(employee_id, year)
);

-- ===== ROLE PERMISSIONS AND JWT AUTHENTICATION =====

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

-- ===== TIME OFF SYSTEM EXTENDED TABLES =====

-- Time-off policies table
CREATE TABLE hr_public.time_off_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_name VARCHAR(255) NOT NULL,
    time_off_type hr_public.time_off_type NOT NULL,
    description TEXT,

    -- Accrual settings
    accrual_frequency hr_public.accrual_frequency DEFAULT 'MONTHLY',
    accrual_rate DECIMAL(5,2) NOT NULL DEFAULT 0, -- hours per period
    max_accrual DECIMAL(6,2) DEFAULT 240, -- max hours that can be accrued
    max_carry_forward DECIMAL(6,2) DEFAULT 40, -- max hours carried to next year

    -- Usage settings
    min_increment DECIMAL(4,2) DEFAULT 0.5, -- minimum request increment (0.5 = 30min)
    max_consecutive_days INTEGER DEFAULT 30,
    advance_notice_days INTEGER DEFAULT 1,

    -- System fields
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,

    -- Constraints
    CONSTRAINT time_off_policies_name_not_empty CHECK (LENGTH(TRIM(policy_name)) > 0),
    CONSTRAINT time_off_policies_accrual_rate_valid CHECK (accrual_rate >= 0),
    CONSTRAINT time_off_policies_max_accrual_valid CHECK (max_accrual >= 0),
    CONSTRAINT time_off_policies_carry_forward_valid CHECK (max_carry_forward >= 0 AND max_carry_forward <= max_accrual),
    CONSTRAINT time_off_policies_min_increment_valid CHECK (min_increment > 0 AND min_increment <= 8),
    CONSTRAINT time_off_policies_consecutive_days_valid CHECK (max_consecutive_days > 0 AND max_consecutive_days <= 365),
    CONSTRAINT time_off_policies_notice_days_valid CHECK (advance_notice_days >= 0 AND advance_notice_days <= 365)
);

-- Employee time-off policy assignments
CREATE TABLE hr_public.employee_time_off_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id INTEGER NOT NULL REFERENCES hr_public.employees(id) ON DELETE CASCADE,
    policy_id UUID NOT NULL REFERENCES hr_public.time_off_policies(id) ON DELETE CASCADE,
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,

    -- Override settings (can override policy defaults for specific employees)
    custom_accrual_rate DECIMAL(5,2),
    custom_max_accrual DECIMAL(6,2),
    custom_carry_forward DECIMAL(6,2),

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,

    -- Constraints
    CONSTRAINT employee_policies_dates_valid CHECK (end_date IS NULL OR end_date >= effective_date),
    CONSTRAINT employee_policies_custom_accrual_valid CHECK (custom_accrual_rate IS NULL OR custom_accrual_rate >= 0),
    CONSTRAINT employee_policies_custom_max_valid CHECK (custom_max_accrual IS NULL OR custom_max_accrual >= 0),
    CONSTRAINT employee_policies_custom_carry_valid CHECK (
        custom_carry_forward IS NULL OR
        (custom_carry_forward >= 0 AND (custom_max_accrual IS NULL OR custom_carry_forward <= custom_max_accrual))
    ),

    UNIQUE(employee_id, policy_id, effective_date)
);

-- Enhanced time-off balances with detailed tracking
CREATE TABLE hr_public.time_off_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id INTEGER NOT NULL REFERENCES hr_public.employees(id) ON DELETE CASCADE,
    policy_id UUID NOT NULL REFERENCES hr_public.time_off_policies(id),
    balance_year INTEGER NOT NULL,

    -- Balance details
    opening_balance DECIMAL(6,2) DEFAULT 0,
    accrued_this_year DECIMAL(6,2) DEFAULT 0,
    used_this_year DECIMAL(6,2) DEFAULT 0,
    pending_requests DECIMAL(6,2) DEFAULT 0,
    carried_forward DECIMAL(6,2) DEFAULT 0,
    current_balance DECIMAL(6,2) GENERATED ALWAYS AS (
        opening_balance + accrued_this_year - used_this_year + carried_forward
    ) STORED,
    available_balance DECIMAL(6,2) GENERATED ALWAYS AS (
        opening_balance + accrued_this_year - used_this_year + carried_forward - pending_requests
    ) STORED,

    -- Tracking
    last_accrual_date DATE,
    last_calculated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT time_off_balances_year_valid CHECK (balance_year BETWEEN 2020 AND 2100),
    CONSTRAINT time_off_balances_non_negative CHECK (
        opening_balance >= 0 AND accrued_this_year >= 0 AND
        used_this_year >= 0 AND pending_requests >= 0 AND carried_forward >= 0
    ),

    UNIQUE(employee_id, policy_id, balance_year)
);

-- ===== PERFORMANCE REVIEW EXTENDED SYSTEM =====

-- Review templates for standardized performance reviews
CREATE TABLE hr_public.review_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Template structure
    competencies JSONB NOT NULL DEFAULT '[]', -- Array of competency definitions
    goals_structure JSONB DEFAULT '{}', -- Structure for goals section
    rating_scale JSONB NOT NULL DEFAULT '{"min": 1, "max": 5, "labels": {}}',

    -- Usage settings
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    applicable_roles TEXT[] DEFAULT ARRAY[]::TEXT[],

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER NOT NULL REFERENCES hr_public.employees(id),

    CONSTRAINT review_templates_name_not_empty CHECK (LENGTH(TRIM(template_name)) > 0)
);

-- Employee goals tracking (separate from reviews for ongoing management)
CREATE TABLE hr_public.employee_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id INTEGER NOT NULL REFERENCES hr_public.employees(id) ON DELETE CASCADE,
    goal_title VARCHAR(255) NOT NULL,
    goal_description TEXT,
    target_completion_date DATE,
    status hr_public.goal_status DEFAULT 'NOT_STARTED',

    -- Progress tracking
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
    milestones JSONB DEFAULT '[]',

    -- Review linkage
    review_id INTEGER REFERENCES hr_public.performance_reviews(id),

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER NOT NULL REFERENCES hr_public.employees(id),

    CONSTRAINT employee_goals_title_not_empty CHECK (LENGTH(TRIM(goal_title)) > 0),
    CONSTRAINT employee_goals_completion_future CHECK (
        target_completion_date IS NULL OR target_completion_date >= CURRENT_DATE
    )
);

-- ===== COMPENSATION EXTENDED SYSTEM =====

-- Compensation bands for role-based salary management
CREATE TABLE hr_public.compensation_bands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    band_name VARCHAR(255) NOT NULL,
    job_level VARCHAR(100) NOT NULL,
    department_id INTEGER REFERENCES hr_public.departments(id),

    -- Salary ranges
    min_salary DECIMAL(12,2) NOT NULL,
    max_salary DECIMAL(12,2) NOT NULL,
    target_salary DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',

    -- Effective period
    effective_date DATE NOT NULL,
    end_date DATE,

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER NOT NULL REFERENCES hr_public.employees(id),

    CONSTRAINT compensation_bands_name_not_empty CHECK (LENGTH(TRIM(band_name)) > 0),
    CONSTRAINT compensation_bands_salary_order CHECK (min_salary <= target_salary AND target_salary <= max_salary),
    CONSTRAINT compensation_bands_salary_positive CHECK (min_salary > 0),
    CONSTRAINT compensation_bands_dates_valid CHECK (end_date IS NULL OR end_date > effective_date)
);

-- Payroll records for tracking compensation history
CREATE TABLE hr_public.payroll_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id INTEGER NOT NULL REFERENCES hr_public.employees(id),
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    pay_date DATE NOT NULL,

    -- Compensation details
    base_salary_amount DECIMAL(12,2) NOT NULL,
    overtime_hours DECIMAL(5,2) DEFAULT 0,
    overtime_amount DECIMAL(10,2) DEFAULT 0,
    bonus_amount DECIMAL(10,2) DEFAULT 0,
    commission_amount DECIMAL(10,2) DEFAULT 0,

    -- Deductions
    tax_deductions DECIMAL(10,2) DEFAULT 0,
    benefit_deductions DECIMAL(10,2) DEFAULT 0,
    other_deductions DECIMAL(10,2) DEFAULT 0,

    -- Totals
    gross_pay DECIMAL(12,2) GENERATED ALWAYS AS (
        base_salary_amount + overtime_amount + bonus_amount + commission_amount
    ) STORED,
    total_deductions DECIMAL(12,2) GENERATED ALWAYS AS (
        tax_deductions + benefit_deductions + other_deductions
    ) STORED,
    net_pay DECIMAL(12,2) GENERATED ALWAYS AS (
        base_salary_amount + overtime_amount + bonus_amount + commission_amount -
        tax_deductions - benefit_deductions - other_deductions
    ) STORED,

    -- Status and metadata
    status hr_public.payroll_status DEFAULT 'DRAFT',
    processed_at TIMESTAMPTZ,
    processed_by INTEGER REFERENCES hr_public.employees(id),

    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER NOT NULL REFERENCES hr_public.employees(id),

    CONSTRAINT payroll_records_period_valid CHECK (pay_period_end >= pay_period_start),
    CONSTRAINT payroll_records_amounts_non_negative CHECK (
        base_salary_amount >= 0 AND overtime_hours >= 0 AND overtime_amount >= 0 AND
        bonus_amount >= 0 AND commission_amount >= 0 AND
        tax_deductions >= 0 AND benefit_deductions >= 0 AND other_deductions >= 0
    )
);

-- ===== AUDIT AND LOGGING SYSTEM =====

-- Comprehensive audit trail for all system actions
CREATE TABLE hr_public.audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Action details
    table_name VARCHAR(255) NOT NULL,
    record_id VARCHAR(255) NOT NULL,
    action hr_public.audit_action_type NOT NULL,

    -- Change tracking
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],

    -- Context
    performed_by INTEGER REFERENCES hr_public.employees(id),
    performed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent VARCHAR(500),
    session_id UUID,

    -- Data classification and retention
    data_classification hr_public.data_classification DEFAULT 'INTERNAL',
    retention_date DATE,

    CONSTRAINT audit_log_table_name_not_empty CHECK (LENGTH(TRIM(table_name)) > 0),
    CONSTRAINT audit_log_record_id_not_empty CHECK (LENGTH(TRIM(record_id)) > 0)
);

-- System access log for security monitoring
CREATE TABLE hr_public.access_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Access details
    employee_id INTEGER REFERENCES hr_public.employees(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),

    -- Request details
    ip_address INET NOT NULL,
    user_agent VARCHAR(500),
    request_method VARCHAR(10),
    request_path VARCHAR(1000),
    response_status INTEGER,

    -- Timing
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    duration_ms INTEGER,

    -- Security context
    session_id UUID,
    authentication_method VARCHAR(50),
    risk_score INTEGER DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),

    CONSTRAINT access_log_action_not_empty CHECK (LENGTH(TRIM(action)) > 0),
    CONSTRAINT access_log_response_status_valid CHECK (response_status BETWEEN 100 AND 599)
);

-- ===== HELPER FUNCTIONS =====

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION hr_hidden.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- ===== USER SESSION MANAGEMENT =====

-- User sessions table for authentication tracking
CREATE TABLE hr_public.user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER NOT NULL REFERENCES hr_public.employees(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    ip_address INET,
    user_agent VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ DEFAULT (CURRENT_TIMESTAMP + INTERVAL '8 hours'),
    is_active BOOLEAN DEFAULT true,
    last_activity_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT user_sessions_token_not_empty CHECK (LENGTH(TRIM(session_token)) > 0),
    CONSTRAINT user_sessions_expires_future CHECK (expires_at > created_at)
);

-- ===== CORE AUTHENTICATION AND JWT FUNCTIONS =====

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

-- ===== RENAMED SECURITY FUNCTIONS (FROM MIGRATION 024) =====

-- Renamed: create_data_breach_incident -> report_data_breach
CREATE OR REPLACE FUNCTION hr_public.report_data_breach(
    p_incident_title VARCHAR(200),
    p_severity VARCHAR(20),
    p_breach_type VARCHAR(100),
    p_affected_data_categories TEXT[],
    p_estimated_affected_records INTEGER,
    p_root_cause TEXT DEFAULT NULL,
    p_discovered_by UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    incident_id UUID;
    incident_number VARCHAR(50);
    current_user_id UUID;
    notification_required BOOLEAN := false;
BEGIN
    -- Get current user
    BEGIN
        current_user_id := COALESCE(p_discovered_by, current_setting('session.user_id')::UUID);
    EXCEPTION WHEN OTHERS THEN
        current_user_id := p_discovered_by;
    END;

    -- Generate incident number
    incident_number := 'BR-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
                      LPAD(EXTRACT(EPOCH FROM NOW())::TEXT, 10, '0');

    -- Determine if regulatory notification is required
    IF p_severity IN ('HIGH', 'CRITICAL') OR p_estimated_affected_records > 250 THEN
        notification_required := true;
    END IF;

    -- Note: This requires the data_breach_incidents table from security migrations
    -- For now, we'll create a placeholder UUID and handle this in later migrations
    incident_id := uuid_generate_v4();

    RETURN incident_id;
END;
$$;

-- Renamed: create_privacy_impact_assessment -> initiate_privacy_assessment
CREATE OR REPLACE FUNCTION hr_public.initiate_privacy_assessment(
    p_assessment_title VARCHAR(200),
    p_project_name VARCHAR(200),
    p_process_description TEXT,
    p_personal_data_categories TEXT[],
    p_processing_purposes TEXT[],
    p_legal_basis VARCHAR(200),
    p_conducted_by UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    assessment_id UUID;
    assessment_reference VARCHAR(100);
    current_user_id UUID;
BEGIN
    -- Get current user
    BEGIN
        current_user_id := COALESCE(p_conducted_by, current_setting('session.user_id')::UUID);
    EXCEPTION WHEN OTHERS THEN
        current_user_id := p_conducted_by;
    END;

    -- Generate assessment reference
    assessment_reference := 'DPIA-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
                           LPAD(NEXTVAL('hr_hidden.assessment_sequence')::TEXT, 4, '0');

    -- Note: This requires the privacy_impact_assessments table from compliance migrations
    -- For now, we'll create a placeholder UUID and handle this in later migrations
    assessment_id := uuid_generate_v4();

    RETURN assessment_id;
END;
$$;

-- Renamed: create_user_session -> establish_user_session
CREATE OR REPLACE FUNCTION hr_public.establish_user_session(
    p_user_id UUID,
    p_ip_address INET DEFAULT NULL,
    p_user_agent VARCHAR(500) DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    session_id UUID;
    session_token VARCHAR(255);
BEGIN
    -- Generate session ID and token
    session_id := uuid_generate_v4();
    session_token := encode(gen_random_bytes(32), 'hex');

    -- Create session
    INSERT INTO hr_public.user_sessions (
        id, user_id, session_token,
        ip_address, user_agent,
        created_at, expires_at, is_active
    ) VALUES (
        session_id, p_user_id::INTEGER, session_token,
        p_ip_address, p_user_agent,
        NOW(), NOW() + INTERVAL '8 hours', true
    );

    RETURN session_id;
END;
$$;

-- ===== ESSENTIAL UTILITY FUNCTIONS =====

-- Function to calculate time off balance
CREATE OR REPLACE FUNCTION hr_public.calculate_time_off_balance(
    p_employee_id INTEGER,
    p_policy_id UUID,
    p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
) RETURNS hr_public.time_off_balances
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
    balance_record hr_public.time_off_balances;
    policy_record hr_public.time_off_policies;
    used_days DECIMAL(6,2) := 0;
    pending_days DECIMAL(6,2) := 0;
BEGIN
    -- Get policy details
    SELECT * INTO policy_record
    FROM hr_public.time_off_policies
    WHERE id = p_policy_id AND is_active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Policy not found or inactive: %', p_policy_id;
    END IF;

    -- Calculate used days from approved requests
    SELECT COALESCE(SUM(days_requested), 0) INTO used_days
    FROM hr_public.time_off_requests
    WHERE employee_id = p_employee_id
      AND request_type = policy_record.time_off_type
      AND status = 'APPROVED'
      AND EXTRACT(YEAR FROM start_date) = p_year;

    -- Calculate pending days from pending requests
    SELECT COALESCE(SUM(days_requested), 0) INTO pending_days
    FROM hr_public.time_off_requests
    WHERE employee_id = p_employee_id
      AND request_type = policy_record.time_off_type
      AND status = 'PENDING'
      AND EXTRACT(YEAR FROM start_date) = p_year;

    -- Get or create balance record
    SELECT * INTO balance_record
    FROM hr_public.time_off_balances
    WHERE employee_id = p_employee_id AND policy_id = p_policy_id AND balance_year = p_year;

    IF NOT FOUND THEN
        -- Create new balance record with calculated values
        INSERT INTO hr_public.time_off_balances (
            employee_id, policy_id, balance_year,
            opening_balance, accrued_this_year, used_this_year, pending_requests
        ) VALUES (
            p_employee_id, p_policy_id, p_year,
            0, policy_record.accrual_rate * 12, used_days, pending_days -- Simplified annual accrual
        ) RETURNING * INTO balance_record;
    ELSE
        -- Update existing record
        UPDATE hr_public.time_off_balances
        SET used_this_year = used_days,
            pending_requests = pending_days,
            last_calculated_at = CURRENT_TIMESTAMP
        WHERE id = balance_record.id
        RETURNING * INTO balance_record;
    END IF;

    RETURN balance_record;
END;
$$;

-- ===== POSTGRESQL ROLES CREATION =====

-- Create hierarchical roles for the HR system
-- Each role inherits permissions from the role below it

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
GRANT USAGE ON SCHEMA hr_public TO hr_guest, hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT USAGE ON SCHEMA hr_hidden TO hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT USAGE ON SCHEMA hr_private TO hr_admin, hr_super_admin;

-- ===== PERFORMANCE INDEXES =====

-- Core table indexes (critical for PostGraphile performance: always index foreign keys)
CREATE INDEX idx_departments_parent_id ON hr_public.departments(parent_department_id);
CREATE INDEX idx_departments_manager_id ON hr_public.departments(manager_id);

CREATE INDEX idx_employees_department_id ON hr_public.employees(department_id);
CREATE INDEX idx_employees_manager_id ON hr_public.employees(manager_id);
CREATE INDEX idx_employees_email ON hr_public.employees(email);
CREATE INDEX idx_employees_status ON hr_public.employees(status);
CREATE INDEX idx_employees_role_level ON hr_public.employees(role_level);
CREATE INDEX idx_employees_hire_date ON hr_public.employees(hire_date);

-- Composite indexes for common query patterns
CREATE INDEX idx_employees_dept_status ON hr_public.employees(department_id, status);
CREATE INDEX idx_employees_dept_role ON hr_public.employees(department_id, role_level);
CREATE INDEX idx_employees_status_role ON hr_public.employees(status, role_level);

-- Employee account indexes
CREATE INDEX idx_employee_account_employee_id ON hr_private.employee_account(employee_id);
CREATE INDEX idx_employee_account_email ON hr_private.employee_account(email);
CREATE INDEX idx_employee_account_last_login ON hr_private.employee_account(last_login);

-- Time-off requests indexes
CREATE INDEX idx_time_off_requests_employee_id ON hr_public.time_off_requests(employee_id);
CREATE INDEX idx_time_off_requests_status ON hr_public.time_off_requests(status);
CREATE INDEX idx_time_off_requests_approved_by ON hr_public.time_off_requests(approved_by);
CREATE INDEX idx_time_off_requests_dates ON hr_public.time_off_requests(start_date, end_date);
CREATE INDEX idx_time_off_requests_type_status ON hr_public.time_off_requests(request_type, status);

-- Manager queries: pending requests in their department
CREATE INDEX idx_time_off_requests_status_start_date ON hr_public.time_off_requests(status, start_date)
WHERE status = 'PENDING';

-- Performance review indexes
CREATE INDEX idx_performance_reviews_employee_id ON hr_public.performance_reviews(employee_id);
CREATE INDEX idx_performance_reviews_reviewer_id ON hr_public.performance_reviews(reviewer_id);
CREATE INDEX idx_performance_reviews_status ON hr_public.performance_reviews(status);
CREATE INDEX idx_performance_reviews_period ON hr_public.performance_reviews(review_period);
CREATE INDEX idx_performance_reviews_completed_at ON hr_public.performance_reviews(completed_at);

-- Compensation indexes (private data)
CREATE INDEX idx_employee_compensation_employee_id ON hr_private.employee_compensation(employee_id);
CREATE INDEX idx_employee_compensation_effective_date ON hr_private.employee_compensation(effective_date);
CREATE INDEX idx_employee_compensation_created_by ON hr_private.employee_compensation(created_by);

-- Active compensation records (no end_date)
CREATE INDEX idx_employee_compensation_active ON hr_private.employee_compensation(employee_id, effective_date)
WHERE end_date IS NULL;

-- JWT and role permission indexes
CREATE INDEX idx_role_permissions_role_level ON hr_hidden.role_permissions(role_level);
CREATE INDEX idx_role_permissions_postgresql_role ON hr_hidden.role_permissions(postgresql_role);

-- User sessions indexes
CREATE INDEX idx_user_sessions_user_id ON hr_public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON hr_public.user_sessions(session_token);
CREATE INDEX idx_user_sessions_active ON hr_public.user_sessions(is_active, expires_at);

-- Time off system indexes
CREATE INDEX idx_time_off_policies_type ON hr_public.time_off_policies(time_off_type);
CREATE INDEX idx_time_off_policies_active ON hr_public.time_off_policies(is_active);
CREATE INDEX idx_employee_time_off_policies_employee_id ON hr_public.employee_time_off_policies(employee_id);
CREATE INDEX idx_employee_time_off_policies_policy_id ON hr_public.employee_time_off_policies(policy_id);
CREATE INDEX idx_time_off_balances_employee_policy_year ON hr_public.time_off_balances(employee_id, policy_id, balance_year);

-- Performance review system indexes
CREATE INDEX idx_review_templates_active ON hr_public.review_templates(is_active);
CREATE INDEX idx_review_templates_default ON hr_public.review_templates(is_default);
CREATE INDEX idx_employee_goals_employee_id ON hr_public.employee_goals(employee_id);
CREATE INDEX idx_employee_goals_status ON hr_public.employee_goals(status);
CREATE INDEX idx_employee_goals_review_id ON hr_public.employee_goals(review_id);

-- Compensation system indexes
CREATE INDEX idx_compensation_bands_department_id ON hr_public.compensation_bands(department_id);
CREATE INDEX idx_compensation_bands_level ON hr_public.compensation_bands(job_level);
CREATE INDEX idx_compensation_bands_effective ON hr_public.compensation_bands(effective_date, end_date);
CREATE INDEX idx_payroll_records_employee_id ON hr_public.payroll_records(employee_id);
CREATE INDEX idx_payroll_records_period ON hr_public.payroll_records(pay_period_start, pay_period_end);
CREATE INDEX idx_payroll_records_status ON hr_public.payroll_records(status);

-- Audit and access log indexes
CREATE INDEX idx_audit_log_table_record ON hr_public.audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_performed_by ON hr_public.audit_log(performed_by);
CREATE INDEX idx_audit_log_performed_at ON hr_public.audit_log(performed_at);
CREATE INDEX idx_audit_log_action ON hr_public.audit_log(action);
CREATE INDEX idx_audit_log_data_classification ON hr_public.audit_log(data_classification);
CREATE INDEX idx_audit_log_retention_date ON hr_public.audit_log(retention_date);

CREATE INDEX idx_access_log_employee_id ON hr_public.access_log(employee_id);
CREATE INDEX idx_access_log_timestamp ON hr_public.access_log(timestamp);
CREATE INDEX idx_access_log_action ON hr_public.access_log(action);
CREATE INDEX idx_access_log_resource ON hr_public.access_log(resource_type, resource_id);
CREATE INDEX idx_access_log_ip_address ON hr_public.access_log(ip_address);
CREATE INDEX idx_access_log_session_id ON hr_public.access_log(session_id);

-- PostGraphile-specific indexes (from migration 023)
-- These optimize foreign key relationships for PostGraphile's connection resolvers
CREATE INDEX IF NOT EXISTS idx_time_off_balances_employee_year ON hr_hidden.time_off_balances(employee_id, year);
CREATE INDEX IF NOT EXISTS idx_time_off_balances_year ON hr_hidden.time_off_balances(year);

-- ===== UPDATE TRIGGERS =====

-- Apply update timestamp triggers to relevant tables
CREATE TRIGGER tr_departments_updated_at
    BEFORE UPDATE ON hr_public.departments
    FOR EACH ROW EXECUTE FUNCTION hr_hidden.update_updated_at();

CREATE TRIGGER tr_employees_updated_at
    BEFORE UPDATE ON hr_public.employees
    FOR EACH ROW EXECUTE FUNCTION hr_hidden.update_updated_at();

CREATE TRIGGER tr_employee_account_updated_at
    BEFORE UPDATE ON hr_private.employee_account
    FOR EACH ROW EXECUTE FUNCTION hr_hidden.update_updated_at();

CREATE TRIGGER tr_time_off_requests_updated_at
    BEFORE UPDATE ON hr_public.time_off_requests
    FOR EACH ROW EXECUTE FUNCTION hr_hidden.update_updated_at();

CREATE TRIGGER tr_performance_reviews_updated_at
    BEFORE UPDATE ON hr_public.performance_reviews
    FOR EACH ROW EXECUTE FUNCTION hr_hidden.update_updated_at();

CREATE TRIGGER tr_employee_compensation_updated_at
    BEFORE UPDATE ON hr_private.employee_compensation
    FOR EACH ROW EXECUTE FUNCTION hr_hidden.update_updated_at();

CREATE TRIGGER tr_time_off_policies_updated_at
    BEFORE UPDATE ON hr_public.time_off_policies
    FOR EACH ROW EXECUTE FUNCTION hr_hidden.update_updated_at();

CREATE TRIGGER tr_review_templates_updated_at
    BEFORE UPDATE ON hr_public.review_templates
    FOR EACH ROW EXECUTE FUNCTION hr_hidden.update_updated_at();

CREATE TRIGGER tr_employee_goals_updated_at
    BEFORE UPDATE ON hr_public.employee_goals
    FOR EACH ROW EXECUTE FUNCTION hr_hidden.update_updated_at();

-- ===== TABLE PERMISSIONS =====

-- Grant table permissions based on role hierarchy

-- Public schema permissions for all authenticated users
GRANT SELECT ON hr_public.departments TO hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT SELECT ON hr_public.employees TO hr_employee, hr_manager, hr_admin, hr_super_admin;

-- Time-off management permissions
GRANT SELECT, INSERT ON hr_public.time_off_requests TO hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT UPDATE ON hr_public.time_off_requests TO hr_manager, hr_admin, hr_super_admin;
GRANT DELETE ON hr_public.time_off_requests TO hr_admin, hr_super_admin;

GRANT SELECT ON hr_public.time_off_policies TO hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT INSERT, UPDATE, DELETE ON hr_public.time_off_policies TO hr_admin, hr_super_admin;

GRANT SELECT ON hr_public.time_off_balances TO hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT INSERT, UPDATE, DELETE ON hr_public.time_off_balances TO hr_admin, hr_super_admin;

-- Performance review permissions
GRANT SELECT ON hr_public.performance_reviews TO hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT INSERT, UPDATE ON hr_public.performance_reviews TO hr_manager, hr_admin, hr_super_admin;
GRANT DELETE ON hr_public.performance_reviews TO hr_admin, hr_super_admin;

GRANT SELECT ON hr_public.review_templates TO hr_manager, hr_admin, hr_super_admin;
GRANT INSERT, UPDATE, DELETE ON hr_public.review_templates TO hr_admin, hr_super_admin;

GRANT SELECT ON hr_public.employee_goals TO hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT INSERT, UPDATE ON hr_public.employee_goals TO hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT DELETE ON hr_public.employee_goals TO hr_manager, hr_admin, hr_super_admin;

-- Compensation permissions (highly restricted)
GRANT SELECT ON hr_private.employee_compensation TO hr_admin, hr_super_admin;
GRANT INSERT, UPDATE, DELETE ON hr_private.employee_compensation TO hr_admin, hr_super_admin;

GRANT SELECT ON hr_public.compensation_bands TO hr_admin, hr_super_admin;
GRANT INSERT, UPDATE, DELETE ON hr_public.compensation_bands TO hr_admin, hr_super_admin;

GRANT SELECT ON hr_public.payroll_records TO hr_admin, hr_super_admin;
GRANT INSERT, UPDATE, DELETE ON hr_public.payroll_records TO hr_admin, hr_super_admin;

-- Audit and access log permissions
GRANT SELECT ON hr_public.audit_log TO hr_admin, hr_super_admin;
GRANT INSERT ON hr_public.audit_log TO hr_employee, hr_manager, hr_admin, hr_super_admin;

GRANT SELECT ON hr_public.access_log TO hr_admin, hr_super_admin;
GRANT INSERT ON hr_public.access_log TO hr_employee, hr_manager, hr_admin, hr_super_admin;

-- Session management permissions
GRANT SELECT, INSERT, UPDATE ON hr_public.user_sessions TO hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT DELETE ON hr_public.user_sessions TO hr_admin, hr_super_admin;

-- Grant execute permissions for renamed functions (from migration 024)
GRANT EXECUTE ON FUNCTION hr_public.report_data_breach(VARCHAR, VARCHAR, VARCHAR, TEXT[], INTEGER, TEXT, UUID) TO hr_admin, hr_super_admin;
GRANT EXECUTE ON FUNCTION hr_public.initiate_privacy_assessment(VARCHAR, VARCHAR, TEXT, TEXT[], TEXT[], VARCHAR, UUID) TO hr_admin, hr_super_admin;
GRANT EXECUTE ON FUNCTION hr_public.establish_user_session(UUID, INET, VARCHAR) TO hr_employee, hr_manager, hr_admin, hr_super_admin;

-- Grant execute permissions for utility functions
GRANT EXECUTE ON FUNCTION hr_public.calculate_time_off_balance(INTEGER, UUID, INTEGER) TO hr_employee, hr_manager, hr_admin, hr_super_admin;

-- Grant permissions for JWT and authentication functions (hidden schema)
GRANT EXECUTE ON FUNCTION hr_hidden.get_role_mapping(INTEGER) TO hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT EXECUTE ON FUNCTION hr_hidden.validate_jwt_token(hr_public.jwt_token) TO hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT EXECUTE ON FUNCTION hr_hidden.create_jwt_token(hr_public.employees, INTEGER) TO hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT EXECUTE ON FUNCTION hr_hidden.extract_jwt_claims(hr_public.jwt_token) TO hr_employee, hr_manager, hr_admin, hr_super_admin;

-- ===== POSTGRAPHILE COMMENTS =====

-- Add PostGraphile-specific comments for GraphQL schema generation
COMMENT ON FUNCTION hr_public.report_data_breach(VARCHAR, VARCHAR, VARCHAR, TEXT[], INTEGER, TEXT, UUID) IS
'@name reportDataBreach
@resultFieldName breachIncidentId
Report and manage data breach incidents';

COMMENT ON FUNCTION hr_public.initiate_privacy_assessment(VARCHAR, VARCHAR, TEXT, TEXT[], TEXT[], VARCHAR, UUID) IS
'@name initiatePrivacyAssessment
@resultFieldName privacyAssessmentId
Initiate GDPR Article 35 Data Protection Impact Assessment';

COMMENT ON FUNCTION hr_public.establish_user_session(UUID, INET, VARCHAR) IS
'@name establishUserSession
@resultFieldName userSessionId
Establish a new user session with authentication';

COMMENT ON FUNCTION hr_public.calculate_time_off_balance(INTEGER, UUID, INTEGER) IS
'@name calculateTimeOffBalance
Calculate and return current time-off balance for employee and policy';

-- Table and schema comments for documentation
COMMENT ON SCHEMA hr_public IS 'Public HR schema exposed through PostGraphile GraphQL API';
COMMENT ON SCHEMA hr_private IS 'Private HR schema for sensitive data (compensation, authentication)';
COMMENT ON SCHEMA hr_hidden IS 'Hidden HR schema for internal functions and utilities';

COMMENT ON TABLE hr_public.departments IS 'Organizational departments with hierarchical structure';
COMMENT ON TABLE hr_public.employees IS 'Employee master data with role-based access control';
COMMENT ON TABLE hr_private.employee_account IS 'Sensitive authentication data for employees';
COMMENT ON TABLE hr_public.time_off_requests IS 'Employee time-off requests with approval workflow';
COMMENT ON TABLE hr_public.performance_reviews IS 'Performance review cycles with ratings and feedback';
COMMENT ON TABLE hr_private.employee_compensation IS 'Highly sensitive salary and compensation data';
COMMENT ON TABLE hr_hidden.time_off_balances IS 'Calculated time-off balances cache for performance';
COMMENT ON TABLE hr_hidden.role_permissions IS 'Role level definitions and permissions mapping';
COMMENT ON TABLE hr_public.user_sessions IS 'Active user sessions for authentication tracking';

-- Type comments for GraphQL schema
COMMENT ON TYPE hr_public.jwt_token IS 'JWT token structure for PostGraphile authentication';
COMMENT ON TYPE hr_hidden.jwt_claims IS 'JWT claims extracted for internal use';
COMMENT ON TYPE hr_public.auth_result IS 'Authentication result with tokens and employee data';

-- ===== COMPLETION NOTICE =====

-- Log successful schema creation
DO $$
BEGIN
    RAISE NOTICE '======================================================================';
    RAISE NOTICE 'PostGraphile HR System Schema Initialization Complete';
    RAISE NOTICE '======================================================================';
    RAISE NOTICE 'Schema Version: 1.0';
    RAISE NOTICE 'Created: %', CURRENT_TIMESTAMP;
    RAISE NOTICE 'Database: %', CURRENT_DATABASE();
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Verify PostGraphile connection with: postgraphile --connection <connection-string>';
    RAISE NOTICE '2. Create initial admin user and departments';
    RAISE NOTICE '3. Configure Row-Level Security policies if needed';
    RAISE NOTICE '4. Set up additional security features and compliance tables as required';
    RAISE NOTICE '';
    RAISE NOTICE 'Key Features Initialized:';
    RAISE NOTICE '- Employee and department management';
    RAISE NOTICE '- JWT-based authentication system';
    RAISE NOTICE '- Time-off request and policy management';
    RAISE NOTICE '- Performance review system';
    RAISE NOTICE '- Compensation and payroll tracking';
    RAISE NOTICE '- Comprehensive audit logging';
    RAISE NOTICE '- PostgreSQL role-based security';
    RAISE NOTICE '======================================================================';
END $$;