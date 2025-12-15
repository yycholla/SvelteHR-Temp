# Refactoring Plan: `src/hooks.server.ts`

**Goal:** Decompose the monolithic `src/hooks.server.ts` file into smaller, focused modules to reduce complexity, improve maintainability, and enhance testability.

## Current State
- **File Size:** ~639 lines (exceeds 500 line limit).
- **Complexity:** `authenticateUser` (21) and main `handle` arrow function (35) exceed complexity limits.
- **Responsibilities:**
    - Constants (Public routes, static extensions).
    - Session Caching.
    - Rate Limiting.
    - Authentication Logic (`authenticateUser`).
    - Request Handling (`handle` hook): Logging, Security checks, Static file handling, Auth enforcement, Sentry context, Headers.
    - Error Handling (`handleError` hook).
    - Initialization (Reminder Scheduler).

## Proposed Structure (`src/lib/server/hooks/`)

Create a new directory `src/lib/server/hooks/` to house the extracted logic.

1.  **`src/lib/server/hooks/constants.ts`**
    - `PUBLIC_ROUTES` (Set)
    - `STATIC_EXTENSIONS` (Set)
    - Cache TTL constants.

2.  **`src/lib/server/hooks/session-cache.ts`**
    - `CachedSession` interface.
    - `SESSION_CACHE` (Map).
    - `getCacheKey`.
    - Cache cleanup logic (setInterval).

3.  **`src/lib/server/hooks/rate-limiter.ts`**
    - `RateLimitEntry` interface.
    - `RATE_LIMIT_MAP` (Map).
    - `isRateLimited`.
    - `recordFailedLogin`.
    - `clearRateLimit`.
    - Cleanup logic.

4.  **`src/lib/server/hooks/authentication.ts`**
    - `extractSessionId`.
    - `authenticateUser` (Refactored to be cleaner).
    - Uses `session-cache.ts`.

5.  **`src/lib/server/hooks/security.ts`**
    - `detectSuspiciousParams` (Logic extracted from `handle`).
    - `applySecurityHeaders` (Logic extracted from `handle`).

## Execution Steps

1.  **Create Modules:** Create the files listed above and move the respective code.
2.  **Update `src/hooks.server.ts`:**
    - Import functions/constants from the new modules.
    - Refactor `authenticateUser` to be slimmer (delegating to `authentication.ts`).
    - Refactor `handle` to use helper functions (`detectSuspiciousParams`, `applySecurityHeaders`).
3.  **Verify:** Run `npm run check` and `npm run test:unit`.

## Refactoring Details

### `authenticateUser`
- Move the core fetch/validation logic to `src/lib/server/hooks/authentication.ts`.
- `src/hooks.server.ts` will call this function.

### `handle` Hook
- **Security Check:** Extract the suspicious parameter check loop into `security.ts`.
- **Headers:** Extract the long list of header settings into `security.ts`.

## Benefits
- **Reduced Complexity:** The main `handle` function will be a sequence of high-level function calls.
- **Testability:** Rate limiting and Auth logic can be tested in isolation.
- **Readability:** `src/hooks.server.ts` will clearly show the *flow* of the request without implementation details.
