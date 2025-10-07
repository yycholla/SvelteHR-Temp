-- Migration: Create document_access_logs table for audit trail
-- Feature: 024-we-need-to (Secure Employee Document Management)
-- Date: 2025-10-07
-- Purpose: Comprehensive audit logging of all document access attempts

-- Set search path
SET search_path TO hr_public, public;

-- Create document_access_logs table
CREATE TABLE IF NOT EXISTS hr_public.document_access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES hr_public.documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    access_type VARCHAR(20) NOT NULL CHECK (access_type IN ('view', 'download', 'preview')),
    access_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    access_outcome VARCHAR(20) NOT NULL CHECK (access_outcome IN ('success', 'denied')),
    denial_reason TEXT
);

-- Add table comment
COMMENT ON TABLE hr_public.document_access_logs IS 'Audit trail for all document access attempts (Feature 024)';

-- Add column comments
COMMENT ON COLUMN hr_public.document_access_logs.access_type IS 'Type of access: view (detail page), download (file), preview (in-browser)';
COMMENT ON COLUMN hr_public.document_access_logs.access_outcome IS 'success = access granted, denied = RBAC blocked access';
COMMENT ON COLUMN hr_public.document_access_logs.denial_reason IS 'Reason for denial (e.g., "insufficient permissions", "document not assigned")';
COMMENT ON COLUMN hr_public.document_access_logs.ip_address IS 'User IP address for security audit';
COMMENT ON COLUMN hr_public.document_access_logs.user_agent IS 'Browser/client user agent string';

-- Create indexes for performance
CREATE INDEX idx_access_logs_document_timestamp ON hr_public.document_access_logs (document_id, access_timestamp DESC);
CREATE INDEX idx_access_logs_user_timestamp ON hr_public.document_access_logs (user_id, access_timestamp DESC);
CREATE INDEX idx_access_logs_timestamp ON hr_public.document_access_logs (access_timestamp DESC);
CREATE INDEX idx_access_logs_outcome ON hr_public.document_access_logs (access_outcome, access_timestamp DESC);

-- Create monthly partitioning for log retention (PostgreSQL 10+)
-- Partitioning by access_timestamp for efficient archival
-- Note: Partitions should be created via automated job or pg_partman extension

-- Helper function to create monthly partitions
CREATE OR REPLACE FUNCTION create_access_log_partition(partition_date DATE)
RETURNS VOID AS $$
DECLARE
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
BEGIN
    partition_name := 'document_access_logs_' || to_char(partition_date, 'YYYY_MM');
    start_date := date_trunc('month', partition_date);
    end_date := start_date + INTERVAL '1 month';

    EXECUTE format('
        CREATE TABLE IF NOT EXISTS hr_public.%I PARTITION OF hr_public.document_access_logs
        FOR VALUES FROM (%L) TO (%L)
    ', partition_name, start_date, end_date);
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_access_log_partition(DATE) TO authenticated;

-- Enable Row-Level Security (append-only, HR/Admin can read all)
ALTER TABLE hr_public.document_access_logs ENABLE ROW LEVEL SECURITY;

-- Migration complete
COMMENT ON TABLE hr_public.document_access_logs IS 'Migration 20251007_003 complete: Access logs with monthly partitioning support';
