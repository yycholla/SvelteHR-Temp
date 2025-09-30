# Tasks: Management Pages Repair & Admin Implementation

**Input**: Design documents from `/home/chanway/Projects/SvelteHR/specs/016-repair-management-pages/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md
**Feature Branch**: `016-repair-management-pages`

## Execution Flow (main)

```
1. Load plan.md from feature directory ✅
   → Tech stack: TypeScript 5.0, Svelte 5.0, SvelteKit 2.22.0, PostGraphile, PostgreSQL
   → Structure: web - frontend (SvelteKit) + backend (PostGraphile GraphQL)
2. Load design documents ✅
   → data-model.md: 11 entities (Manager, Admin, Department, User, LeaveRequest, PerformanceReview, Goal, Task, Report, AuditLog, SystemSetting)
   → contracts/: 3 GraphQL files (graphql-schema.graphql, manager-operations.graphql, admin-operations.graphql)
   → research.md: 5 decisions (RLS policies, admin routes, theme system, dept transfer, schema validation)
   → quickstart.md: TDD workflow, test scenarios
3. Generate tasks by category ✅
   → Database: Migrations, RLS policies, schema validation
   → Tests: Contract tests (GraphQL), E2E tests (Playwright), unit tests (Vitest)
   → Manager CRUD: GraphQL operations, UI components
   → Admin Suite: 5 admin pages with RBAC guards
   → Theme: CSS variables, component audit
   → RBAC: Permission refresh, audit logging
   → Integration: Run all tests, performance validation
