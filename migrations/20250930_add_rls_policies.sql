-- Migration: Add Row-Level Security (RLS) policies for manager department-scoped access
-- Feature: 016-repair-management-pages - Task T013
-- Purpose: Enforce RBAC at database level - managers can only access data from their department

-- ============================================================================
-- ENABLE RLS ON ALL MANAGEMENT TABLES
-- ============================================================================

ALTER TABLE hr_public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.employee_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.time_off_balances ENABLE ROW LEVEL SECURITY;

-- Note: payroll_records and compensation_bands already have RLS in production
-- We only add policies for management-related tables

-- ============================================================================
-- HELPER FUNCTION: Get user's department ID from JWT
-- ============================================================================

CREATE OR REPLACE FUNCTION hr_hidden.current_user_department_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT department_id
        FROM hr_public.users
        WHERE id = current_setting('jwt.claims.user_id', true)::uuid
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION hr_hidden.current_user_department_id() IS
    'Returns the department_id of the current authenticated user from JWT claims';

-- ============================================================================
-- HELPER FUNCTION: Check if user is manager of a department
-- ============================================================================

CREATE OR REPLACE FUNCTION hr_hidden.is_user_manager()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM hr_public.departments
        WHERE manager_id = current_setting('jwt.claims.user_id', true)::uuid
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION hr_hidden.is_user_manager() IS
    'Returns true if the current user is a manager of any department';

-- ============================================================================
-- HELPER FUNCTION: Check if user has admin role
-- ============================================================================

CREATE OR REPLACE FUNCTION hr_hidden.is_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN current_setting('jwt.claims.role', true)::text = 'admin'
        OR current_setting('jwt.claims.role', true)::text = 'super_admin';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION hr_hidden.is_user_admin() IS
    'Returns true if the current user has admin or super_admin role';

-- ============================================================================
-- LEAVE REQUESTS RLS POLICIES
-- ============================================================================

-- Policy: Managers can view leave requests from their department
CREATE POLICY manager_view_department_leave_requests
    ON hr_public.leave_requests
    FOR SELECT
    USING (
        hr_hidden.is_user_manager()
        AND employee_id IN (
            SELECT id
            FROM hr_public.users
            WHERE department_id = hr_hidden.current_user_department_id()
        )
    );

-- Policy: Managers can approve/reject leave requests from their department
CREATE POLICY manager_update_department_leave_requests
    ON hr_public.leave_requests
    FOR UPDATE
    USING (
        hr_hidden.is_user_manager()
        AND employee_id IN (
            SELECT id
            FROM hr_public.users
            WHERE department_id = hr_hidden.current_user_department_id()
        )
    )
    WITH CHECK (
        hr_hidden.is_user_manager()
        AND employee_id IN (
            SELECT id
            FROM hr_public.users
            WHERE department_id = hr_hidden.current_user_department_id()
        )
    );

-- Policy: Admins have full access to all leave requests
CREATE POLICY admin_full_access_leave_requests
    ON hr_public.leave_requests
    FOR ALL
    USING (hr_hidden.is_user_admin())
    WITH CHECK (hr_hidden.is_user_admin());

-- Policy: Employees can view their own leave requests
CREATE POLICY employee_view_own_leave_requests
    ON hr_public.leave_requests
    FOR SELECT
    USING (employee_id = current_setting('jwt.claims.user_id', true)::uuid);

-- Policy: Employees can create their own leave requests
CREATE POLICY employee_create_own_leave_requests
    ON hr_public.leave_requests
    FOR INSERT
    WITH CHECK (employee_id = current_setting('jwt.claims.user_id', true)::uuid);

-- ============================================================================
-- PERFORMANCE REVIEWS RLS POLICIES
-- ============================================================================

-- Policy: Managers can view performance reviews for their department
CREATE POLICY manager_view_department_performance_reviews
    ON hr_public.performance_reviews
    FOR SELECT
    USING (
        hr_hidden.is_user_manager()
        AND employee_id IN (
            SELECT id
            FROM hr_public.users
            WHERE department_id = hr_hidden.current_user_department_id()
        )
    );

-- Policy: Managers can create performance reviews for their department
CREATE POLICY manager_create_department_performance_reviews
    ON hr_public.performance_reviews
    FOR INSERT
    WITH CHECK (
        hr_hidden.is_user_manager()
        AND employee_id IN (
            SELECT id
            FROM hr_public.users
            WHERE department_id = hr_hidden.current_user_department_id()
        )
    );

