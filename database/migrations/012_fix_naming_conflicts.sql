-- Migration: Fix PostGraphile Naming Conflicts
-- Created: 2025-09-15
-- Description: Resolve GraphQL type naming conflicts and optimize PostGraphile schema generation

-- Fix naming conflicts by adding PostGraphile smart comments
COMMENT ON FUNCTION hr_public.create_goal(UUID, VARCHAR, TEXT, VARCHAR, VARCHAR, DATE) IS
'@name createEmployeeGoal
@resultFieldName employeeGoal
Create a new employee goal with specified parameters';

COMMENT ON FUNCTION hr_public.update_goal_progress(UUID, INTEGER, TEXT) IS
'@name updateEmployeeGoalProgress
@resultFieldName goalProgress
Update progress on an existing employee goal';

COMMENT ON FUNCTION hr_public.create_payroll_period(VARCHAR, hr_public.pay_frequency, DATE, DATE, DATE) IS
'@name createPayrollCycle
@resultFieldName payrollCycle
Create a new payroll period for processing employee payments';

-- Add explicit table naming to avoid conflicts
COMMENT ON TABLE hr_public.goals IS '@name EmployeeGoal
Individual employee goals linked to performance reviews';

COMMENT ON TABLE hr_public.payroll_periods IS '@name PayrollCycle
Payroll processing periods with status and totals';

-- Ensure indexes are properly named for PostGraphile detection
-- (These will be no-ops if indexes already exist)
DO $$
BEGIN
    -- Foreign key indexes with explicit PostGraphile-friendly naming
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'fk_time_off_policies_created_by_idx') THEN
        CREATE INDEX fk_time_off_policies_created_by_idx ON hr_public.time_off_policies(created_by);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'fk_time_off_requests_reviewed_by_idx') THEN
        CREATE INDEX fk_time_off_requests_reviewed_by_idx ON hr_public.time_off_requests(reviewed_by);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'fk_time_off_requests_policy_id_idx') THEN
        CREATE INDEX fk_time_off_requests_policy_id_idx ON hr_public.time_off_requests(policy_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'fk_review_cycles_created_by_idx') THEN
        CREATE INDEX fk_review_cycles_created_by_idx ON hr_public.review_cycles(created_by);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'fk_performance_reviews_hr_reviewer_id_idx') THEN
        CREATE INDEX fk_performance_reviews_hr_reviewer_id_idx ON hr_public.performance_reviews(hr_reviewer_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'fk_goals_created_by_idx') THEN
        CREATE INDEX fk_goals_created_by_idx ON hr_public.goals(created_by);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'fk_goals_review_id_idx') THEN
        CREATE INDEX fk_goals_review_id_idx ON hr_public.goals(review_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'fk_payroll_periods_processed_by_idx') THEN
        CREATE INDEX fk_payroll_periods_processed_by_idx ON hr_public.payroll_periods(processed_by);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'fk_payroll_periods_approved_by_idx') THEN
        CREATE INDEX fk_payroll_periods_approved_by_idx ON hr_public.payroll_periods(approved_by);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'fk_payroll_periods_created_by_idx') THEN
        CREATE INDEX fk_payroll_periods_created_by_idx ON hr_public.payroll_periods(created_by);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'fk_document_templates_created_by_idx') THEN
        CREATE INDEX fk_document_templates_created_by_idx ON hr_public.document_templates(created_by);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'fk_document_templates_previous_version_id_idx') THEN
        CREATE INDEX fk_document_templates_previous_version_id_idx ON hr_public.document_templates(previous_version_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'fk_employee_documents_created_by_idx') THEN
        CREATE INDEX fk_employee_documents_created_by_idx ON hr_public.employee_documents(created_by);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'fk_employee_documents_template_id_idx') THEN
        CREATE INDEX fk_employee_documents_template_id_idx ON hr_public.employee_documents(template_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'fk_document_access_user_id_idx') THEN
        CREATE INDEX fk_document_access_user_id_idx ON hr_public.document_access(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'fk_document_access_granted_by_idx') THEN
        CREATE INDEX fk_document_access_granted_by_idx ON hr_public.document_access(granted_by);
    END IF;
END
$$;

-- Add comments to the new indexes
COMMENT ON INDEX fk_time_off_policies_created_by_idx IS 'PostGraphile foreign key index';
COMMENT ON INDEX fk_payroll_periods_processed_by_idx IS 'PostGraphile foreign key index';
COMMENT ON INDEX fk_document_templates_created_by_idx IS 'PostGraphile foreign key index';

-- Refresh PostGraphile permissions by updating table comments
COMMENT ON TABLE hr_public.time_off_policies IS '@name TimeOffPolicy
Time-off policies with accrual rules and limits';

COMMENT ON TABLE hr_public.time_off_requests IS '@name TimeOffRequest  
Employee time-off requests with approval workflow';

COMMENT ON TABLE hr_public.performance_reviews IS '@name PerformanceReview
Employee performance reviews with ratings and feedback';

COMMENT ON TABLE hr_public.document_templates IS '@name DocumentTemplate
Document templates for generating standardized HR documents';

COMMENT ON TABLE hr_public.employee_documents IS '@name EmployeeDocument
Employee documents with file storage and digital signature support';