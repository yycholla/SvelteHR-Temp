-- Migration: Create Task Dependencies Table with Circular Dependency Prevention
-- Date: 2025-10-09
-- Feature: Task System Expansion (028)

CREATE TABLE IF NOT EXISTS task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocking_task_id UUID NOT NULL REFERENCES hr_public.tasks(id) ON DELETE CASCADE,
  blocked_task_id UUID NOT NULL REFERENCES hr_public.tasks(id) ON DELETE CASCADE,
  dependency_type VARCHAR(50) DEFAULT 'must_complete_before',
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT no_self_dependency CHECK (blocking_task_id != blocked_task_id),
  CONSTRAINT unique_dependency UNIQUE (blocking_task_id, blocked_task_id)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_dependencies_blocking ON task_dependencies(blocking_task_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_blocked ON task_dependencies(blocked_task_id);

-- Circular dependency prevention trigger function
CREATE OR REPLACE FUNCTION prevent_circular_dependencies()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    WITH RECURSIVE dep_chain AS (
      -- Start from the task that would block the new blocking task
      SELECT blocked_task_id, blocking_task_id
      FROM task_dependencies
      WHERE blocked_task_id = NEW.blocking_task_id

      UNION ALL

      -- Recursively find all dependencies
      SELECT dc.blocked_task_id, td.blocking_task_id
      FROM dep_chain dc
      JOIN task_dependencies td ON dc.blocking_task_id = td.blocked_task_id
    )
    -- Check if we loop back to the new blocked task
    SELECT 1 FROM dep_chain WHERE blocking_task_id = NEW.blocked_task_id
  ) THEN
    RAISE EXCEPTION 'Circular dependency detected between tasks % and %',
      NEW.blocking_task_id, NEW.blocked_task_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check circular dependencies before insert
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'check_circular_dependencies') THEN
    CREATE TRIGGER check_circular_dependencies
    BEFORE INSERT ON task_dependencies
    FOR EACH ROW
    EXECUTE FUNCTION prevent_circular_dependencies();
  END IF;
END
$$;
