# Rust GraphQL Backend - Idiomatic API Reference

**Generated**: 2025-10-20
**Backend**: SeaORM + async-graphql
**Convention**: Idiomatic Rust patterns ONLY (PostGraphile aliases excluded)

---

## 🎯 Usage Guidelines

**CRITICAL**: This document lists ONLY the idiomatic Rust patterns that should be used in the migration.

- ✅ **USE**: Patterns documented in this file
- ❌ **AVOID**: PostGraphile-compatible aliases (e.g., `allEvents`, `userByOrganizerId`, `eventAttendeesByEventId`, `.nodes`, `ByNodeId`)
- ⚠️ **Exception**: Only use PostGraphile patterns if idiomatic pattern causes feature loss

---

## 📊 Query Reference

### User Queries

#### `users(limit, offset)`

Get all active users with pagination.

**Parameters**:

- `limit: Int` - Maximum number of users (1-1000, default: 100)
- `offset: Int` - Number of users to skip (default: 0)

**Returns**: `[User!]!`

**Filters**:

- Automatically filters by `isActive: true`
- Automatically filters by `deletedAt: null`

**Example**:

```graphql
query {
	users(limit: 50, offset: 0) {
		id
		email
		firstName
		lastName
		fullName
		displayName
		role
		phoneNumber
		jobTitle
		status
		departmentId
		managerId
		hireDate
		terminationDate
		isActive
		createdAt
		updatedAt
	}
}
```

---

#### `user(id)`

Get a single user by ID.

**Parameters**:

- `id: UUID!` - User ID

**Returns**: `User`

**Example**:

```graphql
query {
	user(id: "550e8400-e29b-41d4-a716-446655440000") {
		id
		email
		fullName
		department {
			id
			name
		}
		manager {
			id
			fullName
		}
	}
}
```

---

#### `me()`

Get current authenticated user.

**Parameters**: None

**Returns**: `User`

**Example**:

```graphql
query {
	me {
		id
		email
		fullName
		role
	}
}
```

---

### Department Queries

#### `departments(limit, offset)`

Get all departments with pagination.

**Parameters**:

- `limit: Int` - Maximum number of departments (1-1000, default: 100)
- `offset: Int` - Number to skip (default: 0)

**Returns**: `[Department!]!`

**Ordered By**: `name ASC`

**Example**:

```graphql
query {
	departments(limit: 100) {
		id
		name
		description
		managerId
		createdAt
		updatedAt
	}
}
```

---

#### `department(id)`

Get a single department by ID.

**Parameters**:

- `id: UUID!` - Department ID

**Returns**: `Department`

---

### Task Queries

#### `tasks(assigneeId, limit, offset)`

Get tasks with optional assignee filtering.

**Parameters**:

- `assigneeId: UUID` - Filter by assigned user (optional)
- `limit: Int` - Maximum number (1-1000, default: 100)
- `offset: Int` - Number to skip (default: 0)

**Returns**: `[Task!]!`

**Ordered By**: `createdAt DESC`

**Example**:

```graphql
query {
	tasks(assigneeId: "550e8400-e29b-41d4-a716-446655440000", limit: 20) {
		id
		title
		description
		status
		priority
		dueDate
		assigneeId
		assignee {
			id
			fullName
		}
		createdAt
		updatedAt
	}
}
```

**⚠️ Backend Gap**: Missing advanced filters (`status`, `priority`, `dueDate` ranges)

---

#### `task(id)`

Get a single task by ID.

**Parameters**:

- `id: UUID!` - Task ID

**Returns**: `Task`

---

### Event Queries

#### `events(upcomingOnly, limit, offset)`

Get events with optional upcoming filter.

**Parameters**:

- `upcomingOnly: Boolean` - Filter for scheduled upcoming events (default: false)
- `limit: Int` - Maximum number (1-1000, default: 100)
- `offset: Int` - Number to skip (default: 0)

**Returns**: `[Event!]!`

**Ordered By**: `startTime ASC`

**Filters** (when `upcomingOnly: true`):

- `startTime >= now()`
- `status = "scheduled"`

**Example**:

```graphql
query {
	events(upcomingOnly: true, limit: 50) {
		id
		title
		description
		eventType
		location
		startTime
		endTime
		isAllDay
		status
		isPublic
		color
		organizerId
		recurrenceRule
		recurrenceEndDate
		capacity
		imageUrl
		imageAspectRatio
		createdAt
		updatedAt
	}
}
```

