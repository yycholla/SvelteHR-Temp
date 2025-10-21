# Quickstart Guide: Rust Testing Infrastructure

**Feature**: 037-all-of-our
**Audience**: Backend developers implementing and using the test infrastructure
**Time to complete**: 15-30 minutes

## Prerequisites

Before starting, ensure you have:

- ✅ Rust 1.70+ installed (`rustc --version`)
- ✅ Docker installed and running (`docker ps`)
- ✅ Cargo installed (`cargo --version`)
- ✅ Basic familiarity with async Rust and tokio
- ✅ Basic familiarity with GraphQL

## Quick Setup (5 minutes)

### 1. Install Required Tools

```bash
# Install cargo-llvm-cov for code coverage
cargo install cargo-llvm-cov

# Verify Docker is running
docker ps

# If Docker is not running, start it
# macOS: Open Docker Desktop
# Linux: sudo systemctl start docker
```

### 2. Add Test Dependencies to Cargo.toml

Add to your `Cargo.toml`:

```toml
# Optional testing dependencies (for integration tests)
[dependencies.testcontainers]
version = "0.15"
optional = true

[dependencies.testcontainers-modules]
version = "0.3"
features = ["postgres"]
optional = true

[dependencies.reqwest]
version = "0.11"
features = ["json"]
optional = true

[features]
# Feature for enabling test utilities in integration tests
test-utils = ["dep:testcontainers", "dep:testcontainers-modules", "dep:reqwest"]
default = []

[dev-dependencies]
# Core testing
tokio = { version = "1.35", features = ["test-util", "macros", "rt-multi-thread"] }
serial_test = "3.0"

# Load testing
hdrhistogram = "7.5"

# Benchmarking
criterion = { version = "0.5", features = ["async_tokio", "html_reports"] }

# Assertions & Mocking
mockito = "1.2"
assert_matches = "1.5"
pretty_assertions = "1.4"
```

### 3. Verify Setup

```bash
# Fetch dependencies
cargo fetch

# Run unit tests (built into library)
cargo test --lib --features test-utils

# Run integration tests
cargo test --test integration_tests --features test-utils

# If you see "Docker daemon is not running", start Docker
```

## Writing Your First Test (10 minutes)

### Unit Test Example

Add unit tests to your resolver files (e.g., `src/schema/query.rs`):

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::testing::{TestContext, TestUserRole};

    /// Test querying a non-existent user returns null
    #[tokio::test]
    async fn test_user_query_not_found() {
        // Arrange - Create isolated test database
        let ctx = TestContext::new()
            .await
            .expect("Failed to create test context");

        let random_id = uuid::Uuid::new_v4();

        let query = format!(
            r#"
            query {{
                user(id: "{}") {{
                    id
                    email
                }}
            }}
            "#,
            random_id
        );

        // Act - Execute GraphQL query
        let response = ctx.execute_query(&query).await;

        // Assert - Should return null for non-existent user
        let data = ctx.extract_data(&response);
        assert_eq!(data.to_string(), "{user: null}");

        // Should have no errors
        let errors = ctx.extract_errors(&response);
        assert!(errors.is_empty());
    }

    /// Test querying an existing user returns correct data
    #[tokio::test]
    async fn test_user_query_success() {
        // Arrange
        let ctx = TestContext::new()
            .await
            .expect("Failed to create test context");

        // Get pre-created test user
        let test_user = ctx.user(TestUserRole::Employee);

        let query = format!(
            r#"
            query {{
                user(id: "{}") {{
                    id
                    email
                    role
                }}
            }}
            "#,
            test_user.id
        );

        // Act
        let response = ctx.execute_query(&query).await;

        // Assert - No errors
        let errors = ctx.extract_errors(&response);
        assert!(errors.is_empty());

        // Assert - User data matches
        let data = ctx.extract_data(&response);
        let data_str = data.to_string();

        assert!(data_str.contains(&test_user.id.to_string()));
        assert!(data_str.contains(&test_user.email));
    }
}
```

**Run it:**

```bash
cargo test --lib schema::query::tests --features test-utils
```

### Integration Test Example

Create `tests/integration/graphql_queries_test.rs`:

```rust
use hr_graphql_server::testing::{TestContext, TestUserRole};
use async_graphql::Variables;
use serde_json::json;

