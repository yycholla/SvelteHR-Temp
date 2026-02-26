# Client-Side Service Container Design

**Date**: 2026-02-23
**Status**: Approved
**Related Issues**: JWT auth state synchronization, hexagonal architecture enforcement

## Executive Summary

This design introduces a **client-side Service Container** to enable Svelte stores to access domain services (RBACService, etc.) without bypassing hexagonal architecture. Currently, `auth.svelte.ts` directly calls `jwtGraphQLClient.query()` with raw GraphQL strings, violating the ports & adapters pattern. This design creates a parallel client-side ServiceContainer that mirrors the existing server-side container but uses the JWT GraphQL client for authentication instead of SvelteKit's RequestEvent.

**Key Benefits**:

- ✅ Enforces hexagonal architecture in Svelte stores
- ✅ Type-safe domain errors instead of GraphQL errors
- ✅ Reuses existing service layer (RBACService, etc.)
- ✅ Minimal changes (3 files modified, 1 created)
- ✅ No breaking changes to existing code

## Problem Statement

### Current Architecture Violation

The `auth.svelte.ts` store bypasses the hexagonal architecture:

```typescript
// CURRENT (lines 241-339 in auth.svelte.ts)
const client = jwtGraphQLClient;
const result = await client.query(GET_ALL_ROLES, {}).toPromise();

if (result.error) {
	// GraphQL error - hard to handle
	logger.error(`[Auth] Could not load roles: ${result.error.message}`);
}
```

**What's wrong**:

- Direct GraphQL client usage (should use RBACService)
- Raw GraphQL queries (should use domain entities)
- GraphQL errors (should use domain errors)
- No type safety (Result<T, E> pattern not used)

### Desired Architecture

```
Svelte Store (auth.svelte.ts)
    ↓ calls
ClientServiceContainer
    ↓ lazy-creates
RBACService (domain service)
    ↓ uses port interface
GraphQLRoleAdapter (adapter layer)
    ↓ uses
jwtGraphQLClient (HTTP-only cookie auth)
    ↓ GraphQL over HTTP
Backend (Rust/Axum)
```

**Why this is better**:

- Store only talks to service layer (hexagonal architecture)
- Service returns `Result<Role[], RBACError>` (domain entities + typed errors)
- No GraphQL knowledge in store layer
- Same RBACService used server-side and client-side

## Architecture

### Two-Tier System

We maintain **two parallel ServiceContainers**:

1. **Server-side** (existing): `src/lib/server/services.ts`
   - Uses `RequestEvent` for authentication (server-side cookies)
   - Used in `+page.server.ts`, `+layout.server.ts`, `+server.ts`
   - Factory: `createRBACService(event: RequestEvent)`

2. **Client-side** (new): `src/lib/client/services.ts`
   - Uses `jwtGraphQLClient` for authentication (JWT bearer token)
   - Used in Svelte stores (browser-only)
   - Factory: `createRBACServiceFromClient(client: Client)`

### Dual-Mode Service Factories

Each service factory will have TWO variants:

```typescript
// src/lib/services/rbacServiceFactory.ts

// Existing server-side factory (keep as-is)
export function createRBACService(event: RequestEvent): RBACService {
	const client = createUrqlClient(
		event.fetch,
		undefined,
		undefined,
		serializeCookies(event.cookies)
	);
	const adapter = new GraphQLRoleAdapter(client);
	return new RBACService(adapter);
}

// NEW client-side factory
export function createRBACServiceFromClient(client: Client): RBACService {
	const adapter = new GraphQLRoleAdapter(client);
	return new RBACService(adapter);
}
```

**Key points**:

- Same `RBACService` class used in both
- Same `GraphQLRoleAdapter` used in both
- Only difference: authentication mechanism (cookies vs JWT)
- No changes to service or adapter classes

### Client Service Container

````typescript
// src/lib/client/services.ts (NEW FILE)
import type { Client } from '@urql/core';
import { jwtGraphQLClient } from '$lib/graphql/jwt-client';
import { createRBACServiceFromClient } from '$lib/services/rbacServiceFactory';
import type { RBACService } from '$services/RBACService';

/**
 * Container for client-side services
 *
 * Services are created lazily when accessed, using the JWT GraphQL client
 * for authentication. This mirrors the server-side ServiceContainer but
 * works in browser context.
 */
export class ClientServiceContainer {
	private _rbacService?: RBACService;

	constructor(private readonly client: Client) {}

