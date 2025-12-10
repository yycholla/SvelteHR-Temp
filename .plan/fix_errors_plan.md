# Plan for Fixing Remaining Errors

We still have 6 errors in `svelte-check`, mostly related to `userId` prop still being passed to components where it was removed (`TaskList`), and a couple of other component prop issues.

## Phase 1: Fix Remaining Build Errors
1.  **`src/routes/dashboard/employees/+page.svelte`**: `Cannot find name 'employeeStats'`.
    *   *Fix*: Correct the variable name. Likely `departmentStats` or similar.
2.  **`src/routes/dashboard/employees/[id]/+page.svelte`**: `isUnassigningDocument` does not exist in `Props` of `EmployeeDocumentsCard`.
    *   *Fix*: Update `EmployeeDocumentsCard` props or usage.
3.  **`src/routes/dashboard/tasks/+page.svelte`**: Remove `userId` prop passed to `TaskList`.
4.  **`src/routes/dashboard/tasks/department/+page.svelte`**: Remove `userId` prop passed to `TaskList`.
5.  **`src/routes/dashboard/tasks/my-tasks/+page.svelte`**: Remove `userId` prop passed to `TaskList`.
6.  **`src/routes/dashboard/tasks/team-tasks/+page.svelte`**: Remove `userId` prop passed to `TaskList`.

## Phase 2: Aggressive `any` Removal (Continued)
Continue with the plan to remove `any` types from high-value files.
- `src/lib/graphql/dashboard-operations.ts`
- `src/lib/graphql/employee-operations.ts`