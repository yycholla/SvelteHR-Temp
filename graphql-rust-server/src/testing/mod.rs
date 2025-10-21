// Testing infrastructure module
//
// This module provides comprehensive testing utilities for the GraphQL backend,
// including database isolation, authentication helpers, load testing, and benchmarking.

pub mod database;
pub mod context;
pub mod auth;
pub mod errors;
pub mod config;
pub mod load_testing;

// Re-exports for convenient access
pub use database::TestDatabase;
pub use context::TestContext;
pub use auth::{TestUser, TestUserRole, TestUsers};
pub use errors::*;
pub use config::TestConfig;
