# Data Model: Comprehensive Rust Testing Infrastructure

**Feature**: 037-all-of-our
**Date**: 2025-10-21
**Phase**: Phase 1 - Data Model Design

## Overview

This document defines the data structures and types for the Rust testing infrastructure. Since this is primarily infrastructure (not user-facing data), the "data model" focuses on test configuration, test context state, and metrics/reporting structures rather than traditional database entities.

## Core Testing Types

### 1. TestDatabase

**Purpose**: Manages ephemeral PostgreSQL database instances for test isolation

```rust
/// Represents an isolated PostgreSQL database for testing
pub struct TestDatabase {
    /// Unique identifier for this test database
    pub id: Uuid,

    /// Database name (e.g., "test_db_550e8400")
    pub name: String,

    /// Docker container handle (testcontainers)
    container: Container<'static, Postgres>,

    /// Database connection pool
    pub pool: DatabaseConnection,

    /// Database URL for connecting
    pub url: String,
}

impl TestDatabase {
    /// Creates a new test database with migrations applied
    pub async fn new() -> Result<Self, TestDatabaseError>;

    /// Runs all migrations on this database
    pub async fn run_migrations(&self) -> Result<(), MigrationError>;

    /// Gets a connection from the pool
    pub fn connection(&self) -> &DatabaseConnection;
}

// Automatic cleanup on drop
impl Drop for TestDatabase {
    fn drop(&mut self) {
        // Container is automatically stopped and removed
    }
}
```

**Relationships**:
- Owned by `TestContext`
- One per test execution
- Lifecycle: Created before test, dropped after test

### 2. TestContext

**Purpose**: Complete test environment setup (server + database + auth)

```rust
/// Full test context with running server and database
pub struct TestContext {
    /// Test database instance
    pub database: TestDatabase,

    /// GraphQL schema instance
    pub schema: Schema<Query, Mutation, Subscription>,

    /// Authentication tokens for different roles
    pub auth_tokens: AuthTokens,

    /// Base URL for the test server (if running HTTP server)
    pub server_url: Option<String>,

    /// HTTP client for making requests
    pub client: reqwest::Client,
}

impl TestContext {
    /// Creates a new test context with all components initialized
    pub async fn new() -> Result<Self, TestContextError>;

    /// Executes a GraphQL query
    pub async fn execute_query<T>(&self, query: &str, variables: Variables)
        -> Result<Response<T>, GraphQLError>;

    /// Executes a GraphQL mutation
    pub async fn execute_mutation<T>(&self, mutation: &str, variables: Variables)
        -> Result<Response<T>, GraphQLError>;

    /// Creates a test user with specific role
    pub async fn create_test_user(&self, role: UserRole) -> Result<User, Error>;
}
```

**Relationships**:
- Owns `TestDatabase`
- Owns `AuthTokens`
- Used by all integration tests

### 3. AuthTokens

**Purpose**: Pre-generated JWT tokens for different user roles in tests

```rust
/// Collection of JWT tokens for testing different user roles
pub struct AuthTokens {
    /// Admin role token
    pub admin: String,

    /// HR Manager role token
    pub hr_manager: String,

    /// Manager role token
    pub manager: String,

    /// Regular employee role token
    pub employee: String,

    /// Invalid/expired token for negative testing
    pub invalid: String,
}

impl AuthTokens {
    /// Generates a full set of test tokens
    pub fn generate() -> Result<Self, JwtError>;

    /// Generates a token for a specific role
    pub fn for_role(role: UserRole) -> Result<String, JwtError>;

    /// Gets token by role enum
    pub fn get(&self, role: UserRole) -> &str;
}
```

**Relationships**:
- Owned by `TestContext`
- Used in authenticated GraphQL requests
- Represents different RBAC roles

## Load Testing Types

### 4. LoadTestConfig

**Purpose**: Configuration for load test scenarios

