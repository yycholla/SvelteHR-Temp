# Fix Pre-existing Test Failures Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Recover all 21 pre-existing test failures across 3 files so `npx vitest run --project unit-server --no-coverage` reports 0 failures.

**Architecture:** Three independent fixes: a domain source fix (timezone parsing), test mock corrections (adapter), and a test spy refactor (URQL API). Each is committed separately. No production API changes except the one-line domain bug fix.

**Tech Stack:** TypeScript, Vitest 3.2, URQL v6 (`@urql/core`), hexagonal architecture patterns.

---

## Context

After the 23-module hexagonal architecture migration on `feat/wave-1-integration`, the full unit suite shows:

```
Test Files  3 failed | 253 passed (256)
Tests  21 failed | 5356 passed | 1 skipped (5378)
```

Run tests with:

```bash
npx vitest run --project unit-server --no-coverage
```

The 3 failing files and their root causes are documented in `docs/plans/2026-02-15-fix-preexisting-failures-design.md`.

---

## Task 1: Fix LeaveDateRange timezone bug (1 test)

**Files:**

- Modify: `src/domain/LeaveRequest/LeaveDateRange.ts:18-19`

### Step 1: Verify the test currently fails

```bash
npx vitest run --project unit-server --no-coverage src/domain/LeaveRequest/LeaveDateRange.test.ts
```

Expected output contains:

```
Tests  1 failed | 14 passed | 1 skipped (16)
```

The failing test: `should allow today as start date`

### Step 2: Understand the bug

In `src/domain/LeaveRequest/LeaveDateRange.ts` line 18:

```typescript
const startDate = new Date(startStr); // <-- BUG: parses "2026-02-15" as UTC midnight
```

JavaScript treats `"YYYY-MM-DD"` (no time component) as UTC midnight. But `today.setHours(0,0,0,0)` on line 33 resets to **local** midnight. On UTC-7 machines, UTC midnight of "today" = yesterday local → `startDateOnly < today` is `true` → today's date is incorrectly rejected as "in the past".

### Step 3: Apply the fix

In `src/domain/LeaveRequest/LeaveDateRange.ts`, change lines 18-19:

```typescript
// BEFORE:
const startDate = new Date(startStr);
const endDate = new Date(endStr);

// AFTER: Append T00:00:00 (no Z) → parsed as local midnight, not UTC midnight
const startDate = new Date(startStr + 'T00:00:00');
const endDate = new Date(endStr + 'T00:00:00');
```

No other changes needed. The rest of the date comparison logic already uses local midnight correctly.

### Step 4: Verify the fix passes

```bash
npx vitest run --project unit-server --no-coverage src/domain/LeaveRequest/LeaveDateRange.test.ts
```

Expected output:

```
Tests  15 passed | 1 skipped (16)
Test Files  1 passed (1)
```

### Step 5: Commit

```bash
git add src/domain/LeaveRequest/LeaveDateRange.ts
git commit -m "fix(domain): parse leave dates as local time to fix timezone rejection bug

new Date('YYYY-MM-DD') parses as UTC midnight, causing today's date to be
rejected as 'in the past' for users in UTC-negative timezones. Appending
T00:00:00 (no Z suffix) forces local midnight parsing, consistent with
the existing today.setHours(0,0,0,0) comparison."
```

---

## Task 2: Fix GraphQLEmployeeAdapter test mocks (3 tests)

**Files:**

- Modify: `tests/unit/adapters/GraphQLEmployeeAdapter.test.ts`

### Step 1: Verify the 3 tests currently fail

```bash
npx vitest run --project unit-server --no-coverage tests/unit/adapters/GraphQLEmployeeAdapter.test.ts
```

Expected output:

```
Tests  3 failed | N passed
```

The 3 failing tests:

- `findAll > filters by departmentId (client-side)`
- `findAll > filters by isActive (client-side)`
- `findAll > applies pagination (client-side)`

### Step 2: Understand the bug

