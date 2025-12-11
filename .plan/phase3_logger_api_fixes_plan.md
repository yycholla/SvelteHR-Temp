# Phase 3: Logger API Type Mismatches Fix Plan

**Category**: Logger API Type Mismatches
**Errors**: ~86 errors (~9% of total)
**Severity**: Critical (type errors prevent compilation)
**Effort**: Medium (requires understanding context)
**Estimated Time**: 3-4 hours

## Problem Statement

The logger utility has a specific type signature that many calls violate, causing TypeScript compilation errors:

```typescript
interface LogMeta {
  [key: string]: unknown;
}

class Logger {
  debug(message: string, meta?: LogMeta): void;
  info(message: string, meta?: LogMeta): void;
  warn(message: string, meta?: LogMeta): void;
  error(message: string, error?: Error, meta?: LogMeta): void;
}
```

Common violations:
- Passing non-`LogMeta` values as second parameter
- Passing non-`Error` objects to `error()` method
- Passing primitive types (string, number) instead of objects
- Incorrect parameter order

## Common Error Patterns

### Pattern 1: Passing Primitives as LogMeta

**Error**:
```
Error: Argument of type 'string' is not assignable to parameter of type 'LogMeta'.
Error: Argument of type 'number' is not assignable to parameter of type 'LogMeta'.
```

**Before**:
```typescript
// ❌ WRONG - string as second parameter
logger.info('Rate limit exceeded for operation', operation.key);

// ❌ WRONG - number as second parameter
logger.warn('Invalid JWT format: expected 3 parts, got', parts.length);
```

**After**:
```typescript
// ✅ CORRECT - wrap in object
logger.info('Rate limit exceeded for operation', { operationKey: operation.key });

// ✅ CORRECT - wrap in object
logger.warn('Invalid JWT format: expected 3 parts', { actualParts: parts.length });
```

### Pattern 2: Passing Strings as Error Parameter

**Error**:
```
Error: Argument of type 'string' is not assignable to parameter of type 'Error'.
```

**Before**:
```typescript
// ❌ WRONG - string instead of Error object
logger.error('Query failed', text);

// ❌ WRONG - error message string
logger.error('Failed to log access attempt', await response.text());
```

**After**:
```typescript
// ✅ CORRECT - error in metadata, or create Error
logger.error('Query failed', new Error(text));

// ✅ BETTER - use metadata
logger.error('Query failed', undefined, { query: text });

// ✅ CORRECT - for response text
const errorText = await response.text();
logger.error('Failed to log access attempt', new Error(errorText));
```

### Pattern 3: Passing Arrays/Objects as Error

**Error**:
```
Error: Argument of type 'GraphQLError[]' is not assignable to parameter of type 'LogMeta'.
Error: Argument of type 'any[]' is not assignable to parameter of type 'Error'.
```

**Before**:
```typescript
// ❌ WRONG - array of errors as metadata
logger.warn('GraphQL authentication error:', error.graphQLErrors);

// ❌ WRONG - array as error parameter
logger.error('Params:', params);
```

**After**:
```typescript
// ✅ CORRECT - wrap in metadata object
logger.warn('GraphQL authentication error', {
  errors: error.graphQLErrors.map(e => ({ message: e.message, code: e.extensions?.code }))
});

// ✅ CORRECT - params in metadata
logger.error('Query failed', queryError, { params });
```

### Pattern 4: Too Many Arguments

**Error**:
```
Error: Expected 1-3 arguments, but got 4.
```

**Before**:
```typescript
// ❌ WRONG - 4 arguments to logger.error
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
});
```

**After**:
```typescript
// ✅ CORRECT - combine into message and metadata
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', reason as Error, {
    promise: String(promise)
  });
});
```

### Pattern 5: Objects as Metadata (Complex Types)

**Error**:
```
Error: Argument of type 'CacheMetrics' is not assignable to parameter of type 'LogMeta'.
Error: Argument of type 'ErrorResponse' is not assignable to parameter of type 'Error'.
```

**Before**:
```typescript
// ❌ WRONG - complex object passed directly
logger.info('Cache metrics', cacheMetrics);

// ❌ WRONG - custom error type not extending Error
logger.error('Request failed', errorResponse);
```

**After**:
```typescript
// ✅ CORRECT - spread object or serialize
logger.info('Cache metrics', {
  hitRate: cacheMetrics.hitRate,
  misses: cacheMetrics.misses,
  evictions: cacheMetrics.evictions
});

// ✅ CORRECT - convert to Error or use metadata
logger.error('Request failed', new Error(errorResponse.message), {
  statusCode: errorResponse.statusCode,
  errorCode: errorResponse.code
});
```

## Affected File Locations by Pattern

