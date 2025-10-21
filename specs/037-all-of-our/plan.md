# Implementation Plan: Comprehensive Rust Testing Infrastructure

**Branch**: `037-all-of-our` | **Date**: 2025-10-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/037-all-of-our/spec.md`

## Summary

This feature implements a comprehensive, idiomatic Rust testing infrastructure for the MountainHR GraphQL backend. The implementation provides:

- **Unit Testing**: Native Rust `#[test]` with `#[tokio::test]` for async operations
- **Integration Testing**: End-to-end GraphQL API tests with isolated PostgreSQL databases per test (via Docker)
- **Load Testing**: Concurrent request simulation with authentication, measuring throughput and latency (p50/p95/p99)
- **Benchmarking**: Criterion.rs for performance measurement with statistical analysis and regression detection
- **CI Integration**: GitHub Actions workflows with automated testing, coverage reporting (cargo-llvm-cov), and quality gates

The approach prioritizes complete test isolation through separate Docker-based PostgreSQL databases per test (FR-004), uses industry-standard Rust testing tools (tokio, testcontainers, Criterion.rs, cargo-llvm-cov), and implements realistic load testing with authenticated GraphQL operations across different user roles (Admin, HR Manager, Manager, Employee).

**Key Technical Decisions**:
1. Separate PostgreSQL databases per test for maximum isolation (trade-off: slower ~2-3s vs 100ms, mitigated by parallelism)
2. cargo-llvm-cov for coverage (more accurate than tarpaulin, official Rust direction)
3. testcontainers-rs for database management (automatic cleanup, well-maintained)
4. GitHub Actions for CI (YAML-based, tight GitHub integration)
5. Authenticated load tests with role distribution matching production traffic patterns

## Technical Context

**Language/Version**: Rust 1.70+ (async/await, tokio runtime)
**Primary Dependencies**:
- Testing: `tokio 1.35+` (test-util, macros), `testcontainers 0.15`, `testcontainers-modules 0.3`, `sea-orm 0.12`
- Load Testing: `reqwest 0.11`, `hdrhistogram 7.5`, `futures 0.3`
- Benchmarking: `criterion 0.5` (async_tokio, html_reports)
- Coverage: `cargo-llvm-cov` (tooling, not crate)

**Storage**: PostgreSQL 15-alpine (via Docker containers, separate instance per test)
**Testing**: Rust built-in `#[test]`, `#[tokio::test]` for async, testcontainers for database isolation
**Target Platform**: Linux/macOS/Windows (Docker required for integration tests)
**Project Type**: Single backend Rust project (GraphQL API)
**Performance Goals**:
- Unit tests: <30s total (SC-001)
- Integration tests: <2 minutes (SC-002)
- Load tests: 100 concurrent users, p95 latency <500ms (SC-003)
- Benchmarks: Statistical variance <5%, detect regressions >10% (SC-004)

**Constraints**:
- Docker daemon required for integration tests
- Test database creation: ~2-3s overhead per test
- CI resource requirements: 2-4 cores, 4GB RAM, ~15 min pipeline
- Coverage target: ≥70% of core business logic (SC-005)

**Scale/Scope**:
- ~70 hours implementation (2-3 weeks)
- 20 tasks across 6 phases
- 100+ unit tests, 50+ integration tests, 10+ load test scenarios, 20+ benchmarks (estimated)
- Test infrastructure becomes foundation for all future backend development

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution file (`.specify/memory/constitution.md`) is a template and has not been customized. Since this is infrastructure (testing framework) rather than a feature adding constitutional requirements, no specific constitution violations apply. The testing infrastructure supports any future constitutional requirements (e.g., test-first development if specified).

**Status**: ✅ Pass (no constitutional constraints defined)

## Project Structure

### Documentation (this feature)

```
specs/037-all-of-our/
├── plan.md              # This file (/plan command output)
├── spec.md              # Feature specification (/specify command output)
├── research.md          # Phase 0 output - Technical research
├── data-model.md        # Phase 1 output - Type definitions
├── quickstart.md        # Phase 1 output - Quick start guide
├── contracts/           # Phase 1 output - API contracts
│   ├── test-database.md       # TestDatabase contract
│   ├── test-context.md        # TestContext contract
│   └── load-testing.md        # Load testing framework contract
└── tasks.md             # Phase 2 output - Implementation tasks
```