4. Apply task rules ✅
   → Different files = [P] for parallel execution
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001-T044 + T024a) ✅
6. Generated 45 tasks across 7 priorities ✅
```

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions

- **Web app structure**: `backend/src/`, `frontend/src/`
- **Tests**: `backend/tests/contract/`, `frontend/tests/e2e/`, `frontend/tests/unit/`
- **Database**: `backend/migrations/`
- All paths relative to repository root: `/home/chanway/Projects/SvelteHR/`

---

## 🔧 MCP-First Development Workflow (MANDATORY)

**Constitution VI requires MCP tools usage before and during every task. Follow this workflow:**

### Before Starting ANY Task:

1. **Check Onboarding**: `mcp__serena__check_onboarding_performed()`
2. **Read Relevant Memories**: `mcp__serena__list_memories()` → Read project context
3. **Discover File Structure**: `mcp__serena__list_dir('src/lib/graphql')` for target directory
4. **Find Target Files**: `mcp__serena__find_file('*operations.ts', 'src/lib/graphql')`

### Before Modifying Code:

5. **Analyze Symbols**: `mcp__serena__get_symbols_overview('path/to/file.ts')` to understand structure
6. **Search Patterns**: `mcp__serena__search_for_pattern('getUserPermissions')` to find existing patterns
7. **Check References**: `mcp__serena__find_referencing_symbols('functionName', 'path/to/file.ts')` before changes

### During Implementation:

8. **Think About Task**: `mcp__serena__think_about_task_adherence()` before major changes
9. **Surgical Edits**: Use `mcp__serena__replace_symbol_body()` or `mcp__serena__insert_after_symbol()` for precise modifications
10. **Validate Impact**: `mcp__serena__find_referencing_symbols()` to verify changes don't break dependencies

### After Completing Task:

11. **Review Information**: `mcp__serena__think_about_collected_information()` to validate approach
12. **Completion Check**: `mcp__serena__think_about_whether_you_are_done()` before marking complete
13. **Write Memory** (if complex): `mcp__serena__write_memory('feature-016-lessons', 'content')` for future reference

**Task Management**: Use Archon MCP as primary task tracking system (per CLAUDE.md), TodoWrite only for secondary tracking.

**⚠️  VIOLATION WARNING**: Using TodoWrite before Archon MCP or making code changes without Serena MCP analysis violates Constitution VI and will block task completion.

---

## Phase 3.1: Database Foundation (Priority 1)

**Purpose**: Establish database schema with proper tables, relationships, indexes, and RLS policies

- [x] **T001** [P] Create database migration for tasks table in `backend/migrations/20250930_create_tasks_table.sql`
  - Add tasks table: `id` (UUID PK), `assignee_id` (FK → users.id), `assigner_id` (FK → users.id), `department_id` (FK → departments.id), `title`, `description`, `priority`, `status`, `due_date`, `created_at`, `updated_at`, `completed_at`
  - Add foreign key constraints with ON DELETE CASCADE
  - Add CHECK constraints for priority (`low`, `medium`, `high`, `urgent`) and status (`todo`, `in_progress`, `review`, `done`)
  - Verify table exists: `SELECT table_name FROM information_schema.tables WHERE table_name = 'tasks'`

- [x] **T002** [P] Validate database schema in `backend/migrations/20250930_validate_schema.sql`
  - Verify required tables exist: departments, users, leave_requests, performance_reviews, goals, tasks, reports, audit_logs, system_settings
  - Verify foreign key constraints: users.department_id → departments.id, departments.manager_id → users.id
  - Verify leave_requests, performance_reviews, goals, tasks, reports have proper FKs to users and departments
  - Output validation report showing missing tables or broken constraints
  - Exit with code 1 if validation fails (CI/CD will catch deployment issues)

- [x] **T003** [P] Add performance indexes in `backend/migrations/20250930_add_performance_indexes.sql`
  - Create index on users.department_id: `CREATE INDEX idx_users_department_id ON hr_public.users(department_id)`
  - Create index on departments.manager_id: `CREATE INDEX idx_departments_manager_id ON hr_public.departments(manager_id)`
  - Create index on leave_requests.department_id: `CREATE INDEX idx_leave_requests_department_id ON hr_public.leave_requests(department_id)`
  - Create index on performance_reviews.department_id: `CREATE INDEX idx_performance_reviews_department_id ON hr_public.performance_reviews(department_id)`
  - Create index on goals.department_id: `CREATE INDEX idx_goals_department_id ON hr_public.goals(department_id)`
  - Create index on tasks.department_id: `CREATE INDEX idx_tasks_department_id ON hr_public.tasks(department_id)`
  - Create index on reports.department_id: `CREATE INDEX idx_reports_department_id ON hr_public.reports(department_id)`

---

## Phase 3.2: Tests First (TDD) (Priority 2) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Manager Operations Contract Tests

- [x] **T004** [P] Contract test for manager leave operations in `tests/contract/manager-leave-operations.test.ts`
  - Test `GetPendingLeaveRequests` query returns only department-scoped requests
  - Test `ApproveLeaveRequest` mutation succeeds for manager's department
  - Test `RejectLeaveRequest` mutation succeeds for manager's department
  - Test manager CANNOT approve requests from other departments (expect permission error)
  - Test `GetLeaveStatistics` query returns department-scoped statistics
  - Use setupTestManager() helper to create test manager with department assignment
  - Expected: ALL TESTS FAIL (GraphQL operations not implemented yet)

- [x] **T005** [P] Contract test for manager performance operations in `tests/contract/manager-performance-operations.test.ts`
  - Test `GetPerformanceReviews` query returns only department-scoped reviews
  - Test `CreatePerformanceReview` mutation succeeds for team member in manager's department
  - Test `UpdatePerformanceReview` mutation succeeds for manager's department
  - Test `DeletePerformanceReview` mutation succeeds for manager's department
  - Test manager CANNOT create/edit reviews for other departments (expect permission error)
  - Test `GetPerformanceStatistics` query returns department-scoped statistics
  - Expected: ALL TESTS FAIL (GraphQL operations not implemented yet)

- [x] **T006** [P] Contract test for manager goals operations in `tests/contract/manager-goals-operations.test.ts`
  - Test `GetGoals` query returns only department-scoped goals
  - Test `CreateGoal` mutation succeeds for team member in manager's department
  - Test `UpdateGoal` mutation succeeds for manager's department
  - Test `DeleteGoal` mutation succeeds for manager's department
  - Test manager CANNOT create/edit goals for other departments (expect permission error)
  - Test `GetGoalStatistics` query returns department-scoped statistics
  - Expected: ALL TESTS FAIL (GraphQL operations not implemented yet)

- [x] **T007** [P] Contract test for manager tasks operations in `tests/contract/manager-tasks-operations.test.ts`
  - Test `GetTasks` query returns only department-scoped tasks
  - Test `CreateTask` mutation succeeds for team member in manager's department
  - Test `UpdateTask` mutation succeeds for manager's department
  - Test `DeleteTask` mutation succeeds for manager's department
  - Test manager CANNOT assign tasks to other departments (expect permission error)
  - Expected: ALL TESTS FAIL (GraphQL operations not implemented yet)

- [x] **T008** [P] Contract test for manager reports operations in `tests/contract/manager-reports-operations.test.ts`
  - Test `GetHRReports` query returns only department-scoped reports
  - Test `CreateReport` mutation succeeds for manager's department
  - Test `UpdateReport` mutation succeeds for manager's department
  - Test `DeleteReport` mutation succeeds for manager's department
  - Test manager CANNOT generate reports for other departments (expect permission error)
  - Test `GetReportAnalytics` query returns department-scoped analytics
  - Expected: ALL TESTS FAIL (GraphQL operations not implemented yet)

### Admin Operations Contract Tests

- [x] **T009** [P] Contract test for admin operations in `tests/contract/admin-operations.test.ts`
  - Test admin can access `GetAllLeaveRequests` across all departments (no filtering)
  - Test admin can access `GetAllPerformanceReviews` across all departments
  - Test admin can access `GetAllGoals` across all departments
  - Test admin can access `GetAllTasks` across all departments
  - Test admin can access `GetAllReports` across all departments
  - Test admin can access `GetAuditLogs` with filtering by user, action, resource
  - Test admin can access `GetSystemSettings` by category
  - Test admin can update system settings via `UpdateSystemSetting` mutation
  - Test non-admin users CANNOT access admin operations (expect permission error)
  - Expected: ALL TESTS FAIL (GraphQL operations not implemented yet)

### E2E Tests for User Journeys

- [x] **T010** [P] E2E test for manager leave approvals journey in `tests/e2e/management/manager-leave-approvals.spec.ts`
  - Login as manager (manager@test.com)
  - Navigate to /dashboard/management/leave-approvals → verify "My Team" badge visible
  - Create test leave request for manager's department
  - Find request in table and click "Approve" button
  - Fill approval modal with review notes and submit
  - Verify success toast shows "Leave request approved"
  - Verify request status updated to "Approved" in table
  - Test rejection workflow with mandatory review notes
  - Test department filtering (manager cannot see other departments)
  - Test leave statistics display (department-scoped)
  - Expected: ALL TESTS FAIL (UI components not implemented yet)

- [x] **T011** [P] E2E test for manager performance reviews journey in `tests/e2e/management/manager-performance-reviews.spec.ts`
  - Login as manager and navigate to /dashboard/management/reviews
  - Create performance review for team member (ratings, strengths, areas for improvement)
  - Edit existing review and update ratings
  - Delete performance review with confirmation dialog
  - View performance statistics (completion rate, average ratings)
  - Filter reviews by status and period
  - Verify manager cannot create review for other department
  - Test validation errors for invalid ratings
  - Expected: ALL TESTS FAIL (UI components not implemented yet)

- [x] **T012** [P] E2E test for theme consistency in `tests/e2e/theme-consistency.spec.ts`
  - Login as manager
  - Navigate to each management page: leave-approvals, reviews, goals, reports, teams
  - For each page: toggle theme from light to dark
  - Verify card backgrounds change from white (#ffffff) to dark (#1f2937)
  - Verify card borders change from light (#e5e7eb) to dark (#374151)
  - Verify text remains readable with proper contrast ratios
  - Login as admin
  - Navigate to each admin page: users, settings, audit, analytics, compliance
  - For each page: toggle theme and verify card styling adapts
  - Verify analytics cards (charts, widgets) adapt to theme
  - Verify theme changes happen instantly without page refresh
  - Expected: ALL TESTS FAIL (theme system not implemented yet)

---

## Phase 3.3: Core Implementation (Priority 3) - ONLY after tests are failing

### Database RLS Policies

- [x] **T013** Add RLS policies for manager department-scoped access in `backend/migrations/20250930_add_rls_policies.sql`
  - Enable RLS on leave_requests, performance_reviews, goals, tasks, reports tables
  - Create policy `manager_department_access` for SELECT on each table (department_id matches manager's department)
  - Create policy `manager_department_update` for UPDATE on each table (department_id matches manager's department)
  - Create policy `manager_department_insert` for INSERT on each table (department_id matches manager's department)
  - Create policy `manager_department_delete` for DELETE on each table (department_id matches manager's department)
  - Create policy `admin_full_access` for ALL operations (admins bypass RLS)
  - Test policies by setting JWT claims and verifying data filtering
  - **Dependency**: T001, T002, T003 must pass (database schema validated)

### Manager GraphQL Operations

- [x] **T014** Implement leave management GraphQL operations in `frontend/src/lib/graphql/leave-management-operations.ts`
  - Replace stub `getPendingLeaveRequests` with real GraphQL query using `GET_PENDING_LEAVE_REQUESTS` from contracts/manager-operations.graphql
  - Implement `approveLeaveRequest` mutation with reviewerId and reviewNotes
  - Implement `rejectLeaveRequest` mutation with reviewerId and reviewNotes
  - Implement `getLeaveStatistics` query for department-scoped statistics
  - Add JWT token propagation via `userCredentials.accessToken`
  - Add proper error handling with user-friendly messages
  - **Dependency**: T004 must fail first (contract test written), T013 (RLS policies)
  - **Expected**: T004 tests should PASS after this implementation

- [x] **T015** Implement performance management GraphQL operations in `frontend/src/lib/graphql/performance-management-operations.ts`
  - Replace stub `getPerformanceReviews` with real GraphQL query using `GET_PERFORMANCE_REVIEWS` from contracts/manager-operations.graphql
  - Implement `createPerformanceReview` mutation with revieweeId, reviewerId, departmentId, ratings
  - Implement `updatePerformanceReview` mutation with review updates
  - Implement `deletePerformanceReview` mutation
  - Implement `getPerformanceStatistics` query for department-scoped statistics
  - Add JWT token propagation and error handling
  - **Dependency**: T005 must fail first, T013 (RLS policies)
  - **Expected**: T005 tests should PASS after this implementation

- [x] **T016** Implement goals/OKRs GraphQL operations in `frontend/src/lib/graphql/goals-okrs-operations.ts`
  - Replace stub `getGoals` with real GraphQL query using `GET_GOALS` from contracts/manager-operations.graphql
  - Implement `createGoal` mutation with userId, managerId, departmentId, title, description, quarter, year
  - Implement `updateGoal` mutation with goal updates (progress, status, target date)
  - Implement `deleteGoal` mutation
  - Implement `getGoalStatistics` query for department-scoped statistics
  - Add JWT token propagation and error handling
  - **Dependency**: T006 must fail first, T013 (RLS policies)
  - **Expected**: T006 tests should PASS after this implementation

- [x] **T017** [P] Create tasks GraphQL operations in `frontend/src/lib/graphql/tasks-operations.ts`
  - Implement `getTasks` query with department filtering using `GET_TASKS` from contracts/manager-operations.graphql
  - Implement `createTask` mutation with assigneeId, assignerId, departmentId, title, description, priority, dueDate
  - Implement `updateTask` mutation with task updates (title, description, priority, status, dueDate)
  - Implement `deleteTask` mutation
  - Add JWT token propagation and error handling
  - **Dependency**: T007 must fail first, T001 (tasks table created), T013 (RLS policies)
  - **Expected**: T007 tests should PASS after this implementation

- [x] **T018** Implement reports GraphQL operations in `frontend/src/lib/graphql/reports-operations.ts`
  - Replace stub `getHRReports` with real GraphQL query using `GET_HR_REPORTS` from contracts/manager-operations.graphql
  - Implement `createReport` mutation with creatorId, departmentId, title, reportType, category, filters
  - Implement `updateReport` mutation with report updates (title, status, filters)
  - Implement `deleteReport` mutation
  - Implement `getReportAnalytics` query for department-scoped analytics
  - Add JWT token propagation and error handling
  - **Dependency**: T008 must fail first, T013 (RLS policies)
  - **Expected**: T008 tests should PASS after this implementation

### Manager UI Components

- [x] **T019** Fix manager leave approvals page in `frontend/src/routes/dashboard/management/leave-approvals/+page.server.ts`
  - Verify UserSession structure uses correct properties (already fixed in previous session)
  - Update to use new `getPendingLeaveRequests` from T014
  - Add proper department filtering for managers (managedDepartmentId)
  - Verify `canApproveManagedTeamRequests` permission flag set correctly
  - Test manager can view only their department's requests
  - **Dependency**: T014 (leave operations implemented)
  - **Expected**: T010 leave approval tests should PASS

- [x] **T020** Fix manager performance reviews page in `frontend/src/routes/dashboard/management/reviews/+page.server.ts`
  - Update to use new `getPerformanceReviews` from T015
  - Add proper department filtering for managers
  - Implement create/edit review functionality
  - Add review form validation with Zod schemas
  - Verify `canEditManagedTeamReviews` permission flag set correctly
  - **Dependency**: T015 (performance operations implemented)
  - **Expected**: T010 performance review tests should PASS

- [x] **T021** Fix manager goals page in `frontend/src/routes/dashboard/management/goals/+page.server.ts`
  - Update to use new `getGoals` from T016
  - Add proper department filtering for managers
  - Implement create/edit/delete goal functionality
  - Add goal form validation (quarter format, year range, progress 0-100)
  - Display goal progress bars with proper styling
  - **Dependency**: T016 (goals operations implemented)
  - **Expected**: T010 goals tests should PASS

- [x] **T022** Fix manager reports page in `frontend/src/routes/dashboard/management/reports/+page.server.ts`
  - Update to use new `getHRReports` from T018
  - Add proper department filtering for managers
  - Implement report generation functionality
  - Display report analytics (type breakdown, category breakdown, run history)
  - Verify `canGenerateManagedTeamReports` permission flag set correctly
  - **Dependency**: T018 (reports operations implemented)
  - **Expected**: T010 reports tests should PASS

---

## Phase 3.4: Admin Suite (Priority 4)

### Admin Route Guards & Navigation

- [ ] **T023** [P] Create admin RBAC route guard in `frontend/src/routes/dashboard/admin/+layout.server.ts`
  - Check user has admin role: `locals.roles?.includes('admin') || locals.user.role === 'admin'`
  - Throw error(403, 'Insufficient permissions - Admin access required') for non-admins
  - Return `isAdmin: true` flag to all child routes
  - Add audit logging for admin page access attempts
  - **Dependency**: None (can run in parallel)

- [ ] **T024** Implement admin navigation in sidebar in `frontend/src/lib/components/navigation/Sidebar.svelte`
  - Add "Admin" section to sidebar below "Management" section
  - Show admin section only if `isAdmin` flag is true
  - Add navigation items: User Management, System Settings, Audit Logs, Analytics Dashboard, Compliance Reports
  - Add "All" badge next to admin navigation items (indicating unrestricted access)
  - Add icons for each admin page using lucide-svelte
  - **Dependency**: T023 (admin guard created)

- [ ] **T024a** [P] Implement manager navigation badges in `frontend/src/lib/components/navigation/NavigationBadge.svelte`
  - Create NavigationBadge component with variants: "my-team" (blue) and "all" (green)
  - Add to management navigation items (leave-approvals, reviews, goals, reports, teams)
  - Show "My Team" badge for managers (based on `isManager` flag)
  - Show "All" badge for admins on management pages (based on `isAdmin` flag)
  - Use Tailwind CSS for badge styling: `badge-blue` and `badge-green` classes
  - **Dependency**: T024 (sidebar navigation implemented)
  - **Covers**: FR-007, FR-011, FR-031

### Admin Pages Implementation

- [ ] **T025** Implement User Management admin page in `frontend/src/routes/dashboard/admin/users/+page.server.ts` and `+page.svelte`
  - Server: Load all users with pagination (first: 50, offset: 0)
  - Server: Implement user filtering (by role, department, status)
  - Server: Check admin permissions via RBAC guard
  - Client: Display users table with columns (email, display name, role, department, status)
  - Client: Add "Create User" button with modal form
  - Client: Implement create/edit/delete user actions
  - Client: Add role assignment dropdown (employee, manager, admin, hr_manager)
  - Client: Add department assignment dropdown
  - Client: Add user status toggle (active/inactive)
  - Verify GraphQL `CreateUser`, `UpdateUser`, `DeleteUser` mutations work
  - **Dependency**: T023 (admin guard), T009 (admin contract tests fail first)
  - **Expected**: T011 user management tests should PASS

- [ ] **T026** Implement System Settings admin page in `frontend/src/routes/dashboard/admin/settings/+page.server.ts` and `+page.svelte`
  - Server: Load system settings grouped by category (general, security, integrations, features)
  - Server: Check admin permissions
  - Client: Display settings as expandable sections by category
  - Client: Add setting value editors (text input, toggle, dropdown based on value type)
  - Client: Implement `UpdateSystemSetting` mutation on value change
  - Client: Add setting descriptions as help text
  - Client: Show "Public" badge for settings visible to non-admins
  - Client: Display last updated by admin name and timestamp
  - **Dependency**: T023 (admin guard), T009 (admin contract tests fail first)
  - **Expected**: T011 system settings tests should PASS

- [ ] **T027** Implement Audit Logs admin page in `frontend/src/routes/dashboard/admin/audit/+page.server.ts` and `+page.svelte`
  - Server: Load audit logs with pagination (first: 100, offset: 0)
  - Server: Implement filtering by userId, action, resource, date range, departmentId
  - Server: Check admin permissions
  - Client: Display audit logs table with columns (timestamp, user, action, resource, department, IP address)
  - Client: Add filter controls (date range picker, action dropdown, resource dropdown, user search)
  - Client: Add expandable row details showing metadata JSON
  - Client: Implement export to CSV functionality
  - Client: Add real-time updates via polling (every 60 seconds)
  - **Dependency**: T023 (admin guard), T009 (admin contract tests fail first)
  - **Expected**: T011 audit logs tests should PASS

- [ ] **T028** Implement Analytics Dashboard admin page in `frontend/src/routes/dashboard/admin/analytics/+page.server.ts` and `+page.svelte`
  - Server: Load organization-wide analytics via `GetOrganizationAnalytics` query
  - Server: Aggregate leave statistics (pending, approved, rejected, approval rate)
  - Server: Aggregate performance statistics (total reviews, completion rate, average ratings)
  - Server: Aggregate goal statistics (total goals, active, completed, completion rate)
  - Server: Aggregate report statistics (total reports, generated this month)
  - Server: Check admin permissions
  - Client: Display 4 metric cards at top (leave, performance, goals, reports)
  - Client: Add charts for trends (leave approval rate over time, performance ratings distribution)
  - Client: Add department comparison table
  - Client: Implement date range selector for analytics
  - **Dependency**: T023 (admin guard), T009 (admin contract tests fail first)
  - **Expected**: T011 analytics tests should PASS

- [ ] **T029** Implement Compliance Reports admin page in `frontend/src/routes/dashboard/admin/compliance/+page.server.ts` and `+page.svelte`
  - Server: Implement `GetComplianceReport` query with report type (data_retention, access_control, regulatory)
  - Server: Generate compliance data based on type (query audit logs, user access patterns, data retention policies)
  - Server: Check admin permissions
  - Client: Display report type selector (Data Retention, Access Control Audit, Regulatory Compliance)
  - Client: Add date range selector for report period
  - Client: Display report results in structured format (tables, summaries, recommendations)
  - Client: Add export to PDF functionality
  - Client: Show compliance score/status badges (compliant, warning, non-compliant)
  - **Dependency**: T023 (admin guard), T009 (admin contract tests fail first)
  - **Expected**: T011 compliance reports tests should PASS

---

## Phase 3.5: Theme Consistency (Priority 5)

- [ ] **T030** [P] Create centralized CSS custom properties in `frontend/src/app.css`
  - Define `:root` variables for light mode: `--card-bg-light: #ffffff`, `--card-border-light: #e5e7eb`, `--card-shadow-light: 0 1px 3px rgba(0,0,0,0.1)`, `--text-primary-light: #111827`, `--text-secondary-light: #6b7280`
  - Define `.dark` variables for dark mode: `--card-bg-dark: #1f2937`, `--card-border-dark: #374151`, `--card-shadow-dark: 0 1px 3px rgba(0,0,0,0.3)`, `--text-primary-dark: #f9fafb`, `--text-secondary-dark: #d1d5db`
  - Add Tailwind CSS 4.0 utility classes: `bg-[var(--card-bg)]`, `border-[var(--card-border)]`, `shadow-[var(--card-shadow)]`
  - **Dependency**: T012 must fail first (theme E2E tests written)

