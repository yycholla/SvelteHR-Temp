# Phase 5: Complex Type Errors Fix Plan

**Category**: Complex Type Errors (Remaining Issues)
**Errors**: ~247 errors (~27% of total)
**Severity**: Medium-High (varies by issue)
**Effort**: High (requires case-by-case analysis)
**Estimated Time**: 8-12 hours

## Problem Statement

After completing Phases 1-4, approximately 247 errors remain. These are complex type errors, logic issues, and edge cases that require individual analysis and context-aware fixes.

Unlike the mechanical fixes in earlier phases, these errors represent:
- Complex type mismatches
- Incorrect type conversions
- Missing type definitions
- Logic errors exposed by TypeScript
- Edge cases in API usage

## Error Categories

### Category A: Type Conversion Errors

**Pattern**: Unsafe type conversions or missing type guards

```
Error: Conversion of type 'Event' to type 'Error' may be a mistake because neither type sufficiently overlaps with the other.
```

**Example**:
```typescript
// ❌ WRONG
const error = event as Error;

// ✅ CORRECT - Type guard
function isError(value: unknown): value is Error {
  return value instanceof Error;
}

const error = isError(event) ? event : new Error(String(event));
```

### Category B: Complex Object Type Mismatches

**Pattern**: Custom types not matching expected interfaces

```
Error: Argument of type 'CacheMetrics' is not assignable to parameter of type 'LogMeta'.
Error: Argument of type 'ErrorResponse' is not assignable to parameter of type 'Error'.
```

**Example**:
```typescript
// ❌ WRONG - Custom type doesn't match expected interface
logger.info('Cache metrics', cacheMetrics);

// ✅ CORRECT - Transform to compatible type
logger.info('Cache metrics', {
  hitRate: cacheMetrics.hitRate,
  misses: cacheMetrics.misses,
  size: cacheMetrics.size
} satisfies LogMeta);
```

### Category C: Property Access Errors

**Pattern**: Object literal properties not in type

```
Error: Object literal may only specify known properties, and 'type' does not exist in type 'Error'.
```

**Example**:
```typescript
// ❌ WRONG - Adding non-standard property to Error
const error = new Error(message);
error.type = 'validation'; // Type error

// ✅ CORRECT - Extend Error type
class ValidationError extends Error {
  public readonly type = 'validation';

  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

const error = new ValidationError(message);
```

### Category D: Promise Type Mismatches

**Pattern**: Promise return types not matching expected

```
Error: Type 'Promise<typeof import("...")>' is not assignable to type 'Promise<{ default: unknown; }>'.
```

**Example** (`bundle-optimizer.ts:85`):
```typescript
// ❌ WRONG
TaskForm: () => lazyLoadComponent(() => import('$lib/components/tasks/TaskForm.svelte'), 'TaskForm')

// ✅ CORRECT - Ensure proper return type
TaskForm: () =>
  lazyLoadComponent(
    async () => {
      const module = await import('$lib/components/tasks/TaskForm.svelte');
      return { default: module.default || module };
    },
    'TaskForm'
  )
```

### Category E: Function Signature Mismatches

**Pattern**: Wrong number or type of arguments

```
Error: Expected 1-3 arguments, but got 4.
```

Already partially covered in Phase 3, but edge cases remain.

### Category F: Unknown Type Handling

**Pattern**: `unknown` types not properly narrowed

```
Error: Argument of type 'unknown' is not assignable to parameter of type 'LogMeta | undefined'.
Error: Argument of type 'unknown' is not assignable to parameter of type 'Error | undefined'.
```

**Example**:
```typescript
// ❌ WRONG - unknown not narrowed
catch (error) {
  logger.error('Failed', error);
}

// ✅ CORRECT - Narrow with type guard
catch (error: unknown) {
  const err = error instanceof Error ? error : new Error(String(error));
  logger.error('Failed', err);
}
```

## Approach Strategy

### Step 1: Categorize Remaining Errors

```bash
# Generate categorized error report
npm run check 2>&1 > /tmp/remaining_errors.txt

# Analyze patterns
grep "Error:" /tmp/remaining_errors.txt | \
  sed 's/.*Error: //' | \
  sort | uniq -c | sort -rn > /tmp/error_patterns.txt

cat /tmp/error_patterns.txt
```

