# Technical Research: Comprehensive Rust Testing Infrastructure

**Feature**: 037-all-of-our
**Date**: 2025-10-21
**Research Phase**: Phase 0 - Technical Approach

## Executive Summary

This feature implements a comprehensive, idiomatic Rust testing infrastructure for the MountainHR GraphQL backend, including unit tests, integration tests, load tests, benchmarks, and CI integration. The approach prioritizes complete test isolation via separate PostgreSQL databases per test, uses industry-standard Rust testing tools, and integrates seamlessly with GitHub Actions for automated quality gates.

## Technical Stack Analysis

### Core Testing Framework

**Rust Built-in Testing** (`#[test]`, `#[cfg(test)]`)
- **Why**: Native Rust testing framework, zero additional dependencies
- **Use case**: Unit tests for business logic, pure functions, data transformations
- **Advantages**: Fast compilation, integrated with `cargo test`, excellent IDE support
- **Limitations**: Synchronous by default, requires tokio for async

**Tokio Test Runtime** (`#[tokio::test]`)
- **Why**: Industry standard for async Rust testing
- **Use case**: Async GraphQL resolvers, database operations, HTTP handlers
- **Advantages**: Full async/await support, compatible with production runtime
- **Dependency**: `tokio = { version = "1.x", features = ["test-util", "macros"] }`

### Integration Testing

**Test Database Isolation Strategy**
- **Approach**: Separate PostgreSQL database per test via Docker containers
- **Why chosen**: Maximum isolation, catches migration issues, no transaction limitations
- **Implementation**:
  - Use `testcontainers-rs` for ephemeral PostgreSQL containers
  - Each test gets unique database name (e.g., `test_db_<uuid>`)
  - Run all migrations via SeaORM migration CLI on each database
  - Automatic cleanup via container Drop trait

**Database Dependencies**:
```toml
[dev-dependencies]
testcontainers = "0.15"
testcontainers-modules = { version = "0.3", features = ["postgres"] }
sea-orm = { version = "0.12", features = ["sqlx-postgres", "runtime-tokio-rustls", "macros"] }
uuid = { version = "1.6", features = ["v4"] }
```

### Load Testing

**HTTP Client for Load Tests**
- **Tool**: `reqwest` with async support
- **Why**: Battle-tested, async-first, HTTP/2 support
- **Use case**: Concurrent GraphQL requests with authentication
- **Dependency**: `reqwest = { version = "0.11", features = ["json"] }`

**Async Concurrency**
- **Tool**: `tokio::spawn` + `futures::stream`
- **Why**: Native tokio concurrency primitives, excellent performance
- **Use case**: Spawn 100+ concurrent request tasks, measure latency

**Metrics Collection**
- **Tool**: `hdrhistogram` for latency percentiles
- **Why**: Industry-standard histogram implementation, accurate p50/p95/p99
- **Dependency**: `hdrhistogram = "7.5"`

### Benchmarking

**Criterion.rs**
- **Tool**: `criterion` benchmarking framework
- **Why**: Statistical rigor, regression detection, HTML reports
- **Features**:
  - Warm-up iterations
  - Statistical outlier detection
  - Comparison against baselines
  - Async benchmark support via `criterion::async_executor::FuturesExecutor`
- **Dependency**: `criterion = { version = "0.5", features = ["async_tokio", "html_reports"] }`

**Async Benchmarking**
```toml
[dev-dependencies]
criterion = { version = "0.5", features = ["async_tokio"] }
tokio = { version = "1.x", features = ["rt-multi-thread"] }
```

### Code Coverage

**cargo-llvm-cov**
- **Tool**: LLVM-based coverage instrumentation
- **Why chosen**: More accurate than tarpaulin, official Rust direction, branch coverage
- **Installation**: `cargo install cargo-llvm-cov`
- **Usage**:
  - Local: `cargo llvm-cov --html`
  - CI: `cargo llvm-cov --lcov --output-path lcov.info`
- **Reports**: HTML (local), LCOV (CI for GitHub integration)

### Test Fixtures & Mocking

**Test Data Builders**
- **Pattern**: Builder pattern for test entities
- **Example**: `TestUserBuilder::new().with_role(Role::Admin).build()`
- **Location**: `tests/fixtures/` module

**Time Mocking**
- **Tool**: Custom `Clock` trait with `MockClock` implementation
- **Why**: Allows deterministic time-based tests without external dependencies
- **Pattern**: Dependency injection via trait objects

**External Service Mocking**
- **Tool**: `mockito` for HTTP mocking
- **Why**: Mock external APIs in tests without network calls
- **Dependency**: `mockito = "1.2"`

### CI Integration

**GitHub Actions Workflow**
- **File**: `.github/workflows/rust-tests.yml`
- **Jobs**:
  1. **Unit Tests**: `cargo test --lib`
  2. **Integration Tests**: `cargo test --test '*'` (with Docker service)
  3. **Benchmarks**: `cargo bench` (regression check)
  4. **Coverage**: `cargo llvm-cov --lcov` → upload to Codecov
