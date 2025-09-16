-- Time-Off Management Functions
-- Created: 2025-09-15
-- Description: Business logic functions for time-off system

-- Function to calculate available time-off balance
CREATE OR REPLACE FUNCTION hr_public.get_time_off_balance(
    p_user_id UUID,
    p_policy_id UUID,
    p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
) RETURNS DECIMAL(6,2)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
    balance DECIMAL(6,2);
BEGIN
    SELECT COALESCE(current_balance - pending_balance, 0)
    INTO balance
    FROM hr_public.time_off_balances
    WHERE user_id = p_user_id 
      AND policy_id = p_policy_id 
      AND year = p_year;
    
    RETURN COALESCE(balance, 0);
END;
$$;

-- Function to check if time-off request is valid
CREATE OR REPLACE FUNCTION hr_public.validate_time_off_request(
    p_user_id UUID,
    p_policy_id UUID,
    p_start_date DATE,
    p_end_date DATE,
    p_hours_requested DECIMAL(5,2)
) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
    policy hr_public.time_off_policies%ROWTYPE;
    user_record hr_public.users%ROWTYPE;
    job_info hr_public.job_information%ROWTYPE;
    available_balance DECIMAL(6,2);
    employment_months INTEGER;
    advance_notice_days INTEGER;
    validation_result JSONB;
    errors TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Get policy details
    SELECT * INTO policy
    FROM hr_public.time_off_policies
    WHERE id = p_policy_id AND is_active = true;
    
    IF NOT FOUND THEN
        errors := array_append(errors, 'Policy not found or inactive');
        RETURN jsonb_build_object('valid', false, 'errors', errors);
    END IF;
    
    -- Get user details
    SELECT * INTO user_record
    FROM hr_public.users
    WHERE id = p_user_id AND is_active = true;
    
    IF NOT FOUND THEN
        errors := array_append(errors, 'User not found or inactive');
        RETURN jsonb_build_object('valid', false, 'errors', errors);
    END IF;
    
    -- Get employment info for tenure check
    SELECT * INTO job_info
    FROM hr_public.job_information
    WHERE employee_id = p_user_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Calculate employment months
    IF job_info.start_date IS NOT NULL THEN
        employment_months := EXTRACT(YEAR FROM AGE(CURRENT_DATE, job_info.start_date)) * 12 + 
                            EXTRACT(MONTH FROM AGE(CURRENT_DATE, job_info.start_date));
    ELSE
        employment_months := 0;
    END IF;
    
    -- Validate eligibility
    IF policy.eligibility_months > employment_months THEN
        errors := array_append(errors, format('Requires %s months of employment (have %s)', 
                                             policy.eligibility_months, employment_months));
    END IF;
    
    -- Validate date range
    IF p_start_date > p_end_date THEN
        errors := array_append(errors, 'Start date must be before end date');
    END IF;
    
    -- Validate advance notice
    advance_notice_days := p_start_date - CURRENT_DATE;
    IF advance_notice_days < policy.advance_notice_days THEN
        errors := array_append(errors, format('Requires %s days advance notice (provided %s)', 
                                             policy.advance_notice_days, advance_notice_days));
    END IF;
    
    -- Validate hours requested
    IF p_hours_requested <= 0 THEN
        errors := array_append(errors, 'Hours requested must be positive');
    END IF;
    
    IF p_hours_requested != ROUND(p_hours_requested / policy.min_increment) * policy.min_increment THEN
        errors := array_append(errors, format('Hours must be in increments of %s', policy.min_increment));
    END IF;
    
    -- Check consecutive days limit (assuming 8 hours per day)
    IF (p_hours_requested / 8.0) > policy.max_consecutive_days THEN
        errors := array_append(errors, format('Exceeds maximum consecutive days (%s)', policy.max_consecutive_days));
    END IF;
    
    -- Check available balance
    available_balance := hr_public.get_time_off_balance(p_user_id, p_policy_id);
    IF p_hours_requested > available_balance THEN
        errors := array_append(errors, format('Insufficient balance: requested %s, available %s', 
                                             p_hours_requested, available_balance));
    END IF;
    
    -- Build validation result
    validation_result := jsonb_build_object(
        'valid', array_length(errors, 1) IS NULL,
        'errors', errors,
        'available_balance', available_balance,
        'employment_months', employment_months,
        'advance_notice_days', advance_notice_days
    );
    
    RETURN validation_result;
END;
$$;

