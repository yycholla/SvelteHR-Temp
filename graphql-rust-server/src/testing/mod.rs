// Testing infrastructure module
//
// This module provides comprehensive testing utilities for the GraphQL backend,
// including database isolation, authentication helpers, load testing, and benchmarking.

pub mod auth;
pub mod config;
pub mod context;
pub mod database;
pub mod errors;
// pub mod load_testing; // TEMPORARILY DISABLED: Depends on removed session auth (TODO: Update for JWT)

// Re-exports for convenient access
pub use auth::{TestUser, TestUserRole, TestUsers};
pub use config::TestConfig;
pub use context::TestContext;
pub use database::TestDatabase;
pub use errors::*;
