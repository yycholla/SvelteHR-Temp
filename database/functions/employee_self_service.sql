-- Employee Self-Service Functions
-- Created: 2025-09-15
-- Description: Functions for employee self-service portal capabilities

-- Function for employees to update their own contact information
CREATE OR REPLACE FUNCTION hr_public.update_my_contact_info(
    p_phone_number VARCHAR(20) DEFAULT NULL,
    p_emergency_contact_name VARCHAR(255) DEFAULT NULL,
    p_emergency_contact_phone VARCHAR(20) DEFAULT NULL,
    p_address_line1 VARCHAR(255) DEFAULT NULL,
    p_address_line2 VARCHAR(255) DEFAULT NULL,
    p_city VARCHAR(100) DEFAULT NULL,
    p_state_province VARCHAR(100) DEFAULT NULL,
    p_postal_code VARCHAR(20) DEFAULT NULL,
    p_country VARCHAR(100) DEFAULT NULL
) RETURNS hr_public.contact_information
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    existing_contact hr_public.contact_information%ROWTYPE;
    updated_contact hr_public.contact_information%ROWTYPE;
BEGIN
    -- Get current user
    BEGIN
        current_user_id := current_setting('jwt.claims.user_id', true)::UUID;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Authentication required';
    END;
    
    -- Get existing contact information
    SELECT * INTO existing_contact
    FROM hr_public.contact_information
    WHERE employee_id = current_user_id;
    
    IF FOUND THEN
        -- Update existing record
        UPDATE hr_public.contact_information
        SET 
            phone_number = COALESCE(p_phone_number, phone_number),
            emergency_contact_name = COALESCE(p_emergency_contact_name, emergency_contact_name),
            emergency_contact_phone = COALESCE(p_emergency_contact_phone, emergency_contact_phone),
            address_line1 = COALESCE(p_address_line1, address_line1),
            address_line2 = COALESCE(p_address_line2, address_line2),
            city = COALESCE(p_city, city),
            state_province = COALESCE(p_state_province, state_province),
            postal_code = COALESCE(p_postal_code, postal_code),
            country = COALESCE(p_country, country),
            updated_at = NOW()
        WHERE employee_id = current_user_id
        RETURNING * INTO updated_contact;
    ELSE
        -- Create new record
        INSERT INTO hr_public.contact_information (
            employee_id, phone_number, emergency_contact_name, emergency_contact_phone,
            address_line1, address_line2, city, state_province, postal_code, country
        ) VALUES (
            current_user_id, p_phone_number, p_emergency_contact_name, p_emergency_contact_phone,
            p_address_line1, p_address_line2, p_city, p_state_province, p_postal_code, p_country
        ) RETURNING * INTO updated_contact;
    END IF;
    
    -- Log the update
    PERFORM hr_hidden.log_audit_event(
        'hr_public.contact_information',
        updated_contact.id,
        CASE WHEN existing_contact.id IS NOT NULL THEN 'UPDATE' ELSE 'INSERT' END,
        current_user_id,
        CASE WHEN existing_contact.id IS NOT NULL THEN to_jsonb(existing_contact) ELSE NULL END,
        to_jsonb(updated_contact),
        'Employee updated contact information',
        'INFO',
        'DATA_CHANGE'
    );
    
    RETURN updated_contact;
END;
$$;

