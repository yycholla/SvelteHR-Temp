-- Business Logic Functions for PostGraphile
-- Complex business operations and workflows

-- Employee lifecycle functions

-- Function to create new employee (HR admin only)
CREATE OR REPLACE FUNCTION hr_public.create_employee(
    p_first_name TEXT,
    p_last_name TEXT,
    p_email TEXT,
    p_department_id INTEGER,
    p_manager_id INTEGER DEFAULT NULL,
    p_hire_date DATE DEFAULT CURRENT_DATE,
    p_role_level INTEGER DEFAULT 20,
    p_password TEXT DEFAULT NULL
) RETURNS hr_public.employees
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = hr_public, hr_private, hr_hidden, public
AS $$
DECLARE
    new_employee hr_public.employees;
    current_role_level INTEGER;
    password_hash_new TEXT;
BEGIN
    -- Check permissions
    current_role_level := current_setting('jwt.claims.role_level', true)::INTEGER;
    
    IF current_role_level < 80 THEN
        RAISE EXCEPTION 'Insufficient permissions to create employee';
    END IF;
    
    -- Input validation
    IF p_first_name IS NULL OR LENGTH(TRIM(p_first_name)) = 0 THEN
        RAISE EXCEPTION 'First name is required';
    END IF;
    
    IF p_last_name IS NULL OR LENGTH(TRIM(p_last_name)) = 0 THEN
        RAISE EXCEPTION 'Last name is required';
    END IF;
    
    IF p_email IS NULL OR p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RAISE EXCEPTION 'Valid email address is required';
    END IF;
    
    IF p_role_level NOT IN (20, 60, 80, 100) THEN
        RAISE EXCEPTION 'Invalid role level. Must be 20 (Employee), 60 (Manager), 80 (HR Admin), or 100 (Super Admin)';
    END IF;
    
    -- Check if email already exists
    IF EXISTS (SELECT 1 FROM hr_private.employee_account WHERE LOWER(email) = LOWER(p_email)) THEN
        RAISE EXCEPTION 'Employee with this email already exists';
    END IF;
    
    -- Check department exists
    IF NOT EXISTS (SELECT 1 FROM hr_public.departments WHERE id = p_department_id) THEN
        RAISE EXCEPTION 'Department does not exist';
    END IF;
    
    -- Check manager exists and is in valid department (if specified)
    IF p_manager_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM hr_public.employees 
            WHERE id = p_manager_id 
            AND status = 'ACTIVE' 
            AND role_level >= 60
        ) THEN
            RAISE EXCEPTION 'Manager does not exist or is not active';
        END IF;
    END IF;
    
    -- Create employee record
    INSERT INTO hr_public.employees (
        first_name, last_name, email, department_id, manager_id,
        hire_date, role_level, status
    ) VALUES (
        TRIM(p_first_name), TRIM(p_last_name), LOWER(p_email), 
        p_department_id, p_manager_id, p_hire_date, p_role_level, 'ACTIVE'
    ) RETURNING * INTO new_employee;
    
    -- Create employee account with default or provided password
    IF p_password IS NOT NULL THEN
        password_hash_new := crypt(p_password, gen_salt('bf'));
    ELSE
        -- Generate temporary password (should be changed on first login)
        password_hash_new := crypt('TempPass123!', gen_salt('bf'));
    END IF;
    
    INSERT INTO hr_private.employee_account (
        employee_id, email, password_hash
    ) VALUES (
        new_employee.id, LOWER(p_email), password_hash_new
    );
    
    -- Initialize time-off balances for current year
    INSERT INTO hr_hidden.time_off_balances (
        employee_id, year, vacation_days_total, sick_days_total, personal_days_total
    ) VALUES (
        new_employee.id, EXTRACT(year FROM CURRENT_DATE)::INTEGER, 15.0, 10.0, 5.0
    );
    
    RETURN new_employee;
END;
$$;

