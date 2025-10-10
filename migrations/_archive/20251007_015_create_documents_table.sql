-- Migration: Create documents table for secure document management
-- Feature: 024-we-need-to (Secure Employee Document Management)
-- Date: 2025-10-07
-- Purpose: Store encrypted documents with metadata and soft delete support

-- Set search path
SET search_path TO hr_public, public;

-- Create documents table
CREATE TABLE IF NOT EXISTS hr_public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL CHECK (file_type IN ('PDF', 'JPEG', 'PNG', 'GIF', 'DOCX', 'XLSX', 'TXT', 'CSV')),
    file_size_bytes INTEGER NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 52428800), -- 50 MB max
    storage_path TEXT NOT NULL,
    encryption_key_id UUID NOT NULL, -- Reference to encryption_keys table (created in later migration)
    uploaded_by UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    category VARCHAR(100) NOT NULL,
    sensitivity_level VARCHAR(50) NOT NULL DEFAULT 'Internal' CHECK (sensitivity_level IN ('Public', 'Internal', 'Confidential', 'Sensitive-PII')),
    expiration_date DATE,
    version_number INTEGER NOT NULL DEFAULT 1,
    metadata_tags JSONB,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES hr_public.users(id) ON DELETE SET NULL
);

-- Add table comment
COMMENT ON TABLE hr_public.documents IS 'Encrypted employee documents with metadata and soft delete support (Feature 024)';

-- Add column comments
COMMENT ON COLUMN hr_public.documents.file_type IS 'Allowed types: PDF, JPEG, PNG, GIF, DOCX, XLSX, TXT, CSV';
COMMENT ON COLUMN hr_public.documents.file_size_bytes IS 'File size in bytes (max 50MB = 52428800 bytes)';
COMMENT ON COLUMN hr_public.documents.storage_path IS 'Path to encrypted file in storage (PostgreSQL BYTEA or S3 reference)';
COMMENT ON COLUMN hr_public.documents.encryption_key_id IS 'Reference to encryption key used for client-side encryption';
COMMENT ON COLUMN hr_public.documents.sensitivity_level IS 'Public < Internal < Confidential < Sensitive-PII';
COMMENT ON COLUMN hr_public.documents.metadata_tags IS 'Custom JSON tags for organization';
COMMENT ON COLUMN hr_public.documents.is_deleted IS 'Soft delete flag (retained for 3 years after employee termination)';

-- Create indexes for performance
CREATE INDEX idx_documents_uploaded_by_deleted ON hr_public.documents (uploaded_by, is_deleted);
CREATE INDEX idx_documents_category_sensitivity ON hr_public.documents (category, sensitivity_level);
CREATE INDEX idx_documents_expiration_date ON hr_public.documents (expiration_date) WHERE expiration_date IS NOT NULL;
CREATE INDEX idx_documents_deleted_at ON hr_public.documents (deleted_at) WHERE deleted_at IS NOT NULL;

-- Enable Row-Level Security (policies added in migration 20251007_007)
ALTER TABLE hr_public.documents ENABLE ROW LEVEL SECURITY;

-- Migration complete
COMMENT ON TABLE hr_public.documents IS 'Migration 20251007_001 complete: Documents table with encryption support, soft delete, and RLS enabled';
