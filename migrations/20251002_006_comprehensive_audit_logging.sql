-- Migration: 20251002_004_comprehensive_audit_logging.sql
-- Feature: 021-i-have-setup (Comprehensive Audit Logging)
-- Description: Extends activity_logs with cryptographic signatures, batch tracking,
--              universal audit triggers, and retention archives
-- Date: 2025-10-02

-- ============================================================================
-- NEW TABLE: audit_log_signatures (FR-006, FR-022)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_log_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_log_id UUID NOT NULL UNIQUE REFERENCES hr_public.activity_logs(id) ON DELETE CASCADE,
  signature TEXT NOT NULL,
  signature_algorithm VARCHAR(20) NOT NULL DEFAULT 'ES256',
  public_key_id VARCHAR(50) NOT NULL,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Metadata for key rotation and verification
  key_version INTEGER NOT NULL DEFAULT 1,

  CONSTRAINT chk_signature_not_empty CHECK (LENGTH(signature) > 0),
  CONSTRAINT chk_algorithm_valid CHECK (signature_algorithm IN ('ES256', 'ES384', 'ES512'))
);

CREATE INDEX idx_audit_signatures_activity_log_id ON audit_log_signatures(activity_log_id);
CREATE INDEX idx_audit_signatures_signed_at ON audit_log_signatures(signed_at DESC);
CREATE INDEX idx_audit_signatures_public_key_id ON audit_log_signatures(public_key_id);

COMMENT ON TABLE audit_log_signatures IS 'Cryptographic signatures for audit log tamper detection (FR-006, FR-022)';
COMMENT ON COLUMN audit_log_signatures.signature_algorithm IS 'ECDSA algorithm: ES256 (fastest, recommended), ES384, or ES512';
COMMENT ON COLUMN audit_log_signatures.public_key_id IS 'Identifier for the public key used to verify this signature';

-- ============================================================================
-- NEW TABLE: audit_retention_archives (FR-018, FR-019)
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_retention_archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_log_id UUID NOT NULL,
  archive_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  compressed_data BYTEA NOT NULL,
  checksum VARCHAR(64) NOT NULL,

  -- Metadata for archive management
  original_created_at TIMESTAMPTZ NOT NULL,
  archive_format VARCHAR(20) NOT NULL DEFAULT 'gzip',
  uncompressed_size_bytes INTEGER NOT NULL,

  CONSTRAINT chk_compressed_data_not_empty CHECK (LENGTH(compressed_data) > 0),
  CONSTRAINT chk_checksum_format CHECK (checksum ~ '^[a-f0-9]{64}$')
);

CREATE INDEX idx_audit_archives_original_log_id ON audit_retention_archives(original_log_id);
CREATE INDEX idx_audit_archives_archive_date ON audit_retention_archives(archive_date DESC);
CREATE INDEX idx_audit_archives_original_created_at ON audit_retention_archives(original_created_at);

COMMENT ON TABLE audit_retention_archives IS 'Compressed archives of audit logs older than retention period (FR-018, FR-019)';
COMMENT ON COLUMN audit_retention_archives.checksum IS 'SHA-256 checksum of compressed_data for integrity verification';
COMMENT ON COLUMN audit_retention_archives.archive_format IS 'Compression format used (gzip recommended for PostgreSQL BYTEA)';

-- ============================================================================
-- EXTEND activity_logs TABLE (FR-013, FR-020)
-- ============================================================================

-- Add missing columns to hr_public.activity_logs for comprehensive audit logging

-- Add before_snapshot column for capturing state before changes
ALTER TABLE hr_public.activity_logs
ADD COLUMN IF NOT EXISTS before_snapshot JSONB;

-- Add after_snapshot column for capturing state after changes
ALTER TABLE hr_public.activity_logs
ADD COLUMN IF NOT EXISTS after_snapshot JSONB;

-- Add is_rollback flag for identifying rollback operations
ALTER TABLE hr_public.activity_logs
ADD COLUMN IF NOT EXISTS is_rollback BOOLEAN NOT NULL DEFAULT FALSE;