- [ ] **T031** [P] Create theme-aware card component in `frontend/src/lib/components/ui/Card.svelte`
  - Create Card component using CSS custom properties for background, border, shadow
  - Add variants: default, elevated, outlined
  - Add component props: variant, class (for additional styling)
  - Use Svelte 5 runes: `$props()` for component props
  - Export Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter components
  - Add documentation in Storybook
  - **Dependency**: T030 (CSS variables created)

- [ ] **T032** Audit and fix management pages theme in `frontend/src/routes/dashboard/management/`
  - Replace hardcoded colors in leave-approvals page with theme-aware Card component
  - Replace hardcoded colors in reviews page with theme-aware Card component
  - Replace hardcoded colors in goals page with theme-aware Card component
  - Replace hardcoded colors in reports page with theme-aware Card component
  - Replace hardcoded colors in teams page with theme-aware Card component
  - Verify all buttons, badges, table headers use Tailwind utility classes that respond to theme
  - Test theme switching on each page (light → dark → light)
  - **Dependency**: T031 (Card component created)
  - **Expected**: T012 management pages theme tests should PASS

- [ ] **T033** Audit and fix admin pages theme in `frontend/src/routes/dashboard/admin/`
  - Replace hardcoded colors in users page with theme-aware Card component
  - Replace hardcoded colors in settings page with theme-aware Card component
  - Replace hardcoded colors in audit page with theme-aware Card component
  - Replace hardcoded colors in analytics page with theme-aware Card component
  - Replace hardcoded colors in compliance page with theme-aware Card component
  - Verify all admin navigation items, badges, icons adapt to theme
  - Test theme switching on each admin page
  - **Dependency**: T031 (Card component created), T025-T029 (admin pages created)
  - **Expected**: T012 admin pages theme tests should PASS