-- Function to submit time-off request
CREATE OR REPLACE FUNCTION hr_public.submit_time_off_request(
    p_user_id UUID,
    p_policy_id UUID,
    p_start_date DATE,
    p_end_date DATE,
    p_hours_requested DECIMAL(5,2),
    p_reason TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
) RETURNS hr_public.time_off_requests
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    validation_result JSONB;
    new_request hr_public.time_off_requests;
    policy hr_public.time_off_policies%ROWTYPE;
BEGIN
    -- Validate the request
    validation_result := hr_public.validate_time_off_request(
        p_user_id, p_policy_id, p_start_date, p_end_date, p_hours_requested
    );
    
    IF NOT (validation_result->>'valid')::BOOLEAN THEN
        RAISE EXCEPTION 'Invalid time-off request: %', validation_result->>'errors';
    END IF;
    
    -- Get policy details
    SELECT * INTO policy FROM hr_public.time_off_policies WHERE id = p_policy_id;
    
    -- Create the request
    INSERT INTO hr_public.time_off_requests (
        user_id, policy_id, start_date, end_date, hours_requested,
        reason, notes, status
    ) VALUES (
        p_user_id, p_policy_id, p_start_date, p_end_date, p_hours_requested,
        p_reason, p_notes, 
        CASE WHEN policy.requires_approval THEN 'PENDING' ELSE 'APPROVED' END
    ) RETURNING * INTO new_request;
    
    -- Update pending balance
    UPDATE hr_public.time_off_balances
    SET pending_balance = current_balance - 
        (SELECT COALESCE(SUM(hours_requested), 0) 
         FROM hr_public.time_off_requests 
         WHERE user_id = p_user_id 
           AND policy_id = p_policy_id 
           AND status IN ('PENDING', 'APPROVED')
           AND EXTRACT(YEAR FROM start_date) = year)
    WHERE user_id = p_user_id AND policy_id = p_policy_id;
    
    -- Log the request submission
    PERFORM hr_hidden.log_audit_event(
        'hr_public.time_off_requests',
        new_request.id,
        'INSERT',
        p_user_id,
        NULL,
        to_jsonb(new_request),
        format('Time-off request submitted: %s hours from %s to %s', 
               p_hours_requested, p_start_date, p_end_date),
        'INFO',
        'DATA_CHANGE'
    );
    
    RETURN new_request;
END;
$$;

-- Function to approve/reject time-off request
CREATE OR REPLACE FUNCTION hr_public.review_time_off_request(
    p_request_id UUID,
    p_reviewer_id UUID,
    p_decision hr_public.request_status,
    p_reviewer_notes TEXT DEFAULT NULL
) RETURNS hr_public.time_off_requests
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    request hr_public.time_off_requests%ROWTYPE;
    old_request hr_public.time_off_requests%ROWTYPE;
    updated_request hr_public.time_off_requests%ROWTYPE;
BEGIN
    -- Validate decision
    IF p_decision NOT IN ('APPROVED', 'REJECTED') THEN
        RAISE EXCEPTION 'Decision must be APPROVED or REJECTED';
    END IF;
    
    -- Get current request
    SELECT * INTO request
    FROM hr_public.time_off_requests
    WHERE id = p_request_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Time-off request not found';
    END IF;
    
    -- Check if request can be reviewed
    IF request.status NOT IN ('PENDING', 'IN_REVIEW') THEN
        RAISE EXCEPTION 'Request cannot be reviewed in current status: %', request.status;
    END IF;
    
    -- Store old values for audit
    old_request := request;
    
    -- Update the request
    UPDATE hr_public.time_off_requests
    SET 
        status = p_decision,
        reviewed_by = p_reviewer_id,
        reviewed_at = NOW(),
        reviewer_notes = p_reviewer_notes,
        updated_at = NOW()
    WHERE id = p_request_id
    RETURNING * INTO updated_request;
    
    -- Update balance if rejected (restore pending balance)
    IF p_decision = 'REJECTED' THEN
        UPDATE hr_public.time_off_balances
        SET pending_balance = current_balance - 
            (SELECT COALESCE(SUM(hours_requested), 0) 
             FROM hr_public.time_off_requests 
             WHERE user_id = request.user_id 
               AND policy_id = request.policy_id 
               AND status IN ('PENDING', 'APPROVED')
               AND id != p_request_id
               AND EXTRACT(YEAR FROM start_date) = year)
        WHERE user_id = request.user_id AND policy_id = request.policy_id;
    END IF;
    
    -- If approved, deduct from current balance when time off is taken
    IF p_decision = 'APPROVED' THEN
        -- This would typically be handled by a scheduled job that processes approved requests
        -- after their start date has passed
        NULL; -- Placeholder for future implementation
    END IF;
    
    -- Log the review
    PERFORM hr_hidden.log_audit_event(
        'hr_public.time_off_requests',
        p_request_id,
        'UPDATE',
        p_reviewer_id,
        to_jsonb(old_request),
        to_jsonb(updated_request),
        format('Time-off request %s by %s', LOWER(p_decision::TEXT), p_reviewer_id),
        'INFO',
        'DATA_CHANGE'
    );
    
    RETURN updated_request;
