-- Performance Review Functions
-- Created: 2025-09-15
-- Description: Business logic functions for performance review system

-- Function to create performance reviews for a cycle
CREATE OR REPLACE FUNCTION hr_public.create_reviews_for_cycle(
    p_cycle_id UUID,
    p_created_by UUID DEFAULT NULL
) RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    cycle hr_public.review_cycles%ROWTYPE;
    employee_record RECORD;
    reviews_created INTEGER := 0;
    current_user_id UUID;
BEGIN
    -- Get current user if not provided
    IF p_created_by IS NULL THEN
        BEGIN
            current_user_id := current_setting('jwt.claims.user_id', true)::UUID;
        EXCEPTION WHEN OTHERS THEN
            RAISE EXCEPTION 'Cannot determine current user for review creation';
        END;
    ELSE
        current_user_id := p_created_by;
    END IF;
    
    -- Get cycle details
    SELECT * INTO cycle
    FROM hr_public.review_cycles
    WHERE id = p_cycle_id AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Review cycle not found or inactive';
    END IF;
    
    -- Create reviews for all active employees with job information
    FOR employee_record IN
        SELECT 
            u.id as employee_id,
            ji.manager_id,
            ji.reports_to
        FROM hr_public.users u
        JOIN hr_public.job_information ji ON u.id = ji.employee_id
        WHERE u.is_active = true
          AND ji.end_date IS NULL -- current job
          AND ji.manager_id IS NOT NULL
          AND NOT EXISTS (
              SELECT 1 FROM hr_public.performance_reviews pr
              WHERE pr.employee_id = u.id AND pr.cycle_id = p_cycle_id
          )
    LOOP
        -- Create review
        INSERT INTO hr_public.performance_reviews (
            employee_id, 
            manager_id, 
            cycle_id,
            status
        ) VALUES (
            employee_record.employee_id,
            COALESCE(employee_record.manager_id, employee_record.reports_to),
            p_cycle_id,
            'NOT_STARTED'
        );
        
        reviews_created := reviews_created + 1;
    END LOOP;
    
    -- Log the batch creation
    PERFORM hr_hidden.log_audit_event(
        'hr_public.performance_reviews',
        NULL,
        'INSERT',
        current_user_id,
        NULL,
        jsonb_build_object('cycle_id', p_cycle_id, 'reviews_created', reviews_created),
        format('Created %s performance reviews for cycle %s', reviews_created, cycle.cycle_name),
        'INFO',
        'SYSTEM'
    );
    
    RETURN reviews_created;
END;
$$;

-- Function to calculate overall review rating from competency ratings
CREATE OR REPLACE FUNCTION hr_public.calculate_overall_rating(
    p_review_id UUID
) RETURNS DECIMAL(3,2)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
    total_weighted_score DECIMAL(10,2) := 0;
    total_weight DECIMAL(10,2) := 0;
    rating_record RECORD;
    overall_rating DECIMAL(3,2);
    competency_value DECIMAL(3,2);
BEGIN
    -- Calculate weighted average of competency ratings
    FOR rating_record IN
        SELECT 
            cr.final_rating,
            c.weight,
            c.name
        FROM hr_public.competency_ratings cr
        JOIN hr_public.competencies c ON cr.competency_id = c.id
        WHERE cr.review_id = p_review_id
          AND cr.final_rating IS NOT NULL
          AND c.is_active = true
    LOOP
        -- Convert competency level to numeric value
        competency_value := CASE rating_record.final_rating
            WHEN 'BELOW_EXPECTATIONS' THEN 1.0
            WHEN 'MEETS_EXPECTATIONS' THEN 3.0
            WHEN 'EXCEEDS_EXPECTATIONS' THEN 4.0
            WHEN 'OUTSTANDING' THEN 5.0
            ELSE 3.0
        END;
        
        total_weighted_score := total_weighted_score + (competency_value * rating_record.weight);
        total_weight := total_weight + rating_record.weight;
    END LOOP;
    
    -- Calculate overall rating
    IF total_weight > 0 THEN
        overall_rating := total_weighted_score / total_weight;
        -- Round to nearest 0.25
        overall_rating := ROUND(overall_rating * 4) / 4;
        -- Ensure within valid range
        overall_rating := GREATEST(1.0, LEAST(5.0, overall_rating));
    ELSE
        overall_rating := NULL;
    END IF;
    
    RETURN overall_rating;
