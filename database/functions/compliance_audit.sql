-- Compliance & Audit Functions
-- Created: 2025-09-15
-- Description: Functions for GDPR compliance, audit logging, and data governance

-- Function to log all database operations for audit compliance
CREATE OR REPLACE FUNCTION hr_public.log_audit_event(
    p_action_type hr_public.audit_action_type,
    p_table_name VARCHAR(100),
    p_record_id UUID DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_changed_fields TEXT[] DEFAULT NULL,
    p_data_classification hr_public.data_classification DEFAULT 'INTERNAL',
    p_contains_pii BOOLEAN DEFAULT false,
    p_pii_fields TEXT[] DEFAULT NULL,
    p_requires_consent BOOLEAN DEFAULT false,
    p_consent_reference UUID DEFAULT NULL,
    p_legal_basis VARCHAR(100) DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    audit_id UUID;
    current_user_id UUID;
    current_session_id UUID;
    retention_days INTEGER := 1095; -- Default 3 years
BEGIN
    -- Get current user and session from JWT context
    BEGIN
        current_user_id := current_setting('session.user_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
        current_user_id := NULL;
    END;
    
    BEGIN
        current_session_id := current_setting('session.session_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
        current_session_id := NULL;
    END;
    
    -- Determine retention period based on data classification
    CASE p_data_classification
        WHEN 'PII', 'SENSITIVE_PII' THEN retention_days := 2555; -- 7 years for PII
        WHEN 'CONFIDENTIAL', 'RESTRICTED' THEN retention_days := 1825; -- 5 years for confidential
        ELSE retention_days := 1095; -- 3 years for others
    END CASE;
    
    -- Insert audit log entry
    INSERT INTO hr_public.audit_logs (
        action_type, table_name, record_id, user_id, session_id,
        old_values, new_values, changed_fields,
        data_classification, contains_pii, pii_fields,
        requires_consent, consent_reference, legal_basis,
        retention_date, created_at
    ) VALUES (
        p_action_type, p_table_name, p_record_id, current_user_id, current_session_id,
        p_old_values, p_new_values, p_changed_fields,
        p_data_classification, p_contains_pii, p_pii_fields,
        p_requires_consent, p_consent_reference, p_legal_basis,
        CURRENT_DATE + INTERVAL '1 day' * retention_days, NOW()
    ) RETURNING id INTO audit_id;
    
    -- Log high-risk activities to security events as well
    IF p_contains_pii OR p_data_classification IN ('CONFIDENTIAL', 'RESTRICTED', 'PII', 'SENSITIVE_PII') THEN
        PERFORM hr_public.log_security_event(
            'DATA_ACCESS'::hr_public.security_event_type,
            'data_governance',
            'Sensitive data accessed: ' || p_table_name,
            current_user_id,
            current_session_id,
            jsonb_build_object(
                'table_name', p_table_name,
                'record_id', p_record_id,
                'data_classification', p_data_classification,
                'contains_pii', p_contains_pii,
                'audit_id', audit_id
            ),
            NULL, -- IP address
            NULL, -- User agent
            CASE 
                WHEN p_data_classification = 'SENSITIVE_PII' THEN 70
                WHEN p_data_classification = 'PII' THEN 60
                WHEN p_data_classification = 'RESTRICTED' THEN 50
                ELSE 30
            END
        );
    END IF;
    
    RETURN audit_id;
END;
$$;

-- Function to process GDPR consent
CREATE OR REPLACE FUNCTION hr_public.record_user_consent(
    p_user_id UUID,
    p_consent_type VARCHAR(100),
    p_purpose TEXT,
    p_processing_categories TEXT[],
    p_consent_method VARCHAR(50) DEFAULT 'explicit',
    p_consent_evidence JSONB DEFAULT '{}',
    p_expires_at TIMESTAMPTZ DEFAULT NULL,
    p_third_party_sharing BOOLEAN DEFAULT false,
    p_third_parties JSONB DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    consent_id UUID;
    existing_consent RECORD;
BEGIN
    -- Check for existing active consent
    SELECT * INTO existing_consent
    FROM hr_public.consent_records
    WHERE user_id = p_user_id 
      AND consent_type = p_consent_type
      AND status = 'GIVEN'
      AND (expires_at IS NULL OR expires_at > NOW());
    
    -- If consent already exists and is valid, return existing ID
    IF existing_consent IS NOT NULL THEN
        RETURN existing_consent.id;
    END IF;
    
    -- Create new consent record
    INSERT INTO hr_public.consent_records (
        user_id, consent_type, purpose, processing_categories,
        status, given_at, expires_at, consent_method, consent_evidence,
        third_party_sharing, third_parties
    ) VALUES (
        p_user_id, p_consent_type, p_purpose, p_processing_categories,
        'GIVEN', NOW(), p_expires_at, p_consent_method, p_consent_evidence,
        p_third_party_sharing, p_third_parties
    ) RETURNING id INTO consent_id;
    
    -- Log the consent action
    PERFORM hr_public.log_audit_event(
        'CREATE'::hr_public.audit_action_type,
        'consent_records',
        consent_id,
        NULL,
        jsonb_build_object(
            'consent_type', p_consent_type,
            'purpose', p_purpose,
            'method', p_consent_method
        ),
        ARRAY['consent_type', 'purpose', 'status'],
        'PII'::hr_public.data_classification,
        true,
        ARRAY['user_id', 'consent_evidence'],
        false,
        consent_id,
        'Art 6.1.a - Consent'
    );
    
    RETURN consent_id;
END;
$$;

-- Function to withdraw GDPR consent
CREATE OR REPLACE FUNCTION hr_public.withdraw_user_consent(
    p_user_id UUID,
    p_consent_type VARCHAR(100),
    p_withdrawal_reason TEXT DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    consent_record RECORD;
    updated_rows INTEGER;
BEGIN
    -- Find active consent record
    SELECT * INTO consent_record
    FROM hr_public.consent_records
    WHERE user_id = p_user_id 
      AND consent_type = p_consent_type
      AND status = 'GIVEN';
    
    IF consent_record IS NULL THEN
        RETURN false; -- No active consent found
    END IF;
    
    -- Update consent status to withdrawn
    UPDATE hr_public.consent_records
    SET 
        status = 'WITHDRAWN',
        withdrawn_at = NOW(),
        withdrawal_reason = p_withdrawal_reason,
        updated_at = NOW()
    WHERE id = consent_record.id;
    
    GET DIAGNOSTICS updated_rows = ROW_COUNT;
    
    -- Log the withdrawal
    IF updated_rows > 0 THEN
        PERFORM hr_public.log_audit_event(
            'UPDATE'::hr_public.audit_action_type,
            'consent_records',
            consent_record.id,
            jsonb_build_object('status', 'GIVEN'),
            jsonb_build_object(
                'status', 'WITHDRAWN',
                'withdrawal_reason', p_withdrawal_reason
            ),
            ARRAY['status', 'withdrawn_at', 'withdrawal_reason'],
            'PII'::hr_public.data_classification,
            true,
            ARRAY['user_id'],
            false,
            consent_record.id,
            'Art 7.3 - Consent withdrawal'
        );
        
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$;

-- Function to create privacy request (GDPR/CCPA)
CREATE OR REPLACE FUNCTION hr_public.create_privacy_request(
    p_request_type hr_public.privacy_request_type,
    p_user_id UUID DEFAULT NULL,
    p_requester_email VARCHAR(255),
    p_requester_name VARCHAR(255) DEFAULT NULL,
    p_subject_matter TEXT DEFAULT NULL,
    p_specific_data_requested TEXT[] DEFAULT NULL,
    p_reason_for_request TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    request_id UUID;
    request_number VARCHAR(50);
    due_date DATE;
BEGIN
    -- Generate unique request number
    request_number := 'PR-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                     LPAD(EXTRACT(EPOCH FROM NOW())::TEXT, 10, '0');
    
    -- Calculate response due date (30 days for GDPR, varies by jurisdiction)
    due_date := CURRENT_DATE + INTERVAL '30 days';
    
    -- Create privacy request
    INSERT INTO hr_public.privacy_requests (
        request_number, request_type, user_id, requester_email, requester_name,
        subject_matter, specific_data_requested, reason_for_request,
        response_due_date, status
    ) VALUES (
        request_number, p_request_type, p_user_id, p_requester_email, p_requester_name,
        p_subject_matter, p_specific_data_requested, p_reason_for_request,
        due_date, 'SUBMITTED'
    ) RETURNING id INTO request_id;
    
    -- Log the privacy request creation
    PERFORM hr_public.log_audit_event(
        'CREATE'::hr_public.audit_action_type,
        'privacy_requests',
        request_id,
        NULL,
        jsonb_build_object(
            'request_type', p_request_type,
            'requester_email', p_requester_email,
            'request_number', request_number
        ),
        ARRAY['request_type', 'requester_email', 'status'],
        'PII'::hr_public.data_classification,
        true,
        ARRAY['user_id', 'requester_email', 'requester_name'],
        false,
        NULL,
        'Art 12-23 - Data subject rights'
    );
    
    -- Send notification to privacy team
    PERFORM hr_public.send_templated_notification(
        'privacy_request_created',
        (SELECT id FROM hr_public.users WHERE email = 'admin@postgraphile-hr.com'),
        jsonb_build_object(
            'request_number', request_number,
            'request_type', p_request_type,
            'requester_email', p_requester_email,
            'due_date', due_date
        ),
        'HIGH'::hr_public.notification_priority,
        ARRAY['EMAIL', 'IN_APP']::hr_public.notification_channel[]
    );
    
    RETURN request_id;
END;
$$;

-- Function to check data retention compliance
CREATE OR REPLACE FUNCTION hr_public.check_retention_compliance(
    p_table_name VARCHAR(100) DEFAULT NULL
) RETURNS TABLE(
    table_name VARCHAR(100),
    policy_name VARCHAR(100),
    records_due_for_deletion BIGINT,
    oldest_record_date DATE,
    compliance_status VARCHAR(50)
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    policy_record RECORD;
    compliance_query TEXT;
    record_count BIGINT;
    oldest_date DATE;
BEGIN
    -- Loop through active retention policies
    FOR policy_record IN 
        SELECT * FROM hr_public.data_retention_policies 
        WHERE is_active = true 
          AND (p_table_name IS NULL OR p_table_name = ANY(table_names))
    LOOP
        -- Check each table covered by this policy
        FOR i IN 1..array_length(policy_record.table_names, 1) LOOP
            -- Build dynamic query to check retention compliance
            compliance_query := format(
                'SELECT COUNT(*) as count, MIN(created_at::date) as oldest 
                 FROM hr_public.%I 
                 WHERE created_at < NOW() - INTERVAL ''%s days''',
                policy_record.table_names[i],
                policy_record.retention_period_days
            );
            
            -- Execute the query safely
            BEGIN
                EXECUTE compliance_query INTO record_count, oldest_date;
            EXCEPTION WHEN OTHERS THEN
                -- Table might not exist or have created_at column
                record_count := 0;
                oldest_date := NULL;
            END;
            
            -- Return results
            RETURN QUERY SELECT 
                policy_record.table_names[i],
                policy_record.policy_name,
                record_count,
                oldest_date,
                CASE 
                    WHEN record_count = 0 THEN 'COMPLIANT'
                    WHEN record_count > 0 AND policy_record.auto_delete THEN 'ACTION_REQUIRED'
                    WHEN record_count > 0 AND policy_record.require_manual_review THEN 'MANUAL_REVIEW'
                    ELSE 'NON_COMPLIANT'
                END::VARCHAR(50);
        END LOOP;
    END LOOP;
END;
$$;

-- Function to anonymize PII data
CREATE OR REPLACE FUNCTION hr_public.anonymize_user_data(
    p_user_id UUID,
    p_anonymization_reason VARCHAR(200) DEFAULT 'Data retention policy',
    p_keep_aggregation_data BOOLEAN DEFAULT true
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    anonymization_suffix TEXT;
    old_values JSONB;
    new_values JSONB;
BEGIN
    -- Generate anonymization suffix
    anonymization_suffix := '_ANON_' || EXTRACT(EPOCH FROM NOW())::BIGINT;
    
    -- Store original values for audit
    SELECT jsonb_build_object(
        'email', email,
        'first_name', first_name,
        'last_name', last_name,
        'phone_number', phone_number
    ) INTO old_values
    FROM hr_public.users 
    WHERE id = p_user_id;
    
    -- Anonymize user personal data
    UPDATE hr_public.users
    SET 
        email = 'anonymized' || anonymization_suffix || '@example.com',
        first_name = 'Anonymized',
        last_name = 'User',
        phone_number = NULL,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Anonymize employee data if exists
    UPDATE hr_public.employees
    SET
        personal_email = NULL,
        emergency_contact_name = 'Anonymized Contact',
        emergency_contact_phone = NULL,
        emergency_contact_relationship = 'Unknown',
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Store new values for audit
    SELECT jsonb_build_object(
        'email', email,
        'first_name', first_name,
        'last_name', last_name,
        'phone_number', phone_number
    ) INTO new_values
    FROM hr_public.users 
    WHERE id = p_user_id;
    
    -- Log the anonymization
    PERFORM hr_public.log_audit_event(
        'DATA_ANONYMIZATION'::hr_public.audit_action_type,
        'users',
        p_user_id,
        old_values,
        new_values,
        ARRAY['email', 'first_name', 'last_name', 'phone_number'],
        'PII'::hr_public.data_classification,
        true,
        ARRAY['email', 'first_name', 'last_name', 'phone_number'],
        false,
        NULL,
        p_anonymization_reason
    );
    
    RETURN true;
EXCEPTION WHEN OTHERS THEN
    -- Log the error
    PERFORM hr_public.log_security_event(
        'DATA_ACCESS'::hr_public.security_event_type,
        'data_governance',
        'Failed to anonymize user data: ' || SQLERRM,
        p_user_id,
        NULL,
        jsonb_build_object(
            'error', SQLERRM,
            'reason', p_anonymization_reason
        ),
        NULL,
        NULL,
        80
    );
    
    RETURN false;
END;
$$;

-- Add PostGraphile comments
COMMENT ON FUNCTION hr_public.log_audit_event(hr_public.audit_action_type, VARCHAR, UUID, JSONB, JSONB, TEXT[], hr_public.data_classification, BOOLEAN, TEXT[], BOOLEAN, UUID, VARCHAR) IS
'@name logAuditEvent
@resultFieldName auditId
Log comprehensive audit events for compliance and data governance';

COMMENT ON FUNCTION hr_public.record_user_consent(UUID, VARCHAR, TEXT, TEXT[], VARCHAR, JSONB, TIMESTAMPTZ, BOOLEAN, JSONB) IS
'@name recordUserConsent
@resultFieldName consentId
Record GDPR consent with full compliance tracking';

COMMENT ON FUNCTION hr_public.withdraw_user_consent(UUID, VARCHAR, TEXT) IS
'@name withdrawUserConsent
Withdraw GDPR consent with audit trail';

COMMENT ON FUNCTION hr_public.create_privacy_request(hr_public.privacy_request_type, UUID, VARCHAR, VARCHAR, TEXT, TEXT[], TEXT) IS
'@name createPrivacyRequest
@resultFieldName requestId
Create GDPR/CCPA privacy request with automated workflow';

COMMENT ON FUNCTION hr_public.check_retention_compliance(VARCHAR) IS
'@name checkRetentionCompliance
Check data retention compliance across all policies';

COMMENT ON FUNCTION hr_public.anonymize_user_data(UUID, VARCHAR, BOOLEAN) IS
'@name anonymizeUserData
Anonymize user PII data for compliance with retention policies';

-- Grant permissions
GRANT EXECUTE ON FUNCTION hr_public.log_audit_event(hr_public.audit_action_type, VARCHAR, UUID, JSONB, JSONB, TEXT[], hr_public.data_classification, BOOLEAN, TEXT[], BOOLEAN, UUID, VARCHAR) TO hr_employee, hr_manager, hr_admin, hr_super_admin;

GRANT EXECUTE ON FUNCTION hr_public.record_user_consent(UUID, VARCHAR, TEXT, TEXT[], VARCHAR, JSONB, TIMESTAMPTZ, BOOLEAN, JSONB) TO hr_employee, hr_manager, hr_admin, hr_super_admin;

GRANT EXECUTE ON FUNCTION hr_public.withdraw_user_consent(UUID, VARCHAR, TEXT) TO hr_employee, hr_manager, hr_admin, hr_super_admin;

GRANT EXECUTE ON FUNCTION hr_public.create_privacy_request(hr_public.privacy_request_type, UUID, VARCHAR, VARCHAR, TEXT, TEXT[], TEXT) TO hr_employee, hr_manager, hr_admin, hr_super_admin;

GRANT EXECUTE ON FUNCTION hr_public.check_retention_compliance(VARCHAR) TO hr_admin, hr_super_admin;

GRANT EXECUTE ON FUNCTION hr_public.anonymize_user_data(UUID, VARCHAR, BOOLEAN) TO hr_super_admin;