//! Dependency Management
//!
//! Defines seeding order to satisfy foreign key constraints.

/// Seeding execution order in 5 phases
pub const SEEDING_ORDER: &[&str] = &[
    // Phase 0: System Setup
    "system_user",
    // Phase 1: Foundation (no dependencies)
    "roles",
    "permissions",
    "role_permissions",
    "leave_types",
    // Phase 2: Core entities
    "departments",                // Created with manager_id=NULL
    "users",                      // Assigned to departments
    "department_managers_update", // Resolve circular dependency
    "user_role_assignments",
    // Phase 3: Extended entities
    "leave_balances",
    "employee_skills",
    "employee_certifications",
    "emergency_contacts",
    "user_addresses",
    // Phase 4: Operational entities
    "leave_requests",
    "events",
    "event_attendees",
    "documents",
    "review_cycles",
    "performance_reviews",
    "task_types",
    "tasks",
    "task_assignees",
    "time_entries",
];

/// Resolve circular dependency between Department and User
///
/// Strategy:
/// 1. Create departments with manager_id = NULL
/// 2. Create users with department_id referencing existing departments
/// 3. Update departments with manager_id referencing existing users
pub fn resolve_circular_dependency_note() -> &'static str {
    "Department ↔ User circular dependency resolved via two-phase approach: \
     1) departments created with manager_id=NULL, \
     2) users created with department_id, \
     3) departments updated with manager_id"
}
