-- Migration: Compliance & Audit System
-- Created: 2025-09-15
-- Description: GDPR/CCPA compliance framework with comprehensive audit logging and data governance

-- Create ENUM types for compliance framework
CREATE TYPE hr_public.audit_action_type AS ENUM (
    'CREATE',
    'READ', 
    'UPDATE',
    'DELETE',
    'EXPORT',
    'IMPORT',
    'LOGIN',
    'LOGOUT',
    'PERMISSION_CHANGE',
    'BULK_OPERATION',
    'DATA_RETENTION',
    'DATA_ANONYMIZATION'
);

CREATE TYPE hr_public.data_classification AS ENUM (
    'PUBLIC',
    'INTERNAL',
    'CONFIDENTIAL',
    'RESTRICTED',
    'PII',
    'SENSITIVE_PII'
);

CREATE TYPE hr_public.retention_status AS ENUM (
    'ACTIVE',
    'PENDING_DELETION',
    'ANONYMIZED',
    'DELETED',
    'ARCHIVED'
);

CREATE TYPE hr_public.consent_status AS ENUM (
    'GIVEN',
    'WITHDRAWN',
    'PENDING',
    'EXPIRED',
    'NOT_REQUIRED'
);

CREATE TYPE hr_public.privacy_request_type AS ENUM (
    'ACCESS',           -- GDPR Article 15
    'RECTIFICATION',    -- GDPR Article 16
    'ERASURE',         -- GDPR Article 17 (Right to be forgotten)
    'RESTRICTION',     -- GDPR Article 18
    'PORTABILITY',     -- GDPR Article 20
    'OBJECTION',       -- GDPR Article 21
    'AUTOMATED_DECISION_OPT_OUT' -- GDPR Article 22
);

-- Comprehensive audit log for all system activities
CREATE TABLE hr_public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Core audit information
    action_type hr_public.audit_action_type NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID,
    
    -- User context
    user_id UUID REFERENCES hr_public.users(id),
    session_id UUID REFERENCES hr_public.user_sessions(id),
    
    -- Data changes
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    
    -- Request context
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(100),
    api_endpoint VARCHAR(200),
    http_method VARCHAR(10),
    
    -- System context
    application_name VARCHAR(100) DEFAULT 'SvelteHR',
    environment VARCHAR(50) DEFAULT 'production',
    
    -- Data classification and sensitivity
    data_classification hr_public.data_classification DEFAULT 'INTERNAL',
    contains_pii BOOLEAN DEFAULT false,
    pii_fields TEXT[], -- Specific PII fields accessed/modified
    
    -- Compliance flags
    requires_consent BOOLEAN DEFAULT false,
    consent_reference UUID,
    legal_basis VARCHAR(100), -- GDPR legal basis (Art 6.1.a-f)
    
    -- Retention and lifecycle
    retention_date DATE, -- When this audit record should be deleted
    is_archived BOOLEAN DEFAULT false,
    archive_date DATE,
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT audit_pii_logic CHECK (
        (contains_pii = true AND pii_fields IS NOT NULL AND array_length(pii_fields, 1) > 0) OR
        (contains_pii = false)
    ),
    CONSTRAINT consent_logic CHECK (
        (requires_consent = true AND consent_reference IS NOT NULL) OR
        (requires_consent = false)
    )
);

-- Data retention policies
CREATE TABLE hr_public.data_retention_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Policy identification
    policy_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    
    -- Scope definition
    table_names TEXT[] NOT NULL,
    data_types hr_public.data_classification[] DEFAULT ARRAY['INTERNAL']::hr_public.data_classification[],
    
    -- Retention rules
    retention_period_days INTEGER NOT NULL,
    grace_period_days INTEGER DEFAULT 30,
    
    -- Legal requirements
    legal_basis VARCHAR(200),
    jurisdiction VARCHAR(100) DEFAULT 'EU-GDPR',
    regulatory_requirement TEXT,
    
    -- Actions after retention period
    auto_delete BOOLEAN DEFAULT false,
    auto_anonymize BOOLEAN DEFAULT false,
    require_manual_review BOOLEAN DEFAULT true,
    
    -- Exceptions and conditions
    exception_conditions JSONB,
    business_justification TEXT,
    
    -- Lifecycle
    created_by UUID NOT NULL REFERENCES hr_public.users(id),
    approved_by UUID REFERENCES hr_public.users(id),
    approved_at TIMESTAMPTZ,
    next_review_date DATE,
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT retention_period_valid CHECK (retention_period_days > 0),
    CONSTRAINT grace_period_valid CHECK (grace_period_days >= 0),
    CONSTRAINT action_logic CHECK (
        auto_delete = true OR auto_anonymize = true OR require_manual_review = true
    ),
    CONSTRAINT approval_logic CHECK (
        (is_active = true AND approved_by IS NOT NULL AND approved_at IS NOT NULL) OR
        (is_active = false)
    )
);

