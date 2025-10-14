# GraphQL Schema Gap Analysis: Frontend Expectations vs Rust Implementation

**Date:** 2025-10-14
**Status:** 🚨 CRITICAL - Schema misalignment blocking functionality

---

## Executive Summary

After migrating frontend GraphQL operations to use Rust naming conventions, introspection of the actual Rust GraphQL schema reveals **significant capability gaps** between what the frontend expects and what the Rust API provides.

**Key Issues:**
1. ❌ `tasks` query lacks filtering and sorting capabilities
2. ❌ Task type missing critical fields used by frontend
3. ❌ Field naming inconsistencies (creatorId vs createdBy)
4. ❌ Input types missing required parameters for mutations

**Impact:** The migrated frontend code will fail at runtime because it requests parameters and fields that don't exist in the Rust schema.

---

## Gap Category 1: Query Parameters

### `tasks` Query - Missing Filter and OrderBy

**Frontend Expectation:**
```graphql
query GetAllTasks($limit: Int, $offset: Int, $filter: TaskFilter, $orderBy: String) {
  tasks(limit: $limit, offset: $offset, filter: $filter, orderBy: $orderBy) {
    id
    title
    status
  }
}
```

**Rust Schema Actual:**
```graphql
tasks(limit: Int, offset: Int): [Task!]!
```

**Gap:**
- ❌ No `filter` parameter (frontend expects `TaskFilter` input type)
- ❌ No `orderBy` parameter (frontend expects string like "due_date_asc")

**Frontend Usage:**
- `src/routes/dashboard/tasks/+page.server.ts` - Line 141: Sends `filter: { status, priority, assigneeId }`
- `src/lib/graphql/tasks-operations.ts` - Multiple queries use `filter` and `orderBy`

**Alternative Rust Queries Available:**
```graphql
tasksByStatus(status: TaskStatus!, limit: Int, offset: Int): [Task!]!
tasksByPriority(priority: TaskPriority!, limit: Int, offset: Int): [Task!]!
tasksByAssignee(assigneeId: UUID!, limit: Int, offset: Int): [Task!]!
tasksByCreator(creatorId: UUID!, limit: Int, offset: Int): [Task!]!
tasksByDepartment(departmentId: UUID!, limit: Int, offset: Int): [Task!]!
```

**Recommendations:**
1. **Option A (Backend Change):** Add `filter` and `orderBy` parameters to `tasks` query in Rust
2. **Option B (Frontend Change):** Use specialized queries (`tasksByStatus`, etc.) instead of generic filtered query
3. **Option C (Hybrid):** Support both generic `tasks` with filters AND specialized queries

---

## Gap Category 2: Task Type Fields

### Missing Fields on Task Type

**Frontend Expects:**
```typescript
interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  taskTypeId?: string;              // ❌ MISSING
  requiresManualReassignment: boolean; // ❌ MISSING
  creatorId: string;                 // ❌ WRONG NAME (uses createdBy)
  assigneeId?: string;
  dueDate?: string;
  // ... other fields
}
```

**Rust Schema Provides:**
```graphql
type Task {
  id: UUID!
  title: String!
  status: TaskStatus!
  priority: TaskPriority!
  # taskTypeId: MISSING
  # requiresManualReassignment: MISSING
  createdBy: UUID!          # Named differently than frontend expects
  assigneeId: UUID
  dueDate: DateTime
  description: String
  completedAt: DateTime
  estimatedHours: Float
  actualHours: Float
  tags: [String!]
  departmentId: UUID
  parentTaskId: UUID
  archived: Boolean!
  createdAt: DateTime!
  updatedAt: DateTime!

  # Relations
  creator: User!
  assignee: User
  parentTask: Task
  department: Department
}
```

**Gaps:**
1. ❌ `taskTypeId` field completely missing
2. ❌ `requiresManualReassignment` field completely missing
3. ⚠️ `creatorId` doesn't exist, Rust uses `createdBy` instead

**Frontend Usage:**
- Task creation forms expect `taskTypeId` for categorization
- Task reassignment logic checks `requiresManualReassignment` flag
- Various components reference `task.creatorId` instead of `task.createdBy`

**Database Schema Check:**
```sql
-- Need to verify if these columns exist in PostgreSQL tasks table:
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'tasks'
  AND column_name IN ('task_type_id', 'requires_manual_reassignment', 'creator_id', 'created_by');
```

