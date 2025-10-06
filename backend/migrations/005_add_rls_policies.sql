-- Migration 005: Add RLS policies for performance reviews
-- Feature: 023-reviews-creation-it
-- Date: 2025-10-06
-- Description: Enable Row-Level Security and create policies for RBAC enforcement
-- Dependencies: T001-T004 must be complete

-- =====================================================
-- Helper Functions for RLS
-- =====================================================

-- Get current authenticated user ID
CREATE OR REPLACE FUNCTION current_user_id() RETURNS UUID AS $$
  SELECT COALESCE(
    current_setting('jwt.claims.user_id', true)::UUID,
    current_setting('request.jwt.claim.user_id', true)::UUID
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Check if user has specific role
CREATE OR REPLACE FUNCTION has_role(role_name TEXT) RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM users
    WHERE id = current_user_id()
    AND role = role_name
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Check if user A is direct report of user B
CREATE OR REPLACE FUNCTION is_direct_report(employee_id UUID, manager_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM users
    WHERE id = employee_id
    AND manager_id = manager_id
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- =====================================================
-- RLS Policies for performance_reviews
-- =====================================================

-- Enable RLS on performance_reviews
ALTER TABLE performance_reviews ENABLE ROW LEVEL SECURITY;

-- Policy: Employees can view their own reviews
CREATE POLICY view_own_reviews ON performance_reviews
  FOR SELECT
  USING (
    employee_id = current_user_id()
    OR reviewer_id = current_user_id()
  );

-- Policy: Admins can view all reviews
CREATE POLICY admin_view_all_reviews ON performance_reviews
  FOR SELECT
  USING (
    has_role('admin')
    OR has_role('super_admin')
    OR has_role('hr_admin')
  );

-- Policy: Managers can view reviews for their direct reports
CREATE POLICY manager_view_direct_report_reviews ON performance_reviews
  FOR SELECT
  USING (
    (has_role('manager') OR has_role('hr_manager'))
    AND employee_id IN (
      SELECT id FROM users WHERE manager_id = current_user_id()
    )
  );

-- Policy: Admins and managers can create/update reviews
CREATE POLICY manage_reviews ON performance_reviews
  FOR ALL
  USING (
    has_role('admin')
    OR has_role('super_admin')
    OR has_role('hr_admin')
    OR has_role('manager')
    OR has_role('hr_manager')
  )
  WITH CHECK (
    has_role('admin')
    OR has_role('super_admin')
    OR has_role('hr_admin')
    OR has_role('manager')
    OR has_role('hr_manager')
  );

-- =====================================================
-- RLS Policies for goals
-- =====================================================

-- Enable RLS on goals
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

-- Policy: Employees can view their own goals
CREATE POLICY view_own_goals ON goals
  FOR SELECT
  USING (employee_id = current_user_id());

-- Policy: Admins can view all goals
CREATE POLICY admin_view_all_goals ON goals
  FOR SELECT
  USING (
    has_role('admin')
    OR has_role('super_admin')
    OR has_role('hr_admin')
  );

-- Policy: Managers can view goals for their direct reports
CREATE POLICY manager_view_direct_report_goals ON goals
  FOR SELECT
  USING (
    (has_role('manager') OR has_role('hr_manager'))
    AND employee_id IN (
      SELECT id FROM users WHERE manager_id = current_user_id()
    )
  );

-- Policy: Admins and managers can create/update/delete goals
CREATE POLICY manage_goals ON goals
  FOR ALL
  USING (
    has_role('admin')
    OR has_role('super_admin')
    OR has_role('hr_admin')
    OR (
      (has_role('manager') OR has_role('hr_manager'))
      AND employee_id IN (
        SELECT id FROM users WHERE manager_id = current_user_id()
      )
    )
  )
  WITH CHECK (
    has_role('admin')
    OR has_role('super_admin')
    OR has_role('hr_admin')
    OR (
      (has_role('manager') OR has_role('hr_manager'))
      AND employee_id IN (
        SELECT id FROM users WHERE manager_id = current_user_id()
      )
    )
  );

-- =====================================================
-- RLS Policies for review_goals
-- =====================================================

-- Enable RLS on review_goals
ALTER TABLE review_goals ENABLE ROW LEVEL SECURITY;

-- Policy: Inherit visibility from parent performance_reviews table
CREATE POLICY view_review_goals ON review_goals
  FOR SELECT
  USING (
    review_id IN (
      SELECT id FROM performance_reviews
      WHERE employee_id = current_user_id()
        OR reviewer_id = current_user_id()
        OR has_role('admin')
        OR has_role('super_admin')
        OR has_role('hr_admin')
    )
  );

-- Policy: Admins and managers can manage review-goal associations
CREATE POLICY manage_review_goals ON review_goals
  FOR ALL
  USING (
    review_id IN (
      SELECT id FROM performance_reviews
      WHERE reviewer_id = current_user_id()
        OR has_role('admin')
        OR has_role('super_admin')
        OR has_role('hr_admin')
    )
  )
  WITH CHECK (
    review_id IN (
      SELECT id FROM performance_reviews
      WHERE reviewer_id = current_user_id()
        OR has_role('admin')
        OR has_role('super_admin')
        OR has_role('hr_admin')
    )
  );

-- =====================================================
-- Add Comments for Documentation
-- =====================================================

COMMENT ON FUNCTION current_user_id() IS 'Gets the authenticated user ID from JWT claims';
COMMENT ON FUNCTION has_role(TEXT) IS 'Checks if the current user has a specific role';
COMMENT ON FUNCTION is_direct_report(UUID, UUID) IS 'Checks if employee is a direct report of manager';

COMMENT ON POLICY view_own_reviews ON performance_reviews IS 'Employees can view reviews where they are the employee or reviewer';
COMMENT ON POLICY admin_view_all_reviews ON performance_reviews IS 'Admins and HR can view all reviews';
COMMENT ON POLICY manager_view_direct_report_reviews ON performance_reviews IS 'Managers can view reviews for their direct reports';
COMMENT ON POLICY manage_reviews ON performance_reviews IS 'Admins and managers can create/update reviews';

COMMENT ON POLICY view_own_goals ON goals IS 'Employees can view their own goals';
COMMENT ON POLICY admin_view_all_goals ON goals IS 'Admins and HR can view all goals';
COMMENT ON POLICY manager_view_direct_report_goals ON goals IS 'Managers can view goals for their direct reports';
COMMENT ON POLICY manage_goals ON goals IS 'Admins and managers can manage goals';

COMMENT ON POLICY view_review_goals ON review_goals IS 'Review-goal associations inherit visibility from parent review';
COMMENT ON POLICY manage_review_goals ON review_goals IS 'Reviewers and admins can manage review-goal associations';

-- Validation: Verify RLS is enabled and policies are created
-- Run: SELECT tablename, policies FROM pg_policies WHERE tablename IN ('performance_reviews', 'goals', 'review_goals');
-- Run: SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename IN ('performance_reviews', 'goals', 'review_goals');
