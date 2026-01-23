# Week 4 Foundation Completion - Design Document

**Created:** 2026-01-22
**Status:** Approved
**Timeline:** 8-10 days (sequential layer completion)
**Context:** Phase 1, Week 4 of 12-week comprehensive test implementation plan

---

## Executive Summary

Complete the foundation layer (Week 4 goals) through systematic sequential development of three critical infrastructure layers. This provides the testable, type-safe foundation needed for Phase 2 (Business Logic extraction).

**Goal:** 80%+ test coverage, zero `any` types, fully injectable and testable foundation.

**Approach:** Bottom-up sequential layer completion to avoid circular dependencies.

---

## Architecture: Three Foundation Layers

### Layer 1: Shared Utilities (2-3 days)

Extract and test all shared utilities that other layers depend on.

**Directory Structure:**

```
src/lib/utils/
├── logger.ts              # Structured logging (exists, needs testing)
├── formatters/
│   ├── date.ts           # Date formatting utilities
│   ├── currency.ts       # Money/number formatting
│   ├── phone.ts          # Phone number formatting
│   └── name.ts           # Name display utilities
├── validators/
│   ├── email.ts          # Email validation
│   ├── phone.ts          # Phone validation
│   ├── date.ts           # Date validation
│   └── string.ts         # String validation helpers
├── errors/
│   ├── AppError.ts       # Base error class
│   └── ErrorHandler.ts   # Centralized error handling
└── test-helpers/
    ├── factories.ts      # Test data factories
    └── mocks.ts          # Mock utilities
```

**Current Issues:**

- Utils scattered across `src/lib/utils/`, `src/lib/server/`, components
- Many have `any` types
- ~20% test coverage
- Some coupled to Svelte/browser APIs

**Deliverables:**

- All utils properly typed (zero `any`)
- Comprehensive unit tests (90%+ coverage)
- Extracted from components (no Svelte dependencies)
- Documented with JSDoc comments

**Testing Strategy:**

- Pure functions = easy unit tests (no mocks)
- Test edge cases: null/undefined, empty strings, invalid formats
- Target: 90%+ coverage

---

### Layer 2: Authentication Services (3-4 days)

Extract auth logic into testable services with dependency injection.

**Directory Structure:**

```
src/services/auth/
├── AuthService.ts         # Core authentication operations
│   ├── login(credentials)
│   ├── logout()
│   ├── getCurrentUser()
│   └── validateSession()
├── RBACService.ts         # Permission checking
│   ├── hasPermission(user, permission)
│   ├── hasAnyPermission(user, permissions[])
│   ├── hasAllPermissions(user, permissions[])
│   └── canAccessResource(user, resource, action)
├── SessionService.ts      # Session management (abstracted)
│   ├── createSession(user)
│   ├── getSession(sessionId)
│   ├── updateSession(sessionId, data)
│   └── destroySession(sessionId)
└── ports/
    └── SessionPort.ts     # Interface that adapters implement
```

**Current Issues:**

- Auth logic mixed into `+page.server.ts` files
- RBAC checks scattered across routes
- Session management tightly coupled to SvelteKit locals
- Hard to test permission scenarios

**Key Pattern - Dependency Injection:**

```typescript
// Service doesn't know about SvelteKit
class AuthService {
	constructor(
		private sessionPort: SessionPort,
		private graphql: GraphQLPort
	) {}
}

// Adapter knows about SvelteKit
class SvelteKitSessionAdapter implements SessionPort {
	constructor(private event: RequestEvent) {}
}
```

**Deliverables:**

- Services extracted with zero SvelteKit coupling
- Integration tests with mocked dependencies
- RBAC unit tests covering all permission scenarios
- `+page.server.ts` files refactored to use services

**Testing Strategy:**

- Mock SessionPort for testing AuthService
- Test all RBAC permission combinations
- Verify error handling (invalid credentials, expired sessions)
- Target: 80%+ coverage

---

### Layer 3: GraphQL Infrastructure (2-3 days)

Formalize GraphQL client as injectable, testable adapter with proper types.

**Directory Structure:**

