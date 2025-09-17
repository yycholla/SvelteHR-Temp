-- Add missing indexes for PostGraphile foreign key constraints
-- These indexes improve query performance and enable proper GraphQL relationships

-- Index for auth_sessions.user_id
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id
ON hr_public.auth_sessions(user_id);

-- Index for contact_information.employee_id
CREATE INDEX IF NOT EXISTS idx_contact_information_employee_id
ON hr_public.contact_information(employee_id);

-- Index for departments.parent_department_id
CREATE INDEX IF NOT EXISTS idx_departments_parent_department_id
ON hr_public.departments(parent_department_id);

-- Index for departments.manager_id
CREATE INDEX IF NOT EXISTS idx_departments_manager_id
ON hr_public.departments(manager_id);

-- Index for job_information.manager_id
CREATE INDEX IF NOT EXISTS idx_job_information_manager_id
ON hr_public.job_information(manager_id);

-- Index for job_information.reports_to
CREATE INDEX IF NOT EXISTS idx_job_information_reports_to
ON hr_public.job_information(reports_to);

-- Index for user_role_assignments.assigned_by
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_assigned_by
ON hr_public.user_role_assignments(assigned_by);

-- Index for notifications.user_id
CREATE INDEX IF NOT EXISTS idx_notifications_user_id
ON hr_public.notifications(user_id);

-- Index for user_role_assignments.role_id
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_role_id
ON hr_public.user_role_assignments(role_id);