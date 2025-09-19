-- Migration: HR Feature Extensions
-- Created: 2025-01-19T14:00:00.000Z
-- Adds missing HR entities for leave management, attendance, performance reviews, compliance, and documents

-- UP
BEGIN;

-- First, check if we need to create the departments table
CREATE TABLE IF NOT EXISTS hr_public.departments (
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

-- Create additional enums for HR features (in hr_public schema)
CREATE TYPE hr_public.leave_type_enum AS ENUM (
    'Vacation',
    'Sick',
    'Personal',
    'Maternity',
    'Paternity',
    'Bereavement',
    'Unpaid'
);

CREATE TYPE hr_public.attendance_status_enum AS ENUM (
    'Present',
    'Absent',
    'Late',
    'PartialDay',
    'Holiday',
    'Vacation',
    'Sick'
);

CREATE TYPE hr_public.leave_status_enum AS ENUM (
    'Pending',
    'Approved',
    'Rejected',
    'Cancelled',
    'InProgress',
    'Completed'
);

CREATE TYPE hr_public.performance_rating_enum AS ENUM (
    'Exceeds',
    'Meets',
    'Approaching',
    'Below'
);

CREATE TYPE hr_public.document_type_enum AS ENUM (
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

CREATE TYPE hr_public.training_status_enum AS ENUM (
    'NotStarted',
    'InProgress',
    'Completed',
    'Expired',
    'Failed'
);

-- Leave policies and management
CREATE TABLE hr_public.leave_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    leave_type hr_public.leave_type_enum NOT NULL,
    description TEXT,
    accrual_rate NUMERIC(5,2), -- Hours per pay period
    max_accrual NUMERIC(8,2), -- Maximum hours that can be accrued
    max_carryover NUMERIC(8,2), -- Maximum hours that can carry over to next year
    requires_approval BOOLEAN NOT NULL DEFAULT true,
    advance_notice_days INTEGER DEFAULT 0,
    max_consecutive_days INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Employee leave balances
CREATE TABLE hr_public.leave_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    leave_policy_id UUID NOT NULL REFERENCES hr_public.leave_policies(id) ON DELETE CASCADE,
    accrued_hours NUMERIC(8,2) NOT NULL DEFAULT 0,
    used_hours NUMERIC(8,2) NOT NULL DEFAULT 0,
    pending_hours NUMERIC(8,2) NOT NULL DEFAULT 0,
    available_hours NUMERIC(8,2) GENERATED ALWAYS AS (accrued_hours - used_hours - pending_hours) STORED,
    year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(employee_id, leave_policy_id, year)
);

-- Leave requests
CREATE TABLE hr_public.leave_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    leave_policy_id UUID NOT NULL REFERENCES hr_public.leave_policies(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    hours_requested NUMERIC(8,2) NOT NULL,
    reason TEXT,
    status hr_public.leave_status_enum NOT NULL DEFAULT 'Pending',
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_by UUID REFERENCES hr_public.users(id),
    reviewed_at TIMESTAMPTZ,
    review_comments TEXT,
    cancelled_at TIMESTAMPTZ,
    cancel_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (end_date >= start_date),
    CHECK (hours_requested > 0)
);

-- Attendance tracking
CREATE TABLE hr_public.attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    clock_in_time TIMESTAMPTZ,
    clock_out_time TIMESTAMPTZ,
    break_start_time TIMESTAMPTZ,
    break_end_time TIMESTAMPTZ,
    total_hours NUMERIC(4,2),
    overtime_hours NUMERIC(4,2) DEFAULT 0,
    status hr_public.attendance_status_enum NOT NULL DEFAULT 'Present',
    location VARCHAR(255),
    ip_address INET,
    notes TEXT,
    approved_by UUID REFERENCES hr_public.users(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(employee_id, date),
    CHECK (clock_out_time IS NULL OR clock_out_time > clock_in_time),
    CHECK (break_end_time IS NULL OR break_start_time IS NULL OR break_end_time > break_start_time)
);

-- Performance review cycles
CREATE TABLE hr_public.performance_cycles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    review_due_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (end_date >= start_date),
    CHECK (review_due_date >= end_date)
);

