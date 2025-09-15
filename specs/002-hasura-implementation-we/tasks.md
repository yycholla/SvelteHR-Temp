# Tasks: Hasura GraphQL Implementation

**Input**: Design documents from `/home/chanway/Projects/SvelteHR/specs/002-hasura-implementation-we/`
**Prerequisites**: plan.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

## Execution Flow
Migrating from GelDB to Hasura GraphQL Engine with PostgreSQL, implementing JWT authentication, real-time subscriptions, and achieving sub-200ms response times. Architecture: Web application (frontend + backend + GraphQL gateway) with three libraries: hasura-migration-lib, auth-jwt-lib, graphql-client-lib.

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Paths use web app structure: `backend/src/`, `frontend/src/`, `hasura/`

## Phase 3.1: Infrastructure Setup
- [ ] T001 Create project directory structure per plan: `hasura/`, `backend/src/`, `frontend/src/`
- [ ] T002 Initialize Docker Compose with Hasura, PostgreSQL 15+, Redis services
- [ ] T003 [P] Setup TypeScript configuration for backend with Node.js 20+ and required dependencies
- [ ] T004 [P] Setup SvelteKit project structure in `frontend/` with Urql GraphQL client
- [ ] T005 [P] Configure ESLint, Prettier, and TypeScript strict mode for all projects
- [ ] T006 Initialize Hasura CLI project in `hasura/` directory with metadata structure
- [ ] T007 [P] Setup performance monitoring with PostgreSQL pg_stat_statements extension

## Phase 3.2: Database & Schema (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### PostgreSQL Schema Tests
- [ ] T008 [P] Contract test PostgreSQL schema validation in `tests/contract/test_postgresql_schema.sql`
- [ ] T009 [P] Contract test Row-Level Security policies in `tests/contract/test_rls_policies.sql`
- [ ] T010 [P] Performance test database indexes for sub-200ms queries in `tests/performance/test_database_performance.js`
- [ ] T011 [P] Integration test database connection pooling with PgBouncer in `tests/integration/test_connection_pooling.js`

### Hasura GraphQL Schema Tests
- [ ] T012 [P] Contract test GraphQL schema introspection in `tests/contract/test_graphql_schema.js`
- [ ] T013 [P] Contract test JWT authentication integration in `tests/contract/test_jwt_auth.js`
- [ ] T014 [P] Contract test GraphQL permissions and RLS integration in `tests/contract/test_permissions.js`
- [ ] T015 [P] Performance test GraphQL query execution under 200ms in `tests/performance/test_graphql_performance.js`

### Core Entity Tests (Based on data-model.md)
- [ ] T016 [P] Contract test Users GraphQL operations in `tests/contract/test_users_graphql.js`
- [ ] T017 [P] Contract test Departments GraphQL operations in `tests/contract/test_departments_graphql.js`
- [ ] T018 [P] Contract test UserRoles GraphQL operations in `tests/contract/test_roles_graphql.js`
- [ ] T019 [P] Contract test JobInformation GraphQL operations in `tests/contract/test_job_info_graphql.js`
- [ ] T020 [P] Contract test Compensation GraphQL operations (restricted) in `tests/contract/test_compensation_graphql.js`
- [ ] T021 [P] Contract test ContactInformation GraphQL operations in `tests/contract/test_contact_info_graphql.js`

### Real-time Subscription Tests
- [ ] T022 [P] Contract test GraphQL subscriptions for employee status updates in `tests/contract/test_subscriptions_graphql.js`
- [ ] T023 [P] Performance test WebSocket subscription multiplexing in `tests/performance/test_subscription_performance.js`

## Phase 3.3: Hasura Migration Library (ONLY after tests are failing)