-- Function to terminate employee
CREATE OR REPLACE FUNCTION hr_public.terminate_employee(
    p_employee_id INTEGER,
    p_termination_date DATE DEFAULT CURRENT_DATE,
    p_termination_reason TEXT DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = hr_public, hr_private, hr_hidden, public
AS $$
DECLARE
    current_role_level INTEGER;
    target_employee hr_public.employees;
BEGIN
    -- Check permissions
    current_role_level := current_setting('jwt.claims.role_level', true)::INTEGER;
    
    IF current_role_level < 80 THEN
        RAISE EXCEPTION 'Insufficient permissions to terminate employee';
    END IF;
    
    -- Get employee details
    SELECT * INTO target_employee
    FROM hr_public.employees
    WHERE id = p_employee_id AND status = 'ACTIVE';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Employee not found or already terminated';
    END IF;
    
    -- Update employee status
    UPDATE hr_public.employees
    SET 
        status = 'TERMINATED',
        termination_date = p_termination_date,
        termination_reason = p_termination_reason,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_employee_id;
    
    -- Disable employee account
    UPDATE hr_private.employee_account
    SET 
        locked_until = '2099-12-31'::timestamp,
        refresh_token_hash = NULL,
        refresh_token_expires_at = NULL
    WHERE employee_id = p_employee_id;
    
    -- Cancel pending time-off requests
    UPDATE hr_public.time_off_requests
    SET 
        status = 'CANCELLED',
        updated_at = CURRENT_TIMESTAMP
    WHERE employee_id = p_employee_id AND status = 'PENDING';
    
    -- Update manager for direct reports (set to terminated employee's manager)
    UPDATE hr_public.employees
    SET manager_id = target_employee.manager_id
    WHERE manager_id = p_employee_id AND status = 'ACTIVE';
    
    RETURN TRUE;
END;
$$;

-- Function to update employee role
CREATE OR REPLACE FUNCTION hr_public.update_employee_role(
    p_employee_id INTEGER,
    p_new_role_level INTEGER,
    p_new_department_id INTEGER DEFAULT NULL,
    p_new_manager_id INTEGER DEFAULT NULL
) RETURNS hr_public.employees
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = hr_public, hr_private, hr_hidden, public
AS $$
DECLARE
    current_role_level INTEGER;
    current_employee_id INTEGER;
    target_employee hr_public.employees;
    updated_employee hr_public.employees;
BEGIN
    -- Check permissions
    current_role_level := current_setting('jwt.claims.role_level', true)::INTEGER;
    current_employee_id := current_setting('jwt.claims.employee_id', true)::INTEGER;
    
    IF current_role_level < 80 THEN
        RAISE EXCEPTION 'Insufficient permissions to update employee role';
    END IF;
    
    -- Can't modify own role
    IF p_employee_id = current_employee_id THEN
        RAISE EXCEPTION 'Cannot modify your own role';
    END IF;
    
    -- Validate new role level
    IF p_new_role_level NOT IN (20, 60, 80, 100) THEN
        RAISE EXCEPTION 'Invalid role level';
    END IF;
    
    -- Get current employee
    SELECT * INTO target_employee
    FROM hr_public.employees
    WHERE id = p_employee_id AND status = 'ACTIVE';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Employee not found or not active';
    END IF;
    
    -- Validate department if provided
    IF p_new_department_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM hr_public.departments WHERE id = p_new_department_id
    ) THEN
        RAISE EXCEPTION 'Department does not exist';
    END IF;
    
    -- Validate manager if provided
    IF p_new_manager_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM hr_public.employees 
        WHERE id = p_new_manager_id AND status = 'ACTIVE' AND role_level >= 60
    ) THEN
        RAISE EXCEPTION 'Manager does not exist or is not active';
    END IF;
    
    -- Update employee
    UPDATE hr_public.employees
    SET 
        role_level = p_new_role_level,
        department_id = COALESCE(p_new_department_id, department_id),
        manager_id = COALESCE(p_new_manager_id, manager_id),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_employee_id
    RETURNING * INTO updated_employee;
    
    RETURN updated_employee;
END;
$$;

-- Time-off management functions

-- Function to request time off
CREATE OR REPLACE FUNCTION hr_public.request_time_off(
    p_request_type hr_public.time_off_type,
    p_start_date DATE,
    p_end_date DATE,
    p_reason TEXT DEFAULT NULL
) RETURNS hr_public.time_off_requests
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = hr_public, hr_private, hr_hidden, public
AS $$
DECLARE
    current_employee_id INTEGER;
    days_requested DECIMAL(4,2);
    new_request hr_public.time_off_requests;
    balance_record hr_hidden.time_off_balances;
    days_available DECIMAL(4,2);
