-- Migration: Create Employee Document Management System
-- Created: 2025-09-15
-- Description: Document storage, digital signatures, and compliance tracking

-- Create ENUM types for document management
CREATE TYPE hr_public.document_type AS ENUM (
    'CONTRACT',
    'OFFER_LETTER',
    'HANDBOOK_ACKNOWLEDGMENT',
    'TAX_FORM',
    'BENEFITS_ENROLLMENT',
    'PERFORMANCE_REVIEW',
    'DISCIPLINARY_ACTION',
    'TRAINING_CERTIFICATE',
    'POLICY_ACKNOWLEDGMENT',
    'RESIGNATION_LETTER',
    'TERMINATION_NOTICE',
    'REFERENCE_CHECK',
    'BACKGROUND_CHECK',
    'MEDICAL_RECORDS',
    'EMERGENCY_CONTACT',
    'BANK_INFO',
    'OTHER'
);

CREATE TYPE hr_public.document_status AS ENUM (
    'DRAFT',
    'PENDING_SIGNATURE',
    'SIGNED',
    'COMPLETED',
    'EXPIRED',
    'ARCHIVED',
    'DELETED'
);

CREATE TYPE hr_public.access_level AS ENUM (
    'PUBLIC',
    'EMPLOYEE_ONLY',
    'MANAGER_ONLY', 
    'HR_ONLY',
    'CONFIDENTIAL'
);

-- Document templates table
CREATE TABLE hr_public.document_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Template details
    template_name VARCHAR(255) NOT NULL,
    document_type hr_public.document_type NOT NULL,
    description TEXT,
    
    -- Template content and metadata
    template_content TEXT, -- Could be HTML template, form fields, etc.
    required_fields JSONB, -- Field definitions for dynamic forms
    file_path VARCHAR(500), -- Path to template file if stored externally
    
    -- Configuration
    requires_signature BOOLEAN DEFAULT false,
    signature_fields JSONB, -- Signature field positions and requirements
    auto_expire_days INTEGER,
    access_level hr_public.access_level DEFAULT 'HR_ONLY',
    
    -- Versioning
    version VARCHAR(20) DEFAULT '1.0',
    previous_version_id UUID REFERENCES hr_public.document_templates(id),
    
    -- System fields
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL REFERENCES hr_public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT document_template_name_version_unique UNIQUE(template_name, version),
    CONSTRAINT document_template_expire_days_valid CHECK (auto_expire_days IS NULL OR auto_expire_days > 0)
);

-- Employee documents table
CREATE TABLE hr_public.employee_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Document relationships
    employee_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES hr_public.document_templates(id),
    
    -- Document details
    document_name VARCHAR(255) NOT NULL,
    document_type hr_public.document_type NOT NULL,
    description TEXT,
    
    -- File information
    file_name VARCHAR(255),
    file_path VARCHAR(500),
    file_size_bytes BIGINT,
    file_mime_type VARCHAR(100),
    file_hash VARCHAR(128), -- For integrity verification
    
    -- Document content (for generated documents)
    document_content TEXT,
    document_data JSONB, -- Structured data filled from template
    
    -- Status and workflow
    status hr_public.document_status DEFAULT 'DRAFT',
    access_level hr_public.access_level DEFAULT 'EMPLOYEE_ONLY',
    
    -- Expiration and retention
    expires_at TIMESTAMPTZ,
    retention_period INTERVAL, -- How long to keep after expiration/termination
    
    -- Compliance and audit
    compliance_notes TEXT,
    tags TEXT[], -- For categorization and search
    
    -- System fields
    created_by UUID NOT NULL REFERENCES hr_public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT document_file_info_consistency CHECK (
        (file_path IS NOT NULL AND file_name IS NOT NULL) OR
        (document_content IS NOT NULL)
    ),
    CONSTRAINT document_file_size_valid CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0)
);

-- Document signatures table
CREATE TABLE hr_public.document_signatures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Signature relationships
    document_id UUID NOT NULL REFERENCES hr_public.employee_documents(id) ON DELETE CASCADE,
    signer_id UUID NOT NULL REFERENCES hr_public.users(id),
    
    -- Signature details
    signature_type VARCHAR(50) NOT NULL, -- 'EMPLOYEE', 'MANAGER', 'HR', 'WITNESS', 'NOTARY'
    signature_order INTEGER DEFAULT 1, -- For multi-signature workflows
    
    -- Digital signature information
    signature_data TEXT, -- Base64 encoded signature image or digital signature
    signature_method VARCHAR(50) DEFAULT 'DIGITAL', -- 'DIGITAL', 'ESIGN', 'WET_INK'
    ip_address INET,
    user_agent TEXT,
    
    -- Verification and timestamps
    signed_at TIMESTAMPTZ,
    verification_code VARCHAR(100), -- For email verification
    is_verified BOOLEAN DEFAULT false,
    
    -- Status
    is_required BOOLEAN DEFAULT true,
    is_completed BOOLEAN DEFAULT false,
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(document_id, signer_id, signature_type),
    CONSTRAINT signature_completion_logic CHECK (
        (is_completed = true AND signed_at IS NOT NULL) OR
        (is_completed = false)
    )
);

