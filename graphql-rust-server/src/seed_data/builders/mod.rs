//! Entity Builders
//!
//! Entity-specific seed data generation functions.

pub mod leave_builder;
pub mod permission_builder;
pub mod role_builder;

// Re-exports for convenience
pub use leave_builder::seed_leave_types;
pub use permission_builder::seed_permissions;
pub use role_builder::seed_roles;