-- Data subject consent management
CREATE TABLE hr_public.consent_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Data subject information
    user_id UUID NOT NULL REFERENCES hr_public.users(id),
    
    -- Consent details
    consent_type VARCHAR(100) NOT NULL, -- 'data_processing', 'marketing', 'analytics', etc.
    purpose TEXT NOT NULL,
    processing_categories TEXT[],
    
    -- Consent status
    status hr_public.consent_status NOT NULL DEFAULT 'PENDING',
    given_at TIMESTAMPTZ,
    withdrawn_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    
    -- Legal basis and documentation
    legal_basis VARCHAR(100) DEFAULT 'Art 6.1.a', -- GDPR Article reference
    consent_method VARCHAR(50), -- 'explicit', 'opt_in', 'contract', etc.
    consent_evidence JSONB, -- Form data, IP, timestamp, etc.
    
    -- Data sharing and third parties
    third_party_sharing BOOLEAN DEFAULT false,
    third_parties JSONB, -- List of third parties data is shared with
    international_transfer BOOLEAN DEFAULT false,
    transfer_safeguards TEXT,
    
    -- Consent management
    consent_version VARCHAR(20) DEFAULT '1.0',
    previous_consent_id UUID REFERENCES hr_public.consent_records(id),
    withdrawal_reason TEXT,
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicate active consents
    CONSTRAINT consent_unique UNIQUE(user_id, consent_type, consent_version),
    
    -- Status logic constraints
    CONSTRAINT given_logic CHECK (
        (status = 'GIVEN' AND given_at IS NOT NULL) OR
        (status != 'GIVEN')
    ),
    CONSTRAINT withdrawn_logic CHECK (
        (status = 'WITHDRAWN' AND withdrawn_at IS NOT NULL) OR
        (status != 'WITHDRAWN')
    ),
    CONSTRAINT third_party_logic CHECK (
        (third_party_sharing = true AND third_parties IS NOT NULL) OR
        (third_party_sharing = false)
    )
);

-- Privacy request management (GDPR/CCPA requests)
CREATE TABLE hr_public.privacy_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Request identification
    request_number VARCHAR(50) UNIQUE NOT NULL,
    request_type hr_public.privacy_request_type NOT NULL,
    
    -- Data subject information
    user_id UUID REFERENCES hr_public.users(id),
    requester_email VARCHAR(255) NOT NULL,
    requester_name VARCHAR(255),
    
    -- Request details
    subject_matter TEXT,
    specific_data_requested TEXT[],
    reason_for_request TEXT,
    
    -- Verification and identity
    identity_verified BOOLEAN DEFAULT false,
    identity_verification_method VARCHAR(100),
    verification_documents JSONB,
    verified_by UUID REFERENCES hr_public.users(id),
    verified_at TIMESTAMPTZ,
    
    -- Processing status
    status VARCHAR(50) DEFAULT 'SUBMITTED',
    assigned_to UUID REFERENCES hr_public.users(id),
    priority VARCHAR(20) DEFAULT 'MEDIUM',
    
    -- Response and completion
    response_due_date DATE NOT NULL,
    completed_at TIMESTAMPTZ,
    response_data JSONB,
    response_format VARCHAR(50), -- 'PDF', 'JSON', 'CSV', etc.
    
    -- Communication trail
    communication_log JSONB DEFAULT '[]',
    notes TEXT,
    
    -- Legal and compliance
    legal_basis_for_processing TEXT,
    exemptions_claimed TEXT[],
    escalation_required BOOLEAN DEFAULT false,
    external_legal_review BOOLEAN DEFAULT false,
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT request_due_date_valid CHECK (response_due_date >= CURRENT_DATE),
    CONSTRAINT identity_verification_logic CHECK (
        (identity_verified = true AND verified_by IS NOT NULL AND verified_at IS NOT NULL) OR
        (identity_verified = false)
    )
);

