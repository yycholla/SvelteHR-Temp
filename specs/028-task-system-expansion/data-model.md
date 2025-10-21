# Data Model: Task System Expansion

**Feature**: Task System Expansion
**Date**: 2025-10-09
**Status**: Complete ✅

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                           TASKS                                  │
├─────────────────────────────────────────────────────────────────┤
│ id                            UUID PK                            │
│ title                         VARCHAR(255) NOT NULL              │
│ description                   TEXT                               │
│ assignee_id                   UUID FK → users(id) NOT NULL       │
│ creator_id                    UUID FK → users(id) NOT NULL       │
│ task_type_id                  UUID FK → task_types(id) NOT NULL  │
│ status                        task_status_enum NOT NULL          │
│ priority                      task_priority_enum NOT NULL        │
│ due_date                      TIMESTAMPTZ NULL                   │
│ parent_task_id                UUID FK → tasks(id) NULL           │
│ archived                      BOOLEAN DEFAULT FALSE              │
│ archived_at                   TIMESTAMPTZ NULL                   │
│ archived_by                   UUID FK → users(id) NULL           │
│ requires_manual_reassignment  BOOLEAN DEFAULT FALSE              │
│ created_at                    TIMESTAMPTZ DEFAULT NOW()          │
│ updated_at                    TIMESTAMPTZ DEFAULT NOW()          │
└─────────────────────────────────────────────────────────────────┘
         │                  │                    │
         │                  │                    │
         ▼                  ▼                    ▼
┌───────────────────┐  ┌──────────────────┐  ┌────────────────────┐
│ TASK_AUDIT_ENTRIES│  │ LINKED_RESOURCES │  │ TASK_DEPENDENCIES  │
├───────────────────┤  ├──────────────────┤  ├────────────────────┤
│ id            UUID PK  │ id         UUID PK  │ id           UUID PK
│ task_id       UUID FK  │ task_id    UUID FK  │ blocking_task_id UUID FK
│ action_type   VARCHAR  │ resource_type ENUM  │ blocked_task_id  UUID FK
│ changed_fields TEXT[]  │ resource_id   UUID  │ dependency_type  VARCHAR
│ new_values    JSONB    │ resource_title TEXT │ created_at    TIMESTAMPTZ
│ user_id       UUID FK  │ availability_status │
│ timestamp   TIMESTAMPTZ│ last_checked TIMESTAMPTZ
└───────────────────┘  └──────────────────┘  └────────────────────┘

┌─────────────────────┐
│    TASK_TYPES       │
├─────────────────────┤
│ id             UUID PK
│ name      VARCHAR(100) UNIQUE
│ description    TEXT
│ created_at  TIMESTAMPTZ
│ created_by  UUID FK → users(id)
└─────────────────────┘
```

## Enumerated Types

### task_status_enum
```sql
CREATE TYPE task_status_enum AS ENUM (
  'To Do',
  'In Progress',
  'Blocked',
  'Deferred',
  'Completed'
);
```

### task_priority_enum
```sql
CREATE TYPE task_priority_enum AS ENUM (
  'Low',
  'Medium',
  'High',
  'Urgent'
);
```

### resource_type_enum
```sql
CREATE TYPE resource_type_enum AS ENUM (
  'assessment',
  'document',
  'training',
  'event',
  'other'
);
```

### availability_status_enum
```sql
CREATE TYPE availability_status_enum AS ENUM (
  'available',
  'unavailable'
);
```

### audit_action_type_enum
```sql
CREATE TYPE audit_action_type_enum AS ENUM (
  'created',
  'edited',
  'reassigned',
  'deleted',
  'status_changed',
  'org_change'
);
```

## Database Schema

### tasks Table

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  assignee_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  task_type_id UUID NOT NULL REFERENCES task_types(id) ON DELETE RESTRICT,
  status task_status_enum NOT NULL DEFAULT 'To Do',
  priority task_priority_enum NOT NULL DEFAULT 'Medium',
  due_date TIMESTAMPTZ NULL,
  parent_task_id UUID NULL REFERENCES tasks(id) ON DELETE CASCADE,
  archived BOOLEAN DEFAULT FALSE,
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  requires_manual_reassignment BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT task_archived_check CHECK (
    (archived = FALSE AND archived_at IS NULL AND archived_by IS NULL)
    OR
    (archived = TRUE AND archived_at IS NOT NULL AND archived_by IS NOT NULL)
  )
);

-- Indexes
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id) WHERE archived = FALSE;
CREATE INDEX idx_tasks_creator ON tasks(creator_id);
CREATE INDEX idx_tasks_type ON tasks(task_type_id);
CREATE INDEX idx_tasks_status ON tasks(status) WHERE archived = FALSE;
CREATE INDEX idx_tasks_priority ON tasks(priority) WHERE archived = FALSE;
CREATE INDEX idx_tasks_due_date ON tasks(due_date) WHERE due_date IS NOT NULL AND archived = FALSE;
CREATE INDEX idx_tasks_parent ON tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;
CREATE INDEX idx_tasks_orphaned ON tasks(assignee_id) WHERE requires_manual_reassignment = TRUE;

-- Updated timestamp trigger
CREATE TRIGGER tasks_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

### task_types Table

```sql
CREATE TABLE task_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  is_system BOOLEAN DEFAULT FALSE, -- TRUE for predefined types (Onboarding, Assessment, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NULL REFERENCES users(id) ON DELETE SET NULL
);

