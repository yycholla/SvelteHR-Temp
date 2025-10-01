# API Documentation: Feature 019 - Events, Tasks & Activity Management

Complete GraphQL API reference for Events, Tasks, Activity Logging, and Notification systems.

**Feature**: 019-we-need-to
**Status**: 89% Complete (40 of 45 tasks)
**Last Updated**: 2025-10-01

---

## Table of Contents

1. [Authentication](#authentication)
2. [Event Management API](#event-management-api)
3. [Task Management API](#task-management-api)
4. [Activity Logging API](#activity-logging-api)
5. [Notification API](#notification-api)
6. [TypeScript Types](#typescript-types)
7. [Error Handling](#error-handling)
8. [Rate Limiting](#rate-limiting)

---

## Authentication

All API calls require JWT Bearer token authentication.

```typescript
// Server-side authentication (REQUIRED)
import { createUrqlClient } from '$lib/graphql/client';

export const load: PageServerLoad = async ({ locals, cookies }) => {
  // 1. Check authentication
  if (!locals.user) {
    throw redirect(303, '/login');
  }

  // 2. Get JWT token from cookies
  const token = cookies.get('hr_token') || cookies.get('auth-token');
  if (!token) {
    throw redirect(303, '/login');
  }

  // 3. Create authenticated GraphQL client
  const urqlClient = createUrqlClient(token);

  // 4. Make authenticated requests
  const { data, error } = await urqlClient.query(/* ... */).toPromise();
};
```

**⚠️ CRITICAL**: Never make GraphQL API calls from client-side components. All data fetching must be done server-side in `+page.server.ts` or `+layout.server.ts` files.

---

## Event Management API

### Operations Class

```typescript
import { EventsOperations } from '$lib/graphql/events-operations';

const eventsOps = new EventsOperations();
```

### Queries

#### 1. getAllEvents

Get paginated list of events with visibility filtering.

**Authorization**: All authenticated users (filtered by RLS)

```typescript
const result = await eventsOps.getAllEvents(
  {
    first: 20,
    offset: 0,
    filter: {
      visibilityType: 'company', // optional: 'company' | 'department' | 'specific'
      status: 'scheduled',        // optional: 'draft' | 'scheduled' | 'ongoing' | 'completed' | 'cancelled'
      eventType: 'meeting'        // optional: 'meeting' | 'training' | 'social' | 'conference' | 'other'
    }
  },
  {
    token: jwtToken,
    timeout: 5000
  }
);

// Response
{
  events: Event[];
  totalCount: number;
  hasNextPage: boolean;
}
```

**RLS Enforcement**: Users see only events matching their visibility level:
- `company`: All authenticated users
- `department`: Users in same department
- `specific`: Only invited attendees

---

#### 2. getEventById

Get single event with all attendees.

**Authorization**: User must have visibility access to event (RLS)

```typescript
const result = await eventsOps.getEventById(
  eventId,
  { token: jwtToken }
);

// Response
{
  event: Event & {
    attendees: EventAttendee[];
    organizer: UserReference;
  } | null;
}
```

---

#### 3. getUserEvents

Get events for specific user with RSVP status.

**Authorization**: User can only query their own events (RLS)

```typescript
const result = await eventsOps.getUserEvents(
  userId,
  {
    includeDeclined: false,
    upcomingOnly: true
  },
  { token: jwtToken }
);

// Response
{
  events: Event[];
  totalCount: number;
}
```

---

#### 4. getUpcomingEvents

Get events in next 30 days.

**Authorization**: All authenticated users (filtered by RLS)

```typescript
const result = await eventsOps.getUpcomingEvents(
  30, // days
  { token: jwtToken }
);

// Response
{
  events: Event[];
  totalCount: number;
}
```

---

### Mutations

#### 1. createEvent

Create new event (manager or admin only).

**Authorization**: Role level ≥ 60 (Manager or higher)

```typescript
const result = await eventsOps.createEvent(
  {
    title: 'Team Meeting',
    description: 'Weekly sync meeting',
    startTime: '2025-10-15T10:00:00Z',
    endTime: '2025-10-15T11:00:00Z',
    location: 'Conference Room A',
    eventType: 'meeting',
    visibilityType: 'company',
    isAllDay: false,
    organizerId: currentUser.id
  },
  { token: jwtToken }
);

// Response
{
  event: Event;
}
```

**Validation**:
- `title`: Required, 1-200 characters
- `startTime`: Required, must be valid ISO 8601 timestamp
- `endTime`: Required, must be after startTime
- `eventType`: Required, must be valid enum value
- `visibilityType`: Required, must be valid enum value
- `organizerId`: Required, must be valid user ID

---

#### 2. updateEvent

Update existing event (organizer or admin only).

**Authorization**: User must be event organizer OR admin (level 100)

```typescript
const result = await eventsOps.updateEvent(
  eventId,
  {
    title: 'Updated Title',
    description: 'Updated description',
    startTime: '2025-10-15T14:00:00Z'
  },
  { token: jwtToken }
);

// Response
{
  event: Event;
}
```

---

#### 3. deleteEvent

Delete event (organizer or admin only).

**Authorization**: User must be event organizer OR admin (level 100)

```typescript
const result = await eventsOps.deleteEvent(
  eventId,
  { token: jwtToken }
);

// Response
{
  success: boolean;
  deletedId: string;
}
```

---

#### 4. updateRsvpStatus

Update user's RSVP status for an event.

**Authorization**: User can only update their own RSVP

```typescript
const result = await eventsOps.updateRsvpStatus(
  eventId,
  userId,
  'accepted', // 'accepted' | 'declined' | 'tentative' | 'pending' | 'no_response'
  { token: jwtToken }
);

// Response
{
  attendee: EventAttendee;
}
```

---

#### 5. inviteAttendees

Bulk invite attendees to event (organizer or admin only).

**Authorization**: User must be event organizer OR admin

```typescript
const result = await eventsOps.inviteAttendees(
  eventId,
  [
    { employeeId: 'user1', rsvpStatus: 'pending' },
    { employeeId: 'user2', rsvpStatus: 'pending' }
  ],
  { token: jwtToken }
);

// Response
{
  attendees: EventAttendee[];
  invitedCount: number;
}
```

---

## Task Management API

### Operations Class

```typescript
import { TasksOperations } from '$lib/graphql/tasks-operations';

const tasksOps = new TasksOperations();
```

### Enhanced Features (Feature 019)

Feature 019 adds department task assignment:
- `assignedToDepartmentId` field for department-wide tasks
- Mutually exclusive assignment (employee OR department, not both)
- Department-specific task filtering for managers

### Queries

#### 1. getAllTasks

Get paginated list of tasks (enhanced with department filtering).

**Authorization**: Users see only their assigned tasks or department tasks (RLS)

```typescript
const result = await tasksOps.getAllTasks(
  {
    first: 20,
    offset: 0,
    filter: {
      assigneeId: userId,                    // Employee tasks
      assignedToDepartmentId: departmentId,  // Department tasks
      status: 'in_progress',
      priority: 'high'
    }
  },
  {
    token: jwtToken
  }
);

// Response
{
  tasks: Task[];
  totalCount: number;
  hasNextPage: boolean;
}
```

**RLS Enforcement**:
- Employees see only tasks assigned to them OR their department
- Managers see all tasks in departments they manage
- Admins see all tasks

---

#### 2. getTaskById

Get single task with assignment details.

**Authorization**: User must have access to task (assignee, department member, or manager)

```typescript
const result = await tasksOps.getTaskById(
  taskId,
  { token: jwtToken }
);

// Response
{
  task: Task & {
    assignee?: UserReference;
    assignedToDepartment?: DepartmentReference;
  } | null;
}
```

---

### Mutations

#### 1. createTask

Create new task (manager or admin only).

**Authorization**: Role level ≥ 60 (Manager or higher)

```typescript
// Employee task assignment
const result = await tasksOps.createTask(
  {
    title: 'Complete documentation',
    description: 'Write API docs',
    priority: 'high',
    status: 'todo',
    dueDate: '2025-10-20',
    assigneeId: 'user123',              // Assign to employee
    assignedToDepartmentId: null        // NOT department task
  },
  { token: jwtToken }
);

// OR Department task assignment
const result = await tasksOps.createTask(
  {
    title: 'Department training',
    description: 'Complete security training',
    priority: 'high',
    status: 'todo',
    dueDate: '2025-10-30',
    assigneeId: null,                   // NOT assigned to employee
    assignedToDepartmentId: 'dept456'   // Assign to department
  },
  { token: jwtToken }
);

// Response
{
  task: Task;
}
```

**Validation**:
- `title`: Required, 1-200 characters
- `priority`: Required, valid enum value
- `status`: Required, valid enum value
- **MUST have EITHER** `assigneeId` OR `assignedToDepartmentId` (not both, not neither)
- `dueDate`: Optional, must be valid date if provided

---

#### 2. updateTaskStatus

Update task status.

**Authorization**: Task assignee, department member, manager, or admin

```typescript
const result = await tasksOps.updateTaskStatus(
  taskId,
  'completed',
  { token: jwtToken }
);

// Response
{
  task: Task;
}
```

**Status Progression**:
- `todo` → `in_progress` → `completed`
- `todo` → `cancelled`
- `in_progress` → `cancelled`

---

#### 3. updateTask

Update task details.

**Authorization**: Task assignee, department member, manager, or admin

```typescript
const result = await tasksOps.updateTask(
  taskId,
  {
    title: 'Updated title',
    priority: 'urgent',
    dueDate: '2025-10-25'
  },
  { token: jwtToken }
);

// Response
{
  task: Task;
}
```

---

#### 4. deleteTask

Delete task.

**Authorization**: Manager or admin only

```typescript
const result = await tasksOps.deleteTask(
  taskId,
  { token: jwtToken }
);

// Response
{
  success: boolean;
  deletedId: string;
}
```

---

## Activity Logging API

### Operations Class

```typescript
import { ActivityLogsOperations } from '$lib/graphql/activity-logs-operations';

const activityOps = new ActivityLogsOperations();
```

### Important Notes

- **Activity logs are immutable** - No mutations available
- **Logged automatically via database triggers** - No manual creation
- **Dual RLS policies**: Employees see only their own activities; admins see all

### Queries

#### 1. getUserActivities

Get activities for specific user (employee sees only their own).

**Authorization**: User can only query their own activities (RLS enforced)

```typescript
const result = await activityOps.getUserActivities(
  userId,
  {
    first: 50,
    offset: 0,
    filter: {
      action: 'create',
      resourceType: 'task',
      dateFrom: '2025-10-01T00:00:00Z',
      dateTo: '2025-10-31T23:59:59Z'
    }
  },
  { token: jwtToken }
);

// Response
{
  logs: ActivityLog[];
  totalCount: number;
  hasNextPage: boolean;
}
```

**RLS Enforcement**: Users can ONLY see their own activities (employeeId matches locals.user.id)

---

#### 2. getAuditLogs

Get system-wide audit logs (admin only).

**Authorization**: Admin only (role level 100)

```typescript
const result = await activityOps.getAuditLogs(
  {
    first: 100,
    offset: 0,
    filter: {
      employeeId: 'user123',        // Filter by employee
      action: 'delete',             // Filter by action
      resourceType: 'event',        // Filter by resource
      dateFrom: '2025-10-01T00:00:00Z',
      dateTo: '2025-10-31T23:59:59Z'
    }
  },
  { token: jwtToken }
);

// Response
{
  logs: ActivityLog[];
  totalCount: number;
  hasNextPage: boolean;
}
```

**RLS Enforcement**: Only admins can access system-wide logs. Non-admins will receive empty results.

---

#### 3. getResourceActivityHistory

Get complete activity trail for a specific resource.

**Authorization**: User must have access to the resource

```typescript
const result = await activityOps.getResourceActivityHistory(
  'event',      // resourceType
  'event123',   // resourceId
  { token: jwtToken }
);

// Response
{
  logs: ActivityLog[];
  totalCount: number;
}
```

---

#### 4. getActivitiesByDateRange

Get activities within a date range.

**Authorization**: Employees see only their own; admins see all (RLS)

```typescript
const result = await activityOps.getActivitiesByDateRange(
  '2025-10-01T00:00:00Z',
  '2025-10-31T23:59:59Z',
  {
    first: 50,
    offset: 0
  },
  { token: jwtToken }
);

// Response
{
  logs: ActivityLog[];
  totalCount: number;
}
```

---

### Automatic Activity Logging

Activities are automatically logged for:

**Event Actions**:
- Event creation
- Event updates
- Event deletion
- RSVP status changes

**Task Actions**:
- Task creation
- Task assignment
- Task status updates
- Task deletion

**All Other Resources**:
- Create, update, delete, view actions for all resource types

**Database Triggers**: Located in migration `20250101_009_create_activity_log_triggers.sql`

---

## Notification API

### Operations Class

```typescript
import { NotificationsOperations } from '$lib/graphql/notifications-operations';

const notificationsOps = new NotificationsOperations();
```

### Queries

#### 1. getUserNotifications

Get user's notifications with filtering.

**Authorization**: User can only query their own notifications (RLS)

```typescript
const result = await notificationsOps.getUserNotifications(
  userId,
  {
    first: 20,
    offset: 0,
    filter: {
      category: 'task_assignment',
      type: 'in_app',
      read: false
    }
  },
  { token: jwtToken }
);

// Response
{
  notifications: Notification[];
  totalCount: number;
  hasNextPage: boolean;
}
```

**Categories**:
- `task_assignment`
- `event_invitation`
- `leave_approval`
- `performance_review`
- `department_announcement`
- `system_alert`
- `reminder`
- `other`

**Types**:
- `email` - Email notification
- `in_app` - In-app notification

---

#### 2. getUnreadCount

Get count of unread notifications (for notification bell badge).

**Authorization**: User can only query their own notifications

```typescript
const result = await notificationsOps.getUnreadCount(
  userId,
  { token: jwtToken }
);

// Response
{
  count: number;
}
```

---

#### 3. getNotificationById

Get single notification by ID.

**Authorization**: User can only query their own notifications (RLS)

```typescript
const result = await notificationsOps.getNotificationById(
  notificationId,
  { token: jwtToken }
);

// Response
{
  notification: Notification | null;
}
```

---

### Mutations

#### 1. markNotificationRead

Mark single notification as read.

**Authorization**: User can only mark their own notifications

```typescript
const result = await notificationsOps.markNotificationRead(
  notificationId,
  { token: jwtToken }
);

// Response
{
  notification: Notification;
}
```

---

#### 2. markAllRead

Mark all user's notifications as read.

**Authorization**: User can only mark their own notifications

```typescript
const result = await notificationsOps.markAllRead(
  userId,
  { token: jwtToken }
);

// Response
{
  updatedCount: number;
}
```

---

#### 3. deleteNotification

Delete notification.

**Authorization**: User can only delete their own notifications

```typescript
const result = await notificationsOps.deleteNotification(
  notificationId,
  { token: jwtToken }
);

// Response
{
  success: boolean;
  deletedId: string;
}
```

---

### Automatic Notification Generation

Notifications are automatically created via database triggers for:

**Task Events**:
- Task assigned to employee → notification sent to assignee
- Task assigned to department → notifications sent to all department members
- Task status changed → notification sent to creator

**Event Events**:
- Event invitation sent → notification sent to invitee
- Event RSVP changed → notification sent to event organizer
- Event updated → notifications sent to all attendees

**Database Triggers**: Located in migration `20250101_009_create_activity_log_triggers.sql`

---

## TypeScript Types

### Core Types

All types are defined in `src/lib/graphql/types.ts`:

```typescript
// Event Types
export type EventVisibilityType = 'company' | 'department' | 'specific';
export type EventStatus = 'draft' | 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
export type RsvpStatus = 'accepted' | 'declined' | 'tentative' | 'pending' | 'no_response';
export type EventType = 'meeting' | 'training' | 'social' | 'conference' | 'other';

export interface Event {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  eventType: EventType;
  visibilityType: EventVisibilityType;
  status: EventStatus;
  isAllDay: boolean;
  organizerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventAttendee {
  eventId: string;
  employeeId: string;
  rsvpStatus: RsvpStatus;
  respondedAt?: string;
}

// Task Types
export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string;
  completedAt?: string;
  assigneeId?: string;              // Employee task
  assignedToDepartmentId?: string;  // Department task
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

// Activity Log Types
export type ActivityAction = 'create' | 'update' | 'delete' | 'view' | 'login' | 'logout';
export type ResourceType =
  | 'employee'
  | 'task'
  | 'event'
  | 'leave_request'
  | 'performance_review'
  | 'department'
  | 'role'
  | 'goal'
  | 'document'
  | 'profile';

export interface ActivityLog {
  id: string;
  employeeId: string;
  action: ActivityAction;
  resourceType: ResourceType;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  createdAt: string;
}

// Notification Types
export type NotificationType = 'email' | 'in_app';
export type NotificationCategory =
  | 'task_assignment'
  | 'event_invitation'
  | 'leave_approval'
  | 'performance_review'
  | 'department_announcement'
  | 'system_alert'
  | 'reminder'
  | 'other';

export interface Notification {
  id: string;
  recipientId: string;
  title: string;
  message: string;
  category: NotificationCategory;
  type: NotificationType;
  read: boolean;
  readAt?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

// Common Interfaces
export interface UserReference {
  id: string;
  name: string;
  email?: string;
}

export interface DepartmentReference {
  id: string;
  name: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
```

### Type Guards

Utility type guards for runtime type checking:

```typescript
// Check task assignment type
export function isEmployeeTask(task: Task): boolean {
  return !!task.assigneeId && !task.assignedToDepartmentId;
}

export function isDepartmentTask(task: Task): boolean {
  return !task.assigneeId && !!task.assignedToDepartmentId;
}

// Check event visibility
export function isCompanyWideEvent(event: Event): boolean {
  return event.visibilityType === 'company';
}

export function isDepartmentEvent(event: Event): boolean {
  return event.visibilityType === 'department';
}

export function isSpecificEvent(event: Event): boolean {
  return event.visibilityType === 'specific';
}
```

---

## Error Handling

All operations include comprehensive error handling:

### Error Types

```typescript
interface ApiError {
  message: string;
  code?: string;
  statusCode?: number;
  details?: Record<string, any>;
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `UNAUTHENTICATED` | 401 | Missing or invalid JWT token |
| `FORBIDDEN` | 403 | Insufficient permissions for operation |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `CONFLICT` | 409 | Resource conflict (e.g., duplicate) |
| `INTERNAL_ERROR` | 500 | Server error |
| `TIMEOUT` | 504 | Operation timeout (default: 5s) |

### Error Handling Example

```typescript
try {
  const result = await eventsOps.createEvent(input, { token });
  return result.event;
} catch (error: any) {
  if (error.message?.includes('unauthorized')) {
    throw redirect(303, '/login');
  }

  if (error.message?.includes('forbidden')) {
    throw error(403, {
      message: 'Access denied. Manager privileges required.'
    });
  }

  console.error('Operation failed:', error);
  throw error(500, {
    message: 'Failed to create event. Please try again.'
  });
}
```

---

## Rate Limiting

### Default Limits

- **Query operations**: 100 requests per minute per user
- **Mutation operations**: 30 requests per minute per user
- **Bulk operations**: 10 requests per minute per user

### Retry Logic

All operations include automatic retry logic:
- **Max retries**: 3
- **Backoff strategy**: Exponential (1s, 2s, 4s)
- **Timeout**: 5 seconds per attempt (configurable)

---

## Best Practices

### 1. Server-Side Only

❌ **NEVER** call GraphQL operations from client components:

```svelte
<!-- ❌ WRONG: Client-side GraphQL call -->
<script>
  import { EventsOperations } from '$lib/graphql/events-operations';

  async function loadEvents() {
    const eventsOps = new EventsOperations();
    const result = await eventsOps.getAllEvents(/* ... */);
  }
</script>
```

✅ **CORRECT**: Server-side data loading:

```typescript
// ✅ CORRECT: +page.server.ts
export const load: PageServerLoad = async ({ locals, cookies }) => {
  const token = cookies.get('hr_token');
  const eventsOps = new EventsOperations();
  const result = await eventsOps.getAllEvents({}, { token });

  return {
    events: result.events
  };
};
```

### 2. Error Handling

Always handle authentication and authorization errors:

```typescript
try {
  const result = await operation();
  return result;
} catch (error: any) {
  // Handle authentication errors
  if (error.message?.includes('unauthorized')) {
    throw redirect(303, '/login');
  }

  // Handle authorization errors
  if (error.message?.includes('forbidden')) {
    throw error(403, { message: 'Access denied' });
  }

  // Handle not found errors
  if (error.message?.includes('not found')) {
    throw error(404, { message: 'Resource not found' });
  }

  // Generic error
  throw error(500, { message: 'Operation failed' });
}
```

### 3. Input Validation

Always validate inputs before making API calls:

```typescript
import { validateTaskInput } from '$lib/graphql/tasks-operations';

// Validate before creating task
const validation = validateTaskInput(input);
if (!validation.isValid) {
  throw error(400, {
    message: validation.errors.join(', ')
  });
}

const result = await tasksOps.createTask(input, { token });
```

### 4. Timeout Management

Configure timeouts based on operation complexity:

```typescript
// Quick operations (default: 5s)
const result = await eventsOps.getEventById(id, { token });

// Complex operations (custom timeout: 10s)
const result = await eventsOps.getAllEvents(
  { first: 1000 },
  { token, timeout: 10000 }
);
```

### 5. Pagination

Always use pagination for list queries:

```typescript
// ✅ CORRECT: Paginated query
const result = await tasksOps.getAllTasks(
  {
    first: 20,        // Limit results
    offset: page * 20 // Page offset
  },
  { token }
);

// ❌ WRONG: Unbounded query
const result = await tasksOps.getAllTasks({}, { token });
```

---

## Testing

### Contract Tests

All GraphQL operations have contract tests (TDD RED phase):

**Location**: `tests/contract/`
- `events-operations.test.ts` (9 test cases)
- `tasks-operations-enhanced.test.ts` (4 test cases)
- `activity-logs-operations.test.ts` (5 test cases)
- `notifications-operations.test.ts` (7 test cases)

**Status**: Tests currently FAIL (expected) - will pass after backend integration

### E2E Tests

Comprehensive E2E tests using Playwright:

**Location**: `tests/e2e/`
- `events/event-rsvp-workflow.spec.ts` (9 test cases)
- `tasks/task-assignment-employee.spec.ts` (11 test cases)
- `tasks/task-assignment-department.spec.ts` (12 test cases)
- `activities/activity-log-visibility.spec.ts` (11 test cases)
- `notifications/notification-delivery.spec.ts` (16 test cases)

**Total**: 59 E2E test cases covering all API operations

---

## Additional Resources

- **README.md** - Complete project documentation
- **CLAUDE.md** - Development guidelines and architecture
- **IMPLEMENTATION_PROGRESS.md** - Detailed progress tracking
- **Storybook Documentation** - Component usage guides

---

**API Version**: 1.0.0
**Feature Status**: 89% Complete (40 of 45 tasks)
**Last Updated**: 2025-10-01
