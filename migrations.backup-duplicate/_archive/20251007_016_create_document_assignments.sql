-- Migration: Create document_assignments table for document-to-user/department mapping
-- Feature: 024-we-need-to (Secure Employee Document Management)
-- Date: 2025-10-07
-- Purpose: Track assignment of documents to employees and departments

-- Set search path
SET search_path TO hr_public, public;

-- Create document_assignments table
CREATE TABLE IF NOT EXISTS hr_public.document_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES hr_public.documents(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES hr_public.users(id) ON DELETE CASCADE,
    department_id UUID REFERENCES hr_public.departments(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assignment_status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (assignment_status IN ('active', 'revoked')),
    assignment_reason TEXT,

    -- Constraint: Either employee_id OR department_id must be set, not both
    CONSTRAINT chk_assignment_target CHECK (
        (employee_id IS NOT NULL AND department_id IS NULL) OR
        (employee_id IS NULL AND department_id IS NOT NULL)
    )
);

-- Add table comment
COMMENT ON TABLE hr_public.document_assignments IS 'Assignment of documents to employees or departments (Feature 024)';

-- Add column comments
COMMENT ON COLUMN hr_public.document_assignments.employee_id IS 'Individual employee assignment (NULL for department assignments)';
COMMENT ON COLUMN hr_public.document_assignments.department_id IS 'Department-wide assignment (NULL for individual assignments)';
COMMENT ON COLUMN hr_public.document_assignments.assignment_status IS 'active = currently assigned, revoked = access removed';
COMMENT ON COLUMN hr_public.document_assignments.assignment_reason IS 'Optional note explaining why document was assigned';

-- Create indexes for performance
CREATE INDEX idx_doc_assignments_document_status ON hr_public.document_assignments (document_id, assignment_status);
CREATE INDEX idx_doc_assignments_employee_status ON hr_public.document_assignments (employee_id, assignment_status) WHERE employee_id IS NOT NULL;
CREATE INDEX idx_doc_assignments_department_status ON hr_public.document_assignments (department_id, assignment_status) WHERE department_id IS NOT NULL;
CREATE INDEX idx_doc_assignments_assigned_at ON hr_public.document_assignments (assigned_at DESC);

-- Enable Row-Level Security
ALTER TABLE hr_public.document_assignments ENABLE ROW LEVEL SECURITY;

-- Migration complete
COMMENT ON TABLE hr_public.document_assignments IS 'Migration 20251007_002 complete: Document assignments table with employee/department targeting';
