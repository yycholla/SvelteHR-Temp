-- Authentication Logging Functions
-- Functions for tracking authentication events and security

-- Create authentication log table
CREATE TABLE hr_private.auth_log (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES hr_public.employees(id),
    email TEXT,
    event_type TEXT NOT NULL,
    success BOOLEAN NOT NULL,
    ip_address INET,
    user_agent TEXT,
    failure_reason TEXT,
    error_details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT auth_log_event_type_valid CHECK (event_type IN (
        'login', 'logout', 'token_refresh', 'password_change', 
        'failed_login', 'account_locked', 'authentication_error'
    ))
);

-- Indexes for auth log
CREATE INDEX idx_auth_log_employee_id ON hr_private.auth_log(employee_id);
CREATE INDEX idx_auth_log_email ON hr_private.auth_log(email);
CREATE INDEX idx_auth_log_event_type ON hr_private.auth_log(event_type);
CREATE INDEX idx_auth_log_created_at ON hr_private.auth_log(created_at);
CREATE INDEX idx_auth_log_success ON hr_private.auth_log(success);

-- Composite index for failed login monitoring
CREATE INDEX idx_auth_log_failed_logins ON hr_private.auth_log(email, created_at) 
WHERE success = FALSE;

-- Log successful login
CREATE OR REPLACE FUNCTION hr_hidden.log_successful_login(
    p_employee_id INTEGER,
    p_email TEXT,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO hr_private.auth_log (
        employee_id,
        email,
        event_type,
        success,
        ip_address,
        user_agent
    ) VALUES (
        p_employee_id,
        p_email,
        'login',
        TRUE,
        p_ip_address,
        p_user_agent
    );
END;
$$;

-- Log failed login attempt
CREATE OR REPLACE FUNCTION hr_hidden.log_failed_login_attempt(
    p_email TEXT,
    p_failure_reason TEXT,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    emp_id INTEGER;
BEGIN
    -- Try to get employee ID from email (may not exist)
    SELECT e.id INTO emp_id
    FROM hr_public.employees e
    JOIN hr_private.employee_account a ON e.id = a.employee_id
    WHERE LOWER(a.email) = LOWER(p_email);
    
    INSERT INTO hr_private.auth_log (
        employee_id,
        email,
        event_type,
        success,
        failure_reason,
        ip_address,
        user_agent
    ) VALUES (
        emp_id, -- May be NULL if email doesn't exist
        p_email,
        'failed_login',
        FALSE,
        p_failure_reason,
        p_ip_address,
        p_user_agent
    );
END;
$$;

-- Log logout
CREATE OR REPLACE FUNCTION hr_hidden.log_logout(
    p_employee_id INTEGER,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    emp_email TEXT;
BEGIN
    -- Get employee email
    SELECT e.email INTO emp_email
    FROM hr_public.employees e
    WHERE e.id = p_employee_id;
    
    INSERT INTO hr_private.auth_log (
        employee_id,
        email,
        event_type,
        success,
        ip_address,
        user_agent
    ) VALUES (
        p_employee_id,
        emp_email,
        'logout',
        TRUE,
        p_ip_address,
        p_user_agent
    );
END;
$$;

-- Log token refresh
CREATE OR REPLACE FUNCTION hr_hidden.log_token_refresh(
    p_employee_id INTEGER,
    p_email TEXT,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO hr_private.auth_log (
        employee_id,
        email,
        event_type,
        success,
        ip_address,
        user_agent
    ) VALUES (
        p_employee_id,
        p_email,
        'token_refresh',
        TRUE,
        p_ip_address,
        p_user_agent
    );
END;
$$;

-- Log password change
CREATE OR REPLACE FUNCTION hr_hidden.log_password_change(
    p_employee_id INTEGER,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    emp_email TEXT;
BEGIN
    -- Get employee email
    SELECT e.email INTO emp_email
    FROM hr_public.employees e
    WHERE e.id = p_employee_id;
    
    INSERT INTO hr_private.auth_log (
        employee_id,
        email,
        event_type,
        success,
        ip_address,
        user_agent
    ) VALUES (
        p_employee_id,
        emp_email,
        'password_change',
        TRUE,
        p_ip_address,
        p_user_agent
    );
END;
$$;

-- Log authentication errors
CREATE OR REPLACE FUNCTION hr_hidden.log_authentication_error(
    p_email TEXT,
    p_error_details TEXT,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    emp_id INTEGER;
BEGIN
    -- Try to get employee ID from email (may not exist)
    SELECT e.id INTO emp_id
    FROM hr_public.employees e
    JOIN hr_private.employee_account a ON e.id = a.employee_id
    WHERE LOWER(a.email) = LOWER(p_email);
    
    INSERT INTO hr_private.auth_log (
        employee_id,
        email,
        event_type,
        success,
        error_details,
        ip_address,
        user_agent
    ) VALUES (
        emp_id,
        p_email,
        'authentication_error',
        FALSE,
        p_error_details,
        p_ip_address,
        p_user_agent
    );
END;
$$;

-- Security monitoring functions

-- Get failed login attempts for email in timeframe
CREATE OR REPLACE FUNCTION hr_hidden.get_failed_login_attempts(
    p_email TEXT,
    p_since TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP - INTERVAL '1 hour')
) RETURNS INTEGER
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
    attempt_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO attempt_count
    FROM hr_private.auth_log
    WHERE LOWER(email) = LOWER(p_email)
      AND event_type = 'failed_login'
      AND success = FALSE
      AND created_at >= p_since;
    
    RETURN COALESCE(attempt_count, 0);
END;
$$;

-- Get recent authentication events for employee
CREATE OR REPLACE FUNCTION hr_public.get_my_recent_auth_events(
    p_limit INTEGER DEFAULT 10
) RETURNS TABLE (
    event_type TEXT,
    success BOOLEAN,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = hr_public, hr_private, hr_hidden, public
AS $$
DECLARE
    current_employee_id INTEGER;
BEGIN
    -- Get current employee ID
    current_employee_id := current_setting('jwt.claims.employee_id', true)::INTEGER;
    
    RETURN QUERY
    SELECT 
        al.event_type,
        al.success,
        al.ip_address,
        al.created_at
    FROM hr_private.auth_log al
    WHERE al.employee_id = current_employee_id
    ORDER BY al.created_at DESC
    LIMIT p_limit;
END;
$$;

-- Admin function to get authentication statistics
CREATE OR REPLACE FUNCTION hr_public.get_auth_statistics(
    p_days INTEGER DEFAULT 7
) RETURNS TABLE (
    date DATE,
    successful_logins BIGINT,
    failed_logins BIGINT,
    unique_users BIGINT,
    password_changes BIGINT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = hr_public, hr_private, hr_hidden, public
AS $$
DECLARE
    current_role_level INTEGER;
BEGIN
    -- Check if user has admin privileges
    current_role_level := current_setting('jwt.claims.role_level', true)::INTEGER;
    
    IF current_role_level < 80 THEN
        RAISE EXCEPTION 'Insufficient permissions to access authentication statistics';
    END IF;
    
    RETURN QUERY
    WITH date_series AS (
        SELECT generate_series(
            CURRENT_DATE - (p_days || ' days')::INTERVAL,
            CURRENT_DATE,
            '1 day'::INTERVAL
        )::DATE AS date
    )
    SELECT 
        ds.date,
        COALESCE(SUM(CASE WHEN al.event_type = 'login' AND al.success THEN 1 ELSE 0 END), 0) AS successful_logins,
        COALESCE(SUM(CASE WHEN al.event_type = 'failed_login' THEN 1 ELSE 0 END), 0) AS failed_logins,
        COALESCE(COUNT(DISTINCT CASE WHEN al.event_type = 'login' AND al.success THEN al.employee_id END), 0) AS unique_users,
        COALESCE(SUM(CASE WHEN al.event_type = 'password_change' THEN 1 ELSE 0 END), 0) AS password_changes
    FROM date_series ds
    LEFT JOIN hr_private.auth_log al ON ds.date = al.created_at::DATE
    GROUP BY ds.date
    ORDER BY ds.date;
END;
$$;

-- Comments
COMMENT ON TABLE hr_private.auth_log IS 'Authentication events and security audit trail';
COMMENT ON FUNCTION hr_hidden.log_successful_login(INTEGER, TEXT, INET, TEXT) IS 'Logs successful login events';
COMMENT ON FUNCTION hr_hidden.log_failed_login_attempt(TEXT, TEXT, INET, TEXT) IS 'Logs failed login attempts for security monitoring';
COMMENT ON FUNCTION hr_public.get_my_recent_auth_events(INTEGER) IS 'Returns recent authentication events for current user';
COMMENT ON FUNCTION hr_public.get_auth_statistics(INTEGER) IS 'Returns authentication statistics (admin only)';

-- Grant permissions
GRANT EXECUTE ON FUNCTION hr_public.get_my_recent_auth_events(INTEGER) TO postgraphile_app;
GRANT EXECUTE ON FUNCTION hr_public.get_auth_statistics(INTEGER) TO postgraphile_app;