# Research: Events, Tasks, and Activity Management System

**Feature**: 019-we-need-to
**Date**: 2025-01-01
**Status**: Complete

## Overview

This document consolidates research findings for implementing the Events, Tasks, and Activity Management System in SvelteHR. All technical decisions follow established patterns in the codebase and comply with the SvelteHR Constitution v1.1.0.

---

## Decision 1: Event RSVP Pattern with PostgreSQL + PostGraphile

**Rationale**: Use a junction table (`event_attendees`) to track many-to-many relationships between events and employees, with RSVP status as an attribute on the relationship. This pattern is proven in the existing `tasks` table design and leverages PostGraphile's automatic GraphQL generation.

**Alternatives Considered**:
1. **Separate RSVP table**: Would require additional joins and complicate queries
2. **JSON column on events table**: Poor query performance, cannot leverage SQL indexes
3. **Event snapshots**: Too complex for RSVP tracking, better suited for audit trails

**Implementation Notes**:
- `event_attendees` table structure:
  ```sql
  CREATE TABLE event_attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    response_status TEXT NOT NULL DEFAULT 'pending'
      CHECK (response_status IN ('pending', 'accepted', 'declined', 'tentative')),
    is_required BOOLEAN DEFAULT false,
    invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    UNIQUE(event_id, employee_id)
  );
  ```
- **Indexes**: Composite index on `(event_id, employee_id)` for fast lookups
- **RLS Policy**: `response_status` update allowed only by the `employee_id` matching JWT claim
- **GraphQL Mutation**: `updateEventRsvp(eventId: UUID!, status: RsvpStatus!)` with RLS enforcement

**Constitution Compliance**:
- ✅ Security by Design: RLS enforces user can only update their own RSVP
- ✅ Performance: Indexed joins for <200ms query time
- ✅ Type Safety: Enum constraints at database level, TypeScript types auto-generated

---

## Decision 2: Multi-Tier Event Visibility with RLS Policies

**Rationale**: Implement three visibility levels (company-wide, department-specific, specific people) using PostgreSQL Row-Level Security policies. This approach centralizes authorization logic at the database layer, preventing unauthorized access even if application code has bugs.

**Alternatives Considered**:
1. **Application-level filtering**: Risk of security bypass, duplicate logic across endpoints
2. **View-based permissions**: Less flexible, requires multiple views per permission level
3. **Attribute-Based Access Control (ABAC)**: Over-engineered for current requirements

**Implementation Notes**:
- **Events table visibility_type column**:
  ```sql
  visibility_type TEXT NOT NULL
    CHECK (visibility_type IN ('company', 'department', 'specific'))
  ```
- **RLS Policy for company-wide events**:
  ```sql
  CREATE POLICY event_company_visibility ON events
    FOR SELECT
    USING (visibility_type = 'company');
  ```
- **RLS Policy for department events**:
  ```sql
  CREATE POLICY event_department_visibility ON events
    FOR SELECT
    USING (
      visibility_type = 'department' AND
      department_id = (SELECT department_id FROM users WHERE id = current_setting('jwt.claims.user_id')::uuid)
    );
  ```
- **RLS Policy for specific people** (via `event_attendees` junction):
  ```sql
  CREATE POLICY event_specific_visibility ON events
    FOR SELECT
    USING (
      visibility_type = 'specific' AND
      id IN (SELECT event_id FROM event_attendees WHERE employee_id = current_setting('jwt.claims.user_id')::uuid)
    );
  ```

**Constitution Compliance**:
- ✅ Security by Design: RLS policies enforce visibility at database level
- ✅ RBAC Integration: JWT claims used for user identity (`current_setting('jwt.claims.user_id')`)
- ✅ Performance: Indexes on `visibility_type`, `department_id`, and `event_attendees` foreign keys