BEGIN
    -- Get current employee
    current_employee_id := current_setting('jwt.claims.employee_id', true)::INTEGER;
    
    -- Input validation
    IF p_start_date < CURRENT_DATE THEN
        RAISE EXCEPTION 'Cannot request time off for past dates';
    END IF;
    
    IF p_end_date < p_start_date THEN
        RAISE EXCEPTION 'End date must be after start date';
    END IF;
    
    -- Calculate business days (simplified - assumes 5-day work week)
    days_requested := (p_end_date - p_start_date + 1) * 5.0 / 7.0;
    
    -- Check for overlapping requests
    IF EXISTS (
        SELECT 1 FROM hr_public.time_off_requests
        WHERE employee_id = current_employee_id
        AND status IN ('PENDING', 'APPROVED')
        AND (
            (p_start_date BETWEEN start_date AND end_date) OR
            (p_end_date BETWEEN start_date AND end_date) OR
            (start_date BETWEEN p_start_date AND p_end_date)
        )
    ) THEN
        RAISE EXCEPTION 'Time off request overlaps with existing request';
    END IF;
    
    -- Check available balance
    SELECT * INTO balance_record
    FROM hr_hidden.time_off_balances
    WHERE employee_id = current_employee_id 
    AND year = EXTRACT(year FROM p_start_date)::INTEGER;
    
    IF NOT FOUND THEN
        -- Create balance record if not exists
        INSERT INTO hr_hidden.time_off_balances (
            employee_id, year, vacation_days_total, sick_days_total, personal_days_total
        ) VALUES (
            current_employee_id, EXTRACT(year FROM p_start_date)::INTEGER, 15.0, 10.0, 5.0
        ) RETURNING * INTO balance_record;
    END IF;
    
    -- Check available days based on type
    CASE p_request_type
        WHEN 'VACATION' THEN
            days_available := balance_record.vacation_days_total - balance_record.vacation_days_used;
        WHEN 'SICK' THEN
            days_available := balance_record.sick_days_total - balance_record.sick_days_used;
        WHEN 'PERSONAL' THEN
            days_available := balance_record.personal_days_total - balance_record.personal_days_used;
        ELSE
            days_available := 0;
    END CASE;
    
    IF days_requested > days_available THEN
        RAISE EXCEPTION 'Insufficient % balance. Requested: %, Available: %', 
            p_request_type, days_requested, days_available;
    END IF;
    
    -- Create time-off request
    INSERT INTO hr_public.time_off_requests (
        employee_id, request_type, start_date, end_date, 
        days_requested, reason, status
    ) VALUES (
        current_employee_id, p_request_type, p_start_date, p_end_date,
        days_requested, p_reason, 'PENDING'
    ) RETURNING * INTO new_request;
    
    RETURN new_request;
END;
$$;

-- Function to approve/reject time off
CREATE OR REPLACE FUNCTION hr_public.process_time_off_request(
    p_request_id INTEGER,
    p_action TEXT, -- 'APPROVE' or 'REJECT'
    p_comments TEXT DEFAULT NULL
) RETURNS hr_public.time_off_requests
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = hr_public, hr_private, hr_hidden, public
AS $$
DECLARE
    current_employee_id INTEGER;
    current_role_level INTEGER;
    current_department_id INTEGER;
    request_record hr_public.time_off_requests;
    request_employee hr_public.employees;
    updated_request hr_public.time_off_requests;
