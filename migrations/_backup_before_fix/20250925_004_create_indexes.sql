-- PostgreSQL performance indexes and complex constraints for SvelteHR
-- This script creates performance optimization indexes after data insertion

-- Performance indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_email ON hr_public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_department_id ON hr_public.users(department_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON hr_public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON hr_public.users(is_active) WHERE is_active = true;

-- Performance indexes for departments table
CREATE INDEX IF NOT EXISTS idx_departments_manager_id ON hr_public.departments(manager_id);

-- Performance indexes for leave requests
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_id ON hr_public.leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_manager_id ON hr_public.leave_requests(manager_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON hr_public.leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON hr_public.leave_requests(start_date, end_date);

-- Performance indexes for performance reviews
CREATE INDEX IF NOT EXISTS idx_performance_reviews_employee_id ON hr_public.performance_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_reviewer_id ON hr_public.performance_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_status ON hr_public.performance_reviews(status);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_period ON hr_public.performance_reviews(review_period);

-- Performance indexes for user role assignments
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_user_id ON hr_public.user_role_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_role_name ON hr_public.user_role_assignments(role_name);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_assigned_by ON hr_public.user_role_assignments(assigned_by);

-- Performance indexes for time off balances
CREATE INDEX IF NOT EXISTS idx_time_off_balances_policy_id ON hr_public.time_off_balances(policy_id);
CREATE INDEX IF NOT EXISTS idx_time_off_balances_employee_id ON hr_public.time_off_balances(employee_id);

-- Performance indexes for employee goals
CREATE INDEX IF NOT EXISTS idx_employee_goals_employee_id ON hr_public.employee_goals(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_goals_created_by ON hr_public.employee_goals(created_by);

-- Performance indexes for compensation bands
CREATE INDEX IF NOT EXISTS idx_compensation_bands_created_by ON hr_public.compensation_bands(created_by);

-- Performance indexes for payroll records
CREATE INDEX IF NOT EXISTS idx_payroll_records_employee_id ON hr_public.payroll_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_records_processed_by ON hr_public.payroll_records(processed_by);
CREATE INDEX IF NOT EXISTS idx_payroll_records_created_by ON hr_public.payroll_records(created_by);
CREATE INDEX IF NOT EXISTS idx_payroll_records_pay_period ON hr_public.payroll_records(pay_period_start, pay_period_end);

-- Performance indexes for review templates
CREATE INDEX IF NOT EXISTS idx_review_templates_created_by ON hr_public.review_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_review_templates_active ON hr_public.review_templates(is_active) WHERE is_active = true;

-- Additional complex constraints
ALTER TABLE hr_public.users ADD CONSTRAINT check_valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Create utility functions in hr_hidden schema for performance
CREATE OR REPLACE FUNCTION hr_hidden.calculate_business_days(start_date DATE, end_date DATE)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM generate_series(start_date, end_date, '1 day'::interval) AS day
        WHERE EXTRACT(DOW FROM day) NOT IN (0, 6) -- Exclude weekends
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Grant appropriate permissions on indexes and functions
-- Updated role names (hr_ prefix removed in migration 20251002_003)
GRANT USAGE ON SCHEMA hr_public TO guest, employee, manager, admin, super_admin;
GRANT SELECT ON ALL TABLES IN SCHEMA hr_public TO guest;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA hr_public TO employee, manager, admin, super_admin;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA hr_hidden TO manager, admin, super_admin;