================================================================================
POSTGRAPHILE → RUST SCHEMA MIGRATION MAPPING
================================================================================

## Core Naming Patterns

| PostGraphile Pattern | Rust Pattern | Example |
|---------------------|--------------|---------|
| `all<Type>` | `<type>s` (plural) | `allTasks` → `tasks` |
| `<type>ById` | `<type>` | `taskById` → `task` |
| `create<Type>` | `create_<type>` | `createTask` → `create_task` |
| `update<Type>ById` | `update_<type>` | `updateTaskById` → `update_task` |
| `delete<Type>ById` | `delete_<type>` | `deleteTaskById` → `delete_task` |

## Connection Type Changes

**PostGraphile:**
```graphql
allTasks(first: Int, offset: Int) {
  nodes { id title }
  totalCount
  pageInfo { hasNextPage }
}
```

**Rust:**
```graphql
tasks(limit: Int, offset: Int) {
  id
  title
}
```

**Changes:**
- Remove `.nodes` wrapper
- `first` parameter → `limit`
- No `totalCount` or `pageInfo` (implement separately if needed)
- `nodeId` field removed (use `id` directly)

## Input Type Changes

**PostGraphile:**
```graphql
createTask(input: CreateTaskInput!) {
  task { id title }
  clientMutationId
}

# Input wrapped:
input CreateTaskInput {
  task: TaskInput!
  clientMutationId: String
}
```

**Rust:**
```graphql
create_task(input: CreateTaskInput!) {
  id
  title
}

# Direct input:
input CreateTaskInput {
  title: String!
  description: String
  # ... direct fields
}
```

**Changes:**
- No nested `task` wrapper in input
- No `clientMutationId` (not needed)
- Direct field return (no `task` wrapper in response)

## Common Operations Mapping

| PostGraphile | Rust | Type | Description | Status |
|-------------|------|------|-------------|--------|
| `allTasks` | `tasks` | query | List all tasks | ✅ |
| `taskById` | `task` | query | Get single task | ✅ |
| `createTask` | `create_task` | mutation | Create task | ✅ |
| `updateTaskById` | `update_task` | mutation | Update task | ✅ |
| `deleteTaskById` | `delete_task` | mutation | Delete task | ✅ |
| `allEvents` | `events` | query | List all events | ✅ |
| `eventById` | `event` | query | Get single event | ✅ |
| `createEvent` | `create_event` | mutation | Create event | ✅ |
| `updateEventById` | `update_event` | mutation | Update event | ✅ |
| `deleteEvent` | `delete_event` | mutation | Delete event | ✅ |
| `allUsers` | `users` | query | List all users | ✅ |
| `userById` | `user` | query | Get single user | ✅ |
| `createUser` | `create_user` | mutation | Create user | ✅ |
| `updateUserById` | `update_user` | mutation | Update user | ✅ |
| `deleteUserById` | `delete_user` | mutation | Delete user | ✅ |
| `allDepartments` | `departments` | query | List all departments | ✅ |
| `departmentById` | `department` | query | Get single department | ✅ |
| `createDepartment` | `create_department` | mutation | Create department | ✅ |
| `updateDepartment` | `update_department` | mutation | Update department | ✅ |
| `deleteDepartment` | `delete_department` | mutation | Delete department | ✅ |
| `allNotifications` | `notifications` | query | List all notifications | ✅ |
| `notificationById` | `notification` | query | Get single notification | ✅ |
| `allLeaveRequests` | `leave_requests_by_user` | query | List leave requests | ✅ |
| `leaveRequestById` | `leave_request` | query | Get single leave request | ✅ |
| `createLeaveRequest` | `create_leave_request` | mutation | Create leave request | ✅ |
| `updateLeaveRequest` | `update_leave_request` | mutation | Update leave request | ✅ |
| `approveLeaveRequest` | `approve_leave_request` | mutation | Approve leave request | ✅ |
| `rejectLeaveRequest` | `reject_leave_request` | mutation | Reject leave request | ✅ |
| `allPerformanceReviews` | `performance_reviews` | query | List performance reviews | ✅ |
| `performanceReviewById` | `performance_review` | query | Get single review | ✅ |
| `createPerformanceReview` | `create_performance_review` | mutation | Create review | ✅ |
| `updatePerformanceReview` | `update_performance_review` | mutation | Update review | ✅ |
| `allEmployeeGoals` | `employee_goals` | query | List employee goals | ✅ |
| `employeeGoalById` | `employee_goal` | query | Get single goal | ✅ |
| `createEmployeeGoal` | `create_employee_goal` | mutation | Create goal | ✅ |
| `updateEmployeeGoal` | `update_employee_goal` | mutation | Update goal | ✅ |
| `allRoles` | `roles` | query | List all roles | ✅ |
| `roleById` | `role` | query | Get single role | ✅ |
| `allPermissions` | `permissions` | query | List all permissions | ✅ |
| `permissionById` | `permission` | query | Get single permission | ✅ |

## Frontend Files Requiring Updates


### src/lib/graphql/activity-logs-operations.ts

**Patterns to update:**
- ✓ `all<Type>`
- ✓ `<type>ById`
- ✓ `create<Type>`
- ✓ `totalCount`

### src/lib/graphql/auth-operations.ts

**Patterns to update:**
- ✓ `create<Type>`

### src/lib/graphql/dashboard-operations.ts

**Patterns to update:**
- ✓ `all<Type>`
- ✓ `create<Type>`
- ✓ `totalCount`

### src/lib/graphql/department-operations.ts

**Patterns to update:**
- ✓ `<type>ById`
- ✓ `create<Type>`
- ✓ `totalCount`

### src/lib/graphql/employee-operations.ts