-- Data processing activities register (GDPR Article 30)
CREATE TABLE hr_public.processing_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Activity identification
    activity_name VARCHAR(200) NOT NULL,
    activity_description TEXT,
    activity_category VARCHAR(100),
    
    -- Controller and processor information
    data_controller VARCHAR(200) NOT NULL,
    data_processor VARCHAR(200),
    joint_controllers JSONB,
    
    -- Legal basis and purpose
    legal_basis VARCHAR(100) NOT NULL,
    purpose_of_processing TEXT NOT NULL,
    legitimate_interests TEXT,
    
    -- Data categories
    data_subject_categories TEXT[], -- 'employees', 'customers', 'vendors', etc.
    personal_data_categories TEXT[], -- 'contact_info', 'financial', 'biometric', etc.
    special_category_data TEXT[], -- GDPR Article 9 special categories
    
    -- Data sharing and transfers
    recipient_categories TEXT[],
    third_country_transfers BOOLEAN DEFAULT false,
    transfer_countries VARCHAR(100)[],
    transfer_safeguards TEXT,
    
    -- Retention and deletion
    retention_period VARCHAR(200),
    deletion_procedures TEXT,
    
    -- Security measures
    technical_measures TEXT,
    organizational_measures TEXT,
    
    -- Data subject rights
    data_subject_rights TEXT[],
    
    -- Review and approval
    reviewed_by UUID REFERENCES hr_public.users(id),
    reviewed_at TIMESTAMPTZ,
    next_review_date DATE,
    approved_by UUID REFERENCES hr_public.users(id),
    approved_at TIMESTAMPTZ,
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT special_category_logic CHECK (
        (special_category_data IS NULL OR array_length(special_category_data, 1) = 0) OR
        (special_category_data IS NOT NULL AND array_length(special_category_data, 1) > 0 AND legitimate_interests IS NOT NULL)
    ),
    CONSTRAINT transfer_logic CHECK (
        (third_country_transfers = true AND transfer_countries IS NOT NULL) OR
        (third_country_transfers = false)
    )
);

-- Create indexes for performance
CREATE INDEX idx_audit_logs_user_action ON hr_public.audit_logs(user_id, action_type, created_at DESC);
CREATE INDEX idx_audit_logs_table_record ON hr_public.audit_logs(table_name, record_id, created_at DESC);
CREATE INDEX idx_audit_logs_pii ON hr_public.audit_logs(contains_pii, created_at DESC) WHERE contains_pii = true;
CREATE INDEX idx_audit_logs_retention ON hr_public.audit_logs(retention_date) WHERE retention_date IS NOT NULL;
CREATE INDEX idx_audit_logs_session ON hr_public.audit_logs(session_id, created_at DESC);

CREATE INDEX idx_data_retention_policies_active ON hr_public.data_retention_policies(policy_name) WHERE is_active = true;
CREATE INDEX idx_data_retention_policies_review ON hr_public.data_retention_policies(next_review_date);

