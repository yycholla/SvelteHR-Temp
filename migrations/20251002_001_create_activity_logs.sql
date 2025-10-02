-- Migration: Create activity_logs table for comprehensive audit logging
-- Feature: 020-we-need-to (Audit Logging with Rollback)
-- Date: 2025-10-02
-- Purpose: Immutable audit trail of all system actions with snapshot support

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For full-text search on reason field

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('create', 'read', 'update', 'delete')),
    resource_type TEXT NOT NULL,
    resource_id UUID NOT NULL,
    before_snapshot JSONB,
    after_snapshot JSONB,
    ip_address INET,
    user_agent TEXT,
    reason TEXT,
    is_rollback BOOLEAN NOT NULL DEFAULT FALSE,
    rolled_back_log_id UUID REFERENCES activity_logs(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add table comment
COMMENT ON TABLE activity_logs IS 'Immutable audit trail of all system actions with before/after snapshots for rollback support';

-- Add column comments
COMMENT ON COLUMN activity_logs.employee_id IS 'User who performed the action';
COMMENT ON COLUMN activity_logs.action IS 'Type of operation: create, read, update, or delete';
COMMENT ON COLUMN activity_logs.resource_type IS 'Resource being acted upon (e.g., employees, events, tasks)';
COMMENT ON COLUMN activity_logs.resource_id IS 'ID of the resource';
COMMENT ON COLUMN activity_logs.before_snapshot IS 'Complete state before action (NULL for create operations)';
COMMENT ON COLUMN activity_logs.after_snapshot IS 'Complete state after action (NULL for delete operations)';
COMMENT ON COLUMN activity_logs.is_rollback IS 'Flag indicating this log entry is from a rollback operation';
COMMENT ON COLUMN activity_logs.rolled_back_log_id IS 'References the original log entry if this is a rollback';

-- Create indexes for performance (<1s query target for 1M+ entries)
-- Index 1: Time-based queries (most common - filter by date)
CREATE INDEX idx_activity_logs_time ON activity_logs (created_at DESC);

-- Index 2: Employee + time queries (department-scoped queries)
CREATE INDEX idx_activity_logs_employee ON activity_logs (employee_id, created_at DESC);

-- Index 3: Resource queries (find all logs for a specific resource)
CREATE INDEX idx_activity_logs_resource ON activity_logs (resource_type, resource_id, created_at DESC);

-- Index 4: Action type queries (filter by create/update/delete)
CREATE INDEX idx_activity_logs_action ON activity_logs (action);

-- Index 5: Modifications-only partial index (exclude read operations)
CREATE INDEX idx_activity_logs_mods ON activity_logs (created_at DESC)
WHERE action IN ('create', 'update', 'delete');

-- Index 6: GIN index for JSONB snapshot searches
CREATE INDEX idx_activity_logs_snapshots ON activity_logs
USING GIN (before_snapshot, after_snapshot);

-- Index 7: GIN trigram index for full-text search on reason field
CREATE INDEX idx_activity_logs_reason ON activity_logs
USING GIN (reason gin_trgm_ops);

-- Add validation constraint function for snapshot rules
CREATE OR REPLACE FUNCTION validate_activity_log_snapshots()
RETURNS TRIGGER AS $$
BEGIN
    -- Rule 1: before_snapshot must be NULL for create operations
    IF NEW.action = 'create' AND NEW.before_snapshot IS NOT NULL THEN
        RAISE EXCEPTION 'before_snapshot must be NULL for create operations';
    END IF;

    -- Rule 2: after_snapshot must be NULL for delete operations
    IF NEW.action = 'delete' AND NEW.after_snapshot IS NOT NULL THEN
        RAISE EXCEPTION 'after_snapshot must be NULL for delete operations';
    END IF;

    -- Rule 3: Both snapshots required for update operations
    IF NEW.action = 'update' AND (NEW.before_snapshot IS NULL OR NEW.after_snapshot IS NULL) THEN
        RAISE EXCEPTION 'Both before_snapshot and after_snapshot required for update operations';
    END IF;

    -- Rule 4: rolled_back_log_id must be NULL when is_rollback = FALSE
    IF NEW.is_rollback = FALSE AND NEW.rolled_back_log_id IS NOT NULL THEN
        RAISE EXCEPTION 'rolled_back_log_id must be NULL when is_rollback = FALSE';
    END IF;

    -- Rule 5: rolled_back_log_id must NOT be NULL when is_rollback = TRUE
    IF NEW.is_rollback = TRUE AND NEW.rolled_back_log_id IS NULL THEN
        RAISE EXCEPTION 'rolled_back_log_id required when is_rollback = TRUE';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for snapshot validation
CREATE TRIGGER trigger_validate_activity_log_snapshots
    BEFORE INSERT OR UPDATE ON activity_logs
    FOR EACH ROW
    EXECUTE FUNCTION validate_activity_log_snapshots();

-- Make activity_logs insert-only (prevent updates/deletes)
CREATE OR REPLACE FUNCTION prevent_activity_log_modifications()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Activity logs are immutable and cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent modifications
CREATE TRIGGER trigger_prevent_activity_log_update
    BEFORE UPDATE ON activity_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_activity_log_modifications();

CREATE TRIGGER trigger_prevent_activity_log_delete
    BEFORE DELETE ON activity_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_activity_log_modifications();

-- Enable Row-Level Security
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy 1: Department-scoped for regular admins
-- Admins can only view logs for users in their department
CREATE POLICY admin_dept_logs ON activity_logs
    FOR SELECT
    USING (
        current_setting('jwt.claims.role', true) = 'admin'
        AND employee_id IN (
            SELECT id FROM users WHERE department_id = (
                SELECT department_id FROM users
                WHERE id = current_setting('jwt.claims.user_id', true)::uuid
            )
        )
    );

-- RLS Policy 2: Organization-wide for HR and super admins
-- HR admins and super admins can view all logs across the organization
CREATE POLICY hr_admin_org_logs ON activity_logs
    FOR SELECT
    USING (
        current_setting('jwt.claims.role', true) IN ('hr_admin', 'super_admin')
    );

-- RLS Policy 3: Allow all authenticated users to INSERT (logging service)
-- All users can create audit logs (via logging service)
CREATE POLICY activity_logs_insert ON activity_logs
    FOR INSERT
    WITH CHECK (
        employee_id = current_setting('jwt.claims.user_id', true)::uuid
    );

-- Grant appropriate permissions
GRANT SELECT, INSERT ON activity_logs TO authenticated;
GRANT SELECT ON activity_logs TO anon; -- For public audit trail viewing if needed

-- Create helper function to get activity log statistics
CREATE OR REPLACE FUNCTION get_activity_log_stats(
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
    total_count BIGINT,
    action_counts JSONB,
    resource_counts JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_count,
        jsonb_object_agg(action, action_count) as action_counts,
        jsonb_object_agg(resource_type, resource_count) as resource_counts
    FROM (
        SELECT
            action,
            COUNT(*) as action_count,
            resource_type,
            COUNT(*) as resource_count
        FROM activity_logs
        WHERE created_at BETWEEN p_start_date AND p_end_date
        GROUP BY action, resource_type
    ) stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on helper function
GRANT EXECUTE ON FUNCTION get_activity_log_stats(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- Migration complete
COMMENT ON TABLE activity_logs IS 'Migration 20251002_001 complete: Activity logs table created with 7 indexes, RLS policies, and validation rules';
