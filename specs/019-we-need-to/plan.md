# Implementation Plan: Events, Tasks, and Activity Management System

**Branch**: `019-we-need-to` | **Date**: 2025-01-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/home/chanway/Projects/SvelteHR/specs/019-we-need-to/spec.md`

## Execution Flow (/plan command scope)

```
1. Load feature spec from Input path
   → SUCCESS: Loaded spec with 5 resolved clarifications
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Project Type: web (frontend+backend)
   → Structure Decision: SvelteKit frontend + PostGraphile GraphQL backend
3. Fill the Constitution Check section based on constitution document
   → Constitution v1.1.0 loaded
4. Evaluate Constitution Check section
   → No violations - using existing patterns (TDD, GraphQL, RLS)
   → Update Progress Tracking: Initial Constitution Check ✓
5. Execute Phase 0 → research.md
   → Research: Event calendar patterns, RSVP systems, notification architecture
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
   → Generate: Event/Task/Activity GraphQL operations + TypeScript interfaces
7. Re-evaluate Constitution Check section
   → No new violations - design follows constitution
   → Update Progress Tracking: Post-Design Constitution Check ✓
8. Plan Phase 2 → Describe task generation approach
   → TDD approach: Contract tests → Data models → GraphQL operations → UI
9. STOP - Ready for /tasks command
```

## Summary

Implement a comprehensive Events, Tasks, and Activity Management System for the SvelteHR application. The system provides three core features:

1. **Event Management**: Calendar events with RSVP functionality, three visibility levels (company-wide, department-specific, specific people), and department-based invitation grouping
2. **Task Management**: Assignment system supporting both individual employees and departments with privacy controls (department tasks visible only within that department)
3. **Activity Logging**: Dual-tab interface separating "My Activities" (employee view) from "Audit Logs" (admin-only), with email and in-app notifications for events and tasks

**Technical Approach**: Extend existing PostGraphile GraphQL backend with new tables (`events`, `event_attendees`, `tasks`, `activity_logs`, `notifications`), implement Row-Level Security policies for RBAC enforcement, create GraphQL operations following established patterns (see `tasks-operations.ts`), and build SvelteKit pages with server-side data loading (`+page.server.ts`) for proper authentication and authorization.

## Technical Context

**Language/Version**: TypeScript 5.0 (strict mode), SvelteKit 2.22.0, Svelte 5.0 (runes syntax)
**Primary Dependencies**:
- Frontend: SvelteKit, Svelte 5, urql 4.x (GraphQL client), Tailwind CSS 4.0, Skeleton UI 3.1.7
- Backend: PostGraphile (auto-GraphQL from PostgreSQL), PostgreSQL 14+
- State: Svelte stores, SvelteKit Superforms 2.27.1 (form validation)
- Testing: Vitest 3.2.3 (unit), Playwright 1.49.1 (E2E), Zod 4.0.14 (validation)

**Storage**: PostgreSQL with PostGraphile auto-generated GraphQL API, Row-Level Security (RLS) for RBAC
**Testing**: Vitest (unit/component), Playwright (E2E), contract tests for GraphQL operations
**Target Platform**: Web application (SvelteKit SSR + SPA), Node.js 20+ server environment
**Project Type**: web (frontend + backend with GraphQL layer)

**Performance Goals**:
- GraphQL operations <200ms (constitution requirement)
- Page load times <1 second
- Calendar event queries support 1000+ events with pagination
- Task list rendering optimized for 500+ tasks per department

**Constraints**:
- Server-side data loading mandatory (no client-side API calls to backend)
- Row-Level Security (RLS) enforced at database level for all queries
- JWT authentication with 4-tier RBAC (Admin 100, HR 80, Manager 60, Employee 20)
- Strict TypeScript typing throughout (no `any` types)
- Test-first development (TDD) with >90% coverage requirement

**Scale/Scope**:
- Support 100-500 employees across 10-20 departments
- Event calendar: 50-100 events per month
- Tasks: 200-500 active tasks across organization
- Activity logs: Retain 90 days (configurable), ~10,000 log entries/month
- Notifications: Email (via backend service) + in-app (PostgreSQL notifications table)

**User-Provided Context**: Research best practices through MCP servers and review current implementations for consistency. This plan follows established patterns in `src/lib/graphql/tasks-operations.ts` (GraphQL operations structure), `src/routes/dashboard/management/*` (page routing), and constitution requirements (TDD, RLS, server-side loading).

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### I. Test-First Development ✅
- **Compliance**: Full TDD workflow with contract tests before implementation
- **Plan**: Phase 1 generates failing contract tests for all GraphQL operations
- **Coverage**: Target >90% with Vitest (unit) + Playwright (E2E)
- **Serena MCP Integration**: Use `mcp__serena__find_referencing_symbols()` for test impact analysis

### II. Type Safety First ✅
- **Compliance**: Strict TypeScript 5.0 throughout, no `any` types
- **Plan**: Generate TypeScript interfaces from GraphQL schema (PostGraphile auto-generates types)
- **Validation**: Zod schemas for form inputs and API responses
- **Type Checking**: `npm run check` required before commits

### III. Security by Design ✅
- **RLS Policies**: Database-level security for all event/task/activity queries
  - Events: `event_visibility_policy` (company/department/specific people)
  - Tasks: `task_department_privacy` (restrict to assigned department)
  - Activities: `activity_log_user_access` (own activities + admin audit)
  - Notifications: `notification_recipient_access` (user-specific)
- **JWT Authentication**: 4-tier RBAC enforced on every GraphQL request
- **Input Validation**: Zod schemas for event creation, task assignment, RSVP responses
- **Audit Logging**: All event/task mutations logged to `activity_logs` table
- **No Client-Side Secrets**: All sensitive data access via `+page.server.ts`

### IV. Performance Standards ✅
- **GraphQL Operations**: <200ms target for all queries
- **Indexing Strategy**:
  - `events`: Index on `start_date`, `organizer_id`, `status`
  - `event_attendees`: Composite index on `event_id, employee_id`
  - `tasks`: Index on `due_date`, `assignee_id`, `department_id`, `status`
  - `activity_logs`: Index on `user_id`, `created_at`, `resource_type`
  - `notifications`: Index on `recipient_id`, `read_status`, `created_at`
- **Pagination**: Required for all list queries (default limit: 20)
- **Bundle Optimization**: Code splitting for calendar component (FullCalendar or similar)

### V. Component Architecture ✅
- **Svelte 5 Runes**: Use `$state`, `$derived`, `$props` for all reactive state
- **Server-Side Loading**: ALL data fetching in `+page.server.ts` files (no client-side API calls)
- **Component Patterns**: Follow Skeleton UI patterns for consistency
- **Storybook**: Document all new UI components (event cards, task items, activity feed)
- **Error Handling**: Centralized error system (`$lib/utils/errors.ts`)
- **Serena MCP**: Use `replace_symbol_body` for safe component refactoring

### VI. MCP-First Development ✅
- **Workflow Compliance**:
  1. ✅ Serena MCP onboarding: Checked and read relevant memories
  2. ✅ Task Management: Using Archon MCP per CLAUDE.md (deferred - planning phase)
  3. ✅ Code Discovery: Will use `list_dir`, `find_file`, `get_symbols_overview`
  4. ✅ Implementation: Will use `replace_symbol_body`, `insert_after_symbol`
  5. ✅ Verification: Will use `find_referencing_symbols`, `think_about_task_adherence`

**Constitution Version**: 1.1.0 (Ratified 2025-01-27)

## Project Structure

### Documentation (this feature)

```
specs/019-we-need-to/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
│   ├── events-operations.contract.test.ts
│   ├── tasks-operations.contract.test.ts
│   ├── activity-logs-operations.contract.test.ts
│   └── notifications-operations.contract.test.ts
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)

```
# Web application structure (SvelteKit + PostGraphile)

# Frontend: SvelteKit routes and components
src/routes/
├── dashboard/
│   ├── events/                    # NEW: Event management pages
│   │   ├── +page.svelte          # Event list/calendar view
│   │   ├── +page.server.ts       # Server-side event data loading
│   │   ├── create/               # Create new event
│   │   │   ├── +page.svelte
│   │   │   └── +page.server.ts
│   │   ├── [id]/                 # Event detail/edit
│   │   │   ├── +page.svelte
│   │   │   └── +page.server.ts
│   │   └── my-calendar/          # Employee personal calendar
│   │       ├── +page.svelte
│   │       └── +page.server.ts
│   ├── tasks/                     # NEW: Task management pages
│   │   ├── +page.svelte          # Task list view
│   │   ├── +page.server.ts       # Server-side task data loading
│   │   ├── my-tasks/             # Employee personal tasks
│   │   │   ├── +page.svelte
│   │   │   └── +page.server.ts
│   │   ├── department/           # Department task view
│   │   │   ├── +page.svelte
│   │   │   └── +page.server.ts
│   │   └── [id]/                 # Task detail/edit
│   │       ├── +page.svelte
│   │       └── +page.server.ts
│   ├── activities/                # NEW: Activity log pages
│   │   ├── +page.svelte          # My Activities tab
│   │   ├── +page.server.ts       # Server-side activity loading
│   │   └── audit/                # Admin-only audit logs
│   │       ├── +page.svelte
│   │       └── +page.server.ts
│   └── notifications/             # NEW: Notification center
│       ├── +page.svelte
│       └── +page.server.ts
│
├── management/                    # Extend existing management portal
│   ├── events/                   # NEW: Manager event creation
│   │   └── ...
│   └── tasks/                    # ENHANCE: Extend existing task management
│       └── ...

# Frontend: GraphQL operations library
src/lib/graphql/
├── events-operations.ts           # NEW: Event GraphQL queries/mutations
├── tasks-operations.ts            # ENHANCE: Extend existing operations
├── activity-logs-operations.ts    # NEW: Activity log queries
└── notifications-operations.ts    # NEW: Notification queries/mutations

# Frontend: UI components
src/lib/components/
├── events/                        # NEW: Event components
│   ├── EventCard.svelte
│   ├── EventCalendar.svelte
│   ├── EventForm.svelte
│   ├── RSVPButton.svelte
│   └── AttendeeSelector.svelte
├── tasks/                         # NEW: Task components
│   ├── TaskCard.svelte
│   ├── TaskList.svelte
│   ├── TaskForm.svelte
│   └── TaskStatusBadge.svelte
├── activities/                    # NEW: Activity components
│   ├── ActivityFeed.svelte
│   ├── ActivityItem.svelte
│   └── AuditLogTable.svelte
└── notifications/                 # NEW: Notification components
    ├── NotificationBell.svelte
    ├── NotificationItem.svelte
    └── NotificationList.svelte

# Testing
tests/
├── contract/                      # NEW: GraphQL contract tests
│   ├── events-operations.test.ts
│   ├── tasks-operations.test.ts
│   ├── activity-logs-operations.test.ts
│   └── notifications-operations.test.ts
├── integration/                   # NEW: Feature integration tests
│   ├── event-rsvp-workflow.test.ts
│   ├── task-assignment.test.ts
│   └── activity-logging.test.ts
└── unit/                          # NEW: Component unit tests
    ├── EventCard.test.ts
    ├── TaskList.test.ts
    └── ActivityFeed.test.ts

# Backend: PostgreSQL migrations (MountainHR-Backend repo)
# Note: Migration for events table already created in previous session
# Additional migrations needed for tasks enhancement and new tables
migrations/
├── 20250101_create_events_tables.sql         # EXISTING (from previous work)
├── 20250101_enhance_tasks_department.sql     # NEW: Add department privacy
├── 20250101_create_notifications_table.sql   # NEW: Notification system
└── 20250101_create_rls_policies.sql          # NEW: RLS policies for all tables
```

**Structure Decision**: Web application (Option 2) - Frontend uses SvelteKit with server-side data loading, backend uses PostGraphile auto-generated GraphQL API from PostgreSQL schema.

## Phase 0: Outline & Research

### Research Tasks

Based on Technical Context analysis, the following unknowns and technology choices require research:

1. **RESOLVED - Event RSVP Patterns**:
   - Research: Calendar event systems with RSVP tracking (accept/decline/tentative)
   - Rationale: Need efficient database schema for tracking attendance status
   - Focus: PostgreSQL schema design, GraphQL mutations for RSVP updates

2. **RESOLVED - Department-Based Visibility**:
   - Research: Multi-tier visibility controls (company/department/individual)
   - Rationale: Complex RLS policies required for secure event visibility
   - Focus: PostGraphile RLS best practices, junction table patterns

3. **RESOLVED - Activity Log Architecture**:
   - Research: Dual-tab activity logging (employee view vs admin audit)
   - Rationale: Need to balance user activity history with admin oversight
   - Focus: GraphQL filtering strategies, RLS policy separation

4. **RESOLVED - Notification System Design**:
   - Research: Email + in-app notification dual-channel architecture
   - Rationale: Constitution requires both notification types
   - Focus: Backend notification service integration, PostgreSQL NOTIFY/LISTEN

5. **RESOLVED - Task Department Privacy**:
   - Research: Department-scoped task visibility enforcement
   - Rationale: Tasks assigned to departments should be private to that department
   - Focus: RLS policies, GraphQL filter patterns

6. **RESOLVED - Calendar UI Component Selection**:
   - Research: SvelteKit-compatible calendar components
   - Rationale: Need performant calendar with RSVP integration
   - Alternatives: FullCalendar, TUI Calendar, custom Svelte implementation
   - Decision: Will be documented in research.md

### Research Consolidation

All research findings will be consolidated in `research.md` with the following format:

```markdown
## Decision: [Technology/Pattern Choice]
**Rationale**: [Why this approach was selected]
**Alternatives Considered**: [Other options evaluated]
**Implementation Notes**: [Key technical details]
**Constitution Compliance**: [How this aligns with constitution]
```

**Output**: research.md with all Technical Context unknowns resolved

## Phase 1: Design & Contracts

_Prerequisites: research.md complete_

### 1. Data Model Generation (`data-model.md`)

Extract entities from feature spec and research findings:

**Core Entities**:

- **Event**: Calendar event with title, description, start/end datetime, location, organizer_id, visibility_type (enum: 'company', 'department', 'specific'), status (enum: 'scheduled', 'cancelled', 'completed')
- **EventAttendee**: Junction table linking employees to events, tracks response_status (enum: 'pending', 'accepted', 'declined', 'tentative'), is_required (boolean), invited_at, responded_at
- **Task**: Work assignment with title, description, assignee_id (nullable for department tasks), assigned_to_department_id (nullable), assigner_id, status (enum: 'pending', 'in_progress', 'completed', 'cancelled'), priority (enum: 'low', 'medium', 'high', 'urgent'), due_date, category, completed_at
- **ActivityLog**: Audit trail with user_id, action (enum: 'create', 'update', 'delete', 'view'), resource_type (enum: 'event', 'task', 'leave_request', 'profile', 'document'), resource_id (UUID), details (JSONB), ip_address, user_agent, created_at
- **Notification**: System notification with recipient_id, type (enum: 'email', 'in_app'), category (enum: 'event_invitation', 'task_assignment', 'event_reminder', 'task_due_soon'), title, message, related_resource_type, related_resource_id, read_status (boolean), delivered_at, read_at, created_at

**Relationships**:
- Event 1:N EventAttendee (one event has many attendees)
- Employee 1:N EventAttendee (one employee can be invited to many events)
- Department 1:N Event (visibility_type = 'department')
- Employee 1:N Task (as assignee)
- Department 1:N Task (as assigned_to_department)
- Employee 1:N Task (as assigner)
- Employee 1:N ActivityLog
- Employee 1:N Notification (as recipient)

**Validation Rules**:
- Event: start_date < end_date, organizer must have manager/admin role
- EventAttendee: Unique constraint on (event_id, employee_id)
- Task: assignee_id OR assigned_to_department_id required (not both), assigner != assignee (CHECK constraint)
- ActivityLog: Immutable (no UPDATE/DELETE operations)
- Notification: recipient_id must match JWT user for in_app notifications

**State Transitions**:
- Event: scheduled → cancelled, scheduled → completed
- EventAttendee: pending → (accepted | declined | tentative)
- Task: pending → in_progress → completed, any → cancelled
- Notification: unread → read (email notifications delivered externally)

### 2. GraphQL Contract Generation (`/contracts/`)

Generate API contracts from functional requirements following PostGraphile conventions:

**Events Operations** (`events-operations.contract.test.ts`):
```typescript
// Queries
- GET_ALL_EVENTS (pagination, filters: status, date_range, visibility_type)
- GET_EVENT_BY_ID (single event with attendees)
- GET_USER_EVENTS (employee's invited events with RSVP status)
- GET_UPCOMING_EVENTS (next 30 days, user-specific)
- GET_EVENT_ATTENDEES (attendee list with response status)

// Mutations
- CREATE_EVENT (manager/admin only, with attendee selection)
- UPDATE_EVENT (organizer or admin only)
- DELETE_EVENT (organizer or admin only, logs to activity_logs)
- UPDATE_RSVP_STATUS (employee updates own RSVP)
- BULK_INVITE_DEPARTMENT (select all department members)
```

**Tasks Operations** (`tasks-operations.contract.test.ts`):
```typescript
// Queries (enhance existing operations)
- GET_EMPLOYEE_TASKS (individual tasks assigned to user)
- GET_DEPARTMENT_TASKS (tasks assigned to user's department)
- GET_ALL_TASKS (manager view with department filtering)
- GET_TASK_BY_ID (single task detail)
- GET_TASK_STATISTICS (counts by status/priority)

// Mutations (enhance existing operations)
- CREATE_TASK (manager/admin, assign to employee OR department)
- UPDATE_TASK (manager or assignee can update status)
- UPDATE_TASK_STATUS (employee updates own task status)
- DELETE_TASK (manager/admin only)
- REASSIGN_TASK (manager changes assignee)
```

**Activity Logs Operations** (`activity-logs-operations.contract.test.ts`):
```typescript
// Queries
- GET_USER_ACTIVITIES (employee's own activities, paginated)
- GET_AUDIT_LOGS (admin-only, all system activities with filters)
- GET_RESOURCE_ACTIVITY_HISTORY (activity trail for specific resource)

// Mutations
- LOG_ACTIVITY (internal function, called by other mutations)
// Note: No direct mutations - activities logged via triggers/functions
```

**Notifications Operations** (`notifications-operations.contract.test.ts`):
```typescript
// Queries
- GET_USER_NOTIFICATIONS (unread + recent read, paginated)
- GET_UNREAD_COUNT (notification bell badge)
- GET_NOTIFICATION_BY_ID (single notification)

// Mutations
- MARK_NOTIFICATION_READ (mark single as read)
- MARK_ALL_READ (clear notification bell)
- DELETE_NOTIFICATION (user removes notification)
```

**Contract Test Structure** (following `tasks-operations.ts` pattern):
```typescript
describe('EventsOperations Contract', () => {
  describe('GET_ALL_EVENTS', () => {
    it('should return paginated events', async () => {
      // ARRANGE: Mock GraphQL client
      // ACT: Call operation
      // ASSERT: Response shape matches interface
      // This test MUST FAIL initially (no implementation)
    });
  });
});
```

### 3. Contract Test Generation

Generate failing contract tests (TDD RED phase):

- One test file per GraphQL operations file
- Assert request/response schemas match TypeScript interfaces
- Mock GraphQL client with expected responses
- Tests verify error handling (network errors, validation errors, auth errors)
- All tests MUST fail initially (no implementation exists)

Example test pattern (from existing codebase):
```typescript
import { describe, it, expect, vi } from 'vitest';
import { EventsOperations } from '$lib/graphql/events-operations';

describe('EventsOperations', () => {
  const mockClient = {
    subscribe: vi.fn()
  };

  it('should fetch events with pagination', async () => {
    // Test MUST FAIL - implementation doesn't exist yet
    const operations = new EventsOperations(mockClient);
    const result = await operations.getAllEvents({
      first: 20,
      offset: 0,
      userCredentials: { token: 'test' }
    });

    expect(result.events).toBeDefined();
    expect(result.totalCount).toBeGreaterThanOrEqual(0);
  });
});
```

### 4. Integration Test Scenarios (`quickstart.md`)

Extract test scenarios from user stories (spec.md Acceptance Scenarios):

**Event Management Tests**:
- Scenario 1: Manager creates company-wide event → All employees see event
- Scenario 5: Employee accepts event invitation → RSVP status updates to "Accepted"
- Scenario 6: Employee changes RSVP from "Tentative" to "Declined"

**Task Management Tests**:
- Scenario 7: Manager assigns task to employee → Task appears on employee's page
- Scenario 8: Manager assigns task to department → All department members see task
- Scenario 11: Employee updates task status → Status changes from "pending" to "in_progress"
- Scenario 12: Employee from different department cannot view department task

**Activity Log Tests**:
- Scenario 13: Employee performs action → Activity appears in "My Activities" tab
- Scenario 14: Admin views audit logs → All system activities shown
- Scenario 15: Regular employee cannot access "Audit Logs" tab

**Notification Tests**:
- Scenario 16: Manager assigns task → Employee receives email + in-app notification
- Scenario 17: Employee invited to event → Receives both notification types
- Scenario 18: Employee logs in with unread notifications → Badge shows count

### 5. Agent Context File Update (`CLAUDE.md`)

Run incremental update script:
```bash
.specify/scripts/bash/update-agent-context.sh claude
```

**Updates to include**:
- NEW routes: `/dashboard/events/*`, `/dashboard/tasks/*`, `/dashboard/activities/*`
- NEW GraphQL operations: `events-operations.ts`, `activity-logs-operations.ts`, `notifications-operations.ts`
- ENHANCED: `tasks-operations.ts` with department privacy
- NEW components: Event/Task/Activity UI components
- RLS policies: Event visibility, task department privacy, activity log access
- Testing: Contract tests for all operations

**Keep under 150 lines**: Focus on new architecture patterns, preserve manual sections between markers

**Output**:
- `data-model.md` - Complete entity definitions with relationships
- `/contracts/*.contract.test.ts` - Failing contract tests (TDD RED phase)
- `quickstart.md` - Integration test scenarios from user stories
- `CLAUDE.md` - Updated agent context file (incremental)

## Phase 2: Task Planning Approach

_This section describes what the /tasks command will do - DO NOT execute during /plan_

**Task Generation Strategy**:

1. Load `.specify/templates/tasks-template.md` as base template
2. Generate tasks from Phase 1 design docs following TDD order:
   - Contract tests FIRST (RED phase)
   - Data models SECOND (database migrations)
   - GraphQL operations THIRD (GREEN phase)
   - UI components FOURTH (integrate with operations)
   - Integration tests FIFTH (E2E scenarios)
   - Documentation SIXTH (Storybook, README updates)

**Task Categories**:

**Database & Schema Tasks** (Backend - MountainHR-Backend repo):
1. [P] Enhance `tasks` table with department privacy fields
2. [P] Create `notifications` table with email/in-app tracking
3. [P] Create RLS policies for events (visibility controls)
4. [P] Create RLS policies for tasks (department privacy)
5. [P] Create RLS policies for activity_logs (user access + admin audit)
6. [P] Create RLS policies for notifications (recipient access)
7. [P] Add database indexes for performance (events, tasks, activity_logs)
8. Create database triggers for activity logging (auto-log on mutations)

**Contract Test Tasks** (TDD RED Phase):
9. [P] Write failing contract tests for `events-operations.ts`
10. [P] Write failing contract tests for enhanced `tasks-operations.ts`
11. [P] Write failing contract tests for `activity-logs-operations.ts`
12. [P] Write failing contract tests for `notifications-operations.ts`

**GraphQL Operations Tasks** (TDD GREEN Phase):
13. Create `events-operations.ts` with queries/mutations
14. Enhance `tasks-operations.ts` with department filtering
15. Create `activity-logs-operations.ts` with dual-tab queries
16. Create `notifications-operations.ts` with read/unread tracking
17. Add TypeScript interfaces for all operations
18. Add helper functions for event visibility, task filtering, activity grouping

**UI Component Tasks** (Presentational):
19. [P] Create `EventCard.svelte` component with Storybook
20. [P] Create `EventCalendar.svelte` component with Storybook
21. [P] Create `RSVPButton.svelte` component with Storybook
22. [P] Create `TaskCard.svelte` component with Storybook
23. [P] Create `TaskList.svelte` component with Storybook
24. [P] Create `ActivityFeed.svelte` component with Storybook
25. [P] Create `NotificationBell.svelte` component with Storybook

**Page Implementation Tasks** (SvelteKit Routes):
26. Create `/dashboard/events/+page.server.ts` (server-side data loading)
27. Create `/dashboard/events/+page.svelte` (event list/calendar view)
28. Create `/dashboard/events/create/+page.server.ts` (event creation form handler)
29. Create `/dashboard/events/create/+page.svelte` (event creation form)
30. Create `/dashboard/tasks/my-tasks/+page.server.ts` (employee task loading)
31. Create `/dashboard/tasks/my-tasks/+page.svelte` (employee task view)
32. Create `/dashboard/tasks/department/+page.server.ts` (department task loading)
33. Create `/dashboard/tasks/department/+page.svelte` (department task view)
34. Create `/dashboard/activities/+page.server.ts` (activity log loading)
35. Create `/dashboard/activities/+page.svelte` ("My Activities" tab)
36. Create `/dashboard/activities/audit/+page.server.ts` (admin audit log loading)
37. Create `/dashboard/activities/audit/+page.svelte` (admin "Audit Logs" tab)
38. Create `/dashboard/notifications/+page.server.ts` (notification center loading)
39. Create `/dashboard/notifications/+page.svelte` (notification center UI)

**Integration Test Tasks** (E2E with Playwright):
40. [P] Write E2E test for event creation + RSVP workflow
41. [P] Write E2E test for task assignment to employee
42. [P] Write E2E test for task assignment to department
43. [P] Write E2E test for activity log visibility (employee vs admin)
44. [P] Write E2E test for notification delivery (event + task)

**Documentation Tasks**:
45. Update README with new features (events, tasks, activities)
46. Add Storybook documentation for all new components
47. Update API documentation with new GraphQL operations

**Ordering Strategy**:
- **TDD order**: Contract tests (RED) → Implementation (GREEN) → Refactor
- **Dependency order**: Database schema → GraphQL operations → UI components → Pages
- **Parallel execution**: Tasks marked [P] can be worked on simultaneously (independent files)

**Estimated Output**: 47 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation

_These phases are beyond the scope of the /plan command_

**Phase 3**: Task execution (/tasks command creates tasks.md with 47 numbered tasks)
**Phase 4**: Implementation (execute tasks.md following TDD principles and constitutional requirements)
**Phase 5**: Validation (run tests, execute quickstart.md integration scenarios, performance validation <200ms)

## Complexity Tracking

_No constitutional violations detected - this section is empty._

All design decisions align with the SvelteHR Constitution v1.1.0:
- ✅ TDD workflow with contract tests first
- ✅ Strict TypeScript typing throughout
- ✅ Row-Level Security at database level
- ✅ Server-side data loading mandatory
- ✅ GraphQL operations <200ms target
- ✅ Svelte 5 runes for all components
- ✅ MCP-first development approach

## Progress Tracking

_This checklist is updated during execution flow_

**Phase Status**:

- [x] Phase 0: Research complete (/plan command) ✅
- [x] Phase 1: Design complete (/plan command) ✅
- [x] Phase 2: Task planning complete (/plan command - describe approach only) ✅
- [ ] Phase 3: Tasks generated (/tasks command) - NEXT STEP
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:

- [x] Initial Constitution Check: PASS ✅
- [x] Post-Design Constitution Check: PASS ✅
- [x] All NEEDS CLARIFICATION resolved (5 clarifications from /clarify session) ✅
- [x] Complexity deviations documented (none - no violations) ✅

---

_Based on Constitution v1.1.0 - See `/memory/constitution.md`_
_Follows established patterns from `tasks-operations.ts`, `dashboard/+page.server.ts`, and management pages_
_Ready for `/tasks` command to generate Phase 3 task breakdown_