- [ ] **T034** Implement theme store with reactive updates in `frontend/src/lib/stores/theme.ts`
  - Create writable store for theme state: `writable<'light' | 'dark'>('light')`
  - Load theme from localStorage on initialization
  - Subscribe to theme changes and update `<html class="dark">` attribute
  - Add `toggleTheme()` function to switch between light/dark
  - Add `setTheme(theme: 'light' | 'dark')` function
  - Persist theme changes to localStorage
  - Emit custom event for theme changes (for components that need to re-render)
  - **Dependency**: T030 (CSS variables created)
  - **Expected**: T012 theme switching tests should PASS (instant updates without refresh)

---

## Phase 3.6: RBAC & Permissions (Priority 6)

- [ ] **T035** [P] Write unit tests for RBAC utilities in `frontend/tests/unit/rbac-utils.test.ts`
  - Test `canEditDepartment(userId, departmentId)` returns true for manager of department
  - Test `canEditDepartment(userId, departmentId)` returns false for manager of different department
  - Test `canEditDepartment(userId, departmentId)` returns true for admin (any department)
  - Test `hasPermission(user, permission)` checks role hierarchy
  - Test `getRolePrecedence(roles)` returns 'admin' when both admin and manager roles present
  - Test `isManagerOfDepartment(userId, departmentId)` verifies manager assignment
  - Expected: ALL TESTS FAIL (RBAC utilities not implemented yet)

