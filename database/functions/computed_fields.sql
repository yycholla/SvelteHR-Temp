-- Computed Field Functions for PostGraphile
-- These functions are automatically exposed as GraphQL fields by PostGraphile

-- Employee computed fields

-- Full name computed field
CREATE OR REPLACE FUNCTION hr_public.employee_full_name(employee hr_public.employees)
RETURNS TEXT
LANGUAGE plpgsql STABLE
AS $$
BEGIN
    RETURN TRIM(employee.first_name || ' ' || employee.last_name);
END;
$$;

-- Direct reports for managers
CREATE OR REPLACE FUNCTION hr_public.employee_direct_reports(employee hr_public.employees)
RETURNS SETOF hr_public.employees
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = hr_public, hr_private, hr_hidden, public
AS $$
DECLARE
    current_role_level INTEGER;
    current_department_id INTEGER;
BEGIN
    -- Get current user context
    current_role_level := current_setting('jwt.claims.role_level', true)::INTEGER;
    current_department_id := current_setting('jwt.claims.department_id', true)::INTEGER;
    
    -- Only managers and above can see direct reports
    -- And only within their department scope (unless HR admin+)
    IF current_role_level < 60 THEN
        RETURN; -- Return empty set
    END IF;
    
    RETURN QUERY
    SELECT e.*
    FROM hr_public.employees e
    WHERE e.manager_id = employee.id
      AND e.status = 'ACTIVE'
      AND (
          current_role_level >= 80 OR -- HR admin can see all
          e.department_id = current_department_id -- Manager can see own department
      )
    ORDER BY e.last_name, e.first_name;
END;
$$;

-- Employee department path (for hierarchical display)
CREATE OR REPLACE FUNCTION hr_public.employee_department_path(employee hr_public.employees)
RETURNS TEXT
LANGUAGE plpgsql STABLE
AS $$
DECLARE
    path_parts TEXT[];
    current_dept hr_public.departments;
    dept_id INTEGER;
BEGIN
    dept_id := employee.department_id;
    
    -- Build path from current department up to root
    WHILE dept_id IS NOT NULL LOOP
        SELECT * INTO current_dept
        FROM hr_public.departments
        WHERE id = dept_id;
        
        EXIT WHEN NOT FOUND;
        
        path_parts := array_prepend(current_dept.name, path_parts);
        dept_id := current_dept.parent_department_id;
    END LOOP;
    
    RETURN array_to_string(path_parts, ' > ');
END;
$$;

-- Employee tenure in days
CREATE OR REPLACE FUNCTION hr_public.employee_tenure_days(employee hr_public.employees)
RETURNS INTEGER
LANGUAGE plpgsql STABLE
AS $$
BEGIN
    IF employee.status = 'TERMINATED' AND employee.termination_date IS NOT NULL THEN
        RETURN (employee.termination_date - employee.hire_date);
    ELSE
        RETURN (CURRENT_DATE - employee.hire_date);
    END IF;
END;
$$;

-- Employee can be managed by current user
CREATE OR REPLACE FUNCTION hr_public.employee_can_manage(employee hr_public.employees)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = hr_public, hr_private, hr_hidden, public
AS $$
DECLARE
    current_employee_id INTEGER;
    current_role_level INTEGER;
    current_department_id INTEGER;
BEGIN
    -- Get current user context
    current_employee_id := current_setting('jwt.claims.employee_id', true)::INTEGER;
    current_role_level := current_setting('jwt.claims.role_level', true)::INTEGER;
    current_department_id := current_setting('jwt.claims.department_id', true)::INTEGER;
    
    -- Super admin can manage everyone
    IF current_role_level >= 100 THEN
        RETURN TRUE;
    END IF;
    
    -- HR admin can manage all employees
    IF current_role_level >= 80 THEN
        RETURN TRUE;
    END IF;
    
    -- Manager can manage direct reports in same department
    IF current_role_level >= 60 THEN
        RETURN employee.manager_id = current_employee_id 
           AND employee.department_id = current_department_id;
    END IF;
    
    -- Employee can manage themselves (limited operations)
    IF current_role_level >= 20 THEN
        RETURN employee.id = current_employee_id;
    END IF;
    
    RETURN FALSE;
END;
$$;

-- Department computed fields

-- Department employee count
CREATE OR REPLACE FUNCTION hr_public.department_employee_count(department hr_public.departments)
RETURNS INTEGER
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = hr_public, hr_private, hr_hidden, public
AS $$
DECLARE
    emp_count INTEGER;
    current_role_level INTEGER;
    current_department_id INTEGER;