BEGIN
    -- Get current user context
    current_employee_id := current_setting('jwt.claims.employee_id', true)::INTEGER;
    current_role_level := current_setting('jwt.claims.role_level', true)::INTEGER;
    current_department_id := current_setting('jwt.claims.department_id', true)::INTEGER;
    
    -- Get request details
    SELECT * INTO request_record
    FROM hr_public.time_off_requests
    WHERE id = p_request_id AND status = 'PENDING';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Time off request not found or not pending';
    END IF;
    
    -- Get employee who made the request
    SELECT * INTO request_employee
    FROM hr_public.employees
    WHERE id = request_record.employee_id;
    
    -- Check authorization
    IF current_role_level < 60 THEN
        RAISE EXCEPTION 'Insufficient permissions to process time off requests';
    END IF;
    
    -- Can't approve own request
    IF request_record.employee_id = current_employee_id THEN
        RAISE EXCEPTION 'Cannot approve your own time off request';
    END IF;
    
    -- Managers can only approve requests from their direct reports in same department
    IF current_role_level < 80 THEN
        IF request_employee.manager_id != current_employee_id OR 
           request_employee.department_id != current_department_id THEN
            RAISE EXCEPTION 'Can only approve requests from direct reports in your department';
        END IF;
    END IF;
    
    -- Validate action
    IF p_action NOT IN ('APPROVE', 'REJECT') THEN
        RAISE EXCEPTION 'Invalid action. Must be APPROVE or REJECT';
    END IF;
    
    -- Update request
    IF p_action = 'APPROVE' THEN
        UPDATE hr_public.time_off_requests
        SET 
            status = 'APPROVED',
            approved_by = current_employee_id,
            approved_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = p_request_id
        RETURNING * INTO updated_request;
        
        -- Update time-off balance
        CASE request_record.request_type
            WHEN 'VACATION' THEN
                UPDATE hr_hidden.time_off_balances
                SET vacation_days_used = vacation_days_used + request_record.days_requested
                WHERE employee_id = request_record.employee_id 
                AND year = EXTRACT(year FROM request_record.start_date)::INTEGER;
            WHEN 'SICK' THEN
                UPDATE hr_hidden.time_off_balances
                SET sick_days_used = sick_days_used + request_record.days_requested
                WHERE employee_id = request_record.employee_id 
                AND year = EXTRACT(year FROM request_record.start_date)::INTEGER;
            WHEN 'PERSONAL' THEN
                UPDATE hr_hidden.time_off_balances
                SET personal_days_used = personal_days_used + request_record.days_requested
                WHERE employee_id = request_record.employee_id 
                AND year = EXTRACT(year FROM request_record.start_date)::INTEGER;
        END CASE;
        
    ELSE -- REJECT
        UPDATE hr_public.time_off_requests
        SET 
            status = 'REJECTED',
            approved_by = current_employee_id,
            approved_at = CURRENT_TIMESTAMP,
            rejection_reason = p_comments,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = p_request_id
        RETURNING * INTO updated_request;
    END IF;
    
    RETURN updated_request;
END;
$$;

-- Performance review management functions

-- Function to create performance review
CREATE OR REPLACE FUNCTION hr_public.create_performance_review(
    p_employee_id INTEGER,
    p_reviewer_id INTEGER,
    p_review_period TEXT
) RETURNS hr_public.performance_reviews
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = hr_public, hr_private, hr_hidden, public
AS $$
DECLARE
    current_role_level INTEGER;
    current_department_id INTEGER;
    new_review hr_public.performance_reviews;
    employee_record hr_public.employees;
    reviewer_record hr_public.employees;
BEGIN
    -- Check permissions (HR admin or manager)
    current_role_level := current_setting('jwt.claims.role_level', true)::INTEGER;
    current_department_id := current_setting('jwt.claims.department_id', true)::INTEGER;
    
    IF current_role_level < 60 THEN
        RAISE EXCEPTION 'Insufficient permissions to create performance reviews';
    END IF;
    
    -- Validate review period format
    IF p_review_period !~ '^[0-9]{4}-(Q[1-4]|Annual|Mid-Year)$' THEN
        RAISE EXCEPTION 'Invalid review period format. Use YYYY-Q[1-4], YYYY-Annual, or YYYY-Mid-Year';
    END IF;
    
    -- Get employee and reviewer records
    SELECT * INTO employee_record
    FROM hr_public.employees
    WHERE id = p_employee_id AND status = 'ACTIVE';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Employee not found or not active';
    END IF;
    
    SELECT * INTO reviewer_record
    FROM hr_public.employees
    WHERE id = p_reviewer_id AND status = 'ACTIVE';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Reviewer not found or not active';
    END IF;
    
    -- Business rules validation
    IF p_employee_id = p_reviewer_id THEN
        RAISE EXCEPTION 'Employee cannot review themselves';
    END IF;
    
    -- Check if review already exists for this period
    IF EXISTS (
        SELECT 1 FROM hr_public.performance_reviews
        WHERE employee_id = p_employee_id AND review_period = p_review_period
    ) THEN
        RAISE EXCEPTION 'Performance review already exists for this employee and period';
    END IF;
    
    -- Authorization check for managers (can only review direct reports in same department)
    IF current_role_level < 80 THEN
        IF employee_record.manager_id != p_reviewer_id OR 
           employee_record.department_id != current_department_id THEN
            RAISE EXCEPTION 'Can only create reviews for direct reports in your department';
        END IF;
    END IF;
    
    -- Create performance review
    INSERT INTO hr_public.performance_reviews (
        employee_id, reviewer_id, review_period, status
    ) VALUES (
        p_employee_id, p_reviewer_id, p_review_period, 'NOT_STARTED'
    ) RETURNING * INTO new_review;
    
    RETURN new_review;