**⚠️ Backend Gap**: Missing `userId` filter for user-specific events

---

#### `event(id)`

Get a single event by ID.

**Parameters**:

- `id: UUID!` - Event ID

**Returns**: `Event`

---

### Event Attendee Queries

#### `eventAttendees(eventId, employeeId, reminderTimeIsNull, limit, offset)`

Get event attendees with flexible filtering.

**Parameters**:

- `eventId: UUID` - Filter by event (optional)
- `employeeId: UUID` - Filter by employee (optional)
- `reminderTimeIsNull: Boolean` - Filter by reminder presence (optional)
- `limit: Int` - Maximum number (1-1000, default: 100)
- `offset: Int` - Number to skip (default: 0)

**Returns**: `[EventAttendee!]!`

**Ordered By**: `createdAt DESC`

**Example**:

```graphql
query {
	eventAttendees(eventId: "...", limit: 100) {
		id
		eventId
		employeeId
		responseStatus
		isRequired
		reminderTime
		scope
		isOrganizer
		createdAt
	}
}
```

---

### Leave Request Queries

#### `leaveRequests(employeeId, limit, offset)`

Get leave requests with optional employee filtering.

**Parameters**:

- `employeeId: UUID` - Filter by employee (optional)
- `limit: Int` - Maximum number (1-1000, default: 100)
- `offset: Int` - Number to skip (default: 0)

**Returns**: `[LeaveRequest!]!`

**Ordered By**: `createdAt DESC`

**Example**:

```graphql
query {
	leaveRequests(employeeId: "...", limit: 50) {
		id
		employeeId
		leaveTypeId
		startDate
		endDate
		reason
		status
		approverId
		approvedAt
		createdAt
		updatedAt
	}
}
```

---

#### `leaveRequest(id)`

Get a single leave request by ID.

**Parameters**:

- `id: UUID!` - Leave request ID

**Returns**: `LeaveRequest`

---

### Leave Balance Queries

#### `leaveBalances(employeeId, limit, offset)`

Get leave balances with optional employee filtering.

**Parameters**:

- `employeeId: UUID` - Filter by employee (optional)
- `limit: Int` - Maximum number (1-1000, default: 100)
- `offset: Int` - Number to skip (default: 0)

**Returns**: `[LeaveBalance!]!`

**Ordered By**: `year DESC`

---

### Leave Type Queries

#### `leaveTypes(limit, offset)`

Get all active leave types.

**Parameters**:

- `limit: Int` - Maximum number (1-1000, default: 100)
- `offset: Int` - Number to skip (default: 0)

**Returns**: `[LeaveType!]!`

**Ordered By**: `name ASC`

**Example**:

```graphql
query {
	leaveTypes {
		id
		name
		color
		description
		defaultDays
		requiresApproval
		createdAt
		updatedAt
	}
}
```

**⚠️ Note**: `icon` field removed - does not exist in backend

---

#### `leaveType(id)`

Get a single leave type by ID.

**Parameters**:

- `id: UUID!` - Leave type ID

**Returns**: `LeaveType`

---

### Performance Review Queries

#### `performanceReviews(employeeId, limit, offset)`

Get performance reviews with optional employee filtering.

**Parameters**:

- `employeeId: UUID` - Filter by employee (optional)
- `limit: Int` - Maximum number (1-1000, default: 100)
- `offset: Int` - Number to skip (default: 0)

**Returns**: `[PerformanceReview!]!`

**Ordered By**: `createdAt DESC`

---

#### `performanceReview(id)`

Get a single performance review by ID.

**Parameters**:

- `id: UUID!` - Performance review ID

**Returns**: `PerformanceReview`

**⚠️ Backend Gap**: Missing advanced filters (`status`, `reviewerId`, `date` ranges)

---

### Activity Log Queries

#### `activityLogs(userId, limit, offset)`

Get activity logs with optional user filtering.

**Parameters**:

- `userId: UUID` - Filter by user (optional)
- `limit: Int` - Maximum number (1-1000, default: 100)
- `offset: Int` - Number to skip (default: 0)

**Returns**: `[ActivityLog!]!`

**Ordered By**: `createdAt DESC`

**⚠️ Backend Gap**: Missing date range filtering

---

#### `activityLog(id)`

Get a single activity log by ID.

**Parameters**:

- `id: UUID!` - Activity log ID

**Returns**: `ActivityLog`

---

### Notification Queries

