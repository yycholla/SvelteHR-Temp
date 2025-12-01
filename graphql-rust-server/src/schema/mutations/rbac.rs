//! RBAC Mutations - Roles, Permissions, and Assignments
//!
//! Comprehensive mutations for managing Role-Based Access Control (RBAC).
//! Includes CRUD operations for roles, permissions, role-permission assignments,
//! and user-role assignments with proper soft-delete support.

use async_graphql::{Context, InputObject, Result, SimpleObject};
use chrono::Utc;
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter, Set};
use uuid::Uuid;

use crate::{
    database::get_db_from_context,
    error::AppError,
    models::{
        permission::{CreatePermissionInput, Model as Permission, UpdatePermissionInput},
        role::{CreateRoleInput, Model as Role, UpdateRoleInput},
        role_permission::Model as RolePermission,
        user_role_assignment::{AssignRoleInput, Model as UserRoleAssignment},
    },
};

/// RBAC mutations
pub struct RbacMutations;

/// Success response for operations
#[derive(SimpleObject)]
pub struct SuccessResponse {
    pub success: bool,
    pub message: String,
}



/// Bulk assign permissions input
#[derive(Debug, Clone, InputObject)]
pub struct BulkAssignPermissionsInput {
    pub role_id: Uuid,
    pub permission_ids: Vec<Uuid>,
}

/// Bulk assign permissions response
#[derive(SimpleObject)]
pub struct BulkAssignPermissionsResponse {
    pub success: bool,
    pub assigned_count: i64,
    pub message: String,
}

/// Bulk remove permissions input
#[derive(Debug, Clone, InputObject)]
pub struct BulkRemovePermissionsInput {
    pub role_id: Uuid,
    pub permission_ids: Vec<Uuid>,
}

/// Bulk remove permissions response
#[derive(SimpleObject)]
pub struct BulkRemovePermissionsResponse {
    pub success: bool,
    pub removed_count: i64,
    pub message: String,
}

#[async_graphql::Object]
impl RbacMutations {
    // =========================================================================
    // Role Mutations
    // =========================================================================

    /// Create a new role
    async fn create_role(&self, ctx: &Context<'_>, input: CreateRoleInput) -> Result<Role> {
        let db = get_db_from_context(ctx)?;

        // Check if role name already exists
        let existing = crate::models::role::Entity::find()
            .filter(crate::models::role::Column::Name.eq(&input.name))
            .filter(crate::models::role::Column::DeletedAt.is_null())
            .one(&db)
            .await?;

        if existing.is_some() {
            return Err(AppError::Validation(format!(
                "Role with name '{}' already exists",
                input.name
            ))
            .into());
        }

        // Create role
        let role = crate::models::role::ActiveModel {
            name: Set(input.name),
            description: Set(input.description),
            level: Set(input.level),
            ..Default::default()
        };

        let role = role.insert(&db).await?;
        Ok(role)
    }

    /// Update an existing role
    async fn update_role(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateRoleInput,
    ) -> Result<Role> {
        let db = get_db_from_context(ctx)?;

        // Find existing role
        let existing_role = crate::models::role::Entity::find_by_id(id)
            .filter(crate::models::role::Column::DeletedAt.is_null())
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Role not found".to_string()))?;

        // Check if new name conflicts with another role
        if let Some(ref new_name) = input.name {
            let conflict = crate::models::role::Entity::find()
                .filter(crate::models::role::Column::Name.eq(new_name))
                .filter(crate::models::role::Column::Id.ne(id))
                .filter(crate::models::role::Column::DeletedAt.is_null())
                .one(&db)
                .await?;

            if conflict.is_some() {
                return Err(AppError::Validation(format!(
                    "Role with name '{}' already exists",
                    new_name
                ))
                .into());
            }
        }

        // Build active model with updates
        let mut role: crate::models::role::ActiveModel = existing_role.into();

        if let Some(name) = input.name {
            role.name = Set(name);
        }

        if let Some(description) = input.description {
            role.description = Set(Some(description));
        }

        if let Some(level) = input.level {
            role.level = Set(level);
        }

        // Update timestamp
        role.updated_at = Set(Utc::now());

        // Save changes
        let updated_role = role.update(&db).await?;
        Ok(updated_role)
    }

