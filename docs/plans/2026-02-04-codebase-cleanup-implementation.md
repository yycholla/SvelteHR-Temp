# Codebase Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove ~3,100 LOC of dead code, consolidate duplicate components, and standardize on Shadcn UI.

**Architecture:** Phased deletion approach - pure deletions first (no dependencies), then unused components, then consolidations requiring minor migrations. Each phase verified with type checks and tests.

**Tech Stack:** SvelteKit 2.43+, Svelte 5, TypeScript 5, Shadcn UI, Vitest

---

## Phase 1: Pure Deletions (No Dependencies)

### Task 1: Delete employees2 Route

**Files:**
- Delete: `src/routes/dashboard/employees2/` (entire directory)

**Step 1: Verify no imports exist**

Run: `grep -r "employees2" src/`
Expected: No imports referencing this route (only route itself)

**Step 2: Delete the directory**

```bash
rm -rf src/routes/dashboard/employees2/
```

**Step 3: Run type check**

Run: `npm run check`
Expected: PASS with no errors related to employees2

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove incomplete employees2 route experiment"
```

---

### Task 2: Delete Legacy Form Directory

**Files:**
- Delete: `src/lib/components/employees/form-legacy/` (entire directory)

**Step 1: Verify no imports exist**

Run: `grep -r "form-legacy" src/`
Expected: No imports (new form in `form/` is used instead)

**Step 2: Delete the directory**

```bash
rm -rf src/lib/components/employees/form-legacy/
```

**Step 3: Run type check**

Run: `npm run check`
Expected: PASS

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove legacy employee form components"
```

---

### Task 3: Delete Backup Files

**Files:**
- Delete: `src/routes/dashboard/employees/+page.svelte.bak`
- Delete: `src/routes/dashboard/employees/import/_page.legacy.svelte`

**Step 1: Delete backup files**

```bash
rm -f src/routes/dashboard/employees/+page.svelte.bak
rm -f src/routes/dashboard/employees/import/_page.legacy.svelte
```

**Step 2: Run type check**

Run: `npm run check`
Expected: PASS

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove backup and legacy files"
```

---

### Task 4: Delete Deprecated Auth Files

**Files:**
- Delete: `src/lib/auth/jwt-utils.ts`
- Delete: `src/lib/auth/migration.ts`
- Delete: `src/lib/server/jwt-debug.ts`
- Delete: `src/routes/api/test-auth/+server.ts`

**Step 1: Verify no active imports for jwt-utils.ts**

Run: `grep -r "jwt-utils" src/ --include="*.ts" --include="*.svelte" | grep -v "\.test\." | grep -v "/jwt-utils.ts"`
Expected: No active imports (may show in tests - those will be updated)

**Step 2: Verify no active imports for migration.ts**

Run: `grep -r "from.*auth/migration" src/`
Expected: No active imports

**Step 3: Verify no active imports for jwt-debug.ts**

Run: `grep -r "jwt-debug" src/`
Expected: No active imports

**Step 4: Delete the files**

```bash
rm -f src/lib/auth/jwt-utils.ts
rm -f src/lib/auth/migration.ts
rm -f src/lib/server/jwt-debug.ts
rm -rf src/routes/api/test-auth/
```

**Step 5: Run type check**

Run: `npm run check`
Expected: PASS (or note any imports that need updating)

**Step 6: If type check fails, fix imports**

Search for any remaining imports and remove them.

**Step 7: Run tests**

Run: `npm run test:unit`
Expected: PASS (or update tests that referenced these files)

**Step 8: Commit**

```bash
git add -A
git commit -m "chore: remove deprecated JWT auth files (session-based auth is standard)"
```

---

## Phase 2: Unused Component Cleanup

### Task 5: Delete Unused Employee List Components

**Files:**
- Delete: `src/lib/components/employees/EmployeeList.svelte`
- Delete: `src/lib/components/employees/EmployeeListShadcn.svelte`
- Delete: `src/lib/components/employees/list/` (entire directory)

**Step 1: Verify EmployeeList.svelte has no imports**

Run: `grep -r "EmployeeList" src/ --include="*.ts" --include="*.svelte" | grep -v "EmployeeList.svelte" | grep -v "EmployeeListShadcn" | grep -v "list/" | grep -v "index.ts"`
Expected: No imports (EmployeeDataTable and EmployeeGrid are used instead)

**Step 2: Delete the files**

```bash
rm -f src/lib/components/employees/EmployeeList.svelte
rm -f src/lib/components/employees/EmployeeListShadcn.svelte
rm -rf src/lib/components/employees/list/
```

**Step 3: Update index.ts exports**

Modify: `src/lib/components/employees/index.ts`

Remove any exports for deleted components:
- Remove `EmployeeList` export if present
- Remove any `list/` re-exports if present

**Step 4: Run type check**

Run: `npm run check`
Expected: PASS

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove unused EmployeeList components (EmployeeDataTable is used)"
```

