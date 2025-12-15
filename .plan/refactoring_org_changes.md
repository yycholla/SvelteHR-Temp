# Refactoring Plan: `src/lib/server/tasks/organizational-change-handlers.ts`

**Goal:** Decompose the large `organizational-change-handlers.ts` file (739 lines) into smaller, testable modules.

## Current State
- **File:** `src/lib/server/tasks/organizational-change-handlers.ts`
- **Issues:**
    - High complexity in `handleManagerChange`, `handleEmployeeDepartmentChange`, etc.
    - Mixing of GraphQL data fetching, business logic, and logging.
    - Large file size makes it hard to maintain.

## Proposed Structure (`src/lib/server/tasks/org-changes/`)

Create a new directory `src/lib/server/tasks/org-changes/` to organize the code.

1.  **`types.ts`**
    - `OrganizationalChangeType`
    - `OrganizationalChangeEvent`
    - `TaskReassignmentResult`

2.  **`data-access.ts`**
    - `getTasksAssignedToUser`
    - `getDepartmentManager`
    - `getDepartmentEmployees`
    - `reassignTask` (GraphQL mutation)
    - `flagTaskForManualReassignment` (GraphQL mutation)
    - `getTasksRequiringManualReassignment`

3.  **`handlers.ts`**
    - `handleManagerChange`
    - `handleEmployeeDepartmentChange`
    - `handleEmployeeTermination`
    - `handleDepartmentDissolution`
    - *These will use functions from `data-access.ts`*

4.  **`processor.ts`**
    - `processOrganizationalChange` (Switch statement logic)

5.  **`index.ts`** (Replaces original file content)
    - Re-exports everything to maintain backward compatibility.

## Execution Steps

1.  **Create Directory:** `mkdir -p src/lib/server/tasks/org-changes`
2.  **Extract Types:** Move interfaces to `types.ts`.
3.  **Extract Data Access:** Move all `fetch` related functions to `data-access.ts`. Ensure strict typing.
4.  **Extract Handlers:** Move the specific handling logic to `handlers.ts`. This separates the "what to do" from the "how to fetch/save".
5.  **Extract Processor:** Move the main switch statement to `processor.ts`.
6.  **Update Original File:** `src/lib/server/tasks/organizational-change-handlers.ts` will simply export `*` from the new modules.

## Key Improvements
- **Separation of Concerns:** Business logic (handlers) is separate from Data Access.
- **Testability:** Handlers can be tested by mocking the data access layer.
- **Maintainability:** Smaller files are easier to read and understand.

## Verification
- Run `npm run check` to ensure no broken imports or type errors.