    /// Soft delete a role (sets deleted_at timestamp)
    async fn delete_role(&self, ctx: &Context<'_>, id: Uuid) -> Result<SuccessResponse> {
        let db = get_db_from_context(ctx)?;

        // Check if role has active user assignments
        let user_count = crate::models::user_role_assignment::Entity::find()
            .filter(crate::models::user_role_assignment::Column::RoleId.eq(id))
            .filter(crate::models::user_role_assignment::Column::DeletedAt.is_null())
            .count(&db)
            .await?;

        if user_count > 0 {
            return Err(AppError::Validation(format!(
                "Cannot delete role with {} active user assignments. Remove users first.",
                user_count
            ))
            .into());
        }

        // Find the role first to ensure it exists
        let role = crate::models::role::Entity::find_by_id(id)
            .filter(crate::models::role::Column::DeletedAt.is_null())
            .one(&db)
            .await?;

        if role.is_none() {
            return Ok(SuccessResponse {
                success: false,
                message: "Role not found or already deleted".to_string(),
            });
        }

        // Soft delete role by setting deleted_at
        let mut role: crate::models::role::ActiveModel = role.unwrap().into();
        role.deleted_at = Set(Some(Utc::now()));
        role.update(&db).await?;

        // Also soft delete associated role_permissions
        let role_perms = crate::models::role_permission::Entity::find()
            .filter(crate::models::role_permission::Column::RoleId.eq(id))
            .filter(crate::models::role_permission::Column::DeletedAt.is_null())
            .all(&db)
            .await?;

        for rp in role_perms {
            let mut rp: crate::models::role_permission::ActiveModel = rp.into();
            rp.deleted_at = Set(Some(Utc::now()));
            rp.update(&db).await?;
        }

        Ok(SuccessResponse {
            success: true,
            message: "Role deleted successfully".to_string(),
        })
    }

    // =========================================================================
    // Permission Mutations
    // =========================================================================

    /// Create a new permission
    async fn create_permission(
        &self,
        ctx: &Context<'_>,
        input: CreatePermissionInput,
    ) -> Result<Permission> {
        let db = get_db_from_context(ctx)?;

        // Check if permission (resource:action) already exists
        let existing = crate::models::permission::Entity::find()
            .filter(crate::models::permission::Column::Resource.eq(&input.resource))
            .filter(crate::models::permission::Column::Action.eq(&input.action))
            .filter(crate::models::permission::Column::DeletedAt.is_null())
            .one(&db)
            .await?;

        if existing.is_some() {
            return Err(AppError::Validation(format!(
                "Permission '{}:{}' already exists",
                input.resource, input.action
            ))
            .into());
        }

        // Create permission
        let permission = crate::models::permission::ActiveModel {
            resource: Set(input.resource),
            action: Set(input.action),
            description: Set(input.description),
            ..Default::default()
        };

        let permission = permission.insert(&db).await?;
        Ok(permission)
    }

    /// Update an existing permission
    async fn update_permission(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdatePermissionInput,
    ) -> Result<Permission> {
        let db = get_db_from_context(ctx)?;

        // Find existing permission
        let existing_permission = crate::models::permission::Entity::find_by_id(id)
            .filter(crate::models::permission::Column::DeletedAt.is_null())
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Permission not found".to_string()))?;

        // Check if new resource:action conflicts
        if input.resource.is_some() || input.action.is_some() {
            let resource = input
                .resource
                .as_ref()
                .unwrap_or(&existing_permission.resource);
            let action = input.action.as_ref().unwrap_or(&existing_permission.action);

            let conflict = crate::models::permission::Entity::find()
                .filter(crate::models::permission::Column::Resource.eq(resource))
                .filter(crate::models::permission::Column::Action.eq(action))
                .filter(crate::models::permission::Column::Id.ne(id))
                .filter(crate::models::permission::Column::DeletedAt.is_null())
                .one(&db)
                .await?;

            if conflict.is_some() {
                return Err(AppError::Validation(format!(
                    "Permission '{}:{}' already exists",
                    resource, action
                ))
                .into());
            }
        }

        // Build active model with updates
        let mut permission: crate::models::permission::ActiveModel = existing_permission.into();

        if let Some(resource) = input.resource {
            permission.resource = Set(resource);
        }

        if let Some(action) = input.action {
            permission.action = Set(action);
        }

        if let Some(description) = input.description {
            permission.description = Set(Some(description));
        }

        // Update timestamp
        permission.updated_at = Set(Utc::now());

        // Save changes
        let updated_permission = permission.update(&db).await?;
        Ok(updated_permission)
    }

    /// Soft delete a permission
    async fn delete_permission(&self, ctx: &Context<'_>, id: Uuid) -> Result<SuccessResponse> {
        let db = get_db_from_context(ctx)?;

        // Find the permission first
        let permission = crate::models::permission::Entity::find_by_id(id)
            .filter(crate::models::permission::Column::DeletedAt.is_null())
            .one(&db)
            .await?;

        if permission.is_none() {
            return Ok(SuccessResponse {
                success: false,
                message: "Permission not found or already deleted".to_string(),
            });
        }

        // Soft delete permission
        let mut permission: crate::models::permission::ActiveModel = permission.unwrap().into();
        permission.deleted_at = Set(Some(Utc::now()));
        permission.update(&db).await?;

        // Also soft delete associated role_permissions
        let role_perms = crate::models::role_permission::Entity::find()
            .filter(crate::models::role_permission::Column::PermissionId.eq(id))
            .filter(crate::models::role_permission::Column::DeletedAt.is_null())
            .all(&db)
            .await?;

        for rp in role_perms {
            let mut rp: crate::models::role_permission::ActiveModel = rp.into();
            rp.deleted_at = Set(Some(Utc::now()));
            rp.update(&db).await?;
        }

        Ok(SuccessResponse {
            success: true,
            message: "Permission deleted successfully".to_string(),
        })
    }

