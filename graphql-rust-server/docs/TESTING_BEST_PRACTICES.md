# Testing Best Practices Guide

**Project**: GraphQL Rust Server Testing Infrastructure
**Last Updated**: October 21, 2025
**Version**: 1.0

---

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Getting Started](#getting-started)
3. [Unit Testing](#unit-testing)
4. [Integration Testing](#integration-testing)
5. [Load Testing](#load-testing)
6. [Benchmarking](#benchmarking)
7. [Mutation Testing](#mutation-testing)
8. [Common Patterns](#common-patterns)
9. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)
10. [Performance Optimization](#performance-optimization)
11. [CI/CD Best Practices](#cicd-best-practices)
12. [Troubleshooting](#troubleshooting)
13. [Test Coverage Goals](#test-coverage-goals)

---

## Testing Philosophy

### Core Principles

1. **Tests Should Be Fast**: Aim for <100ms per unit test, <5s per integration test
2. **Tests Should Be Isolated**: No shared state between tests
3. **Tests Should Be Deterministic**: Same input = same output, always
4. **Tests Should Be Readable**: Clear intent, minimal setup
5. **Tests Should Be Maintainable**: Easy to update when requirements change

### Testing Pyramid

```
        /\
       /  \  Mutation Tests (Validate test quality)
      /____\
     /      \
    / Load   \ Benchmarks (Performance validation)
   /__________\
  /            \
 / Integration  \ (End-to-end flows)
/________________\
/                \
/   Unit Tests    \ (Business logic)
/__________________\
```

**Distribution**:
- 70% Unit tests (fast, isolated)
- 20% Integration tests (database, full stack)
- 10% Load tests + Benchmarks (performance, capacity)
- Mutation tests run periodically to validate test quality

---

## Getting Started

### Prerequisites

```bash
# Install dependencies
cargo build

# Verify test setup
cargo test --lib --no-run
cargo test --test integration_tests --no-run
```

### Quick Start

```bash
# Run unit tests
cargo test --lib

# Run integration tests
cargo test --test integration_tests

# Run specific test
cargo test test_user_query_success

# Run with output
cargo test -- --nocapture

# Run benchmarks
cargo bench

# Run load tests (ignored by default)
cargo test --ignored
```

### Project Structure

```
graphql-rust-server/
├── src/
│   ├── testing/              # Testing infrastructure
│   │   ├── context.rs        # TestContext (main entry point)
│   │   ├── database.rs       # TestDatabase (isolation)
│   │   ├── auth.rs           # TestUser, TestUsers
│   │   └── load_testing/     # Load testing utilities
│   └── schema/
│       └── query.rs          # Unit tests alongside code
├── tests/
│   ├── integration/          # Integration test suites
│   └── load/                 # Load test scenarios
├── benches/
│   └── resolver_benchmarks.rs # Performance benchmarks
└── docs/
    ├── TESTING_BEST_PRACTICES.md  # This file
    └── MUTATION_TESTING.md        # Mutation testing guide
```

---

## Unit Testing

### Philosophy

Unit tests verify **individual functions and methods** in isolation. They should be:
- **Fast** (<100ms each)
- **Focused** (test one thing)
- **Independent** (no external dependencies)

### Basic Pattern

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::testing::TestContext;

    #[tokio::test]
    async fn test_user_query_success() {
        // Arrange: Set up test context
        let ctx = TestContext::new().await.unwrap();
        let user = ctx.user(TestUserRole::Employee);

        // Act: Execute the operation
        let query = format!(r#"query {{ user(id: "{}") {{ id email }} }}"#, user.id);
        let response = ctx.execute_query(&query).await;

        // Assert: Verify the result
        let errors = ctx.extract_errors(&response);
        assert!(errors.is_empty(), "Expected no errors, got: {:?}", errors);

        let data = ctx.extract_data(&response);
        assert!(data["user"]["id"].as_str().is_some());
    }
}
```

### Best Practices

#### 1. Use Descriptive Test Names

```rust
// ❌ Bad: Vague test name
#[tokio::test]
async fn test_user() { ... }

// ✅ Good: Clear intent
#[tokio::test]
async fn test_user_query_returns_user_when_id_exists() { ... }

// ✅ Good: Tests error case
#[tokio::test]
async fn test_user_query_returns_null_when_id_not_found() { ... }
```

#### 2. Follow Arrange-Act-Assert Pattern

```rust
#[tokio::test]
async fn test_create_department_with_valid_data() {
    // Arrange: Set up prerequisites
    let ctx = TestContext::new().await.unwrap();
    let admin = ctx.user(TestUserRole::Admin);
    let dept_name = "Engineering";

    // Act: Perform the operation
    let mutation = format!(
        r#"mutation {{ createDepartment(name: "{}") {{ id name }} }}"#,
        dept_name
    );
    let response = ctx.execute_query_as(&mutation, admin).await;

    // Assert: Verify the outcome
    let errors = ctx.extract_errors(&response);
    assert!(errors.is_empty());

    let data = ctx.extract_data(&response);
    assert_eq!(data["createDepartment"]["name"].as_str().unwrap(), dept_name);
}
```

#### 3. Test Edge Cases

```rust
#[tokio::test]
async fn test_pagination_with_empty_result() {
    let ctx = TestContext::new().await.unwrap();

    // Delete all users first
    // ... deletion logic

    let query = r#"query { users(page: 1, pageSize: 20) { data { id } } }"#;
    let response = ctx.execute_query(query).await;

    let data = ctx.extract_data(&response);
    assert_eq!(data["users"]["data"].as_array().unwrap().len(), 0);
}

#[tokio::test]
async fn test_pagination_with_page_exceeding_total() {
    let ctx = TestContext::new().await.unwrap();

    let query = r#"query { users(page: 9999, pageSize: 20) { data { id } } }"#;
    let response = ctx.execute_query(query).await;

    let data = ctx.extract_data(&response);
    assert_eq!(data["users"]["data"].as_array().unwrap().len(), 0);
}
```

#### 4. Test Authorization

```rust
#[tokio::test]
async fn test_admin_only_operation_requires_admin_role() {
    let ctx = TestContext::new().await.unwrap();
    let employee = ctx.user(TestUserRole::Employee);

    let mutation = r#"mutation { deleteAllUsers { count } }"#;
    let response = ctx.execute_query_as(mutation, employee).await;

    let errors = ctx.extract_errors(&response);
    assert!(!errors.is_empty(), "Expected authorization error");
    assert!(errors[0]["message"].as_str().unwrap().contains("permission"));
}
```

#### 5. Use Test Helpers

```rust
// Helper function for common setup
async fn create_test_user_with_department(
    ctx: &TestContext,
    dept_name: &str
) -> (User, Department) {
    // ... creation logic
    (user, department)
}

#[tokio::test]
async fn test_department_employees_query() {
    let ctx = TestContext::new().await.unwrap();
    let (user, dept) = create_test_user_with_department(&ctx, "Sales").await;

    // Test logic using the helper
}
```

### Common Unit Test Patterns

#### Pattern 1: Not Found Error (T017)

```rust
#[tokio::test]
async fn test_entity_not_found_returns_null() {
    let ctx = TestContext::new().await.unwrap();
    let random_id = Uuid::new_v4();

    let query = format!(r#"query {{ entity(id: "{}") {{ id }} }}"#, random_id);
    let response = ctx.execute_query(&query).await;

    let data = ctx.extract_data(&response);
    assert!(data["entity"].is_null());
}
```

#### Pattern 2: Success Case (T018)

```rust
#[tokio::test]
async fn test_entity_found_returns_data() {
    let ctx = TestContext::new().await.unwrap();
    let entity = ctx.user(TestUserRole::Employee);

    let query = format!(r#"query {{ user(id: "{}") {{ id email }} }}"#, entity.id);
    let response = ctx.execute_query(&query).await;

    let errors = ctx.extract_errors(&response);
    assert!(errors.is_empty());

    let data = ctx.extract_data(&response);
    assert_eq!(data["user"]["id"].as_str().unwrap(), entity.id.to_string());
}
```

#### Pattern 3: Variables (T019)

```rust
#[tokio::test]
async fn test_query_with_variables() {
    let ctx = TestContext::new().await.unwrap();

    let query = r#"query GetUser($id: ID!) { user(id: $id) { id email } }"#;
    let variables = json!({ "id": ctx.user(TestUserRole::Employee).id });

    let response = ctx.execute_with_variables(query, variables).await;

    let errors = ctx.extract_errors(&response);
    assert!(errors.is_empty());
}
```

---

## Integration Testing

### Philosophy

Integration tests verify **complete workflows** involving multiple components:
- Database interactions
- Authentication flows
- Multi-step operations
- Cross-module dependencies

### Basic Pattern

```rust
// tests/integration/example_test.rs
use hr_graphql_server::testing::{TestContext, TestUserRole};

#[tokio::test]
async fn test_complete_user_creation_workflow() {
    // Each test gets isolated database
    let ctx = TestContext::new().await.unwrap();
    let admin = ctx.user(TestUserRole::Admin);

    // Step 1: Create department
    let dept_mutation = r#"
        mutation {
            createDepartment(name: "Engineering") {
                id
                name
            }
        }
    "#;
    let dept_response = ctx.execute_query_as(dept_mutation, admin).await;
    let dept_id = ctx.extract_data(&dept_response)["createDepartment"]["id"]
        .as_str()
        .unwrap();

    // Step 2: Create user in department
    let user_mutation = format!(
        r#"mutation {{
            createUser(
                email: "new@example.com",
                departmentId: "{}"
            ) {{
                id
                email
                department {{ id name }}
            }}
        }}"#,
        dept_id
    );
    let user_response = ctx.execute_query_as(&user_mutation, admin).await;

    // Step 3: Verify user can query their own data
    let user_id = ctx.extract_data(&user_response)["createUser"]["id"]
        .as_str()
        .unwrap();
    let query = format!(r#"query {{ user(id: "{}") {{ id email }} }}"#, user_id);
    let verify_response = ctx.execute_query(&query).await;

    assert!(ctx.extract_errors(&verify_response).is_empty());
}
```

### Best Practices

#### 1. Test Database Isolation (T031)

```rust
#[tokio::test]
async fn test_concurrent_tests_have_isolated_databases() {
    let (ctx1, ctx2) = tokio::join!(
        TestContext::new(),
        TestContext::new()
    );

    let ctx1 = ctx1.unwrap();
    let ctx2 = ctx2.unwrap();

    // Different database names
    assert_ne!(
        ctx1.db().database_name(),
        ctx2.db().database_name()
    );

    // Different user IDs
    assert_ne!(
        ctx1.user(TestUserRole::Employee).id,
        ctx2.user(TestUserRole::Employee).id
    );
}
```

#### 2. Test RBAC Across Roles (T030)

```rust
#[tokio::test]
async fn test_all_roles_can_access_public_endpoint() {
    let ctx = TestContext::new().await.unwrap();

    for role in [
        TestUserRole::Employee,
        TestUserRole::HrManager,
        TestUserRole::Admin,
        TestUserRole::SystemAdmin
    ] {
        let user = ctx.user(role);
        let query = r#"query { publicData { info } }"#;
        let response = ctx.execute_query_as(query, user).await;

        let errors = ctx.extract_errors(&response);
        assert!(
            errors.is_empty(),
            "Role {:?} should access public endpoint, got errors: {:?}",
            role,
            errors
        );
    }
}
```

#### 3. Test Multi-Step Workflows

```rust
#[tokio::test]
async fn test_employee_leave_request_approval_workflow() {
    let ctx = TestContext::new().await.unwrap();
    let employee = ctx.user(TestUserRole::Employee);
    let manager = ctx.user(TestUserRole::HrManager);

    // Step 1: Employee creates leave request
    let create_mutation = r#"
        mutation {
            createLeaveRequest(
                startDate: "2025-11-01",
                endDate: "2025-11-05",
                reason: "Vacation"
            ) {
                id
                status
            }
        }
    "#;
    let create_response = ctx.execute_query_as(create_mutation, employee).await;
    let request_id = ctx.extract_data(&create_response)["createLeaveRequest"]["id"]
        .as_str()
        .unwrap();

    assert_eq!(
        ctx.extract_data(&create_response)["createLeaveRequest"]["status"].as_str().unwrap(),
        "PENDING"
    );

    // Step 2: Manager approves request
    let approve_mutation = format!(
        r#"mutation {{ approveLeaveRequest(id: "{}") {{ id status }} }}"#,
        request_id
    );
    let approve_response = ctx.execute_query_as(&approve_mutation, manager).await;

    assert_eq!(
        ctx.extract_data(&approve_response)["approveLeaveRequest"]["status"].as_str().unwrap(),
        "APPROVED"
    );

    // Step 3: Verify employee sees approved status
    let query = format!(r#"query {{ leaveRequest(id: "{}") {{ status }} }}"#, request_id);
    let verify_response = ctx.execute_query_as(&query, employee).await;

    assert_eq!(
        ctx.extract_data(&verify_response)["leaveRequest"]["status"].as_str().unwrap(),
        "APPROVED"
    );
}
```

#### 4. Test Data Consistency

```rust
#[tokio::test]
async fn test_cascade_delete_removes_dependent_entities() {
    let ctx = TestContext::new().await.unwrap();
    let admin = ctx.user(TestUserRole::Admin);

    // Create department with users
    let dept_id = create_department_with_users(&ctx, admin).await;

    // Delete department
    let delete_mutation = format!(
        r#"mutation {{ deleteDepartment(id: "{}") {{ success }} }}"#,
        dept_id
    );
    ctx.execute_query_as(&delete_mutation, admin).await;

    // Verify dependent users were also deleted (or department_id nullified)
    let query = format!(
        r#"query {{ users(filter: {{ departmentId: "{}" }}) {{ data {{ id }} }} }}"#,
        dept_id
    );
    let response = ctx.execute_query(&query).await;

    let users = ctx.extract_data(&response)["users"]["data"].as_array().unwrap();
    assert_eq!(users.len(), 0, "Dependent users should be removed");
}
```

---

## Load Testing

### Philosophy

Load tests validate **system performance under concurrent load**:
- Throughput (requests/second)
- Latency percentiles (P50, P95, P99)
- Error rates under stress
- Capacity limits

### Basic Pattern

```rust
// tests/load/custom_scenario_load.rs
use hr_graphql_server::testing::load_testing::{
    LoadTestConfig, LoadTestOperation, RoleDistribution,
    run_load_test,
};
use std::time::Duration;

#[tokio::test]
#[ignore] // Load tests are ignored by default
async fn test_realistic_user_workflow_load() {
    let config = LoadTestConfig::new("http://localhost:8080/graphql")
        .with_users(100)
        .with_duration(Duration::from_secs(60))
        .with_think_time(Duration::from_millis(500))
        .with_ramp_up(Duration::from_secs(15))
        .with_role_distribution(RoleDistribution::realistic())
        .add_operation(
            LoadTestOperation::new(
                "list_users",
                r#"query { users(page: 1, pageSize: 20) { data { id } } }"#
            )
            .with_weight(0.40)
        )
        .add_operation(
            LoadTestOperation::new(
                "get_user",
                r#"query GetUser($id: ID!) { user(id: $id) { id email } }"#
            )
            .with_weight(0.30)
        )
        .add_operation(
            LoadTestOperation::new(
                "update_profile",
                r#"mutation UpdateProfile($data: UserInput!) {
                    updateUser(data: $data) { id }
                }"#
            )
            .with_weight(0.20)
            .as_mutation()
        );

    let metrics = run_load_test(config).await.expect("Load test failed");

    // Assert performance requirements
    assert!(
        metrics.success_rate() > 0.95,
        "Success rate should be >95%, got {:.2}%",
        metrics.success_rate() * 100.0
    );

    assert!(
        metrics.p95_latency() < 1000.0,
        "P95 latency should be <1s, got {:.0}ms",
        metrics.p95_latency()
    );

    metrics.print_summary();
}
```

### Best Practices

#### 1. Use Realistic Load Profiles

```rust
// Realistic role distribution (70% employees, 20% HR, 8% admin, 2% sysadmin)
.with_role_distribution(RoleDistribution::realistic())

// Realistic operation mix (80% reads, 20% writes)
.add_operation(read_op.with_weight(0.80))
.add_operation(write_op.with_weight(0.20))

// Realistic think time (simulate user delay)
.with_think_time(Duration::from_millis(750))

// Gradual ramp-up (avoid thundering herd)
.with_ramp_up(Duration::from_secs(20))
```

#### 2. Test Progressive Load Levels

```rust
#[tokio::test]
#[ignore]
async fn test_load_scalability() {
    for users in [10, 50, 100, 200] {
        println!("\n=== Testing with {} concurrent users ===", users);

        let config = LoadTestConfig::new("http://localhost:8080/graphql")
            .with_users(users)
            .with_duration(Duration::from_secs(30));

        let metrics = run_load_test(config).await.unwrap();

        println!(
            "Users: {}, Throughput: {:.2} req/s, P95: {:.0}ms",
            users,
            metrics.throughput(),
            metrics.p95_latency()
        );
    }
}
```

#### 3. Validate Performance Requirements

```rust
#[tokio::test]
#[ignore]
async fn test_performance_meets_sla() {
    let config = /* ... */;
    let metrics = run_load_test(config).await.unwrap();

    // SLA Requirements
    assert!(
        metrics.throughput() >= 100.0,
        "Throughput SLA: >=100 req/s (got {:.2})",
        metrics.throughput()
    );

    assert!(
        metrics.p95_latency() <= 500.0,
        "Latency SLA: P95 <=500ms (got {:.0}ms)",
        metrics.p95_latency()
    );

    assert!(
        metrics.p99_latency() <= 1000.0,
        "Latency SLA: P99 <=1s (got {:.0}ms)",
        metrics.p99_latency()
    );

    assert!(
        metrics.success_rate() >= 0.99,
        "Reliability SLA: >=99% (got {:.2}%)",
        metrics.success_rate() * 100.0
    );
}
```

#### 4. Test Error Scenarios

```rust
#[tokio::test]
#[ignore]
async fn test_graceful_degradation_under_extreme_load() {
    let config = LoadTestConfig::new("http://localhost:8080/graphql")
        .with_users(1000) // Extreme load
        .with_duration(Duration::from_secs(30));

    let metrics = run_load_test(config).await.unwrap();

    // System should degrade gracefully, not crash
    assert!(
        metrics.success_rate() > 0.80,
        "Even under extreme load, success rate should be >80%"
    );

    // Errors should be well-formed, not timeouts
    let summary = metrics.summary();
    for error in &summary.errors {
        assert!(
            !error.contains("timeout"),
            "Should handle load gracefully, not timeout"
        );
    }
}
```

### Running Load Tests

```bash
# Run specific load test
cargo test --test basic_queries_load -- --ignored --nocapture

# Run all load tests
cargo test --ignored --nocapture

# Run with custom environment
GRAPHQL_ENDPOINT=https://staging.example.com/graphql \
cargo test --test mixed_workload_load -- --ignored --nocapture
```

---

## Benchmarking

### Philosophy

Benchmarks measure **precise performance characteristics**:
- Function execution time
- Memory allocation patterns
- Regression detection
- Performance comparison

### Basic Pattern

```rust
// benches/custom_benchmarks.rs
use criterion::{black_box, criterion_group, criterion_main, Criterion};
use hr_graphql_server::testing::{TestContext, TestUserRole};
use tokio::runtime::Runtime;

fn bench_custom_query(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();
    let ctx = rt.block_on(async {
        TestContext::new().await.expect("Failed to create context")
    });

    let query = r#"query { complexOperation { result } }"#;

    c.bench_function("complex_operation", |b| {
        b.to_async(&rt).iter(|| async {
            let response = ctx.execute_query(black_box(query)).await;
            black_box(response)
        });
    });
}

criterion_group!(benches, bench_custom_query);
criterion_main!(benches);
```

### Best Practices

#### 1. Use `black_box` to Prevent Optimization

```rust
// ❌ Bad: Compiler might optimize away the query
c.bench_function("query", |b| {
    b.iter(|| {
        ctx.execute_query(query).await
    });
});

// ✅ Good: black_box prevents optimization
c.bench_function("query", |b| {
    b.iter(|| {
        let response = ctx.execute_query(black_box(query)).await;
        black_box(response)
    });
});
```

#### 2. Benchmark with Realistic Data

```rust
fn bench_pagination_with_large_dataset(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();
    let ctx = rt.block_on(async {
        let ctx = TestContext::new().await.unwrap();

        // Create 1000 test records
        for i in 0..1000 {
            create_test_record(&ctx, i).await;
        }

        ctx
    });

    let mut group = c.benchmark_group("pagination");

    for page_size in [10, 20, 50, 100] {
        group.bench_with_input(
            BenchmarkId::from_parameter(format!("page_size_{}", page_size)),
            &page_size,
            |b, &size| {
                let query = format!(
                    r#"query {{ users(page: 1, pageSize: {}) {{ data {{ id }} }} }}"#,
                    size
                );
                b.to_async(&rt).iter(|| async {
                    let response = ctx.execute_query(black_box(&query)).await;
                    black_box(response)
                });
            },
        );
    }

    group.finish();
}
```

#### 3. Compare Performance Baselines

```bash
# Save baseline
cargo bench -- --save-baseline main

# Make changes...

# Compare against baseline
cargo bench -- --baseline main

# Expected output:
# complex_operation      time:   [45.2 ms 45.8 ms 46.4 ms]
#                        change: [-2.1% +0.5% +3.2%] (no significant change)
```

#### 4. Benchmark Critical Paths

```rust
// Benchmark authentication overhead
fn bench_auth_overhead(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();
    let ctx = rt.block_on(async { TestContext::new().await.unwrap() });
    let user = ctx.user(TestUserRole::Employee);

    let query = r#"query { me { id } }"#;

    let mut group = c.benchmark_group("authentication");

    group.bench_function("unauthenticated", |b| {
        b.to_async(&rt).iter(|| async {
            let response = ctx.execute_query(black_box(query)).await;
            black_box(response)
        });
    });

    group.bench_function("authenticated", |b| {
        b.to_async(&rt).iter(|| async {
            let response = ctx.execute_query_as(black_box(query), user).await;
            black_box(response)
        });
    });

    group.finish();
}
```

### Running Benchmarks

```bash
# Run all benchmarks
cargo bench

# Run specific benchmark
cargo bench -- complex_operation

# Run with profiling
cargo bench --profile release

# Generate flamegraph
cargo flamegraph --bench resolver_benchmarks

# View HTML reports
open target/criterion/report/index.html
```

---

## Mutation Testing

### Philosophy

Mutation testing validates **test quality** by introducing code changes:
- Are tests comprehensive enough to catch bugs?
- Do tests verify actual behavior, not just implementation?
- Are there untested edge cases?

**Target**: 85-90% mutation score

### Basic Workflow

```bash
# 1. Run quick mutation test (5-10 min)
./scripts/run-mutation-tests.sh quick

# 2. View results
open mutants.out/mutants.html

# 3. Analyze missed mutants
cat mutants.out/missed.txt

# 4. Add tests for missed mutations
# ... write new tests

# 5. Re-run to verify
./scripts/run-mutation-tests.sh quick
```

### Best Practices

#### 1. Start with Critical Modules

```bash
# Focus on business logic first
./scripts/run-mutation-tests.sh quick   # schema/
./scripts/run-mutation-tests.sh auth    # auth/
./scripts/run-mutation-tests.sh models  # models/
```

#### 2. Analyze Missed Mutants

Example missed mutant:

```rust
// Original code
fn validate_email(email: &str) -> bool {
    email.contains('@') && email.len() > 5
}

// Mutation: && -> ||
// If tests still pass with this mutation, you need better tests!
```

Add comprehensive tests:

```rust
#[test]
fn test_email_validation_requires_both_conditions() {
    // Catches the && -> || mutation
    assert!(!validate_email("test"));        // No @, short
    assert!(!validate_email("t@st"));        // Has @, too short
    assert!(!validate_email("toolong"));     // No @, long enough
    assert!(validate_email("test@example")); // Valid
}
```

#### 3. Set Realistic Goals

- **Start**: 75% mutation score
- **Good**: 85% mutation score
- **Excellent**: 90%+ mutation score
- **Perfect**: 100% (rarely achievable or necessary)

#### 4. Run Regularly

```bash
# Locally before PR
./scripts/run-mutation-tests.sh quick

# CI nightly (full mode)
# Configured in .github/workflows/nightly.yml
```

#### 5. Track Trends

```bash
# Generate JSON report
./scripts/run-mutation-tests.sh json

# Compare across commits
diff old-mutants.json mutants.json
```

### Understanding Mutation Scores

**Example Output**:
```
Total mutants: 245
Caught: 220 (89.8%)
Missed: 25 (10.2%)
Unviable: 15

Mutation score: 89.8% ✓
```

**Interpretation**:
- **Caught (220)**: Tests successfully detected these mutations ✓
- **Missed (25)**: Tests didn't catch these mutations ⚠️ (needs better tests)
- **Unviable (15)**: Mutations didn't compile (excluded from score)
- **Score (89.8%)**: Excellent test quality!

---

## Common Patterns

### Pattern 1: Testing Pagination

```rust
#[tokio::test]
async fn test_pagination_returns_correct_page() {
    let ctx = TestContext::new().await.unwrap();

    // Create 50 users
    for i in 0..50 {
        create_test_user(&ctx, &format!("user{}@example.com", i)).await;
    }

    // Request page 2 with page size 20
    let query = r#"query {
        users(page: 2, pageSize: 20) {
            data { id }
            pageInfo { total page pageSize hasNextPage }
        }
    }"#;
    let response = ctx.execute_query(query).await;

    let data = ctx.extract_data(&response);
    let users = data["users"]["data"].as_array().unwrap();
    let page_info = &data["users"]["pageInfo"];

    assert_eq!(users.len(), 20);
    assert_eq!(page_info["page"].as_u64().unwrap(), 2);
    assert_eq!(page_info["total"].as_u64().unwrap(), 50);
    assert!(page_info["hasNextPage"].as_bool().unwrap());
}
```

### Pattern 2: Testing Filtering

```rust
#[tokio::test]
async fn test_filter_by_department() {
    let ctx = TestContext::new().await.unwrap();
    let admin = ctx.user(TestUserRole::Admin);

    // Create departments
    let eng_id = create_department(&ctx, admin, "Engineering").await;
    let sales_id = create_department(&ctx, admin, "Sales").await;

    // Create users in departments
    create_user_in_dept(&ctx, admin, "eng1@example.com", eng_id).await;
    create_user_in_dept(&ctx, admin, "eng2@example.com", eng_id).await;
    create_user_in_dept(&ctx, admin, "sales1@example.com", sales_id).await;

    // Query users in Engineering only
    let query = format!(
        r#"query {{
            users(filter: {{ departmentId: "{}" }}) {{
                data {{ id email }}
            }}
        }}"#,
        eng_id
    );
    let response = ctx.execute_query(&query).await;

    let users = ctx.extract_data(&response)["users"]["data"].as_array().unwrap();
    assert_eq!(users.len(), 2);

    for user in users {
        let email = user["email"].as_str().unwrap();
        assert!(email.starts_with("eng"));
    }
}
```

### Pattern 3: Testing Sorting

```rust
#[tokio::test]
async fn test_sort_users_by_email_descending() {
    let ctx = TestContext::new().await.unwrap();

    let query = r#"query {
        users(sortBy: "email", sortOrder: "DESC") {
            data { email }
        }
    }"#;
    let response = ctx.execute_query(query).await;

    let users = ctx.extract_data(&response)["users"]["data"].as_array().unwrap();
    let emails: Vec<_> = users.iter()
        .map(|u| u["email"].as_str().unwrap())
        .collect();

    // Verify descending order
    for i in 0..emails.len() - 1 {
        assert!(
            emails[i] >= emails[i + 1],
            "Emails not in descending order: {} < {}",
            emails[i],
            emails[i + 1]
        );
    }
}
```

### Pattern 4: Testing Nested Queries

```rust
#[tokio::test]
async fn test_nested_relationships() {
    let ctx = TestContext::new().await.unwrap();

    let query = r#"query {
        user(id: "123") {
            id
            email
            department {
                id
                name
                manager {
                    id
                    email
                }
            }
        }
    }"#;
    let response = ctx.execute_query(query).await;

    let data = ctx.extract_data(&response);
    assert!(data["user"]["department"]["manager"]["email"].is_string());
}
```

### Pattern 5: Testing Error Handling

```rust
#[tokio::test]
async fn test_validation_error_for_invalid_email() {
    let ctx = TestContext::new().await.unwrap();
    let admin = ctx.user(TestUserRole::Admin);

    let mutation = r#"mutation {
        createUser(email: "invalid-email") {
            id
        }
    }"#;
    let response = ctx.execute_query_as(mutation, admin).await;

    let errors = ctx.extract_errors(&response);
    assert!(!errors.is_empty());
    assert!(errors[0]["message"].as_str().unwrap().contains("email"));
}
```

---

## Anti-Patterns to Avoid

### ❌ Anti-Pattern 1: Shared Test State

```rust
// ❌ BAD: Shared mutable state between tests
static mut GLOBAL_COUNTER: i32 = 0;

#[tokio::test]
async fn test_a() {
    unsafe { GLOBAL_COUNTER += 1; }
    assert_eq!(unsafe { GLOBAL_COUNTER }, 1); // Flaky!
}

#[tokio::test]
async fn test_b() {
    unsafe { GLOBAL_COUNTER += 1; }
    assert_eq!(unsafe { GLOBAL_COUNTER }, 1); // Flaky!
}
```

```rust
// ✅ GOOD: Each test creates isolated context
#[tokio::test]
async fn test_a() {
    let ctx = TestContext::new().await.unwrap(); // Isolated DB
    // Test logic
}

#[tokio::test]
async fn test_b() {
    let ctx = TestContext::new().await.unwrap(); // Different isolated DB
    // Test logic
}
```

### ❌ Anti-Pattern 2: Testing Implementation Details

```rust
// ❌ BAD: Testing internal implementation
#[tokio::test]
async fn test_user_service_calls_database_exactly_once() {
    let mut mock_db = MockDatabase::new();
    mock_db.expect_query().times(1).returning(|_| Ok(vec![]));
    // This breaks when refactoring, even if behavior is correct
}
```

```rust
// ✅ GOOD: Testing behavior/contract
#[tokio::test]
async fn test_get_user_returns_user_data_when_exists() {
    let ctx = TestContext::new().await.unwrap();
    let user = ctx.user(TestUserRole::Employee);

    let query = format!(r#"query {{ user(id: "{}") {{ id email }} }}"#, user.id);
    let response = ctx.execute_query(&query).await;

    // Test the behavior, not how it's implemented
    assert!(ctx.extract_errors(&response).is_empty());
}
```

### ❌ Anti-Pattern 3: Overly Complex Test Setup

```rust
// ❌ BAD: 50 lines of setup for 1 assertion
#[tokio::test]
async fn test_complex_scenario() {
    let ctx = TestContext::new().await.unwrap();
    let dept1 = create_department(...).await;
    let dept2 = create_department(...).await;
    let user1 = create_user(...).await;
    let user2 = create_user(...).await;
    // ... 40 more lines of setup

    assert_eq!(some_value, expected); // What are we actually testing?
}
```

```rust
// ✅ GOOD: Extract setup into helper functions
async fn setup_org_structure(ctx: &TestContext) -> OrgStructure {
    // Complex setup logic
}

#[tokio::test]
async fn test_org_query() {
    let ctx = TestContext::new().await.unwrap();
    let org = setup_org_structure(&ctx).await;

    // Clear test intent
    let response = ctx.execute_query(ORG_QUERY).await;
    assert!(ctx.extract_errors(&response).is_empty());
}
```

### ❌ Anti-Pattern 4: Ignoring Test Failures

```rust
// ❌ BAD: Commenting out failing tests
// #[tokio::test]
// async fn test_important_feature() {
//     // This test fails, so I commented it out
// }
```

```rust
// ✅ GOOD: Fix the test or mark as known issue
#[tokio::test]
#[ignore = "TODO: Fix after refactoring auth system (issue #123)"]
async fn test_important_feature() {
    // Test remains visible and trackable
}
```

### ❌ Anti-Pattern 5: Non-Deterministic Tests

```rust
// ❌ BAD: Test depends on current time
#[tokio::test]
async fn test_user_age() {
    let user = create_user_born_in(1990).await;
    assert_eq!(user.age(), 35); // Fails in 2026!
}
```

```rust
// ✅ GOOD: Use fixed reference point
#[tokio::test]
async fn test_user_age_calculation() {
    let birth_year = 1990;
    let reference_year = 2025;
    let expected_age = reference_year - birth_year;

    let user = create_user_born_in(birth_year).await;
    assert_eq!(user.age_at_year(reference_year), expected_age);
}
```

---

## Performance Optimization

### Test Execution Speed

#### 1. Parallel Test Execution

```bash
# Default: Tests run in parallel
cargo test

# Sequential (slower, but more stable for debugging)
cargo test -- --test-threads=1

# Custom parallelism
cargo test -- --test-threads=4
```

#### 2. Optimize TestContext Creation

```rust
// TestContext creation is the slowest part (2-4 seconds)
// Reuse context when possible within a test

#[tokio::test]
async fn test_multiple_queries() {
    let ctx = TestContext::new().await.unwrap(); // Only create once

    // Run multiple queries on same context
    let response1 = ctx.execute_query(QUERY_1).await;
    let response2 = ctx.execute_query(QUERY_2).await;
    let response3 = ctx.execute_query(QUERY_3).await;

    // Assertions...
}
```

#### 3. Use Lazy Initialization for Benchmarks

```rust
// Reuse context across benchmark iterations
fn bench_query(c: &mut Criterion) {
    let rt = Runtime::new().unwrap();

    // Create context once, outside benchmark loop
    let ctx = rt.block_on(async {
        TestContext::new().await.unwrap()
    });

    c.bench_function("query", |b| {
        b.to_async(&rt).iter(|| async {
            // Only benchmark the query, not context creation
            ctx.execute_query(QUERY).await
        });
    });
}
```

#### 4. Skip Slow Tests in Development

```rust
#[tokio::test]
#[ignore = "slow test, run with --ignored"]
async fn test_large_dataset_processing() {
    // Test that takes >10 seconds
}
```

```bash
# Fast tests only (skip ignored)
cargo test

# Run slow tests explicitly
cargo test -- --ignored

# Run all tests
cargo test -- --include-ignored
```

### Database Performance

#### 1. Connection Pooling

```rust
// TestDatabase uses connection pooling by default
// Pool size: 5 connections per test context
```

#### 2. Batch Operations

```rust
// ❌ Slow: Individual inserts
for i in 0..1000 {
    create_user(&ctx, &format!("user{}@example.com", i)).await;
}

// ✅ Fast: Batch insert
let users: Vec<_> = (0..1000)
    .map(|i| format!("user{}@example.com", i))
    .collect();
batch_create_users(&ctx, users).await;
```

#### 3. Minimize Migrations

```rust
// Migrations run once per TestContext creation
// This is unavoidable but optimized by testcontainers
```

---

## CI/CD Best Practices

### GitHub Actions Integration

#### 1. Run Tests on Every PR

```yaml
# .github/workflows/ci.yml
on:
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - run: cargo test --lib
      - run: cargo test --test integration_tests
```

#### 2. Run Benchmarks on Performance PRs

```yaml
# .github/workflows/benchmark.yml
on:
  pull_request:
    paths:
      - 'src/schema/**'
      - 'benches/**'

jobs:
  benchmark:
    steps:
      - run: cargo bench
      - uses: benchmark-action/github-action-benchmark@v1
```

#### 3. Nightly Comprehensive Tests

```yaml
# .github/workflows/nightly.yml
on:
  schedule:
    - cron: '0 2 * * *'  # 2 AM daily

jobs:
  comprehensive:
    steps:
      - run: cargo test --all-features
      - run: cargo test --ignored  # Load tests
      - run: ./scripts/run-mutation-tests.sh quick
```

#### 4. Fail Fast on Critical Errors

```yaml
jobs:
  test:
    strategy:
      fail-fast: true
    steps:
      - run: cargo fmt --check
      - run: cargo clippy -- -D warnings
      - run: cargo test
```

### Pre-Commit Hooks

```bash
# .git/hooks/pre-commit
#!/bin/bash
set -e

echo "Running pre-commit checks..."

# Format check
cargo fmt --all -- --check

# Lint check
cargo clippy --all-targets --all-features -- -D warnings

# Quick tests
cargo test --lib --quiet

echo "✓ Pre-commit checks passed"
```

### Coverage Requirements

```yaml
# .github/workflows/ci.yml
- name: Code Coverage
  run: |
    cargo tarpaulin --out Xml
    bash <(curl -s https://codecov.io/bash)

# Fail if coverage drops
- name: Coverage Check
  run: |
    COVERAGE=$(cargo tarpaulin --out Json | jq '.coverage')
    if (( $(echo "$COVERAGE < 80" | bc -l) )); then
      echo "Coverage below 80%: $COVERAGE"
      exit 1
    fi
```

---

## Troubleshooting

### Common Issues

#### Issue 1: Tests Timeout

**Symptom**: Tests hang indefinitely

**Causes**:
- Database container failed to start
- Deadlock in test code
- Network connectivity issues

**Solutions**:

```bash
# Check Docker status
docker ps

# Increase timeout
RUST_TEST_TIMEOUT=300 cargo test

# Run with verbose output
cargo test -- --nocapture

# Check for deadlocks
RUST_LOG=debug cargo test 2>&1 | grep -i "deadlock"
```

#### Issue 2: Flaky Tests

**Symptom**: Tests pass/fail randomly

**Causes**:
- Race conditions
- Non-deterministic ordering
- Time-dependent logic

**Solutions**:

```rust
// ❌ Flaky: Depends on timing
tokio::time::sleep(Duration::from_millis(100)).await;
assert!(condition_met());

// ✅ Reliable: Wait with timeout
tokio::time::timeout(
    Duration::from_secs(5),
    wait_for_condition()
).await.unwrap();
```

#### Issue 3: Database Connection Errors

**Symptom**: "connection refused" or "max connections"

**Solutions**:

```bash
# Check PostgreSQL container
docker ps | grep postgres

# Restart Docker
docker restart $(docker ps -q --filter ancestor=postgres:15-alpine)

# Check connection pool settings
# In src/testing/config.rs, increase max_connections
```

#### Issue 4: Out of Memory

**Symptom**: Tests fail with OOM errors

**Solutions**:

```bash
# Reduce test parallelism
cargo test -- --test-threads=2

# Run tests sequentially
cargo test -- --test-threads=1

# Increase Docker memory limit
docker update --memory=4g <container-id>
```

#### Issue 5: Slow Test Suite

**Symptom**: Tests take >5 minutes

**Solutions**:

```bash
# Profile test execution
cargo test -- --nocapture --test-threads=1 | ts -s

# Identify slow tests
cargo test -- --nocapture 2>&1 | grep -E "test .* \.\.\. ok|FAILED" | sort -k3 -h

# Run only fast tests
cargo test --lib
```

### Debugging Techniques

#### 1. Enable Debug Logging

```bash
RUST_LOG=debug cargo test -- --nocapture
```

#### 2. Run Single Test

```bash
cargo test test_name -- --exact --nocapture
```

#### 3. Use `dbg!` Macro

```rust
#[tokio::test]
async fn test_debug() {
    let ctx = TestContext::new().await.unwrap();
    let response = ctx.execute_query(QUERY).await;

    dbg!(&response); // Print response structure

    let data = ctx.extract_data(&response);
    dbg!(&data); // Print extracted data
}
```

#### 4. Inspect Test Database

```rust
#[tokio::test]
async fn test_inspect_db() {
    let ctx = TestContext::new().await.unwrap();

    // Print database name
    println!("DB: {}", ctx.db().database_name());

    // Keep test alive to inspect database
    tokio::time::sleep(Duration::from_secs(300)).await;
}
```

```bash
# Connect to test database
docker exec -it <container-id> psql -U postgres -d <db-name>
```

---

## Test Coverage Goals

### Coverage Targets

| Category | Target | Current |
|----------|--------|---------|
| Unit Tests | 80%+ | ~85% |
| Integration Tests | 70%+ | ~75% |
| Business Logic | 90%+ | ~90% |
| Mutation Score | 85-90% | TBD |

### Measuring Coverage

```bash
# Install tarpaulin
cargo install cargo-tarpaulin

# Generate coverage report
cargo tarpaulin --out Html --output-dir coverage

# Open report
open coverage/index.html

# CI-friendly output
cargo tarpaulin --out Xml
```

### Coverage by Module

```bash
# Coverage for specific module
cargo tarpaulin --lib --exclude-files tests/* -- --test-threads=1

# Focus on critical paths
cargo tarpaulin --packages hr-graphql-server -- schema auth models
```

### Improving Coverage

#### 1. Identify Uncovered Lines

```bash
cargo tarpaulin --out Html
# Review coverage/index.html for red (uncovered) lines
```

#### 2. Add Tests for Uncovered Code

```rust
// If coverage shows this line is never tested:
if user.is_admin() {
    return Ok(AdminAccess::Granted);
}

// Add test:
#[tokio::test]
async fn test_admin_access_granted_for_admin_users() {
    let ctx = TestContext::new().await.unwrap();
    let admin = ctx.user(TestUserRole::Admin);

    let result = check_admin_access(&admin).await;
    assert!(matches!(result, Ok(AdminAccess::Granted)));
}
```

#### 3. Test Error Paths

```rust
// Ensure error paths are tested
#[tokio::test]
async fn test_invalid_input_returns_error() {
    // Force error condition
    let result = function_under_test(invalid_input).await;
    assert!(result.is_err());
}
```

---

## Summary

### Quick Reference

| Task | Command |
|------|---------|
| Unit tests | `cargo test --lib` |
| Integration tests | `cargo test --test integration_tests` |
| Load tests | `cargo test --ignored` |
| Benchmarks | `cargo bench` |
| Mutation tests | `./scripts/run-mutation-tests.sh quick` |
| Coverage | `cargo tarpaulin --out Html` |
| Format | `cargo fmt` |
| Lint | `cargo clippy` |

### Key Takeaways

1. ✅ **Write tests first** (TDD approach)
2. ✅ **Keep tests fast** (<100ms unit, <5s integration)
3. ✅ **Ensure isolation** (TestContext per test)
4. ✅ **Test behavior, not implementation**
5. ✅ **Use descriptive names** (intent clear from name)
6. ✅ **Follow AAA pattern** (Arrange, Act, Assert)
7. ✅ **Run tests frequently** (pre-commit, CI/CD)
8. ✅ **Track coverage** (aim for 80%+)
9. ✅ **Validate test quality** (mutation testing 85-90%)
10. ✅ **Document patterns** (this guide!)

### Resources

- **Quickstart Guide**: `specs/037-all-of-our/quickstart.md`
- **Mutation Testing**: `docs/MUTATION_TESTING.md`
- **CI/CD Workflows**: `.github/workflows/README.md`
- **Implementation Summary**: `TESTING_IMPLEMENTATION_SUMMARY.md`

---

**Last Updated**: October 21, 2025
**Maintained By**: GraphQL Rust Server Team
**Questions?**: Open an issue or contact the team
