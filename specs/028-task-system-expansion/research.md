# Phase 0: Research & Technical Decisions

**Feature**: Task System Expansion
**Date**: 2025-10-09
**Status**: Complete ✅

## Research Areas

### 1. Task Hierarchy & Dependency Management

**Decision**: Use adjacency list pattern with recursive CTEs for PostgreSQL

**Rationale**:
- PostgreSQL's recursive CTEs efficiently handle parent-child relationships
- Adjacency list (parent_id column) is simple and performant for hierarchies
- Separate `task_dependencies` junction table for many-to-many blocking relationships
- Prevents circular dependencies via database constraints and application logic

**Alternatives Considered**:
- Nested sets: Complex to maintain, overkill for our use case
- Materialized path: String-based, harder to enforce integrity
- Closure table: Requires additional junction table, more storage overhead

**Implementation Approach**:
```sql
-- Tasks table with self-referential parent_id
ALTER TABLE tasks ADD COLUMN parent_task_id UUID REFERENCES tasks(id);

-- Task dependencies for blocking relationships
CREATE TABLE task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocking_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  blocked_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  dependency_type VARCHAR(50) DEFAULT 'must_complete_before',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT no_self_dependency CHECK (blocking_task_id != blocked_task_id),
  CONSTRAINT unique_dependency UNIQUE (blocking_task_id, blocked_task_id)
);

-- Circular dependency prevention via trigger
CREATE OR REPLACE FUNCTION prevent_circular_dependencies()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    WITH RECURSIVE dep_chain AS (
      SELECT blocked_task_id, blocking_task_id FROM task_dependencies WHERE blocked_task_id = NEW.blocking_task_id
      UNION ALL
      SELECT dc.blocked_task_id, td.blocking_task_id
      FROM dep_chain dc
      JOIN task_dependencies td ON dc.blocking_task_id = td.blocked_task_id
    )
    SELECT 1 FROM dep_chain WHERE blocking_task_id = NEW.blocked_task_id
  ) THEN
    RAISE EXCEPTION 'Circular dependency detected';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

### 2. RBAC Permission Enforcement for Tasks

**Decision**: PostgreSQL RLS policies + server-side permission checks in `+page.server.ts`

**Rationale**:
- Row-Level Security enforces data access at database level (defense in depth)
- Server-side GraphQL operations in `+page.server.ts` enforce RBAC business logic
- JWT token contains user roles (Admin 100, HR 80, Manager 60, Employee 20)
- Manager-to-direct-report relationships queryable via existing employee hierarchy

**Alternatives Considered**:
- Application-only RBAC: Less secure, easier to bypass
- GraphQL resolver-level only: Doesn't protect direct SQL access
- Complex RLS policies: Harder to maintain, performance impact

**Implementation Approach**:
```sql
-- RLS policy for task read access
CREATE POLICY task_read_policy ON tasks FOR SELECT
USING (
  -- Employees see their own tasks
  assignee_id = current_user_id()
  OR
  -- Managers see their direct reports' tasks
  assignee_id IN (SELECT id FROM employees WHERE manager_id = current_user_id())
  OR
  -- Admins see all tasks
  current_user_role() >= 80
);

