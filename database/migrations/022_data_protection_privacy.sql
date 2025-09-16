-- Migration: Data Protection & Privacy Enhancement
-- Created: 2025-09-15
-- Description: Enhanced data protection features including encryption, anonymization, and privacy controls

-- Create ENUM types for data protection
CREATE TYPE hr_public.encryption_status AS ENUM (
    'ENCRYPTED',
    'UNENCRYPTED',
    'PARTIALLY_ENCRYPTED',
    'PENDING_ENCRYPTION'
);

CREATE TYPE hr_public.anonymization_level AS ENUM (
    'NONE',
    'PSEUDONYMIZED',
    'ANONYMIZED',
    'FULLY_ANONYMIZED'
);

CREATE TYPE hr_public.data_lineage_action AS ENUM (
    'CREATED',
    'ACCESSED',
    'MODIFIED',
    'EXPORTED',
    'SHARED',
    'DELETED',
    'ANONYMIZED',
    'ARCHIVED'
);

-- Enhanced data protection metadata
CREATE TABLE hr_public.data_protection_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Data identification
    table_name VARCHAR(100) NOT NULL,
    column_name VARCHAR(100),
    record_id UUID,
    
    -- Protection status
    encryption_status hr_public.encryption_status DEFAULT 'UNENCRYPTED',
    encryption_key_id VARCHAR(100),
    encryption_algorithm VARCHAR(50),
    
    -- Anonymization tracking
    anonymization_level hr_public.anonymization_level DEFAULT 'NONE',
    original_data_hash VARCHAR(255),
    anonymization_applied_at TIMESTAMPTZ,
    
    -- Data classification and sensitivity
    data_classification hr_public.data_classification NOT NULL,
    sensitivity_score INTEGER DEFAULT 0, -- 0-100 scale
    
    -- Consent and legal basis tracking
    consent_required BOOLEAN DEFAULT false,
    consent_record_id UUID REFERENCES hr_public.consent_records(id),
    legal_basis_documented BOOLEAN DEFAULT false,
    legal_basis_reference VARCHAR(200),
    
    -- Data lifecycle
    retention_policy_id UUID REFERENCES hr_public.data_retention_policies(id),
    scheduled_deletion_date DATE,
    
    -- Access controls
    restricted_access BOOLEAN DEFAULT false,
    access_control_rules JSONB,
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT sensitivity_score_valid CHECK (sensitivity_score >= 0 AND sensitivity_score <= 100),
    CONSTRAINT encryption_consistency CHECK (
        (encryption_status = 'ENCRYPTED' AND encryption_key_id IS NOT NULL) OR
        (encryption_status != 'ENCRYPTED')
    ),
    CONSTRAINT anonymization_consistency CHECK (
        (anonymization_level != 'NONE' AND anonymization_applied_at IS NOT NULL) OR
        (anonymization_level = 'NONE')
    )
);

-- Data lineage tracking for complete data governance
CREATE TABLE hr_public.data_lineage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Source data identification
    source_table VARCHAR(100) NOT NULL,
    source_column VARCHAR(100),
    source_record_id UUID,
    
    -- Target data identification (for transformations)
    target_table VARCHAR(100),
    target_column VARCHAR(100),
    target_record_id UUID,
    
    -- Action and transformation details
    action hr_public.data_lineage_action NOT NULL,
    transformation_type VARCHAR(100), -- 'encryption', 'anonymization', 'aggregation', etc.
    transformation_details JSONB,
    
    -- User and system context
    performed_by_user_id UUID REFERENCES hr_public.users(id),
    performed_by_session_id UUID REFERENCES hr_public.user_sessions(id),
    automated_process BOOLEAN DEFAULT false,
    process_name VARCHAR(200),
    
    -- Data quality and impact
    data_quality_score INTEGER, -- 0-100 quality score
    impact_assessment TEXT,
    reversible BOOLEAN DEFAULT false,
    
    -- Compliance tracking
    compliance_requirement VARCHAR(200),
    audit_reference UUID REFERENCES hr_public.audit_logs(id),
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT data_quality_valid CHECK (data_quality_score IS NULL OR (data_quality_score >= 0 AND data_quality_score <= 100)),
    CONSTRAINT transformation_consistency CHECK (
        (action IN ('MODIFIED', 'ANONYMIZED') AND transformation_type IS NOT NULL) OR
        (action NOT IN ('MODIFIED', 'ANONYMIZED'))
    )
);