The adapter (`src/adapters/GraphQLEmployeeAdapter.ts`) always calls GraphQL with `{ limit, offset }` only — never a `filter` object. It then applies filtering and pagination client-side after receiving ALL data.

**departmentId mock (broken):** filters via `variables.filter?.departmentId` which is always `undefined` → returns empty array → adapter has nothing to filter.

**isActive mock (broken):** same pattern with `variables.filter?.isActive`.

**pagination mock (broken):** pre-paginates via `allUsers.slice(offset, offset + limit)`, then the adapter re-applies pagination client-side → double pagination → returns 1 result instead of 2.

### Step 3: Fix the `filters by departmentId` mock

Find this block in the test file (around line 401):

```typescript
mockGraphQL.query = vi.fn().mockImplementation((query, variables) => {
	const filtered = allUsers.filter((user) => user.departmentId === variables.filter?.departmentId);
	return { users: filtered };
});
```

Replace with:

```typescript
mockGraphQL.query = vi.fn().mockResolvedValue({ users: allUsers });
```

### Step 4: Fix the `filters by isActive` mock

Find this block (around line 445):

```typescript
mockGraphQL.query = vi.fn().mockImplementation((query, variables) => {
	const filtered = allUsers.filter((user) => user.isActive === variables.filter?.isActive);
	return { users: filtered };
});
```

Replace with:

```typescript
mockGraphQL.query = vi.fn().mockResolvedValue({ users: allUsers });
```

### Step 5: Fix the `applies pagination` mock and total assertion

Find this block (around line 527):

```typescript
mockGraphQL.query = vi.fn().mockImplementation((query, variables) => {
	const limit = variables.limit || 20;
	const offset = variables.offset || 0;
	const paginated = allUsers.slice(offset, offset + limit);
	return { users: paginated };
});
```

Replace with:

```typescript
mockGraphQL.query = vi.fn().mockResolvedValue({ users: allUsers });
```

Then find the total assertion (around line 538):

```typescript
expect(result.total).toBe(4);
```

Change to:

```typescript
expect(result.total).toBe(5);
```

Reasoning: `total` is `employees.length` after mapping all 5 users. The adapter slices `employees.slice(1, 3)` → 2 for the result, but `total` reflects the full filtered set (5, since no filters are applied).

### Step 6: Verify all 3 tests now pass

```bash
npx vitest run --project unit-server --no-coverage tests/unit/adapters/GraphQLEmployeeAdapter.test.ts
```

Expected output:

```
Test Files  1 passed (1)
Tests  N passed (N)
```

### Step 7: Commit

```bash
git add tests/unit/adapters/GraphQLEmployeeAdapter.test.ts
git commit -m "fix(tests): correct GraphQLEmployeeAdapter mocks to return all users

The adapter uses client-side filtering — mocks must return all users and
let the adapter filter/paginate, not pre-filter at the mock level.
departmentId and isActive mocks were filtering via variables.filter which
the adapter never sends. Pagination mock was double-paginating."
```

---

## Task 3: Fix jwt-client tests — replace URQL internal property access with constructor spy (17 tests)

**Files:**

- Modify: `tests/unit/graphql/jwt-client.test.ts`

### Step 1: Verify the 17 tests currently fail

```bash
npx vitest run --project unit-server --no-coverage tests/unit/graphql/jwt-client.test.ts
```

Expected output:

```
Tests  17 failed | N passed
```

### Step 2: Understand the bug

URQL v6 stores `url`, `fetchOptions`, and `fetch` in a closure variable inside the Client constructor — they are **not** public properties. Tests that access `client.url`, `client.opts.fetchOptions`, and `client.opts.fetch` all receive `undefined`.

The fix: spy on the `Client` constructor to capture what options **our code passes** to URQL. This is architecturally correct — adapter tests should verify what the adapter passes to external dependencies, not what those dependencies do internally.

### Step 3: Add the `import * as urql` and `ClientSpy` setup

At the top of the test file, the existing import is:

```typescript
import { Client } from '@urql/core';
```

