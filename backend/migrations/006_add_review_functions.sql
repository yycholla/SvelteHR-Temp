-- Migration 006: Add PostgreSQL functions for performance reviews
-- Feature: 023-reviews-creation-it
-- Date: 2025-10-06
-- Description: Create stored functions that PostGraphile will expose as GraphQL mutations/queries

-- ============================================================================
-- Helper Function: Check if user is direct manager
-- ============================================================================

CREATE OR REPLACE FUNCTION hr_public.is_direct_manager(
  p_employee_id UUID,
  p_manager_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM hr_public.users
    WHERE id = p_employee_id
    AND manager_id = p_manager_id
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION hr_public.is_direct_manager IS 'Check if manager_id is the direct manager of employee_id';

-- ============================================================================
-- Query: Get active reviews for employee (for duplicate checking)
-- ============================================================================

CREATE OR REPLACE FUNCTION hr_public.active_reviews_for_employee(
  p_employee_id UUID,
  p_review_type hr_public.review_type DEFAULT NULL
) RETURNS SETOF hr_public.performance_reviews AS $$
BEGIN
  RETURN QUERY
  SELECT pr.*
  FROM hr_public.performance_reviews pr
  WHERE pr.employee_id = p_employee_id
    AND pr.status IN ('draft', 'in_progress')
    AND (p_review_type IS NULL OR pr.review_type = p_review_type)
  ORDER BY pr.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION hr_public.active_reviews_for_employee IS 'Get active (draft or in_progress) reviews for an employee';

-- ============================================================================
-- Query: Get direct reports for a manager
-- ============================================================================

CREATE OR REPLACE FUNCTION hr_public.direct_reports(
  p_manager_id UUID
) RETURNS SETOF hr_public.users AS $$
BEGIN
  RETURN QUERY
  SELECT u.*
  FROM hr_public.users u
  WHERE u.manager_id = p_manager_id
  ORDER BY u.last_name, u.first_name;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION hr_public.direct_reports IS 'Get all direct reports for a manager';

-- ============================================================================
-- Query: Get review types metadata
-- ============================================================================

CREATE OR REPLACE FUNCTION hr_public.review_types_metadata()
RETURNS TABLE (
  value TEXT,
  label TEXT,
  description TEXT,
  display_order INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    'ANNUAL_REVIEW'::TEXT, 'Annual Review'::TEXT,
    'Comprehensive yearly performance evaluation'::TEXT, 1
  UNION ALL SELECT
    'MID_YEAR_REVIEW'::TEXT, 'Mid-Year Review'::TEXT,
    'Mid-year checkpoint and goal adjustment'::TEXT, 2
  UNION ALL SELECT
    'QUARTERLY_REVIEW'::TEXT, 'Quarterly Review'::TEXT,
    'Quarterly progress check and feedback'::TEXT, 3
  UNION ALL SELECT
    'PROBATIONARY_REVIEW'::TEXT, 'Probationary Review'::TEXT,
    'End of probation period evaluation'::TEXT, 4
  UNION ALL SELECT
    'PERFORMANCE_IMPROVEMENT_PLAN'::TEXT, 'Performance Improvement Plan (PIP)'::TEXT,
    'Structured plan for performance improvement'::TEXT, 5
  UNION ALL SELECT
    'NINETY_DAY_REVIEW'::TEXT, '90-Day Review'::TEXT,
    'Initial 90-day performance check for new hires'::TEXT, 6
  UNION ALL SELECT
    'PROJECT_BASED_REVIEW'::TEXT, 'Project-Based Review'::TEXT,
    'Review focused on specific project performance'::TEXT, 7
  UNION ALL SELECT
    'PROMOTION_REVIEW'::TEXT, 'Promotion Review'::TEXT,
    'Evaluation for promotion consideration'::TEXT, 8
  UNION ALL SELECT
    'EXIT_REVIEW'::TEXT, 'Exit Review'::TEXT,
    'Final review and feedback for departing employees'::TEXT, 9
  UNION ALL SELECT
    'SELF_REVIEW'::TEXT, 'Self Review'::TEXT,
    'Employee self-assessment and reflection'::TEXT, 10;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION hr_public.review_types_metadata IS 'Get all review types with metadata for UI dropdowns';

-- ============================================================================
-- Mutation: Create performance review with goals
-- ============================================================================

CREATE OR REPLACE FUNCTION hr_public.create_review_with_goals(
  p_employee_id UUID,
  p_review_type hr_public.review_type,
  p_review_period_start DATE DEFAULT NULL,
  p_review_period_end DATE DEFAULT NULL,
  p_goal_ids UUID[] DEFAULT '{}',
  p_new_goals JSONB DEFAULT '[]',
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_review_id UUID;
  v_reviewer_id UUID;
  v_current_user_role TEXT;
  v_is_direct_manager BOOLEAN;
  v_duplicate_count INT;
  v_new_goal_id UUID;
  v_new_goal JSONB;
  v_result JSONB;
BEGIN
  -- Get current user ID from JWT claims
  v_reviewer_id := COALESCE(
    current_setting('jwt.claims.user_id', true)::UUID,
    current_setting('request.jwt.claim.user_id', true)::UUID
  );

  -- Get current user role
  SELECT role INTO v_current_user_role
  FROM hr_public.users
  WHERE id = v_reviewer_id;

  -- RBAC: Check if manager is trying to create review for non-direct report
  IF v_current_user_role IN ('manager', 'hr_manager') THEN
    v_is_direct_manager := hr_public.is_direct_manager(p_employee_id, v_reviewer_id);

    IF NOT v_is_direct_manager THEN
      RETURN jsonb_build_object(
        'success', false,
        'message', 'You can only create reviews for your direct reports',
        'review', NULL
      );
    END IF;
  END IF;

  -- Check for duplicate active reviews of same type
  SELECT COUNT(*) INTO v_duplicate_count
  FROM hr_public.performance_reviews
  WHERE employee_id = p_employee_id
    AND review_type = p_review_type
    AND status IN ('draft', 'in_progress');

  IF v_duplicate_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Active ' || p_review_type || ' already exists for this employee',
      'review', NULL
    );
  END IF;

  -- Create performance review
  INSERT INTO hr_public.performance_reviews (
    employee_id,
    reviewer_id,
    review_type,
    status,
    review_period_start,
    review_period_end,
    notes
  ) VALUES (
    p_employee_id,
    v_reviewer_id,
    p_review_type,
    'draft',
    p_review_period_start,
    p_review_period_end,
    p_notes
  ) RETURNING id INTO v_review_id;

  -- Create new goals if provided
  IF jsonb_array_length(p_new_goals) > 0 THEN
    FOR v_new_goal IN SELECT * FROM jsonb_array_elements(p_new_goals)
    LOOP
      INSERT INTO hr_public.employee_goals (
        employee_id,
        title,
        description,
        target_date,
        status,
        created_by
      ) VALUES (
        p_employee_id,
        v_new_goal->>'title',
        v_new_goal->>'description',
        (v_new_goal->>'targetCompletionDate')::DATE,
        'in_progress',
        v_reviewer_id
      ) RETURNING id INTO v_new_goal_id;

      -- Link new goal to review
      INSERT INTO hr_public.review_goals (review_id, goal_id)
      VALUES (v_review_id, v_new_goal_id);
    END LOOP;
  END IF;

  -- Link existing goals to review
  IF array_length(p_goal_ids, 1) > 0 THEN
    INSERT INTO hr_public.review_goals (review_id, goal_id)
    SELECT v_review_id, unnest(p_goal_ids);
  END IF;

  -- Return success response with review data
  SELECT jsonb_build_object(
    'success', true,
    'message', 'Review created successfully',
    'review', row_to_json(pr.*)
  ) INTO v_result
  FROM hr_public.performance_reviews pr
  WHERE pr.id = v_review_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

COMMENT ON FUNCTION hr_public.create_review_with_goals IS 'Create performance review with associated goals (new or existing)';

-- ============================================================================
-- Mutation: Update draft review
-- ============================================================================

CREATE OR REPLACE FUNCTION hr_public.update_review_draft(
  p_id UUID,
  p_review_type hr_public.review_type DEFAULT NULL,
  p_review_period_start DATE DEFAULT NULL,
  p_review_period_end DATE DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_current_status hr_public.review_status;
  v_result JSONB;
BEGIN
  -- Check if review exists and is in draft status
  SELECT status INTO v_current_status
  FROM hr_public.performance_reviews
  WHERE id = p_id;

  IF v_current_status IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Review not found',
      'review', NULL
    );
  END IF;

  IF v_current_status != 'draft' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Can only update draft reviews',
      'review', NULL
    );
  END IF;

  -- Update review fields (only if provided)
  UPDATE hr_public.performance_reviews
  SET
    review_type = COALESCE(p_review_type, review_type),
    review_period_start = COALESCE(p_review_period_start, review_period_start),
    review_period_end = COALESCE(p_review_period_end, review_period_end),
    notes = COALESCE(p_notes, notes),
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_id;

  -- Return updated review
  SELECT jsonb_build_object(
    'success', true,
    'message', 'Draft updated successfully',
    'review', row_to_json(pr.*)
  ) INTO v_result
  FROM hr_public.performance_reviews pr
  WHERE pr.id = p_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

COMMENT ON FUNCTION hr_public.update_review_draft IS 'Update a draft review (partial updates supported)';

-- ============================================================================
-- Mutation: Soft delete goal
-- ============================================================================

CREATE OR REPLACE FUNCTION hr_public.soft_delete_goal(
  p_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Set deleted flag and timestamp
  UPDATE hr_public.employee_goals
  SET
    deleted = TRUE,
    deleted_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Goal not found',
      'goal', NULL
    );
  END IF;

  -- Return updated goal
  SELECT jsonb_build_object(
    'success', true,
    'message', 'Goal soft deleted successfully',
    'goal', row_to_json(g.*)
  ) INTO v_result
  FROM hr_public.employee_goals g
  WHERE g.id = p_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

COMMENT ON FUNCTION hr_public.soft_delete_goal IS 'Soft delete a goal (preserves in historical reviews)';

-- ============================================================================
-- Mutation: Update review status
-- ============================================================================

CREATE OR REPLACE FUNCTION hr_public.update_review_status(
  p_id UUID,
  p_status hr_public.review_status
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  UPDATE hr_public.performance_reviews
  SET
    status = p_status,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Review not found',
      'review', NULL
    );
  END IF;

  SELECT jsonb_build_object(
    'success', true,
    'message', 'Review status updated successfully',
    'review', row_to_json(pr.*)
  ) INTO v_result
  FROM hr_public.performance_reviews pr
  WHERE pr.id = p_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

COMMENT ON FUNCTION hr_public.update_review_status IS 'Update review status (draft → in_progress → completed)';

-- Grant execute permissions to all users (RLS policies handle authorization)
GRANT EXECUTE ON FUNCTION hr_public.is_direct_manager TO PUBLIC;
GRANT EXECUTE ON FUNCTION hr_public.active_reviews_for_employee TO PUBLIC;
GRANT EXECUTE ON FUNCTION hr_public.direct_reports TO PUBLIC;
GRANT EXECUTE ON FUNCTION hr_public.review_types_metadata TO PUBLIC;
GRANT EXECUTE ON FUNCTION hr_public.create_review_with_goals TO PUBLIC;
GRANT EXECUTE ON FUNCTION hr_public.update_review_draft TO PUBLIC;
GRANT EXECUTE ON FUNCTION hr_public.soft_delete_goal TO PUBLIC;
GRANT EXECUTE ON FUNCTION hr_public.update_review_status TO PUBLIC;