-- Right to be forgotten (erasure) requests tracking
CREATE TABLE hr_public.erasure_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Request details
    privacy_request_id UUID NOT NULL REFERENCES hr_public.privacy_requests(id),
    user_id UUID NOT NULL REFERENCES hr_public.users(id),
    
    -- Scope definition
    erasure_scope JSONB NOT NULL, -- Which data to erase
    partial_erasure BOOLEAN DEFAULT false,
    retain_aggregated_data BOOLEAN DEFAULT false,
    
    -- Processing status
    status VARCHAR(50) DEFAULT 'PENDING',
    assigned_to UUID REFERENCES hr_public.users(id),
    
    -- Legal assessment
    legal_exemptions_claimed TEXT[],
    exemption_justification TEXT,
    legal_review_required BOOLEAN DEFAULT true,
    legal_reviewer_id UUID REFERENCES hr_public.users(id),
    legal_review_completed_at TIMESTAMPTZ,
    
    -- Technical execution
    technical_feasibility VARCHAR(50) DEFAULT 'PENDING_ASSESSMENT',
    technical_notes TEXT,
    estimated_completion_date DATE,
    
    -- Execution tracking
    execution_started_at TIMESTAMPTZ,
    execution_completed_at TIMESTAMPTZ,
    execution_verified_at TIMESTAMPTZ,
    executed_by UUID REFERENCES hr_public.users(id),
    
    -- Impact assessment
    dependent_data_identified BOOLEAN DEFAULT false,
    dependent_systems TEXT[],
    business_impact_assessment TEXT,
    
    -- Results and verification
    data_deleted_count INTEGER DEFAULT 0,
    data_anonymized_count INTEGER DEFAULT 0,
    verification_method VARCHAR(100),
    completion_certificate_path VARCHAR(500),
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT execution_order CHECK (
        execution_started_at IS NULL OR 
        (execution_started_at <= COALESCE(execution_completed_at, NOW()))
    ),
    CONSTRAINT legal_review_logic CHECK (
        (legal_review_required = false) OR
        (legal_review_required = true AND legal_reviewer_id IS NOT NULL)
    )
);