- **Services**: PostgreSQL container for integration tests
- **Caching**: Rust toolchain + cargo registry + target dir

## Project Structure

### Test Directory Layout

```
tests/
├── integration/
│   ├── mod.rs                    # Common test setup
│   ├── test_helpers.rs           # Shared test utilities
│   ├── graphql_queries_test.rs   # GraphQL query integration tests
│   ├── graphql_mutations_test.rs # GraphQL mutation integration tests
│   └── auth_test.rs              # Authentication/RBAC tests
├── load/
│   ├── mod.rs
│   ├── load_test_helpers.rs      # Load test utilities
│   └── graphql_load_test.rs      # Load test scenarios
└── fixtures/
    ├── mod.rs
    ├── users.rs                   # User fixtures
    ├── employees.rs               # Employee fixtures
    └── departments.rs             # Department fixtures

benches/
├── resolver_benchmarks.rs         # Resolver performance benchmarks
├── database_benchmarks.rs         # DB query benchmarks
└── auth_benchmarks.rs             # Auth/JWT benchmarks

src/
├── lib.rs
├── (existing source structure)
└── testing/                       # New module
    ├── mod.rs
    ├── test_database.rs           # TestDatabase struct (Docker setup)
    ├── test_context.rs            # TestContext (server + DB + auth)
    ├── mock_clock.rs              # Time mocking
    └── auth_helpers.rs            # JWT token generation for tests
```

### Cargo.toml Test Dependencies

```toml
[dev-dependencies]
# Core testing
tokio = { version = "1.35", features = ["test-util", "macros", "rt-multi-thread"] }
serial_test = "3.0"  # For tests that can't run in parallel

# Database testing
testcontainers = "0.15"
testcontainers-modules = { version = "0.3", features = ["postgres"] }
sea-orm = { version = "0.12", features = ["sqlx-postgres", "runtime-tokio-rustls"] }
uuid = { version = "1.6", features = ["v4"] }

# Load testing
reqwest = { version = "0.11", features = ["json"] }
hdrhistogram = "7.5"
futures = "0.3"

# Mocking
mockito = "1.2"

# Assertions
assert_matches = "1.5"
pretty_assertions = "1.4"

[dev-dependencies.criterion]
version = "0.5"
features = ["async_tokio", "html_reports"]

[[bench]]
name = "resolver_benchmarks"
harness = false

[[bench]]
name = "database_benchmarks"
harness = false

[[test]]
name = "integration_tests"
path = "tests/integration/mod.rs"

[[test]]
name = "load_tests"
path = "tests/load/mod.rs"
```

## Implementation Approach

### Phase 1: Core Test Infrastructure (P1 - Week 1)

1. **Test Database Setup**
   - Create `TestDatabase` struct using testcontainers
   - Implement migration runner
   - Implement automatic cleanup via Drop
   - Test: Verify database isolation between concurrent tests

2. **Test Context Builder**
   - Create `TestContext` with server + DB + auth
   - Implement `setup()` and `teardown()` lifecycle
   - Test: Verify clean setup/teardown

3. **Unit Tests for Existing Code**
   - Add `#[cfg(test)]` modules in source files
   - Test resolvers, validators, utilities
   - Target: 70% coverage of core logic

### Phase 2: Integration Tests (P1 - Week 1-2)

1. **GraphQL Query Tests**
   - Test employee queries with different roles
   - Test pagination, filtering, sorting
   - Verify RBAC permissions

2. **GraphQL Mutation Tests**
   - Test create/update/delete operations
   - Test validation errors
   - Test transaction rollback on errors

3. **Authentication Tests**
   - Test JWT token validation
   - Test role-based access control
   - Test unauthorized access rejection

### Phase 3: Load Tests (P2 - Week 2)

1. **Load Test Framework**
   - Create load test helpers (concurrent requests, metrics)
   - Implement latency histogram
   - Implement throughput measurement

2. **Load Test Scenarios**
   - 100 concurrent authenticated queries
   - Mixed read/write workload
   - Different user roles

### Phase 4: Benchmarks (P2 - Week 2)

1. **Criterion Setup**
   - Configure criterion with async support
   - Set up baseline storage
   - Configure regression thresholds (10%)

2. **Benchmark Suites**
   - Resolver benchmarks
   - Database query benchmarks
   - JWT validation benchmarks

### Phase 5: CI Integration (P3 - Week 3)

1. **GitHub Actions Workflow**
   - Configure test jobs
   - Set up PostgreSQL service
   - Configure cargo-llvm-cov
   - Upload coverage to Codecov

2. **PR Quality Gates**
   - Require tests pass
   - Require coverage >70%
   - Check benchmark regressions

### Phase 6: Test Utilities (P3 - Week 3)

