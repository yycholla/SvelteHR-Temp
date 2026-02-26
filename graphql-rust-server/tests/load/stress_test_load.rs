//! Stress Test Load
//!
//! Pushes the system to its limits to identify breaking points and
//! performance degradation under extreme load conditions.
//!
//! Run with:
//! ```bash
//! cargo test --test stress_test_load --features test-utils -- --ignored --nocapture
//! ```

use hr_graphql_server::testing::load_testing::{
    run_load_test, LoadTestConfig, LoadTestOperation, RoleDistribution,
};
use std::time::Duration;

#[tokio::test]
#[ignore] // Load tests are expensive, run explicitly with --ignored
async fn test_high_concurrency_stress() {
    // Stress test with very high concurrency
    let config = LoadTestConfig::new("http://localhost:8080/graphql")
        .with_users(500) // Very high concurrency
        .with_duration(Duration::from_secs(60))
        .with_ramp_up(Duration::from_secs(30)) // Slow ramp-up to observe degradation
        .with_role_distribution(RoleDistribution::realistic())
        .add_operation(
            LoadTestOperation::new("simple_query", "query { users(limit: 10) { id email } }")
                .with_weight(1.0),
        );

    let metrics = run_load_test(config)
        .await
        .expect("High concurrency stress test failed");

    metrics.print_summary();

    // Lower success rate expectations under stress
    assert!(
        metrics.success_rate() > 0.80,
        "Stress test success rate should be above 80%, got {:.2}%",
        metrics.success_rate() * 100.0
    );

    println!("Max latency under stress: {:.2}ms", metrics.max_latency());
    println!("Mean latency under stress: {:.2}ms", metrics.mean_latency());
}

#[tokio::test]
#[ignore]
async fn test_sustained_load_stress() {
    // Long-running sustained load to detect memory leaks and resource exhaustion
    let config = LoadTestConfig::new("http://localhost:8080/graphql")
        .with_users(100)
        .with_duration(Duration::from_secs(300)) // 5 minutes sustained load
        .with_think_time(Duration::from_millis(100)) // Minimal think time
        .add_operation(
            LoadTestOperation::new(
                "sustained_query",
                r#"
                query {
                    users(limit: 20) {
                        id
                        email
                        firstName
                        lastName
                    }
                }
                "#,
            )
            .with_weight(0.70),
        )
        .add_operation(
            LoadTestOperation::new(
                "sustained_mutation",
                r#"
                mutation {
                    updateUser(
                        id: "00000000-0000-0000-0000-000000000001"
                        input: { firstName: "Sustained" }
                    ) { id }
                }
                "#,
            )
            .as_mutation()
            .with_weight(0.30),
        );

    let metrics = run_load_test(config)
        .await
        .expect("Sustained load stress test failed");

    metrics.print_summary();

    // Verify system remains stable under sustained load
    assert!(
        metrics.success_rate() > 0.90,
        "Sustained load should maintain 90%+ success rate"
    );

    // Check for performance degradation
    let p50 = metrics.p50_latency();
    let p95 = metrics.p95_latency();
    let ratio = p95 / p50;

    assert!(
        ratio < 5.0,
        "P95/P50 ratio should be under 5x, got {:.2}x (indicates performance degradation)",
        ratio
    );
}

#[tokio::test]
#[ignore]
async fn test_spike_stress() {
    // Sudden spike in traffic without ramp-up
    let config = LoadTestConfig::new("http://localhost:8080/graphql")
        .with_users(300) // High concurrency
        .with_duration(Duration::from_secs(30))
        // No ramp-up - sudden spike
        .add_operation(
            LoadTestOperation::new("spike_query", "query { departments { id name } }")
                .with_weight(1.0),
        );

    let metrics = run_load_test(config)
        .await
        .expect("Spike stress test failed");

    metrics.print_summary();

    // System should handle sudden spikes gracefully
    assert!(
        metrics.success_rate() > 0.75,
        "Spike test success rate should be above 75% (no graceful degradation), got {:.2}%",
        metrics.success_rate() * 100.0
    );
}

#[tokio::test]
#[ignore]
async fn test_complex_query_stress() {
    // Stress test with computationally expensive queries
    let config = LoadTestConfig::new("http://localhost:8080/graphql")
        .with_users(50)
        .with_duration(Duration::from_secs(60))
        .with_think_time(Duration::from_millis(200))
        .add_operation(
            LoadTestOperation::new(
                "complex_nested_query",
                r#"
                query {
                    departments {
                        id
                        name
                        manager {
                            id
                            email
                            firstName
                            lastName
                        }
                        employees {
                            id
                            email
                            firstName
                            lastName
                            role
                        }
                    }
                }
                "#,
            )
            .with_weight(0.60),
        )
        .add_operation(
            LoadTestOperation::new(
                "complex_aggregation_query",
                r#"
                query {
                    userStats {
                        totalUsers
                        activeUsers
                        usersByRole {
                            role
                            count
                        }
                        usersByDepartment {
                            departmentId
                            departmentName
                            count
                        }
                    }
                }
                "#,
            )
            .with_weight(0.40),
        );

    let metrics = run_load_test(config)
        .await
        .expect("Complex query stress test failed");

    metrics.print_summary();

    // Complex queries will have higher latency
    assert!(
        metrics.p95_latency() < 5000.0,
        "Complex queries P95 should be under 5 seconds, got {:.2}ms",
        metrics.p95_latency()
    );

    assert!(
        metrics.success_rate() > 0.85,
        "Complex query success rate should be above 85%"
    );
}

#[tokio::test]
#[ignore]
async fn test_connection_pool_exhaustion() {
    // Test database connection pool limits
    let config = LoadTestConfig::new("http://localhost:8080/graphql")
        .with_users(1000) // Extreme concurrency to exhaust connection pool
        .with_duration(Duration::from_secs(30))
        .with_ramp_up(Duration::from_secs(5))
        .add_operation(
            LoadTestOperation::new("pool_query", "query { users(limit: 1) { id } }")
                .with_weight(1.0),
        );

    let metrics = run_load_test(config)
        .await
        .expect("Connection pool stress test failed");

    metrics.print_summary();

    // Expect some failures when pool is exhausted, but system should not crash
    println!(
        "Connection pool stress - Failed requests: {} ({:.2}%)",
        metrics.failed_requests(),
        (1.0 - metrics.success_rate()) * 100.0
    );

    // System should handle pool exhaustion gracefully without crashing
    assert!(
        metrics.total_requests() > 0,
        "System should process requests even under extreme load"
    );
}