-- Data breach incident management
CREATE TABLE hr_public.data_breach_incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Incident identification
    incident_number VARCHAR(50) UNIQUE NOT NULL,
    incident_title VARCHAR(200) NOT NULL,
    severity VARCHAR(20) DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, CRITICAL
    
    -- Discovery and reporting
    discovered_at TIMESTAMPTZ NOT NULL,
    discovered_by UUID REFERENCES hr_public.users(id),
    reported_to_dpo_at TIMESTAMPTZ,
    reported_to_authority_at TIMESTAMPTZ,
    
    -- Breach details
    breach_type VARCHAR(100) NOT NULL, -- 'confidentiality', 'integrity', 'availability'
    affected_data_categories TEXT[],
    estimated_affected_records INTEGER,
    confirmed_affected_records INTEGER,
    
    -- Impact assessment
    likelihood_of_risk VARCHAR(20), -- LOW, MEDIUM, HIGH
    potential_consequences TEXT,
    affected_individuals_notified BOOLEAN DEFAULT false,
    notification_method VARCHAR(100),
    
    -- Technical details
    root_cause TEXT,
    attack_vector VARCHAR(200),
    vulnerabilities_exploited TEXT[],
    systems_affected TEXT[],
    
    -- Response and containment
    incident_response_team JSONB, -- Team member details
    containment_actions TEXT,
    containment_completed_at TIMESTAMPTZ,
    
    -- Investigation
    investigation_status VARCHAR(50) DEFAULT 'ONGOING',
    investigation_findings TEXT,
    evidence_preserved BOOLEAN DEFAULT false,
    forensic_analysis_required BOOLEAN DEFAULT false,
    
    -- Recovery and lessons learned
    recovery_actions TEXT,
    recovery_completed_at TIMESTAMPTZ,
    lessons_learned TEXT,
    preventive_measures TEXT,
    
    -- Regulatory compliance
    regulatory_notification_required BOOLEAN DEFAULT false,
    regulatory_notification_deadline DATE,
    regulatory_notification_completed BOOLEAN DEFAULT false,
    authority_reference_number VARCHAR(100),
    
    -- Cost and business impact
    estimated_cost DECIMAL(12,2),
    business_impact_description TEXT,
    reputation_impact VARCHAR(50),
    
    -- Status and closure
    status VARCHAR(50) DEFAULT 'OPEN',
    closed_at TIMESTAMPTZ,
    closed_by UUID REFERENCES hr_public.users(id),
    post_incident_review_completed BOOLEAN DEFAULT false,
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT discovery_reporting_order CHECK (
        discovered_at <= COALESCE(reported_to_dpo_at, NOW()) AND
        COALESCE(reported_to_dpo_at, discovered_at) <= COALESCE(reported_to_authority_at, NOW())
    ),
    CONSTRAINT affected_records_consistency CHECK (
        confirmed_affected_records IS NULL OR 
        confirmed_affected_records <= COALESCE(estimated_affected_records, confirmed_affected_records)
    ),
    CONSTRAINT closure_logic CHECK (
        (status = 'CLOSED' AND closed_at IS NOT NULL AND closed_by IS NOT NULL) OR
        (status != 'CLOSED')
    )
);

-- Privacy impact assessments (DPIA)
CREATE TABLE hr_public.privacy_impact_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Assessment identification
    assessment_title VARCHAR(200) NOT NULL,
    assessment_reference VARCHAR(100) UNIQUE NOT NULL,
    assessment_type VARCHAR(100) DEFAULT 'DPIA', -- DPIA, LIA, PIA, etc.
    
    -- Project/process being assessed
    project_name VARCHAR(200),
    process_description TEXT,
    data_controller VARCHAR(200),
    data_processor VARCHAR(200),
    
    -- Assessment scope
    personal_data_categories TEXT[],
    special_category_data TEXT[],
    data_subjects_categories TEXT[],
    processing_purposes TEXT[],
    legal_basis VARCHAR(200),
    
    -- Risk assessment
    privacy_risks_identified TEXT[],
    risk_likelihood VARCHAR(20), -- LOW, MEDIUM, HIGH
    risk_impact VARCHAR(20), -- LOW, MEDIUM, HIGH
    overall_risk_level VARCHAR(20), -- LOW, MEDIUM, HIGH
    
    -- Mitigation measures
    technical_measures TEXT[],
    organizational_measures TEXT[],
    safeguards_implemented TEXT[],
    
    -- Stakeholder consultation
    stakeholders_consulted JSONB,
    data_subjects_consulted BOOLEAN DEFAULT false,
    consultation_methods TEXT[],
    feedback_received TEXT,
    
    -- Assessment process
    conducted_by UUID NOT NULL REFERENCES hr_public.users(id),
    reviewed_by UUID REFERENCES hr_public.users(id),
    approved_by UUID REFERENCES hr_public.users(id),
    
    -- Status and lifecycle
    status VARCHAR(50) DEFAULT 'DRAFT',
    assessment_date DATE NOT NULL,
    review_date DATE,
    next_review_due DATE,
    
    -- Results and recommendations
    assessment_outcome VARCHAR(100),
    recommendations TEXT,
    action_plan TEXT,
    monitoring_requirements TEXT,
    
    -- Documentation
    supporting_documents JSONB,
    assessment_report_path VARCHAR(500),
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT assessment_dates_valid CHECK (
        assessment_date <= COALESCE(review_date, CURRENT_DATE) AND
        COALESCE(review_date, assessment_date) <= COALESCE(next_review_due, CURRENT_DATE + INTERVAL '1 year')
    ),
    CONSTRAINT approval_workflow CHECK (
        (status = 'APPROVED' AND approved_by IS NOT NULL) OR
        (status != 'APPROVED')
    )
);

