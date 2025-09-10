# Tasks: GraphQL API Migration

**Input**: Design documents from `/specs/006-switch-all-api/`  
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/schema.graphql ✅

**Migration Scope**: Replace 35+ REST API integration points with GraphQL operations  
**Core Entities**: Employee, Department, User, Role, Permission, Dashboard, Session  
**Tech Stack**: TypeScript 5.0, SvelteKit 2.22.0, GraphQL, Svelte 5.0, Vitest, Playwright  
**Constraints**: Zero breaking changes for users, maintain RBAC, preserve authentication patterns

---

## Phase A: Foundation & Tooling (T001-T008)

**Critical Setup**: GraphQL tooling and code generation infrastructure

- [ ] **T001** [P] Install GraphQL code generation dependencies in `package.json` - Add `@graphql-codegen/cli`, `@graphql-codegen/typescript`, `@graphql-codegen/typescript-operations`, `@graphql-codegen/typescript-resolvers`
- [ ] **T002** [P] Configure GraphQL code generation in `codegen.yml` - Setup schema introspection, type generation, and output paths for generated types
- [ ] **T003** [P] Create GraphQL client factory in `src/lib/graphql/client-factory.ts` - Server and browser client instantiation with token management
- [ ] **T004** [P] Setup GraphQL development tools in `src/lib/graphql/dev-tools.ts` - Query complexity analyzer, performance profiler, schema validator
- [ ] **T005** [P] Create GraphQL schema contract tests in `tests/contract/graphql-schema.test.ts` - Validate schema.graphql against server implementation
- [ ] **T006** [P] Create GraphQL authentication tests in `tests/contract/graphql-auth.test.ts` - Bearer token validation, RBAC enforcement testing
- [ ] **T007** [P] Create GraphQL performance tests in `tests/contract/graphql-performance.test.ts` - Query response time validation (<200ms target)
- [ ] **T008** Run initial GraphQL code generation - Generate TypeScript types from schema.graphql, validate compilation

---

## Phase B: Core Entity Migration (T009-T020)

**TDD Critical**: All contract tests MUST be written and MUST FAIL before implementation

### B1: Authentication System Migration (T009-T012)

- [ ] **T009** [P] GraphQL auth query contract tests in `tests/contract/auth-queries.test.ts` - Test `me`, `verifyToken` queries with mock responses
- [ ] **T010** [P] GraphQL auth mutation contract tests in `tests/contract/auth-mutations.test.ts` - Test `login`, `logout`, `refreshToken` mutations
- [ ] **T011** [P] Create auth GraphQL service adapter in `src/lib/graphql/services/auth-service.ts` - Replace REST auth calls with GraphQL operations
- [ ] **T012** Update authentication hooks in `src/hooks.server.ts` - Replace REST `/api/v2/auth/verify` with GraphQL `verifyToken` query

### B2: Employee Entity Migration (T013-T016)

- [ ] **T013** [P] Employee GraphQL query contract tests in `tests/contract/employee-queries.test.ts` - Test `employees`, `employee(id)` queries with pagination
- [ ] **T014** [P] Employee GraphQL mutation contract tests in `tests/contract/employee-mutations.test.ts` - Test `createEmployee`, `updateEmployee`, `deleteEmployee`
- [ ] **T015** [P] Create employee GraphQL service in `src/lib/graphql/services/employee-service.ts` - Complete CRUD operations with type safety
- [ ] **T016** Replace employee API calls in `src/routes/hr/employees/+page.server.ts` - Switch from `apiClient.employees` to GraphQL service

### B3: Department Entity Migration (T017-T020)

- [ ] **T017** [P] Department GraphQL query contract tests in `tests/contract/department-queries.test.ts` - Test hierarchical department queries, metrics
- [ ] **T018** [P] Department GraphQL mutation contract tests in `tests/contract/department-mutations.test.ts` - Test department CRUD with hierarchy validation
- [ ] **T019** [P] Create department GraphQL service in `src/lib/graphql/services/department-service.ts` - Hierarchical queries, employee relationships
- [ ] **T020** Replace department API calls in `src/routes/departments/+page.server.ts` - Switch from REST to GraphQL department operations