- [ ] **T036** Implement role precedence logic in `frontend/src/lib/server/rbac-utils.ts`
  - Create `getRolePrecedence(roles: string[]): string` function
  - Hierarchy: admin (100) > hr_manager (80) > manager (60) > employee (20)
  - Return highest priority role from roles array
  - Update `getUserPermissions(locals)` to use role precedence
  - Add `canEditDepartment(userId, departmentId, role)` function with admin bypass
  - Add `isManagerOfDepartment(userId, departmentId)` function to verify manager assignment
  - **Dependency**: T035 must fail first (unit tests written)
  - **Expected**: T035 tests should PASS after implementation

- [ ] **T037** Implement department transfer detection in `frontend/src/lib/graphql/subscriptions.ts`
  - Create GraphQL subscription `OnDepartmentChange` using contracts/manager-operations.graphql
  - Subscribe to user's department_id changes: `onDepartmentChange(userId: $userId)`
  - Add polling fallback (every 60 seconds) for WebSocket connection drops
  - Trigger permission refresh when department change detected
  - Update local storage with new department context
  - Emit custom event for UI components to re-fetch data
  - **Dependency**: T036 (RBAC utilities implemented)

- [ ] **T038** Implement automatic permission refresh in `frontend/src/lib/server/permission-refresh.ts`
  - Create `refreshUserPermissions(userId)` function
  - Query current user department assignment from database
  - Compare with stored department ID in session
  - If different: update session with new department ID and permissions
  - Re-fetch department-scoped data for new department
  - Invalidate Redis cache for user permissions
  - Add audit log entry for department transfer detection
  - **Dependency**: T037 (department transfer detection)