END;
$$;

-- Function to update performance review
CREATE OR REPLACE FUNCTION hr_public.update_performance_review(
    p_review_id INTEGER,
    p_overall_rating DECIMAL(3,2) DEFAULT NULL,
    p_goals TEXT DEFAULT NULL,
    p_achievements TEXT DEFAULT NULL,
    p_areas_for_improvement TEXT DEFAULT NULL,
    p_feedback TEXT DEFAULT NULL,
    p_employee_comments TEXT DEFAULT NULL,
    p_status hr_public.review_status DEFAULT NULL
) RETURNS hr_public.performance_reviews
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = hr_public, hr_private, hr_hidden, public
AS $$
DECLARE
    current_employee_id INTEGER;
    current_role_level INTEGER;
    review_record hr_public.performance_reviews;
    updated_review hr_public.performance_reviews;
BEGIN
    -- Get current user context
    current_employee_id := current_setting('jwt.claims.employee_id', true)::INTEGER;
    current_role_level := current_setting('jwt.claims.role_level', true)::INTEGER;
    
    -- Get review record
    SELECT * INTO review_record
    FROM hr_public.performance_reviews
    WHERE id = p_review_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Performance review not found';
    END IF;
    
    -- Authorization check
    IF current_role_level < 80 AND review_record.reviewer_id != current_employee_id THEN
        RAISE EXCEPTION 'Can only update reviews you are conducting';
    END IF;
    
    -- Validate rating if provided
    IF p_overall_rating IS NOT NULL AND (p_overall_rating < 1.00 OR p_overall_rating > 5.00) THEN
        RAISE EXCEPTION 'Overall rating must be between 1.00 and 5.00';
    END IF;
    
    -- Validate status transition
    IF p_status IS NOT NULL THEN
        -- Can't go backwards in status
        IF (review_record.status = 'COMPLETED' AND p_status != 'COMPLETED') OR
           (review_record.status = 'IN_PROGRESS' AND p_status = 'NOT_STARTED') THEN
            RAISE EXCEPTION 'Invalid status transition';
        END IF;
        
        -- Must have rating to complete
        IF p_status = 'COMPLETED' AND p_overall_rating IS NULL AND review_record.overall_rating IS NULL THEN
            RAISE EXCEPTION 'Overall rating is required to complete review';
        END IF;
    END IF;
    
    -- Update review
    UPDATE hr_public.performance_reviews
    SET 
        overall_rating = COALESCE(p_overall_rating, overall_rating),
        goals = COALESCE(p_goals, goals),
        achievements = COALESCE(p_achievements, achievements),
        areas_for_improvement = COALESCE(p_areas_for_improvement, areas_for_improvement),
        feedback = COALESCE(p_feedback, feedback),
        employee_comments = COALESCE(p_employee_comments, employee_comments),
        status = COALESCE(p_status, status),
        completed_at = CASE 
            WHEN COALESCE(p_status, status) = 'COMPLETED' AND completed_at IS NULL 
            THEN CURRENT_TIMESTAMP 
            ELSE completed_at 
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_review_id
    RETURNING * INTO updated_review;
    
    RETURN updated_review;
END;
$$;

-- Department management functions