/// Test users query with authenticated HR Manager
#[tokio::test]
async fn test_users_query_with_authentication() {
    // Arrange - Create isolated test database
    let ctx = TestContext::new()
        .await
        .expect("Failed to create test context");

    let hr_manager = ctx.user(TestUserRole::HrManager);

    let query = r#"
        query {
            users(limit: 20, offset: 0) {
                id
                email
                firstName
                lastName
                role
                isActive
            }
        }
    "#;

    // Act - Execute as HR Manager
    let response = ctx.execute_query_as(query, hr_manager).await;

    // Assert - No errors
    let errors = ctx.extract_errors(&response);
    assert!(errors.is_empty(), "Expected no errors, got: {:?}", errors);

    // Assert - Returns user list including all test users
    let data = ctx.extract_data(&response);
    let data_str = data.to_string();

    assert!(data_str.contains("users"), "Response should contain users array");

    let test_users = ctx.users();
    assert!(data_str.contains(&test_users.employee.email));
    assert!(data_str.contains(&test_users.hr_manager.email));
}

/// Test database isolation between concurrent tests
#[tokio::test]
async fn test_database_isolation_concurrent_contexts() {
    // Create two separate test contexts (two isolated databases)
    let (ctx1, ctx2) = tokio::join!(
        TestContext::new(),
        TestContext::new()
    );

    let ctx1 = ctx1.expect("Failed to create first context");
    let ctx2 = ctx2.expect("Failed to create second context");

    // Verify different database names
    assert_ne!(
        ctx1.db().database_name(),
        ctx2.db().database_name(),
        "Test contexts should have different database names"
    );

    // Each context should have its own set of test users
    let user1 = ctx1.user(TestUserRole::Employee);
    let user2 = ctx2.user(TestUserRole::Employee);

    assert_ne!(user1.id, user2.id, "Test users should have different IDs");
}
```

**Run it:**

```bash
cargo test --test integration_tests --features test-utils
```

## Running Tests (2 minutes)

### Run All Tests

```bash
# Run unit tests
cargo test --lib --features test-utils

# Run integration tests
cargo test --test integration_tests --features test-utils

# Run with output (useful for debugging)
cargo test --lib --features test-utils -- --nocapture

# Run specific test
cargo test test_users_query_with_authentication --features test-utils
```

### Run Integration Tests Only

```bash
cargo test --test integration_tests --features test-utils
```

### Run Unit Tests Only

```bash
cargo test --lib --features test-utils
```

### Run with Coverage

```bash
# Generate HTML coverage report
cargo llvm-cov --html

# Open coverage report
open target/llvm-cov/html/index.html

# Generate LCOV format (for CI)
cargo llvm-cov --lcov --output-path lcov.info
```

## Writing a Load Test (10 minutes)

Create `tests/load/graphql_load_test.rs`:

```rust
use crate::testing::load_testing::*;
use std::time::Duration;

#[tokio::test]
#[ignore]  // Mark as ignored by default (slow test)
async fn load_test_employee_queries() {
    // Define operations
    let get_employees = LoadTestOperation::new(
        "get_employees",
        r#"query { employees(limit: 50) { id fullName } }"#,
        UserRole::HRManager
    ).with_weight(0.8);  // 80% of requests

    let get_employee_detail = LoadTestOperation::new(
        "get_employee_detail",
        r#"query GetEmployee($id: ID!) {
            employee(id: $id) {
                id
                fullName
                email
                department { name }
            }
        }"#,
        UserRole::Manager
    ).with_variables(json!({ "id": "123" }))
     .with_weight(0.2);  // 20% of requests

    // Configure load test
    let config = LoadTestConfig::new()
        .with_users(100)  // 100 concurrent users
        .duration(Duration::from_secs(30))  // Run for 30 seconds
        .add_operation(get_employees)
        .add_operation(get_employee_detail)
        .with_role_distribution(RoleDistribution::realistic())
        .build();

    // Run load test
    let metrics = run_load_test(config, "http://localhost:8080/graphql")
        .await
        .unwrap();

    // Print results
    metrics.print_report();

    // Assert SLAs
    assert!(
        metrics.p95_latency() < 500,
        "p95 latency {} exceeds 500ms SLA",
        metrics.p95_latency()
    );

    assert!(
        metrics.success_rate() > 0.95,
        "Success rate {} below 95% SLA",
        metrics.success_rate()
    );
}
```

**Run it:**

```bash
# Run load tests (they're ignored by default)
cargo test --test load_tests -- --ignored

