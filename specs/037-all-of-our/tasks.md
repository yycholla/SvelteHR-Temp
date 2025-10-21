# Tasks: Comprehensive Rust Testing Infrastructure

**Feature**: 037-all-of-our
**Input**: Design documents from `/specs/037-all-of-our/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions
- **Rust project**: `src/`, `tests/`, `benches/` at repository root
- Backend location: Confirm from project structure (likely `backend/` or root)

---

## Phase 1: Setup (Shared Infrastructure) ✅ COMPLETE

**Purpose**: Project initialization and basic testing structure

- [X] T001 Create testing module structure: `src/testing/mod.rs` with public exports
- [X] T002 Add dev-dependencies to `Cargo.toml`: tokio, testcontainers, serial_test, criterion, reqwest, hdrhistogram, mockito, pretty_assertions
- [X] T003 [P] Configure benches in `Cargo.toml`: `[[bench]]` section with `name = "resolver_benchmarks"`, `harness = false`
- [X] T004 [P] Create `.github/workflows/` directory for CI configuration

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core testing infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 Implement `TestDatabase` struct in `src/testing/database.rs`: Docker PostgreSQL container management with testcontainers-rs
- [ ] T006 Implement `TestDatabase::new()` method: Create ephemeral PostgreSQL container, generate unique database name
- [ ] T007 Implement `TestDatabase::run_migrations()` method: Execute SeaORM migrations from scratch on test database
- [ ] T008 Implement `TestDatabase::connection()` method: Return SeaORM `DatabaseConnection` reference
- [ ] T009 Implement `Drop` for `TestDatabase`: Automatic container cleanup when test completes
- [ ] T010 [P] Implement `AuthTokens` struct in `src/testing/auth.rs`: JWT token generation for Admin, HR Manager, Manager, Employee roles
- [ ] T011 [P] Implement `AuthTokens::generate()` method: Create valid JWT tokens for all 4 user roles
- [ ] T012 [P] Implement `AuthTokens::for_role()` method: Generate token for specific `UserRole` enum
- [ ] T013 Implement `TestContext` struct in `src/testing/context.rs`: Complete test environment (DB + schema + auth + HTTP client)
- [ ] T014 Implement `TestContext::new()` async method: Initialize TestDatabase, AuthTokens, GraphQL schema, reqwest client
- [ ] T015 Implement error types in `src/testing/errors.rs`: `TestDatabaseError`, `TestContextError`, `GraphQLError` with thiserror
- [ ] T016 [P] Create `TestConfig` in `src/testing/config.rs`: Load PostgreSQL image, pool size, timeout from environment

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Developer Runs Unit Tests Locally (Priority: P1) 🎯 MVP

**Goal**: Developers can run `cargo test` to verify GraphQL resolver correctness with clear pass/fail output

**Independent Test**: Run `cargo test --lib` and verify unit tests execute with descriptive names showing resolver test results

### Tests for User Story 1 (Write FIRST, ensure they FAIL)

- [ ] T017 [P] [US1] Unit test for `get_employee` resolver in `src/graphql/resolvers/employee.rs` module tests: Test not found error with random UUID
- [ ] T018 [P] [US1] Unit test for `get_employee` resolver success case: Create test employee, fetch by ID, assert match
- [ ] T019 [P] [US1] Unit test for `create_employee` resolver in `src/graphql/resolvers/employee.rs`: Test validation errors with invalid email
- [ ] T020 [P] [US1] Unit test for `update_employee` resolver: Test authorization failure when non-admin tries to update
- [ ] T021 [P] [US1] Unit test for async functions using `#[tokio::test]` attribute: Verify async resolver execution

### Implementation for User Story 1

- [ ] T022 [US1] Implement `TestContext::execute_query<T>()` method in `src/testing/context.rs`: Execute GraphQL queries with authentication
- [ ] T023 [US1] Implement `TestContext::execute_mutation<T>()` method: Execute GraphQL mutations with RBAC validation
- [ ] T024 [US1] Implement `TestContext::create_test_employee()` helper: Create test employee in database with fixtures
- [ ] T025 [US1] Add unit test examples to GraphQL resolver modules: `#[cfg(test)]` blocks with tokio async tests
- [ ] T026 [US1] Document unit testing patterns in `specs/037-all-of-our/quickstart.md` "Writing Your First Test" section

**Checkpoint**: At this point, User Story 1 should be fully functional - developers can run unit tests locally

---

## Phase 4: User Story 2 - Developer Runs Integration Tests for GraphQL API (Priority: P1) 🎯 MVP

**Goal**: Developers can run integration tests verifying complete GraphQL request→resolver→database→response flow with authentication

