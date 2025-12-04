# RBAC Inconsistency Analysis

Based on the comparison between the centralized `src/lib/server/rbac-utils.ts` (the intended standard) and the actual implementation across various features, here are the key inconsistencies:

## 1. Task System (`/dashboard/tasks`)

**Status: Inconsistent**

- **Frontend (`+page.svelte`)**: Logic for `canAssign` is derived manually from `data.user.role` checks (e.g., `data.user.role === 'hr_admin'`).
  - **Violation**: It ignores the `getUserPermissions` helper which provides standard booleans like `canReassignTasks`.
  - **Risk**: If the definition of who can assign tasks changes in `rbac-utils.ts`, the UI will not reflect it.
- **Backend**: The server-side data loading manually checks roles instead of using `PermissionChecks.tasksRead`.

## 2. Admin & Management Sections (`/dashboard/admin`, `/dashboard/management`)

**Status: Inconsistent (Legacy Pattern)**

- **Implementation**: The `+layout.server.ts` files use manual `if` statements checking against hardcoded strings (e.g., `if (!['manager', 'hr_manager', ...].includes(locals.user.role))`).
- **Violation**: This bypasses the `PermissionChecks.adminRead` and `PermissionChecks.management` utilities defined in `rbac-utils.ts`.
- **Risk**: Adding a new high-level role (e.g., "Director") requires updating every single layout file individually rather than just the central config.

## 3. Documents System (`/dashboard/documents`, `/api/documents`)

**Status: Inconsistent**

- **Implementation**: API endpoints frequently implement ad-hoc logic combining authentication checks (`!locals.user`) with manual role checks and ownership logic.
- **Violation**: Does not utilize `PermissionChecks.documentsRead` or `PermissionChecks.documentsWrite`.
- **Risk**: Inconsistent access control where a user might be able to download a document via API that they cannot see in the UI, or vice-versa.

## 4. Hardcoded Role Strings

**Status: System-wide Issue**

- **Implementation**: Strings like `'hr_manager'`, `'super_admin'`, `'system_admin'` are hardcoded in `+page.server.ts` files.
- **Violation**: `rbac-utils.ts` defines a `ROLE_HIERARCHY` constant, but it is not strictly used as the source of truth for role names.
- **Impact**: Renaming a role (e.g., "HR Manager" to "People Ops") would cause silent failures across the application.

## 5. Events System (`/dashboard/events`)

**Status: Gold Standard (Consistent)**

- **Implementation**: Uses `PermissionChecks.eventsRead` and `PermissionChecks.eventsWrite` in server actions.
- **Adherence**: This feature correctly follows the architectural pattern and should be used as the template for refactoring other sections.