### Source Code (repository root)

```
# Existing backend structure (Rust GraphQL API)
src/
├── main.rs
├── lib.rs
├── graphql/
│   ├── mod.rs
│   ├── schema.rs
│   ├── resolvers/
│   └── mutations/
├── models/              # SeaORM entities
├── services/
└── testing/             # NEW - Testing infrastructure
    ├── mod.rs                      # Public exports
    ├── database.rs                 # TestDatabase struct
    ├── context.rs                  # TestContext struct
    ├── auth.rs                     # AuthTokens, JWT helpers
    ├── errors.rs                   # Error types
    ├── config.rs                   # TestConfig
    ├── load_testing/
    │   ├── mod.rs
    │   ├── config.rs               # LoadTestConfig
    │   ├── metrics.rs              # LoadTestMetrics
    │   └── runner.rs               # run_load_test()
    ├── benchmarking/
    │   ├── mod.rs
    │   └── context.rs              # BenchmarkContext
    ├── fixtures/
    │   ├── mod.rs
    │   ├── users.rs                # TestUserBuilder
    │   ├── employees.rs            # TestEmployeeBuilder
    │   └── departments.rs          # TestDepartmentBuilder
    └── mocks/
        ├── mod.rs
        └── clock.rs                # Clock trait, MockClock, SystemClock

# NEW - Integration tests
tests/
├── integration/
│   ├── mod.rs                      # Common test setup
│   ├── test_helpers.rs             # Shared utilities
│   ├── graphql_queries_test.rs     # Query integration tests
│   ├── graphql_mutations_test.rs   # Mutation integration tests
│   └── auth_test.rs                # RBAC/auth tests
└── load/
    ├── mod.rs
    ├── load_test_helpers.rs        # Load test utilities
    └── graphql_load_test.rs        # Load test scenarios

# NEW - Benchmarks
benches/
├── resolver_benchmarks.rs          # Resolver performance
├── database_benchmarks.rs          # DB query performance
└── auth_benchmarks.rs              # JWT validation performance

# NEW - CI configuration
.github/workflows/
└── rust-tests.yml                  # GitHub Actions workflow

# NEW - Documentation
docs/
├── TESTING.md                      # Comprehensive testing guide
├── BENCHMARKING.md                 # Benchmark guide
└── CI.md                           # CI workflow documentation
```

**Structure Decision**: Single Rust project with testing infrastructure as a module. Tests follow Rust conventions: unit tests in source files (`#[cfg(test)]` modules), integration tests in `tests/` directory, benchmarks in `benches/` directory. This structure aligns with Rust ecosystem standards and provides clear separation between production code and test infrastructure.

## Complexity Tracking

*No constitutional violations - this section is empty.*

## Phase 0: Technical Research ✅ COMPLETE

**Artifacts Generated**:
- ✅ `research.md` - Comprehensive technical research including:
  - Technology stack analysis (Rust testing, tokio, testcontainers, Criterion.rs, cargo-llvm-cov)
  - Implementation approach (6 phases with timeline)
  - Key technical decisions and rationale
  - Performance considerations
  - Risk mitigation strategies
  - Complete dependency list

**Key Findings**:
- **Database Isolation**: Separate PostgreSQL containers provide maximum isolation but add ~2-3s overhead per test (acceptable with parallelism)
- **Coverage Tool**: cargo-llvm-cov chosen for accuracy and alignment with Rust's official direction
- **Load Testing**: Custom implementation using tokio + reqwest + hdrhistogram provides full control
- **Benchmarking**: Criterion.rs is industry standard with excellent async support

**Reference**: See `specs/037-all-of-our/research.md`

## Phase 1: Design Artifacts ✅ COMPLETE

