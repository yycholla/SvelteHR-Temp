# Tasks: PostGraphile Migration for Enhanced GraphQL Architecture

**Input**: Design documents from `/specs/003-now-that-we/`
**Prerequisites**: plan.md (✓), research.md (✓), data-model.md (✓), contracts/ (✓)

## Execution Flow (main)

```
1. Load plan.md from feature directory
   → ✓ Found: PostGraphile 4.x + Express.js + PostgreSQL 15+ + Redis 7.2
   → ✓ Structure: Web app (backend/ + frontend/)
2. Load optional design documents:
   → ✓ data-model.md: 5 entities (Authentication Token, User Role, Security Policy, Query Cache, Business Logic Function)
   → ✓ contracts/: 3 contracts (schema.graphql, authentication.contract.md, employee-management.contract.md)
   → ✓ research.md: PostGraphile configuration, JWT authentication, RLS policies
3. Generate tasks by category:
   → Setup: PostgreSQL setup, PostGraphile server, environment
   → Tests: Contract tests for authentication and employee management
   → Core: Database schema, authentication functions, RLS policies
   → Integration: PostGraphile middleware, caching, logging
   → Polish: Performance optimization, frontend migration, validation
4. Task rules applied:
   → [P] for parallel tasks (different files, no dependencies)
   → Sequential for shared database/server files
   → TDD: All tests before implementation
5. Tasks numbered T001-T038
6. Dependencies validated for proper execution order
7. Parallel execution examples provided
8. Task completeness validated
9. SUCCESS: 38 tasks ready for execution
```

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions

Based on plan.md structure: Web application with `backend/` and `frontend/` directories

- **Backend**: `backend/src/`, `backend/tests/`, `backend/database/`
- **Frontend**: `frontend/src/`, `frontend/tests/`
- **Database**: `database/migrations/`, `database/functions/`, `database/policies/`

## Phase 3.1: Setup & Infrastructure

- [ ] T001 Create PostGraphile project structure (backend/, database/, frontend/ updates)
- [ ] T002 Initialize PostgreSQL database with schemas (hr_public, hr_private, hr_hidden)
- [ ] T003 Create PostgreSQL role hierarchy (hr_guest → hr_employee → hr_manager → hr_admin → hr_super_admin)
- [ ] T004 [P] Initialize Node.js backend project with TypeScript and PostGraphile dependencies
- [ ] T005 [P] Configure environment variables and Docker Compose for development
- [ ] T006 [P] Set up Redis container for caching layer

## Phase 3.2: Database Schema & Functions ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: Database setup must be complete before PostGraphile server tests**

- [ ] T007 [P] Create core tables in database/migrations/001_create_core_tables.sql (departments, employees, employee_account)
- [ ] T008 [P] Create time-off and performance tables in database/migrations/002_create_hr_tables.sql
- [ ] T009 [P] Create JWT token composite type in database/migrations/003_create_jwt_type.sql
- [ ] T010 Create authentication function in database/functions/authenticate.sql (SECURITY DEFINER)
- [ ] T011 Create computed field functions in database/functions/computed_fields.sql (employee_full_name, direct_reports)
- [ ] T012 Create business logic functions in database/functions/business_logic.sql (role changes, termination)

## Phase 3.3: Row-Level Security Policies ⚠️ MUST COMPLETE BEFORE 3.4

**CRITICAL: RLS policies must be in place before GraphQL endpoint tests**

- [ ] T013 [P] Employee access policies in database/policies/employee_policies.sql
- [ ] T014 [P] Time-off request policies in database/policies/timeoff_policies.sql
- [ ] T015 [P] Compensation access policies in database/policies/compensation_policies.sql
- [ ] T016 [P] Department access policies in database/policies/department_policies.sql
- [ ] T017 Create database indexes for PostGraphile performance in database/migrations/004_create_indexes.sql

## Phase 3.4: Contract Tests (TDD) ⚠️ MUST COMPLETE BEFORE 3.5

**CRITICAL: These tests MUST be written and MUST FAIL before ANY PostGraphile implementation**

- [ ] T018 [P] Authentication contract test in backend/tests/contract/test_authentication_contract.test.ts
- [ ] T019 [P] Employee management contract test in backend/tests/contract/test_employee_management_contract.test.ts
- [ ] T020 [P] GraphQL schema validation test in backend/tests/contract/test_graphql_schema_contract.test.ts
- [ ] T021 [P] JWT token validation test in backend/tests/integration/test_jwt_validation.test.ts
- [ ] T022 [P] Role-based access control test in backend/tests/integration/test_rbac.test.ts
- [ ] T023 [P] Row-level security test in backend/tests/integration/test_rls_policies.test.ts

## Phase 3.5: PostGraphile Server Implementation (ONLY after tests are failing)

- [ ] T024 Create PostGraphile Express server in backend/src/server.ts
- [ ] T025 Configure JWT authentication middleware in backend/src/auth/jwt-middleware.ts
- [ ] T026 [P] Implement structured logging in backend/src/monitoring/logger.ts
- [ ] T027 [P] Configure Redis caching middleware in backend/src/cache/redis-middleware.ts
- [ ] T028 Set up PostgreSQL connection pooling in backend/src/database/connection-pool.ts
- [ ] T029 Create custom PostGraphile plugins in backend/src/postgraphile/custom-plugins.ts
- [ ] T030 Configure CORS and security headers in backend/src/middleware/security.ts

