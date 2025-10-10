-- Migration: Create hr_public.rollback_requests table for admin → super admin rollback workflow
-- Feature: 020-we-need-to (Audit Logging with Rollback)
-- Date: 2025-10-02
-- Purpose: Track rollback requests from admins requiring super admin approval

-- Create rollback_requests table (in hr_public schema)
CREATE TABLE IF NOT EXISTS hr_public.rollback_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_log_id UUID NOT NULL REFERENCES activity_logs(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES hr_public.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    review_reason TEXT
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
-- Index 1: Status + requested_at (most common query: pending requests ordered by date)
CREATE INDEX idx_rollback_requests_status ON hr_public.rollback_requests (status, requested_at DESC);

-- Index 2: Activity log ID (find requests for a specific log entry)
CREATE INDEX idx_rollback_requests_log ON hr_public.rollback_requests (activity_log_id);

-- Index 3: Requester (find requests by a specific user)
CREATE INDEX idx_rollback_requests_requester ON hr_public.rollback_requests (requested_by);

-- Add validation constraint function for rollback requests
CREATE OR REPLACE FUNCTION validate_rollback_request()
RETURNS TRIGGER AS $$
DECLARE
    target_log_is_rollback BOOLEAN;
BEGIN
    -- Rule 1: Cannot request rollback of a rollback
    -- Check that the target activity_log has is_rollback = FALSE
    SELECT is_rollback INTO target_log_is_rollback
    FROM activity_logs
    WHERE id = NEW.activity_log_id;

    IF target_log_is_rollback = TRUE THEN
        RAISE EXCEPTION 'Cannot request rollback of a rollback operation';
    END IF;

    -- Rule 2: reviewed_by must be NULL when status = 'pending'
    IF NEW.status = 'pending' AND NEW.reviewed_by IS NOT NULL THEN
        RAISE EXCEPTION 'reviewed_by must be NULL when status is pending';
    END IF;

    -- Rule 3: reviewed_by must NOT be NULL when status IN ('approved', 'rejected')
    IF NEW.status IN ('approved', 'rejected') AND NEW.reviewed_by IS NULL THEN
        RAISE EXCEPTION 'reviewed_by required when status is approved or rejected';
    END IF;

    -- Rule 4: review_reason required when rejecting
    IF NEW.status = 'rejected' AND (NEW.review_reason IS NULL OR NEW.review_reason = '') THEN
        RAISE EXCEPTION 'review_reason required when rejecting a rollback request';
    END IF;

    -- Rule 5: reviewed_at must be set when status changes from pending
    IF NEW.status IN ('approved', 'rejected') AND NEW.reviewed_at IS NULL THEN
        NEW.reviewed_at := now();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for rollback request validation
CREATE TRIGGER trigger_validate_rollback_request
    BEFORE INSERT OR UPDATE ON hr_public.rollback_requests
    FOR EACH ROW
    EXECUTE FUNCTION validate_rollback_request();

-- Prevent modifications to approved/rejected requests (immutable once reviewed)
CREATE OR REPLACE FUNCTION prevent_reviewed_request_modifications()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IN ('approved', 'rejected') THEN
        RAISE EXCEPTION 'Cannot modify a rollback request that has been reviewed (status: %)', OLD.status;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent modifications to reviewed requests
CREATE TRIGGER trigger_prevent_reviewed_request_update
    BEFORE UPDATE ON hr_public.rollback_requests
    FOR EACH ROW
    EXECUTE FUNCTION prevent_reviewed_request_modifications();

-- Prevent deletion of reviewed requests
CREATE OR REPLACE FUNCTION prevent_reviewed_request_deletion()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IN ('approved', 'rejected') THEN
        RAISE EXCEPTION 'Cannot delete a rollback request that has been reviewed (status: %)', OLD.status;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent deletion of reviewed requests
CREATE TRIGGER trigger_prevent_reviewed_request_delete
    BEFORE DELETE ON hr_public.rollback_requests
    FOR EACH ROW
    EXECUTE FUNCTION prevent_reviewed_request_deletion();

-- Enable Row-Level Security
ALTER TABLE hr_public.rollback_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policy 1: Admins can view their own requests
CREATE POLICY admin_own_requests ON hr_public.rollback_requests
    FOR SELECT
    USING (
        requested_by = current_setting('jwt.claims.user_id', true)::uuid
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
        requested_by = current_setting('jwt.claims.user_id', true)::uuid
        AND current_setting('jwt.claims.role', true) IN ('admin', 'hr_admin')
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
GRANT SELECT, INSERT ON hr_public.rollback_requests TO authenticated;
GRANT UPDATE (status, reviewed_by, reviewed_at, review_reason) ON hr_public.rollback_requests TO authenticated;

-- Create helper function to get pending rollback requests count
CREATE OR REPLACE FUNCTION get_pending_rollback_requests_count()
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM hr_public.rollback_requests
        WHERE status = 'pending'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on helper function
GRANT EXECUTE ON FUNCTION get_pending_rollback_requests_count() TO authenticated;

-- Create helper function to approve rollback request
CREATE OR REPLACE FUNCTION approve_rollback_request(
    p_request_id UUID,
    p_reviewed_by UUID,
    p_review_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE hr_public.rollback_requests
    SET
        status = 'approved',
        reviewed_by = p_reviewed_by,
        reviewed_at = now(),
        review_reason = p_review_reason
    WHERE id = p_request_id
    AND status = 'pending';

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on approval function
GRANT EXECUTE ON FUNCTION approve_rollback_request(UUID, UUID, TEXT) TO authenticated;

-- Create helper function to reject rollback request
CREATE OR REPLACE FUNCTION reject_rollback_request(
    p_request_id UUID,
    p_reviewed_by UUID,
    p_review_reason TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    IF p_review_reason IS NULL OR p_review_reason = '' THEN
        RAISE EXCEPTION 'review_reason required when rejecting a rollback request';
    END IF;

    UPDATE hr_public.rollback_requests
    SET
        status = 'rejected',
        reviewed_by = p_reviewed_by,
        reviewed_at = now(),
        review_reason = p_review_reason
    WHERE id = p_request_id
    AND status = 'pending';

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on rejection function
GRANT EXECUTE ON FUNCTION reject_rollback_request(UUID, UUID, TEXT) TO authenticated;

-- Migration complete
COMMENT ON TABLE hr_public.rollback_requests IS 'Migration 20251002_002 complete: Rollback requests table created with 3 indexes, RLS policies, and validation rules';
