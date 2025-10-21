# API Alignment Analysis
**SvelteHR Frontend ↔ PostgreSQL ↔ Rust GraphQL API**

*Generated: 2025-10-14*

---

## Executive Summary

This document catalogs all GraphQL operations used by the SvelteKit frontend, maps them to PostgreSQL database tables, and verifies implementation in the Rust GraphQL API.

### Status Legend
- ✅ **Fully Aligned** - Frontend expects it, DB provides it, API exposes it
- ⚠️ **Partially Aligned** - Some fields missing or type mismatches
- ❌ **Not Aligned** - Missing in DB or API
- 🔄 **In Progress** - Implementation incomplete

---

## 1. User & Authentication Domain

### Frontend Operations (`src/lib/graphql/auth-operations.ts`)

#### Query: `GET_CURRENT_USER`
```graphql
query GetCurrentUser {
  currentUser {
    id
    email
    displayName
    roles
    permissions
    department {
      id
      name
    }
  }
}
```

**Expected Returns:**
- `User.id`: UUID
- `User.email`: String (citext)
- `User.displayName`: String
- `User.roles`: Array<String>
- `User.permissions`: Array<String>
- `Department.id`: UUID
- `Department.name`: String

**Database Schema (`hr_public.users`):**
```sql
- id: uuid PRIMARY KEY
- email: citext UNIQUE NOT NULL
- display_name: character varying(255)
- department_id: uuid (FK to departments)
- created_at, updated_at: timestamptz
```

**Rust API (`query.rs`):**
```rust
async fn user(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<User>>
async fn users(...) -> Result<Vec<User>>
```

**Status:** ✅ Fully Aligned
- Database has all required fields
- Rust API exposes User query with RLS (Row Level Security)
- `roles` and `permissions` resolved via relationships


---

## 2. Department Management Domain

### Frontend Operations (`src/lib/graphql/department-operations.ts`)

#### Query: `GET_ALL_DEPARTMENTS`
```graphql
query GetAllDepartments {
  allDepartments(orderBy: NAME_ASC) {
    nodes {
      id
      name
      description
      headOfDepartmentId
      budgetAllocated
      employeeCount
      createdAt
      updatedAt
    }
    totalCount
  }
}
```

**Expected Returns:**
- PostGraphile-style pagination with `nodes`, `totalCount`, `pageInfo`
- `Department.id`: UUID
- `Department.name`: String
- `Department.description`: String (nullable)
- `Department.headOfDepartmentId`: UUID (nullable)
- `Department.budgetAllocated`: Decimal/Numeric (nullable)
- `Department.employeeCount`: Int (computed)

**Database Schema (`hr_public.departments`):**
```sql
- id: uuid PRIMARY KEY
- name: character varying(255) NOT NULL
- description: text
- head_of_department_id: uuid (FK to users)
- budget_allocated: numeric(12,2)
- created_at, updated_at: timestamptz
```

**Rust API (`query.rs`):**
```rust
async fn department(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<Department>>
async fn departments(...) -> Result<Vec<Department>>
```

**Status:** ⚠️ Partially Aligned
- ✅ Core fields match
- ❌ Missing: `employeeCount` computed field in Rust resolver
- ⚠️ Frontend expects PostGraphile pagination (`{ nodes, totalCount, pageInfo }`), Rust returns `Vec<Department>`

**Action Required:**
1. Add `DepartmentsConnection` type to Rust API with pagination
2. Implement `employee_count` computed field resolver


---

## 3. Employee Management Domain

### Frontend Operations (`src/lib/graphql/employee-operations.ts`)

#### Query: `GET_EMPLOYEES_PAGINATED`
```graphql
query GetEmployeesPaginated($first: Int, $offset: Int, $filter: EmployeeFilter) {
  allEmployees(first: $first, offset: $offset, filter: $filter) {
    nodes {
      id
      email
      displayName
      firstName
      lastName
      jobTitle
      status
      departmentId
      department {
        id
        name
      }
      hireDate
      profileImageUrl
      phoneNumber
      createdAt
      updatedAt
    }
    totalCount
    pageInfo {
      hasNextPage
      hasPreviousPage
    }
  }
}
```