**Recommendations:**
1. **If DB columns exist:** Update Rust GraphQL schema to expose these fields
2. **If DB columns missing:** Add database migration to add these columns
3. **Field naming:** Standardize on either `creatorId` or `createdBy` across frontend and backend

---

## Gap Category 3: Input Type Mismatches

### CreateTaskInput - Missing Optional Fields

**Frontend Sends:**
```typescript
const input: CreateTaskInput = {
  title: "Task title",
  description: "Description",
  status: "TO_DO",                    // ❌ NOT ACCEPTED
  priority: "HIGH",
  taskTypeId: "uuid-here",            // ❌ NOT ACCEPTED
  assigneeId: "uuid-here",
  dueDate: "2025-12-31",
  requiresManualReassignment: false,  // ❌ NOT ACCEPTED
  departmentId: "uuid-here",
  parentTaskId: "uuid-here"
};
```

**Rust CreateTaskInput Accepts:**
```graphql
input CreateTaskInput {
  title: String!           # REQUIRED
  priority: TaskPriority!  # REQUIRED
  description: String
  dueDate: DateTime
  estimatedHours: Float
  tags: [String!]
  departmentId: UUID
  assigneeId: UUID
  parentTaskId: UUID
  # status: NOT ACCEPTED (defaults to TO_DO server-side?)
  # taskTypeId: NOT ACCEPTED
  # requiresManualReassignment: NOT ACCEPTED
}
```

**Gaps:**
1. ❌ `status` field not accepted (frontend tries to set initial status)
2. ❌ `taskTypeId` not accepted (frontend expects to categorize tasks)
3. ❌ `requiresManualReassignment` not accepted (frontend expects to set this flag)

**Frontend Usage:**
- `src/lib/graphql/tasks-operations.ts` - `createTask()` method sends all three missing fields
- Task creation forms in `src/routes/dashboard/tasks/create/+page.svelte` include these fields
- Bulk task creation operations rely on setting `taskTypeId`

**Recommendations:**
1. **Backend Change:** Add missing fields to `CreateTaskInput` in Rust
2. **Frontend Change:** Remove these fields from creation forms (use defaults)
3. **Two-step Creation:** Create task first, then update with additional fields

---

### UpdateTaskInput - Similar Gaps

**Frontend Sends:**
```typescript
const input: UpdateTaskInput = {
  title: "Updated title",
  status: "IN_PROGRESS",
  priority: "MEDIUM",
  taskTypeId: "new-uuid",              // ❌ Likely not accepted
  requiresManualReassignment: true,    // ❌ Likely not accepted
  // ... other fields
};
```

**Rust UpdateTaskInput (Need to verify):**
```graphql
input UpdateTaskInput {
  title: String
  description: String
  priority: TaskPriority
  dueDate: DateTime
  estimatedHours: Float
  tags: [String!]
  # Need introspection to confirm full field list
}
```

**Action Required:** Run introspection query on `UpdateTaskInput` to confirm exact fields:
```bash
curl -X POST http://localhost:4000/graphql -H "Content-Type: application/json" \
  -d '{"query":"{ __type(name: \"UpdateTaskInput\") { inputFields { name type { name kind } } } }"}'
```

---

## Gap Category 4: Connection Type Differences

### Pagination and Metadata

