-- Migration: Create document_versions table for version history
-- Feature: 024-we-need-to (Secure Employee Document Management)
-- Date: 2025-10-07
-- Purpose: Track version history when documents are updated or replaced

-- Set search path
SET search_path TO hr_public, public;

-- Create document_versions table
CREATE TABLE IF NOT EXISTS hr_public.document_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES hr_public.documents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    storage_path TEXT NOT NULL,
    encryption_key_id UUID NOT NULL REFERENCES hr_public.encryption_keys(id) ON DELETE RESTRICT,
    version_created_by UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    version_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    change_description TEXT,
    file_size_bytes INTEGER NOT NULL,

    -- Ensure unique version numbers per document
    CONSTRAINT uq_document_version UNIQUE(document_id, version_number)
);

-- Add table comment
COMMENT ON TABLE hr_public.document_versions IS 'Version history for documents when updated or replaced (Feature 024)';

-- Add column comments
COMMENT ON COLUMN hr_public.document_versions.version_number IS 'Version number (1, 2, 3...) incremented with each update';
COMMENT ON COLUMN hr_public.document_versions.storage_path IS 'Path to this specific version in storage';
COMMENT ON COLUMN hr_public.document_versions.encryption_key_id IS 'Encryption key used for this version';
COMMENT ON COLUMN hr_public.document_versions.change_description IS 'User-provided description of what changed in this version';
COMMENT ON COLUMN hr_public.document_versions.file_size_bytes IS 'Size of this version (may differ from current version)';

-- Create indexes for performance
CREATE INDEX idx_doc_versions_document_version ON hr_public.document_versions (document_id, version_number DESC);
CREATE INDEX idx_doc_versions_created_at ON hr_public.document_versions (version_created_at DESC);
CREATE INDEX idx_doc_versions_created_by ON hr_public.document_versions (version_created_by);

-- Enable Row-Level Security
ALTER TABLE hr_public.document_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can see version history for documents they can access
-- This policy references the documents table RLS policies (added in migration 007)
CREATE POLICY doc_versions_access ON hr_public.document_versions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM hr_public.documents d
            WHERE d.id = document_versions.document_id
            -- If user can see the document, they can see its version history
        )
    );

-- Grant permissions
GRANT SELECT ON hr_public.document_versions TO authenticated;
GRANT INSERT ON hr_public.document_versions TO authenticated; -- For version creation

-- Helper function to create new version when document is updated
CREATE OR REPLACE FUNCTION create_document_version()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create version if file content changed (storage_path changed)
    IF OLD.storage_path IS DISTINCT FROM NEW.storage_path THEN
        INSERT INTO hr_public.document_versions (
            document_id,
            version_number,
            storage_path,
            encryption_key_id,
            version_created_by,
            change_description,
            file_size_bytes
        ) VALUES (
            OLD.id,
            OLD.version_number,
            OLD.storage_path,
            OLD.encryption_key_id,
            current_setting('jwt.claims.user_id', true)::uuid,
            'Document updated',
            OLD.file_size_bytes
        );

        -- Increment version number in documents table
        NEW.version_number := OLD.version_number + 1;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically version documents on update
CREATE TRIGGER trigger_version_document
    BEFORE UPDATE ON hr_public.documents
    FOR EACH ROW
    WHEN (OLD.storage_path IS DISTINCT FROM NEW.storage_path)
    EXECUTE FUNCTION create_document_version();

-- Migration complete
COMMENT ON TABLE hr_public.document_versions IS 'Migration 20251007_006 complete: Document versions table with automatic versioning trigger';