```rust
/// Configuration for a load test scenario
#[derive(Debug, Clone)]
pub struct LoadTestConfig {
    /// Number of concurrent users to simulate
    pub concurrent_users: usize,

    /// Duration to run the load test
    pub duration: Duration,

    /// Operations to execute (queries/mutations)
    pub operations: Vec<LoadTestOperation>,

    /// Distribution of user roles
    pub role_distribution: RoleDistribution,

    /// Target throughput (requests/second)
    pub target_throughput: Option<f64>,
}

/// A single operation in a load test
#[derive(Debug, Clone)]
pub struct LoadTestOperation {
    /// Operation name (for reporting)
    pub name: String,

    /// GraphQL query or mutation
    pub graphql: String,

    /// Variables for the operation
    pub variables: serde_json::Value,

    /// Weight (how often this operation runs)
    pub weight: f64,

    /// User role required
    pub role: UserRole,
}

/// Distribution of user roles in load tests
#[derive(Debug, Clone)]
pub struct RoleDistribution {
    pub admin_percent: f64,      // e.g., 5%
    pub hr_manager_percent: f64, // e.g., 15%
    pub manager_percent: f64,    // e.g., 30%
    pub employee_percent: f64,   // e.g., 50%
}
```

**Relationships**:
- Created by load test scenarios
- Contains multiple `LoadTestOperation` instances
- Defines test parameters

### 5. LoadTestMetrics

**Purpose**: Collected metrics from load test execution

```rust
/// Metrics collected during load test execution
pub struct LoadTestMetrics {
    /// Total number of requests executed
    pub total_requests: u64,

    /// Number of successful requests
    pub successful_requests: u64,

    /// Number of failed requests
    pub failed_requests: u64,

    /// Latency histogram for percentile calculations
    pub latency_histogram: Histogram<u64>,

    /// Start time of the load test
    pub start_time: Instant,

    /// End time of the load test
    pub end_time: Instant,

    /// Errors encountered (error message -> count)
    pub errors: HashMap<String, u64>,
}

impl LoadTestMetrics {
    /// Creates a new metrics collector
    pub fn new() -> Self;

    /// Records a successful request with latency
    pub fn record_success(&mut self, latency_ms: u64);

    /// Records a failed request with error
    pub fn record_failure(&mut self, error: String);

    /// Calculates p50 latency (median)
    pub fn p50_latency(&self) -> u64;

    /// Calculates p95 latency
    pub fn p95_latency(&self) -> u64;

    /// Calculates p99 latency
    pub fn p99_latency(&self) -> u64;

    /// Calculates throughput (requests per second)
    pub fn throughput(&self) -> f64;

    /// Generates a summary report
    pub fn summary(&self) -> LoadTestSummary;
}

/// Summary of load test results
#[derive(Debug, Serialize)]
pub struct LoadTestSummary {
    pub total_requests: u64,
    pub success_rate: f64,  // 0.0 to 1.0
    pub error_rate: f64,    // 0.0 to 1.0
    pub throughput_rps: f64,
    pub latency_p50_ms: u64,
    pub latency_p95_ms: u64,
    pub latency_p99_ms: u64,
    pub duration_seconds: f64,
    pub top_errors: Vec<(String, u64)>,
}
```

**Relationships**:
- Produced by load test execution
- Contains performance data
- Used for reporting and assertions

## Benchmark Types

### 6. BenchmarkContext

**Purpose**: Context for running benchmarks with realistic data