END;
$$;

-- Function to submit employee self-assessment
CREATE OR REPLACE FUNCTION hr_public.submit_self_assessment(
    p_review_id UUID,
    p_employee_id UUID,
    p_self_assessment TEXT,
    p_achievements TEXT DEFAULT NULL,
    p_challenges TEXT DEFAULT NULL,
    p_goals_next_period TEXT DEFAULT NULL
) RETURNS hr_public.performance_reviews
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    review hr_public.performance_reviews%ROWTYPE;
    old_review hr_public.performance_reviews%ROWTYPE;
    updated_review hr_public.performance_reviews%ROWTYPE;
BEGIN
    -- Get current review
    SELECT * INTO review
    FROM hr_public.performance_reviews
    WHERE id = p_review_id AND employee_id = p_employee_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Performance review not found or access denied';
    END IF;
    
    -- Check if review can be submitted
    IF review.status NOT IN ('NOT_STARTED', 'IN_PROGRESS') THEN
        RAISE EXCEPTION 'Self-assessment cannot be submitted in current status: %', review.status;
    END IF;
    
    -- Store old values for audit
    old_review := review;
    
    -- Update the review
    UPDATE hr_public.performance_reviews
    SET 
        employee_self_assessment = p_self_assessment,
        employee_achievements = p_achievements,
        employee_challenges = p_challenges,
        employee_goals_next_period = p_goals_next_period,
        employee_submitted_at = NOW(),
        status = 'EMPLOYEE_SUBMITTED',
        updated_at = NOW()
    WHERE id = p_review_id
    RETURNING * INTO updated_review;
    
    -- Log the submission
    PERFORM hr_hidden.log_audit_event(
        'hr_public.performance_reviews',
        p_review_id,
        'UPDATE',
        p_employee_id,
        to_jsonb(old_review),
        to_jsonb(updated_review),
        'Employee self-assessment submitted',
        'INFO',
        'DATA_CHANGE'
    );
    
    RETURN updated_review;
END;
$$;

-- Function to submit manager assessment
CREATE OR REPLACE FUNCTION hr_public.submit_manager_assessment(
    p_review_id UUID,
    p_manager_id UUID,
    p_manager_assessment TEXT,
    p_feedback TEXT DEFAULT NULL,
    p_development_areas TEXT DEFAULT NULL,
    p_recommendations TEXT DEFAULT NULL,
    p_overall_rating DECIMAL(3,2) DEFAULT NULL
) RETURNS hr_public.performance_reviews
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    review hr_public.performance_reviews%ROWTYPE;
    old_review hr_public.performance_reviews%ROWTYPE;
    updated_review hr_public.performance_reviews%ROWTYPE;
    calculated_rating DECIMAL(3,2);
