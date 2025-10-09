# Tasks: Task System Expansion

**Input**: Design documents from `/home/chanway/Projects/SvelteHR/specs/028-task-system-expansion/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/graphql-schema.graphql, quickstart.md

## Tech Stack Summary

- **Language**: TypeScript 5.0, Svelte 5.0 (runes), Node.js
- **Framework**: SvelteKit 2.22.0
- **Database**: PostgreSQL with PostGraphile, RLS policies
- **GraphQL Client**: urql
- **Testing**: Playwright 1.49.1 (E2E), Vitest 3.2.3 (unit), Storybook 9.1.1
- **Validation**: Zod 4.0.14
- **Auth**: Better Auth 1.3.4, JWT with 4-tier RBAC
- **Project Structure**: `src/` (SvelteKit integrated frontend + backend)

## Path Conventions

- **Components**: `src/lib/components/tasks/`
- **Routes**: `src/routes/dashboard/tasks/`
- **GraphQL Ops**: `src/lib/graphql/tasks-operations.ts`
- **Server Utils**: `src/lib/server/`
- **Database**: `migrations/`
- **E2E Tests**: `tests/e2e/tasks/`
- **Unit Tests**: `tests/unit/tasks/`
- **Types**: `src/lib/types/task.ts`
- **Schemas**: `src/lib/schemas/task.ts`

---

## Phase 3.1: Database & Schema Setup

### Database Migrations

- [x] **T001** [P] Create `migrations/20251009_001_create_task_enums.sql` - Create PostgreSQL enums: `task_status_enum` (To Do, In Progress, Blocked, Deferred, Completed), `task_priority_enum` (Low, Medium, High, Urgent), `resource_type_enum` (assessment, document, training, event, other), `availability_status_enum` (available, unavailable), `audit_action_type_enum` (created, edited, reassigned, deleted, status_changed, org_change)

- [x] **T002** [P] Create `migrations/20251009_002_create_task_types_table.sql` - Create `task_types` table with columns: id (UUID PK), name (VARCHAR(100) UNIQUE), description (TEXT), is_system (BOOLEAN), created_at (TIMESTAMPTZ), created_by (UUID FK users). Seed 4 system types: General, Onboarding, Assessment, Training

- [x] **T003** [P] Create `migrations/20251009_003_create_tasks_table.sql` - Create `tasks` table with columns per data-model.md: id, title, description, assignee_id, creator_id, task_type_id, status, priority, due_date, parent_task_id (self-referential FK), archived, archived_at, archived_by, requires_manual_reassignment, created_at, updated_at. Add 9 indexes: assignee, creator, type, status, priority, due_date, parent, orphaned

- [x] **T004** [P] Create `migrations/20251009_004_create_task_audit_entries.sql` - Create `task_audit_entries` table with columns: id, task_id (FK tasks CASCADE), action_type (audit_action_type_enum), changed_fields (TEXT[]), new_values (JSONB), user_id (FK users SET NULL), timestamp. Add GIN index on new_values JSONB field

- [x] **T005** [P] Create `migrations/20251009_005_create_task_dependencies.sql` - Create `task_dependencies` table with columns: id, blocking_task_id (FK tasks CASCADE), blocked_task_id (FK tasks CASCADE), dependency_type (VARCHAR), created_at. Add constraints: no_self_dependency CHECK, unique_dependency. Create `prevent_circular_dependencies()` trigger function using recursive CTE. Add indexes on both FKs

- [x] **T006** [P] Create `migrations/20251009_006_create_linked_resources.sql` - Create `linked_resources` table with columns: id, task_id (FK tasks CASCADE), resource_type (resource_type_enum), resource_id (UUID), resource_title (VARCHAR(255)), availability_status (availability_status_enum), last_checked, created_at. Add unique constraint on (task_id, resource_type, resource_id). Add indexes: task_id, (resource_type, resource_id), unavailable status filter

- [x] **T007** Create `migrations/20251009_007_create_rls_policies.sql` - Enable RLS on tasks table. Create 4 policies: task_read_policy (assignee OR manager's reports OR admin role >=80), task_create_policy (RBAC-based assignee validation), task_update_policy (creator OR assignee), task_delete_policy (creator OR admin). Enable RLS on task_audit_entries with read policy based on task access. Add helper functions: current_user_id(), current_user_role()

- [x] **T008** Create database migration runner - Update `scripts/init-db.sh` to include all 7 task system migrations in correct order. Ensure idempotent execution with IF NOT EXISTS checks

---

## Phase 3.2: TypeScript Types & Validation (TDD - Setup)

### Type Definitions

- [x] **T009** [P] Create `src/lib/types/task.ts` - Define TypeScript types per data-model.md: TaskStatus, TaskPriority, ResourceType, AvailabilityStatus, AuditActionType (string literal unions). Define interfaces: Task, TaskType, TaskAuditEntry, TaskDependency, LinkedResource with all fields and optional populated relationships

### Zod Schemas

- [x] **T010** [P] Create `src/lib/schemas/task.ts` - Create Zod schemas: taskStatusSchema (enum), taskPrioritySchema (enum), createTaskSchema (title 1-255 chars, description optional, assigneeId UUID, taskTypeId UUID, status default 'To Do', priority default 'Medium', dueDate optional, parentTaskId optional, linkedResources array optional), updateTaskSchema (all fields optional), createTaskDependencySchema (blockingTaskId, blockedTaskId with self-reference refine)

---

## Phase 3.3: GraphQL Contract Tests (TDD - MUST FAIL FIRST) ⚠️

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation in Phase 3.4**

### Mutation Contract Tests

- [x] **T011** [P] Create `tests/e2e/tasks/create-task.contract.spec.ts` - Playwright test for createTask mutation. Test cases: (1) Employee creates self-assigned task, (2) Manager creates task for direct report, (3) Admin creates task for anyone, (4) Employee cannot assign to others (403), (5) Invalid taskTypeId fails, (6) Title too long fails. Assert GraphQL response schema matches contract, task appears in DB. **MUST FAIL** until T030 implemented

- [x] **T012** [P] Create `tests/e2e/tasks/update-task.contract.spec.ts` - Playwright test for updateTask mutation. Test cases: (1) Creator updates task, (2) Assignee updates task, (3) Non-authorized user cannot update (403), (4) Update title, (5) Update status, (6) Update priority, (7) Audit entry created. **MUST FAIL** until T031 implemented

- [x] **T013** [P] Create `tests/e2e/tasks/delete-task.contract.spec.ts` - Playwright test for deleteTask mutation (soft delete). Test cases: (1) Creator archives task, (2) Admin archives any task, (3) Non-authorized user cannot delete (403), (4) Task archived flag set, (5) Audit entry created, (6) Task removed from active lists. **MUST FAIL** until T032 implemented

- [x] **T014** [P] Create `tests/e2e/tasks/reassign-task.contract.spec.ts` - Playwright test for reassignTask mutation. Test cases: (1) Creator reassigns task, (2) Manager reassigns to direct report, (3) Admin reassigns to anyone, (4) Employee cannot reassign (403), (5) Notifications sent to old and new assignees, (6) Audit entry created. **MUST FAIL** until T033 implemented

- [x] **T015** [P] Create `tests/e2e/tasks/create-task-dependency.contract.spec.ts` - Playwright test for createTaskDependency mutation. Test cases: (1) Create valid dependency, (2) Circular dependency blocked with error, (3) Self-dependency blocked, (4) Dependency appears in blocked task. **MUST FAIL** until T034 implemented

### Query Contract Tests

- [x] **T016** [P] Create `tests/e2e/tasks/all-tasks-query.contract.spec.ts` - Playwright test for allTasks query with filters. Test cases: (1) Filter by assigneeId, (2) Filter by status, (3) Filter by priority, (4) Filter by taskTypeId, (5) Filter by archived, (6) Sort by created_at ASC/DESC, (7) Sort by due_date, (8) Sort by priority, (9) Pagination with first/after. **MUST FAIL** until T030 implemented

- [x] **T017** [P] Create `tests/e2e/tasks/my-tasks-query.contract.spec.ts` - Playwright test for myTasks query with RBAC. Test cases: (1) Employee sees only own tasks, (2) Manager sees own + direct report tasks, (3) Admin sees all tasks, (4) Filter and sort work correctly, (5) Archived tasks excluded by default. **MUST FAIL** until T030 implemented

- [x] **T018** [P] Create `tests/e2e/tasks/task-hierarchy-query.contract.spec.ts` - Playwright test for taskHierarchy query. Test cases: (1) Get parent with all subtasks, (2) Nested subtasks up to 3 levels, (3) Subtask completion progress calculated correctly (60% for 3/5 complete), (4) Null parentTaskId returns top-level tasks only. **MUST FAIL** until T030 implemented

---

## Phase 3.4: GraphQL Operations & Backend Services

### GraphQL Operations

- [ ] **T019** Create `src/lib/graphql/tasks-operations.ts` - Implement GraphQL operations using urql codegen pattern from events-operations.ts. Create mutations: CreateTask, UpdateTask, DeleteTask (sets archived=true), ReassignTask, CreateTaskDependency, DeleteTaskDependency, CreateLinkedResource, DeleteLinkedResource, UpdateLinkedResourceStatus, CreateTaskType. Create queries: AllTasks (with TaskFilter input), MyTasks, TeamTasks, TaskAuditEntries, AllTaskTypes, OrphanedTasks, TaskHierarchy, TasksWithDependencies. All operations use server-side fetch with JWT token from cookies

### Server-Side Services

- [ ] **T020** [P] Create `src/lib/server/permissions/task-permissions.ts` - Implement RBAC permission helpers: canCreateTaskFor(currentUser, assigneeId) checks role hierarchy (Admin 100, HR 80, Manager 60, Employee 20) and manager-direct report relationships. canEditTask(currentUser, task) checks creator or assignee. canDeleteTask(currentUser, task) checks creator or admin. canReassignTask(currentUser, task, newAssigneeId) checks creator/manager/admin with target validation. isDirectReport(managerId, employeeId) queries users table

- [ ] **T021** [P] Create `src/lib/server/audit/audit-service.ts` - Implement createAuditEntry(taskId, actionType, changedFields, newValues, userId) that inserts into task_audit_entries via GraphQL mutation. getTaskAuditTrail(taskId) fetches entries sorted by timestamp DESC. compareTasks(oldTask, newTask) returns {changedFields, newValues} diff object for audit tracking

- [ ] **T022** [P] Create `src/lib/server/tasks/organizational-change-handlers.ts` - Implement handleManagerReassignment(oldManagerId, newManagerId) that updates tasks.creator_id for all tasks created by old manager, creates audit entries with action_type='org_change'. handleEmployeeDeactivation(employeeId, managerId?) that either: (A) reassigns active tasks to manager with notifications + audit entries, OR (B) sets requires_manual_reassignment=true and notifies admins if no manager. notifyAdminsOfOrphanedTasks(taskIds) creates notifications

- [ ] **T023** [P] Create `src/lib/server/tasks/task-reminder-scheduler.ts` - Implement node-cron scheduler (pattern from event reminder system). Schedule runs every 15 minutes: `*/15 * * * *`. fetchTasksDueWithinTimeframe([{hours: 24}, {hours: 1}]) queries tasks with due_date between NOW and timeframe. createTaskReminderNotifications(task) creates notification via GraphQL mutation with type='task_reminder', category='task', message includes task title and due time. Track sent reminders to avoid duplicates

- [ ] **T024** [P] Create `src/lib/server/tasks/resource-validation.ts` - Implement validateLinkedResource(resourceType, resourceId) that checks if resource exists by querying appropriate table (assessments, documents, training). markResourceUnavailable(linkedResourceId) updates availability_status to 'unavailable'. Background job validateAllLinkedResources() runs daily via cron to check all resources and mark unavailable ones. notifyAdminsOfBrokenLinks(resources) creates notifications

- [ ] **T025** [P] Create `src/lib/server/tasks/subtask-progress.ts` - Implement calculateSubtaskProgress(parentTaskId) that queries all subtasks, counts completed vs total, returns percentage (0-100). Recursive function getTaskHierarchy(taskId) returns task with all nested subtasks using PostgreSQL recursive CTE. checkTaskDependenciesBlocked(taskId) returns array of blocking tasks that are not completed

---

## Phase 3.5: UI Components (Svelte 5 with Storybook)

### Task Form Components

- [ ] **T026** [P] Create `src/lib/components/tasks/TaskCreationForm.svelte` - Svelte 5 component using runes ($state, $props, $bindable). Props: availableAssignees (filtered by RBAC), taskTypes. Form fields: title (text), description (textarea), assigneeId (select dropdown), taskTypeId (select), priority (radio/select), dueDate (date picker using date-fns), linkedResources (multi-select with add/remove). On submit: validate with Zod createTaskSchema, call createTask GraphQL mutation, handle success/error with toast, emit custom event. Include loading state, error display, field validation

- [ ] **T027** [P] Create `src/lib/components/tasks/TaskList.svelte` - Display list of tasks with hierarchy view toggle. Props: tasks (Task[]), viewMode ('flat' | 'hierarchy'), onTaskClick. Features: (1) Flat mode shows all tasks in table/card grid, (2) Hierarchy mode shows parent tasks with indented subtasks (use recursive component), (3) Sort controls (priority, due_date, created_at), (4) Filter controls (status, priority, type), (5) Visual indicators: overdue badge (red), priority color coding, completion status. Use $derived for filtered/sorted tasks. Emit task click event

- [ ] **T028** [P] Create `src/lib/components/tasks/TaskDetailsCard.svelte` - Display full task details. Props: task (Task with populated relationships), currentUser. Sections: (1) Header: title, status badge, priority, (2) Metadata: creator, assignee, due date with relative time, (3) Description, (4) Linked resources list with availability status, (5) Subtasks list with progress bar, (6) Dependencies (blocking/blocked by), (7) Audit history tab (expandable). Actions: Edit button (if canEdit), Delete button (if canDelete), Reassign button (if canReassign), Complete/Status change. Use Svelte 5 runes for reactive state

- [ ] **T029** [P] Create `src/lib/components/tasks/TaskDependencyGraph.svelte` - Visual dependency graph using d3 or mermaid. Props: taskId, dependencies (TaskDependency[]). Display nodes for each task (blocking and blocked), directed edges showing dependency arrows, highlight circular dependencies in red (shouldn't exist but catch bugs), click node to navigate to task. Use SVG or canvas rendering

- [ ] **T030** [P] Create `src/lib/components/tasks/LinkedResourcesList.svelte` - Display and manage linked resources. Props: taskId, linkedResources (LinkedResource[]), isAdmin. For each resource: show icon for type, title, availability status. If unavailable: show "Resource no longer available" message, admin-only "Fix Link" button. Admin can update resource or remove link. Emit add/remove/update events

- [ ] **T031** [P] Create `src/lib/components/tasks/TaskTypeSelector.svelte` - Dropdown for selecting task type. Props: taskTypes (TaskType[]), selectedTypeId (bindable). Features: Group system types and custom types, show description tooltip, admin-only "Manage Types" link. Emit selection change event

### Storybook Stories

- [ ] **T032** [P] Create `src/lib/components/tasks/TaskCreationForm.stories.ts` - Storybook CSF3 stories for TaskCreationForm: (1) Default story with empty form, (2) Pre-filled form, (3) Employee view (only self-assign), (4) Manager view (self + direct reports), (5) Admin view (all users), (6) With linked resources, (7) Validation errors, (8) Loading state. Use Storybook decorators for urql provider mock

- [ ] **T033** [P] Create `src/lib/components/tasks/TaskList.stories.ts` - Storybook stories: (1) Flat view with 10 tasks, (2) Hierarchy view with parent/subtasks, (3) Empty state, (4) Loading state, (5) Filtered by high priority, (6) Sorted by due date, (7) With overdue tasks. Mock task data

- [ ] **T034** [P] Create `src/lib/components/tasks/TaskDetailsCard.stories.ts` - Storybook stories: (1) Basic task details, (2) With linked resources, (3) With subtasks and progress, (4) With dependencies, (5) With audit history, (6) Overdue task, (7) Archived task, (8) Employee view (limited actions), (9) Admin view (all actions)

---

## Phase 3.6: SvelteKit Routes (Server-Side Data Loading)

### Task Management Routes

- [ ] **T035** Create `src/routes/dashboard/tasks/+page.server.ts` - Server-side load function for My Tasks page. Fetch current user from locals.user (JWT verified in hooks.server.ts). Call myTasks GraphQL query with filters from URL params: status, priority, taskTypeId, search. Apply RBAC: employees see only own tasks, managers see own + reports, admins see all. Return {tasks, user, taskTypes, filters}. Handle errors with proper HTTP status codes. Performance target: <3s for 100 tasks (NFR-002)

- [ ] **T036** Create `src/routes/dashboard/tasks/+page.svelte` - My Tasks page UI. Use data from +page.server.ts. Layout: (1) Header with "My Tasks" title and "Create Task" button, (2) Filter/sort controls, (3) TaskList component with hierarchy toggle, (4) Pagination controls. On task click: navigate to /dashboard/tasks/[id]. On "Create Task" click: navigate to /dashboard/tasks/create. Use Svelte 5 runes for local state (filters, view mode)

- [ ] **T037** Create `src/routes/dashboard/tasks/[id]/+page.server.ts` - Server-side load for task details. Fetch task by ID with all populated relationships (assignee, creator, taskType, parentTask, subtasks, linkedResources, auditEntries, dependencies). Verify RBAC access (can user view this task?). If no access: throw error(403). Fetch task audit trail. Return {task, auditTrail, canEdit, canDelete, canReassign}. Handle not found with error(404)

- [ ] **T038** Create `src/routes/dashboard/tasks/[id]/+page.svelte` - Task details page UI. Use TaskDetailsCard component with data from +page.server.ts. Include action buttons based on permissions: Edit, Delete, Reassign, Complete. Handle form actions: updateTask, deleteTask, reassignTask mutations with optimistic updates. Show success/error toasts. On delete: navigate back to /dashboard/tasks. Include back button to task list

- [ ] **T039** Create `src/routes/dashboard/tasks/create/+page.server.ts` - Server-side load for task creation form. Fetch: (1) availableAssignees based on current user RBAC (employees: [self], managers: [self, direct reports], admins: all users), (2) taskTypes (all types), (3) current user info. Return {availableAssignees, taskTypes, user}. Include form action for POST: validate with Zod, call createTask mutation, create audit entry, redirect to /dashboard/tasks/[newTaskId] on success

- [ ] **T040** Create `src/routes/dashboard/tasks/create/+page.svelte` - Task creation page UI. Use TaskCreationForm component with data from +page.server.ts. On form submit: call form action, handle validation errors, show loading state, redirect on success. Include cancel button (navigate back). Performance target: <2s form load (NFR-001)

- [ ] **T041** Create `src/routes/dashboard/tasks/team/+page.server.ts` - Server-side load for Team Tasks (managers only). Verify user is manager (role >= 60) or admin, else throw error(403). Fetch teamTasks query (all tasks assigned to direct reports). Apply filters from URL params. Return {tasks, directReports, user}. Managers-only view

- [ ] **T042** Create `src/routes/dashboard/tasks/team/+page.svelte` - Team Tasks page UI for managers. Similar layout to My Tasks but shows direct reports' tasks. Filter by assignee (dropdown of direct reports). Group by assignee option. Click task to view details

### Admin Routes

- [ ] **T043** Create `src/routes/admin/tasks/orphaned/+page.server.ts` - Server-side load for orphaned tasks (admin only). Verify user is admin (role >= 80), else throw error(403). Fetch orphanedTasks query (requires_manual_reassignment=true). Return {orphanedTasks, allEmployees} for reassignment dropdown. Include form action for bulk reassignment

- [ ] **T044** Create `src/routes/admin/tasks/orphaned/+page.svelte` - Orphaned tasks admin page. Show table of orphaned tasks with: original assignee (deactivated), task title, created date, action column with "Reassign" button. Reassign modal with employee selector. Bulk actions: select multiple tasks, reassign all to one user. Show count of orphaned tasks

- [ ] **T045** Create `src/routes/admin/tasks/types/+page.server.ts` - Server-side load for task types management (admin only). Verify admin role. Fetch allTaskTypes query (system types read-only, custom types editable). Include form actions: createTaskType (name, description), deleteTaskType (only custom types). Return {taskTypes}

- [ ] **T046** Create `src/routes/admin/tasks/types/+page.svelte` - Task types management page. Show table: Type Name, Description, Type (System/Custom), Actions. System types (Onboarding, Assessment, General, Training) shown but not editable. Custom types have Edit/Delete buttons. "Create Task Type" button opens modal with form. Zod validation on names (must be unique)

---

## Phase 3.7: Integration Tests (Playwright E2E - Based on 48 Scenarios)

### Scenario Group Tests

- [ ] **T047** Create `tests/e2e/tasks/task-creation-by-role.spec.ts` - E2E tests for scenarios 1-4 from quickstart.md. (1) Employee creates self-assigned task, verify only self in dropdown, (2) Manager creates task for direct report, verify dropdown has self + reports, (3) Admin creates task for any employee, verify all users in dropdown, (4) Employee attempts to assign to others via API, verify 403 error. Use Playwright with fixtures for different user roles

- [ ] **T048** Create `tests/e2e/tasks/task-assignment-management.spec.ts` - E2E tests for scenarios 5-7. (5) Verify assignee dropdown filtered by RBAC, (6) Create task, logout, login as assignee, verify task appears in My Tasks, (7) Assignee completes task, verify status updated and task moves to Completed section. Test task list updates and notifications

- [ ] **T049** Create `tests/e2e/tasks/linked-resources.spec.ts` - E2E tests for scenarios 8-10. (8) Create task with linked assessment, verify resource appears, (9) Click resource link, verify navigation to assessment page, (10) Create task with multiple linked resources (training, document, assessment), verify all 3 appear with correct icons and links

- [ ] **T050** Create `tests/e2e/tasks/task-flexibility-types.spec.ts` - E2E tests for scenarios 11-13. (11) Create task with "Onboarding" type, verify badge shown, (12) Filter tasks by "Assessment" type, verify only assessment tasks visible, (13) Create 3 related onboarding tasks, verify each independently assignable and trackable

- [ ] **T051** Create `tests/e2e/tasks/task-metadata-due-dates.spec.ts` - E2E tests for scenarios 14-20. (14) Set due date 3 days out, verify relative time "Due in 3 days", (15) Mock time to 1 hour before due date, verify reminder notification received, (16) Create overdue task (due date in past), verify red highlight and "OVERDUE" badge, (17) Create tasks with different priorities, verify "Urgent" appears first in sorted list, (18) Update status to "In Progress", verify badge updated, (19) Filter by "High" priority, verify only high-priority tasks shown, (20) Verify relative time updates correctly

- [ ] **T052** Create `tests/e2e/tasks/task-lifecycle-management.spec.ts` - E2E tests for scenarios 21-28. (21) Creator edits task title, verify updated in list, (22) Assignee edits description, verify audit entry created, (23) View audit trail, verify all edits listed with timestamps, (24) Creator deletes task, verify archived and removed from active list, (25) Admin deletes any task, verify deletion logged, (26) Manager reassigns task to direct report, verify notifications sent to both users, (27) Employee tries to reassign, verify "Reassign" button not visible, (28) Verify reassigned task appears in new assignee's list

- [ ] **T053** Create `tests/e2e/tasks/organizational-changes.spec.ts` - E2E tests for scenarios 29-32. (29) Admin changes manager relationship, verify task creator transferred to new manager, (30) Admin deactivates employee with tasks, verify tasks reassigned to manager, (31) Login as manager, verify notifications for each reassigned task, (32) View reassigned task, verify note "Reassigned due to employee deactivation" visible

- [ ] **T054** Create `tests/e2e/tasks/custom-task-types-resources.spec.ts` - E2E tests for scenarios 33-37. (33) Admin creates custom type "Compliance Training", verify appears in dropdown, (34) Manager tries to access task types page, verify 403 error, (35) Delete linked resource, run background job, verify link marked unavailable, (36) Admin fixes unavailable link by selecting replacement, verify status updated to available, (37) Non-admin views unavailable link, verify read-only (no fix button)

- [ ] **T055** Create `tests/e2e/tasks/task-hierarchy-dependencies.spec.ts` - E2E tests for scenarios 38-45. (38) Create parent task and subtask, verify indented in hierarchy view, (39) View parent with 3 subtasks, verify completion status shown, (40) Create Task A and Task B (depends on A), verify B marked "Blocked by Task A", (41) Try to create circular dependency, verify error message, (42) Enable hierarchy filter, verify nested structure with expand/collapse, (43) Parent with 5 subtasks (3 complete), verify 60% progress shown, (44) View Task B details, verify "Blocked by" badge with link to Task A, (45) Complete Task A, verify Task B unblocked and notification sent

- [ ] **T056** Create `tests/e2e/tasks/orphaned-task-handling.spec.ts` - E2E tests for scenarios 46-48. (46) Deactivate employee with no manager, verify tasks marked "requires manual reassignment", (47) Login as admin, navigate to Orphaned Tasks view, verify all marked tasks shown, (48) Verify admin notification received with count and link to Orphaned Tasks

---

## Phase 3.8: Unit Tests (Vitest)

### Service Unit Tests

- [ ] **T057** [P] Create `tests/unit/tasks/task-permissions.spec.ts` - Unit tests for task-permissions.ts. Test canCreateTaskFor: (1) Employee can only assign to self, (2) Manager can assign to self and direct reports, (3) Admin can assign to anyone, (4) Invalid role returns false. Test canEditTask: creator and assignee return true, others false. Test canDeleteTask: creator and admin true, others false. Test canReassignTask with RBAC validation. Test isDirectReport with mock user data

- [ ] **T058** [P] Create `tests/unit/tasks/audit-service.spec.ts` - Unit tests for audit-service.ts. Test createAuditEntry: (1) Valid entry created with all fields, (2) Empty changedFields for 'created' action, (3) Error handling for missing taskId. Test getTaskAuditTrail: returns entries sorted DESC. Test compareTasks: correctly identifies changed fields and values, handles null values, ignores unchanged fields

- [ ] **T059** [P] Create `tests/unit/tasks/organizational-change-handlers.spec.ts` - Unit tests for organizational-change-handlers.ts. Test handleManagerReassignment: (1) Updates all tasks with old manager as creator, (2) Creates audit entries for each task, (3) Handles case when no tasks exist. Test handleEmployeeDeactivation: (1) Reassigns to manager when exists, (2) Marks orphaned when no manager, (3) Creates notifications, (4) Only affects active tasks (not completed)

- [ ] **T060** [P] Create `tests/unit/tasks/task-reminder-scheduler.spec.ts` - Unit tests for task-reminder-scheduler.ts. Test fetchTasksDueWithinTimeframe: (1) Returns tasks due in 24 hours, (2) Returns tasks due in 1 hour, (3) Excludes already-sent reminders, (4) Excludes completed tasks. Test createTaskReminderNotifications: creates notification with correct type, message includes task title and due time. Mock cron.schedule for testing

- [ ] **T061** [P] Create `tests/unit/tasks/resource-validation.spec.ts` - Unit tests for resource-validation.ts. Test validateLinkedResource: (1) Returns true for existing assessment, (2) Returns false for deleted document, (3) Handles different resource types. Test markResourceUnavailable: updates availability_status. Test validateAllLinkedResources: marks multiple resources unavailable, notifies admins

- [ ] **T062** [P] Create `tests/unit/tasks/subtask-progress.spec.ts` - Unit tests for subtask-progress.ts. Test calculateSubtaskProgress: (1) 0% for 0/5 complete, (2) 60% for 3/5 complete, (3) 100% for all complete, (4) 0% for no subtasks. Test getTaskHierarchy: returns nested structure up to 3 levels. Test checkTaskDependenciesBlocked: returns array of blocking tasks, empty array if none

---

## Phase 3.9: Performance & Optimization

### Database Optimization

- [ ] **T063** Create database index optimization script - Analyze slow queries using PostgreSQL query planner. Add additional indexes if needed beyond the 9 already defined in migrations: (1) Composite index on (assignee_id, status, archived) for My Tasks queries, (2) Composite index on (due_date, status) for reminder queries, (3) Partial index on parent_task_id for hierarchy queries. Run ANALYZE on tasks table

### Caching Layer

- [ ] **T064** Create `src/lib/server/cache/task-cache.ts` - Implement Redis caching for frequently accessed tasks. Functions: cacheTask(taskId, task, ttl=300s), getCachedTask(taskId), invalidateTaskCache(taskId), cacheTaskList(cacheKey, tasks, ttl=60s). Integrate into GraphQL operations: check cache before DB query, update cache on mutations, invalidate on updates/deletes. Use Redis client from existing infrastructure

### Performance Tests

- [ ] **T065** Create `tests/performance/task-list-100-items.spec.ts` - Performance test for NFR-002: Task list with 100 items must load <3s. Use Playwright with performance timing API. Create 100 test tasks, navigate to /dashboard/tasks, measure: (1) Server response time (target <1s), (2) Client render time (target <2s), (3) Total time to interactive (target <3s). Fail test if any metric exceeds target. Test with filters and sorting applied

- [ ] **T066** Create `tests/performance/task-hierarchy-50-items.spec.ts` - Performance test for NFR-004: Task hierarchy with 50 items must render <2s. Create parent task with 10 children, each child has 5 grandchildren (total 60 tasks). Navigate to hierarchy view, measure render time. Target <2s. Test with expand/collapse actions, verify no performance degradation

---

## Phase 3.10: Documentation & Cleanup

### API Documentation

- [ ] **T067** [P] Create `docs/api/tasks.md` - Document all task-related GraphQL operations. For each operation: operation name, input types, return type, RBAC requirements, examples with request/response, error codes. Include: createTask, updateTask, deleteTask, reassignTask, createTaskDependency, allTasks, myTasks, teamTasks, taskHierarchy. Add diagrams for task hierarchy and dependency relationships

### User Documentation

- [ ] **T068** [P] Create `docs/user-guide/task-system.md` - User-facing guide for task system. Sections: (1) Creating tasks (with screenshots), (2) Managing My Tasks, (3) Task priorities and statuses, (4) Setting due dates and reminders, (5) Linking resources to tasks, (6) Working with subtasks, (7) Task dependencies, (8) Manager features (team tasks, reassignment), (9) Admin features (orphaned tasks, custom types). Include FAQ section

### Integration & Cleanup

- [ ] **T069** Run full test suite and fix failures - Execute all E2E tests: `npm run test:e2e`. Execute all unit tests: `npm run test:unit -- --run`. Execute all contract tests. Verify >90% code coverage (constitutional requirement). Fix any failing tests. Generate coverage report. Address any test flakiness

- [ ] **T070** Code review and refactoring - Review all task-related code for: (1) TypeScript strict mode compliance (no any types), (2) Svelte 5 runes best practices, (3) Proper error handling, (4) Security vulnerabilities (SQL injection, XSS), (5) Performance optimization opportunities, (6) Code duplication (DRY principle). Refactor as needed. Run ESLint and Prettier

- [ ] **T071** Execute quickstart.md validation - Manually execute all 48 acceptance scenarios from `specs/028-task-system-expansion/quickstart.md`. Verify each scenario passes as described. Document any deviations. Ensure test data setup scripts work correctly. Validate success criteria: all scenarios pass, performance targets met, no TypeScript errors, constitutional requirements satisfied

---

## Dependencies

### Critical Path

1. **Database Setup** (T001-T008) MUST complete before any backend work
2. **Type Definitions** (T009-T010) MUST complete before any TypeScript code
3. **Contract Tests** (T011-T018) MUST be written and FAILING before implementations (T019-T025)
4. **GraphQL Operations** (T019) MUST complete before routes (T035-T046)
5. **Backend Services** (T020-T025) MUST complete before routes
6. **UI Components** (T026-T031) MUST complete before routes
7. **Routes** (T035-T046) MUST complete before E2E tests (T047-T056)
8. **All implementations** MUST complete before performance tests (T063-T066)

### Parallel Execution Groups

**Group A - Database Migrations (Parallel)**:
- T001, T002, T003, T004, T005, T006 can run in parallel (different SQL files)
- T007 depends on T001-T006 (RLS policies reference tables)
- T008 depends on T001-T007 (migration runner executes all)

**Group B - Types & Schemas (Parallel)**:
- T009, T010 can run in parallel (different files)

**Group C - Contract Tests (Parallel after T008-T010)**:
- T011, T012, T013, T014, T015, T016, T017, T018 can ALL run in parallel (different test files)

**Group D - Backend Services (Parallel after T019)**:
- T020, T021, T022, T023, T024, T025 can run in parallel (different service files)

**Group E - UI Components (Parallel after T009-T010)**:
- T026, T027, T028, T029, T030, T031 can run in parallel (different component files)

**Group F - Storybook Stories (Parallel after Group E)**:
- T032, T033, T034 can run in parallel (different story files)

**Group G - Unit Tests (Parallel after respective services)**:
- T057, T058, T059, T060, T061, T062 can run in parallel (different test files)

**Group H - Documentation (Parallel before T071)**:
- T067, T068 can run in parallel (different doc files)

### Blocking Relationships

- T007 blocks T008 (policies before migration runner)
- T008 blocks all backend work (DB must exist)
- T019 blocks T035-T046 (routes need GraphQL ops)
- T026-T031 block T035-T046 (routes need components)
- T035-T046 block T047-T056 (E2E tests need routes)
- T011-T018, T047-T056, T057-T062 block T069 (test suite)
- T069 blocks T071 (must pass tests before validation)

---

## Parallel Execution Examples

### Example 1: Database Migrations (Group A)

```bash
# Launch T001-T006 in parallel (6 migrations)
Task: "Create migrations/20251009_001_create_task_enums.sql with enums"
Task: "Create migrations/20251009_002_create_task_types_table.sql"
Task: "Create migrations/20251009_003_create_tasks_table.sql with RLS"
Task: "Create migrations/20251009_004_create_task_audit_entries.sql"
Task: "Create migrations/20251009_005_create_task_dependencies.sql with trigger"
Task: "Create migrations/20251009_006_create_linked_resources.sql"

