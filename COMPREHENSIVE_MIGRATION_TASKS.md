# Comprehensive PostGraphile to Rust Migration Task List

**Created**: October 20, 2025
**Status**: 🔄 **ACTIVE MIGRATION IN PROGRESS**
**Methodology**: Idiomatic, Production-Ready, Test-Driven

---

## 📊 Executive Summary

### Current State
- **Backend**: Rust GraphQL with SeaORM - **DUAL PATTERN SUPPORT**
  - ✅ PostGraphile-compatible patterns (for gradual migration)
  - ✅ Rust idiomatic patterns (target state)
  - ✅ 60 models with GraphQL resolvers
- **Frontend**: Mix of PostGraphile and Rust patterns
  - **24 operation files** need migration
  - **~50 route files** need updates
  - **47 components** need updates

### Migration Strategy
**GRADUAL TRANSITION**: Backend supports BOTH patterns, allowing incremental frontend migration without breaking changes.

**PostGraphile Pattern**:
```graphql
query {
  allEvents { nodes { id } }
  event(nodeId: $id) { userByOrganizerId { name } }
}
```

**Rust Idiomatic Pattern** (TARGET):
```graphql
query {
  events(limit: 100) { id }
  event(id: $id) { organizer { name } }
}
```

---

## 🎯 Phase 0: Foundation & Planning (COMPLETE THIS FIRST)

### Task 0.1: Backend Schema Documentation
**Priority**: P0 - CRITICAL
**Estimated Time**: 4 hours
**Assignee**: TBD

**Description**: Document all available Rust backend queries, mutations, and resolvers to understand what's available for frontend migration.

**Subtasks**:
- [ ] 0.1.1: Generate GraphQL schema documentation from Rust backend
  ```bash
  cd graphql-rust-server
  cargo run --bin generate-schema > ../docs/rust-graphql-schema.graphql
  ```

- [ ] 0.1.2: Document all query resolvers with parameters
  - Create `BACKEND_API_REFERENCE.md`
  - List all queries: `users`, `events`, `tasks`, `departments`, etc.
  - Document parameters for each query
  - Document relationship resolvers

- [ ] 0.1.3: Document all mutation patterns
  - List create mutations
  - List update mutations
  - List delete mutations
  - Document input types

- [ ] 0.1.4: Identify PostGraphile-compatible aliases
  - List all `*_by_*` relationship fields
  - List all connection types with `.nodes`
  - Document which fields have both patterns

**Acceptance Criteria**:
- [ ] Complete GraphQL schema file generated
- [ ] API reference document created
- [ ] All queries documented with examples
- [ ] Migration patterns documented

**Blocks**: All other tasks depend on this

---

### Task 0.2: Create Migration Pattern Guide
**Priority**: P0 - CRITICAL
**Estimated Time**: 3 hours

**Description**: Create a reference guide showing how to migrate each PostGraphile pattern to Rust idiomatic pattern.

**Subtasks**:
- [ ] 0.2.1: Document query pattern migrations
  ```markdown
  ## Query Patterns

  ### Pattern 1: All* Queries
  PostGraphile: `allEvents(first: 20) { nodes { id } }`
  Rust: `events(limit: 20) { id }`

  ### Pattern 2: Filter Patterns
  PostGraphile: `users(filter: { id: { equalTo: $id } })`
  Rust: `users(userId: $id, limit: 100)`
  ```

- [ ] 0.2.2: Document relationship pattern migrations
  ```markdown
  ### Relationship Patterns

  PostGraphile: `event { userByOrganizerId { name } }`
  Rust: `event { organizer { name } }`
  ```

- [ ] 0.2.3: Document mutation pattern migrations

- [ ] 0.2.4: Create code examples for each pattern

**Deliverables**:
- `MIGRATION_PATTERNS.md` with before/after examples
- Code snippets for common migrations

---

### Task 0.3: Setup Testing Infrastructure
**Priority**: P0 - CRITICAL
**Estimated Time**: 4 hours

**Description**: Ensure comprehensive testing infrastructure is in place for migration validation.

**Subtasks**:
- [ ] 0.3.1: Configure GraphQL testing with migrated schemas
  - Update test GraphQL client configuration
  - Add schema validation tests

- [ ] 0.3.2: Create migration smoke tests
  - Test basic queries work with both patterns
  - Test mutations work with new patterns

- [ ] 0.3.3: Setup E2E test suite for critical paths
  - Events system E2E tests
  - Tasks system E2E tests
  - Employee management E2E tests

- [ ] 0.3.4: Create migration validation checklist
  - Automated checks for PostGraphile patterns
  - Linting rules for deprecated patterns

**Acceptance Criteria**:
- [ ] All existing tests pass
- [ ] Migration smoke tests created
- [ ] E2E test coverage >80% for critical paths

---

## 🎯 Phase 1: GraphQL Operations Migration

### HIGH PRIORITY Operations

---

#### Task 1.1: Migrate events-operations.ts
**Priority**: P0 - CRITICAL (Blocks 15+ pages)
**Estimated Time**: 6 hours
**File**: `/src/lib/graphql/events-operations.ts`
**Lines of Code**: ~800

