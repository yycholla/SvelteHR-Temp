//! Role Builder
//!
//! Seeds the 4 fixed roles: Admin, HR Manager, Manager, Employee

use sea_orm::{ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, Set};
use uuid::Uuid;

use crate::models::role;
use crate::seed_data::audit::log_seed_creation;
use crate::seed_data::context::{EntitySeedResult, SeedContext};
use crate::seed_data::Result;

/// Fixed roles for the system
const ROLES: &[(&str, &str)] = &[
    ("Admin", "Full system administrator with unrestricted access"),
    ("HR Manager", "HR management with employee, payroll, and compliance access"),
    ("Manager", "Department manager with team management capabilities"),
    ("Employee", "Standard employee with basic self-service access"),
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

    for (name, description) in ROLES {
        // Check if role already exists (idempotency)
        let existing = role::Entity::find()
            .filter(role::Column::Name.eq(*name))
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

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_seed_roles_idempotent() {
        // This test would require a test database connection
        // Placeholder for actual test implementation in T027
    }
}