#### `notifications(userId, unreadOnly, limit, offset)`

Get notifications with filtering.

**Parameters**:

- `userId: UUID` - Filter by recipient (optional)
- `unreadOnly: Boolean` - Filter for unread notifications (default: false)
- `limit: Int` - Maximum number (1-1000, default: 100)
- `offset: Int` - Number to skip (default: 0)

**Returns**: `[Notification!]!`

**Ordered By**: `createdAt DESC`

**Example**:

```graphql
query {
	notifications(userId: "...", unreadOnly: true, limit: 20) {
		id
		recipientId
		senderId
		title
		message
		notificationType
		readStatus
		actionUrl
		createdAt
	}
}
```

---

### Attendance Record Queries

#### `attendanceRecords(userId, limit, offset)`

Get attendance records with optional user filtering.

**Parameters**:

- `userId: UUID` - Filter by user (optional)
- `limit: Int` - Maximum number (1-1000, default: 100)
- `offset: Int` - Number to skip (default: 0)

**Returns**: `[AttendanceRecord!]!`

**Ordered By**: `date DESC`

---

### Employee Goal Queries

#### `employeeGoals(employeeId, limit, offset)`

Get employee goals with optional employee filtering.

**Parameters**:

- `employeeId: UUID` - Filter by employee (optional)
- `limit: Int` - Maximum number (1-1000, default: 100)
- `offset: Int` - Number to skip (default: 0)

**Returns**: `[EmployeeGoal!]!`

**Ordered By**: `createdAt DESC`

---

### Emergency Contact Queries

#### `emergencyContacts(employeeId, limit, offset)`

Get emergency contacts with optional employee filtering.

**Parameters**:

- `employeeId: UUID` - Filter by employee (optional)
- `limit: Int` - Maximum number (1-1000, default: 100)
- `offset: Int` - Number to skip (default: 0)

**Returns**: `[EmergencyContact!]!`

**Ordered By**: `isPrimary DESC, createdAt DESC`

---

### Employee Vehicle Queries

#### `employeeVehicles(employeeId, limit, offset)`

Get employee vehicles with optional employee filtering.

**Parameters**:

- `employeeId: UUID` - Filter by employee (optional)
- `limit: Int` - Maximum number (1-1000, default: 100)
- `offset: Int` - Number to skip (default: 0)

**Returns**: `[EmployeeVehicle!]!`

**Ordered By**: `createdAt DESC`

---

### Rollback Request Queries

#### `rollbackRequests(status, limit, offset)`

Get rollback requests with optional status filtering.

**Parameters**:

- `status: RollbackStatus` - Filter by status (PENDING, APPROVED, REJECTED, COMPLETED, FAILED)
- `limit: Int` - Maximum number (1-1000, default: 100)
- `offset: Int` - Number to skip (default: 0)

**Returns**: `[RollbackRequest!]!`

**Ordered By**: `requestedAt DESC`

---

#### `rollbackRequestsCount(status)`

Get count of rollback requests by status.

**Parameters**:

- `status: RollbackStatus` - Filter by status (optional)

**Returns**: `Int!`

---

### Authentication Queries

#### `authStatus()`

Check if user is authenticated.

**Parameters**: None

**Returns**: `Boolean!`

---

#### `sessions()`

Get active sessions for current user.

**Parameters**: None

**Returns**: `[SessionInfo!]!`

**Requires**: Authentication

---

#### `mySession()`

Get current session info.

**Parameters**: None

**Returns**: `SessionInfo`

---

#### `csrfToken()`

Get CSRF token for current session.

**Parameters**: None

**Returns**: `String!`

**Requires**: Authentication

---

### System Settings Queries (Admin Only)

#### `systemSettings()`

Get all system settings.

**Parameters**: None

**Returns**: `[SystemSettings!]!`

**Requires**: `system_admin` role

---

#### `systemSettingsByCategory(category)`

Get system settings by category.

**Parameters**:

- `category: String!` - Settings category

**Returns**: `SystemSettings`

**Requires**: `system_admin` role

---

## 🔄 Mutation Reference

### Authentication Mutations

#### `login(input: LoginInput!)`

Authenticate user with email and password.

**Input**:

```graphql
input LoginInput {
	email: String!
	password: String!
}
```

**Returns**: `AuthResponse!` (union of `AuthResult` or `AuthError`)

**Example**:

