//! Role domain model with GraphQL integration
//!
//! Represents RBAC roles with hierarchical levels and permission associations.

use async_graphql::{Context, InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use sea_orm::{entity::prelude::*, FromQueryResult, Related};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{database::get_db_from_context, error::AppError};

/// Role entity - maps to hr_public.roles table
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "roles")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub level: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::permission::Entity")]
    Permissions,
    #[sea_orm(has_many = "super::user_role_assignment::Entity")]
    UserRoleAssignments,
}

impl Related<super::permission::Entity> for Entity {
    fn to() -> RelationDef {
        super::role_permission::Relation::Permission.def()
    }

    fn via() -> Option<RelationDef> {
        Some(super::role_permission::Relation::Role.def().rev())
    }
}

impl Related<super::user_role_assignment::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::UserRoleAssignments.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

/// GraphQL Object implementation for Role
#[Object]
impl Model {
    /// Unique role identifier
    async fn id(&self) -> Uuid {
        self.id
    }

    /// Role name (e.g., Admin, HR_Manager, Manager, Employee)
    async fn name(&self) -> &str {
        &self.name
    }

    /// Role description (optional)
    async fn description(&self) -> Option<&str> {
        self.description.as_deref()
    }

    /// Role hierarchy level (higher = more privileges)
    async fn level(&self) -> i32 {
        self.level
    }

    /// Record creation timestamp
    async fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }

    /// Record last update timestamp
    async fn updated_at(&self) -> DateTime<Utc> {
        self.updated_at
    }

    /// Soft delete timestamp (NULL if not deleted)
    async fn deleted_at(&self) -> Option<DateTime<Utc>> {
        self.deleted_at
    }

    /// Permissions associated with this role
    async fn permissions(&self, ctx: &Context<'_>) -> GqlResult<Vec<super::permission::Model>> {
        let db = get_db_from_context(ctx)?;

        let permissions = Entity::find_by_id(self.id)
            .find_with_related(super::permission::Entity)
            .all(db)
            .await?
            .into_iter()
            .flat_map(|(_, perms)| perms)
            .collect();

        Ok(permissions)
    }

    /// Users assigned to this role
    async fn users(&self, ctx: &Context<'_>) -> GqlResult<Vec<super::user::Model>> {
        let db = get_db_from_context(ctx)?;

        // TODO: Implement proper user loading with DataLoader
        // For now, return empty vec
        Ok(vec![])
    }

    /// Count of users assigned to this role
    async fn user_count(&self, ctx: &Context<'_>) -> GqlResult<i64> {
        let db = get_db_from_context(ctx)?;

        let count = super::user_role_assignment::Entity::find()
            .filter(super::user_role_assignment::Column::RoleId.eq(self.id))
            .filter(super::user_role_assignment::Column::DeletedAt.is_null())
            .count(db)
            .await?;

        Ok(count as i64)
    }

    /// Count of permissions associated with this role
    async fn permission_count(&self, ctx: &Context<'_>) -> GqlResult<i64> {
        let db = get_db_from_context(ctx)?;

        let count = super::role_permission::Entity::find()
            .filter(super::role_permission::Column::RoleId.eq(self.id))
            .filter(super::role_permission::Column::DeletedAt.is_null())
            .count(db)
            .await?;

        Ok(count as i64)
    }
}

/// Role creation input
#[derive(Debug, Clone, InputObject)]
pub struct CreateRoleInput {
    pub name: String,
    pub description: Option<String>,
    pub level: i32,
}

/// Role update input
#[derive(Debug, Clone, InputObject)]
pub struct UpdateRoleInput {
    pub name: Option<String>,
    pub description: Option<String>,
    pub level: Option<i32>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_role_model_compiles() {
        let role = Role {
            id: Uuid::new_v4(),
            name: "Admin".to_string(),
            description: Some("Administrator role".to_string()),
            level: 100,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            deleted_at: None,
        };

        assert_eq!(role.name, "Admin");
        assert_eq!(role.level, 100);
    }
}
