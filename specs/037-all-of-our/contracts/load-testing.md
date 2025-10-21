# Contract: Load Testing Framework

**Module**: `src/testing/load_testing/`
**Purpose**: Concurrent load testing for GraphQL API with authentication and metrics

## Public API

### LoadTestConfig

```rust
/// Configuration for load test scenarios
#[derive(Debug, Clone)]
pub struct LoadTestConfig {
    /// Number of concurrent virtual users
    pub concurrent_users: usize,

    /// Duration to run the test
    pub duration: Duration,

    /// Operations to execute with weights
    pub operations: Vec<LoadTestOperation>,

    /// Distribution of user roles
    pub role_distribution: RoleDistribution,

    /// Optional target throughput (requests/second)
    pub target_throughput: Option<f64>,
}

impl LoadTestConfig {
    /// Creates a new load test configuration
    ///
    /// # Example
    /// ```rust
    /// let config = LoadTestConfig::new()
    ///     .with_users(100)
    ///     .duration(Duration::from_secs(60))
    ///     .add_operation(get_employees_op)
    ///     .add_operation(get_employee_details_op)
    ///     .with_role_distribution(RoleDistribution::realistic())
    ///     .build();
    /// ```
    ///
    /// # Contract
    /// - MUST validate concurrent_users > 0
    /// - MUST validate duration > 0
    /// - MUST validate operations not empty
    /// - MUST validate role distribution sums to 100%
    pub fn new() -> LoadTestConfigBuilder;

    /// Validates the configuration
    ///
    /// # Returns
    /// - Ok(()) if configuration is valid
    /// - Err(ConfigError) with details of invalid fields
    ///
    /// # Contract
    /// - MUST check all invariants
    /// - MUST provide clear error messages
    pub fn validate(&self) -> Result<(), ConfigError>;
}

/// Builder for LoadTestConfig
pub struct LoadTestConfigBuilder { /* ... */ }

impl LoadTestConfigBuilder {
    pub fn with_users(mut self, count: usize) -> Self;
    pub fn duration(mut self, duration: Duration) -> Self;
    pub fn add_operation(mut self, op: LoadTestOperation) -> Self;
    pub fn with_role_distribution(mut self, dist: RoleDistribution) -> Self;
    pub fn target_throughput(mut self, rps: f64) -> Self;
    pub fn build(self) -> LoadTestConfig;
}
```

### LoadTestOperation

```rust
/// A single operation in a load test
#[derive(Debug, Clone)]
pub struct LoadTestOperation {
    /// Operation name for reporting
    pub name: String,

    /// GraphQL query or mutation
    pub graphql: String,

    /// Variables template (may contain ${variable} placeholders)
    pub variables: serde_json::Value,

    /// Weight (probability of selection, 0.0-1.0)
    pub weight: f64,

    /// Required user role
    pub role: UserRole,
}

impl LoadTestOperation {
    /// Creates a new load test operation
    ///
    /// # Arguments
    /// - `name`: Human-readable operation name
    /// - `graphql`: GraphQL query or mutation string
    /// - `role`: User role required to execute
    ///
    /// # Contract
    /// - MUST validate GraphQL syntax
    /// - MUST normalize weight to 0.0-1.0 range
    /// - MUST validate role is valid enum value
    pub fn new(
        name: impl Into<String>,
        graphql: impl Into<String>,
        role: UserRole
    ) -> Self;

    /// Sets variables for this operation
    ///
    /// # Contract
    /// - MUST accept valid JSON
    /// - MUST support variable substitution (e.g., ${userId})
    pub fn with_variables(mut self, vars: serde_json::Value) -> Self;

    /// Sets the weight (selection probability)
    ///
    /// # Contract
    /// - MUST clamp weight to 0.0-1.0 range
    pub fn with_weight(mut self, weight: f64) -> Self;
}
```

### Load Test Execution

```rust
/// Executes a load test with the given configuration
///
/// # Arguments
/// - `config`: Load test configuration
/// - `base_url`: Base URL of the GraphQL API
///
/// # Returns
/// - Ok(LoadTestMetrics) with execution results
/// - Err(LoadTestError) if test fails catastrophically
///
/// # Behavior
/// 1. Spawns `concurrent_users` async tasks
/// 2. Each task:
///    - Selects operations by weight
///    - Generates JWT token for assigned role
///    - Executes GraphQL request
///    - Records latency and success/failure
/// 3. Runs for specified duration
/// 4. Collects and aggregates metrics
///
/// # Example
/// ```rust
/// let config = LoadTestConfig::new()
///     .with_users(100)
///     .duration(Duration::from_secs(60))
///     .build();
///
/// let metrics = run_load_test(config, "http://localhost:8080/graphql").await?;
///
/// println!("p95 latency: {}ms", metrics.p95_latency());
/// println!("throughput: {} req/s", metrics.throughput());
/// assert!(metrics.p95_latency() < 500, "Failed latency SLA");
/// ```
///
/// # Contract
/// - MUST spawn all concurrent users
/// - MUST respect duration (±1 second tolerance)
/// - MUST collect accurate latency measurements
/// - MUST handle network errors gracefully (record as failures)
/// - MUST not panic on individual request failures
/// - MUST return metrics even if some requests fail
pub async fn run_load_test(
    config: LoadTestConfig,
    base_url: &str
) -> Result<LoadTestMetrics, LoadTestError>;
```

### LoadTestMetrics

```rust
/// Metrics collected during load test execution
pub struct LoadTestMetrics {
    /// Total requests attempted
    pub total_requests: u64,

