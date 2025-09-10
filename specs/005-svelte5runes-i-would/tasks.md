# Tasks: Svelte 5 Runes Migration & Performance Optimization

**Input**: Design documents from `/home/chanway/Projects/SvelteHR/specs/005-svelte5runes-i-would/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md

## Execution Flow (main)

```
1. Load plan.md from feature directory ✅
   → Tech stack: Svelte 5.0, TypeScript 5.0, SvelteKit 2.22.0
   → Structure: Web application with frontend focus
2. Load design documents ✅:
   → data-model.md: Runes patterns and stores
   → contracts/: Component contracts and interfaces  
   → research.md: Migration strategies and performance patterns
   → quickstart.md: Validation and testing scenarios
3. Generate tasks by category:
   → Setup: Doppler config, linting, dev environment
   → Tests: Component contracts, integration tests
   → Core: Store migration, component migration, performance utilities
   → Integration: Layout updates, routing, GraphQL integration
   → Polish: Performance validation, documentation, cleanup
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Focus: Better implementation over backwards compatibility
```

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **Better code over backwards compatibility** - prioritize clean runes implementation
- **Doppler for all config** - use environment variables via Doppler

## Phase 3.1: Setup & Environment

- [ ] T001 Configure Doppler environment variables for all configuration (VITE_*, PUBLIC_*)
- [ ] T002 [P] Update ESLint configuration for Svelte 5 runes syntax in `eslint.config.js`
- [ ] T003 [P] Update TypeScript configuration for Svelte 5 runes in `tsconfig.json`
- [ ] T004 [P] Configure Vitest for Svelte 5 component testing in `vitest.config.ts`

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

- [ ] T005 [P] Contract test for AuthButton component in `tests/unit/components/auth/AuthButton.test.ts`
- [ ] T006 [P] Contract test for PreloadLink component in `tests/unit/components/ui/PreloadLink.test.ts`
- [ ] T007 [P] Contract test for RoleGuard component in `tests/unit/components/auth/RoleGuard.test.ts`
- [ ] T008 [P] Contract test for PermissionCheck component in `tests/unit/components/auth/PermissionCheck.test.ts`
- [ ] T009 [P] Contract test for CacheProvider component in `tests/unit/components/performance/CacheProvider.test.ts`
- [ ] T010 [P] Integration test for auth store with GraphQL in `tests/integration/auth-store.test.ts`
- [ ] T011 [P] Integration test for performance store caching in `tests/integration/performance-cache.test.ts`
- [ ] T012 [P] E2E test for hover preloading behavior in `tests/e2e/preloading.test.ts`

## Phase 3.3: Core Store Migration (ONLY after tests are failing)

- [ ] T013 [P] Migrate departments store to runes in `src/lib/stores/departments.svelte.ts`
- [ ] T014 [P] Migrate dashboard store to runes in `src/lib/stores/dashboard.svelte.ts`
- [ ] T015 [P] Migrate modal store to runes in `src/lib/stores/modal.svelte.ts`
- [ ] T016 [P] Migrate HR employees store to runes in `src/lib/stores/hr/employees.svelte.ts`
- [ ] T017 [P] Migrate HR forms store to runes in `src/lib/stores/hr/forms.svelte.ts`
- [ ] T018 [P] Migrate HR tasks store to runes in `src/lib/stores/hr/tasks.svelte.ts`
- [ ] T019 [P] Migrate HR modals store to runes in `src/lib/stores/hr/modals.svelte.ts`
- [ ] T020 Replace geldb-auth store with enhanced auth.svelte.ts integration

## Phase 3.4: Component Migration - Authentication & Authorization

- [ ] T021 [P] Create RoleGuard component with runes in `src/lib/components/auth/RoleGuard.svelte`
- [ ] T022 [P] Create PermissionCheck component with runes in `src/lib/components/auth/PermissionCheck.svelte`
- [ ] T023 [P] Migrate LoginForm component to runes in `src/lib/components/auth/LoginForm.svelte` 
- [ ] T024 [P] Create AuthProvider component for context in `src/lib/components/auth/AuthProvider.svelte`

## Phase 3.5: Component Migration - Navigation & Layout

- [ ] T025 Migrate TopBar component to runes in `src/lib/components/TopBar.svelte`
- [ ] T026 Migrate Sidebar component to runes in `src/lib/components/Sidebar/Sidebar.svelte`
- [ ] T027 Update main layout with performance components in `src/routes/+layout.svelte`
- [ ] T028 Update admin layout with runes components in `src/routes/admin/+layout.svelte`
- [ ] T029 Update HR layout with runes components in `src/routes/hr/+layout.svelte`

## Phase 3.6: Component Migration - Dashboard (High Priority)

- [ ] T030 [P] Migrate Dashboard component to runes in `src/lib/components/dashboard/Dashboard.svelte`
- [ ] T031 [P] Migrate DashboardGrid to runes in `src/lib/components/dashboard/grid/DashboardGrid.svelte`
- [ ] T032 [P] Migrate DashboardCard to runes in `src/lib/components/dashboard/grid/DashboardCard.svelte`
- [ ] T033 [P] Migrate DashboardToolbar to runes in `src/lib/components/dashboard/DashboardToolbar.svelte`
- [ ] T034 [P] Migrate CardLibrary to runes in `src/lib/components/dashboard/CardLibrary.svelte`

## Phase 3.7: Component Migration - Dashboard Cards

- [ ] T035 [P] Migrate PersonalInfoCard to runes in `src/lib/components/dashboard/cards/PersonalInfoCard.svelte`
- [ ] T036 [P] Migrate MyTasksCard to runes in `src/lib/components/dashboard/cards/MyTasksCard.svelte`
- [ ] T037 [P] Migrate EmployeeStatisticsCard to runes in `src/lib/components/dashboard/cards/EmployeeStatisticsCard.svelte`
- [ ] T038 [P] Migrate APIPerformanceCard to runes in `src/lib/components/dashboard/cards/APIPerformanceCard.svelte`
- [ ] T039 [P] Migrate LiveNotificationsCard to runes in `src/lib/components/dashboard/cards/LiveNotificationsCard.svelte`
- [ ] T040 [P] Migrate LiveTasksCard to runes in `src/lib/components/dashboard/cards/LiveTasksCard.svelte`
- [ ] T041 [P] Migrate LiveComplianceCard to runes in `src/lib/components/dashboard/cards/LiveComplianceCard.svelte`

## Phase 3.8: Component Migration - Common Components

- [ ] T042 [P] Migrate StatCard to runes in `src/lib/components/common/StatCard.svelte`
- [ ] T043 [P] Migrate TaskList to runes in `src/lib/components/common/TaskList.svelte`
- [ ] T044 [P] Migrate EmployeeList to runes in `src/lib/components/common/EmployeeList.svelte`
- [ ] T045 [P] Migrate ActivityFeed to runes in `src/lib/components/common/ActivityFeed.svelte`
- [ ] T046 [P] Migrate DepartmentChart to runes in `src/lib/components/common/DepartmentChart.svelte`
- [ ] T047 [P] Migrate Calendar component to runes in `src/lib/components/Calendar/Calendar.svelte`

## Phase 3.9: Performance Enhancement Integration

- [ ] T048 [P] Create CacheProvider component in `src/lib/components/performance/CacheProvider.svelte`
- [ ] T049 [P] Create PerformanceMonitor component in `src/lib/components/performance/PerformanceMonitor.svelte`
- [ ] T050 [P] Create LoadingBoundary component in `src/lib/components/performance/LoadingBoundary.svelte`
- [ ] T051 Integrate PreloadLink throughout navigation components (TopBar, Sidebar, layouts)
- [ ] T052 Add performance monitoring to critical user journeys
- [ ] T053 Implement cache warming strategies for common data

## Phase 3.10: GraphQL & Backend Integration

- [ ] T054 [P] Create GraphQL query hooks with runes in `src/lib/hooks/useGraphQLQuery.svelte.ts`
- [ ] T055 [P] Create RBAC GraphQL client in `src/lib/graphql/rbac-client.svelte.ts`
- [ ] T056 [P] Migrate GraphQL subscriptions to runes in `src/lib/graphql/subscriptions.svelte.ts`
- [ ] T057 Update server-side GraphQL integration with new auth store
- [ ] T058 Add GraphQL query caching with performance store
- [ ] T059 Implement optimistic updates for mutations

## Phase 3.11: Route & Page Migration

- [ ] T060 [P] Update dashboard pages with runes components in `src/routes/(dashboard)/+page.svelte`
- [ ] T061 [P] Update admin pages with runes components in `src/routes/admin/+page.svelte`
- [ ] T062 [P] Update HR pages with runes components in `src/routes/hr/+page.svelte`
- [ ] T063 [P] Update employee pages with runes components in `src/routes/employees/+page.svelte`
- [ ] T064 Add preloading to critical page load functions (+page.server.ts files)
- [ ] T065 Optimize page load performance with cache integration

## Phase 3.12: Development Experience Enhancements

- [ ] T066 [P] Create component development utilities in `src/lib/utils/dev.svelte.ts`
- [ ] T067 [P] Add component prop validation helpers in `src/lib/utils/validation.svelte.ts`
- [ ] T068 [P] Create debugging utilities for runes in `src/lib/utils/debug.svelte.ts`
- [ ] T069 Update Storybook stories for migrated components
- [ ] T070 Add component playground for testing runes patterns
- [ ] T071 Create migration guide for team members

## Phase 3.13: Configuration & Environment

- [ ] T072 [P] Move all hardcoded config to Doppler environment variables
- [ ] T073 [P] Create development environment setup script in `scripts/setup-dev.sh`
- [ ] T074 [P] Add production optimization config in `vite.config.ts`
- [ ] T075 Configure build-time performance analysis
- [ ] T076 Add bundle size monitoring and alerts
- [ ] T077 Set up performance budgets in CI/CD

## Phase 3.14: Testing & Validation

- [ ] T078 [P] Add visual regression tests for migrated components in `tests/visual/`
- [ ] T079 [P] Create performance benchmark tests in `tests/performance/`
- [ ] T080 [P] Add accessibility tests for runes components in `tests/a11y/`
- [ ] T081 Validate preloading performance improvements
- [ ] T082 Test cache hit rates and optimization
- [ ] T083 Verify RBAC functionality with runes components

## Phase 3.15: Polish & Optimization

- [ ] T084 [P] Remove legacy store files and unused imports
- [ ] T085 [P] Optimize bundle size and remove dead code
- [ ] T086 [P] Add comprehensive JSDoc documentation to runes utilities
- [ ] T087 Performance audit and optimization pass
- [ ] T088 Security audit of runes implementation
- [ ] T089 Final validation against quickstart.md scenarios

## Dependencies

### Critical Paths:
- Setup (T001-T004) before all other phases
- Tests (T005-T012) before implementation (T013+)
- Store migration (T013-T020) before component migration (T021+)
- Core components (T021-T029) before dashboard components (T030+)
- Layout updates (T027-T029) depend on navigation components (T025-T026)
- Performance integration (T048-T053) requires cache utility (completed)
- GraphQL integration (T054-T059) requires auth store migration (completed)

### Parallel Execution Groups:
- **Setup Group**: T001, T002, T003, T004
- **Test Group**: T005-T012 (all parallel)
- **Store Group**: T013-T019 (all parallel, T020 sequential)
- **Auth Components**: T021, T022, T023, T024 (all parallel)
- **Dashboard Cards**: T035-T041 (all parallel)
- **Common Components**: T042-T047 (all parallel)
- **Performance Components**: T048, T049, T050 (all parallel)

## Parallel Example

```
# Launch test suite in parallel:
Task: "Contract test for AuthButton component in tests/unit/components/auth/AuthButton.test.ts"
Task: "Contract test for PreloadLink component in tests/unit/components/ui/PreloadLink.test.ts"  
Task: "Contract test for RoleGuard component in tests/unit/components/auth/RoleGuard.test.ts"
Task: "Integration test for auth store with GraphQL in tests/integration/auth-store.test.ts"