-- Function to get employee's own comprehensive profile
CREATE OR REPLACE FUNCTION hr_public.get_my_profile()
RETURNS TABLE(
    -- User info
    user_id UUID,
    email VARCHAR,
    display_name VARCHAR,
    is_active BOOLEAN,
    onboarding_status VARCHAR,
    
    -- Job info
    job_title VARCHAR,
    employment_type VARCHAR,
    start_date DATE,
    department_name VARCHAR,
    manager_name VARCHAR,
    
    -- Contact info
    phone_number VARCHAR,
    emergency_contact_name VARCHAR,
    emergency_contact_phone VARCHAR,
    address_line1 VARCHAR,
    city VARCHAR,
    state_province VARCHAR,
    
    -- Role info
    primary_role VARCHAR,
    role_level INTEGER,
    
    -- Statistics
    tenure_months INTEGER,
    pending_time_off_requests INTEGER,
    pending_reviews INTEGER
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Get current user
    BEGIN
        current_user_id := current_setting('jwt.claims.user_id', true)::UUID;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Authentication required';
    END;
    
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        u.display_name,
        u.is_active,
        u.onboarding_status,
        
        ji.job_title,
        ji.employment_type,
        ji.start_date,
        d.name,
        manager.display_name,
        
        ci.phone_number,
        ci.emergency_contact_name,
        ci.emergency_contact_phone,
        ci.address_line1,
        ci.city,
        ci.state_province,
        
        ur.name,
        ur.level,
        
        CASE 
            WHEN ji.start_date IS NOT NULL THEN 
                EXTRACT(YEAR FROM AGE(CURRENT_DATE, ji.start_date))::INTEGER * 12 + 
                EXTRACT(MONTH FROM AGE(CURRENT_DATE, ji.start_date))::INTEGER
            ELSE 0
        END,
        
        (SELECT COUNT(*)::INTEGER FROM hr_public.time_off_requests tor 
         WHERE tor.user_id = current_user_id AND tor.status = 'PENDING'),
        
        (SELECT COUNT(*)::INTEGER FROM hr_public.performance_reviews pr 
         WHERE pr.employee_id = current_user_id AND pr.status IN ('NOT_STARTED', 'IN_PROGRESS'))
    
    FROM hr_public.users u
    LEFT JOIN hr_public.job_information ji ON u.id = ji.employee_id AND ji.end_date IS NULL
    LEFT JOIN hr_public.departments d ON ji.department_id = d.id
    LEFT JOIN hr_public.users manager ON ji.manager_id = manager.id
    LEFT JOIN hr_public.contact_information ci ON u.id = ci.employee_id
    LEFT JOIN hr_public.user_role_assignments ura ON u.id = ura.user_id AND ura.is_active = true
    LEFT JOIN hr_public.user_roles ur ON ura.role_id = ur.id
    WHERE u.id = current_user_id
      AND (ur.level = (
          SELECT MAX(ur2.level) 
          FROM hr_public.user_role_assignments ura2 
          JOIN hr_public.user_roles ur2 ON ura2.role_id = ur2.id
          WHERE ura2.user_id = current_user_id AND ura2.is_active = true
      ) OR ur.level IS NULL);
END;
$$;

-- Function to get employee's time-off summary
CREATE OR REPLACE FUNCTION hr_public.get_my_time_off_summary()
RETURNS TABLE(
    policy_name VARCHAR,
    time_off_type hr_public.time_off_type,
    current_balance DECIMAL,
    pending_balance DECIMAL,
    used_this_year DECIMAL,
    pending_requests INTEGER,
    recent_requests INTEGER
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    current_year INTEGER;
BEGIN
    -- Get current user and year
    BEGIN
        current_user_id := current_setting('jwt.claims.user_id', true)::UUID;
        current_year := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Authentication required';
    END;
    
    RETURN QUERY
    SELECT 
        top.policy_name,
        top.time_off_type,
        COALESCE(tob.current_balance, 0),
        COALESCE(tob.pending_balance, 0),
        COALESCE(tob.used_this_year, 0),
        COALESCE(pending_count.count, 0)::INTEGER,
        COALESCE(recent_count.count, 0)::INTEGER
    
    FROM hr_public.time_off_policies top
    LEFT JOIN hr_public.time_off_balances tob ON top.id = tob.policy_id 
        AND tob.user_id = current_user_id 
        AND tob.year = current_year
    LEFT JOIN (
        SELECT policy_id, COUNT(*) as count 
        FROM hr_public.time_off_requests 
        WHERE user_id = current_user_id AND status = 'PENDING'
        GROUP BY policy_id
    ) pending_count ON top.id = pending_count.policy_id
    LEFT JOIN (
        SELECT policy_id, COUNT(*) as count 
        FROM hr_public.time_off_requests 
        WHERE user_id = current_user_id 
          AND submitted_at >= CURRENT_DATE - INTERVAL '90 days'
        GROUP BY policy_id
    ) recent_count ON top.id = recent_count.policy_id
    WHERE top.is_active = true
    ORDER BY top.time_off_type;
END;
$$;

-- Function to get employee's goals and progress
CREATE OR REPLACE FUNCTION hr_public.get_my_goals(
    p_include_completed BOOLEAN DEFAULT false
)
RETURNS TABLE(
    goal_id UUID,
    title VARCHAR,
    description TEXT,
    category VARCHAR,
    priority VARCHAR,
    status hr_public.goal_status,
    progress_percentage INTEGER,
    target_date DATE,
    created_date DATE,
    completed_at TIMESTAMPTZ,
    review_cycle VARCHAR
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Get current user
    BEGIN
        current_user_id := current_setting('jwt.claims.user_id', true)::UUID;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Authentication required';
    END;
    
    RETURN QUERY
    SELECT 
        g.id,
        g.title,
        g.description,
        g.category,
        g.priority,
        g.status,
        g.progress_percentage,
        g.target_date,
        g.created_date,
        g.completed_at,
        rc.cycle_name
    
    FROM hr_public.goals g
    LEFT JOIN hr_public.performance_reviews pr ON g.review_id = pr.id
    LEFT JOIN hr_public.review_cycles rc ON pr.cycle_id = rc.id
    WHERE g.employee_id = current_user_id
      AND (p_include_completed OR g.status != 'COMPLETED')
    ORDER BY 
        CASE g.priority 
            WHEN 'HIGH' THEN 1 
            WHEN 'MEDIUM' THEN 2 
            WHEN 'LOW' THEN 3 
        END,
        g.target_date NULLS LAST,
        g.created_date DESC;
END;
$$;

-- Function for employee to request document access
CREATE OR REPLACE FUNCTION hr_public.request_document_access(
    p_document_id UUID,
    p_access_type VARCHAR DEFAULT 'READ',
    p_reason TEXT DEFAULT NULL
) RETURNS hr_public.document_access
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    document_owner UUID;
    new_access hr_public.document_access;
BEGIN
    -- Get current user
    BEGIN
        current_user_id := current_setting('jwt.claims.user_id', true)::UUID;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Authentication required';
    END;
    
    -- Validate access type
    IF p_access_type NOT IN ('read', 'download') THEN
        RAISE EXCEPTION 'Invalid access type. Employees can only request read or download access.';
    END IF;
    
    -- Get document owner
    SELECT employee_id INTO document_owner
    FROM hr_public.employee_documents
    WHERE id = p_document_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Document not found';
    END IF;
    
    -- Check if user already has access
    IF EXISTS (
        SELECT 1 FROM hr_public.document_access
        WHERE document_id = p_document_id 
          AND user_id = current_user_id 
          AND access_type = p_access_type
          AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Access already granted for this document and access type';
    END IF;
    
    -- Create access request (will need manager/HR approval for cross-employee access)
    INSERT INTO hr_public.document_access (
        document_id, user_id, access_type, granted_by, access_reason, is_active
    ) VALUES (
        p_document_id, current_user_id, p_access_type, 
        CASE WHEN document_owner = current_user_id THEN current_user_id ELSE NULL END,
        p_reason,
        CASE WHEN document_owner = current_user_id THEN true ELSE false END  -- Auto-approve own documents
    ) RETURNING * INTO new_access;
    
    -- Log the request
    PERFORM hr_hidden.log_audit_event(
        'hr_public.document_access',
        new_access.id,
        'INSERT',
        current_user_id,
        NULL,
        to_jsonb(new_access),
        format('Document access requested: %s for document %s', p_access_type, p_document_id),
        'INFO',
        'DATA_CHANGE'
    );
    
    RETURN new_access;
END;
$$;

-- Function to get employee's recent activities/notifications
CREATE OR REPLACE FUNCTION hr_public.get_my_recent_activities(
    p_days INTEGER DEFAULT 30,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE(
    activity_type VARCHAR,
    description TEXT,
    activity_date TIMESTAMPTZ,
    related_id UUID,
    metadata JSONB
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    cutoff_date TIMESTAMPTZ;
BEGIN
    -- Get current user
    BEGIN
        current_user_id := current_setting('jwt.claims.user_id', true)::UUID;
        cutoff_date := CURRENT_TIMESTAMP - (p_days || ' days')::INTERVAL;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Authentication required';
    END;
    
    RETURN QUERY
    (
        -- Time-off requests
        SELECT 
            'TIME_OFF_REQUEST'::VARCHAR,
            format('Time-off request %s: %s hours', tor.status, tor.hours_requested),
            tor.submitted_at,
            tor.id,
            jsonb_build_object('status', tor.status, 'hours', tor.hours_requested, 'dates', tor.start_date || ' to ' || tor.end_date)
        FROM hr_public.time_off_requests tor
        WHERE tor.user_id = current_user_id 
          AND tor.submitted_at >= cutoff_date
        
        UNION ALL
        
        -- Performance review updates  
        SELECT 
            'PERFORMANCE_REVIEW'::VARCHAR,
            format('Performance review %s', pr.status),
            GREATEST(pr.created_at, pr.updated_at),
            pr.id,
            jsonb_build_object('status', pr.status, 'cycle', (SELECT cycle_name FROM hr_public.review_cycles WHERE id = pr.cycle_id))
        FROM hr_public.performance_reviews pr
        WHERE pr.employee_id = current_user_id 
          AND GREATEST(pr.created_at, pr.updated_at) >= cutoff_date
        
        UNION ALL
        
        -- Goal updates
        SELECT 
            'GOAL_UPDATE'::VARCHAR,
            format('Goal "%s" progress: %s%%', g.title, g.progress_percentage),
            g.updated_at,
            g.id,
            jsonb_build_object('title', g.title, 'progress', g.progress_percentage, 'status', g.status)
        FROM hr_public.goals g
        WHERE g.employee_id = current_user_id 
          AND g.updated_at >= cutoff_date
          AND g.updated_at > g.created_at  -- Only updates, not creation
        
        UNION ALL
        
        -- Notifications
        SELECT 
            'NOTIFICATION'::VARCHAR,
            n.message,
            n.created_at,
            n.id,
            jsonb_build_object('title', n.title, 'type', n.type, 'is_read', n.is_read)
        FROM hr_public.notifications n
        WHERE n.user_id = current_user_id 
          AND n.created_at >= cutoff_date
    )
    ORDER BY activity_date DESC
    LIMIT p_limit;
END;
$$;

-- Comments
COMMENT ON FUNCTION hr_public.update_my_contact_info(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR) IS
'Update own contact information (employee self-service)';

COMMENT ON FUNCTION hr_public.get_my_profile() IS
'Get comprehensive profile information for current user';

COMMENT ON FUNCTION hr_public.get_my_time_off_summary() IS
'Get time-off balances and request summary for current user';

COMMENT ON FUNCTION hr_public.get_my_goals(BOOLEAN) IS
'Get goals and progress for current user';

COMMENT ON FUNCTION hr_public.request_document_access(UUID, VARCHAR, TEXT) IS
'Request access to a document (employee self-service)';

COMMENT ON FUNCTION hr_public.get_my_recent_activities(INTEGER, INTEGER) IS
'Get recent activities and updates for current user';

-- Grant permissions
GRANT EXECUTE ON FUNCTION hr_public.update_my_contact_info(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR) TO hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT EXECUTE ON FUNCTION hr_public.get_my_profile() TO hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT EXECUTE ON FUNCTION hr_public.get_my_time_off_summary() TO hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT EXECUTE ON FUNCTION hr_public.get_my_goals(BOOLEAN) TO hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT EXECUTE ON FUNCTION hr_public.request_document_access(UUID, VARCHAR, TEXT) TO hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT EXECUTE ON FUNCTION hr_public.get_my_recent_activities(INTEGER, INTEGER) TO hr_employee, hr_manager, hr_admin, hr_super_admin;