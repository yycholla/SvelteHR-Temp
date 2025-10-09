-- Migration: Create Row-Level Security Policies for Tasks
-- Date: 2025-10-09
-- Feature: Task System Expansion (028)

-- Helper functions for RLS policies
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN current_setting('app.current_user_id', TRUE)::UUID;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION current_user_role()
RETURNS INTEGER AS $$
BEGIN
  RETURN current_setting('app.current_user_role', TRUE)::INTEGER;
EXCEPTION WHEN OTHERS THEN
  RETURN 0;
END;
$$ LANGUAGE plpgsql STABLE;

-- Enable RLS on tasks table
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Read policy: Users can read tasks assigned to them, their direct reports (managers), or all (admins)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'task_read_policy') THEN
    CREATE POLICY task_read_policy ON tasks FOR SELECT
    USING (
      assignee_id = current_user_id()
      OR
      (
        current_user_role() >= 60
        AND assignee_id IN (
          SELECT id FROM users
          WHERE manager_id = current_user_id()
        )
      )
      OR
      current_user_role() >= 80
    );
  END IF;
END
$$;

-- Create policy: Users can create tasks based on RBAC rules
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'task_create_policy') THEN
    CREATE POLICY task_create_policy ON tasks FOR INSERT
    WITH CHECK (
      creator_id = current_user_id()
      AND
      (
        -- Employees: only self-assign
        (
          current_user_role() = 20
          AND assignee_id = current_user_id()
        )
        OR
        -- Managers: self or direct reports
        (
          current_user_role() >= 60
          AND (
            assignee_id = current_user_id()
            OR assignee_id IN (
              SELECT id FROM users
              WHERE manager_id = current_user_id()
            )
          )
        )
        OR
        -- Admins: anyone
        current_user_role() >= 80
      )
    );
  END IF;
END
$$;

-- Update policy: Creators and assignees can edit
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'task_update_policy') THEN
    CREATE POLICY task_update_policy ON tasks FOR UPDATE
    USING (
      creator_id = current_user_id()
      OR assignee_id = current_user_id()
    );
  END IF;
END
$$;

-- Delete policy: Creators and admins can archive (soft delete)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tasks' AND policyname = 'task_delete_policy') THEN
    CREATE POLICY task_delete_policy ON tasks FOR UPDATE
    USING (
      creator_id = current_user_id()
      OR current_user_role() >= 80
    )
    WITH CHECK (archived = TRUE);
  END IF;
END
$$;

-- Enable RLS on task_audit_entries table
ALTER TABLE task_audit_entries ENABLE ROW LEVEL SECURITY;

-- Read policy: Can read audit entries for tasks they can read
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_audit_entries' AND policyname = 'audit_read_policy') THEN
    CREATE POLICY audit_read_policy ON task_audit_entries FOR SELECT
    USING (
      task_id IN (SELECT id FROM tasks)
    );
  END IF;
END
$$;

-- Insert policy: System/application controlled (all authenticated users can insert for now)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'task_audit_entries' AND policyname = 'audit_insert_policy') THEN
    CREATE POLICY audit_insert_policy ON task_audit_entries FOR INSERT
    WITH CHECK (true); -- Application controls this
  END IF;
END
$$;