**Current Issues**:
- ❌ Uses `nodeId` field (PostGraphile)
- ❌ Uses `.nodes` access in 8+ places
- ❌ Uses `userByOrganizerId` (PostGraphile alias)
- ❌ Uses `eventAttendeesByEventId` (PostGraphile alias)
- ❌ Uses `allEvents()` query pattern

**Migration Steps**:

**Step 1.1.1**: Update GET_ALL_EVENTS query
```typescript
// BEFORE
export const GET_ALL_EVENTS = gql`
  query GetAllEvents($limit: Int, $offset: Int, $upcomingOnly: Boolean) {
    events(limit: $limit, offset: $offset, upcomingOnly: $upcomingOnly) {
      id
      nodeId  // ❌ Remove
      title
      userByOrganizerId {  // ❌ Change to organizer
        id
        displayName
      }
      eventAttendeesByEventId {  // ❌ Change to attendees
        nodes {  // ❌ Remove .nodes
          id
          employeeId
        }
      }
    }
  }
`;

// AFTER (Rust idiomatic)
export const GET_ALL_EVENTS = gql`
  query GetAllEvents($limit: Int, $offset: Int, $upcomingOnly: Boolean) {
    events(limit: $limit, offset: $offset, upcomingOnly: $upcomingOnly) {
      id
      title
      organizer {  // ✅ Idiomatic
        id
        displayName
      }
      attendees(limit: 100) {  // ✅ Direct array
        id
        employeeId
      }
    }
  }
`;
```

**Step 1.1.2**: Update all query usages
- Find all `.nodes` access: `data?.allEvents?.nodes` → `data?.events`
- Find all `nodeId` usage and remove
- Update relationship field names

**Step 1.1.3**: Update GET_EVENT_BY_ID query
- Same pattern changes as above

**Step 1.1.4**: Update GET_USER_EVENTS query
- Remove client-side filtering (use backend `userId` parameter once available)

**Step 1.1.5**: Update all mutation operations
- Change `createEvent(input: { event: {...} })` → `createEvent(input: {...})`
- Change `updateEventByNodeId()` → `updateEvent(id, input)`
- Change `deleteEventByNodeId()` → `deleteEvent(id)`

**Step 1.1.6**: Update TypeScript interfaces
```typescript
// Update all interfaces to match new schema
interface EventQueryResult {
  events: Event[];  // Not events: { nodes: Event[] }
}
```

**Testing Checklist**:
- [ ] All queries return data correctly
- [ ] Attendee lists load properly
- [ ] Organizer information displays
- [ ] Event creation works
- [ ] Event updates work
- [ ] Event deletion works
- [ ] No `.nodes` access remains
- [ ] No `nodeId` references remain

**Backend Dependencies**:
- ✅ `events(upcomingOnly, limit, offset)` - EXISTS
- ✅ `event(id)` - EXISTS
- ✅ Event.organizer resolver - EXISTS
- ✅ Event.attendees resolver - EXISTS
- ❌ MISSING: `events(userId)` - Need to add

**Blocks**:
- Task 2.1: Events list page
- Task 2.2: Event detail page
- Task 2.3: Event edit page
- Task 2.4: Event create page
- Task 2.5: Event settings page

---

#### Task 1.2: Migrate tasks-operations.ts
**Priority**: P0 - CRITICAL (Blocks 10+ pages)
**Estimated Time**: 6 hours
**File**: `/src/lib/graphql/tasks-operations.ts`
**Lines of Code**: ~900

**Current Issues**:
- ✅ Already uses idiomatic queries (good start!)
- ❌ May still have `.nodes` in some queries
- ❌ May use PostGraphile mutation patterns
- ❌ Uses `filter: TaskFilter` (PostGraphile-style)

**Migration Steps**:

**Step 1.2.1**: Audit current state
- Check all queries for `.nodes` access
- Check all mutations for `ByNodeId` patterns
- Check filter usage

**Step 1.2.2**: Update GET_ALL_TASKS query
```typescript
// BEFORE
export const GET_ALL_TASKS = gql`
  query GetAllTasks($limit: Int, $offset: Int, $filter: TaskFilter) {
    tasks(limit: $limit, offset: $offset, filter: $filter) {
      // ...
    }
  }
`;

// AFTER
export const GET_ALL_TASKS = gql`
  query GetAllTasks(
    $limit: Int
    $offset: Int
    $assigneeId: UUID
    $status: String
    $priority: String
  ) {
    tasks(
      limit: $limit
      offset: $offset
      assigneeId: $assigneeId
      status: $status
      priority: $priority
    ) {
      // ...
    }
  }
`;
```

**Step 1.2.3**: Update mutations
- Check and update `createTask`, `updateTask`, `deleteTask`
- Remove `ByNodeId` patterns if present

**Step 1.2.4**: Update subtask queries
- Ensure subtask loading uses idiomatic patterns

**Step 1.2.5**: Update dependency queries
- Ensure task dependencies use idiomatic patterns

**Testing Checklist**:
- [ ] Task list loads correctly
- [ ] Task filtering works (assignee, status, priority)
- [ ] Task creation works
- [ ] Task updates work
- [ ] Subtasks display correctly
- [ ] Task dependencies work
- [ ] No PostGraphile patterns remain