    /// Successful requests (2xx status)
    pub successful_requests: u64,

    /// Failed requests (errors or non-2xx)
    pub failed_requests: u64,

    /// Latency histogram for percentile calculations
    latency_histogram: Histogram<u64>,

    /// Test start time
    start_time: Instant,

    /// Test end time
    end_time: Instant,

    /// Errors encountered (error message -> count)
    pub errors: HashMap<String, u64>,
}

impl LoadTestMetrics {
    /// Creates a new metrics collector
    ///
    /// # Contract
    /// - MUST initialize histogram with appropriate precision
    /// - MUST be thread-safe (uses Arc<Mutex> internally)
    pub fn new() -> Self;

    /// Records a successful request with latency
    ///
    /// # Arguments
    /// - `latency_ms`: Request latency in milliseconds
    ///
    /// # Contract
    /// - MUST be thread-safe
    /// - MUST record latency in histogram
    /// - MUST increment success counter
    pub fn record_success(&mut self, latency_ms: u64);

    /// Records a failed request with error message
    ///
    /// # Arguments
    /// - `error`: Error message or type
    ///
    /// # Contract
    /// - MUST be thread-safe
    /// - MUST increment failure counter
    /// - MUST aggregate error counts
    pub fn record_failure(&mut self, error: String);

    /// Calculates p50 (median) latency
    ///
    /// # Returns
    /// - Latency in milliseconds
    ///
    /// # Contract
    /// - MUST use accurate percentile calculation (hdrhistogram)
    /// - MUST return 0 if no successful requests
    pub fn p50_latency(&self) -> u64;

    /// Calculates p95 latency
    ///
    /// # Returns
    /// - Latency in milliseconds
    ///
    /// # Contract
    /// - MUST use accurate percentile calculation
    /// - MUST return 0 if no successful requests
    pub fn p95_latency(&self) -> u64;

    /// Calculates p99 latency
    ///
    /// # Returns
    /// - Latency in milliseconds
    ///
    /// # Contract
    /// - MUST use accurate percentile calculation
    /// - MUST return 0 if no successful requests
    pub fn p99_latency(&self) -> u64;

    /// Calculates throughput (requests per second)
    ///
    /// # Returns
    /// - Requests per second (successful + failed)
    ///
    /// # Contract
    /// - MUST calculate based on actual test duration
    /// - MUST handle division by zero (return 0.0)
    pub fn throughput(&self) -> f64;

    /// Calculates success rate (0.0 to 1.0)
    ///
    /// # Returns
    /// - Success rate as fraction
    ///
    /// # Contract
    /// - MUST return 1.0 if no requests (avoid NaN)
    /// - MUST return value between 0.0 and 1.0
    pub fn success_rate(&self) -> f64;

    /// Generates a summary report
    ///
    /// # Returns
    /// - LoadTestSummary with formatted metrics
    ///
    /// # Contract
    /// - MUST include all key metrics
    /// - MUST be serializable (for JSON reports)
    pub fn summary(&self) -> LoadTestSummary;

    /// Prints a formatted report to stdout
    ///
    /// # Contract
    /// - MUST format numbers clearly (commas, decimal places)
    /// - MUST use color for pass/fail indicators (optional)
    pub fn print_report(&self);
}
```

### LoadTestSummary

```rust
/// Summary of load test results (serializable)
#[derive(Debug, Serialize, Deserialize)]
pub struct LoadTestSummary {
    pub total_requests: u64,
    pub successful_requests: u64,
    pub failed_requests: u64,
    pub success_rate: f64,
    pub error_rate: f64,
    pub throughput_rps: f64,
    pub latency_p50_ms: u64,
    pub latency_p95_ms: u64,
    pub latency_p99_ms: u64,
    pub duration_seconds: f64,
    pub top_errors: Vec<(String, u64)>,
}

impl LoadTestSummary {
    /// Checks if latency meets SLA (p95 < threshold)
    ///
    /// # Contract
    /// - MUST return true if p95 below threshold
    pub fn meets_latency_sla(&self, p95_threshold_ms: u64) -> bool;

    /// Checks if success rate meets SLA (> threshold)
    ///
    /// # Contract
    /// - MUST return true if success rate above threshold
    pub fn meets_success_sla(&self, min_success_rate: f64) -> bool;

