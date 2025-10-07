-- Migration: Create document_categories reference table with seed data
-- Feature: 024-we-need-to (Secure Employee Document Management)
-- Date: 2025-10-07
-- Purpose: Define document categories with default security levels and role requirements

-- Set search path
SET search_path TO hr_public, public;

-- Create document_categories table
CREATE TABLE IF NOT EXISTS hr_public.document_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    default_sensitivity_level VARCHAR(50) NOT NULL CHECK (default_sensitivity_level IN ('Public', 'Internal', 'Confidential', 'Sensitive-PII')),
    retention_years INTEGER NOT NULL DEFAULT 3 CHECK (retention_years >= 1),
    required_role VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add table comment
COMMENT ON TABLE hr_public.document_categories IS 'Document category reference data with security and retention policies (Feature 024)';

-- Add column comments
COMMENT ON COLUMN hr_public.document_categories.name IS 'Category name (unique identifier)';
COMMENT ON COLUMN hr_public.document_categories.default_sensitivity_level IS 'Default sensitivity when uploading this category';
COMMENT ON COLUMN hr_public.document_categories.retention_years IS 'Minimum years to retain after employee termination';
COMMENT ON COLUMN hr_public.document_categories.required_role IS 'Minimum role required to upload this category (Admin, HR, Manager, Employee)';

-- Create index for name lookups
CREATE INDEX idx_doc_categories_name ON hr_public.document_categories (name);

-- Seed reference data
INSERT INTO hr_public.document_categories (name, default_sensitivity_level, retention_years, required_role) VALUES
    ('Social Security Card', 'Sensitive-PII', 7, 'Admin'),
    ('I-9 Form', 'Confidential', 7, 'HR'),
    ('Offer Letter', 'Internal', 3, 'HR'),
    ('Tax Form', 'Confidential', 7, 'HR'),
    ('Benefits Enrollment', 'Internal', 3, 'HR'),
    ('Background Check', 'Confidential', 5, 'HR'),
    ('Department Policy', 'Public', 1, 'Manager'),
    ('Training Certificate', 'Internal', 3, 'HR'),
    ('Performance Review', 'Confidential', 5, 'HR'),
    ('Emergency Contact', 'Internal', 3, 'HR')
ON CONFLICT (name) DO NOTHING;

-- Enable Row-Level Security
ALTER TABLE hr_public.document_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policy: All authenticated users can read categories (needed for dropdowns)
CREATE POLICY category_read_all ON hr_public.document_categories
    FOR SELECT
    USING (true); -- All authenticated users can view categories

-- RLS Policy: Only Admins can insert/update/delete categories
CREATE POLICY category_admin_modify ON hr_public.document_categories
    FOR ALL
    USING (
        current_setting('jwt.claims.role', true) = 'super_admin'
    )
    WITH CHECK (
        current_setting('jwt.claims.role', true) = 'super_admin'
    );

-- Grant permissions
GRANT SELECT ON hr_public.document_categories TO authenticated;
GRANT INSERT, UPDATE, DELETE ON hr_public.document_categories TO authenticated; -- Protected by RLS

-- Migration complete
COMMENT ON TABLE hr_public.document_categories IS 'Migration 20251007_004 complete: Document categories with 10 seed categories and RLS policies';
