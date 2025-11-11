# Tasks: Frontend Permission-Based Access Control

**Input**: Design documents from `/specs/020-i-would-like/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md

**Branch**: `020-i-would-like`
**Feature**: Comprehensive frontend permission enforcement with server-side guards and client-side UI controls

**Tests**: E2E tests with Playwright and unit tests with Vitest are MANDATORY for this security-critical feature.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story. P1 stories (US1-US3) are security-critical and must be completed first.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions
- **SvelteKit project**: `src/`, `tests/` at repository root
- All routes in `src/routes/`
- Components in `src/lib/components/`
- Utilities in `src/lib/utils/` and `src/lib/server/`

---

## Phase 1: Setup & Infrastructure (Shared)

**Purpose**: Create foundational permission utilities that all user stories depend on

**⚠️ CRITICAL**: These utilities must be complete before any route auditing or component development can begin

- [ ] **T001** [P] Create TypeScript types for permission strings in `src/lib/types/permissions.ts`
  - Define `PermissionString` literal type matching backend format
  - Define `RoleHierarchy` const with Admin=100, HR Manager=75, Manager=50, Employee=25
  - Export `PermissionContext` interface for passing permissions to components
  - Ensure types match backend casing (lowercase resources/actions, PascalCase roles)

- [ ] **T002** [P] Create client-side permission utility functions in `src/lib/utils/permissions.ts`
  - Implement `hasPermission(userPerms: string[], required: string[], requireAll?: boolean): boolean`
  - Implement `hasAnyPermission(userPerms: string[], required: string[]): boolean`
  - Implement `hasAllPermissions(userPerms: string[], required: string[]): boolean`
  - Implement `hasRole(userRoles: string[], required: string[]): boolean`
  - Handle admin wildcard (`*` or `*:*`) to return true for all permissions
  - Mirror server-side API from `src/lib/server/rbac-utils.ts` for consistency

- [ ] **T003** [P] Create unit tests for permission utilities in `src/lib/utils/permissions.test.ts`
  - Test `hasPermission()` with single permission match
  - Test `hasPermission()` with multiple permissions (ANY mode)
  - Test `hasPermission()` with multiple permissions (ALL mode)
  - Test admin wildcard (`*`) grants all permissions
  - Test `hasRole()` with role arrays
  - Test edge cases: empty arrays, null/undefined, invalid strings
  - All tests must pass before proceeding to US1

- [ ] **T004** Create `PermissionGuard` Svelte 5 component in `src/lib/components/permissions/PermissionGuard.svelte`
  - Accept `permissions?: string[]`, `roles?: string[]`, `requireAll?: boolean`, `fallback?: string`
  - Accept `userPermissions: string[]` and `userRoles: string[]` from parent
  - Use Svelte 5 `$props()` and `Snippet` for children
  - Use `$derived` to compute `hasAccess` based on permission/role checks
  - Conditionally render children if `hasAccess` is true
  - Show fallback text if `hasAccess` is false and fallback provided
  - Component is UI-only (no security enforcement, server handles that)

- [ ] **T005** [P] Create unit tests for `PermissionGuard` component in `src/lib/components/permissions/PermissionGuard.test.ts`
  - Test component renders children when permissions match
  - Test component hides children when permissions don't match
  - Test fallback text displays when provided and no permission
  - Test admin wildcard (`*`) renders children
  - Test `requireAll` mode requires all permissions
  - Use Vitest browser mode with `@vitest/browser`

**Checkpoint**: Core permission utilities and components ready - route auditing can now begin

---

## Phase 2: User Story 1 - Read Permission Controls Page Access (Priority: P1) 🎯 SECURITY CRITICAL

**Goal**: Enforce server-side permission checks on all protected routes to prevent unauthorized access

**Independent Test**: Login as Employee (no `employees:read:team`), navigate to `/hr/employees`, verify redirect to `/unauthorized` with 403 error

**⚠️ SECURITY**: This is the foundational security layer. No route should be accessible without proper read permissions.

### E2E Tests for User Story 1 (MANDATORY - Write FIRST, ensure they FAIL)

- [ ] **T006** [P] [US1] Create E2E test for employee page access control in `tests/e2e/permissions/page-access.spec.ts`
  - Test: User without `employees:read` permission redirected from `/hr/employees`
  - Test: User without `departments:read` permission redirected from `/admin/departments`
  - Test: User with only `profile:read` can't access `/hr/**` or `/admin/**` routes
  - Test: User with expired token redirected to `/login?redirectTo=<original-path>`
  - All tests should FAIL initially (routes not protected yet)
  - Use Playwright with test users at each role level

- [ ] **T007** [P] [US1] Create E2E test for admin page access control in `tests/e2e/permissions/admin-access.spec.ts`
  - Test: Manager can't access `/admin/analytics` (requires `admin:read:all`)
  - Test: HR Manager can't access `/admin/system` (requires admin permissions)
  - Test: Employee can't access any `/admin/**` routes
  - Test: Admin with `*` permission can access all routes
  - All tests should FAIL initially

### Route Auditing for User Story 1

**NOTE**: These tasks audit existing routes and add `PermissionChecks` calls where missing. They modify existing files so CANNOT run in parallel.

- [ ] **T008** [US1] Audit and fix HR employee routes in `src/routes/hr/employees/+page.server.ts`
  - Import `PermissionChecks` from `$lib/server/rbac-utils`
  - Add `PermissionChecks.employeeRead(event)` at top of load function
  - Return `userPermissions: getUserPermissions(event.locals)` in data
  - Test manually: Employee without permission gets 403

- [ ] **T009** [US1] Audit and fix HR employee detail route in `src/routes/hr/employees/[id]/+page.server.ts`
  - Add `PermissionChecks.employeeRead(event)` at top of load function
  - Return `userPermissions: getUserPermissions(event.locals)` in data
  - Verify employee ID param still works after permission check

- [ ] **T010** [US1] Audit and fix admin department routes in `src/routes/admin/departments/+page.server.ts`
  - Add `PermissionChecks.departmentRead(event)` at top of load function
  - Return `userPermissions: getUserPermissions(event.locals)` in data
  - Test: Only users with `departments:read:*` can access

- [ ] **T011** [US1] Audit and fix admin analytics route in `src/routes/dashboard/admin/analytics/+page.server.ts`
  - Verify `PermissionChecks.adminRead(event)` is already present (from research)
  - If missing, add it
  - Ensure `userPermissions` returned in data

- [ ] **T012** [US1] Create unauthorized page in `src/routes/unauthorized/+page.svelte`
  - Display "Access Denied" heading
  - Show message "You don't have permission to access this resource"
  - Provide link to dashboard or previous page
  - Show contact info for requesting access

- [ ] **T013** [US1] Bulk audit remaining HR routes and add permission checks
  - Find all `src/routes/hr/**/+page.server.ts` files with `mcp__serena__find_file`
  - For each file without `PermissionChecks` call, add appropriate check
  - `/hr/departments/**` → `PermissionChecks.departmentRead(event)`
  - `/hr/performance/**` → `PermissionChecks.performanceRead(event)`
  - `/hr/leave/**` → `PermissionChecks.leaveRead(event)`
  - Return `userPermissions` in all load functions

- [ ] **T014** [US1] Bulk audit remaining admin routes and add permission checks
  - Find all `src/routes/admin/**/+page.server.ts` files
  - For each file without `PermissionChecks` call, add appropriate check
  - Most admin routes → `PermissionChecks.adminRead(event)`
  - Specific routes like reports → `PermissionChecks.reportsRead(event)`
  - Return `userPermissions` in all load functions

- [ ] **T015** [US1] Audit dashboard routes and add permission checks
  - Check `src/routes/dashboard/**/+page.server.ts` files
  - Add `PermissionChecks.dashboard(event)` for dashboard access
  - Verify user can access own profile without special permissions

**Checkpoint**: All routes have server-side permission enforcement. Re-run E2E tests from T006-T007 - they should now PASS.

---

## Phase 3: User Story 2 - Write Permission Controls Action Buttons (Priority: P1) 🎯 SECURITY CRITICAL

**Goal**: Hide create, edit, and update buttons from users without write permissions

**Independent Test**: Login as Manager (has `employees:read:team` but not `employees:write`), verify "Add Employee" button not rendered on `/hr/employees` page

**⚠️ NOTE**: This is UI-only enforcement. Server-side enforcement (preventing actual writes) already exists in backend. This improves UX by hiding buttons users can't use.

### E2E Tests for User Story 2 (MANDATORY - Write FIRST, ensure they FAIL)

- [ ] **T016** [P] [US2] Create E2E test for button visibility in `tests/e2e/permissions/button-visibility.spec.ts`
  - Test: Manager without `employees:write` sees no "Add Employee" button on `/hr/employees`
  - Test: Manager without `employees:write` sees no "Edit" buttons on employee detail page
  - Test: HR Manager with `employees:write` sees all create/edit buttons
  - Test: User with `departments:read` but not `departments:write` has disabled form fields
  - All tests should FAIL initially (buttons not hidden yet)

### Component Updates for User Story 2

- [ ] **T017** [US2] Update employees list page in `src/routes/hr/employees/+page.svelte`
  - Import `PermissionGuard` component
  - Wrap "Add Employee" button in `<PermissionGuard permissions={['employees:write']} userPermissions={data.userPermissions.permissions} userRoles={data.userPermissions.roles}>`
  - Wrap "Bulk Edit" button (if exists) in same guard
  - Wrap "Import" button (if exists) in same guard
  - Test manually: Manager sees no write-permission buttons

- [ ] **T018** [US2] Update employee detail page in `src/routes/hr/employees/[id]/+page.svelte`
  - Wrap "Edit Employee" button in `PermissionGuard` with `employees:write` permission
  - Wrap "Deactivate" button (if exists) in `PermissionGuard` with `employees:write` permission
  - Keep "View Details" and read-only sections visible to all with read permission

- [ ] **T019** [US2] Update department management page in `src/routes/admin/departments/+page.svelte`
  - Wrap "Add Department" button in `PermissionGuard` with `departments:write` permission
  - Wrap "Edit" buttons in department list in same guard
  - Disable form fields for users without write permission using `disabled={!data.userPermissions.canManageDepartments}`

- [ ] **T020** [US2] Update performance review pages
  - Find all performance review pages with create/edit actions
  - Wrap create/edit buttons in `PermissionGuard` with `performance:write` permission
  - Test: Employee can view own reviews but can't edit them

- [ ] **T021** [US2] Update task management pages
  - Find task creation/editing pages
  - Wrap action buttons in `PermissionGuard` with `tasks:write` permission
  - Test: Employee can view assigned tasks but Manager can assign new tasks

**Checkpoint**: All write-action buttons hidden from users without write permissions. Re-run E2E tests from T016 - they should now PASS.

---

## Phase 4: User Story 3 - Delete Permission Controls Destructive Actions (Priority: P1) 🎯 SECURITY CRITICAL

**Goal**: Hide delete, archive, and deactivate buttons from users without explicit delete permissions

**Independent Test**: Login as HR Manager (has `employees:write` but not `employees:delete`), verify "Delete Employee" button not present on employee detail page

**⚠️ CRITICAL**: Delete permissions are separate from write permissions. Even users who can edit should not see delete buttons without explicit permission.

### E2E Tests for User Story 3 (MANDATORY - Write FIRST, ensure they FAIL)

- [ ] **T022** [P] [US3] Create E2E test for delete button visibility in `tests/e2e/permissions/delete-buttons.spec.ts`
  - Test: User with `employees:write` but not `employees:delete` sees no delete button
  - Test: User with `roles:write` but not `roles:delete` has no delete option in dropdown
  - Test: Admin with `*` permission sees all delete buttons with confirmation dialogs
  - Test: User without delete permission gets 403 if they somehow call delete API
  - All tests should FAIL initially (delete buttons not properly guarded)

### Component Updates for User Story 3

- [ ] **T023** [US3] Update employee detail page delete actions in `src/routes/hr/employees/[id]/+page.svelte`
  - Wrap "Delete Employee" button in `PermissionGuard` with `employees:delete` permission
  - Wrap "Archive Employee" button (if exists) in same guard
  - Ensure delete button shows confirmation dialog before action

- [ ] **T024** [US3] Update department management delete actions in `src/routes/admin/departments/+page.svelte`
  - Wrap "Delete Department" button in `PermissionGuard` with `departments:delete` permission
  - Test: HR Manager can edit departments but can't delete them (only Admin can)

- [ ] **T025** [US3] Update role management delete actions
  - Find role management pages (likely in `/admin/roles/**`)
  - Wrap delete role options in `PermissionGuard` with `roles:delete` permission
  - Test: Admin can delete roles, HR Manager cannot

- [ ] **T026** [US3] Update task delete actions in task management pages
  - Wrap "Delete Task" buttons in `PermissionGuard` with `tasks:delete` permission
  - Test: Manager can delete team tasks, Employee cannot delete assigned tasks

- [ ] **T027** [US3] Update document delete actions
  - Find document management pages
  - Wrap "Delete Document" buttons in `PermissionGuard` with `documents:delete` permission
  - Test: Only users with document:delete can remove documents

**Checkpoint**: All delete/destructive actions hidden from users without explicit delete permissions. Re-run E2E tests from T022 - they should now PASS.

---

## Phase 5: User Story 4 - Permission-Based Navigation Menu Filtering (Priority: P2)

**Goal**: Filter navigation menu items based on user permissions to show only accessible sections

**Independent Test**: Login as Employee, verify navigation only shows "Dashboard" and "My Profile", no "HR" or "Admin" sections

### E2E Tests for User Story 4 (MANDATORY - Write FIRST, ensure they FAIL)

- [ ] **T028** [P] [US4] Create E2E test for navigation filtering in `tests/e2e/permissions/navigation-filtering.spec.ts`
  - Test: Employee sees only "Dashboard" and "My Profile" in navigation
  - Test: Manager sees "Dashboard", "My Team", "Reports" but not "Admin"
  - Test: HR Manager sees "Dashboard", "HR" section, but not "Admin"
  - Test: Admin sees all navigation items including "Admin" section
  - All tests should FAIL initially (navigation not filtered)

### Navigation Updates for User Story 4

- [ ] **T029** [US4] Update main navigation in `src/routes/+layout.svelte`
  - Import `hasPermission` from `$lib/utils/permissions`
  - Use `$derived` rune to compute visible navigation items based on `data.userPermissions.permissions`
  - Dashboard link: Always visible to authenticated users
  - HR section: Show if user has any of `['employees:read:team', 'employees:read:all', 'departments:read:team', 'departments:read:all']`
  - Admin section: Show if user has `['admin:read:all']` or `*` permission
  - My Profile: Always visible to authenticated users

- [ ] **T030** [US4] Update sidebar navigation (if separate from main nav)
  - Apply same permission filtering logic
  - Use `$derived` for reactive updates when permissions change
  - Ensure navigation hides inaccessible sections immediately on permission revocation

- [ ] **T031** [US4] Update breadcrumb navigation (if exists)
  - Filter breadcrumb items based on parent route permissions
  - Don't show breadcrumb links user can't access

**Checkpoint**: Navigation dynamically filters based on user permissions. Re-run E2E tests from T028 - they should now PASS.

---

## Phase 6: User Story 5 - Granular Component Permission Checks (Priority: P2)

**Goal**: Hide specific table columns, form fields, and component sections based on granular permissions like `salary:read`, `performance:read`

**Independent Test**: Login as Manager (has `employees:read:team` but not `salary:read`), verify salary column completely hidden in employee table

### E2E Tests for User Story 5 (MANDATORY - Write FIRST, ensure they FAIL)

- [ ] **T032** [P] [US5] Create E2E test for column visibility in `tests/e2e/permissions/column-visibility.spec.ts`
  - Test: User without `salary:read` sees no salary column in employee table
  - Test: User without `performance:read` sees "No access" message in performance review section
  - Test: User without `budget:read` sees "Restricted" placeholder for department budget
  - Test: Manager viewing own department employees sees all allowed data
  - All tests should FAIL initially (columns not hidden based on granular permissions)

### Component Updates for User Story 5

- [ ] **T033** [US5] Update employee table to hide salary columns based on permissions
  - Find employee table component (likely in `src/lib/components/employees/` or inline in page)
  - Add logic to check `data.userPermissions.permissions` for `salary:read` permission
  - Conditionally render salary, compensation, and bonus columns only if permission present
  - Use `{#if hasPermission(userPermissions, ['salary:read'])}` around column headers and cells

- [ ] **T034** [US5] Update employee profile to hide sensitive sections
  - Check for `performance:read` before showing performance review section
  - Check for `salary:read` before showing compensation details
  - Show "No access" message for sections user can't view
  - Keep basic profile info (name, email, department) visible with `employees:read:*`

- [ ] **T035** [US5] Update department details to hide budget information
  - Check for `budget:read` permission before showing department budget
  - Show "Restricted" placeholder if user lacks permission
  - Keep department name, description, and member count visible with `departments:read:*`

- [ ] **T036** [US5] Update task assignment to check `tasks:reassign` permission
  - Hide "Reassign Task" button unless user has `tasks:reassign` permission
  - Allow viewing task details with `tasks:read:*` but hide assignment controls

- [ ] **T037** [US5] Update reports access to check `reports:execute` permission
  - Show "Generate Report" button only to users with `reports:execute` permission
  - Allow viewing existing reports with `reports:read:*` permission
  - Hide "Schedule Report" feature unless user has `reports:write` permission

**Checkpoint**: All components hide granular sections based on specific permissions. Re-run E2E tests from T032 - they should now PASS.

---

## Phase 7: User Story 6 - Permission Inheritance and Role Hierarchy (Priority: P2)

**Goal**: Verify that higher roles automatically inherit permissions from lower roles, with Admin having implicit `*` permission

**Independent Test**: Verify Admin user can access all Employee, Manager, and HR Manager features without explicitly granting each permission

### E2E Tests for User Story 6 (MANDATORY - Write FIRST, ensure they FAIL)

- [ ] **T038** [P] [US6] Create E2E test for role hierarchy in `tests/e2e/permissions/role-hierarchy.spec.ts`
  - Test: Admin with `*` permission can access all routes (employees, departments, admin)
  - Test: HR Manager can access Manager and Employee features
  - Test: Manager can access Employee features
  - Test: Permission changes reflect immediately when role is upgraded
  - Tests may PASS if hierarchy already implemented in backend - verify behavior

### Utility Verification for User Story 6

- [ ] **T039** [US6] Verify role hierarchy in `src/lib/server/rbac-utils.ts`
  - Check `ROLE_HIERARCHY` const has correct precedence levels
  - Verify `getRolePrecedence()` function returns highest role
  - Verify `hasPermission()` checks for `*` wildcard before checking specific permissions
  - If issues found, fix and re-test

- [ ] **T040** [US6] Verify permission inheritance in `getUserPermissions()` function
  - Check that function correctly maps backend permissions to UI flags
  - Verify Admin wildcard grants all `canView*`, `canEdit*`, `canDelete*` flags
  - Test edge case: User with multiple roles gets highest role's permissions

**Checkpoint**: Role hierarchy correctly implemented with Admin inheriting all permissions. Re-run E2E tests from T038 - they should now PASS.

---

## Phase 8: User Story 7 - Permission-Based Form Field Validation (Priority: P3)

**Goal**: Disable form fields and hide submit buttons when user has read-only permissions

**Independent Test**: Open "Edit Employee" form as user with read-only permissions, verify all input fields disabled and submit button hidden

### E2E Tests for User Story 7 (MANDATORY - Write FIRST, ensure they FAIL)

- [ ] **T041** [P] [US7] Create E2E test for form field disabling in `tests/e2e/permissions/form-fields.spec.ts`
  - Test: User with read-only permissions has all form fields disabled
  - Test: User with partial write permissions has only editable fields enabled
  - Test: Submit button hidden when user lacks write permission
  - Test: Form validation blocks submission for read-only users
  - All tests should FAIL initially (forms not permission-aware)

### Form Updates for User Story 7

- [ ] **T042** [US7] Update employee edit form to disable fields based on permissions
  - Find employee edit form (likely in `src/routes/hr/employees/[id]/edit/+page.svelte`)
  - Add `disabled={!data.userPermissions.canEditEmployees}` to all input fields
  - Wrap submit button in `PermissionGuard` with `employees:write` permission
  - Show "Read-only" badge if user lacks write permission

- [ ] **T043** [US7] Update department edit form to disable fields
  - Find department form
  - Disable all fields if `!data.userPermissions.canManageDepartments`
  - Hide submit button without `departments:write` permission

- [ ] **T044** [US7] Update task creation form to disable fields
  - Disable task assignment field unless user has `tasks:reassign` permission
  - Disable priority field unless user is Manager or Admin
  - Hide "Create Task" button without `tasks:write` permission

- [ ] **T045** [US7] Add client-side form validation for permissions
  - Create form validation helper in `src/lib/utils/form-validation.ts`
  - Check permissions before allowing form submission
  - Show error message "You don't have permission to submit this form" if blocked
  - Note: This is UX-only, server already validates

**Checkpoint**: All forms disable fields and hide buttons based on permissions. Re-run E2E tests from T041 - they should now PASS.

---

## Phase 9: User Story 8 - Real-Time Permission Updates (Priority: P3)

**Goal**: Update UI when user's permissions change during active session without requiring logout/login

**Independent Test**: Admin revokes user's permissions while they have app open, verify UI updates within 30 seconds to hide now-inaccessible elements

**⚠️ NOTE**: This is an advanced feature. Consider if the complexity is worth the benefit for your use case.

### E2E Tests for User Story 8 (OPTIONAL - P3 feature)

- [ ] **T046** [P] [US8] Create E2E test for real-time permission updates in `tests/e2e/permissions/realtime-updates.spec.ts`
  - Test: User's role downgraded, UI updates within 30 seconds
  - Test: Permission revoked, action blocked with real-time permission check
  - Test: Permission upgraded, new menu items appear without page refresh
  - Test: Session detects permission change on next server request
  - Tests may require backend support for permission change notifications

### Implementation for User Story 8 (OPTIONAL)

- [ ] **T047** [US8] Reduce session cache TTL in `src/hooks.server.ts`
  - Change `SESSION_CACHE_TTL` from 60s to 10-30s for faster permission refresh
  - Note tradeoff: More backend API calls, but faster permission updates

- [ ] **T048** [US8] Implement permission refresh on route navigation
  - In `hooks.server.ts`, force refresh of `/auth/me` on every route change (bypass cache)
  - Update `event.locals.permissions` with latest from backend
  - Client components will receive updated permissions via page data

- [ ] **T049** [US8] Optional: Implement WebSocket-based permission invalidation
  - This requires backend support to push permission changes
  - Subscribe to permission change events for current user
  - Trigger navigation refresh when permissions change
  - This is advanced - skip unless real-time updates are critical

**Checkpoint**: Permissions refresh periodically or on route navigation. Re-run E2E tests from T046 (if implemented) - they should PASS.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements, documentation, and performance optimization

- [ ] **T050** [P] Create developer documentation in `specs/020-i-would-like/developer-guide.md`
  - Document how to add permission checks to new routes
  - Document how to use `PermissionGuard` component
  - Provide code examples for common scenarios
  - Document permission string naming conventions

- [ ] **T051** [P] Add ESLint rule to catch missing permission checks
  - Create custom ESLint rule to detect `+page.server.ts` files without `PermissionChecks` import
  - Add to `.eslintrc.js` or `eslint.config.js`
  - Run linter to catch any missed routes

- [ ] **T052** Performance testing: Measure permission check overhead
  - Use browser DevTools to measure time spent in permission checks
  - Target: <10ms per route load function
  - Target: <1ms per component permission check
  - If performance issues found, optimize with memoization (see research.md)

- [ ] **T053** Security audit: Verify no direct client-to-backend API calls
  - Search codebase for direct `fetch()` calls to `PUBLIC_API_URL` in client components
  - Ensure all backend calls go through `+page.server.ts` or `+server.ts` routes
  - Verify no permission checks in client components are used for security (UI-only)

- [ ] **T054** [P] Update CLAUDE.md with permission checking examples
  - Add section on RBAC patterns
  - Show examples of server-side and client-side permission checks
  - Document permission string format

- [ ] **T055** Code cleanup: Remove old permission checking patterns
  - Search for inline `{#if user.role === 'Admin'}` patterns
  - Replace with `PermissionGuard` component or `hasPermission()` utility
  - Ensure consistent permission checking across codebase

- [ ] **T056** Run full E2E test suite across all user stories
  - Execute all tests from T006, T007, T016, T022, T028, T032, T038, T041
  - Verify 95%+ pass rate
  - Fix any failing tests

- [ ] **T057** Manual QA: Test with real users at each role level
  - Create test accounts: Admin, HR Manager, Manager, Employee
  - Manually navigate through application with each role
  - Verify appropriate access levels
  - Document any UX issues or confusing permission messages

**Checkpoint**: Feature complete, tested, documented, and ready for production deployment.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1: T001-T005)**: No dependencies - can start immediately. **MUST COMPLETE BEFORE ANY OTHER PHASE**.
- **User Story 1 (Phase 2: T006-T015)**: Depends on Setup completion. **SECURITY CRITICAL - BLOCKS ALL OTHER USER STORIES**.
- **User Story 2 (Phase 3: T016-T021)**: Depends on US1 completion (needs `PermissionGuard` from Setup, needs routes protected from US1).
- **User Story 3 (Phase 4: T022-T027)**: Depends on US1 and US2 completion (builds on write permission controls).
- **User Story 4 (Phase 5: T028-T031)**: Can start after US1 completion. Independent of US2/US3.
- **User Story 5 (Phase 6: T032-T037)**: Can start after US1 completion. Independent of US2/US3/US4.
- **User Story 6 (Phase 7: T038-T040)**: Mostly verification, can start anytime after Setup. Low priority.
- **User Story 7 (Phase 8: T041-T045)**: Depends on US2 completion (builds on write permission controls).
- **User Story 8 (Phase 9: T046-T049)**: Optional P3 feature. Can implement anytime after US1-US7 complete.
- **Polish (Phase 10: T050-T057)**: Depends on all desired user stories being complete.

### User Story Dependencies

```
Setup (T001-T005) → Foundation ready
                 ↓
                US1 (T006-T015) → Page access control [P1 - SECURITY CRITICAL]
                 ↓
         ┌───────┴──────────────┬────────────────┬───────────────┐
         ↓                      ↓                ↓               ↓
      US2 (T016-T021)        US4 (T028-T031)  US5 (T032-T037)  US6 (T038-T040)
      Write buttons [P1]      Navigation [P2]  Granular [P2]    Hierarchy [P2]
         ↓
      US3 (T022-T027)
      Delete buttons [P1]
         ↓
      US7 (T041-T045)
      Form fields [P3]
         ↓
      US8 (T046-T049) [OPTIONAL]
      Real-time [P3]
         ↓
    Polish (T050-T057)
```

### Within Each Phase

- **Setup**: T001-T005 must complete in order (types → utils → tests → component → component tests)
- **US1 Tests (T006-T007)**: Can run in parallel [P], but both must FAIL before starting route auditing
- **US1 Route Auditing (T008-T015)**: Must run sequentially (modifying same files). Cannot parallelize.
- **US2 Tests (T016)**: Must FAIL before starting component updates
- **US2 Component Updates (T017-T021)**: Can run in parallel [P] if modifying different pages
- **US3-US8**: Similar pattern - tests first, then implementation

### Parallel Opportunities

```bash
# Setup phase - can run in parallel:
Task: "Create TypeScript types in src/lib/types/permissions.ts" [T001]
Task: "Create client-side utils in src/lib/utils/permissions.ts" [T002]
Task: "Create unit tests in src/lib/utils/permissions.test.ts" [T003]

# US1 E2E tests - can run in parallel:
Task: "Create E2E test for employee page access" [T006]
Task: "Create E2E test for admin page access" [T007]

# US2 Component updates - can run in parallel if different files:
Task: "Update employees list page" [T017]
Task: "Update employee detail page" [T018]
Task: "Update department management page" [T019]

# US4, US5, US6 can ALL run in parallel after US1 completes (different concerns, different files)

# Polish phase - most tasks can run in parallel:
Task: "Create developer documentation" [T050]
Task: "Add ESLint rule" [T051]
Task: "Update CLAUDE.md" [T054]
```

---

## Implementation Strategy

### Critical Path: Security First (MVP = US1 + US2 + US3)

**Priority order**:
1. **Phase 1 Setup (T001-T005)** → ~4-6 hours
2. **Phase 2 US1 (T006-T015)** → ~8-12 hours (CRITICAL - all routes protected)
3. **Phase 3 US2 (T016-T021)** → ~4-6 hours (write buttons hidden)
4. **Phase 4 US3 (T022-T027)** → ~3-4 hours (delete buttons hidden)

**Stop here and deploy/test** - you now have comprehensive permission enforcement (MVP).

5. **Phase 5 US4 (T028-T031)** → ~2-3 hours (navigation filtering)
6. **Phase 6 US5 (T032-T037)** → ~4-6 hours (granular permissions)
7. **Phase 7 US6 (T038-T040)** → ~1-2 hours (hierarchy verification)
8. **Phase 8 US7 (T041-T045)** → ~3-4 hours (form field disabling)
9. **Phase 9 US8 (T046-T049)** → OPTIONAL, ~4-8 hours (real-time updates)
10. **Phase 10 Polish (T050-T057)** → ~4-6 hours (documentation, optimization)

**Total estimated time**: 37-62 hours for complete implementation

### Incremental Delivery

**Iteration 1**: Setup + US1 → Deploy → Test
- Users can't access pages they don't have permission for
- **Value**: Security-critical foundation

**Iteration 2**: US2 + US3 → Deploy → Test
- Users don't see buttons they can't use
- **Value**: Improved UX, fewer error messages

**Iteration 3**: US4 + US5 → Deploy → Test
- Navigation and columns filtered
- **Value**: Cleaner interface, less confusion

**Iteration 4**: US6 + US7 → Deploy → Test
- Hierarchy verified, forms disabled
- **Value**: Complete permission system

**Iteration 5**: US8 (Optional) + Polish → Deploy → Final QA
- Real-time updates, documentation
- **Value**: Production-ready feature

### Parallel Team Strategy

If you have 3 developers:

**Week 1**:
- Developer A: Setup (T001-T005) → Everyone waits for this
- Developer B: Read documentation, plan test scenarios
- Developer C: Set up test accounts at each role level

**Week 2** (After Setup complete):
- Developer A: US1 route auditing (T008-T015) - sequential work
- Developer B: US1 E2E tests (T006-T007)
- Developer C: US2 E2E tests (T016)

**Week 3** (After US1 complete):
- Developer A: US2 component updates (T017-T021)
- Developer B: US3 delete buttons (T022-T027)
- Developer C: US4 navigation (T028-T031)

**Week 4** (Final integration):
- Developer A: US5 granular permissions (T032-T037)
- Developer B: US7 form fields (T041-T045)
- Developer C: Polish and documentation (T050-T057)

---

## Success Criteria

- [ ] 100% of protected routes (50+ routes) implement server-side permission checks
- [ ] All action buttons (create, edit, delete) conditionally rendered based on permissions
- [ ] Navigation menu dynamically filters based on user permissions
- [ ] E2E test coverage ≥95% for permission scenarios (95% of tests from T006-T041 passing)
- [ ] Permission check overhead <10ms per route load (measured in T052)
- [ ] Zero direct client-to-backend API calls (verified in T053)
- [ ] Developer documentation complete (T050)
- [ ] Manual QA complete with all role levels (T057)

---

## Notes

- **[P] tasks** = different files, no dependencies, can run in parallel
- **[Story] label** maps task to specific user story for traceability
- **Security-first approach**: US1-US3 are P1 security-critical, must complete before P2/P3 features
- **Test-driven**: E2E tests written first and must FAIL before implementation
- **Incremental delivery**: Each user story is independently testable and deployable
- **Backend alignment**: Permission strings must match backend format exactly (see research.md)
- **No backend changes**: All work is frontend-only, leveraging existing RBAC infrastructure
- **Performance**: Aim for <10ms permission check overhead, <50ms navigation filtering
- **Commit strategy**: Commit after each task or logical group of parallel tasks
- **Stop at any checkpoint**: Validate story independently before moving to next priority

**CRITICAL REMINDER**: Server-side permission enforcement is SECURITY. Client-side guards are UX ONLY.
