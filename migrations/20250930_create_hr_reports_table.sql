-- Migration: Create HR reports table
-- Feature: 016-repair-management-pages
-- Purpose: Enable managers to create, schedule, and manage HR reports

-- Create report status enum
CREATE TYPE hr_public.report_status AS ENUM ('draft', 'active', 'scheduled', 'completed', 'failed');

-- Create HR reports table
CREATE TABLE hr_public.hr_reports (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    creator_id uuid NOT NULL,
    department_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    report_type character varying(100) NOT NULL,
    category character varying(100) NOT NULL,
    filters jsonb DEFAULT '{}'::jsonb,
    data jsonb DEFAULT '{}'::jsonb,
    status hr_public.report_status DEFAULT 'draft'::hr_public.report_status NOT NULL,
    scheduled_at timestamp with time zone,
    generated_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT hr_reports_pkey PRIMARY KEY (id),
    CONSTRAINT hr_reports_title_not_empty CHECK (length(TRIM(BOTH FROM title)) > 0),
    CONSTRAINT hr_reports_report_type_not_empty CHECK (length(TRIM(BOTH FROM report_type)) > 0),
    CONSTRAINT hr_reports_category_not_empty CHECK (length(TRIM(BOTH FROM category)) > 0),
    CONSTRAINT hr_reports_generated_at_logic CHECK (
        (status = 'completed' AND generated_at IS NOT NULL) OR
        (status != 'completed' AND (generated_at IS NULL OR generated_at IS NOT NULL))
    )
);

-- Add foreign key constraints
ALTER TABLE hr_public.hr_reports
    ADD CONSTRAINT hr_reports_creator_id_fkey
    FOREIGN KEY (creator_id)
    REFERENCES hr_public.users(id)
    ON DELETE CASCADE;

ALTER TABLE hr_public.hr_reports
    ADD CONSTRAINT hr_reports_department_id_fkey
    FOREIGN KEY (department_id)
    REFERENCES hr_public.departments(id)
    ON DELETE CASCADE;

-- Create indexes for common queries
CREATE INDEX hr_reports_creator_id_idx ON hr_public.hr_reports(creator_id);
CREATE INDEX hr_reports_department_id_idx ON hr_public.hr_reports(department_id);
CREATE INDEX hr_reports_status_idx ON hr_public.hr_reports(status);
CREATE INDEX hr_reports_report_type_idx ON hr_public.hr_reports(report_type);
CREATE INDEX hr_reports_category_idx ON hr_public.hr_reports(category);
CREATE INDEX hr_reports_scheduled_at_idx ON hr_public.hr_reports(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX hr_reports_generated_at_idx ON hr_public.hr_reports(generated_at) WHERE generated_at IS NOT NULL;

-- Grant permissions to appropriate roles
GRANT SELECT ON hr_public.hr_reports TO hr_guest, hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT INSERT, UPDATE, DELETE ON hr_public.hr_reports TO hr_manager, hr_admin, hr_super_admin;

-- Add comment for documentation
COMMENT ON TABLE hr_public.hr_reports IS 'HR reports created and managed by managers for their departments';
COMMENT ON COLUMN hr_public.hr_reports.creator_id IS 'User who created the report';
COMMENT ON COLUMN hr_public.hr_reports.department_id IS 'Department context for RBAC filtering';
COMMENT ON COLUMN hr_public.hr_reports.filters IS 'JSON object containing report filter criteria';
COMMENT ON COLUMN hr_public.hr_reports.data IS 'JSON object containing report data and results';
COMMENT ON COLUMN hr_public.hr_reports.generated_at IS 'Timestamp when report was last generated';