-- Policy: Managers can update performance reviews for their department
CREATE POLICY manager_update_department_performance_reviews
    ON hr_public.performance_reviews
    FOR UPDATE
    USING (
        hr_hidden.is_user_manager()
        AND employee_id IN (
            SELECT id
            FROM hr_public.users
            WHERE department_id = hr_hidden.current_user_department_id()
        )
    )
    WITH CHECK (
        hr_hidden.is_user_manager()
        AND employee_id IN (
            SELECT id
            FROM hr_public.users
            WHERE department_id = hr_hidden.current_user_department_id()
        )
    );

-- Policy: Managers can delete performance reviews for their department
CREATE POLICY manager_delete_department_performance_reviews
    ON hr_public.performance_reviews
    FOR DELETE
    USING (
        hr_hidden.is_user_manager()
        AND employee_id IN (
            SELECT id
            FROM hr_public.users
            WHERE department_id = hr_hidden.current_user_department_id()
        )
    );

-- Policy: Admins have full access to all performance reviews
CREATE POLICY admin_full_access_performance_reviews
    ON hr_public.performance_reviews
    FOR ALL
    USING (hr_hidden.is_user_admin())
    WITH CHECK (hr_hidden.is_user_admin());

-- Policy: Employees can view their own reviews
CREATE POLICY employee_view_own_performance_reviews
    ON hr_public.performance_reviews
    FOR SELECT
    USING (employee_id = current_setting('jwt.claims.user_id', true)::uuid);

-- ============================================================================
-- EMPLOYEE GOALS RLS POLICIES
-- ============================================================================

-- Policy: Managers can view goals for their department
CREATE POLICY manager_view_department_goals
    ON hr_public.employee_goals
    FOR SELECT
    USING (
        hr_hidden.is_user_manager()
        AND employee_id IN (
            SELECT id
            FROM hr_public.users
            WHERE department_id = hr_hidden.current_user_department_id()
        )
    );

-- Policy: Managers can create goals for their department
CREATE POLICY manager_create_department_goals
    ON hr_public.employee_goals
    FOR INSERT
    WITH CHECK (
        hr_hidden.is_user_manager()
        AND employee_id IN (
            SELECT id
            FROM hr_public.users
            WHERE department_id = hr_hidden.current_user_department_id()
        )
    );

-- Policy: Managers can update goals for their department
CREATE POLICY manager_update_department_goals
    ON hr_public.employee_goals
    FOR UPDATE
    USING (
        hr_hidden.is_user_manager()
        AND employee_id IN (
            SELECT id
            FROM hr_public.users
            WHERE department_id = hr_hidden.current_user_department_id()
        )
    )
    WITH CHECK (
        hr_hidden.is_user_manager()
        AND employee_id IN (
            SELECT id
            FROM hr_public.users
            WHERE department_id = hr_hidden.current_user_department_id()
        )
    );

-- Policy: Managers can delete goals for their department
CREATE POLICY manager_delete_department_goals
    ON hr_public.employee_goals
    FOR DELETE
    USING (
        hr_hidden.is_user_manager()
        AND employee_id IN (
            SELECT id
            FROM hr_public.users
            WHERE department_id = hr_hidden.current_user_department_id()
        )
    );

-- Policy: Admins have full access to all goals
CREATE POLICY admin_full_access_goals
    ON hr_public.employee_goals
    FOR ALL
    USING (hr_hidden.is_user_admin())
    WITH CHECK (hr_hidden.is_user_admin());

-- Policy: Employees can view their own goals
CREATE POLICY employee_view_own_goals
    ON hr_public.employee_goals
    FOR SELECT
    USING (employee_id = current_setting('jwt.claims.user_id', true)::uuid);

-- Policy: Employees can update their own goal progress
CREATE POLICY employee_update_own_goal_progress
    ON hr_public.employee_goals
    FOR UPDATE
    USING (employee_id = current_setting('jwt.claims.user_id', true)::uuid)
    WITH CHECK (employee_id = current_setting('jwt.claims.user_id', true)::uuid);

-- ============================================================================
-- TASKS RLS POLICIES
-- ============================================================================

-- Policy: Managers can view tasks for their department
CREATE POLICY manager_view_department_tasks
    ON hr_public.tasks
    FOR SELECT
    USING (
        hr_hidden.is_user_manager()
        AND department_id = hr_hidden.current_user_department_id()
    );