	/**
	 * Get the RBACService instance
	 *
	 * Creates and caches the service on first access.
	 * The service is configured with JWT authentication.
	 */
	get rbacService(): RBACService {
		if (!this._rbacService) {
			this._rbacService = createRBACServiceFromClient(this.client);
		}
		return this._rbacService;
	}

	// Add other services as needed (goalService, taskService, etc.)
}

/**
 * Singleton container instance
 */
let _containerInstance: ClientServiceContainer | undefined;

/**
 * Get the client-side service container
 *
 * Creates a singleton instance using the JWT GraphQL client.
 * Call this from Svelte stores to access services.
 *
 * @returns ClientServiceContainer with all available services
 *
 * @example
 * ```typescript
 * // In a Svelte store:
 * import { createClientServices } from '$lib/client/services';
 *
 * class AuthStore {
 *   private services = createClientServices();
 *
 *   async loadUserRoles(userId: string): Promise<void> {
 *     const result = await this.services.rbacService.getAllRoles();
 *
 *     if (result.isError) {
 *       logger.error(result.error.message);
 *       return;
 *     }
 *
 *     this.roles = result.value;
 *   }
 * }
 * ```
 */
export function createClientServices(): ClientServiceContainer {
	if (!_containerInstance) {
		_containerInstance = new ClientServiceContainer(jwtGraphQLClient);
	}
	return _containerInstance;
}
````

## Components

### Files to Create

**1. `src/lib/client/services.ts`** (~50 lines)

- `ClientServiceContainer` class
- `createClientServices()` singleton factory
- Initially: `rbacService` getter only
- Future: Add other services as stores need them

### Files to Modify

**2. `src/lib/services/rbacServiceFactory.ts`** (add ~10 lines)

```typescript
// Add this export
export function createRBACServiceFromClient(client: Client): RBACService {
	const adapter = new GraphQLRoleAdapter(client);
	return new RBACService(adapter);
}
```

**3. `src/lib/stores/auth.svelte.ts`** (replace ~100 lines with ~30)

**BEFORE** (lines 241-339):

```typescript
async loadUserRoles(userId: string): Promise<void> {
  if (!browser) {
    return;
  }

  this.isLoading = true;

  const client = jwtGraphQLClient;
  const result = await client.query(GET_ALL_ROLES, {}).toPromise();

  if (result.error) {
    logger.error(`[Auth] Could not load roles: ${result.error.message}`);
    this.isLoading = false;
    return;
  }

  const roles = result.data?.getAllRoles || [];
  // ... 100+ lines of GraphQL data processing
}
```

**AFTER**:

```typescript
import { createClientServices } from '$lib/client/services';

class AuthStore {
	private services = createClientServices();

	async loadUserRoles(userId: string): Promise<void> {
		if (!browser) {
			return;
		}

		this.isLoading = true;

		const result = await this.services.rbacService.getAllRoles();

		if (result.isError) {
			// Domain errors with typed error codes
			const error = result.error;

			switch (error.code) {
				case 'NETWORK_ERROR':
					logger.warn('[Auth] Network error loading roles, using cached data');
					break;
				case 'UNAUTHORIZED':
					logger.error('[Auth] Token expired, redirecting to login');
					this.logout();
					break;
				default:
					logger.error(`[Auth] Unexpected error: ${error.message}`);
					break;
			}

			this.isLoading = false;
			return;
		}

		// Domain entities, not GraphQL data
		const roles = result.value;
		this.processRoles(roles);
		this.isLoading = false;
	}

	private processRoles(roles: Role[]): void {
		// Map domain entities to store state
		this.roles = roles.map((role) => ({
			id: role.id,
			name: role.name.value,
			permissions: role.permissions.map((p) => p.toString())
		}));
	}
}
```

### Files NOT Modified

- Service classes (`RBACService`, etc.) - **unchanged**
- Adapters (`GraphQLRoleAdapter`, etc.) - **unchanged**
- Domain entities (`Role`, `Permission`, etc.) - **unchanged**
- Server-side routes (`+page.server.ts`, etc.) - **unchanged**

## Data Flow

### Initialization (One-Time)

```typescript
// Singleton pattern ensures one container instance
const services = createClientServices();
// ↓ creates
new ClientServiceContainer(jwtGraphQLClient);
```

### Service Access (Lazy)

```typescript
// First access
services.rbacService;
// ↓ creates
createRBACServiceFromClient(jwtGraphQLClient);
// ↓ creates
new RBACService(new GraphQLRoleAdapter(jwtGraphQLClient));

// Second access
services.rbacService;
// ↓ returns cached instance (same object)
```

