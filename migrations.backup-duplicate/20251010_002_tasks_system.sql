-- Migration: Complete Tasks System Setup
-- Date: 2025-10-10
-- Purpose: Consolidated tasks, task_types, task_audit_entries, task_dependencies, linked_resources

BEGIN;

-- ========================================
-- TASK_TYPES TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS hr_public.task_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  color VARCHAR(7),
  icon VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE hr_public.task_types IS 'Categorization of tasks (Bug, Feature, Chore, etc.)';

INSERT INTO hr_public.task_types (name, description, color, icon) VALUES
  ('Bug', 'Software bugs and defects', '#ef4444', 'bug'),
  ('Feature', 'New feature development', '#3b82f6', 'sparkles'),
  ('Chore', 'Maintenance and housekeeping', '#8b5cf6', 'wrench'),
  ('Documentation', 'Documentation tasks', '#10b981', 'book-open'),
  ('Research', 'Research and investigation', '#f59e0b', 'search')
ON CONFLICT (name) DO NOTHING;

-- ========================================
-- TASKS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS hr_public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  task_type_id UUID REFERENCES hr_public.task_types(id),
  status VARCHAR(50) NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'blocked', 'review', 'done', 'archived')),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date TIMESTAMPTZ,
  estimated_hours DECIMAL(5,2),
  actual_hours DECIMAL(5,2),
  created_by UUID NOT NULL REFERENCES hr_public.users(id),
  department_id UUID REFERENCES hr_public.departments(id),
  tags TEXT[],
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

COMMENT ON TABLE hr_public.tasks IS 'Task management system with assignments and dependencies';
COMMENT ON COLUMN hr_public.tasks.status IS 'Current task status: todo, in_progress, blocked, review, done, archived';
COMMENT ON COLUMN hr_public.tasks.priority IS 'Task priority level: low, medium, high, urgent';
COMMENT ON COLUMN hr_public.tasks.tags IS 'Flexible tagging system for categorization';
COMMENT ON COLUMN hr_public.tasks.metadata IS 'Additional flexible metadata in JSON format';

-- Indexes for tasks
CREATE INDEX idx_tasks_status ON hr_public.tasks(status);
CREATE INDEX idx_tasks_priority ON hr_public.tasks(priority);
CREATE INDEX idx_tasks_due_date ON hr_public.tasks(due_date);
CREATE INDEX idx_tasks_created_by ON hr_public.tasks(created_by);
CREATE INDEX idx_tasks_department ON hr_public.tasks(department_id);
CREATE INDEX idx_tasks_type ON hr_public.tasks(task_type_id);
CREATE INDEX idx_tasks_tags ON hr_public.tasks USING GIN(tags);
CREATE INDEX idx_tasks_metadata ON hr_public.tasks USING GIN(metadata);

-- Full-text search
CREATE INDEX idx_tasks_title_fulltext ON hr_public.tasks
USING GIN(to_tsvector('english', title));

CREATE INDEX idx_tasks_description_fulltext ON hr_public.tasks
USING GIN(to_tsvector('english', COALESCE(description, '')));

-- ========================================
-- TASK ASSIGNEES (Junction Table)
-- ========================================

CREATE TABLE IF NOT EXISTS hr_public.task_assignees (
  task_id UUID NOT NULL REFERENCES hr_public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by UUID REFERENCES hr_public.users(id),
  PRIMARY KEY (task_id, user_id)
);

COMMENT ON TABLE hr_public.task_assignees IS 'Many-to-many relationship between tasks and assigned users';

CREATE INDEX idx_task_assignees_user ON hr_public.task_assignees(user_id);
CREATE INDEX idx_task_assignees_assigned_by ON hr_public.task_assignees(assigned_by);

-- ========================================
-- TASK_AUDIT_ENTRIES TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS hr_public.task_audit_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES hr_public.tasks(id) ON DELETE CASCADE,
  changed_by UUID NOT NULL REFERENCES hr_public.users(id),
  change_type VARCHAR(50) NOT NULL,
  field_name VARCHAR(100),
  old_value JSONB,
  new_value JSONB,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE hr_public.task_audit_entries IS 'Immutable audit trail of all task changes';

CREATE INDEX idx_task_audit_task ON hr_public.task_audit_entries(task_id, changed_at DESC);
CREATE INDEX idx_task_audit_changed_by ON hr_public.task_audit_entries(changed_by);
CREATE INDEX idx_task_audit_change_type ON hr_public.task_audit_entries(change_type);

-- ========================================
-- TASK_DEPENDENCIES TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS hr_public.task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES hr_public.tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES hr_public.tasks(id) ON DELETE CASCADE,
  dependency_type VARCHAR(50) DEFAULT 'blocks' CHECK (dependency_type IN ('blocks', 'relates_to', 'duplicates')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (task_id, depends_on_task_id),
  CHECK (task_id != depends_on_task_id)
);

