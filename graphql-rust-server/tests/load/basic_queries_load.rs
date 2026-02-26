//! Basic Query Load Test
//!
//! Tests read-only GraphQL queries under load with realistic role distribution.
//!
//! Run with:
//! ```bash
//! cargo test --test basic_queries_load --features test-utils -- --ignored --nocapture
//! ```

use hr_graphql_server::testing::load_testing::{
    run_load_test, LoadTestConfig, LoadTestOperation, RoleDistribution,
};
use std::time::Duration;

#[tokio::test]
#[ignore] // Load tests are expensive, run explicitly with --ignored
async fn test_basic_query_load() {
    // Configure load test with realistic read-only workload
    let config = LoadTestConfig::new("http://localhost:8080/graphql")
        .with_users(50) // 50 concurrent virtual users
        .with_duration(Duration::from_secs(60)) // 1 minute test
        .with_think_time(Duration::from_millis(500)) // 500ms between requests
        .with_ramp_up(Duration::from_secs(10)) // Gradual ramp-up over 10 seconds
        .with_role_distribution(RoleDistribution::realistic())
        // Most common query - list users (70% weight)
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
                    }
                }
                "#,
            )
            .with_weight(0.70),
        )
        // Secondary query - list departments (20% weight)
        .add_operation(
            LoadTestOperation::new(
                "list_departments",
                r#"
                query {
                    departments {
                        id
                        name
                        managerId
                    }
                }
                "#,
            )
            .with_weight(0.20),
        )
        // Rare query - get single user (10% weight)
        .add_operation(
            LoadTestOperation::new(
                "get_user",
                r#"
                query {
                    user(id: "00000000-0000-0000-0000-000000000001") {
                        id
                        email
                        role
                    }
                }
                "#,
            )
            .with_weight(0.10),
        );

    // Run load test
    let metrics = run_load_test(config).await.expect("Load test failed");

    // Print detailed summary
    metrics.print_summary();

    // Assert performance targets
    assert!(
        metrics.success_rate() > 0.95,
        "Success rate should be above 95%, got {:.2}%",
        metrics.success_rate() * 100.0
    );

    assert!(
        metrics.p95_latency() < 1000.0,
        "P95 latency should be under 1 second, got {:.2}ms",
        metrics.p95_latency()
    );

    assert!(
        metrics.throughput() > 5.0,
        "Throughput should be above 5 req/s, got {:.2}",
        metrics.throughput()
    );
}

#[tokio::test]
#[ignore]
async fn test_high_concurrency_query_load() {
    // Stress test with higher concurrency
    let config = LoadTestConfig::new("http://localhost:8080/graphql")
        .with_users(200) // High concurrency
        .with_duration(Duration::from_secs(30))
        .with_ramp_up(Duration::from_secs(15)) // Gradual ramp-up
        .add_operation(
            LoadTestOperation::new("simple_query", "query { users(limit: 10) { id } }")
                .with_weight(1.0),
        );

    let metrics = run_load_test(config)
        .await
        .expect("High concurrency load test failed");

    metrics.print_summary();

    // Less strict performance targets for high concurrency
    assert!(
        metrics.success_rate() > 0.90,
        "Success rate under high load should be above 90%"
    );
}
