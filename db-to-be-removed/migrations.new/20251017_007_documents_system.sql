-- Migration: Documents System
-- Created: 2025-10-17
-- Description: documents, document_categories, document_versions, document_assignments, document_access_logs, encrypted_file_storage

BEGIN;

-- ============================================================================
-- DOCUMENT_CATEGORIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_public.document_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    parent_category_id UUID REFERENCES hr_public.document_categories(id) ON DELETE SET NULL,
    icon VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    CONSTRAINT document_categories_name_not_empty CHECK (LENGTH(TRIM(name)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_document_categories_name ON hr_public.document_categories(name) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_document_categories_parent ON hr_public.document_categories(parent_category_id) WHERE deleted_at IS NULL;

COMMENT ON TABLE hr_public.document_categories IS 'Hierarchical document categorization (e.g., Policies, Handbooks, Training)';
COMMENT ON COLUMN hr_public.document_categories.parent_category_id IS 'Self-referential foreign key for category hierarchy';

-- ============================================================================
-- DOCUMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES hr_public.document_categories(id) ON DELETE SET NULL,
    file_path VARCHAR(1000) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(255) NOT NULL,
    status hr_public.document_status NOT NULL DEFAULT 'draft',
    is_encrypted BOOLEAN NOT NULL DEFAULT FALSE,
    uploaded_by UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    CONSTRAINT documents_title_not_empty CHECK (LENGTH(TRIM(title)) > 0),
    CONSTRAINT documents_file_size_positive CHECK (file_size > 0),
    CONSTRAINT documents_mime_type_not_empty CHECK (LENGTH(TRIM(mime_type)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON hr_public.documents(uploaded_by) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_category ON hr_public.documents(category_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_status ON hr_public.documents(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON hr_public.documents(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_is_encrypted ON hr_public.documents(is_encrypted) WHERE deleted_at IS NULL;

-- Full-text search on documents
CREATE INDEX IF NOT EXISTS idx_documents_title_fulltext ON hr_public.documents
USING GIN(to_tsvector('english', title)) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_description_fulltext ON hr_public.documents
USING GIN(to_tsvector('english', COALESCE(description, ''))) WHERE deleted_at IS NULL;

COMMENT ON TABLE hr_public.documents IS 'Document storage with versioning, encryption, and access tracking';
COMMENT ON COLUMN hr_public.documents.file_path IS 'Relative path to file on storage system';
COMMENT ON COLUMN hr_public.documents.file_size IS 'File size in bytes';
COMMENT ON COLUMN hr_public.documents.is_encrypted IS 'Whether file content is encrypted at rest';

-- ============================================================================
-- DOCUMENT_VERSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_public.documents_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES hr_public.documents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    file_size BIGINT NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE RESTRICT,
    change_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    CONSTRAINT document_versions_unique UNIQUE (document_id, version_number),
    CONSTRAINT document_versions_version_positive CHECK (version_number > 0),
    CONSTRAINT document_versions_file_size_positive CHECK (file_size > 0)
);

CREATE INDEX IF NOT EXISTS idx_document_versions_document ON hr_public.documents_versions(document_id, version_number DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_document_versions_uploaded_by ON hr_public.documents_versions(uploaded_by) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_document_versions_created_at ON hr_public.documents_versions(created_at DESC) WHERE deleted_at IS NULL;

COMMENT ON TABLE hr_public.documents_versions IS 'Document version history for audit trail and rollback';
COMMENT ON COLUMN hr_public.documents_versions.version_number IS 'Sequential version number (1, 2, 3, ...)';

-- ============================================================================
-- DOCUMENT_ASSIGNMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_public.document_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES hr_public.documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE RESTRICT,
    status hr_public.assignment_status NOT NULL DEFAULT 'assigned',
    due_date TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    acknowledged_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT document_assignments_unique UNIQUE (document_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_document_assignments_document ON hr_public.document_assignments(document_id);
CREATE INDEX IF NOT EXISTS idx_document_assignments_user ON hr_public.document_assignments(user_id, status);
CREATE INDEX IF NOT EXISTS idx_document_assignments_assigned_by ON hr_public.document_assignments(assigned_by);
CREATE INDEX IF NOT EXISTS idx_document_assignments_due_date ON hr_public.document_assignments(due_date) WHERE status != 'completed';
CREATE INDEX IF NOT EXISTS idx_document_assignments_overdue ON hr_public.document_assignments(due_date)
WHERE status != 'completed' AND due_date < NOW();

COMMENT ON TABLE hr_public.document_assignments IS 'Document assignments to users with acknowledgment and completion tracking';
COMMENT ON COLUMN hr_public.document_assignments.status IS 'assigned: newly assigned; read: user opened document; acknowledged: user confirmed reading; completed: user finished task';

-- ============================================================================
-- DOCUMENT_ACCESS_LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_public.document_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES hr_public.documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    ip_address VARCHAR(100),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT document_access_logs_action_valid CHECK (action IN (
        'viewed', 'downloaded', 'uploaded', 'updated', 'deleted',
        'shared', 'unshared', 'exported', 'printed'
    ))
);

CREATE INDEX IF NOT EXISTS idx_document_access_logs_document ON hr_public.document_access_logs(document_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_access_logs_user ON hr_public.document_access_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_access_logs_action ON hr_public.document_access_logs(action);
CREATE INDEX IF NOT EXISTS idx_document_access_logs_created_at ON hr_public.document_access_logs(created_at DESC);

COMMENT ON TABLE hr_public.document_access_logs IS 'Immutable audit log for all document access and actions';
COMMENT ON COLUMN hr_public.document_access_logs.action IS 'Action type: viewed, downloaded, uploaded, updated, deleted, shared, etc.';

-- ============================================================================
-- ENCRYPTED_FILE_STORAGE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_public.encrypted_file_storage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_hash VARCHAR(64) NOT NULL UNIQUE,
    encrypted_content BYTEA NOT NULL,
    encryption_key_id UUID NOT NULL REFERENCES hr_public.encryption_keys(id) ON DELETE RESTRICT,

    CONSTRAINT encrypted_file_storage_hash_valid CHECK (LENGTH(file_hash) = 64)
);

CREATE INDEX IF NOT EXISTS idx_encrypted_file_storage_hash ON hr_public.encrypted_file_storage(file_hash);
CREATE INDEX IF NOT EXISTS idx_encrypted_file_storage_key ON hr_public.encrypted_file_storage(encryption_key_id);

COMMENT ON TABLE hr_public.encrypted_file_storage IS 'Encrypted file content storage with content-addressable hashing (SHA-256)';
COMMENT ON COLUMN hr_public.encrypted_file_storage.file_hash IS 'SHA-256 hash of original file content (before encryption)';
COMMENT ON COLUMN hr_public.encrypted_file_storage.encrypted_content IS 'AES-256 encrypted file content';

COMMIT;
