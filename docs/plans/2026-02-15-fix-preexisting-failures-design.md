# Design: Fix Pre-existing Test Failures

**Date:** 2026-02-15
**Branch:** feat/wave-1-integration
**Scope:** 21 failing tests across 3 files, all pre-existing bugs unrelated to hexagonal architecture migration

---

## Overview

After completing the 23-module hexagonal architecture migration, a full unit test run (`npx vitest run --project unit-server --no-coverage`) revealed 21 pre-existing failures across 3 files. None are caused by the migration work. Each has a distinct root cause.

---

## Failure 1: LeaveDateRange timezone bug (1 test)

**File:** `src/domain/LeaveRequest/LeaveDateRange.ts`
**Test:** `should allow today as start date`

### Root Cause

`new Date("YYYY-MM-DD")` (ISO date-only string) is parsed by JavaScript as **UTC midnight**, while `today.setHours(0, 0, 0, 0)` resets to **local midnight**. On machines in UTC-7 (Mountain Time), UTC midnight of "today" corresponds to yesterday in local time, so the past-date check `startDateOnly < today` incorrectly returns `true`.

This is a real domain bug — any user in a UTC-negative timezone submitting a leave request for "today" would have it rejected.

### Fix

Parse input date strings as local midnight by appending `'T00:00:00'` (no `Z`):

```typescript
// src/domain/LeaveRequest/LeaveDateRange.ts
const startDate = new Date(startStr + 'T00:00:00');
const endDate = new Date(endStr + 'T00:00:00');
```

Both sides of the comparison now use local time, making the behavior timezone-consistent.

---

## Failure 2: GraphQLEmployeeAdapter mock setup (3 tests)

**File:** `tests/unit/adapters/GraphQLEmployeeAdapter.test.ts`
**Tests:** `filters by departmentId`, `filters by isActive`, `applies pagination`

### Root Cause

The adapter sends `{ limit, offset }` as GraphQL variables (no `filter` object), but two mocks filter by `variables.filter?.departmentId` / `variables.filter?.isActive` — both always `undefined` → mock returns 0 users → adapter has nothing to filter client-side.

The pagination mock pre-paginates with `allUsers.slice(offset, offset + limit)`, but the adapter **also** applies client-side pagination after receiving the response → double pagination → 1 result instead of 2.

### Fix

All three mocks return the full dataset, letting the adapter perform its own client-side filtering and pagination (matching the adapter's documented intent):

```typescript
// departmentId and isActive tests:
mockGraphQL.query = vi.fn().mockResolvedValue({ users: allUsers });

// pagination test:
mockGraphQL.query = vi.fn().mockResolvedValue({ users: allUsers });
// Also update: expect(result.total).toBe(5)  // was 4 — now all 5 users are mapped
```

---

## Failure 3: jwt-client URQL v6 API mismatch (17 tests)

**File:** `tests/unit/graphql/jwt-client.test.ts`

### Root Cause

URQL v6 stores `url`, `fetchOptions`, and `fetch` in a closure variable — they are **not** public properties on the `Client` instance. Tests accessing `client.url`, `client.opts.fetchOptions`, and `client.opts.fetch` all get `undefined`.

### Fix (Approach A — hexagonally correct)

Spy on the `Client` constructor to capture the options our factory passes. This tests **what our code passes to URQL**, not what URQL does with it internally — the architecturally correct boundary for adapter tests.

```typescript
import * as urql from '@urql/core';

let ClientSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
	vi.clearAllMocks();
	ClientSpy = vi.spyOn(urql, 'Client');
});

// Replace client.url assertions:
expect(ClientSpy).toHaveBeenCalledWith(expect.objectContaining({ url: endpoint }));

// Replace client.opts.fetchOptions assertions:
const { fetchOptions } = ClientSpy.mock.calls[0][0];
const headers = (fetchOptions as RequestInit)?.headers as Record<string, string>;
expect(headers?.Authorization).toBe(`Bearer ${token}`);
```

`expect(client).toBeInstanceOf(Client)` continues to pass since the spy wraps the real constructor.

---

## Implementation Plan

| Task                        | File                                                 | Type       | Tests Recovered |
| --------------------------- | ---------------------------------------------------- | ---------- | --------------- |
| Fix timezone parsing        | `src/domain/LeaveRequest/LeaveDateRange.ts`          | Source fix | 1               |
| Fix departmentId mock       | `tests/unit/adapters/GraphQLEmployeeAdapter.test.ts` | Test fix   | 1               |
| Fix isActive mock           | `tests/unit/adapters/GraphQLEmployeeAdapter.test.ts` | Test fix   | 1               |
| Fix pagination mock + total | `tests/unit/adapters/GraphQLEmployeeAdapter.test.ts` | Test fix   | 1               |
| Spy on Client constructor   | `tests/unit/graphql/jwt-client.test.ts`              | Test fix   | 17              |

**Expected outcome:** 5378 tests, 5378 passing (0 failures)

---

## Architectural Notes

- **LeaveDateRange.ts**: Domain layer — the fix belongs in the source. UTC ambiguity in date-only ISO strings is a well-known JS footgun; `T00:00:00` suffix is the canonical local-time fix.
- **GraphQLEmployeeAdapter.test.ts**: Tests were written as if the backend does server-side filtering, but the adapter uses client-side filtering intentionally (backend limitation). Mocks should simulate the backend returning all data.
- **jwt-client.test.ts**: In hexagonal architecture, adapter tests verify the adapter correctly configures external dependencies — read from the input side (constructor args), not the output side (internal state). The spy pattern is resilient to future URQL API changes.