Add a namespace import below it:

```typescript
import * as urql from '@urql/core';
```

In the outer `describe('JWT GraphQL Client')` block, add a spy variable and wire it into `beforeEach`:

Current `beforeEach`:

```typescript
beforeEach(() => {
	vi.clearAllMocks();
});
```

Replace with:

```typescript
let ClientSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
	vi.clearAllMocks();
	ClientSpy = vi.spyOn(urql, 'Client');
});
```

### Step 4: Fix `createJwtGraphQLClient > should create client with correct endpoint`

Current (broken):

```typescript
test('should create client with correct endpoint', async () => {
	const { createJwtGraphQLClient } = await import('$lib/graphql/jwt-client');
	const endpoint = 'http://localhost:8080/graphql';
	const client = createJwtGraphQLClient(endpoint);
	expect(client.url).toBe(endpoint);
});
```

Replace assertion:

```typescript
test('should create client with correct endpoint', async () => {
	const { createJwtGraphQLClient } = await import('$lib/graphql/jwt-client');
	const endpoint = 'http://localhost:8080/graphql';
	createJwtGraphQLClient(endpoint);
	expect(ClientSpy).toHaveBeenCalledWith(expect.objectContaining({ url: endpoint }));
});
```

### Step 5: Fix `createJwtGraphQLClient > should handle different endpoints`

Current (broken):

```typescript
expect(client1.url).toBe(endpoint1);
expect(client2.url).toBe(endpoint2);
```

Replace:

```typescript
test('should handle different endpoints', async () => {
	const { createJwtGraphQLClient } = await import('$lib/graphql/jwt-client');
	const endpoint1 = 'http://api1.example.com/graphql';
	const endpoint2 = 'https://api2.example.com/graphql';
	createJwtGraphQLClient(endpoint1);
	createJwtGraphQLClient(endpoint2);
	expect(ClientSpy).toHaveBeenNthCalledWith(1, expect.objectContaining({ url: endpoint1 }));
	expect(ClientSpy).toHaveBeenNthCalledWith(2, expect.objectContaining({ url: endpoint2 }));
});
```

### Step 6: Fix `createServerJwtClient > should use provided fetch function`

Current (broken):

```typescript
expect(client.opts.fetch).toBe(mockFetch);
```

Replace:

```typescript
test('should use provided fetch function', async () => {
	const { createServerJwtClient } = await import('$lib/graphql/jwt-client');
	const mockFetch = vi.fn();
	createServerJwtClient(mockFetch as any);
	expect(ClientSpy).toHaveBeenCalledWith(expect.objectContaining({ fetch: mockFetch }));
});
```

### Step 7: Fix `createServerJwtClient > should set default GraphQL endpoint for server`

Current (broken):

```typescript
expect(client.url).toBe('http://localhost:8080/graphql');
```

Replace:

```typescript
test('should set default GraphQL endpoint for server', async () => {
	const { createServerJwtClient } = await import('$lib/graphql/jwt-client');
	const mockFetch = vi.fn();
	createServerJwtClient(mockFetch as any);
	expect(ClientSpy).toHaveBeenCalledWith(
		expect.objectContaining({ url: 'http://localhost:8080/graphql' })
	);
});
```

### Step 8: Fix `createServerJwtClient > should include Authorization header when token provided`

Current (broken):

```typescript
const headers = client.opts.fetchOptions?.headers as Record<string, string>;
expect(headers?.Authorization).toBe(`Bearer ${token}`);
```

Replace:

```typescript
test('should include Authorization header when token provided', async () => {
	const { createServerJwtClient } = await import('$lib/graphql/jwt-client');
	const mockFetch = vi.fn();
	const token = 'server-jwt-token';
	createServerJwtClient(mockFetch as any, token);
	const { fetchOptions } = (ClientSpy.mock.calls[0] as [Record<string, unknown>])[0];
	const headers = (fetchOptions as RequestInit)?.headers as Record<string, string>;
	expect(headers?.Authorization).toBe(`Bearer ${token}`);
});
```

