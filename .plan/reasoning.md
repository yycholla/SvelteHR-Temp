# Reasoning for Phase 4 - Batch 3 (Tasks Operations Refactor)

## Focus

Refactoring `src/lib/graphql/tasks-operations.ts` (1000+ lines).

## Analysis

The file contains:

1.  **Fragments**: `TASK_FIELDS_FRAGMENT`.
2.  **Queries**: `GET_ALL_TASKS`, `GET_TASK_BY_ID`, `GET_TASKS_BY_STATUS`, etc.
3.  **Mutations**: `CREATE_TASK`, `UPDATE_TASK`, `DELETE_TASK`, etc.
4.  **Helper Functions**: `normalizeTask`, `formatTaskForDisplay`, etc.
5.  **Types**: `Task`, `CreateTaskInput`, etc.

## Strategy

1.  **Extract Fragments & Types**: Move to `src/lib/graphql/tasks/fragments.ts` and `types.ts` (or keep types in `types.ts` if small).
2.  **Extract Queries**: Move to `src/lib/graphql/tasks/queries.ts`.
3.  **Extract Mutations**: Move to `src/lib/graphql/tasks/mutations.ts`.
4.  **Extract Helpers**: Move to `src/lib/graphql/tasks/utils.ts`.
5.  **Re-export**: Create `src/lib/graphql/tasks/index.ts` to re-export everything so imports don't break (or update imports if I want to be cleaner).
6.  **Update `tasks-operations.ts`**: Make it re-export from the new structure to maintain backward compatibility for now, or just replace it.

Actually, splitting into a folder `src/lib/graphql/tasks/` is cleaner.
I will create the directory `src/lib/graphql/tasks/`.

I'll start by creating the directory and the files.
