-- Migration: Create Task Audit Entries Table
-- Date: 2025-10-09
-- Feature: Task System Expansion (028)

CREATE TABLE IF NOT EXISTS task_audit_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES hr_public.tasks(id) ON DELETE CASCADE,
  action_type audit_action_type_enum NOT NULL,
  changed_fields TEXT[] NOT NULL DEFAULT '{}',
  new_values JSONB NOT NULL DEFAULT '{}',
  user_id UUID NULL REFERENCES hr_public.users(id) ON DELETE SET NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint: 'created' action should have empty changed_fields, others should have data
  CONSTRAINT audit_entry_has_data CHECK (
    (action_type = 'created' AND changed_fields = '{}')
    OR
    (action_type != 'created' AND array_length(changed_fields, 1) > 0)
  )
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_audit_task ON task_audit_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON task_audit_entries(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user ON task_audit_entries(user_id);

-- GIN index for JSONB querying
CREATE INDEX IF NOT EXISTS idx_audit_new_values ON task_audit_entries USING GIN (new_values);
