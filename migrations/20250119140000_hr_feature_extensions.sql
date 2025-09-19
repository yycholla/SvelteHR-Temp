-- Migration: HR Feature Extensions
-- Created: 2025-01-19T14:00:00.000Z
-- Adds missing HR entities for leave management, attendance, performance reviews, compliance, and documents

-- UP
BEGIN;

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
CREATE TABLE leave_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    leave_policy_id UUID NOT NULL REFERENCES leave_policies(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    hours_requested NUMERIC(8,2) NOT NULL,
    reason TEXT,
    status leave_status_enum NOT NULL DEFAULT 'Pending',
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_by UUID REFERENCES users(id),
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
CREATE TABLE attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    clock_in_time TIMESTAMPTZ,
    clock_out_time TIMESTAMPTZ,
    break_start_time TIMESTAMPTZ,
    break_end_time TIMESTAMPTZ,
    total_hours NUMERIC(4,2),
    overtime_hours NUMERIC(4,2) DEFAULT 0,
    status attendance_status_enum NOT NULL DEFAULT 'Present',
    location VARCHAR(255),
    ip_address INET,
    notes TEXT,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(employee_id, date),
    CHECK (clock_out_time IS NULL OR clock_out_time > clock_in_time),
    CHECK (break_end_time IS NULL OR break_start_time IS NULL OR break_end_time > break_start_time)
);

-- Performance review cycles
CREATE TABLE performance_cycles (
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
CREATE TABLE performance_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id),
    cycle_id UUID REFERENCES performance_cycles(id),
    review_period_start DATE NOT NULL,
    review_period_end DATE NOT NULL,
    overall_rating performance_rating_enum,
    goals_rating performance_rating_enum,
    competencies_rating performance_rating_enum,
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
CREATE TABLE performance_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    review_id UUID REFERENCES performance_reviews(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    target_completion_date DATE,
    weight NUMERIC(3,1) CHECK (weight >= 0 AND weight <= 100),
    status VARCHAR(50) NOT NULL DEFAULT 'Active',
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    final_rating performance_rating_enum,
    manager_notes TEXT,
    employee_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Training and compliance
CREATE TABLE training_programs (
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
CREATE TABLE training_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    training_program_id UUID NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
    assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    started_date DATE,
    completed_date DATE,
    expiry_date DATE,
    score NUMERIC(5,2),
    status training_status_enum NOT NULL DEFAULT 'NotStarted',
    notes TEXT,
    certificate_url VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(employee_id, training_program_id)
);

-- Document storage
CREATE TABLE employee_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    document_type document_type_enum NOT NULL,
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
CREATE TABLE policy_acknowledgments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
CREATE INDEX idx_leave_balances_employee_year ON leave_balances(employee_id, year);
CREATE INDEX idx_leave_balances_policy ON leave_balances(leave_policy_id);

CREATE INDEX idx_leave_requests_employee ON leave_requests(employee_id, status);
CREATE INDEX idx_leave_requests_dates ON leave_requests(start_date, end_date);
CREATE INDEX idx_leave_requests_status ON leave_requests(status, submitted_at);
CREATE INDEX idx_leave_requests_reviewer ON leave_requests(reviewed_by) WHERE reviewed_by IS NOT NULL;

CREATE INDEX idx_attendance_employee_date ON attendance_records(employee_id, date);
CREATE INDEX idx_attendance_date ON attendance_records(date);
CREATE INDEX idx_attendance_status ON attendance_records(status, date);

CREATE INDEX idx_performance_reviews_employee ON performance_reviews(employee_id, completed_at);
CREATE INDEX idx_performance_reviews_reviewer ON performance_reviews(reviewer_id);
CREATE INDEX idx_performance_reviews_cycle ON performance_reviews(cycle_id);
CREATE INDEX idx_performance_reviews_period ON performance_reviews(review_period_start, review_period_end);

CREATE INDEX idx_performance_goals_employee ON performance_goals(employee_id, status);
CREATE INDEX idx_performance_goals_review ON performance_goals(review_id);

CREATE INDEX idx_training_records_employee ON training_records(employee_id, status);
CREATE INDEX idx_training_records_program ON training_records(training_program_id);
CREATE INDEX idx_training_records_due_date ON training_records(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_training_records_expiry ON training_records(expiry_date) WHERE expiry_date IS NOT NULL;

CREATE INDEX idx_employee_documents_employee ON employee_documents(employee_id, document_type);
CREATE INDEX idx_employee_documents_type ON employee_documents(document_type, created_at);
CREATE INDEX idx_employee_documents_expiry ON employee_documents(expiry_date) WHERE expiry_date IS NOT NULL;

CREATE INDEX idx_policy_acknowledgments_employee ON policy_acknowledgments(employee_id, policy_name);
CREATE INDEX idx_policy_acknowledgments_expires ON policy_acknowledgments(expires_at) WHERE expires_at IS NOT NULL;

-- Full-text search indexes
CREATE INDEX idx_training_programs_search ON training_programs USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));
CREATE INDEX idx_employee_documents_search ON employee_documents USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Updated at triggers for new tables
CREATE TRIGGER update_leave_policies_updated_at BEFORE UPDATE ON leave_policies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_balances_updated_at BEFORE UPDATE ON leave_balances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON leave_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_records_updated_at BEFORE UPDATE ON attendance_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_performance_cycles_updated_at BEFORE UPDATE ON performance_cycles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_performance_reviews_updated_at BEFORE UPDATE ON performance_reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_performance_goals_updated_at BEFORE UPDATE ON performance_goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_training_programs_updated_at BEFORE UPDATE ON training_programs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_training_records_updated_at BEFORE UPDATE ON training_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_documents_updated_at BEFORE UPDATE ON employee_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audit triggers for sensitive HR data
CREATE TRIGGER audit_leave_requests_trigger
    AFTER INSERT OR UPDATE OR DELETE ON leave_requests
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_performance_reviews_trigger
    AFTER INSERT OR UPDATE OR DELETE ON performance_reviews
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_training_records_trigger
    AFTER INSERT OR UPDATE OR DELETE ON training_records
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_employee_documents_trigger
    AFTER INSERT OR UPDATE OR DELETE ON employee_documents
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Insert seed data for leave policies
INSERT INTO leave_policies (name, leave_type, description, accrual_rate, max_accrual, max_carryover, advance_notice_days) VALUES
('Annual Vacation', 'Vacation', 'Standard vacation leave policy', 3.33, 160, 40, 14),
('Sick Leave', 'Sick', 'Sick leave for illness and medical appointments', 2.67, 80, 40, 0),
('Personal Leave', 'Personal', 'Personal time off for individual needs', 1.33, 40, 8, 7),
('Maternity Leave', 'Maternity', 'Maternity leave for new mothers', 0, 480, 0, 30),
('Paternity Leave', 'Paternity', 'Paternity leave for new fathers', 0, 80, 0, 30),
('Bereavement Leave', 'Bereavement', 'Leave for family bereavement', 0, 24, 0, 0);