**Frontend Expected (PostGraphile style):**
```graphql
{
  tasks {
    nodes { id title }
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

**Rust Provides (Direct array):**
```graphql
tasks(limit: Int, offset: Int): [Task!]!
```

**Gaps:**
1. ❌ No `totalCount` field for pagination UI
2. ❌ No `pageInfo` for cursor-based pagination
3. ❌ No way to determine if more pages exist

**Frontend Impact:**
- Pagination controls can't show "Page X of Y"
- "Load More" buttons can't know if more data exists
- Client-side workaround: Assume more pages if `result.length === limit`

**Recommendations:**
1. **Option A:** Return connection type with metadata:
   ```graphql
   type TaskConnection {
     nodes: [Task!]!
     totalCount: Int!
     pageInfo: PageInfo!
   }
   tasks(...): TaskConnection!
   ```
2. **Option B:** Add separate `tasksCount` query (already exists!)
3. **Option C:** Client-side pagination logic (less ideal)

---

## Gap Category 5: Specialized Query Parameters

### Individual Query Parameter Verification

Need to verify parameters for all task-related queries:

**Queries to Introspect:**
- `task(id: UUID!)` - ✅ Confirmed, matches frontend
- `tasksByStatus` - Need to verify exact parameters
- `tasksByPriority` - Need to verify exact parameters
- `tasksByAssignee` - Need to verify exact parameters
- `tasksByCreator` - Need to verify exact parameters
- `tasksByDepartment` - Need to verify exact parameters
- `taskAuditEntries` - Need to verify parameters
- `taskDependency` - Need to verify parameters

**Action Required:** Run full introspection on each query to document parameters.

---

## Gap Category 6: Mutation Return Types

### Mutation Response Structure

**Frontend Expects (from migrated code):**
```graphql
mutation CreateTask($input: CreateTaskInput!) {
  create_task(input: $input) {
    id
    title
    status
    creator { id displayName }
    assignee { id displayName }
  }
}
```

**Rust Likely Provides:**
```graphql
createTask(input: CreateTaskInput!): Task!
```

**Potential Issues:**
1. ⚠️ Mutation name: Frontend uses `create_task`, Rust uses `createTask`
2. ✅ Return type: Direct Task object (no wrapper) - matches frontend expectation

**Action Required:** Verify all mutation names match snake_case convention or if they use camelCase.

---

## Priority Action Matrix

### P0 - Blocking Issues (Fix Immediately)

| Issue | Frontend Impact | Backend Change | Effort |
|-------|----------------|----------------|--------|
| `tasks` query missing `filter` parameter | ❌ Can't filter by status, priority, assignee | Add `filter: TaskFilter` parameter | Medium |
| `taskTypeId` field missing | ❌ Can't categorize tasks | Add field to schema + DB if needed | High |
| `requiresManualReassignment` missing | ❌ Reassignment logic broken | Add field to schema + DB if needed | High |

### P1 - Important (Fix Soon)

| Issue | Frontend Impact | Backend Change | Effort |
|-------|----------------|----------------|--------|
| `tasks` query missing `orderBy` | ⚠️ Can't sort results | Add `orderBy: String` parameter | Low |
| `creatorId` vs `createdBy` naming | ⚠️ Field access errors | Standardize naming | Low |
| `CreateTaskInput` missing `status` | ⚠️ Can't set initial status | Add optional `status` field | Low |

### P2 - Nice to Have (Defer if Needed)

| Issue | Frontend Impact | Backend Change | Effort |
|-------|----------------|----------------|--------|
| No `totalCount` in results | ⚠️ Pagination UI less informative | Add connection type wrapper | Medium |
| No `pageInfo` metadata | ⚠️ Cursor pagination not possible | Add PageInfo type | Medium |

---

## Recommended Resolution Strategy

### Phase 1: Database Schema Verification (1 hour)

```sql
-- Check if missing fields exist in database
\d tasks

-- Look for:
-- - task_type_id column
-- - requires_manual_reassignment column
-- - creator_id vs created_by column
```

**If columns exist in DB but not in Rust schema:** Simple fix - expose them in Rust GraphQL schema

**If columns missing from DB:** Need migration to add them first

### Phase 2: Rust Schema Updates (2-4 hours)

**graphql-rust-server/src/models/task.rs:**
```rust
#[derive(async_graphql::SimpleObject)]
pub struct Task {
    pub id: Uuid,
    pub title: String,
    // ... existing fields

    // ADD MISSING FIELDS:
    pub task_type_id: Option<Uuid>,
    pub requires_manual_reassignment: bool,

    // RENAME FOR CONSISTENCY:
    #[graphql(name = "creatorId")]  // Expose as creatorId to match frontend
    pub created_by: Uuid,
}
```

**graphql-rust-server/src/schema/query.rs:**
```rust
#[Object]
impl QueryRoot {
    // ADD FILTER AND ORDER BY PARAMETERS:
    async fn tasks(
        &self,
        ctx: &Context<'_>,
        limit: Option<i32>,
        offset: Option<i32>,
        filter: Option<TaskFilter>,  // ADD THIS
        order_by: Option<String>,    // ADD THIS
    ) -> Result<Vec<Task>> {
        // Implementation
    }
}

// ADD FILTER INPUT TYPE:
#[derive(async_graphql::InputObject)]
pub struct TaskFilter {
    pub status: Option<TaskStatus>,
    pub priority: Option<TaskPriority>,
    pub assignee_id: Option<Uuid>,
    pub creator_id: Option<Uuid>,
    pub department_id: Option<Uuid>,
    pub task_type_id: Option<Uuid>,
    pub parent_task_id: Option<Uuid>,
    pub archived: Option<bool>,
}
```

**graphql-rust-server/src/schema/mutation.rs:**
```rust
#[derive(async_graphql::InputObject)]
pub struct CreateTaskInput {
    pub title: String,
    pub priority: TaskPriority,
    pub description: Option<String>,