---

## Phase C: Server-Side Migration (T021-T030)

**Focus**: Migrate all `+page.server.ts` files from REST to GraphQL

### C1: HR Management Pages (T021-T025)

- [ ] **T021** [P] Migrate HR employees list in `src/routes/hr/employees/+page.server.ts` - Replace `apiClient.employees.list()` with GraphQL employee queries
- [ ] **T022** [P] Migrate HR employee detail in `src/routes/hr/employees/[id]/+page.server.ts` - Replace REST employee fetch with GraphQL single employee query
- [ ] **T023** [P] Migrate HR employee creation in `src/routes/hr/employees/create/+page.server.ts` - Replace REST POST with GraphQL `createEmployee` mutation
- [ ] **T024** [P] Migrate HR department management in `src/routes/hr/departments/+page.server.ts` - Switch to GraphQL department queries with hierarchy
- [ ] **T025** [P] Migrate HR dashboard data in `src/routes/hr/+page.server.ts` - Replace REST dashboard calls with GraphQL `dashboardData` query

### C2: General Application Pages (T026-T030)

- [ ] **T026** [P] Migrate main dashboard in `src/routes/+page.server.ts` - Replace REST API calls with role-appropriate GraphQL dashboard query
- [ ] **T027** [P] Migrate reports page in `src/routes/reports/+page.server.ts` - Switch reporting data fetches from REST to GraphQL aggregation queries
- [ ] **T028** [P] Migrate tasks management in `src/routes/tasks/+page.server.ts` - Replace task API calls with GraphQL task queries and mutations
- [ ] **T029** [P] Migrate calendar view in `src/routes/calendar/+page.server.ts` - Switch calendar data from REST to GraphQL with subscription support
- [ ] **T030** Update remaining server-side integrations - Search and replace all remaining `apiClient` usage in `+page.server.ts` files

---

## Phase D: Real-time & Advanced Features (T031-T035)

**Focus**: Dashboard widgets, real-time subscriptions, and performance optimization

### D1: Dashboard & UI Components (T031-T033)

- [ ] **T031** [P] Migrate dashboard widgets in `src/lib/components/dashboard/cards/` - Replace REST API calls with GraphQL queries in all card components
- [ ] **T032** [P] Implement GraphQL subscriptions in `src/lib/graphql/subscriptions-client.ts` - WebSocket client for real-time employee, dashboard updates  
- [ ] **T033** Update dashboard real-time features in `src/lib/components/dashboard/` - Connect subscription client to live dashboard widgets

### D2: Search & Performance (T034-T035)

- [ ] **T034** [P] Migrate search functionality in `src/lib/components/search/` - Replace REST search with GraphQL `globalSearch` and `searchSuggestions`
- [ ] **T035** Implement GraphQL query optimization in `src/lib/graphql/optimization.ts` - Query batching, deduplication, intelligent caching

---

## Phase E: Testing & Validation (T036-T040)

**Critical**: Comprehensive validation before production deployment

- [ ] **T036** [P] Integration test suite in `tests/integration/graphql-migration.test.ts` - End-to-end workflow testing with GraphQL operations
- [ ] **T037** [P] Performance regression tests in `tests/performance/graphql-performance.test.ts` - Ensure GraphQL meets <200ms response time targets
- [ ] **T038** [P] RBAC validation tests in `tests/integration/graphql-rbac.test.ts` - Verify permission enforcement consistency between REST and GraphQL
- [ ] **T039** Execute quickstart validation in `specs/006-switch-all-api/quickstart.md` - Complete 14-section validation procedure
- [ ] **T040** Remove deprecated REST API integrations - Clean up unused `apiClient` imports and REST endpoint dependencies

---

## Dependencies

**Critical Path Analysis**:

- **Foundation First**: T001-T008 must complete before any migration work
- **TDD Enforcement**: Contract tests (T009, T010, T013, T014, T017, T018) MUST fail before implementation
- **Service Layer**: T011, T015, T019 (services) before T012, T016, T020 (integration)
- **Server Migration**: T021-T030 can run in parallel after services complete
- **UI Migration**: T031-T035 depends on server migration completion
- **Validation Last**: T036-T040 after all migration tasks

