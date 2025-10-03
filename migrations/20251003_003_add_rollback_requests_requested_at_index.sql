-- Migration: Add requested_at index for PostGraphile orderBy exposure
-- Feature: 020-we-need-to (Audit Logging with Rollback)
-- Date: 2025-10-03
-- Purpose: Add single-column index on requested_at to enable PostGraphile orderBy sorting

-- Create index on requested_at for sorting
CREATE INDEX IF NOT EXISTS idx_rollback_requests_requested_at
    ON hr_public.rollback_requests (requested_at DESC);

-- Add comment
COMMENT ON INDEX hr_public.idx_rollback_requests_requested_at IS
    'Single-column index to enable PostGraphile orderBy on requested_at field';

-- Migration complete