### hasura-migration-lib Implementation
- [ ] T024 [P] Create migration library structure in `backend/src/lib/hasura-migration/`
- [ ] T025 [P] Implement GelDB data extraction service in `backend/src/lib/hasura-migration/geldb-extractor.ts`
- [ ] T026 [P] Implement PostgreSQL data validation service in `backend/src/lib/hasura-migration/postgres-validator.ts`
- [ ] T027 [P] CLI command `--migrate-users` in `backend/src/lib/hasura-migration/cli.ts`
- [ ] T028 [P] CLI command `--migrate-departments` in `backend/src/lib/hasura-migration/cli.ts`
- [ ] T029 [P] CLI command `--validate-migration` in `backend/src/lib/hasura-migration/cli.ts`
- [ ] T030 Implement zero-downtime migration orchestrator in `backend/src/lib/hasura-migration/orchestrator.ts`
- [ ] T031 Add migration progress tracking and rollback capabilities in `backend/src/lib/hasura-migration/orchestrator.ts`

## Phase 3.4: Authentication JWT Library (ONLY after migration tests pass)

### auth-jwt-lib Implementation
- [ ] T032 [P] Create JWT authentication library in `backend/src/lib/auth-jwt/`
- [ ] T033 [P] Implement JWT token generation with Hasura claims in `backend/src/lib/auth-jwt/token-generator.ts`
- [ ] T034 [P] Implement JWT token validation service in `backend/src/lib/auth-jwt/token-validator.ts`
- [ ] T035 [P] CLI command `--generate-token` for testing in `backend/src/lib/auth-jwt/cli.ts`
- [ ] T036 [P] CLI command `--validate-token` for debugging in `backend/src/lib/auth-jwt/cli.ts`
- [ ] T037 Implement session management with refresh tokens in `backend/src/lib/auth-jwt/session-manager.ts`
- [ ] T038 Add role-based permission enforcement in `backend/src/lib/auth-jwt/session-manager.ts`
- [ ] T039 Authentication middleware for SvelteKit in `backend/src/lib/auth-jwt/middleware.ts`

## Phase 3.5: GraphQL Client Library (ONLY after auth is working)

### graphql-client-lib Implementation  
- [ ] T040 [P] Create GraphQL client library in `frontend/src/lib/graphql-client/`
- [ ] T041 [P] Configure Urql client with caching and error handling in `frontend/src/lib/graphql-client/urql-client.ts`
- [ ] T042 [P] Implement type-safe GraphQL operations generator in `frontend/src/lib/graphql-client/operations.ts`
- [ ] T043 [P] CLI command `--generate-types` from schema in `frontend/src/lib/graphql-client/cli.ts`
- [ ] T044 [P] CLI command `--test-connection` for debugging in `frontend/src/lib/graphql-client/cli.ts`
- [ ] T045 Implement subscription management with automatic reconnection in `frontend/src/lib/graphql-client/subscription-manager.ts`
- [ ] T046 Add query performance monitoring and caching strategies in `frontend/src/lib/graphql-client/subscription-manager.ts`

## Phase 3.6: Core Implementation (Database First)

### PostgreSQL Schema & Hasura Configuration
- [ ] T047 Apply PostgreSQL schema with optimized indexes in `hasura/migrations/`
- [ ] T048 Configure Hasura metadata with relationships and permissions in `hasura/metadata/`
- [ ] T049 Setup Row-Level Security policies for all entities in `hasura/migrations/`
- [ ] T050 Configure Hasura performance settings (connection pooling, query limits) in `hasura/metadata/`
- [ ] T051 Setup Redis caching integration for query performance in `hasura/metadata/`

### Authentication Backend Services
- [ ] T052 [P] Implement user registration endpoint in `backend/src/api/auth/register.ts`
- [ ] T053 [P] Implement user login endpoint with JWT generation in `backend/src/api/auth/login.ts`
- [ ] T054 [P] Implement token refresh endpoint in `backend/src/api/auth/refresh.ts`
- [ ] T055 [P] Implement password reset workflow in `backend/src/api/auth/reset.ts`
- [ ] T056 JWT webhook endpoint for Hasura authentication in `backend/src/api/auth/jwt-webhook.ts`
- [ ] T057 Session management and user profile endpoints in `backend/src/api/auth/profile.ts`

## Phase 3.7: Frontend Integration

