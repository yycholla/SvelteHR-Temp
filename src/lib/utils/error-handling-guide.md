# Standardized Error Handling Guide

**T055: Error Handling Standardization - CRITICAL**

This guide explains how to use the standardized error handling system implemented across the SvelteHR application.

## Overview

The standardized error handling system provides:

- **Consistent error classification** with user-friendly messages
- **Structured error responses** with debugging information
- **Server-side error handling** for +page.server.ts files
- **Client-side error boundaries** for component-level error handling
- **Automatic retry mechanisms** with exponential backoff
- **Production-ready logging** with error tracking integration
- **TypeScript-first approach** with proper type safety

## Core Components

### 1. Error Handling Utilities (`/lib/utils/error-handling.ts`)

#### `createStandardError(originalError, context)`

Converts any error into a standardized `StandardErrorResponse`:

```typescript
const standardError = createStandardError(new Error('Network timeout'), {
	requestId: 'req_123',
	userId: 'user_456',
	path: '/dashboard',
	operation: 'Load Dashboard Data'
});
```

#### `throwStandardError(originalError, context)`

Throws a SvelteKit-compatible error with standardized formatting:

```typescript
throwStandardError(error, {
	userId: locals.user?.id,
	path: event.url.pathname,
	operation: 'Load Employee Data'
});
```

#### `safeServerLoad(loadFunction, context)`

Wraps server load functions with comprehensive error handling:

```typescript
return safeServerLoad(() => loadEmployees(userId), {
	userId: locals.user.id,
	path: event.url.pathname,
	operation: 'Load Employees'
});
```

### 2. Server Load Helpers (`/lib/server/load-helpers.ts`)

#### `createServerLoad(loadFn, options)`

Creates a standardized server load function with authentication and error handling:

```typescript
export const load: PageServerLoad = createServerLoad(
	async (event) => {
		const data = await loadData();
		return { data };
	},
	{
		requireAuth: true,
		requiredPermissions: ['employees:read'],
		operation: 'Load Employee Directory'
	}
);
```

#### `executeGraphQLQuery<T>(query, variables, options)`

Executes GraphQL queries with timeout, retry logic, and error handling:

```typescript
const employees = await executeGraphQLQuery(
	GET_EMPLOYEES_QUERY,
	{ limit: 20 },
	{
		timeout: 30000,
		retries: 3,
		context: { userId: user.id, operation: 'Load Employees' }
	}
);
```

### 3. Error Boundary Component (`/lib/components/ui/ErrorBoundary.svelte`)

Provides client-side error boundaries for component-level error handling:

```svelte
<ErrorBoundary showDetails={true} onRetry={() => location.reload()}>
	<MyComponent />
</ErrorBoundary>
```

## Usage Patterns

### Server-Side Error Handling (+page.server.ts files)

**Standard Pattern:**

```typescript
import { createServerLoad, checkPermissions } from '$lib/server/load-helpers.js';

export const load: PageServerLoad = createServerLoad(
	async (event) => {
		const { locals } = event;

		// Your data loading logic
		const data = await loadBusinessData(locals.user.id);

		return {
			data,
			user: locals.user,
			loadedAt: new Date().toISOString()
		};
	},
	{
		requireAuth: true,
		requiredPermissions: ['resource:read'],
		operation: 'Load Business Data'
	}
);
```

**Manual Error Handling:**

```typescript
import { throwStandardError } from '$lib/utils/error-handling.js';

export const load: PageServerLoad = async (event) => {
	try {
		const data = await riskyOperation();
		return { data };
	} catch (error) {
		throwStandardError(error, {
			userId: event.locals.user?.id,
			path: event.url.pathname,
			operation: 'Risky Operation'
		});
	}
};
```

### Client-Side Error Handling

**Component-Level Error Boundaries:**

```svelte
<!-- MyPage.svelte -->
<script>
	import ErrorBoundary from '$lib/components/ui/ErrorBoundary.svelte';
	import { createLoadingState } from '$lib/utils/error-handling.js';

	const loadingState = createLoadingState();

	const loadData = async () => {
		await loadingState.execute(async () => {
			const response = await fetch('/api/data');
			if (!response.ok) throw new Error('Failed to load');
			return response.json();
		});
	};
</script>

<ErrorBoundary>
	{#if loadingState.loading}
		<LoadingSpinner />
	{:else if loadingState.error}
		<ErrorMessage error={loadingState.error} />
	{:else}
		<DataComponent />
	{/if}
</ErrorBoundary>
```

**Global Error Handling:**

```svelte
<!-- app.html or +layout.svelte -->
<ErrorBoundary showDetails={$dev} showRetry={true}>
	<main>
		<slot />
	</main>
</ErrorBoundary>
```

### API Routes Error Handling

```typescript
// src/routes/api/employees/+server.ts
import { json } from '@sveltejs/kit';
import { createStandardError } from '$lib/utils/error-handling.js';

export async function GET({ locals, url }) {
	try {
		const employees = await getEmployees();
		return json({ employees });
	} catch (error) {
		const standardError = createStandardError(error, {
			userId: locals.user?.id,
			path: url.pathname,
			operation: 'API - Get Employees'
		});

		return json(
			{
				error: standardError.userMessage,
				type: standardError.type,
				requestId: standardError.requestId
			},
			{ status: standardError.statusCode }
		);
	}
}
```