**GraphQL Query Pattern** (PostGraphile auto-generates):
```graphql
query GetUserEvents {
  allEvents(orderBy: START_DATE_ASC) {
    nodes {
      id
      title
      startDate
      endDate
      visibilityType
      eventAttendeesByEventId(condition: { employeeId: $currentUserId }) {
        nodes {
          responseStatus
        }
      }
    }
  }
}
```

---

## Decision 3: Dual-Tab Activity Logging with Separate RLS Policies

**Rationale**: Implement two distinct interfaces ("My Activities" and "Audit Logs") using the same `activity_logs` table but different RLS policies. This balances user privacy (employees see only their own actions) with admin oversight (admins see all system activities).

**Alternatives Considered**:
1. **Separate tables**: `user_activities` + `audit_logs` - Duplicates data, complex sync logic
2. **Unified view with client-side filtering**: Security risk, violates server-side loading principle
3. **Role-based columns**: Would require schema changes for new roles

**Implementation Notes**:
- **Activity logs table**:
  ```sql
  CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'view')),
    resource_type TEXT NOT NULL CHECK (resource_type IN ('event', 'task', 'leave_request', 'profile', 'document')),
    resource_id UUID NOT NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  ```
- **Immutability**: No UPDATE or DELETE operations allowed on `activity_logs` (enforced by triggers)
- **RLS Policy for "My Activities" tab**:
  ```sql
  CREATE POLICY activity_user_own_access ON activity_logs
    FOR SELECT
    USING (user_id = current_setting('jwt.claims.user_id')::uuid);
  ```
- **RLS Policy for "Audit Logs" tab** (admin-only):
  ```sql
  CREATE POLICY activity_admin_audit_access ON activity_logs
    FOR SELECT
    USING (
      current_setting('jwt.claims.role')::text IN ('admin', 'super_admin')
    );
  ```

**GraphQL Query Pattern**:
```graphql
# "My Activities" tab (employee view)
query GetUserActivities {
  allActivityLogs(
    condition: { userId: $currentUserId }
    orderBy: CREATED_AT_DESC
    first: 50
  ) {
    nodes {
      id
      action
      resourceType
      details
      createdAt
    }
  }
}

# "Audit Logs" tab (admin view)
query GetAuditLogs($resourceType: String, $fromDate: Datetime) {
  allActivityLogs(
    filter: {
      resourceType: { equalTo: $resourceType }
      createdAt: { greaterThanOrEqualTo: $fromDate }
    }
    orderBy: CREATED_AT_DESC
    first: 100
  ) {
    nodes {
      id
      userId
      userByUserId {
        displayName
        email
      }
      action
      resourceType
      resourceId
      details
      ipAddress
      createdAt
    }
  }
}
```

**Constitution Compliance**:
- ✅ Security by Design: RLS separates user activities from admin audit logs
- ✅ RBAC: Admin role required for audit log access
- ✅ Performance: Index on `(user_id, created_at)` for employee queries, `(created_at, resource_type)` for admin queries

---

## Decision 4: Dual-Channel Notification System (Email + In-App)

**Rationale**: Implement a `notifications` table for in-app notifications with a `type` column distinguishing email vs in-app. Email delivery handled by backend service (outside database), while in-app notifications stored in PostgreSQL with read/unread tracking.

**Alternatives Considered**:
1. **PostgreSQL NOTIFY/LISTEN**: Real-time but requires persistent connections, complex for SvelteKit SSR
2. **Separate notification service**: Over-engineered for MVP, introduces deployment complexity
3. **In-app only**: Violates spec requirement for email notifications