```rust
/// Context for benchmark execution
pub struct BenchmarkContext {
    /// Database connection (if benchmarking DB operations)
    pub database: Option<TestDatabase>,

    /// Pre-created test data
    pub fixtures: BenchmarkFixtures,

    /// Mock external services
    pub mocks: HashMap<String, Box<dyn Any>>,
}

/// Pre-loaded test data for benchmarks
pub struct BenchmarkFixtures {
    /// Sample users
    pub users: Vec<User>,

    /// Sample employees
    pub employees: Vec<Employee>,

    /// Sample departments
    pub departments: Vec<Department>,
}

impl BenchmarkContext {
    /// Creates a new benchmark context with fixtures
    pub async fn new() -> Result<Self, Error>;

    /// Gets a random user for benchmarking
    pub fn random_user(&self) -> &User;

    /// Gets a random employee for benchmarking
    pub fn random_employee(&self) -> &Employee;
}
```

**Relationships**:
- Used by Criterion benchmarks
- Owns `TestDatabase` (optional)
- Contains pre-loaded `BenchmarkFixtures`

## Test Fixture Types

### 7. TestUserBuilder

**Purpose**: Builder pattern for creating test users with various configurations

```rust
/// Builder for creating test users in tests
pub struct TestUserBuilder {
    email: Option<String>,
    password: Option<String>,
    role: Option<UserRole>,
    department_id: Option<Uuid>,
    is_active: bool,
}

impl TestUserBuilder {
    /// Creates a new builder with default values
    pub fn new() -> Self;

    /// Sets the email
    pub fn email(mut self, email: impl Into<String>) -> Self;

    /// Sets the role
    pub fn with_role(mut self, role: UserRole) -> Self;

    /// Sets the department
    pub fn in_department(mut self, department_id: Uuid) -> Self;

    /// Sets active status
    pub fn active(mut self, active: bool) -> Self;

    /// Builds and inserts the user into the database
    pub async fn build(self, db: &DatabaseConnection) -> Result<User, Error>;
}
```

**Usage Example**:
```rust
let admin_user = TestUserBuilder::new()
    .email("admin@test.com")
    .with_role(UserRole::Admin)
    .build(&ctx.database.connection())
    .await?;
```

### 8. TestEmployeeBuilder

**Purpose**: Builder pattern for creating test employees

```rust
/// Builder for creating test employees in tests
pub struct TestEmployeeBuilder {
    full_name: Option<String>,
    email: Option<String>,
    department_id: Option<Uuid>,
    hire_date: Option<NaiveDate>,
    salary: Option<Decimal>,
    user_id: Option<Uuid>,
}

impl TestEmployeeBuilder {
    pub fn new() -> Self;
    pub fn full_name(mut self, name: impl Into<String>) -> Self;
    pub fn email(mut self, email: impl Into<String>) -> Self;
    pub fn in_department(mut self, dept_id: Uuid) -> Self;
    pub fn hired_on(mut self, date: NaiveDate) -> Self;
    pub fn with_salary(mut self, salary: Decimal) -> Self;
    pub fn linked_to_user(mut self, user_id: Uuid) -> Self;

    pub async fn build(self, db: &DatabaseConnection) -> Result<Employee, Error>;
}
```

## Mock Types

### 9. MockClock

**Purpose**: Deterministic time source for testing time-dependent logic

```rust
/// Trait for abstracting time operations
pub trait Clock: Send + Sync {
    /// Returns the current time
    fn now(&self) -> DateTime<Utc>;
}

/// Real clock implementation (uses system time)
pub struct SystemClock;

impl Clock for SystemClock {
    fn now(&self) -> DateTime<Utc> {
        Utc::now()
    }
}

/// Mock clock for testing
pub struct MockClock {
    /// Fixed time to return
    fixed_time: Arc<Mutex<DateTime<Utc>>>,
}

impl MockClock {
    /// Creates a new mock clock at the given time
    pub fn new(time: DateTime<Utc>) -> Self;

    /// Advances time by the given duration
    pub fn advance(&self, duration: Duration);

    /// Sets the time to a specific value
    pub fn set(&self, time: DateTime<Utc>);
}

impl Clock for MockClock {
    fn now(&self) -> DateTime<Utc> {
        *self.fixed_time.lock().unwrap()
    }
}
```

