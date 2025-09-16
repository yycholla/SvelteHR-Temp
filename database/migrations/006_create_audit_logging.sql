-- Migration: Create Audit Logging and Security Enhancement
-- Created: 2025-09-15
-- Description: Comprehensive audit logging, security enhancements, and data protection

-- Create audit log table for security and compliance
CREATE TABLE hr_hidden.audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Event details
    table_name VARCHAR(255) NOT NULL,
    record_id UUID,
    operation VARCHAR(20) NOT NULL, -- INSERT, UPDATE, DELETE, SELECT, LOGIN, LOGOUT, etc.
    
    -- User context
    user_id UUID REFERENCES hr_public.users(id),
    user_role VARCHAR(100),
    session_id UUID,
    
    -- Request context
    ip_address INET,
    user_agent TEXT,
    request_path VARCHAR(500),
    request_method VARCHAR(10),
    
    -- Data changes
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    
    -- Event metadata
    event_timestamp TIMESTAMPTZ DEFAULT NOW(),
    severity VARCHAR(20) DEFAULT 'INFO', -- DEBUG, INFO, WARN, ERROR, CRITICAL
    category VARCHAR(50) DEFAULT 'DATA_CHANGE', -- DATA_CHANGE, AUTHENTICATION, AUTHORIZATION, SYSTEM
    description TEXT,
    
    -- Additional context
    source_function VARCHAR(255),
    error_message TEXT,
    metadata JSONB,
    
    -- Retention
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 years'),
    
    -- Constraints
    CONSTRAINT audit_log_operation_valid CHECK (
        operation IN ('INSERT', 'UPDATE', 'DELETE', 'SELECT', 'LOGIN', 'LOGOUT', 'FAILED_LOGIN', 
                     'PASSWORD_CHANGE', 'ROLE_CHANGE', 'PERMISSION_CHANGE', 'SYSTEM_ACCESS', 'DATA_EXPORT')
    ),
    CONSTRAINT audit_log_severity_valid CHECK (
        severity IN ('DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL')
    ),
    CONSTRAINT audit_log_category_valid CHECK (
        category IN ('DATA_CHANGE', 'AUTHENTICATION', 'AUTHORIZATION', 'SYSTEM', 'COMPLIANCE', 'SECURITY')
    )
);

-- Create sensitive data access log
CREATE TABLE hr_hidden.sensitive_data_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Access details
    user_id UUID NOT NULL REFERENCES hr_public.users(id),
    accessed_user_id UUID REFERENCES hr_public.users(id), -- whose data was accessed
    data_type VARCHAR(100) NOT NULL, -- 'SALARY', 'SSN', 'MEDICAL', 'PERFORMANCE', etc.
    table_name VARCHAR(255) NOT NULL,
    record_ids UUID[],
    
    -- Context
    access_reason VARCHAR(500), -- business justification
    ip_address INET,
    session_id UUID,
    
    -- Timing
    accessed_at TIMESTAMPTZ DEFAULT NOW(),
    access_duration INTERVAL,
    
    -- Approval (for highly sensitive data)
    approved_by UUID REFERENCES hr_public.users(id),
    approval_expires_at TIMESTAMPTZ,
    
    -- Metadata
    query_hash TEXT, -- hash of the query executed
    result_count INTEGER,
    metadata JSONB
);