```graphql
mutation {
	login(input: { email: "user@example.com", password: "password" }) {
		... on AuthResult {
			user {
				id
				email
				role
			}
			session {
				id
				expiresAt
			}
		}
		... on AuthError {
			code
			message
			retryAfter
		}
	}
}
```

**Note**: For production, use REST `/auth/login` endpoint for session management

---

#### `logout()`

Logout current user.

**Parameters**: None

**Returns**: `LogoutResult!`

**Note**: Use REST `/auth/logout` endpoint for proper session cleanup

---

#### `refreshSession()`

Extend current session lifetime.

**Parameters**: None

**Returns**: `RefreshSessionResponse!`

**Note**: Use REST `/auth/refresh` endpoint for proper session extension

---

### User Mutations

#### `createUser(input: CreateUserInput!)`

Create a new user.

**Input**:

```graphql
input CreateUserInput {
	email: String!
	firstName: String!
	lastName: String!
	phone: String
	departmentId: UUID
	managerId: UUID
	hireDate: DateTime
	status: UserStatus!
}
```

**Returns**: `User!`

**Example**:

```graphql
mutation {
	createUser(
		input: {
			email: "newuser@example.com"
			firstName: "John"
			lastName: "Doe"
			departmentId: "..."
			status: ACTIVE
		}
	) {
		id
		email
		fullName
	}
}
```

---

#### `updateUser(id: UUID!, input: UpdateUserInput!)`

Update an existing user.

**Input**:

```graphql
input UpdateUserInput {
	email: String
	firstName: String
	lastName: String
	phone: String
	departmentId: UUID
	managerId: UUID
	hireDate: DateTime
	terminationDate: DateTime
	status: UserStatus
}
```

**Returns**: `User!`

**Example**:

```graphql
mutation {
	updateUser(id: "550e8400-e29b-41d4-a716-446655440000", input: { jobTitle: "Senior Engineer" }) {
		id
		fullName
		jobTitle
	}
}
```

---

#### `deleteUser(id: UUID!)`

Soft delete a user.

**Parameters**:

- `id: UUID!` - User ID to delete

**Returns**: `Boolean!`

---

### Department Mutations

#### `createDepartment(input: CreateDepartmentInput!)`

Create a new department.

**Input**:

```graphql
input CreateDepartmentInput {
	name: String!
	description: String
	managerId: UUID
}
```

**Returns**: `Department!`

---

#### `updateDepartment(id: UUID!, input: UpdateDepartmentInput!)`

Update an existing department.

**Input**:

```graphql
input UpdateDepartmentInput {
	name: String
	description: String
	managerId: UUID
}
```

**Returns**: `Department!`

---

#### `deleteDepartment(id: UUID!)`

Soft delete a department.

**Parameters**:

- `id: UUID!` - Department ID to delete

**Returns**: `Boolean!`

---

### Task Mutations

#### `createTask(input: CreateTaskInput!)`

Create a new task.

**Input**:

```graphql
input CreateTaskInput {
	title: String!
	description: String
	status: TaskStatus!
	priority: TaskPriority!
	dueDate: DateTime
	assigneeId: UUID
	departmentId: UUID
	projectId: UUID
	estimatedHours: Float
	tags: [String!]
}
```

**Returns**: `Task!`

**Example**:

```graphql
mutation {
	createTask(
		input: {
			title: "Update documentation"
			description: "Update API docs"
			status: TODO
			priority: HIGH
			dueDate: "2025-10-31T23:59:59Z"
			assigneeId: "..."
		}
	) {
		id
		title
		status
		priority
	}
}
```

---

#### `updateTask(id: UUID!, input: UpdateTaskInput!)`

Update an existing task.

**Input**:

```graphql
input UpdateTaskInput {
	title: String
	description: String
	status: TaskStatus
	priority: TaskPriority
	dueDate: DateTime
	assigneeId: UUID
	estimatedHours: Float
	actualHours: Float
	tags: [String!]
}
```

**Returns**: `Task!`

---

#### `deleteTask(id: UUID!)`

Soft delete a task.

**Parameters**:

- `id: UUID!` - Task ID to delete

**Returns**: `Boolean!`

---

#### `assignTaskToUser(input: AssignTaskInput!)`

Assign a task to a user.

**Input**:

```graphql
input AssignTaskInput {
	taskId: UUID!
	userId: UUID!
	role: AssigneeRole!
}
```

**Returns**: `TaskAssignee!`

---

#### `changeTaskStatus(input: ChangeTaskStatusInput!)`

