# Feature Specification: Frontend Permission-Based Access Control

**Feature Branch**: `020-i-would-like`
**Created**: 2025-11-11
**Status**: Draft
**Input**: User description: "I would like to ensure that all of our permissions are being respected by elements on each of our pages in our svelte frontend. IE: not having read permissions won't give page permissions, write permissions give access to edit buttons and create buttons, etc..."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read Permission Controls Page Access (Priority: P1)

Users without read permissions for a specific resource should not be able to access pages displaying that resource. The system must enforce server-side permission checks before rendering any page content.

**Why this priority**: This is the foundational security layer preventing unauthorized access to sensitive information. Without this, all other permission controls are meaningless.

**Independent Test**: Can be fully tested by creating a user with no `employees:read` permission, attempting to access `/hr/employees`, and verifying they are redirected to an unauthorized page or dashboard. This delivers immediate security value by protecting sensitive data.

**Acceptance Scenarios**:

1. **Given** a user without `employees:read` permission, **When** they navigate to `/hr/employees`, **Then** they are redirected to `/unauthorized` with message "You don't have permission to view employees"
2. **Given** a user without `departments:read` permission, **When** they attempt to access `/admin/departments`, **Then** they receive a 403 Forbidden error and are redirected
3. **Given** a user with only `profile:read` permission, **When** they try to access any HR or admin route, **Then** the server-side load function returns 403 and triggers redirect
4. **Given** a user with expired or invalid token, **When** they access any protected route, **Then** they are redirected to `/login?redirectTo=<original-path>`

---

### User Story 2 - Write Permission Controls Action Buttons (Priority: P1)

Users with only read permissions should see all content but not have access to create, edit, or delete buttons. Write permissions gate all mutation actions.

**Why this priority**: This prevents accidental or intentional data modification by users who should only be viewing information. Critical for data integrity and audit compliance.

**Independent Test**: Can be fully tested by logging in as a Manager (without `employees:write`), navigating to `/hr/employees`, and verifying that "Add Employee" and "Edit" buttons are not rendered. This delivers immediate value by preventing unauthorized modifications.

**Acceptance Scenarios**:

1. **Given** a user with `employees:read` but not `employees:write`, **When** they view the employees list page, **Then** the "Add New Employee" button is not rendered
2. **Given** a user with `employees:read` but not `employees:write`, **When** they view an employee detail page, **Then** all "Edit" and "Delete" buttons are hidden
3. **Given** an HR Manager with `employees:write`, **When** they view the employees page, **Then** all create/edit/delete buttons are visible and functional
4. **Given** a user with `departments:read` but not `departments:write`, **When** viewing department settings, **Then** all input fields are disabled or replaced with read-only displays

---

### User Story 3 - Delete Permission Controls Destructive Actions (Priority: P1)

Delete permissions must be explicitly checked before showing any destructive action buttons (delete, archive, deactivate). These are separate from write permissions due to their irreversible nature.

**Why this priority**: Prevents accidental data loss and ensures only authorized users can perform destructive operations. Essential for compliance and data protection.

**Independent Test**: Can be fully tested by logging in as a user with `employees:write` but not `employees:delete`, viewing an employee profile, and verifying the "Delete Employee" button is not present. This delivers value by preventing accidental deletions.

**Acceptance Scenarios**:

1. **Given** a user with `employees:write` but not `employees:delete`, **When** viewing employee actions, **Then** delete and archive buttons are not rendered
2. **Given** a user with `roles:write` but not `roles:delete`, **When** managing roles, **Then** the delete role option is hidden from the dropdown menu
3. **Given** an Admin with `*` (all permissions), **When** viewing any resource, **Then** all delete/archive buttons are visible with confirmation dialogs
4. **Given** a user attempts to call a delete API endpoint without permission, **When** the request is made, **Then** server returns 403 with detailed permission error

---

### User Story 4 - Permission-Based Navigation Menu Filtering (Priority: P2)

Navigation menus and sidebar links should only display items the user has permission to access. This provides a cleaner UI and prevents confusion from clicking inaccessible links.

**Why this priority**: Improves UX by hiding inaccessible features and reduces support burden from users wondering why they get "access denied" errors. Secondary to direct permission enforcement.

**Independent Test**: Can be fully tested by logging in as an Employee (basic permissions), viewing the sidebar, and verifying admin and HR sections are not displayed. This delivers value by streamlining the user experience.

**Acceptance Scenarios**:

1. **Given** a user without any admin permissions, **When** the app layout loads, **Then** the "Admin" section in the navigation is not rendered
2. **Given** a user with only `profile:read` permissions, **When** viewing the sidebar, **Then** only "My Profile" and "Dashboard" links are visible
3. **Given** an HR Manager with HR permissions, **When** viewing navigation, **Then** HR section is visible but Admin section is hidden
4. **Given** a user's permissions change during session, **When** navigation re-renders, **Then** menu items update to reflect new permission set

---

### User Story 5 - Granular Component Permission Checks (Priority: P2)