### Pattern 1: Primitives as LogMeta (Most Common)

```
src/lib/graphql/client.ts:111 - operation.key (number/string)
src/lib/graphql/client.ts:258 - cookies.substring (string)
src/lib/auth/jwt-utils.ts:154 - parts.length (number)
src/lib/auth/secure-auth-service.ts:77 - response.status (number)
src/lib/server/audit/start-signature-worker.ts:16 - process.env.NODE_ENV (string)
src/lib/components/ui/tag-input/TaskTypeTagInput.svelte:356 - taskType.name (string)
src/lib/graphql/subscriptions.ts:113 - this.userId (string)
src/lib/graphql/subscriptions.ts:154 - this.userId (string)
```

### Pattern 2: Strings/Non-Errors as Error Parameter

```
src/lib/graphql/client.ts:130 - message (string)
src/lib/server/db.ts:53 - text (string)
src/lib/server/db.ts:54 - params (array)
src/lib/services/auditService.ts:46 - response.text() (string)
src/lib/server/audit-logger.ts:113 - response.statusText (string)
src/lib/server/permission-refresh.ts:52 - response.statusText (string)
```

### Pattern 3: Arrays/Complex Objects

```
src/lib/graphql/client.ts:96 - error.graphQLErrors (GraphQLError[])
src/lib/performance/server-monitor.ts:209 - query string (string as LogMeta)
```

### Pattern 4: Too Many Arguments

```
src/lib/server/audit/start-signature-worker.ts:60 - 4 arguments to error()
src/routes/dashboard/users/[id]/performance/+page.svelte:143 - 3 args to info()
```

### Pattern 5: Type Conversion Issues

```
src/lib/utils/error-handling.ts:148 - unknown type property
src/lib/utils/error-handling.ts:312 - unknown as LogMeta
src/lib/utils/cache-management.ts - CacheMetrics as LogMeta
src/lib/utils/api-errors.ts - ErrorResponse as Error
```

## Idiomatic Fix Patterns

### Fix Pattern A: Wrap Primitives in Object

```typescript
// Before
logger.info('Processing request', requestId);
logger.warn('Threshold exceeded', count);

// After
logger.info('Processing request', { requestId });
logger.warn('Threshold exceeded', { count });
```

### Fix Pattern B: Create Error or Use Metadata

```typescript
// Before
logger.error('Query failed', errorMessage);

// After - Option 1: Create Error object
logger.error('Query failed', new Error(errorMessage));

// After - Option 2: Use metadata for non-errors
logger.error('Query failed', queryError, { message: errorMessage });
```

### Fix Pattern C: Serialize Complex Objects

```typescript
// Before
logger.info('Cache state', cacheObject);

// After - Extract relevant fields
logger.info('Cache state', {
  size: cacheObject.size,
  hits: cacheObject.hits,
  misses: cacheObject.misses
});

// Or use JSON.stringify for debugging
logger.debug('Full cache state', {
  cache: JSON.stringify(cacheObject)
});
```

### Fix Pattern D: Combine Multiple Arguments

```typescript
// Before
logger.error('Error at:', location, 'reason:', reason);

// After
logger.error('Error occurred', reason as Error, {
  location: String(location)
});
```

### Fix Pattern E: Type Assertions When Safe

```typescript
// Before
logger.error('Catch failed', error); // error is unknown

// After
logger.error('Catch failed', error as Error);

// Or more defensive
logger.error('Catch failed', error instanceof Error ? error : new Error(String(error)));
```

## Specific File Fixes

### File: `src/lib/graphql/client.ts`

**Lines 96, 111, 130, 258**

```typescript
// Before
logger.warn('GraphQL authentication error:', error.graphQLErrors);
logger.warn('Rate limit exceeded for operation:', operation.key);
logger.error('GraphQL error:', message, extensions);
logger.info('Forwarding session cookies:', cookies.substring(0, 50) + '...');

// After
logger.warn('GraphQL authentication error', {
  errors: error.graphQLErrors.map(e => ({
    message: e.message,
    code: e.extensions?.code
  }))
});

logger.warn('Rate limit exceeded for operation', {
  operationKey: operation.key
});

error.graphQLErrors.forEach(({ message, extensions }) => {
  logger.error('GraphQL error', new Error(message), { extensions });
});

logger.info('Forwarding session cookies to backend', {
  cookiePreview: cookies.substring(0, 50)
});
```

### File: `src/lib/server/db.ts`

**Lines 53-54**

```typescript
// Before
logger.error('Catch failed', error as Error);
logger.error('Query:', text);
logger.error('Params:', params);

// After
logger.error('Database query failed', error as Error, {
  query: text,
  params
});
```