-- Performance reviews
CREATE TABLE hr_public.performance_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES hr_public.users(id),
    cycle_id UUID REFERENCES hr_public.performance_cycles(id),
    review_period_start DATE NOT NULL,
    review_period_end DATE NOT NULL,
    overall_rating hr_public.performance_rating_enum,
    goals_rating hr_public.performance_rating_enum,
    competencies_rating hr_public.performance_rating_enum,
    self_assessment TEXT,
    manager_comments TEXT,
    employee_comments TEXT,
    development_goals TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft',
    submitted_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (review_period_end >= review_period_start)
);

-- Performance goals
CREATE TABLE hr_public.performance_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    review_id UUID REFERENCES hr_public.performance_reviews(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    target_completion_date DATE,
    weight NUMERIC(3,1) CHECK (weight >= 0 AND weight <= 100),
    status VARCHAR(50) NOT NULL DEFAULT 'Active',
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    final_rating hr_public.performance_rating_enum,
    manager_notes TEXT,
    employee_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Training and compliance
CREATE TABLE hr_public.training_programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(100) NOT NULL,
    is_mandatory BOOLEAN NOT NULL DEFAULT false,
    duration_hours NUMERIC(4,1),
    expiry_months INTEGER, -- Training expires after X months
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Employee training records
CREATE TABLE hr_public.training_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    training_program_id UUID NOT NULL REFERENCES hr_public.training_programs(id) ON DELETE CASCADE,
    assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    started_date DATE,
    completed_date DATE,
    expiry_date DATE,
    score NUMERIC(5,2),
    status hr_public.training_status_enum NOT NULL DEFAULT 'NotStarted',
    notes TEXT,
    certificate_url VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(employee_id, training_program_id)
);

-- Document storage
CREATE TABLE hr_public.employee_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES hr_public.users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    document_type hr_public.document_type_enum NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100),
    is_confidential BOOLEAN NOT NULL DEFAULT false,
    expiry_date DATE,
    tags TEXT[], -- Array of tags for categorization
    version INTEGER NOT NULL DEFAULT 1,
    checksum VARCHAR(64), -- For file integrity
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Policy acknowledgments for compliance
CREATE TABLE hr_public.policy_acknowledgments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    policy_name VARCHAR(255) NOT NULL,
    policy_version VARCHAR(50) NOT NULL,
    acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address INET,
    digital_signature TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(employee_id, policy_name, policy_version)
);

-- Performance indexes for new tables
CREATE INDEX idx_leave_balances_employee_year ON hr_public.leave_balances(employee_id, year);
CREATE INDEX idx_leave_balances_policy ON hr_public.leave_balances(leave_policy_id);

CREATE INDEX idx_leave_requests_employee ON hr_public.leave_requests(employee_id, status);
CREATE INDEX idx_leave_requests_dates ON hr_public.leave_requests(start_date, end_date);
CREATE INDEX idx_leave_requests_status ON hr_public.leave_requests(status, submitted_at);
CREATE INDEX idx_leave_requests_reviewer ON hr_public.leave_requests(reviewed_by) WHERE reviewed_by IS NOT NULL;

CREATE INDEX idx_attendance_employee_date ON hr_public.attendance_records(employee_id, date);
CREATE INDEX idx_attendance_date ON hr_public.attendance_records(date);
CREATE INDEX idx_attendance_status ON hr_public.attendance_records(status, date);

CREATE INDEX idx_performance_reviews_employee ON hr_public.performance_reviews(employee_id, completed_at);
CREATE INDEX idx_performance_reviews_reviewer ON hr_public.performance_reviews(reviewer_id);
CREATE INDEX idx_performance_reviews_cycle ON hr_public.performance_reviews(cycle_id);
CREATE INDEX idx_performance_reviews_period ON hr_public.performance_reviews(review_period_start, review_period_end);

CREATE INDEX idx_performance_goals_employee ON hr_public.performance_goals(employee_id, status);
CREATE INDEX idx_performance_goals_review ON hr_public.performance_goals(review_id);

