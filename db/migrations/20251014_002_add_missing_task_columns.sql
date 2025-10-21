-- Migration: Add Missing Task Columns for GraphQL Schema Alignment
-- Date: 2025-10-14
-- Purpose: Add requires_manual_reassignment and assignee_id columns to support frontend expectations
-- Related: SCHEMA_GAP_ANALYSIS.md - Aligning database with frontend GraphQL operations

BEGIN;

-- ========================================
-- ADD MISSING COLUMNS
-- ========================================

-- Add requires_manual_reassignment column
-- Used for task workflow logic to determine if task needs manual intervention when reassigned
ALTER TABLE hr_public.tasks
ADD COLUMN IF NOT EXISTS requires_manual_reassignment BOOLEAN DEFAULT false NOT NULL;

COMMENT ON COLUMN hr_public.tasks.requires_manual_reassignment IS 'If true, task requires manual intervention when assignee changes';

-- Add assignee_id column for primary assignee
-- This supports frontend single-assignee model while preserving task_assignees for multi-assignee capability
ALTER TABLE hr_public.tasks
ADD COLUMN IF NOT EXISTS assignee_id UUID REFERENCES hr_public.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN hr_public.tasks.assignee_id IS 'Primary assignee for task (for backward compatibility with frontend single-assignee model)';

-- ========================================
-- CREATE INDEX
-- ========================================

CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON hr_public.tasks(assignee_id);

-- ========================================
-- MIGRATE EXISTING DATA
-- ========================================

-- Migrate existing task_assignees data to assignee_id
-- Take the first assignee (by assigned_at) as the primary assignee
-- Keep all assignees in task_assignees for multi-assignee functionality
UPDATE hr_public.tasks t
SET assignee_id = (
  SELECT user_id
  FROM hr_public.task_assignees ta
  WHERE ta.task_id = t.id
  ORDER BY ta.assigned_at ASC
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1
  FROM hr_public.task_assignees ta
  WHERE ta.task_id = t.id
);

-- ========================================
-- UPDATE TRIGGER TO SYNC ASSIGNEE_ID WITH TASK_ASSIGNEES
-- ========================================

-- When assignee_id is updated, ensure it's also in task_assignees
CREATE OR REPLACE FUNCTION sync_task_assignee()
RETURNS TRIGGER AS $$
BEGIN
  -- If assignee_id is set and not null
  IF NEW.assignee_id IS NOT NULL THEN
    -- Ensure this user is in task_assignees (upsert)
    INSERT INTO hr_public.task_assignees (task_id, user_id, assigned_at, assigned_by)
    VALUES (NEW.id, NEW.assignee_id, NOW(), NEW.created_by)
    ON CONFLICT (task_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_task_assignee_trigger ON hr_public.tasks;
CREATE TRIGGER sync_task_assignee_trigger
AFTER INSERT OR UPDATE OF assignee_id ON hr_public.tasks
FOR EACH ROW
WHEN (NEW.assignee_id IS NOT NULL)
EXECUTE FUNCTION sync_task_assignee();

-- ========================================
-- UPDATE RLS POLICIES TO INCLUDE ASSIGNEE_ID
-- ========================================

-- Update tasks select policy to include assignee_id
DROP POLICY IF EXISTS tasks_select_policy ON hr_public.tasks;
CREATE POLICY tasks_select_policy ON hr_public.tasks
  FOR SELECT USING (
    created_by = current_setting('app.current_user_id', true)::UUID OR
    assignee_id = current_setting('app.current_user_id', true)::UUID OR
    id IN (SELECT task_id FROM hr_public.task_assignees WHERE user_id = current_setting('app.current_user_id', true)::UUID) OR
    department_id IN (SELECT department_id FROM hr_public.users WHERE id = current_setting('app.current_user_id', true)::UUID)
  );

-- Update tasks update policy to include assignee_id
DROP POLICY IF EXISTS tasks_update_policy ON hr_public.tasks;
CREATE POLICY tasks_update_policy ON hr_public.tasks
  FOR UPDATE USING (
    created_by = current_setting('app.current_user_id', true)::UUID OR
    assignee_id = current_setting('app.current_user_id', true)::UUID OR
    id IN (SELECT task_id FROM hr_public.task_assignees WHERE user_id = current_setting('app.current_user_id', true)::UUID)
  );

COMMIT;

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Verify columns added
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'hr_public'
--   AND table_name = 'tasks'
--   AND column_name IN ('requires_manual_reassignment', 'assignee_id')
-- ORDER BY ordinal_position;

-- Verify data migration
-- SELECT
--   t.id,
--   t.title,
--   t.assignee_id,
--   ARRAY_AGG(ta.user_id ORDER BY ta.assigned_at) as all_assignees
-- FROM hr_public.tasks t
-- LEFT JOIN hr_public.task_assignees ta ON t.id = ta.task_id
-- GROUP BY t.id, t.title, t.assignee_id
-- LIMIT 10;