-- Policy: Managers can create tasks for their department
CREATE POLICY manager_create_department_tasks
    ON hr_public.tasks
    FOR INSERT
    WITH CHECK (
        hr_hidden.is_user_manager()
        AND department_id = hr_hidden.current_user_department_id()
    );

-- Policy: Managers can update tasks for their department
CREATE POLICY manager_update_department_tasks
    ON hr_public.tasks
    FOR UPDATE
    USING (
        hr_hidden.is_user_manager()
        AND department_id = hr_hidden.current_user_department_id()
    )
    WITH CHECK (
        hr_hidden.is_user_manager()
        AND department_id = hr_hidden.current_user_department_id()
    );

-- Policy: Managers can delete tasks for their department
CREATE POLICY manager_delete_department_tasks
    ON hr_public.tasks
    FOR DELETE
    USING (
        hr_hidden.is_user_manager()
        AND department_id = hr_hidden.current_user_department_id()
    );

-- Policy: Admins have full access to all tasks
CREATE POLICY admin_full_access_tasks
    ON hr_public.tasks
    FOR ALL
    USING (hr_hidden.is_user_admin())
    WITH CHECK (hr_hidden.is_user_admin());

-- Policy: Employees can view tasks assigned to them
CREATE POLICY employee_view_assigned_tasks
    ON hr_public.tasks
    FOR SELECT
    USING (assignee_id = current_setting('jwt.claims.user_id', true)::uuid);

-- Policy: Employees can update status of tasks assigned to them
CREATE POLICY employee_update_assigned_task_status
    ON hr_public.tasks
    FOR UPDATE
    USING (assignee_id = current_setting('jwt.claims.user_id', true)::uuid)
    WITH CHECK (assignee_id = current_setting('jwt.claims.user_id', true)::uuid);

-- ============================================================================
-- TIME OFF BALANCES RLS POLICIES
-- ============================================================================

-- Policy: Managers can view time off balances for their department
CREATE POLICY manager_view_department_time_off_balances
    ON hr_public.time_off_balances
    FOR SELECT
    USING (
        hr_hidden.is_user_manager()
        AND employee_id IN (
            SELECT id
            FROM hr_public.users
            WHERE department_id = hr_hidden.current_user_department_id()
        )
    );

-- Policy: Admins have full access to time off balances
CREATE POLICY admin_full_access_time_off_balances
    ON hr_public.time_off_balances
    FOR ALL
    USING (hr_hidden.is_user_admin())
    WITH CHECK (hr_hidden.is_user_admin());

-- Policy: Employees can view their own time off balances
CREATE POLICY employee_view_own_time_off_balances
    ON hr_public.time_off_balances
    FOR SELECT
    USING (employee_id = current_setting('jwt.claims.user_id', true)::uuid);

-- ============================================================================
-- GRANT EXECUTE PERMISSIONS
-- ============================================================================

-- Grant execute on helper functions to roles
GRANT EXECUTE ON FUNCTION hr_hidden.current_user_department_id() TO guest, employee, manager, admin, super_admin;
GRANT EXECUTE ON FUNCTION hr_hidden.is_user_manager() TO guest, employee, manager, admin, super_admin;
GRANT EXECUTE ON FUNCTION hr_hidden.is_user_admin() TO guest, employee, manager, admin, super_admin;

-- ============================================================================
-- VALIDATION QUERY
-- ============================================================================

-- Query to verify RLS policies are active
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'hr_public'
    AND tablename IN ('leave_requests', 'performance_reviews', 'employee_goals', 'tasks', 'time_off_balances');

    RAISE NOTICE 'RLS policies created: %', policy_count;

    IF policy_count < 30 THEN
        RAISE WARNING 'Expected at least 30 RLS policies, but only % were created', policy_count;
    ELSE
        RAISE NOTICE 'RLS policy creation successful!';
    END IF;
END;
$$;

-- Add comments for documentation
COMMENT ON POLICY manager_view_department_leave_requests ON hr_public.leave_requests IS
    'Managers can view leave requests from employees in their department only';

COMMENT ON POLICY admin_full_access_leave_requests ON hr_public.leave_requests IS
    'Admins have unrestricted access to all leave requests across all departments';

COMMENT ON POLICY manager_create_department_tasks ON hr_public.tasks IS
    'Managers can assign tasks to employees in their department only (FR-005)';
