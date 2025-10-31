# Research: Management Pages Repair & Admin Implementation

**Date**: 2025-09-30
**Feature**: 016-repair-management-pages
**Status**: Complete

## Research Questions & Decisions

### 1. Manager CRUD Operations

**Question**: How to implement full CRUD for managers on team data (performance reviews, goals, reports, task assignment)?

**Decision**: Extend existing GraphQL operations stubs with proper implementations using PostGraphile RLS policies

**Rationale**:
- PostGraphile auto-generates CRUD mutations from database schema
- Row-Level Security (RLS) policies provide department-scoped data filtering at database level
- Existing stubs (`leave-management-operations.ts`, `performance-management-operations.ts`, `goals-okrs-operations.ts`, `reports-operations.ts`) need actual GraphQL queries/mutations
- RLS approach enforces security at the data layer, not application layer

**Alternatives Considered**:
1. Custom GraphQL resolvers - **Rejected**: Adds unnecessary complexity, duplicates PostGraphile's auto-generation, harder to maintain
2. REST API endpoints - **Rejected**: GraphQL already established, would create inconsistency
3. Direct database access from frontend - **Rejected**: Violates security by design, bypasses RLS

**Implementation Approach**:
- Add RLS policies: `CREATE POLICY manager_department_access ON [table] USING (department_id = current_setting('jwt.claims.department_id')::uuid)`
- Convert stub functions to actual GraphQL operations with proper filtering
- Use `userCredentials` parameter for JWT token propagation

---

### 2. Admin Pages Architecture

**Question**: Best practices for implementing admin suite (User Management, System Settings, Audit Logs, Analytics Dashboard, Compliance Reports)?

**Decision**: Dedicated `/dashboard/admin/` route structure with lazy loading and RBAC route guards

**Rationale**:
- Code splitting reduces initial bundle size (admin pages only loaded for admin users)
- Clear separation from management pages improves maintainability
- RBAC guard at route level (`+page.server.ts`) prevents unauthorized access before page render
- Dedicated `/admin/` section in sidebar provides clear navigation hierarchy

**Alternatives Considered**:
1. Modal-based admin interface - **Rejected**: Poor UX for complex admin tasks (User Management requires forms, tables, filters), modals too constrained
2. Tabs within management pages - **Rejected**: Mixes concerns, confusing navigation, harder to implement RBAC
3. Separate admin app - **Rejected**: Overkill, requires separate deployment, complicates shared components

**Implementation Approach**:
```
src/routes/dashboard/admin/
├── +layout.server.ts          # Admin RBAC guard (all child routes)
├── users/+page.server.ts      # User Management
├── settings/+page.server.ts   # System Settings
├── audit/+page.server.ts      # Audit Logs
├── analytics/+page.server.ts  # Analytics Dashboard
└── compliance/+page.server.ts # Compliance Reports
```

---

### 3. Theme Consistency Strategy

**Question**: How to ensure theme consistency across all cards and UI elements (management pages, admin pages, analytics cards)?

**Decision**: Centralized CSS custom properties + component audit + theme store integration

**Rationale**:
- CSS custom properties (CSS variables) provide single source of truth for theme values
- Tailwind CSS 4.0 supports CSS variables natively: `bg-[var(--card-bg)]`
- Theme store (`$theme`) enables reactive updates without page refresh
- Component audit identifies all theme-inconsistent cards for systematic fixes

**Alternatives Considered**:
1. Per-component theme classes - **Rejected**: Maintenance burden, high risk of inconsistency, difficult to update globally
2. Inline styles - **Rejected**: Violates separation of concerns, harder to maintain, breaks Tailwind's utility-first approach
3. JavaScript-based theme switching - **Rejected**: Slower than CSS, causes flash of unstyled content (FOUC)

**Implementation Approach**:
1. Define CSS custom properties in `app.css`:
   ```css
   :root {
     --card-bg-light: #ffffff;
     --card-border-light: #e5e7eb;
     --card-shadow-light: 0 1px 3px rgba(0,0,0,0.1);
   }
   .dark {
     --card-bg-dark: #1f2937;
     --card-border-dark: #374151;
     --card-shadow-dark: 0 1px 3px rgba(0,0,0,0.3);
   }
   ```

2. Create theme-aware card component wrapper
3. Audit all pages, replace hardcoded colors with CSS variables
4. Theme store triggers `<html class="dark">` toggle

---

### 4. Department Transfer Detection

**Question**: How to detect mid-session department changes and refresh permissions automatically (FR-029)?

**Decision**: Real-time GraphQL subscriptions + periodic permission refresh via polling