BEGIN
    -- Get current user context
    current_role_level := current_setting('jwt.claims.role_level', true)::INTEGER;
    current_department_id := current_setting('jwt.claims.department_id', true)::INTEGER;
    
    -- Only managers and above can see employee counts
    IF current_role_level < 60 THEN
        RETURN NULL;
    END IF;
    
    -- HR admin can see all department counts
    -- Manager can only see their own department count
    IF current_role_level >= 80 OR department.id = current_department_id THEN
        SELECT COUNT(*) INTO emp_count
        FROM hr_public.employees e
        WHERE e.department_id = department.id
          AND e.status = 'ACTIVE';
        
        RETURN emp_count;
    END IF;
    
    RETURN NULL;
END;
$$;

-- Department hierarchy path
CREATE OR REPLACE FUNCTION hr_public.department_path(department hr_public.departments)
RETURNS hr_public.departments[]
LANGUAGE plpgsql STABLE
AS $$
DECLARE
    path hr_public.departments[];
    current_dept hr_public.departments;
    dept_id INTEGER;
BEGIN
    dept_id := department.id;
    
    -- Build path from current department up to root
    WHILE dept_id IS NOT NULL LOOP
        SELECT * INTO current_dept
        FROM hr_public.departments
        WHERE id = dept_id;
        
        EXIT WHEN NOT FOUND;
        
        path := array_prepend(current_dept, path);
        dept_id := current_dept.parent_department_id;
    END LOOP;
    
    RETURN path;
END;
$$;

-- Department subdepartments
CREATE OR REPLACE FUNCTION hr_public.department_subdepartments(department hr_public.departments)
RETURNS SETOF hr_public.departments
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = hr_public, hr_private, hr_hidden, public
AS $$
DECLARE
    current_role_level INTEGER;
    current_department_id INTEGER;
BEGIN
    -- Get current user context
    current_role_level := current_setting('jwt.claims.role_level', true)::INTEGER;
    current_department_id := current_setting('jwt.claims.department_id', true)::INTEGER;
    
    -- Only managers and above can see department hierarchy
    IF current_role_level < 60 THEN
        RETURN; -- Return empty set
    END IF;
    
    RETURN QUERY
    SELECT d.*
    FROM hr_public.departments d
    WHERE d.parent_department_id = department.id
      AND (
          current_role_level >= 80 OR -- HR admin can see all
          d.id = current_department_id OR -- Manager can see own department
          d.parent_department_id = current_department_id -- Manager can see subdepartments
      )
    ORDER BY d.name;
END;
$$;

-- Time-off request computed fields

-- Time-off request can approve (for current user)
CREATE OR REPLACE FUNCTION hr_public.time_off_request_can_approve(request hr_public.time_off_requests)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = hr_public, hr_private, hr_hidden, public
AS $$
DECLARE
    current_employee_id INTEGER;
    current_role_level INTEGER;
    current_department_id INTEGER;
    request_employee hr_public.employees;
BEGIN
    -- Get current user context
    current_employee_id := current_setting('jwt.claims.employee_id', true)::INTEGER;
    current_role_level := current_setting('jwt.claims.role_level', true)::INTEGER;
    current_department_id := current_setting('jwt.claims.department_id', true)::INTEGER;
    
    -- Only pending requests can be approved
    IF request.status != 'PENDING' THEN
        RETURN FALSE;
    END IF;
    
    -- Can't approve own request
    IF request.employee_id = current_employee_id THEN
        RETURN FALSE;
    END IF;
    
    -- HR admin can approve all requests
    IF current_role_level >= 80 THEN
        RETURN TRUE;
    END IF;
    
    -- Manager can approve requests from direct reports in same department
    IF current_role_level >= 60 THEN
        SELECT * INTO request_employee
        FROM hr_public.employees
        WHERE id = request.employee_id;
        
        RETURN request_employee.manager_id = current_employee_id
           AND request_employee.department_id = current_department_id;
    END IF;
    
    RETURN FALSE;
END;
$$;

-- Time-off request can modify (for current user)
CREATE OR REPLACE FUNCTION hr_public.time_off_request_can_modify(request hr_public.time_off_requests)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = hr_public, hr_private, hr_hidden, public
AS $$
DECLARE
    current_employee_id INTEGER;
    current_role_level INTEGER;
BEGIN
    -- Get current user context
    current_employee_id := current_setting('jwt.claims.employee_id', true)::INTEGER;
    current_role_level := current_setting('jwt.claims.role_level', true)::INTEGER;
    
    -- HR admin can modify any request
    IF current_role_level >= 80 THEN
        RETURN TRUE;
    END IF;
    
    -- Employee can modify their own pending requests
    IF request.employee_id = current_employee_id AND request.status = 'PENDING' THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$;

-- Performance review computed fields