    // =========================================================================
    // Role-Permission Assignment Mutations
    // =========================================================================

    /// Assign a permission to a role
    async fn assign_permission_to_role(
        &self,
        ctx: &Context<'_>,
        role_id: Uuid,
        permission_id: Uuid,
    ) -> Result<RolePermission> {
        let db = get_db_from_context(ctx)?;

        // Verify role exists
        let _role = crate::models::role::Entity::find_by_id(role_id)
            .filter(crate::models::role::Column::DeletedAt.is_null())
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Role not found".to_string()))?;

        // Verify permission exists
        let _permission = crate::models::permission::Entity::find_by_id(permission_id)
            .filter(crate::models::permission::Column::DeletedAt.is_null())
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Permission not found".to_string()))?;

        // Check if assignment already exists (including soft-deleted ones)
        let existing = crate::models::role_permission::Entity::find()
            .filter(crate::models::role_permission::Column::RoleId.eq(role_id))
            .filter(crate::models::role_permission::Column::PermissionId.eq(permission_id))
            .one(&db)
            .await?;

        if let Some(existing) = existing {
            // If soft-deleted, restore it
            if existing.deleted_at.is_some() {
                let mut role_perm: crate::models::role_permission::ActiveModel = existing.into();
                role_perm.deleted_at = Set(None);
                role_perm.updated_at = Set(Utc::now());
                return Ok(role_perm.update(&db).await?);
            } else {
                return Err(AppError::Validation(
                    "Permission already assigned to this role".to_string(),
                )
                .into());
            }
        }

        // Create new assignment
        let role_permission = crate::models::role_permission::ActiveModel {
            role_id: Set(role_id),
            permission_id: Set(permission_id),
            ..Default::default()
        };

        let role_permission = role_permission.insert(&db).await?;
        Ok(role_permission)
    }

    /// Remove a permission from a role (soft delete)
    async fn remove_permission_from_role(
        &self,
        ctx: &Context<'_>,
        role_id: Uuid,
        permission_id: Uuid,
    ) -> Result<SuccessResponse> {
        let db = get_db_from_context(ctx)?;

        // Find the role_permission assignment
        let role_permission = crate::models::role_permission::Entity::find()
            .filter(crate::models::role_permission::Column::RoleId.eq(role_id))
            .filter(crate::models::role_permission::Column::PermissionId.eq(permission_id))
            .filter(crate::models::role_permission::Column::DeletedAt.is_null())
            .one(&db)
            .await?;

        if role_permission.is_none() {
            return Ok(SuccessResponse {
                success: false,
                message: "Permission assignment not found or already removed".to_string(),
            });
        }

        // Soft delete the assignment
        let mut role_permission: crate::models::role_permission::ActiveModel =
            role_permission.unwrap().into();
        role_permission.deleted_at = Set(Some(Utc::now()));
        role_permission.update(&db).await?;

        Ok(SuccessResponse {
            success: true,
            message: "Permission removed from role successfully".to_string(),
        })
    }

    /// Bulk assign multiple permissions to a role
    async fn bulk_assign_permissions(
        &self,
        ctx: &Context<'_>,
        input: BulkAssignPermissionsInput,
    ) -> Result<BulkAssignPermissionsResponse> {
        let db = get_db_from_context(ctx)?;

        // Verify role exists
        let _ = crate::models::role::Entity::find_by_id(input.role_id)
            .filter(crate::models::role::Column::DeletedAt.is_null())
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Role not found".to_string()))?;

        let mut assigned_count = 0;

        for permission_id in input.permission_ids {
            // Verify permission exists
            let permission = crate::models::permission::Entity::find_by_id(permission_id)
                .filter(crate::models::permission::Column::DeletedAt.is_null())
                .one(&db)
                .await?;

            if permission.is_none() {
                continue; // Skip invalid permissions
            }

            // Check if assignment already exists
            let existing = crate::models::role_permission::Entity::find()
                .filter(crate::models::role_permission::Column::RoleId.eq(input.role_id))
                .filter(crate::models::role_permission::Column::PermissionId.eq(permission_id))
                .one(&db)
                .await?;

            if let Some(existing) = existing {
                // If soft-deleted, restore it
                if existing.deleted_at.is_some() {
                    let mut role_perm: crate::models::role_permission::ActiveModel =
                        existing.into();
                    role_perm.deleted_at = Set(None);
                    role_perm.updated_at = Set(Utc::now());
                    role_perm.update(&db).await?;
                    assigned_count += 1;
                }
                // If already active, skip
            } else {
                // Create new assignment
                let role_permission = crate::models::role_permission::ActiveModel {
                    role_id: Set(input.role_id),
                    permission_id: Set(permission_id),
                    ..Default::default()
                };
                role_permission.insert(&db).await?;
                assigned_count += 1;
            }
        }

        Ok(BulkAssignPermissionsResponse {
            success: true,
            assigned_count,
            message: format!(
                "{} permission(s) assigned to role successfully",
                assigned_count
            ),
        })
    }