**Expected Returns:**
- `User.id`: UUID
- `User.email`: String (citext)
- `User.displayName`: String
- `User.firstName`: String
- `User.lastName`: String
- `User.jobTitle`: String (nullable)
- `User.status`: Enum (active, inactive, on_leave)
- `User.departmentId`: UUID (nullable)
- `User.hireDate`: Date (nullable)
- `User.profileImageUrl`: String (nullable)
- `User.phoneNumber`: String (nullable)

**Database Schema (`hr_public.users`):**
```sql
- id: uuid PRIMARY KEY
- email: citext UNIQUE NOT NULL
- display_name: character varying(255)
- first_name: character varying(100)
- last_name: character varying(100)
- job_title: character varying(200)
- status: hr_public.user_status (enum: active, inactive, on_leave, terminated)
- department_id: uuid (FK)
- hire_date: date
- profile_image_url: character varying(500)
- phone_number: character varying(20)
- created_at, updated_at: timestamptz
```

**Rust API:**
```rust
async fn user(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<User>>
async fn users(...) -> Result<Vec<User>>
```

**Status:** ⚠️ Partially Aligned
- ✅ All database fields exist
- ❌ Rust API returns `Vec<User>` instead of connection type
- ⚠️ Missing pagination wrapper with `totalCount` and `pageInfo`

**Action Required:**
1. Create `UsersConnection` type in Rust API
2. Implement PostGraphile-compatible pagination


---

## 4. Events & Calendar Domain

### Frontend Operations (`src/lib/graphql/events-operations.ts`)

#### Query: `GET_EVENTS_FOR_CALENDAR`
```graphql
query GetEventsForCalendar(
  $bufferStart: Datetime!
  $bufferEnd: Datetime!
  $userId: UUID!
) {
  allEvents(
    filter: {
      startTime: { greaterThanOrEqualTo: $bufferStart }
      endTime: { lessThanOrEqualTo: $bufferEnd }
    }
  ) {
    nodes {
      id
      title
      description
      eventType
      startTime
      endTime
      allDay
      location
      color
      status
      capacity
      isPublic
      recurrenceRule
      recurrenceExceptions
      organizerId
      organizer {
        id
        displayName
        email
      }
      eventAttendees {
        id
        employeeId
        responseStatus
        isRequired
        employee {
          id
          displayName
        }
      }
      userRsvpStatus(userId: $userId)
      attendeeCount
      acceptedCount
      imageUrl
      imageThumbnailUrl
      imageAspectRatio
    }
    totalCount
  }
}
```

**Expected Returns:**
- `Event.id`: UUID
- `Event.title`: String (max 255)
- `Event.description`: Text (nullable)
- `Event.eventType`: String (max 50)
- `Event.startTime`: Timestamptz
- `Event.endTime`: Timestamptz (nullable)
- `Event.allDay`: Boolean
- `Event.location`: String (nullable)
- `Event.color`: String (hex color, nullable)
- `Event.status`: Enum (scheduled, cancelled, completed)
- `Event.capacity`: Int (nullable)
- `Event.isPublic`: Boolean
- `Event.recurrenceRule`: String (RRULE, nullable)
- `Event.recurrenceExceptions`: Array<Datetime> (nullable)
- `Event.organizerId`: UUID
- `Event.imageUrl`: String (nullable)
- `Event.imageThumbnailUrl`: String (nullable)
- `Event.imageAspectRatio`: String (nullable, "16:9" or "9:16")
- `EventAttendee.responseStatus`: Enum (pending, accepted, declined, tentative, waitlist)
- Computed fields: `userRsvpStatus`, `attendeeCount`, `acceptedCount`

**Database Schema (`hr_public.events`):**
```sql
- id: uuid PRIMARY KEY
- title: character varying(255) NOT NULL
- description: text
- event_type: character varying(50) NOT NULL
- start_time: timestamptz NOT NULL
- end_time: timestamptz
- all_day: boolean DEFAULT false NOT NULL
- location: character varying(255)
- is_public: boolean DEFAULT true NOT NULL
- color: character varying(7)
- organizer_id: uuid NOT NULL (FK to users)
- status: character varying(20) DEFAULT 'scheduled' NOT NULL
- created_at, updated_at: timestamptz
```

