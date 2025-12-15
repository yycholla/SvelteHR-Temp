# Tiered Audit of Impactful Changes

Based on the latest `npm run analyze` output and codebase inspection, here is a prioritized list of refactoring and improvement tasks.

## 🔴 Tier 1: Critical Logic & Reactivity (High Risk / High Value)
**Focus:** Stability, Bug Prevention, Svelte 5 Correctness.

1.  **Fix Svelte 5 Reactivity Primitives**
    *   **Issue:** The analyzer flagged usage of mutable standard classes (`Set`, `Map`, `Date`) where Svelte equivalents (`SvelteSet`, `SvelteMap`, `SvelteDate`) or `$state` proxies are required for proper fine-grained reactivity.
    *   **Target Files:**
        *   `src/lib/components/activities/BulkRollbackDialog.svelte`
        *   `src/lib/components/departments/DepartmentHierarchy.svelte`
        *   `src/lib/components/draggable-org-map.svelte`
        *   `src/lib/components/events/EventCreateDialog.svelte` (Date usage)
        *   `src/routes/dashboard/events/+page.svelte` (Date usage)
    *   **Why:** Using standard classes in runes mode often leads to "stale" UI bugs where updates don't trigger re-renders.

2.  **Refactor `tasks/subtask-progress.ts` & `organizational-change-handlers.ts`**
    *   **Issue:** These backend files are massive (600-700+ lines) and flagged for high complexity. They handle core data integrity (task progress calculation, manager changes).
    *   **Action:** Extract logic into smaller, testable domain services (e.g., `TaskProgressCalculator`, `OrgChangeService`).
    *   **Why:** High complexity in these files increases the risk of data corruption bugs during organizational shifts.

3.  **Address `goals-okrs-operations.ts` Size**
    *   **Issue:** `src/lib/graphql/goals-okrs-operations.ts` is ~931 lines.
    *   **Action:** Split into `goals-read.operations.ts` and `goals-write.operations.ts` or grouped by feature.
    *   **Why:** A file this large is hard to navigate and maintain.

## 🟠 Tier 2: Component Decomposition (Maintainability)
**Focus:** Developer Experience, Readability, Performance.

1.  **Decompose Monolithic Page Components**
    *   **Issue:** Several Svelte pages exceed 1,000 lines, making them extremely difficult to read and modify.
    *   **Target Files:**
        *   `src/routes/settings/+page.svelte` (1104 lines)
        *   `src/routes/dashboard/management/goals/+page.svelte` (1071 lines)
        *   `src/routes/dashboard/events/+page.server.ts` (996 lines - even after initial refactor, logic needs to move to services)
        *   `src/routes/dashboard/management/leave-approvals/+page.svelte` (943 lines)
    *   **Action:** Extract sections (e.g., tabs, forms, lists) into sub-components.

2.  **Standardize Navigation (`resolve`)**
    *   **Issue:** 100+ warnings for `svelte/no-navigation-without-resolve` and `svelte/no-navigation-without-resolve`.
    *   **Action:** Ensure all `goto()` and `href` links use the `$app/paths` `resolve()` function or are checked for base path compliance.
    *   **Why:** This ensures the app works correctly if deployed to a subdirectory or different base path.

## 🟡 Tier 3: Type Safety & Cleanup (Technical Debt)
**Focus:** Long-term Health, Intellisense.

1.  **Reduce `no-explicit-any` Usage**
    *   **Issue:** Widespread usage of `any` in `src/lib/graphql/` and `src/lib/components/`.
    *   **Action:** Incrementally replace `any` with generated GraphQL types (`TData`, `TVariables`) or specific interfaces.
    *   **Why:** `any` defeats the purpose of TypeScript and hides potential runtime errors.

2.  **Svelte "Each Block Key" Warnings**
    *   **Issue:** Many `#each` blocks are missing keys (`svelte/require-each-key`).
    *   **Action:** Add unique keys (e.g., `(item.id)`) to all loops.
    *   **Why:** Prevents UI state bugs during list reordering/filtering and improves rendering performance.

3.  **Remove Unused Variables**
    *   **Issue:** Hundreds of `no-unused-vars` warnings.
    *   **Action:** Run a cleanup pass to remove dead code.

## 📊 Summary of "Hotspots"

| File | Lines | Complexity Issues | Primary Issue |
| :--- | :--- | :--- | :--- |
| `hooks.server.ts` | **Refactored** | Resolved | (Was Complexity) |
| `settings/+page.svelte` | **1104** | - | Monolithic UI |
| `dashboard/management/goals/+page.svelte` | **1071** | - | Monolithic UI |
| `dashboard/events/+page.server.ts` | **996** | Yes | Backend Logic Bloat |
| `goals-okrs-operations.ts` | **931** | Yes | Backend Logic Bloat |
| `tasks/organizational-change-handlers.ts` | **739** | **High** | Business Logic Risk |
| `tasks/subtask-progress.ts` | **684** | **High** | Business Logic Risk |

## Recommendation for Next Step
**Option A (Logic Stability):** Refactor `src/lib/server/tasks/subtask-progress.ts` to reduce complexity and ensure accurate task tracking.
**Option B (UI Maintainability):** Decompose `src/routes/settings/+page.svelte` or `src/routes/dashboard/management/goals/+page.svelte` into smaller components.
