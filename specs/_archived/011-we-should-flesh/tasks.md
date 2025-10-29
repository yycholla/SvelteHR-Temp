# Tasks: Complete Sidebar Page Implementation

**Input**: Design documents from `/specs/011-we-should-flesh/`
**Prerequisites**: plan.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

## Summary

Implement 6 missing sidebar pages for SvelteHR management system: Management overview, Leave Approvals, Reviews, Goals & OKRs, Team Reports, and Teams admin. Following TDD approach with E2E tests first, then GraphQL operations, shared components, and SvelteKit page implementations.

**Tech Stack**: SvelteKit 2.22 + TypeScript 5.0 + PostGraphile 4.14 + PostgreSQL + shadcn/ui

## Phase 3.1: Database Foundation ✅ COMPLETED

- [x] **T001** ✅ Create database migration for leave requests table in `migrations/20250924_001_leave_requests.sql`
- [x] **T002** ✅ Create database migration for performance reviews table in `migrations/20250924_002_performance_reviews.sql`
- [x] **T003** ✅ Create database migration for team goals table in `migrations/20250924_003_team_goals.sql`
- [x] **T004** ✅ Create database migration for team reports table in `migrations/20250924_004_team_reports.sql`

## Phase 3.2: E2E Tests First (TDD) ✅ COMPLETED

**✅ TDD RED PHASE: Tests written first and failed as expected before implementation**

- [x] **T005** [P] ✅ E2E test Management Leave Approvals page in `tests/e2e/management/leave-approvals.spec.ts`
- [x] **T006** [P] ✅ E2E test Management Reviews page in `tests/e2e/management/reviews.spec.ts`
- [x] **T007** [P] ✅ E2E test Management Goals page in `tests/e2e/management/goals.spec.ts`
- [x] **T008** [P] ✅ E2E test Management Reports page in `tests/e2e/management/reports.spec.ts`
- [x] **T009** [P] ✅ E2E test Management Overview page in `tests/e2e/management/overview.spec.ts`
- [x] **T010** [P] ✅ E2E test Teams Admin page in `tests/e2e/admin/teams.spec.ts`

## Phase 3.3: GraphQL Operations ✅ COMPLETED

**✅ TDD GREEN PHASE: GraphQL operations implemented to make tests pass**

- [x] **T011** [P] ✅ Leave requests GraphQL operations in `src/lib/graphql/leave-management-operations.ts`
- [x] **T012** [P] ✅ Team management GraphQL operations in `src/lib/graphql/team-management-operations.ts`
- [x] **T013** [P] ✅ Performance review GraphQL operations in `src/lib/graphql/performance-management-operations.ts`
- [x] **T014** [P] ✅ Goals and OKRs GraphQL operations in `src/lib/graphql/goals-okrs-operations.ts`
- [x] **T015** [P] ✅ Team reports GraphQL operations in `src/lib/graphql/team-reports-operations.ts`

## Phase 3.4: Shared UI Components & Type Generation

- [x] **T016** [P] ✅ Data table component with filtering and pagination in `src/lib/components/data-table/hr-data-table.svelte`
- [x] **T017** [P] ✅ Export functionality component in `src/lib/components/export/data-export.svelte`
- [x] **T018** [P] ✅ Analytics charts component in `src/lib/components/charts/hr-analytics-charts.svelte`
- [x] **T019** [P] ✅ CRUD modal dialogs component in `src/lib/components/modals/hr-crud-modal.svelte`
- [ ] **T032** Run GraphQL codegen to generate types from updated schema: `npm run codegen`

## Phase 3.5: Page Implementations

**Management Section Pages**

- [ ] **T020** [P] Management overview page in `src/routes/dashboard/management/+page.svelte`
- [ ] **T021** [P] Leave approvals page in `src/routes/dashboard/management/leave-approvals/+page.svelte`
- [ ] **T022** [P] Performance reviews page in `src/routes/dashboard/management/reviews/+page.svelte`
- [ ] **T023** [P] Goals & OKRs page in `src/routes/dashboard/management/goals/+page.svelte`
- [ ] **T024** [P] Team reports page in `src/routes/dashboard/management/reports/+page.svelte`

**Administration Section Pages**

- [ ] **T025** [P] Teams admin page in `src/routes/dashboard/teams/+page.svelte`

## Phase 3.6: Page Server Logic

- [ ] **T026** [P] Management overview server logic in `src/routes/dashboard/management/+page.server.ts`
- [ ] **T027** [P] Leave approvals server logic in `src/routes/dashboard/management/leave-approvals/+page.server.ts`
- [ ] **T028** [P] Performance reviews server logic in `src/routes/dashboard/management/reviews/+page.server.ts`
- [ ] **T029** [P] Goals & OKRs server logic in `src/routes/dashboard/management/goals/+page.server.ts`
- [ ] **T030** [P] Team reports server logic in `src/routes/dashboard/management/reports/+page.server.ts`
- [ ] **T031** [P] Teams admin server logic in `src/routes/dashboard/teams/+page.server.ts`