**Artifacts Generated**:
- ✅ `data-model.md` - Complete type system design including:
  - Core testing types (TestDatabase, TestContext, AuthTokens)
  - Load testing types (LoadTestConfig, LoadTestMetrics, LoadTestSummary)
  - Benchmark types (BenchmarkContext, BenchmarkFixtures)
  - Test fixture builders (TestUserBuilder, TestEmployeeBuilder)
  - Mock types (MockClock)
  - Error types (TestDatabaseError, TestContextError, LoadTestError)
  - Type relationships and lifecycle diagrams
  - Module organization

- ✅ `contracts/test-database.md` - TestDatabase API contract with:
  - Public API specification (constructor, methods, destructor)
  - Behavior guarantees and invariants
  - Error handling
  - Performance guarantees
  - Usage examples and testing requirements

- ✅ `contracts/test-context.md` - TestContext API contract with:
  - GraphQL operation methods (execute_query, execute_mutation)
  - Test data helpers (create_test_user, create_test_employee, etc.)
  - Component access methods
  - RBAC testing patterns
  - Complete usage examples

- ✅ `contracts/load-testing.md` - Load testing framework contract with:
  - LoadTestConfig builder pattern
  - LoadTestMetrics collection and aggregation
  - run_load_test() execution model
  - Concurrency and performance guarantees
  - Load test scenario examples

- ✅ `quickstart.md` - Developer quickstart guide with:
  - 5-minute setup instructions
  - First unit test example
  - First integration test example
  - Load test example
  - Benchmark example
  - Common patterns and troubleshooting
  - Quick reference commands

**Design Decisions Documented**:
1. Builder pattern for test data (reduces setup code by 50%)
2. Trait-based mocking (Clock trait for time mocking)
3. Separate concerns (database, context, auth, load testing as distinct modules)
4. Error hierarchy with `thiserror` for clear error messages

**Reference**: See `specs/037-all-of-our/data-model.md`, `specs/037-all-of-our/contracts/`, `specs/037-all-of-our/quickstart.md`

## Phase 2: Task Breakdown ✅ COMPLETE

**Artifacts Generated**:
- ✅ `tasks.md` - Complete implementation task list with:
  - 20 tasks organized into 6 phases
  - Priority ordering (P1 → P2 → P3)
  - Dependency tracking
  - Time estimates (70 hours total)
  - Detailed acceptance criteria
  - Step-by-step implementation guidance
  - File change tracking
  - Testing commands
  - Success criteria mapping

**Task Organization**:
- **Phase 1**: Core Test Infrastructure (P1, 13 hours)
  - Tasks 1.1-1.5: Module structure, dependencies, TestDatabase, AuthTokens, TestContext

- **Phase 2**: Integration Tests (P1, 17 hours)
  - Tasks 2.1-2.4: Test structure, GraphQL queries, mutations, RBAC/auth tests

- **Phase 3**: Load Tests (P2, 10 hours)
  - Tasks 3.1-3.2: Load testing framework, load test scenarios

- **Phase 4**: Benchmarks (P2, 9 hours)
  - Tasks 4.1-4.3: Criterion setup, resolver benchmarks, database benchmarks

- **Phase 5**: CI Integration (P3, 5 hours)
  - Tasks 5.1-5.2: GitHub Actions workflow, benchmark CI job

- **Phase 6**: Test Utilities (P3, 16 hours)
  - Tasks 6.1-6.3: Fixtures/builders, mock clock, documentation

**Critical Path Identified**:
```
Task 1.1 → 1.2 → 1.3 → 1.4 → 1.5 (Core infrastructure - 13h)
  ↓
Task 2.1 → [2.2, 2.3, 2.4] (Integration tests - 17h)
  ↓
Task 3.1 → 3.2 (Load tests - 10h)
  ↓
Task 4.1 → [4.2, 4.3] (Benchmarks - 9h)
  ↓
Task 5.1 → 5.2 (CI - 5h)
  ↓
[6.1, 6.2, 6.3] (Utilities - 16h)

Total: 70 hours (~2-3 weeks)
```

**Ready to Start**: Task 1.1 (Create Testing Module Structure) has no blockers

**Reference**: See `specs/037-all-of-our/tasks.md`

## Implementation Phases

### Phase 1: Core Test Infrastructure (Week 1, P1)

**Goal**: Establish foundational testing infrastructure