### SvelteKit Components & Routes
- [ ] T058 [P] Employee directory component with GraphQL queries in `frontend/src/lib/components/employees/EmployeeDirectory.svelte`
- [ ] T059 [P] Department hierarchy component with real-time updates in `frontend/src/lib/components/departments/DepartmentHierarchy.svelte`
- [ ] T060 [P] User profile component with role-based access in `frontend/src/lib/components/users/UserProfile.svelte`
- [ ] T061 [P] Authentication forms (login, register) in `frontend/src/lib/components/auth/`
- [ ] T062 Employee management page with CRUD operations in `frontend/src/routes/employees/+page.svelte`
- [ ] T063 Department management page with hierarchy navigation in `frontend/src/routes/departments/+page.svelte`
- [ ] T064 Dashboard with real-time employee status in `frontend/src/routes/dashboard/+page.svelte`

### Real-time Features
- [ ] T065 [P] WebSocket subscription service for employee updates in `frontend/src/lib/services/subscription-service.ts`
- [ ] T066 [P] Real-time notification component in `frontend/src/lib/components/notifications/NotificationCenter.svelte`
- [ ] T067 Live employee status updates with subscription multiplexing in `frontend/src/lib/services/subscription-service.ts`

## Phase 3.8: Performance Optimization

### Database Performance
- [ ] T068 [P] Optimize PostgreSQL configuration for HR workload in `hasura/config/postgresql.conf`
- [ ] T069 [P] Implement database connection pooling with PgBouncer in `backend/docker/pgbouncer.ini`
- [ ] T070 [P] Add HR-specific database indexes for sub-200ms performance in `hasura/migrations/`
- [ ] T071 Query performance monitoring and alerting in `backend/src/services/performance-monitor.ts`

### GraphQL Performance  
- [ ] T072 [P] Configure Hasura query complexity and depth limits in `hasura/metadata/`
- [ ] T073 [P] Implement GraphQL query caching with Redis in `hasura/metadata/`
- [ ] T074 [P] Optimize GraphQL subscription multiplexing in `hasura/metadata/`
- [ ] T075 Frontend query optimization with Urql normalized cache in `frontend/src/lib/graphql-client/`

## Phase 3.9: Integration Testing & Validation

### End-to-End Testing
- [ ] T076 [P] Employee lifecycle integration test (hire to termination) in `tests/integration/test_employee_lifecycle.js`
- [ ] T077 [P] Department management integration test in `tests/integration/test_department_management.js` 
- [ ] T078 [P] Authentication flow integration test in `tests/integration/test_auth_flow.js`
- [ ] T079 [P] Real-time subscription integration test in `tests/integration/test_realtime_subscriptions.js`
- [ ] T080 Performance validation test for sub-200ms response times in `tests/performance/test_response_times.js`

### Security Testing
- [ ] T081 [P] Role-based access control validation in `tests/security/test_rbac.js`
- [ ] T082 [P] Row-Level Security policy validation in `tests/security/test_rls.js`
- [ ] T083 [P] JWT token security validation in `tests/security/test_jwt_security.js`
- [ ] T084 [P] Data encryption and PII protection test in `tests/security/test_data_encryption.js`

## Phase 3.10: Migration & Deployment

### Data Migration
- [ ] T085 Execute GelDB to PostgreSQL data migration with validation in `scripts/migrate-data.sh`
- [ ] T086 Verify data integrity and completeness post-migration in `scripts/verify-migration.sh`
- [ ] T087 Blue-green deployment setup for zero-downtime migration in `scripts/blue-green-deploy.sh`
- [ ] T088 Rollback procedures and contingency planning in `scripts/rollback-migration.sh`

### Production Setup
- [ ] T089 [P] Production Docker Compose configuration with security hardening in `docker/production/`
- [ ] T090 [P] Environment configuration management in `config/production/`
- [ ] T091 [P] Monitoring and alerting setup (Prometheus/Grafana) in `monitoring/`
- [ ] T092 Load testing and performance validation in production environment in `tests/load/`

## Phase 3.11: Documentation & Polish

### Library Documentation
- [ ] T093 [P] hasura-migration-lib documentation in `backend/src/lib/hasura-migration/llms.txt`
- [ ] T094 [P] auth-jwt-lib documentation in `backend/src/lib/auth-jwt/llms.txt`
- [ ] T095 [P] graphql-client-lib documentation in `frontend/src/lib/graphql-client/llms.txt`

