-- PostgreSQL schema for SvelteHR development containers
-- This script creates the complete HR schema with tables, constraints, and relationships

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- Create schemas
CREATE SCHEMA IF NOT EXISTS hr_hidden;
COMMENT ON SCHEMA hr_hidden IS 'Hidden HR schema for internal functions and utilities';

CREATE SCHEMA IF NOT EXISTS hr_private;
COMMENT ON SCHEMA hr_private IS 'Private HR schema for sensitive data (compensation, authentication)';

CREATE SCHEMA IF NOT EXISTS hr_public;
COMMENT ON SCHEMA hr_public IS 'Public HR schema exposed through PostGraphile GraphQL API';

-- Create types
CREATE TYPE hr_public.employee_status AS ENUM ('ACTIVE', 'INACTIVE', 'TERMINATED', 'ON_LEAVE');
CREATE TYPE hr_public.leave_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
CREATE TYPE hr_public.leave_type AS ENUM ('annual', 'sick', 'personal', 'maternity', 'paternity');
CREATE TYPE hr_public.review_status AS ENUM ('not_started', 'in_progress', 'completed');

-- Users table
CREATE TABLE hr_public.users (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    first_name character varying(255) NOT NULL,
    last_name character varying(255) NOT NULL,
    display_name character varying(255) GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
    role character varying(50) DEFAULT 'hr_employee'::character varying NOT NULL,
    department_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    failed_login_attempts integer DEFAULT 0,
    locked_until timestamp with time zone,
    last_login timestamp with time zone,
    hire_date date,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_email_key UNIQUE (email),
    CONSTRAINT users_email_format CHECK (((email)::text ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text)),
    CONSTRAINT users_names_not_empty CHECK (((length(TRIM(BOTH FROM first_name)) > 0) AND (length(TRIM(BOTH FROM last_name)) > 0)))
);

-- Departments table
CREATE TABLE hr_public.departments (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    manager_id uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT departments_pkey PRIMARY KEY (id),
    CONSTRAINT departments_name_key UNIQUE (name)
);

-- Leave requests table
CREATE TABLE hr_public.leave_requests (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    employee_id uuid NOT NULL,
    manager_id uuid,
    leave_type hr_public.leave_type NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    days_requested integer NOT NULL,
    status hr_public.leave_status DEFAULT 'pending'::hr_public.leave_status NOT NULL,
    reason text,
    manager_comments text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT leave_requests_pkey PRIMARY KEY (id),
    CONSTRAINT leave_requests_dates_valid CHECK ((end_date >= start_date)),
    CONSTRAINT leave_requests_days_positive CHECK ((days_requested > 0)),
    CONSTRAINT leave_requests_no_self_approval CHECK ((employee_id != manager_id))
);

-- Performance reviews table
CREATE TABLE hr_public.performance_reviews (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    employee_id uuid NOT NULL,
    reviewer_id uuid NOT NULL,
    review_period character varying(50) NOT NULL,
    status hr_public.review_status DEFAULT 'not_started'::hr_public.review_status NOT NULL,
    overall_rating numeric(2,1),
    goals text,
    achievements text,
    areas_for_improvement text,
    manager_feedback text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT performance_reviews_pkey PRIMARY KEY (id),
    CONSTRAINT performance_reviews_no_self_review CHECK ((employee_id != reviewer_id)),
    CONSTRAINT performance_reviews_rating_range CHECK (((overall_rating >= (1.0)::numeric) AND (overall_rating <= (5.0)::numeric)))
);

-- User role assignments table
CREATE TABLE hr_public.user_role_assignments (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    role_name character varying(50) NOT NULL,
    assigned_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT user_role_assignments_pkey PRIMARY KEY (id),
    CONSTRAINT user_role_assignments_user_role_unique UNIQUE (user_id, role_name)
);

-- Time off policies table
CREATE TABLE hr_public.time_off_policies (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    days_per_year integer NOT NULL,
    requires_approval boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT time_off_policies_pkey PRIMARY KEY (id),
    CONSTRAINT time_off_policies_name_key UNIQUE (name),
    CONSTRAINT time_off_policies_days_positive CHECK ((days_per_year > 0))
);

-- Time off balances table
CREATE TABLE hr_public.time_off_balances (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    employee_id uuid NOT NULL,
    policy_id uuid NOT NULL,
    balance_days numeric(5,2) DEFAULT 0.0 NOT NULL,
    used_days numeric(5,2) DEFAULT 0.0 NOT NULL,
    year integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT time_off_balances_pkey PRIMARY KEY (id),
    CONSTRAINT time_off_balances_employee_policy_year_unique UNIQUE (employee_id, policy_id, year)
);

