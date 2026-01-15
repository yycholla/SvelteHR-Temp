//! Role Builder
//!
//! Seeds the 4 fixed roles: Admin, HR Manager, Manager, Employee

use sea_orm::{ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, Set};
use uuid::Uuid;

use crate::models::{role, permission, role_permission};
use crate::seed_data::audit::log_seed_creation;
use crate::seed_data::context::{EntitySeedResult, SeedContext};
use crate::seed_data::Result;

/// Fixed roles for the system (name, description, level)
const ROLES: &[(&str, &str, i32)] = &[
    ("Admin", "Full system administrator with unrestricted access", 100),
    ("HR Manager", "HR management with employee, payroll, and compliance access", 75),
    ("Manager", "Department manager with team management capabilities", 50),
    ("Employee", "Standard employee with basic self-service access", 25),
];

/// Seed the 4 fixed roles into the database
///
/// Uses skip-existing strategy - if a role with the same name exists, it will be skipped.
/// This ensures idempotent execution.
pub async fn seed_roles(
    db: &DatabaseConnection,
    context: &SeedContext,
) -> Result<EntitySeedResult> {
    let mut result = EntitySeedResult::new("roles");

    for (name, description, level) in ROLES {
        // Check if role already exists (idempotency)
        // CRITICAL: Filter out soft-deleted roles to ensure active roles are created
        let existing = role::Entity::find()
            .filter(role::Column::Name.eq(*name))
            .filter(role::Column::DeletedAt.is_null())
            .one(db)
            .await?;

        if existing.is_some() {
            result.skipped_count += 1;
            tracing::debug!("Role '{}' already exists, skipping", name);
            continue;
        }

        // Create new role
        let role_id = Uuid::new_v4();
        let new_role = role::ActiveModel {
            id: Set(role_id),
            name: Set(name.to_string()),
            description: Set(Some(description.to_string())),
            level: Set(*level),
            ..Default::default()
        };

        match new_role.insert(db).await {
            Ok(_) => {
                result.created_count += 1;
                tracing::info!("Created role: {}", name);

                // Log to audit system
                if let Err(e) = log_seed_creation(db, context, "role", role_id).await {
                    tracing::warn!("Failed to log audit entry for role {}: {}", name, e);
                }
            }
            Err(e) => {
                result.failed_count += 1;
                result.errors.push(format!("Failed to create role {}: {}", name, e));
                tracing::error!("Failed to create role {}: {}", name, e);
            }
        }
    }

    Ok(result)
}

/// Assign permissions to roles
///
/// Admin: All permissions
/// HR Manager: Employee, department, leave, document, review permissions
/// Manager: Employee read, leave approve, task, time permissions
/// Employee: Basic self-service permissions
pub async fn seed_role_permissions(
    db: &DatabaseConnection,
    _context: &SeedContext,
) -> Result<EntitySeedResult> {
    let mut result = EntitySeedResult::new("role_permissions");

    // Get all active roles (exclude soft-deleted)
    // CRITICAL: Filter out soft-deleted roles to avoid assigning permissions to deleted roles
    let roles = role::Entity::find()
        .filter(role::Column::DeletedAt.is_null())
        .all(db)
        .await?;

    tracing::info!("Found {} active roles for permission assignment", roles.len());

    let admin_role = roles.iter().find(|r| r.name == "Admin");
    let hr_manager_role = roles.iter().find(|r| r.name == "HR Manager");
    let manager_role = roles.iter().find(|r| r.name == "Manager");
    let employee_role = roles.iter().find(|r| r.name == "Employee");

    // Validation: Warn if any core roles are missing
    if admin_role.is_none() {
        tracing::warn!("CRITICAL: Admin role not found! Permission assignment will be incomplete.");
    }
    if hr_manager_role.is_none() {
        tracing::warn!("CRITICAL: HR Manager role not found! Permission assignment will be incomplete.");
    }
    if manager_role.is_none() {
        tracing::warn!("CRITICAL: Manager role not found! Permission assignment will be incomplete.");
    }
    if employee_role.is_none() {
        tracing::warn!("CRITICAL: Employee role not found! Permission assignment will be incomplete.");
    }

    // Get all active permissions (exclude soft-deleted)
    let all_permissions = permission::Entity::find()
        .filter(permission::Column::DeletedAt.is_null())
        .all(db)
        .await?;

    // Admin gets ALL permissions
    if let Some(admin) = admin_role {
        for perm in &all_permissions {
            if let Err(e) = assign_permission_to_role(db, admin.id, perm.id, &mut result).await {
                tracing::warn!("Failed to assign permission {} to Admin: {}", perm.resource, e);
            }
        }
    }

    // HR Manager gets employee, department, leave, document, review permissions
    if let Some(hr_manager) = hr_manager_role {
        let hr_resources = ["employees", "departments", "leave", "documents", "reviews"];
        for perm in all_permissions.iter().filter(|p| hr_resources.contains(&p.resource.as_str())) {
            if let Err(e) = assign_permission_to_role(db, hr_manager.id, perm.id, &mut result).await {
                tracing::warn!("Failed to assign permission {} to HR Manager: {}", perm.resource, e);
            }
        }
    }

    // Manager gets employee:read, leave:approve, task, time permissions
    if let Some(manager) = manager_role {
        for perm in all_permissions.iter().filter(|p| {
            (p.resource == "employees" && p.action == "read") ||
            (p.resource == "leave" && p.action == "approve") ||
            p.resource == "tasks" ||
            p.resource == "time"
        }) {
            if let Err(e) = assign_permission_to_role(db, manager.id, perm.id, &mut result).await {
                tracing::warn!("Failed to assign permission {} to Manager: {}", perm.resource, e);
            }
        }
    }

    // Employee gets basic self-service: leave:read, leave:write, time:read, time:write, tasks:read
    if let Some(employee) = employee_role {
        for perm in all_permissions.iter().filter(|p| {
            (p.resource == "leave" && (p.action == "read" || p.action == "write")) ||
            (p.resource == "time" && (p.action == "read" || p.action == "write")) ||
            (p.resource == "tasks" && p.action == "read")
        }) {
            if let Err(e) = assign_permission_to_role(db, employee.id, perm.id, &mut result).await {
                tracing::warn!("Failed to assign permission {} to Employee: {}", perm.resource, e);
            }
        }
    }

    Ok(result)
}

/// Helper to assign a permission to a role (idempotent)
async fn assign_permission_to_role(
    db: &DatabaseConnection,
    role_id: Uuid,
    permission_id: Uuid,
    result: &mut EntitySeedResult,
) -> Result<()> {
    // Check if already exists
    let existing = role_permission::Entity::find()
        .filter(role_permission::Column::RoleId.eq(role_id))
        .filter(role_permission::Column::PermissionId.eq(permission_id))
        .one(db)
        .await?;

    if existing.is_some() {
        result.skipped_count += 1;
        return Ok(());
    }

    // Create role-permission assignment
    let assignment = role_permission::ActiveModel {
        id: Set(Uuid::new_v4()),
        role_id: Set(role_id),
        permission_id: Set(permission_id),
        ..Default::default()
    };

    assignment.insert(db).await?;
    result.created_count += 1;

    Ok(())
}

#[cfg(test)]
mod tests {
    #[tokio::test]
    async fn test_seed_roles_idempotent() {
        // This test would require a test database connection
        // Placeholder for actual test implementation in T027
    }
}