Individual UI components (cards, tables, forms) should check permissions at render time and adapt their display accordingly. This includes hiding specific columns, disabling form fields, or showing read-only views.

**Why this priority**: Provides fine-grained control over UI elements and ensures consistent permission enforcement across all components. Important for complex pages with mixed permission requirements.

**Independent Test**: Can be fully tested by rendering the EmployeeTable component with a user having `employees:read` but not `salary:read`, and verifying the salary column is completely hidden. This delivers value by protecting sensitive field-level data.

**Acceptance Scenarios**:

1. **Given** a user without `salary:read` permission, **When** viewing employee table, **Then** the salary and compensation columns are not rendered
2. **Given** a user with `employees:read` but not `performance:read`, **When** viewing employee profile, **Then** performance review section shows "No access" message
3. **Given** a user with `departments:read` but not `budget:read`, **When** viewing department details, **Then** budget information is replaced with "Restricted" placeholder
4. **Given** a Manager viewing their own department employees, **When** table renders, **Then** all employee data is visible but edit actions are permission-gated

---

### User Story 6 - Permission Inheritance and Role Hierarchy (Priority: P2)

Higher-level roles should automatically inherit permissions from lower roles. Admin inherits all permissions, HR Manager inherits Manager and Employee permissions.

**Why this priority**: Simplifies permission management and ensures consistent hierarchical access control. Prevents permission gaps where higher roles lack lower-level capabilities.

**Independent Test**: Can be fully tested by verifying an Admin user can access all Employee, Manager, and HR Manager features without explicitly granting each permission. This delivers value by reducing permission configuration complexity.

**Acceptance Scenarios**:

1. **Given** a user with Admin role, **When** checking any permission, **Then** the system returns true (Admin has implicit `*` permission)
2. **Given** a user with HR Manager role, **When** checking employee-level permissions, **Then** all basic employee permissions are automatically granted
3. **Given** a user with Manager role, **When** accessing employee features, **Then** they inherit all Employee permissions plus manager-specific permissions
4. **Given** permission hierarchy is defined in role configuration, **When** role assignment changes, **Then** inherited permissions update automatically

---

### User Story 7 - Permission-Based Form Field Validation (Priority: P3)

Form submissions should be validated against user permissions before allowing data entry. Fields the user cannot modify should be disabled or hidden in forms.

**Why this priority**: Provides better UX by preventing users from filling out forms they cannot submit. Nice-to-have enhancement after core permission enforcement is in place.

**Independent Test**: Can be fully tested by opening the "Edit Employee" form as a user with read-only permissions and verifying all input fields are disabled and submit button is hidden. This delivers value by preventing wasted effort on unsubmittable forms.

**Acceptance Scenarios**:

1. **Given** a user with read-only permissions, **When** opening an edit form, **Then** all input fields are disabled with visual indication
2. **Given** a user with partial write permissions, **When** viewing a form, **Then** only editable fields are enabled, others are disabled
3. **Given** a user attempts to submit a form without permission, **When** form validation runs, **Then** client-side validation blocks submission with permission error
4. **Given** a user with permissions navigates to create form, **When** form loads, **Then** all appropriate fields are enabled and submit button is active

---

### User Story 8 - Real-Time Permission Updates (Priority: P3)

When a user's permissions change during an active session (role change, permission revocation), the UI should reflect these changes without requiring logout/login.

**Why this priority**: Improves security by immediately revoking access when permissions change. Nice-to-have enhancement for real-time administrative control.

**Independent Test**: Can be fully tested by having an admin revoke a user's permissions while they have the app open, and verifying the UI updates within 30 seconds to hide now-inaccessible elements. This delivers value by closing permission gaps during active sessions.

**Acceptance Scenarios**:

1. **Given** a user's role is downgraded by admin, **When** the change occurs, **Then** the user's session detects the change within 30 seconds and updates UI accordingly
2. **Given** a user's permission is revoked, **When** they attempt to perform an action requiring that permission, **Then** the action is blocked with real-time permission check
3. **Given** a user's permissions are upgraded, **When** the change propagates, **Then** new menu items and buttons appear without page refresh
4. **Given** a user session is active when permissions change, **When** the next server request occurs, **Then** the new permission set is loaded and applied to UI

---

### Edge Cases