-- Seed predefined task types
INSERT INTO task_types (name, description, is_system) VALUES
  ('General', 'General purpose task', TRUE),
  ('Onboarding', 'Tasks related to employee onboarding', TRUE),
  ('Assessment', 'Performance assessment related tasks', TRUE),
  ('Training', 'Training and development tasks', TRUE);

-- Index
CREATE INDEX idx_task_types_name ON task_types(name);
```

### task_audit_entries Table

```sql
CREATE TABLE task_audit_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  action_type audit_action_type_enum NOT NULL,
  changed_fields TEXT[] NOT NULL DEFAULT '{}',
  new_values JSONB NOT NULL DEFAULT '{}',
  user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT audit_entry_has_data CHECK (
    (action_type = 'created' AND changed_fields = '{}')
    OR
    (action_type != 'created' AND array_length(changed_fields, 1) > 0)
  )
);

-- Indexes
CREATE INDEX idx_audit_task ON task_audit_entries(task_id);
CREATE INDEX idx_audit_timestamp ON task_audit_entries(timestamp DESC);
CREATE INDEX idx_audit_user ON task_audit_entries(user_id);
CREATE INDEX idx_audit_new_values ON task_audit_entries USING GIN (new_values);
```

### task_dependencies Table

```sql
CREATE TABLE task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocking_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  blocked_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  dependency_type VARCHAR(50) DEFAULT 'must_complete_before',
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT no_self_dependency CHECK (blocking_task_id != blocked_task_id),
  CONSTRAINT unique_dependency UNIQUE (blocking_task_id, blocked_task_id)
);

-- Indexes
CREATE INDEX idx_dependencies_blocking ON task_dependencies(blocking_task_id);
CREATE INDEX idx_dependencies_blocked ON task_dependencies(blocked_task_id);

-- Circular dependency prevention trigger
CREATE OR REPLACE FUNCTION prevent_circular_dependencies()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    WITH RECURSIVE dep_chain AS (
      SELECT blocked_task_id, blocking_task_id
      FROM task_dependencies
      WHERE blocked_task_id = NEW.blocking_task_id

      UNION ALL

      SELECT dc.blocked_task_id, td.blocking_task_id
      FROM dep_chain dc
      JOIN task_dependencies td ON dc.blocking_task_id = td.blocked_task_id
    )
    SELECT 1 FROM dep_chain WHERE blocking_task_id = NEW.blocked_task_id
  ) THEN
    RAISE EXCEPTION 'Circular dependency detected between tasks % and %',
      NEW.blocking_task_id, NEW.blocked_task_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_circular_dependencies
BEFORE INSERT ON task_dependencies
FOR EACH ROW
EXECUTE FUNCTION prevent_circular_dependencies();
```

### linked_resources Table

```sql
CREATE TABLE linked_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  resource_type resource_type_enum NOT NULL,
  resource_id UUID NOT NULL,
  resource_title VARCHAR(255) NOT NULL,
  availability_status availability_status_enum DEFAULT 'available',
  last_checked TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Composite unique constraint to prevent duplicate links
  CONSTRAINT unique_task_resource UNIQUE (task_id, resource_type, resource_id)
);

-- Indexes
CREATE INDEX idx_linked_resources_task ON linked_resources(task_id);
CREATE INDEX idx_linked_resources_type ON linked_resources(resource_type, resource_id);
CREATE INDEX idx_linked_resources_status ON linked_resources(availability_status)
  WHERE availability_status = 'unavailable';
```

## Row-Level Security (RLS) Policies

### tasks RLS Policies

```sql
-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Read policy: Users can read tasks assigned to them, or their direct reports (managers), or all (admins)
CREATE POLICY task_read_policy ON tasks FOR SELECT
USING (
  assignee_id = current_setting('app.current_user_id')::UUID
  OR
  (
    current_setting('app.current_user_role')::INTEGER >= 60
    AND assignee_id IN (
      SELECT id FROM users
      WHERE manager_id = current_setting('app.current_user_id')::UUID
    )
  )
  OR
  current_setting('app.current_user_role')::INTEGER >= 80
);