- [ ] **T039** Add audit logging for management actions in `frontend/src/lib/server/audit-logger.ts`
  - Create `logAction(userId, action, resource, resourceId, metadata)` function
  - Insert audit log entry to database: `INSERT INTO hr_public.audit_logs (...)`
  - Include IP address from request headers: `event.getClientAddress()`
  - Include user agent from request headers: `event.request.headers.get('user-agent')`
  - Call audit logger in all management pages: leave approvals, reviews, goals, tasks, reports
  - Log actions: CREATE, UPDATE, DELETE, APPROVE, REJECT, GENERATE
  - **Dependency**: T036 (RBAC utilities implemented)

---

## Phase 3.7: Integration & Validation (Priority 7)

- [ ] **T040** Run all contract tests and verify PASS in `backend/tests/contract/`
  - Execute: `npm run test:contract`
  - Verify T004 tests PASS (manager leave operations)
  - Verify T005 tests PASS (manager performance operations)
  - Verify T006 tests PASS (manager goals operations)
  - Verify T007 tests PASS (manager tasks operations)
  - Verify T008 tests PASS (manager reports operations)
  - Verify T009 tests PASS (admin operations)
  - If any test fails: debug GraphQL operations, RLS policies, or test setup
  - **Dependency**: T014-T018 (GraphQL operations implemented), T013 (RLS policies)

