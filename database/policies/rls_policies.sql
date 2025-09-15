-- Row-Level Security Policies for PostGraphile
-- Implements fine-grained access control based on JWT claims

-- Enable RLS on all public tables
ALTER TABLE hr_public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.time_off_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.performance_reviews ENABLE ROW LEVEL SECURITY;

-- Departments policies

-- Departments: Everyone can view departments (needed for dropdowns, org charts)
CREATE POLICY "departments_select_all" ON hr_public.departments
    FOR SELECT USING (true);

-- Departments: Only HR admins can insert/update/delete departments
CREATE POLICY "departments_modify_hr_admin" ON hr_public.departments
    FOR ALL USING (
        current_setting('jwt.claims.role_level', true)::INTEGER >= 80
    );

-- Employees policies

-- Employees: Users can view employees based on role level
CREATE POLICY "employees_select_by_role" ON hr_public.employees
    FOR SELECT USING (
        CASE 
            -- Super admin can see all
            WHEN current_setting('jwt.claims.role_level', true)::INTEGER >= 100 THEN true
            
            -- HR admin can see all active employees
            WHEN current_setting('jwt.claims.role_level', true)::INTEGER >= 80 THEN 
                status = 'ACTIVE'
            
            -- Managers can see employees in their department
            WHEN current_setting('jwt.claims.role_level', true)::INTEGER >= 60 THEN
                (status = 'ACTIVE' AND department_id = current_setting('jwt.claims.department_id', true)::INTEGER)
                OR id = current_setting('jwt.claims.employee_id', true)::INTEGER
                
            -- Employees can see themselves and company directory (basic info only)
            WHEN current_setting('jwt.claims.role_level', true)::INTEGER >= 20 THEN
                id = current_setting('jwt.claims.employee_id', true)::INTEGER
                OR (status = 'ACTIVE' AND termination_date IS NULL)
                
            -- Unauthenticated users see nothing
            ELSE false
        END
    );

-- Employees: Only HR admins can create employees
CREATE POLICY "employees_insert_hr_admin" ON hr_public.employees
    FOR INSERT WITH CHECK (
        current_setting('jwt.claims.role_level', true)::INTEGER >= 80
    );

-- Employees: Complex update rules based on role and field sensitivity
CREATE POLICY "employees_update_controlled" ON hr_public.employees
    FOR UPDATE USING (
        CASE
            -- HR admin can update anyone
            WHEN current_setting('jwt.claims.role_level', true)::INTEGER >= 80 THEN true
            
            -- Managers can update certain fields for direct reports in their department
            WHEN current_setting('jwt.claims.role_level', true)::INTEGER >= 60 THEN
                manager_id = current_setting('jwt.claims.employee_id', true)::INTEGER
                AND department_id = current_setting('jwt.claims.department_id', true)::INTEGER
                AND status = 'ACTIVE'
            
            -- Employees can update their own basic profile fields
            WHEN current_setting('jwt.claims.role_level', true)::INTEGER >= 20 THEN
                id = current_setting('jwt.claims.employee_id', true)::INTEGER
                AND status = 'ACTIVE'
            
            ELSE false
        END
    ) WITH CHECK (
        CASE
            -- HR admin has full update access
            WHEN current_setting('jwt.claims.role_level', true)::INTEGER >= 80 THEN true
            
            -- Managers can only update non-sensitive fields
            WHEN current_setting('jwt.claims.role_level', true)::INTEGER >= 60 THEN
                -- Prevent managers from changing sensitive fields
                role_level = OLD.role_level
                AND hire_date = OLD.hire_date
                AND termination_date = OLD.termination_date
                AND status = OLD.status
            
            -- Employees can only update their basic profile
            WHEN current_setting('jwt.claims.role_level', true)::INTEGER >= 20 THEN
                -- Employees can only change basic profile fields
                role_level = OLD.role_level
                AND hire_date = OLD.hire_date
                AND department_id = OLD.department_id
                AND manager_id = OLD.manager_id
                AND termination_date = OLD.termination_date
                AND status = OLD.status
                AND id = OLD.id
            
            ELSE false
        END
    );