**Rationale**:
- GraphQL subscriptions provide instant notification when user's department assignment changes
- Polling fallback ensures detection even if WebSocket connection drops
- No logout required preserves user session and in-progress work
- Aligns with FR-029: "automatically refresh permissions and switch to new department data"

**Alternatives Considered**:
1. Manual refresh only - **Rejected**: Poor UX, users may access wrong department data until they manually refresh
2. Force logout on transfer - **Rejected**: Disrupts workflow, loses in-progress work, violates FR-029 requirement
3. Server-side session invalidation - **Rejected**: Requires logout, doesn't meet "without logout" requirement

**Implementation Approach**:
1. GraphQL subscription:
   ```graphql
   subscription OnDepartmentChange($userId: UUID!) {
     userById(id: $userId) {
       departmentId
     }
   }
   ```

2. Polling fallback (every 60 seconds):
   ```typescript
   setInterval(async () => {
     const currentDept = await verifyDepartment(userId);
     if (currentDept !== storedDept) {
       await refreshPermissions();
       await switchDepartmentView(currentDept);
     }
   }, 60000);
   ```

3. Permission refresh updates `locals.permissions` and re-fetches department-scoped data

---

### 5. Database Schema Validation

**Question**: How to validate schema on deployment (ensure departments, users, leave_requests, performance_reviews, goals, tasks, reports tables exist with proper foreign keys)?

**Decision**: Migration scripts with validation checks + startup health check

**Rationale**:
- Fail-fast approach catches schema issues before application starts
- Explicit error messages guide developers to fix schema problems
- Migration scripts ensure consistent database state across environments
- Startup health check prevents application from running with invalid schema

**Alternatives Considered**:
1. Runtime schema discovery - **Rejected**: Masks schema issues until feature is used, late failure
2. Application-level schema validation on first query - **Rejected**: Still allows app to start with bad schema, confusing errors
3. No validation (assume schema correct) - **Rejected**: Violates FR-025 requirement, high risk of runtime errors

**Implementation Approach**:
1. Migration script `migrations/validate-schema.sql`:
   ```sql
   -- Check required tables exist
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN ('departments', 'users', 'leave_requests', 'performance_reviews', 'goals', 'tasks', 'reports');

   -- Check foreign key constraints
   SELECT conname, conrelid::regclass, confrelid::regclass
   FROM pg_constraint
   WHERE contype = 'f'
   AND conrelid::regclass::text IN ('users', 'departments', 'leave_requests', 'performance_reviews', 'goals', 'tasks', 'reports');
   ```

2. Startup health check in `backend/src/server.ts`:
   ```typescript
   async function validateSchema() {
     const requiredTables = ['departments', 'users', 'leave_requests', ...];
     for (const table of requiredTables) {
       const exists = await db.query(`SELECT to_regclass('public.${table}')`);
       if (!exists) throw new Error(`Missing table: ${table}`);
     }
   }
   ```

3. Exit with code 1 if validation fails (CI/CD will catch deployment issues)

---

## Technology Stack Summary

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Backend** | PostGraphile + PostgreSQL | RLS policies, auto-generated GraphQL |
| **Frontend** | SvelteKit 2.22.0 + Svelte 5 | Runes mode, server-side rendering |
| **Auth** | Better Auth 1.3.4 + JWT | 4-tier RBAC, token-based authentication |
| **Theme** | Tailwind CSS 4.0 + CSS variables | Utility-first, native CSS variable support |
| **Testing** | Playwright (E2E) + Vitest (unit) | Constitution-mandated >90% coverage |
| **Caching** | Redis | Frequently accessed data (departments, permissions) |

---

## Performance Considerations

| Area | Target | Approach |
|------|--------|----------|
| **GraphQL Operations** | <200ms | Redis caching, indexed foreign keys |
| **Page Load** | <1s | Code splitting, lazy loading admin pages |
| **Theme Switching** | Instant | CSS variables (no re-render), theme store |
| **Permission Refresh** | <100ms | Cached permissions, incremental updates |

---

## Security Considerations

| Concern | Mitigation |
|---------|-----------|
| **Unauthorized dept access** | RLS policies at database level |
| **Manager accessing wrong dept** | Department transfer detection + auto-refresh |
| **Admin impersonation** | Role precedence logic (FR-030), JWT validation |
| **SQL injection** | PostGraphile parameterized queries, Zod validation |
| **XSS attacks** | Svelte auto-escaping, Content Security Policy (CSP) |

---

## Next Steps

1. ✅ Research complete - all decisions documented
2. → Phase 1: Generate data-model.md, contracts/, quickstart.md
3. → Phase 2: Generate tasks.md (/tasks command)
4. → Phase 3-5: Implementation, testing, validation