**Independent Test**: Run `cargo test --test integration_tests` and verify complete API flows execute with database isolation

### Tests for User Story 2 (Write FIRST, ensure they FAIL)

- [ ] T027 [P] [US2] Integration test in `tests/integration/graphql_queries_test.rs`: Test `employees` query with HR Manager auth token
- [ ] T028 [P] [US2] Integration test for unauthorized access: Test `employees` query without auth token, expect error
- [ ] T029 [P] [US2] Integration test for mutation with fixtures: Test `createEmployee` mutation with HR Manager role
- [ ] T030 [P] [US2] Integration test for RBAC permissions: Test Employee role cannot access HR-only queries
- [ ] T031 [P] [US2] Integration test for database isolation: Run concurrent tests, verify no state interference

### Implementation for User Story 2

- [ ] T032 [US2] Create integration test directory structure: `tests/integration/mod.rs` with common imports
- [ ] T033 [US2] Implement `TestContext::execute_raw()` method: Execute GraphQL with custom JWT token string for edge cases
- [ ] T034 [US2] Implement test data cleanup mechanism: Ensure each test database is fully isolated and dropped
- [ ] T035 [US2] Add `#[serial_test::serial]` attribute support for tests requiring serialization
- [ ] T036 [US2] Document integration testing patterns in quickstart.md "Integration Test Example" section

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - full test coverage for API

---

## Phase 5: User Story 3 - Developer Runs Async Load Tests (Priority: P2)

**Goal**: Developers can run load tests simulating 100 concurrent authenticated GraphQL requests to verify production scalability

**Independent Test**: Run `cargo test --test load_tests -- --ignored` and verify throughput/latency metrics are reported

### Tests for User Story 3 (Write FIRST, ensure they FAIL)

- [ ] T037 [P] [US3] Load test in `tests/load/graphql_load_test.rs`: Test 100 concurrent `employees` queries with mixed roles
- [ ] T038 [P] [US3] Load test for mixed read/write: Test 80% queries + 20% mutations under load
- [ ] T039 [P] [US3] Load test for authenticated operations: Test Admin, HR Manager, Manager, Employee role distribution
- [ ] T040 [P] [US3] Load test SLA validation: Assert p95 latency < 500ms, success rate > 99%

### Implementation for User Story 3

- [ ] T041 [P] [US3] Create `LoadTestConfig` struct in `src/testing/load_testing/config.rs`: Define concurrent users, duration, operations
- [ ] T042 [P] [US3] Create `LoadTestOperation` struct in `src/testing/load_testing/config.rs`: Define GraphQL query/mutation with role and weight
- [ ] T043 [P] [US3] Create `RoleDistribution` struct: Define percentage distribution of Admin/HR/Manager/Employee roles
- [ ] T044 [US3] Implement `LoadTestMetrics` struct in `src/testing/load_testing/metrics.rs`: Track requests, latency histogram, errors
- [ ] T045 [US3] Implement `LoadTestMetrics::record_success()` method: Record successful request with latency measurement
- [ ] T046 [US3] Implement `LoadTestMetrics::record_failure()` method: Record failed request with error message
- [ ] T047 [US3] Implement `LoadTestMetrics::p50_latency()`, `p95_latency()`, `p99_latency()` methods using hdrhistogram
- [ ] T048 [US3] Implement `LoadTestMetrics::throughput()` method: Calculate requests per second
- [ ] T049 [US3] Implement `LoadTestMetrics::summary()` method: Generate `LoadTestSummary` with formatted metrics
- [ ] T050 [US3] Implement `run_load_test()` function in `src/testing/load_testing/runner.rs`: Spawn concurrent tasks with tokio
- [ ] T051 [US3] Implement JWT token generation per concurrent user: Each task gets valid token for assigned role
- [ ] T052 [US3] Implement operation selection by weight: Weighted random selection of GraphQL operations
- [ ] T053 [US3] Mark load tests with `#[ignore]` attribute: Run with `-- --ignored` flag to avoid slow test in default runs
- [ ] T054 [US3] Document load testing patterns in quickstart.md "Writing a Load Test" section with 10-minute tutorial

**Checkpoint**: All load testing infrastructure complete - can simulate production traffic patterns

---

## Phase 6: User Story 4 - Developer Runs Benchmarks to Measure Performance (Priority: P2)

**Goal**: Developers can run `cargo bench` to measure resolver performance with statistical analysis and regression detection

**Independent Test**: Run `cargo bench` and verify Criterion.rs generates HTML reports showing execution times and comparisons

### Tests for User Story 4 (Write FIRST, ensure they FAIL)

