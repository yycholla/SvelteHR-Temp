//! Permission loading utilities
//!
//! Shared functions for loading user roles and permissions from the database

use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter};
use uuid::Uuid;

/// Load user's RBAC roles and permissions from database
///
/// This function queries the database to load:
/// 1. User's roles from user_role_assignments table
/// 2. Permissions for each role from role_permissions table
///
/// Admin role automatically receives wildcard permission "*" (all permissions).
///
/// Returns tuple of (roles, permissions) where permissions are formatted as "resource:action"
pub async fn get_user_roles_and_permissions(
    db: &DatabaseConnection,
    user_id: Uuid,
) -> Result<(Vec<String>, Vec<String>), sea_orm::DbErr> {
    // Query user role assignments with role names from roles table
    let role_assignments = crate::models::user_role_assignment::Entity::find()
        .filter(crate::models::user_role_assignment::Column::UserId.eq(user_id))
        .filter(crate::models::user_role_assignment::Column::DeletedAt.is_null())
        .find_also_related(crate::models::role::Entity)
        .all(db)
        .await?;

    // Extract role names, filtering out deleted roles
    let roles: Vec<String> = role_assignments
        .into_iter()
        .filter_map(|(_, role)| {
            role.and_then(|r| {
                if r.deleted_at.is_none() {
                    Some(r.name)
                } else {
                    None
                }
            })
        })
        .collect();

    // For Admin role, grant all permissions via wildcard
    if roles.iter().any(|r| r == "Admin") {
        return Ok((roles, vec!["*".to_string()]));
    }

    // Query permissions from role_permissions table for all user roles
    let mut permissions: Vec<String> = Vec::new();

    for role_name in &roles {
        // Find the role by name
        let role = crate::models::role::Entity::find()
            .filter(crate::models::role::Column::Name.eq(role_name))
            .filter(crate::models::role::Column::DeletedAt.is_null())
            .one(db)
            .await?;

        if let Some(role) = role {
            // Query role_permissions join table
            let role_perms = crate::models::role_permission::Entity::find()
                .filter(crate::models::role_permission::Column::RoleId.eq(role.id))
                .filter(crate::models::role_permission::Column::DeletedAt.is_null())
                .find_also_related(crate::models::permission::Entity)
                .all(db)
                .await?;

            // Extract permission strings (resource:action format), filtering deleted permissions
            for (_, permission) in role_perms {
                if let Some(perm) = permission {
                    // Skip deleted permissions
                    if perm.deleted_at.is_some() {
                        continue;
                    }
                    let perm_string = format!("{}:{}", perm.resource, perm.action);
                    if !permissions.contains(&perm_string) {
                        permissions.push(perm_string);
                    }
                }
            }
        }
    }

    Ok((roles, permissions))
}
