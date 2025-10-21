//! Load Testing Module
//!
//! Provides infrastructure for running load tests against the GraphQL API
//! with concurrent users, role distribution, and detailed metrics.

pub mod config;
pub mod metrics;
pub mod runner;

// Re-exports
pub use config::{LoadTestConfig, LoadTestOperation, RoleDistribution};
pub use metrics::{LoadTestMetrics, LoadTestSummary};
pub use runner::run_load_test;