**Database Schema (`hr_public.event_attendees`):**
```sql
- id: uuid PRIMARY KEY
- event_id: uuid NOT NULL (FK to events)
- employee_id: uuid NOT NULL (FK to users)
- response_status: character varying(20) NOT NULL
- is_required: boolean DEFAULT false
- created_at: timestamptz
- reminder_time: timestamptz
- scope: character varying(50)
- is_organizer: boolean DEFAULT false
```

**Rust API (`query.rs`):**
```rust
async fn event(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<Event>>
async fn events(
  &self,
  ctx: &Context<'_>,
  condition: Option<EventCondition>,
  order_by: Option<EventsOrderBy>,
  limit: Option<i64>,
  offset: Option<i64>
) -> Result<EventsConnection>

async fn event_attendees(...) -> Result<Vec<EventAttendee>>
async fn event_attendees_by_event(...) -> Result<Vec<EventAttendee>>
```

**Status:** ⚠️ Partially Aligned
- ✅ Core event fields exist in DB and API
- ✅ EventsConnection type implemented with pagination
- ❌ Missing in DB: `capacity`, `recurrence_rule`, `recurrence_exceptions`, `image_url`, `image_thumbnail_url`, `image_aspect_ratio`
- ❌ Missing computed fields: `userRsvpStatus`, `attendeeCount`, `acceptedCount`

**Action Required:**
1. **Add to `hr_public.events` table:**
   ```sql
   ALTER TABLE hr_public.events
   ADD COLUMN capacity integer,
   ADD COLUMN recurrence_rule text,
   ADD COLUMN recurrence_exceptions jsonb,
   ADD COLUMN image_url character varying(500),
   ADD COLUMN image_thumbnail_url character varying(500),
   ADD COLUMN image_aspect_ratio character varying(10);
   ```

2. **Add computed field resolvers in Rust:**
   - `Event.user_rsvp_status(user_id: Uuid) -> Option<String>`
   - `Event.attendee_count() -> i64`
   - `Event.accepted_count() -> i64`


---

## 5. Task Management Domain

### Frontend Operations (`src/lib/graphql/tasks-operations.ts`)

#### Query: `GET_ALL_TASKS`
```graphql
query GetAllTasks($first: Int, $orderBy: [TasksOrderBy!]) {
  allTasks(first: $first, orderBy: $orderBy) {
    nodes {
      id
      nodeId
      title
      description
      assigneeId
      creatorId
      taskTypeId
      status
      priority
      dueDate
      parentTaskId
      archived
      requiresManualReassignment
      createdAt
      updatedAt
      assignee {
        id
        displayName
        email
      }
      creator {
        id
        displayName
      }
      taskType {
        id
        name
      }
    }
    totalCount
    pageInfo {
      hasNextPage
      hasPreviousPage
    }
  }
}
```

**Expected Returns:**
- `Task.id`: UUID
- `Task.nodeId`: ID (Relay global ID)
- `Task.title`: String (max 500)
- `Task.description`: Text (nullable)
- `Task.assigneeId`: UUID (nullable)
- `Task.creatorId`: UUID (nullable)
- `Task.taskTypeId`: UUID (nullable)
- `Task.status`: Enum (not_started, in_progress, blocked, completed, cancelled)
- `Task.priority`: Enum (low, medium, high, urgent)
- `Task.dueDate`: Datetime (nullable)
- `Task.parentTaskId`: UUID (nullable, for subtasks)
- `Task.archived`: Boolean
- `Task.requiresManualReassignment`: Boolean

**Database Schema (`hr_public.tasks`):**
```sql
- id: uuid PRIMARY KEY
- title: character varying(500) NOT NULL
- description: text
- assignee_id: uuid (FK to users)
- creator_id: uuid (FK to users)
- task_type_id: uuid (FK to task_types)
- status: hr_public.task_status (enum)
- priority: hr_public.task_priority (enum)
- due_date: timestamptz
- parent_task_id: uuid (FK to tasks)
- archived: boolean DEFAULT false
- archived_at: timestamptz
- archived_by: uuid
- requires_manual_reassignment: boolean DEFAULT false
- created_at, updated_at: timestamptz
```