- [ ] T055 [P] [US4] Benchmark in `benches/resolver_benchmarks.rs`: Benchmark `get_employee` resolver with Criterion
- [ ] T056 [P] [US4] Benchmark for database queries: Benchmark `Employee::find_by_id()` SeaORM operation
- [ ] T057 [P] [US4] Benchmark for async operations: Use `b.to_async(&rt).iter()` pattern for async resolver benchmarking
- [ ] T058 [P] [US4] Benchmark baseline: Run initial benchmark to establish performance baseline

### Implementation for User Story 4

- [ ] T059 [P] [US4] Create `BenchmarkContext` struct in `src/testing/benchmarking/context.rs`: Provide pre-loaded fixtures for benchmarking
- [ ] T060 [P] [US4] Create `BenchmarkFixtures` struct: Pre-create users, employees, departments in memory
- [ ] T061 [US4] Implement `BenchmarkContext::new()` async method: Setup test database with pre-loaded data
- [ ] T062 [US4] Implement `BenchmarkContext::random_employee()` method: Return random employee for realistic benchmarking
- [ ] T063 [US4] Configure Criterion.rs in `benches/resolver_benchmarks.rs`: Setup async tokio runtime, HTML reports
- [ ] T064 [US4] Add `criterion_group!()` and `criterion_main!()` macros: Register benchmark suite
- [ ] T065 [US4] Document benchmarking patterns in quickstart.md "Writing a Benchmark" section with 5-minute tutorial

**Checkpoint**: Benchmarking infrastructure complete - can measure and track performance over time

---

## Phase 7: User Story 5 - Developer Runs Tests in GitHub Actions CI Pipeline (Priority: P3)

**Goal**: All tests run automatically on every PR with coverage reports, blocking merge if tests fail

**Independent Test**: Create a PR and verify GitHub Actions workflow executes all test suites and reports results

### Implementation for User Story 5 (No separate tests - CI is the test)

- [ ] T066 [P] [US5] Create GitHub Actions workflow `.github/workflows/rust-tests.yml`: Define job for running tests
- [ ] T067 [P] [US5] Add unit test step: `cargo test --lib` in CI workflow
- [ ] T068 [P] [US5] Add integration test step: `cargo test --test '*'` in CI workflow
- [ ] T069 [P] [US5] Add benchmark regression check: `cargo bench -- --save-baseline main` and compare
- [ ] T070 [P] [US5] Add cargo-llvm-cov installation step: `cargo install cargo-llvm-cov` in CI
- [ ] T071 [P] [US5] Add coverage generation step: `cargo llvm-cov --lcov --output-path lcov.info`
- [ ] T072 [P] [US5] Add coverage upload step: Upload `lcov.info` to coverage service (e.g., Codecov)
- [ ] T073 [US5] Configure Docker in CI: Ensure Docker daemon is available for testcontainers
- [ ] T074 [US5] Configure PostgreSQL caching: Cache Docker images to speed up CI runs
- [ ] T075 [US5] Add failure reporting: Clear error messages when tests fail in PR checks
- [ ] T076 [US5] Document CI setup in quickstart.md "Next Steps" section

**Checkpoint**: Full CI/CD integration complete - automated quality gates enforced

---

## Phase 8: User Story 6 - Developer Uses Test Fixtures and Mocks (Priority: P3)

**Goal**: Developers can use reusable fixtures and mocks to write tests with 50% less setup code

**Independent Test**: Write a new test using shared fixtures, verify test is cleaner than manual setup

### Implementation for User Story 6 (No separate tests - fixtures ARE the test helpers)

- [ ] T077 [P] [US6] Create `TestUserBuilder` in `src/testing/fixtures/users.rs`: Builder pattern for creating test users
- [ ] T078 [P] [US6] Implement `TestUserBuilder::new()`, `with_role()`, `email()`, `build()` methods
- [ ] T079 [P] [US6] Create `TestEmployeeBuilder` in `src/testing/fixtures/employees.rs`: Builder for test employees
- [ ] T080 [P] [US6] Implement `TestEmployeeBuilder::new()`, `full_name()`, `in_department()`, `with_salary()`, `build()` methods
- [ ] T081 [P] [US6] Create `TestDepartmentBuilder` in `src/testing/fixtures/departments.rs`: Builder for test departments
- [ ] T082 [P] [US6] Create `Clock` trait in `src/testing/mocks/clock.rs`: Abstract time operations for testing
- [ ] T083 [P] [US6] Implement `SystemClock` struct: Real clock using `Utc::now()`
- [ ] T084 [P] [US6] Implement `MockClock` struct: Deterministic time with `advance()` and `set()` methods
- [ ] T085 [P] [US6] Create mock external API in `src/testing/mocks/external_api.rs`: Mockito-based HTTP mocking
- [ ] T086 [US6] Refactor existing tests to use fixtures: Update integration tests to use builders instead of manual setup
- [ ] T087 [US6] Document fixture patterns in quickstart.md "Common Patterns" section

