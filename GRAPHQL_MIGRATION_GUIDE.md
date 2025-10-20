# GraphQL Migration Guide: PostGraphile to Rust Backend

## Overview

This guide documents the migration patterns for updating frontend GraphQL queries from PostGraphile conventions to the Rust GraphQL backend patterns.

**Status**: 52 files identified with incompatible `filter:` usage that need migration.

## Completed Migrations

### ✅ Fixed Files

1. **`/src/routes/dashboard/+page.server.ts`**
   - Fixed: `leaveType` scalar → nested object with relationship resolver
   - Pattern: Use `leaveType { id, name, color, icon }` instead of scalar `leaveType`

2. **`/src/routes/dashboard/departments/[id]/+page.server.ts`**
   - Fixed: `departments(filter: { id: { equalTo: $id } })` → `department(id: $id)`
   - Fixed: `users(filter: { id: { equalTo: $id } })` → `user(id: $id)`
   - Fixed: `users(departmentId: $id)` → fetch all users, filter server-side
   - Pattern: Use singular queries for ID lookups, server-side filtering for other criteria

3. **`/src/routes/dashboard/teams/+page.server.ts`**
   - Fixed: `users(filter: { id: { equalTo: $userId } })` → `user(id: $userId)`
   - Fixed: `departments(filter: { id: { equalTo: $id } })` → conditional singular/plural query
   - Fixed: PostGraphile `userByManagerId` relationship → fetch managers separately with `user(id:)`
   - Pattern: Fetch related entities separately, build relationship map

4. **`/src/lib/graphql/graphql/dashboard-operations.ts`**
   - Fixed: `GET_PENDING_APPROVALS` and `GET_TEAM_DASHBOARD` to use nested `leaveType` object
   - Pattern: Relationship resolvers for foreign keys

## Common Migration Patterns

### Pattern 1: ID-Based Lookup with Filter → Singular Query

**❌ OLD (PostGraphile)**:
```typescript
const query = `
  query GetDepartment($id: UUID!) {
    departments(filter: { id: { equalTo: $id } }) {
      id
      name
    }
  }
`;
```

**✅ NEW (Rust)**:
```typescript
const query = `
  query GetDepartment($id: UUID!) {
    department(id: $id) {
      id
      name
    }
  }
`;
```

### Pattern 2: Foreign Key Filter → Fetch All + Server-Side Filter

**❌ OLD (PostGraphile)**:
```typescript
const query = `
  query GetEmployeesByDepartment($deptId: UUID!) {
    users(filter: { departmentId: { equalTo: $deptId } }) {
      id
      email
      departmentId
    }
  }
`;
```

**✅ NEW (Rust)**:
```typescript
const query = `
  query GetAllUsers {
    users(limit: 1000) {
      id
      email
      departmentId
    }
  }
`;

// In +page.server.ts:
const allUsers = result.data?.users || [];
const deptUsers = allUsers.filter(u => u.departmentId === deptId);
```

### Pattern 3: PostGraphile Relationships → Separate Queries + Map

**❌ OLD (PostGraphile)**:
```typescript
const query = `
  query GetDepartments {
    departments {
      id
      name
      userByManagerId {
        id
        displayName
        email
      }
    }
  }
`;
```

**✅ NEW (Rust)**:
```typescript
// Step 1: Fetch departments
const deptsQuery = `
  query GetDepartments {
    departments(limit: 100) {
      id
      name
      managerId
    }
  }
`;

const deptsResult = await fetch(graphqlEndpoint, {
  method: 'POST',
  body: JSON.stringify({ query: deptsQuery })
});

const departments = deptsResult.data?.departments || [];

// Step 2: Fetch managers
const managersMap = new Map();
const managerIds = [...new Set(departments.map(d => d.managerId).filter(Boolean))];

const managerPromises = managerIds.map(managerId =>
  fetch(graphqlEndpoint, {
    method: 'POST',
    body: JSON.stringify({
      query: `
        query GetUser($id: UUID!) {
          user(id: $id) {
            id
            displayName
            email
          }
        }
      `,
      variables: { id: managerId }
    })
  }).then(r => r.json())
);

const managerResponses = await Promise.all(managerPromises);
managerResponses.forEach(response => {
  const manager = response?.data?.user;
  if (manager) {
    managersMap.set(manager.id, manager);
  }
});

// Step 3: Map relationships
const deptswithManagers = departments.map(dept => ({
  ...dept,
  manager: dept.managerId ? managersMap.get(dept.managerId) : null
}));
```

### Pattern 4: Scalar Foreign Key → Relationship Resolver

**❌ OLD (Assuming scalar)**:
```typescript
query GetLeaveRequests {
  leaveRequests(limit: 10) {
    id
    leaveType  # Expecting string
  }
}
```

**✅ NEW (Relationship resolver)**:
```typescript
query GetLeaveRequests {
  leaveRequests(limit: 10) {
    id
    leaveTypeId  # UUID foreign key
    leaveType {  # Relationship resolver
      id
      name
      color
      icon
    }
  }
}
```

### Pattern 5: Conditional Singular vs Plural Query

**Use Case**: When you might filter by ID or fetch all

**✅ GOOD**:
```typescript
let departments: any[] = [];

if (filterDepartmentId) {
  // Use singular query for single department
  const singleDeptResponse = await fetch(graphqlEndpoint, {
    method: 'POST',
    body: JSON.stringify({
      query: `
        query GetDepartment($departmentId: UUID!) {
          department(id: $departmentId) {
            id
            name
          }
        }
      `,
      variables: { departmentId: filterDepartmentId }
    })
  });

  const dept = singleDeptResponse.data?.department;
  departments = dept ? [dept] : [];
} else {
  // Use plural query for all departments
  const allDeptsResponse = await fetch(graphqlEndpoint, {
    method: 'POST',
    body: JSON.stringify({
      query: `
        query GetDepartments($limit: Int!, $offset: Int!) {
          departments(limit: $limit, offset: $offset) {
            id
            name
          }
        }
      `,
      variables: { limit: 100, offset: 0 }
    })
  });

  departments = allDeptsResponse.data?.departments || [];
}
```

