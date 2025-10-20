-- Migration: Tasks System
-- Created: 2025-10-17
-- Description: tasks, task_types, task_assignees, task_dependencies, task_audit_entries

BEGIN;

-- ============================================================================
-- TASK_TYPES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_public.task_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(7),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    CONSTRAINT task_types_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT task_types_color_hex CHECK (color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$')
);

CREATE INDEX IF NOT EXISTS idx_task_types_name ON hr_public.task_types(name) WHERE deleted_at IS NULL;

COMMENT ON TABLE hr_public.task_types IS 'Task type categorization (e.g., Bug, Feature, Documentation, Research)';
COMMENT ON COLUMN hr_public.task_types.color IS 'Hex color code for UI rendering (e.g., #3B82F6)';

-- ============================================================================
-- TASKS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    task_type_id UUID REFERENCES hr_public.task_types(id) ON DELETE SET NULL,
    status hr_public.task_status NOT NULL DEFAULT 'todo',
    priority hr_public.task_priority NOT NULL DEFAULT 'medium',
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    estimated_hours INTEGER,
    actual_hours INTEGER,
    tags TEXT[],
    department_id UUID REFERENCES hr_public.departments(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE RESTRICT,
    assignee_id UUID REFERENCES hr_public.users(id) ON DELETE SET NULL,
    parent_task_id UUID REFERENCES hr_public.tasks(id) ON DELETE SET NULL,
    requires_manual_reassignment BOOLEAN DEFAULT FALSE,
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    archived_at TIMESTAMPTZ,
    archived_by UUID REFERENCES hr_public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    CONSTRAINT tasks_title_not_empty CHECK (LENGTH(TRIM(title)) > 0),
    CONSTRAINT tasks_estimated_hours_positive CHECK (estimated_hours IS NULL OR estimated_hours > 0),
    CONSTRAINT tasks_actual_hours_non_negative CHECK (actual_hours IS NULL OR actual_hours >= 0),
    CONSTRAINT tasks_completed_requires_timestamp CHECK (
        (status != 'done') OR (completed_at IS NOT NULL)
    ),
    CONSTRAINT tasks_archived_requires_timestamp CHECK (
        NOT archived OR archived_at IS NOT NULL
    )
);

CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON hr_public.tasks(created_by) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON hr_public.tasks(assignee_id) WHERE deleted_at IS NULL AND NOT archived;
CREATE INDEX IF NOT EXISTS idx_tasks_status ON hr_public.tasks(status) WHERE deleted_at IS NULL AND NOT archived;
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON hr_public.tasks(priority) WHERE deleted_at IS NULL AND NOT archived;
CREATE INDEX IF NOT EXISTS idx_tasks_department ON hr_public.tasks(department_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_task_type ON hr_public.tasks(task_type_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON hr_public.tasks(parent_task_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON hr_public.tasks(due_date) WHERE deleted_at IS NULL AND NOT archived AND status != 'done';
CREATE INDEX IF NOT EXISTS idx_tasks_archived ON hr_public.tasks(archived, archived_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_tags_gin ON hr_public.tasks USING GIN(tags) WHERE deleted_at IS NULL;

COMMENT ON TABLE hr_public.tasks IS 'Task management with status tracking, assignments, and dependencies';
COMMENT ON COLUMN hr_public.tasks.tags IS 'Array of string tags for categorization and filtering';
COMMENT ON COLUMN hr_public.tasks.requires_manual_reassignment IS 'If true, task reassignment requires manual approval';
COMMENT ON COLUMN hr_public.tasks.archived IS 'Archived tasks are hidden from active views but not deleted';

-- ============================================================================
-- TASK_ASSIGNEES TABLE (Multi-assignee support)
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_public.task_assignees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES hr_public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE RESTRICT,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    role VARCHAR(100),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    CONSTRAINT task_assignees_task_user_unique UNIQUE (task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_assignees_task ON hr_public.task_assignees(task_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_task_assignees_user ON hr_public.task_assignees(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_task_assignees_assigned_by ON hr_public.task_assignees(assigned_by) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_task_assignees_primary ON hr_public.task_assignees(task_id, is_primary) WHERE deleted_at IS NULL AND is_primary = TRUE;

COMMENT ON TABLE hr_public.task_assignees IS 'Multi-assignee junction table for tasks (supports multiple people on same task)';
COMMENT ON COLUMN hr_public.task_assignees.is_primary IS 'Primary assignee has main responsibility for the task';

-- ============================================================================
-- TASK_DEPENDENCIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_public.task_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES hr_public.tasks(id) ON DELETE CASCADE,
    depends_on_task_id UUID NOT NULL REFERENCES hr_public.tasks(id) ON DELETE CASCADE,
    dependency_type VARCHAR(50) NOT NULL DEFAULT 'blocks',
    is_hard_dependency BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    CONSTRAINT task_dependencies_unique UNIQUE (task_id, depends_on_task_id),
    CONSTRAINT task_dependencies_no_self_reference CHECK (task_id != depends_on_task_id),
    CONSTRAINT task_dependencies_type_valid CHECK (dependency_type IN ('blocks', 'relates_to', 'duplicates'))
);

CREATE INDEX IF NOT EXISTS idx_task_dependencies_task ON hr_public.task_dependencies(task_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends_on ON hr_public.task_dependencies(depends_on_task_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_task_dependencies_type ON hr_public.task_dependencies(dependency_type) WHERE deleted_at IS NULL;

COMMENT ON TABLE hr_public.task_dependencies IS 'Task dependency relationships (task X depends on task Y)';
COMMENT ON COLUMN hr_public.task_dependencies.is_hard_dependency IS 'Hard dependencies block task completion until resolved';
COMMENT ON COLUMN hr_public.task_dependencies.dependency_type IS 'blocks: task cannot start until dependency completes; relates_to: informational link; duplicates: marks as duplicate';

-- ============================================================================
-- TASK_AUDIT_ENTRIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS hr_public.task_audit_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES hr_public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE RESTRICT,
    action VARCHAR(50) NOT NULL,
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT task_audit_entries_action_valid CHECK (action IN (
        'created', 'updated', 'status_changed', 'assigned', 'unassigned',
        'priority_changed', 'commented', 'archived', 'unarchived', 'deleted'
    ))
);

CREATE INDEX IF NOT EXISTS idx_task_audit_task ON hr_public.task_audit_entries(task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_audit_user ON hr_public.task_audit_entries(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_audit_action ON hr_public.task_audit_entries(action);
CREATE INDEX IF NOT EXISTS idx_task_audit_created ON hr_public.task_audit_entries(created_at DESC);

COMMENT ON TABLE hr_public.task_audit_entries IS 'Immutable audit trail for all task changes';
COMMENT ON COLUMN hr_public.task_audit_entries.action IS 'Type of change: created, updated, status_changed, assigned, etc.';

COMMIT;
