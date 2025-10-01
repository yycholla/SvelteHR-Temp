# Tasks: Replace Placeholder Data with Database Integration

**Input**: Design documents from `/specs/017-remove-all-placeholder/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)

```
1. Load plan.md from feature directory
   → If not found: ERROR "No implementation plan found"
   → Extract: tech stack, libraries, structure
2. Load optional design documents:
   → data-model.md: Extract entities → model tasks
   → contracts/: Each file → contract test task
   → research.md: Extract decisions → setup tasks
3. Generate tasks by category:
   → Setup: project init, dependencies, linting
   → Tests: contract tests, integration tests
   → Core: models, services, CLI commands
   → Integration: DB, middleware, logging
   → Polish: unit tests, performance, docs
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   → All contracts have tests?
   → All entities have models?
   → All endpoints implemented?
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions

- **Web app structure**:
  - Backend: PostGraphile GraphQL API on port 4000
  - Frontend: `src/routes/` for SvelteKit pages
  - Tests: `tests/` for E2E and unit tests

## Phase 3.1: Setup & Infrastructure

- [x] T001 Create health check endpoint at src/routes/api/health/+server.ts
- [x] T002 Implement backend initialization handler in src/lib/server/backend-init.ts
- [x] T003 Create unified GraphQL client at src/lib/server/graphql-client.ts
- [x] T004 [P] Add retry utility functions in src/lib/utils/retry.ts
- [x] T005 [P] Create seed data configuration at backend/seed/config.ts

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests
- [x] T006 [P] Contract test for health check API in tests/contract/health-check.spec.ts
- [x] T007 [P] Contract test for seed data mutations in tests/contract/seed-data.spec.ts
- [x] T008 [P] Contract test for data loading queries in tests/contract/data-loading.spec.ts

### Integration Tests
- [x] T009 [P] E2E test backend initialization flow in tests/e2e/backend-init.spec.ts
- [x] T010 [P] E2E test dashboard data display in tests/e2e/dashboard-data.spec.ts
- [ ] T011 [P] E2E test empty state handling in tests/e2e/empty-states.spec.ts
- [x] T012 [P] E2E test error retry functionality in tests/e2e/error-retry.spec.ts
- [ ] T013 [P] E2E test analytics page data in tests/e2e/analytics-data.spec.ts
- [ ] T014 [P] E2E test management dashboard data in tests/e2e/management-data.spec.ts

## Phase 3.3: Core Data Models & Seeding (ONLY after tests are failing)

### Data Model Implementation
- [x] T015 [P] Create SeedUser model in backend/seed/models/user.ts
- [x] T016 [P] Create SeedDepartment model in backend/seed/models/department.ts
- [ ] T017 [P] Create SeedLeaveRequest model in backend/seed/models/leave-request.ts
- [ ] T018 [P] Create SeedPerformanceReview model in backend/seed/models/performance-review.ts
- [ ] T019 [P] Create SeedGoal model in backend/seed/models/goal.ts
- [ ] T020 [P] Create AnalyticsSnapshot model in backend/seed/models/analytics.ts

### Seed Data Generation
- [ ] T021 Implement seed data generator in backend/seed/generator.ts
- [ ] T022 Create database migrations for seed tables in backend/migrations/
- [ ] T023 Implement seed data CLI command in backend/seed/cli.ts
- [ ] T024 Add seed status check query in backend/graphql/seed-status.ts

## Phase 3.4: Frontend Data Integration

### Replace Placeholder Data
- [x] T025 Replace mock data in src/routes/dashboard/admin/analytics/+page.server.ts
- [ ] T026 Replace fallback data in src/routes/dashboard/management/+page.server.ts
- [ ] T027 Update dashboard overview in src/routes/dashboard/+page.server.ts
- [ ] T028 Enhance employee list data loading in src/routes/dashboard/employees/+page.server.ts
- [ ] T029 Update department analytics in src/routes/dashboard/departments/+page.server.ts
- [ ] T030 Update goals data loading in src/routes/dashboard/management/goals/+page.server.ts

### Error Handling Enhancement
- [x] T031 Add retry button component in src/lib/components/ui/RetryButton.svelte
- [x] T032 Implement empty state component in src/lib/components/ui/EmptyState.svelte
- [ ] T033 Update error handling in src/lib/utils/error-handling.ts
- [ ] T034 Add loading states to all data tables in src/lib/components/ui/DataTable.svelte

## Phase 3.5: Backend Initialization & Health

