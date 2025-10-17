-- Migration: Create Tasks Table
-- Date: 2025-10-09
-- Feature: Task System Expansion (028)

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  assignee_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE RESTRICT,
  creator_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE RESTRICT,
  task_type_id UUID NOT NULL REFERENCES task_types(id) ON DELETE RESTRICT,
  status task_status_enum NOT NULL DEFAULT 'To Do',
  priority task_priority_enum NOT NULL DEFAULT 'Medium',
  due_date TIMESTAMPTZ NULL,
  parent_task_id UUID NULL REFERENCES hr_public.tasks(id) ON DELETE CASCADE,
  archived BOOLEAN DEFAULT FALSE,
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL REFERENCES hr_public.users(id) ON DELETE SET NULL,
  requires_manual_reassignment BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint: archived tasks must have archived_at and archived_by
  CONSTRAINT task_archived_check CHECK (
    (archived = FALSE AND archived_at IS NULL AND archived_by IS NULL)
    OR
    (archived = TRUE AND archived_at IS NOT NULL AND archived_by IS NOT NULL)
  )
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id) WHERE archived = FALSE;
CREATE INDEX IF NOT EXISTS idx_tasks_creator ON tasks(creator_id);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(task_type_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status) WHERE archived = FALSE;
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority) WHERE archived = FALSE;
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date) WHERE due_date IS NOT NULL AND archived = FALSE;
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_orphaned ON tasks(assignee_id) WHERE requires_manual_reassignment = TRUE;

-- Updated timestamp trigger (assumes update_updated_at_column function exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tasks_updated_at') THEN
    CREATE TRIGGER tasks_updated_at
    BEFORE UPDATE ON hr_public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END
$$;