    /// Exports to JSON string
    ///
    /// # Contract
    /// - MUST produce valid, pretty-printed JSON
    pub fn to_json(&self) -> Result<String, serde_json::Error>;
}
```

## Error Handling

```rust
#[derive(Debug, thiserror::Error)]
pub enum LoadTestError {
    #[error("HTTP request failed: {0}")]
    RequestFailed(#[from] reqwest::Error),

    #[error("GraphQL error in operation '{operation}': {error}")]
    GraphQLError {
        operation: String,
        error: String,
    },

    #[error("Configuration validation failed: {0}")]
    ConfigError(String),

    #[error("Metrics collection failed: {0}")]
    MetricsError(String),

    #[error("Load test timeout after {0:?}")]
    Timeout(Duration),

    #[error("Failed to generate JWT token: {0}")]
    AuthError(String),
}
```

## Invariants

1. **Concurrency**: All concurrent_users MUST run simultaneously
2. **Duration**: Test MUST run for specified duration (±1s tolerance)
3. **Metrics Accuracy**: Latency measurements MUST be accurate (±10ms)
4. **Error Handling**: Individual request failures MUST NOT stop the test
5. **Thread Safety**: Metrics MUST be safely updated from concurrent tasks

## Performance Guarantees

- **Overhead**: <5% CPU overhead for metrics collection
- **Memory Usage**: O(concurrent_users) + O(histogram_precision)
- **Latency Accuracy**: ±10ms for percentile calculations
- **Throughput Accuracy**: ±1% of actual throughput

## Testing Contract

### Integration Tests

```rust
#[tokio::test]
async fn test_load_test_execution() {
    let config = LoadTestConfig::new()
        .with_users(10)
        .duration(Duration::from_secs(5))
        .add_operation(simple_query_operation())
        .build();

    let metrics = run_load_test(config, "http://localhost:8080/graphql")
        .await
        .unwrap();

    assert!(metrics.total_requests > 0);
    assert!(metrics.p95_latency() < 1000);
}

#[tokio::test]
async fn test_load_test_respects_role_distribution() {
    let config = LoadTestConfig::new()
        .with_users(100)
        .duration(Duration::from_secs(10))
        .with_role_distribution(RoleDistribution {
            admin_percent: 0.10,
            hr_manager_percent: 0.20,
            manager_percent: 0.30,
            employee_percent: 0.40,
        })
        .build();

    // Verify role distribution in requests
    // (requires request logging/tracking)
}
```

## Usage Examples

### Basic Load Test

```rust
#[tokio::test]
async fn load_test_employee_queries() {
    let get_employees = LoadTestOperation::new(
        "get_employees",
        r#"query { employees { id fullName } }"#,
        UserRole::HRManager
    ).with_weight(0.7);

    let get_employee_detail = LoadTestOperation::new(
        "get_employee",
        r#"query GetEmployee($id: ID!) { employee(id: $id) { id fullName email } }"#,
        UserRole::Manager
    ).with_variables(serde_json::json!({ "id": "123" }))
     .with_weight(0.3);

    let config = LoadTestConfig::new()
        .with_users(100)
        .duration(Duration::from_secs(60))
        .add_operation(get_employees)
        .add_operation(get_employee_detail)
        .with_role_distribution(RoleDistribution::realistic())
        .build();

    let metrics = run_load_test(config, "http://localhost:8080/graphql")
        .await
        .unwrap();

    metrics.print_report();

    // Assert SLAs
    assert!(metrics.p95_latency() < 500, "Failed p95 latency SLA");
    assert!(metrics.success_rate() > 0.99, "Failed success rate SLA");
    assert!(metrics.throughput() > 100.0, "Failed throughput SLA");
}
```

### Mixed Read/Write Load Test

```rust
#[tokio::test]
async fn load_test_mixed_workload() {
    let read_op = LoadTestOperation::new(
        "list_employees",
        r#"query { employees(limit: 50) { id fullName } }"#,
        UserRole::Employee
    ).with_weight(0.80);  // 80% reads

    let write_op = LoadTestOperation::new(
        "update_employee",
        r#"mutation UpdateEmployee($id: ID!, $input: UpdateEmployeeInput!) {
            updateEmployee(id: $id, input: $input) { id }
        }"#,
        UserRole::HRManager
    ).with_variables(serde_json::json!({
        "id": "123",
        "input": { "fullName": "Updated Name" }
    })).with_weight(0.20);  // 20% writes

    let config = LoadTestConfig::new()
        .with_users(100)
        .duration(Duration::from_secs(30))
        .add_operation(read_op)
        .add_operation(write_op)
        .build();

    let metrics = run_load_test(config, TEST_URL).await.unwrap();

    assert!(metrics.p99_latency() < 1000);
}
```

## Compatibility

- **Rust Version**: 1.70+
- **reqwest**: 0.11+
- **hdrhistogram**: 7.5+
- **tokio**: 1.35+ (multi-threaded runtime required)

## Future Enhancements

1. **Distributed Load Testing**: Multi-machine load generation
2. **Real-time Dashboards**: Live metrics visualization
3. **Scenario Replay**: Record and replay production traffic patterns
4. **Adaptive Load**: Dynamically adjust concurrency based on response times
5. **Custom Metrics**: User-defined metric collectors
