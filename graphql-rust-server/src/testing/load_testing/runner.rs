//! Load Test Runner
//!
//! Executes load tests with concurrent virtual users, weighted operation selection,
//! and real HTTP requests to the GraphQL endpoint.

use std::sync::Arc;
use std::time::{Duration, Instant};
use reqwest::Client;
use tokio::time::sleep;
use serde_json::json;

use super::config::LoadTestConfig;
use super::metrics::LoadTestMetrics;
use crate::testing::{TestContext, TestUserRole};

/// Run a load test against the GraphQL API
///
/// # Arguments
/// * `config` - Load test configuration
///
/// # Returns
/// * `LoadTestMetrics` - Test results with latency percentiles and throughput
///
/// # Example
/// ```no_run
/// use hr_graphql_server::testing::load_testing::{LoadTestConfig, LoadTestOperation, run_load_test};
/// use std::time::Duration;
///
/// # async fn example() {
/// let config = LoadTestConfig::new("http://localhost:8080/graphql")
///     .with_users(50)
///     .with_duration(Duration::from_secs(60))
///     .add_operation(
///         LoadTestOperation::new("get_users", "query { users { id email } }")
///             .with_weight(0.7)
///     )
///     .add_operation(
///         LoadTestOperation::new("get_departments", "query { departments { id name } }")
///             .with_weight(0.3)
///     );
///
/// let metrics = run_load_test(config).await.unwrap();
/// metrics.print_summary();
/// # }
/// ```
pub async fn run_load_test(config: LoadTestConfig) -> Result<LoadTestMetrics, String> {
    // Validate configuration
    config.validate()?;

    // Create test context with database and test users
    let test_ctx = TestContext::new()
        .await
        .map_err(|e| format!("Failed to create test context: {}", e))?;

    // Create metrics collector
    let metrics = LoadTestMetrics::new();

    // Create shared config and metrics
    let config = Arc::new(config);
    let metrics = Arc::new(metrics);
    let test_ctx = Arc::new(test_ctx);

    // Spawn virtual users
    let mut handles = Vec::new();

    for user_id in 0..config.concurrent_users {
        let config = Arc::clone(&config);
        let metrics = Arc::clone(&metrics);
        let test_ctx = Arc::clone(&test_ctx);

        // Calculate ramp-up delay for this user
        let ramp_up_delay = if let Some(ramp_up) = config.ramp_up {
            let delay_per_user = ramp_up.as_secs_f64() / config.concurrent_users as f64;
            Duration::from_secs_f64(delay_per_user * user_id as f64)
        } else {
            Duration::from_secs(0)
        };

        let handle = tokio::spawn(async move {
            // Wait for ramp-up delay
            if ramp_up_delay.as_secs() > 0 {
                sleep(ramp_up_delay).await;
            }

            // Create HTTP client for this virtual user
            let client = Client::builder()
                .timeout(Duration::from_secs(30))
                .build()
                .unwrap();

            // Select role for this virtual user
            let role = select_user_role(&config.role_distribution);
            let test_user = test_ctx.user(role);

            // Create session/authentication token for this user
            // In a real scenario, you would authenticate via login endpoint
            // For load testing, we simulate authenticated requests
            let auth_header = format!("Bearer {}", test_user.id); // Simplified token

            // Run operations until test duration expires
            let start_time = Instant::now();
            let test_duration = config.duration;

            while start_time.elapsed() < test_duration {
                // Select random operation based on weights
                let random = rand::random::<f64>();
                let operation = config.select_operation(random);

                // Execute operation and record metrics
                let request_start = Instant::now();

                let result = execute_graphql_request(
                    &client,
                    &config.endpoint,
                    &operation.query,
                    operation.variables.as_ref(),
                    &auth_header,
                )
                .await;

                let latency = request_start.elapsed();

                match result {
                    Ok(_) => {
                        metrics.record_success(latency);
                    }
                    Err(e) => {
                        metrics.record_failure(format!("Operation '{}': {}", operation.name, e));
                    }
                }

                // Think time between requests
                if let Some(think_time) = config.think_time {
                    sleep(think_time).await;
                }
            }
        });

        handles.push(handle);
    }

    // Wait for all virtual users to complete
    for handle in handles {
        handle.await.map_err(|e| format!("Task join error: {}", e))?;
    }

    // Return metrics by unwrapping Arc
    let metrics = Arc::try_unwrap(metrics)
        .unwrap_or_else(|arc| (*arc).clone());

    Ok(metrics)
}