-- Employees: Only HR admins can delete/terminate employees
CREATE POLICY "employees_delete_hr_admin" ON hr_public.employees
    FOR DELETE USING (
        current_setting('jwt.claims.role_level', true)::INTEGER >= 80
    );

-- Time-off requests policies

-- Time-off: Users can view requests based on role
CREATE POLICY "time_off_requests_select_by_role" ON hr_public.time_off_requests
    FOR SELECT USING (
        CASE
            -- HR admin can see all requests
            WHEN current_setting('jwt.claims.role_level', true)::INTEGER >= 80 THEN true
            
            -- Managers can see requests from direct reports in their department
            WHEN current_setting('jwt.claims.role_level', true)::INTEGER >= 60 THEN
                EXISTS (
                    SELECT 1 FROM hr_public.employees e
                    WHERE e.id = employee_id
                    AND e.manager_id = current_setting('jwt.claims.employee_id', true)::INTEGER
                    AND e.department_id = current_setting('jwt.claims.department_id', true)::INTEGER
                ) OR employee_id = current_setting('jwt.claims.employee_id', true)::INTEGER
            
            -- Employees can see their own requests
            WHEN current_setting('jwt.claims.role_level', true)::INTEGER >= 20 THEN
                employee_id = current_setting('jwt.claims.employee_id', true)::INTEGER
                
            ELSE false
        END
    );

-- Time-off: Employees can create their own requests
CREATE POLICY "time_off_requests_insert_own" ON hr_public.time_off_requests
    FOR INSERT WITH CHECK (
        current_setting('jwt.claims.role_level', true)::INTEGER >= 20
        AND employee_id = current_setting('jwt.claims.employee_id', true)::INTEGER
    );

-- Time-off: Complex update rules for approval workflow
CREATE POLICY "time_off_requests_update_controlled" ON hr_public.time_off_requests
    FOR UPDATE USING (
        CASE
            -- HR admin can update any request
            WHEN current_setting('jwt.claims.role_level', true)::INTEGER >= 80 THEN true
            
            -- Managers can approve/reject requests from direct reports
            WHEN current_setting('jwt.claims.role_level', true)::INTEGER >= 60 THEN
                EXISTS (
                    SELECT 1 FROM hr_public.employees e
                    WHERE e.id = employee_id
                    AND e.manager_id = current_setting('jwt.claims.employee_id', true)::INTEGER
                    AND e.department_id = current_setting('jwt.claims.department_id', true)::INTEGER
                ) AND employee_id != current_setting('jwt.claims.employee_id', true)::INTEGER
            
            -- Employees can modify their own pending requests
            WHEN current_setting('jwt.claims.role_level', true)::INTEGER >= 20 THEN
                employee_id = current_setting('jwt.claims.employee_id', true)::INTEGER
                AND status = 'PENDING'
                
            ELSE false
        END
    ) WITH CHECK (
        CASE
            -- HR admin has full update access
            WHEN current_setting('jwt.claims.role_level', true)::INTEGER >= 80 THEN true
            
            -- Managers can only change approval fields
            WHEN current_setting('jwt.claims.role_level', true)::INTEGER >= 60 THEN
                -- Managers can only update approval-related fields
                employee_id = OLD.employee_id
                AND request_type = OLD.request_type
                AND start_date = OLD.start_date
                AND end_date = OLD.end_date
                AND days_requested = OLD.days_requested
                AND reason = OLD.reason
                AND created_at = OLD.created_at
                -- Can change status, approved_by, approved_at, rejection_reason
            
            -- Employees can only change basic request details on pending requests
            WHEN current_setting('jwt.claims.role_level', true)::INTEGER >= 20 THEN
                employee_id = OLD.employee_id
                AND status = 'PENDING'
                AND approved_by IS NULL
                AND approved_at IS NULL
                AND rejection_reason IS NULL
                
            ELSE false
        END
    );

