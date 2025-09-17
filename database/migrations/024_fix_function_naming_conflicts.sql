-- Migration: Fix PostGraphile Function Naming Conflicts
-- Created: 2025-09-17
-- Description: Rename functions to avoid GraphQL type naming conflicts

-- Drop the old functions
DROP FUNCTION IF EXISTS hr_public.create_data_breach_incident;
DROP FUNCTION IF EXISTS hr_public.create_privacy_impact_assessment;
DROP FUNCTION IF EXISTS hr_public.create_user_session;

-- Recreate with unique names to avoid type conflicts

-- Renamed: create_data_breach_incident -> report_data_breach
CREATE OR REPLACE FUNCTION hr_public.report_data_breach(
    p_incident_title VARCHAR(200),
    p_severity VARCHAR(20),
    p_breach_type VARCHAR(100),
    p_affected_data_categories TEXT[],
    p_estimated_affected_records INTEGER,
    p_root_cause TEXT DEFAULT NULL,
    p_discovered_by UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    incident_id UUID;
    incident_number VARCHAR(50);
    current_user_id UUID;
    notification_required BOOLEAN := false;
BEGIN
    -- Get current user
    BEGIN
        current_user_id := COALESCE(p_discovered_by, current_setting('session.user_id')::UUID);
    EXCEPTION WHEN OTHERS THEN
        current_user_id := p_discovered_by;
    END;

    -- Generate incident number
    incident_number := 'BR-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
                      LPAD(EXTRACT(EPOCH FROM NOW())::TEXT, 10, '0');

    -- Determine if regulatory notification is required
    IF p_severity IN ('HIGH', 'CRITICAL') OR p_estimated_affected_records > 250 THEN
        notification_required := true;
    END IF;

    -- Create breach incident
    INSERT INTO hr_public.data_breach_incidents (
        incident_number, incident_title, severity,
        discovered_at, discovered_by,
        breach_type, affected_data_categories, estimated_affected_records,
        root_cause, regulatory_notification_required,
        regulatory_notification_deadline
    ) VALUES (
        incident_number, p_incident_title, p_severity,
        NOW(), current_user_id,
        p_breach_type, p_affected_data_categories, p_estimated_affected_records,
        p_root_cause, notification_required,
        CASE WHEN notification_required THEN CURRENT_DATE + INTERVAL '72 hours' ELSE NULL END
    ) RETURNING id INTO incident_id;

    RETURN incident_id;
END;
$$;

-- Renamed: create_privacy_impact_assessment -> initiate_privacy_assessment
CREATE OR REPLACE FUNCTION hr_public.initiate_privacy_assessment(
    p_assessment_title VARCHAR(200),
    p_project_name VARCHAR(200),
    p_process_description TEXT,
    p_personal_data_categories TEXT[],
    p_processing_purposes TEXT[],
    p_legal_basis VARCHAR(200),
    p_conducted_by UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    assessment_id UUID;
    assessment_reference VARCHAR(100);
    current_user_id UUID;
BEGIN
    -- Get current user
    BEGIN
        current_user_id := COALESCE(p_conducted_by, current_setting('session.user_id')::UUID);
    EXCEPTION WHEN OTHERS THEN
        current_user_id := p_conducted_by;
    END;

    -- Generate assessment reference
    assessment_reference := 'DPIA-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
                           LPAD(NEXTVAL('hr_hidden.assessment_sequence')::TEXT, 4, '0');

    -- Create assessment
    INSERT INTO hr_public.privacy_impact_assessments (
        assessment_title, assessment_reference, project_name,
        process_description, personal_data_categories,
        processing_purposes, legal_basis,
        conducted_by, assessment_date
    ) VALUES (
        p_assessment_title, assessment_reference, p_project_name,
        p_process_description, p_personal_data_categories,
        p_processing_purposes, p_legal_basis,
        current_user_id, CURRENT_DATE
    ) RETURNING id INTO assessment_id;

    RETURN assessment_id;
END;
$$;

-- Renamed: create_user_session -> establish_user_session
CREATE OR REPLACE FUNCTION hr_public.establish_user_session(
    p_user_id UUID,
    p_ip_address INET DEFAULT NULL,
    p_user_agent VARCHAR(500) DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    session_id UUID;
    session_token VARCHAR(255);
BEGIN
    -- Generate session ID and token
    session_id := uuid_generate_v4();
    session_token := encode(gen_random_bytes(32), 'hex');

    -- Create session
    INSERT INTO hr_public.user_sessions (
        id, user_id, session_token,
        ip_address, user_agent,
        created_at, expires_at, is_active
    ) VALUES (
        session_id, p_user_id, session_token,
        p_ip_address, p_user_agent,
        NOW(), NOW() + INTERVAL '8 hours', true
    );

    RETURN session_id;
END;
$$;

-- Add PostGraphile comments with unique names
COMMENT ON FUNCTION hr_public.report_data_breach(VARCHAR, VARCHAR, VARCHAR, TEXT[], INTEGER, TEXT, UUID) IS
'@name reportDataBreach
@resultFieldName breachIncidentId
Report and manage data breach incidents';

COMMENT ON FUNCTION hr_public.initiate_privacy_assessment(VARCHAR, VARCHAR, TEXT, TEXT[], TEXT[], VARCHAR, UUID) IS
'@name initiatePrivacyAssessment
@resultFieldName privacyAssessmentId
Initiate GDPR Article 35 Data Protection Impact Assessment';

COMMENT ON FUNCTION hr_public.establish_user_session(UUID, INET, VARCHAR) IS
'@name establishUserSession
@resultFieldName userSessionId
Establish a new user session with authentication';

-- Grant permissions for renamed functions
GRANT EXECUTE ON FUNCTION hr_public.report_data_breach(VARCHAR, VARCHAR, VARCHAR, TEXT[], INTEGER, TEXT, UUID) TO hr_admin, hr_super_admin;
GRANT EXECUTE ON FUNCTION hr_public.initiate_privacy_assessment(VARCHAR, VARCHAR, TEXT, TEXT[], TEXT[], VARCHAR, UUID) TO hr_admin, hr_super_admin;
GRANT EXECUTE ON FUNCTION hr_public.establish_user_session(UUID, INET, VARCHAR) TO hr_employee, hr_manager, hr_admin, hr_super_admin;