CREATE INDEX idx_consent_records_user_type ON hr_public.consent_records(user_id, consent_type, status);
CREATE INDEX idx_consent_records_expires ON hr_public.consent_records(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_consent_records_status ON hr_public.consent_records(status, created_at DESC);

CREATE INDEX idx_privacy_requests_user ON hr_public.privacy_requests(user_id, status);
CREATE INDEX idx_privacy_requests_status ON hr_public.privacy_requests(status, response_due_date);
CREATE INDEX idx_privacy_requests_assigned ON hr_public.privacy_requests(assigned_to, status);
CREATE INDEX idx_privacy_requests_due ON hr_public.privacy_requests(response_due_date) WHERE status != 'COMPLETED';

CREATE INDEX idx_processing_activities_category ON hr_public.processing_activities(activity_category, created_at DESC);
CREATE INDEX idx_processing_activities_review ON hr_public.processing_activities(next_review_date);

-- Insert default data retention policies
INSERT INTO hr_public.data_retention_policies (
    policy_name, description, table_names, retention_period_days,
    legal_basis, auto_anonymize, created_by, approved_by, approved_at
) VALUES 
(
    'employee_data_retention',
    'Standard employee data retention policy following labor law requirements',
    ARRAY['users', 'employees', 'employee_contracts', 'performance_reviews'],
    2555, -- 7 years
    'Legal obligation - Labor law record keeping requirements',
    true,
    (SELECT id FROM hr_public.users WHERE email = 'admin@postgraphile-hr.com'),
    (SELECT id FROM hr_public.users WHERE email = 'admin@postgraphile-hr.com'),
    NOW()
),
(
    'audit_log_retention',
    'Audit log retention for compliance and security monitoring',
    ARRAY['audit_logs', 'security_events'],
    1095, -- 3 years
    'Legal obligation - Audit trail requirements',
    false,
    (SELECT id FROM hr_public.users WHERE email = 'admin@postgraphile-hr.com'),
    (SELECT id FROM hr_public.users WHERE email = 'admin@postgraphile-hr.com'),
    NOW()
),
(
    'session_data_retention',
    'User session and authentication data retention',
    ARRAY['user_sessions', 'failed_login_attempts'],
    90, -- 90 days
    'Legitimate interest - Security monitoring',
    true,
    (SELECT id FROM hr_public.users WHERE email = 'admin@postgraphile-hr.com'),
    (SELECT id FROM hr_public.users WHERE email = 'admin@postgraphile-hr.com'),
    NOW()
);

-- Insert default processing activities
INSERT INTO hr_public.processing_activities (
    activity_name, activity_description, activity_category,
    data_controller, legal_basis, purpose_of_processing,
    data_subject_categories, personal_data_categories,
    retention_period, created_at
) VALUES 
(
    'Employee Management System',
    'Core HR system for managing employee lifecycle from hire to termination',
    'Human Resources',
    'PostGraphile HR Company',
    'Art 6.1.b - Contract performance',
    'Managing employment contracts, payroll, performance, and compliance with labor laws',
    ARRAY['employees', 'job_applicants', 'contractors'],
    ARRAY['contact_information', 'employment_details', 'financial_information', 'performance_data'],
    '7 years after employment termination',
    NOW()
),
(
    'Security and Audit Logging',
    'System access monitoring and security event logging for compliance',
    'Security',
    'PostGraphile HR Company',
    'Art 6.1.f - Legitimate interest',
    'Ensuring system security, preventing unauthorized access, and maintaining audit trails',
    ARRAY['employees', 'system_administrators'],
    ARRAY['access_logs', 'system_interactions', 'device_information'],
    '3 years from creation',
    NOW()
);

-- Add PostGraphile comments
COMMENT ON TABLE hr_public.audit_logs IS '@name AuditLog
Comprehensive audit trail for all system activities and data changes';

COMMENT ON TABLE hr_public.data_retention_policies IS '@name DataRetentionPolicy  
Data retention policies for compliance with GDPR and other regulations';

COMMENT ON TABLE hr_public.consent_records IS '@name ConsentRecord
GDPR consent management and tracking';

COMMENT ON TABLE hr_public.privacy_requests IS '@name PrivacyRequest
GDPR/CCPA privacy request management and processing';

COMMENT ON TABLE hr_public.processing_activities IS '@name ProcessingActivity
GDPR Article 30 data processing activities register';

-- Grant permissions
GRANT SELECT, INSERT ON hr_public.audit_logs TO hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT UPDATE, DELETE ON hr_public.audit_logs TO hr_super_admin;

GRANT SELECT ON hr_public.data_retention_policies TO hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT INSERT, UPDATE, DELETE ON hr_public.data_retention_policies TO hr_super_admin;

GRANT SELECT, INSERT, UPDATE ON hr_public.consent_records TO hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT DELETE ON hr_public.consent_records TO hr_super_admin;

GRANT SELECT, INSERT, UPDATE ON hr_public.privacy_requests TO hr_admin, hr_super_admin;
GRANT SELECT ON hr_public.privacy_requests TO hr_manager;

GRANT SELECT ON hr_public.processing_activities TO hr_manager, hr_admin, hr_super_admin;
GRANT INSERT, UPDATE, DELETE ON hr_public.processing_activities TO hr_super_admin;