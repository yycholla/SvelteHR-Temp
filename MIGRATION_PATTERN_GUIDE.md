# PostGraphile to Rust GraphQL - Migration Pattern Guide

**Generated**: 2025-10-20
**Target**: Idiomatic Rust GraphQL patterns (SeaORM + async-graphql)
**Rule**: Use ONLY Rust idiomatic patterns unless feature loss occurs

---

## 📋 Quick Reference

| Pattern Type | PostGraphile | Rust Idiomatic |
|--------------|--------------|----------------|
| Query prefix | `all*` | No prefix (plural) |
| Data access | `.nodes` | Direct array |
| Relationships | `*By*Id` | Direct field name |
| Mutations | `*ByNodeId` | Direct ID param |
| Input wrapper | `input: { model: {...} }` | `input: {...}` |
| Update | `patch: {...}` | `input: {...}` |
| Filtering | `filter: { field: { equalTo: $var } }` | Direct parameters |

---

## 🔍 Query Pattern Migrations

### Pattern 1: Basic Collection Query

#### ❌ BEFORE (PostGraphile)
```typescript
export const GET_ALL_EVENTS = gql`
  query GetAllEvents($limit: Int) {
    allEvents(first: $limit) {
      nodes {
        id
        title
        startTime
      }
    }
  }
`;

// Usage
const { data } = await query(GET_ALL_EVENTS);
const events = data?.allEvents?.nodes || [];
```

#### ✅ AFTER (Rust Idiomatic)
```typescript
export const GET_ALL_EVENTS = gql`
  query GetAllEvents($limit: Int, $offset: Int) {
    events(limit: $limit, offset: $offset) {
      id
      title
      startTime
    }
  }
`;

// Usage
const { data } = await query(GET_ALL_EVENTS);
const events = data?.events || [];
```

**Key Changes**:
- Remove `all` prefix from query name
- Remove `.nodes` access
- Replace `first` with `limit` parameter
- Add `offset` for pagination (replaces `after` cursor)

---

### Pattern 2: Single Entity Query

#### ❌ BEFORE (PostGraphile)
```typescript
export const GET_EVENT_BY_ID = gql`
  query GetEvent($id: UUID!) {
    eventById(id: $id) {
      id
      title
      nodeId
    }
  }
`;

// Usage
const { data } = await query(GET_EVENT_BY_ID, { id });
const event = data?.eventById;
```

#### ✅ AFTER (Rust Idiomatic)
```typescript
export const GET_EVENT = gql`
  query GetEvent($id: UUID!) {
    event(id: $id) {
      id
      title
    }
  }
`;

// Usage
const { data } = await query(GET_EVENT, { id });
const event = data?.event;
```

