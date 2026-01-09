# Phase 1: Missing Logger Imports Fix Plan

**Category**: Missing Logger Imports
**Errors**: ~450 errors (~49% of total)
**Severity**: Critical (breaks compilation)
**Effort**: Low (mechanical fix)
**Estimated Time**: 2 hours

## Problem Statement

After the logger refactoring, ~75 files have `logger.*` calls but are missing the import statement:

```typescript
import { logger } from '$lib/utils/logger';
```

This causes compilation errors:

```
Error: Cannot find name 'logger'. (ts)
```

## Affected File Types

1. **Svelte Components** (`.svelte` files)
   - Review-related components
   - Task components
   - User profile components
   - Dashboard pages

2. **TypeScript Files** (`.ts` files)
   - GraphQL query files
   - Utility files
   - Server-side modules

## Idiomatic Fix Pattern

### For Svelte Components

```svelte
<script lang="ts">
	// Add logger import with other utility imports
	import { logger } from '$lib/utils/logger';
	import { createMutation } from '@urql/svelte';
	import type { ReviewType } from '$lib/types';

	// ... rest of component
</script>
```

**Import Organization Rules**:

1. Place logger import **after** Svelte imports
2. Place logger import **with** other utility imports
3. Place logger import **before** component imports
4. Use named import: `{ logger }` not `*`

```svelte
<script lang="ts">
	// 1. Svelte framework imports
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	// 2. UI library imports
	import * as Card from '$lib/components/ui/card';
	import Button from '$lib/components/ui/button';

	// 3. Utility imports (INCLUDING LOGGER)
	import { logger } from '$lib/utils/logger';
	import { formatDate } from '$lib/utils/formatters';

	// 4. Type imports
	import type { Review } from '$lib/types';

	// 5. Component imports
	import ReviewCard from './ReviewCard.svelte';
</script>
```

### For TypeScript Files

```typescript
// Add logger import with other local utility imports
import { logger } from '$lib/utils/logger';
import { validateInput } from '$lib/utils/validation';
import type { GraphQLResponse } from './types';
```

**Import Organization Rules**:

1. External dependencies first
2. `$lib` imports second
3. Relative imports last
4. Logger goes with `$lib/utils/*` imports

```typescript
// 1. External dependencies
import { gql } from '@urql/svelte';
import { z } from 'zod';

// 2. $lib imports (INCLUDING LOGGER)
import { logger } from '$lib/utils/logger';
import { createGraphQLClient } from '$lib/graphql/client';
import type { Employee } from '$lib/types';

// 3. Relative imports
import type { LocalType } from './types';
```

## Files Requiring Fixes

### Svelte Components (Priority 1 - User-Facing)

```bash
src/lib/components/reviews/ReviewCreationDialog.svelte
src/lib/components/reviews/ReviewListWithFilters.svelte
src/lib/components/ui/tag-input/TaskTypeTagInput.svelte
src/routes/dashboard/reviews/+page.svelte
src/routes/dashboard/reviews/[id]/+page.svelte
src/routes/dashboard/tasks/new/+page.svelte
src/routes/dashboard/users/[id]/leave/requests/+page.svelte
src/routes/dashboard/users/[id]/performance/+page.svelte
```

### GraphQL Query Files (Priority 2 - Backend Integration)

```bash
src/lib/graphql/queries/leave-requests.ts
src/lib/graphql/queries/performance-reviews.ts
src/lib/graphql/query-complexity-analyzer.ts
src/lib/graphql/subscriptions.ts
```

### Other TypeScript Files (Priority 3 - Supporting)

```bash
# (To be identified via grep search)
```

## Automated Fix Script

### Detection Script

```bash
#!/bin/bash
# find-missing-logger-imports.sh

# Find files using logger without importing it
echo "Files using logger without import:"
grep -r "logger\." src/ \
  --include="*.ts" \
  --include="*.svelte" \
  | cut -d: -f1 \
  | sort -u \
  | while read file; do
      if ! grep -q "import.*logger.*from.*logger" "$file"; then
        echo "$file"
      fi
    done
```

### Semi-Automated Fix Script

