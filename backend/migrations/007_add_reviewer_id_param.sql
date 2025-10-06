-- Migration 007: Add reviewer_id parameter to create_review_with_goals
-- Feature: 023-reviews-creation-it
-- Date: 2025-10-06
-- Description: Add explicit reviewer_id parameter since JWT claims aren't always available in server-to-server calls

-- Drop existing function
DROP FUNCTION IF EXISTS hr_public.create_review_with_goals(UUID, hr_public.review_type, DATE, DATE, UUID[], JSONB, TEXT);

-- Recreate with reviewer_id parameter
CREATE OR REPLACE FUNCTION hr_public.create_review_with_goals(
  p_employee_id UUID,
  p_reviewer_id UUID,
  p_review_type hr_public.review_type,
  p_review_period_start DATE DEFAULT NULL,
  p_review_period_end DATE DEFAULT NULL,
  p_goal_ids UUID[] DEFAULT '{}',
  p_new_goals JSONB DEFAULT '[]',
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_review_id UUID;
  v_current_user_role TEXT;
  v_is_direct_manager BOOLEAN;
  v_duplicate_count INT;
  v_new_goal_id UUID;
  v_new_goal JSONB;
  v_result JSONB;
BEGIN
  -- Get reviewer user role
  SELECT role INTO v_current_user_role
  FROM hr_public.users
  WHERE id = p_reviewer_id;

  -- Validate reviewer exists
  IF v_current_user_role IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Reviewer not found',
      'review', NULL
    );
  END IF;

  -- RBAC: Check if manager is trying to create review for non-direct report
  IF v_current_user_role IN ('manager', 'hr_manager') THEN
    v_is_direct_manager := hr_public.is_direct_manager(p_employee_id, p_reviewer_id);

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
    p_reviewer_id,
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
        p_reviewer_id
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

COMMENT ON FUNCTION hr_public.create_review_with_goals IS 'Create performance review with associated goals (new or existing). Requires explicit reviewer_id.';

GRANT EXECUTE ON FUNCTION hr_public.create_review_with_goals TO PUBLIC;