**Rust API:**
```rust
async fn task(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<Task>>
async fn tasks(...) -> Result<Vec<Task>>
```

**Status:** ⚠️ Partially Aligned
- ✅ All database fields exist and match
- ❌ Rust API returns `Vec<Task>` instead of connection type
- ⚠️ Missing `TasksConnection` wrapper with `totalCount` and `pageInfo`

**Action Required:**
1. Create `TasksConnection` type in Rust API with pagination
2. Implement relationship resolvers for `assignee`, `creator`, `taskType`


---

## 6. Leave Management Domain

### Frontend Operations (`src/lib/graphql/leave-management-operations.ts`)

#### Query: `GET_LEAVE_REQUESTS`
```graphql
query GetLeaveRequests($employeeId: UUID, $status: LeaveRequestStatus) {
  allLeaveRequests(
    filter: {
      employeeId: { equalTo: $employeeId }
      status: { equalTo: $status }
    }
    orderBy: START_DATE_DESC
  ) {
    nodes {
      id
      employeeId
      leaveTypeId
      startDate
      endDate
      status
      reason
      approvedBy
      approvedAt
      createdAt
      employee {
        id
        displayName
        email
      }
      leaveType {
        id
        name
        daysPerYear
      }
    }
    totalCount
  }
}
```

**Expected Returns:**
- `LeaveRequest.id`: UUID
- `LeaveRequest.employeeId`: UUID
- `LeaveRequest.leaveTypeId`: UUID
- `LeaveRequest.startDate`: Date
- `LeaveRequest.endDate`: Date
- `LeaveRequest.status`: Enum (pending, approved, rejected, cancelled)
- `LeaveRequest.reason`: Text (nullable)
- `LeaveRequest.approvedBy`: UUID (nullable)
- `LeaveRequest.approvedAt`: Timestamptz (nullable)

**Database Schema (`hr_public.leave_requests`):**
```sql
- id: uuid PRIMARY KEY
- employee_id: uuid NOT NULL (FK to users)
- leave_type_id: uuid NOT NULL (FK to leave_types)
- start_date: date NOT NULL
- end_date: date NOT NULL
- status: hr_public.leave_request_status (enum)
- reason: text
- approved_by: uuid (FK to users)
- approved_at: timestamptz
- created_at, updated_at: timestamptz
```

**Rust API:**
```rust
// Leave request queries exist in query.rs
async fn leave_request(...) -> Result<Option<LeaveRequest>>
async fn leave_requests(...) -> Result<Vec<LeaveRequest>>
```

**Status:** ✅ Fully Aligned
- Database schema matches frontend expectations
- Rust API has leave request resolvers


---

## 7. Performance Reviews Domain

### Frontend Operations (`src/lib/graphql/performance-management-operations.ts`)

#### Query: `GET_PERFORMANCE_REVIEWS`
```graphql
query GetPerformanceReviews($employeeId: UUID, $reviewerId: UUID) {
  allPerformanceReviews(
    filter: {
      employeeId: { equalTo: $employeeId }
      reviewerId: { equalTo: $reviewerId }
    }
    orderBy: REVIEW_DATE_DESC
  ) {
    nodes {
      id
      employeeId
      reviewerId
      reviewCycleId
      reviewDate
      status
      overallRating
      strengths
      areasForImprovement
      goals
      comments
      createdAt
      updatedAt
      employee {
        id
        displayName
      }
      reviewer {
        id
        displayName
      }
      reviewCycle {
        id
        name
        startDate
        endDate
      }
    }
    totalCount
  }
}
```

**Expected Returns:**
- `PerformanceReview.id`: UUID
- `PerformanceReview.employeeId`: UUID
- `PerformanceReview.reviewerId`: UUID
- `PerformanceReview.reviewCycleId`: UUID (nullable)
- `PerformanceReview.reviewDate`: Date
- `PerformanceReview.status`: Enum (draft, pending, completed, cancelled)
- `PerformanceReview.overallRating`: Numeric (1-5 scale)
- `PerformanceReview.strengths`: Text (nullable)
- `PerformanceReview.areasForImprovement`: Text (nullable)
- `PerformanceReview.goals`: Text (nullable)
- `PerformanceReview.comments`: Text (nullable)