```bash
#!/bin/bash
# add-logger-imports.sh

# For each file missing logger import
for file in $(./find-missing-logger-imports.sh); do
  echo "Processing: $file"

  if [[ $file == *.svelte ]]; then
    # Svelte file - add after script tag and existing imports
    # Look for existing $lib imports and add logger nearby

    # Find line with last import from $lib/
    last_import_line=$(grep -n "import.*from.*\$lib/" "$file" | tail -1 | cut -d: -f1)

    if [ -n "$last_import_line" ]; then
      # Insert after last $lib import
      sed -i "${last_import_line}a import { logger } from '\$lib/utils/logger';" "$file"
      echo "  ✓ Added logger import after line $last_import_line"
    else
      # No $lib imports found, add after script tag
      sed -i '/<script/a import { logger } from '\''$lib/utils/logger'\'';' "$file"
      echo "  ✓ Added logger import after <script> tag"
    fi

  else
    # TypeScript file - add with other imports from $lib/utils/
    last_util_import=$(grep -n "import.*from.*\$lib/utils/" "$file" | tail -1 | cut -d: -f1)

    if [ -n "$last_util_import" ]; then
      sed -i "${last_util_import}a import { logger } from '\$lib/utils/logger';" "$file"
      echo "  ✓ Added logger import after line $last_util_import"
    else
      # Add after other $lib imports
      last_lib_import=$(grep -n "import.*from.*\$lib/" "$file" | tail -1 | cut -d: -f1)
      if [ -n "$last_lib_import" ]; then
        sed -i "${last_lib_import}a import { logger } from '\$lib/utils/logger';" "$file"
        echo "  ✓ Added logger import after line $last_lib_import"
      fi
    fi
  fi
done

echo "Done! Run 'npm run check' to verify."
```

## Manual Review Checklist

After running automated script:

- [ ] Verify logger import placement follows organization rules
- [ ] Check for duplicate imports (automated script may create duplicates)
- [ ] Ensure correct quote style (single quotes for consistency)
- [ ] Verify TypeScript lang attribute in Svelte script tags
- [ ] Run `npm run check` and verify error count decreased

## Verification

### Before Fix

```bash
$ npm run check 2>&1 | grep "Cannot find name 'logger'" | wc -l
450
```

### After Fix

```bash
$ npm run check 2>&1 | grep "Cannot find name 'logger'" | wc -l
0
```

### Expected Error Reduction

- **Before**: 910 errors
- **After**: ~460 errors (50% reduction)

## Example Fixes

### Example 1: Svelte Component

**Before** (`ReviewCreationDialog.svelte`):

```svelte
<script lang="ts">
	import { createMutation } from '@urql/svelte';
	import type { ReviewType } from '$lib/types';

	// ... component code

	function handleError(error: Error) {
		logger.error('Failed to create review', error); // ❌ logger not imported
	}
</script>
```

**After**:

```svelte
<script lang="ts">
	import { createMutation } from '@urql/svelte';
	import { logger } from '$lib/utils/logger'; // ✅ Added
	import type { ReviewType } from '$lib/types';

	// ... component code

	function handleError(error: Error) {
		logger.error('Failed to create review', error); // ✅ Works now
	}
</script>
```

### Example 2: TypeScript File

**Before** (`performance-reviews.ts`):

```typescript
import { gql } from '@urql/svelte';
import type { Review } from '$lib/types';

export async function updateReview(params: UpdateParams) {
	logger.info(`Update performance review:: ${params}`; // ❌ logger not imported
	return { success: true };
}
```

**After**:

```typescript
import { gql } from '@urql/svelte';
import { logger } from '$lib/utils/logger'; // ✅ Added
import type { Review } from '$lib/types';

export async function updateReview(params: UpdateParams) {
	logger.info('Update performance review', { params }); // ✅ Works now (also fixed API usage)
	return { success: true };
}
```

## Testing Strategy

1. **Compile Test**: `npm run check` should pass for logger imports
2. **Runtime Test**: Start dev server and verify no runtime errors
3. **Type Test**: TypeScript should recognize logger in all files

## Rollback Plan

If automated script causes issues:

```bash
# Restore from git
git checkout -- src/

# Re-run manual fixes on problematic files only
```

## Quality Standards

✅ **Good Logger Import**:

```svelte
<script lang="ts">
	import { onMount } from 'svelte';
	import { logger } from '$lib/utils/logger';
	import type { User } from '$lib/types';
</script>
```

❌ **Bad Logger Import**:

```svelte
<script lang="ts">
  // Wrong: No lang="ts" attribute
</script>

<script>
  // Wrong: Separate script tag
  import { logger } from '$lib/utils/logger';
</script>

<script lang="ts">
  import type { User } from '$lib/types';
  import { logger } from '$lib/utils/logger'; // Wrong: Types should be last
</script>
```

## Next Steps

1. Run detection script to get complete file list
2. Review file list for any edge cases
3. Run automated fix script
4. Manual review of changes
5. Run `npm run check` to verify
6. Commit changes with message: `fix: add missing logger imports`
7. Proceed to Phase 2 (Syntax Errors)