-- Insert seed data for training programs
INSERT INTO training_programs (name, description, type, is_mandatory, duration_hours, expiry_months) VALUES
('Information Security Awareness', 'Annual security training covering data protection and cyber threats', 'Security', true, 2, 12),
('Harassment Prevention', 'Workplace harassment prevention and reporting procedures', 'Compliance', true, 1.5, 12),
('Emergency Procedures', 'Fire safety and emergency evacuation procedures', 'Safety', true, 1, 24),
('Leadership Development', 'Management and leadership skills development', 'Professional', false, 8, null),
('Software Development Best Practices', 'Coding standards and development methodologies', 'Technical', false, 4, null);

-- Insert seed data for performance cycle
INSERT INTO performance_cycles (name, description, start_date, end_date, review_due_date) VALUES
('2025 Annual Review', '2025 annual performance review cycle', '2025-01-01', '2025-12-31', '2026-01-31');

COMMIT;

-- DOWN
-- Note: This is destructive - only run if you need to completely remove HR features
-- DROP TRIGGER IF EXISTS audit_employee_documents_trigger ON employee_documents;
-- DROP TRIGGER IF EXISTS audit_training_records_trigger ON training_records;
-- DROP TRIGGER IF EXISTS audit_performance_reviews_trigger ON performance_reviews;
-- DROP TRIGGER IF EXISTS audit_leave_requests_trigger ON leave_requests;
--
-- DROP TRIGGER IF EXISTS update_employee_documents_updated_at ON employee_documents;
-- DROP TRIGGER IF EXISTS update_training_records_updated_at ON training_records;
-- DROP TRIGGER IF EXISTS update_training_programs_updated_at ON training_programs;
-- DROP TRIGGER IF EXISTS update_performance_goals_updated_at ON performance_goals;
-- DROP TRIGGER IF EXISTS update_performance_reviews_updated_at ON performance_reviews;
-- DROP TRIGGER IF EXISTS update_performance_cycles_updated_at ON performance_cycles;
-- DROP TRIGGER IF EXISTS update_attendance_records_updated_at ON attendance_records;
-- DROP TRIGGER IF EXISTS update_leave_requests_updated_at ON leave_requests;
-- DROP TRIGGER IF EXISTS update_leave_balances_updated_at ON leave_balances;
-- DROP TRIGGER IF EXISTS update_leave_policies_updated_at ON leave_policies;
--
-- DROP TABLE IF EXISTS policy_acknowledgments CASCADE;
-- DROP TABLE IF EXISTS employee_documents CASCADE;
-- DROP TABLE IF EXISTS training_records CASCADE;
-- DROP TABLE IF EXISTS training_programs CASCADE;
-- DROP TABLE IF EXISTS performance_goals CASCADE;
-- DROP TABLE IF EXISTS performance_reviews CASCADE;
-- DROP TABLE IF EXISTS performance_cycles CASCADE;
-- DROP TABLE IF EXISTS attendance_records CASCADE;
-- DROP TABLE IF EXISTS leave_requests CASCADE;
-- DROP TABLE IF EXISTS leave_balances CASCADE;
-- DROP TABLE IF EXISTS leave_policies CASCADE;
--
-- DROP TYPE IF EXISTS training_status_enum;
-- DROP TYPE IF EXISTS document_type_enum;
-- DROP TYPE IF EXISTS performance_rating_enum;
-- DROP TYPE IF EXISTS leave_status_enum;
-- DROP TYPE IF EXISTS attendance_status_enum;