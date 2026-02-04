# Codebase Cleanup & Consolidation Design

**Date:** 2026-02-04
**Status:** Ready for Implementation
**Estimated Impact:** ~2,900-3,200 LOC removed

## Overview

This design documents a comprehensive cleanup of the SvelteHR codebase to remove dead code, consolidate duplicate implementations, and reduce maintenance burden.

### Goals
- Remove unused and deprecated code
- Consolidate duplicate component implementations
- Standardize on Shadcn UI (already 95% adopted)
- Clean up GraphQL client patterns
- Reduce codebase size by ~3,000 LOC

### Non-Goals
- Mass migration of `createUrqlClient` to `createGraphQLClient` (too much churn)
- Implementing missing TODO items (separate effort)
- Backend changes

---

## Analysis Summary

### UI Library Usage
| Library | Components | Imports | Files Using | Coverage |
|---------|------------|---------|-------------|----------|
| Shadcn UI | 328 | 1,005 | 344 | ~95% |
| Base Components | 7 | 5 | 1 | ~0.5% |

**Decision:** Standardize on Shadcn UI, remove base components.

### Route Comparison: employees vs employees2
| Aspect | `/employees` | `/employees2` |
|--------|--------------|---------------|
| Routes | 10 | 1 (detail only) |
| LOC | 3,006 | 896 |
| Features | 14/14 | 5/14 |
| Architecture | Hexagonal | Procedural |

**Decision:** Keep `/employees`, delete incomplete `/employees2`.

### Employee List Components
All 5 list components (`EmployeeList.svelte`, `EmployeeListShadcn.svelte`, and 3 modular pieces) are **completely unused**. The actual implementation uses `EmployeeDataTable` and `EmployeeGrid`.

### GraphQL Client Patterns
| Client | Usage | Status |
|--------|-------|--------|
| `createUrqlClient` | 188 | Active (legacy) |
| `createGraphQLClient` | 14 | Active (modern) |
| `urql-client.ts` | 3 | Deprecated |
| `GraphQLClient` class | ~0 | Abandoned |

**Decision:** Delete deprecated files, document both active patterns.

---

## Phase 1: Pure Deletions (No Dependencies)

These items can be deleted immediately with no migration required.

### 1.1 Delete employees2 Route
**Path:** `/src/routes/dashboard/employees2/`

- 896 LOC removed
- Incomplete experiment (detail page only)
- Primary route is feature-complete

### 1.2 Delete Legacy Form Directory
**Path:** `/src/lib/components/employees/form-legacy/`

Files to delete:
- `AccountInfo.svelte`
- `AddressInfo.svelte`
- `BasicInfo.svelte`
- `ContactInfo.svelte`
- `JobInfo.svelte`

New modular form already exists in `/src/lib/components/employees/form/`.

### 1.3 Delete Backup Files
- `/src/routes/dashboard/employees/+page.svelte.bak`
- `/src/routes/dashboard/employees/import/_page.legacy.svelte`

### 1.4 Delete Deprecated Auth Files
Session-based auth is now standard. Delete JWT-related files:

- `/src/lib/auth/jwt-utils.ts` - Entire file deprecated
- `/src/lib/auth/migration.ts` - All functions deprecated
- `/src/lib/server/jwt-debug.ts` - Deprecated
- `/src/routes/api/test-auth/+server.ts` - Deprecated endpoint

**Note:** Review `/src/lib/auth/config.ts` for deprecated exports that may need removal.

---

## Phase 2: Unused Component Cleanup

### 2.1 Delete Unused Employee List Components
**Path:** `/src/lib/components/employees/`

Files to delete (0 imports each):
- `EmployeeList.svelte`
- `EmployeeListShadcn.svelte`

**Path:** `/src/lib/components/employees/list/`

Delete entire directory:
- `EmployeeListContent.svelte`
- `EmployeeListHeader.svelte`
- `EmployeeListPagination.svelte`

These are orphaned - only used by the unused `EmployeeList.svelte`.

### 2.2 Delete Deprecated GraphQL Employee Operations
**Path:** `/src/lib/graphql/employees/`

Delete entire directory:
- `queries.ts` - GET_EMPLOYEES_QUERY, GET_EMPLOYEE_BY_ID_QUERY
- `mutations.ts` - CREATE, UPDATE, DELETE mutations

These are superseded by `EmployeeService`. Only references are in:
- The deleted EmployeeList components
- Documentation (update to remove deprecated examples)

### 2.3 Update Index Exports
**File:** `/src/lib/components/employees/index.ts`

Remove exports for deleted components:
- `EmployeeList`
- Any references to `form-legacy/` components

---

## Phase 3: Consolidations (Minor Migrations)

### 3.1 Migrate Tasks Page to Shadcn
**File:** `/src/routes/tasks/+page.svelte`

This is the only file using base components. Update imports:

| Base Component | Shadcn Replacement |
|----------------|-------------------|
| `Button` | `$lib/components/ui/button` |
| `Input` | `$lib/components/ui/input` |
| `Select` | `$lib/components/ui/select` |
| `Badge` | `$lib/components/ui/badge` |
| `Card` | `$lib/components/ui/card` |

### 3.2 Delete Base Components Directory
**Path:** `/src/lib/components/base/`

After migrating tasks page, delete entire directory:
- `Button.svelte`
- `Input.svelte`
- `Badge.svelte`
- `Card.svelte`
- `Modal.svelte`
- `Select.svelte`
- `Textarea.svelte`

