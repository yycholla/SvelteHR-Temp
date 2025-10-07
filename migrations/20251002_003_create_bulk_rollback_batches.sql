-- Migration: Create bulk_rollback_batches table for bulk rollback operations
-- Feature: 020-we-need-to (Audit Logging with Rollback)
-- Date: 2025-10-02
-- Purpose: Track bulk rollback operations with real-time progress tracking

-- Set search path to hr_public
SET search_path TO hr_public, public;

-- Create bulk_rollback_batches table
CREATE TABLE IF NOT EXISTS hr_public.bulk_rollback_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    initiated_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_log_ids UUID[] NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'in_progress', 'completed', 'failed')),
    total_count INTEGER NOT NULL,
    processed_count INTEGER NOT NULL DEFAULT 0,
    successful_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    failure_details JSONB
);

-- Add table comment
COMMENT ON TABLE bulk_rollback_batches IS 'Track bulk rollback operations with progress monitoring (max 100 operations per batch)';

-- Add column comments
COMMENT ON COLUMN bulk_rollback_batches.initiated_by IS 'User who started the batch rollback';
COMMENT ON COLUMN bulk_rollback_batches.activity_log_ids IS 'Array of log IDs to rollback (max 100)';
COMMENT ON COLUMN bulk_rollback_batches.started_at IS 'When batch began';
COMMENT ON COLUMN bulk_rollback_batches.completed_at IS 'When batch finished (NULL while in progress)';
COMMENT ON COLUMN bulk_rollback_batches.status IS 'Batch state: queued, in_progress, completed, or failed';
COMMENT ON COLUMN bulk_rollback_batches.total_count IS 'Total logs to rollback';
COMMENT ON COLUMN bulk_rollback_batches.processed_count IS 'Logs processed so far';
COMMENT ON COLUMN bulk_rollback_batches.successful_count IS 'Successful rollbacks';
COMMENT ON COLUMN bulk_rollback_batches.failed_count IS 'Failed rollbacks';
COMMENT ON COLUMN bulk_rollback_batches.failure_details IS 'Array of {log_id, error_message} for failures';

-- Create indexes for performance
-- Index 1: Status + started_at (query active batches, ordered by date)
CREATE INDEX idx_bulk_batches_status ON hr_public.bulk_rollback_batches (status, started_at DESC);

-- Index 2: Initiator (find batches by a specific user)
CREATE INDEX idx_bulk_batches_user ON hr_public.bulk_rollback_batches (initiated_by);

-- Add validation constraint function for bulk rollback batches
CREATE OR REPLACE FUNCTION validate_bulk_rollback_batch()
RETURNS TRIGGER AS $$
DECLARE
    array_len INTEGER;
BEGIN
    -- Rule 1: Calculate array length
    array_len := array_length(NEW.activity_log_ids, 1);

    -- Rule 2: Maximum 100 log IDs per batch
    IF array_len > 100 THEN
        RAISE EXCEPTION 'Maximum 100 log IDs per batch (got: %)', array_len;
    END IF;

    -- Rule 3: At least 1 log ID required
    IF array_len IS NULL OR array_len < 1 THEN
        RAISE EXCEPTION 'At least 1 log ID required for bulk rollback';
    END IF;

    -- Rule 4: total_count must equal array_length(activity_log_ids, 1)
    IF NEW.total_count != array_len THEN
        RAISE EXCEPTION 'total_count (%) must equal array length (%)', NEW.total_count, array_len;
    END IF;

    -- Rule 5: processed_count must equal successful_count + failed_count
    IF NEW.processed_count != (NEW.successful_count + NEW.failed_count) THEN
        RAISE EXCEPTION 'processed_count (%) must equal successful_count (%) + failed_count (%)',
            NEW.processed_count, NEW.successful_count, NEW.failed_count;
    END IF;

    -- Rule 6: completed_at must be NULL when status IN ('queued', 'in_progress')
    IF NEW.status IN ('queued', 'in_progress') AND NEW.completed_at IS NOT NULL THEN
        RAISE EXCEPTION 'completed_at must be NULL when status is queued or in_progress';
    END IF;

    -- Rule 7: completed_at must NOT be NULL when status IN ('completed', 'failed')
    IF NEW.status IN ('completed', 'failed') AND NEW.completed_at IS NULL THEN
        NEW.completed_at := now();
    END IF;

    -- Rule 8: Cannot modify completed/failed batches
    IF TG_OP = 'UPDATE' AND OLD.status IN ('completed', 'failed') AND NEW.status != OLD.status THEN
        RAISE EXCEPTION 'Cannot modify a batch that has completed or failed';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for batch validation
CREATE TRIGGER trigger_validate_bulk_rollback_batch
    BEFORE INSERT OR UPDATE ON hr_public.bulk_rollback_batches
    FOR EACH ROW
    EXECUTE FUNCTION validate_bulk_rollback_batch();