-- Function to create department
CREATE OR REPLACE FUNCTION hr_public.create_department(
    p_name TEXT,
    p_description TEXT DEFAULT NULL,
    p_parent_department_id INTEGER DEFAULT NULL
) RETURNS hr_public.departments
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = hr_public, hr_private, hr_hidden, public
AS $$
DECLARE
    current_role_level INTEGER;
    new_department hr_public.departments;
BEGIN
    -- Check permissions (HR admin only)
    current_role_level := current_setting('jwt.claims.role_level', true)::INTEGER;
    
    IF current_role_level < 80 THEN
        RAISE EXCEPTION 'Insufficient permissions to create departments';
    END IF;
    
    -- Input validation
    IF p_name IS NULL OR LENGTH(TRIM(p_name)) = 0 THEN
        RAISE EXCEPTION 'Department name is required';
    END IF;
    
    -- Check for duplicate name
    IF EXISTS (SELECT 1 FROM hr_public.departments WHERE LOWER(name) = LOWER(TRIM(p_name))) THEN
        RAISE EXCEPTION 'Department with this name already exists';
    END IF;
    
    -- Check parent department exists if specified
    IF p_parent_department_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM hr_public.departments WHERE id = p_parent_department_id
    ) THEN
        RAISE EXCEPTION 'Parent department does not exist';
    END IF;
    
    -- Create department
    INSERT INTO hr_public.departments (
        name, description, parent_department_id
    ) VALUES (
        TRIM(p_name), p_description, p_parent_department_id
    ) RETURNING * INTO new_department;
    
    RETURN new_department;
END;
$$;

-- Comments for documentation
COMMENT ON FUNCTION hr_public.create_employee(TEXT, TEXT, TEXT, INTEGER, INTEGER, DATE, INTEGER, TEXT) IS 'Creates new employee with account and initial balances (HR admin only)';
COMMENT ON FUNCTION hr_public.terminate_employee(INTEGER, DATE, TEXT) IS 'Terminates employee and handles cleanup (HR admin only)';
COMMENT ON FUNCTION hr_public.update_employee_role(INTEGER, INTEGER, INTEGER, INTEGER) IS 'Updates employee role, department, or manager (HR admin only)';
COMMENT ON FUNCTION hr_public.request_time_off(hr_public.time_off_type, DATE, DATE, TEXT) IS 'Creates time-off request for current employee';
COMMENT ON FUNCTION hr_public.process_time_off_request(INTEGER, TEXT, TEXT) IS 'Approves or rejects time-off requests (manager+ only)';
COMMENT ON FUNCTION hr_public.create_performance_review(INTEGER, INTEGER, TEXT) IS 'Creates performance review (manager+ only)';
COMMENT ON FUNCTION hr_public.update_performance_review(INTEGER, DECIMAL, TEXT, TEXT, TEXT, TEXT, TEXT, hr_public.review_status) IS 'Updates performance review content and status';
COMMENT ON FUNCTION hr_public.create_department(TEXT, TEXT, INTEGER) IS 'Creates new department (HR admin only)';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION hr_public.create_employee(TEXT, TEXT, TEXT, INTEGER, INTEGER, DATE, INTEGER, TEXT) TO postgraphile_app;
GRANT EXECUTE ON FUNCTION hr_public.terminate_employee(INTEGER, DATE, TEXT) TO postgraphile_app;
GRANT EXECUTE ON FUNCTION hr_public.update_employee_role(INTEGER, INTEGER, INTEGER, INTEGER) TO postgraphile_app;
GRANT EXECUTE ON FUNCTION hr_public.request_time_off(hr_public.time_off_type, DATE, DATE, TEXT) TO postgraphile_app;
GRANT EXECUTE ON FUNCTION hr_public.process_time_off_request(INTEGER, TEXT, TEXT) TO postgraphile_app;
GRANT EXECUTE ON FUNCTION hr_public.create_performance_review(INTEGER, INTEGER, TEXT) TO postgraphile_app;
GRANT EXECUTE ON FUNCTION hr_public.update_performance_review(INTEGER, DECIMAL, TEXT, TEXT, TEXT, TEXT, TEXT, hr_public.review_status) TO postgraphile_app;
GRANT EXECUTE ON FUNCTION hr_public.create_department(TEXT, TEXT, INTEGER) TO postgraphile_app;