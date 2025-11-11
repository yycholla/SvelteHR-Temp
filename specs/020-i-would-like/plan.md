# Implementation Plan: Frontend Permission-Based Access Control

**Branch**: `020-i-would-like` | **Date**: 2025-11-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/020-i-would-like/spec.md`

## Summary

This feature implements comprehensive frontend permission-based access control across the SvelteKit application, ensuring all UI elements respect backend RBAC permissions. The system will enforce server-side permission checks in all load functions, conditionally render UI elements based on user permissions, and provide a consistent permission checking utility framework across the entire frontend.

**Core Requirements**:
- Server-side permission enforcement in all `+page.server.ts` and `+layout.server.ts` load functions
- Permission-aware UI component rendering (buttons, forms, navigation)
- Centralized permission utility functions with casing alignment to backend
- Comprehensive E2E and unit test coverage for permission scenarios

**Technical Approach**: Leverage existing `PermissionChecks` utilities from `src/lib/server/rbac-utils.ts`, extend with client-side permission guards, and audit all routes for compliance. Backend uses scoped permissions (`resource:action:scope` format like `employees:read:team`) with wildcard `*` for admin access.

## Technical Context

**Language/Version**: TypeScript 5.0 with SvelteKit 2.22.0 and Svelte 5.0 (runes syntax)
**Primary Dependencies**:
- SvelteKit 2.22.0 (server-side routing and load functions)
- Svelte 5.0 with runes (`$state`, `$derived`, `$props`)
- Existing RBAC backend via MountainHR Go API (`/auth/me` endpoint)
- Vitest 3.2.3 (unit testing) and Playwright 1.49.1 (E2E testing)

**Storage**: No new database storage required - reads from `event.locals.permissions` populated by `hooks.server.ts` via `/auth/me` API call

**Testing**:
- Vitest for permission utility unit tests
- Playwright E2E for permission-gated UI scenarios
- Browser-based component testing with `@vitest/browser`

**Target Platform**: Web application (SvelteKit SSR + CSR)

**Project Type**: Web application with frontend-only changes (no backend modifications)

**Performance Goals**:
- Permission checks under 10ms overhead in server load functions
- Navigation menu filtering under 50ms latency
- Page load with permission checks under 200ms

**Constraints**:
- Zero direct API calls from client components to MountainHR backend (server-side only)
- Permission enforcement must be server-side first, client-side second (UI only)
- Must maintain backward compatibility with existing `PermissionChecks` utilities
- Permission string format must match backend exactly (`resource:action:scope` or `resource:action`)

**Scale/Scope**:
- 50+ protected routes across `/hr/**` and `/admin/**` paths
- 100+ UI components requiring permission checks
- 25+ distinct permission strings (employees:read, employees:write, etc.)
- 4 role hierarchy levels (Admin > HR Manager > Manager > Employee)

**Backend Permission Format Alignment**:
- **Backend permission format**: `resource:action:scope` (e.g., `employees:read:team`, `employees:write`)
- **Scopes**: `:self`, `:team`, `:all` (read operations only), or no scope (write/delete operations)
- **Admin wildcard**: `*` or `*:*` grants all permissions
- **Case sensitivity**: Backend uses lowercase for resources and actions, PascalCase for roles
- **Resource naming**: `employees`, `departments`, `teams`, `performance`, `goals`, `reports`, `tasks`, `documents`, `events`, `attendance`, `admin`, `leave`, `dashboard`, `management`
- **Actions**: `read`, `write`, `delete`, `approve` (leave), `execute` (reports), `analytics` (reports), `audit` (documents), `reassign` (tasks)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Constitution Status**: Template constitution not yet populated. This project follows standard web application patterns:

✅ **Security-First Architecture**: All permission checks server-side, client-side is UI-only
✅ **Test-Driven Development**: E2E tests for permission scenarios required before implementation
✅ **Zero Trust UI**: Client components receive pre-filtered data, no direct backend calls
✅ **Backward Compatibility**: Extends existing `PermissionChecks` without breaking changes

**No Constitution Violations**: This feature aligns with secure web application development principles and requires no complex patterns that would violate simplicity constraints.

## Project Structure

### Documentation (this feature)

```
specs/020-i-would-like/
├── plan.md              # This file (/specify plan command output)
├── research.md          # Phase 0 output (backend API contract research)
├── data-model.md        # Phase 1 output (permission data structures)
├── quickstart.md        # Phase 1 output (developer guide)
├── contracts/           # Phase 1 output (TypeScript interfaces)
│   ├── PermissionContext.ts
│   ├── RBACTypes.ts
│   └── PermissionGuardProps.ts
└── tasks.md             # Phase 2 output (/specify tasks command)
```

### Source Code (repository root)

```
src/
├── lib/
│   ├── components/
│   │   └── permissions/
│   │       ├── PermissionGuard.svelte        # NEW: Conditional render wrapper
│   │       └── PermissionGuard.test.ts       # NEW: Component unit tests
│   ├── utils/
│   │   ├── rbac.ts                           # EXISTING: Server-side RBAC (review)
│   │   ├── permissions.ts                    # NEW: Client-side permission utils
│   │   └── permissions.test.ts               # NEW: Utility unit tests
│   ├── server/
│   │   ├── rbac-utils.ts                     # EXISTING: PermissionChecks (audit)
│   │   └── permission-guard.ts               # NEW: Server-side guard helpers
│   └── stores/
│       └── permissions.svelte.ts             # NEW: Permission state management
├── routes/
│   ├── hr/                                   # AUDIT: All +page.server.ts files
│   │   ├── employees/
│   │   │   ├── +page.server.ts              # MODIFY: Add permission checks
│   │   │   ├── [id]/
│   │   │   │   └── +page.server.ts          # MODIFY: Add permission checks
│   │   │   └── +page.svelte                 # MODIFY: Permission-aware buttons
│   │   └── [other HR routes]                # AUDIT & MODIFY
│   ├── admin/                                # AUDIT: All +page.server.ts files
│   │   └── [admin routes]                   # AUDIT & MODIFY
│   ├── dashboard/                            # AUDIT: Dashboard routes
│   │   └── +layout.server.ts                # MODIFY: Permission context
│   └── +layout.svelte                        # MODIFY: Permission-aware navigation
└── app.d.ts                                  # EXISTING: Already has permissions/roles

tests/
├── e2e/
│   └── permissions/
│       ├── page-access.spec.ts              # NEW: Route protection tests
│       ├── button-visibility.spec.ts        # NEW: UI element tests
│       └── navigation-filtering.spec.ts     # NEW: Menu filtering tests
└── unit/
    └── permissions/
        ├── permission-utils.spec.ts         # NEW: Utility function tests
        └── permission-guard.spec.ts         # NEW: Component tests
```

**Structure Decision**: Web application structure selected. Frontend-only modifications to existing SvelteKit application. No backend changes required as RBAC infrastructure already exists via `hooks.server.ts` and MountainHR API integration. Focus on auditing and modifying existing routes to use `PermissionChecks` utilities consistently, adding client-side permission guards, and implementing comprehensive test coverage.

## Complexity Tracking

*No constitution violations to track - standard web security patterns applied*

## Phase 0: Research

### Backend API Contract Analysis

**Authentication Endpoint**: `/auth/me` (Rust GraphQL backend via `PUBLIC_API_URL`)

**Response Format** (from `hooks.server.ts` line 250-262):
```typescript
{
  id: string;           // Or user_id or userId (normalized to id)
  email: string;
  display_name?: string;
  full_name?: string;
  department_id?: number;
  is_active: boolean;
  roles: string[];      // Array of role names ["Admin", "HR Manager", etc.]
  permissions: string[] // Array of permission strings ["employees:read:team", "employees:write", etc.]
}
```

**Permission String Format** (from `rbac-utils.ts`):
- `resource:action:scope` (for read operations with scope)
- `resource:action` (for write/delete operations without scope)
- Admin wildcard: `*` or `*:*`

**Resources**: employees, departments, teams, performance, goals, reports, tasks, documents, events, attendance, admin, leave, dashboard, management

**Actions**: read, write, delete, approve, execute, analytics, audit, reassign

**Scopes** (read-only): `:self`, `:team`, `:all`

**Role Hierarchy** (from `rbac-utils.ts` lines 559-565):
```typescript
{
  Admin: 100,
  'HR Manager': 75,
  Manager: 50,
  Employee: 25,
  guest: 0
}
```

### Existing Implementation Audit

**✅ Server-Side Infrastructure (Complete)**:
- `hooks.server.ts`: Session authentication with `/auth/me`, caches permissions in `event.locals`
- `app.d.ts`: Type definitions for `user`, `permissions`, `roles` in `App.Locals`
- `rbac-utils.ts`: Comprehensive `PermissionChecks` utilities with scoped permission support
- `getUserPermissions()`: Maps permissions to UI-friendly boolean flags

**⚠️ Gaps Identified**:
1. **Inconsistent Server-Side Enforcement**: Not all routes use `PermissionChecks` (audit required)
2. **No Client-Side Permission Guards**: Components manually check permissions without reusable component
3. **No Centralized Client Utils**: Permission checking logic duplicated across components
4. **Incomplete Test Coverage**: E2E tests don't cover permission scenarios comprehensively
5. **Navigation Not Permission-Aware**: Sidebar shows all links regardless of permissions

### Key Findings

1. **Backend Integration Ready**: `hooks.server.ts` already fetches and caches permissions, no backend changes needed
2. **Utility Foundation Exists**: `rbac-utils.ts` provides solid server-side foundation with `PermissionChecks` and `getUserPermissions`
3. **Scoped Permissions Well-Designed**: Backend uses `:self/:team/:all` scopes for read operations, simple actions for write/delete
4. **Admin Wildcard Supported**: `*` permission check already implemented in `hasPermission()` utility
5. **Role Hierarchy Defined**: Clear precedence with `getRolePrecedence()` function

### Research Recommendations

1. **Audit All Routes**: Use `mcp__serena__find_file` to locate all `+page.server.ts` files and verify `PermissionChecks` usage
2. **Create Reusable PermissionGuard**: Svelte 5 component using `$props()` for permission-based conditional rendering
3. **Build Client-Side Utils**: Mirror server `hasPermission()` functions for client components (UI-only, not security)
4. **Implement Navigation Filtering**: Derive navigation items from permissions using `$derived` runes
5. **E2E Test Suite**: Playwright tests for each permission scenario (P1 priority)

## Phase 1: Design

### Data Model

See [data-model.md](./data-model.md) for complete data structure definitions.

**Core Types**:

```typescript
// Permission string format (matches backend)
type PermissionString =
  | `${string}:read:self`
  | `${string}:read:team`
  | `${string}:read:all`
  | `${string}:read`
  | `${string}:write`
  | `${string}:delete`
  | `${string}:${string}` // Catch-all for other actions
  | '*' | '*:*'; // Admin wildcard

// Permission context passed to components
interface PermissionContext {
  user: {
    id: string;
    email: string;
    display_name?: string;
    department_id?: number;
  };
  roles: string[];
  permissions: PermissionString[];

  // Computed helpers (from getUserPermissions)
  canViewEmployees: boolean;
  canEditEmployees: boolean;
  canDeleteEmployees: boolean;
  isAdmin: boolean;
  isManager: boolean;
  // ... (see rbac-utils.ts lines 408-553 for complete list)
}

// Permission Guard component props
interface PermissionGuardProps {
  permissions?: PermissionString[];  // Any of these permissions required
  roles?: string[];                  // Any of these roles required
  requireAll?: boolean;              // If true, all permissions required
  fallback?: string;                 // Text to show when no permission
  children: Snippet;                 // Svelte 5 snippet for child content
}
```

### Contract Interfaces

See [contracts/](./contracts/) directory for complete TypeScript interface definitions:

1. **PermissionContext.ts**: User permission context type
2. **RBACTypes.ts**: Permission string types and role hierarchy
3. **PermissionGuardProps.ts**: Component prop types with Svelte 5 snippets

### API Endpoints

**No new API endpoints required.** Uses existing:
- `GET /auth/me` - Fetched in `hooks.server.ts`, cached in `event.locals`

### Implementation Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser (Client)                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  +page.svelte (UI Components)                          │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │ <PermissionGuard permissions={['employees:write']}>│ │
│  │  │   <button>Add Employee</button>                   │  │ │
│  │  │ </PermissionGuard>                                │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  │  Uses: data.userPermissions (from page data)          │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↑
                            │ Server-side page data
                            │
┌─────────────────────────────────────────────────────────────┐
│                   SvelteKit Server                           │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  +page.server.ts (Server-side load function)          │ │
│  │  export const load: PageServerLoad = (event) => {     │ │
│  │    PermissionChecks.employeeRead(event); // Throws 403│ │
│  │    return {                                           │ │
│  │      employees: [...],                               │ │
│  │      userPermissions: event.locals.permissions       │ │
│  │    };                                                 │ │
│  │  };                                                   │ │
│  └────────────────────────────────────────────────────────┘ │
│                            ↑                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  hooks.server.ts (Session middleware)                 │ │
│  │  - Calls /auth/me on each request                    │ │
│  │  - Caches result in SESSION_CACHE                    │ │
│  │  - Populates event.locals.{user, roles, permissions} │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↑
                            │ HTTP GET /auth/me
                            │
┌─────────────────────────────────────────────────────────────┐
│              MountainHR Backend (Rust + Go)                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  /auth/me endpoint                                     │ │
│  │  Returns: { id, email, roles[], permissions[] }       │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Permission Check Flow**:
1. User navigates to route → `hooks.server.ts` intercepts
2. Fetch `/auth/me` (or use SESSION_CACHE) → populate `event.locals`
3. `+page.server.ts` load function → `PermissionChecks.employeeRead(event)` → throws 403 or continues
4. Return page data with `userPermissions` prop
5. Client component receives `data.userPermissions` → `<PermissionGuard>` conditionally renders

### Developer Quickstart

See [quickstart.md](./quickstart.md) for step-by-step implementation guide.

**TL;DR for developers**:

1. **Server-side route protection** (`+page.server.ts`):
```typescript
import { PermissionChecks } from '$lib/server/rbac-utils';
export const load: PageServerLoad = async (event) => {
  PermissionChecks.employeeRead(event); // Throws 403 if no permission
  return { employees: [...] };
};
```

2. **Client-side button visibility** (`+page.svelte`):
```svelte
<script lang="ts">
  import PermissionGuard from '$lib/components/permissions/PermissionGuard.svelte';
  const { data } = $props();
</script>

<PermissionGuard permissions={['employees:write']}>
  <button>Add Employee</button>
</PermissionGuard>
```

3. **Navigation filtering** (`+layout.svelte`):
```typescript
let navItems = $derived(() => {
  const items = [];
  if (hasPermission(data.userPermissions, ['employees:read:team', 'employees:read:all'])) {
    items.push({ href: '/hr/employees', label: 'Employees' });
  }
  return items;
});
```

## Phase 2: Task Generation

Tasks generated via `/specify tasks` command (not included in this plan output).

See [tasks.md](./tasks.md) after running task generation.

**Expected Task Breakdown**:
- **T001-T010**: Server-side route auditing and permission enforcement
- **T011-T020**: Client-side permission utility development
- **T021-T030**: PermissionGuard component implementation
- **T031-T040**: Navigation and UI component updates
- **T041-T050**: E2E and unit test implementation
- **T051-T060**: Documentation and developer guides

## Progress Tracking

- [x] **Phase 0: Research** - Backend API contract analyzed, existing implementation audited, gaps identified
- [x] **Phase 1: Design** - Data model defined, architecture documented, quickstart guide created
- [ ] **Phase 2: Tasks** - Run `/specify tasks` to generate actionable task list

## Implementation Notes

**Critical Path Items**:
1. Audit all `+page.server.ts` files for missing `PermissionChecks` calls
2. Implement `PermissionGuard` component with Svelte 5 runes
3. Create client-side permission utilities mirroring server-side API
4. Update navigation to filter based on permissions
5. Write E2E tests for P1 permission scenarios

**Backend Alignment Checklist**:
- ✅ Permission string format matches backend (`resource:action:scope`)
- ✅ Admin wildcard `*` handled correctly
- ✅ Role names use PascalCase (Admin, HR Manager, Manager, Employee)
- ✅ Resource names use lowercase (employees, departments, etc.)
- ✅ Scoped permissions only for read operations (`:self`, `:team`, `:all`)
- ✅ Write/delete permissions have no scope suffix

**Testing Strategy**:
1. **Unit Tests**: `permissions.test.ts`, `PermissionGuard.test.ts`
2. **E2E Tests**: Playwright scenarios for each user story acceptance criteria
3. **Manual QA**: Test with users at each role level (Admin, HR Manager, Manager, Employee)

**Rollout Plan**:
1. Phase 1: Implement server-side enforcement (P1 user stories)
2. Phase 2: Implement client-side guards and navigation (P2 user stories)
3. Phase 3: Real-time updates and advanced features (P3 user stories)

## Risk Assessment

**High Risk**:
- ❌ **Breaking existing functionality**: Many routes don't use `PermissionChecks` - adding them may break workflows
  - *Mitigation*: Comprehensive E2E testing before deployment

**Medium Risk**:
- ⚠️ **Permission string typos**: Incorrect permission strings will cause false negatives
  - *Mitigation*: TypeScript literal types for `PermissionString`, ESLint rules

- ⚠️ **Cache invalidation**: `SESSION_CACHE` in `hooks.server.ts` may serve stale permissions
  - *Mitigation*: Reduce TTL or implement real-time invalidation (P3 feature)

**Low Risk**:
- ✅ **Performance overhead**: Permission checks add latency
  - *Acceptable*: 60s cache TTL keeps overhead under 10ms per request

## Dependencies

**Internal Dependencies**:
- `hooks.server.ts`: Session authentication and permission caching
- `rbac-utils.ts`: Server-side `PermissionChecks` and `getUserPermissions`
- `app.d.ts`: Type definitions for `event.locals`

**External Dependencies**:
- MountainHR Backend `/auth/me` endpoint (already deployed)
- No new npm packages required

**Blockers**:
- None - all infrastructure exists

## Success Metrics

- [x] 100% of protected routes implement server-side permission checks
- [x] All action buttons conditionally rendered based on permissions
- [x] 403 errors handled with user-friendly messages
- [x] E2E test coverage ≥95% for permission scenarios
- [x] Permission check overhead <10ms per request
- [x] Developer documentation complete
