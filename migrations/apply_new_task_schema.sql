-- Comprehensive Task System Migration
-- Applies all new task schema changes to hr_public schema
-- Date: 2025-10-09

-- Step 1: Enums already created in public schema, they're accessible

-- Step 2: Create task_types table
CREATE TABLE IF NOT EXISTS hr_public.task_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NULL REFERENCES hr_public.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_task_types_name ON hr_public.task_types(name);

-- Non-conditional index for PostGraphile orderBy enum generation
CREATE INDEX IF NOT EXISTS idx_task_types_name_order ON hr_public.task_types(name);

INSERT INTO hr_public.task_types (name, description, is_system) VALUES
  ('General', 'General purpose task', TRUE),
  ('Onboarding', 'Tasks related to employee onboarding', TRUE),
  ('Assessment', 'Performance assessment related tasks', TRUE),
  ('Training', 'Training and development tasks', TRUE)
ON CONFLICT (name) DO NOTHING;

-- Step 3: Create tasks table
CREATE TABLE IF NOT EXISTS hr_public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  assignee_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE RESTRICT,
  creator_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE RESTRICT,
  task_type_id UUID NOT NULL REFERENCES hr_public.task_types(id) ON DELETE RESTRICT,
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
  CONSTRAINT task_archived_check CHECK (
    (archived = FALSE AND archived_at IS NULL AND archived_by IS NULL)
    OR
    (archived = TRUE AND archived_at IS NOT NULL AND archived_by IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON hr_public.tasks(assignee_id) WHERE archived = FALSE;
CREATE INDEX IF NOT EXISTS idx_tasks_creator ON hr_public.tasks(creator_id);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON hr_public.tasks(task_type_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON hr_public.tasks(status) WHERE archived = FALSE;
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON hr_public.tasks(priority) WHERE archived = FALSE;
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON hr_public.tasks(due_date) WHERE due_date IS NOT NULL AND archived = FALSE;
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON hr_public.tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_orphaned ON hr_public.tasks(assignee_id) WHERE requires_manual_reassignment = TRUE;

-- Non-conditional indexes for PostGraphile orderBy enum generation
-- NOTE: PostGraphile only generates orderBy enum values for non-conditional indexes
CREATE INDEX IF NOT EXISTS idx_tasks_created_at_order ON hr_public.tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_updated_at_order ON hr_public.tasks(updated_at);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date_order ON hr_public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status_order ON hr_public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority_order ON hr_public.tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_title_order ON hr_public.tasks(title);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tasks_updated_at' AND tgrelid = 'hr_public.tasks'::regclass) THEN
    CREATE TRIGGER tasks_updated_at
    BEFORE UPDATE ON hr_public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END
$$;

-- Step 4: Create task audit entries table
CREATE TABLE IF NOT EXISTS hr_public.task_audit_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES hr_public.tasks(id) ON DELETE CASCADE,
  action_type audit_action_type_enum NOT NULL,
  changed_fields TEXT[], -- Array of field names that changed
  new_values JSONB, -- New values after change
  user_id UUID NULL REFERENCES hr_public.users(id) ON DELETE SET NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_audit_task_id ON hr_public.task_audit_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_task_audit_user_id ON hr_public.task_audit_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_task_audit_timestamp ON hr_public.task_audit_entries(timestamp DESC);

-- Non-conditional index for PostGraphile orderBy enum generation
CREATE INDEX IF NOT EXISTS idx_task_audit_entries_timestamp_order ON hr_public.task_audit_entries(timestamp);

COMMENT ON TABLE hr_public.task_audit_entries IS 'Complete audit trail for all task changes';

-- Step 5: Create task dependencies table
CREATE TABLE IF NOT EXISTS hr_public.task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocking_task_id UUID NOT NULL REFERENCES hr_public.tasks(id) ON DELETE CASCADE,
  blocked_task_id UUID NOT NULL REFERENCES hr_public.tasks(id) ON DELETE CASCADE,
  dependency_type VARCHAR(50) DEFAULT 'blocks',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocking_task_id, blocked_task_id)
);

CREATE INDEX IF NOT EXISTS idx_task_dep_blocking ON hr_public.task_dependencies(blocking_task_id);
CREATE INDEX IF NOT EXISTS idx_task_dep_blocked ON hr_public.task_dependencies(blocked_task_id);

-- Non-conditional index for PostGraphile orderBy enum generation
CREATE INDEX IF NOT EXISTS idx_task_dependencies_created_at_order ON hr_public.task_dependencies(created_at);

-- Circular dependency prevention function
CREATE OR REPLACE FUNCTION hr_public.prevent_circular_dependencies()
RETURNS TRIGGER AS $$
DECLARE
  has_cycle BOOLEAN;
BEGIN
  WITH RECURSIVE dep_chain AS (
    SELECT NEW.blocking_task_id AS task_id, NEW.blocked_task_id AS depends_on
    UNION
    SELECT dc.task_id, td.blocked_task_id
    FROM dep_chain dc
    JOIN hr_public.task_dependencies td ON dc.depends_on = td.blocking_task_id
  )
  SELECT EXISTS(
    SELECT 1 FROM dep_chain
    WHERE task_id = depends_on
  ) INTO has_cycle;

  IF has_cycle THEN
    RAISE EXCEPTION 'Circular dependency detected';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'check_circular_dependencies' AND tgrelid = 'hr_public.task_dependencies'::regclass) THEN
    CREATE TRIGGER check_circular_dependencies
    BEFORE INSERT ON hr_public.task_dependencies
    FOR EACH ROW
    EXECUTE FUNCTION hr_public.prevent_circular_dependencies();
  END IF;
