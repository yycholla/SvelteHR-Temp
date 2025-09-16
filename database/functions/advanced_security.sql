-- Advanced Security Functions
-- Created: 2025-09-15
-- Description: Functions for enhanced authentication, session management, and security monitoring

-- Function to log security events
CREATE OR REPLACE FUNCTION hr_public.log_security_event(
    p_event_type hr_public.security_event_type,
    p_event_category VARCHAR(50),
    p_event_message TEXT,
    p_user_id UUID DEFAULT NULL,
    p_session_id UUID DEFAULT NULL,
    p_event_data JSONB DEFAULT '{}',
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_risk_score INTEGER DEFAULT 0
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    event_id UUID;
    is_suspicious BOOLEAN := false;
    requires_investigation BOOLEAN := false;
BEGIN
    -- Determine if event is suspicious based on risk score and type
    IF p_risk_score >= 70 OR p_event_type IN ('LOGIN_BLOCKED', 'SUSPICIOUS_ACTIVITY', 'PERMISSION_DENIED') THEN
        is_suspicious := true;
    END IF;
    
    -- Determine if event requires investigation
    IF p_risk_score >= 85 OR p_event_type IN ('LOGIN_BLOCKED', 'SUSPICIOUS_ACTIVITY') THEN
        requires_investigation := true;
    END IF;
    
    -- Insert security event
    INSERT INTO hr_public.security_events (
        event_type, event_category, event_message, user_id, session_id,
        event_data, ip_address, user_agent, risk_score,
        is_suspicious, requires_investigation
    ) VALUES (
        p_event_type, p_event_category, p_event_message, p_user_id, p_session_id,
        p_event_data, p_ip_address, p_user_agent, p_risk_score,
        is_suspicious, requires_investigation
    ) RETURNING id INTO event_id;
    
    -- Auto-trigger notifications for high-risk events
    IF requires_investigation THEN
        -- Send notification to security team
        PERFORM hr_public.send_templated_notification(
            'security_alert',
            (SELECT id FROM hr_public.users WHERE email = 'admin@postgraphile-hr.com'),
            jsonb_build_object(
                'event_type', p_event_type,
                'risk_score', p_risk_score,
                'user_email', COALESCE((SELECT email FROM hr_public.users WHERE id = p_user_id), 'Unknown'),
                'event_message', p_event_message
            ),
            'URGENT'::hr_public.notification_priority
        );
    END IF;
    
    RETURN event_id;
END;
$$;

-- Function to track failed login attempts
CREATE OR REPLACE FUNCTION hr_public.track_failed_login(
    p_email VARCHAR(255),
    p_ip_address INET,
    p_user_agent TEXT,
    p_failure_reason VARCHAR(100)
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    attempt_record RECORD;
    should_block BOOLEAN := false;
    policy_record RECORD;
BEGIN
    -- Get active password policy
    SELECT * INTO policy_record
    FROM hr_public.password_policies 
    WHERE is_active = true 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    -- Get or create failed attempt record
    SELECT * INTO attempt_record
    FROM hr_public.failed_login_attempts
    WHERE email = p_email AND ip_address = p_ip_address
      AND created_at > NOW() - INTERVAL '1 hour'
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF attempt_record IS NULL THEN
        -- Create new attempt record
        INSERT INTO hr_public.failed_login_attempts (
            email, ip_address, user_agent, failure_reason
        ) VALUES (
            p_email, p_ip_address, p_user_agent, p_failure_reason
        );
    ELSE
        -- Update existing record
        UPDATE hr_public.failed_login_attempts
        SET 
            attempt_count = attempt_count + 1,
            last_attempt_at = NOW(),
            failure_reason = p_failure_reason
        WHERE id = attempt_record.id;
        
        -- Check if should block
        IF (attempt_record.attempt_count + 1) >= COALESCE(policy_record.max_failed_attempts, 5) THEN
            should_block := true;
            
            UPDATE hr_public.failed_login_attempts
            SET 
                is_blocked = true,
                blocked_until = NOW() + INTERVAL '1 minute' * COALESCE(policy_record.lockout_duration_minutes, 30),
                block_reason = 'Too many failed attempts'
            WHERE id = attempt_record.id;
        END IF;
    END IF;
    
    -- Log security event
    PERFORM hr_public.log_security_event(
        'LOGIN_FAILED'::hr_public.security_event_type,
        'authentication',
        'Failed login attempt for ' || p_email,
        (SELECT id FROM hr_public.users WHERE email = p_email),
        NULL,
        jsonb_build_object(
            'failure_reason', p_failure_reason,
            'attempt_count', COALESCE(attempt_record.attempt_count, 0) + 1,
            'will_block', should_block
        ),
        p_ip_address,
        p_user_agent,
        CASE WHEN should_block THEN 80 ELSE 40 END
    );
    
    RETURN should_block;
END;
$$;

-- Function to create secure session
CREATE OR REPLACE FUNCTION hr_public.create_user_session(
    p_user_id UUID,
    p_session_token VARCHAR(255),
    p_refresh_token VARCHAR(255),
    p_device_info JSONB DEFAULT '{}',
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_expires_at TIMESTAMPTZ DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    session_id UUID;
    device_id VARCHAR(255);
    device_trust hr_public.device_trust_level := 'UNKNOWN';
    session_name VARCHAR(100);
    mfa_required BOOLEAN := false;
BEGIN
    -- Generate device ID from device info
    device_id := encode(digest(p_device_info::text, 'sha256'), 'hex');
    
    -- Determine device trust level
    SELECT trust_level INTO device_trust
    FROM hr_public.user_devices
    WHERE user_id = p_user_id AND device_id = device_id;
    
    IF device_trust IS NULL THEN
        device_trust := 'UNKNOWN';
        
        -- Register new device
        INSERT INTO hr_public.user_devices (
            user_id, device_id, device_name, device_type, device_fingerprint,
            last_seen_ip, first_seen_at, last_seen_at
        ) VALUES (
            p_user_id, device_id, 
            COALESCE(p_device_info->>'name', 'Unknown Device'),
            COALESCE(p_device_info->>'type', 'unknown'),
            p_device_info,
            p_ip_address, NOW(), NOW()
        );
    ELSE
        -- Update existing device
        UPDATE hr_public.user_devices
        SET 
            last_seen_at = NOW(),
            last_seen_ip = p_ip_address,
            session_count = session_count + 1
        WHERE user_id = p_user_id AND device_id = device_id;
    END IF;
    
    -- Check if MFA is required
    SELECT is_enabled INTO mfa_required
    FROM hr_public.user_mfa_settings
    WHERE user_id = p_user_id;
    
    -- Generate session name
    session_name := COALESCE(p_device_info->>'name', 'Unknown Device');
    
    -- Create session
    INSERT INTO hr_public.user_sessions (
        user_id, session_token, refresh_token, session_name,
        device_id, device_name, device_type, device_trust_level,
        ip_address, user_agent, expires_at,
        is_mfa_verified
    ) VALUES (
        p_user_id, p_session_token, p_refresh_token, session_name,
        device_id, 
        COALESCE(p_device_info->>'name', 'Unknown Device'),
        COALESCE(p_device_info->>'type', 'unknown'),
        device_trust,
        p_ip_address, p_user_agent, 
        COALESCE(p_expires_at, NOW() + INTERVAL '15 minutes'),
        NOT COALESCE(mfa_required, false)
    ) RETURNING id INTO session_id;
    
    -- Log security event
    PERFORM hr_public.log_security_event(
        'SESSION_CREATED'::hr_public.security_event_type,
        'authentication',
        'User session created successfully',
        p_user_id,
        session_id,
        jsonb_build_object(
            'device_trust', device_trust,
            'mfa_required', mfa_required,
            'device_info', p_device_info
        ),
        p_ip_address,
        p_user_agent,
        CASE 
            WHEN device_trust = 'TRUSTED' THEN 10
            WHEN device_trust = 'RECOGNIZED' THEN 20
            ELSE 30
        END
    );
    
    RETURN session_id;
END;
$$;

-- Function to validate session and update activity
CREATE OR REPLACE FUNCTION hr_public.validate_session(
    p_session_token VARCHAR(255),
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
) RETURNS TABLE(
    session_id UUID,
    user_id UUID,
    is_valid BOOLEAN,
    requires_mfa BOOLEAN,
    expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    session_record RECORD;
    risk_score INTEGER := 0;
BEGIN
    -- Get session
    SELECT * INTO session_record
    FROM hr_public.user_sessions us
    WHERE us.session_token = p_session_token 
      AND us.status = 'ACTIVE'
      AND us.expires_at > NOW();
    
    IF session_record IS NULL THEN
        -- Invalid or expired session
        RETURN QUERY SELECT NULL::UUID, NULL::UUID, false, false, NULL::TIMESTAMPTZ;
        RETURN;
    END IF;
    
    -- Calculate risk score based on session characteristics
    risk_score := 0;
    
    -- Check IP address change
    IF p_ip_address IS NOT NULL AND session_record.ip_address != p_ip_address THEN
        risk_score := risk_score + 30;
    END IF;
    
    -- Check user agent change
    IF p_user_agent IS NOT NULL AND session_record.user_agent != p_user_agent THEN
        risk_score := risk_score + 20;
    END IF;
    
    -- Check time since last activity
    IF session_record.last_activity_at < NOW() - INTERVAL '1 hour' THEN
        risk_score := risk_score + 10;
    END IF;
    
    -- Update session activity
    UPDATE hr_public.user_sessions
    SET 
        last_activity_at = NOW(),
        ip_address = COALESCE(p_ip_address, ip_address),
        user_agent = COALESCE(p_user_agent, user_agent)
    WHERE id = session_record.id;
    
    -- Log high-risk activity
    IF risk_score >= 50 THEN
        PERFORM hr_public.log_security_event(
            'SUSPICIOUS_ACTIVITY'::hr_public.security_event_type,
            'session',
            'Suspicious session activity detected',
            session_record.user_id,
            session_record.id,
            jsonb_build_object(
                'risk_factors', jsonb_build_object(
                    'ip_changed', p_ip_address != session_record.ip_address,
                    'user_agent_changed', p_user_agent != session_record.user_agent,
                    'inactive_time', EXTRACT(EPOCH FROM (NOW() - session_record.last_activity_at))
                )
            ),
            p_ip_address,
            p_user_agent,
            risk_score
        );
    END IF;
    
    -- Return session validation result
    RETURN QUERY SELECT 
        session_record.id,
        session_record.user_id,
        true,
        NOT session_record.is_mfa_verified,
        session_record.expires_at;
END;
$$;

-- Function to terminate session
CREATE OR REPLACE FUNCTION hr_public.terminate_session(
    p_session_id UUID,
    p_termination_reason VARCHAR(100) DEFAULT 'manual'
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    session_record RECORD;
BEGIN
    -- Get session details
    SELECT * INTO session_record
    FROM hr_public.user_sessions
    WHERE id = p_session_id AND status = 'ACTIVE';
    
    IF session_record IS NULL THEN
        RETURN false;
    END IF;
    
    -- Update session status
    UPDATE hr_public.user_sessions
    SET 
        status = 'TERMINATED',
        terminated_at = NOW(),
        termination_reason = p_termination_reason
    WHERE id = p_session_id;
    
    -- Log security event
    PERFORM hr_public.log_security_event(
        'SESSION_TERMINATED'::hr_public.security_event_type,
        'session',
        'User session terminated: ' || p_termination_reason,
        session_record.user_id,
        session_record.id,
        jsonb_build_object('reason', p_termination_reason),
        session_record.ip_address,
        session_record.user_agent,
        CASE WHEN p_termination_reason = 'security' THEN 60 ELSE 10 END
    );
    
    RETURN true;
END;
$$;

-- Function to check if login is blocked
CREATE OR REPLACE FUNCTION hr_public.is_login_blocked(
    p_email VARCHAR(255),
    p_ip_address INET
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    blocked_record RECORD;
BEGIN
    -- Check for active blocks
    SELECT * INTO blocked_record
    FROM hr_public.failed_login_attempts
    WHERE (email = p_email OR ip_address = p_ip_address)
      AND is_blocked = true
      AND blocked_until > NOW()
    LIMIT 1;
    
    RETURN (blocked_record IS NOT NULL);
END;
$$;

-- Add PostGraphile comments
COMMENT ON FUNCTION hr_public.log_security_event(hr_public.security_event_type, VARCHAR, TEXT, UUID, UUID, JSONB, INET, TEXT, INTEGER) IS
'@name logSecurityEvent
@resultFieldName eventId
Log security events for monitoring and compliance';

COMMENT ON FUNCTION hr_public.track_failed_login(VARCHAR, INET, TEXT, VARCHAR) IS
'@name trackFailedLogin
Track failed login attempts and implement blocking logic';

COMMENT ON FUNCTION hr_public.create_user_session(UUID, VARCHAR, VARCHAR, JSONB, INET, TEXT, TIMESTAMPTZ) IS
'@name createUserSession
@resultFieldName sessionId
Create secure user session with device tracking';

COMMENT ON FUNCTION hr_public.validate_session(VARCHAR, INET, TEXT) IS
'@name validateSession
Validate session token and update activity tracking';

COMMENT ON FUNCTION hr_public.terminate_session(UUID, VARCHAR) IS
'@name terminateSession
Terminate user session with reason logging';

COMMENT ON FUNCTION hr_public.is_login_blocked(VARCHAR, INET) IS
'@name isLoginBlocked
Check if login is blocked due to failed attempts';

-- Grant permissions
GRANT EXECUTE ON FUNCTION hr_public.log_security_event(hr_public.security_event_type, VARCHAR, TEXT, UUID, UUID, JSONB, INET, TEXT, INTEGER) TO hr_admin, hr_super_admin;

GRANT EXECUTE ON FUNCTION hr_public.track_failed_login(VARCHAR, INET, TEXT, VARCHAR) TO hr_admin, hr_super_admin;

GRANT EXECUTE ON FUNCTION hr_public.create_user_session(UUID, VARCHAR, VARCHAR, JSONB, INET, TEXT, TIMESTAMPTZ) TO hr_employee, hr_manager, hr_admin, hr_super_admin;

GRANT EXECUTE ON FUNCTION hr_public.validate_session(VARCHAR, INET, TEXT) TO hr_employee, hr_manager, hr_admin, hr_super_admin;

GRANT EXECUTE ON FUNCTION hr_public.terminate_session(UUID, VARCHAR) TO hr_employee, hr_manager, hr_admin, hr_super_admin;

GRANT EXECUTE ON FUNCTION hr_public.is_login_blocked(VARCHAR, INET) TO hr_employee, hr_manager, hr_admin, hr_super_admin;