    // ADD MISSING FIELDS:
    pub status: Option<TaskStatus>,
    pub task_type_id: Option<Uuid>,
    pub requires_manual_reassignment: Option<bool>,

    // ... existing optional fields
}
```

### Phase 3: Frontend Adjustments (1-2 hours)

**If Rust uses camelCase mutations instead of snake_case:**

Update mutation names in `src/lib/graphql/tasks-operations.ts`:
```typescript
// If Rust uses createTask instead of create_task:
export const CREATE_TASK = gql`
  mutation CreateTask($input: CreateTaskInput!) {
    createTask(input: $input) {  # Change from create_task
      id
      title
    }
  }
`;
```

**Update field references:**
```typescript
// Find and replace in all files:
// task.creatorId → task.createdBy (if keeping Rust naming)
// OR ensure Rust exposes createdBy as creatorId via @graphql(name = "creatorId")
```

### Phase 4: Integration Testing (2 hours)

1. Start Rust GraphQL server
2. Run schema introspection to verify changes
3. Test each frontend operation:
   - Task creation with all fields
   - Task filtering by status, priority, assignee
   - Task sorting by dueDate
   - Task updates with taskTypeId
4. Check browser console for GraphQL errors
5. Verify data loads correctly in UI

### Phase 5: Remaining File Migration (4-8 hours)

Once schema alignment confirmed, continue migrating the other 37 frontend files using the verified patterns.

---

## Schema Verification Commands

### Verify Tasks Query Parameters
```bash
curl -X POST http://localhost:4000/graphql -H "Content-Type: application/json" \
  -d '{"query":"{ __type(name: \"QueryRoot\") { fields(includeDeprecated: false) { name args { name type { name kind ofType { name } } } } } }"}' \
  | jq '.data.__type.fields[] | select(.name == "tasks")'
```

### Verify Task Type Fields
```bash
curl -X POST http://localhost:4000/graphql -H "Content-Type: application/json" \
  -d '{"query":"{ __type(name: \"Task\") { fields { name type { name kind ofType { name } } } } }"}' \
  | jq '.data.__type.fields[] | {name, type: .type.name}'
```

### Verify CreateTaskInput Fields
```bash
curl -X POST http://localhost:4000/graphql -H "Content-Type: application/json" \
  -d '{"query":"{ __type(name: \"CreateTaskInput\") { inputFields { name type { name kind ofType { name } } } } }"}' \
  | jq '.data.__type.inputFields[]'
```

### Verify UpdateTaskInput Fields
```bash
curl -X POST http://localhost:4000/graphql -H "Content-Type: application/json" \
  -d '{"query":"{ __type(name: \"UpdateTaskInput\") { inputFields { name type { name kind ofType { name } } } } }"}' \
  | jq '.data.__type.inputFields[]'
```

### Verify Mutation Names
```bash
curl -X POST http://localhost:4000/graphql -H "Content-Type: application/json" \
  -d '{"query":"{ __schema { mutationType { fields { name args { name type { name } } } } } }"}' \
  | jq '.data.__schema.mutationType.fields[] | select(.name | test("task|Task"; "i"))'
```

---

## Next Steps

1. **[USER DECISION REQUIRED]** Choose resolution strategy:
   - **Option A:** Update Rust schema to match frontend expectations (recommended)
   - **Option B:** Continue updating frontend to work with limited Rust schema
   - **Option C:** Hybrid approach with minimal changes to both

2. **[IMMEDIATE ACTION]** Run database schema check to see if missing fields exist in DB

3. **[PENDING]** Complete introspection of UpdateTaskInput and remaining queries

4. **[PENDING]** Once schema aligned, continue migrating remaining 37 frontend files

---

---

## DATABASE VERIFICATION RESULTS

**Database Connection:** `postgresql://postgres:postgres123@localhost:5433/hr_system`
**Migration File:** `db/migrations/20251010_002_tasks_system.sql`

### ✅ Columns That EXIST in Database