-- RLS policy for task creation
CREATE POLICY task_create_policy ON tasks FOR INSERT
WITH CHECK (
  -- Employees can only assign to themselves
  (current_user_role() = 20 AND assignee_id = current_user_id())
  OR
  -- Managers can assign to themselves or direct reports
  (current_user_role() >= 60 AND (
    assignee_id = current_user_id()
    OR assignee_id IN (SELECT id FROM employees WHERE manager_id = current_user_id())
  ))
  OR
  -- Admins can assign to anyone
  current_user_role() >= 80
);
```

**Server-Side Permission Checks** (`src/lib/server/permissions.ts`):
```typescript
export function canCreateTaskFor(currentUser: User, assigneeId: string): boolean {
  if (currentUser.role >= 80) return true; // Admin/HR
  if (currentUser.role >= 60) {
    // Manager: check if assignee is direct report
    return assigneeId === currentUser.id || isDirectReport(currentUser.id, assigneeId);
  }
  return assigneeId === currentUser.id; // Employee: only self
}
```

---

### 3. Audit Trail Design

**Decision**: Separate `task_audit_entries` table with JSONB for change tracking

**Rationale**:
- Standard audit level: action type, timestamp, user, changed fields, new values
- JSONB column for flexible change data storage
- Efficient querying with GIN indexes on JSONB fields
- Immutable audit records (INSERT only, no UPDATE/DELETE)

**Alternatives Considered**:
- Temporal tables (SQL:2011): PostgreSQL doesn't natively support, requires extensions
- Event sourcing: Overkill for this use case, adds complexity
- Simple change log: Less structured, harder to query

**Implementation Approach**:
```sql
CREATE TABLE task_audit_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL, -- 'created', 'edited', 'reassigned', 'deleted'
  changed_fields TEXT[], -- Array of field names that changed
  new_values JSONB NOT NULL, -- New values for changed fields
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- GIN index for JSONB querying
CREATE INDEX idx_audit_new_values ON task_audit_entries USING GIN (new_values);
```

**GraphQL Mutation Hook**:
```typescript
// Automatically create audit entry after task mutations
async function createAuditEntry(
  taskId: string,
  actionType: 'created' | 'edited' | 'reassigned' | 'deleted',
  changedFields: string[],
  newValues: Record<string, any>,
  userId: string
) {
  await client.mutation({
    createTaskAuditEntry: {
      __args: {
        input: {
          taskAuditEntry: {
            taskId,
            actionType,
            changedFields,
            newValues,
            userId,
            timestamp: new Date().toISOString()
          }
        }
      },
      taskAuditEntry: { id: true }
    }
  });
}
```

---

### 4. Task Reminder Notification System

**Decision**: node-cron scheduler with PostgreSQL task queue

**Rationale**:
- Existing event reminder system uses node-cron (consistency)
- PostgreSQL task queue for distributed processing
- Cron job runs every 15 minutes to check due dates
- Creates notification records via GraphQL mutations

**Alternatives Considered**:
- PostgreSQL pg_cron extension: Requires superuser privileges, Docker limitations
- Redis Queue (Bull/BullMQ): Adds dependency, overkill for simple reminders
- AWS EventBridge: Cloud-specific, adds external dependency

**Implementation Approach**:
```typescript
// src/lib/server/task-reminder-scheduler.ts
import cron from 'node-cron';
import { createTaskReminderNotifications } from './notifications';

// Run every 15 minutes
cron.schedule('*/15 * * * *', async () => {
  console.log('Running task reminder check...');

  // Find tasks with due dates in next 24 hours or 1 hour
  const tasksNeedingReminders = await fetchTasksDueWithinTimeframe([
    { hours: 24, sent: false },
    { hours: 1, sent: false }
  ]);

  for (const task of tasksNeedingReminders) {
    await createTaskReminderNotifications(task);
  }
});
```

---

### 5. Linked Resource Validation

**Decision**: Lazy validation with periodic background job

**Rationale**:
- Resource links checked on access (when user views task)
- Background job runs daily to mark unavailable resources
- Avoids performance impact on task operations
- Admin-only permission to fix/remove unavailable links

**Alternatives Considered**:
- Real-time validation: Too expensive, slows down all task operations
- Foreign key constraints: Not possible for polymorphic resource references
- Event-driven (resource deletion triggers): Complex cross-table dependencies

**Implementation Approach**:
```typescript
// Polymorphic resource reference
interface LinkedResource {
  id: string;
  taskId: string;
  resourceType: 'assessment' | 'document' | 'training';
  resourceId: string;
  resourceTitle: string;
  availabilityStatus: 'available' | 'unavailable';
  lastChecked: Date;
}