COMMENT ON TABLE hr_public.task_dependencies IS 'Task dependencies and relationships';
COMMENT ON COLUMN hr_public.task_dependencies.dependency_type IS 'blocks: must complete first, relates_to: related work, duplicates: duplicate task';

CREATE INDEX idx_task_deps_task ON hr_public.task_dependencies(task_id);
CREATE INDEX idx_task_deps_depends_on ON hr_public.task_dependencies(depends_on_task_id);

-- ========================================
-- LINKED_RESOURCES TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS hr_public.linked_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES hr_public.tasks(id) ON DELETE CASCADE,
  resource_type VARCHAR(50) NOT NULL CHECK (resource_type IN ('document', 'url', 'file', 'pr', 'issue')),
  resource_id VARCHAR(500) NOT NULL,
  title VARCHAR(255),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES hr_public.users(id)
);

COMMENT ON TABLE hr_public.linked_resources IS 'External resources linked to tasks (docs, files, URLs, PRs, etc.)';
COMMENT ON COLUMN hr_public.linked_resources.resource_type IS 'Type of resource: document, url, file, pr, issue';

CREATE INDEX idx_linked_resources_task ON hr_public.linked_resources(task_id);
CREATE INDEX idx_linked_resources_type ON hr_public.linked_resources(resource_type);

-- ========================================
-- TASK UPDATE TRIGGER
-- ========================================

CREATE OR REPLACE FUNCTION update_task_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  IF NEW.status = 'done' AND OLD.status != 'done' THEN
    NEW.completed_at = NOW();
  ELSIF NEW.status != 'done' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS task_update_timestamp_trigger ON hr_public.tasks;
CREATE TRIGGER task_update_timestamp_trigger
BEFORE UPDATE ON hr_public.tasks
FOR EACH ROW
EXECUTE FUNCTION update_task_timestamp();

-- ========================================
-- TASK AUDIT TRIGGER
-- ========================================

CREATE OR REPLACE FUNCTION audit_task_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO hr_public.task_audit_entries (task_id, changed_by, change_type, new_value)
    VALUES (NEW.id, NEW.created_by, 'created', to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status != OLD.status THEN
      INSERT INTO hr_public.task_audit_entries (task_id, changed_by, change_type, field_name, old_value, new_value)
      VALUES (NEW.id, NEW.created_by, 'updated', 'status', to_jsonb(OLD.status), to_jsonb(NEW.status));
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO hr_public.task_audit_entries (task_id, changed_by, change_type, old_value)
    VALUES (OLD.id, OLD.created_by, 'deleted', to_jsonb(OLD));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS task_audit_trigger ON hr_public.tasks;
CREATE TRIGGER task_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON hr_public.tasks
FOR EACH ROW
EXECUTE FUNCTION audit_task_changes();

-- ========================================
-- ROW LEVEL SECURITY
-- ========================================

ALTER TABLE hr_public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.task_audit_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_public.linked_resources ENABLE ROW LEVEL SECURITY;

-- Tasks policies
DROP POLICY IF EXISTS tasks_select_policy ON hr_public.tasks;
CREATE POLICY tasks_select_policy ON hr_public.tasks
  FOR SELECT USING (
    created_by = current_setting('app.current_user_id', true)::UUID OR
    id IN (SELECT task_id FROM hr_public.task_assignees WHERE user_id = current_setting('app.current_user_id', true)::UUID) OR
    department_id IN (SELECT department_id FROM hr_public.users WHERE id = current_setting('app.current_user_id', true)::UUID)
  );

DROP POLICY IF EXISTS tasks_insert_policy ON hr_public.tasks;
CREATE POLICY tasks_insert_policy ON hr_public.tasks
  FOR INSERT WITH CHECK (created_by = current_setting('app.current_user_id', true)::UUID);

DROP POLICY IF EXISTS tasks_update_policy ON hr_public.tasks;
CREATE POLICY tasks_update_policy ON hr_public.tasks
  FOR UPDATE USING (
    created_by = current_setting('app.current_user_id', true)::UUID OR
    id IN (SELECT task_id FROM hr_public.task_assignees WHERE user_id = current_setting('app.current_user_id', true)::UUID)
  );

-- Assignees policies
DROP POLICY IF EXISTS task_assignees_policy ON hr_public.task_assignees;
CREATE POLICY task_assignees_policy ON hr_public.task_assignees
  FOR ALL USING (
    task_id IN (SELECT id FROM hr_public.tasks WHERE created_by = current_setting('app.current_user_id', true)::UUID) OR
    user_id = current_setting('app.current_user_id', true)::UUID
  );

COMMIT;