```sql
CREATE TABLE hr_public.tasks (
  id UUID PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  task_type_id UUID,  -- ✅ EXISTS!
  status VARCHAR(50) NOT NULL DEFAULT 'todo',
  priority VARCHAR(20) DEFAULT 'medium',
  due_date TIMESTAMPTZ,
  estimated_hours DECIMAL(5,2),
  actual_hours DECIMAL(5,2),
  created_by UUID NOT NULL,  -- ⚠️ Named created_by, not creatorId
  department_id UUID,
  tags TEXT[],
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

### ❌ Columns That DO NOT EXIST in Database

1. **`requires_manual_reassignment`** - Not in database, needs migration to add
2. **`assignee_id`** - Not a direct column! Uses junction table instead (see below)

### 🔴 CRITICAL: Task Assignment Architecture Difference

**Frontend Expects (One-to-One):**
```typescript
interface Task {
  id: string;
  assigneeId?: string;  // Single assignee
  assignee?: User;       // Single user object
}
```

**Database Implements (Many-to-Many):**
```sql
-- Separate junction table for multiple assignees
CREATE TABLE hr_public.task_assignees (
  task_id UUID NOT NULL REFERENCES hr_public.tasks(id),
  user_id UUID NOT NULL REFERENCES hr_public.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by UUID REFERENCES hr_public.users(id),
  PRIMARY KEY (task_id, user_id)
);
```

**Impact:** This is a **fundamental architectural mismatch**. The database supports multiple assignees per task, but the frontend assumes only one assignee.

**Resolution Options:**
1. **Option A:** Add `assignee_id` column to tasks table for primary assignee, keep task_assignees for additional assignees
2. **Option B:** Update frontend to support multiple assignees (breaking change, requires UI redesign)
3. **Option C:** Add Rust GraphQL resolver that returns the "first" assignee from task_assignees as `assigneeId`

### Database Schema Summary

| Column | DB Status | Frontend Expects | Rust GraphQL | Gap? |
|--------|-----------|------------------|--------------|------|
| `id` | ✅ EXISTS | `id` | `id` | ✅ Aligned |
| `title` | ✅ EXISTS | `title` | `title` | ✅ Aligned |
| `task_type_id` | ✅ EXISTS | `taskTypeId` | ❌ NOT EXPOSED | 🔴 Rust schema gap |
| `status` | ✅ EXISTS | `status` | `status` | ✅ Aligned |
| `priority` | ✅ EXISTS | `priority` | `priority` | ✅ Aligned |
| `created_by` | ✅ EXISTS | `creatorId` | `createdBy` | 🟡 Name mismatch |
| `assignee_id` | ❌ N/A (junction table) | `assigneeId` | `assigneeId` | 🔴 Architecture gap |
| `requires_manual_reassignment` | ❌ MISSING | `requiresManualReassignment` | ❌ NOT EXPOSED | 🔴 DB + Rust gap |
| `due_date` | ✅ EXISTS | `dueDate` | `dueDate` | ✅ Aligned |
| `department_id` | ✅ EXISTS | `departmentId` | `departmentId` | ✅ Aligned |

### Updated Recommendations

**Phase 1: Database Migration (REQUIRED)**
```sql
-- Add missing column
ALTER TABLE hr_public.tasks
ADD COLUMN requires_manual_reassignment BOOLEAN DEFAULT false;

-- Add primary assignee column (Option A for assignment architecture)
ALTER TABLE hr_public.tasks
ADD COLUMN assignee_id UUID REFERENCES hr_public.users(id);

-- Create index
CREATE INDEX idx_tasks_assignee ON hr_public.tasks(assignee_id);

-- Migrate existing data from task_assignees to assignee_id
-- (Take first assignee as primary, keep rest in task_assignees)
UPDATE hr_public.tasks t
SET assignee_id = (
  SELECT user_id
  FROM hr_public.task_assignees
  WHERE task_id = t.id
  ORDER BY assigned_at
  LIMIT 1
);
```

**Phase 2: Rust Schema Updates**
```rust
#[derive(SimpleObject)]
pub struct Task {
    pub id: Uuid,
    pub title: String,
    pub task_type_id: Option<Uuid>,  // ADD THIS - expose task_type_id
    pub requires_manual_reassignment: Option<bool>,  // ADD THIS
    pub assignee_id: Option<Uuid>,  // ADD THIS - from new column

    #[graphql(name = "creatorId")]  // Alias for frontend compatibility
    pub created_by: Uuid,
}
```

**Phase 3: Frontend Migration**
- Continue with remaining 37 files after backend changes deployed
- Update references from `creatorId` to `createdBy` or rely on alias

---

**Status:** 🔴 BLOCKED - Need database migration + Rust schema updates before continuing frontend migration

**Generated:** 2025-10-14
**Last Updated:** 2025-10-14 (Database verification completed)
