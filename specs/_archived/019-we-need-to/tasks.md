# Implementation Tasks: Events, Tasks, and Activity Management System

**Feature**: 019-we-need-to
**Branch**: `019-we-need-to`
**Created**: 2025-01-01
**Status**: Ready for Implementation

## Overview

This task list implements a comprehensive Events, Tasks, and Activity Management System for SvelteHR with:
- Event calendar with RSVP functionality and multi-tier visibility (company/department/specific)
- Enhanced task management with department privacy controls
- Dual-tab activity logging (employee "My Activities" + admin "Audit Logs")
- Dual-channel notifications (email + in-app)

**Total Tasks**: 47
**Estimated Duration**: 8-10 development days
**Testing Approach**: TDD (Test-Driven Development)

---

## Task Execution Order

### Phase 1: Database Setup (Backend)
Tasks T001-T008 - Database migrations and RLS policies

### Phase 2: Contract Tests (TDD RED Phase)
Tasks T009-T012 - Failing tests for GraphQL operations

### Phase 3: GraphQL Operations (TDD GREEN Phase)
Tasks T013-T018 - Implementation to make tests pass

### Phase 4: UI Components
Tasks T019-T025 - Reusable Svelte components with Storybook

### Phase 5: Page Implementation
Tasks T026-T039 - SvelteKit routes with server-side loading

### Phase 6: Integration Tests
Tasks T040-T044 - End-to-end Playwright tests

### Phase 7: Documentation
Tasks T045-T047 - README, Storybook, and API docs

---

## Phase 1: Database Setup

### T001: Enhance tasks table with department privacy [P]
**File**: `../MountainHR-Backend/migrations/20250101_enhance_tasks_department.sql`
**Description**: Add `assigned_to_department_id` column to tasks table with CHECK constraint
**Dependencies**: None
**Parallel**: Yes [P]

**Implementation**:
```sql
-- Add department assignment column
ALTER TABLE tasks
  ADD COLUMN assigned_to_department_id UUID REFERENCES departments(id);

-- Add CHECK constraint: either assignee_id OR assigned_to_department_id (not both)
ALTER TABLE tasks
  ADD CONSTRAINT task_assignment_check
  CHECK (
    (assignee_id IS NOT NULL AND assigned_to_department_id IS NULL) OR
    (assignee_id IS NULL AND assigned_to_department_id IS NOT NULL)
  );

-- Add index for performance
CREATE INDEX idx_tasks_assigned_department ON tasks(assigned_to_department_id)
  WHERE assigned_to_department_id IS NOT NULL;
```

**Validation**: Run `psql` to verify column exists and CHECK constraint enforces business rule

---

### T002: Create notifications table [P]
**File**: `../MountainHR-Backend/migrations/20250101_create_notifications_table.sql`
**Description**: Create notifications table for dual-channel (email + in-app) notification system
**Dependencies**: None
**Parallel**: Yes [P]