**Patterns to update:**
- ✓ `all<Type>`
- ✓ `<type>ById`
- ✓ `create<Type>`
- ✓ `totalCount`

### src/lib/graphql/events-operations.ts

**Patterns to update:**
- ✓ `all<Type>`
- ✓ `<type>ById`
- ✓ `create<Type>`
- ✓ `update<Type>ById`
- ✓ `totalCount`

### src/lib/graphql/field-authorization-validator.ts

**Patterns to update:**
- ✓ `create<Type>`

### src/lib/graphql/goals-okrs-operations.ts

**Patterns to update:**
- ✓ `<type>ById`
- ✓ `create<Type>`
- ✓ `totalCount`

### src/lib/graphql/graphql/dashboard-operations.ts

**Patterns to update:**
- ✓ `all<Type>`
- ✓ `create<Type>`
- ✓ `totalCount`

### src/lib/graphql/graphql/field-authorization-validator.ts

**Patterns to update:**
- ✓ `create<Type>`

### src/lib/graphql/graphql/goals-okrs-operations.ts

**Patterns to update:**
- ✓ `create<Type>`
- ✓ `totalCount`

### src/lib/graphql/graphql/leave-management-operations.ts

**Patterns to update:**
- ✓ `create<Type>`
- ✓ `totalCount`

### src/lib/graphql/graphql/n-plus-one-detector.ts

**Patterns to update:**
- ✓ `create<Type>`

### src/lib/graphql/graphql/performance-management-operations.ts

**Patterns to update:**
- ✓ `create<Type>`
- ✓ `totalCount`

### src/lib/graphql/graphql/performance-monitor.ts

**Patterns to update:**
- ✓ `create<Type>`

### src/lib/graphql/graphql/postgraphile-operations.ts

**Patterns to update:**
- ✓ `all<Type>`
- ✓ `<type>ById`
- ✓ `create<Type>`
- ✓ `update<Type>ById`
- ✓ `totalCount`

### src/lib/graphql/graphql/query-complexity-analyzer.ts

**Patterns to update:**
- ✓ `create<Type>`

### src/lib/graphql/graphql/reviews-operations.ts

**Patterns to update:**
- ✓ `create<Type>`
- ✓ `totalCount`

### src/lib/graphql/graphql/subscription-tester.ts

**Patterns to update:**
- ✓ `create<Type>`

### src/lib/graphql/graphql/team-management-operations.ts

**Patterns to update:**
- ✓ `create<Type>`
- ✓ `totalCount`

### src/lib/graphql/graphql/team-reports-operations.ts

**Patterns to update:**
- ✓ `create<Type>`
- ✓ `totalCount`

### src/lib/graphql/leave-management-operations.ts

**Patterns to update:**
- ✓ `all<Type>`
- ✓ `<type>ById`
- ✓ `create<Type>`
- ✓ `totalCount`

### src/lib/graphql/n-plus-one-detector.ts

**Patterns to update:**
- ✓ `create<Type>`

### src/lib/graphql/notifications-operations.ts

**Patterns to update:**
- ✓ `all<Type>`
- ✓ `<type>ById`
- ✓ `create<Type>`
- ✓ `totalCount`

### src/lib/graphql/performance-management-operations.ts

**Patterns to update:**
- ✓ `<type>ById`
- ✓ `create<Type>`
- ✓ `totalCount`

### src/lib/graphql/performance-monitor.ts

**Patterns to update:**
- ✓ `create<Type>`

### src/lib/graphql/postgraphile-operations.ts

**Patterns to update:**
- ✓ `all<Type>`
- ✓ `<type>ById`
- ✓ `create<Type>`
- ✓ `update<Type>ById`
- ✓ `totalCount`

### src/lib/graphql/queries/leave-requests.ts

**Patterns to update:**
- ✓ `all<Type>`
- ✓ `<type>ById`
- ✓ `create<Type>`
- ✓ `update<Type>ById`
- ✓ `totalCount`

### src/lib/graphql/queries/performance-reviews.ts

**Patterns to update:**
- ✓ `all<Type>`
- ✓ `<type>ById`
- ✓ `create<Type>`
- ✓ `update<Type>ById`
- ✓ `totalCount`

### src/lib/graphql/query-complexity-analyzer.ts

**Patterns to update:**
- ✓ `create<Type>`

### src/lib/graphql/reports-operations.ts

**Patterns to update:**
- ✓ `<type>ById`
- ✓ `create<Type>`
- ✓ `totalCount`

### src/lib/graphql/settings-operations.ts

**Patterns to update:**
- ✓ `create<Type>`

### src/lib/graphql/subscription-tester.ts

**Patterns to update:**
- ✓ `create<Type>`

### src/lib/graphql/subscriptions.ts

**Patterns to update:**
- ✓ `create<Type>`

### src/lib/graphql/tasks-operations.ts

**Patterns to update:**
- ✓ `all<Type>`
- ✓ `<type>ById`
- ✓ `create<Type>`
- ✓ `update<Type>ById`
- ✓ `totalCount`

### src/lib/graphql/tasks-query-optimizer.ts

**Patterns to update:**
- ✓ `all<Type>`
- ✓ `<type>ById`
- ✓ `totalCount`

### src/lib/graphql/team-management-operations.ts

**Patterns to update:**
- ✓ `create<Type>`
- ✓ `totalCount`

### src/lib/graphql/team-reports-operations.ts

**Patterns to update:**
- ✓ `create<Type>`
- ✓ `totalCount`

================================================================================
TOTAL FILES TO UPDATE: 38
================================================================================

✅ Migration mapping saved to: /home/chanway/Projects/SvelteHR/tools/schema-validator/migration_mapping.json