### File: `src/lib/auth/jwt-utils.ts`

**Line 154**

```typescript
// Before
logger.warn('Invalid JWT format: expected 3 parts, got', parts.length);

// After
logger.warn('Invalid JWT format: expected 3 parts', {
  actualParts: parts.length,
  token: token.substring(0, 20) + '...'
});
```

### File: `src/lib/utils/error-handling.ts`

**Lines 148, 312**

```typescript
// Before (Line 148)
logger.error(`[${timestamp}] ${type.toUpperCase()} Error:`, {
  type,
  message: standardError.message,
  stack: standardError.stack
});

// After - Remove type from Error object
const errorInfo = {
  type,
  message: standardError.message,
  stack: standardError.stack,
  timestamp
};
logger.error(`${type.toUpperCase()} Error`, standardError, errorInfo);

// Before (Line 312)
logger.warn(`Operation failed (attempt ${attempt}/${maxRetries + 1}), retrying in ${delay}ms:`, error);

// After
logger.warn(`Operation failed, retrying`, {
  attempt,
  maxRetries: maxRetries + 1,
  delay,
  error: error instanceof Error ? error.message : String(error)
});
```

## Verification Script

```bash
#!/bin/bash
# verify-logger-types.sh

echo "Checking for logger type errors..."

# Count each type of error
echo ""
echo "Primitive as LogMeta:"
npm run check 2>&1 | grep -c "Argument of type 'string' is not assignable to parameter of type 'LogMeta'"

echo "Number as LogMeta:"
npm run check 2>&1 | grep -c "Argument of type 'number' is not assignable to parameter of type 'LogMeta'"

echo "Non-Error as Error:"
npm run check 2>&1 | grep -c "Argument of type .* is not assignable to parameter of type 'Error'"

echo "Too many arguments:"
npm run check 2>&1 | grep -c "Expected 1-3 arguments, but got"

echo ""
echo "Total logger-related type errors:"
npm run check 2>&1 | grep "logger" | grep "Error:" | wc -l
```

## Manual Review Process

For each file with logger type errors:

1. **Identify the error pattern** (primitives, non-Error, etc.)
2. **Understand the context** - what is being logged?
3. **Choose appropriate fix**:
   - Simple value? → Wrap in object
   - Error-like but not Error? → Create Error or use metadata
   - Complex object? → Serialize or extract fields
   - Multiple arguments? → Combine into metadata
4. **Apply fix** following idiomatic pattern
5. **Verify** type error resolved

## Quality Checklist

After fixing each logger call:

- [ ] First parameter is always a clear, descriptive string message
- [ ] Second parameter (if provided) matches expected type:
  - For `debug/info/warn`: LogMeta object or omitted
  - For `error`: Error object or omitted
- [ ] Third parameter (for `error` only): LogMeta object or omitted
- [ ] No sensitive data (passwords, tokens) in logs
- [ ] Structured metadata for machine parsing
- [ ] Appropriate log level for severity

## Expected Results

### Before Phase 3
```
$ npm run check 2>&1 | grep "Argument of type" | wc -l
86
```

### After Phase 3
```
$ npm run check 2>&1 | grep "Argument of type" | wc -l
0
```

### Error Count Progress
- **Before Phase 3**: ~340 errors
- **After Phase 3**: ~254 errors (25% reduction)

## Testing Strategy

1. **Type Check**: `npm run check` should show no logger type errors
2. **Build Test**: `npm run build` should succeed
3. **Runtime Test**: Verify log output format in dev console
4. **Structured Logging Test**: Check JSON output format if enabled

## Best Practices Summary

```typescript
// ✅ GOOD EXAMPLES

// Simple message
logger.info('User logged in');

// Message with structured metadata
logger.info('User logged in', {
  userId: user.id,
  role: user.role,
  timestamp: Date.now()
});

// Error with context
try {
  await riskyOperation();
} catch (error) {
  logger.error('Operation failed', error as Error, {
    operation: 'riskyOperation',
    userId: user.id
  });
}

// Multiple data points
logger.warn('Rate limit approaching', {
  current: requests.length,
  limit: RATE_LIMIT,
  window: '1h',
  userId: user.id
});

// ❌ BAD EXAMPLES

logger.info('User logged in', user.id); // Primitive as metadata
logger.error('Failed', 'error message'); // String as Error
logger.warn('Issue:', issue, 'at:', location); // Multiple arguments
logger.info('Data', complexObject); // Unserializable object
```

## Next Steps

1. Review each file in "Specific File Fixes" section
2. Apply fixes methodically, one file at a time
3. Run `npm run check` after each file
4. Commit in logical batches
5. Proceed to Phase 4 (Shebang and Module Fixes)