    /// Bulk remove multiple permissions from a role
    async fn bulk_remove_permissions(
        &self,
        ctx: &Context<'_>,
        input: BulkRemovePermissionsInput,
    ) -> Result<BulkRemovePermissionsResponse> {
        let db = get_db_from_context(ctx)?;

        let mut removed_count = 0;

        for permission_id in input.permission_ids {
            // Find and soft delete the assignment
            let role_permission = crate::models::role_permission::Entity::find()
                .filter(crate::models::role_permission::Column::RoleId.eq(input.role_id))
                .filter(crate::models::role_permission::Column::PermissionId.eq(permission_id))
                .filter(crate::models::role_permission::Column::DeletedAt.is_null())
                .one(&db)
                .await?;

            if let Some(rp) = role_permission {
                let mut rp: crate::models::role_permission::ActiveModel = rp.into();
                rp.deleted_at = Set(Some(Utc::now()));
                rp.update(&db).await?;
                removed_count += 1;
            }
        }

        Ok(BulkRemovePermissionsResponse {
            success: true,
            removed_count,
            message: format!(
                "{} permission(s) removed from role successfully",
                removed_count
            ),
        })
    }

    // =========================================================================
    // User-Role Assignment Mutations
    // =========================================================================

    /// Assign a role to a user
    async fn assign_role_to_user(
        &self,
        ctx: &Context<'_>,
        input: AssignRoleInput,
    ) -> Result<UserRoleAssignment> {
        let db = get_db_from_context(ctx)?;

        // Verify user exists
        let _ = crate::models::user::Entity::find_by_id(input.user_id)
            .filter(crate::models::user::Column::DeletedAt.is_null())
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

        // Verify role exists
        let _ = crate::models::role::Entity::find_by_id(input.role_id)
            .filter(crate::models::role::Column::DeletedAt.is_null())
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Role not found".to_string()))?;

        // Check if assignment already exists (including soft-deleted ones)
        let existing = crate::models::user_role_assignment::Entity::find()
            .filter(crate::models::user_role_assignment::Column::UserId.eq(input.user_id))
            .filter(crate::models::user_role_assignment::Column::RoleId.eq(input.role_id))
            .one(&db)
            .await?;

        if let Some(existing) = existing {
            // If soft-deleted, restore it
            if existing.deleted_at.is_some() {
                let mut user_role: crate::models::user_role_assignment::ActiveModel =
                    existing.into();
                user_role.deleted_at = Set(None);
                user_role.updated_at = Set(Utc::now());
                return Ok(user_role.update(&db).await?);
            } else {
                return Err(
                    AppError::Validation("Role already assigned to this user".to_string()).into(),
                );
            }
        }

        // Create new assignment
        let user_role = crate::models::user_role_assignment::ActiveModel {
            user_id: Set(input.user_id),
            role_id: Set(input.role_id),
            ..Default::default()
        };

        let user_role = user_role.insert(&db).await?;
        Ok(user_role)
    }

    /// Remove a role from a user (soft delete)
    async fn remove_role_from_user(
        &self,
        ctx: &Context<'_>,
        user_id: Uuid,
        role_id: Uuid,
    ) -> Result<SuccessResponse> {
        let db = get_db_from_context(ctx)?;

        // Find the user_role_assignment
        let user_role = crate::models::user_role_assignment::Entity::find()
            .filter(crate::models::user_role_assignment::Column::UserId.eq(user_id))
            .filter(crate::models::user_role_assignment::Column::RoleId.eq(role_id))
            .filter(crate::models::user_role_assignment::Column::DeletedAt.is_null())
            .one(&db)
            .await?;

        if user_role.is_none() {
            return Ok(SuccessResponse {
                success: false,
                message: "Role assignment not found or already removed".to_string(),
            });
        }

        // Soft delete the assignment
        let mut user_role: crate::models::user_role_assignment::ActiveModel =
            user_role.unwrap().into();
        user_role.deleted_at = Set(Some(Utc::now()));
        user_role.update(&db).await?;

        Ok(SuccessResponse {
            success: true,
            message: "Role removed from user successfully".to_string(),
        })
    }
}