**Checkpoint**: All test utilities complete - improved developer experience for writing tests

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, optimization, and final validation

- [ ] T088 [P] Create comprehensive testing guide `specs/037-all-of-our/TESTING.md`: Detailed documentation with examples
- [ ] T089 [P] Create benchmarking guide `specs/037-all-of-our/BENCHMARKING.md`: Performance measurement best practices
- [ ] T090 [P] Create CI integration guide `specs/037-all-of-our/CI.md`: GitHub Actions setup and troubleshooting
- [ ] T091 [P] Update project README with testing instructions: Link to quickstart.md and testing documentation
- [ ] T092 Code cleanup: Remove dead code, improve error messages, add inline documentation
- [ ] T093 Performance optimization: Optimize test database setup time, consider connection pooling
- [ ] T094 Security review: Ensure test JWT tokens are never committed, validate test isolation
- [ ] T095 Run quickstart.md validation: Follow quickstart guide end-to-end to verify all examples work

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P1 → P2 → P2 → P3 → P3)
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - May use US1 test helpers but independently testable
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Uses TestContext from US1/US2 but independently testable
- **User Story 4 (P2)**: Can start after Foundational (Phase 2) - Uses fixtures pattern similar to US6 but independently testable
- **User Story 5 (P3)**: Can start after US1-US4 complete - Integrates all test types into CI
- **User Story 6 (P3)**: Can start after Foundational (Phase 2) - Provides utilities used by US1-US4 but can be added later

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Foundation components (TestContext, TestDatabase) before GraphQL execution
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, US1 and US2 can start in parallel (both P1)
- US3 and US4 can run in parallel (both P2)
- All tests for a user story marked [P] can run in parallel
- Fixture builders in US6 marked [P] can run in parallel
- CI setup tasks in US5 marked [P] can run in parallel
- Documentation tasks in Phase 9 marked [P] can run in parallel

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T016) - CRITICAL
3. Complete Phase 3: User Story 1 - Unit Tests (T017-T026)
4. Complete Phase 4: User Story 2 - Integration Tests (T027-T036)
5. **STOP and VALIDATE**: Run `cargo test` and verify all tests pass
6. Ready for production use

### Full Implementation (All User Stories)

1. Complete Setup + Foundational → Foundation ready
2. Add US1 + US2 (P1 stories) → Test independently → Core testing complete
3. Add US3 (Load Tests, P2) → Test independently → Performance validation ready
4. Add US4 (Benchmarks, P2) → Test independently → Performance tracking ready
5. Add US5 (CI Integration, P3) → Test independently → Automated quality gates
6. Add US6 (Fixtures/Mocks, P3) → Test independently → Developer experience improved
7. Complete Phase 9: Polish

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (T001-T016)
2. Once Foundational is done:
   - **Developer A**: User Story 1 (Unit Tests, T017-T026)
   - **Developer B**: User Story 2 (Integration Tests, T027-T036)
   - **Developer C**: User Story 6 (Fixtures/Mocks, T077-T087) - can start early to help A & B
3. After US1/US2 complete:
   - **Developer A**: User Story 3 (Load Tests, T037-T054)
   - **Developer B**: User Story 4 (Benchmarks, T055-T065)
   - **Developer C**: User Story 5 (CI Integration, T066-T076)
4. Stories complete and integrate independently

---

## Estimated Time

**Total**: ~70 hours

- **Phase 1 (Setup)**: 2 hours
- **Phase 2 (Foundational)**: 16 hours (most complex, blocks everything)
- **Phase 3 (US1 - Unit Tests)**: 8 hours
- **Phase 4 (US2 - Integration Tests)**: 10 hours
- **Phase 5 (US3 - Load Tests)**: 14 hours
- **Phase 6 (US4 - Benchmarks)**: 6 hours
- **Phase 7 (US5 - CI Integration)**: 6 hours
- **Phase 8 (US6 - Fixtures/Mocks)**: 6 hours
- **Phase 9 (Polish)**: 2 hours

**Timeline**:
- **MVP (US1+US2)**: ~36 hours (1 week)
- **Full implementation**: ~70 hours (2-3 weeks)
- **With 3 developers in parallel**: ~2 weeks for full implementation

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (TDD)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Focus on P1 stories first for MVP (US1 + US2)
- US6 (Fixtures) can be implemented early to help with US1/US2 development
- Load tests (US3) marked with `#[ignore]` to avoid slow test runs by default