# Or run a specific load test
cargo test load_test_employee_queries -- --ignored
```

## Writing a Benchmark (5 minutes)

Create `benches/resolver_benchmarks.rs`:

```rust
use criterion::{black_box, criterion_group, criterion_main, Criterion};
use your_crate::graphql::resolvers::get_employee;
use your_crate::testing::BenchmarkContext;

fn bench_get_employee(c: &mut Criterion) {
    let rt = tokio::runtime::Runtime::new().unwrap();
    let ctx = rt.block_on(BenchmarkContext::new()).unwrap();

    c.bench_function("get_employee", |b| {
        b.to_async(&rt).iter(|| async {
            let employee_id = black_box(ctx.random_employee().id);
            get_employee(&ctx, employee_id).await.unwrap()
        });
    });
}

criterion_group!(benches, bench_get_employee);
criterion_main!(benches);
```

**Run it:**

```bash
# Run all benchmarks
cargo bench

# Run specific benchmark
cargo bench get_employee

# View HTML report
open target/criterion/report/index.html
```

## TestContext API Reference

### Creating Test Context

```rust
// Create isolated test database with schema and test users
let ctx = TestContext::new().await.expect("Failed to create test context");
```

### Accessing Test Components

```rust
// Get database connection
let conn = ctx.connection();

// Get database reference
let db = ctx.db();

// Get all test users
let test_users = ctx.users();

// Get specific test user by role
let employee = ctx.user(TestUserRole::Employee);
let hr_manager = ctx.user(TestUserRole::HrManager);
let admin = ctx.user(TestUserRole::Admin);
let system_admin = ctx.user(TestUserRole::SystemAdmin);
```

### Executing GraphQL Queries

```rust
// Execute query without authentication
let response = ctx.execute_query(query).await;

// Execute query with authentication
let user = ctx.user(TestUserRole::Admin);
let response = ctx.execute_query_as(query, user).await;

// Execute query with variables
use async_graphql::Variables;
use serde_json::json;

let variables = Variables::from_json(json!({ "id": "123" }));
let response = ctx.execute_with_variables(query, variables).await;

// Execute query with variables and authentication
let response = ctx.execute_with_variables_as(query, variables, user).await;
```

### Extracting Response Data

```rust
// Get GraphQL response data
let data = ctx.extract_data(&response);

// Get error messages
let errors = ctx.extract_errors(&response);

// Check for errors
assert!(errors.is_empty(), "Expected no errors, got: {:?}", errors);
```

### Test User Properties

```rust
let user = ctx.user(TestUserRole::Employee);

// Available fields
let id: Uuid = user.id;
let email: String = user.email.clone();  // "test_hr_employee@example.com"
let role: String = user.role.clone();    // "hr_employee"
let is_active: bool = user.is_active;    // true
let password: String = user.password.clone(); // "test_password_123"
```

## Common Patterns

### Pattern 1: Test with Pre-Created Test Users

```rust
#[tokio::test]
async fn test_query_with_different_roles() {
    let ctx = TestContext::new().await.expect("Failed to create test context");

    let query = r#"
        query {
            users(limit: 10, offset: 0) {
                id
                email
                role
            }
        }
    "#;

    // Test with different roles
    let roles = [
        TestUserRole::Employee,
        TestUserRole::HrManager,
        TestUserRole::Admin,
        TestUserRole::SystemAdmin,
    ];

    for role in roles {
        let user = ctx.user(role);
        let response = ctx.execute_query_as(query, user).await;

        let errors = ctx.extract_errors(&response);
        assert!(errors.is_empty(), "Role {:?} should be able to query users", role);
    }
}
```

### Pattern 2: Test with GraphQL Variables

```rust
use async_graphql::Variables;
use serde_json::json;