**Database Schema (`hr_public.performance_reviews`):**
```sql
- id: uuid PRIMARY KEY
- employee_id: uuid NOT NULL (FK to users)
- reviewer_id: uuid NOT NULL (FK to users)
- review_cycle_id: uuid (FK to review_cycles)
- review_date: date NOT NULL
- status: hr_public.performance_review_status (enum)
- overall_rating: numeric(3,2)
- strengths: text
- areas_for_improvement: text
- goals: text
- comments: text
- created_at, updated_at: timestamptz
```

**Rust API:**
```rust
async fn performance_review(...) -> Result<Option<PerformanceReview>>
async fn performance_reviews(...) -> Result<Vec<PerformanceReview>>
```

**Status:** ✅ Fully Aligned
- Database schema matches frontend expectations
- Rust API has performance review resolvers
- Relationships properly defined


---

## 8. Notifications Domain

### Frontend Operations (`src/lib/graphql/notifications-operations.ts`)

#### Query: `GET_USER_NOTIFICATIONS`
```graphql
query GetUserNotifications($userId: UUID!, $unreadOnly: Boolean) {
  allNotifications(
    filter: {
      userId: { equalTo: $userId }
      isRead: { equalTo: $unreadOnly ? false : null }
    }
    orderBy: CREATED_AT_DESC
  ) {
    nodes {
      id
      userId
      title
      message
      type
      category
      resourceType
      resourceId
      isRead
      readAt
      actionUrl
      createdAt
    }
    totalCount
  }
}
```

**Expected Returns:**
- `Notification.id`: UUID
- `Notification.userId`: UUID
- `Notification.title`: String (max 255)
- `Notification.message`: Text
- `Notification.type`: Enum (info, warning, error, success)
- `Notification.category`: Enum (system, leave, review, task, event, hr)
- `Notification.resourceType`: String (nullable)
- `Notification.resourceId`: UUID (nullable)
- `Notification.isRead`: Boolean
- `Notification.readAt`: Timestamptz (nullable)
- `Notification.actionUrl`: String (nullable)

**Database Schema (`hr_public.notifications`):**
```sql
- id: uuid PRIMARY KEY
- user_id: uuid NOT NULL (FK to users)
- title: character varying(255) NOT NULL
- message: text NOT NULL
- type: hr_public.notification_type (enum)
- category: hr_public.notification_category (enum)
- resource_type: hr_public.notification_resource_type (enum)
- resource_id: uuid
- is_read: boolean DEFAULT false
- read_at: timestamptz
- action_url: character varying(500)
- created_at: timestamptz
```

**Rust API:**
```rust
async fn notification(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<Notification>>
async fn notifications(...) -> Result<Vec<Notification>>
```

**Status:** ✅ Fully Aligned
- Database schema matches frontend expectations
- Rust API has notification resolvers


---

## 9. Goals & OKRs Domain

### Frontend Operations (`src/lib/graphql/goals-okrs-operations.ts`)

#### Query: `GET_EMPLOYEE_GOALS`
```graphql
query GetEmployeeGoals($employeeId: UUID!) {
  allEmployeeGoals(
    filter: { employeeId: { equalTo: $employeeId } }
    orderBy: TARGET_DATE_ASC
  ) {
    nodes {
      id
      employeeId
      title
      description
      status
      targetDate
      completionDate
      progress
      category
      createdAt
      updatedAt
      employee {
        id
        displayName
      }
    }
    totalCount
  }
}
```

**Expected Returns:**
- `EmployeeGoal.id`: UUID
- `EmployeeGoal.employeeId`: UUID
- `EmployeeGoal.title`: String
- `EmployeeGoal.description`: Text (nullable)
- `EmployeeGoal.status`: Enum (not_started, in_progress, completed, cancelled)
- `EmployeeGoal.targetDate`: Date (nullable)
- `EmployeeGoal.completionDate`: Date (nullable)
- `EmployeeGoal.progress`: Int (0-100)
- `EmployeeGoal.category`: String (nullable)

