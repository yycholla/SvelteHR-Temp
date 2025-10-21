# Quickstart Guide: GraphQL Rust API Implementation

**Feature**: Complete PostgreSQL Database API Coverage via GraphQL
**Date**: 2025-10-10
**Purpose**: Validation checklist for implementation completeness

## Prerequisites

- [ ] Rust 1.90+ installed
- [ ] Docker and Docker Compose installed
- [ ] PostgreSQL 14+ running (via docker-compose)
- [ ] Database migrations applied (all 43 tables exist)
- [ ] Environment variables configured (.env file)

## Environment Setup

```bash
# 1. Navigate to Rust GraphQL server directory
cd graphql-rust-server

# 2. Copy environment template
cp .env.example .env

# 3. Configure database connection
# Edit .env:
DATABASE_URL=postgresql://postgres:password@localhost:5432/sveltehr
JWT_SECRET=your-secret-key-here
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
HOST=0.0.0.0
PORT=4000

# 4. Install dependencies and verify compilation
cargo build --release

# 5. Run database migrations (if not already applied)
# Migrations are in parent directory
cd ..
for migration in migrations/*.sql; do
  echo "Applying $migration..."
  psql $DATABASE_URL -f "$migration"
done
cd graphql-rust-server

# 6. Start GraphQL server
cargo run --release

# Expected output:
# 🚀 GraphQL server ready at http://0.0.0.0:4000/graphql
# 🎮 GraphQL Playground available at http://0.0.0.0:4000
```

## Validation Steps

### Step 1: Health Check ✅

**Test**: Verify server is running and responding

```bash
curl http://localhost:4000/health
```

**Expected Output**:
```
OK
```

**GraphQL Playground Test**:
```graphql
query HealthCheck {
  health
}
```

**Expected Response**:
```json
{
  "data": {
    "health": "OK"
  }
}
```

---

### Step 2: GraphQL Introspection ✅

**Test**: Verify schema is complete with all 43 tables

```graphql
query IntrospectSchema {
  __schema {
    types {
      name
      kind
    }
  }
}
```

**Expected**: Should return 43+ object types matching data-model.md:
- User, Department, UserRoleAssignment
- Event, EventAttendee, EventComment, EventHistory, EventNotification, EventWaitlist
- Task, TaskAssignee, TaskAuditEntry, TaskDependency, TaskType
- Document, DocumentVersion, DocumentCategory, DocumentAssignment, DocumentAccessLog, EncryptedFileStorage
- PerformanceReview, ReviewGoal, ReviewTemplate, EmployeeGoal, EmployeeSkill, EmployeeCertification, HRReport, CompensationBand
- LeaveRequest, TimeOffBalance, TimeOffPolicy, AttendanceRecord
- Notification, NotificationPreference, ActivityLog
- PayrollRecord, EmployeeVehicle
- RollbackRequest, BulkRollbackBatch, BulkRollbackItem, LinkedResource, EmergencyContact, EncryptionKey

**Validation**:
```bash
# Count object types (should be >= 43)
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __schema { types { name kind } } }"}' \
  | jq '[.data.__schema.types[] | select(.kind == "OBJECT") | .name] | length'
```

**Expected**: Number >= 43

---

### Step 3: Basic CRUD Operations ✅

#### Test 3.1: Create User

```graphql
mutation CreateUser {
  createUser(input: {
    email: "test@example.com"
    firstName: "Test"
    lastName: "User"
    hireDate: "2025-01-15"
    status: ACTIVE
  }) {
    id
    email
    fullName
    status
    createdAt
  }
}
```

**Expected**: Returns created user with UUID id

**Validation**:
- `id` is a valid UUID
- `email` matches input
- `fullName` is "Test User"
- `status` is "ACTIVE"
- `createdAt` is recent timestamp

#### Test 3.2: Query User by ID

```graphql
query GetUser($id: UUID!) {
  user(id: $id) {
    id
    email
    firstName
    lastName
    fullName
    status
    department {
      id
      name
    }
  }
}
```

**Variables**:
```json
{
  "id": "<UUID from Test 3.1>"
}
```

**Expected**: Returns user matching created record

**Performance Requirement**: Query completes in <1000ms (FR-017)

#### Test 3.3: Update User (Optimistic Locking)