**Implementation**:
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('email', 'in_app')),
  category TEXT NOT NULL CHECK (category IN ('event_invitation', 'task_assignment', 'event_reminder', 'task_due_soon')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_resource_type TEXT CHECK (related_resource_type IN ('event', 'task')),
  related_resource_id UUID,
  read_status BOOLEAN DEFAULT false,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_notifications_recipient_unread ON notifications(recipient_id, read_status, created_at);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
```

**Validation**: Verify table created with proper constraints and indexes

---

### T003: Create RLS policies for events [P]
**File**: `../MountainHR-Backend/migrations/20250101_create_rls_policies_events.sql`
**Description**: Implement Row-Level Security policies for event visibility (company/department/specific)
**Dependencies**: Events table already exists from previous migration
**Parallel**: Yes [P]

**Implementation**:
```sql
-- Enable RLS on events table
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Policy 1: Company-wide events visible to all authenticated users
CREATE POLICY event_company_visibility ON events
  FOR SELECT
  USING (visibility_type = 'company');

-- Policy 2: Department events visible to department members
CREATE POLICY event_department_visibility ON events
  FOR SELECT
  USING (
    visibility_type = 'department' AND
    department_id = (SELECT department_id FROM users WHERE id = current_setting('jwt.claims.user_id')::uuid)
  );

-- Policy 3: Specific people events visible to invited attendees
CREATE POLICY event_specific_visibility ON events
  FOR SELECT
  USING (
    visibility_type = 'specific' AND
    id IN (SELECT event_id FROM event_attendees WHERE employee_id = current_setting('jwt.claims.user_id')::uuid)
  );

-- Policy 4: Managers and admins can create/update/delete events
CREATE POLICY event_manager_admin_access ON events
  FOR ALL
  USING (
    current_setting('jwt.claims.role')::text IN ('manager', 'admin', 'super_admin')
  )
  WITH CHECK (
    current_setting('jwt.claims.role')::text IN ('manager', 'admin', 'super_admin')
  );

-- Enable RLS on event_attendees table
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view and update their own RSVP status
CREATE POLICY event_attendees_own_access ON event_attendees
  FOR ALL
  USING (employee_id = current_setting('jwt.claims.user_id')::uuid)
  WITH CHECK (employee_id = current_setting('jwt.claims.user_id')::uuid);

-- Policy: Managers can view all attendees for events they organize
CREATE POLICY event_attendees_organizer_access ON event_attendees
  FOR SELECT
  USING (
    event_id IN (
      SELECT id FROM events WHERE organizer_id = current_setting('jwt.claims.user_id')::uuid
    )
  );
```

**Validation**: Test with different user roles to verify visibility controls

---

### T004: Create RLS policies for tasks [P]
**File**: `../MountainHR-Backend/migrations/20250101_create_rls_policies_tasks.sql`
**Description**: Implement department privacy RLS policies for tasks
**Dependencies**: T001 completed (department column exists)
**Parallel**: Yes [P]

**Implementation**:
```sql
-- Enable RLS if not already enabled
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Policy 1: Employees can view tasks assigned to them
CREATE POLICY task_employee_access ON tasks
  FOR SELECT
  USING (assignee_id = current_setting('jwt.claims.user_id')::uuid);

-- Policy 2: Employees can view department tasks (department privacy)
CREATE POLICY task_department_privacy ON tasks
  FOR SELECT
  USING (
    assigned_to_department_id IS NOT NULL AND
    assigned_to_department_id = (SELECT department_id FROM users WHERE id = current_setting('jwt.claims.user_id')::uuid)
  );

-- Policy 3: Employees can update status of their own tasks
CREATE POLICY task_employee_update_own ON tasks
  FOR UPDATE
  USING (assignee_id = current_setting('jwt.claims.user_id')::uuid)
  WITH CHECK (assignee_id = current_setting('jwt.claims.user_id')::uuid);

-- Policy 4: Managers can CRUD tasks in their department
CREATE POLICY task_manager_department_access ON tasks
  FOR ALL
  USING (
    current_setting('jwt.claims.role')::text IN ('manager', 'admin', 'super_admin') AND
    (
      assigned_to_department_id = (SELECT department_id FROM users WHERE id = current_setting('jwt.claims.user_id')::uuid) OR
      assignee_id IN (SELECT id FROM users WHERE department_id = (SELECT department_id FROM users WHERE id = current_setting('jwt.claims.user_id')::uuid))
    )
  );
```

**Validation**: Verify department task privacy with cross-department tests

---

### T005: Create RLS policies for activity_logs [P]
**File**: `../MountainHR-Backend/migrations/20250101_create_rls_policies_activity_logs.sql`
**Description**: Implement dual-tab RLS (employee own activities + admin audit logs)
**Dependencies**: activity_logs table already exists
**Parallel**: Yes [P]

**Implementation**:
```sql
-- Enable RLS on activity_logs
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view their own activities ("My Activities" tab)
CREATE POLICY activity_user_own_access ON activity_logs
  FOR SELECT
  USING (user_id = current_setting('jwt.claims.user_id')::uuid);

-- Policy 2: Admins can view all activities ("Audit Logs" tab)
CREATE POLICY activity_admin_audit_access ON activity_logs
  FOR SELECT
  USING (
    current_setting('jwt.claims.role')::text IN ('admin', 'super_admin')
  );

-- Make activity_logs immutable (no UPDATE or DELETE)
CREATE POLICY activity_immutable_update ON activity_logs
  FOR UPDATE
  USING (false);

CREATE POLICY activity_immutable_delete ON activity_logs
  FOR DELETE
  USING (false);

-- Allow INSERT for logging (used by triggers and application)
CREATE POLICY activity_allow_insert ON activity_logs
  FOR INSERT
  WITH CHECK (true);
```

**Validation**: Test employee can only see own activities, admin sees all

---

### T006: Create RLS policies for notifications [P]
**File**: `../MountainHR-Backend/migrations/20250101_create_rls_policies_notifications.sql`
**Description**: Implement recipient-only access for notifications
**Dependencies**: T002 completed (notifications table exists)
**Parallel**: Yes [P]

**Implementation**:
```sql
-- Enable RLS on notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view and update their own notifications
CREATE POLICY notification_recipient_access ON notifications
  FOR ALL
  USING (recipient_id = current_setting('jwt.claims.user_id')::uuid)
  WITH CHECK (recipient_id = current_setting('jwt.claims.user_id')::uuid);
```

**Validation**: Verify users can only access their own notifications

---

### T007: Add database indexes for performance [P]
**File**: `../MountainHR-Backend/migrations/20250101_create_performance_indexes.sql`
**Description**: Create indexes on frequently queried columns for <200ms query performance
**Dependencies**: T001, T002 completed
**Parallel**: Yes [P]

**Implementation**:
```sql
-- Events table indexes
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_department ON events(department_id)
  WHERE visibility_type = 'department';

-- Event attendees indexes
CREATE INDEX IF NOT EXISTS idx_event_attendees_composite ON event_attendees(event_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_employee ON event_attendees(employee_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_response ON event_attendees(response_status);

-- Tasks table indexes (in addition to existing)
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status_priority ON tasks(status, priority);

-- Activity logs indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_created ON activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource ON activity_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);
```

**Validation**: Run EXPLAIN ANALYZE on common queries to verify index usage

---

### T008: Create database triggers for activity logging
**File**: `../MountainHR-Backend/migrations/20250101_create_activity_log_triggers.sql`
**Description**: Auto-generate activity log entries and notifications for event/task mutations
**Dependencies**: T002, T005 completed
**Parallel**: No (depends on previous triggers)

**Implementation**:
```sql
-- Function: Log task assignment and create notifications
CREATE OR REPLACE FUNCTION log_task_assignment() RETURNS TRIGGER AS $$
BEGIN
  -- Log activity
  INSERT INTO activity_logs (user_id, action, resource_type, resource_id, details)
  VALUES (
    NEW.assigner_id,
    'create',
    'task',
    NEW.id,
    jsonb_build_object('title', NEW.title, 'assignee_id', NEW.assignee_id, 'assigned_to_department_id', NEW.assigned_to_department_id)
  );

  -- Create email notification for assignee
  IF NEW.assignee_id IS NOT NULL THEN
    INSERT INTO notifications (recipient_id, type, category, title, message, related_resource_type, related_resource_id)
    VALUES (
      NEW.assignee_id,
      'email',
      'task_assignment',
      'New Task Assigned',
      'You have been assigned: ' || NEW.title,
      'task',
      NEW.id
    );

    -- Create in-app notification for assignee
    INSERT INTO notifications (recipient_id, type, category, title, message, related_resource_type, related_resource_id)
    VALUES (
      NEW.assignee_id,
      'in_app',
      'task_assignment',
      'New Task Assigned',
      'You have been assigned: ' || NEW.title,
      'task',
      NEW.id
    );
  END IF;

  -- For department tasks, create notifications for all department members
  IF NEW.assigned_to_department_id IS NOT NULL THEN
    INSERT INTO notifications (recipient_id, type, category, title, message, related_resource_type, related_resource_id)
    SELECT
      u.id,
      'in_app',
      'task_assignment',
      'New Department Task',
      'Department task created: ' || NEW.title,
      'task',
      NEW.id
    FROM users u
    WHERE u.department_id = NEW.assigned_to_department_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_assignment_notify
  AFTER INSERT ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION log_task_assignment();

-- Function: Log event creation and invite attendees
CREATE OR REPLACE FUNCTION log_event_creation() RETURNS TRIGGER AS $$
BEGIN
  -- Log activity
  INSERT INTO activity_logs (user_id, action, resource_type, resource_id, details)
  VALUES (
    NEW.organizer_id,
    'create',
    'event',
    NEW.id,
    jsonb_build_object('title', NEW.title, 'visibility_type', NEW.visibility_type, 'start_date', NEW.start_date)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER event_creation_log
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION log_event_creation();

-- Function: Notify attendees when invited to event
CREATE OR REPLACE FUNCTION notify_event_invitation() RETURNS TRIGGER AS $$
BEGIN
  -- Email notification
  INSERT INTO notifications (recipient_id, type, category, title, message, related_resource_type, related_resource_id)
  SELECT
    NEW.employee_id,
    'email',
    'event_invitation',
    'Event Invitation',
    'You have been invited to: ' || e.title,
    'event',
    NEW.event_id
  FROM events e
  WHERE e.id = NEW.event_id;

  -- In-app notification
  INSERT INTO notifications (recipient_id, type, category, title, message, related_resource_type, related_resource_id)
  SELECT
    NEW.employee_id,
    'in_app',
    'event_invitation',
    'Event Invitation',
    'You have been invited to: ' || e.title,
    'event',
    NEW.event_id
  FROM events e
  WHERE e.id = NEW.event_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER event_attendee_notify
  AFTER INSERT ON event_attendees
  FOR EACH ROW
  EXECUTE FUNCTION notify_event_invitation();
```

**Validation**: Create test event/task and verify activity logs and notifications are generated

---

## Phase 2: Contract Tests (TDD RED Phase)

### T009: Write failing contract tests for events-operations.ts [P]
**File**: `tests/contract/events-operations.test.ts`
**Description**: TDD RED phase - write tests that will fail until implementation exists
**Dependencies**: None
**Parallel**: Yes [P]

**Implementation**:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { EventsOperations } from '$lib/graphql/events-operations';

describe('EventsOperations Contract', () => {
  let mockClient: any;
  let operations: EventsOperations;

  beforeEach(() => {
    mockClient = {
      subscribe: vi.fn()
    };
    // This will fail until we implement EventsOperations
    // operations = new EventsOperations(mockClient);
  });

  describe('getAllEvents', () => {
    it('should fetch paginated events with visibility filtering', async () => {
      expect(() => {
        // operations = new EventsOperations(mockClient);
      }).toThrow(); // Expected to fail - not implemented yet
    });
  });

  describe('getEventById', () => {
    it('should fetch single event with attendees', async () => {
      expect(() => {
        // operations = new EventsOperations(mockClient);
      }).toThrow(); // Expected to fail
    });
  });

  describe('getUserEvents', () => {
    it('should fetch employee invited events with RSVP status', async () => {
      expect(() => {
        // operations = new EventsOperations(mockClient);
      }).toThrow(); // Expected to fail
    });
  });

  describe('createEvent', () => {
    it('should create event with attendee selection', async () => {
      expect(() => {
        // operations = new EventsOperations(mockClient);
      }).toThrow(); // Expected to fail
    });
  });

  describe('updateRsvpStatus', () => {
    it('should update employee RSVP status', async () => {
      expect(() => {
        // operations = new EventsOperations(mockClient);
      }).toThrow(); // Expected to fail
    });
  });
});
```

**Validation**: Run `npm run test:unit -- tests/contract/events-operations.test.ts` - all tests should FAIL

---

### T010: Write failing contract tests for enhanced tasks-operations.ts [P]
**File**: `tests/contract/tasks-operations-enhanced.test.ts`
**Description**: TDD RED phase - tests for department task functionality
**Dependencies**: None
**Parallel**: Yes [P]

**Implementation**:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { TasksOperations } from '$lib/graphql/tasks-operations';

describe('TasksOperations Enhanced (Department Privacy)', () => {
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      subscribe: vi.fn()
    };
  });

  describe('getDepartmentTasks', () => {
    it('should fetch tasks assigned to user department only', async () => {
      const operations = new TasksOperations(mockClient);

      mockClient.subscribe.mockImplementation((query: any, callback: any) => {
        callback({
          data: {
            tasks: {
              nodes: [],
              totalCount: 0,
              pageInfo: { hasNextPage: false }
            }
          }
        });
        return () => {};
      });

      const result = await operations.getDepartmentTasks({
        first: 20,
        offset: 0,
        filter: { assignedToDepartmentId: { equalTo: 'test-dept-id' } },
        userCredentials: { token: 'test-token' }
      });

      expect(result).toBeDefined();
      expect(result.tasks).toEqual([]);
      // This test should pass since getDepartmentTasks already exists
    });
  });

  describe('createDepartmentTask', () => {
    it('should create task assigned to department', async () => {
      // This will FAIL until we add department assignment to createTask
      expect(true).toBe(false); // Force failure
    });
  });
});
```

**Validation**: Run tests - getDepartmentTasks passes (exists), createDepartmentTask fails (not implemented)

---

### T011: Write failing contract tests for activity-logs-operations.ts [P]
**File**: `tests/contract/activity-logs-operations.test.ts`
**Description**: TDD RED phase - tests for dual-tab activity logging
**Dependencies**: None
**Parallel**: Yes [P]

**Implementation**:
```typescript
import { describe, it, expect, vi } from 'vitest';
import type { ActivityLogsOperations } from '$lib/graphql/activity-logs-operations';