## Phase 3.7: Integration & Polish

- [ ] **T033** Update sidebar navigation with correct route links in `src/lib/components/hr-app-sidebar.svelte`
- [ ] **T034** Add role-based access control policies to new routes in backend configuration
- [ ] **T035** Run complete E2E test suite to verify all functionality: `npm run test:e2e`
- [ ] **T036** Performance testing for large dataset operations (1000+ records)
- [ ] **T037** [P] Unit tests for GraphQL operations in `tests/unit/graphql-operations.test.ts`
- [ ] **T038** [P] Unit tests for shared components in `tests/unit/components.test.ts`

## Dependencies

**Sequential Dependencies:**

- Database migrations (T001-T004) → GraphQL codegen (T032)
- E2E tests (T005-T010) → GraphQL operations (T011-T015)
- GraphQL operations → Shared components (T016-T019)
- Shared components → Page implementations (T020-T025)
- Page implementations → Server logic (T026-T031)
- Server logic → Integration tests (T035)

**Blocking Dependencies:**

- T032 blocks T020-T025 (pages need generated types)
- T033 blocks T035 (navigation must work for E2E tests)
- T011-T015 block T020-T025 (pages need GraphQL operations)

## Parallel Execution Examples

**Phase 3.2 - E2E Tests (Run Together):**

```bash
# All E2E tests can run in parallel (different spec files)
npx playwright test tests/e2e/management/leave-approvals.spec.ts &
npx playwright test tests/e2e/management/reviews.spec.ts &
npx playwright test tests/e2e/management/goals.spec.ts &
npx playwright test tests/e2e/management/reports.spec.ts &
npx playwright test tests/e2e/management/overview.spec.ts &
npx playwright test tests/e2e/admin/teams.spec.ts &
wait
```

**Phase 3.3 - GraphQL Operations (Run Together):**

```bash
# All GraphQL operations can be developed in parallel (different files)
Task: "Leave requests GraphQL operations in src/lib/graphql/leave-management-operations.ts"
Task: "Team management GraphQL operations in src/lib/graphql/team-management-operations.ts"
Task: "Performance review GraphQL operations in src/lib/graphql/performance-management-operations.ts"
Task: "Goals and OKRs GraphQL operations in src/lib/graphql/goals-okrs-operations.ts"
Task: "Team reports GraphQL operations in src/lib/graphql/team-reports-operations.ts"
```

**Phase 3.4 - Shared Components (Run Together):**

```bash
# All shared components can be built in parallel (different files)
Task: "Data table component with filtering in src/lib/components/data-table/hr-data-table.svelte"
Task: "Export functionality component in src/lib/components/export/data-export.svelte"
Task: "Analytics charts component in src/lib/components/charts/hr-analytics-charts.svelte"
Task: "CRUD modal dialogs component in src/lib/components/modals/hr-crud-modal.svelte"
```

**Phase 3.5 - Page Implementations (Run Together):**

```bash
# All pages can be implemented in parallel (different route files)
Task: "Management overview page in src/routes/dashboard/management/+page.svelte"
Task: "Leave approvals page in src/routes/dashboard/management/leave-approvals/+page.svelte"
Task: "Performance reviews page in src/routes/dashboard/management/reviews/+page.svelte"
Task: "Goals & OKRs page in src/routes/dashboard/management/goals/+page.svelte"
Task: "Team reports page in src/routes/dashboard/management/reports/+page.svelte"
Task: "Teams admin page in src/routes/dashboard/teams/+page.svelte"
```

## Implementation Reference

**Reference Pattern**: Follow the established pattern from `src/routes/dashboard/admin/users/+page.svelte`:

- Svelte 5 `$state()` runes for reactive data
- shadcn/ui components (Table, Card, Dialog, Button, etc.)
- GraphQL operations via Urql with loading/error states
- CRUD operations with confirmation dialogs
- Search, filtering, sorting, pagination
- Export to CSV functionality
- Role-based access control

**Key Features per Page:**

- Management Overview: Dashboard with statistics cards and recent activity
- Leave Approvals: Approve/deny requests with manager comments
- Reviews: Create/edit performance reviews with rating scales
- Goals & OKRs: Track team objectives with progress indicators
- Team Reports: Generate and export analytics reports
- Teams Admin: Full CRUD for department/team management

**Data Security:** All pages must implement proper Row-Level Security policies and role-based access control (Admin, HR, Manager, Employee roles).

## Success Criteria

- ✅ All 6 missing sidebar pages functional
- ✅ E2E tests pass (100% success rate)
- ✅ Full CRUD operations working
- ✅ Role-based access properly enforced
- ✅ Export functionality operational
- ✅ Performance <200ms for GraphQL operations
- ✅ Mobile-responsive design
- ✅ Consistent with existing admin/users pattern

## Notes

- [P] tasks = different files, can run in parallel
- Verify E2E tests fail before implementing pages
- Follow TDD: RED (failing tests) → GREEN (implementation) → REFACTOR
- Commit after each completed task
- All tasks must be completed for feature to be considered done