-- Time-off: Only the requester or HR admin can delete requests
CREATE POLICY "time_off_requests_delete_controlled" ON hr_public.time_off_requests
    FOR DELETE USING (
        current_setting('jwt.claims.role_level', true)::INTEGER >= 80
        OR (
            current_setting('jwt.claims.role_level', true)::INTEGER >= 20
            AND employee_id = current_setting('jwt.claims.employee_id', true)::INTEGER
            AND status = 'PENDING'
        )
    );

-- Performance reviews policies

-- Reviews: Users can view reviews based on role and involvement
CREATE POLICY "performance_reviews_select_by_role" ON hr_public.performance_reviews
    FOR SELECT USING (
        CASE
            -- HR admin can see all reviews
            WHEN current_setting('jwt.claims.role_level', true)::INTEGER >= 80 THEN true
            
            -- Reviewers can see reviews they're conducting
            WHEN reviewer_id = current_setting('jwt.claims.employee_id', true)::INTEGER THEN true
            
            -- Employees can see their own completed reviews
            WHEN employee_id = current_setting('jwt.claims.employee_id', true)::INTEGER 
                 AND status = 'COMPLETED' THEN true
                
            -- Managers can see reviews for direct reports in their department
            WHEN current_setting('jwt.claims.role_level', true)::INTEGER >= 60 THEN
                EXISTS (
                    SELECT 1 FROM hr_public.employees e
                    WHERE e.id = employee_id
                    AND e.manager_id = current_setting('jwt.claims.employee_id', true)::INTEGER
                    AND e.department_id = current_setting('jwt.claims.department_id', true)::INTEGER
                )
                
            ELSE false
        END
    );

-- Reviews: HR admin and managers can create reviews
CREATE POLICY "performance_reviews_insert_authorized" ON hr_public.performance_reviews
    FOR INSERT WITH CHECK (
        current_setting('jwt.claims.role_level', true)::INTEGER >= 60
        AND CASE
            -- HR admin can create any review
            WHEN current_setting('jwt.claims.role_level', true)::INTEGER >= 80 THEN true
            
            -- Managers can create reviews for direct reports in their department
            ELSE EXISTS (
                SELECT 1 FROM hr_public.employees e
                WHERE e.id = employee_id
                AND e.manager_id = current_setting('jwt.claims.employee_id', true)::INTEGER
                AND e.department_id = current_setting('jwt.claims.department_id', true)::INTEGER
                AND e.status = 'ACTIVE'
            ) AND reviewer_id = current_setting('jwt.claims.employee_id', true)::INTEGER
        END
    );

-- Reviews: Complex update rules for review process
CREATE POLICY "performance_reviews_update_controlled" ON hr_public.performance_reviews
    FOR UPDATE USING (
        CASE
            -- HR admin can update any review
            WHEN current_setting('jwt.claims.role_level', true)::INTEGER >= 80 THEN true
            
            -- Reviewers can update reviews they're conducting (if not completed)
            WHEN reviewer_id = current_setting('jwt.claims.employee_id', true)::INTEGER
                 AND status != 'COMPLETED' THEN true
            
            -- Employees can add comments to their own reviews
            WHEN employee_id = current_setting('jwt.claims.employee_id', true)::INTEGER THEN true
                
            ELSE false
        END
    ) WITH CHECK (
        CASE
            -- HR admin has full update access
            WHEN current_setting('jwt.claims.role_level', true)::INTEGER >= 80 THEN true
            
            -- Reviewers can update review content but not change employee/reviewer
            WHEN reviewer_id = current_setting('jwt.claims.employee_id', true)::INTEGER THEN
                employee_id = OLD.employee_id
                AND reviewer_id = OLD.reviewer_id
                AND review_period = OLD.review_period
                AND created_at = OLD.created_at
                
            -- Employees can only update their comments
            WHEN employee_id = current_setting('jwt.claims.employee_id', true)::INTEGER THEN
                employee_id = OLD.employee_id
                AND reviewer_id = OLD.reviewer_id
                AND review_period = OLD.review_period
                AND status = OLD.status
                AND overall_rating = OLD.overall_rating
                AND goals = OLD.goals
                AND achievements = OLD.achievements
                AND areas_for_improvement = OLD.areas_for_improvement
                AND feedback = OLD.feedback
                AND next_review_date = OLD.next_review_date
                AND created_at = OLD.created_at
                AND completed_at = OLD.completed_at
                -- Can only change employee_comments
                
            ELSE false
        END
    );