- **What happens when a user has conflicting permissions?** (e.g., role-based allow but explicit deny) - System should default to most restrictive (deny takes precedence)
- **How does the system handle permission checks when the API is unavailable?** - Client should cache last known permission state but block all write operations until server connectivity is restored
- **What happens if a user's token expires mid-session while viewing a page?** - System should detect token expiration on next API call and redirect to login with `redirectTo` parameter
- **How are permissions checked for nested resources?** (e.g., viewing a department requires `departments:read`, but viewing employees within that department requires `employees:read`) - Each resource level requires independent permission check
- **What happens when a user manually edits the URL to access a restricted route?** - Server-side load function catches this and returns 403, triggering redirect to unauthorized page
- **How are permissions handled for bulk operations?** (e.g., bulk delete employees) - Permission check must succeed for ALL items in bulk operation, or entire operation is rejected
- **What happens if a user has partial permissions on paginated data?** (e.g., read access to first 50 employees but not next 50) - Server filters results based on user's data access scope, pagination reflects only accessible records
- **How does the system handle permission checks for real-time features like WebSocket subscriptions?** - Server validates permissions on subscription initialization and periodically during active connection

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST perform server-side permission checks in all `+page.server.ts` and `+layout.server.ts` load functions before returning data to the client
- **FR-002**: System MUST check `employees:read` permission before allowing access to any employee management routes (`/hr/employees/**`)
- **FR-003**: System MUST check `departments:read` permission before allowing access to department routes (`/admin/departments/**`)
- **FR-004**: System MUST check resource-specific write permissions (`employees:write`, `departments:write`, etc.) before rendering create, edit, or update buttons
- **FR-005**: System MUST check resource-specific delete permissions (`employees:delete`, `roles:delete`, etc.) before rendering delete or archive buttons
- **FR-006**: System MUST implement a centralized permission-checking utility function that can be imported by all components
- **FR-007**: System MUST fetch user permissions from `/api/v2/auth/verify` endpoint on each server-side page load
- **FR-008**: System MUST store user permissions in `event.locals` during the `hooks.server.ts` handle function
- **FR-009**: System MUST pass user permissions to client components via page data props (e.g., `data.userPermissions`)
- **FR-010**: System MUST redirect users to `/unauthorized` page when they lack read permissions for a requested resource
- **FR-011**: System MUST display user-friendly error messages when permission checks fail (e.g., "You don't have permission to edit employees")
- **FR-012**: System MUST implement Admin role wildcard (`*`) permission that grants access to all resources and actions
- **FR-013**: System MUST implement permission inheritance where higher roles (Admin > HR Manager > Manager > Employee) inherit lower role permissions
- **FR-014**: Navigation menus MUST filter links based on user permissions, hiding sections the user cannot access
- **FR-015**: System MUST disable form fields and hide submit buttons when user has read-only permissions
- **FR-016**: System MUST validate permissions client-side before form submission and server-side before processing mutations
- **FR-017**: System MUST implement granular permission checks for sensitive fields (e.g., `salary:read`, `ssn:read`) and hide/mask these fields when user lacks permission
- **FR-018**: System MUST handle token expiration gracefully by detecting expired tokens and redirecting to login with `redirectTo` parameter
- **FR-019**: System MUST block direct API calls from client components, enforcing all RBAC-aware calls through server-side routes
- **FR-020**: System MUST log permission check failures for audit and security monitoring purposes
- **FR-021**: System MUST support permission-based column hiding in data tables (e.g., hide salary column if user lacks `salary:read`)
- **FR-022**: System MUST implement a reusable `PermissionGuard` component that conditionally renders child elements based on permission checks
- **FR-023**: System MUST implement a `hasPermission(requiredPermission: string)` utility function that checks against user's permission array
- **FR-024**: System MUST implement a `hasAnyPermission(requiredPermissions: string[])` utility that returns true if user has any of the listed permissions
- **FR-025**: System MUST implement a `hasAllPermissions(requiredPermissions: string[])` utility that returns true only if user has all listed permissions

### Key Entities *(include if feature involves data)*

- **User Permissions**: Array of permission strings (e.g., `["employees:read", "employees:write", "departments:read"]`) associated with a user's role(s)
- **Role Hierarchy**: Defined mapping of role inheritance (Admin > HR Manager > Manager > Employee) with permission precedence rules
- **Permission String Format**: Standard format `resource:action` where resource is the entity (employees, departments, roles) and action is the operation (read, write, delete)
- **Permission Context**: Object passed through the component tree containing user's full permission set, roles, and user ID
- **Protected Route**: Server-side route with load function that validates permissions before rendering page content
- **Permission Guard Component**: Reusable Svelte component that wraps elements and conditionally renders based on permission checks

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of protected routes (`/hr/**`, `/admin/**`) must implement server-side permission checks in load functions
- **SC-002**: All action buttons (create, edit, delete) across the application must be conditionally rendered based on user permissions
- **SC-003**: Users without read permissions for a resource must receive 403 Forbidden and be redirected within 200ms of route navigation
- **SC-004**: Permission checks must occur server-side for all data-fetching operations, with zero direct API calls from client components to MountainHR backend
- **SC-005**: Navigation menus must dynamically filter to show only accessible sections, with latency under 50ms on permission changes
- **SC-006**: Security audit must confirm no permission bypass vulnerabilities in client-side code (all enforcement server-side)
- **SC-007**: E2E tests must cover all permission scenarios with at least 95% coverage of permission-gated UI elements
- **SC-008**: Performance testing must show no more than 10ms overhead per permission check in server-side load functions
- **SC-009**: User experience testing must show 100% of users correctly understand which actions they can/cannot perform based on UI element visibility
- **SC-010**: Documentation must exist for developers showing how to add permission checks to new pages and components