Change task status.

**Input**:

```graphql
input ChangeTaskStatusInput {
	taskId: UUID!
	newStatus: TaskStatus!
	comment: String
}
```

**Returns**: `Task!`

---

### Task Dependency Mutations

#### `createTaskDependency(input: CreateTaskDependencyInput!)`

Create a task dependency relationship.

**Input**:

```graphql
input CreateTaskDependencyInput {
	taskId: UUID!
	dependsOnTaskId: UUID!
	dependencyType: DependencyType!
}
```

**Returns**: `TaskDependency!`

---

#### `deleteTaskDependency(id: UUID!)`

Delete a task dependency.

**Parameters**:

- `id: UUID!` - Task dependency ID to delete

**Returns**: `Boolean!`

---

### Event Mutations

#### `createEvent(input: CreateEventInput!)`

Create a new event.

**Input**:

```graphql
input CreateEventInput {
	title: String!
	description: String
	eventType: EventType!
	location: String
	startTime: DateTime!
	endTime: DateTime!
	isAllDay: Boolean!
	status: EventStatus!
	isPublic: Boolean!
	color: String
	organizerId: UUID!
	recurrenceRule: String
	recurrenceEndDate: DateTime
	capacity: Int
	imageUrl: String
	imageAspectRatio: String
}
```

**Returns**: `Event!`

**Example**:

```graphql
mutation {
	createEvent(
		input: {
			title: "Team Meeting"
			eventType: MEETING
			startTime: "2025-10-25T10:00:00Z"
			endTime: "2025-10-25T11:00:00Z"
			isAllDay: false
			status: SCHEDULED
			isPublic: true
			organizerId: "..."
		}
	) {
		id
		title
		startTime
		endTime
	}
}
```

---

#### `updateEvent(id: UUID!, input: UpdateEventInput!)`

Update an existing event.

**Input**:

```graphql
input UpdateEventInput {
	title: String
	description: String
	eventType: EventType
	location: String
	startTime: DateTime
	endTime: DateTime
	isAllDay: Boolean
	status: EventStatus
	isPublic: Boolean
	color: String
	recurrenceRule: String
	recurrenceEndDate: DateTime
	capacity: Int
	imageUrl: String
	imageAspectRatio: String
}
```

**Returns**: `Event!`

---

#### `deleteEvent(id: UUID!)`

Soft delete an event.

**Parameters**:

- `id: UUID!` - Event ID to delete

**Returns**: `Boolean!`

---

### Event Attendee Mutations

#### `createEventAttendee(input: CreateEventAttendeeInput!)`

Create an event attendee (RSVP).

**Input**:

```graphql
input CreateEventAttendeeInput {
	eventId: UUID!
	employeeId: UUID!
	responseStatus: RsvpStatus!
	isRequired: Boolean!
	reminderTime: DateTime
	scope: String
	isOrganizer: Boolean!
}
```

**Returns**: `EventAttendee!`

---

#### `updateEventAttendee(id: UUID!, input: UpdateEventAttendeeInput!)`

Update an event attendee (update RSVP).

**Input**:

```graphql
input UpdateEventAttendeeInput {
	responseStatus: RsvpStatus
	reminderTime: DateTime
	scope: String
}
```

**Returns**: `EventAttendee!`

**Example**:

```graphql
mutation {
	updateEventAttendee(id: "...", input: { responseStatus: ACCEPTED }) {
		id
		responseStatus
	}
}
```

---

#### `deleteEventAttendee(id: UUID!)`

Delete an event attendee.

**Parameters**:

- `id: UUID!` - Event attendee ID to delete

**Returns**: `Boolean!`

---

### Event Comment Mutations

#### `createEventComment(input: CreateEventCommentInput!)`

Create a comment on an event.

**Input**:

```graphql
input CreateEventCommentInput {
	eventId: UUID!
	userId: UUID!
	commentText: String!
}
```

**Returns**: `EventComment!`

---

#### `updateEventComment(id: UUID!, input: UpdateEventCommentInput!)`

Update an event comment.

**Input**:

```graphql
input UpdateEventCommentInput {
	commentText: String!
}
```

**Returns**: `EventComment!`

---

#### `deleteEventComment(id: UUID!)`

Delete an event comment.

**Parameters**:

- `id: UUID!` - Event comment ID to delete

**Returns**: `Boolean!`

---

### Event Waitlist Mutations

#### `createEventWaitlist(input: CreateEventWaitlistInput!)`