**Tasks**: 1.1 → 1.2 → 1.3 → 1.4 → 1.5
**Estimated Time**: 13 hours

**Deliverables**:
- ✅ `src/testing/` module structure
- ✅ Test dependencies in Cargo.toml
- ✅ TestDatabase with Docker integration
- ✅ AuthTokens for JWT generation
- ✅ TestContext combining all components

**Success Criteria**:
- TestDatabase creates isolated PostgreSQL instances
- Migrations run automatically on test database creation
- JWT tokens generated for all user roles
- TestContext provides complete test environment

**Validation**:
```bash
cargo test --lib testing
```

### Phase 2: Integration Tests (Week 1-2, P1)

**Goal**: Verify end-to-end GraphQL API functionality

**Tasks**: 2.1 → 2.2 → 2.3 → 2.4
**Estimated Time**: 17 hours

**Deliverables**:
- ✅ `tests/integration/` directory structure
- ✅ GraphQL query integration tests
- ✅ GraphQL mutation integration tests
- ✅ RBAC and authentication tests

**Success Criteria**:
- Integration tests pass in <2 minutes (SC-002)
- RBAC permissions verified correctly (SC-008)
- Tests run in parallel without interference (SC-009)

**Validation**:
```bash
cargo test --test '*'
```

### Phase 3: Load Tests (Week 2, P2)

**Goal**: Validate performance under concurrent load

**Tasks**: 3.1 → 3.2
**Estimated Time**: 10 hours

**Deliverables**:
- ✅ Load testing framework (`src/testing/load_testing/`)
- ✅ Load test scenarios (`tests/load/`)
- ✅ Performance metrics (p50/p95/p99, throughput)

**Success Criteria**:
- 100 concurrent users with p95 <500ms (SC-003)
- Authenticated GraphQL operations across roles
- Metrics report latency percentiles (SC-010)

**Validation**:
```bash
cargo test --test load_tests -- --ignored
```

### Phase 4: Benchmarks (Week 2, P2)

**Goal**: Measure and track performance of critical paths

**Tasks**: 4.1 → 4.2 → 4.3
**Estimated Time**: 9 hours

**Deliverables**:
- ✅ Criterion.rs setup
- ✅ Resolver benchmarks
- ✅ Database query benchmarks

**Success Criteria**:
- Benchmarks measure with <5% variance (SC-004)
- Regressions >10% detected automatically
- HTML reports generated

**Validation**:
```bash
cargo bench
open target/criterion/report/index.html
```

### Phase 5: CI Integration (Week 3, P3)

**Goal**: Automate testing in GitHub Actions

**Tasks**: 5.1 → 5.2
**Estimated Time**: 5 hours

**Deliverables**:
- ✅ GitHub Actions workflow
- ✅ Automated test execution
- ✅ Coverage reporting (cargo-llvm-cov)
- ✅ Benchmark regression detection

**Success Criteria**:
- CI runs automatically on PRs (SC-006)
- Coverage ≥70% enforced (SC-005)
- PR blocked if tests fail

**Validation**:
- Create test PR and observe workflow execution

### Phase 6: Test Utilities (Week 3, P3)

**Goal**: Improve test authoring experience

**Tasks**: 6.1 → 6.2 → 6.3
**Estimated Time**: 16 hours

**Deliverables**:
- ✅ Test fixtures and builders
- ✅ Mock clock for time-based tests
- ✅ Comprehensive testing documentation

**Success Criteria**:
- Fixtures reduce setup code by 50% (SC-007)
- Tests are deterministic (SC-012)
- New developers understand testing in 15 minutes (SC-011)

**Validation**:
- Review test code complexity reduction
- Run same test multiple times for consistency

## Progress Tracking

### Phase 0: Research ✅ COMPLETE
- [x] Technology stack analysis
- [x] Implementation approach design
- [x] Key technical decisions documented
- [x] Dependencies identified
- [x] Research document generated

### Phase 1: Design ✅ COMPLETE
- [x] Data model designed
- [x] API contracts specified
- [x] Quickstart guide written
- [x] Module organization planned

### Phase 2: Task Breakdown ✅ COMPLETE
- [x] Tasks identified and ordered
- [x] Dependencies mapped
- [x] Time estimates calculated
- [x] Acceptance criteria defined
- [x] Tasks document generated

