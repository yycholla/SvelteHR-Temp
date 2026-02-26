//! Permission Builder
//!
//! Seeds ~30 core permissions for RBAC system

use sea_orm::{ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, Set};
use uuid::Uuid;

use crate::models::permission;
use crate::seed_data::audit::log_seed_creation;
use crate::seed_data::context::{EntitySeedResult, SeedContext};
use crate::seed_data::Result;

/// Core permissions organized by resource type
const PERMISSIONS: &[(&str, &str, &str)] = &[
    // Employee permissions
    ("employees:read", "employees", "View employee information"),
    (
        "employees:write",
        "employees",
        "Create and update employees",
    ),
    ("employees:delete", "employees", "Delete employees"),
    // Department permissions
    ("departments:read", "departments", "View departments"),
    (
        "departments:write",
        "departments",
        "Create and update departments",
    ),
    ("departments:delete", "departments", "Delete departments"),
    // Role permissions
    ("roles:read", "roles", "View roles"),
    ("roles:write", "roles", "Create and update roles"),
    ("roles:delete", "roles", "Delete roles"),
    // Permission permissions
    ("permissions:read", "permissions", "View permissions"),
    (
        "permissions:write",
        "permissions",
        "Create and update permissions",
    ),
    ("permissions:delete", "permissions", "Delete permissions"),
    // Leave permissions
    ("leave:read", "leave", "View leave requests"),
    ("leave:write", "leave", "Create and update leave requests"),
    ("leave:approve", "leave", "Approve or reject leave requests"),
    ("leave:delete", "leave", "Delete leave requests"),
    // Event permissions
    ("events:read", "events", "View events"),
    ("events:write", "events", "Create and update events"),
    ("events:delete", "events", "Delete events"),
    // Document permissions
    ("documents:read", "documents", "View documents"),
    (
        "documents:write",
        "documents",
        "Upload and update documents",
    ),
    ("documents:delete", "documents", "Delete documents"),
    // Performance review permissions
    ("reviews:read", "reviews", "View performance reviews"),
    (
        "reviews:write",
        "reviews",
        "Create and update performance reviews",
    ),
    ("reviews:delete", "reviews", "Delete performance reviews"),
    // Task permissions
    ("tasks:read", "tasks", "View tasks"),
    ("tasks:write", "tasks", "Create and update tasks"),
    ("tasks:delete", "tasks", "Delete tasks"),
    // Time entry permissions
    ("time:read", "time", "View time entries"),
    ("time:write", "time", "Create and update time entries"),
    ("time:delete", "time", "Delete time entries"),
    // System settings permissions
    (
        "system_settings:read",
        "system_settings",
        "View system settings",
    ),
    (
        "system_settings:write",
        "system_settings",
        "Update system settings",
    ),
];

/// Seed permissions into the database
///
/// Uses skip-existing strategy based on permission name.
pub async fn seed_permissions(
    db: &DatabaseConnection,
    context: &SeedContext,
) -> Result<EntitySeedResult> {
    let mut result = EntitySeedResult::new("permissions");

    for (name, resource, description) in PERMISSIONS {
        // Extract action from name (e.g., "employees:read" -> "read")
        let action = name.split(':').nth(1).unwrap_or("unknown");

        // Check if permission already exists (idempotency)
        let existing = permission::Entity::find()
            .filter(permission::Column::Resource.eq(*resource))
            .filter(permission::Column::Action.eq(action))
            .one(db)
            .await?;

        if existing.is_some() {
            result.skipped_count += 1;
            tracing::debug!("Permission '{}' already exists, skipping", name);
            continue;
        }

        // Create new permission
        let permission_id = Uuid::new_v4();
        let now = chrono::Utc::now();
        let new_permission = permission::ActiveModel {
            id: Set(permission_id),
            resource: Set(resource.to_string()),
            action: Set(action.to_string()),
            description: Set(Some(description.to_string())),
            created_at: Set(now),
            updated_at: Set(now),
            deleted_at: Set(None),
        };

        match new_permission.insert(db).await {
            Ok(_) => {
                result.created_count += 1;
                tracing::info!("Created permission: {}", name);

                // Log to audit system
                if let Err(e) = log_seed_creation(db, context, "permission", permission_id).await {
                    tracing::warn!("Failed to log audit entry for permission {}: {}", name, e);
                }
            }
            Err(e) => {
                result.failed_count += 1;
                result
                    .errors
                    .push(format!("Failed to create permission {}: {}", name, e));
                tracing::error!("Failed to create permission {}: {}", name, e);
            }
        }
    }

    Ok(result)
}