-- Employee goals table
CREATE TABLE hr_public.employee_goals (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    employee_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    target_date date,
    status character varying(50) DEFAULT 'in_progress'::character varying NOT NULL,
    progress_percentage integer DEFAULT 0,
    created_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT employee_goals_pkey PRIMARY KEY (id),
    CONSTRAINT employee_goals_progress_range CHECK (((progress_percentage >= 0) AND (progress_percentage <= 100)))
);

-- Compensation bands table
CREATE TABLE hr_public.compensation_bands (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    title character varying(255) NOT NULL,
    min_salary numeric(12,2) NOT NULL,
    max_salary numeric(12,2) NOT NULL,
    currency character varying(3) DEFAULT 'USD'::character varying NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT compensation_bands_pkey PRIMARY KEY (id),
    CONSTRAINT compensation_bands_salary_range CHECK ((max_salary > min_salary))
);

-- Payroll records table
CREATE TABLE hr_public.payroll_records (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    employee_id uuid NOT NULL,
    pay_period_start date NOT NULL,
    pay_period_end date NOT NULL,
    gross_pay numeric(12,2) NOT NULL,
    net_pay numeric(12,2) NOT NULL,
    processed_by uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT payroll_records_pkey PRIMARY KEY (id),
    CONSTRAINT payroll_records_pay_period_valid CHECK ((pay_period_end >= pay_period_start)),
    CONSTRAINT payroll_records_pay_positive CHECK (((gross_pay > (0)::numeric) AND (net_pay > (0)::numeric)))
);

-- Review templates table
CREATE TABLE hr_public.review_templates (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    template_data jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT review_templates_pkey PRIMARY KEY (id)
);

-- Tasks table (core functionality)
-- REMOVED: Old integer-based tasks table conflicts with new UUID-based tasks system (Feature 028)
-- The new tasks system is created by migrations 20251009_000 through 20251009_008
-- These create a full-featured task system with:
-- - UUID-based IDs for consistency with users table
-- - Task types, hierarchies, dependencies, and audit trails
-- - Multi-assignee support
-- - Located in public schema (not hr_public)
--
-- CREATE TYPE hr_public.task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
-- CREATE TYPE hr_public.task_status AS ENUM ('todo', 'in_progress', 'completed', 'cancelled');
--
-- CREATE TABLE hr_public.tasks (
--     id integer NOT NULL GENERATED ALWAYS AS IDENTITY,
--     assignee_id integer NOT NULL,  -- INCOMPATIBLE: users.id is UUID, not integer
--     assigner_id integer NOT NULL,
--     department_id integer NOT NULL,
--     ...
-- );

-- Attendance records table (core functionality)
CREATE TABLE hr_public.attendance_records (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    date date NOT NULL,
    clock_in timestamp with time zone,
    clock_out timestamp with time zone,
    hours_worked numeric(5,2),
    status character varying(50) DEFAULT 'present'::character varying NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT attendance_records_pkey PRIMARY KEY (id),
    CONSTRAINT attendance_records_unique_user_date UNIQUE (user_id, date),
    CONSTRAINT attendance_records_hours_valid CHECK (hours_worked >= 0 AND hours_worked <= 24)
);

-- Events table (core functionality)
CREATE TYPE hr_public.event_type AS ENUM ('meeting', 'training', 'social', 'company_event', 'holiday', 'interview', 'review', 'team_building', 'other');
CREATE TYPE hr_public.event_status AS ENUM ('draft', 'scheduled', 'in_progress', 'completed', 'cancelled');
CREATE TYPE hr_public.event_visibility AS ENUM ('public', 'private', 'department', 'team');
CREATE TYPE hr_public.rsvp_status AS ENUM ('pending', 'accepted', 'declined', 'tentative');

CREATE TABLE hr_public.events (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    event_type hr_public.event_type DEFAULT 'other'::hr_public.event_type NOT NULL,
    status hr_public.event_status DEFAULT 'draft'::hr_public.event_status NOT NULL,
    visibility_type hr_public.event_visibility DEFAULT 'public'::hr_public.event_visibility NOT NULL,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    all_day boolean DEFAULT false NOT NULL,
    location character varying(255),
    is_public boolean DEFAULT true NOT NULL,
    color character varying(7) DEFAULT '#3B82F6'::character varying,
    organizer_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT events_pkey PRIMARY KEY (id),
    CONSTRAINT events_title_not_empty CHECK (length(TRIM(BOTH FROM title)) > 0),
    CONSTRAINT events_time_logic CHECK (end_time > start_time)
);

-- Event attendees junction table
CREATE TABLE hr_public.event_attendees (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    event_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    response_status hr_public.rsvp_status DEFAULT 'pending'::hr_public.rsvp_status NOT NULL,
    is_required boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT event_attendees_pkey PRIMARY KEY (id),
    CONSTRAINT event_attendees_unique UNIQUE (event_id, employee_id)
);

-- Activity logs table (core functionality)
CREATE TABLE hr_public.activity_logs (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    employee_id uuid,
    action character varying(50) NOT NULL,
    resource_type character varying(50) NOT NULL,
    resource_id uuid,
    details jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT activity_logs_pkey PRIMARY KEY (id)
);