### Step 9: Fix `createServerJwtClient > should not include Authorization header without token`

Current (broken):

```typescript
const headers = client.opts.fetchOptions?.headers as Record<string, string>;
expect(headers?.Authorization).toBeUndefined();
```

Replace:

```typescript
test('should not include Authorization header without token', async () => {
	const { createServerJwtClient } = await import('$lib/graphql/jwt-client');
	const mockFetch = vi.fn();
	createServerJwtClient(mockFetch as any);
	const { fetchOptions } = (ClientSpy.mock.calls[0] as [Record<string, unknown>])[0];
	const headers = (fetchOptions as RequestInit)?.headers as Record<string, string>;
	expect(headers?.Authorization).toBeUndefined();
});
```

### Step 10: Fix `createServerJwtClient > should format Authorization header as Bearer token`

Current (broken):

```typescript
const headers = client.opts.fetchOptions?.headers as Record<string, string>;
expect(headers?.Authorization).toMatch(/^Bearer /);
expect(headers?.Authorization).toContain(token);
```

Replace:

```typescript
test('should format Authorization header as Bearer token', async () => {
	const { createServerJwtClient } = await import('$lib/graphql/jwt-client');
	const mockFetch = vi.fn();
	const token = 'my-jwt-token-abc123';
	createServerJwtClient(mockFetch as any, token);
	const { fetchOptions } = (ClientSpy.mock.calls[0] as [Record<string, unknown>])[0];
	const headers = (fetchOptions as RequestInit)?.headers as Record<string, string>;
	expect(headers?.Authorization).toMatch(/^Bearer /);
	expect(headers?.Authorization).toContain(token);
});
```

### Step 11: Fix `createServerJwtClient > should use credentials include for cookies`

Current (broken):

```typescript
const fetchOptions = client.opts.fetchOptions as Record<string, unknown>;
expect(fetchOptions?.credentials).toBe('include');
```

Replace:

```typescript
test('should use credentials include for cookies', async () => {
	const { createServerJwtClient } = await import('$lib/graphql/jwt-client');
	const mockFetch = vi.fn();
	createServerJwtClient(mockFetch as any);
	const { fetchOptions } = (ClientSpy.mock.calls[0] as [Record<string, unknown>])[0];
	expect((fetchOptions as Record<string, unknown>)?.credentials).toBe('include');
});
```

### Step 12: Fix `createServerJwtClient > should handle multiple server clients independently`

Current (broken):

```typescript
expect(client1.opts.fetch).toBe(mockFetch1);
expect(client2.opts.fetch).toBe(mockFetch2);
const headers1 = client1.opts.fetchOptions?.headers as Record<string, string>;
const headers2 = client2.opts.fetchOptions?.headers as Record<string, string>;
expect(headers1?.Authorization).toContain('token1');
expect(headers2?.Authorization).toContain('token2');
```

Replace:

```typescript
test('should handle multiple server clients independently', async () => {
	const { createServerJwtClient } = await import('$lib/graphql/jwt-client');
	const mockFetch1 = vi.fn();
	const mockFetch2 = vi.fn();
	const client1 = createServerJwtClient(mockFetch1 as any, 'token1');
	const client2 = createServerJwtClient(mockFetch2 as any, 'token2');
	expect(client1).not.toBe(client2);
	const opts1 = (ClientSpy.mock.calls[0] as [Record<string, unknown>])[0];
	const opts2 = (ClientSpy.mock.calls[1] as [Record<string, unknown>])[0];
	expect(opts1.fetch).toBe(mockFetch1);
	expect(opts2.fetch).toBe(mockFetch2);
	const headers1 = (opts1.fetchOptions as RequestInit)?.headers as Record<string, string>;
	const headers2 = (opts2.fetchOptions as RequestInit)?.headers as Record<string, string>;
	expect(headers1?.Authorization).toContain('token1');
	expect(headers2?.Authorization).toContain('token2');
});
```