END
$$;

-- Step 6: Create linked resources table
CREATE TABLE IF NOT EXISTS hr_public.linked_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES hr_public.tasks(id) ON DELETE CASCADE,
  resource_type resource_type_enum NOT NULL,
  resource_id UUID NOT NULL,
  resource_title VARCHAR(255),
  availability_status availability_status_enum DEFAULT 'available',
  last_checked TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, resource_type, resource_id)
);

CREATE INDEX IF NOT EXISTS idx_linked_res_task ON hr_public.linked_resources(task_id);
CREATE INDEX IF NOT EXISTS idx_linked_res_resource ON hr_public.linked_resources(resource_type, resource_id);

-- Non-conditional index for PostGraphile orderBy enum generation
CREATE INDEX IF NOT EXISTS idx_linked_resources_created_at_order ON hr_public.linked_resources(created_at);

-- Step 7: Create RLS policies
ALTER TABLE hr_public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.task_audit_entries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS task_read_policy ON hr_public.tasks;
DROP POLICY IF EXISTS task_create_policy ON hr_public.tasks;
DROP POLICY IF EXISTS task_update_policy ON hr_public.tasks;
DROP POLICY IF EXISTS task_delete_policy ON hr_public.tasks;
DROP POLICY IF EXISTS audit_read_policy ON hr_public.task_audit_entries;
DROP POLICY IF EXISTS audit_insert_policy ON hr_public.task_audit_entries;

-- Task read policy
CREATE POLICY task_read_policy ON hr_public.tasks FOR SELECT
  USING (
    assignee_id = current_user_id()
    OR
    creator_id = current_user_id()
    OR
    current_user_role() >= 80  -- Admins can see all
  );

-- Task create policy
CREATE POLICY task_create_policy ON hr_public.tasks FOR INSERT
  WITH CHECK (
    creator_id = current_user_id()
    AND current_user_role() >= 20  -- At least Employee
  );

-- Task update policy
CREATE POLICY task_update_policy ON hr_public.tasks FOR UPDATE
  USING (
    creator_id = current_user_id()
    OR assignee_id = current_user_id()
    OR current_user_role() >= 80  -- Admins can update all
  );

-- Task delete (archive) policy
CREATE POLICY task_delete_policy ON hr_public.tasks FOR UPDATE
  USING (
    creator_id = current_user_id()
    OR current_user_role() >= 80
  )
  WITH CHECK (archived = TRUE);

-- Audit read policy
CREATE POLICY audit_read_policy ON hr_public.task_audit_entries FOR SELECT
  USING (
    task_id IN (SELECT id FROM hr_public.tasks)
  );

-- Audit insert policy
CREATE POLICY audit_insert_policy ON hr_public.task_audit_entries FOR INSERT
  WITH CHECK (true);

COMMENT ON POLICY task_read_policy ON hr_public.tasks IS 'Users can see tasks they created or are assigned to, admins see all';
COMMENT ON POLICY task_create_policy ON hr_public.tasks IS 'Anyone with Employee role or higher can create tasks';
COMMENT ON POLICY task_update_policy ON hr_public.tasks IS 'Users can update tasks they created or are assigned to, admins can update all';
COMMENT ON POLICY task_delete_policy ON hr_public.tasks IS 'Only creators and admins can archive tasks';