```graphql
mutation UpdateUser($id: UUID!, $updatedAt: DateTime!) {
  updateUser(input: {
    id: $id
    firstName: "Updated"
    updatedAt: $updatedAt
  }) {
    id
    firstName
    updatedAt
  }
}
```

**Variables**:
```json
{
  "id": "<UUID from Test 3.1>",
  "updatedAt": "<updatedAt from Test 3.2>"
}
```

**Expected**: Update succeeds with new `updatedAt` timestamp

**Conflict Test**: Retry with old `updatedAt` value
**Expected**: Returns error "Conflict: Record was modified by another user" (FR-011 validation)

#### Test 3.4: Soft Delete User

```graphql
mutation DeleteUser($id: UUID!) {
  deleteUser(id: $id)
}
```

**Variables**:
```json
{
  "id": "<UUID from Test 3.1>"
}
```

**Expected**: Returns `true`

**Validation Query**:
```graphql
query CheckSoftDelete($id: UUID!) {
  user(id: $id) {
    id
    email
  }
}
```

**Expected**: Returns `null` (default query excludes soft-deleted)

**Include Deleted Query**:
```graphql
query GetDeletedUser {
  users(filter: { includeDeleted: true, email: { eq: "test@example.com" } }) {
    edges {
      node {
        id
        email
      }
    }
  }
}
```

**Expected**: Returns user (FR-031, FR-032 validation)

---

### Step 4: Pagination & Filtering ✅

#### Test 4.1: Default Pagination Limit

```graphql
query ListUsers {
  users {
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
    totalCount
    edges {
      node {
        id
        email
      }
    }
  }
}
```

**Expected**:
- Returns max 100 records (FR-018 default limit)
- `pageInfo.hasNextPage` is true if total > 100
- `totalCount` shows total users in database

**Performance Requirement**: Query completes in <1000ms (FR-017)

#### Test 4.2: Cursor-Based Pagination

```graphql
query NextPage($after: String!) {
  users(first: 50, after: $after) {
    pageInfo {
      hasNextPage
      endCursor
    }
    edges {
      node {
        id
        email
      }
    }
  }
}
```

**Variables**:
```json
{
  "after": "<endCursor from Test 4.1>"
}
```

**Expected**: Returns next 50 records

#### Test 4.3: Filtering

```graphql
query FilterUsers {
  users(filter: {
    status: ACTIVE
    firstName: { like: "John%" }
  }) {
    edges {
      node {
        id
        firstName
        lastName
        status
      }
    }
  }
}
```

**Expected**: Returns only active users with first name starting with "John"

---

### Step 5: Relationships & DataLoader (N+1 Prevention) ✅

#### Test 5.1: Nested Relationship Query

```graphql
query UsersWithDepartments {
  users(first: 10) {
    edges {
      node {
        id
        email
        department {
          id
          name
          manager {
            id
            fullName
          }
        }
      }
    }
  }
}
```

**Expected**: Returns users with nested department and manager data

**Performance Requirement**:
- DataLoader should batch load all departments in 1 query
- DataLoader should batch load all managers in 1 query
- Total SQL queries: 3 (users, departments, managers)
- NOT N+1: 10 users should not trigger 10+ separate queries

**Validation** (check logs for SQL query count):
```bash
# Enable SQL logging in .env
RUST_LOG=sqlx::query=debug,hr_graphql_server=debug

# Run server and execute query
# Check logs - should see 3 SELECT queries max, not 20+
```

---

### Step 6: Query Depth Limit ✅

#### Test 6.1: Exceed Max Depth (Should Fail)