### User Documentation
- [ ] T096 [P] API documentation with GraphQL schema examples in `docs/api.md`
- [ ] T097 [P] Deployment guide with performance tuning in `docs/deployment.md`
- [ ] T098 [P] Troubleshooting guide for common issues in `docs/troubleshooting.md`
- [ ] T099 Performance benchmarking report with sub-200ms validation in `docs/performance-report.md`
- [ ] T100 Execute complete quickstart validation from `quickstart.md`

## Dependencies

### Critical Path (Must Complete in Order)
1. **Setup** (T001-T007) → **Database Tests** (T008-T023) → **Schema Implementation** (T047-T051)
2. **Migration Tests** (T008-T011) → **Migration Library** (T024-T031) → **Data Migration** (T085-T088)
3. **Auth Tests** (T013-T014) → **Auth Library** (T032-T039) → **Auth Backend** (T052-T057)
4. **GraphQL Tests** (T012, T015-T023) → **GraphQL Client** (T040-T046) → **Frontend** (T058-T067)
5. **All Core** → **Performance Optimization** (T068-T075) → **Integration Testing** (T076-T084)

### Parallel Execution Blocks
- **Setup Phase**: T003, T004, T005, T007 (different projects)
- **Contract Tests**: T008-T023 (all different test files)  
- **Library Development**: T024-T046 (different library directories)
- **Component Development**: T058-T061 (different component files)
- **Documentation**: T093-T099 (different documentation files)

### Performance-Critical Dependencies
- T010, T015, T080 (performance tests) must validate T068-T075 (performance optimization)
- T071 (performance monitoring) blocks T092 (load testing)
- T047-T051 (schema/config) must complete before T068-T075 (optimization)

## Parallel Execution Examples

### Phase 3.2 - All Contract Tests (Run Together)
```bash
Task: "Contract test PostgreSQL schema validation in tests/contract/test_postgresql_schema.sql"
Task: "Contract test Row-Level Security policies in tests/contract/test_rls_policies.sql"  
Task: "Contract test GraphQL schema introspection in tests/contract/test_graphql_schema.js"
Task: "Contract test JWT authentication integration in tests/contract/test_jwt_auth.js"
Task: "Contract test Users GraphQL operations in tests/contract/test_users_graphql.js"
Task: "Contract test Departments GraphQL operations in tests/contract/test_departments_graphql.js"
# ... all T008-T023
```

### Phase 3.3 - Library Development (Run in Parallel by Library)
```bash
# Migration Library Tasks
Task: "Create migration library structure in backend/src/lib/hasura-migration/"
Task: "Implement GelDB data extraction service in backend/src/lib/hasura-migration/geldb-extractor.ts"
Task: "Implement PostgreSQL data validation service in backend/src/lib/hasura-migration/postgres-validator.ts"

# Auth Library Tasks (can run parallel to migration)
Task: "Create JWT authentication library in backend/src/lib/auth-jwt/"
Task: "Implement JWT token generation with Hasura claims in backend/src/lib/auth-jwt/token-generator.ts"
```

## Validation Checklist
- [x] All contracts (GraphQL schema, JWT auth) have corresponding tests
- [x] All entities (Users, Departments, Roles, etc.) have GraphQL operation tests  
- [x] All tests come before implementation (TDD enforced)
- [x] Parallel tasks truly independent (different files/directories)
- [x] Each task specifies exact file path
- [x] Performance targets (sub-200ms) validated throughout
- [x] Zero-downtime migration strategy included
- [x] Three required libraries (migration, auth, client) fully implemented

## Notes
- **[P] tasks** = Different files/directories, no dependencies, can run simultaneously
- **Performance Focus**: Sub-200ms response time validation in T010, T015, T071, T080, T092, T099
- **TDD Enforcement**: All contract tests (T008-T023) MUST fail before implementation begins
- **Library-First Architecture**: Each of 3 libraries has dedicated CLI and documentation
- **Zero Downtime**: Blue-green deployment strategy in T087 ensures business continuity
- **Security First**: RBAC, RLS, and data encryption validated throughout implementation