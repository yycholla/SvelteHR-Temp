//! Integration Tests Module
//!
//! Common imports and utilities for integration tests.
//! Integration tests verify complete GraphQL request→resolver→database→response flows.

// Re-export commonly used testing utilities
pub use hr_graphql_server::testing::{TestContext, TestUser, TestUserRole};

// Re-export GraphQL types
pub use async_graphql::{Request, Response, Variables};
pub use serde_json::json;

// Re-export database types
pub use uuid::Uuid;
