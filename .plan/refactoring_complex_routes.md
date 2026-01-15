# Refactoring Plan: Complex Server-Side Routes

**Goal:** Migrate remaining high-complexity server-side route loaders (`+page.server.ts`) to the new adaptable design patterns (`RBACDataLoader`, `QueryParamExtractor`, `UnifiedGraphQLClient`, `ClientSideFilter`) to reduce complexity, improve type safety, and standardize code structure.

## Core Utilities

- **`RBACDataLoader`**: Handles authentication, permission checks, and provides `loadWithClient`.
- **`UnifiedGraphQLClient`**: Standardized GraphQL client with error handling (via `loader.loadWithClient`).
- **`QueryParamExtractor`**: Type-safe parsing of URL search parameters.
- **`ClientSideFilter`**: Fluent API for filtering and sorting arrays (when backend filtering is insufficient).
- **`StatisticsCalculator`**: Standardized metrics calculation.

## Target Files (Prioritized)

These files were identified via `npm run analyze` as having high complexity (>10) or excessive length (>500 lines).

### 1. `src/routes/dashboard/events/+page.server.ts`

- **Current State:** ~964 lines. Manual auth checks. Extensive manual filtering/mapping.
- **Complexity:** High (multiple async operations, nested logic).
- **Refactoring Steps:**
  - [ ] Implement `RBACDataLoader` with `['events:read']`.
  - [ ] Use `QueryParamExtractor` for `view`, `date`, `filter` params.
  - [ ] Use `loader.loadWithClient`.
  - [ ] Simplify `load` function by moving complex logic to `ClientSideFilter` or dedicated helper functions if needed.
  - [ ] Ensure `locals.user` type safety.

### 2. `src/routes/dashboard/employees/[id]/edit/+page.server.ts`

- **Current State:** ~694 lines. Complexity score 82 (Very High).
- **Refactoring Steps:**
  - [ ] Implement `RBACDataLoader` with `['employees:write']`.
  - [ ] Refactor the massive `default` form action (complexity 82) to use helper functions or services.
  - [ ] Use `UnifiedGraphQLClient` for data fetching in `load`.

### 3. `src/routes/dashboard/management/goals/+page.server.ts`

- **Current State:** Complexity 48.
- **Refactoring Steps:**
  - [ ] Implement `RBACDataLoader` with `['goals:read', 'goals:read:all']`.
  - [ ] Use `QueryParamExtractor` for pagination and filters.
  - [ ] Use `ClientSideFilter` for sorting and filtering goals.

### 4. `src/routes/dashboard/management/reviews/+page.server.ts`

- **Current State:** Complexity 42.
- **Refactoring Steps:**
  - [ ] Implement `RBACDataLoader` with `['performance:read']`.
  - [ ] Use `UnifiedGraphQLClient`.
  - [ ] Simplify data mapping logic.

### 5. `src/routes/dashboard/tasks/[id]/edit/+page.server.ts`

- **Current State:** Complexity 38.
- **Refactoring Steps:**
  - [ ] Implement `RBACDataLoader` with `['tasks:write']`.
  - [ ] Standardize form handling.

## Execution Strategy

1.  **Analyze**: Read the specific file to understand current logic and dependencies.
2.  **Refactor**: Apply the new patterns.
3.  **Verify**: Run `npm run check` to ensure type safety.
4.  **Test**: Run `npm run test:unit` (optional, but recommended if relevant tests exist).

## Notes

- Always assert `locals.user` existence when using `RBACDataLoader` to satisfy TypeScript, even though the loader guarantees it.
- Watch out for "Catch failed" generic errors and replace them with specific logs.
