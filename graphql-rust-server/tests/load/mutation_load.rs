//! Mutation Load Test
//!
//! Tests write operations (mutations) under load to validate database
//! performance and transaction handling.
//!
//! Run with:
//! ```bash
//! cargo test --test mutation_load --features test-utils -- --ignored --nocapture
//! ```

use hr_graphql_server::testing::load_testing::{
    run_load_test, LoadTestConfig, LoadTestOperation, RoleDistribution,
};
use std::time::Duration;

#[tokio::test]
#[ignore] // Load tests are expensive, run explicitly with --ignored
async fn test_mutation_load() {
    // Configure load test with mutation-heavy workload
    let config = LoadTestConfig::new("http://localhost:8080/graphql")
        .with_users(20) // Lower concurrency for mutations
        .with_duration(Duration::from_secs(60))
        .with_think_time(Duration::from_secs(1)) // Longer think time for mutations
        .with_ramp_up(Duration::from_secs(5))
        .with_role_distribution(RoleDistribution::realistic())
        // Create user mutation (40% weight)
        .add_operation(
            LoadTestOperation::new(
                "create_user",
                r#"
                mutation {
                    createUser(input: {
                        email: "loadtest@example.com"
                        firstName: "Load"
                        lastName: "Test"
                        role: "hr_employee"
                    }) {
                        id
                        email
                    }
                }
                "#,
            )
            .as_mutation()
            .with_weight(0.40),
        )
        // Update user mutation (30% weight)
        .add_operation(
            LoadTestOperation::new(
                "update_user",
                r#"
                mutation {
                    updateUser(
                        id: "00000000-0000-0000-0000-000000000001"
                        input: {
                            firstName: "Updated"
                            lastName: "Name"
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
            .with_weight(0.30),
        )
        // Create department mutation (20% weight)
        .add_operation(
            LoadTestOperation::new(
                "create_department",
                r#"
                mutation {
                    createDepartment(input: {
                        name: "Load Test Department"
                        managerId: "00000000-0000-0000-0000-000000000001"
                    }) {
                        id
                        name
                    }
                }
                "#,
            )
            .as_mutation()
            .with_weight(0.20),
        )
        // Delete operation (10% weight)
        .add_operation(
            LoadTestOperation::new(
                "delete_user",
                r#"
                mutation {
                    deleteUser(id: "00000000-0000-0000-0000-000000000099") {
                        success
                    }
                }
                "#,
            )
            .as_mutation()
            .with_weight(0.10),
        );

    // Run load test
    let metrics = run_load_test(config)
        .await
        .expect("Mutation load test failed");

    // Print detailed summary
    metrics.print_summary();

    // Assert performance targets for mutations
    // Note: Mutations are slower than queries
    assert!(
        metrics.success_rate() > 0.90,
        "Mutation success rate should be above 90%, got {:.2}%",
        metrics.success_rate() * 100.0
    );

    assert!(
        metrics.p95_latency() < 2000.0,
        "P95 latency for mutations should be under 2 seconds, got {:.2}ms",
        metrics.p95_latency()
    );

    assert!(
        metrics.throughput() > 2.0,
        "Mutation throughput should be above 2 req/s, got {:.2}",
        metrics.throughput()
    );
}

#[tokio::test]
#[ignore]
async fn test_bulk_mutation_load() {
    // Test bulk mutation performance
    let config = LoadTestConfig::new("http://localhost:8080/graphql")
        .with_users(10)
        .with_duration(Duration::from_secs(30))
        .with_think_time(Duration::from_millis(2000))
        .add_operation(
            LoadTestOperation::new(
                "bulk_create_users",
                r#"
                mutation {
                    bulkCreateUsers(input: [
                        { email: "user1@example.com", firstName: "User", lastName: "One", role: "hr_employee" }
                        { email: "user2@example.com", firstName: "User", lastName: "Two", role: "hr_employee" }
                        { email: "user3@example.com", firstName: "User", lastName: "Three", role: "hr_employee" }
                    ]) {
                        count
                        users { id }
                    }
                }
                "#,
            )
            .as_mutation()
            .with_weight(1.0),
        );

    let metrics = run_load_test(config)
        .await
        .expect("Bulk mutation load test failed");

    metrics.print_summary();

    // Bulk operations should have reasonable success rate
    assert!(
        metrics.success_rate() > 0.85,
        "Bulk mutation success rate should be above 85%"
    );
}
