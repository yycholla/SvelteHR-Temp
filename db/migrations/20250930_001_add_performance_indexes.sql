-- Migration: Add performance indexes for department-scoped queries
-- Feature: 016-repair-management-pages
-- Task: T003
-- Purpose: Optimize query performance for manager RBAC filtering and admin operations

-- ============================================================================
-- DEPARTMENT-SCOPED FILTERING INDEXES
-- ============================================================================
-- These indexes optimize the primary RBAC filtering pattern where managers
-- query data filtered by department_id

-- Leave requests - already has index from tasks table creation, verify it exists
CREATE INDEX IF NOT EXISTS leave_requests_department_id_idx
    ON hr_public.leave_requests(employee_id)
    INCLUDE (status, start_date, end_date);

-- Performance reviews - composite index for manager queries
CREATE INDEX IF NOT EXISTS performance_reviews_department_idx
    ON hr_public.performance_reviews(employee_id)
    INCLUDE (status, review_period, overall_rating);

-- Employee goals - composite index for manager goal tracking
CREATE INDEX IF NOT EXISTS employee_goals_department_idx
    ON hr_public.employee_goals(employee_id)
    INCLUDE (status, target_date, progress_percentage);

-- Time off balances - optimize manager leave balance queries
CREATE INDEX IF NOT EXISTS time_off_balances_employee_idx
    ON hr_public.time_off_balances(employee_id, policy_id)
    INCLUDE (balance_days, used_days, year);

-- ============================================================================
-- MANAGER RELATIONSHIP INDEXES
-- ============================================================================
-- Optimize queries that join on manager assignments

-- Index on departments.manager_id for reverse lookups
CREATE INDEX IF NOT EXISTS departments_manager_id_idx
    ON hr_public.departments(manager_id)
    WHERE manager_id IS NOT NULL;

-- Composite index on users for manager identification
CREATE INDEX IF NOT EXISTS users_department_role_idx
    ON hr_public.users(department_id, role)
    WHERE is_active = true;

-- ============================================================================
-- TEMPORAL FILTERING INDEXES
-- ============================================================================
-- Optimize date-range queries common in management pages

-- Leave requests by date range
CREATE INDEX IF NOT EXISTS leave_requests_date_range_idx
    ON hr_public.leave_requests(start_date, end_date)
    INCLUDE (status, leave_type);

-- Performance reviews by period
CREATE INDEX IF NOT EXISTS performance_reviews_period_idx
    ON hr_public.performance_reviews(review_period, status)
    INCLUDE (overall_rating);

-- Employee goals by target date
CREATE INDEX IF NOT EXISTS employee_goals_target_date_idx
    ON hr_public.employee_goals(target_date)
    WHERE target_date IS NOT NULL AND status != 'cancelled';

-- ============================================================================
-- STATUS FILTERING INDEXES
-- ============================================================================
-- Optimize common status-based queries

-- Leave requests pending approval (critical for manager dashboard)
CREATE INDEX IF NOT EXISTS leave_requests_pending_idx
    ON hr_public.leave_requests(employee_id, created_at DESC)
    WHERE status = 'pending';

-- Performance reviews in progress
CREATE INDEX IF NOT EXISTS performance_reviews_in_progress_idx
    ON hr_public.performance_reviews(employee_id, updated_at DESC)
    WHERE status = 'in_progress';

-- Active employee goals
CREATE INDEX IF NOT EXISTS employee_goals_active_idx
    ON hr_public.employee_goals(employee_id, target_date)
    WHERE status = 'in_progress';

-- DEPRECATED: Tasks indexes removed (table dropped in 20251009_000, recreated in public schema)
-- -- Tasks by status and assignee
-- CREATE INDEX IF NOT EXISTS tasks_assignee_status_idx
--     ON hr_public.tasks(assignee_id, status, due_date)
--     WHERE status != 'cancelled';
--
-- -- Tasks by status and assigner (for manager tracking)
-- CREATE INDEX IF NOT EXISTS tasks_assigner_status_idx
--     ON hr_public.tasks(assigner_id, status, created_at DESC)
--     WHERE status != 'cancelled';

-- ============================================================================
-- AUDIT AND REPORTING INDEXES
-- ============================================================================
-- Optimize queries for audit logs and report generation

-- User role assignments for RBAC checks
CREATE INDEX IF NOT EXISTS user_role_assignments_user_idx
    ON hr_public.user_role_assignments(user_id, role_name);

-- Payroll records by employee and period
CREATE INDEX IF NOT EXISTS payroll_records_employee_period_idx
    ON hr_public.payroll_records(employee_id, pay_period_start DESC);

-- ============================================================================
-- FULL-TEXT SEARCH INDEXES (for admin search functionality)
-- ============================================================================
-- Enable efficient text search in admin pages

-- Users full-text search on name and email
CREATE INDEX IF NOT EXISTS users_search_idx
    ON hr_public.users
    USING GIN (to_tsvector('english', first_name || ' ' || last_name || ' ' || email));

-- Departments full-text search
CREATE INDEX IF NOT EXISTS departments_search_idx
    ON hr_public.departments
    USING GIN (to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- DEPRECATED: Tasks full-text search (table moved to public schema in 20251009)
-- CREATE INDEX IF NOT EXISTS tasks_search_idx
--     ON hr_public.tasks
--     USING GIN (to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- ============================================================================
-- STATISTICS UPDATE
-- ============================================================================
-- Update table statistics for query planner optimization

ANALYZE hr_public.users;
ANALYZE hr_public.departments;
ANALYZE hr_public.leave_requests;
ANALYZE hr_public.performance_reviews;
ANALYZE hr_public.employee_goals;
-- DEPRECATED: Tasks table moved to public schema in 20251009
-- ANALYZE hr_public.tasks;
ANALYZE hr_public.time_off_balances;
ANALYZE hr_public.user_role_assignments;
ANALYZE hr_public.payroll_records;

-- Add documentation comments
COMMENT ON INDEX hr_public.leave_requests_pending_idx IS 'Optimizes manager dashboard pending leave requests query';
COMMENT ON INDEX hr_public.users_department_role_idx IS 'Optimizes RBAC queries for manager identification';
-- DEPRECATED: Tasks indexes moved to public schema (see 20251009_000)
-- COMMENT ON INDEX hr_public.tasks_assignee_status_idx IS 'Optimizes task list queries by assignee and status';
COMMENT ON INDEX hr_public.users_search_idx IS 'Enables full-text search for admin user management';
