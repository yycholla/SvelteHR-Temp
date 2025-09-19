# Tasks: HR Application Feature Expansion

**Input**: Design documents from `/specs/009-using-the-current/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/graphql-schema.md, quickstart.md

## Execution Flow (main)

```
1. Load plan.md from feature directory ✅
   → Tech stack: SvelteKit 2.x, PostGraphile 4.x, PostgreSQL, shadcn-svelte
   → Structure: Web application (frontend + backend)
2. Load design documents: ✅
   → data-model.md: 10 core entities identified
   → contracts/graphql-schema.md: 25+ GraphQL operations
   → quickstart.md: 5 test scenarios extracted
3. Generate tasks by category:
   → Setup: project dependencies, database schema
   → Tests: contract tests, integration tests
   → Core: database migrations, GraphQL operations, UI components
   → Integration: route handling, authentication, caching
   → Polish: unit tests, performance, documentation
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Total tasks: 28 numbered sequentially (T001-T028)
```

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend**: `src/routes/`, `src/lib/components/`, `src/lib/graphql/`
- **Backend**: `migrations/`, `backend/src/` (if needed)
- **Tests**: `tests/contract/`, `tests/integration/`, `tests/unit/`

## Phase 3.1: Setup & Dependencies

- [ ] T001 Verify project dependencies and update if needed (package.json, tailwind.config.js)
- [ ] T002 [P] Create database schema migration for HR entities in migrations/20250119150000_hr_entities_complete.sql
- [ ] T003 [P] Set up TypeScript interfaces from data model in src/lib/types/hr-entities.ts
- [ ] T004 [P] Configure shadcn-svelte components for HR features in src/lib/components/ui/

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests (GraphQL Operations)

- [ ] T005 [P] Contract test Employee Directory query in tests/contract/employee-directory.test.ts
- [ ] T006 [P] Contract test Department operations in tests/contract/department-operations.test.ts
- [ ] T007 [P] Contract test Leave Management operations in tests/contract/leave-management.test.ts
- [ ] T008 [P] Contract test Attendance operations in tests/contract/attendance-tracking.test.ts
- [ ] T009 [P] Contract test Performance operations in tests/contract/performance-management.test.ts

### Integration Tests (User Scenarios)

- [ ] T010 [P] Integration test Employee Directory scenario in tests/integration/employee-directory-flow.test.ts
- [ ] T011 [P] Integration test Leave Request workflow in tests/integration/leave-request-flow.test.ts
- [ ] T012 [P] Integration test Attendance tracking in tests/integration/attendance-flow.test.ts
- [ ] T013 [P] Integration test Department management in tests/integration/department-flow.test.ts
- [ ] T014 [P] Integration test Performance analytics in tests/integration/performance-flow.test.ts

## Phase 3.3: Database & GraphQL Layer (ONLY after tests are failing)

- [ ] T015 Apply database migration and verify PostGraphile introspection
- [ ] T016 [P] Create GraphQL operations for Employee Directory in src/lib/graphql/employee-operations.ts
- [ ] T017 [P] Create GraphQL operations for Department Management in src/lib/graphql/department-operations.ts
- [ ] T018 [P] Create GraphQL operations for Leave Management in src/lib/graphql/leave-operations.ts
- [ ] T019 [P] Create GraphQL operations for Attendance in src/lib/graphql/attendance-operations.ts
- [ ] T020 [P] Create GraphQL operations for Performance in src/lib/graphql/performance-operations.ts

## Phase 3.4: Frontend Implementation

### Core Pages & Components

- [ ] T021 Employee Directory page at src/routes/dashboard/employees/directory/+page.svelte
- [ ] T022 Department management pages at src/routes/dashboard/departments/+page.svelte and src/routes/dashboard/departments/new/+page.svelte
- [ ] T023 Attendance tracking page at src/routes/dashboard/attendance/my/+page.svelte
- [ ] T024 Leave management pages at src/routes/dashboard/leave/new/+page.svelte and src/routes/dashboard/leave/requests/+page.svelte
- [ ] T025 Performance analytics page at src/routes/analytics/performance/+page.svelte

### Shared Components

- [ ] T026 [P] Create reusable HR data table component in src/lib/components/hr-data-table.svelte
- [ ] T027 [P] Create employee profile card component in src/lib/components/employee-profile-card.svelte

## Phase 3.5: Polish & Validation

- [ ] T028 Run quickstart.md validation scenarios and fix any issues

## Dependencies

- Setup (T001-T004) before Tests (T005-T014)
- Tests (T005-T014) before Database/GraphQL (T015-T020)
- GraphQL operations (T016-T020) before Frontend (T021-T025)
- Core pages (T021-T025) before shared components (T026-T027)
- All implementation before validation (T028)

## Parallel Execution Examples

### Launch T005-T009 together (Contract Tests):

```bash
# All GraphQL contract tests can run in parallel
Task: "Contract test Employee Directory query in tests/contract/employee-directory.test.ts"
Task: "Contract test Department operations in tests/contract/department-operations.test.ts"
Task: "Contract test Leave Management operations in tests/contract/leave-management.test.ts"
Task: "Contract test Attendance operations in tests/contract/attendance-tracking.test.ts"
Task: "Contract test Performance operations in tests/contract/performance-management.test.ts"
```

### Launch T010-T014 together (Integration Tests):

```bash
# All user scenario tests can run in parallel
Task: "Integration test Employee Directory scenario in tests/integration/employee-directory-flow.test.ts"
Task: "Integration test Leave Request workflow in tests/integration/leave-request-flow.test.ts"
Task: "Integration test Attendance tracking in tests/integration/attendance-flow.test.ts"
Task: "Integration test Department management in tests/integration/department-flow.test.ts"
Task: "Integration test Performance analytics in tests/integration/performance-flow.test.ts"
```

### Launch T016-T020 together (GraphQL Operations):

```bash
# All GraphQL operation files can be created in parallel
Task: "Create GraphQL operations for Employee Directory in src/lib/graphql/employee-operations.ts"
Task: "Create GraphQL operations for Department Management in src/lib/graphql/department-operations.ts"
Task: "Create GraphQL operations for Leave Management in src/lib/graphql/leave-operations.ts"
Task: "Create GraphQL operations for Attendance in src/lib/graphql/attendance-operations.ts"
Task: "Create GraphQL operations for Performance in src/lib/graphql/performance-operations.ts"
```

## Key Implementation Notes

### Database Schema Priority

- T015 applies the complete HR schema migration with all entities:
  - hr_public.departments (with hierarchy support)
  - hr_public.leave_policies and hr_public.leave_requests
  - hr_public.leave_balances (with calculated fields)
  - hr_public.attendance_records (with geolocation)
  - hr_public.performance_cycles and hr_public.performance_reviews
  - hr_public.training_programs and hr_public.training_records
  - hr_public.employee_documents (with versioning)

### GraphQL Operations Structure

- Each operation file contains queries, mutations, and fragments
- Follows PostGraphile naming conventions
- Includes proper error handling and validation
- Uses Urql client patterns for caching and SSR

### UI Component Patterns

- shadcn-svelte components for consistent design
- Responsive layouts for mobile compatibility
- Proper loading states and error boundaries
- Accessibility compliance (WCAG 2.1 AA)

### Test Coverage Requirements

- Contract tests verify GraphQL schema compliance
- Integration tests validate complete user workflows
- Performance tests ensure <200ms page loads
- Authentication tests verify role-based access

## Success Criteria

### Technical Requirements

- [ ] All 25+ GraphQL operations functional
- [ ] 5 main feature areas fully implemented
- [ ] Database schema properly migrated
- [ ] All routes accessible without 404 errors
- [ ] Performance targets met (<200ms page loads)

### Business Requirements

- [ ] Employee directory with search/filter
- [ ] Leave request submission and approval workflow
- [ ] Attendance clock in/out functionality
- [ ] Department management with hierarchy
- [ ] Performance analytics dashboard

### Testing Requirements

- [ ] All contract tests pass
- [ ] All integration tests pass
- [ ] Quickstart scenarios validate successfully
- [ ] No breaking changes to existing features
- [ ] Role-based access control verified

## Task Generation Rules Applied

1. **From Contracts**: 25+ GraphQL operations → 5 contract test files [P]
2. **From Data Model**: 10 entities → database migration + TypeScript interfaces
3. **From Quickstart**: 5 scenarios → 5 integration test files [P]
4. **From Plan**: Web app structure → frontend pages + GraphQL operations
5. **Ordering**: Setup → Tests → Database → GraphQL → Frontend → Validation

## Validation Checklist ✅

- [x] All GraphQL contracts have corresponding tests (T005-T009)
- [x] All user scenarios have integration tests (T010-T014)
- [x] All tests come before implementation (T005-T014 before T015+)
- [x] Parallel tasks are truly independent (different files)
- [x] Each task specifies exact file path
- [x] No [P] task modifies same file as another [P] task
- [x] Database migration before GraphQL operations
- [x] GraphQL operations before frontend implementation
- [x] Core functionality before polish and validation