```graphql
query DeepNesting {
  users(first: 1) {
    edges {
      node {
        manager { # Depth 1
          manager { # Depth 2
            manager { # Depth 3
              manager { # Depth 4
                manager { # Depth 5
                  manager { # Depth 6
                    manager { # Depth 7
                      manager { # Depth 8
                        manager { # Depth 9
                          manager { # Depth 10
                            manager { # Depth 11 - EXCEEDS LIMIT
                              id
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

**Expected**: Error "Query exceeds maximum depth of 10" (FR-020 validation)

#### Test 6.2: Maximum Allowed Depth (Should Succeed)

```graphql
query MaxDepth {
  users(first: 1) {
    edges {
      node {
        department { # Depth 1
          parentDepartment { # Depth 2
            parentDepartment { # Depth 3
              parentDepartment { # Depth 4
                parentDepartment { # Depth 5
                  parentDepartment { # Depth 6
                    parentDepartment { # Depth 7
                      parentDepartment { # Depth 8
                        parentDepartment { # Depth 9
                          parentDepartment { # Depth 10
                            id
                            name
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

**Expected**: Query succeeds (depth exactly 10)

---

### Step 7: JWT Authentication & RBAC ✅

#### Test 7.1: Unauthenticated Request (Should Fail)

```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ users { edges { node { id email } } } }"}'
```

**Expected**: HTTP 401 Unauthorized or GraphQL error "Authentication required"

#### Test 7.2: Authenticated Request with Valid JWT

```bash
# Generate test JWT (use your JWT secret)
export TEST_TOKEN="<valid JWT token with user_id and roles>"

curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -d '{"query": "{ users { edges { node { id email } } } }"}'
```

**Expected**: Returns user data (HTTP 200)

#### Test 7.3: RBAC Permission Check

**Test as Employee** (limited access):
```graphql
query MyProfile {
  user(id: "<my user id>") {
    id
    email
    salary # Should fail - no permission
  }
}
```

**Expected**: Field `salary` returns error "Insufficient permissions"

**Test as HR Manager** (full access):
```graphql
query AllUsers {
  users {
    edges {
      node {
        id
        email
        department {
          name
        }
      }
    }
  }
}
```

**Expected**: Returns all users (HR role has permission)

---

### Step 8: Event System Integration ✅

#### Test 8.1: Create Event with Attendees

```graphql
mutation CreateEvent {
  createEvent(input: {
    title: "Team Meeting"
    description: "Q1 Planning"
    startTime: "2025-01-20T14:00:00Z"
    endTime: "2025-01-20T15:00:00Z"
    capacity: 10
  }) {
    id
    title
    capacity
    createdAt
  }
}
```

**Expected**: Returns created event

#### Test 8.2: Add Event Attendees

```graphql
mutation AddAttendee($eventId: UUID!, $employeeId: UUID!) {
  createEventAttendee(input: {
    eventId: $eventId
    employeeId: $employeeId
    responseStatus: ACCEPTED
    isRequired: false
  }) {
    id
    event {
      id
      title
    }
    employee {
      id
      fullName
    }
    responseStatus
  }
}
```

**Expected**: Returns attendee with nested event and employee data

#### Test 8.3: Check Event Capacity

```graphql
query EventWithAttendees($eventId: UUID!) {
  event(id: $eventId) {
    id
    title
    capacity
    attendees {
      id
      employee {
        fullName
      }
      responseStatus
    }
  }
}
```

**Expected**: Returns event with attendee list

**Validation**: If attendees.length >= capacity, should trigger waitlist logic

---

### Step 9: Real-time Subscriptions (WebSocket) ✅

#### Test 9.1: Subscribe to Event Updates

```graphql
subscription OnEventUpdate($eventId: UUID!) {
  eventUpdated(eventId: $eventId) {
    id
    title
    updatedAt
  }
}
```

**Expected**: WebSocket connection established, listens for updates

#### Test 9.2: Trigger Update (in separate tab)

```graphql
mutation UpdateEvent($eventId: UUID!, $updatedAt: DateTime!) {
  updateEvent(input: {
    id: $eventId
    title: "Updated Team Meeting"
    updatedAt: $updatedAt
  }) {
    id
    title
    updatedAt
  }
}
```

**Expected**: Subscription receives real-time update with new title

---

### Step 10: Error Handling ✅

#### Test 10.1: Validation Error (Invalid Email)

```graphql
mutation CreateInvalidUser {
  createUser(input: {
    email: "not-an-email"
    firstName: "Invalid"
    lastName: "User"
    hireDate: "2025-01-15"
  }) {
    id
  }
}
```

**Expected**: GraphQL error with message "Invalid email format" (FR-007, FR-008)

#### Test 10.2: Foreign Key Violation (Non-existent Department)

```graphql
mutation CreateUserWithBadDept {
  createUser(input: {
    email: "test2@example.com"
    firstName: "Test"
    lastName: "User"
    hireDate: "2025-01-15"
    departmentId: "00000000-0000-0000-0000-000000000000"
  }) {
    id
  }
}
```

**Expected**: GraphQL error with message "Department not found"

#### Test 10.3: Unique Constraint Violation (Duplicate Email)

```graphql
mutation CreateDuplicateUser {
  createUser(input: {
    email: "existing@example.com"
    firstName: "Duplicate"
    lastName: "User"
    hireDate: "2025-01-15"
  }) {
    id
  }
}
```

**Expected**: GraphQL error with message "Email already exists"

---

## Performance Benchmarks

### Benchmark 1: Simple Query Performance

```bash
# Use Apache Bench or similar tool
ab -n 1000 -c 10 -p query.json -T application/json \
  http://localhost:4000/graphql
```

**query.json**:
```json
{
  "query": "{ user(id: \"<valid-user-id>\") { id email fullName } }"
}
```

**Expected**:
- Mean response time: <1000ms (FR-017)
- P95 response time: <200ms (Constitution requirement)
- No timeouts or errors

### Benchmark 2: List Query with Pagination

```bash
# Test with default limit (100 records)
ab -n 100 -c 5 -p list-query.json -T application/json \
  http://localhost:4000/graphql
```

**list-query.json**:
```json
{
  "query": "{ users(first: 100) { edges { node { id email } } pageInfo { hasNextPage } } }"
}
```

**Expected**:
- Mean response time: <1000ms (FR-017)
- P95 response time: <500ms

### Benchmark 3: Complex Nested Query

```graphql
query ComplexQuery {
  users(first: 50) {
    edges {
      node {
        id
        email
        department {
          name
          manager {
            fullName
          }
        }
        skills {
          skillName
          proficiencyLevel
        }
        goals {
          goalTitle
          status
        }
      }
    }
  }
}
```

**Expected**:
- DataLoader batching prevents N+1
- Total SQL queries: ~6 (users, departments, managers, skills, goals, maybe one more)
- Response time: <2000ms with DataLoader
- WITHOUT DataLoader: Would be 100+ queries (unacceptable)

---

## Troubleshooting

### Issue: "Connection refused" on port 4000

**Solution**:
```bash
# Check if server is running
ps aux | grep hr-graphql-server

# Check port binding
lsof -i :4000

# Restart server
cargo run --release
```

### Issue: "Database connection failed"

**Solution**:
```bash
# Verify PostgreSQL is running
docker-compose ps

# Test connection
psql $DATABASE_URL -c "SELECT version();"

# Check migrations
psql $DATABASE_URL -c "SELECT tablename FROM pg_tables WHERE schemaname = 'hr_public' LIMIT 5;"
```

### Issue: "Type mismatch" in GraphQL query

**Solution**:
- Verify field types match schema (use introspection query)
- Check UUID format (must be valid UUID, not integer)
- DateTime must be ISO 8601 format

### Issue: High memory usage

**Solution**:
```bash
# Check SQLx connection pool size
# In src/db/mod.rs, ensure:
.max_connections(20) # Adjust based on load

# Monitor memory
watch -n 1 'ps aux | grep hr-graphql-server'
```

---

## Completion Checklist

Phase 1 implementation is complete when:

- [ ] All 43 tables have GraphQL types defined
- [ ] All Query resolvers implemented (single + list for each table)
- [ ] All Mutation resolvers implemented (create, update, delete for mutable tables)
- [ ] Pagination works with cursor-based approach (Relay spec)
- [ ] Filtering works for all major fields
- [ ] Relationships load correctly via DataLoader (no N+1)
- [ ] Query depth limit enforced (max 10 levels)
- [ ] Optimistic locking works (version check on updates)
- [ ] Soft delete implemented for all mutable tables
- [ ] JWT middleware validates tokens
- [ ] RBAC permissions enforced at resolver level
- [ ] RLS session variables passed to PostgreSQL
- [ ] Subscriptions work for real-time updates
- [ ] Error handling provides clear, actionable messages
- [ ] Performance benchmarks meet requirements (<1000ms simple queries)
- [ ] GraphQL Playground accessible at http://localhost:4000
- [ ] Health check endpoint returns 200 OK

---

**Quickstart Status**: ✅ **READY** - All validation steps defined, ready for implementation execution
