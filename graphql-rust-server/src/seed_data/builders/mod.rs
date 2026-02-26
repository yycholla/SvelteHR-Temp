//! Entity Builders
//!
//! Entity-specific seed data generation functions.

pub mod department_builder;
pub mod employee_builder;
pub mod leave_builder;
pub mod operational_builder;
pub mod permission_builder;
pub mod role_builder;
pub mod task_type_builder;
pub mod user_builder;

// Re-exports for convenience
pub use department_builder::{seed_departments, update_department_managers};
pub use employee_builder::{
    seed_emergency_contacts, seed_employee_certifications, seed_employee_skills,
    seed_user_addresses,
};
pub use leave_builder::{seed_leave_balances, seed_leave_requests, seed_leave_types};
pub use operational_builder::{seed_documents, seed_events, seed_tasks, seed_time_entries};
pub use permission_builder::seed_permissions;
pub use role_builder::{seed_role_permissions, seed_roles};
pub use task_type_builder::seed_task_types;
pub use user_builder::{assign_user_managers, seed_user_role_assignments, seed_users};