-- Document sharing/access table
CREATE TABLE hr_public.document_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Access relationships
    document_id UUID NOT NULL REFERENCES hr_public.employee_documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    
    -- Access details
    access_type VARCHAR(50) NOT NULL, -- 'READ', 'WRITE', 'DOWNLOAD', 'SHARE'
    granted_by UUID NOT NULL REFERENCES hr_public.users(id),
    access_reason TEXT,
    
    -- Time-based access
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    
    -- Usage tracking
    last_accessed_at TIMESTAMPTZ,
    access_count INTEGER DEFAULT 0,
    
    -- System fields
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(document_id, user_id, access_type),
    CONSTRAINT document_access_dates_valid CHECK (valid_from <= COALESCE(valid_until, valid_from)),
    CONSTRAINT document_access_type_valid CHECK (access_type IN ('READ', 'WRITE', 'DOWNLOAD', 'SHARE'))
);

-- Document audit trail
CREATE TABLE hr_hidden.document_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Audit relationships
    document_id UUID NOT NULL REFERENCES hr_public.employee_documents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES hr_public.users(id),
    
    -- Action details
    action_type VARCHAR(50) NOT NULL,
    action_details JSONB,
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    session_id UUID,
    
    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT document_audit_action_valid CHECK (
        action_type IN ('CREATED', 'VIEWED', 'DOWNLOADED', 'UPDATED', 'SIGNED', 'SHARED', 'DELETED', 'ARCHIVED')
    )
);

-- Insert default document templates
INSERT INTO hr_public.document_templates (
    template_name, document_type, description, requires_signature, auto_expire_days, created_by
) VALUES 
    ('Standard Employment Contract', 'CONTRACT', 'Standard full-time employment contract template', true, 365, 
     (SELECT id FROM hr_public.users WHERE email = 'admin@postgraphile-hr.com')),
    ('Employee Handbook Acknowledgment', 'HANDBOOK_ACKNOWLEDGMENT', 'Acknowledgment of receipt and understanding of employee handbook', true, NULL,
     (SELECT id FROM hr_public.users WHERE email = 'admin@postgraphile-hr.com')),
    ('W-4 Tax Form', 'TAX_FORM', 'Federal tax withholding form', true, NULL,
     (SELECT id FROM hr_public.users WHERE email = 'admin@postgraphile-hr.com')),
    ('Benefits Enrollment Form', 'BENEFITS_ENROLLMENT', 'Annual benefits enrollment and selection form', true, 365,
     (SELECT id FROM hr_public.users WHERE email = 'admin@postgraphile-hr.com')),
    ('Emergency Contact Information', 'EMERGENCY_CONTACT', 'Employee emergency contact details', false, NULL,
     (SELECT id FROM hr_public.users WHERE email = 'admin@postgraphile-hr.com'));

-- Create indexes for performance
CREATE INDEX idx_employee_documents_employee_type ON hr_public.employee_documents(employee_id, document_type);
CREATE INDEX idx_employee_documents_status ON hr_public.employee_documents(status, created_at DESC);
CREATE INDEX idx_employee_documents_expires ON hr_public.employee_documents(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_employee_documents_tags ON hr_public.employee_documents USING GIN(tags);
CREATE INDEX idx_employee_documents_access_level ON hr_public.employee_documents(access_level, employee_id);

CREATE INDEX idx_document_signatures_document ON hr_public.document_signatures(document_id, signature_order);
CREATE INDEX idx_document_signatures_signer ON hr_public.document_signatures(signer_id, is_completed);
CREATE INDEX idx_document_signatures_pending ON hr_public.document_signatures(document_id) WHERE NOT is_completed;

CREATE INDEX idx_document_access_user ON hr_public.document_access(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_document_access_document ON hr_public.document_access(document_id, access_type);
CREATE INDEX idx_document_access_expires ON hr_public.document_access(valid_until) WHERE valid_until IS NOT NULL;

CREATE INDEX idx_document_templates_active ON hr_public.document_templates(document_type, is_active) WHERE is_active = true;
CREATE INDEX idx_document_templates_version ON hr_public.document_templates(template_name, version DESC);

CREATE INDEX idx_document_audit_log_document_time ON hr_hidden.document_audit_log(document_id, created_at DESC);
CREATE INDEX idx_document_audit_log_user_action ON hr_hidden.document_audit_log(user_id, action_type, created_at DESC);

-- Add PostGraphile comments
COMMENT ON TABLE hr_public.document_templates IS '@name DocumentTemplate
Document templates for generating standardized HR documents';

COMMENT ON TABLE hr_public.employee_documents IS '@name EmployeeDocument
Employee documents with file storage and digital signature support';

COMMENT ON TABLE hr_public.document_signatures IS '@name DocumentSignature
Digital signatures for employee documents with verification';

COMMENT ON TABLE hr_public.document_access IS '@name DocumentAccess
Document sharing and access control records';

COMMENT ON COLUMN hr_public.employee_documents.file_hash IS
'SHA-256 hash of file content for integrity verification';

COMMENT ON COLUMN hr_public.employee_documents.retention_period IS
'How long to retain document after employee termination or document expiration';

COMMENT ON COLUMN hr_public.document_signatures.signature_data IS
'Base64 encoded signature image or cryptographic signature';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON hr_public.document_templates TO hr_admin, hr_super_admin;
GRANT SELECT ON hr_public.document_templates TO hr_manager, hr_employee;

GRANT SELECT, INSERT, UPDATE ON hr_public.employee_documents TO hr_employee, hr_manager, hr_admin, hr_super_admin;
GRANT DELETE ON hr_public.employee_documents TO hr_admin, hr_super_admin;

GRANT SELECT, INSERT, UPDATE ON hr_public.document_signatures TO hr_employee, hr_manager, hr_admin, hr_super_admin;

GRANT SELECT, INSERT, UPDATE ON hr_public.document_access TO hr_manager, hr_admin, hr_super_admin;
GRANT SELECT ON hr_public.document_access TO hr_employee;

-- RLS policies for document security will be added separately