**Backend Dependencies**:
- ✅ `tasks(assigneeId, limit, offset)` - EXISTS
- ✅ `task(id)` - EXISTS
- ❌ MISSING: `tasks(status, priority)` - Need to add
- ❌ MISSING: Task subtasks resolver - Need to add
- ❌ MISSING: Task dependencies resolver - Need to add

**Blocks**:
- Task 2.6: Tasks list page
- Task 2.7: Task detail page
- Task 2.8: Task edit page
- Task 2.9: My tasks page
- Task 2.10: Team tasks page

---

#### Task 1.3: Migrate employee-operations.ts
**Priority**: P1 - HIGH
**Estimated Time**: 4 hours
**File**: `/src/lib/graphql/employee-operations.ts`

**Current Issues**:
- ❌ Uses `.nodes` access
- ❌ Uses `allEmployees()` pattern
- ❌ May use PostGraphile filter patterns

**Migration Steps**:

**Step 1.3.1**: Update to use `users()` query
```typescript
// BEFORE
const GET_ALL_EMPLOYEES = gql`
  query {
    allEmployees(first: 100) {
      nodes {
        id
        firstName
        lastName
      }
    }
  }
`;

// AFTER
const GET_ALL_EMPLOYEES = gql`
  query {
    users(limit: 100) {
      id
      firstName
      lastName
    }
  }
`;
```

**Step 1.3.2**: Remove all `.nodes` access

**Step 1.3.3**: Update employee mutations

**Testing Checklist**:
- [ ] Employee lists load
- [ ] Employee search works
- [ ] Employee creation works
- [ ] No `.nodes` access

---

#### Task 1.4: Migrate department-operations.ts
**Priority**: P1 - HIGH
**Estimated Time**: 3 hours
**File**: `/src/lib/graphql/department-operations.ts`

**Migration Steps**:
- Same pattern as Task 1.3
- Change `allDepartments()` → `departments()`
- Remove `.nodes` access

---

#### Task 1.5: Migrate leave-management-operations.ts
**Priority**: P1 - HIGH
**Estimated Time**: 4 hours
**File**: `/src/lib/graphql/leave-management-operations.ts`

**Migration Steps**:

**Step 1.5.1**: Update leave request queries
- Use `leaveRequests()` with direct arrays
- Remove `.nodes`

**Step 1.5.2**: Update leave balance queries
- Already migrated in previous session ✅
- Verify no issues remain

**Step 1.5.3**: Update leave type queries
- Already fixed (removed `icon` field) ✅
- Verify usage across file

---

### MEDIUM PRIORITY Operations

---

#### Task 1.6: Migrate notifications-operations.ts
**Priority**: P2 - MEDIUM
**Estimated Time**: 4 hours
**File**: `/src/lib/graphql/notifications-operations.ts`

**Backend Dependencies**:
- ❌ MISSING: `notifications(userId, unreadOnly, limit)`
- ❌ MISSING: `markNotificationAsRead` mutation

**Migration Steps**:
- Wait for backend implementation
- Then apply standard migration patterns

---

#### Task 1.7: Migrate activity-logs-operations.ts
**Priority**: P2 - MEDIUM
**Estimated Time**: 3 hours
**File**: `/src/lib/graphql/activity-logs-operations.ts`

**Backend Dependencies**:
- ✅ `activityLogs(userId, limit)` - EXISTS
- ❌ MISSING: Advanced filtering (date range, action type)

---

#### Task 1.8: Migrate performance-management-operations.ts
**Priority**: P2 - MEDIUM
**Estimated Time**: 5 hours
**File**: `/src/lib/graphql/performance-management-operations.ts`

**Backend Dependencies**:
- ✅ `performanceReviews(limit)` - EXISTS
- ❌ MISSING: `performanceReviews(employeeId, reviewerId)`
- ❌ MISSING: Review cycle queries
- ❌ MISSING: Feedback queries

---

#### Task 1.9: Migrate goals-okrs-operations.ts
**Priority**: P2 - MEDIUM
**Estimated Time**: 4 hours
**File**: `/src/lib/graphql/goals-okrs-operations.ts`

**Backend Dependencies**:
- ✅ `employeeGoals(employeeId, limit)` - EXISTS
- ❌ MISSING: OKR-specific queries

---

#### Task 1.10: Migrate team-management-operations.ts
**Priority**: P2 - MEDIUM
**Estimated Time**: 3 hours
**File**: `/src/lib/graphql/team-management-operations.ts`

---

#### Task 1.11: Migrate reports-operations.ts
**Priority**: P3 - LOWER
**Estimated Time**: 3 hours
**File**: `/src/lib/graphql/reports-operations.ts`

---

#### Task 1.12: Migrate team-reports-operations.ts
**Priority**: P3 - LOWER
**Estimated Time**: 3 hours
**File**: `/src/lib/graphql/team-reports-operations.ts`

---

#### Task 1.13: Migrate dashboard-operations.ts
**Priority**: P2 - MEDIUM (Used by main dashboard)
**Estimated Time**: 3 hours
**File**: `/src/lib/graphql/dashboard-operations.ts`

**Note**: Main dashboard already migrated, this file may be legacy

---

#### Task 1.14: Migrate auth-operations.ts
**Priority**: P1 - HIGH
**Estimated Time**: 2 hours
**File**: `/src/lib/graphql/auth-operations.ts`

