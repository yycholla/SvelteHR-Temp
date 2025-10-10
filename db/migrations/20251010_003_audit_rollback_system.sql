-- Migration: Complete Audit and Rollback System
-- Date: 2025-10-10
-- Purpose: Consolidated activity_logs, rollback_requests, bulk_rollback_batches

BEGIN;

-- ========================================
-- ACTIVITY_LOGS TABLE (already exists, ensure completeness)
-- ========================================

-- Ensure activity_logs exists with all required columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'activity_logs') THEN
    CREATE TABLE public.activity_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
      action VARCHAR(100) NOT NULL,
      entity_type VARCHAR(50),
      entity_id UUID,
      old_data JSONB,
      new_data JSONB,
      ip_address INET,
      user_agent TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      rolled_back_at TIMESTAMPTZ,
      rolled_back_by UUID REFERENCES hr_public.users(id),
      rolled_back_log_id UUID REFERENCES public.activity_logs(id),
      is_rollback BOOLEAN DEFAULT FALSE
    );

    COMMENT ON TABLE public.activity_logs IS 'Comprehensive audit trail of all system actions';
    COMMENT ON COLUMN public.activity_logs.is_rollback IS 'TRUE if this log entry represents a rollback action';
  END IF;
END $$;

-- Indexes for activity_logs
CREATE INDEX IF NOT EXISTS idx_activity_logs_employee ON public.activity_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON public.activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON public.activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_rolled_back_log_id ON public.activity_logs(rolled_back_log_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_is_rollback ON public.activity_logs(is_rollback);

-- ========================================
-- ROLLBACK_REQUESTS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS hr_public.rollback_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_log_id UUID NOT NULL REFERENCES public.activity_logs(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES hr_public.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE hr_public.rollback_requests IS 'Workflow for admins to request rollbacks from super admins';
COMMENT ON COLUMN hr_public.rollback_requests.status IS 'Request state: pending, approved, or rejected';

-- Indexes
CREATE INDEX idx_rollback_requests_status ON hr_public.rollback_requests(status, requested_at DESC);
CREATE INDEX idx_rollback_requests_log ON hr_public.rollback_requests(activity_log_id);
CREATE INDEX idx_rollback_requests_requester ON hr_public.rollback_requests(requested_by);
CREATE INDEX idx_rollback_requests_requested_at ON hr_public.rollback_requests(requested_at DESC);

-- ========================================
-- BULK_ROLLBACK_BATCHES TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS hr_public.bulk_rollback_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  requested_by UUID NOT NULL REFERENCES hr_public.users(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processing', 'completed', 'failed')),
  reviewed_by UUID REFERENCES hr_public.users(id),
  reviewed_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  total_count INT DEFAULT 0,
  success_count INT DEFAULT 0,
  failure_count INT DEFAULT 0,
  error_log JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE hr_public.bulk_rollback_batches IS 'Bulk rollback operations for multiple activity logs';
COMMENT ON COLUMN hr_public.bulk_rollback_batches.status IS 'Batch status: pending, approved, rejected, processing, completed, failed';

CREATE INDEX idx_bulk_rollback_status ON hr_public.bulk_rollback_batches(status);
CREATE INDEX idx_bulk_rollback_requested_by ON hr_public.bulk_rollback_batches(requested_by);
CREATE INDEX idx_bulk_rollback_created_at ON hr_public.bulk_rollback_batches(created_at DESC);

-- ========================================
-- BULK_ROLLBACK_ITEMS (junction table)
-- ========================================

CREATE TABLE IF NOT EXISTS hr_public.bulk_rollback_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES hr_public.bulk_rollback_batches(id) ON DELETE CASCADE,
  activity_log_id UUID NOT NULL REFERENCES public.activity_logs(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE hr_public.bulk_rollback_items IS 'Individual activity logs in a bulk rollback batch';

CREATE INDEX idx_bulk_rollback_items_batch ON hr_public.bulk_rollback_items(batch_id);
CREATE INDEX idx_bulk_rollback_items_log ON hr_public.bulk_rollback_items(activity_log_id);

-- ========================================
-- ROLLBACK EXECUTION FUNCTION
-- ========================================

CREATE OR REPLACE FUNCTION execute_rollback(log_id UUID, executor_id UUID)
RETURNS JSONB AS $$
DECLARE
  log_record RECORD;
  rollback_log_id UUID;
  result JSONB;
BEGIN
  -- Get the activity log to rollback
  SELECT * INTO log_record
  FROM public.activity_logs
  WHERE id = log_id AND rolled_back_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Activity log not found or already rolled back'
    );
  END IF;

  -- Create a rollback log entry
  INSERT INTO public.activity_logs (
    employee_id,
    action,
    entity_type,
    entity_id,
    old_data,
    new_data,
    is_rollback,
    rolled_back_log_id
  ) VALUES (
    executor_id,
    'rollback_' || log_record.action,
    log_record.entity_type,
    log_record.entity_id,
    log_record.new_data,
    log_record.old_data,
    true,
    log_id
  ) RETURNING id INTO rollback_log_id;

  -- Mark original log as rolled back
  UPDATE public.activity_logs
  SET rolled_back_at = NOW(),
      rolled_back_by = executor_id,
      rolled_back_log_id = rollback_log_id
  WHERE id = log_id;

  RETURN jsonb_build_object(
    'success', true,
    'rollback_log_id', rollback_log_id,
    'original_log_id', log_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION execute_rollback IS 'Execute a rollback of a specific activity log entry';
GRANT EXECUTE ON FUNCTION execute_rollback TO super_admin;

-- ========================================
-- ROW LEVEL SECURITY
-- ========================================

ALTER TABLE hr_public.rollback_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.bulk_rollback_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.bulk_rollback_items ENABLE ROW LEVEL SECURITY;

-- Rollback requests policies
DROP POLICY IF EXISTS admin_own_requests ON hr_public.rollback_requests;
CREATE POLICY admin_own_requests ON hr_public.rollback_requests
  FOR SELECT USING (requested_by = current_setting('app.current_user_id', true)::UUID);

DROP POLICY IF EXISTS super_admin_all_requests ON hr_public.rollback_requests;
CREATE POLICY super_admin_all_requests ON hr_public.rollback_requests
  FOR SELECT USING (current_setting('app.current_role', true) = 'super_admin');

DROP POLICY IF EXISTS admin_create_requests ON hr_public.rollback_requests;
CREATE POLICY admin_create_requests ON hr_public.rollback_requests
  FOR INSERT WITH CHECK (
    requested_by = current_setting('app.current_user_id', true)::UUID AND
    current_setting('app.current_role', true) = 'admin'
  );

DROP POLICY IF EXISTS super_admin_update_requests ON hr_public.rollback_requests;
CREATE POLICY super_admin_update_requests ON hr_public.rollback_requests
  FOR UPDATE USING (current_setting('app.current_role', true) = 'super_admin');

-- Bulk rollback policies
DROP POLICY IF EXISTS bulk_rollback_select_policy ON hr_public.bulk_rollback_batches;
CREATE POLICY bulk_rollback_select_policy ON hr_public.bulk_rollback_batches
  FOR SELECT USING (
    requested_by = current_setting('app.current_user_id', true)::UUID OR
    current_setting('app.current_role', true) IN ('super_admin', 'admin')
  );

-- Grant permissions
GRANT SELECT, INSERT ON hr_public.rollback_requests TO super_admin;
GRANT SELECT, INSERT ON hr_public.rollback_requests TO admin;
GRANT UPDATE (status, reviewed_by, reviewed_at, review_reason) ON hr_public.rollback_requests TO super_admin;

COMMIT;
