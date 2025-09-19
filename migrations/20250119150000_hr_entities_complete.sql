-- HR Entities Complete Schema Migration
-- Adds comprehensive HR management tables for employee lifecycle management
-- Run after: 20250119140000_hr_feature_extensions_fixed.sql

-- Start transaction
BEGIN;

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enums for HR entities
DO $$ BEGIN
    -- Employment Type enum
    CREATE TYPE hr_public.employment_type AS ENUM (
        'FullTime',
        'PartTime',
        'Contract',
        'Intern',
        'Consultant'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    -- Onboarding Status enum
    CREATE TYPE hr_public.onboarding_status AS ENUM (
        'PreHire',
        'Onboarding',
        'Active',
        'Leave',
        'Terminated',
        'Alumni'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    -- Leave Type enum
    CREATE TYPE hr_public.leave_type AS ENUM (
        'Vacation',
        'Sick',
        'Personal',
        'Maternity',
        'Paternity',
        'Bereavement',
        'Unpaid'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    -- Leave Status enum
    CREATE TYPE hr_public.leave_status AS ENUM (
        'Pending',
        'Approved',
        'Rejected',
        'Cancelled',
        'InProgress',
        'Completed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    -- Attendance Status enum
    CREATE TYPE hr_public.attendance_status AS ENUM (
        'Present',
        'Absent',
        'Late',
        'PartialDay',
        'Holiday',
        'Vacation',
        'Sick'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    -- Performance Rating enum
    CREATE TYPE hr_public.performance_rating AS ENUM (
        'Exceeds',
        'Meets',
        'Approaching',
        'Below'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    -- Training Status enum
    CREATE TYPE hr_public.training_status AS ENUM (
        'NotStarted',
        'InProgress',
        'Completed',
        'Expired',
        'Failed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    -- Document Type enum
    CREATE TYPE hr_public.document_type AS ENUM (
        'Contract',
        'Handbook',
        'Policy',
        'Training',
        'Certificate',
        'Review',
        'Personal',
        'Legal',
        'Other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Extend users table with additional HR fields if they don't exist
DO $$ BEGIN
    ALTER TABLE hr_public.users ADD COLUMN employee_id VARCHAR(50);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE hr_public.users ADD COLUMN job_title VARCHAR(100);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE hr_public.users ADD COLUMN employment_type hr_public.employment_type DEFAULT 'FullTime';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE hr_public.users ADD COLUMN onboarding_status hr_public.onboarding_status DEFAULT 'PreHire';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE hr_public.users ADD COLUMN phone_number VARCHAR(20);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE hr_public.users ADD COLUMN work_phone_number VARCHAR(20);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE hr_public.users ADD COLUMN address_line1 VARCHAR(100);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE hr_public.users ADD COLUMN address_line2 VARCHAR(100);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE hr_public.users ADD COLUMN address_city VARCHAR(50);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE hr_public.users ADD COLUMN address_state VARCHAR(50);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE hr_public.users ADD COLUMN address_postal_code VARCHAR(20);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE hr_public.users ADD COLUMN address_country VARCHAR(50) DEFAULT 'United States';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE hr_public.users ADD COLUMN emergency_contact_name VARCHAR(100);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE hr_public.users ADD COLUMN emergency_contact_phone VARCHAR(20);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE hr_public.users ADD COLUMN emergency_contact_relationship VARCHAR(50);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE hr_public.users ADD COLUMN date_of_birth DATE;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE hr_public.users ADD COLUMN gender VARCHAR(20);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE hr_public.users ADD COLUMN nationality VARCHAR(50);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE hr_public.users ADD COLUMN last_login TIMESTAMPTZ;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Create Leave Policies table
CREATE TABLE IF NOT EXISTS hr_public.leave_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    leave_type hr_public.leave_type NOT NULL,
    description TEXT,
    accrual_rate DECIMAL(8,2), -- Hours per pay period
    max_accrual DECIMAL(8,2), -- Maximum hours that can be accrued
    max_carryover DECIMAL(8,2), -- Maximum hours that can carry over
    requires_approval BOOLEAN NOT NULL DEFAULT true,
    advance_notice_days INTEGER NOT NULL DEFAULT 0,
    max_consecutive_days INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create Leave Balances table
CREATE TABLE IF NOT EXISTS hr_public.leave_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    leave_policy_id UUID NOT NULL REFERENCES hr_public.leave_policies(id) ON DELETE CASCADE,
    accrued_hours DECIMAL(8,2) NOT NULL DEFAULT 0,
    used_hours DECIMAL(8,2) NOT NULL DEFAULT 0,
    pending_hours DECIMAL(8,2) NOT NULL DEFAULT 0,
    year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(employee_id, leave_policy_id, year)
);

-- Create Leave Requests table
CREATE TABLE IF NOT EXISTS hr_public.leave_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    leave_policy_id UUID NOT NULL REFERENCES hr_public.leave_policies(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    hours_requested DECIMAL(8,2) NOT NULL,
    reason TEXT,
    status hr_public.leave_status NOT NULL DEFAULT 'Pending',
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_by UUID REFERENCES hr_public.users(id),
    reviewed_at TIMESTAMPTZ,
    review_comments TEXT,
    cancelled_at TIMESTAMPTZ,
    cancel_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_date_range CHECK (end_date >= start_date),
    CONSTRAINT positive_hours CHECK (hours_requested > 0)
);

-- Create Attendance Records table
CREATE TABLE IF NOT EXISTS hr_public.attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    clock_in_time TIMESTAMPTZ,
    clock_out_time TIMESTAMPTZ,
    break_start_time TIMESTAMPTZ,
    break_end_time TIMESTAMPTZ,
    total_hours DECIMAL(8,2),
    overtime_hours DECIMAL(8,2) DEFAULT 0,
    status hr_public.attendance_status NOT NULL DEFAULT 'Present',
    location VARCHAR(200),
    ip_address INET,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    notes TEXT,
    approved_by UUID REFERENCES hr_public.users(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(employee_id, date),
    CONSTRAINT valid_clock_times CHECK (
        (clock_in_time IS NULL AND clock_out_time IS NULL) OR
        (clock_in_time IS NOT NULL AND (clock_out_time IS NULL OR clock_out_time > clock_in_time))
    )
);

-- Create Performance Cycles table
CREATE TABLE IF NOT EXISTS hr_public.performance_cycles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    review_due_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_cycle_dates CHECK (end_date > start_date AND review_due_date >= end_date)
);

-- Create Performance Reviews table
CREATE TABLE IF NOT EXISTS hr_public.performance_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES hr_public.users(id),
    cycle_id UUID REFERENCES hr_public.performance_cycles(id),
    review_period_start DATE NOT NULL,
    review_period_end DATE NOT NULL,
    overall_rating hr_public.performance_rating,
    goals_rating hr_public.performance_rating,
    competencies_rating hr_public.performance_rating,
    self_assessment TEXT,
    manager_comments TEXT,
    employee_comments TEXT,
    development_goals TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft',
    submitted_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_review_period CHECK (review_period_end > review_period_start)
);

-- Create Performance Goals table
CREATE TABLE IF NOT EXISTS hr_public.performance_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    review_id UUID REFERENCES hr_public.performance_reviews(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    target_completion_date DATE,
    weight INTEGER CHECK (weight >= 0 AND weight <= 100),
    status VARCHAR(50) NOT NULL DEFAULT 'Active',
    progress_percentage INTEGER NOT NULL DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    final_rating hr_public.performance_rating,
    manager_notes TEXT,
    employee_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create Training Programs table
CREATE TABLE IF NOT EXISTS hr_public.training_programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    type VARCHAR(100),
    is_mandatory BOOLEAN NOT NULL DEFAULT false,
    duration_hours DECIMAL(8,2),
    expiry_months INTEGER, -- Training expires after X months
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create Training Records table
CREATE TABLE IF NOT EXISTS hr_public.training_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    training_program_id UUID NOT NULL REFERENCES hr_public.training_programs(id),
    assigned_date DATE NOT NULL,
    due_date DATE,
    started_date DATE,
    completed_date DATE,
    expiry_date DATE,
    score DECIMAL(5,2) CHECK (score >= 0 AND score <= 100),
    status hr_public.training_status NOT NULL DEFAULT 'NotStarted',
    notes TEXT,
    certificate_url VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create Employee Documents table
CREATE TABLE IF NOT EXISTS hr_public.employee_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES hr_public.users(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    document_type hr_public.document_type NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100),
    is_confidential BOOLEAN NOT NULL DEFAULT false,
    expiry_date DATE,
    tags TEXT[],
    version INTEGER NOT NULL DEFAULT 1,
    checksum VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create Policy Acknowledgments table
CREATE TABLE IF NOT EXISTS hr_public.policy_acknowledgments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    policy_name VARCHAR(200) NOT NULL,
    policy_version VARCHAR(50) NOT NULL,
    acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address INET,
    digital_signature TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add computed fields for leave balances
CREATE OR REPLACE FUNCTION hr_public.leave_balance_available_hours(leave_balance hr_public.leave_balances)
RETURNS DECIMAL(8,2) AS $$
BEGIN
    RETURN leave_balance.accrued_hours - leave_balance.used_hours - leave_balance.pending_hours;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add computed field for department employee count
CREATE OR REPLACE FUNCTION hr_public.department_employee_count(department hr_public.departments)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM hr_public.users
        WHERE department_id = department.id
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- Add computed field for performance cycle review count
CREATE OR REPLACE FUNCTION hr_public.performance_cycle_review_count(cycle hr_public.performance_cycles)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM hr_public.performance_reviews
        WHERE cycle_id = cycle.id
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- Add computed field for training program completion rate
CREATE OR REPLACE FUNCTION hr_public.training_program_completion_rate(program hr_public.training_programs)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    total_records INTEGER;
    completed_records INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_records
    FROM hr_public.training_records
    WHERE training_program_id = program.id;

    IF total_records = 0 THEN
        RETURN 0.0;
    END IF;

    SELECT COUNT(*) INTO completed_records
    FROM hr_public.training_records
    WHERE training_program_id = program.id
    AND status = 'Completed';

    RETURN (completed_records::DECIMAL / total_records::DECIMAL) * 100;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_leave_balances_employee_year ON hr_public.leave_balances(employee_id, year);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_status ON hr_public.leave_requests(employee_id, status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON hr_public.leave_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_employee_date ON hr_public.attendance_records(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_employee ON hr_public.performance_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_cycle ON hr_public.performance_reviews(cycle_id);
CREATE INDEX IF NOT EXISTS idx_training_records_employee ON hr_public.training_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_training_records_status ON hr_public.training_records(status);
CREATE INDEX IF NOT EXISTS idx_employee_documents_employee ON hr_public.employee_documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_policy_acknowledgments_employee ON hr_public.policy_acknowledgments(employee_id);

-- Update the updated_at column automatically
CREATE OR REPLACE FUNCTION hr_public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
DO $$
DECLARE
    table_name TEXT;
    table_names TEXT[] := ARRAY[
        'leave_policies', 'leave_balances', 'leave_requests',
        'attendance_records', 'performance_cycles', 'performance_reviews',
        'performance_goals', 'training_programs', 'training_records',
        'employee_documents'
    ];
BEGIN
    FOREACH table_name IN ARRAY table_names
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS trigger_update_%s_updated_at ON hr_public.%s;
            CREATE TRIGGER trigger_update_%s_updated_at
                BEFORE UPDATE ON hr_public.%s
                FOR EACH ROW
                EXECUTE FUNCTION hr_public.update_updated_at_column();
        ', table_name, table_name, table_name, table_name);
    END LOOP;
END $$;

-- Insert default leave policies
INSERT INTO hr_public.leave_policies (name, leave_type, description, accrual_rate, max_accrual, max_carryover, requires_approval, advance_notice_days)
VALUES
    ('Vacation Time', 'Vacation', 'Annual vacation leave', 6.67, 160, 40, true, 14),
    ('Sick Leave', 'Sick', 'Medical leave for illness', 4.0, 80, 0, false, 0),
    ('Personal Time', 'Personal', 'Personal time off', 2.0, 24, 0, true, 7),
    ('Maternity Leave', 'Maternity', 'Maternity leave policy', null, null, null, true, 30),
    ('Paternity Leave', 'Paternity', 'Paternity leave policy', null, null, null, true, 30)
ON CONFLICT DO NOTHING;

-- Insert sample training programs
INSERT INTO hr_public.training_programs (name, description, type, is_mandatory, duration_hours, expiry_months)
VALUES
    ('Security Awareness', 'Annual security training for all employees', 'Security', true, 2, 12),
    ('Code of Conduct', 'Company code of conduct training', 'Compliance', true, 1, 24),
    ('Leadership Development', 'Leadership skills development program', 'Leadership', false, 40, null),
    ('Technical Skills', 'Job-specific technical training', 'Technical', false, 20, null)
ON CONFLICT DO NOTHING;

-- Grant permissions
GRANT ALL ON hr_public.leave_policies TO postgraphile;
GRANT ALL ON hr_public.leave_balances TO postgraphile;
GRANT ALL ON hr_public.leave_requests TO postgraphile;
GRANT ALL ON hr_public.attendance_records TO postgraphile;
GRANT ALL ON hr_public.performance_cycles TO postgraphile;
GRANT ALL ON hr_public.performance_reviews TO postgraphile;
GRANT ALL ON hr_public.performance_goals TO postgraphile;
GRANT ALL ON hr_public.training_programs TO postgraphile;
GRANT ALL ON hr_public.training_records TO postgraphile;
GRANT ALL ON hr_public.employee_documents TO postgraphile;
GRANT ALL ON hr_public.policy_acknowledgments TO postgraphile;

-- Commit transaction
COMMIT;

-- Refresh PostGraphile schema
NOTIFY postgraphile_watch, 'schema_updated';