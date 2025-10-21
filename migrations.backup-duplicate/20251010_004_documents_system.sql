-- Migration: Complete Documents System
-- Date: 2025-10-10
-- Purpose: Consolidated documents, versions, assignments, categories, access logs, encryption

BEGIN;

-- ========================================
-- DOCUMENT_CATEGORIES TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS hr_public.document_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  parent_category_id UUID REFERENCES hr_public.document_categories(id),
  icon VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE hr_public.document_categories IS 'Hierarchical categorization of documents';

INSERT INTO hr_public.document_categories (name, description, icon) VALUES
  ('Policy', 'Company policies and procedures', 'shield-check'),
  ('Handbook', 'Employee handbooks', 'book-open'),
  ('Contract', 'Employment contracts', 'file-signature'),
  ('Training', 'Training materials', 'graduation-cap'),
  ('Compliance', 'Compliance documents', 'clipboard-check')
ON CONFLICT (name) DO NOTHING;

-- ========================================
-- DOCUMENTS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS hr_public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category_id UUID REFERENCES hr_public.document_categories(id),
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT,
  mime_type VARCHAR(100),
  version_number INT DEFAULT 1,
  is_encrypted BOOLEAN DEFAULT FALSE,
  encryption_key_id UUID,
  uploaded_by UUID NOT NULL REFERENCES hr_public.users(id),
  requires_signature BOOLEAN DEFAULT FALSE,
  requires_acknowledgment BOOLEAN DEFAULT FALSE,
  expiry_date TIMESTAMPTZ,
  tags TEXT[],
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE hr_public.documents IS 'Central document repository with versioning and encryption';
COMMENT ON COLUMN hr_public.documents.is_encrypted IS 'Whether document content is encrypted at rest';
COMMENT ON COLUMN hr_public.documents.requires_signature IS 'Requires digital signature from assignees';
COMMENT ON COLUMN hr_public.documents.requires_acknowledgment IS 'Requires acknowledgment of receipt';