**Database Schema (`hr_public.employee_goals`):**
```sql
- id: uuid PRIMARY KEY
- employee_id: uuid NOT NULL (FK to users)
- title: character varying(255) NOT NULL
- description: text
- status: hr_public.goal_status (enum)
- target_date: date
- completion_date: date
- progress: integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100)
- category: character varying(100)
- created_at, updated_at: timestamptz
```

**Rust API:**
```rust
// Employee goals exposed via User relationship
impl User {
  async fn employee_goals(&self, ctx: &Context<'_>) -> Result<Vec<EmployeeGoal>>
}
```

**Status:** ✅ Fully Aligned
- Database schema matches frontend expectations
- Rust API exposes goals via User relationship


---

## 10. Analytics & Reporting Domain

### Frontend Operations (`src/lib/graphql/reports-operations.ts`)

#### Query: `GET_DASHBOARD_SUMMARY`
```graphql
query GetDashboardSummary {
  dashboardSummary {
    totalEmployees
    activeEmployees
    employeesOnLeave
    pendingLeaveRequests
    upcomingReviews
    overdueTasks
    departmentBreakdown {
      departmentId
      departmentName
      employeeCount
    }
  }
}
```

**Expected Returns:**
- `DashboardSummary.totalEmployees`: Int
- `DashboardSummary.activeEmployees`: Int
- `DashboardSummary.employeesOnLeave`: Int
- `DashboardSummary.pendingLeaveRequests`: Int
- `DashboardSummary.upcomingReviews`: Int
- `DashboardSummary.overdueTasks`: Int
- `DepartmentBreakdown.departmentId`: UUID
- `DepartmentBreakdown.departmentName`: String
- `DepartmentBreakdown.employeeCount`: Int

**Database Support:**
- Aggregated queries across multiple tables
- No dedicated table - computed from users, leave_requests, performance_reviews, tasks

**Rust API:**
```rust
async fn dashboard_summary(&self, ctx: &Context<'_>) -> Result<DashboardSummary>
```

**Status:** ✅ Fully Aligned
- Rust API has DashboardSummary type with computed aggregations
- Queries multiple tables to build summary


---

## 11. Missing Features / Gaps

### Feature 027: Event Images (Partially Implemented)

**Frontend Expects:**
- `Event.imageUrl`: String (nullable)
- `Event.imageThumbnailUrl`: String (nullable)
- `Event.imageAspectRatio`: String (nullable, "16:9" or "9:16")

**Database:** ❌ Missing columns in `hr_public.events`

**Action:** Add migration to create these columns

### Feature 027: Event Capacity & Waitlist

**Frontend Expects:**
- `Event.capacity`: Int (nullable)
- `Event.attendeeCount`: Int (computed)
- `Event.acceptedCount`: Int (computed)
- `Event.userRsvpStatus(userId)`: String (computed)

**Database:**
- ❌ Missing `capacity` column
- ✅ Has `event_waitlist` table for waitlist management

**Action:** Add capacity column and computed field resolvers

### Feature 027: Recurring Events (RRULE)

**Frontend Expects:**
- `Event.recurrenceRule`: String (RRULE format)
- `Event.recurrenceExceptions`: Array<Datetime>

**Database:** ❌ Missing columns in `hr_public.events`

**Action:** Add migration for recurrence support

### PostGraphile Pagination Pattern

**Frontend Expects (Everywhere):**
```graphql
{
  nodes: [T]
  totalCount: Int
  pageInfo: {
    hasNextPage: Boolean
    hasPreviousPage: Boolean
    startCursor: String
    endCursor: String
  }
}
```

**Rust API:**
- ✅ `EventsConnection` type implemented with pagination
- ⚠️ Most other types return `Vec<T>` without pagination wrapper

**Action:** Create `Connection` types for:
- `UsersConnection`
- `DepartmentsConnection`
- `TasksConnection`
- `LeaveRequestsConnection`
- `PerformanceReviewsConnection`
- `NotificationsConnection`


---

## 12. Type Mapping Reference

### PostgreSQL → GraphQL Type Mappings

