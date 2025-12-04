# SvelteHR Permissions System Analysis

## Executive Summary

The SvelteHR application employs a hybrid access control system combining:

1.  **Session-based Authentication**: Relying on `locals.user` presence (populated via `hooks.server.ts`).
2.  **Role-Based Access Control (RBAC)**: Checking `locals.user.role` against hardcoded strings (e.g., `'admin'`, `'hr_manager'`, `'manager'`, `'employee'`) or role hierarchies (`getRoleLevel`).
3.  **Permission-Based Access Control**: Using granular permission strings (e.g., `'task:create'`, `'events:write'`) stored in `locals.permissions` or checked via helper utilities like `PermissionChecks`.
4.  **Resource Ownership**: Validating that a user owns the resource (e.g., `userId === locals.user.id`) or manages the department owning the resource.

This report details the specific data and elements protected on each page and the associated permission logic.

## Route Analysis

### 1. Dashboard (General)

- **Route**: `/dashboard`
- **Data**: `user` (current user profile).
- **Permission**: Authenticated User (`locals.user`).
- **Implementation**: `if (!locals.user) redirect(...)` in `dashboard/+page.server.ts`.

### 2. Admin Section

- **Route**: `/dashboard/admin` (and sub-routes)
- **Data**: System-wide settings, user management, document audits.
- **Permission**: **Admin Role**.
- **Implementation**: `if (locals.user.role !== 'admin' && locals.user.role !== 'super_admin' ...) error(403)` in `dashboard/admin/+layout.server.ts`.

| Sub-route      | Data/Action                   | Permission | Notes                                                |
| :------------- | :---------------------------- | :--------- | :--------------------------------------------------- |
| `/documents`   | View all documents            | Admin      | Inherited from layout.                               |
| `/permissions` | View/Edit Roles & Permissions | Admin      | UI checks `hasPermission`, server checks Admin role. |
| `/users`       | Manage Users                  | Admin      | Inherited.                                           |

### 3. Management Section

- **Route**: `/dashboard/management` (and sub-routes)
- **Data**: Team goals, leave approvals, reports.
- **Permission**: **Manager Role** (or above).
- **Implementation**: `if (!['manager', 'hr_manager', 'admin', ...].includes(locals.user.role)) error(403)` in `dashboard/management/+layout.server.ts`.

| Sub-route          | Data/Action          | Permission | Notes      |
| :----------------- | :------------------- | :--------- | :--------- |
| `/goals`           | View/Edit Team Goals | Manager    | Inherited. |
| `/leave-approvals` | Approve Leave        | Manager    | Inherited. |
| `/reports`         | View Reports         | Manager    | Inherited. |

### 4. Tasks System

- **Route**: `/dashboard/tasks`
- **Data**: Task lists, statistics.
- **Permission**: Authenticated User + Specific Permissions for actions.

| Page/Action | Data/Element   | Permission                | Implementation                                                 |
| :---------- | :------------- | :------------------------ | :------------------------------------------------------------- |
| List View   | Task List      | Authenticated             | `locals.user` check.                                           |
| Create Task | `QuickAddTask` | `'task:create'` (implied) | UI checks `canAssign` based on role (`hr_admin`, `manager`).   |
| Edit Task   | Task Details   | `'task:update'` / Owner   | Server checks if user is assignee or creator (often implicit). |
| Delete Task | Delete Action  | `'task:delete'`           | UI checks `hasPermission('task:delete')`.                      |

**Inconsistency**: Frontend uses `hasPermission('task:create')` strings, but `+page.svelte` logic derives `canAssign` from _roles_ (`hr_admin`, `manager`, etc.).

### 5. Events System

- **Route**: `/dashboard/events`
- **Data**: Calendar events, attendees.
- **Permission**: Authenticated User + `events:write` for creation/editing.

| Action       | Permission                   | Implementation                                                        |
| :----------- | :--------------------------- | :-------------------------------------------------------------------- |
| View Events  | Authenticated                | `PermissionChecks.eventsRead(event)`                                  |
| Create Event | `events:write`               | `PermissionChecks.eventsWrite(event)`                                 |
| Edit/Delete  | `events:write` + Owner/Admin | `PermissionChecks.eventsWrite(event)` + logic checking `organizerId`. |
| RSVP         | Authenticated                | `PermissionChecks.eventsRead(event)`                                  |

**Observation**: Uses a centralized `PermissionChecks` utility class which is good practice.

### 6. Documents System

- **Route**: `/dashboard/documents`
- **Data**: Personal documents, policy documents.

| Action    | Permission         | Implementation                                                         |
| :-------- | :----------------- | :--------------------------------------------------------------------- |
| View List | Authenticated      | `locals.user` check.                                                   |
| Download  | Owner/Admin/Shared | `api/documents/[id]/download` checks ownership or specific roles.      |
| Upload    | Owner/Admin        | `api/documents/upload` checks ownership or Admin role for global docs. |

### 7. Employee Profile

- **Route**: `/dashboard/employees/[id]`
- **Data**: Profile info, performance, leave, attendance.

| Data Section   | Permission      | Implementation                                                |
| :------------- | :-------------- | :------------------------------------------------------------ |
| Basic Info     | Authenticated   | Visible to all authenticated users (Directory).               |
| Performance    | Self or Manager | `isViewingSelf` or `isEmployeeManager` checks in server load. |
| Leave Requests | Self or Manager | `isViewingSelf` or `isEmployeeManager`.                       |
| Attendance     | Self or Manager | `isViewingSelf` or `isEmployeeManager`.                       |

### 8. API Endpoints (`/api/...`)

Most API endpoints implement manual checks:

- **Storage**: Checks if file path starts with `locals.user.id` (Ownership).
- **Goals/Tasks**: Generally check `!locals.user` (Auth) but specific resource ownership checks vary.

## Identified Issues & Inconsistencies

1.  **Mixed Logic**: The application oscillates between checking granular permissions (e.g., `task:create`) and checking hardcoded roles (e.g., `locals.user.role === 'manager'`).
    - _Recommendation_: Standardize on granular permissions where possible, with roles serving as "permission bundles".
2.  **Hardcoded Role Strings**: Role strings (`hr_manager`, `super_admin`) are scattered throughout strings in `+page.server.ts` files.
    - _Recommendation_: Move these to a constant/enum definition.
3.  **Implicit vs Explicit**: Some actions (like creating a task) rely on UI hiding buttons based on roles, while the server action might only check if the user is authenticated.
    - _Risk_: A standard user might be able to POST to a create endpoint if the server side doesn't explicitly check the `task:create` permission or role.
4.  **Frontend/Backend Sync**: Frontend permissions (`hasPermission`) need to be perfectly synced with backend checks. The current derivation of `canAssign` in Tasks based on roles in the _component_ is brittle compared to passing a `canCreate` boolean from the server.

## Next Steps for Remediation

1.  **Audit Server Actions**: Ensure every `actions` export in `+page.server.ts` has an explicit permission check (like `PermissionChecks.eventsWrite`).
2.  **Standardize Constants**: Create a `Roles` and `Permissions` enum/constant file to replace magic strings.
3.  **Unify Logic**: Replace ad-hoc `user.role === 'manager'` checks with a unified `userHasPermission(user, 'resource:action')` helper.