-- Add foreign key constraints
ALTER TABLE hr_public.users ADD CONSTRAINT users_department_id_fkey FOREIGN KEY (department_id) REFERENCES hr_public.departments(id) ON DELETE SET NULL;
ALTER TABLE hr_public.departments ADD CONSTRAINT departments_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES hr_public.users(id) ON DELETE SET NULL;
ALTER TABLE hr_public.leave_requests ADD CONSTRAINT leave_requests_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr_public.users(id) ON DELETE CASCADE;
ALTER TABLE hr_public.leave_requests ADD CONSTRAINT leave_requests_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES hr_public.users(id) ON DELETE SET NULL;
ALTER TABLE hr_public.performance_reviews ADD CONSTRAINT performance_reviews_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr_public.users(id) ON DELETE CASCADE;
ALTER TABLE hr_public.performance_reviews ADD CONSTRAINT performance_reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES hr_public.users(id) ON DELETE CASCADE;
ALTER TABLE hr_public.user_role_assignments ADD CONSTRAINT user_role_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES hr_public.users(id) ON DELETE CASCADE;
ALTER TABLE hr_public.user_role_assignments ADD CONSTRAINT user_role_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES hr_public.users(id) ON DELETE SET NULL;
ALTER TABLE hr_public.time_off_balances ADD CONSTRAINT time_off_balances_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr_public.users(id) ON DELETE CASCADE;
ALTER TABLE hr_public.time_off_balances ADD CONSTRAINT time_off_balances_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES hr_public.time_off_policies(id) ON DELETE CASCADE;
ALTER TABLE hr_public.employee_goals ADD CONSTRAINT employee_goals_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr_public.users(id) ON DELETE CASCADE;
ALTER TABLE hr_public.employee_goals ADD CONSTRAINT employee_goals_created_by_fkey FOREIGN KEY (created_by) REFERENCES hr_public.users(id) ON DELETE SET NULL;
ALTER TABLE hr_public.compensation_bands ADD CONSTRAINT compensation_bands_created_by_fkey FOREIGN KEY (created_by) REFERENCES hr_public.users(id) ON DELETE SET NULL;
ALTER TABLE hr_public.payroll_records ADD CONSTRAINT payroll_records_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr_public.users(id) ON DELETE CASCADE;
ALTER TABLE hr_public.payroll_records ADD CONSTRAINT payroll_records_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES hr_public.users(id) ON DELETE SET NULL;
ALTER TABLE hr_public.payroll_records ADD CONSTRAINT payroll_records_created_by_fkey FOREIGN KEY (created_by) REFERENCES hr_public.users(id) ON DELETE SET NULL;
ALTER TABLE hr_public.review_templates ADD CONSTRAINT review_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES hr_public.users(id) ON DELETE SET NULL;
-- REMOVED: Foreign key constraints for old hr_public.tasks table (see comment above)
-- ALTER TABLE hr_public.tasks ADD CONSTRAINT tasks_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES hr_public.users(id) ON DELETE CASCADE;
-- ALTER TABLE hr_public.tasks ADD CONSTRAINT tasks_assigner_id_fkey FOREIGN KEY (assigner_id) REFERENCES hr_public.users(id) ON DELETE CASCADE;
-- ALTER TABLE hr_public.tasks ADD CONSTRAINT tasks_department_id_fkey FOREIGN KEY (department_id) REFERENCES hr_public.departments(id) ON DELETE CASCADE;
ALTER TABLE hr_public.attendance_records ADD CONSTRAINT attendance_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES hr_public.users(id) ON DELETE CASCADE;
ALTER TABLE hr_public.events ADD CONSTRAINT events_organizer_id_fkey FOREIGN KEY (organizer_id) REFERENCES hr_public.users(id) ON DELETE CASCADE;
ALTER TABLE hr_public.event_attendees ADD CONSTRAINT event_attendees_event_id_fkey FOREIGN KEY (event_id) REFERENCES hr_public.events(id) ON DELETE CASCADE;
ALTER TABLE hr_public.event_attendees ADD CONSTRAINT event_attendees_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr_public.users(id) ON DELETE CASCADE;
ALTER TABLE hr_public.activity_logs ADD CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES hr_public.users(id) ON DELETE CASCADE;
ALTER TABLE hr_public.activity_logs ADD CONSTRAINT activity_logs_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES hr_public.users(id) ON DELETE CASCADE;

-- Grant schema access permissions (added during initialization file reorganization)
GRANT USAGE ON SCHEMA hr_public TO guest, employee, manager, admin, super_admin;
GRANT USAGE ON SCHEMA hr_private TO admin, super_admin;
GRANT USAGE ON SCHEMA hr_hidden TO super_admin;