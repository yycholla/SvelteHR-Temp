# Logger API Type Error Fix Summary

## Domain 4: User Dashboard Routes - Logger API Fixes

### Current Status

**✅ COMPLETED FILES:**

1. `/src/routes/dashboard/tasks/+page.server.ts` - Fixed
2. `/src/routes/dashboard/tasks/[id]/+page.server.ts` - Fixed
3. `/src/routes/dashboard/tasks/my-tasks/+page.server.ts` - Fixed
4. `/src/routes/dashboard/tasks/team-tasks/+page.server.ts` - Fixed
5. `/src/routes/dashboard/employees/+page.server.ts` - Fixed
6. `/src/routes/dashboard/departments/+page.server.ts` - Fixed

**⚠️ REMAINING FILES (29 files):**

- Task routes: `[id]/edit`, `new` (2 files)
- Department routes: `[id]`, `[id]/edit`, `new` (3 files)
- Document routes: `upload`, main page, upload svelte (3 files)
- Employee routes: `[id]`, `[id]/edit`, `new`, `employees2/[id]` (4 files)
- Event routes: `[id]`, main page, svelte (3 files)
- Management routes: `leave-approvals`, `reviews` (3 files)
- Profile routes: `attendance`, `performance`, `settings` (3 files)
- Reviews routes: `create`, main page (2 files)
- Teams, users, notifications, settings, error (6 files)

## Logger API Patterns

### Updated Logger Interface (from `/src/lib/utils/logger.ts`)

```typescript
class Logger {
	debug(message: string, meta?: LogMeta): void;
	info(message: string, meta?: LogMeta): void;
	warn(message: string, meta?: LogMeta): void;
	error(message: string, error?: Error, meta?: LogMeta): void;
}

interface LogMeta {
	[key: string]: unknown;
}
```

### Fix Patterns (Phase 3)

#### Pattern 1: Info/Debug/Warn with Primitives

❌ **WRONG:**

```typescript
logger.info('[Context] Message:', primitiveValue);
logger.info(`[Context] Message: ${primitiveValue}`);
```

✅ **CORRECT:**

```typescript
logger.info('[Context] Message', {
	propertyName: primitiveValue
});
```

**Examples:**

```typescript
// Before
logger.info('[Tasks] Loading task:', taskId);
logger.info(`[Tasks] Found ${count} tasks`);

// After
logger.info('[Tasks] Loading task', { taskId });
logger.info('[Tasks] Found tasks', { count });
```

#### Pattern 2: Error with Non-Error Objects

❌ **WRONG:**

```typescript
logger.error('[Context] Error:', errorArray);
logger.error('[Context] Error:', err as Error);
```

✅ **CORRECT:**

```typescript
// For GraphQL errors
const errorMsg = errors[0]?.message || 'Default message';
logger.error('[Context] Error description', new Error(errorMsg), {
	errors: errors
});

// For caught errors
logger.error('[Context] Error description', err instanceof Error ? err : new Error(String(err)));
```

**Examples:**

```typescript
// Before
if (data.errors) {
	logger.error('[Tasks] GraphQL errors:', data.errors);
	throw new Error(data.errors[0]?.message);
}

// After
if (data.errors) {
	const errorMsg = data.errors[0]?.message || 'Failed to load';
	logger.error('[Tasks] GraphQL errors', new Error(errorMsg), {
		errors: data.errors
	});
	throw new Error(errorMsg);
}
```

#### Pattern 3: Error Details Logging

❌ **WRONG:**

```typescript
logger.error('[Context] Error Details', {
	userId: user.id,
	error: errorResponse
});
```

✅ **CORRECT:**

```typescript
logger.error('[Context] Error Details', undefined, {
	userId: user.id,
	errorMessage: errorResponse.userMessage
});
```

**Example:**

```typescript
// Before
logger.error('[Tasks Error Details]', {
	userId: locals.user?.id,
	filters: { status, priority },
	error: errorResponse
});

// After
logger.error('[Tasks Error Details]', undefined, {
	userId: locals.user?.id,
	status,
	priority,
	errorMessage: errorResponse.userMessage
});
```

## Systematic Fix Process

### For Each File:

1. **Read the file** to understand current logger usage
2. **Find all logger calls** using grep or search
3. **Apply Pattern Fixes:**

   **For `logger.info()` / `logger.debug()` / `logger.warn()`:**
   - Remove colons from messages
   - Wrap all primitives in metadata objects
   - Convert template literals to regular strings + metadata

   **For `logger.error()`:**
   - Ensure second parameter is Error object or undefined
   - GraphQL errors: Extract message, create Error, pass array in metadata
   - Caught errors: Use `err instanceof Error ? err : new Error(String(err))`
   - Error details: Pass undefined as second param, move objects to third param

4. **Test compilation** with `npm run check`

## Quick Reference: Common Fixes

### Task Management

```typescript
// Task IDs
logger.info('[Tasks] Loading task', { taskId });
logger.info('[Tasks] Task created', { taskId: newTask.id });

// Task statuses
logger.info('[Tasks] Filtering by status', { status: statusFilter });

// Task priorities
logger.info('[Tasks] Task priority set', { priority: task.priority });

// Task counts
logger.info('[Tasks] Total tasks', { count: tasks.length });
```

### Employee Management

```typescript
// Employee IDs
logger.info('[Employees] Loading employee', { employeeId });

// Department IDs
logger.info('[Employees] Filtering by department', { departmentId });

// Employee counts
logger.info('[Employees] Found employees', { count: employees.length });
```

### Reviews & Performance

```typescript
// Review IDs
logger.info('[Reviews] Creating review', { reviewId });

// Rating values
logger.info('[Reviews] Review submitted', { rating: review.rating });
```

### Events & Calendar

```typescript
// Event IDs
logger.info('[Events] Loading event', { eventId });

// RSVP statuses
logger.info('[Events] RSVP updated', { status: rsvpStatus });
```

## Automated Fix Script

A Python script has been created at `/home/chanway/Projects/SvelteHR/fix_logger_calls.py` that can automate some of these fixes. However, manual review is recommended for complex cases.

## Validation

After applying fixes, run:

```bash
npm run check
npm run lint
```

## Files Requiring Attention

### High Priority (Frequent Use):

1. `tasks/new/+page.server.ts` - Task creation form
2. `tasks/[id]/edit/+page.server.ts` - Task editing
3. `employees/[id]/+page.server.ts` - Employee details
4. `employees/[id]/edit/+page.server.ts` - Employee editing

### Medium Priority:

5-15. Event, document, and management routes

### Lower Priority:

16-29. Settings, profile, and error pages

## Success Criteria

All logger type errors eliminated when running:

```bash
npm run check 2>&1 | grep "logger\."
```

Should return no results.