**Blocking Dependencies**:
- T008 blocks all Phase B tasks (code generation needed)
- T011 blocks T012 (auth service before hooks)
- T015 blocks T021-T023 (employee service before page migration)
- T019 blocks T024 (department service before page migration)
- T032 blocks T033 (subscription client before dashboard)
- T036-T039 block T040 (validation before cleanup)

---

## Parallel Execution Examples

### Foundation Phase (T001-T007 parallel):
```bash
# Launch GraphQL tooling setup simultaneously
Task: "Install GraphQL code generation dependencies in package.json"
Task: "Configure GraphQL code generation in codegen.yml"
Task: "Create GraphQL client factory in src/lib/graphql/client-factory.ts"
Task: "Setup GraphQL development tools in src/lib/graphql/dev-tools.ts"
Task: "Create GraphQL schema contract tests in tests/contract/graphql-schema.test.ts"
Task: "Create GraphQL authentication tests in tests/contract/graphql-auth.test.ts"
Task: "Create GraphQL performance tests in tests/contract/graphql-performance.test.ts"
```

### Contract Tests Phase (T009, T010, T013, T014, T017, T018 parallel):
```bash
# Launch all contract tests simultaneously (MUST FAIL initially)
Task: "GraphQL auth query contract tests in tests/contract/auth-queries.test.ts"
Task: "GraphQL auth mutation contract tests in tests/contract/auth-mutations.test.ts"
Task: "Employee GraphQL query contract tests in tests/contract/employee-queries.test.ts"  
Task: "Employee GraphQL mutation contract tests in tests/contract/employee-mutations.test.ts"
Task: "Department GraphQL query contract tests in tests/contract/department-queries.test.ts"
Task: "Department GraphQL mutation contract tests in tests/contract/department-mutations.test.ts"
```

### Server Migration Phase (T021-T030 parallel after services):
```bash
# Launch server-side migrations simultaneously
Task: "Migrate HR employees list in src/routes/hr/employees/+page.server.ts"
Task: "Migrate HR employee detail in src/routes/hr/employees/[id]/+page.server.ts"
Task: "Migrate HR employee creation in src/routes/hr/employees/create/+page.server.ts"
Task: "Migrate HR department management in src/routes/hr/departments/+page.server.ts"
Task: "Migrate HR dashboard data in src/routes/hr/+page.server.ts"
Task: "Migrate main dashboard in src/routes/+page.server.ts"
Task: "Migrate reports page in src/routes/reports/+page.server.ts"
Task: "Migrate tasks management in src/routes/tasks/+page.server.ts"
Task: "Migrate calendar view in src/routes/calendar/+page.server.ts"
```

---

## Validation Checklist

**Task Completeness Verification**:

- [✅] All GraphQL schema entities have corresponding service tasks
- [✅] All contract tests written before implementation (TDD enforced)
- [✅] All 35+ REST API integration points covered by migration tasks
- [✅] All server-side files (`+page.server.ts`) have migration tasks
- [✅] Real-time features (subscriptions) addressed
- [✅] Performance testing and optimization included
- [✅] RBAC validation preserved throughout migration
- [✅] Comprehensive end-to-end testing planned

**Parallel Task Safety**:
- [✅] All [P] tasks modify different files
- [✅] No shared file modifications in parallel tasks
- [✅] Dependencies clearly documented and enforced
- [✅] Exact file paths specified for each task

---

## Migration Success Criteria

**Ready for Production When**:
- All 40 tasks completed successfully
- Contract tests pass with 100% GraphQL schema coverage
- Performance tests validate <200ms response times
- RBAC validation confirms identical permission enforcement
- Quickstart guide validation passes all 14 sections
- Zero user-facing breaking changes confirmed
- Rollback procedures tested and documented

**Estimated Timeline**: 8-10 development days (5 days with parallel execution)

---

*Based on implementation plan from `/specs/006-switch-all-api/plan.md`*  
*Ready for execution with `/tasks` command*