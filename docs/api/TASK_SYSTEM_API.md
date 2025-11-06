# Task System API Documentation

**Feature:** 028-task-system-expansion
**Version:** 1.0.0

Complete API reference for the Task Management System.

## Table of Contents

1. [GraphQL Schema](#graphql-schema)
2. [Queries](#queries)
3. [Mutations](#mutations)
4. [Types](#types)
5. [Enums](#enums)
6. [Filters & Sorting](#filters--sorting)
7. [Pagination](#pagination)
8. [Error Handling](#error-handling)
9. [Authentication & Authorization](#authentication--authorization)

---

## GraphQL Schema

### Base Types

```graphql
type Task {
	id: UUID!
	nodeId: ID!
	title: String!
	description: String
	assigneeId: UUID
	creatorId: UUID!
	taskTypeId: UUID
	status: TaskStatus!
	priority: TaskPriority!
	dueDate: Datetime
	parentTaskId: UUID
	archived: Boolean!
	archivedAt: Datetime
	archivedBy: UUID
	requiresManualReassignment: Boolean!
	createdAt: Datetime!
	updatedAt: Datetime!

	# Relationships
	userByAssigneeId: User
	userByCreatorId: User!
	taskTypeByTaskTypeId: TaskType
	taskByParentTaskId: Task
	tasksByParentTaskId: TasksConnection!
	taskDependenciesByBlockingTaskId: TaskDependenciesConnection!
	taskDependenciesByBlockedTaskId: TaskDependenciesConnection!
	linkedResourcesByTaskId: LinkedResourcesConnection!
	taskAuditEntriesByTaskId: TaskAuditEntriesConnection!
}

type TaskType {
	id: UUID!
	name: String!
	description: String
	isSystem: Boolean!
	createdAt: Datetime!
	createdBy: UUID
}

type TaskDependency {
	id: UUID!
	blockingTaskId: UUID!
	blockedTaskId: UUID!
	dependencyType: String
	createdAt: Datetime!

	taskByBlockingTaskId: Task!
	taskByBlockedTaskId: Task!
}

type LinkedResource {
	id: UUID!
	taskId: UUID!
	resourceType: ResourceType!
	resourceId: UUID!
	resourceTitle: String!
	availabilityStatus: AvailabilityStatus
	lastChecked: Datetime
	createdAt: Datetime!
}

type TaskAuditEntry {
	id: UUID!
	taskId: UUID!
	actionType: AuditActionType!
	changedFields: JSON
	newValues: JSON
	userId: UUID!
	timestamp: Datetime!

	taskByTaskId: Task!
	userByUserId: User!
}
```

---

## Queries

### getAllTasks

Retrieve all tasks with optional filtering, sorting, and pagination.

**Query:**

```graphql
query GetAllTasks(
	$first: Int = 20
	$offset: Int = 0
	$orderBy: [TasksOrderBy!] = [CREATED_AT_DESC]
	$condition: TaskCondition
) {
	allTasks(first: $first, offset: $offset, orderBy: $orderBy, condition: $condition) {
		nodes {
			id
			title
			status
			priority
			dueDate
			assigneeId
			createdAt
			userByAssigneeId {
				id
				displayName
			}
		}
		totalCount
		pageInfo {
			hasNextPage
			hasPreviousPage
			startCursor
			endCursor
		}
	}
}
```

**Variables:**

```json
{
	"first": 20,
	"offset": 0,
	"orderBy": ["DUE_DATE_ASC", "PRIORITY_DESC"],
	"condition": {
		"status": "In Progress",
		"assigneeId": "uuid-here",
		"archived": false
	}
}
```

**Response:**

```json
{
	"data": {
		"allTasks": {
			"nodes": [
				{
					"id": "task-uuid",
					"title": "Complete documentation",
					"status": "In Progress",
					"priority": "High",
					"dueDate": "2025-10-15T00:00:00Z",
					"assigneeId": "user-uuid",
					"createdAt": "2025-10-01T10:00:00Z",
					"userByAssigneeId": {
						"id": "user-uuid",
						"displayName": "John Doe"
					}
				}
			],
			"totalCount": 42,
			"pageInfo": {
				"hasNextPage": true,
				"hasPreviousPage": false,
				"startCursor": "cursor-start",
				"endCursor": "cursor-end"
			}
		}
	}
}
```

---

### getTaskHierarchy

Retrieve a task with its complete subtask hierarchy.

**Query:**

```graphql
query GetTaskHierarchy($taskId: UUID!) {
	taskById(id: $taskId) {
		id
		title
		description
		status
		priority
		dueDate
		userByAssigneeId {
			id
			displayName
		}
		tasksByParentTaskId {
			nodes {
				id
				title
				status
				priority
				tasksByParentTaskId {
					nodes {
						id
						title
						status
					}
					totalCount
				}
			}
			totalCount
		}
		taskDependenciesByBlockedTaskId {
			nodes {
				id
				blockingTaskId
				taskByBlockingTaskId {
					id
					title
					status
				}
			}
		}
	}
}
```

**Variables:**

```json
{
	"taskId": "task-uuid-here"
}
```

---

### getMyTasks

Retrieve tasks assigned to the current user.

**Query:**

```graphql
query GetMyTasks(
	$assigneeId: UUID!
	$first: Int = 20
	$orderBy: [TasksOrderBy!] = [DUE_DATE_ASC, PRIORITY_DESC]
) {
	allTasks(
		first: $first
		condition: { assigneeId: $assigneeId, archived: false }
		orderBy: $orderBy
	) {
		nodes {
			id
			title
			status
			priority
			dueDate
			tasksByParentTaskId {
				totalCount
			}
		}
		totalCount
	}
}
```

---

### getTaskStatistics

Retrieve aggregated task statistics.

**Query:**

```graphql
query GetTaskStatistics($condition: TaskCondition) {
	allTasks(condition: $condition) {
		totalCount
	}
	notStarted: allTasks(condition: { status: "Not Started" }) {
		totalCount
	}
	inProgress: allTasks(condition: { status: "In Progress" }) {
		totalCount
	}
	completed: allTasks(condition: { status: "Completed" }) {
		totalCount
	}
}
```

---

## Mutations

### createTask

Create a new task.

**Mutation:**

```graphql
mutation CreateTask($input: CreateTaskInput!) {
	createTask(input: $input) {
		task {
			id
			title
			status
			priority
			dueDate
			assigneeId
			createdAt
		}
		clientMutationId
	}
}
```

**Variables:**

```json
{
	"input": {
		"task": {
			"title": "Complete project documentation",
			"description": "Write comprehensive API docs",
			"assigneeId": "user-uuid",
			"taskTypeId": "task-type-uuid",
			"status": "Not Started",
			"priority": "High",
			"dueDate": "2025-10-31T23:59:59Z",
			"parentTaskId": null
		},
		"clientMutationId": "unique-client-id"
	}
}
```

**Response:**

```json
{
	"data": {
		"createTask": {
			"task": {
				"id": "new-task-uuid",
				"title": "Complete project documentation",
				"status": "Not Started",
				"priority": "High",
				"dueDate": "2025-10-31T23:59:59Z",
				"assigneeId": "user-uuid",
				"createdAt": "2025-10-09T10:30:00Z"
			},
			"clientMutationId": "unique-client-id"
		}
	}
}
```

---

### updateTask

Update an existing task.

**Mutation:**

```graphql
mutation UpdateTask($input: UpdateTaskByIdInput!) {
	updateTaskById(input: $input) {
		task {
			id
			title
			status
			priority
			updatedAt
		}
		clientMutationId
	}
}
```

**Variables:**

```json
{
	"input": {
		"id": "task-uuid",
		"taskPatch": {
			"status": "Completed",
			"priority": "Medium"
		},
		"clientMutationId": "unique-client-id"
	}
}
```

---

### deleteTask

Soft delete a task (archive).

**Mutation:**

```graphql
mutation DeleteTask($input: UpdateTaskByIdInput!) {
	updateTaskById(input: $input) {
		task {
			id
			archived
			archivedAt
			archivedBy
		}
		clientMutationId
	}
}
```

**Variables:**

```json
{
	"input": {
		"id": "task-uuid",
		"taskPatch": {
			"archived": true,
			"archivedAt": "2025-10-09T12:00:00Z",
			"archivedBy": "user-uuid"
		}
	}
}
```

---

### createTaskDependency

Create a task dependency (blocking relationship).

**Mutation:**

```graphql
mutation CreateTaskDependency($input: CreateTaskDependencyInput!) {
	createTaskDependency(input: $input) {
		taskDependency {
			id
			blockingTaskId
			blockedTaskId
			taskByBlockingTaskId {
				id
				title
				status
			}
		}
		clientMutationId
	}
}
```

**Variables:**

```json
{
	"input": {
		"taskDependency": {
			"blockingTaskId": "blocking-task-uuid",
			"blockedTaskId": "blocked-task-uuid",
			"dependencyType": "finish-to-start"
		}
	}
}
```

---

## Types

### TaskStatus

```typescript
enum TaskStatus {
  NOT_STARTED = "Not Started"
  IN_PROGRESS = "In Progress"
  BLOCKED = "Blocked"
  COMPLETED = "Completed"
  CANCELLED = "Cancelled"
}
```

### TaskPriority

```typescript
enum TaskPriority {
  LOW = "Low"
  MEDIUM = "Medium"
  HIGH = "High"
  URGENT = "Urgent"
}
```

### ResourceType

```typescript
enum ResourceType {
  DOCUMENT = "Document"
  EMPLOYEE = "Employee"
  EVENT = "Event"
  GOAL = "Goal"
  CUSTOM = "Custom"
}
```

### AvailabilityStatus

```typescript
enum AvailabilityStatus {
  AVAILABLE = "Available"
  UNAVAILABLE = "Unavailable"
  PENDING = "Pending"
}
```

### AuditActionType

```typescript
enum AuditActionType {
  CREATED = "created"
  EDITED = "edited"
  REASSIGNED = "reassigned"
  DELETED = "deleted"
  STATUS_CHANGED = "status_changed"
  ORG_CHANGE = "org_change"
}
```

---

## Filters & Sorting

### TaskCondition

```typescript
interface TaskCondition {
	id?: UUIDFilter;
	title?: StringFilter;
	description?: StringFilter;
	status?: TaskStatusFilter;
	priority?: TaskPriorityFilter;
	assigneeId?: UUIDFilter;
	creatorId?: UUIDFilter;
	taskTypeId?: UUIDFilter;
	parentTaskId?: UUIDFilter | null;
	archived?: BooleanFilter;
	dueDate?: DatetimeFilter;
	createdAt?: DatetimeFilter;
}
```

### StringFilter

```typescript
interface StringFilter {
	equalTo?: string;
	notEqualTo?: string;
	in?: string[];
	notIn?: string[];
	like?: string;
	ilike?: string;
	includesInsensitive?: string;
}
```

### DatetimeFilter

```typescript
interface DatetimeFilter {
	equalTo?: string;
	notEqualTo?: string;
	lessThan?: string;
	lessThanOrEqualTo?: string;
	greaterThan?: string;
	greaterThanOrEqualTo?: string;
}
```

### TasksOrderBy

```graphql
enum TasksOrderBy {
	ID_ASC
	ID_DESC
	TITLE_ASC
	TITLE_DESC
	STATUS_ASC
	STATUS_DESC
	PRIORITY_ASC
	PRIORITY_DESC
	DUE_DATE_ASC
	DUE_DATE_DESC
	CREATED_AT_ASC
	CREATED_AT_DESC
	UPDATED_AT_ASC
	UPDATED_AT_DESC
}
```

---

## Pagination

### Offset-Based Pagination

```graphql
{
  allTasks(first: 20, offset: 40) {
    nodes { ... }
    totalCount
    pageInfo {
      hasNextPage
      hasPreviousPage
    }
  }
}
```

### Cursor-Based Pagination

```graphql
{
  allTasks(first: 20, after: "cursor-here") {
    nodes { ... }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
  }
}
```

---

## Error Handling

### GraphQL Errors

```json
{
	"errors": [
		{
			"message": "Task not found",
			"extensions": {
				"code": "NOT_FOUND",
				"taskId": "invalid-uuid"
			},
			"path": ["taskById"],
			"locations": [{ "line": 2, "column": 3 }]
		}
	]
}
```

### Common Error Codes

| Code                  | Description              | HTTP Status |
| --------------------- | ------------------------ | ----------- |
| `UNAUTHENTICATED`     | User not authenticated   | 401         |
| `FORBIDDEN`           | Insufficient permissions | 403         |
| `NOT_FOUND`           | Resource not found       | 404         |
| `VALIDATION_ERROR`    | Invalid input data       | 400         |
| `CIRCULAR_DEPENDENCY` | Circular task dependency | 400         |
| `INTERNAL_ERROR`      | Server error             | 500         |

---

## Authentication & Authorization

### Session-Based Authentication

The system uses **session-based authentication** with automatic session management. Authentication is handled server-side through session cookies - no manual token management required.

**Security Features:**

- Session timeout: 30 minutes
- Automatic session cleanup
- Brute force protection with progressive delays
- Account lockout after failed attempts
- Comprehensive security event logging

### RBAC Permissions

| Action         | Required Permission | Role                     |
| -------------- | ------------------- | ------------------------ |
| View Tasks     | `tasks:read`        | All authenticated users  |
| Create Task    | `tasks:write`       | Manager, Admin           |
| Update Task    | `tasks:write`       | Assignee, Manager, Admin |
| Delete Task    | `tasks:delete`      | Admin only               |
| View All Tasks | `tasks:read:all`    | Manager, Admin           |
| Reassign Task  | `tasks:reassign`    | Manager, Admin           |

### Row-Level Security (RLS)

Tasks are filtered based on user role:

- **Employee**: See only assigned tasks
- **Manager**: See team tasks + assigned tasks
- **Admin**: See all tasks

---

## Rate Limiting

- **Query Rate Limit**: 100 requests/minute
- **Mutation Rate Limit**: 50 requests/minute
- **Burst Limit**: 20 requests/second

---

## Versioning

Current API version: **v1.0.0**

Version is specified in the `X-API-Version` header:

```http
X-API-Version: 1.0.0
```

---

## SDKs & Code Examples

### TypeScript Client

```typescript
import { createUrqlClient } from '$lib/graphql/client';
import { GET_ALL_TASKS, CREATE_TASK } from '$lib/graphql/tasks-operations';

const client = createUrqlClient();

// Query tasks
const result = await client
	.query(GET_ALL_TASKS, {
		first: 20,
		condition: { status: 'In Progress' }
	})
	.toPromise();

// Create task
const createResult = await client
	.mutation(CREATE_TASK, {
		input: {
			task: {
				title: 'New Task',
				assigneeId: 'user-uuid',
				taskTypeId: 'type-uuid',
				status: 'Not Started',
				priority: 'High'
			}
		}
	})
	.toPromise();
```

### cURL Example

```bash
curl -X POST https://api.example.com/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "query": "query GetAllTasks($first: Int) { allTasks(first: $first) { nodes { id title status } } }",
    "variables": { "first": 10 }
  }'
```

---

## Additional Resources

- [Performance Optimization Guide](./PERFORMANCE_OPTIMIZATION_GUIDE.md)
- [Task System User Guide](./TASK_SYSTEM_USER_GUIDE.md)
- [Developer Guide](./TASK_SYSTEM_DEVELOPER_GUIDE.md)
- [GraphQL Schema Documentation](https://graphql.org/learn/schema/)