# Launch store migration in parallel:
Task: "Migrate departments store to runes in src/lib/stores/departments.svelte.ts"
Task: "Migrate dashboard store to runes in src/lib/stores/dashboard.svelte.ts"
Task: "Migrate modal store to runes in src/lib/stores/modal.svelte.ts"
Task: "Migrate HR employees store to runes in src/lib/stores/hr/employees.svelte.ts"
```

## Special Considerations

### Migration Priority (User Preference: Better Code > Backwards Compatibility):
1. **Full Replacement**: Replace traditional patterns entirely, don't maintain compatibility layers
2. **Clean Architecture**: Use proper TypeScript interfaces and runes patterns
3. **Performance First**: Prioritize performance optimizations over incremental improvements
4. **Modern Patterns**: Use latest Svelte 5 features and best practices

### Environment Configuration via Doppler:
- Move all configuration to environment variables
- Use Doppler for development and production secrets
- Create clear separation between public and private config
- Add validation for required environment variables

### Performance Targets:
- Page load <200ms with preloading
- Cache hit rate >80%
- Bundle size reduction >20%
- 60fps smooth interactions
- Lighthouse score >95

## Notes

- **[P] tasks** = different files, no dependencies - safe to run in parallel
- **Sequential tasks** modify shared files or have dependencies
- **Better implementation focus** - don't preserve legacy patterns
- **Doppler integration** - all config via environment variables
- **Performance validation** throughout migration process
- **Component contracts** ensure API compatibility during migration
- **Test-driven approach** - tests must fail before implementation

## Task Generation Rules Applied

1. **From Contracts**: Each component contract → contract test task [P] + implementation task
2. **From Data Model**: Store patterns → store migration tasks [P]
3. **From Research**: Performance patterns → performance enhancement tasks
4. **From Quickstart**: Validation scenarios → testing and validation tasks

## Validation Checklist

_GATE: Checked before execution_

- [x] All component contracts have corresponding tests (T005-T012)
- [x] All stores have migration tasks (T013-T020)
- [x] All tests come before implementation (T005-T012 before T013+)
- [x] Parallel tasks truly independent (different files, no shared dependencies)
- [x] Each task specifies exact file path for clarity
- [x] No task modifies same file as another [P] task
- [x] Focus on better code over backwards compatibility
- [x] Doppler configuration integration included
- [x] Performance optimization prioritized throughout