**Note**: Verify authentication flow uses session-based auth correctly

---

#### Task 1.15: Migrate settings-operations.ts
**Priority**: P3 - LOWER
**Estimated Time**: 2 hours
**File**: `/src/lib/graphql/settings-operations.ts`

---

#### Task 1.16: Remove postgraphile-operations.ts
**Priority**: P3 - CLEANUP
**Estimated Time**: 1 hour
**File**: `/src/lib/graphql/postgraphile-operations.ts`

**Action**: DELETE this file after confirming no imports remain

---

## 🎯 Phase 2: Route Server Files Migration

### Events System Routes

---

#### Task 2.1: Migrate events list page
**Priority**: P0 - CRITICAL
**Estimated Time**: 3 hours
**File**: `/src/routes/dashboard/events/+page.server.ts`
**Depends On**: Task 1.1 (events-operations.ts)

**Current Issues**:
- Uses migrated operations file
- May use `.nodes` access locally
- May do client-side filtering that should be server-side

**Migration Steps**:

**Step 2.1.1**: Update query usage
```typescript
// BEFORE
const { data } = await client.query(GET_ALL_EVENTS, { limit: 50 });
const events = data?.allEvents?.nodes || [];

// AFTER
const { data } = await client.query(GET_ALL_EVENTS, { limit: 50 });
const events = data?.events || [];
```

**Step 2.1.2**: Update data processing
- Remove any client-side filtering that should be server-side
- Use backend parameters for filtering

**Step 2.1.3**: Update TypeScript types
- Update interfaces to match new schema

**Testing Checklist**:
- [ ] Page loads without errors
- [ ] Events display correctly
- [ ] Pagination works
- [ ] Filtering works
- [ ] No console errors

---

#### Task 2.2: Migrate event detail page
**Priority**: P0 - CRITICAL
**Estimated Time**: 3 hours
**File**: `/src/routes/dashboard/events/[id]/+page.server.ts`
**Depends On**: Task 1.1

**Migration Steps**:
- Update event query usage
- Update attendee display (remove `.nodes`)
- Update organizer display

---

#### Task 2.3: Migrate event edit page
**Priority**: P0 - CRITICAL
**Estimated Time**: 3 hours
**File**: `/src/routes/dashboard/events/[id]/edit/+page.server.ts`
**Depends On**: Task 1.1

**Migration Steps**:
- Update query usage
- Update form mutations
- Test update flow

---

#### Task 2.4: Migrate event create page
**Priority**: P0 - CRITICAL
**Estimated Time**: 2 hours
**File**: `/src/routes/dashboard/events/create/+page.server.ts`
**Depends On**: Task 1.1

---

#### Task 2.5: Migrate event settings page
**Priority**: P1 - HIGH
**Estimated Time**: 2 hours
**File**: `/src/routes/dashboard/events/settings/+page.server.ts`
**Depends On**: Task 1.1

---

### Tasks System Routes

---

#### Task 2.6: Migrate tasks list page
**Priority**: P0 - CRITICAL
**Estimated Time**: 3 hours
**File**: `/src/routes/dashboard/tasks/+page.server.ts`
**Depends On**: Task 1.2

---

#### Task 2.7: Migrate task detail page
**Priority**: P0 - CRITICAL
**Estimated Time**: 3 hours
**File**: `/src/routes/dashboard/tasks/[id]/+page.server.ts`
**Depends On**: Task 1.2

**Special Considerations**:
- Subtask loading
- Dependency display
- Audit log display

---

#### Task 2.8: Migrate task edit page
**Priority**: P0 - CRITICAL
**Estimated Time**: 3 hours
**File**: `/src/routes/dashboard/tasks/[id]/edit/+page.server.ts`
**Depends On**: Task 1.2

---

#### Task 2.9: Migrate my tasks page
**Priority**: P0 - CRITICAL
**Estimated Time**: 2 hours
**File**: `/src/routes/dashboard/tasks/my-tasks/+page.server.ts`
**Depends On**: Task 1.2

---

#### Task 2.10: Migrate team tasks page
**Priority**: P1 - HIGH
**Estimated Time**: 2 hours
**File**: `/src/routes/dashboard/tasks/team-tasks/+page.server.ts`
**Depends On**: Task 1.2

---

#### Task 2.11: Migrate department tasks page
**Priority**: P1 - HIGH
**Estimated Time**: 2 hours
**File**: `/src/routes/dashboard/tasks/department/+page.server.ts`
**Depends On**: Task 1.2

---

#### Task 2.12: Migrate task create pages
**Priority**: P1 - HIGH
**Estimated Time**: 2 hours each
**Files**:
- `/src/routes/dashboard/tasks/create/+page.server.ts`
- `/src/routes/dashboard/tasks/new/+page.server.ts`
**Depends On**: Task 1.2

---

### Performance Reviews Routes

---

#### Task 2.13: Migrate reviews list page
**Priority**: P1 - HIGH
**Estimated Time**: 3 hours
**File**: `/src/routes/dashboard/reviews/+page.server.ts`
**Depends On**: Task 1.8

---

#### Task 2.14: Migrate review detail page
**Priority**: P1 - HIGH
**Estimated Time**: 3 hours
**File**: `/src/routes/dashboard/reviews/[id]/+page.server.ts`
**Depends On**: Task 1.8

