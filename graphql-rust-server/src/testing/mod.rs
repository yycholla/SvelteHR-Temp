// Testing infrastructure module
//
// This module provides comprehensive testing utilities for the GraphQL backend,
// including database isolation, authentication helpers, load testing, and benchmarking.

pub mod database;
// pub mod context; // TEMPORARILY DISABLED: Depends on removed session auth (TODO: Update for JWT)
// pub mod auth; // REMOVED: Session-based auth helpers (replaced by JWT)
pub mod errors;
pub mod config;
// pub mod load_testing; // TEMPORARILY DISABLED: Depends on removed session auth (TODO: Update for JWT)

// Re-exports for convenient access
pub use database::TestDatabase;
// pub use context::TestContext; // TEMPORARILY DISABLED: Depends on removed session auth
// pub use auth::{TestUser, TestUserRole, TestUsers}; // REMOVED: Use JWT tokens in tests instead
pub use errors::*;
pub use config::TestConfig;