-- Add rolled_back_log_id for linking rollback operations to original logs
ALTER TABLE hr_public.activity_logs
ADD COLUMN IF NOT EXISTS rolled_back_log_id UUID REFERENCES hr_public.activity_logs(id) ON DELETE SET NULL;

-- Add signature_id column for linking to cryptographic signatures
ALTER TABLE hr_public.activity_logs
ADD COLUMN IF NOT EXISTS signature_id UUID REFERENCES public.audit_log_signatures(id) ON DELETE SET NULL;

-- Add batch_id for grouping related operations (FR-020)
ALTER TABLE hr_public.activity_logs
ADD COLUMN IF NOT EXISTS batch_id UUID;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_activity_logs_signature_id ON hr_public.activity_logs(signature_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_batch_id ON hr_public.activity_logs(batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activity_logs_is_rollback ON hr_public.activity_logs(is_rollback) WHERE is_rollback = TRUE;
CREATE INDEX IF NOT EXISTS idx_activity_logs_rolled_back_log_id ON hr_public.activity_logs(rolled_back_log_id) WHERE rolled_back_log_id IS NOT NULL;

COMMENT ON COLUMN hr_public.activity_logs.before_snapshot IS 'Complete state before action (NULL for create operations)';
COMMENT ON COLUMN hr_public.activity_logs.after_snapshot IS 'Complete state after action (NULL for delete operations)';
COMMENT ON COLUMN hr_public.activity_logs.is_rollback IS 'Flag indicating this log entry is from a rollback operation';
COMMENT ON COLUMN hr_public.activity_logs.rolled_back_log_id IS 'References the original log entry if this is a rollback';
COMMENT ON COLUMN hr_public.activity_logs.signature_id IS 'Reference to cryptographic signature (FR-006, FR-022)';
COMMENT ON COLUMN hr_public.activity_logs.batch_id IS 'Groups multiple operations performed together (FR-020)';

-- ============================================================================
-- UNIVERSAL AUDIT TRIGGER FUNCTION (FR-001, FR-002, FR-003, FR-004)
-- ============================================================================

CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  v_action VARCHAR(20);
  v_before_snapshot JSONB;
  v_after_snapshot JSONB;
  v_user_id UUID;
  v_ip_address INET;
  v_user_agent TEXT;
  v_batch_id UUID;
  v_log_id UUID;
BEGIN
  -- Determine operation type (FR-001, FR-002, FR-003, FR-004)
  IF (TG_OP = 'DELETE') THEN
    v_action := 'DELETE';
    v_before_snapshot := to_jsonb(OLD);
    v_after_snapshot := NULL;
  ELSIF (TG_OP = 'UPDATE') THEN
    v_action := 'UPDATE';
    v_before_snapshot := to_jsonb(OLD);
    v_after_snapshot := to_jsonb(NEW);
  ELSIF (TG_OP = 'INSERT') THEN
    v_action := 'CREATE';
    v_before_snapshot := NULL;
    v_after_snapshot := to_jsonb(NEW);
  END IF;

  -- Extract user context from session variables
  -- Application must set these via: SET LOCAL app.current_user_id = '...'
  BEGIN
    v_user_id := current_setting('app.current_user_id')::UUID;
  EXCEPTION WHEN OTHERS THEN
    -- Fallback for system-automated changes (no user context)
    v_user_id := NULL;
  END;

  BEGIN
    v_ip_address := current_setting('app.current_ip_address', true)::INET;
  EXCEPTION WHEN OTHERS THEN
    v_ip_address := NULL;
  END;

  BEGIN
    v_user_agent := current_setting('app.current_user_agent', true);
  EXCEPTION WHEN OTHERS THEN
    v_user_agent := NULL;
  END;

  BEGIN
    v_batch_id := current_setting('app.current_batch_id', true)::UUID;
  EXCEPTION WHEN OTHERS THEN
    v_batch_id := NULL;
  END;

  -- Insert audit log entry (FR-005: Complete snapshots)
  INSERT INTO hr_public.activity_logs (
    user_id,
    employee_id,
    action,
    resource_type,
    resource_id,
    before_snapshot,
    after_snapshot,
    ip_address,
    user_agent,
    batch_id,
    is_rollback
  ) VALUES (
    v_user_id, -- user_id (required by hr_public.activity_logs)
    v_user_id, -- employee_id (for backwards compatibility)
    v_action,
    TG_TABLE_NAME, -- Table name as resource_type
    COALESCE(NEW.id, OLD.id), -- Resource ID (keep as UUID)
    v_before_snapshot,
    v_after_snapshot,
    v_ip_address,
    v_user_agent,
    v_batch_id,
    false
  ) RETURNING id INTO v_log_id;

  -- Notify async worker for signature generation (FR-006)
  -- Worker listens to 'audit_log_inserted' channel
  PERFORM pg_notify('audit_log_inserted', v_log_id::TEXT);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION audit_trigger_func() IS 'Universal audit logging trigger for all tables (FR-001 to FR-006)';

-- ============================================================================
-- CREATE AUDIT TRIGGERS ON APPLICATION TABLES (FR-001 to FR-004)
-- ============================================================================

-- Note: Using hr_public schema where tables are located

-- TRIGGER: users table (FR-001) - primary user/employee table
DROP TRIGGER IF EXISTS audit_trigger_users ON hr_public.users;
CREATE TRIGGER audit_trigger_users
AFTER INSERT OR UPDATE OR DELETE ON hr_public.users
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- TRIGGER: departments table (FR-001)
DROP TRIGGER IF EXISTS audit_trigger_departments ON hr_public.departments;
CREATE TRIGGER audit_trigger_departments
AFTER INSERT OR UPDATE OR DELETE ON hr_public.departments
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- TRIGGER: events table (FR-002)
DROP TRIGGER IF EXISTS audit_trigger_events ON hr_public.events;
CREATE TRIGGER audit_trigger_events
AFTER INSERT OR UPDATE OR DELETE ON hr_public.events
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- TRIGGER: tasks table (FR-003)
-- DEPRECATED: Tasks table moved to public schema (see 20251009_000)
-- Audit triggers for the new tasks system are handled in October 2025 migrations
-- DROP TRIGGER IF EXISTS audit_trigger_tasks ON hr_public.tasks;
-- CREATE TRIGGER audit_trigger_tasks
-- AFTER INSERT OR UPDATE OR DELETE ON hr_public.tasks
-- FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- ============================================================================
-- PERFORMANCE INDEXES (FR-012: Query optimization)
-- ============================================================================

-- Optimize filtering by date range (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at_desc ON hr_public.activity_logs(created_at DESC);

-- Optimize filtering by employee (for "show my changes" queries)
CREATE INDEX IF NOT EXISTS idx_activity_logs_employee_id_created_at ON hr_public.activity_logs(employee_id, created_at DESC);

-- Optimize filtering by resource type + action (for "show all employee updates")
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource_type_action ON hr_public.activity_logs(resource_type, action, created_at DESC);

-- Optimize rollback queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_rolled_back_log_id ON hr_public.activity_logs(rolled_back_log_id) WHERE rolled_back_log_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activity_logs_is_rollback ON hr_public.activity_logs(is_rollback, created_at DESC) WHERE is_rollback = true;

-- ============================================================================
-- MIGRATION VERIFICATION
-- ============================================================================

-- Verify new tables exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_log_signatures') THEN
    RAISE EXCEPTION 'Migration failed: audit_log_signatures table not created';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_retention_archives') THEN
    RAISE EXCEPTION 'Migration failed: audit_retention_archives table not created';
  END IF;

  RAISE NOTICE 'Migration 20251002_004_comprehensive_audit_logging.sql completed successfully';
END $$;