---

### Task 6: Delete Deprecated GraphQL Employee Operations

**Files:**
- Delete: `src/lib/graphql/employees/` (entire directory)

**Step 1: Verify no active imports**

Run: `grep -r "from.*graphql/employees" src/ --include="*.ts" --include="*.svelte"`
Expected: No imports (EmployeeService is used instead)

**Step 2: Delete the directory**

```bash
rm -rf src/lib/graphql/employees/
```

**Step 3: Run type check**

Run: `npm run check`
Expected: PASS

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove deprecated GraphQL employee operations (use EmployeeService)"
```

---

## Phase 3: Consolidations (Minor Migrations)

### Task 7: Migrate Tasks Page to Shadcn UI

**Files:**
- Modify: `src/routes/tasks/+page.svelte`

**Step 1: Read current file to understand base component usage**

Read the file and identify all imports from `$lib/components/base/`.

**Step 2: Update imports to Shadcn equivalents**

Replace:
```svelte
<script>
  import Button from '$lib/components/base/Button.svelte';
  import Input from '$lib/components/base/Input.svelte';
  import Select from '$lib/components/base/Select.svelte';
  import Badge from '$lib/components/base/Badge.svelte';
  import Card from '$lib/components/base/Card.svelte';
</script>
```

With:
```svelte
<script>
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import * as Select from '$lib/components/ui/select';
  import { Badge } from '$lib/components/ui/badge';
  import * as Card from '$lib/components/ui/card';
</script>
```

**Step 3: Update component usage in template**

Shadcn components may have different props/structure. Common changes:
- `<Card>` → `<Card.Root>`, `<Card.Header>`, `<Card.Content>`
- `<Select>` → `<Select.Root>`, `<Select.Trigger>`, `<Select.Content>`, `<Select.Item>`
- `<Button variant="primary">` → `<Button variant="default">`
- `<Badge variant="success">` → `<Badge variant="default">` or appropriate variant

**Step 4: Run type check**

Run: `npm run check`
Expected: PASS

**Step 5: Run dev server and manually verify**

Run: `npm run dev`
Navigate to `/tasks` and verify page renders correctly.

**Step 6: Commit**

```bash
git add src/routes/tasks/+page.svelte
git commit -m "refactor: migrate tasks page from base components to Shadcn UI"
```

---

### Task 8: Delete Base Components Directory

**Files:**
- Delete: `src/lib/components/base/` (entire directory)

**Step 1: Verify no remaining imports**

Run: `grep -r "components/base" src/ --include="*.ts" --include="*.svelte"`
Expected: No imports (tasks page was migrated in Task 7)

**Step 2: Delete the directory**

```bash
rm -rf src/lib/components/base/
```

**Step 3: Run type check**

Run: `npm run check`
Expected: PASS

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove unused base components (Shadcn UI is standard)"
```

---

### Task 9: Consolidate Employee Forms

**Files:**
- Delete: `src/lib/components/employees/EmployeeForm.svelte`
- Rename: `src/lib/components/employees/EmployeeFormShadcn.svelte` → `src/lib/components/employees/EmployeeForm.svelte`
- Modify: Any files importing `EmployeeFormShadcn`

**Step 1: Find all imports of EmployeeFormShadcn**

Run: `grep -r "EmployeeFormShadcn" src/ --include="*.ts" --include="*.svelte"`
Note all files that need updating.

**Step 2: Find all imports of EmployeeForm (old)**

Run: `grep -r "EmployeeForm" src/ --include="*.ts" --include="*.svelte" | grep -v "EmployeeFormShadcn" | grep -v "form/EmployeeForm"`
Note which files use the old form vs the modular form sections.

**Step 3: Delete old EmployeeForm.svelte**

```bash
rm -f src/lib/components/employees/EmployeeForm.svelte
```

**Step 4: Rename EmployeeFormShadcn to EmployeeForm**

```bash
mv src/lib/components/employees/EmployeeFormShadcn.svelte src/lib/components/employees/EmployeeForm.svelte
```

**Step 5: Update imports that referenced EmployeeFormShadcn**

In each file found in Step 1, change:
```typescript
import EmployeeFormShadcn from '$lib/components/employees/EmployeeFormShadcn.svelte';
```
To:
```typescript
import EmployeeForm from '$lib/components/employees/EmployeeForm.svelte';
```

Also update any component usage from `<EmployeeFormShadcn` to `<EmployeeForm`.

**Step 6: Update index.ts if needed**

Modify: `src/lib/components/employees/index.ts`

Ensure `EmployeeForm` is exported (remove `EmployeeFormShadcn` export if present).

