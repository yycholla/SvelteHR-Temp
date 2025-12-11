# Phase 4: Specific Fixes (Shebang, TaskForm, CSS) Plan

**Category**: Specific File Issues
**Errors**: ~8 errors (<1% of total)
**Severity**: Critical (each blocks compilation/functionality)
**Effort**: Low (straightforward fixes)
**Estimated Time**: 30 minutes

## Problem Statement

A small set of specific, unique errors that require individual attention:

1. **Shebang Placement Error** (6 errors) - `start-signature-worker.ts`
2. **TaskForm Module Export** (1 error) - Missing default export
3. **CSS Warning** (1 warning) - Unused CSS selector

Each is simple to fix but requires a different approach.

---

## Fix 1: Shebang Placement Error

**File**: `src/lib/server/audit/start-signature-worker.ts`

**Errors**:
```
Error: '#!' can only be used at the start of a file.
Error: ';' expected.
Error: The left-hand side of an arithmetic operation must be of type 'any', 'number', 'bigint' or an enum type.
Error: This kind of expression is always truthy.
Error: Cannot find name 'env'.
Error: Cannot find name 'node'. Did you mean 'Node'?
```

### Root Cause

The shebang line `#!/usr/bin/env node` appears after import statements instead of at the very first line:

```typescript
import { logger } from '$lib/utils/logger';
#!/usr/bin/env node  // ❌ WRONG - must be line 1
// Signature Worker Startup Script
```

### Idiomatic Fix

Move shebang to line 1:

```typescript
#!/usr/bin/env node
// Signature Worker Startup Script

import { logger } from '$lib/utils/logger';
// ... rest of imports and code
```

### Quality Standards

**✅ Correct Shebang Usage**:
```typescript
#!/usr/bin/env node
/**
 * Worker script for audit log signature generation
 * Runs as standalone process
 */

import { logger } from '$lib/utils/logger';
import { AuditSignatureService } from './audit-signature-service';

async function main() {
  logger.info('Starting Audit Log Signature Worker');
  // ... worker logic
}

main().catch(error => {
  logger.error('Worker failed', error);
  process.exit(1);
});
```

**File Permissions**:
```bash
# Make executable
chmod +x src/lib/server/audit/start-signature-worker.ts
```

### Alternative Approach

If this file isn't meant to be executed directly, remove the shebang entirely:

```typescript
// Remove shebang if not used as CLI script
// Just keep as regular TypeScript module
import { logger } from '$lib/utils/logger';
// ...
```

**Decision Point**: Determine if this file needs to be executable. If yes, fix shebang. If no, remove it.

---

## Fix 2: TaskForm Module Export Issue

**File**: `src/lib/components/tasks/TaskForm.svelte`

**Error**:
```
Error: Module '"/home/chanway/.../TaskForm.svelte"' has no default export.
```

**Consuming File**: `src/routes/dashboard/tasks/new/+page.svelte`

```svelte
import TaskForm from '$lib/components/tasks/TaskForm.svelte';  // ❌ Fails
```

### Root Cause Analysis

In Svelte 5, components don't automatically export a default. The component structure may be:

```svelte
<!-- TaskForm.svelte -->
<script lang="ts">
  // Component logic
  let props = $props<TaskFormProps>();
</script>

<form>
  <!-- Template -->
</form>
```

But TypeScript expects:
```typescript
export default class TaskForm extends SvelteComponent<TaskFormProps> {}
```

### Possible Causes

1. **Module context script missing** - Svelte 5 components may need explicit module context
2. **TypeScript configuration issue** - `svelte-check` not recognizing component export
3. **Component structure issue** - Missing proper component setup

### Investigation Steps

```bash
# Check TaskForm.svelte structure
cat src/lib/components/tasks/TaskForm.svelte | head -50

# Check if using module context
grep -n "module" src/lib/components/tasks/TaskForm.svelte

# Check TypeScript errors specifically
npm run check 2>&1 | grep "TaskForm" -A 3 -B 3
```

### Idiomatic Fixes

#### Option A: Module Context Export (Svelte 5)

If exporting types or utilities from component:

```svelte
<!-- TaskForm.svelte -->
<script lang="ts" context="module">
  export type TaskFormProps = {
    // ... props
  };
</script>

<script lang="ts">
  let props = $props<TaskFormProps>();
</script>

<form>
  <!-- Template -->
</form>
```

#### Option B: Verify Component is Properly Structured

Ensure component follows Svelte 5 patterns:

```svelte
<script lang="ts">
  import type { Task } from '$lib/types';

  interface Props {
    task?: Task;
    onSubmit: (task: Task) => void;
  }

  let { task, onSubmit }: Props = $props();

  // Component logic
</script>

<form>
  <!-- Template -->
</form>
```

#### Option C: Import as Module (If Needed)

If component exports utilities:

```svelte
<!-- Consumer -->
<script lang="ts">
  import TaskForm from '$lib/components/tasks/TaskForm.svelte';
  // Or if module exports exist:
  import { type TaskFormProps } from '$lib/components/tasks/TaskForm.svelte';
</script>
```

### Fix Strategy

1. **Read TaskForm.svelte** to understand current structure
2. **Check consuming files** to see how it's being imported
3. **Verify Svelte config** supports Svelte 5 component structure
4. **Apply appropriate fix** based on findings

### Likely Resolution

Most likely the component is fine, but there's a syntax error preventing it from being recognized. After fixing logger errors in TaskForm (lines 279, 507), the export should work.

**Priority**: Fix TaskForm logger errors first, then check if export error persists.

---

## Fix 3: CSS Unused Selector Warning

**File**: `src/routes/sentry-example-page/+page.svelte`

**Warning**:
```
Warn: Unused CSS selector ".connectivity-error a"
```

**Code**:
```svelte
<style>
  .connectivity-error a {
    color: #ffffff;
    text-decoration: underline;
  }
</style>
```

### Root Cause

The CSS rule `.connectivity-error a` exists in the `<style>` block but there's no matching HTML in the template.

### Investigation

```bash
# Check if selector is used
grep -n "connectivity-error" src/routes/sentry-example-page/+page.svelte
```

### Idiomatic Fixes

#### Option A: Remove Unused CSS

If the class isn't used anywhere:

```diff
<style>
-  .connectivity-error a {
-    color: #ffffff;
-    text-decoration: underline;
-  }
</style>
```

#### Option B: Add Missing HTML

If the class should be used:

```svelte
<div class="connectivity-error">
  <p>Connection lost. <a href="/retry">Retry</a></p>
</div>

<style>
  .connectivity-error a {
    color: #ffffff;
    text-decoration: underline;
  }
</style>
```

#### Option C: Make Global (If Used Dynamically)

If added via JavaScript:

```svelte
<style>
  :global(.connectivity-error a) {
    color: #ffffff;
    text-decoration: underline;
  }
</style>
```

### Resolution

Most likely: **Remove the unused CSS** (Option A) since this is a warning, not an error.

---

## Execution Plan

### Step 1: Fix Shebang (2 minutes)

```bash
# Open file
vim src/lib/server/audit/start-signature-worker.ts

# Move shebang to line 1, or remove if not needed
# Save and verify
npm run check 2>&1 | grep "start-signature-worker"
```

### Step 2: Fix TaskForm (20 minutes)

```bash
# First, fix logger errors in TaskForm
# (Already covered in Phase 2 & 3)

# Then verify export
npm run check 2>&1 | grep "TaskForm"

# If still failing, investigate further
cat src/lib/components/tasks/TaskForm.svelte | head -100
```

### Step 3: Fix CSS Warning (5 minutes)

```bash
# Check usage
grep -n "connectivity-error" src/routes/sentry-example-page/+page.svelte

# Remove or fix based on findings
vim src/routes/sentry-example-page/+page.svelte
```

### Step 4: Verify (3 minutes)

```bash
# Check all three issues resolved
npm run check 2>&1 | grep -E "(start-signature|TaskForm|connectivity-error)"

# Should return no results
```

## Verification Checklist

- [ ] Shebang error resolved (6 errors → 0)
- [ ] TaskForm import works (1 error → 0)
- [ ] CSS warning resolved (1 warning → 0)
- [ ] `npm run check` shows expected error reduction
- [ ] No new errors introduced

## Expected Results

### Before Phase 4
```
$ npm run check 2>&1 | wc -l
~254 errors + 1 warning
```

### After Phase 4
```
$ npm run check 2>&1 | wc -l
~247 errors (8 errors + 1 warning eliminated)
```

## Quality Standards

### Shebang Files
```typescript
#!/usr/bin/env node
/**
 * Executable script documentation
 * Usage: ./script.ts [options]
 */

import { logger } from '$lib/utils/logger';

// Script implementation
```

### Svelte 5 Components
```svelte
<script lang="ts">
  import type { ComponentProps } from 'svelte';

  interface Props {
    // Prop definitions
  }

  let props: Props = $props();
</script>

<div>
  <!-- Template -->
</div>

<style>
  /* Only include used selectors */
</style>
```

### CSS Hygiene
- Remove all unused selectors
- Use `:global()` for dynamic classes
- Use Svelte's scoped styles by default
- Document global styles if necessary

## Next Steps

1. Execute fixes in order (shebang → TaskForm → CSS)
2. Verify each fix before moving to next
3. Commit changes: `fix: resolve shebang, module export, and CSS issues`
4. Proceed to Phase 5 (Complex Type Errors)

## Notes

These are **low-hanging fruit** - quick wins that reduce error count and unblock other work. Do these early to build momentum.