---

#### Task 2.15: Migrate create review page
**Priority**: P1 - HIGH
**Estimated Time**: 3 hours
**File**: `/src/routes/dashboard/reviews/create/+page.server.ts`
**Depends On**: Task 1.8

---

### Admin Pages

---

#### Task 2.16: Migrate admin audit page
**Priority**: P2 - MEDIUM
**Estimated Time**: 3 hours
**File**: `/src/routes/dashboard/admin/audit/+page.server.ts`
**Depends On**: Task 1.7

---

#### Task 2.17: Migrate admin analytics page
**Priority**: P2 - MEDIUM
**Estimated Time**: 4 hours
**File**: `/src/routes/dashboard/admin/analytics/+page.server.ts`

**Special Considerations**:
- Complex aggregation queries
- May need backend analytics queries

---

#### Task 2.18: Migrate admin compliance page
**Priority**: P2 - MEDIUM
**Estimated Time**: 3 hours
**File**: `/src/routes/dashboard/admin/compliance/+page.server.ts`

---

#### Task 2.19: Migrate admin settings page
**Priority**: P2 - MEDIUM
**Estimated Time**: 3 hours
**File**: `/src/routes/dashboard/admin/settings/+page.server.ts`

---

#### Task 2.20: Migrate admin users page
**Priority**: P2 - MEDIUM
**Estimated Time**: 3 hours
**File**: `/src/routes/dashboard/admin/users/+page.server.ts`
**Depends On**: Task 1.3

---

### Remaining Route Files (P2-P3)

**Estimate**: 40+ files remaining, 2-3 hours each = 80-120 hours

**Files Include**:
- Management pages (goals, leave approvals, reports, reviews)
- Department pages (list, detail, edit)
- Team pages
- User profile pages (profile, edit, tasks, settings, attendance, performance, leave)
- Document pages (list, detail, upload, audit)
- Activity pages (list, logs, bulk-rollback, rollback-requests)
- Employee pages (new)
- Notification pages

**Common Migration Pattern** for all:
1. Update imports to use migrated operation files
2. Remove `.nodes` access
3. Update mutations to use new patterns
4. Update TypeScript types
5. Test page loading and functionality

---

## 🎯 Phase 3: Svelte Components Migration

### Event Components

---

#### Task 3.1: Migrate EventCalendar.svelte
**Priority**: P0 - CRITICAL
**Estimated Time**: 5 hours
**File**: `/src/lib/components/events/EventCalendar.svelte`
**Complexity**: HIGH (FullCalendar integration)

**Current Issues**:
- Uses `.nodes` to access events
- May use PostGraphile field names

**Migration Steps**:

**Step 3.1.1**: Update props interface
```typescript
// BEFORE
interface Props {
  events: { nodes: Event[] };
}

// AFTER
interface Props {
  events: Event[];
}
```

**Step 3.1.2**: Update event processing
```typescript
// BEFORE
const calendarEvents = events.nodes.map(event => ({
  id: event.id,
  title: event.title,
  start: event.startTime,
  organizer: event.userByOrganizerId?.displayName
}));

// AFTER
const calendarEvents = events.map(event => ({
  id: event.id,
  title: event.title,
  start: event.startTime,
  organizer: event.organizer?.displayName
}));
```

**Step 3.1.3**: Update FullCalendar integration
- Ensure event rendering works
- Ensure click handlers work
- Test drag-and-drop if enabled

**Testing Checklist**:
- [ ] Calendar renders
- [ ] Events display correctly
- [ ] Click events work
- [ ] Month/week/day views work
- [ ] No console errors

---

#### Task 3.2: Migrate EventDetailsDialog.svelte
**Priority**: P0 - CRITICAL
**Estimated Time**: 3 hours
**File**: `/src/lib/components/events/EventDetailsDialog.svelte`

---

#### Task 3.3: Migrate EventCard.svelte
**Priority**: P1 - HIGH
**Estimated Time**: 2 hours
**File**: `/src/lib/components/events/EventCard.svelte`

---

### Task Components

---

#### Task 3.4: Migrate TaskList.svelte
**Priority**: P0 - CRITICAL
**Estimated Time**: 3 hours
**File**: `/src/lib/components/tasks/TaskList.svelte`

**Migration Steps**:
```typescript
// BEFORE
$: tasks = data?.allTasks?.nodes || [];

// AFTER
$: tasks = data?.tasks || [];
```

---

#### Task 3.5: Migrate TaskCard.svelte
**Priority**: P1 - HIGH
**Estimated Time**: 2 hours
**File**: `/src/lib/components/tasks/TaskCard.svelte`

---

#### Task 3.6: Migrate TaskForm.svelte
**Priority**: P0 - CRITICAL
**Estimated Time**: 4 hours
**File**: `/src/lib/components/tasks/TaskForm.svelte`

**Special Considerations**:
- Form submission mutations
- Input validation
- Error handling

---

#### Task 3.7: Migrate SubtaskProgress.svelte
**Priority**: P1 - HIGH
**Estimated Time**: 3 hours
**File**: `/src/lib/components/tasks/SubtaskProgress.svelte`

---