1. **Fixtures & Builders**
   - User fixtures
   - Employee fixtures
   - Department fixtures

2. **Mocks**
   - Mock clock for time-based tests
   - Mock external services

## Key Technical Decisions

### Decision 1: Separate PostgreSQL Databases per Test

**Rationale**: Maximum isolation, catches migration bugs, no transaction limitations
**Trade-off**: Slower than transaction rollback (~2-3s per test vs ~100ms)
**Mitigation**: Run tests in parallel, optimize Docker setup

### Decision 2: cargo-llvm-cov over tarpaulin

**Rationale**: More accurate, official Rust direction, branch coverage support
**Trade-off**: Requires nightly Rust toolchain (for some features)
**Mitigation**: Use stable-compatible features, document toolchain requirements

### Decision 3: testcontainers-rs over manual Docker

**Rationale**: Automatic cleanup, version management, well-maintained
**Trade-off**: Additional dependency, Docker daemon required
**Mitigation**: Document Docker requirement, provide clear error messages

### Decision 4: Criterion.rs over custom benchmarking

**Rationale**: Statistical rigor, regression detection, industry standard
**Trade-off**: Slightly slower due to statistical analysis
**Mitigation**: Configure sample sizes appropriately

## Performance Considerations

### Test Execution Time

- **Unit tests**: <30 seconds target (SC-001)
- **Integration tests**: <2 minutes target (SC-002)
- **Load tests**: ~5 minutes (100 concurrent users, multiple scenarios)
- **Benchmarks**: ~10 minutes (statistical analysis)

### Parallelization Strategy

- Unit tests: Fully parallel (no shared state)
- Integration tests: Parallel with isolated databases
- Load tests: Sequential (measure system under load)
- Benchmarks: Sequential (accurate measurements)

### CI Resource Usage

- CPU: 2-4 cores recommended
- Memory: 4GB minimum (Docker + PostgreSQL + tests)
- Disk: ~1GB (cargo cache + Docker images)
- Time: ~15 minutes total pipeline

## Risk Mitigation

### Risk 1: Docker Not Available

**Impact**: Integration tests fail
**Mitigation**: Clear error message, fallback to manual PostgreSQL setup documentation

### Risk 2: Test Database Slowness

**Impact**: Tests exceed time budgets
**Mitigation**: Optimize Docker setup, use persistent volumes, implement caching

### Risk 3: Flaky Tests

**Impact**: False CI failures
**Mitigation**: Ensure complete test isolation, avoid timing dependencies, use deterministic mocks

### Risk 4: Coverage Drops Below 70%

**Impact**: CI blocks PRs
**Mitigation**: Add missing tests, exclude generated code from coverage

## Documentation Requirements

1. **README.md updates**: Add testing section with `cargo test` examples
2. **TESTING.md**: Comprehensive testing guide (setup, running tests, writing tests)
3. **CI.md**: GitHub Actions workflow documentation
4. **BENCHMARKING.md**: Benchmark usage and interpretation guide

## Dependencies Summary

```toml
[dev-dependencies]
# Testing framework
tokio = { version = "1.35", features = ["test-util", "macros", "rt-multi-thread"] }
serial_test = "3.0"

# Database testing
testcontainers = "0.15"
testcontainers-modules = { version = "0.3", features = ["postgres"] }
uuid = { version = "1.6", features = ["v4"] }

# Load testing
reqwest = { version = "0.11", features = ["json"] }
hdrhistogram = "7.5"
futures = "0.3"

# Benchmarking
criterion = { version = "0.5", features = ["async_tokio", "html_reports"] }

# Mocking & Assertions
mockito = "1.2"
assert_matches = "1.5"
pretty_assertions = "1.4"
```

**Tooling**:
- `cargo-llvm-cov` (install: `cargo install cargo-llvm-cov`)
- Docker (for testcontainers)
- PostgreSQL (via Docker)

## Open Questions / Future Enhancements

1. **Property-based testing** (FR-017 marked optional): Consider `proptest` or `quickcheck` for future enhancement
2. **Mutation testing**: Consider `cargo-mutants` to verify test quality
3. **Snapshot testing**: Consider `insta` for GraphQL response snapshots
4. **Performance monitoring**: Consider continuous benchmarking service (e.g., Bencher.dev)
5. **Test reporting**: Consider test result aggregation tool (e.g., allure)

## References

- [Rust Testing Docs](https://doc.rust-lang.org/book/ch11-00-testing.html)
- [Tokio Testing](https://tokio.rs/tokio/topics/testing)
- [testcontainers-rs](https://github.com/testcontainers/testcontainers-rs)
- [Criterion.rs](https://github.com/bheisler/criterion.rs)
- [cargo-llvm-cov](https://github.com/taiki-e/cargo-llvm-cov)
- [async-graphql Testing](https://async-graphql.github.io/async-graphql/en/testing.html)
