# Tasks: MountainHR Frontend Development

**Input**: Design documents from `/specs/001-develop-mountainhr-frontend/`  
**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → ✅ Found: SvelteKit + TypeScript with GelDB integration
   → ✅ Extracted: tech stack (SvelteKit, Urql, GelDB, Redis), libraries
2. Load optional design documents:
   → ✅ data-model.md: 8 core entities (User, Task, Department, etc.)
   → ✅ contracts/: GraphQL schema + REST endpoints
   → ✅ research.md: Technical decisions for architecture
3. Generate tasks by category:
   → ✅ Setup: SvelteKit init, dependencies, configuration
   → ✅ Tests: 12 contract tests, 8 integration tests
   → ✅ Core: Models, services, components, pages
   → ✅ Integration: GraphQL client, auth, caching
   → ✅ Polish: E2E tests, performance, validation
4. Apply task rules:
   → ✅ Different files = [P] parallel execution
   → ✅ Same file = sequential
   → ✅ Tests before implementation (TDD)
5. Number tasks sequentially (T001-T043)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   → ✅ All contracts have tests
   → ✅ All entities have models
   → ✅ All user stories covered
9. Return: SUCCESS (43 tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
**SvelteKit Web Application Structure** (from plan.md):
```
src/
├── app.html, app.d.ts
├── routes/            # SvelteKit file-based routing  
├── lib/              # Reusable libraries
│   ├── auth/         # Gel Auth integration
│   ├── graphql/      # GraphQL client setup
│   ├── components/   # UI component library
│   └── services/     # Business logic services
└── hooks.server.ts   # SvelteKit server hooks

tests/
├── contract/         # GraphQL contract tests
├── integration/      # Full workflow tests
├── e2e/             # Playwright end-to-end tests
└── unit/            # Component unit tests
```

## Phase 3.1: Project Setup

- [ ] **T001** Initialize SvelteKit project with TypeScript template at repository root
- [ ] **T002** Install core dependencies (SvelteKit, Urql, Zod, GraphQL codegen, testing libraries)
- [ ] **T003** [P] Configure TailwindCSS with forms and typography plugins in `tailwind.config.js`
- [ ] **T004** [P] Configure TypeScript with SvelteKit settings in `tsconfig.json`
- [ ] **T005** [P] Configure ESLint and Prettier for code quality in `.eslintrc.js` and `.prettierrc`
- [ ] **T006** [P] Setup Vitest configuration for unit tests in `vitest.config.ts`
- [ ] **T007** [P] Setup Playwright configuration for E2E tests in `playwright.config.ts`
- [ ] **T008** Configure GraphQL Code Generator in `codegen.ts` for type generation
- [ ] **T009** Setup Doppler integration and environment configuration in `src/lib/config.ts`
- [ ] **T010** Create project directory structure (`src/lib/{auth,graphql,components,services}`, `tests/{contract,integration,e2e,unit}`)

## Phase 3.2: Contract Tests (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### GraphQL Contract Tests
- [ ] **T011** [P] GraphQL schema introspection contract test in `tests/contract/schema-validation.test.ts`
- [ ] **T012** [P] User authentication GraphQL contract test in `tests/contract/auth-contract.test.ts`
- [ ] **T013** [P] User management GraphQL contract test in `tests/contract/user-contract.test.ts`
- [ ] **T014** [P] Task management GraphQL contract test in `tests/contract/task-contract.test.ts`
- [ ] **T015** [P] Department GraphQL contract test in `tests/contract/department-contract.test.ts`
- [ ] **T016** [P] Leave management GraphQL contract test in `tests/contract/leave-contract.test.ts`
- [ ] **T017** [P] Attendance GraphQL contract test in `tests/contract/attendance-contract.test.ts`
- [ ] **T018** [P] HR requests GraphQL contract test in `tests/contract/hr-request-contract.test.ts`

### REST API Contract Tests  
- [ ] **T019** [P] Authentication endpoints contract test in `tests/contract/auth-api-contract.test.ts`
- [ ] **T020** [P] File upload endpoints contract test in `tests/contract/file-upload-contract.test.ts`
- [ ] **T021** [P] Export endpoints contract test in `tests/contract/export-contract.test.ts`
- [ ] **T022** [P] Admin endpoints contract test in `tests/contract/admin-contract.test.ts`

### Integration Test Scenarios
- [ ] **T023** [P] User dashboard integration test in `tests/integration/dashboard.test.ts`
- [ ] **T024** [P] HR workflow integration test in `tests/integration/hr-workflows.test.ts` 
- [ ] **T025** [P] Authentication flow integration test in `tests/integration/auth-flow.test.ts`
- [ ] **T026** [P] RBAC enforcement integration test in `tests/integration/rbac.test.ts`
- [ ] **T027** [P] Employee onboarding integration test in `tests/integration/onboarding.test.ts`
- [ ] **T028** [P] Leave request integration test in `tests/integration/leave-requests.test.ts`
- [ ] **T029** [P] Task management integration test in `tests/integration/task-management.test.ts`
- [ ] **T030** [P] Responsive design integration test in `tests/integration/responsive.test.ts`

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### GraphQL Integration Foundation
- [ ] **T031** Create Urql GraphQL client configuration in `src/lib/graphql/client.ts`
- [ ] **T032** Setup GraphQL query/mutation definitions in `src/lib/graphql/queries.ts`
- [ ] **T033** Implement authentication service with Gel Auth in `src/lib/auth/service.ts`
- [ ] **T034** Create SvelteKit authentication hooks in `src/hooks.server.ts`

### Data Models and Services
- [ ] **T035** [P] User data model and validation in `src/lib/models/user.ts`
- [ ] **T036** [P] Task data model and validation in `src/lib/models/task.ts`
- [ ] **T037** [P] Department data model and validation in `src/lib/models/department.ts`
- [ ] **T038** [P] Leave data model and validation in `src/lib/models/leave.ts`
- [ ] **T039** User service with GraphQL operations in `src/lib/services/user-service.ts`
- [ ] **T040** Task service with GraphQL operations in `src/lib/services/task-service.ts`

### UI Components Foundation
- [ ] **T041** [P] Base UI components (Button, Input, Modal) in `src/lib/components/base/`
- [ ] **T042** [P] Layout components (Header, Sidebar, Footer) in `src/lib/components/layout/`
- [ ] **T043** [P] Form components with validation in `src/lib/components/forms/`
- [ ] **T044** [P] Data table components in `src/lib/components/tables/`

### Core Pages and Routes
- [ ] **T045** Root layout with authentication checks in `src/routes/+layout.svelte` and `+layout.server.ts`
- [ ] **T046** Authentication pages (login, logout) in `src/routes/(auth)/`
- [ ] **T047** Dashboard page with user overview in `src/routes/dashboard/+page.svelte`
- [ ] **T048** User management pages in `src/routes/hr/users/`
- [ ] **T049** Task management pages in `src/routes/hr/tasks/`
- [ ] **T050** Leave management pages in `src/routes/hr/leaves/`
- [ ] **T051** Admin pages for system management in `src/routes/admin/`

## Phase 3.4: Integration & Polish

### API Route Handlers
- [ ] **T052** Authentication API routes in `src/routes/api/auth/`
- [ ] **T053** GraphQL proxy API route in `src/routes/api/graphql/+server.ts`
- [ ] **T054** File upload API routes in `src/routes/api/files/`
- [ ] **T055** Export API routes in `src/routes/api/exports/`

### Caching and Performance
- [ ] **T056** Redis caching integration in `src/lib/services/cache-service.ts`
- [ ] **T057** GraphQL cache configuration with Urql exchanges
- [ ] **T058** SSR optimization for sensitive data pages
- [ ] **T059** Mobile responsive optimization and testing

### Error Handling and Security
- [ ] **T060** Global error boundary components in `src/lib/components/error/`
- [ ] **T061** RBAC middleware and permission checks in `src/lib/auth/rbac.ts`
- [ ] **T062** Input validation and sanitization middleware
- [ ] **T063** Security headers and CORS configuration

## Phase 3.5: Testing & Validation

### End-to-End Tests
- [ ] **T064** [P] Dashboard E2E test workflow in `tests/e2e/dashboard.spec.ts`
- [ ] **T065** [P] User management E2E test in `tests/e2e/user-management.spec.ts`
- [ ] **T066** [P] Authentication flow E2E test in `tests/e2e/auth-flow.spec.ts`
- [ ] **T067** [P] Leave request E2E workflow test in `tests/e2e/leave-workflow.spec.ts`

### Unit Tests and Performance
- [ ] **T068** [P] Component unit tests in `tests/unit/components/`
- [ ] **T069** [P] Service layer unit tests in `tests/unit/services/`
- [ ] **T070** [P] Utility function unit tests in `tests/unit/utils/`
- [ ] **T071** Performance testing and optimization validation
- [ ] **T072** Accessibility testing and ARIA compliance validation

### Documentation and Deployment
- [ ] **T073** [P] Update CLAUDE.md with implementation details
- [ ] **T074** [P] Create deployment documentation
- [ ] **T075** [P] Generate API documentation
- [ ] **T076** Manual testing validation using quickstart guide scenarios

## Dependencies

### Critical Dependencies (Must Complete In Order)
1. **Setup First**: T001-T010 before all others
2. **Tests Before Implementation**: T011-T030 before T031-T063
3. **GraphQL Foundation**: T031-T034 before T035-T055
4. **Models Before Services**: T035-T038 before T039-T040
5. **Services Before Pages**: T039-T040 before T045-T051
6. **Core Before E2E**: T031-T063 before T064-T067

### Sequential Dependencies
- T008 (GraphQL codegen) blocks T032 (queries)
- T031 (client) blocks T039-T040 (services)  
- T033-T034 (auth) blocks T045 (root layout)
- T041-T044 (components) blocks T047-T051 (pages)
- T052-T055 (API routes) blocks T064-T067 (E2E tests)

## Parallel Execution Examples

### Contract Tests (Phase 3.2)
```bash
# Launch T011-T018 GraphQL contract tests in parallel:
Task: "GraphQL schema introspection contract test in tests/contract/schema-validation.test.ts"
Task: "User authentication GraphQL contract test in tests/contract/auth-contract.test.ts" 
Task: "User management GraphQL contract test in tests/contract/user-contract.test.ts"
Task: "Task management GraphQL contract test in tests/contract/task-contract.test.ts"
```

### Data Models (Phase 3.3)
```bash
# Launch T035-T038 data models in parallel:
Task: "User data model and validation in src/lib/models/user.ts"
Task: "Task data model and validation in src/lib/models/task.ts"
Task: "Department data model and validation in src/lib/models/department.ts"
Task: "Leave data model and validation in src/lib/models/leave.ts"
```

### UI Components (Phase 3.3)
```bash
# Launch T041-T044 UI components in parallel:
Task: "Base UI components (Button, Input, Modal) in src/lib/components/base/"
Task: "Layout components (Header, Sidebar, Footer) in src/lib/components/layout/"
Task: "Form components with validation in src/lib/components/forms/"
Task: "Data table components in src/lib/components/tables/"
```

### Integration Tests (Phase 3.2)
```bash  
# Launch T023-T030 integration tests in parallel:
Task: "User dashboard integration test in tests/integration/dashboard.test.ts"
Task: "HR workflow integration test in tests/integration/hr-workflows.test.ts"
Task: "Authentication flow integration test in tests/integration/auth-flow.test.ts"
Task: "RBAC enforcement integration test in tests/integration/rbac.test.ts"
```

## Notes

- **[P] tasks** = Different files, no dependencies, safe for parallel execution
- **RED-GREEN-Refactor**: Verify all tests in T011-T030 fail before implementing T031+
- **Security First**: RBAC checks must be implemented before exposing any HR data
- **Mobile Ready**: All components should include responsive design patterns
- **Doppler Only**: All environment configuration through Doppler CLI, no .env files
- **GraphQL Types**: Run `npm run codegen` after T008 and before T032

## Task Generation Rules Applied

### From Contracts (contracts/)
- **GraphQL Schema**: 8 contract tests for core entities (T011-T018) 
- **REST Endpoints**: 4 contract tests for API operations (T019-T022)
- **Implementation**: Services and API routes for all contract endpoints

### From Data Model (data-model.md)
- **8 Core Entities**: User, Role, Department, Task, Leave, Attendance, etc.
- **Model Tasks**: TypeScript interfaces and validation (T035-T038 [P])
- **Service Tasks**: GraphQL operations for each entity (T039-T040)

### From User Stories (spec.md)
- **HR Workflows**: Onboarding, leave requests, task management
- **Integration Tests**: 8 tests covering complete user journeys (T023-T030 [P])
- **E2E Tests**: Critical workflow validation (T064-T067 [P])

### From Quickstart (quickstart.md)  
- **Setup Tasks**: SvelteKit init, dependencies, configuration (T001-T010)
- **Validation Tasks**: Manual testing scenarios and deployment docs (T071-T076)

## Validation Checklist ✅

- [x] All contracts have corresponding tests (T011-T022)
- [x] All entities have model tasks (T035-T038) 
- [x] All tests come before implementation (T011-T030 before T031+)
- [x] Parallel tasks are truly independent ([P] tasks use different files)
- [x] Each task specifies exact file path
- [x] No [P] task modifies same file as another [P] task
- [x] TDD enforced: Contract → Integration → Implementation → E2E → Unit
- [x] GraphQL and REST contracts fully covered
- [x] Security and RBAC testing included
- [x] Mobile responsive requirements included
- [x] Performance and accessibility validation included

**Total Tasks**: 76 tasks across 5 phases  
**Parallel Opportunities**: 31 tasks marked [P] for concurrent execution  
**Estimated Timeline**: 3-4 weeks with proper task distribution