BEGIN
    -- Get current review
    SELECT * INTO review
    FROM hr_public.performance_reviews
    WHERE id = p_review_id AND manager_id = p_manager_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Performance review not found or access denied';
    END IF;
    
    -- Check if review can be submitted
    IF review.status NOT IN ('EMPLOYEE_SUBMITTED', 'MANAGER_REVIEW', 'IN_PROGRESS') THEN
        RAISE EXCEPTION 'Manager assessment cannot be submitted in current status: %', review.status;
    END IF;
    
    -- Calculate overall rating from competencies if not provided
    IF p_overall_rating IS NULL THEN
        calculated_rating := hr_public.calculate_overall_rating(p_review_id);
    ELSE
        calculated_rating := p_overall_rating;
    END IF;
    
    -- Store old values for audit
    old_review := review;
    
    -- Update the review
    UPDATE hr_public.performance_reviews
    SET 
        manager_assessment = p_manager_assessment,
        manager_feedback = p_feedback,
        manager_development_areas = p_development_areas,
        manager_recommendations = p_recommendations,
        overall_rating = calculated_rating,
        manager_submitted_at = NOW(),
        status = CASE 
            WHEN EXISTS (SELECT 1 FROM hr_public.user_role_assignments ura 
                        JOIN hr_public.user_roles ur ON ura.role_id = ur.id
                        WHERE ura.user_id = review.employee_id 
                          AND ur.level >= 80 
                          AND ura.is_active = true) 
            THEN 'HR_REVIEW'  -- Senior employees need HR review
            ELSE 'COMPLETED'  -- Regular employees can be completed by manager
        END,
        completed_at = CASE 
            WHEN NOT EXISTS (SELECT 1 FROM hr_public.user_role_assignments ura 
                           JOIN hr_public.user_roles ur ON ura.role_id = ur.id
                           WHERE ura.user_id = review.employee_id 
                             AND ur.level >= 80 
                             AND ura.is_active = true) 
            THEN NOW()
            ELSE NULL
        END,
        updated_at = NOW()
    WHERE id = p_review_id
    RETURNING * INTO updated_review;
    
    -- Log the submission
    PERFORM hr_hidden.log_audit_event(
        'hr_public.performance_reviews',
        p_review_id,
        'UPDATE',
        p_manager_id,
        to_jsonb(old_review),
        to_jsonb(updated_review),
        'Manager assessment submitted',
        'INFO',
        'DATA_CHANGE'
    );
    
    RETURN updated_review;
END;
$$;

-- Function to create goal for employee
CREATE OR REPLACE FUNCTION hr_public.create_goal(
    p_employee_id UUID,
    p_title VARCHAR(255),
    p_description TEXT DEFAULT NULL,
    p_target_date DATE DEFAULT NULL,
    p_category VARCHAR(100) DEFAULT 'PERFORMANCE',
    p_priority VARCHAR(20) DEFAULT 'MEDIUM',
    p_review_id UUID DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
) RETURNS hr_public.goals
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    new_goal hr_public.goals;
    current_user_id UUID;
BEGIN
    -- Get current user if not provided
    IF p_created_by IS NULL THEN
        BEGIN
            current_user_id := current_setting('jwt.claims.user_id', true)::UUID;
        EXCEPTION WHEN OTHERS THEN
            current_user_id := p_employee_id; -- Default to employee creating their own goal
        END;
    ELSE
        current_user_id := p_created_by;
    END IF;
    
    -- Validate inputs
    IF LENGTH(TRIM(p_title)) = 0 THEN
        RAISE EXCEPTION 'Goal title cannot be empty';
    END IF;
    
    IF p_priority NOT IN ('HIGH', 'MEDIUM', 'LOW') THEN
        RAISE EXCEPTION 'Priority must be HIGH, MEDIUM, or LOW';
    END IF;
    
    -- Create the goal
    INSERT INTO hr_public.goals (
        employee_id, title, description, target_date, category, priority,
        review_id, created_by, status
    ) VALUES (
        p_employee_id, p_title, p_description, p_target_date, p_category, p_priority,
        p_review_id, current_user_id, 'NOT_STARTED'
    ) RETURNING * INTO new_goal;
    
    -- Log the creation
    PERFORM hr_hidden.log_audit_event(
        'hr_public.goals',
        new_goal.id,
        'INSERT',
        current_user_id,
        NULL,
        to_jsonb(new_goal),
        format('Goal created: %s', p_title),
        'INFO',
        'DATA_CHANGE'
    );
    
    RETURN new_goal;
END;
$$;

-- Function to update goal progress
CREATE OR REPLACE FUNCTION hr_public.update_goal_progress(
    p_goal_id UUID,
    p_employee_id UUID,
    p_progress_percentage INTEGER,
    p_status hr_public.goal_status DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
) RETURNS hr_public.goals
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    goal hr_public.goals%ROWTYPE;
    old_goal hr_public.goals%ROWTYPE;
    updated_goal hr_public.goals%ROWTYPE;
    new_status hr_public.goal_status;