## Error Types and Classifications

### Automatic Error Classification

The system automatically classifies errors into these types:

- **`validation`** - Zod validation errors, form validation issues
- **`authentication`** - 401 errors, unauthorized access attempts
- **`authorization`** - 403 errors, insufficient permissions
- **`not_found`** - 404 errors, missing resources
- **`network_error`** - Connection failures, timeouts
- **`graphql_error`** - GraphQL query/mutation errors
- **`server_error`** - 500 errors, unexpected server issues

### User-Friendly Messages

Each error type has predefined user-friendly messages:

```typescript
const messages = {
	validation: 'Please check your input and try again.',
	authentication: 'Please log in to access this page.',
	authorization: "You don't have permission to access this resource.",
	not_found: 'The requested resource was not found.',
	server_error: 'Something went wrong on our end. Please try again later.',
	network_error: 'Unable to connect to the server. Please check your connection.',
	graphql_error: 'There was a problem loading the data. Please try refreshing the page.'
};
```

## Advanced Features

### Retry Mechanism with Exponential Backoff

```typescript
import { withRetry } from '$lib/utils/error-handling.js';

const data = await withRetry(
	async () => {
		const response = await fetch('/api/data');
		if (!response.ok) throw new Error('API Error');
		return response.json();
	},
	{
		maxRetries: 3,
		baseDelay: 1000,
		maxDelay: 10000,
		retryOn: (error) => error.status >= 500 // Only retry server errors
	}
);
```

### Server-Side Caching with Error Handling

```typescript
import { ServerCache } from '$lib/server/load-helpers.js';

const employees = await ServerCache.get(
	'employees_list',
	async () => {
		const data = await fetchEmployeesFromAPI();
		return data;
	},
	{
		ttl: 300000, // 5 minutes
		context: {
			userId: user.id,
			operation: 'Cache Employees'
		}
	}
);
```

### Rate Limiting

```typescript
import { ServerRateLimit } from '$lib/server/load-helpers.js';

export const load: PageServerLoad = async (event) => {
	// Check rate limit
	ServerRateLimit.check(event.getClientAddress(), {
		maxAttempts: 100,
		windowMs: 60000, // 1 minute
		context: {
			userId: event.locals.user?.id,
			operation: 'Page Load'
		}
	});

	// Continue with normal loading...
};
```

## Production Considerations

### Error Tracking Integration

The system includes hooks for error tracking services:

```typescript
// hooks.server.ts
export const handleError = ({ error, event }) => {
	const standardError = createStandardError(error, {
		/* context */
	});

	if (process.env.NODE_ENV === 'production') {
		// Send to error tracking service
		Sentry.captureException(error, {
			contexts: {
				standardError,
				request: {
					url: event.url.pathname,
					method: event.request.method,
					user_id: event.locals.user?.id
				}
			}
		});
	}

	return {
		message: standardError.userMessage,
		type: standardError.type,
		requestId: standardError.requestId
	};
};
```

### Performance Monitoring

Response times and error rates are automatically logged:

```typescript
// Automatic in createServerLoad
const timer = measureResponseTime();
// ... load logic ...
timer.addToHeaders(response.headers);
```

### Security Considerations

- **Error details** are only shown in development mode
- **Stack traces** are never exposed to end users
- **Request IDs** enable secure error tracking without exposing sensitive data
- **Rate limiting** prevents abuse and DoS attacks

## Migration Guide

### Converting Existing +page.server.ts Files

**Before:**

```typescript
export const load: PageServerLoad = async ({ locals }) => {
	try {
		const data = await loadData();
		return { data };
	} catch (error) {
		throw error(500, 'Something went wrong');
	}
};
```

**After:**

```typescript
export const load: PageServerLoad = createServerLoad(
	async (event) => {
		const data = await loadData();
		return { data };
	},
	{
		requireAuth: true,
		requiredPermissions: ['data:read'],
		operation: 'Load Data'
	}
);
```

### Converting Existing Component Error Handling

**Before:**

```svelte
<script>
	let error = null;

	const loadData = async () => {
		try {
			data = await fetch('/api/data');
		} catch (e) {
			error = 'Something went wrong';
		}
	};
</script>

{#if error}
	<div class="error">{error}</div>
{:else}
	<DataComponent />
{/if}
```

**After:**

```svelte
<script>
	import ErrorBoundary from '$lib/components/ui/ErrorBoundary.svelte';
	import { createLoadingState } from '$lib/utils/error-handling.js';

	const loadingState = createLoadingState();

	const loadData = () => {
		return loadingState.execute(async () => {
			const response = await fetch('/api/data');
			if (!response.ok) throw new Error('API Error');
			return response.json();
		});
	};
</script>

<ErrorBoundary>
	{#if loadingState.loading}
		<LoadingSpinner />
	{:else if loadingState.error}
		<ErrorDisplay error={loadingState.error} onRetry={loadData} />
	{:else}
		<DataComponent />
	{/if}
</ErrorBoundary>
```

This standardized system ensures consistent, user-friendly error handling across the entire application while providing developers with powerful debugging and monitoring capabilities.