-- Performance review can view (for current user)
CREATE OR REPLACE FUNCTION hr_public.performance_review_can_view(review hr_public.performance_reviews)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = hr_public, hr_private, hr_hidden, public
AS $$
DECLARE
    current_employee_id INTEGER;
    current_role_level INTEGER;
BEGIN
    -- Get current user context
    current_employee_id := current_setting('jwt.claims.employee_id', true)::INTEGER;
    current_role_level := current_setting('jwt.claims.role_level', true)::INTEGER;
    
    -- HR admin can view all reviews
    IF current_role_level >= 80 THEN
        RETURN TRUE;
    END IF;
    
    -- Employee can view their own reviews (only if completed)
    IF review.employee_id = current_employee_id AND review.status = 'COMPLETED' THEN
        RETURN TRUE;
    END IF;
    
    -- Reviewer can view reviews they're conducting
    IF review.reviewer_id = current_employee_id THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$;

-- Performance review can edit (for current user)
CREATE OR REPLACE FUNCTION hr_public.performance_review_can_edit(review hr_public.performance_reviews)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = hr_public, hr_private, hr_hidden, public
AS $$
DECLARE
    current_employee_id INTEGER;
    current_role_level INTEGER;
BEGIN
    -- Get current user context
    current_employee_id := current_setting('jwt.claims.employee_id', true)::INTEGER;
    current_role_level := current_setting('jwt.claims.role_level', true)::INTEGER;
    
    -- HR admin can edit any review
    IF current_role_level >= 80 THEN
        RETURN TRUE;
    END IF;
    
    -- Reviewer can edit their own reviews (if not completed)
    IF review.reviewer_id = current_employee_id AND review.status != 'COMPLETED' THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$;

-- Comments for documentation
COMMENT ON FUNCTION hr_public.employee_full_name(hr_public.employees) IS 'Returns employee full name (first + last)';
COMMENT ON FUNCTION hr_public.employee_direct_reports(hr_public.employees) IS 'Returns direct reports for managers (role-based access)';
COMMENT ON FUNCTION hr_public.employee_department_path(hr_public.employees) IS 'Returns department hierarchy path as string';
COMMENT ON FUNCTION hr_public.employee_tenure_days(hr_public.employees) IS 'Returns employee tenure in days';
COMMENT ON FUNCTION hr_public.employee_can_manage(hr_public.employees) IS 'Returns true if current user can manage this employee';

COMMENT ON FUNCTION hr_public.department_employee_count(hr_public.departments) IS 'Returns active employee count for department (manager+ only)';
COMMENT ON FUNCTION hr_public.department_path(hr_public.departments) IS 'Returns department hierarchy path as array';
COMMENT ON FUNCTION hr_public.department_subdepartments(hr_public.departments) IS 'Returns child departments (role-based access)';

COMMENT ON FUNCTION hr_public.time_off_request_can_approve(hr_public.time_off_requests) IS 'Returns true if current user can approve this request';
COMMENT ON FUNCTION hr_public.time_off_request_can_modify(hr_public.time_off_requests) IS 'Returns true if current user can modify this request';

COMMENT ON FUNCTION hr_public.performance_review_can_view(hr_public.performance_reviews) IS 'Returns true if current user can view this review';
COMMENT ON FUNCTION hr_public.performance_review_can_edit(hr_public.performance_reviews) IS 'Returns true if current user can edit this review';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION hr_public.employee_full_name(hr_public.employees) TO postgraphile_app;
GRANT EXECUTE ON FUNCTION hr_public.employee_direct_reports(hr_public.employees) TO postgraphile_app;
GRANT EXECUTE ON FUNCTION hr_public.employee_department_path(hr_public.employees) TO postgraphile_app;
GRANT EXECUTE ON FUNCTION hr_public.employee_tenure_days(hr_public.employees) TO postgraphile_app;
GRANT EXECUTE ON FUNCTION hr_public.employee_can_manage(hr_public.employees) TO postgraphile_app;

GRANT EXECUTE ON FUNCTION hr_public.department_employee_count(hr_public.departments) TO postgraphile_app;
GRANT EXECUTE ON FUNCTION hr_public.department_path(hr_public.departments) TO postgraphile_app;
GRANT EXECUTE ON FUNCTION hr_public.department_subdepartments(hr_public.departments) TO postgraphile_app;

GRANT EXECUTE ON FUNCTION hr_public.time_off_request_can_approve(hr_public.time_off_requests) TO postgraphile_app;
GRANT EXECUTE ON FUNCTION hr_public.time_off_request_can_modify(hr_public.time_off_requests) TO postgraphile_app;

GRANT EXECUTE ON FUNCTION hr_public.performance_review_can_view(hr_public.performance_reviews) TO postgraphile_app;
GRANT EXECUTE ON FUNCTION hr_public.performance_review_can_edit(hr_public.performance_reviews) TO postgraphile_app;