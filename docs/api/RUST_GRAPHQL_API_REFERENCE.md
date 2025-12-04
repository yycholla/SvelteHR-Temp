# Rust GraphQL API Reference

This document describes the actual GraphQL API exposed by the Rust backend.

## Query Patterns

### Pagination

All plural queries use **offset-based pagination**:

- `limit: Int` (default: 100, max: 1000)
- `offset: Int` (default: 0)

**NOT SUPPORTED**: Cursor-based pagination (`first`, `after`, `before`, `last`)

### Filtering

**NOT SUPPORTED**: Complex filter objects like:

```graphql
# ❌ WRONG - This doesn't work
departments(filter: { id: { equalTo: $id } })
users(filter: { departmentId: { equalTo: $dept } })
```

**SUPPORTED**: Specific filter parameters on certain queries:

```graphql
# ✅ CORRECT - Use singular query for ID lookup
department(id: $id)
user(id: $id)

# ✅ CORRECT - Use specific filter parameters
tasks(assigneeId: $userId, limit: 10)
activityLogs(userId: $userId, limit: 20)
```

### Naming Convention

- **GraphQL fields**: camelCase (auto-converted by async-graphql)
- **Database columns**: snake_case
- **Rust models**: snake_case

## Supported Queries

### User Queries

```graphql
# Get all users (paginated)
users(limit: Int, offset: Int): [User!]!

# Get single user by ID
user(id: UUID!): User
```

### Department Queries

```graphql
# Get all departments (paginated)
departments(limit: Int, offset: Int): [Department!]!

# Get single department by ID
department(id: UUID!): Department
```

### Task Queries

```graphql
# Get all tasks (with optional assignee filter)
tasks(assigneeId: UUID, limit: Int, offset: Int): [Task!]!

# Get single task by ID
task(id: UUID!): Task
```

### Leave Request Queries

```graphql
# Get all leave requests (paginated)
leaveRequests(limit: Int, offset: Int): [LeaveRequest!]!

# Get single leave request by ID
leaveRequest(id: UUID!): LeaveRequest
```

### Performance Review Queries

```graphql
# Get all performance reviews (paginated)
performanceReviews(limit: Int, offset: Int): [PerformanceReview!]!

# Get single performance review by ID
performanceReview(id: UUID!): PerformanceReview
```

### Activity Log Queries

```graphql
# Get activity logs (with optional user filter)
activityLogs(userId: UUID, limit: Int, offset: Int): [ActivityLog!]!

# Get single activity log by ID
activityLog(id: UUID!): ActivityLog
```

### Attendance Record Queries

```graphql
# Get attendance records (with optional user filter)
attendanceRecords(userId: UUID, limit: Int, offset: Int): [AttendanceRecord!]!
```

### Employee Goal Queries

```graphql
# Get employee goals (with optional employee filter)
employeeGoals(employeeId: UUID, limit: Int, offset: Int): [EmployeeGoal!]!
```

### Event Queries

```graphql
# Get events (with optional upcoming filter)
events(upcomingOnly: Boolean, limit: Int, offset: Int): [Event!]!

# Get single event by ID
event(id: UUID!): Event
```

### Event Attendee Queries

```graphql
# Get event attendees (with multiple optional filters)
eventAttendees(
  eventId: UUID,
  employeeId: UUID,
  reminderTimeIsNull: Boolean,
  limit: Int,
  offset: Int
): [EventAttendee!]!
```

### Notification Queries

```graphql
# Get notifications (with optional filters)
notifications(
  userId: UUID,
  unreadOnly: Boolean,
  limit: Int,
  offset: Int
): [Notification!]!
```

### Rollback Request Queries

```graphql
# Get rollback requests (with optional status filter)
rollbackRequests(
  status: RollbackStatus,
  limit: Int,
  offset: Int
): [RollbackRequest!]!

# Get count of rollback requests
rollbackRequestsCount(status: RollbackStatus): Int!
```

### System Settings Queries (Admin Only)

```graphql
# Get all system settings
systemSettings: [SystemSettings!]!

# Get system settings by category
systemSettingsByCategory(category: String!): SystemSettings
```

### Auth Queries

```graphql
# Get current authenticated user
me: User

# Get current user's session
mySession: SessionInfo

# Check authentication status
authStatus: Boolean!

# Get active sessions
sessions: [SessionInfo!]!

# Get CSRF token
csrfToken: String!
```

## Common Migration Patterns

### From PostGraphile to Rust GraphQL

#### 1. ID-Based Lookups

```graphql
# ❌ OLD (PostGraphile with filter)
query GetDepartment($id: UUID!) {
	departments(filter: { id: { equalTo: $id } }) {
		id
		name
	}
}

# ✅ NEW (Rust with singular query)
query GetDepartment($id: UUID!) {
	department(id: $id) {
		id
		name
	}
}
```

#### 2. Pagination

```graphql
# ❌ OLD (cursor-based)
query GetUsers($first: Int, $after: Cursor) {
	users(first: $first, after: $after) {
		nodes {
			id
			email
		}
		pageInfo {
			hasNextPage
			endCursor
		}
	}
}

# ✅ NEW (offset-based)
query GetUsers($limit: Int, $offset: Int) {
	users(limit: $limit, offset: $offset) {
		id
		email
	}
}
```

#### 3. Filtering

```graphql
# ❌ OLD (complex filter)
query GetUsersByDepartment($deptId: UUID!) {
	users(filter: { departmentId: { equalTo: $deptId } }) {
		id
		email
	}
}

# ✅ NEW (fetch all, filter server-side in +page.server.ts)
query GetAllUsers {
	users(limit: 1000) {
		id
		email
		departmentId
	}
}
# Then in +page.server.ts:
# const deptUsers = allUsers.filter(u => u.departmentId === deptId)
```

#### 4. Relationship Resolvers

```graphql
# ✅ Use relationship resolvers for foreign keys
query GetLeaveRequests {
	leaveRequests(limit: 10) {
		id
		startDate
		endDate
		# Use the relationship resolver, not the ID
		leaveType {
			id
			name
			color
			icon
		}
		# Both are available:
		leaveTypeId # UUID foreign key
	}
}
```

## Field Name Mapping

The following field names are mapped in the Rust models:

### Leave Request

- GraphQL: `leaveTypeId` → DB: `leave_type_id`
- GraphQL: `daysRequested` → DB: `total_days`
- GraphQL: `managerComments` → DB: `rejection_reason`

### Attendance Record

- GraphQL: `clockIn` → DB: `check_in`
- GraphQL: `clockOut` → DB: `check_out`

### Employee Goal

- GraphQL: `progressPercentage` → DB: `progress`

### Notification

- GraphQL: `recipientId` → DB: `user_id`
- GraphQL: `notificationType` → DB: `type`
- GraphQL: `readStatus` → DB: `is_read`
- GraphQL: `relatedResourceType` → DB: `related_entity_type`
- GraphQL: `relatedResourceId` → DB: `related_entity_id`

## Error Patterns

### Unknown Argument Error

```
Unknown argument "filter" on field "departments"
```

**Fix**: Remove `filter` argument, use singular query or specific filter parameters

### UUID Parse Error

```
Failed to parse "UUID": invalid character: expected an optional prefix of `urn:uuid:`
```

**Fix**: Validate UUID format before querying, or handle "new" route specially

### Unknown Field Error

```
Unknown field "leaveType" on type "leave_request_Model"
```

**Fix**: Use the relationship resolver with nested fields, not scalar
