-- Migration: Add missing indexes for document-related foreign keys
-- Date: 2025-10-07
-- Description: Add indexes to improve query performance for document tables
-- PostGraphile recommends indexing all foreign key columns for optimal performance

-- ============================================================================
-- Document Table Indexes
-- ============================================================================

-- Index for documents.encryption_key_id (foreign key to encryption_keys)
CREATE INDEX IF NOT EXISTS idx_documents_encryption_key_id
ON hr_public.documents(encryption_key_id)
WHERE encryption_key_id IS NOT NULL;

-- Index for documents.deleted_by (foreign key to users)
CREATE INDEX IF NOT EXISTS idx_documents_deleted_by
ON hr_public.documents(deleted_by)
WHERE deleted_by IS NOT NULL;

-- Index for documents.uploaded_by (already exists, but adding for completeness)
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by
ON hr_public.documents(uploaded_by);

-- ============================================================================
-- Document Assignments Indexes
-- ============================================================================

-- Index for document_assignments.employee_id (foreign key to employees)
CREATE INDEX IF NOT EXISTS idx_document_assignments_employee_id
ON hr_public.document_assignments(employee_id)
WHERE employee_id IS NOT NULL;

-- Index for document_assignments.department_id (foreign key to departments)
CREATE INDEX IF NOT EXISTS idx_document_assignments_department_id
ON hr_public.document_assignments(department_id)
WHERE department_id IS NOT NULL;

-- Index for document_assignments.assigned_by (foreign key to users)
CREATE INDEX IF NOT EXISTS idx_document_assignments_assigned_by
ON hr_public.document_assignments(assigned_by);

-- ============================================================================
-- Document Versions Indexes
-- ============================================================================

-- Index for document_versions.encryption_key_id (foreign key to encryption_keys)
CREATE INDEX IF NOT EXISTS idx_document_versions_encryption_key_id
ON hr_public.document_versions(encryption_key_id)
WHERE encryption_key_id IS NOT NULL;

-- Index for document_versions.version_created_by (already exists as idx_doc_versions_created_by)
-- CREATE INDEX IF NOT EXISTS idx_document_versions_version_created_by
-- ON hr_public.document_versions(version_created_by);

-- ============================================================================
-- Encrypted File Storage Indexes
-- ============================================================================

-- Index for encrypted_file_storage.uploaded_by (foreign key to users)
CREATE INDEX IF NOT EXISTS idx_encrypted_file_storage_uploaded_by
ON hr_public.encrypted_file_storage(uploaded_by);

-- ============================================================================
-- Bulk Rollback Batches Indexes
-- ============================================================================

-- Index for bulk_rollback_batches.initiated_by (foreign key to users)
CREATE INDEX IF NOT EXISTS idx_bulk_rollback_batches_initiated_by
ON hr_public.bulk_rollback_batches(initiated_by);

-- ============================================================================
-- Document Access Logs Indexes (for better query performance)
-- ============================================================================

-- Index for document_access_logs.user_id (foreign key to users)
CREATE INDEX IF NOT EXISTS idx_document_access_logs_user_id
ON hr_public.document_access_logs(user_id);

-- Composite index for common query patterns (already exists as idx_access_logs_document_timestamp)
-- CREATE INDEX IF NOT EXISTS idx_document_access_logs_document_user
-- ON hr_public.document_access_logs(document_id, user_id, access_timestamp DESC);

-- ============================================================================
-- Additional Performance Indexes
-- ============================================================================

-- Index for querying documents by category and sensitivity
CREATE INDEX IF NOT EXISTS idx_documents_category_sensitivity
ON hr_public.documents(category, sensitivity_level)
WHERE is_deleted = FALSE;

-- Index for querying active documents by upload date
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at
ON hr_public.documents(uploaded_at DESC)
WHERE is_deleted = FALSE;

-- Index for querying documents with expiration dates
CREATE INDEX IF NOT EXISTS idx_documents_expiration
ON hr_public.documents(expiration_date)
WHERE expiration_date IS NOT NULL AND is_deleted = FALSE;

-- ============================================================================
-- Analyze tables for query planner optimization
-- ============================================================================

ANALYZE hr_public.documents;
ANALYZE hr_public.document_assignments;
ANALYZE hr_public.document_versions;
ANALYZE hr_public.document_access_logs;
ANALYZE hr_public.encryption_keys;
ANALYZE hr_public.encrypted_file_storage;
ANALYZE hr_public.bulk_rollback_batches;

-- ============================================================================
-- Success message
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Successfully added document-related indexes for improved query performance';
END $$;