```
src/adapters/graphql/
├── GraphQLClient.ts       # URQL client wrapper with error handling
├── GraphQLAdapter.ts      # Implements GraphQLPort interface
├── errors/
│   ├── GraphQLError.ts    # Typed GraphQL errors
│   └── NetworkError.ts    # Network-specific errors
└── types/
    └── generated.ts       # Auto-generated from schema

src/services/ports/
└── GraphQLPort.ts         # Interface for GraphQL operations
    ├── query<T>(operation, variables)
    ├── mutation<T>(operation, variables)
    └── subscribe<T>(operation, variables)
```

**Current Issues:**

- GraphQL client setup scattered across files
- No centralized error handling
- Missing TypeScript types for many queries/mutations
- Hard to mock GraphQL responses in tests

**Key Improvements:**

**1. Type Generation:**

```bash
# Generate TypeScript types from GraphQL schema
npm run graphql:codegen
# Creates src/adapters/graphql/types/generated.ts
```

**2. Centralized Error Handling:**

```typescript
class GraphQLAdapter implements GraphQLPort {
  async query<T>(operation: string, variables?: any): Promise<T> {
    const result = await this.client.query(operation, variables);

    if (result.error) {
      throw this.handleGraphQLError(result.error);
    }

    return result.data;
  }

  private handleGraphQLError(error: CombinedError): GraphQLError {
    // Map GraphQL errors to domain errors
    if (error.message.includes('not found')) {
      return new NotFoundError(...);
    }
    // etc.
  }
}
```

**3. Mockable for Tests:**

```typescript
class MockGraphQLAdapter implements GraphQLPort {
	private responses = new Map();

	setResponse(operation: string, data: any) {
		this.responses.set(operation, data);
	}

	async query<T>(operation: string): Promise<T> {
		return this.responses.get(operation);
	}
}
```

**Deliverables:**

- GraphQL client extracted as injectable adapter
- TypeScript types generated from schema
- Centralized error handling and mapping
- Mock adapter for testing other services
- All existing adapters (Employee, Department) refactored to use GraphQLPort

**Testing Strategy:**

- Integration tests with real GraphQL backend (test environment)
- Unit tests with MockGraphQLAdapter
- Error handling tests (network failures, GraphQL errors, invalid responses)
- Target: 80%+ coverage

---

## Why Sequential (Bottom-Up)?

**Layer Dependencies:**

- Layer 2 (Auth) depends on Layer 1 (logger, validators, error handlers)
- Layer 3 (GraphQL) depends on Layer 2 (session tokens for auth)
- Bottom-up ensures no circular dependencies

**Benefits:**

1. Each layer can be validated as "done" before moving on
2. Lower integration risk (dependencies already stable)
3. Clear completion criteria per layer
4. Matches Week 4 plan structure

**Alternative Rejected:**

- Parallel development: Higher integration risk, harder to validate foundation
- Vertical slices: Would miss shared foundation needs

---

## Success Criteria

**Layer 1 Complete When:**

- [ ] All utils in `src/lib/utils/` with zero Svelte dependencies
- [ ] Zero `any` types in utils
- [ ] 90%+ test coverage for utils
- [ ] Test helpers/factories available for other layers

**Layer 2 Complete When:**

- [ ] Auth services extracted from routes
- [ ] Zero SvelteKit coupling in services
- [ ] 80%+ test coverage for auth layer
- [ ] All RBAC scenarios tested
- [ ] `+page.server.ts` files use services (not inline auth logic)

**Layer 3 Complete When:**

- [ ] GraphQL adapter implements GraphQLPort
- [ ] Types generated from schema
- [ ] 80%+ test coverage for GraphQL layer
- [ ] Mock adapter available for testing
- [ ] All existing adapters refactored to use GraphQLPort

**Week 4 Complete When:**

- [ ] All three layers complete
- [ ] 80%+ coverage for foundation (utils + services + adapters)
- [ ] Zero `any` types in foundation code
- [ ] Dependency injection container working
- [ ] Ready for Phase 2 (Business Logic extraction)

---

## Timeline

**Layer 1:** 2-3 days
**Layer 2:** 3-4 days
**Layer 3:** 2-3 days

**Total:** 8-10 days

---

## Next Steps

1. Get approval on design ✅
2. Create git worktree for isolated development
3. Write detailed implementation plan (tasks.md)
4. Execute Layer 1 → Layer 2 → Layer 3 sequentially

---

**This completes Phase 1, Week 4. Phase 2 (Business Logic extraction) begins after.**