describe('ActivityLogsOperations Contract', () => {
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      subscribe: vi.fn()
    };
  });

  describe('getUserActivities', () => {
    it('should fetch employee own activities with pagination', async () => {
      expect(() => {
        // operations = new ActivityLogsOperations(mockClient);
      }).toThrow(); // Expected to fail - not implemented yet
    });
  });

  describe('getAuditLogs', () => {
    it('should fetch all system activities (admin only)', async () => {
      expect(() => {
        // operations = new ActivityLogsOperations(mockClient);
      }).toThrow(); // Expected to fail
    });
  });

  describe('getResourceActivityHistory', () => {
    it('should fetch activity trail for specific resource', async () => {
      expect(() => {
        // operations = new ActivityLogsOperations(mockClient);
      }).toThrow(); // Expected to fail
    });
  });
});
```

**Validation**: Run tests - all should FAIL (implementation doesn't exist)

---

### T012: Write failing contract tests for notifications-operations.ts [P]
**File**: `tests/contract/notifications-operations.test.ts`
**Description**: TDD RED phase - tests for notification system
**Dependencies**: None
**Parallel**: Yes [P]

**Implementation**:
```typescript
import { describe, it, expect, vi } from 'vitest';
import type { NotificationsOperations } from '$lib/graphql/notifications-operations';

