-- Migration: Fix rollback_requests table schema location
-- Feature: 020-we-need-to (Audit Logging with Rollback)
-- Date: 2025-10-03
-- Purpose: Create rollback_requests table in hr_public schema for PostGraphile exposure

-- Drop if exists in public schema
DROP TABLE IF EXISTS public.rollback_requests CASCADE;

-- Create rollback_requests table in hr_public schema
CREATE TABLE IF NOT EXISTS hr_public.rollback_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_log_id UUID NOT NULL REFERENCES hr_public.activity_logs(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES hr_public.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    review_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add table comment
COMMENT ON TABLE hr_public.rollback_requests IS 'Workflow for admins to request rollbacks from super admins';

-- Add column comments
COMMENT ON COLUMN hr_public.rollback_requests.activity_log_id IS 'Log entry to rollback';
COMMENT ON COLUMN hr_public.rollback_requests.requested_by IS 'Admin who requested rollback';
COMMENT ON COLUMN hr_public.rollback_requests.requested_at IS 'When request was created';
COMMENT ON COLUMN hr_public.rollback_requests.reason IS 'Justification for rollback';
COMMENT ON COLUMN hr_public.rollback_requests.status IS 'Request state: pending, approved, or rejected';
COMMENT ON COLUMN hr_public.rollback_requests.reviewed_by IS 'Super admin who reviewed the request';
COMMENT ON COLUMN hr_public.rollback_requests.reviewed_at IS 'When review occurred';
COMMENT ON COLUMN hr_public.rollback_requests.review_reason IS 'Super admin approval or rejection note';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rollback_requests_status ON hr_public.rollback_requests (status, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_rollback_requests_log ON hr_public.rollback_requests (activity_log_id);
CREATE INDEX IF NOT EXISTS idx_rollback_requests_requester ON hr_public.rollback_requests (requested_by);

-- Enable Row-Level Security
ALTER TABLE hr_public.rollback_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (from previous migration)
DROP POLICY IF EXISTS admin_own_requests ON hr_public.rollback_requests;
DROP POLICY IF EXISTS super_admin_all_requests ON hr_public.rollback_requests;
DROP POLICY IF EXISTS admin_create_requests ON hr_public.rollback_requests;
DROP POLICY IF EXISTS super_admin_update_requests ON hr_public.rollback_requests;

-- RLS Policy 1: Admins can view their own requests
CREATE POLICY admin_own_requests ON hr_public.rollback_requests
    FOR SELECT
    USING (
        requested_by = NULLIF(current_setting('jwt.claims.user_id', true), '')::UUID
    );

-- RLS Policy 2: Super admins can view all requests
CREATE POLICY super_admin_all_requests ON hr_public.rollback_requests
    FOR SELECT
    USING (
        current_setting('jwt.claims.role', true) = 'super_admin'
    );

-- RLS Policy 3: Allow admins to INSERT their own requests
CREATE POLICY admin_create_requests ON hr_public.rollback_requests
    FOR INSERT
    WITH CHECK (
        requested_by = NULLIF(current_setting('jwt.claims.user_id', true), '')::UUID
        AND current_setting('jwt.claims.role', true) = 'admin'
    );

-- RLS Policy 4: Allow super admins to UPDATE requests (approve/reject)
CREATE POLICY super_admin_update_requests ON hr_public.rollback_requests
    FOR UPDATE
    USING (
        current_setting('jwt.claims.role', true) = 'super_admin'
    )
    WITH CHECK (
        current_setting('jwt.claims.role', true) = 'super_admin'
    );

-- Grant appropriate permissions
-- (Updated role names - hr_ prefix removed in migration 20251002_003)
GRANT SELECT, INSERT ON hr_public.rollback_requests TO super_admin;
GRANT SELECT, INSERT ON hr_public.rollback_requests TO admin;
GRANT UPDATE (status, reviewed_by, reviewed_at, review_reason) ON hr_public.rollback_requests TO super_admin;

-- Migration complete
