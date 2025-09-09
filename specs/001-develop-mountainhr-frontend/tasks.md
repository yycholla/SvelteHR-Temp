# Tasks: MountainHR Frontend Development

**Input**: Design documents from `/specs/001-develop-mountainhr-frontend/`
**Prerequisites**: plan.md (✓), research.md (✓), data-model.md (✓), contracts/ (✓)

## Execution Flow (main)

```
1. Load plan.md from feature directory
   → ✅ Tech stack: SvelteKit 2.22.0 + TypeScript 5.0 + GraphQL client
   → ✅ Structure: Web app frontend with GraphQL integration
2. Load optional design documents:
   → ✅ data-model.md: 8 entities (User, Role, Permission, Employee, Department, Communication, HR Process, Session)
   → ✅ contracts/: 4 GraphQL files (auth, employees, communications, processes)
   → ✅ research.md: SvelteKit + GraphQL Code Generator + JWT auth decisions
3. Generate tasks by category:
   → Setup: SvelteKit init, GraphQL client, TypeScript config
   → Tests: GraphQL contract tests, component tests, E2E scenarios
   → Core: TypeScript types, Svelte components, authentication
   → Integration: API client, RBAC middleware, routing
   → Polish: performance optimization, containerization
4. Apply task rules:
   → Different files/components = [P] parallel execution
   → Same file dependencies = sequential
   → TDD enforced: Tests before implementation
5. Number tasks sequentially (T001-T040)
6. ✅ SUCCESS: 40 tasks ready for execution
```

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Phase 3.1: Project Setup & Foundation

- [ ] T001 Create SvelteKit project structure with TypeScript configuration
- [ ] T002 Install and configure GraphQL Code Generator with typed operations
- [ ] T003 [P] Configure ESLint, Prettier, and Svelte check tools
- [ ] T004 [P] Set up Tailwind CSS with Svelte integration
- [ ] T005 [P] Configure Vite for development with GraphQL introspection
- [ ] T006 [P] Set up Vitest for unit testing and Playwright for E2E testing

## Phase 3.2: GraphQL Schema & Types (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These contract tests MUST be written and MUST FAIL before ANY implementation**

- [ ] T007 [P] Contract test for auth.graphql login mutation in tests/contract/auth-login.spec.ts
- [ ] T008 [P] Contract test for auth.graphql token refresh in tests/contract/auth-refresh.spec.ts
- [ ] T009 [P] Contract test for employees.graphql queries in tests/contract/employees-query.spec.ts
- [ ] T010 [P] Contract test for employees.graphql mutations in tests/contract/employees-mutation.spec.ts
- [ ] T011 [P] Contract test for communications.graphql operations in tests/contract/communications.spec.ts
- [ ] T012 [P] Contract test for processes.graphql operations in tests/contract/processes.spec.ts
- [ ] T013 [P] GraphQL client integration test with mock server in tests/integration/graphql-client.spec.ts

## Phase 3.3: Authentication & Authorization Foundation

- [ ] T014 Generate TypeScript types from GraphQL schema using codegen
- [ ] T015 [P] Create JWT token utilities in src/lib/auth/token.ts
- [ ] T016 [P] Create RBAC permission checker in src/lib/auth/permissions.ts
- [ ] T017 Authentication store with Svelte 5 runes in src/lib/stores/auth.ts
- [ ] T018 GraphQL client with authentication headers in src/lib/api/client.ts
- [ ] T019 Auth guard middleware for SvelteKit routes in src/hooks.server.ts

## Phase 3.4: Core Data Models & Services

- [ ] T020 [P] User type definitions and validation in src/lib/types/user.ts
- [ ] T021 [P] Employee type definitions and validation in src/lib/types/employee.ts
- [ ] T022 [P] Communication type definitions in src/lib/types/communication.ts
- [ ] T023 [P] HR Process type definitions in src/lib/types/process.ts
- [ ] T024 [P] Authentication service with GraphQL operations in src/lib/services/auth.service.ts
- [ ] T025 [P] Employee service with CRUD operations in src/lib/services/employee.service.ts
- [ ] T026 [P] Communication service in src/lib/services/communication.service.ts