**Usage Pattern**:
```rust
// In production code
pub struct TokenValidator {
    clock: Arc<dyn Clock>,
}

// In tests
let clock = Arc::new(MockClock::new(Utc::now()));
let validator = TokenValidator { clock: clock.clone() };

// Advance time to expire token
clock.advance(Duration::hours(25));
assert!(validator.is_expired(&token));
```

## Error Types

### 10. TestError Types

**Purpose**: Strongly-typed errors for test infrastructure

```rust
/// Errors that can occur during test database setup
#[derive(Debug, thiserror::Error)]
pub enum TestDatabaseError {
    #[error("Failed to start Docker container: {0}")]
    ContainerStartFailed(String),

    #[error("Failed to run migrations: {0}")]
    MigrationFailed(#[from] sea_orm_migration::DbErr),

    #[error("Failed to connect to database: {0}")]
    ConnectionFailed(String),

    #[error("Database name generation failed: {0}")]
    NameGenerationFailed(String),
}

/// Errors that can occur during test context setup
#[derive(Debug, thiserror::Error)]
pub enum TestContextError {
    #[error("Database setup failed: {0}")]
    DatabaseError(#[from] TestDatabaseError),

    #[error("Auth token generation failed: {0}")]
    AuthError(#[from] JwtError),

    #[error("GraphQL schema creation failed: {0}")]
    SchemaError(String),
}

/// Errors that can occur during load tests
#[derive(Debug, thiserror::Error)]
pub enum LoadTestError {
    #[error("HTTP request failed: {0}")]
    RequestFailed(#[from] reqwest::Error),

    #[error("GraphQL error: {0}")]
    GraphQLError(String),

    #[error("Metrics collection failed: {0}")]
    MetricsError(String),

    #[error("Load test timeout")]
    Timeout,
}
```

## Configuration Types

### 11. TestConfig

**Purpose**: Global test configuration (from environment or config file)

```rust
/// Global test configuration
#[derive(Debug, Clone)]
pub struct TestConfig {
    /// PostgreSQL Docker image to use
    pub postgres_image: String,  // Default: "postgres:15-alpine"

    /// Default database connection pool size
    pub pool_size: u32,  // Default: 5

    /// Test timeout in seconds
    pub test_timeout_seconds: u64,  // Default: 120

    /// Whether to keep containers after test failure (for debugging)
    pub keep_containers_on_failure: bool,  // Default: false

    /// Base URL for test server
    pub test_server_base_url: String,  // Default: "http://localhost:8080"
}

impl TestConfig {
    /// Loads configuration from environment variables
    pub fn from_env() -> Self;

    /// Loads configuration with defaults
    pub fn default() -> Self;
}
```

## Type Relationships Diagram

```
TestContext
├── TestDatabase
│   ├── Uuid (id)
│   ├── String (name, url)
│   ├── Container (testcontainers)
│   └── DatabaseConnection (sea-orm)
├── AuthTokens
│   ├── admin: String
│   ├── hr_manager: String
│   ├── manager: String
│   ├── employee: String
│   └── invalid: String
├── Schema (async-graphql)
└── reqwest::Client

LoadTestConfig
├── concurrent_users: usize
├── duration: Duration
├── operations: Vec<LoadTestOperation>
│   └── LoadTestOperation
│       ├── name: String
│       ├── graphql: String
│       ├── variables: Value
│       ├── weight: f64
│       └── role: UserRole
└── role_distribution: RoleDistribution

LoadTestMetrics
├── total_requests: u64
├── successful_requests: u64
├── failed_requests: u64
├── latency_histogram: Histogram
├── start_time: Instant
├── end_time: Instant
└── errors: HashMap<String, u64>
    └── LoadTestSummary (generated)

BenchmarkContext
├── database: Option<TestDatabase>
├── fixtures: BenchmarkFixtures
│   ├── users: Vec<User>
│   ├── employees: Vec<Employee>
│   └── departments: Vec<Department>
└── mocks: HashMap<String, Box<dyn Any>>

Test Builders
├── TestUserBuilder → User
├── TestEmployeeBuilder → Employee
└── (other builders as needed)

Mock Types
├── MockClock (implements Clock trait)
└── (other mocks as needed)
```