Add user to event waitlist.

**Input**:

```graphql
input CreateEventWaitlistInput {
	eventId: UUID!
	userId: UUID!
}
```

**Returns**: `EventWaitlist!`

---

#### `deleteEventWaitlist(id: UUID!)`

Remove user from event waitlist.

**Parameters**:

- `id: UUID!` - Event waitlist ID to delete

**Returns**: `Boolean!`

---

### Leave Request Mutations

#### `createLeaveRequest(input: CreateLeaveRequestInput!)`

Create a leave request.

**Input**:

```graphql
input CreateLeaveRequestInput {
	employeeId: UUID!
	leaveTypeId: UUID!
	startDate: Date!
	endDate: Date!
	reason: String
	status: LeaveRequestStatus!
}
```

**Returns**: `LeaveRequest!`

---

#### `updateLeaveRequest(id: UUID!, input: UpdateLeaveRequestInput!)`

Update a leave request.

**Input**:

```graphql
input UpdateLeaveRequestInput {
	startDate: Date
	endDate: Date
	reason: String
	status: LeaveRequestStatus
}
```

**Returns**: `LeaveRequest!`

---

#### `deleteLeaveRequest(id: UUID!)`

Delete a leave request.

**Parameters**:

- `id: UUID!` - Leave request ID to delete

**Returns**: `Boolean!`

---

#### `approveLeaveRequest(input: ApproveLeaveRequestInput!)`

Approve a leave request.

**Input**:

```graphql
input ApproveLeaveRequestInput {
	leaveRequestId: UUID!
	approverId: UUID!
	comments: String
}
```

**Returns**: `LeaveRequest!`

---

#### `rejectLeaveRequest(input: RejectLeaveRequestInput!)`

Reject a leave request.

**Input**:

```graphql
input RejectLeaveRequestInput {
	leaveRequestId: UUID!
	approverId: UUID!
	rejectionReason: String!
}
```

**Returns**: `LeaveRequest!`

---

#### `cancelLeaveRequest(id: UUID!)`

Cancel a leave request.

**Parameters**:

- `id: UUID!` - Leave request ID to cancel

**Returns**: `LeaveRequest!`

---

### Leave Balance Mutations

#### `createLeaveBalance(input: CreateLeaveBalanceInput!)`

Create a leave balance record.

**Input**:

```graphql
input CreateLeaveBalanceInput {
	employeeId: UUID!
	leaveTypeId: UUID!
	year: Int!
	totalDays: Float!
	usedDays: Float!
	pendingDays: Float!
	remainingDays: Float!
}
```

**Returns**: `LeaveBalance!`

---

#### `updateLeaveBalance(id: UUID!, input: UpdateLeaveBalanceInput!)`

Update a leave balance record.

**Input**:

```graphql
input UpdateLeaveBalanceInput {
	totalDays: Float
	usedDays: Float
	pendingDays: Float
	remainingDays: Float
}
```

**Returns**: `LeaveBalance!`

---

### Leave Type Mutations

#### `createLeaveType(input: CreateLeaveTypeInput!)`

Create a new leave type.

**Input**:

```graphql
input CreateLeaveTypeInput {
	name: String!
	description: String
	color: String
	defaultDays: Float!
	requiresApproval: Boolean!
}
```

**Returns**: `LeaveType!`

---

#### `updateLeaveType(id: UUID!, input: UpdateLeaveTypeInput!)`

Update a leave type.

**Input**:

```graphql
input UpdateLeaveTypeInput {
	name: String
	description: String
	color: String
	defaultDays: Float
	requiresApproval: Boolean
}
```

**Returns**: `LeaveType!`

---

#### `deleteLeaveType(id: UUID!)`

Soft delete a leave type.

**Parameters**:

- `id: UUID!` - Leave type ID to delete

**Returns**: `Boolean!`

---

### Performance Review Mutations

#### `createPerformanceReview(input: CreatePerformanceReviewInput!)`

Create a performance review.

**Input**:

```graphql
input CreatePerformanceReviewInput {
	employeeId: UUID!
	reviewerId: UUID!
	reviewPeriodStart: Date!
	reviewPeriodEnd: Date!
	status: PerformanceReviewStatus!
	overallRating: Int
	comments: String
}
```

**Returns**: `PerformanceReview!`

---

#### `updatePerformanceReview(id: UUID!, input: UpdatePerformanceReviewInput!)`

Update a performance review.

