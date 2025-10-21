-- Migration: Database Functions and Triggers
-- Created: 2025-10-17
-- Description: Trigger functions for updated_at timestamps, schema migrations tracking

BEGIN;

-- ============================================================================
-- SCHEMA_MIGRATIONS TABLE (public schema for infrastructure)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.schema_migrations (
    id SERIAL PRIMARY KEY,
    version VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    checksum VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_schema_migrations_version ON public.schema_migrations(version);
CREATE INDEX IF NOT EXISTS idx_schema_migrations_applied_at ON public.schema_migrations(applied_at DESC);

COMMENT ON TABLE public.schema_migrations IS 'Track applied database migrations';

-- ============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column() IS 'Automatically update updated_at timestamp on row modification';

-- ============================================================================
-- APPLY UPDATED_AT TRIGGERS TO ALL TABLES
-- ============================================================================

-- Core Auth Tables
DROP TRIGGER IF EXISTS update_users_updated_at ON hr_public.users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON hr_public.users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_roles_updated_at ON hr_public.roles;
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON hr_public.roles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_permissions_updated_at ON hr_public.permissions;
CREATE TRIGGER update_permissions_updated_at BEFORE UPDATE ON hr_public.permissions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_role_permissions_updated_at ON hr_public.role_permissions;
CREATE TRIGGER update_role_permissions_updated_at BEFORE UPDATE ON hr_public.role_permissions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_role_assignments_updated_at ON hr_public.user_role_assignments;
CREATE TRIGGER update_user_role_assignments_updated_at BEFORE UPDATE ON hr_public.user_role_assignments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_sessions_updated_at ON hr_public.user_sessions;
CREATE TRIGGER update_user_sessions_updated_at BEFORE UPDATE ON hr_public.user_sessions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- HR Core Tables
DROP TRIGGER IF EXISTS update_departments_updated_at ON hr_public.departments;
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON hr_public.departments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_leave_types_updated_at ON hr_public.leave_types;
CREATE TRIGGER update_leave_types_updated_at BEFORE UPDATE ON hr_public.leave_types
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_time_off_policies_updated_at ON hr_public.time_off_policies;
CREATE TRIGGER update_time_off_policies_updated_at BEFORE UPDATE ON hr_public.time_off_policies
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_time_off_balances_updated_at ON hr_public.time_off_balances;
CREATE TRIGGER update_time_off_balances_updated_at BEFORE UPDATE ON hr_public.time_off_balances
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_leave_requests_updated_at ON hr_public.leave_requests;
CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON hr_public.leave_requests
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tasks System
DROP TRIGGER IF EXISTS update_task_types_updated_at ON hr_public.task_types;
CREATE TRIGGER update_task_types_updated_at BEFORE UPDATE ON hr_public.task_types
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON hr_public.tasks;
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON hr_public.tasks
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_task_assignees_updated_at ON hr_public.task_assignees;
CREATE TRIGGER update_task_assignees_updated_at BEFORE UPDATE ON hr_public.task_assignees
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_task_dependencies_updated_at ON hr_public.task_dependencies;
CREATE TRIGGER update_task_dependencies_updated_at BEFORE UPDATE ON hr_public.task_dependencies
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Events System
DROP TRIGGER IF EXISTS update_events_updated_at ON hr_public.events;
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON hr_public.events
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_event_comments_updated_at ON hr_public.event_comments;
CREATE TRIGGER update_event_comments_updated_at BEFORE UPDATE ON hr_public.event_comments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Documents System
DROP TRIGGER IF EXISTS update_document_categories_updated_at ON hr_public.document_categories;
CREATE TRIGGER update_document_categories_updated_at BEFORE UPDATE ON hr_public.document_categories
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_documents_updated_at ON hr_public.documents;
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON hr_public.documents
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Performance Reviews
DROP TRIGGER IF EXISTS update_review_cycles_updated_at ON hr_public.review_cycles;
CREATE TRIGGER update_review_cycles_updated_at BEFORE UPDATE ON hr_public.review_cycles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_review_templates_updated_at ON hr_public.review_templates;
CREATE TRIGGER update_review_templates_updated_at BEFORE UPDATE ON hr_public.review_templates
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_performance_reviews_updated_at ON hr_public.performance_reviews;
CREATE TRIGGER update_performance_reviews_updated_at BEFORE UPDATE ON hr_public.performance_reviews
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_review_goals_updated_at ON hr_public.review_goals;
CREATE TRIGGER update_review_goals_updated_at BEFORE UPDATE ON hr_public.review_goals
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_review_feedback_updated_at ON hr_public.review_feedback;
CREATE TRIGGER update_review_feedback_updated_at BEFORE UPDATE ON hr_public.review_feedback
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Employee Details
DROP TRIGGER IF EXISTS update_employee_skills_updated_at ON hr_public.employee_skills;
CREATE TRIGGER update_employee_skills_updated_at BEFORE UPDATE ON hr_public.employee_skills
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_employee_certifications_updated_at ON hr_public.employee_certifications;
CREATE TRIGGER update_employee_certifications_updated_at BEFORE UPDATE ON hr_public.employee_certifications
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_employee_vehicles_updated_at ON hr_public.employee_vehicles;
CREATE TRIGGER update_employee_vehicles_updated_at BEFORE UPDATE ON hr_public.employee_vehicles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_employee_goals_updated_at ON hr_public.employee_goals;
CREATE TRIGGER update_employee_goals_updated_at BEFORE UPDATE ON hr_public.employee_goals
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Time & Attendance
DROP TRIGGER IF EXISTS update_attendance_records_updated_at ON hr_public.attendance_records;
CREATE TRIGGER update_attendance_records_updated_at BEFORE UPDATE ON hr_public.attendance_records
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- System Audit
DROP TRIGGER IF EXISTS update_rollback_requests_updated_at ON hr_public.rollback_requests;
CREATE TRIGGER update_rollback_requests_updated_at BEFORE UPDATE ON hr_public.rollback_requests
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bulk_rollback_batches_updated_at ON hr_public.bulk_rollback_batches;
CREATE TRIGGER update_bulk_rollback_batches_updated_at BEFORE UPDATE ON hr_public.bulk_rollback_batches
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bulk_rollback_items_updated_at ON hr_public.bulk_rollback_items;
CREATE TRIGGER update_bulk_rollback_items_updated_at BEFORE UPDATE ON hr_public.bulk_rollback_items
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_compensation_bands_updated_at ON hr_public.compensation_bands;
CREATE TRIGGER update_compensation_bands_updated_at BEFORE UPDATE ON hr_public.compensation_bands
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payroll_records_updated_at ON hr_public.payroll_records;
CREATE TRIGGER update_payroll_records_updated_at BEFORE UPDATE ON hr_public.payroll_records
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_linked_resources_updated_at ON hr_public.linked_resources;
CREATE TRIGGER update_linked_resources_updated_at BEFORE UPDATE ON hr_public.linked_resources
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_system_settings_updated_at ON hr_public.system_settings;
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON hr_public.system_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- GRANT SCHEMA PERMISSIONS
-- ============================================================================

-- Grant usage on hr_public schema to all roles
GRANT USAGE ON SCHEMA hr_public TO postgres, guest, employee, manager, admin, super_admin;

-- Grant sequence usage for UUID generation
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA hr_public TO postgres, employee, manager, admin, super_admin;

COMMIT;