- [ ] **T041** Run all E2E tests and verify PASS in `frontend/tests/e2e/`
  - Execute: `npm run test:e2e`
  - Verify T010 tests PASS (manager CRUD journey)
  - Verify T011 tests PASS (admin suite journey)
  - Verify T012 tests PASS (theme consistency)
  - If any test fails: debug UI components, navigation, theme system, or test selectors
  - **Dependency**: T019-T022 (manager pages fixed), T025-T029 (admin pages created), T032-T034 (theme system)

- [ ] **T042** Run all unit tests and verify PASS in `frontend/tests/unit/`
  - Execute: `npm run test:unit -- --run`
  - Verify T035 tests PASS (RBAC utilities)
  - Verify test coverage >90% (constitution requirement)
  - If coverage below 90%: add missing tests for uncovered code paths
  - Generate coverage report: `npm run test:coverage`
  - **Dependency**: T036 (RBAC utilities implemented)

- [ ] **T043** Execute quickstart.md validation checklist
  - Follow manual testing checklist in `specs/016-repair-management-pages/quickstart.md`
  - Verify manager can view only their department's data on all management pages
  - Verify manager can perform CRUD operations on leave requests, reviews, goals, tasks, reports
  - Verify admin can view all departments without restrictions
  - Verify admin pages are accessible to admins only (users, settings, audit, analytics, compliance)
  - Verify theme switching works correctly on all pages (light/dark mode)
  - Verify department transfer triggers automatic permission refresh without logout
  - Verify role precedence works (admin role overrides manager when both assigned)
  - Document any issues found and create follow-up tasks
  - **Dependency**: T040, T041, T042 (all tests passing)

- [ ] **T044** Performance validation (GraphQL <200ms)
  - Run performance tests: `npm run test:performance`
  - Measure GraphQL query response times for manager operations
  - Measure GraphQL query response times for admin operations
  - Verify Redis caching reduces query times for repeated requests
  - Verify database indexes improve query performance
  - If any query exceeds 200ms: optimize query, add caching, or improve indexes
  - Generate performance report showing P50, P95, P99 latencies
  - **Dependency**: T040, T041, T042 (all tests passing)

---

## Dependencies

**Phase Order**:
- Phase 3.1 (Database) before all others
- Phase 3.2 (Tests) before Phase 3.3 (Implementation)
- Phase 3.3 (Implementation) before Phase 3.7 (Validation)
- Phase 3.4 (Admin Suite) can run parallel to Phase 3.3 after T013
- Phase 3.5 (Theme) can run parallel to Phase 3.3 and 3.4
- Phase 3.6 (RBAC) depends on Phase 3.3 completion
- Phase 3.7 (Validation) depends on all previous phases

**Critical Paths**:
- T001-T003 (Database) → T013 (RLS) → T014-T018 (GraphQL) → T019-T022 (Manager UI) → T040 (Contract tests)
- T004-T009 (Contract tests) must fail before T014-T018 (Implementation)
- T010-T012 (E2E tests) must fail before T019-T022, T025-T029 (UI implementation)
- T030 (CSS variables) → T031 (Card component) → T032-T033 (Theme audit)
- T035 (Unit tests) must fail before T036 (RBAC implementation)

