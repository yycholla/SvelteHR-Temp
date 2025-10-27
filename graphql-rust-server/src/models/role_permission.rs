//! Role-Permission junction table model
//!
//! Junction table linking roles to permissions in the RBAC system.

use async_graphql::{Context, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::database::get_db_from_context;

/// Role-Permission junction entity - maps to hr_public.role_permissions table
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "role_permissions", schema_name = "hr_public")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub role_id: Uuid,
    pub permission_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::role::Entity",
        from = "Column::RoleId",
        to = "super::role::Column::Id"
    )]
    Role,
    #[sea_orm(
        belongs_to = "super::permission::Entity",
        from = "Column::PermissionId",
        to = "super::permission::Column::Id"
    )]
    Permission,
}

impl Related<super::role::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Role.def()
    }
}

impl Related<super::permission::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Permission.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

/// GraphQL Object implementation for RolePermission
#[Object(name = "role_permission_Model")]
impl Model {
    /// Unique role-permission assignment identifier
    async fn id(&self) -> Uuid {
        self.id
    }

    /// Associated role ID
    async fn role_id(&self) -> Uuid {
        self.role_id
    }

    /// Associated permission ID
    async fn permission_id(&self) -> Uuid {
        self.permission_id
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

    /// Get the associated role
    async fn role(&self, ctx: &Context<'_>) -> GqlResult<Option<super::role::Model>> {
        let db = get_db_from_context(ctx)?;

        let role = super::role::Entity::find_by_id(self.role_id)
            .filter(super::role::Column::DeletedAt.is_null())
            .one(&db)
            .await?;

        Ok(role)
    }

    /// Get the associated permission
    async fn permission(&self, ctx: &Context<'_>) -> GqlResult<Option<super::permission::Model>> {
        let db = get_db_from_context(ctx)?;

        let permission = super::permission::Entity::find_by_id(self.permission_id)
            .filter(super::permission::Column::DeletedAt.is_null())
            .one(&db)
            .await?;

        Ok(permission)
    }
}