## Module Organization

```
src/testing/
├── mod.rs                    # Public exports
├── database.rs               # TestDatabase
├── context.rs                # TestContext
├── auth.rs                   # AuthTokens, JWT helpers
├── load_testing/
│   ├── mod.rs
│   ├── config.rs             # LoadTestConfig, LoadTestOperation
│   ├── metrics.rs            # LoadTestMetrics, LoadTestSummary
│   └── runner.rs             # Load test execution logic
├── benchmarking/
│   ├── mod.rs
│   └── context.rs            # BenchmarkContext, BenchmarkFixtures
├── fixtures/
│   ├── mod.rs
│   ├── users.rs              # TestUserBuilder
│   ├── employees.rs          # TestEmployeeBuilder
│   └── departments.rs        # TestDepartmentBuilder
├── mocks/
│   ├── mod.rs
│   ├── clock.rs              # Clock trait, MockClock, SystemClock
│   └── external_api.rs       # Mock external services
├── errors.rs                 # Error types
└── config.rs                 # TestConfig
```

## Data Lifecycle

### Test Execution Lifecycle

1. **Setup Phase**:
   ```
   TestContext::new()
   → TestDatabase::new()
   → Start Docker container
   → Run migrations
   → Create connection pool
   → AuthTokens::generate()
   → Initialize GraphQL schema
   ```

2. **Test Execution Phase**:
   ```
   Test uses TestContext
   → Executes GraphQL operations
   → Uses fixtures to create test data
   → Asserts on results
   ```

3. **Teardown Phase**:
   ```
   TestContext dropped
   → TestDatabase dropped
   → Docker container stopped and removed
   → Database fully cleaned up
   ```

### Load Test Lifecycle

1. **Setup**:
   ```
   LoadTestConfig created
   → Operations defined
   → Role distribution set
   ```

2. **Execution**:
   ```
   Spawn N concurrent tasks
   → Each task:
     - Selects operation by weight
     - Generates JWT token for role
     - Executes GraphQL request
     - Records latency
   → Collect metrics
   ```

3. **Reporting**:
   ```
   LoadTestMetrics::summary()
   → Generate percentiles
   → Calculate throughput
   → Format report
   ```

## Type Safety Guarantees

1. **Database Isolation**: Each `TestDatabase` owns its Docker container - impossible to share
2. **Token Validity**: `AuthTokens` generated fresh per `TestContext` - no stale tokens
3. **Async Safety**: All async operations use `tokio::test` runtime - consistent execution model
4. **Metrics Accuracy**: `Histogram` type guarantees statistical correctness for percentiles
5. **Builder Completeness**: Builders require `build()` call - no partially constructed entities

## Performance Considerations

1. **TestDatabase**: ~2-3s setup time (Docker + migrations) - amortized via parallel tests
2. **AuthTokens**: ~10ms generation time - negligible overhead
3. **LoadTestMetrics**: O(1) recording, O(log n) percentile calculation - efficient
4. **Fixtures**: Pre-loaded in memory - no DB overhead during benchmarks
5. **Mocks**: Zero overhead - compile-time polymorphism via traits

## Future Extensions

1. **Snapshot Testing**: Add `TestSnapshot` type for GraphQL response snapshots
2. **Property Testing**: Add `PropertyTestConfig` for proptest integration
3. **Mutation Testing**: Add `MutationTestReport` for cargo-mutants integration
4. **Visual Reports**: Add `TestReport` type for HTML test result visualization
5. **Distributed Load Testing**: Add `DistributedLoadTestConfig` for multi-machine load tests