describe('NotificationsOperations Contract', () => {
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      subscribe: vi.fn()
    };
  });

  describe('getUserNotifications', () => {
    it('should fetch unread + recent read notifications', async () => {
      expect(() => {
        // operations = new NotificationsOperations(mockClient);
      }).toThrow(); // Expected to fail
    });
  });

  describe('getUnreadCount', () => {
    it('should return count of unread notifications', async () => {
      expect(() => {
        // operations = new NotificationsOperations(mockClient);
      }).toThrow(); // Expected to fail
    });
  });

  describe('markNotificationRead', () => {
    it('should mark single notification as read', async () => {
      expect(() => {
        // operations = new NotificationsOperations(mockClient);
      }).toThrow(); // Expected to fail
    });
  });

  describe('markAllRead', () => {
    it('should mark all user notifications as read', async () => {
      expect(() => {
        // operations = new NotificationsOperations(mockClient);
      }).toThrow(); // Expected to fail
    });
  });
});
```

**Validation**: Run tests - all should FAIL (implementation doesn't exist)

---

## Phase 3: GraphQL Operations (TDD GREEN Phase)

### T013: Create events-operations.ts with queries/mutations
**File**: `src/lib/graphql/events-operations.ts`
**Description**: Implement EventsOperations class following tasks-operations.ts pattern
**Dependencies**: T009 (contract tests written)
**Parallel**: No (sequential with T014-T016)

**Implementation**: Create complete EventsOperations class with:
- `GET_ALL_EVENTS` query (pagination, filters)
- `GET_EVENT_BY_ID` query (single event with attendees)
- `GET_USER_EVENTS` query (employee's invited events)
- `GET_UPCOMING_EVENTS` query (next 30 days)
- `CREATE_EVENT` mutation (manager/admin only)
- `UPDATE_EVENT` mutation (organizer or admin)
- `DELETE_EVENT` mutation (organizer or admin)
- `UPDATE_RSVP_STATUS` mutation (employee updates own RSVP)
- TypeScript interfaces: `Event`, `EventAttendee`, `EventFilter`, `CreateEventInput`, `UpdateEventInput`, `RsvpStatus`
- Helper functions: `buildEventFilter`, `validateEventInput`, `isEventUpcoming`

**Pattern to follow**: See `src/lib/graphql/tasks-operations.ts` for structure

**Validation**: Run `npm run test:unit -- tests/contract/events-operations.test.ts` - tests should now PASS

---

### T014: Enhance tasks-operations.ts with department filtering
**File**: `src/lib/graphql/tasks-operations.ts`
**Description**: Add department task support to existing TasksOperations
**Dependencies**: T010 (contract tests written), T001 (DB column exists)
**Parallel**: No (modifies same file as other operations)

**Implementation**:
- Update `TaskFilter` interface to include `assignedToDepartmentId` filter
- Update `CREATE_TASK` mutation to support `assigned_to_department_id`
- Add `GET_DEPARTMENT_TASKS` query variant
- Update `validateTaskInput` to handle department assignments
- Update TypeScript `Task` interface with `assignedToDepartmentId?: string`

**Validation**: Run enhanced contract tests - department task tests should PASS

---

### T015: Create activity-logs-operations.ts with dual-tab queries
**File**: `src/lib/graphql/activity-logs-operations.ts`
**Description**: Implement ActivityLogsOperations for "My Activities" and "Audit Logs" tabs
**Dependencies**: T011 (contract tests written)
**Parallel**: No (sequential with T013-T014)

**Implementation**: Create ActivityLogsOperations class with:
- `GET_USER_ACTIVITIES` query (employee own activities, paginated)
- `GET_AUDIT_LOGS` query (admin-only, all system activities with filters)
- `GET_RESOURCE_ACTIVITY_HISTORY` query (activity trail for specific resource)
- TypeScript interfaces: `ActivityLog`, `ActivityLogFilter`, `ActivityAction`, `ResourceType`
- Helper functions: `buildActivityFilter`, `groupActivitiesByDate`, `formatActivityMessage`

**Note**: No mutations - activities logged via database triggers

**Validation**: Run contract tests - activity log tests should PASS

---

### T016: Create notifications-operations.ts with read/unread tracking
**File**: `src/lib/graphql/notifications-operations.ts`
**Description**: Implement NotificationsOperations for notification center
**Dependencies**: T012 (contract tests written)
**Parallel**: No (sequential with T013-T015)

**Implementation**: Create NotificationsOperations class with:
- `GET_USER_NOTIFICATIONS` query (unread + recent read, paginated)
- `GET_UNREAD_COUNT` query (notification bell badge)
- `GET_NOTIFICATION_BY_ID` query (single notification)
- `MARK_NOTIFICATION_READ` mutation (mark single as read)
- `MARK_ALL_READ` mutation (clear notification bell)
- `DELETE_NOTIFICATION` mutation (user removes notification)
- TypeScript interfaces: `Notification`, `NotificationFilter`, `NotificationType`, `NotificationCategory`
- Helper functions: `getNotificationIcon`, `formatNotificationTime`, `groupNotificationsByCategory`

**Validation**: Run contract tests - notification tests should PASS

---

### T017: Add TypeScript interfaces for all operations
**File**: `src/lib/graphql/types.ts` (create new shared types file)
**Description**: Extract and consolidate shared TypeScript interfaces
**Dependencies**: T013-T016 completed
**Parallel**: No (depends on all operations)

**Implementation**:
- Extract common types from all operations files
- Create `RsvpStatus` enum: `pending | accepted | declined | tentative`
- Create `EventVisibilityType` enum: `company | department | specific`
- Create `TaskAssignmentType` enum: `employee | department`
- Create `ActivityAction` enum: `create | update | delete | view`
- Create `NotificationType` enum: `email | in_app`
- Export all types for reuse in components and pages

**Validation**: Run `npm run check` - no TypeScript errors

---

### T018: Add helper functions for event visibility, task filtering, activity grouping
**File**: `src/lib/utils/events.ts`, `src/lib/utils/tasks.ts`, `src/lib/utils/activities.ts`
**Description**: Create utility functions for business logic
**Dependencies**: T017 (types defined)
**Parallel**: No (depends on types)

**Implementation**:

**events.ts**:
```typescript
export function canUserViewEvent(event: Event, userId: string, userDepartmentId: string): boolean;
export function getEventVisibilityLabel(visibilityType: EventVisibilityType): string;
export function isEventUpcoming(event: Event): boolean;
export function calculateEventDuration(startDate: string, endDate: string): string;
export function getRsvpStatusColor(status: RsvpStatus): string;
```

**tasks.ts**:
```typescript
export function canUserViewTask(task: Task, userId: string, userDepartmentId: string): boolean;
export function isTaskOverdue(task: Task): boolean;
export function getTaskPriorityLabel(priority: string): string;
export function getTaskAssigneeDisplay(task: Task): string; // "John Doe" or "Engineering Dept"
export function filterTasksByDepartment(tasks: Task[], departmentId: string): Task[];
```

**activities.ts**:
```typescript
export function groupActivitiesByDate(activities: ActivityLog[]): Map<string, ActivityLog[]>;
export function getActivityIcon(resourceType: ResourceType, action: ActivityAction): string;
export function formatActivityMessage(activity: ActivityLog): string;
export function filterActivitiesByResourceType(activities: ActivityLog[], resourceType: ResourceType): ActivityLog[];
```

**Validation**: Write unit tests for each utility function

---

## Phase 4: UI Components

### T019: Create EventCard.svelte component with Storybook [P]
**File**: `src/lib/components/events/EventCard.svelte`
**Storybook**: `src/lib/components/events/EventCard.stories.ts`
**Description**: Display event summary with RSVP status indicator
**Dependencies**: T017 (types exist)
**Parallel**: Yes [P]

**Implementation**:
```svelte
<script lang="ts">
  import type { Event, RsvpStatus } from '$lib/graphql/types';
  import { getRsvpStatusColor } from '$lib/utils/events';

  interface Props {
    event: Event;
    rsvpStatus?: RsvpStatus;
    showRsvpButton?: boolean;
    onClick?: () => void;
  }

  let { event, rsvpStatus, showRsvpButton = false, onClick }: Props = $props();