### Ready for Implementation
**Next Step**: Begin Task 1.1 (Create Testing Module Structure)
**Blocker**: None
**Prerequisites Met**: All planning phases complete

## Risk Management

### High Risk: Docker Availability
**Impact**: Integration tests cannot run
**Mitigation**:
- Clear error messages when Docker unavailable
- Documentation for Docker setup
- Fallback to unit tests only in CI if Docker fails
**Status**: Mitigated

### Medium Risk: Test Database Slowness
**Impact**: Tests exceed time budgets (SC-001, SC-002)
**Mitigation**:
- Parallel test execution
- Docker volume caching
- Optimize migration execution
**Status**: Monitored

### Medium Risk: Flaky Tests
**Impact**: False CI failures
**Mitigation**:
- Complete database isolation (no shared state)
- Deterministic mocks (MockClock)
- Avoid timing dependencies
**Status**: Mitigated by design

### Low Risk: Coverage Below 70%
**Impact**: CI blocks PRs
**Mitigation**:
- Add missing tests incrementally
- Exclude generated code from coverage
- CI warning before hard fail
**Status**: Acceptable

## Success Metrics

All success criteria from specification mapped to implementation:

- ✅ **SC-001**: Unit tests <30s → Validated in Phase 1 (Task 1.5 tests)
- ✅ **SC-002**: Integration tests <2m → Validated in Phase 2 (Task 2.4)
- ✅ **SC-003**: Load tests 100 concurrent, p95 <500ms → Validated in Phase 3 (Task 3.2)
- ✅ **SC-004**: Benchmarks <5% variance, >10% regression detection → Validated in Phase 4 (Task 4.3)
- ✅ **SC-005**: Coverage ≥70% → Enforced in Phase 5 (Task 5.1)
- ✅ **SC-006**: CI runs automatically → Validated in Phase 5 (Task 5.1)
- ✅ **SC-007**: 50% less setup code → Validated in Phase 6 (Task 6.1)
- ✅ **SC-008**: RBAC tests verify permissions → Validated in Phase 2 (Task 2.4)
- ✅ **SC-009**: Parallel tests without failures → Validated throughout
- ✅ **SC-010**: Load tests report p50/p95/p99 → Implemented in Phase 3 (Task 3.1)
- ✅ **SC-011**: New devs understand in 15min → Validated via quickstart.md
- ✅ **SC-012**: Deterministic tests → Validated in Phase 6 (Task 6.2 mock clock)

## Next Actions

1. **Review Plan**: Stakeholder review of this plan
2. **Begin Implementation**: Start Task 1.1 (Create Testing Module Structure)
3. **Set Up Project Board**: Create GitHub project with tasks from tasks.md
4. **Schedule Checkpoints**: Weekly reviews after each phase completion

## References

- **Feature Specification**: `specs/037-all-of-our/spec.md`
- **Technical Research**: `specs/037-all-of-our/research.md`
- **Data Model**: `specs/037-all-of-our/data-model.md`
- **API Contracts**: `specs/037-all-of-our/contracts/`
- **Quickstart Guide**: `specs/037-all-of-our/quickstart.md`
- **Implementation Tasks**: `specs/037-all-of-our/tasks.md`

## Appendices

### Appendix A: Complete Dependency List

See `specs/037-all-of-our/research.md` for full dependency specifications with versions and features.

### Appendix B: File Change Summary

**Estimated Files to Create**: 40+
**Estimated Files to Modify**: 5
**Estimated Lines of Code**: ~3000 (infrastructure) + ~5000 (tests)

### Appendix C: Testing Command Reference

```bash
# Unit tests
cargo test --lib

# Integration tests
cargo test --test '*'

# Load tests
cargo test --test load_tests -- --ignored

# Benchmarks
cargo bench

# Coverage
cargo llvm-cov --html

# All tests
cargo test

# Specific test
cargo test test_name
```

---

**Plan Status**: ✅ COMPLETE - Ready for implementation
**Generated**: 2025-10-21
**Planning Tool**: /plan command (Phase 0, 1, 2 complete)