#[tokio::test]
async fn test_query_with_variables() {
    let ctx = TestContext::new().await.expect("Failed to create test context");
    let admin = ctx.user(TestUserRole::Admin);

    let query = r#"
        query GetUser($id: UUID!) {
            user(id: $id) {
                id
                email
                role
            }
        }
    "#;

    let variables = Variables::from_json(json!({
        "id": admin.id.to_string()
    }));

    let response = ctx.execute_with_variables_as(query, variables, admin).await;

    let errors = ctx.extract_errors(&response);
    assert!(errors.is_empty());
}
```

### Pattern 3: Test Database Isolation

```rust
#[tokio::test]
async fn test_concurrent_database_isolation() {
    // Create two test contexts concurrently
    let (ctx1, ctx2) = tokio::join!(
        TestContext::new(),
        TestContext::new()
    );

    let ctx1 = ctx1.expect("Failed to create context 1");
    let ctx2 = ctx2.expect("Failed to create context 2");

    // Each has isolated database
    assert_ne!(ctx1.db().database_name(), ctx2.db().database_name());

    // Each has separate test users
    let user1 = ctx1.user(TestUserRole::Employee);
    let user2 = ctx2.user(TestUserRole::Employee);
    assert_ne!(user1.id, user2.id);
}
```

## Troubleshooting

### Docker Issues

**Problem**: `Error: Docker daemon is not running`

**Solution**:
```bash
# macOS
open -a Docker

# Linux
sudo systemctl start docker

# Verify
docker ps
```

**Problem**: `Error: Permission denied while trying to connect to Docker daemon`

**Solution**:
```bash
# Add your user to docker group (Linux)
sudo usermod -aG docker $USER
newgrp docker

# Verify
docker ps
```

### Test Failures

**Problem**: `Database migration failed`

**Solution**:
1. Check migration files in `migrations/` directory
2. Verify PostgreSQL version compatibility
3. Run migrations manually: `sea-orm-cli migrate up`

**Problem**: `Tests hang indefinitely`

**Solution**:
1. Check for async deadlocks (missing `.await`)
2. Verify tokio runtime is configured: `#[tokio::test]`
3. Reduce concurrent tests: `cargo test -- --test-threads=1`

**Problem**: `Test database cleanup fails`

**Solution**:
1. Check Docker logs: `docker logs <container_id>`
2. Manual cleanup: `docker rm -f $(docker ps -aq --filter label=testcontainers)`
3. Verify disk space: `df -h`

### Coverage Issues

**Problem**: `cargo llvm-cov: command not found`

**Solution**:
```bash
cargo install cargo-llvm-cov
```

**Problem**: `Coverage report is empty`

**Solution**:
```bash
# Make sure to run tests with llvm-cov
cargo llvm-cov --html

# Not just `cargo test`
```

## Next Steps

1. **Write more tests**: Aim for 70% code coverage
2. **Set up CI**: Add GitHub Actions workflow (see `CI.md`)
3. **Add benchmarks**: Identify performance-critical paths
4. **Configure pre-commit hooks**: Run tests before committing
5. **Read full docs**: See `TESTING.md` for comprehensive guide

## Quick Reference

### Run Commands

```bash
# Unit tests
cargo test --lib --features test-utils

# Integration tests
cargo test --test integration_tests --features test-utils

# Specific test
cargo test test_user_query_success --features test-utils

# With output
cargo test --lib --features test-utils -- --nocapture

# Load tests (not yet implemented)
cargo test --test load_tests --features test-utils -- --ignored

# Benchmarks (not yet implemented)
cargo bench

# Coverage
cargo llvm-cov --lib --features test-utils --html
```

### Test Attributes

```rust
#[tokio::test]              // Async test with tokio runtime
#[test]                     // Sync unit test
#[ignore]                   // Skip by default (use --ignored)
#[serial_test::serial]      // Run serially (not parallel)
```

### Common Assertions

```rust
assert!(condition);
assert_eq!(left, right);
assert_ne!(left, right);
assert!(result.is_ok());
assert!(result.is_err());
assert_matches!(result, Ok(_));
```

## Getting Help

- **Internal docs**: `TESTING.md`, `BENCHMARKING.md`, `CI.md`
- **Rust testing docs**: https://doc.rust-lang.org/book/ch11-00-testing.html
- **Tokio testing docs**: https://tokio.rs/tokio/topics/testing
- **async-graphql testing**: https://async-graphql.github.io/async-graphql/en/testing.html
- **Criterion.rs guide**: https://bheisler.github.io/criterion.rs/book/

## Summary

You've learned how to:

✅ Set up the Rust testing infrastructure
✅ Write unit tests with `TestContext`
✅ Write integration tests for GraphQL API
✅ Write load tests for performance validation
✅ Write benchmarks for performance measurement
✅ Run tests and generate coverage reports
✅ Troubleshoot common issues

**Next**: Explore the full testing guide in `TESTING.md` or start writing tests for your features!