#### Task 3.8: Migrate TaskDependencies.svelte
**Priority**: P1 - HIGH
**Estimated Time**: 3 hours
**File**: `/src/lib/components/tasks/TaskDependencies.svelte`

---

#### Task 3.9: Migrate TaskHierarchy.svelte
**Priority**: P1 - HIGH
**Estimated Time**: 3 hours
**File**: `/src/lib/components/tasks/TaskHierarchy.svelte`

---

### Employee & Organization Components

---

#### Task 3.10: Migrate EmployeeList components
**Priority**: P2 - MEDIUM
**Estimated Time**: 3 hours
**Files**:
- `/src/lib/components/employees/EmployeeList.svelte`
- `/src/lib/components/employees/EmployeeListShadcn.svelte`

---

#### Task 3.11: Migrate organization chart components
**Priority**: P2 - MEDIUM
**Estimated Time**: 6 hours (4 components)
**Files**:
- `/src/lib/components/org-tree-chart.svelte`
- `/src/lib/components/simple-org-map.svelte`
- `/src/lib/components/full-org-map.svelte`
- `/src/lib/components/draggable-org-map.svelte`

**Special Considerations**:
- Complex data transformations
- D3.js or other charting library integration
- Performance optimizations

---

### Page-Level Components

---

#### Task 3.12: Migrate route page components
**Priority**: P2 - MEDIUM
**Estimated Time**: 15 hours (multiple files)
**Files Include**:
- `/src/routes/dashboard/events/+page.svelte`
- `/src/routes/dashboard/events/[id]/+page.svelte`
- `/src/routes/dashboard/tasks/[id]/+page.svelte`
- `/src/routes/dashboard/admin/users/+page.svelte`
- And more...

**Common Pattern**:
```svelte
<!-- BEFORE -->
<script>
  export let data;
  $: events = data.events?.nodes || [];
</script>

<!-- AFTER -->
<script>
  export let data;
  $: events = data.events || [];
</script>
```

---

## 🎯 Phase 4: Server Utilities Migration

### Task Management Utilities

---

#### Task 4.1: Migrate task-reminder-scheduler.ts
**Priority**: P2 - MEDIUM
**Estimated Time**: 3 hours
**File**: `/src/lib/server/tasks/task-reminder-scheduler.ts`

**Current Issues**:
- Uses `allTasks()` pattern
- Uses `.nodes` access
- Uses filter patterns

---

#### Task 4.2: Migrate subtask-progress.ts
**Priority**: P2 - MEDIUM
**Estimated Time**: 2 hours
**File**: `/src/lib/server/tasks/subtask-progress.ts`

---

#### Task 4.3: Migrate resource-validation.ts
**Priority**: P2 - MEDIUM
**Estimated Time**: 2 hours
**File**: `/src/lib/server/tasks/resource-validation.ts`

---

#### Task 4.4: Migrate organizational-change-handlers.ts
**Priority**: P2 - MEDIUM
**Estimated Time**: 3 hours
**File**: `/src/lib/server/tasks/organizational-change-handlers.ts`

---

#### Task 4.5: Migrate task-audit-service.ts
**Priority**: P2 - MEDIUM
**Estimated Time**: 2 hours
**File**: `/src/lib/server/audit/task-audit-service.ts`

---

### General Utilities

---

#### Task 4.6: Migrate audit-logger.ts
**Priority**: P2 - MEDIUM
**Estimated Time**: 3 hours
**File**: `/src/lib/server/audit-logger.ts`

---

#### Task 4.7: Migrate permission-refresh.ts
**Priority**: P2 - MEDIUM
**Estimated Time**: 2 hours
**File**: `/src/lib/server/permission-refresh.ts`

---

### GraphQL Performance Tools

---

#### Task 4.8: Migrate tasks-query-optimizer.ts
**Priority**: P3 - LOWER
**Estimated Time**: 2 hours
**File**: `/src/lib/graphql/tasks-query-optimizer.ts`

**Note**: May need significant rework for Rust backend

---

#### Task 4.9: Migrate query-complexity-analyzer.ts
**Priority**: P3 - LOWER
**Estimated Time**: 3 hours
**File**: `/src/lib/graphql/query-complexity-analyzer.ts`

---

#### Task 4.10: Migrate n-plus-one-detector.ts
**Priority**: P3 - LOWER
**Estimated Time**: 3 hours
**File**: `/src/lib/graphql/n-plus-one-detector.ts`

---

#### Task 4.11: Migrate performance-monitor.ts
**Priority**: P3 - LOWER
**Estimated Time**: 2 hours
**File**: `/src/lib/graphql/performance-monitor.ts`

---

### Utility Functions

---

#### Task 4.12: Migrate utility files
**Priority**: P3 - LOWER
**Estimated Time**: 4 hours (3 files)
**Files**:
- `/src/lib/utils/events.ts`
- `/src/lib/utils/rbac.ts`
- `/src/lib/utils/reviewValidation.ts`

---

## 🎯 Phase 5: API Routes Migration

---

#### Task 5.1: Migrate notification API
**Priority**: P2 - MEDIUM
**Estimated Time**: 2 hours
**File**: `/src/routes/api/notifications/mark-read/+server.ts`

**Current Issues**:
- Uses `updateByNodeId` pattern

---