### Step 13: Fix `independent client instances > should create separate clients for different endpoints`

Current (broken):

```typescript
expect(client1.url).not.toBe(client2.url);
```

Replace:

```typescript
test('should create separate clients for different endpoints', async () => {
	const { createJwtGraphQLClient } = await import('$lib/graphql/jwt-client');
	const client1 = createJwtGraphQLClient('http://localhost:8080/graphql');
	const client2 = createJwtGraphQLClient('http://localhost:9090/graphql');
	expect(client1).not.toBe(client2);
	const url1 = (ClientSpy.mock.calls[0] as [Record<string, unknown>])[0].url;
	const url2 = (ClientSpy.mock.calls[1] as [Record<string, unknown>])[0].url;
	expect(url1).not.toBe(url2);
});
```

### Step 14: Fix `independent client instances > should create separate server clients with different tokens`

Current (broken):

```typescript
const headers1 = client1.opts.fetchOptions?.headers as Record<string, string>;
const headers2 = client2.opts.fetchOptions?.headers as Record<string, string>;
expect(headers1?.Authorization).not.toBe(headers2?.Authorization);
```

Replace:

```typescript
test('should create separate server clients with different tokens', async () => {
	const { createServerJwtClient } = await import('$lib/graphql/jwt-client');
	const mockFetch1 = vi.fn();
	const mockFetch2 = vi.fn();
	const client1 = createServerJwtClient(mockFetch1 as any, 'token-a');
	const client2 = createServerJwtClient(mockFetch2 as any, 'token-b');
	expect(client1).not.toBe(client2);
	const opts1 = (ClientSpy.mock.calls[0] as [Record<string, unknown>])[0];
	const opts2 = (ClientSpy.mock.calls[1] as [Record<string, unknown>])[0];
	const headers1 = (opts1.fetchOptions as RequestInit)?.headers as Record<string, string>;
	const headers2 = (opts2.fetchOptions as RequestInit)?.headers as Record<string, string>;
	expect(headers1?.Authorization).not.toBe(headers2?.Authorization);
});
```

### Step 15: Fix `edge cases > should handle empty endpoint string`

This test calls `createJwtGraphQLClient('')` — URQL throws in dev mode when `url` is falsy. The test currently expects the client to be returned, but URQL throws instead. Fix: expect the throw.

Current (broken):

```typescript
test('should handle empty endpoint string', async () => {
	const { createJwtGraphQLClient } = await import('$lib/graphql/jwt-client');
	const client = createJwtGraphQLClient('');
	expect(client).toBeInstanceOf(Client);
});
```

Replace:

```typescript
test('should handle empty endpoint string', async () => {
	const { createJwtGraphQLClient } = await import('$lib/graphql/jwt-client');
	expect(() => createJwtGraphQLClient('')).toThrow(
		'You are creating an urql-client without a url.'
	);
});
```

### Step 16: Fix `edge cases > should handle HTTPS endpoints`

Current (broken):

```typescript
expect(client.url).toBe(secureEndpoint);
```

Replace:

```typescript
test('should handle HTTPS endpoints', async () => {
	const { createJwtGraphQLClient } = await import('$lib/graphql/jwt-client');
	const secureEndpoint = 'https://api.example.com/graphql';
	createJwtGraphQLClient(secureEndpoint);
	expect(ClientSpy).toHaveBeenCalledWith(expect.objectContaining({ url: secureEndpoint }));
});
```

### Step 17: Fix `edge cases > should handle port numbers in endpoint`

Current (broken):

```typescript
expect(client.url).toBe(customPort);
```

Replace:

```typescript
test('should handle port numbers in endpoint', async () => {
	const { createJwtGraphQLClient } = await import('$lib/graphql/jwt-client');
	const customPort = 'http://localhost:4000/graphql';
	createJwtGraphQLClient(customPort);
	expect(ClientSpy).toHaveBeenCalledWith(expect.objectContaining({ url: customPort }));
});
```

### Step 18: Fix `edge cases > should handle empty token in server client`