-- Prevent deletion of completed/failed batches (audit trail)
CREATE OR REPLACE FUNCTION prevent_batch_deletion()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IN ('completed', 'failed') THEN
        RAISE EXCEPTION 'Cannot delete a batch that has completed or failed (status: %)', OLD.status;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent deletion of completed batches
CREATE TRIGGER trigger_prevent_batch_delete
    BEFORE DELETE ON hr_public.bulk_rollback_batches
    FOR EACH ROW
    EXECUTE FUNCTION prevent_batch_deletion();

-- Enable Row-Level Security
ALTER TABLE hr_public.bulk_rollback_batches ENABLE ROW LEVEL SECURITY;

-- RLS Policy 1: Only super admins can view bulk batches
CREATE POLICY super_admin_bulk_batches ON hr_public.bulk_rollback_batches
    FOR SELECT
    USING (
        current_setting('jwt.claims.role', true) = 'super_admin'
    );

-- RLS Policy 2: Only super admins can INSERT bulk batches
CREATE POLICY super_admin_create_batches ON hr_public.bulk_rollback_batches
    FOR INSERT
    WITH CHECK (
        current_setting('jwt.claims.role', true) = 'super_admin'
        AND initiated_by = current_setting('jwt.claims.user_id', true)::uuid
    );

-- RLS Policy 3: Only super admins can UPDATE batches (progress updates)
CREATE POLICY super_admin_update_batches ON hr_public.bulk_rollback_batches
    FOR UPDATE
    USING (
        current_setting('jwt.claims.role', true) = 'super_admin'
    )
    WITH CHECK (
        current_setting('jwt.claims.role', true) = 'super_admin'
    );

-- Grant appropriate permissions
GRANT SELECT, INSERT ON hr_public.bulk_rollback_batches TO authenticated;
GRANT UPDATE (status, completed_at, processed_count, successful_count, failed_count, failure_details)
ON hr_public.bulk_rollback_batches TO authenticated;

-- Create helper function to update batch progress
CREATE OR REPLACE FUNCTION update_batch_progress(
    p_batch_id UUID,
    p_processed_count INTEGER,
    p_successful_count INTEGER,
    p_failed_count INTEGER,
    p_failure_details JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    batch_total INTEGER;
    new_status TEXT;
BEGIN
    -- Get total count
    SELECT total_count INTO batch_total
    FROM hr_public.bulk_rollback_batches
    WHERE id = p_batch_id;

    -- Determine new status
    IF p_processed_count >= batch_total THEN
        IF p_failed_count > 0 THEN
            new_status := 'failed';
        ELSE
            new_status := 'completed';
        END IF;
    ELSE
        new_status := 'in_progress';
    END IF;

    -- Update batch
    UPDATE hr_public.bulk_rollback_batches
    SET
        processed_count = p_processed_count,
        successful_count = p_successful_count,
        failed_count = p_failed_count,
        failure_details = COALESCE(p_failure_details, failure_details),
        status = new_status,
        completed_at = CASE
            WHEN new_status IN ('completed', 'failed') THEN now()
            ELSE completed_at
        END
    WHERE id = p_batch_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on progress update function
GRANT EXECUTE ON FUNCTION update_batch_progress(UUID, INTEGER, INTEGER, INTEGER, JSONB) TO authenticated;

-- Create helper function to get active batches count
CREATE OR REPLACE FUNCTION get_active_batches_count()
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM hr_public.bulk_rollback_batches
        WHERE status IN ('queued', 'in_progress')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on helper function
GRANT EXECUTE ON FUNCTION get_active_batches_count() TO authenticated;

-- Create helper function to cancel a batch
CREATE OR REPLACE FUNCTION cancel_batch(
    p_batch_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE hr_public.bulk_rollback_batches
    SET
        status = 'failed',
        completed_at = now(),
        failure_details = jsonb_build_object(
            'cancelled', true,
            'message', 'Batch cancelled by user',
            'cancelled_at', now()
        )
    WHERE id = p_batch_id
    AND status IN ('queued', 'in_progress');

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on cancel function
GRANT EXECUTE ON FUNCTION cancel_batch(UUID) TO authenticated;

-- Create view for batch statistics
CREATE OR REPLACE VIEW bulk_rollback_batch_stats AS
SELECT
    status,
    COUNT(*) as batch_count,
    SUM(total_count) as total_operations,
    SUM(successful_count) as total_successful,
    SUM(failed_count) as total_failed,
    AVG(processed_count::FLOAT / NULLIF(total_count, 0) * 100) as avg_completion_percentage,
    AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration_seconds
FROM hr_public.bulk_rollback_batches
GROUP BY status;

-- Grant select on view
GRANT SELECT ON bulk_rollback_batch_stats TO authenticated;

-- Migration complete
COMMENT ON TABLE hr_public.bulk_rollback_batches IS 'Migration 20251002_003 complete: Bulk rollback batches table created with 2 indexes, RLS policies, and validation rules (max 100 operations per batch)';