**Implementation Notes**:
- **Notifications table**:
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
  ```
- **Email notifications**: `type = 'email'`, backend service consumes records and sends via SMTP
- **In-app notifications**: `type = 'in_app'`, displayed in notification bell dropdown
- **RLS Policy**:
  ```sql
  CREATE POLICY notification_recipient_access ON notifications
    FOR SELECT
    USING (recipient_id = current_setting('jwt.claims.user_id')::uuid);
  ```
- **Notification generation**: Triggered by database functions on event/task mutations
  ```sql
  CREATE FUNCTION notify_task_assignment() RETURNS TRIGGER AS $$
  BEGIN
    INSERT INTO notifications (recipient_id, type, category, title, message, related_resource_type, related_resource_id)
    VALUES
      (NEW.assignee_id, 'email', 'task_assignment', 'New Task Assigned', 'You have been assigned: ' || NEW.title, 'task', NEW.id),
      (NEW.assignee_id, 'in_app', 'task_assignment', 'New Task Assigned', 'You have been assigned: ' || NEW.title, 'task', NEW.id);
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  CREATE TRIGGER task_assignment_notify
    AFTER INSERT ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION notify_task_assignment();
  ```

**GraphQL Mutation Pattern**:
```graphql
mutation MarkNotificationRead($id: UUID!) {
  updateNotification(input: {
    id: $id
    patch: {
      readStatus: true
      readAt: "now()"
    }
  }) {
    notification {
      id
      readStatus
    }
  }
}
```

**Constitution Compliance**:
- ✅ Security: RLS ensures users only see their own notifications
- ✅ Performance: Index on `(recipient_id, read_status, created_at)` for fast unread queries
- ✅ Audit: Notification creation logged to `activity_logs`

---

## Decision 5: Department Task Privacy with Enhanced RLS

**Rationale**: Extend existing `tasks` table with `assigned_to_department_id` column and RLS policy restricting visibility to employees within that department. This ensures department-assigned tasks are not visible across other departments, as specified in clarification #5.

**Alternatives Considered**:
1. **Separate department_tasks table**: Duplicates schema, complicates task queries
2. **Application-level filtering**: Security risk if code has bugs
3. **View-based access**: Less flexible for complex permission rules

**Implementation Notes**:
- **Tasks table enhancement**:
  ```sql
  ALTER TABLE tasks
    ADD COLUMN assigned_to_department_id UUID REFERENCES departments(id);

  ALTER TABLE tasks
    ADD CONSTRAINT task_assignment_check
    CHECK (
      (assignee_id IS NOT NULL AND assigned_to_department_id IS NULL) OR
      (assignee_id IS NULL AND assigned_to_department_id IS NOT NULL)
    );
  ```
- **RLS Policy for employee tasks** (existing):
  ```sql
  CREATE POLICY task_employee_access ON tasks
    FOR SELECT
    USING (assignee_id = current_setting('jwt.claims.user_id')::uuid);
  ```
- **RLS Policy for department tasks** (NEW):
  ```sql
  CREATE POLICY task_department_privacy ON tasks
    FOR SELECT
    USING (
      assigned_to_department_id IS NOT NULL AND
      assigned_to_department_id = (SELECT department_id FROM users WHERE id = current_setting('jwt.claims.user_id')::uuid)
    );
  ```
- **Manager access policy**:
  ```sql
  CREATE POLICY task_manager_department_access ON tasks
    FOR ALL
    USING (
      current_setting('jwt.claims.role')::text IN ('manager', 'admin') AND
      (
        assigned_to_department_id = (SELECT department_id FROM users WHERE id = current_setting('jwt.claims.user_id')::uuid) OR
        assignee_id IN (SELECT id FROM users WHERE department_id = (SELECT department_id FROM users WHERE id = current_setting('jwt.claims.user_id')::uuid))
      )
    );
  ```

**GraphQL Query Pattern**:
```graphql
# Employee's department tasks
query GetDepartmentTasks {
  allTasks(
    condition: { assignedToDepartmentId: $userDepartmentId }
    orderBy: DUE_DATE_ASC
  ) {
    nodes {
      id
      title
      description
      status
      priority
      dueDate
      assignedToDepartmentId
      department {
        id
        name
      }
    }
  }
}
```

**Constitution Compliance**:
- ✅ Security: RLS prevents cross-department task visibility
- ✅ RBAC: Managers see only their department's tasks
- ✅ Performance: Index on `assigned_to_department_id` for fast department queries

---

## Decision 6: Calendar UI Component Selection

**Rationale**: Use **FullCalendar** with Svelte wrapper (`@fullcalendar/core` + custom Svelte integration). FullCalendar provides robust event rendering, drag-and-drop support, and responsive design out-of-the-box. While it requires a commercial license for certain features, the base MIT-licensed version covers our requirements.

**Alternatives Considered**:
1. **TUI Calendar**: Good features but less Svelte community support
2. **Custom Svelte implementation**: Full control but high development cost (2-3 weeks)
3. **svelte-calendar**: Lightweight but lacks RSVP integration and enterprise features
4. **Toast UI Calendar**: Good alternative but FullCalendar has better TypeScript support

**Implementation Notes**:
- **Package**: `@fullcalendar/core` + `@fullcalendar/daygrid` + `@fullcalendar/timegrid`
- **License**: MIT (base features sufficient for requirements)
- **Integration approach**:
  ```svelte
  <script lang="ts">
    import { Calendar } from '@fullcalendar/core';
    import dayGridPlugin from '@fullcalendar/daygrid';
    import timeGridPlugin from '@fullcalendar/timegrid';
    import { onMount } from 'svelte';

    let calendarEl: HTMLElement;
    let calendar: Calendar;

    onMount(() => {
      calendar = new Calendar(calendarEl, {
        plugins: [dayGridPlugin, timeGridPlugin],
        initialView: 'dayGridMonth',
        events: async (info, successCallback) => {
          // Fetch events from GraphQL
          const result = await graphqlClient.query(GET_USER_EVENTS, {
            start: info.startStr,
            end: info.endStr
          });
          successCallback(result.data.allEvents.nodes.map(event => ({
            id: event.id,
            title: event.title,
            start: event.startDate,
            end: event.endDate,
            extendedProps: {
              rsvpStatus: event.eventAttendeesByEventId.nodes[0]?.responseStatus
            }
          })));
        },
        eventClick: (info) => {
          // Navigate to event detail page
          goto(`/dashboard/events/${info.event.id}`);
        }
      });
      calendar.render();
    });
  </script>

  <div bind:this={calendarEl}></div>
  ```
- **RSVP Integration**: Custom event rendering with color-coded badges for RSVP status
- **Performance**: Lazy load events via GraphQL with date range filtering

**Constitution Compliance**:
- ✅ Component Architecture: Follows Svelte 5 runes syntax for reactive state
- ✅ Server-Side Loading: Events fetched via `+page.server.ts`, calendar hydrated client-side
- ✅ Performance: Code splitting for FullCalendar bundle (~150KB gzipped)

**Bundle Size Consideration**:
- FullCalendar core: ~50KB gzipped
- Day/Time grid plugins: ~30KB gzipped each
- Custom Svelte wrapper: ~5KB
- **Total**: ~115KB gzipped (acceptable for feature-rich calendar)

---

## Summary of Research Findings

All technical decisions documented above align with:
- ✅ **SvelteHR Constitution v1.1.0**: TDD, TypeScript strict mode, RLS policies, server-side loading
- ✅ **Existing Patterns**: Follows `tasks-operations.ts`, `dashboard/+page.server.ts`, management pages
- ✅ **Performance Requirements**: All queries target <200ms with proper indexing
- ✅ **Security Requirements**: RLS enforced at database level for all visibility controls
- ✅ **Testing Requirements**: Contract tests for all GraphQL operations, E2E for user workflows

**Next Steps**:
1. Create `data-model.md` with entity definitions from research findings
2. Generate GraphQL contract tests in `/contracts/` directory
3. Create `quickstart.md` with integration test scenarios
4. Update `CLAUDE.md` with new architecture patterns

**Research Status**: ✅ Complete - Ready for Phase 1 (Design & Contracts)