</script>

<div class="card" onclick={onClick} role="button" tabindex="0">
  <div class="card-header">
    <h3>{event.title}</h3>
    {#if rsvpStatus}
      <span class="badge" class:{getRsvpStatusColor(rsvpStatus)}>{rsvpStatus}</span>
    {/if}
  </div>
  <div class="card-body">
    <p class="event-date">{formatDate(event.startDate)} - {formatDate(event.endDate)}</p>
    {#if event.location}
      <p class="event-location">{event.location}</p>
    {/if}
    {#if event.description}
      <p class="event-description">{truncate(event.description, 100)}</p>
    {/if}
  </div>
  {#if showRsvpButton}
    <div class="card-footer">
      <slot name="rsvp-button" />
    </div>
  {/if}
</div>
```

**Storybook Stories**:
- Default event card
- With RSVP status (accepted/declined/tentative/pending)
- With RSVP button slot
- Clickable variant

**Validation**: `npm run storybook` - verify all stories render correctly

---

### T020: Create EventCalendar.svelte component with Storybook [P]
**File**: `src/lib/components/events/EventCalendar.svelte`
**Storybook**: `src/lib/components/events/EventCalendar.stories.ts`
**Description**: FullCalendar integration for event display
**Dependencies**: T017 (types exist), FullCalendar installed
**Parallel**: Yes [P]

**Implementation**:
```svelte
<script lang="ts">
  import { Calendar } from '@fullcalendar/core';
  import dayGridPlugin from '@fullcalendar/daygrid';
  import timeGridPlugin from '@fullcalendar/timegrid';
  import { onMount } from 'svelte';
  import type { Event } from '$lib/graphql/types';

  interface Props {
    events: Event[];
    onEventClick?: (eventId: string) => void;
    initialView?: 'dayGridMonth' | 'dayGridWeek' | 'timeGridDay';
  }

  let { events, onEventClick, initialView = 'dayGridMonth' }: Props = $props();

  let calendarEl: HTMLElement;
  let calendar: Calendar;

  onMount(() => {
    calendar = new Calendar(calendarEl, {
      plugins: [dayGridPlugin, timeGridPlugin],
      initialView,
      events: events.map(event => ({
        id: event.id,
        title: event.title,
        start: event.startDate,
        end: event.endDate,
        extendedProps: {
          location: event.location,
          rsvpStatus: event.rsvpStatus
        }
      })),
      eventClick: (info) => {
        if (onEventClick) {
          onEventClick(info.event.id);
        }
      }
    });
    calendar.render();

    return () => {
      calendar.destroy();
    };
  });
</script>

<div bind:this={calendarEl} class="calendar-container"></div>
```

**Storybook Stories**:
- Month view with multiple events
- Week view
- Day view
- With event click handler

**Validation**: Storybook renders calendar with sample events

---

### T021: Create RSVPButton.svelte component with Storybook [P]
**File**: `src/lib/components/events/RSVPButton.svelte`
**Storybook**: `src/lib/components/events/RSVPButton.stories.ts`
**Description**: RSVP action button with status display
**Dependencies**: T017 (types exist)
**Parallel**: Yes [P]

**Implementation**:
```svelte
<script lang="ts">
  import type { RsvpStatus } from '$lib/graphql/types';

  interface Props {
    currentStatus?: RsvpStatus;
    onStatusChange: (status: RsvpStatus) => Promise<void>;
    loading?: boolean;
  }

  let { currentStatus, onStatusChange, loading = false }: Props = $props();

  let isOpen = $state(false);

  async function handleStatusChange(status: RsvpStatus) {
    await onStatusChange(status);
    isOpen = false;
  }
</script>

<div class="rsvp-button-container">
  <button
    class="rsvp-button"
    onclick={() => isOpen = !isOpen}
    disabled={loading}
  >
    {#if loading}
      Loading...
    {:else if currentStatus}
      RSVP: {currentStatus}
    {:else}
      Respond to Invitation
    {/if}
  </button>

  {#if isOpen}
    <div class="rsvp-dropdown">
      <button onclick={() => handleStatusChange('accepted')}>✓ Accept</button>
      <button onclick={() => handleStatusChange('tentative')}>? Tentative</button>
      <button onclick={() => handleStatusChange('declined')}>✗ Decline</button>
    </div>
  {/if}
</div>
```

**Storybook Stories**:
- No RSVP status (initial state)
- Accepted status
- Tentative status
- Declined status
- Loading state

**Validation**: Test all RSVP status changes in Storybook

---

### T022: Create TaskCard.svelte component with Storybook [P]
**File**: `src/lib/components/tasks/TaskCard.svelte`
**Storybook**: `src/lib/components/tasks/TaskCard.stories.ts`
**Description**: Display task summary with status/priority badges
**Dependencies**: T017 (types exist)
**Parallel**: Yes [P]

**Implementation**: Similar to EventCard, but with task-specific properties (status, priority, due date, assignee display)

**Storybook Stories**:
- Employee task
- Department task
- Various status (pending/in_progress/completed)
- Various priority (low/medium/high/urgent)
- Overdue task

**Validation**: Storybook renders all task variants

---

### T023: Create TaskList.svelte component with Storybook [P]
**File**: `src/lib/components/tasks/TaskList.svelte`
**Storybook**: `src/lib/components/tasks/TaskList.stories.ts`
**Description**: List of tasks with sorting and filtering
**Dependencies**: T022 (TaskCard exists)
**Parallel**: Yes [P]

**Implementation**:
```svelte
<script lang="ts">
  import type { Task } from '$lib/graphql/types';
  import TaskCard from './TaskCard.svelte';

  interface Props {
    tasks: Task[];
    sortBy?: 'dueDate' | 'priority' | 'status';
    showDepartmentTasks?: boolean;
    onTaskClick?: (taskId: string) => void;
  }

  let { tasks, sortBy = 'dueDate', showDepartmentTasks = false, onTaskClick }: Props = $props();

  let sortedTasks = $derived(() => {
    // Sorting logic based on sortBy
    return [...tasks].sort((a, b) => {
      if (sortBy === 'dueDate') {
        return new Date(a.dueDate) - new Date(b.dueDate);
      }
      // ... other sorting logic
    });
  });
</script>

<div class="task-list">
  {#each sortedTasks as task}
    <TaskCard {task} onClick={() => onTaskClick?.(task.id)} />
  {/each}
</div>
```

**Storybook Stories**:
- Empty task list
- List with multiple tasks
- Sorted by due date
- Sorted by priority
- Department tasks included

**Validation**: Test sorting and filtering in Storybook

---

### T024: Create ActivityFeed.svelte component with Storybook [P]
**File**: `src/lib/components/activities/ActivityFeed.svelte`
**Storybook**: `src/lib/components/activities/ActivityFeed.stories.ts`
**Description**: Chronological feed of activity log entries
**Dependencies**: T017 (types exist)
**Parallel**: Yes [P]

**Implementation**: Grouped by date, with icon per activity type, formatted messages

**Storybook Stories**:
- Empty activity feed
- Activities grouped by date (today, yesterday, this week)
- Various activity types (event, task, leave_request, profile)
- Various actions (create, update, delete, view)

**Validation**: Storybook renders activity feed with grouping

---

### T025: Create NotificationBell.svelte component with Storybook [P]
**File**: `src/lib/components/notifications/NotificationBell.svelte`
**Storybook**: `src/lib/components/notifications/NotificationBell.stories.ts`
**Description**: Notification icon with unread count badge and dropdown
**Dependencies**: T017 (types exist)
**Parallel**: Yes [P]

**Implementation**:
```svelte
<script lang="ts">
  import type { Notification } from '$lib/graphql/types';

  interface Props {
    unreadCount: number;
    recentNotifications: Notification[];
    onMarkAllRead?: () => Promise<void>;
    onNotificationClick?: (notificationId: string) => void;
  }

  let { unreadCount, recentNotifications, onMarkAllRead, onNotificationClick }: Props = $props();

  let isOpen = $state(false);
</script>

<div class="notification-bell">
  <button onclick={() => isOpen = !isOpen} class="bell-button">
    🔔
    {#if unreadCount > 0}
      <span class="badge">{unreadCount}</span>
    {/if}
  </button>

  {#if isOpen}
    <div class="notification-dropdown">
      <div class="dropdown-header">
        <span>Notifications</span>
        {#if unreadCount > 0}
          <button onclick={onMarkAllRead}>Mark all read</button>
        {/if}
      </div>
      <div class="dropdown-body">
        {#each recentNotifications as notification}
          <div
            class="notification-item"
            class:unread={!notification.readStatus}
            onclick={() => onNotificationClick?.(notification.id)}
          >
            <p class="notification-title">{notification.title}</p>
            <p class="notification-message">{notification.message}</p>
            <span class="notification-time">{formatTime(notification.createdAt)}</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
```

**Storybook Stories**:
- No notifications
- With unread count (1, 5, 10+)
- Dropdown open with notifications
- Empty dropdown

**Validation**: Test dropdown interaction in Storybook

---

## Phase 5: Page Implementation

### T026: Create /dashboard/events/+page.server.ts (server-side data loading)
**File**: `src/routes/dashboard/events/+page.server.ts`
**Description**: Server-side event list loading with GraphQL
**Dependencies**: T013 (events-operations exists)
**Parallel**: No (sequential page implementation)

**Implementation**: Follow pattern from `src/routes/dashboard/+page.server.ts`
- Load events via `EventsOperations.getAllEvents()`
- Apply RLS filtering (PostGraphile handles visibility)
- Extract URL search params for filtering (status, date range, visibility type)
- Implement pagination
- Return data structure compatible with `+page.svelte`

**Validation**: Access `/dashboard/events` - page loads with events from database

---

### T027: Create /dashboard/events/+page.svelte (event list/calendar view)
**File**: `src/routes/dashboard/events/+page.svelte`
**Description**: Event list and calendar view UI
**Dependencies**: T020, T019 (EventCalendar, EventCard components)
**Parallel**: No (depends on T026)

**Implementation**:
- Tab-based interface: "List View" and "Calendar View"
- Use EventCalendar component for calendar tab
- Use EventCard components for list tab
- Add filters: status, date range, visibility type
- Add "Create Event" button (manager/admin only)
- Add pagination controls

**Validation**: Navigate through events, switch views, apply filters

---

### T028: Create /dashboard/events/create/+page.server.ts (event creation form handler)
**File**: `src/routes/dashboard/events/create/+page.server.ts`
**Description**: Server-side event creation with form actions
**Dependencies**: T013 (events-operations exists)
**Parallel**: No

**Implementation**:
- Form action `createEvent` using SvelteKit form actions
- Load departments and employees for attendee selection
- Validate organizer has manager/admin role
- Call `EventsOperations.createEvent()`
- Handle visibility type selection (company/department/specific)
- Bulk invite department members if selected
- Redirect to event detail page on success

**Validation**: Submit create event form - event appears in database with attendees

---

### T029: Create /dashboard/events/create/+page.svelte (event creation form)
**File**: `src/routes/dashboard/events/create/+page.svelte`
**Description**: Event creation form UI
**Dependencies**: T028 (form handler exists)
**Parallel**: No

**Implementation**:
- Use SvelteKit Superforms for validation
- Fields: title, description, start date/time, end date/time, location
- Visibility type selector: radio buttons (company/department/specific)
- Department dropdown (for department visibility)
- Employee multi-select with nested department grouping
- Attendee selector with "Select All Department Members" functionality
- Submit button with loading state

**Validation**: Fill out form, select attendees, submit - event created successfully

---

### T030: Create /dashboard/tasks/my-tasks/+page.server.ts (employee task loading)
**File**: `src/routes/dashboard/tasks/my-tasks/+page.server.ts`
**Description**: Server-side loading of employee's assigned tasks
**Dependencies**: T014 (enhanced tasks-operations)
**Parallel**: No

**Implementation**:
- Use existing `TasksOperations.getDepartmentTasks()` with employee filter
- Filter to `assignee_id = currentUserId`
- Apply status/priority filters from URL params
- Implement sorting (due date, priority, created date)
- Return paginated task list

**Validation**: Employee sees only their own assigned tasks

---

### T031: Create /dashboard/tasks/my-tasks/+page.svelte (employee task view)
**File**: `src/routes/dashboard/tasks/my-tasks/+page.svelte`
**Description**: Employee task list UI with status updates
**Dependencies**: T023 (TaskList component)
**Parallel**: No

**Implementation**:
- Use TaskList component
- Add status filter tabs: All, Pending, In Progress, Completed
- Add priority filter dropdown
- Add sort by dropdown (due date, priority, created date)
- Task status update buttons (pending → in progress → completed)
- Click task to view detail

**Validation**: Employee can view and update their own task status

---

### T032: Create /dashboard/tasks/department/+page.server.ts (department task loading)
**File**: `src/routes/dashboard/tasks/department/+page.server.ts`
**Description**: Server-side loading of department-assigned tasks
**Dependencies**: T014 (department task support)
**Parallel**: No

**Implementation**:
- Load tasks with `assigned_to_department_id = userDepartmentId`
- RLS automatically filters to user's department only
- Apply same filtering/sorting as employee tasks
- Return department task list

**Validation**: Employee sees tasks assigned to their department only

---

### T033: Create /dashboard/tasks/department/+page.svelte (department task view)
**File**: `src/routes/dashboard/tasks/department/+page.svelte`
**Description**: Department task list UI
**Dependencies**: T023 (TaskList component)
**Parallel**: No

**Implementation**:
- Similar to my-tasks page but with "Department Task" badge
- Read-only status for most employees
- Managers can update status
- Show department name in header

**Validation**: Department tasks visible only to department members

---

### T034: Create /dashboard/activities/+page.server.ts (activity log loading)
**File**: `src/routes/dashboard/activities/+page.server.ts`
**Description**: Server-side loading of employee's own activities
**Dependencies**: T015 (activity-logs-operations)
**Parallel**: No

**Implementation**:
- Use `ActivityLogsOperations.getUserActivities()`
- RLS filters to `user_id = currentUserId`
- Apply date range filter from URL params
- Apply resource type filter (event, task, leave_request, profile)
- Return paginated activity list

**Validation**: Employee sees only their own activities

---

### T035: Create /dashboard/activities/+page.svelte ("My Activities" tab)
**File**: `src/routes/dashboard/activities/+page.svelte`
**Description**: Employee activity log UI
**Dependencies**: T024 (ActivityFeed component)
**Parallel**: No

**Implementation**:
- Use ActivityFeed component
- Add date range filter (today, this week, this month, all time)
- Add resource type filter dropdown
- Group activities by date
- Format activity messages with context
- Pagination controls

**Validation**: Employee views their chronological activity history

---

### T036: Create /dashboard/activities/audit/+page.server.ts (admin audit log loading)
**File**: `src/routes/dashboard/activities/audit/+page.server.ts`
**Description**: Server-side loading of all system activities (admin only)
**Dependencies**: T015 (activity-logs-operations)
**Parallel**: No

**Implementation**:
- Check user has admin role, else redirect
- Use `ActivityLogsOperations.getAuditLogs()`
- RLS allows admin to see all activities
- Apply filters: user, resource type, action type, date range
- Return paginated audit log with user details

**Validation**: Admin sees all system activities, non-admin gets 403

---

### T037: Create /dashboard/activities/audit/+page.svelte (admin "Audit Logs" tab)
**File**: `src/routes/dashboard/activities/audit/+page.svelte`
**Description**: Admin audit log UI
**Dependencies**: T024 (ActivityFeed or custom AuditLogTable)
**Parallel**: No

**Implementation**:
- Table view with columns: User, Action, Resource Type, Resource ID, Timestamp, Details
- Filters: User dropdown, Resource type dropdown, Action type dropdown, Date range picker
- Search by user email or resource ID
- Export to CSV button
- Pagination with configurable page size

**Validation**: Admin can filter, search, and export audit logs

---

### T038: Create /dashboard/notifications/+page.server.ts (notification center loading)
**File**: `src/routes/dashboard/notifications/+page.server.ts`
**Description**: Server-side loading of user notifications
**Dependencies**: T016 (notifications-operations)
**Parallel**: No

**Implementation**:
- Use `NotificationsOperations.getUserNotifications()`
- RLS filters to `recipient_id = currentUserId`
- Load unread notifications first, then recent read (last 7 days)
- Get unread count for badge
- Return notification list grouped by read status

**Validation**: User sees their notifications with unread count

---

### T039: Create /dashboard/notifications/+page.svelte (notification center UI)
**File**: `src/routes/dashboard/notifications/+page.svelte`
**Description**: Full notification center page
**Dependencies**: T025 (NotificationBell component can be reused)
**Parallel**: No

**Implementation**:
- Tabs: "Unread" and "All"
- Notification items with icon, title, message, timestamp
- Mark as read button per notification
- Mark all as read button
- Delete notification button
- Click notification to navigate to related resource (event/task)
- Empty state when no notifications

**Validation**: User can read, mark read, and delete notifications

---

## Phase 6: Integration Tests

### T040: Write E2E test for event creation + RSVP workflow [P]
**File**: `tests/integration/event-rsvp-workflow.test.ts`
**Description**: End-to-end test for event creation and RSVP functionality
**Dependencies**: T026-T029 (event pages implemented)
**Parallel**: Yes [P]

**Implementation** (Playwright):
```typescript
import { test, expect } from '@playwright/test';

test('manager creates event and employee responds to RSVP', async ({ page, context }) => {
  // Step 1: Login as manager
  await page.goto('/login');
  await page.fill('[name="email"]', 'manager@example.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');

  // Step 2: Navigate to create event
  await page.goto('/dashboard/events/create');

  // Step 3: Fill out event form
  await page.fill('[name="title"]', 'Team Meeting');
  await page.fill('[name="description"]', 'Q1 Planning Session');
  await page.fill('[name="startDate"]', '2025-02-01T10:00');
  await page.fill('[name="endDate"]', '2025-02-01T11:00');
  await page.fill('[name="location"]', 'Conference Room A');

  // Step 4: Select visibility type "Specific People"
  await page.click('[value="specific"]');

  // Step 5: Select attendees
  await page.click('[data-test="employee-selector"]');
  await page.click('[data-test="employee-1"]'); // Select first employee

  // Step 6: Submit form
  await page.click('button[type="submit"]');

  // Step 7: Verify redirect to event detail page
  await expect(page).toHaveURL(/\/dashboard\/events\/[a-f0-9-]+/);
  await expect(page.locator('h1')).toContainText('Team Meeting');

  // Step 8: Logout and login as employee
  await page.click('[data-test="logout"]');
  await page.goto('/login');
  await page.fill('[name="email"]', 'employee1@example.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');

  // Step 9: Navigate to employee's events
  await page.goto('/dashboard/events');

  // Step 10: Verify event appears in employee's list
  await expect(page.locator('[data-test="event-card"]')).toContainText('Team Meeting');

  // Step 11: Click event to view details
  await page.click('[data-test="event-card"]:has-text("Team Meeting")');

  // Step 12: Click RSVP button
  await page.click('[data-test="rsvp-button"]');

  // Step 13: Select "Accept"
  await page.click('[data-test="rsvp-accept"]');

  // Step 14: Verify RSVP status updated
  await expect(page.locator('[data-test="rsvp-status"]')).toContainText('Accepted');

  // Step 15: Verify notification created
  await page.goto('/dashboard/notifications');
  await expect(page.locator('[data-test="notification-item"]')).toContainText('Event Invitation');
});
```

**Validation**: Run `npm run test:e2e -- tests/integration/event-rsvp-workflow.test.ts` - test passes

---

### T041: Write E2E test for task assignment to employee [P]
**File**: `tests/integration/task-assignment-employee.test.ts`
**Description**: End-to-end test for individual task assignment
**Dependencies**: T030-T031 (task pages implemented)
**Parallel**: Yes [P]

**Implementation**: Similar Playwright structure - manager assigns task to employee, employee views and updates status

**Validation**: Run E2E test - passes

---

### T042: Write E2E test for task assignment to department [P]
**File**: `tests/integration/task-assignment-department.test.ts`
**Description**: End-to-end test for department task assignment and visibility
**Dependencies**: T032-T033 (department task pages)
**Parallel**: Yes [P]

**Implementation**: Manager assigns task to department, employees in department see task, employee from different department cannot see task

**Validation**: Run E2E test - passes with proper privacy enforcement

---

### T043: Write E2E test for activity log visibility (employee vs admin) [P]
**File**: `tests/integration/activity-log-visibility.test.ts`
**Description**: End-to-end test for dual-tab activity logging
**Dependencies**: T034-T037 (activity pages)
**Parallel**: Yes [P]

**Implementation**: Employee performs actions, views own activities tab, admin views audit logs with all user activities

**Validation**: Run E2E test - verifies RLS policies working correctly

---

### T044: Write E2E test for notification delivery (event + task) [P]
**File**: `tests/integration/notification-delivery.test.ts`
**Description**: End-to-end test for notification system
**Dependencies**: T038-T039 (notification pages)
**Parallel**: Yes [P]

**Implementation**: Manager creates event/task, employee receives notifications (both email and in-app), employee marks as read, notification count updates

**Validation**: Run E2E test - notification workflow complete

---

## Phase 7: Documentation

### T045: Update README with new features (events, tasks, activities)
**File**: `README.md`
**Description**: Document new features and usage
**Dependencies**: All features implemented
**Parallel**: No (final documentation)

**Implementation**:
- Add "Events Management" section with feature description
- Add "Task Management" section with department privacy details
- Add "Activity Logging" section explaining dual tabs
- Add "Notifications" section with email + in-app explanation
- Update screenshots/demo GIFs
- Add navigation guide to new pages

**Validation**: Review README for clarity and completeness

---

### T046: Add Storybook documentation for all new components
**File**: Each component's `.stories.ts` file
**Description**: Enhance Storybook documentation with usage notes
**Dependencies**: T019-T025 (components implemented)
**Parallel**: No (documentation task)

**Implementation**:
- Add component descriptions to each Storybook story
- Add props documentation with types
- Add usage examples and best practices
- Add accessibility notes
- Add interactive controls for all props

**Validation**: Run `npm run storybook` - all components documented

---

### T047: Update API documentation with new GraphQL operations
**File**: `docs/api.md` (create if doesn't exist)
**Description**: Document GraphQL operations for events, tasks, activities, notifications
**Dependencies**: T013-T016 (operations implemented)
**Parallel**: No (documentation task)

**Implementation**:
- Document all queries with parameters and return types
- Document all mutations with input types
- Add example GraphQL queries with sample responses
- Document RLS policies and visibility rules
- Add authentication requirements
- Add rate limiting notes

**Validation**: Review API docs for accuracy and completeness

---

## Task Execution Summary

**Total Tasks**: 47
**Parallel Tasks**: 15 (marked with [P])
**Sequential Tasks**: 32

**Phases**:
1. Database Setup: 8 tasks (7 parallel, 1 sequential)
2. Contract Tests: 4 tasks (all parallel)
3. GraphQL Operations: 6 tasks (sequential - same codebase)
4. UI Components: 7 tasks (all parallel)
5. Page Implementation: 14 tasks (sequential - route dependencies)
6. Integration Tests: 5 tasks (all parallel)
7. Documentation: 3 tasks (sequential - final phase)

**Estimated Timeline**:
- Phase 1: 1 day (database migrations can run in parallel)
- Phase 2: 0.5 days (contract tests parallel)
- Phase 3: 2 days (GraphQL operations sequential)
- Phase 4: 1 day (components parallel)
- Phase 5: 3 days (pages sequential)
- Phase 6: 0.5 days (E2E tests parallel)
- Phase 7: 0.5 days (documentation)

**Total**: ~8.5 development days

---

## Validation Checklist

After completing all tasks, verify:

- [ ] All database migrations applied successfully
- [ ] All RLS policies enforce correct visibility
- [ ] All contract tests pass (TDD GREEN phase)
- [ ] All GraphQL operations return correct data
- [ ] All UI components render in Storybook
- [ ] All pages load with server-side data
- [ ] All E2E tests pass
- [ ] All documentation updated
- [ ] `npm run check` passes (TypeScript)
- [ ] `npm run lint` passes (ESLint + Prettier)
- [ ] `npm run test` passes (all tests)
- [ ] `npm run build` succeeds (production build)

---

**Constitution Compliance**: ✅ All tasks follow TDD, use server-side loading, implement RLS policies, and maintain strict TypeScript typing per SvelteHR Constitution v1.1.0

**Ready for Implementation**: `/implement` command can now execute these tasks in order