-- Create policy: Users can create tasks based on RBAC rules
CREATE POLICY task_create_policy ON tasks FOR INSERT
WITH CHECK (
  creator_id = current_setting('app.current_user_id')::UUID
  AND
  (
    -- Employees: only self-assign
    (
      current_setting('app.current_user_role')::INTEGER = 20
      AND assignee_id = current_setting('app.current_user_id')::UUID
    )
    OR
    -- Managers: self or direct reports
    (
      current_setting('app.current_user_role')::INTEGER >= 60
      AND (
        assignee_id = current_setting('app.current_user_id')::UUID
        OR assignee_id IN (
          SELECT id FROM users
          WHERE manager_id = current_setting('app.current_user_id')::UUID
        )
      )
    )
    OR
    -- Admins: anyone
    current_setting('app.current_user_role')::INTEGER >= 80
  )
);

-- Update policy: Creators and assignees can edit
CREATE POLICY task_update_policy ON tasks FOR UPDATE
USING (
  creator_id = current_setting('app.current_user_id')::UUID
  OR assignee_id = current_setting('app.current_user_id')::UUID
);

-- Delete policy: Creators and admins can archive
CREATE POLICY task_delete_policy ON tasks FOR UPDATE
USING (
  creator_id = current_setting('app.current_user_id')::UUID
  OR current_setting('app.current_user_role')::INTEGER >= 80
)
WITH CHECK (archived = TRUE);
```

### task_audit_entries RLS Policies

```sql
-- Enable RLS
ALTER TABLE task_audit_entries ENABLE ROW LEVEL SECURITY;

-- Read policy: Can read audit entries for tasks they can read
CREATE POLICY audit_read_policy ON task_audit_entries FOR SELECT
USING (
  task_id IN (SELECT id FROM tasks)
);

-- Insert policy: System only (enforced by application)
CREATE POLICY audit_insert_policy ON task_audit_entries FOR INSERT
WITH CHECK (true); -- Application controls this
```

## TypeScript Types

```typescript
// src/lib/types/task.ts

export type TaskStatus = 'To Do' | 'In Progress' | 'Blocked' | 'Deferred' | 'Completed';

export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export type ResourceType = 'assessment' | 'document' | 'training' | 'event' | 'other';

export type AvailabilityStatus = 'available' | 'unavailable';

export type AuditActionType = 'created' | 'edited' | 'reassigned' | 'deleted' | 'status_changed' | 'org_change';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  assigneeId: string;
  creatorId: string;
  taskTypeId: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Date | null;
  parentTaskId: string | null;
  archived: boolean;
  archivedAt: Date | null;
  archivedBy: string | null;
  requiresManualReassignment: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Populated relationships
  assignee?: User;
  creator?: User;
  taskType?: TaskType;
  parentTask?: Task;
  subtasks?: Task[];
  linkedResources?: LinkedResource[];
  auditEntries?: TaskAuditEntry[];
  blockingTasks?: TaskDependency[];
  blockedByTasks?: TaskDependency[];
}

export interface TaskType {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  createdAt: Date;
  createdBy: string | null;
}

export interface TaskAuditEntry {
  id: string;
  taskId: string;
  actionType: AuditActionType;
  changedFields: string[];
  newValues: Record<string, any>;
  userId: string | null;
  timestamp: Date;

  // Populated relationships
  user?: User;
}

export interface TaskDependency {
  id: string;
  blockingTaskId: string;
  blockedTaskId: string;
  dependencyType: string;
  createdAt: Date;

  // Populated relationships
  blockingTask?: Task;
  blockedTask?: Task;
}

export interface LinkedResource {
  id: string;
  taskId: string;
  resourceType: ResourceType;
  resourceId: string;
  resourceTitle: string;
  availabilityStatus: AvailabilityStatus;
  lastChecked: Date;
  createdAt: Date;
}
```

## Validation Rules (Zod Schemas)

```typescript
// src/lib/schemas/task.ts
import { z } from 'zod';

export const taskStatusSchema = z.enum(['To Do', 'In Progress', 'Blocked', 'Deferred', 'Completed']);

export const taskPrioritySchema = z.enum(['Low', 'Medium', 'High', 'Urgent']);

export const createTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  assigneeId: z.string().uuid(),
  taskTypeId: z.string().uuid(),
  status: taskStatusSchema.default('To Do'),
  priority: taskPrioritySchema.default('Medium'),
  dueDate: z.date().optional(),
  parentTaskId: z.string().uuid().optional(),
  linkedResources: z.array(z.object({
    resourceType: z.enum(['assessment', 'document', 'training', 'event', 'other']),
    resourceId: z.string().uuid(),
    resourceTitle: z.string()
  })).optional()
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  assigneeId: z.string().uuid().optional(),
  taskTypeId: z.string().uuid().optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  dueDate: z.date().nullable().optional(),
  parentTaskId: z.string().uuid().nullable().optional()
});

export const createTaskDependencySchema = z.object({
  blockingTaskId: z.string().uuid(),
  blockedTaskId: z.string().uuid()
}).refine(
  (data) => data.blockingTaskId !== data.blockedTaskId,
  { message: 'A task cannot depend on itself' }
);
```

---

**Data Model Status**: ✅ COMPLETE