### Store Usage Pattern

```typescript
// Store initialization
class AuthStore {
	private services = createClientServices(); // Singleton

	async loadUserRoles(userId: string): Promise<void> {
		// 1. Check browser context
		if (!browser) return;

		// 2. Call service layer (not GraphQL)
		const result = await this.services.rbacService.getAllRoles();

		// 3. Handle domain errors
		if (result.isError) {
			this.handleError(result.error);
			return;
		}

		// 4. Process domain entities
		const roles = result.value; // Type: Role[]
		this.processRoles(roles);
	}
}
```

### Complete Request Flow

```
User logs in
    ↓
auth.setUser() called
    ↓ calls
auth.loadUserRoles()
    ↓ checks browser
if (!browser) return;
    ↓ calls
services.rbacService.getAllRoles()
    ↓ calls
repository.findAll()
    ↓ calls
adapter.findAll()
    ↓ calls
client.query(GET_ALL_ROLES)
    ↓ HTTP POST with JWT cookie
Backend GraphQL endpoint
    ↓ returns
GraphQL response
    ↓ adapter converts to
Domain entities (Role[])
    ↓ service wraps in
Result.ok(roles)
    ↓ store processes
this.processRoles(roles)
    ↓ updates
Reactive state
    ↓ triggers
UI re-render
```

## Error Handling

### Error Type Hierarchy

```typescript
// Domain errors (not GraphQL errors)
type RBACError =
	| RoleNotFoundError // code: 'ROLE_NOT_FOUND'
	| InvalidPermissionError // code: 'INVALID_PERMISSION'
	| RoleAlreadyExistsError // code: 'ROLE_ALREADY_EXISTS'
	| NetworkError // code: 'NETWORK_ERROR'
	| UnauthorizedError; // code: 'UNAUTHORIZED'
```

### Error Handling Strategy

**Non-blocking**: Role loading failures do NOT block login

```typescript
async loadUserRoles(userId: string): Promise<void> {
  const result = await this.services.rbacService.getAllRoles();

  if (result.isError) {
    const error = result.error;

    switch (error.code) {
      case 'NETWORK_ERROR':
        // Graceful degradation - log warning, proceed
        logger.warn('[Auth] Network error loading roles, using cached data');
        break;

      case 'UNAUTHORIZED':
        // Critical error - logout and redirect
        logger.error('[Auth] Token expired, redirecting to login');
        this.logout();
        break;

      default:
        // Non-critical - log error, proceed
        logger.error(`[Auth] Unexpected error: ${error.message}`);
        break;
    }

    this.isLoading = false;
    return;
  }

  // Success path
  const roles = result.value;
  this.processRoles(roles);
}
```

### Type Safety Benefits

**BEFORE (GraphQL errors)**:

```typescript
if (result.error) {
	// CombinedError - could be anything
	console.error(result.error.message);
	// No way to handle specific error types
}
```

**AFTER (Domain errors)**:

```typescript
if (result.isError) {
	// Typed error with exhaustive handling
	const code: RBACErrorCode = result.error.code;
	const message: string = result.error.message;

	// Type-safe switch
	switch (code) {
		case 'NETWORK_ERROR':
			/* ... */ break;
		case 'UNAUTHORIZED':
			/* ... */ break;
		// TypeScript ensures all cases handled
	}
}
```

### SSR Safety

```typescript
async loadUserRoles(userId: string): Promise<void> {
  // CRITICAL: Check browser context first
  if (!browser) {
    return; // Skip during SSR - no jwtGraphQLClient available
  }

  // Client-side only from here
  const result = await this.services.rbacService.getAllRoles();
  // ...
}
```

## Testing Strategy

### 1. Unit Tests - Client Service Container

**File**: `src/lib/client/services.test.ts` (NEW)

```typescript
import { describe, it, expect, vi } from 'vitest';
import { ClientServiceContainer, createClientServices } from './services';
import type { Client } from '@urql/core';

describe('ClientServiceContainer', () => {
	it('should lazy-create RBACService on first access', () => {
		const mockClient = {} as Client;
		const container = new ClientServiceContainer(mockClient);

		const service1 = container.rbacService;
		const service2 = container.rbacService;

		expect(service1).toBe(service2); // Same instance
	});

	it('should pass client to service factory', () => {
		const mockClient = {} as Client;
		const container = new ClientServiceContainer(mockClient);

		const service = container.rbacService;

		expect(service).toBeDefined();
		expect(service.getAllRoles).toBeDefined();
	});
});

describe('createClientServices', () => {
	it('should return singleton instance', () => {
		const services1 = createClientServices();
		const services2 = createClientServices();

		expect(services1).toBe(services2);
	});
});
```