END;
$$;

-- Function to accrue time-off balance
CREATE OR REPLACE FUNCTION hr_hidden.accrue_time_off(
    p_user_id UUID,
    p_policy_id UUID,
    p_accrual_date DATE DEFAULT CURRENT_DATE
) RETURNS DECIMAL(5,2)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    policy hr_public.time_off_policies%ROWTYPE;
    balance hr_public.time_off_balances%ROWTYPE;
    accrual_amount DECIMAL(5,2);
    new_balance DECIMAL(6,2);
    accrual_year INTEGER;
BEGIN
    accrual_year := EXTRACT(YEAR FROM p_accrual_date);
    
    -- Get policy
    SELECT * INTO policy
    FROM hr_public.time_off_policies
    WHERE id = p_policy_id AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Policy not found or inactive';
    END IF;
    
    -- Get or create balance record
    SELECT * INTO balance
    FROM hr_public.time_off_balances
    WHERE user_id = p_user_id AND policy_id = p_policy_id AND year = accrual_year;
    
    IF NOT FOUND THEN
        INSERT INTO hr_public.time_off_balances (user_id, policy_id, year)
        VALUES (p_user_id, p_policy_id, accrual_year);
        
        SELECT * INTO balance
        FROM hr_public.time_off_balances
        WHERE user_id = p_user_id AND policy_id = p_policy_id AND year = accrual_year;
    END IF;
    
    -- Calculate accrual amount based on frequency
    accrual_amount := policy.accrual_rate;
    
    -- Check if we're at max accrual
    IF balance.current_balance >= policy.max_accrual THEN
        RETURN 0; -- No accrual if at maximum
    END IF;
    
    -- Ensure we don't exceed max accrual
    IF balance.current_balance + accrual_amount > policy.max_accrual THEN
        accrual_amount := policy.max_accrual - balance.current_balance;
    END IF;
    
    -- Update balance
    new_balance := balance.current_balance + accrual_amount;
    
    UPDATE hr_public.time_off_balances
    SET 
        current_balance = new_balance,
        last_accrual_date = p_accrual_date,
        updated_at = NOW()
    WHERE id = balance.id;
    
    -- Log the accrual
    INSERT INTO hr_hidden.time_off_accruals (
        balance_id, accrual_date, hours_accrued, accrual_reason,
        balance_before, balance_after
    ) VALUES (
        balance.id, p_accrual_date, accrual_amount, 'scheduled_accrual',
        balance.current_balance, new_balance
    );
    
    RETURN accrual_amount;
END;
$$;

-- Comments
COMMENT ON FUNCTION hr_public.get_time_off_balance(UUID, UUID, INTEGER) IS
'Get available time-off balance for user and policy';

COMMENT ON FUNCTION hr_public.validate_time_off_request(UUID, UUID, DATE, DATE, DECIMAL) IS
'Validate time-off request against policy rules and user eligibility';

COMMENT ON FUNCTION hr_public.submit_time_off_request(UUID, UUID, DATE, DATE, DECIMAL, TEXT, TEXT) IS
'Submit a new time-off request with validation';

COMMENT ON FUNCTION hr_public.review_time_off_request(UUID, UUID, hr_public.request_status, TEXT) IS
'Approve or reject a time-off request';

COMMENT ON FUNCTION hr_hidden.accrue_time_off(UUID, UUID, DATE) IS
'Accrue time-off balance for user according to policy';

-- Grant permissions
GRANT EXECUTE ON FUNCTION hr_public.get_time_off_balance(UUID, UUID, INTEGER) TO postgraphile_user;
GRANT EXECUTE ON FUNCTION hr_public.validate_time_off_request(UUID, UUID, DATE, DATE, DECIMAL) TO postgraphile_user;
GRANT EXECUTE ON FUNCTION hr_public.submit_time_off_request(UUID, UUID, DATE, DATE, DECIMAL, TEXT, TEXT) TO postgraphile_user;
GRANT EXECUTE ON FUNCTION hr_public.review_time_off_request(UUID, UUID, hr_public.request_status, TEXT) TO postgraphile_user;