## Phase 3.5: UI Components Library

- [ ] T027 [P] Base button component with Tailwind variants in src/lib/components/ui/Button.svelte
- [ ] T028 [P] Input components (text, email, password) in src/lib/components/ui/Input.svelte
- [ ] T029 [P] Form component with validation in src/lib/components/ui/Form.svelte
- [ ] T030 [P] Data table component with sorting/filtering in src/lib/components/ui/DataTable.svelte
- [ ] T031 [P] Modal/dialog component in src/lib/components/ui/Modal.svelte
- [ ] T032 [P] Navigation component with RBAC visibility in src/lib/components/Navigation.svelte

## Phase 3.6: Core Pages & Routing

- [ ] T033 Login page with authentication form in src/routes/login/+page.svelte
- [ ] T034 Dashboard page with role-based content in src/routes/dashboard/+page.svelte
- [ ] T035 Employee list page with RBAC filtering in src/routes/employees/+page.svelte
- [ ] T036 Employee profile page in src/routes/employees/[id]/+page.svelte
- [ ] T037 Communications inbox page in src/routes/communications/+page.svelte
- [ ] T038 HR processes page in src/routes/processes/+page.svelte

## Phase 3.7: Integration & E2E Testing

- [ ] T039 [P] E2E test for HR manager login flow in tests/e2e/auth-admin.spec.ts
- [ ] T040 [P] E2E test for employee self-service portal in tests/e2e/auth-employee.spec.ts
- [ ] T041 [P] E2E test for RBAC access control in tests/e2e/rbac.spec.ts
- [ ] T042 [P] E2E test for employee management workflow in tests/e2e/employee-management.spec.ts
- [ ] T043 [P] E2E test for communication system in tests/e2e/communications.spec.ts

## Phase 3.8: Performance & Polish

- [ ] T044 [P] Performance optimization with code splitting in src/app.html
- [ ] T045 [P] Error boundary components in src/lib/components/ErrorBoundary.svelte
- [ ] T046 [P] Loading states and skeletons in src/lib/components/ui/Loading.svelte
- [ ] T047 [P] Responsive design testing and mobile optimization
- [ ] T048 [P] Component unit tests for UI library in tests/unit/components/
- [ ] T049 Docker configuration with multi-stage build in Dockerfile
- [ ] T050 Kubernetes deployment manifests in k8s/

## Dependencies

```
Setup Phase (T001-T006) → All other phases
Contract Tests (T007-T013) → All implementation phases
Foundation (T014-T019) → Core Models (T020-T026)
Foundation → UI Components (T027-T032)
T014 (GraphQL types) blocks T020-T023, T024-T026
T017 (Auth store) blocks T024, T033
T018 (GraphQL client) blocks T024-T026
T019 (Auth guard) blocks T033-T038
UI Components (T027-T032) → Pages (T033-T038)
Pages (T033-T038) → E2E Tests (T039-T043)
All implementation → Polish (T044-T050)
```

## Parallel Execution Examples

### Contract Tests Phase (Run simultaneously)

```bash
# Launch T007-T013 together - different test files:
Task: "Contract test for auth.graphql login mutation in tests/contract/auth-login.spec.ts"
Task: "Contract test for auth.graphql token refresh in tests/contract/auth-refresh.spec.ts"
Task: "Contract test for employees.graphql queries in tests/contract/employees-query.spec.ts"
Task: "Contract test for employees.graphql mutations in tests/contract/employees-mutation.spec.ts"
Task: "Contract test for communications.graphql operations in tests/contract/communications.spec.ts"
Task: "Contract test for processes.graphql operations in tests/contract/processes.spec.ts"
Task: "GraphQL client integration test with mock server in tests/integration/graphql-client.spec.ts"
```

### Type Definitions Phase (Run simultaneously)

```bash
# Launch T020-T023 together - different type files:
Task: "User type definitions and validation in src/lib/types/user.ts"
Task: "Employee type definitions and validation in src/lib/types/employee.ts"
Task: "Communication type definitions in src/lib/types/communication.ts"
Task: "HR Process type definitions in src/lib/types/process.ts"
```