## Phase 3.6: Integration & Performance

- [ ] T031 Integrate PostGraphile with authentication middleware (update backend/src/server.ts)
- [ ] T032 Configure query performance monitoring in backend/src/monitoring/performance.ts
- [ ] T033 Set up error handling and logging in backend/src/middleware/error-handler.ts
- [ ] T034 Configure production environment settings in backend/src/config/production.ts

## Phase 3.7: Frontend Migration & Testing

- [ ] T035 [P] Update frontend GraphQL client configuration in frontend/src/lib/graphql/client.ts
- [ ] T036 [P] Update authentication store in frontend/src/lib/stores/auth.ts
- [ ] T037 [P] End-to-end authentication test in frontend/tests/e2e/auth-flow.test.ts

## Phase 3.8: Validation & Polish

- [ ] T038 Run quickstart validation tests and performance benchmarks

## Dependencies

**Critical Path Dependencies:**

- Database Setup: T001-T003 → T007-T012 → T013-T017 → T018-T023 → T024+
- Server Setup: T004-T006 → T024 → T025-T030 → T031-T034
- Frontend: T035-T037 (can run parallel with backend after T024)

**Specific Blockers:**

- T007-T012 (database schema) blocks T013-T017 (RLS policies)
- T013-T017 (RLS policies) blocks T018-T023 (contract tests)
- T018-T023 (failing tests) blocks T024-T030 (implementation)
- T024 (PostGraphile server) blocks T031-T034 (integration)
- T024 (PostGraphile server) enables T035-T037 (frontend migration)

## Parallel Execution Examples

### Phase 3.1 Parallel Setup

```bash
# Launch T004-T006 together (different systems):
Task: "Initialize Node.js backend project with TypeScript and PostGraphile dependencies"
Task: "Configure environment variables and Docker Compose for development"
Task: "Set up Redis container for caching layer"
```

### Phase 3.2 Database Schema Parallel

```bash
# Launch T007-T009 together (different migration files):
Task: "Create core tables in database/migrations/001_create_core_tables.sql"
Task: "Create time-off and performance tables in database/migrations/002_create_hr_tables.sql"
Task: "Create JWT token composite type in database/migrations/003_create_jwt_type.sql"
```

### Phase 3.3 RLS Policies Parallel

```bash
# Launch T013-T016 together (different policy files):
Task: "Employee access policies in database/policies/employee_policies.sql"
Task: "Time-off request policies in database/policies/timeoff_policies.sql"
Task: "Compensation access policies in database/policies/compensation_policies.sql"
Task: "Department access policies in database/policies/department_policies.sql"
```

### Phase 3.4 Contract Tests Parallel

```bash
# Launch T018-T023 together (different test files):
Task: "Authentication contract test in backend/tests/contract/test_authentication_contract.test.ts"
Task: "Employee management contract test in backend/tests/contract/test_employee_management_contract.test.ts"
Task: "GraphQL schema validation test in backend/tests/contract/test_graphql_schema_contract.test.ts"
Task: "JWT token validation test in backend/tests/integration/test_jwt_validation.test.ts"
Task: "Role-based access control test in backend/tests/integration/test_rbac.test.ts"
Task: "Row-level security test in backend/tests/integration/test_rls_policies.test.ts"
```

## Validation Checklist

_GATE: All items must be checked before tasks are considered complete_

- [x] All contracts have corresponding tests (T018-T020 for 3 contracts)
- [x] All entities have implementation tasks (JWT token, roles, policies, cache, functions)
- [x] All tests come before implementation (T018-T023 before T024-T034)
- [x] Parallel tasks truly independent (different files, no shared resources)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] Database setup precedes PostGraphile configuration
- [x] Authentication and authorization implemented before frontend migration
- [x] Performance monitoring and caching integrated
- [x] Migration maintains GraphQL schema compatibility

## Notes

- **Migration Strategy**: Complete replacement of Hasura with PostGraphile (not parallel deployment)
- **TDD Enforcement**: Contract tests (T018-T023) must fail before implementation begins
- **Performance Target**: <200ms GraphQL response times with Redis caching
- **Security Focus**: PostgreSQL RLS + JWT authentication replaces Hasura permissions
- **Compatibility**: Maintain existing GraphQL schema for frontend with minimal changes
- **Environment**: Development setup includes Docker Compose for PostgreSQL and Redis
- **Testing**: Real database dependencies, no mocking for PostgreSQL/RLS validation
- **Error Handling**: Structured logging with Winston, proper GraphQL error responses
- **Caching**: Redis integration with graphile-cache for query optimization

## Success Criteria

✅ **Database Foundation**: PostgreSQL schemas, roles, RLS policies, and business logic functions  
✅ **Authentication**: JWT-based authentication with PostgreSQL role assignment  
✅ **Authorization**: Row-level security enforcing department and role-based access  
✅ **Performance**: Sub-200ms GraphQL response times with caching  
✅ **Schema Compatibility**: PostGraphile generates equivalent GraphQL schema  
✅ **Testing**: Comprehensive contract and integration test coverage  
✅ **Migration Safety**: Validated setup with quickstart guide execution  
✅ **Production Ready**: Proper logging, error handling, and performance monitoring