**Input**:

```graphql
input UpdatePerformanceReviewInput {
	status: PerformanceReviewStatus
	overallRating: Int
	comments: String
}
```

**Returns**: `PerformanceReview!`

---

#### `deletePerformanceReview(id: UUID!)`

Soft delete a performance review.

**Parameters**:

- `id: UUID!` - Performance review ID to delete

**Returns**: `Boolean!`

---

### Emergency Contact Mutations

#### `createEmergencyContact(input: CreateEmergencyContactInput!)`

Create an emergency contact.

**Input**:

```graphql
input CreateEmergencyContactInput {
	employeeId: UUID!
	name: String!
	relationship: String!
	phoneNumber: String!
	alternatePhone: String
	email: String
	isPrimary: Boolean!
}
```

**Returns**: `EmergencyContact!`

---

#### `updateEmergencyContact(id: UUID!, input: UpdateEmergencyContactInput!)`

Update an emergency contact.

**Input**:

```graphql
input UpdateEmergencyContactInput {
	name: String
	relationship: String
	phoneNumber: String
	alternatePhone: String
	email: String
	isPrimary: Boolean
}
```

**Returns**: `EmergencyContact!`

---

#### `deleteEmergencyContact(id: UUID!)`

Delete an emergency contact.

**Parameters**:

- `id: UUID!` - Emergency contact ID to delete

**Returns**: `Boolean!`

---

### Employee Goal Mutations

#### `createEmployeeGoal(input: CreateEmployeeGoalInput!)`

Create an employee goal.

**Input**:

```graphql
input CreateEmployeeGoalInput {
	employeeId: UUID!
	title: String!
	description: String
	targetDate: Date
	status: GoalStatus!
	progress: Int
}
```

**Returns**: `EmployeeGoal!`

---

#### `updateEmployeeGoal(id: UUID!, input: UpdateEmployeeGoalInput!)`

Update an employee goal.

**Input**:

```graphql
input UpdateEmployeeGoalInput {
	title: String
	description: String
	targetDate: Date
	status: GoalStatus
	progress: Int
}
```

**Returns**: `EmployeeGoal!`

---

#### `deleteEmployeeGoal(id: UUID!)`

Delete an employee goal.

**Parameters**:

- `id: UUID!` - Employee goal ID to delete

**Returns**: `Boolean!`

---

### Attendance Record Mutations

#### `createAttendanceRecord(input: CreateAttendanceRecordInput!)`

Create an attendance record.

**Input**:

```graphql
input CreateAttendanceRecordInput {
	userId: UUID!
	date: Date!
	checkIn: Time
	checkOut: Time
	status: AttendanceStatus!
	notes: String
}
```

**Returns**: `AttendanceRecord!`

---

#### `updateAttendanceRecord(id: UUID!, input: UpdateAttendanceRecordInput!)`

Update an attendance record.

**Input**:

```graphql
input UpdateAttendanceRecordInput {
	checkIn: Time
	checkOut: Time
	status: AttendanceStatus
	notes: String
}
```

**Returns**: `AttendanceRecord!`

---

#### `deleteAttendanceRecord(id: UUID!)`

Delete an attendance record.

**Parameters**:

- `id: UUID!` - Attendance record ID to delete

**Returns**: `Boolean!`

---

### System Settings Mutations (Admin Only)

#### `updateSystemSettings(input: UpdateSystemSettingsInput!)`

Update system settings.

**Input**:

```graphql
input UpdateSystemSettingsInput {
	category: String!
	settings: JSON!
}
```

**Returns**: `SystemSettings!`

**Requires**: `system_admin` role

---

## 🔗 Relationship Resolvers (Idiomatic)

### Event Relationships

When querying an `Event`, these relationship fields are available:

```graphql
type Event {
	# ... event fields ...

	# ✅ IDIOMATIC: Use these relationship resolvers
	organizer: User # Event creator/organizer
	attendees(limit: Int): [EventAttendee!]! # All attendees
	attendeeCount: Int! # Total attendee count
	acceptedCount: Int! # Count of accepted RSVPs
	isAtCapacity: Boolean! # Whether event is full
}
```

**Example**:

```graphql
query {
	events(limit: 10) {
		id
		title
		startTime
		organizer {
			id
			fullName
			email
		}
		attendees(limit: 100) {
			id
			employeeId
			responseStatus
			employee {
				fullName
			}
		}
		attendeeCount
		acceptedCount
		isAtCapacity
	}
}
```