BEGIN
    -- Get current goal
    SELECT * INTO goal
    FROM hr_public.goals
    WHERE id = p_goal_id AND employee_id = p_employee_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Goal not found or access denied';
    END IF;
    
    -- Validate progress
    IF p_progress_percentage < 0 OR p_progress_percentage > 100 THEN
        RAISE EXCEPTION 'Progress percentage must be between 0 and 100';
    END IF;
    
    -- Determine status based on progress if not provided
    IF p_status IS NULL THEN
        new_status := CASE 
            WHEN p_progress_percentage = 0 THEN 'NOT_STARTED'
            WHEN p_progress_percentage > 0 AND p_progress_percentage < 100 THEN 'IN_PROGRESS'
            WHEN p_progress_percentage = 100 THEN 'COMPLETED'
            ELSE goal.status
        END;
    ELSE
        new_status := p_status;
    END IF;
    
    -- Store old values for audit
    old_goal := goal;
    
    -- Update the goal
    UPDATE hr_public.goals
    SET 
        progress_percentage = p_progress_percentage,
        status = new_status,
        completed_at = CASE WHEN new_status = 'COMPLETED' THEN NOW() ELSE completed_at END,
        final_outcome = CASE WHEN p_notes IS NOT NULL THEN p_notes ELSE final_outcome END,
        updated_at = NOW()
    WHERE id = p_goal_id
    RETURNING * INTO updated_goal;
    
    -- Log the update
    PERFORM hr_hidden.log_audit_event(
        'hr_public.goals',
        p_goal_id,
        'UPDATE',
        p_employee_id,
        to_jsonb(old_goal),
        to_jsonb(updated_goal),
        format('Goal progress updated to %s%%', p_progress_percentage),
        'INFO',
        'DATA_CHANGE'
    );
    
    RETURN updated_goal;
END;
$$;

-- Comments
COMMENT ON FUNCTION hr_public.create_reviews_for_cycle(UUID, UUID) IS
'Create performance reviews for all eligible employees in a review cycle';

COMMENT ON FUNCTION hr_public.calculate_overall_rating(UUID) IS
'Calculate overall performance rating from weighted competency ratings';

COMMENT ON FUNCTION hr_public.submit_self_assessment(UUID, UUID, TEXT, TEXT, TEXT, TEXT) IS
'Submit employee self-assessment for performance review';

COMMENT ON FUNCTION hr_public.submit_manager_assessment(UUID, UUID, TEXT, TEXT, TEXT, TEXT, DECIMAL) IS
'Submit manager assessment and rating for performance review';

COMMENT ON FUNCTION hr_public.create_goal(UUID, VARCHAR, TEXT, DATE, VARCHAR, VARCHAR, UUID, UUID) IS
'Create a new goal for employee';

COMMENT ON FUNCTION hr_public.update_goal_progress(UUID, UUID, INTEGER, hr_public.goal_status, TEXT) IS
'Update progress and status of an employee goal';

-- Grant permissions
GRANT EXECUTE ON FUNCTION hr_public.create_reviews_for_cycle(UUID, UUID) TO postgraphile_user;
GRANT EXECUTE ON FUNCTION hr_public.calculate_overall_rating(UUID) TO postgraphile_user;
GRANT EXECUTE ON FUNCTION hr_public.submit_self_assessment(UUID, UUID, TEXT, TEXT, TEXT, TEXT) TO postgraphile_user;
GRANT EXECUTE ON FUNCTION hr_public.submit_manager_assessment(UUID, UUID, TEXT, TEXT, TEXT, TEXT, DECIMAL) TO postgraphile_user;
GRANT EXECUTE ON FUNCTION hr_public.create_goal(UUID, VARCHAR, TEXT, DATE, VARCHAR, VARCHAR, UUID, UUID) TO postgraphile_user;
GRANT EXECUTE ON FUNCTION hr_public.update_goal_progress(UUID, UUID, INTEGER, hr_public.goal_status, TEXT) TO postgraphile_user;