**Blocking Tasks**:
- T002 blocks T013 (schema validation before RLS policies)
- T013 blocks T014-T018 (RLS policies before GraphQL operations)
- T014-T018 block T019-T022 (GraphQL before manager UI)
- T023 blocks T024-T029 (admin guard before admin pages)
- T031 blocks T032-T033 (Card component before theme audit)
- T036 blocks T037-T039 (RBAC before permission refresh/audit logging)
- T019-T022, T025-T029, T032-T034 block T041 (UI before E2E tests)
- T040, T041, T042 block T043-T044 (all tests before validation)

---

## Parallel Execution Examples

### Database Foundation (Run T001-T003 in parallel)

```bash
# All three migrations can run in parallel (different files)
Task: "Create database migration for tasks table in backend/migrations/20250930_create_tasks_table.sql"
Task: "Validate database schema in backend/migrations/20250930_validate_schema.sql"
Task: "Add performance indexes in backend/migrations/20250930_add_performance_indexes.sql"
```

### Contract Tests (Run T004-T009 in parallel)

```bash
# All contract tests can run in parallel (different files, no dependencies)
Task: "Contract test for manager leave operations in backend/tests/contract/manager-leave-operations.test.ts"
Task: "Contract test for manager performance operations in backend/tests/contract/manager-performance-operations.test.ts"
Task: "Contract test for manager goals operations in backend/tests/contract/manager-goals-operations.test.ts"
Task: "Contract test for manager tasks operations in backend/tests/contract/manager-tasks-operations.test.ts"
Task: "Contract test for manager reports operations in backend/tests/contract/manager-reports-operations.test.ts"
Task: "Contract test for admin operations in backend/tests/contract/admin-operations.test.ts"
```

### E2E Tests (Run T010-T012 in parallel)

```bash
# All E2E tests can run in parallel (different files, different test scenarios)
Task: "E2E test for manager CRUD journey in frontend/tests/e2e/manager-crud.spec.ts"
Task: "E2E test for admin suite journey in frontend/tests/e2e/admin-suite.spec.ts"
Task: "E2E test for theme consistency in frontend/tests/e2e/theme-consistency.spec.ts"
```

### GraphQL Operations (Run T017 in parallel after T014-T016)

```bash
# T017 can run in parallel because it's a new file (tasks-operations.ts)
# T014-T016 must run sequentially (modifying existing operations files)
Task: "Create tasks GraphQL operations in frontend/src/lib/graphql/tasks-operations.ts"
```

### Theme System (Run T030-T031 in parallel)

```bash
# CSS variables and Card component can run in parallel (different files)
Task: "Create centralized CSS custom properties in frontend/src/app.css"
Task: "Create theme-aware card component in frontend/src/lib/components/ui/Card.svelte"
```

### RBAC Unit Tests and Admin Guard (Run T023, T035 in parallel)

```bash
# Admin guard and RBAC unit tests can run in parallel (different files)
Task: "Create admin RBAC route guard in frontend/src/routes/dashboard/admin/+layout.server.ts"
Task: "Write unit tests for RBAC utilities in frontend/tests/unit/rbac-utils.test.ts"
```

---

## Notes

- **[P] tasks**: Different files, no dependencies - can run truly in parallel
- **Sequential tasks**: Same file or dependent logic - must run one after another
- **TDD principle**: ALL tests (T004-T012, T035) must be written and MUST FAIL before implementation
- **Commit strategy**: Commit after each task completion (e.g., "feat: T014 - implement leave management GraphQL operations")
- **Branch strategy**: Create feature branch `016-repair-management-pages` from main
- **Constitution compliance**: >90% test coverage, TypeScript strict mode, RLS at database level
- **Performance target**: GraphQL operations <200ms (validated in T044)

---

## Validation Checklist

_GATE: Checked before marking feature complete_

- [x] All contract tests have corresponding GraphQL operations (T004-T009 → T014-T018)
- [x] All entities have database migrations (T001 creates tasks table, existing tables validated in T002)
- [x] All tests come before implementation (T004-T012, T035 before T014-T044)
- [x] Parallel tasks are truly independent (different files, no shared state)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] Manager CRUD covers all 5 operations (leave, performance, goals, tasks, reports)
- [x] Admin suite includes all 5 pages (users, settings, audit, analytics, compliance)
- [x] Theme audit covers all pages (management pages + admin pages + analytics cards)
- [x] RBAC utilities tested (role precedence, department filtering, permission checks)
- [x] Database schema validated (all tables, foreign keys, indexes)
- [x] Performance validated (GraphQL <200ms, Redis caching)

---

_Based on Implementation Plan v1.0.0 - See `specs/016-repair-management-pages/plan.md`_
_Task template based on `.specify/templates/tasks-template.md`_