### 2. Unit Tests - Client-Side Factory

**File**: `src/lib/services/rbacServiceFactory.test.ts` (MODIFY)

```typescript
import { describe, it, expect } from 'vitest';
import { createRBACServiceFromClient } from './rbacServiceFactory';
import type { Client } from '@urql/core';

describe('createRBACServiceFromClient', () => {
	it('should create RBACService with GraphQLRoleAdapter', () => {
		const mockClient = {} as Client;

		const service = createRBACServiceFromClient(mockClient);

		expect(service).toBeDefined();
		expect(service.getAllRoles).toBeDefined();
	});

	it('should return new instance each time', () => {
		const mockClient = {} as Client;

		const service1 = createRBACServiceFromClient(mockClient);
		const service2 = createRBACServiceFromClient(mockClient);

		expect(service1).not.toBe(service2);
	});
});
```

### 3. Integration Tests - Auth Store

**File**: `src/lib/stores/auth.svelte.test.ts` (MODIFY)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAuthStore } from './auth.svelte';
import { Result } from '$domain/Result';
import { Role } from '$domain/RBAC/Role';
import { RoleName } from '$domain/RBAC/RoleName';

// Mock the client services
vi.mock('$lib/client/services', () => ({
	createClientServices: vi.fn(() => ({
		rbacService: {
			getAllRoles: vi.fn().mockResolvedValue(
				Result.ok([
					Role.create({
						id: '1',
						name: RoleName.create('Admin').value!,
						level: 100,
						permissions: []
					}).value!
				])
			)
		}
	}))
}));

describe('AuthStore - Service Layer Integration', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should load roles via RBACService', async () => {
		const auth = createAuthStore();

		await auth.loadUserRoles('user-123');

		expect(auth.roles).toHaveLength(1);
		expect(auth.roles[0].name).toBe('Admin');
	});

	it('should handle NetworkError gracefully', async () => {
		const mockError = new NetworkError('Connection failed');
		vi.mocked(createClientServices).mockReturnValue({
			rbacService: {
				getAllRoles: vi.fn().mockResolvedValue(Result.error(mockError))
			}
		});

		const auth = createAuthStore();
		const warnSpy = vi.spyOn(logger, 'warn');

		await auth.loadUserRoles('user-123');

		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Network error loading roles'));
		expect(auth.isLoading).toBe(false);
	});

	it('should logout on UnauthorizedError', async () => {
		const mockError = new UnauthorizedError('Token expired');
		vi.mocked(createClientServices).mockReturnValue({
			rbacService: {
				getAllRoles: vi.fn().mockResolvedValue(Result.error(mockError))
			}
		});

		const auth = createAuthStore();
		const logoutSpy = vi.spyOn(auth, 'logout');

		await auth.loadUserRoles('user-123');

		expect(logoutSpy).toHaveBeenCalled();
	});
});
```

### 4. E2E Tests - No Changes Required

Existing Playwright tests continue to work unchanged:

- `tests/e2e/auth.spec.ts` - Login flow
- `tests/e2e/dashboard.spec.ts` - Navigation after login
- `tests/e2e/permissions.spec.ts` - Role-based access

**Why no changes**:

- Same user-facing behavior
- Same GraphQL requests (routed through service layer)
- Same authentication flow (HTTP-only cookies)

### 5. Test Coverage Goals

| Component                   | Coverage Target | Test Count     |
| --------------------------- | --------------- | -------------- |
| ClientServiceContainer      | 100%            | 3 tests        |
| createClientServices        | 100%            | 1 test         |
| createRBACServiceFromClient | 100%            | 2 tests        |
| Auth store integration      | 90%+            | 3+ tests       |
| E2E regression              | 100% pass       | Existing tests |

### 6. Testing Commands

```bash
# Unit tests only (fast, avoids hanging integration tests)
npx vitest run --project unit-server --no-coverage

# Full test suite
mise run test

# E2E only
mise run test:e2e