-- Create data retention policies table
CREATE TABLE hr_hidden.data_retention_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Policy details
    table_name VARCHAR(255) NOT NULL,
    column_name VARCHAR(255),
    policy_name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Retention settings
    retention_period INTERVAL NOT NULL,
    deletion_method VARCHAR(50) DEFAULT 'HARD_DELETE', -- HARD_DELETE, SOFT_DELETE, ANONYMIZE, ARCHIVE
    
    -- Legal basis (GDPR compliance)
    legal_basis VARCHAR(100), -- 'CONTRACT', 'LEGAL_OBLIGATION', 'LEGITIMATE_INTEREST', etc.
    geographic_scope VARCHAR(100)[], -- ['US', 'EU', 'GLOBAL']
    
    -- Automation
    auto_delete_enabled BOOLEAN DEFAULT false,
    last_cleanup_run TIMESTAMPTZ,
    next_cleanup_run TIMESTAMPTZ,
    
    -- System
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES hr_public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default data retention policies
INSERT INTO hr_hidden.data_retention_policies (
    table_name, policy_name, description, retention_period, legal_basis, geographic_scope
) VALUES 
    ('hr_hidden.audit_log', 'Standard Audit Retention', 'Keep audit logs for compliance and security analysis', 
     INTERVAL '7 years', 'LEGAL_OBLIGATION', ARRAY['US', 'EU']),
    ('hr_hidden.sensitive_data_access', 'Sensitive Access Logs', 'Track access to sensitive employee data', 
     INTERVAL '3 years', 'LEGITIMATE_INTEREST', ARRAY['US', 'EU']),
    ('hr_public.auth_sessions', 'Session Data Retention', 'Session data for security analysis', 
     INTERVAL '1 year', 'LEGITIMATE_INTEREST', ARRAY['GLOBAL']),
    ('hr_public.users', 'Employee Data Retention', 'Retain employee data after termination', 
     INTERVAL '7 years', 'LEGAL_OBLIGATION', ARRAY['US']);