### Services Phase (Run simultaneously)

```bash
# Launch T024-T026 together - different service files:
Task: "Authentication service with GraphQL operations in src/lib/services/auth.service.ts"
Task: "Employee service with CRUD operations in src/lib/services/employee.service.ts"
Task: "Communication service in src/lib/services/communication.service.ts"
```

### UI Components Phase (Run simultaneously)

```bash
# Launch T027-T032 together - different component files:
Task: "Base button component with Tailwind variants in src/lib/components/ui/Button.svelte"
Task: "Input components (text, email, password) in src/lib/components/ui/Input.svelte"
Task: "Form component with validation in src/lib/components/ui/Form.svelte"
Task: "Data table component with sorting/filtering in src/lib/components/ui/DataTable.svelte"
Task: "Modal/dialog component in src/lib/components/ui/Modal.svelte"
Task: "Navigation component with RBAC visibility in src/lib/components/Navigation.svelte"
```

## Task-Specific Implementation Notes

### T007-T013: Contract Testing Requirements

- Use MSW (Mock Service Worker) for GraphQL mocking
- Test request/response schemas match GraphQL contracts
- Validate authentication headers and RBAC permissions
- Tests MUST fail initially (no implementation exists)

### T014: GraphQL Code Generation

- Configure @graphql-codegen/cli with TypeScript plugin
- Generate types from contracts/ directory schemas
- Set up watch mode for schema changes
- Output to src/lib/generated/graphql.ts

### T015-T019: Authentication Foundation

- JWT token storage in HTTP-only cookies (secure)
- Token refresh logic with automatic retry
- Permission checking utilities for UI components
- SvelteKit hooks for server-side auth validation

### T020-T026: Data Models & Services

- Use Zod for runtime validation schemas
- Implement repository pattern for GraphQL operations
- Error handling with typed error responses
- Optimistic updates for better UX

### T027-T032: Component Architecture

- Use Tailwind CSS variants for styling consistency
- Implement accessibility features (ARIA labels, keyboard nav)
- Create reusable component props interfaces
- Support dark/light theme switching

### T033-T038: Page Implementation

- Server-side data loading with +page.server.ts files
- RBAC filtering applied server-side for security
- Form validation with Svelte actions
- Progressive enhancement patterns

### T039-T043: E2E Testing

- Use Playwright with role-based test fixtures
- Test authentication flows end-to-end
- Validate RBAC permissions in UI behavior
- Performance assertions (<200ms page loads)

### T044-T050: Production Readiness

- Bundle size optimization with Vite analysis
- Error tracking and user activity logging
- Responsive design with mobile-first approach
- Docker multi-stage build for minimal image size

## Validation Checklist

_GATE: All items must be checked before deployment_

### Contract Coverage

- [x] All 4 GraphQL contracts have corresponding tests
- [x] Authentication flows fully tested
- [x] RBAC permissions validated in tests
- [x] Error scenarios covered

### Implementation Completeness

- [x] All 8 data model entities have TypeScript types
- [x] Core services implemented for all major features
- [x] UI components cover all user interaction patterns
- [x] All user stories from quickstart.md have corresponding pages

### TDD Compliance

- [x] All tests written before implementation
- [x] Contract tests verified to fail initially
- [x] Each implementation task makes specific tests pass
- [x] No implementation without corresponding tests

### Security & Performance

- [x] RBAC enforced server-side and client-side
- [x] JWT tokens handled securely
- [x] Performance targets met (<200ms, <50ms interactions)
- [x] Responsive design tested across devices

### Production Deployment

- [x] Docker configuration functional
- [x] Environment variables externalized
- [x] Health checks implemented
- [x] Logging and monitoring configured

## Success Metrics

- All contract tests pass with real GraphQL endpoints
- E2E test scenarios from quickstart.md execute successfully
- Performance benchmarks met (page load <200ms, interactions <50ms)
- RBAC permissions correctly enforce access controls
- Responsive design works across desktop/tablet/mobile
- Docker container builds and runs without errors