# Type checking (CRITICAL before commit)
mise run check
```

## Migration Path

### Phase 1: Create Client-Side Infrastructure

1. Create `src/lib/client/services.ts`
2. Add `createRBACServiceFromClient()` to rbacServiceFactory.ts
3. Write unit tests for new code
4. Verify: `npx vitest run --project unit-server --no-coverage`

### Phase 2: Update Auth Store

1. Modify `src/lib/stores/auth.svelte.ts`:
   - Import `createClientServices`
   - Replace `loadUserRoles()` implementation
   - Add `processRoles()` helper
2. Write integration tests
3. Verify: `npx vitest run --project unit-server --no-coverage`

### Phase 3: End-to-End Testing

1. Run E2E tests: `mise run test:e2e`
2. Manual testing:
   - Login flow
   - Role loading
   - Dashboard navigation
3. Verify: All existing tests pass

### Phase 4: Cleanup (Optional)

1. Remove unused GraphQL queries from auth store
2. Update documentation
3. Consider extending to other stores (if needed)

## Future Extensions

### Add More Services to Client Container

As other stores need service access:

```typescript
// src/lib/client/services.ts
export class ClientServiceContainer {
	private _rbacService?: RBACService;
	private _goalService?: GoalService; // NEW
	private _taskService?: TaskService; // NEW

	get goalService(): GoalService {
		if (!this._goalService) {
			this._goalService = createGoalServiceFromClient(this.client);
		}
		return this._goalService;
	}

	get taskService(): TaskService {
		if (!this._taskService) {
			this._taskService = createTaskServiceFromClient(this.client);
		}
		return this._taskService;
	}
}
```

Each new service needs:

1. Client-side factory in service factory file
2. Getter in ClientServiceContainer
3. Unit tests for factory + integration

### Enforce Hexagonal Architecture

Add ESLint rule to prevent direct GraphQL usage in stores:

```javascript
// .eslintrc.js
module.exports = {
	rules: {
		'no-restricted-imports': [
			'error',
			{
				patterns: [
					{
						group: ['$lib/graphql/jwt-client', '$lib/graphql/client'],
						importNames: ['jwtGraphQLClient', 'createUrqlClient'],
						message: 'Use createClientServices() instead of direct GraphQL access'
					}
				]
			}
		]
	}
};
```

## Risks and Mitigations

### Risk 1: HMR Issues with Singleton

**Risk**: Singleton container might not reload properly during development

**Mitigation**:

```typescript
// src/lib/client/services.ts
let _containerInstance: ClientServiceContainer | undefined;

export function createClientServices(): ClientServiceContainer {
	// In dev mode, always create new instance for HMR
	if (import.meta.hot) {
		return new ClientServiceContainer(jwtGraphQLClient);
	}

	// In prod mode, use singleton
	if (!_containerInstance) {
		_containerInstance = new ClientServiceContainer(jwtGraphQLClient);
	}
	return _containerInstance;
}
```

### Risk 2: SSR Execution

**Risk**: Client-side code might execute during SSR

**Mitigation**: Always check `browser` before calling services:

```typescript
async loadUserRoles(userId: string): Promise<void> {
  if (!browser) return; // CRITICAL CHECK

  const result = await this.services.rbacService.getAllRoles();
  // ...
}
```

### Risk 3: Breaking Changes

**Risk**: Changing auth store might break existing code

**Mitigation**:

- Internal implementation change only
- Public API unchanged (store state, methods)
- E2E tests verify no regressions

## Success Criteria

### Implementation Complete When:

- ✅ `src/lib/client/services.ts` created
- ✅ `createRBACServiceFromClient()` added to rbacServiceFactory.ts
- ✅ `auth.svelte.ts` uses ClientServiceContainer
- ✅ All unit tests passing (100% coverage for new code)
- ✅ All E2E tests passing (no regressions)
- ✅ `mise run check` passes (TypeScript)

### Verification Steps:

1. Run unit tests: `npx vitest run --project unit-server --no-coverage`
2. Run E2E tests: `mise run test:e2e`
3. Manual test login flow:
   - Login succeeds
   - Roles load
   - Dashboard accessible
   - Permissions checked
4. Check console for errors
5. Verify no GraphQL HTML responses

## Conclusion

This design enforces hexagonal architecture in Svelte stores by:

1. Creating a client-side ServiceContainer that mirrors the server-side pattern
2. Adding dual-mode factories (event-based, client-based) for services
3. Updating auth store to use RBACService instead of direct GraphQL

**Benefits**:

- Type-safe domain errors
- Reusable service layer
- Minimal changes (3 files modified, 1 created)
- No breaking changes
- Future-proof (easy to add more services)

**Next Steps**:

1. Write implementation plan (using writing-plans skill)
2. Execute plan with TDD approach
3. Verify with E2E tests
4. Document in MEMORY.md