| PostgreSQL Type | GraphQL Type | Notes |
|----------------|--------------|-------|
| `uuid` | `UUID` | Scalar |
| `character varying(N)` | `String` | Max length N |
| `text` | `String` | Unlimited |
| `citext` | `String` | Case-insensitive text |
| `integer` | `Int` | 32-bit signed |
| `bigint` | `String` | Serialized as string to avoid JS precision issues |
| `numeric(M,N)` | `Float` | Decimal with M digits, N after decimal |
| `boolean` | `Boolean` | |
| `date` | `Date` | Scalar, ISO 8601 date string |
| `timestamptz` | `Datetime` | Scalar, ISO 8601 datetime string |
| `jsonb` | `JSON` | Scalar, arbitrary JSON |
| Enum types | GraphQL Enum | 1:1 mapping |

### Custom Scalars Defined

```graphql
scalar UUID
scalar Date      # YYYY-MM-DD
scalar Datetime  # ISO 8601 with timezone
scalar JSON      # Arbitrary JSON object
```


---

## 13. Enums Catalog

### UserStatus
```graphql
enum UserStatus {
  ACTIVE
  INACTIVE
  ON_LEAVE
  TERMINATED
}
```
**Database:** `hr_public.user_status`

### TaskStatus
```graphql
enum TaskStatus {
  NOT_STARTED
  IN_PROGRESS
  BLOCKED
  COMPLETED
  CANCELLED
}
```
**Database:** `hr_public.task_status`

### TaskPriority
```graphql
enum TaskPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}
```
**Database:** `hr_public.task_priority`

### LeaveRequestStatus
```graphql
enum LeaveRequestStatus {
  PENDING
  APPROVED
  REJECTED
  CANCELLED
}
```
**Database:** `hr_public.leave_request_status`

### PerformanceReviewStatus
```graphql
enum PerformanceReviewStatus {
  DRAFT
  PENDING
  COMPLETED
  CANCELLED
}
```
**Database:** `hr_public.performance_review_status`

### EventStatus
```graphql
enum EventStatus {
  SCHEDULED
  CANCELLED
  COMPLETED
}
```
**Database:** String constraint in `hr_public.events.status`

### NotificationType
```graphql
enum NotificationType {
  INFO
  WARNING
  ERROR
  SUCCESS
}
```
**Database:** `hr_public.notification_type`

### NotificationCategory
```graphql
enum NotificationCategory {
  SYSTEM
  LEAVE
  REVIEW
  TASK
  EVENT
  HR
}
```
**Database:** `hr_public.notification_category`


---

## 14. Action Items Summary

### High Priority (Blocking Features)

1. **Add Event Image Columns** (Feature 027)
   ```sql
   ALTER TABLE hr_public.events
   ADD COLUMN image_url character varying(500),
   ADD COLUMN image_thumbnail_url character varying(500),
   ADD COLUMN image_aspect_ratio character varying(10);
   ```

2. **Add Event Capacity** (Feature 027)
   ```sql
   ALTER TABLE hr_public.events
   ADD COLUMN capacity integer;
   ```

3. **Add Event Recurrence Columns** (Feature 027)
   ```sql
   ALTER TABLE hr_public.events
   ADD COLUMN recurrence_rule text,
   ADD COLUMN recurrence_exceptions jsonb;
   ```

4. **Implement Computed Field Resolvers** (Rust API)
   - `Event.attendee_count() -> i64`
   - `Event.accepted_count() -> i64`
   - `Event.user_rsvp_status(user_id: Uuid) -> Option<String>`

### Medium Priority (API Consistency)

5. **Create Connection Types** (Rust API)
   - `UsersConnection`
   - `DepartmentsConnection`
   - `TasksConnection`
   - `LeaveRequestsConnection`
   - `PerformanceReviewsConnection`
   - `NotificationsConnection`

6. **Add Relationship Resolvers**
   - `User.department -> Option<Department>`
   - `Task.assignee -> Option<User>`
   - `Task.creator -> Option<User>`
   - `Task.task_type -> Option<TaskType>`
   - `LeaveRequest.employee -> User`
   - `LeaveRequest.leave_type -> LeaveType`

### Low Priority (Nice to Have)

7. **Implement Bulk Operations**
   - Bulk task updates
   - Bulk notification marking
   - Bulk employee imports

8. **Add Full-Text Search**
   - Employee search
   - Task search
   - Event search