#### Task 5.2: Migrate calendar API
**Priority**: P2 - MEDIUM
**Estimated Time**: 3 hours
**File**: `/src/routes/api/calendar/events.ics/+server.ts`

**Current Issues**:
- Uses `allEvents()` pattern
- Uses `.nodes` access

---

## 🎯 Phase 6: Cleanup & Optimization

---

#### Task 6.1: Remove PostGraphile files
**Priority**: P3 - CLEANUP
**Estimated Time**: 2 hours

**Files to Remove**:
- `/src/lib/graphql/postgraphile-operations.ts`
- `/src/lib/graphql/graphql/*` (duplicate directory)
- Any `.bak` files

---

#### Task 6.2: Update generated types
**Priority**: P1 - HIGH
**Estimated Time**: 3 hours

**Steps**:
- Regenerate GraphQL types from Rust schema
- Update all type imports
- Fix type mismatches
- Run TypeScript compiler to verify

---

#### Task 6.3: Lint and format all files
**Priority**: P2 - MEDIUM
**Estimated Time**: 2 hours

**Steps**:
```bash
npm run format
npm run lint
npm run check
```

---

#### Task 6.4: Performance optimization
**Priority**: P2 - MEDIUM
**Estimated Time**: 4 hours

**Tasks**:
- Review query performance
- Add appropriate pagination
- Optimize bundle size
- Add query caching where appropriate

---

## 🎯 Phase 7: Testing & Validation

---

#### Task 7.1: Unit testing
**Priority**: P0 - CRITICAL
**Estimated Time**: 15 hours

**Coverage Requirements**:
- [ ] All operation files >90% coverage
- [ ] All utility functions >90% coverage
- [ ] All mutations tested

---

#### Task 7.2: Integration testing
**Priority**: P0 - CRITICAL
**Estimated Time**: 20 hours

**Test Suites**:
- [ ] Events system end-to-end
- [ ] Tasks system end-to-end
- [ ] Employee management end-to-end
- [ ] Authentication flows
- [ ] RBAC enforcement

---

#### Task 7.3: E2E testing
**Priority**: P0 - CRITICAL
**Estimated Time**: 25 hours

**Critical Paths**:
- [ ] User login → dashboard view
- [ ] Create event → RSVP → view attendees
- [ ] Create task → assign → complete
- [ ] Employee CRUD operations
- [ ] Leave request workflow
- [ ] Performance review workflow

---

#### Task 7.4: Performance testing
**Priority**: P1 - HIGH
**Estimated Time**: 8 hours

**Metrics**:
- Page load times
- Query execution times
- Bundle size
- Memory usage

---

#### Task 7.5: User acceptance testing
**Priority**: P1 - HIGH
**Estimated Time**: 10 hours

**Process**:
- Deploy to staging
- Test critical workflows
- Gather feedback
- Fix issues

---

## 🎯 Phase 8: Backend Enhancements

### Missing Query Implementations

---

#### Task 8.1: Add advanced task filtering
**Priority**: P0 - CRITICAL
**Estimated Time**: 4 hours
**File**: `graphql-rust-server/src/schema/query.rs`

**Add Parameters**:
```rust
async fn tasks(
    &self,
    ctx: &Context<'_>,
    assignee_id: Option<Uuid>,
    status: Option<String>,      // NEW
    priority: Option<String>,    // NEW
    due_before: Option<DateTime<Utc>>,  // NEW
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<task::Model>>
```

---

#### Task 8.2: Add event user filtering
**Priority**: P0 - CRITICAL
**Estimated Time**: 2 hours

**Add Parameters**:
```rust
async fn events(
    &self,
    ctx: &Context<'_>,
    user_id: Option<Uuid>,       // NEW - events user is attending
    upcoming_only: Option<bool>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<event::Model>>
```

---

#### Task 8.3: Add notification queries
**Priority**: P1 - HIGH
**Estimated Time**: 3 hours

**New Queries**:
```rust
async fn notifications(
    &self,
    ctx: &Context<'_>,
    user_id: Option<Uuid>,
    unread_only: Option<bool>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<notification::Model>>
```

---

#### Task 8.4: Add performance review filtering
**Priority**: P1 - HIGH
**Estimated Time**: 3 hours

**New Parameters**:
```rust
async fn performance_reviews(
    &self,
    ctx: &Context<'_>,
    employee_id: Option<Uuid>,   // NEW
    reviewer_id: Option<Uuid>,   // NEW
    status: Option<String>,      // NEW
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<performance_review::Model>>
```

---

#### Task 8.5: Add document queries
**Priority**: P2 - MEDIUM
**Estimated Time**: 4 hours

**New Queries**:
```rust
async fn documents(
    &self,
    ctx: &Context<'_>,
    category: Option<String>,
    employee_id: Option<Uuid>,
    sensitivity_level: Option<String>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<document::Model>>
```

---

#### Task 8.6: Add activity log filtering
**Priority**: P2 - MEDIUM
**Estimated Time**: 3 hours

**New Parameters**:
```rust
async fn activity_logs(
    &self,
    ctx: &Context<'_>,
    user_id: Option<Uuid>,
    action: Option<String>,         // NEW
    resource_type: Option<String>,  // NEW
    date_from: Option<DateTime<Utc>>,  // NEW
    date_to: Option<DateTime<Utc>>,    // NEW
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<activity_log::Model>>
```

