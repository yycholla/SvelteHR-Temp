-- Migration: Add Missing Indexes for PostGraphile Performance
-- Created: 2025-09-15
-- Description: Add all missing foreign key indexes recommended by PostGraphile

-- Time-off system indexes
CREATE INDEX IF NOT EXISTS idx_time_off_policies_created_by ON hr_public.time_off_policies(created_by);
CREATE INDEX IF NOT EXISTS idx_time_off_requests_reviewed_by ON hr_public.time_off_requests(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_time_off_requests_policy_id ON hr_public.time_off_requests(policy_id);

-- Performance review system indexes  
CREATE INDEX IF NOT EXISTS idx_review_cycles_created_by ON hr_public.review_cycles(created_by);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_hr_reviewer_id ON hr_public.performance_reviews(hr_reviewer_id);
CREATE INDEX IF NOT EXISTS idx_goals_created_by ON hr_public.goals(created_by);
CREATE INDEX IF NOT EXISTS idx_goals_review_id ON hr_public.goals(review_id);

-- Payroll system indexes
CREATE INDEX IF NOT EXISTS idx_payroll_periods_processed_by ON hr_public.payroll_periods(processed_by);
CREATE INDEX IF NOT EXISTS idx_payroll_periods_approved_by ON hr_public.payroll_periods(approved_by);
CREATE INDEX IF NOT EXISTS idx_payroll_periods_created_by ON hr_public.payroll_periods(created_by);

-- Document management indexes
CREATE INDEX IF NOT EXISTS idx_document_templates_created_by ON hr_public.document_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_document_templates_previous_version_id ON hr_public.document_templates(previous_version_id);
CREATE INDEX IF NOT EXISTS idx_employee_documents_created_by ON hr_public.employee_documents(created_by);
CREATE INDEX IF NOT EXISTS idx_employee_documents_template_id ON hr_public.employee_documents(template_id);
CREATE INDEX IF NOT EXISTS idx_document_access_user_id ON hr_public.document_access(user_id);
CREATE INDEX IF NOT EXISTS idx_document_access_granted_by ON hr_public.document_access(granted_by);

-- Additional performance indexes for common queries
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_active_role ON hr_public.user_role_assignments(user_id, role_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_job_information_active ON hr_public.job_information(employee_id, end_date) WHERE end_date IS NULL;
CREATE INDEX IF NOT EXISTS idx_time_off_balances_user_year ON hr_public.time_off_balances(user_id, year, policy_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_employee_cycle ON hr_public.performance_reviews(employee_id, cycle_id);
CREATE INDEX IF NOT EXISTS idx_goals_employee_status ON hr_public.goals(employee_id, status);

-- Comments
COMMENT ON INDEX idx_time_off_policies_created_by IS 'Index for PostGraphile foreign key performance';
COMMENT ON INDEX idx_time_off_requests_reviewed_by IS 'Index for PostGraphile foreign key performance';
COMMENT ON INDEX idx_payroll_periods_processed_by IS 'Index for PostGraphile foreign key performance';
COMMENT ON INDEX idx_document_templates_created_by IS 'Index for PostGraphile foreign key performance';
COMMENT ON INDEX idx_user_role_assignments_active_role IS 'Composite index for active role assignments';
COMMENT ON INDEX idx_job_information_active IS 'Index for active job information queries';