**Key Changes**:
- Remove `ById` suffix (implied)
- Remove `nodeId` field (doesn't exist in Rust backend)
- Direct field access (no `.nodes`)

---

### Pattern 3: Filtered Collection Query

#### ❌ BEFORE (PostGraphile)
```typescript
export const GET_USER_EVENTS = gql`
  query GetUserEvents($userId: UUID!, $upcoming: Boolean) {
    allEvents(
      filter: {
        organizerId: { equalTo: $userId }
        startTime: { greaterThan: $now }
      }
      orderBy: START_TIME_ASC
    ) {
      nodes {
        id
        title
      }
    }
  }
`;
```

#### ✅ AFTER (Rust Idiomatic)
```typescript
export const GET_USER_EVENTS = gql`
  query GetUserEvents($upcomingOnly: Boolean, $limit: Int) {
    events(upcomingOnly: $upcomingOnly, limit: $limit) {
      id
      title
    }
  }
`;
```

**Key Changes**:
- Replace `filter: { field: { operator: value } }` with direct parameters
- Use boolean flags instead of complex filters (e.g., `upcomingOnly: true`)
- Ordering is handled server-side (events always ordered by `startTime ASC`)
- ⚠️ **Backend Gap**: User-specific filtering not yet available (needs `userId` parameter)

**Workaround** (until backend adds `userId` parameter):
```typescript
// Fetch all events and filter client-side temporarily
const { data } = await query(GET_ALL_EVENTS);
const events = data?.events || [];
const userEvents = events.filter(e => e.organizerId === userId);
```

---

### Pattern 4: Nested Relationship Query

#### ❌ BEFORE (PostGraphile)
```typescript
export const GET_EVENTS_WITH_ORGANIZER = gql`
  query GetEventsWithOrganizer {
    allEvents {
      nodes {
        id
        title
        userByOrganizerId {
          id
          displayName
          email
        }
        eventAttendeesByEventId {
          nodes {
            id
            responseStatus
            userByEmployeeId {
              displayName
            }
          }
        }
      }
    }
  }
`;

// Usage
const { data } = await query(GET_EVENTS_WITH_ORGANIZER);
const events = data?.allEvents?.nodes || [];
events.forEach(event => {
  const organizer = event.userByOrganizerId;
  const attendees = event.eventAttendeesByEventId?.nodes || [];
});
```

#### ✅ AFTER (Rust Idiomatic)
```typescript
export const GET_EVENTS_WITH_ORGANIZER = gql`
  query GetEventsWithOrganizer($limit: Int) {
    events(limit: $limit) {
      id
      title
      organizer {
        id
        displayName
        email
      }
      attendees(limit: 100) {
        id
        responseStatus
        employee {
          displayName
        }
      }
    }
  }
`;

// Usage
const { data } = await query(GET_EVENTS_WITH_ORGANIZER);
const events = data?.events || [];
events.forEach(event => {
  const organizer = event.organizer;
  const attendees = event.attendees || [];
});
```

**Key Changes**:
- Replace `userByOrganizerId` → `organizer`
- Replace `eventAttendeesByEventId.nodes` → `attendees(limit)`
- Replace `userByEmployeeId` → `employee`
- Direct array access (no `.nodes`)
- Relationship fields use singular/plural names directly

---

## 🔄 Mutation Pattern Migrations

### Pattern 5: Create Mutation

#### ❌ BEFORE (PostGraphile)
```typescript
export const CREATE_EVENT = gql`
  mutation CreateEvent($input: CreateEventInput!) {
    createEvent(input: { event: $input }) {
      event {
        id
        title
        createdAt
      }
    }
  }
`;

// Usage
const { data } = await mutate(CREATE_EVENT, {
  input: {
    title: "Team Meeting",
    startTime: "2025-10-25T10:00:00Z",
    endTime: "2025-10-25T11:00:00Z"
  }
});
const event = data?.createEvent?.event;
```

#### ✅ AFTER (Rust Idiomatic)
```typescript
export const CREATE_EVENT = gql`
  mutation CreateEvent($input: CreateEventInput!) {
    createEvent(input: $input) {
      id
      title
      createdAt
    }
  }
`;

// Usage
const { data } = await mutate(CREATE_EVENT, {
  input: {
    title: "Team Meeting",
    startTime: "2025-10-25T10:00:00Z",
    endTime: "2025-10-25T11:00:00Z",
    isAllDay: false,
    status: "SCHEDULED",
    isPublic: true,
    organizerId: userId,
    eventType: "MEETING"
  }
});
const event = data?.createEvent;
```

**Key Changes**:
- Remove nested `{ event: $input }` wrapper
- Direct field access (no `event` wrapper in response)
- May require additional required fields (check backend input type)

---

### Pattern 6: Update Mutation

#### ❌ BEFORE (PostGraphile)
```typescript
export const UPDATE_EVENT = gql`
  mutation UpdateEvent($nodeId: ID!, $patch: EventPatch!) {
    updateEventByNodeId(input: { nodeId: $nodeId, patch: $patch }) {
      event {
        id
        title
        updatedAt
      }
    }
  }
`;

// Usage
const { data } = await mutate(UPDATE_EVENT, {
  nodeId: "WyJldmVudHMiLCJhYmMxMjMiXQ==",
  patch: {
    title: "Updated Title"
  }
});
const event = data?.updateEventByNodeId?.event;
```

#### ✅ AFTER (Rust Idiomatic)
```typescript
export const UPDATE_EVENT = gql`
  mutation UpdateEvent($id: UUID!, $input: UpdateEventInput!) {
    updateEvent(id: $id, input: $input) {
      id
      title
      updatedAt
    }
  }
`;

// Usage
const { data } = await mutate(UPDATE_EVENT, {
  id: "550e8400-e29b-41d4-a716-446655440000",
  input: {
    title: "Updated Title"
  }
});
const event = data?.updateEvent;
```

**Key Changes**:
- Replace `ByNodeId` with direct `id` parameter
- Use actual UUID instead of base64 `nodeId`
- Replace `patch` with `input`
- Direct field access (no nested wrapper)

---

### Pattern 7: Delete Mutation

#### ❌ BEFORE (PostGraphile)
```typescript
export const DELETE_EVENT = gql`
  mutation DeleteEvent($nodeId: ID!) {
    deleteEventByNodeId(input: { nodeId: $nodeId }) {
      event {
        id
      }
      deletedEventId
    }
  }
`;

// Usage
const { data } = await mutate(DELETE_EVENT, {
  nodeId: "WyJldmVudHMiLCJhYmMxMjMiXQ=="
});
const deleted = data?.deleteEventByNodeId?.deletedEventId;
```

#### ✅ AFTER (Rust Idiomatic)
```typescript
export const DELETE_EVENT = gql`
  mutation DeleteEvent($id: UUID!) {
    deleteEvent(id: $id)
  }
`;

// Usage
const { data } = await mutate(DELETE_EVENT, {
  id: "550e8400-e29b-41d4-a716-446655440000"
});
const success = data?.deleteEvent; // Returns Boolean
```

**Key Changes**:
- Replace `ByNodeId` with direct `id` parameter
- Returns `Boolean!` instead of nested object
- Use actual UUID instead of base64 `nodeId`
- Simpler response (just true/false)

---

### Pattern 8: Custom Action Mutation

#### ❌ BEFORE (PostGraphile)
```typescript
export const APPROVE_LEAVE_REQUEST = gql`
  mutation ApproveLeave($requestId: UUID!) {
    approveLeaveRequest(input: { requestId: $requestId }) {
      leaveRequest {
        id
        status
        approvedAt
      }
    }
  }
`;
```

#### ✅ AFTER (Rust Idiomatic)
```typescript
export const APPROVE_LEAVE_REQUEST = gql`
  mutation ApproveLeave($input: ApproveLeaveRequestInput!) {
    approveLeaveRequest(input: $input) {
      id
      status
      approvedAt
    }
  }
`;

// Usage
const { data } = await mutate(APPROVE_LEAVE_REQUEST, {
  input: {
    leaveRequestId: requestId,
    approverId: managerId,
    comments: "Approved"
  }
});
const request = data?.approveLeaveRequest;
```

**Key Changes**:
- Use input object for all parameters
- Direct field access (no nested wrapper)
- May require additional fields (approverId, comments, etc.)

---

## 🔗 Relationship Resolver Migrations

### Pattern 9: One-to-One Relationship

#### ❌ BEFORE (PostGraphile)
```typescript
export const GET_TASK_WITH_ASSIGNEE = gql`
  query GetTask($id: UUID!) {
    taskById(id: $id) {
      id
      title
      userByAssigneeId {
        id
        displayName
      }
    }
  }
`;

// Usage
const assignee = task.userByAssigneeId;
```

#### ✅ AFTER (Rust Idiomatic)
```typescript
export const GET_TASK_WITH_ASSIGNEE = gql`
  query GetTask($id: UUID!) {
    task(id: $id) {
      id
      title
      assignee {
        id
        displayName
      }
    }
  }
`;

// Usage
const assignee = task.assignee;
```

**Key Changes**:
- Replace `*By*Id` with singular field name
- Example mappings:
  - `userByAssigneeId` → `assignee`
  - `userByOrganizerId` → `organizer`
  - `userByManagerId` → `manager`
  - `departmentByDepartmentId` → `department`

---

### Pattern 10: One-to-Many Relationship

#### ❌ BEFORE (PostGraphile)
```typescript
export const GET_EVENT_WITH_ATTENDEES = gql`
  query GetEvent($id: UUID!) {
    eventById(id: $id) {
      id
      title
      eventAttendeesByEventId(first: 100) {
        nodes {
          id
          responseStatus
        }
        totalCount
      }
    }
  }
`;

// Usage
const attendees = event.eventAttendeesByEventId?.nodes || [];
const total = event.eventAttendeesByEventId?.totalCount || 0;
```

#### ✅ AFTER (Rust Idiomatic)
```typescript
export const GET_EVENT_WITH_ATTENDEES = gql`
  query GetEvent($id: UUID!) {
    event(id: $id) {
      id
      title
      attendees(limit: 100) {
        id
        responseStatus
      }
      attendeeCount
    }
  }
`;

// Usage
const attendees = event.attendees || [];
const total = event.attendeeCount;
```

**Key Changes**:
- Replace `*By*Id.nodes` with plural field name
- Replace `first` with `limit` parameter
- Replace `.totalCount` with separate `*Count` field
- Direct array access (no `.nodes`)

---

## 📝 TypeScript Code Migrations

### Pattern 11: GraphQL Operation File Structure

#### ❌ BEFORE (PostGraphile)
```typescript
// src/lib/graphql/events-operations.ts
import { gql } from '@urql/svelte';

export const GET_ALL_EVENTS = gql`
  query GetAllEvents {
    allEvents {
      nodes {
        id
        nodeId
        title
        userByOrganizerId {
          displayName
        }
        eventAttendeesByEventId {
          nodes {
            id
          }
        }
      }
    }
  }
`;

export const CREATE_EVENT = gql`
  mutation CreateEvent($input: CreateEventInput!) {
    createEvent(input: { event: $input }) {
      event {
        id
        title
      }
    }
  }
`;

export const UPDATE_EVENT = gql`
  mutation UpdateEvent($nodeId: ID!, $patch: EventPatch!) {
    updateEventByNodeId(input: { nodeId: $nodeId, patch: $patch }) {
      event {
        id
      }
    }
  }
`;
```

#### ✅ AFTER (Rust Idiomatic)
```typescript
// src/lib/graphql/events-operations.ts
import { gql } from '@urql/svelte';

export const GET_ALL_EVENTS = gql`
  query GetAllEvents($limit: Int, $offset: Int) {
    events(limit: $limit, offset: $offset) {
      id
      title
      organizer {
        displayName
      }
      attendees(limit: 100) {
        id
      }
    }
  }
`;

export const CREATE_EVENT = gql`
  mutation CreateEvent($input: CreateEventInput!) {
    createEvent(input: $input) {
      id
      title
    }
  }
`;

export const UPDATE_EVENT = gql`
  mutation UpdateEvent($id: UUID!, $input: UpdateEventInput!) {
    updateEvent(id: $id, input: $input) {
      id
      title
    }
  }
`;
```

**Key Changes**:
- Update all queries to remove `all*`, `.nodes`
- Update all mutations to remove `ByNodeId`, nested wrappers
- Replace relationship fields with idiomatic names
- Remove `nodeId` from all queries
- Add pagination parameters

---

### Pattern 12: SvelteKit Load Function

#### ❌ BEFORE (PostGraphile)
```typescript
// +page.server.ts
import { GET_ALL_EVENTS } from '$lib/graphql/events-operations';

export const load: PageServerLoad = async ({ locals }) => {
  const client = locals.graphqlClient;

  const result = await client.query(GET_ALL_EVENTS, {});
  const events = result.data?.allEvents?.nodes || [];

  return {
    events
  };
};
```

#### ✅ AFTER (Rust Idiomatic)
```typescript
// +page.server.ts
import { GET_ALL_EVENTS } from '$lib/graphql/events-operations';

export const load: PageServerLoad = async ({ locals }) => {
  const client = locals.graphqlClient;

  const result = await client.query(GET_ALL_EVENTS, {
    limit: 100,
    offset: 0
  });
  const events = result.data?.events || [];

  return {
    events
  };
};
```

**Key Changes**:
- Remove `.nodes` access
- Add pagination parameters
- Direct array access

---

### Pattern 13: Svelte Component Data Access

#### ❌ BEFORE (PostGraphile)
```svelte
<script lang="ts">
  export let data;

  // Access nested data
  $: events = data.events?.nodes || [];
  $: event = data.event;
  $: organizer = event?.userByOrganizerId;
  $: attendees = event?.eventAttendeesByEventId?.nodes || [];
</script>

{#each events as event}
  <div>
    <h2>{event.title}</h2>
    <p>Organizer: {event.userByOrganizerId?.displayName}</p>
  </div>
{/each}
```

#### ✅ AFTER (Rust Idiomatic)
```svelte
<script lang="ts">
  export let data;

  // Direct array access
  $: events = data.events || [];
  $: event = data.event;
  $: organizer = event?.organizer;
  $: attendees = event?.attendees || [];
</script>

{#each events as event}
  <div>
    <h2>{event.title}</h2>
    <p>Organizer: {event.organizer?.displayName}</p>
  </div>
{/each}
```

**Key Changes**:
- Remove `.nodes` access in reactive statements
- Update relationship field names
- Simpler data access patterns

---

## ⚠️ Common Pitfalls & Solutions

### Pitfall 1: Forgetting to Remove .nodes

❌ **Problem**:
```typescript
const events = data?.events?.nodes || [];  // ❌ .nodes doesn't exist
```

✅ **Solution**:
```typescript
const events = data?.events || [];  // ✅ Direct array
```

**Find & Replace**:
- Find: `\.nodes\s*\|\|\s*\[\]`
- Replace: ` || []`

---

### Pitfall 2: Using nodeId Instead of id

❌ **Problem**:
```typescript
await mutate(UPDATE_EVENT, {
  nodeId: event.nodeId,  // ❌ nodeId doesn't exist
  patch: { title: "New" }
});
```

✅ **Solution**:
```typescript
await mutate(UPDATE_EVENT, {
  id: event.id,  // ✅ Use UUID id
  input: { title: "New" }
});
```

---

### Pitfall 3: Using PostGraphile Relationship Names

❌ **Problem**:
```typescript
query GetEvent($id: UUID!) {
  event(id: $id) {
    userByOrganizerId {  // ❌ PostGraphile alias
      displayName
    }
  }
}
```

✅ **Solution**:
```typescript
query GetEvent($id: UUID!) {
  event(id: $id) {
    organizer {  // ✅ Idiomatic
      displayName
    }
  }
}
```

---

### Pitfall 4: Incorrect Filter Syntax

❌ **Problem**:
```typescript
query GetEvents($userId: UUID!) {
  events(
    filter: {  // ❌ Complex filter not supported
      organizerId: { equalTo: $userId }
    }
  ) {
    id
  }
}
```

✅ **Solution** (if parameter exists):
```typescript
query GetEvents($userId: UUID!) {
  events(userId: $userId, limit: 100) {  // ✅ Direct parameter
    id
  }
}
```

⚠️ **Workaround** (if parameter doesn't exist):
```typescript
// Fetch all and filter client-side temporarily
const { data } = await query(GET_ALL_EVENTS);
const userEvents = (data?.events || []).filter(
  e => e.organizerId === userId
);
```

---

### Pitfall 5: Mutation Response Structure

❌ **Problem**:
```typescript
const { data } = await mutate(CREATE_EVENT, { input });
const event = data?.createEvent?.event;  // ❌ No nested wrapper
```

✅ **Solution**:
```typescript
const { data } = await mutate(CREATE_EVENT, { input });
const event = data?.createEvent;  // ✅ Direct access
```

---

### Pitfall 6: Missing Required Fields

❌ **Problem**:
```typescript
await mutate(CREATE_EVENT, {
  input: {
    title: "Meeting",
    startTime: "...",
    endTime: "..."
    // ❌ Missing required fields
  }
});
```

✅ **Solution**:
```typescript
await mutate(CREATE_EVENT, {
  input: {
    title: "Meeting",
    startTime: "...",
    endTime: "...",
    isAllDay: false,          // ✅ Required
    status: "SCHEDULED",      // ✅ Required
    isPublic: true,           // ✅ Required
    organizerId: userId,      // ✅ Required
    eventType: "MEETING"      // ✅ Required
  }
});
```

**Action**: Check `BACKEND_API_REFERENCE.md` for required input fields

---

## 🔍 Migration Checklist

For each GraphQL operation file:

- [ ] Remove all `all*` query prefixes
- [ ] Remove all `.nodes` access patterns
- [ ] Remove all `nodeId` references
- [ ] Replace `*By*Id` relationships with idiomatic names
- [ ] Replace `*ByNodeId` mutations with direct `id` parameters
- [ ] Replace `patch` with `input` in update mutations
- [ ] Remove nested wrappers (`{ event: $input }` → `$input`)
- [ ] Add pagination parameters (`limit`, `offset`)
- [ ] Update TypeScript code to match new data structure
- [ ] Test all queries and mutations
- [ ] Update type definitions if using generated types

---

## 📚 Relationship Name Mappings

### Common Mappings

| PostGraphile | Rust Idiomatic |
|--------------|----------------|
| `userByAssigneeId` | `assignee` |
| `userByOrganizerId` | `organizer` |
| `userByManagerId` | `manager` |
| `userByEmployeeId` | `employee` |
| `userByCreatorId` | `creator` |
| `userByReviewerId` | `reviewer` |
| `departmentByDepartmentId` | `department` |
| `leaveTypeByLeaveTypeId` | `leaveType` |
| `taskByParentTaskId` | `parentTask` |
| `eventAttendeesByEventId` | `attendees` |
| `taskAssigneesByTaskId` | `assignees` |
| `eventCommentsByEventId` | `comments` |
| `taskDependenciesByTaskId` | `dependencies` |
| `directReportsByManagerId` | `directReports` |

---

## 🚀 Quick Find & Replace Guide

### Step 1: Query Names
```bash
# Find all "all*" queries
rg "all[A-Z][a-zA-Z]+" src/lib/graphql/

# Examples to replace:
allEvents → events
allTasks → tasks
allUsers → users
allDepartments → departments
```

### Step 2: Remove .nodes
```bash
# Find all .nodes access
rg "\.nodes" src/

# Replace pattern:
?.nodes || [] → || []
?.nodes?.[0] → ?.[0]
```

### Step 3: Update Relationships
```bash
# Find PostGraphile relationships
rg "By[A-Z][a-zA-Z]+Id" src/lib/graphql/

# Common replacements:
userByOrganizerId → organizer
eventAttendeesByEventId → attendees
```

### Step 4: Update Mutations
```bash
# Find ByNodeId mutations
rg "ByNodeId" src/lib/graphql/

# Replace pattern:
updateEventByNodeId → updateEvent
deleteTaskByNodeId → deleteTask
```

---

## 📖 Additional Resources

- **Backend API Reference**: `BACKEND_API_REFERENCE.md` - Complete list of queries, mutations, and types
- **Comprehensive Tasks**: `COMPREHENSIVE_MIGRATION_TASKS.md` - Detailed task-by-task migration guide
- **Execution Plan**: `MIGRATION_EXECUTION_PLAN.md` - Week-by-week implementation schedule

---

**Last Updated**: 2025-10-20
**Next Review**: After Phase 1 completion