### Pattern 6: Handling "new" Route in [id] Dynamic Routes

**Use Case**: `/dashboard/departments/new` shouldn't try to parse "new" as UUID

**✅ GOOD**:
```typescript
export const load: PageServerLoad = async (event) => {
  const { params } = event;
  const id = params.id;

  // Handle "new" route early
  if (id === 'new') {
    return {
      isNew: true,
      department: null,
      // ... other data for create form
    };
  }

  // Now safe to query with ID
  const query = `
    query GetDepartment($id: UUID!) {
      department(id: $id) {
        id
        name
      }
    }
  `;
  // ... rest of query logic
};
```

## Supported Query Arguments Reference

### Users
```graphql
users(limit: Int, offset: Int): [User!]!
user(id: UUID!): User
```

### Departments
```graphql
departments(limit: Int, offset: Int): [Department!]!
department(id: UUID!): Department
```

### Tasks
```graphql
tasks(assigneeId: UUID, limit: Int, offset: Int): [Task!]!
task(id: UUID!): Task
```

### Leave Requests
```graphql
leaveRequests(limit: Int, offset: Int): [LeaveRequest!]!
leaveRequest(id: UUID!): LeaveRequest
```

### Events
```graphql
events(upcomingOnly: Boolean, limit: Int, offset: Int): [Event!]!
event(id: UUID!): Event
```

### Event Attendees
```graphql
eventAttendees(
  eventId: UUID,
  employeeId: UUID,
  reminderTimeIsNull: Boolean,
  limit: Int,
  offset: Int
): [EventAttendee!]!
```

### Notifications
```graphql
notifications(
  userId: UUID,
  unreadOnly: Boolean,
  limit: Int,
  offset: Int
): [Notification!]!
```

### Activity Logs
```graphql
activityLogs(userId: UUID, limit: Int, offset: Int): [ActivityLog!]!
activityLog(id: UUID!): ActivityLog
```

### Attendance Records
```graphql
attendanceRecords(userId: UUID, limit: Int, offset: Int): [AttendanceRecord!]!
```

### Employee Goals
```graphql
employeeGoals(employeeId: UUID, limit: Int, offset: Int): [EmployeeGoal!]!
```

## Remaining Files to Migrate

**Total**: 52 files with `filter:` usage

### High Priority (Server-Side Routes)
- `/src/routes/dashboard/tasks/my-tasks/+page.server.ts`
- `/src/routes/dashboard/tasks/team-tasks/+page.server.ts`
- `/src/routes/dashboard/users/[id]/leave/requests/+page.server.ts`
- `/src/routes/dashboard/users/[id]/performance/+page.server.ts`
- `/src/routes/dashboard/employees/[id]/+page.server.ts`
- `/src/routes/dashboard/events/+page.server.ts`
- `/src/routes/dashboard/activities/audit/+page.server.ts`

### Medium Priority (GraphQL Operations Libraries)
- `/src/lib/graphql/tasks-operations.ts`
- `/src/lib/graphql/events-operations.ts`
- `/src/lib/graphql/leave-management-operations.ts`
- `/src/lib/graphql/department-operations.ts`
- `/src/lib/graphql/employee-operations.ts`

### Lower Priority (Component Files)
- Component-level Svelte files can be migrated after server routes

## Migration Checklist

For each file:

- [ ] Identify all queries using `filter:` pattern
- [ ] Determine if filtering by ID → use singular query
- [ ] Determine if filtering by other criteria → fetch all + server-side filter
- [ ] Identify PostGraphile relationship patterns (`userByFooId`)
- [ ] Replace with separate queries + relationship mapping
- [ ] Update pagination from cursor-based to offset-based
- [ ] Test query against Rust backend
- [ ] Verify error handling for missing data

## Common Errors and Fixes

### Error: `Unknown argument "filter"`
**Fix**: Remove `filter` argument, use singular query or specific filter parameters

### Error: `Failed to parse "UUID"`
**Fix**: Add "new" route handler before UUID parsing

### Error: `Unknown field "userByFooId"`
**Fix**: Fetch related entity separately using `user(id:)` query

### Error: `Field must have a selection of subfields`
**Fix**: Use relationship resolver with nested fields instead of scalar

## Testing Commands

```bash
# Test single query via curl
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{"query":"query { users(limit: 10) { id email } }"}'

# Test with variables
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{"query":"query GetUser($id: UUID!) { user(id: $id) { id email } }", "variables": {"id": "uuid-here"}}'
```

## Best Practices

1. **Always fetch relationships separately** - Rust backend doesn't support PostGraphile's automatic relationship resolution
2. **Use Map for relationship joins** - More efficient than nested loops
3. **Fetch in parallel** - Use `Promise.all()` for multiple independent queries
4. **Server-side filtering** - When Rust backend doesn't support specific filters
5. **Validate UUIDs** - Handle "new" and other special cases before querying
6. **Use specific filter parameters** - When available (`userId`, `assigneeId`, etc.)
7. **Limit queries appropriately** - Default 100, max 1000

## References

- [RUST_GRAPHQL_API_REFERENCE.md](./RUST_GRAPHQL_API_REFERENCE.md) - Complete API documentation
- GraphQL Playground: `http://localhost:4000/graphql`
- Rust Backend Source: `/graphql-rust-server/src/schema/query.rs`