Current (broken):

```typescript
const headers = client.opts.fetchOptions?.headers as Record<string, string>;
expect(headers?.Authorization).toBe('Bearer ');
```

Replace:

```typescript
test('should handle empty token in server client', async () => {
	const { createServerJwtClient } = await import('$lib/graphql/jwt-client');
	const mockFetch = vi.fn();
	createServerJwtClient(mockFetch as any, '');
	const { fetchOptions } = (ClientSpy.mock.calls[0] as [Record<string, unknown>])[0];
	const headers = (fetchOptions as RequestInit)?.headers as Record<string, string>;
	expect(headers?.Authorization).toBe('Bearer ');
});
```

### Step 19: Fix `edge cases > should handle token with special characters`

Current (broken):

```typescript
const headers = client.opts.fetchOptions?.headers as Record<string, string>;
expect(headers?.Authorization).toContain(tokenWithSpecialChars);
```

Replace:

```typescript
test('should handle token with special characters', async () => {
	const { createServerJwtClient } = await import('$lib/graphql/jwt-client');
	const mockFetch = vi.fn();
	const tokenWithSpecialChars = 'eyJ.hGci.OiJIUzI1NiIsInR5cCI6IkpXVCJ9';
	createServerJwtClient(mockFetch as any, tokenWithSpecialChars);
	const { fetchOptions } = (ClientSpy.mock.calls[0] as [Record<string, unknown>])[0];
	const headers = (fetchOptions as RequestInit)?.headers as Record<string, string>;
	expect(headers?.Authorization).toContain(tokenWithSpecialChars);
});
```

### Step 20: Fix `configuration consistency > should use different endpoints for browser and server clients`

Current (broken):

```typescript
expect(browserClient.url).toBe('https://api.example.com/graphql');
expect(serverClient.url).toBe('http://localhost:8080/graphql');
```

Replace:

```typescript
test('should use different endpoints for browser and server clients', async () => {
	const { createJwtGraphQLClient, createServerJwtClient } = await import('$lib/graphql/jwt-client');
	const mockFetch = vi.fn();
	createJwtGraphQLClient('https://api.example.com/graphql');
	createServerJwtClient(mockFetch as any);
	const opts1 = (ClientSpy.mock.calls[0] as [Record<string, unknown>])[0];
	const opts2 = (ClientSpy.mock.calls[1] as [Record<string, unknown>])[0];
	expect(opts1.url).toBe('https://api.example.com/graphql');
	expect(opts2.url).toBe('http://localhost:8080/graphql');
});
```

### Step 21: Run the full jwt-client test file

```bash
npx vitest run --project unit-server --no-coverage tests/unit/graphql/jwt-client.test.ts
```

Expected output:

```
Test Files  1 passed (1)
Tests  N passed (N)
```

If any tests still fail, check that `ClientSpy.mock.calls[0]` is indexed correctly — some tests that call `createJwtGraphQLClient` will trigger the module-level `jwtGraphQLClient` initialization first (call index 0), pushing the factory call to index 1. If so, change `calls[0]` to `calls[calls.length - 1]` or restructure using `toHaveBeenLastCalledWith`.

### Step 22: Commit

```bash
git add tests/unit/graphql/jwt-client.test.ts
git commit -m "fix(tests): replace URQL internal property access with Client constructor spy

URQL v6 stores url/fetchOptions/fetch in a closure - not public properties.
Spy on Client constructor to capture what our factory passes to URQL.
This is architecturally correct: adapter tests verify what we pass to
external deps, not internal dep state. Also fixes empty-url edge case
to correctly expect the URQL dev-mode throw."
```

---

## Final Verification

```bash
npx vitest run --project unit-server --no-coverage
```

Expected final output:

```
Test Files  256 passed (256)
Tests  5378 passed | 1 skipped (5379)
```

If any tests still fail, check the `ClientSpy.mock.calls` indexing — module-level initialization of `jwtGraphQLClient` may add a call before the per-test factory call.
