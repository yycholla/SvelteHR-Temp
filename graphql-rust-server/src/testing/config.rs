//! TestConfig: Global test configuration
//!
//! Loads test configuration from environment variables or defaults
//! (PostgreSQL Docker image, pool size, timeouts, etc.)

use std::env;

/// Global test configuration
#[derive(Debug, Clone)]
pub struct TestConfig {
    /// PostgreSQL Docker image to use
    pub postgres_image: String,

    /// Default database connection pool size
    pub pool_size: u32,

    /// Test timeout in seconds
    pub test_timeout_seconds: u64,

    /// Whether to keep containers after test failure (for debugging)
    pub keep_containers_on_failure: bool,

    /// Base URL for test server
    pub test_server_base_url: String,
}

impl TestConfig {
    /// Loads configuration from environment variables
    pub fn from_env() -> Self {
        Self {
            postgres_image: env::var("TEST_POSTGRES_IMAGE")
                .unwrap_or_else(|_| "postgres:15-alpine".to_string()),
            pool_size: env::var("TEST_DB_POOL_SIZE")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(5),
            test_timeout_seconds: env::var("TEST_TIMEOUT_SECONDS")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(120),
            keep_containers_on_failure: env::var("TEST_KEEP_CONTAINERS")
                .map(|s| s.to_lowercase() == "true" || s == "1")
                .unwrap_or(false),
            test_server_base_url: env::var("TEST_SERVER_URL")
                .unwrap_or_else(|_| "http://localhost:8080".to_string()),
        }
    }

    /// Loads configuration with defaults
    pub fn default() -> Self {
        Self {
            postgres_image: "postgres:15-alpine".to_string(),
            pool_size: 5,
            test_timeout_seconds: 120,
            keep_containers_on_failure: false,
            test_server_base_url: "http://localhost:8080".to_string(),
        }
    }
}

impl Default for TestConfig {
    fn default() -> Self {
        Self::default()
    }
}
