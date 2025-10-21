//! Mixed Workload Load Test
//!
//! Tests realistic production-like workload with a mix of queries and mutations
//! following typical user behavior patterns.
//!
//! Run with:
//! ```bash
//! cargo test --test mixed_workload_load --features test-utils -- --ignored --nocapture
//! ```

use hr_graphql_server::testing::load_testing::{
    LoadTestConfig, LoadTestOperation, RoleDistribution, run_load_test,
};
use std::time::Duration;

#[tokio::test]
#[ignore] // Load tests are expensive, run explicitly with --ignored
async fn test_realistic_mixed_workload() {
    // Configure load test with production-like read/write ratio (80/20)
    let config = LoadTestConfig::new("http://localhost:8080/graphql")
        .with_users(100) // Moderate concurrency
        .with_duration(Duration::from_secs(120)) // 2 minute test
        .with_think_time(Duration::from_millis(750)) // Realistic user pause
        .with_ramp_up(Duration::from_secs(20)) // Gradual ramp-up
        .with_role_distribution(RoleDistribution::realistic())
        // ===== QUERIES (80% of traffic) =====
        // Most common - list users (40% of total)
        .add_operation(
            LoadTestOperation::new(
                "list_users",
                r#"
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
                "#,
            )
            .with_weight(0.40),
        )
        // View user profile (20% of total)
        .add_operation(
            LoadTestOperation::new(
                "get_user_profile",
                r#"
                query {
                    user(id: "00000000-0000-0000-0000-000000000001") {
                        id
                        email
                        firstName
                        lastName
                        role
                        department {
                            id
                            name
                        }
                    }
                }
                "#,
            )
            .with_weight(0.20),
        )
        // List departments (10% of total)
        .add_operation(
            LoadTestOperation::new(
                "list_departments",
                r#"
                query {
                    departments {
                        id
                        name
                        managerId
                        employeeCount
                    }
                }
                "#,
            )
            .with_weight(0.10),
        )
        // Search users (10% of total)
        .add_operation(
            LoadTestOperation::new(
                "search_users",
                r#"
                query {
                    searchUsers(query: "test") {
                        id
                        email
                        firstName
                        lastName
                    }
                }
                "#,
            )
            .with_weight(0.10),
        )
        // ===== MUTATIONS (20% of traffic) =====
        // Update user profile (10% of total)
        .add_operation(
            LoadTestOperation::new(
                "update_user_profile",
                r#"
                mutation {
                    updateUser(
                        id: "00000000-0000-0000-0000-000000000001"
                        input: {
                            firstName: "Updated"
                            lastName: "Profile"
                        }
                    ) {
                        id
                        firstName
                        lastName
                    }
                }
                "#,
            )
            .as_mutation()
            .with_weight(0.10),
        )
        // Create user (5% of total)
        .add_operation(
            LoadTestOperation::new(
                "create_user",
                r#"
                mutation {
                    createUser(input: {
                        email: "newuser@example.com"
                        firstName: "New"
                        lastName: "User"
                        role: "hr_employee"
                    }) {
                        id
                        email
                    }
                }
                "#,
            )
            .as_mutation()
            .with_weight(0.05),
        )
        // Create department (3% of total)
        .add_operation(
            LoadTestOperation::new(
                "create_department",
                r#"
                mutation {
                    createDepartment(input: {
                        name: "New Department"
                        managerId: "00000000-0000-0000-0000-000000000001"
                    }) {
                        id
                        name
                    }
                }
                "#,
            )
            .as_mutation()
            .with_weight(0.03),
        )
        // Deactivate user (2% of total)
        .add_operation(
            LoadTestOperation::new(
                "deactivate_user",
                r#"
                mutation {
                    deactivateUser(id: "00000000-0000-0000-0000-000000000099") {
                        id
                        isActive
                    }
                }
                "#,
            )
            .as_mutation()
            .with_weight(0.02),
        );

    // Run load test
    let metrics = run_load_test(config)
        .await
        .expect("Mixed workload load test failed");

    // Print detailed summary
    metrics.print_summary();

    // Assert performance targets for mixed workload
    assert!(
        metrics.success_rate() > 0.95,
        "Mixed workload success rate should be above 95%, got {:.2}%",
        metrics.success_rate() * 100.0
    );

    assert!(
        metrics.p95_latency() < 1500.0,
        "P95 latency for mixed workload should be under 1.5 seconds, got {:.2}ms",
        metrics.p95_latency()
    );

    assert!(
        metrics.p99_latency() < 3000.0,
        "P99 latency should be under 3 seconds, got {:.2}ms",
        metrics.p99_latency()
    );

    assert!(
        metrics.throughput() > 10.0,
        "Mixed workload throughput should be above 10 req/s, got {:.2}",
        metrics.throughput()
    );
}

#[tokio::test]
#[ignore]
async fn test_employee_heavy_workload() {
    // Simulate heavy employee-role workload (typical business hours)
    let config = LoadTestConfig::new("http://localhost:8080/graphql")
        .with_users(150)
        .with_duration(Duration::from_secs(90))
        .with_think_time(Duration::from_millis(500))
        .with_ramp_up(Duration::from_secs(15))
        .with_role_distribution(
            RoleDistribution::new(
                0.90, // 90% employees
                0.05, // 5% HR managers
                0.03, // 3% admins
                0.02, // 2% system admins
            ),
        )
        .add_operation(
            LoadTestOperation::new(
                "view_own_profile",
                "query { me { id email } }",
            )
            .with_weight(0.60),
        )
        .add_operation(
            LoadTestOperation::new(
                "update_own_profile",
                r#"
                mutation {
                    updateMyProfile(input: {
                        firstName: "Updated"
                    }) { id firstName }
                }
                "#,
            )
            .as_mutation()
            .with_weight(0.40),
        );

    let metrics = run_load_test(config)
        .await
        .expect("Employee-heavy workload test failed");

    metrics.print_summary();

    assert!(
        metrics.success_rate() > 0.95,
        "Employee workload should have high success rate"
    );
}