CREATE INDEX idx_training_records_employee ON hr_public.training_records(employee_id, status);
CREATE INDEX idx_training_records_program ON hr_public.training_records(training_program_id);
CREATE INDEX idx_training_records_due_date ON hr_public.training_records(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_training_records_expiry ON hr_public.training_records(expiry_date) WHERE expiry_date IS NOT NULL;

CREATE INDEX idx_employee_documents_employee ON hr_public.employee_documents(employee_id, document_type);
CREATE INDEX idx_employee_documents_type ON hr_public.employee_documents(document_type, created_at);
CREATE INDEX idx_employee_documents_expiry ON hr_public.employee_documents(expiry_date) WHERE expiry_date IS NOT NULL;

CREATE INDEX idx_policy_acknowledgments_employee ON hr_public.policy_acknowledgments(employee_id, policy_name);
CREATE INDEX idx_policy_acknowledgments_expires ON hr_public.policy_acknowledgments(expires_at) WHERE expires_at IS NOT NULL;

-- Departments indexes (if table was created)
CREATE INDEX IF NOT EXISTS idx_departments_name ON hr_public.departments(name);
CREATE INDEX IF NOT EXISTS idx_departments_active ON hr_public.departments(is_active);
CREATE INDEX IF NOT EXISTS idx_departments_manager_id ON hr_public.departments(manager_id) WHERE manager_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_departments_parent ON hr_public.departments(parent_department_id) WHERE parent_department_id IS NOT NULL;

-- Full-text search indexes
CREATE INDEX idx_training_programs_search ON hr_public.training_programs USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));
CREATE INDEX idx_employee_documents_search ON hr_public.employee_documents USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Create update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Updated at triggers for new tables
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON hr_public.departments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_policies_updated_at BEFORE UPDATE ON hr_public.leave_policies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_balances_updated_at BEFORE UPDATE ON hr_public.leave_balances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON hr_public.leave_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_records_updated_at BEFORE UPDATE ON hr_public.attendance_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_performance_cycles_updated_at BEFORE UPDATE ON hr_public.performance_cycles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_performance_reviews_updated_at BEFORE UPDATE ON hr_public.performance_reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_performance_goals_updated_at BEFORE UPDATE ON hr_public.performance_goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_training_programs_updated_at BEFORE UPDATE ON hr_public.training_programs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_training_records_updated_at BEFORE UPDATE ON hr_public.training_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_documents_updated_at BEFORE UPDATE ON hr_public.employee_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert seed data for departments (if not already exists)
INSERT INTO hr_public.departments (name, description, budget)
SELECT * FROM (VALUES
    ('Engineering', 'Software development and technical operations', 2000000.00),
    ('Human Resources', 'Employee relations and organizational development', 500000.00),
    ('Finance', 'Financial planning and accounting', 300000.00),
    ('Marketing', 'Marketing and brand management', 800000.00),
    ('Sales', 'Sales and business development', 1200000.00)
) AS t(name, description, budget)
WHERE NOT EXISTS (SELECT 1 FROM hr_public.departments WHERE name = t.name);

-- Insert seed data for leave policies
INSERT INTO hr_public.leave_policies (name, leave_type, description, accrual_rate, max_accrual, max_carryover, advance_notice_days) VALUES
('Annual Vacation', 'Vacation', 'Standard vacation leave policy', 3.33, 160, 40, 14),
('Sick Leave', 'Sick', 'Sick leave for illness and medical appointments', 2.67, 80, 40, 0),
('Personal Leave', 'Personal', 'Personal time off for individual needs', 1.33, 40, 8, 7),
('Maternity Leave', 'Maternity', 'Maternity leave for new mothers', 0, 480, 0, 30),
('Paternity Leave', 'Paternity', 'Paternity leave for new fathers', 0, 80, 0, 30),
('Bereavement Leave', 'Bereavement', 'Leave for family bereavement', 0, 24, 0, 0);

-- Insert seed data for training programs
INSERT INTO hr_public.training_programs (name, description, type, is_mandatory, duration_hours, expiry_months) VALUES
('Information Security Awareness', 'Annual security training covering data protection and cyber threats', 'Security', true, 2, 12),
('Harassment Prevention', 'Workplace harassment prevention and reporting procedures', 'Compliance', true, 1.5, 12),
('Emergency Procedures', 'Fire safety and emergency evacuation procedures', 'Safety', true, 1, 24),
('Leadership Development', 'Management and leadership skills development', 'Professional', false, 8, null),
('Software Development Best Practices', 'Coding standards and development methodologies', 'Technical', false, 4, null);

-- Insert seed data for performance cycle
INSERT INTO hr_public.performance_cycles (name, description, start_date, end_date, review_due_date) VALUES
('2025 Annual Review', '2025 annual performance review cycle', '2025-01-01', '2025-12-31', '2026-01-31');

COMMIT;