### Step 2: Prioritize by Impact

**High Priority** (Blocks Core Functionality):
- Authentication errors
- Database query errors
- API client errors
- Route loading errors

**Medium Priority** (Reduces Quality):
- Utility function errors
- Helper type errors
- Component prop errors

**Low Priority** (Nice to Have):
- Example/demo page errors
- Non-critical feature errors
- Edge case handling

### Step 3: Fix in Batches

Group related errors and fix together:
- All errors in same file
- All errors of same pattern
- All errors in same domain (auth, db, etc.)

## Specific File Analysis

### High Priority Files

#### `src/lib/utils/error-handling.ts`

**Errors**: Type property on Error, unknown types

**Strategy**:
1. Create custom Error types for each category
2. Implement proper type guards
3. Use discriminated unions for error types

```typescript
// ✅ Idiomatic error handling

type AppErrorType = 'validation' | 'authentication' | 'authorization' | 'network' | 'unknown';

class AppError extends Error {
  constructor(
    message: string,
    public readonly type: AppErrorType,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}

function handleError(error: unknown, context?: LogMeta): void {
  const appError = error instanceof AppError
    ? error
    : new AppError(
        error instanceof Error ? error.message : String(error),
        'unknown'
      );

  logger.error(appError.message, appError, {
    type: appError.type,
    statusCode: appError.statusCode,
    ...context
  });
}
```

#### `src/lib/utils/cache-management.ts`

**Errors**: Custom types as LogMeta

**Strategy**:
1. Create serialization helpers
2. Transform complex objects before logging
3. Use type-safe metadata

```typescript
// ✅ Idiomatic cache logging

interface CacheMetrics {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  hitRate: number;
}

function logCacheMetrics(metrics: CacheMetrics): void {
  logger.info('Cache metrics updated', {
    hits: metrics.hits,
    misses: metrics.misses,
    evictions: metrics.evictions,
    size: metrics.size,
    hitRate: Math.round(metrics.hitRate * 100) / 100
  } satisfies LogMeta);
}
```

#### `src/lib/performance/bundle-optimizer.ts`

**Errors**: Promise type mismatch, lazy loading

**Strategy**:
1. Ensure lazy load wrapper returns correct type
2. Add proper type annotations
3. Handle module resolution correctly

```typescript
// ✅ Idiomatic lazy loading

type LazyComponent<T> = () => Promise<{ default: T }>;

function lazyLoadComponent<T>(
  importFn: () => Promise<T>,
  componentName: string
): LazyComponent<T> {
  return async () => {
    try {
      const module = await importFn();
      return { default: module };
    } catch (error) {
      logger.error(`Failed to lazy load component: ${componentName}`, error as Error);
      throw error;
    }
  };
}

// Usage
export const lazyComponents = {
  TaskForm: lazyLoadComponent(
    () => import('$lib/components/tasks/TaskForm.svelte').then(m => m.default),
    'TaskForm'
  )
};
```

### Medium Priority Files

Files with 2-5 errors that need attention but don't block core functionality:
- GraphQL client files
- Component utility files
- Store files

### Low Priority Files

Files with 1-2 errors in non-critical paths:
- Example pages
- Demo components
- Development utilities

## Quality Standards for Complex Fixes

### Type Safety Best Practices

```typescript
// ✅ GOOD - Proper type narrowing
function processValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (value && typeof value === 'object' && 'toString' in value) {
    return String(value);
  }
  return JSON.stringify(value);
}

// ✅ GOOD - Custom type guards
function isErrorLike(error: unknown): error is { message: string; stack?: string } {
  return (
    error !== null &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  );
}

// ✅ GOOD - Discriminated unions
type Result<T, E> =
  | { success: true; data: T }
  | { success: false; error: E };

function handleResult<T>(result: Result<T, Error>): T {
  if (result.success) {
    return result.data;
  }
  logger.error('Operation failed', result.error);
  throw result.error;
}
```

### Error Handling Patterns