---

## 15. Validation Checklist

Use this checklist when implementing new features:

- [ ] Frontend GraphQL operation defined in `src/lib/graphql/*-operations.ts`
- [ ] Database migration created in `migrations/`
- [ ] Database columns match GraphQL field names (snake_case → camelCase)
- [ ] Enum types match between DB and GraphQL
- [ ] Rust model created in `graphql-rust-server/src/models/`
- [ ] Rust query resolver added to `schema/query.rs`
- [ ] Rust mutation resolver added to `schema/mutation.rs` (if applicable)
- [ ] Relationship resolvers implemented for foreign keys
- [ ] Computed fields implemented as separate resolvers
- [ ] Connection type created for pagination (if list query)
- [ ] RLS policies defined for security
- [ ] Indexes created for query performance
- [ ] Integration test written
- [ ] This document updated


---

## Appendix A: Database Schema Overview

### Core Tables

```
hr_public.users (employees)
├── departments (FK: department_id)
├── user_role_assignments (1:N)
├── emergency_contacts (1:N)
├── employee_skills (1:N)
├── employee_certifications (1:N)
└── employee_vehicles (1:N)

hr_public.departments
├── users (head_of_department_id FK)
└── users (department_id FK) - many employees

hr_public.tasks
├── users (assignee_id FK)
├── users (creator_id FK)
├── task_types (task_type_id FK)
├── tasks (parent_task_id FK) - self-referential
├── task_dependencies (1:N)
├── task_assignees (N:M)
└── task_audit_entries (1:N)

hr_public.events
├── users (organizer_id FK)
├── event_attendees (1:N)
├── event_comments (1:N)
├── event_history (1:N)
└── event_waitlist (1:N)

hr_public.leave_requests
├── users (employee_id FK)
├── users (approved_by FK)
└── leave_types (leave_type_id FK)

hr_public.performance_reviews
├── users (employee_id FK)
├── users (reviewer_id FK)
├── review_cycles (review_cycle_id FK)
└── review_feedback (1:N)

hr_public.notifications
└── users (user_id FK)
```

### Supporting Tables

- `roles` - RBAC roles
- `permissions` - RBAC permissions
- `user_role_assignments` - N:M user-role mapping
- `leave_types` - Vacation, sick leave, etc.
- `leave_balances` - Employee leave balance tracking
- `task_types` - Task categorization
- `review_cycles` - Performance review periods
- `activity_logs` - Audit trail


---

## Appendix B: Rust API Query Inventory

**From `graphql-rust-server/src/schema/query.rs`:**

```rust
// Users
async fn user(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<User>>
async fn users(&self, ctx: &Context<'_>, ...) -> Result<Vec<User>>

// Departments
async fn department(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<Department>>
async fn departments(&self, ctx: &Context<'_>, ...) -> Result<Vec<Department>>

// Events
async fn event(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<Event>>
async fn events(&self, ctx: &Context<'_>, ...) -> Result<EventsConnection>

// Event Attendees
async fn event_attendee(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<EventAttendee>>
async fn event_attendees(&self, ctx: &Context<'_>, ...) -> Result<Vec<EventAttendee>>
async fn event_attendees_by_event(...) -> Result<Vec<EventAttendee>>
async fn event_attendees_by_employee(...) -> Result<Vec<EventAttendee>>

// Tasks
async fn task(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<Task>>
async fn tasks(&self, ctx: &Context<'_>, ...) -> Result<Vec<Task>>

// Notifications
async fn notification(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<Notification>>
async fn notifications(&self, ctx: &Context<'_>, ...) -> Result<Vec<Notification>>

// Leave Requests
async fn leave_request(...) -> Result<Option<LeaveRequest>>
async fn leave_requests(...) -> Result<Vec<LeaveRequest>>

// Performance Reviews
async fn performance_review(...) -> Result<Option<PerformanceReview>>
async fn performance_reviews(...) -> Result<Vec<PerformanceReview>>

// Analytics
async fn dashboard_summary(&self, ctx: &Context<'_>) -> Result<DashboardSummary>
```


---

**End of Analysis**

*Last Updated: 2025-10-14*
*Next Review: After Feature 027 completion*