// Background validation job
async function validateLinkedResources() {
  const linkedResources = await fetchAllLinkedResources();

  for (const resource of linkedResources) {
    const exists = await checkResourceExists(resource.resourceType, resource.resourceId);

    if (!exists && resource.availabilityStatus === 'available') {
      await markResourceUnavailable(resource.id);
      await notifyAdminsOfBrokenLink(resource);
    }
  }
}
```

---

### 6. Organizational Change Handlers

**Decision**: Database triggers + application-level event handlers

**Rationale**:
- PostgreSQL triggers ensure data integrity at DB level
- Application handlers create notifications and audit entries
- Handles manager reassignment (transfer creator ownership) and employee deactivation (reassign tasks)

**Alternatives Considered**:
- Application-only: Risk of missed updates if direct DB access occurs
- Trigger-only: Can't send notifications or create complex audit entries
- Event sourcing: Overkill, adds complexity

**Implementation Approach**:
```sql
-- Trigger for employee deactivation
CREATE OR REPLACE FUNCTION handle_employee_deactivation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.active = FALSE AND OLD.active = TRUE THEN
    -- Reassign active tasks to manager (if exists)
    IF NEW.manager_id IS NOT NULL THEN
      UPDATE tasks
      SET assignee_id = NEW.manager_id,
          updated_at = NOW()
      WHERE assignee_id = NEW.id
        AND status != 'Completed'
        AND archived = FALSE;
    ELSE
      -- Mark as requiring manual reassignment
      UPDATE tasks
      SET requires_manual_reassignment = TRUE,
          updated_at = NOW()
      WHERE assignee_id = NEW.id
        AND status != 'Completed'
        AND archived = FALSE;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER employee_deactivation_trigger
AFTER UPDATE ON employees
FOR EACH ROW
EXECUTE FUNCTION handle_employee_deactivation();
```

**Application Event Handler**:
```typescript
// src/lib/server/organizational-change-handlers.ts
export async function handleEmployeeDeactivation(employeeId: string, managerId: string | null) {
  if (managerId) {
    // Notify manager of reassigned tasks
    const reassignedTasks = await fetchReassignedTasks(employeeId, managerId);
    for (const task of reassignedTasks) {
      await createNotification({
        recipientId: managerId,
        type: 'task_reassignment',
        message: `Task "${task.title}" reassigned to you due to employee deactivation`,
        taskId: task.id
      });

      // Create audit entry
      await createAuditEntry(task.id, 'reassigned', ['assignee_id'],
        { assignee_id: managerId }, 'SYSTEM');
    }
  } else {
    // Notify admins of orphaned tasks
    const orphanedTasks = await fetchOrphanedTasks(employeeId);
    await notifyAdminsOfOrphanedTasks(orphanedTasks);
  }
}
```

---

## Summary of Technical Decisions

| Area | Decision | Key Benefit |
|------|----------|-------------|
| Task Hierarchy | Adjacency list + recursive CTEs | Simple, performant, PostgreSQL-native |
| Dependencies | Separate junction table with constraints | Prevents circular dependencies |
| RBAC | PostgreSQL RLS + server-side checks | Defense in depth, multiple layers |
| Audit Trail | Separate table with JSONB | Flexible, queryable, immutable |
| Reminders | node-cron with 15-min intervals | Consistent with existing event system |
| Resource Validation | Lazy validation + background job | Avoids performance impact |
| Org Changes | Triggers + application handlers | Data integrity + notifications |

---

## Open Questions (Resolved)

✅ All technical questions resolved during specification clarification phase:
- Task hierarchy approach: Subtasks + dependencies
- Audit trail detail level: Standard (action, timestamp, user, changed fields, new values)
- Orphaned task handling: Mark for manual reassignment with admin notifications
- Custom task types: Admin-only creation
- Broken resource links: Mark as unavailable, admin can fix

---

**Phase 0 Status**: ✅ COMPLETE