**Step 7: Run type check**

Run: `npm run check`
Expected: PASS

**Step 8: Commit**

```bash
git add -A
git commit -m "refactor: consolidate EmployeeForm components (remove duplicate)"
```

---

### Task 10: Migrate urql-client.ts Imports

**Files:**
- Modify: `src/routes/dashboard/onboarding/[id]/+page.server.ts`
- Modify: `src/routes/admin/forms/[id]/+page.server.ts`
- Modify: `src/routes/admin/onboarding/[id]/forms/+page.server.ts`

**Step 1: Update first file**

Modify: `src/routes/dashboard/onboarding/[id]/+page.server.ts`

Change:
```typescript
import { createUrqlClient } from '$lib/api/urql-client';
```
To:
```typescript
import { createUrqlClient } from '$lib/graphql/client';
```

**Step 2: Update second file**

Modify: `src/routes/admin/forms/[id]/+page.server.ts`

Same change as Step 1.

**Step 3: Update third file**

Modify: `src/routes/admin/onboarding/[id]/forms/+page.server.ts`

Same change as Step 1.

**Step 4: Run type check**

Run: `npm run check`
Expected: PASS

**Step 5: Commit**

```bash
git add src/routes/dashboard/onboarding/[id]/+page.server.ts src/routes/admin/forms/[id]/+page.server.ts src/routes/admin/onboarding/[id]/forms/+page.server.ts
git commit -m "refactor: migrate imports from deprecated urql-client to graphql/client"
```

---

### Task 11: Delete Deprecated urql-client.ts

**Files:**
- Delete: `src/lib/api/urql-client.ts`

**Step 1: Verify no remaining imports**

Run: `grep -r "api/urql-client" src/`
Expected: No imports

**Step 2: Delete the file**

```bash
rm -f src/lib/api/urql-client.ts
```

**Step 3: Check if api/ directory is empty**

```bash
ls src/lib/api/
```

If empty, delete the directory:
```bash
rmdir src/lib/api/
```

**Step 4: Run type check**

Run: `npm run check`
Expected: PASS

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove deprecated urql-client.ts wrapper"
```

---

## Phase 4: Documentation & Verification

### Task 12: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Add createGraphQLClient documentation**

Find the "Data Fetching Pattern" section and add the modern pattern alongside the legacy one:

```markdown
### Data Fetching Patterns

**1. Preferred (New Code) - Unified Client:**

\`\`\`typescript
import { createGraphQLClient } from '$lib/server/graphql';

export const load: PageServerLoad = async (event) => {
  const client = createGraphQLClient(event);
  const result = await client.query(GET_DATA, { limit: 20 });

  if (!result) {
    return { data: [] };
  }

  return { data: result };
};
\`\`\`

**2. Legacy (Still Valid) - Direct urql:**

\`\`\`typescript
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';

export const load: PageServerLoad = async ({ fetch, cookies }) => {
  const client = createUrqlClient(fetch, undefined, undefined, serializeCookies(cookies));
  const result = await client.query(GET_DATA, { limit: 20 }).toPromise();

  return { data: result.data?.items ?? [] };
};
\`\`\`
```

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add createGraphQLClient as preferred pattern in CLAUDE.md"
```

---

### Task 13: Final Verification

**Step 1: Run full type check**

Run: `npm run check`
Expected: PASS with no errors

**Step 2: Run all tests**

Run: `npm run test`
Expected: All tests pass

**Step 3: Run production build**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Run dev server and smoke test**

Run: `npm run dev`

Manually verify:
- [ ] `/dashboard/employees` - List page loads
- [ ] `/dashboard/employees/[id]` - Detail page loads
- [ ] `/dashboard/employees/new` - Create form loads
- [ ] `/tasks` - Tasks page loads with Shadcn components
- [ ] Authentication still works

**Step 5: Final commit if any fixes needed**

If any issues found and fixed:
```bash
git add -A
git commit -m "fix: address issues found during final verification"
```

---

## Summary

| Task | Description | Est. LOC Removed |
|------|-------------|------------------|
| 1 | Delete employees2 route | ~900 |
| 2 | Delete legacy form directory | ~300 |
| 3 | Delete backup files | ~50 |
| 4 | Delete deprecated auth files | ~250 |
| 5 | Delete unused list components | ~600 |
| 6 | Delete GraphQL employees directory | ~200 |
| 7 | Migrate tasks page to Shadcn | 0 (refactor) |
| 8 | Delete base components | ~400 |
| 9 | Consolidate employee forms | ~366 |
| 10-11 | Migrate and delete urql-client | ~50 |
| 12 | Update documentation | 0 (docs) |
| 13 | Final verification | 0 (verify) |
| **Total** | | **~3,100 LOC** |