-- Reviews: Only HR admin can delete reviews
CREATE POLICY "performance_reviews_delete_hr_admin" ON hr_public.performance_reviews
    FOR DELETE USING (
        current_setting('jwt.claims.role_level', true)::INTEGER >= 80
    );

-- Additional security policies

-- Prevent modification of system audit fields
-- This is handled in the application layer and triggers, but we add constraints here too

-- Add constraint to prevent backdating important dates
ALTER TABLE hr_public.employees ADD CONSTRAINT employees_hire_date_reasonable 
    CHECK (hire_date BETWEEN '1950-01-01' AND CURRENT_DATE + INTERVAL '1 year');

ALTER TABLE hr_public.employees ADD CONSTRAINT employees_termination_after_hire 
    CHECK (termination_date IS NULL OR termination_date >= hire_date);

-- Add constraint to prevent negative time-off requests
ALTER TABLE hr_public.time_off_requests ADD CONSTRAINT time_off_business_days_only
    CHECK (days_requested <= (end_date - start_date + 1));

-- Add constraint for performance review ratings
ALTER TABLE hr_public.performance_reviews ADD CONSTRAINT performance_review_rating_precision
    CHECK (overall_rating IS NULL OR (overall_rating * 100)::INTEGER = (overall_rating * 100));

-- Comments for documentation
COMMENT ON POLICY "departments_select_all" ON hr_public.departments IS 'All authenticated users can view departments';
COMMENT ON POLICY "departments_modify_hr_admin" ON hr_public.departments IS 'Only HR admins can modify departments';

COMMENT ON POLICY "employees_select_by_role" ON hr_public.employees IS 'Hierarchical access to employee data based on role level';
COMMENT ON POLICY "employees_insert_hr_admin" ON hr_public.employees IS 'Only HR admins can create employees';
COMMENT ON POLICY "employees_update_controlled" ON hr_public.employees IS 'Role-based field-level update control for employee data';
COMMENT ON POLICY "employees_delete_hr_admin" ON hr_public.employees IS 'Only HR admins can delete employees';

COMMENT ON POLICY "time_off_requests_select_by_role" ON hr_public.time_off_requests IS 'Hierarchical access to time-off requests';
COMMENT ON POLICY "time_off_requests_insert_own" ON hr_public.time_off_requests IS 'Employees can create their own time-off requests';
COMMENT ON POLICY "time_off_requests_update_controlled" ON hr_public.time_off_requests IS 'Approval workflow with role-based field control';
COMMENT ON POLICY "time_off_requests_delete_controlled" ON hr_public.time_off_requests IS 'Controlled deletion of time-off requests';

COMMENT ON POLICY "performance_reviews_select_by_role" ON hr_public.performance_reviews IS 'Role and involvement-based access to performance reviews';
COMMENT ON POLICY "performance_reviews_insert_authorized" ON hr_public.performance_reviews IS 'Managers and HR can create performance reviews';
COMMENT ON POLICY "performance_reviews_update_controlled" ON hr_public.performance_reviews IS 'Review process workflow with field-level control';
COMMENT ON POLICY "performance_reviews_delete_hr_admin" ON hr_public.performance_reviews IS 'Only HR admins can delete performance reviews';