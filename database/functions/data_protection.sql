-- Data Protection & Privacy Functions
-- Created: 2025-09-15
-- Description: Functions for data protection, privacy controls, and GDPR compliance

-- Function to track data lineage automatically
CREATE OR REPLACE FUNCTION hr_public.track_data_lineage(
    p_source_table VARCHAR(100),
    p_source_record_id UUID,
    p_action hr_public.data_lineage_action,
    p_target_table VARCHAR(100) DEFAULT NULL,
    p_target_record_id UUID DEFAULT NULL,
    p_transformation_type VARCHAR(100) DEFAULT NULL,
    p_transformation_details JSONB DEFAULT '{}',
    p_compliance_requirement VARCHAR(200) DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    lineage_id UUID;
    current_user_id UUID;
    current_session_id UUID;
    audit_id UUID;
BEGIN
    -- Get current user and session context
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
    
    -- Create audit log entry first
    audit_id := hr_public.log_audit_event(
        p_action::hr_public.audit_action_type,
        p_source_table,
        p_source_record_id,
        NULL,
        NULL,
        NULL,
        'INTERNAL'::hr_public.data_classification,
        false,
        NULL,
        false,
        NULL,
        COALESCE(p_compliance_requirement, 'Data lineage tracking')
    );
    
    -- Insert lineage record
    INSERT INTO hr_public.data_lineage (
        source_table, source_record_id, target_table, target_record_id,
        action, transformation_type, transformation_details,
        performed_by_user_id, performed_by_session_id,
        compliance_requirement, audit_reference
    ) VALUES (
        p_source_table, p_source_record_id, p_target_table, p_target_record_id,
        p_action, p_transformation_type, p_transformation_details,
        current_user_id, current_session_id,
        p_compliance_requirement, audit_id
    ) RETURNING id INTO lineage_id;
    
    RETURN lineage_id;
END;
$$;

-- Function to create data protection metadata
CREATE OR REPLACE FUNCTION hr_public.create_data_protection_metadata(
    p_table_name VARCHAR(100),
    p_record_id UUID,
    p_data_classification hr_public.data_classification,
    p_column_name VARCHAR(100) DEFAULT NULL,
    p_sensitivity_score INTEGER DEFAULT 0,
    p_encryption_status hr_public.encryption_status DEFAULT 'UNENCRYPTED',
    p_consent_required BOOLEAN DEFAULT false,
    p_legal_basis_reference VARCHAR(200) DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    metadata_id UUID;
    retention_policy_id UUID;
BEGIN
    -- Find applicable retention policy
    SELECT id INTO retention_policy_id
    FROM hr_public.data_retention_policies
    WHERE p_table_name = ANY(table_names)
      AND is_active = true
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Insert data protection metadata
    INSERT INTO hr_public.data_protection_metadata (
        table_name, column_name, record_id,
        encryption_status, data_classification, sensitivity_score,
        consent_required, legal_basis_reference, retention_policy_id,
        scheduled_deletion_date
    ) VALUES (
        p_table_name, p_column_name, p_record_id,
        p_encryption_status, p_data_classification, p_sensitivity_score,
        p_consent_required, p_legal_basis_reference, retention_policy_id,
        CASE 
            WHEN retention_policy_id IS NOT NULL THEN 
                CURRENT_DATE + INTERVAL '1 day' * (
                    SELECT retention_period_days 
                    FROM hr_public.data_retention_policies 
                    WHERE id = retention_policy_id
                )
            ELSE NULL
        END
    ) RETURNING id INTO metadata_id;
    
    -- Track lineage
    PERFORM hr_public.track_data_lineage(
        p_table_name,
        p_record_id,
        'CREATED'::hr_public.data_lineage_action,
        NULL,
        NULL,
        'data_classification',
        jsonb_build_object(
            'classification', p_data_classification,
            'sensitivity_score', p_sensitivity_score,
            'consent_required', p_consent_required
        ),
        'Data protection metadata creation'
    );
    
    RETURN metadata_id;
END;
$$;

-- Function to process erasure request (Right to be forgotten)
CREATE OR REPLACE FUNCTION hr_public.process_erasure_request(
    p_user_id UUID,
    p_erasure_scope JSONB,
    p_partial_erasure BOOLEAN DEFAULT false,
    p_retain_aggregated_data BOOLEAN DEFAULT false,
    p_legal_exemptions TEXT[] DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    erasure_id UUID;
    privacy_request_id UUID;
    request_number VARCHAR(50);
BEGIN
    -- Generate request number
    request_number := 'ER-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                     LPAD(EXTRACT(EPOCH FROM NOW())::TEXT, 10, '0');
    
    -- Create privacy request first
    INSERT INTO hr_public.privacy_requests (
        request_number, request_type, user_id, 
        requester_email, requester_name,
        subject_matter, reason_for_request,
        response_due_date, status
    ) VALUES (
        request_number, 'ERASURE', p_user_id,
        (SELECT email FROM hr_public.users WHERE id = p_user_id),
        (SELECT first_name || ' ' || last_name FROM hr_public.users WHERE id = p_user_id),
        'Right to erasure (right to be forgotten) request',
        'GDPR Article 17 - Right to erasure',
        CURRENT_DATE + INTERVAL '30 days',
        'SUBMITTED'
    ) RETURNING id INTO privacy_request_id;
    
    -- Create erasure request
    INSERT INTO hr_public.erasure_requests (
        privacy_request_id, user_id, erasure_scope,
        partial_erasure, retain_aggregated_data,
        legal_exemptions_claimed
    ) VALUES (
        privacy_request_id, p_user_id, p_erasure_scope,
        p_partial_erasure, p_retain_aggregated_data,
        p_legal_exemptions
    ) RETURNING id INTO erasure_id;
    
    -- Log the request
    PERFORM hr_public.log_audit_event(
        'CREATE'::hr_public.audit_action_type,
        'erasure_requests',
        erasure_id,
        NULL,
        jsonb_build_object(
            'user_id', p_user_id,
            'privacy_request_id', privacy_request_id,
            'partial_erasure', p_partial_erasure
        ),
        ARRAY['user_id', 'erasure_scope', 'status'],
        'PII'::hr_public.data_classification,
        true,
        ARRAY['user_id', 'erasure_scope'],
        false,
        NULL,
        'GDPR Article 17 - Right to erasure processing'
    );
    
    -- Send notification to privacy team
    PERFORM hr_public.send_templated_notification(
        'erasure_request_created',
        (SELECT id FROM hr_public.users WHERE email = 'admin@postgraphile-hr.com'),
        jsonb_build_object(
            'request_number', request_number,
            'user_name', (SELECT first_name || ' ' || last_name FROM hr_public.users WHERE id = p_user_id),
            'user_email', (SELECT email FROM hr_public.users WHERE id = p_user_id),
            'partial_erasure', p_partial_erasure
        ),
        'HIGH'::hr_public.notification_priority,
        ARRAY['EMAIL', 'IN_APP']::hr_public.notification_channel[]
    );
    
    RETURN erasure_id;
END;
$$;

-- Function to create data breach incident
CREATE OR REPLACE FUNCTION hr_public.create_data_breach_incident(
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
    
    -- Log high-severity security event
    PERFORM hr_public.log_security_event(
        'DATA_ACCESS'::hr_public.security_event_type,
        'data_breach',
        'Data breach incident reported: ' || p_incident_title,
        current_user_id,
        NULL,
        jsonb_build_object(
            'incident_id', incident_id,
            'incident_number', incident_number,
            'severity', p_severity,
            'estimated_affected_records', p_estimated_affected_records,
            'regulatory_notification_required', notification_required
        ),
        NULL,
        NULL,
        CASE p_severity
            WHEN 'CRITICAL' THEN 95
            WHEN 'HIGH' THEN 85
            WHEN 'MEDIUM' THEN 70
            ELSE 50
        END
    );
    
    -- Send immediate notifications for high-severity incidents
    IF p_severity IN ('HIGH', 'CRITICAL') THEN
        PERFORM hr_public.send_templated_notification(
            'data_breach_alert',
            (SELECT id FROM hr_public.users WHERE email = 'admin@postgraphile-hr.com'),
            jsonb_build_object(
                'incident_number', incident_number,
                'severity', p_severity,
                'estimated_affected_records', p_estimated_affected_records,
                'regulatory_notification_required', notification_required
            ),
            'URGENT'::hr_public.notification_priority,
            ARRAY['EMAIL', 'IN_APP', 'SMS']::hr_public.notification_channel[]
        );
    END IF;
    
    RETURN incident_id;
END;
$$;

-- Function to create privacy impact assessment
CREATE OR REPLACE FUNCTION hr_public.create_privacy_impact_assessment(
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
    
    -- Log the assessment creation
    PERFORM hr_public.log_audit_event(
        'CREATE'::hr_public.audit_action_type,
        'privacy_impact_assessments',
        assessment_id,
        NULL,
        jsonb_build_object(
            'assessment_reference', assessment_reference,
            'project_name', p_project_name,
            'conducted_by', current_user_id
        ),
        ARRAY['assessment_title', 'project_name', 'status'],
        'CONFIDENTIAL'::hr_public.data_classification,
        false,
        NULL,
        false,
        NULL,
        'GDPR Article 35 - Data Protection Impact Assessment'
    );
    
    RETURN assessment_id;
END;
$$;

-- Function to check privacy compliance status
CREATE OR REPLACE FUNCTION hr_public.check_privacy_compliance_status(
    p_table_name VARCHAR(100) DEFAULT NULL
) RETURNS TABLE(
    table_name VARCHAR(100),
    total_records BIGINT,
    records_with_metadata BIGINT,
    records_missing_consent BIGINT,
    records_overdue_deletion BIGINT,
    compliance_score INTEGER
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    table_record RECORD;
    total_count BIGINT;
    metadata_count BIGINT;
    consent_missing_count BIGINT;
    overdue_deletion_count BIGINT;
    score INTEGER;
BEGIN
    -- Get list of tables to check
    FOR table_record IN 
        SELECT t.table_name
        FROM information_schema.tables t
        WHERE t.table_schema = 'hr_public'
          AND t.table_type = 'BASE TABLE'
          AND (p_table_name IS NULL OR t.table_name = p_table_name)
          AND EXISTS (
              SELECT 1 FROM information_schema.columns c
              WHERE c.table_schema = 'hr_public'
                AND c.table_name = t.table_name
                AND c.column_name = 'id'
          )
    LOOP
        -- Count total records
        EXECUTE format('SELECT COUNT(*) FROM hr_public.%I', table_record.table_name)
        INTO total_count;
        
        -- Count records with protection metadata
        SELECT COUNT(*) INTO metadata_count
        FROM hr_public.data_protection_metadata
        WHERE table_name = table_record.table_name;
        
        -- Count records missing required consent
        SELECT COUNT(*) INTO consent_missing_count
        FROM hr_public.data_protection_metadata
        WHERE table_name = table_record.table_name
          AND consent_required = true
          AND (consent_record_id IS NULL OR 
               NOT EXISTS (
                   SELECT 1 FROM hr_public.consent_records
                   WHERE id = consent_record_id AND status = 'GIVEN'
               ));
        
        -- Count records overdue for deletion
        SELECT COUNT(*) INTO overdue_deletion_count
        FROM hr_public.data_protection_metadata
        WHERE table_name = table_record.table_name
          AND scheduled_deletion_date < CURRENT_DATE;
        
        -- Calculate compliance score (0-100)
        IF total_count = 0 THEN
            score := 100;
        ELSE
            score := GREATEST(0, LEAST(100, 
                (100 * (total_count - consent_missing_count - overdue_deletion_count)) / total_count
            ));
        END IF;
        
        -- Return results
        RETURN QUERY SELECT 
            table_record.table_name,
            total_count,
            metadata_count,
            consent_missing_count,
            overdue_deletion_count,
            score;
    END LOOP;
END;
$$;

-- Create sequence for assessment references
CREATE SEQUENCE IF NOT EXISTS hr_hidden.assessment_sequence START 1;

-- Add PostGraphile comments
COMMENT ON FUNCTION hr_public.track_data_lineage(VARCHAR, UUID, hr_public.data_lineage_action, VARCHAR, UUID, VARCHAR, JSONB, VARCHAR) IS
'@name trackDataLineage
@resultFieldName lineageId
Track data lineage for governance and compliance';

COMMENT ON FUNCTION hr_public.create_data_protection_metadata(VARCHAR, UUID, hr_public.data_classification, VARCHAR, INTEGER, hr_public.encryption_status, BOOLEAN, VARCHAR) IS
'@name createDataProtectionMetadata
@resultFieldName metadataId
Create comprehensive data protection metadata';

COMMENT ON FUNCTION hr_public.process_erasure_request(UUID, JSONB, BOOLEAN, BOOLEAN, TEXT[]) IS
'@name processErasureRequest
@resultFieldName erasureRequestId
Process GDPR Article 17 right to erasure request';

COMMENT ON FUNCTION hr_public.create_data_breach_incident(VARCHAR, VARCHAR, VARCHAR, TEXT[], INTEGER, TEXT, UUID) IS
'@name createDataBreachIncident
@resultFieldName incidentId
Create and manage data breach incidents';

COMMENT ON FUNCTION hr_public.create_privacy_impact_assessment(VARCHAR, VARCHAR, TEXT, TEXT[], TEXT[], VARCHAR, UUID) IS
'@name createPrivacyImpactAssessment
@resultFieldName assessmentId
Create GDPR Article 35 Data Protection Impact Assessment';

COMMENT ON FUNCTION hr_public.check_privacy_compliance_status(VARCHAR) IS
'@name checkPrivacyComplianceStatus
Check privacy compliance status across tables';

-- Grant permissions
GRANT EXECUTE ON FUNCTION hr_public.track_data_lineage(VARCHAR, UUID, hr_public.data_lineage_action, VARCHAR, UUID, VARCHAR, JSONB, VARCHAR) TO hr_employee, hr_manager, hr_admin, hr_super_admin;

GRANT EXECUTE ON FUNCTION hr_public.create_data_protection_metadata(VARCHAR, UUID, hr_public.data_classification, VARCHAR, INTEGER, hr_public.encryption_status, BOOLEAN, VARCHAR) TO hr_admin, hr_super_admin;

GRANT EXECUTE ON FUNCTION hr_public.process_erasure_request(UUID, JSONB, BOOLEAN, BOOLEAN, TEXT[]) TO hr_admin, hr_super_admin;

GRANT EXECUTE ON FUNCTION hr_public.create_data_breach_incident(VARCHAR, VARCHAR, VARCHAR, TEXT[], INTEGER, TEXT, UUID) TO hr_admin, hr_super_admin;

GRANT EXECUTE ON FUNCTION hr_public.create_privacy_impact_assessment(VARCHAR, VARCHAR, TEXT, TEXT[], TEXT[], VARCHAR, UUID) TO hr_admin, hr_super_admin;

GRANT EXECUTE ON FUNCTION hr_public.check_privacy_compliance_status(VARCHAR) TO hr_admin, hr_super_admin;