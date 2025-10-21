//! Integration Test Suite
//!
//! Entry point for integration tests verifying complete GraphQL flows
//! with database isolation and authentication.
//!
//! Run with: cargo test --test integration_tests

// Common utilities and re-exports
#[path = "integration/mod.rs"]
mod common;

// Integration test modules
#[path = "integration/graphql_queries_test.rs"]
mod graphql_queries_test;