```typescript
// ✅ GOOD - Comprehensive error handling
async function fetchData(id: string): Promise<Data> {
  try {
    const response = await fetch(`/api/data/${id}`);

    if (!response.ok) {
      throw new AppError(
        `Failed to fetch data: ${response.statusText}`,
        'network',
        response.status
      );
    }

    const data = await response.json();
    return dataSchema.parse(data); // Zod validation

  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw error;
    }

    const err = error instanceof Error
      ? error
      : new Error(String(error));

    logger.error('Data fetch failed', err, { dataId: id });
    throw new AppError('Failed to fetch data', 'unknown');
  }
}
```

### Promise Handling

```typescript
// ✅ GOOD - Type-safe promise handling
async function loadModule<T>(
  path: string
): Promise<{ default: T }> {
  try {
    const module = await import(path);

    if (!module.default) {
      throw new Error(`Module ${path} has no default export`);
    }

    return { default: module.default };
  } catch (error) {
    logger.error('Module load failed', error as Error, { path });
    throw error;
  }
}
```

## Execution Plan

### Week 1: High Priority (Days 1-3)

**Day 1**: Error handling utilities (4 hours)
- Fix `error-handling.ts`
- Create custom error types
- Implement type guards

**Day 2**: API and database (4 hours)
- Fix GraphQL client errors
- Fix database query errors
- Fix API client errors

**Day 3**: Performance and optimization (4 hours)
- Fix bundle optimizer
- Fix cache management
- Fix server monitoring

### Week 2: Medium Priority (Days 4-5)

**Day 4**: Component errors (4 hours)
- Fix Svelte component type errors
- Fix prop type mismatches
- Fix event handler types

**Day 5**: Store and state management (4 hours)
- Fix store type errors
- Fix derived state types
- Fix reactive patterns

### Week 3: Low Priority (Day 6)

**Day 6**: Cleanup and edge cases (4 hours)
- Fix remaining example pages
- Fix development utilities
- Final verification

## Verification Strategy

### Incremental Verification

After each batch of fixes:

```bash
# Check error count
npm run check 2>&1 | grep "Error:" | wc -l

# Check specific file
npm run check 2>&1 | grep "filename.ts"

# Run tests
npm run test:unit -- --run

# Build check
npm run build
```

### Quality Gates

Before marking each batch complete:

- [ ] TypeScript compilation succeeds
- [ ] No new errors introduced
- [ ] Tests pass (if applicable)
- [ ] Runtime behavior verified
- [ ] Code review completed

## Expected Results

### Progress Tracking

| Phase | Errors Remaining | % Complete |
|-------|-----------------|------------|
| Start | 910 | 0% |
| After Phase 1 | 460 | 49% |
| After Phase 2 | 340 | 63% |
| After Phase 3 | 254 | 72% |
| After Phase 4 | 247 | 73% |
| After Phase 5 | 0 | 100% |

### Final Verification

```bash
# Should show 0 errors
npm run check

# Should build successfully
npm run build

# Should pass all tests
npm run test

# Should start dev server
npm run dev
```

## Documentation

### Update Developer Docs

After completing all fixes:

1. **Update Logger Documentation**
   - Document correct usage patterns
   - Add examples for common scenarios
   - Create migration guide from console.log

2. **Update Error Handling Guide**
   - Document custom error types
   - Show proper type guard usage
   - Provide troubleshooting tips

3. **Update Contributing Guide**
   - Add TypeScript best practices
   - Include logging standards
   - Reference type safety guidelines

## Rollback Plan

If complex fixes introduce regressions:

```bash
# Create safety branch before starting
git checkout -b fix/complex-type-errors-backup

# After each day's work
git commit -m "Daily checkpoint: complex type errors"

# If need to rollback
git log --oneline -10
git reset --hard <commit-hash>
```

## Next Steps

1. Review and approve Phase 5 approach
2. Begin with high-priority files
3. Fix in small, testable batches
4. Commit frequently with descriptive messages
5. Document complex fixes for team knowledge
6. Final verification and documentation update

## Success Criteria

Phase 5 is complete when:

- [ ] All 910 errors resolved
- [ ] `npm run check` shows 0 errors
- [ ] `npm run build` succeeds
- [ ] All tests pass
- [ ] Dev server starts without errors
- [ ] Documentation updated
- [ ] Team trained on new patterns