### 3.3 Consolidate Employee Forms
**Current:**
- `EmployeeForm.svelte` (366 LOC) - Custom styling
- `EmployeeFormShadcn.svelte` (386 LOC) - Shadcn UI

**Action:**
1. Delete `EmployeeForm.svelte`
2. Rename `EmployeeFormShadcn.svelte` → `EmployeeForm.svelte`
3. Update all imports (search for `EmployeeFormShadcn`)

### 3.4 Migrate urql-client.ts Imports
**File to delete:** `/src/lib/api/urql-client.ts`

Files to migrate (3 total):
- `/src/routes/dashboard/onboarding/[id]/+page.server.ts`
- `/src/routes/admin/forms/[id]/+page.server.ts`
- `/src/routes/admin/onboarding/[id]/forms/+page.server.ts`

Change:
```typescript
// Before
import { createUrqlClient } from '$lib/api/urql-client';

// After
import { createUrqlClient } from '$lib/graphql/client';
```

Then delete `/src/lib/api/urql-client.ts`.

---

## Phase 4: Documentation Updates

### 4.1 Update CLAUDE.md
Add `createGraphQLClient` as preferred pattern for new code:

```markdown
**Data Fetching Patterns:**

1. **Preferred (New Code):** `createGraphQLClient(event)`
   ```typescript
   import { createGraphQLClient } from '$lib/server/graphql';

   export const load: PageServerLoad = async (event) => {
     const client = createGraphQLClient(event);
     const result = await client.query(GET_DATA, { limit: 20 });
     return { data: result };
   };
   ```

2. **Legacy (Still Valid):** `createUrqlClient` with `serializeCookies`
   ```typescript
   import { createUrqlClient, serializeCookies } from '$lib/graphql/client';

   const client = createUrqlClient(fetch, undefined, undefined, serializeCookies(cookies));
   ```
```

### 4.2 Update Migration Documentation
**File:** `/docs/guides/using-employee-service.md`

Remove deprecated GraphQL examples that reference deleted files.

### 4.3 Update Architecture Documentation
**File:** `/docs/architecture/employee-module-migration.md`

Mark migration as complete, remove references to deleted components.

---

## Execution Checklist

### Phase 1: Pure Deletions
- [ ] Delete `/src/routes/dashboard/employees2/`
- [ ] Delete `/src/lib/components/employees/form-legacy/`
- [ ] Delete `/src/routes/dashboard/employees/+page.svelte.bak`
- [ ] Delete `/src/routes/dashboard/employees/import/_page.legacy.svelte`
- [ ] Delete `/src/lib/auth/jwt-utils.ts`
- [ ] Delete `/src/lib/auth/migration.ts`
- [ ] Delete `/src/lib/server/jwt-debug.ts`
- [ ] Delete `/src/routes/api/test-auth/+server.ts`
- [ ] Review `/src/lib/auth/config.ts` for deprecated exports

### Phase 2: Unused Component Cleanup
- [ ] Delete `/src/lib/components/employees/EmployeeList.svelte`
- [ ] Delete `/src/lib/components/employees/EmployeeListShadcn.svelte`
- [ ] Delete `/src/lib/components/employees/list/` directory
- [ ] Delete `/src/lib/graphql/employees/` directory
- [ ] Update `/src/lib/components/employees/index.ts`

### Phase 3: Consolidations
- [ ] Migrate `/src/routes/tasks/+page.svelte` to Shadcn
- [ ] Delete `/src/lib/components/base/` directory
- [ ] Delete `/src/lib/components/employees/EmployeeForm.svelte`
- [ ] Rename `EmployeeFormShadcn.svelte` → `EmployeeForm.svelte`
- [ ] Update imports referencing `EmployeeFormShadcn`
- [ ] Migrate 3 files from `$lib/api/urql-client`
- [ ] Delete `/src/lib/api/urql-client.ts`

### Phase 4: Documentation
- [ ] Update CLAUDE.md with GraphQL client patterns
- [ ] Update `/docs/guides/using-employee-service.md`
- [ ] Update `/docs/architecture/employee-module-migration.md`

### Verification
- [ ] Run `npm run check` - TypeScript/Svelte check
- [ ] Run `npm run test` - All tests pass
- [ ] Run `npm run build` - Production build succeeds
- [ ] Manual smoke test of employee routes

---

## Impact Summary

| Category | Est. LOC Removed |
|----------|------------------|
| employees2 route | ~900 |
| Legacy form directory | ~300 |
| Backup files | ~50 |
| Deprecated auth files | ~250 |
| Unused list components | ~600 |
| GraphQL employees directory | ~200 |
| Base components | ~400 |
| Old EmployeeForm | ~366 |
| urql-client.ts | ~50 |
| **Total** | **~3,100 LOC** |

---

## Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Breaking imports | Low | Search for all imports before deletion |
| Test failures | Low | Run full test suite after each phase |
| Missing functionality | Low | Analysis confirmed components are unused |
| Documentation drift | Medium | Update docs in same PR |

---

## Future Considerations (Out of Scope)

These items were identified but deferred:

1. **Mass migration to `createGraphQLClient`** - 188 uses of `createUrqlClient` exist. Migrate incrementally when touching files.

2. **TODO items** - ~40 TODOs exist, mostly minor UI enhancements or backend limitations. Address separately.

3. **Backend statistics endpoint** - Current workaround queries all employees with `limit=1000`. Needs backend implementation.

4. **Service layer standardization** - Mix of `/lib/services/` and inline route logic. Document guidelines for future work.