---

#### Task 8.7: Add subtask relationship resolver
**Priority**: P1 - HIGH
**Estimated Time**: 3 hours
**File**: `graphql-rust-server/src/models/task.rs`

**Add Resolver**:
```rust
async fn subtasks(&self, ctx: &Context<'_>, limit: Option<i64>) -> GqlResult<Vec<Model>> {
    let db = get_db_from_context(ctx)?;
    let limit = limit.unwrap_or(100).min(1000) as u64;

    let subtasks = Entity::find()
        .filter(Column::ParentTaskId.eq(self.id))
        .filter(Column::DeletedAt.is_null())
        .order_by_desc(Column::CreatedAt)
        .limit(limit)
        .all(&db)
        .await?;

    Ok(subtasks)
}
```

---

#### Task 8.8: Add task dependency resolver
**Priority**: P1 - HIGH
**Estimated Time**: 3 hours

---

## 📊 Summary Statistics

### Total Effort Estimate

| Phase | Tasks | Hours | Days (8h) |
|-------|-------|-------|-----------|
| Phase 0: Foundation | 3 | 11 | 1.4 |
| Phase 1: Operations | 16 | 65 | 8.1 |
| Phase 2: Routes | 50+ | 130 | 16.3 |
| Phase 3: Components | 47 | 80 | 10.0 |
| Phase 4: Utilities | 12 | 30 | 3.8 |
| Phase 5: API Routes | 2 | 5 | 0.6 |
| Phase 6: Cleanup | 4 | 11 | 1.4 |
| Phase 7: Testing | 5 | 78 | 9.8 |
| Phase 8: Backend | 8 | 28 | 3.5 |
| **TOTAL** | **147** | **438** | **54.9** |

### By Priority

| Priority | Tasks | Hours | Percentage |
|----------|-------|-------|------------|
| P0 (Critical) | 32 | 180 | 41% |
| P1 (High) | 45 | 140 | 32% |
| P2 (Medium) | 50 | 85 | 19% |
| P3 (Lower) | 20 | 33 | 8% |

### Timeline

**Recommended Approach**: 2-person team, 11 weeks

- **Weeks 1-2**: Foundation + Critical Operations (P0)
- **Weeks 3-5**: Routes Migration (P0-P1)
- **Weeks 6-7**: Components (P0-P1)
- **Weeks 8-9**: Remaining Operations + Utilities (P1-P2)
- **Week 10**: Backend Enhancements + Testing
- **Week 11**: Final Testing + Deployment

---

## ✅ Success Criteria

### Per Task
- [ ] No PostGraphile patterns remain (`.nodes`, `nodeId`, `*By*`, `all*`)
- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] Data loads correctly
- [ ] Mutations work correctly
- [ ] Performance maintained or improved

### Per Phase
- [ ] All phase tasks completed
- [ ] Integration tests pass
- [ ] No regressions introduced
- [ ] Code review completed
- [ ] Documentation updated

### Overall Project
- [ ] Zero PostGraphile dependencies
- [ ] All features working
- [ ] Performance improved or maintained
- [ ] Test coverage >90%
- [ ] Code quality high (no linting errors)
- [ ] Documentation complete
- [ ] User acceptance testing passed
- [ ] Production deployment successful

---

## 🚨 Risk Management

### High-Risk Areas

1. **Real-time Features**
   - **Risk**: GraphQL subscriptions may need implementation
   - **Mitigation**: Identify subscription needs early, implement in backend first

2. **Complex Filtering**
   - **Risk**: Backend may not support all filtering needed
   - **Mitigation**: Document all filtering requirements, implement backend queries first

3. **Performance**
   - **Risk**: Query performance may degrade with relationship resolvers
   - **Mitigation**: Implement DataLoader pattern, add caching, monitor performance

4. **Data Migration**
   - **Risk**: Existing data may not work with new patterns
   - **Mitigation**: Test thoroughly with production data in staging

### Mitigation Strategies

1. **Feature Flags**: Enable gradual rollout per page/component
2. **Parallel Running**: Keep PostGraphile running during migration
3. **Rollback Plan**: Maintain ability to revert to PostGraphile quickly
4. **Monitoring**: Add metrics for query performance and errors
5. **Incremental**: Migrate one subsystem at a time (Events → Tasks → etc.)

---

## 📚 References & Resources

### Documentation
- Rust Backend Schema: `graphql-rust-server/src/schema/query.rs`
- Model Definitions: `graphql-rust-server/src/models/*.rs`
- Migration Audit: `POSTGRAPHILE_MIGRATION_AUDIT.md`
- Execution Plan: `MIGRATION_EXECUTION_PLAN.md`

### Tools
- GraphQL Schema Generator: `cargo run --bin generate-schema`
- Pattern Finder: `grep -r "\.nodes" src/`
- Type Checker: `npm run check`
- Linter: `npm run lint`

### Testing
- Unit Tests: `npm run test:unit`
- E2E Tests: `npm run test:e2e`
- Type Check: `npm run check`

---

**Document Version**: 1.0
**Last Updated**: October 20, 2025
**Status**: ACTIVE - Ready for Implementation
**Estimated Completion**: 11 weeks (2-person team)