**❌ AVOID** PostGraphile aliases:

- `userByOrganizerId` → Use `organizer` instead
- `eventAttendeesByEventId.nodes` → Use `attendees(limit)` instead
- `currentAcceptanceCount` → Use `acceptedCount` instead

---

### User Relationships

```graphql
type User {
	# ... user fields ...

	# ✅ IDIOMATIC: Use these relationship resolvers
	department: Department # User's department
	manager: User # User's manager
	directReports: [User!]! # Users managed by this user
}
```

---

### Task Relationships

```graphql
type Task {
	# ... task fields ...

	# ✅ IDIOMATIC: Use these relationship resolvers
	assignee: User # Primary assignee
	creator: User # Task creator
	department: Department # Task department
	# ⚠️ Backend Gap: subtasks, dependencies not yet available
}
```

---

### Department Relationships

```graphql
type Department {
	# ... department fields ...

	# ✅ IDIOMATIC: Use these relationship resolvers
	manager: User # Department manager
	employees: [User!]! # All employees in department
}
```

---

## ⚠️ Backend Gaps (Missing Features)

The following features need backend implementation:

### Query Gaps

1. **Task Advanced Filtering**
   - Missing: `tasks(status, priority, dueDate, createdAfter, createdBefore)`
   - Current: Only `assigneeId` filter available

2. **Event User Filtering**
   - Missing: `events(userId)` - Get events for specific user
   - Current: Only `upcomingOnly` filter available

3. **Performance Review Filtering**
   - Missing: `performanceReviews(status, reviewerId, dateRange)`
   - Current: Only `employeeId` filter available

4. **Activity Log Date Filtering**
   - Missing: `activityLogs(startDate, endDate)`
   - Current: Only `userId` filter available

5. **Subtask Queries**
   - Missing: Subtask relationship resolver on `Task` type
   - Required for: Hierarchical task display

6. **Task Dependency Queries**
   - Missing: Task dependency relationship resolver on `Task` type
   - Required for: Dependency chain visualization

---

## 🎯 Migration Strategy

### Pattern Migration Examples

**Query Pattern Migration**:

```graphql
# ❌ BEFORE (PostGraphile)
query {
	allEvents {
		nodes {
			id
			title
			userByOrganizerId {
				displayName
			}
			eventAttendeesByEventId {
				nodes {
					id
					responseStatus
				}
			}
		}
	}
}

# ✅ AFTER (Rust Idiomatic)
query {
	events(limit: 100) {
		id
		title
		organizer {
			displayName
		}
		attendees(limit: 100) {
			id
			responseStatus
		}
	}
}
```

**Mutation Pattern Migration**:

```graphql
# ❌ BEFORE (PostGraphile)
mutation {
	updateEventByNodeId(input: { nodeId: "...", patch: { title: "Updated Title" } }) {
		event {
			id
			title
		}
	}
}

# ✅ AFTER (Rust Idiomatic)
mutation {
	updateEvent(id: "...", input: { title: "Updated Title" }) {
		id
		title
	}
}
```

---

## 📝 Type Reference

### Common Types

```graphql
scalar UUID
scalar DateTime
scalar Date
scalar Time
scalar JSON

enum UserStatus {
	ACTIVE
	INACTIVE
	ON_LEAVE
	TERMINATED
}

enum TaskStatus {
	TODO
	IN_PROGRESS
	BLOCKED
	IN_REVIEW
	DONE
	CANCELLED
}

enum TaskPriority {
	LOW
	MEDIUM
	HIGH
	URGENT
}

enum EventType {
	MEETING
	TRAINING
	SOCIAL
	COMPANY_EVENT
	HOLIDAY
	INTERVIEW
	REVIEW
	TEAM_BUILDING
	OTHER
}

enum EventStatus {
	DRAFT
	SCHEDULED
	IN_PROGRESS
	COMPLETED
	CANCELLED
}

enum RsvpStatus {
	PENDING
	ACCEPTED
	DECLINED
	TENTATIVE
}

enum LeaveRequestStatus {
	PENDING
	APPROVED
	REJECTED
	CANCELLED
}

enum PerformanceReviewStatus {
	DRAFT
	IN_PROGRESS
	COMPLETED
	ARCHIVED
}

enum RollbackStatus {
	PENDING
	APPROVED
	REJECTED
	COMPLETED
	FAILED
}
```

---

**End of Backend API Reference**
