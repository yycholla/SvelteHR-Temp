# Refactoring Plan: `src/lib/server/tasks/subtask-progress.ts`

**Goal:** Decompose the monolithic `subtask-progress.ts` file (684 lines) into smaller, testable, and strictly typed modules.

## Current State

- **File:** `src/lib/server/tasks/subtask-progress.ts`
- **Issues:**
  - High complexity in data fetching and recursive calculation functions.
  - Mixing of Type definitions, GraphQL fetching, business logic calculations, and formatting.
  - Large file size makes it hard to maintain.

## Proposed Structure (`src/lib/server/tasks/progress/`)

Create a new directory `src/lib/server/tasks/progress/` to organize the code.

1.  **`types.ts`**
    - `TaskProgress`
    - `HierarchicalProgressSummary`
    - `ProgressStatistics`
    - `TaskWithSubtasks` and internal response interfaces.

2.  **`calculators.ts`**
    - `calculateSubtaskProgress`
    - `countAllDescendants`
    - `countCompletedDescendants`
    - `calculateCompletionRate` (Helper)
    - `calculateStatusCounts` (Helper)

3.  **`fetchers.ts`**
    - `getTaskProgress` (Logic to fetch and map using calculators)
    - `getHierarchicalProgress`
    - `getUserTaskStatistics`
    - `getDepartmentTaskStatistics`
    - `getTopLevelTasksProgress`

4.  **`formatters.ts`**
    - `formatProgressPercentage`
    - `getProgressColor`
    - `isTaskOnTrack`

5.  **`index.ts`** (Replaces original file content)
    - Re-exports everything from the above modules to maintain backward compatibility.

## Execution Steps

1.  **Create Directory:** `mkdir -p src/lib/server/tasks/progress`
2.  **Extract Types:** Move interfaces to `types.ts`.
3.  **Extract Formatters:** Move formatting logic to `formatters.ts`.
4.  **Extract Calculators:** Move pure calculation logic to `calculators.ts`.
5.  **Refactor Fetchers:** Move async GraphQL operations to `fetchers.ts`.
    - **Optimization:** Break down huge `fetch` functions. Separate the _fetching_ of data from the _processing_ of data.
    - **Type Safety:** Ensure all GraphQL responses are strictly typed using generic `ApiResponse<T>`.
6.  **Update Original File:** `src/lib/server/tasks/subtask-progress.ts` will simply export `*` from the new modules.

## Key Improvements

- **Separation of Concerns:** Data fetching is separate from calculation logic.
- **Testability:** `calculators.ts` and `formatters.ts` will be pure functions, easily unit-testable.
- **Reduced Complexity:** Breaking down the "God functions" into smaller steps.
- **Strict Types:** enforce strict typing on all extracted parts.

## Verification

- Run `npm run check` to ensure no broken imports or type errors.