-- Create function to log sensitive data access
CREATE OR REPLACE FUNCTION hr_hidden.log_sensitive_access(
    p_user_id UUID,
    p_accessed_user_id UUID,
    p_data_type VARCHAR,
    p_table_name VARCHAR,
    p_record_ids UUID[],
    p_access_reason VARCHAR DEFAULT NULL,
    p_query_hash TEXT DEFAULT NULL,
    p_result_count INTEGER DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    log_id UUID;
    current_ip INET;
    current_session UUID;
BEGIN
    -- Get session context
    BEGIN
        current_ip := current_setting('request.headers.x-forwarded-for')::INET;
    EXCEPTION WHEN OTHERS THEN
        current_ip := current_setting('request.remote_addr', true)::INET;
    END;
    
    BEGIN
        current_session := current_setting('jwt.claims.session_id', true)::UUID;
    EXCEPTION WHEN OTHERS THEN
        current_session := NULL;
    END;
    
    -- Insert access log
    INSERT INTO hr_hidden.sensitive_data_access (
        user_id, accessed_user_id, data_type, table_name, record_ids,
        access_reason, ip_address, session_id, query_hash, result_count
    ) VALUES (
        p_user_id, p_accessed_user_id, p_data_type, p_table_name, p_record_ids,
        p_access_reason, current_ip, current_session, p_query_hash, p_result_count
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$;

-- Create function to log audit events
CREATE OR REPLACE FUNCTION hr_hidden.log_audit_event(
    p_table_name VARCHAR,
    p_record_id UUID,
    p_operation VARCHAR,
    p_user_id UUID DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_severity VARCHAR DEFAULT 'INFO',
    p_category VARCHAR DEFAULT 'DATA_CHANGE'
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    log_id UUID;
    current_user_id UUID;
    user_role VARCHAR;
    current_session UUID;
    current_ip INET;
    changed_fields TEXT[];
BEGIN
    -- Get current user context if not provided
    IF p_user_id IS NULL THEN
        BEGIN
            current_user_id := current_setting('jwt.claims.user_id', true)::UUID;
        EXCEPTION WHEN OTHERS THEN
            current_user_id := NULL;
        END;
    ELSE
        current_user_id := p_user_id;
    END IF;
    
    -- Get additional context
    BEGIN
        user_role := current_setting('jwt.claims.role', true);
    EXCEPTION WHEN OTHERS THEN
        user_role := NULL;
    END;
    
    BEGIN
        current_session := current_setting('jwt.claims.session_id', true)::UUID;
    EXCEPTION WHEN OTHERS THEN
        current_session := NULL;
    END;
    
    BEGIN
        current_ip := current_setting('request.headers.x-forwarded-for')::INET;
    EXCEPTION WHEN OTHERS THEN
        BEGIN
            current_ip := current_setting('request.remote_addr', true)::INET;
        EXCEPTION WHEN OTHERS THEN
            current_ip := NULL;
        END;
    END;
    
    -- Calculate changed fields for UPDATE operations
    IF p_operation = 'UPDATE' AND p_old_values IS NOT NULL AND p_new_values IS NOT NULL THEN
        SELECT ARRAY_AGG(key) INTO changed_fields
        FROM jsonb_each(p_old_values) old
        JOIN jsonb_each(p_new_values) new ON old.key = new.key
        WHERE old.value != new.value;
    END IF;
    
    -- Insert audit log entry
    INSERT INTO hr_hidden.audit_log (
        table_name, record_id, operation, user_id, user_role, session_id,
        ip_address, old_values, new_values, changed_fields, description,
        severity, category, source_function
    ) VALUES (
        p_table_name, p_record_id, p_operation, current_user_id, user_role, current_session,
        current_ip, p_old_values, p_new_values, changed_fields, p_description,
        p_severity, p_category, 'log_audit_event'
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$;

-- Create indexes for performance and security queries
CREATE INDEX idx_audit_log_user_time ON hr_hidden.audit_log(user_id, event_timestamp DESC);
CREATE INDEX idx_audit_log_table_operation ON hr_hidden.audit_log(table_name, operation);
CREATE INDEX idx_audit_log_severity_time ON hr_hidden.audit_log(severity, event_timestamp DESC) WHERE severity IN ('ERROR', 'CRITICAL');
CREATE INDEX idx_audit_log_ip_time ON hr_hidden.audit_log(ip_address, event_timestamp DESC);
CREATE INDEX idx_audit_log_expires ON hr_hidden.audit_log(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX idx_sensitive_access_user_time ON hr_hidden.sensitive_data_access(user_id, accessed_at DESC);
CREATE INDEX idx_sensitive_access_accessed_user ON hr_hidden.sensitive_data_access(accessed_user_id, accessed_at DESC);
CREATE INDEX idx_sensitive_access_data_type ON hr_hidden.sensitive_data_access(data_type, accessed_at DESC);
CREATE INDEX idx_sensitive_access_ip ON hr_hidden.sensitive_data_access(ip_address, accessed_at DESC);

CREATE INDEX idx_retention_policies_table ON hr_hidden.data_retention_policies(table_name, is_active) WHERE is_active = true;
CREATE INDEX idx_retention_policies_cleanup ON hr_hidden.data_retention_policies(next_cleanup_run) WHERE auto_delete_enabled = true;

-- Add comments for documentation
COMMENT ON TABLE hr_hidden.audit_log IS 
'Comprehensive audit log for security, compliance, and troubleshooting';

COMMENT ON TABLE hr_hidden.sensitive_data_access IS
'Track access to sensitive employee data for compliance and security monitoring';

COMMENT ON TABLE hr_hidden.data_retention_policies IS
'Data retention policies for compliance with privacy regulations';

COMMENT ON FUNCTION hr_hidden.log_audit_event(VARCHAR, UUID, VARCHAR, UUID, JSONB, JSONB, TEXT, VARCHAR, VARCHAR) IS
'Log audit events for security and compliance monitoring';

COMMENT ON FUNCTION hr_hidden.log_sensitive_access(UUID, UUID, VARCHAR, VARCHAR, UUID[], VARCHAR, TEXT, INTEGER) IS
'Log access to sensitive employee data with context and approval tracking';

-- Grant minimal necessary permissions (audit logs are write-only for most users)
GRANT EXECUTE ON FUNCTION hr_hidden.log_audit_event(VARCHAR, UUID, VARCHAR, UUID, JSONB, JSONB, TEXT, VARCHAR, VARCHAR) TO postgraphile_user;
GRANT EXECUTE ON FUNCTION hr_hidden.log_sensitive_access(UUID, UUID, VARCHAR, VARCHAR, UUID[], VARCHAR, TEXT, INTEGER) TO postgraphile_user;