/// Execute a GraphQL request via HTTP
async fn execute_graphql_request(
    client: &Client,
    endpoint: &str,
    query: &str,
    variables: Option<&async_graphql::Variables>,
    auth_header: &str,
) -> Result<serde_json::Value, String> {
    let mut body = json!({
        "query": query,
    });

    if let Some(vars) = variables {
        // Convert async_graphql::Variables to serde_json::Value
        let vars_json = serde_json::to_value(vars)
            .map_err(|e| format!("Failed to serialize variables: {}", e))?;
        body["variables"] = vars_json;
    }

    let response = client
        .post(endpoint)
        .header("Authorization", auth_header)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("HTTP request failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("HTTP error: {}", response.status()));
    }

    let json_response = response
        .json::<serde_json::Value>()
        .await
        .map_err(|e| format!("Failed to parse JSON response: {}", e))?;

    // Check for GraphQL errors
    if let Some(errors) = json_response.get("errors") {
        return Err(format!("GraphQL errors: {}", errors));
    }

    Ok(json_response)
}

/// Select user role based on distribution
fn select_user_role(distribution: &super::config::RoleDistribution) -> TestUserRole {
    let random = rand::random::<f64>();
    let role_str = distribution.select_role(random);

    match role_str {
        "hr_employee" => TestUserRole::Employee,
        "hr_manager" => TestUserRole::HrManager,
        "admin" => TestUserRole::Admin,
        "system_admin" => TestUserRole::SystemAdmin,
        _ => TestUserRole::Employee, // Default fallback
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::testing::load_testing::LoadTestOperation;

    #[tokio::test]
    #[ignore] // Load tests are expensive, run explicitly
    async fn test_load_test_runner_basic() {
        let config = LoadTestConfig::new("http://localhost:8080/graphql")
            .with_users(5)
            .with_duration(Duration::from_secs(10))
            .add_operation(
                LoadTestOperation::new(
                    "get_users",
                    "query { users(limit: 10) { id email } }",
                )
                .with_weight(1.0),
            );

        let result = run_load_test(config).await;
        assert!(result.is_ok());

        let metrics = result.unwrap();
        assert!(metrics.total_requests() > 0);
    }

    #[tokio::test]
    #[ignore]
    async fn test_load_test_runner_with_ramp_up() {
        let config = LoadTestConfig::new("http://localhost:8080/graphql")
            .with_users(10)
            .with_duration(Duration::from_secs(20))
            .with_ramp_up(Duration::from_secs(5))
            .add_operation(
                LoadTestOperation::new(
                    "get_departments",
                    "query { departments { id name } }",
                )
                .with_weight(1.0),
            );

        let result = run_load_test(config).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    #[ignore]
    async fn test_load_test_runner_weighted_operations() {
        let config = LoadTestConfig::new("http://localhost:8080/graphql")
            .with_users(3)
            .with_duration(Duration::from_secs(15))
            .add_operation(
                LoadTestOperation::new(
                    "frequent_query",
                    "query { users(limit: 5) { id } }",
                )
                .with_weight(0.8),
            )
            .add_operation(
                LoadTestOperation::new(
                    "rare_query",
                    "query { departments { id } }",
                )
                .with_weight(0.2),
            );

        let result = run_load_test(config).await;
        assert!(result.is_ok());

        let metrics = result.unwrap();
        assert!(metrics.total_requests() > 0);
        println!("Throughput: {:.2} req/s", metrics.throughput());
        println!("P95 latency: {:.2} ms", metrics.p95_latency());
    }

    #[test]
    fn test_select_user_role_distribution() {
        use crate::testing::load_testing::RoleDistribution;

        let distribution = RoleDistribution::realistic();

        // Test multiple selections to verify distribution works
        let mut employee_count = 0;
        let mut manager_count = 0;
        let mut admin_count = 0;
        let mut sysadmin_count = 0;

        for _ in 0..1000 {
            let role = select_user_role(&distribution);
            match role {
                TestUserRole::Employee => employee_count += 1,
                TestUserRole::HrManager => manager_count += 1,
                TestUserRole::Admin => admin_count += 1,
                TestUserRole::SystemAdmin => sysadmin_count += 1,
            }
        }

        // Verify approximate distribution (with tolerance)
        assert!(employee_count > 600); // Should be ~70%
        assert!(manager_count > 150); // Should be ~20%
        assert!(admin_count > 50); // Should be ~8%
        assert!(sysadmin_count > 10); // Should be ~2%
    }
}