- [ ] T035 Implement health check monitoring in src/hooks.server.ts
- [ ] T036 Add initialization wait logic in src/lib/server/wait-for-backend.ts
- [ ] T037 Create health status store in src/lib/stores/health.ts
- [ ] T038 Add backend status indicator component in src/lib/components/ui/BackendStatus.svelte

## Phase 3.6: Polish & Performance

- [ ] T039 [P] Add performance monitoring for GraphQL queries in src/lib/server/performance.ts
- [ ] T040 [P] Optimize database indexes for seed data queries
- [ ] T041 [P] Add caching layer for frequently accessed data in src/lib/server/cache.ts
- [ ] T042 [P] Update API documentation in docs/api.md
- [ ] T043 Run quickstart validation checklist from quickstart.md
- [ ] T044 Performance test all GraphQL queries (<200ms requirement)
- [ ] T045 Verify all pages load within 1 second

## Dependencies

### Critical Path
1. **Infrastructure First**: T001-T005 (health check, initialization, GraphQL client)
2. **Tests Before Implementation**: T006-T014 must fail before proceeding
3. **Data Models**: T015-T020 can run in parallel (different files)
4. **Seed System**: T021-T024 depend on models
5. **Frontend Updates**: T025-T030 depend on seed data availability
6. **Error Handling**: T031-T034 can run in parallel
7. **Backend Init**: T035-T038 depend on health check (T001)
8. **Polish**: T039-T045 after all implementation complete

### Specific Dependencies
- T001 (health check) blocks T035-T038 (backend monitoring)
- T003 (GraphQL client) blocks T025-T030 (frontend updates)
- T015-T020 (models) block T021 (generator)
- T021 (generator) blocks T022-T024 (migrations, CLI)
- T031-T032 (UI components) block T033-T034 (integration)

## Parallel Execution Examples

### Batch 1: Contract & E2E Tests (T006-T014)
```typescript
// Launch all test creation in parallel:
Task: "Contract test for health check API"
Task: "Contract test for seed data mutations"
Task: "Contract test for data loading queries"
Task: "E2E test backend initialization flow"
Task: "E2E test dashboard data display"
Task: "E2E test empty state handling"
Task: "E2E test error retry functionality"
Task: "E2E test analytics page data"
Task: "E2E test management dashboard data"
```

### Batch 2: Data Models (T015-T020)
```typescript
// Create all models in parallel (different files):
Task: "Create SeedUser model"
Task: "Create SeedDepartment model"
Task: "Create SeedLeaveRequest model"
Task: "Create SeedPerformanceReview model"
Task: "Create SeedGoal model"
Task: "Create AnalyticsSnapshot model"
```

### Batch 3: UI Components (T031-T032)
```typescript
// Create UI components in parallel:
Task: "Add retry button component"
Task: "Implement empty state component"
```

### Batch 4: Performance & Documentation (T039-T042)
```typescript
// Polish tasks in parallel:
Task: "Add performance monitoring for GraphQL"
Task: "Optimize database indexes"
Task: "Add caching layer"
Task: "Update API documentation"
```

## Notes

### Implementation Guidelines
- Run E2E tests after each frontend update to verify no regressions
- Commit after completing each task or parallel batch
- Use TypeScript strict mode for all new code
- Follow existing patterns in src/routes for server-side data loading
- Maintain >90% test coverage as per constitution

### Testing Requirements
- All tests must fail initially (red phase)
- Contract tests validate API shapes
- E2E tests validate user experience
- Performance tests ensure <200ms GraphQL queries

### Data Requirements
- Seed data: 10-50 records per entity type
- Empty state: Display "No data available" for <5 records
- Error state: Show retry button with user-friendly message
- Loading state: Show appropriate indicators during fetch

## Validation Checklist

_GATE: Checked before marking feature complete_

- [x] All contracts have corresponding tests (T006-T008)
- [x] All entities have model tasks (T015-T020)
- [x] All tests come before implementation (T006-T014 before T015+)
- [x] Parallel tasks truly independent (verified file paths)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] Health check implementation included (T001, T035-T038)
- [x] Seed data system complete (T015-T024)
- [x] All placeholder data locations addressed (T025-T030)
- [x] Error handling with retry implemented (T031-T034)
- [x] Performance requirements validated (T044-T045)

## Estimated Completion

- **Setup & Infrastructure**: 2-3 hours
- **Test Creation**: 3-4 hours
- **Data Models & Seeding**: 4-5 hours
- **Frontend Updates**: 3-4 hours
- **Backend Init & Health**: 2-3 hours
- **Polish & Performance**: 2-3 hours

**Total Estimate**: 16-22 hours (2-3 days with parallel execution)

---

*Generated from implementation plan on 2025-01-23*