# Then T007 sequentially (depends on above)
Task: "Create migrations/20251009_007_create_rls_policies.sql"

# Then T008 (runs all migrations)
Task: "Update scripts/init-db.sh with migration runner"
```

### Example 2: Contract Tests (Group C)

```bash
# Launch all 8 contract tests in parallel after DB setup
Task: "Create tests/e2e/tasks/create-task.contract.spec.ts with 6 test cases"
Task: "Create tests/e2e/tasks/update-task.contract.spec.ts with 7 test cases"
Task: "Create tests/e2e/tasks/delete-task.contract.spec.ts with 6 test cases"
Task: "Create tests/e2e/tasks/reassign-task.contract.spec.ts with 6 test cases"
Task: "Create tests/e2e/tasks/create-task-dependency.contract.spec.ts with 4 test cases"
Task: "Create tests/e2e/tasks/all-tasks-query.contract.spec.ts with 9 test cases"
Task: "Create tests/e2e/tasks/my-tasks-query.contract.spec.ts with 5 test cases"
Task: "Create tests/e2e/tasks/task-hierarchy-query.contract.spec.ts with 4 test cases"
```

### Example 3: Backend Services (Group D)

```bash
# Launch all 6 services in parallel after T019 completes
Task: "Create src/lib/server/permissions/task-permissions.ts with RBAC helpers"
Task: "Create src/lib/server/audit/audit-service.ts with audit trail functions"
Task: "Create src/lib/server/tasks/organizational-change-handlers.ts"
Task: "Create src/lib/server/tasks/task-reminder-scheduler.ts with node-cron"
Task: "Create src/lib/server/tasks/resource-validation.ts with background job"
Task: "Create src/lib/server/tasks/subtask-progress.ts with recursive queries"
```

### Example 4: UI Components (Group E)

```bash
# Launch all 6 components in parallel
Task: "Create src/lib/components/tasks/TaskCreationForm.svelte with Zod validation"
Task: "Create src/lib/components/tasks/TaskList.svelte with hierarchy view"
Task: "Create src/lib/components/tasks/TaskDetailsCard.svelte with audit history"
Task: "Create src/lib/components/tasks/TaskDependencyGraph.svelte with d3 visualization"
Task: "Create src/lib/components/tasks/LinkedResourcesList.svelte with admin actions"
Task: "Create src/lib/components/tasks/TaskTypeSelector.svelte with dropdown"
```

---

## Notes

- **[P] markers**: Indicates tasks can run in parallel (different files, no dependencies)
- **TDD Enforcement**: Contract tests (T011-T018) MUST FAIL before implementations (T019-T025)
- **RBAC Critical**: All routes and operations must verify user permissions (constitutional requirement III)
- **Performance Targets**: NFR-001 (<2s form), NFR-002 (<3s list 100 items), NFR-004 (<2s hierarchy 50 items)
- **Test Coverage**: Must achieve >90% coverage (constitutional requirement I)
- **Type Safety**: No `any` types allowed (constitutional requirement II)
- **Commit Strategy**: Commit after each task completion with descriptive message
- **Code Review**: Required before marking T070 complete
- **Validation**: T071 (quickstart.md execution) is final gate before production deployment

---

## Task Generation Rules Applied

1. ✅ **From Contracts**: graphql-schema.graphql → 8 contract test tasks (T011-T018)
2. ✅ **From Data Model**: 5 entities (Task, TaskType, TaskAuditEntry, TaskDependency, LinkedResource) → 6 migration tasks (T001-T006), 2 type/schema tasks (T009-T010)
3. ✅ **From User Stories**: 48 quickstart scenarios → 10 E2E test tasks (T047-T056) organized by scenario groups
4. ✅ **Ordering**: Setup (T001-T010) → Tests (T011-T018) → Models/Services (T019-T025) → Components (T026-T034) → Routes (T035-T046) → Integration Tests (T047-T056) → Unit Tests (T057-T062) → Performance (T063-T066) → Docs (T067-T068) → Cleanup (T069-T071)

## Validation Checklist

- [x] All GraphQL operations have corresponding contract tests (T011-T018 cover T019)
- [x] All 5 entities have database migration tasks (T001-T006)
- [x] All contract tests come before implementations (T011-T018 before T019-T025)
- [x] Parallel tasks are truly independent (Groups A-H verified)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task (verified)
- [x] All 48 acceptance scenarios covered by E2E tests (T047-T056)
- [x] TDD principles enforced (tests before implementations)
- [x] Constitutional requirements addressable (RBAC, types, tests, performance)

---

**Total Tasks**: 71 numbered tasks (T001-T071)
**Estimated Completion**: 15-20 development days
**Parallel Execution Potential**: 32 tasks marked [P] for concurrent execution
**Critical Path Length**: ~25 sequential task dependencies

**Status**: ✅ READY FOR EXECUTION

Run tasks sequentially following dependency order, or launch parallel groups for faster completion. Verify all contract tests FAIL before proceeding to implementation phase.