-- Indexes
CREATE INDEX idx_documents_category ON hr_public.documents(category_id);
CREATE INDEX idx_documents_uploaded_by ON hr_public.documents(uploaded_by);
CREATE INDEX idx_documents_expiry ON hr_public.documents(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX idx_documents_tags ON hr_public.documents USING GIN(tags);
CREATE INDEX idx_documents_created_at ON hr_public.documents(created_at DESC);

-- Full-text search
CREATE INDEX idx_documents_title_fulltext ON hr_public.documents
USING GIN(to_tsvector('english', title));

CREATE INDEX idx_documents_description_fulltext ON hr_public.documents
USING GIN(to_tsvector('english', COALESCE(description, '')));

-- ========================================
-- DOCUMENT_VERSIONS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS hr_public.document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES hr_public.documents(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT,
  uploaded_by UUID NOT NULL REFERENCES hr_public.users(id),
  change_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (document_id, version_number)
);

COMMENT ON TABLE hr_public.document_versions IS 'Version history of documents';

CREATE INDEX idx_document_versions_document ON hr_public.document_versions(document_id, version_number DESC);
CREATE INDEX idx_document_versions_uploaded_by ON hr_public.document_versions(uploaded_by);

-- ========================================
-- DOCUMENT_ASSIGNMENTS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS hr_public.document_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES hr_public.documents(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES hr_public.users(id),
  department_id UUID REFERENCES hr_public.departments(id),
  assigned_by UUID NOT NULL REFERENCES hr_public.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_date TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  signature_data TEXT,
  assignment_status VARCHAR(50) DEFAULT 'active' CHECK (assignment_status IN ('active', 'completed', 'expired', 'revoked')),
  notes TEXT,
  CHECK ((employee_id IS NOT NULL) OR (department_id IS NOT NULL))
);

COMMENT ON TABLE hr_public.document_assignments IS 'Document assignments to employees or departments';
COMMENT ON COLUMN hr_public.document_assignments.assignment_status IS 'active, completed, expired, revoked';

-- Indexes
CREATE INDEX idx_document_assignments_document ON hr_public.document_assignments(document_id);
CREATE INDEX idx_document_assignments_employee ON hr_public.document_assignments(employee_id);
CREATE INDEX idx_document_assignments_department ON hr_public.document_assignments(department_id);
CREATE INDEX idx_document_assignments_status ON hr_public.document_assignments(assignment_status);
CREATE INDEX idx_document_assignments_due_date ON hr_public.document_assignments(due_date) WHERE due_date IS NOT NULL;

-- ========================================
-- DOCUMENT_ACCESS_LOGS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS hr_public.document_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES hr_public.documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES hr_public.users(id),
  action VARCHAR(50) NOT NULL CHECK (action IN ('view', 'download', 'print', 'share')),
  ip_address INET,
  user_agent TEXT,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE hr_public.document_access_logs IS E'@omit create,update,delete\nImmutable access audit trail for documents';

CREATE INDEX idx_document_access_document ON hr_public.document_access_logs(document_id, accessed_at DESC);
CREATE INDEX idx_document_access_user ON hr_public.document_access_logs(user_id);
CREATE INDEX idx_document_access_action ON hr_public.document_access_logs(action);

-- ========================================
-- ENCRYPTION_KEYS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS hr_public.encryption_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name VARCHAR(100) NOT NULL UNIQUE,
  algorithm VARCHAR(50) NOT NULL,
  key_version INT DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rotated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

COMMENT ON TABLE hr_public.encryption_keys IS 'Encryption key metadata (actual keys stored in vault)';
COMMENT ON COLUMN hr_public.encryption_keys.algorithm IS 'Encryption algorithm (e.g., AES-256-GCM)';

CREATE INDEX idx_encryption_keys_active ON hr_public.encryption_keys(is_active) WHERE is_active = TRUE;

-- ========================================
-- ENCRYPTED_FILE_STORAGE TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS hr_public.encrypted_file_storage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES hr_public.documents(id) ON DELETE CASCADE,
  encryption_key_id UUID NOT NULL REFERENCES hr_public.encryption_keys(id),
  encrypted_data BYTEA NOT NULL,
  iv BYTEA NOT NULL,
  auth_tag BYTEA,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE hr_public.encrypted_file_storage IS 'Encrypted document storage with key references';
COMMENT ON COLUMN hr_public.encrypted_file_storage.iv IS 'Initialization vector for encryption';
COMMENT ON COLUMN hr_public.encrypted_file_storage.auth_tag IS 'Authentication tag for AEAD ciphers';

CREATE INDEX idx_encrypted_storage_document ON hr_public.encrypted_file_storage(document_id);

-- ========================================
-- DOCUMENT UPDATE TRIGGER
-- ========================================

CREATE OR REPLACE FUNCTION update_document_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS document_update_timestamp_trigger ON hr_public.documents;
CREATE TRIGGER document_update_timestamp_trigger
BEFORE UPDATE ON hr_public.documents
FOR EACH ROW
EXECUTE FUNCTION update_document_timestamp();

-- ========================================
-- DOCUMENT ASSIGNMENT EXPIRY CHECK
-- ========================================

CREATE OR REPLACE FUNCTION check_assignment_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.due_date IS NOT NULL AND NEW.due_date < NOW() AND NEW.assignment_status = 'active' THEN
    NEW.assignment_status = 'expired';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS assignment_expiry_trigger ON hr_public.document_assignments;
CREATE TRIGGER assignment_expiry_trigger
BEFORE INSERT OR UPDATE ON hr_public.document_assignments
FOR EACH ROW
EXECUTE FUNCTION check_assignment_expiry();

-- ========================================
-- ROW LEVEL SECURITY
-- ========================================

ALTER TABLE hr_public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.document_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.document_access_logs ENABLE ROW LEVEL SECURITY;

-- Documents policies
DROP POLICY IF EXISTS documents_select_policy ON hr_public.documents;
CREATE POLICY documents_select_policy ON hr_public.documents
  FOR SELECT USING (
    uploaded_by = current_setting('app.current_user_id', true)::UUID OR
    current_setting('app.current_role', true) IN ('super_admin', 'admin') OR
    id IN (
      SELECT document_id FROM hr_public.document_assignments
      WHERE employee_id = current_setting('app.current_user_id', true)::UUID
      AND assignment_status = 'active'
    )
  );

DROP POLICY IF EXISTS documents_insert_policy ON hr_public.documents;
CREATE POLICY documents_insert_policy ON hr_public.documents
  FOR INSERT WITH CHECK (
    uploaded_by = current_setting('app.current_user_id', true)::UUID AND
    current_setting('app.current_role', true) IN ('super_admin', 'admin', 'manager')
  );

-- Assignments policies
DROP POLICY IF EXISTS assignments_select_policy ON hr_public.document_assignments;
CREATE POLICY assignments_select_policy ON hr_public.document_assignments
  FOR SELECT USING (
    employee_id = current_setting('app.current_user_id', true)::UUID OR
    assigned_by = current_setting('app.current_user_id', true)::UUID OR
    current_setting('app.current_role', true) IN ('super_admin', 'admin')
  );

-- Access logs policies (read-only for own logs)
DROP POLICY IF EXISTS access_logs_select_policy ON hr_public.document_access_logs;
CREATE POLICY access_logs_select_policy ON hr_public.document_access_logs
  FOR SELECT USING (
    user_id = current_setting('app.current_user_id', true)::UUID OR
    current_setting('app.current_role', true) IN ('super_admin', 'admin')
  );

COMMIT;