-- Create indexes for performance
CREATE INDEX idx_data_protection_metadata_table_record ON hr_public.data_protection_metadata(table_name, record_id);
CREATE INDEX idx_data_protection_metadata_classification ON hr_public.data_protection_metadata(data_classification, sensitivity_score DESC);
CREATE INDEX idx_data_protection_metadata_encryption ON hr_public.data_protection_metadata(encryption_status);
CREATE INDEX idx_data_protection_metadata_retention ON hr_public.data_protection_metadata(scheduled_deletion_date) WHERE scheduled_deletion_date IS NOT NULL;

CREATE INDEX idx_data_lineage_source ON hr_public.data_lineage(source_table, source_record_id, created_at DESC);
CREATE INDEX idx_data_lineage_target ON hr_public.data_lineage(target_table, target_record_id, created_at DESC);
CREATE INDEX idx_data_lineage_action ON hr_public.data_lineage(action, created_at DESC);
CREATE INDEX idx_data_lineage_user ON hr_public.data_lineage(performed_by_user_id, created_at DESC);

CREATE INDEX idx_erasure_requests_user ON hr_public.erasure_requests(user_id, status);
CREATE INDEX idx_erasure_requests_status ON hr_public.erasure_requests(status, created_at DESC);
CREATE INDEX idx_erasure_requests_completion ON hr_public.erasure_requests(estimated_completion_date) WHERE status IN ('APPROVED', 'IN_PROGRESS');

CREATE INDEX idx_data_breach_incidents_severity ON hr_public.data_breach_incidents(severity, discovered_at DESC);
CREATE INDEX idx_data_breach_incidents_status ON hr_public.data_breach_incidents(status, created_at DESC);
CREATE INDEX idx_data_breach_incidents_notification ON hr_public.data_breach_incidents(regulatory_notification_deadline) WHERE regulatory_notification_required = true;

CREATE INDEX idx_privacy_impact_assessments_status ON hr_public.privacy_impact_assessments(status, assessment_date DESC);
CREATE INDEX idx_privacy_impact_assessments_review ON hr_public.privacy_impact_assessments(next_review_due) WHERE status = 'APPROVED';
CREATE INDEX idx_privacy_impact_assessments_risk ON hr_public.privacy_impact_assessments(overall_risk_level, assessment_date DESC);

-- Add PostGraphile comments
COMMENT ON TABLE hr_public.data_protection_metadata IS '@name DataProtectionMetadata
Comprehensive data protection tracking and metadata management';

COMMENT ON TABLE hr_public.data_lineage IS '@name DataLineage
Complete data lineage tracking for governance and compliance';

COMMENT ON TABLE hr_public.erasure_requests IS '@name ErasureRequest
GDPR Article 17 right to erasure (right to be forgotten) processing';

COMMENT ON TABLE hr_public.data_breach_incidents IS '@name DataBreachIncident
Data breach incident management and regulatory compliance';

COMMENT ON TABLE hr_public.privacy_impact_assessments IS '@name PrivacyImpactAssessment
GDPR Article 35 Data Protection Impact Assessments (DPIA)';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON hr_public.data_protection_metadata TO hr_admin, hr_super_admin;
GRANT SELECT ON hr_public.data_protection_metadata TO hr_manager;

GRANT SELECT, INSERT ON hr_public.data_lineage TO hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT UPDATE, DELETE ON hr_public.data_lineage TO hr_super_admin;

GRANT SELECT, INSERT, UPDATE ON hr_public.erasure_requests TO hr_admin, hr_super_admin;
GRANT SELECT ON hr_public.erasure_requests TO hr_manager;

GRANT SELECT, INSERT, UPDATE ON hr_public.data_breach_incidents TO hr_admin, hr_super_admin;

GRANT SELECT, INSERT, UPDATE ON hr_public.privacy_impact_assessments TO hr_admin, hr_super_admin;
GRANT SELECT ON hr_public.privacy_impact_assessments TO hr_manager;