//! Permission domain model with GraphQL integration
//!
//! Represents RBAC permissions for resource-based access control.

use async_graphql::{Context, InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use sea_orm::{entity::prelude::*, Related};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::database::get_db_from_context;

/// Permission entity - maps to hr_public.permissions table
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "permissions", schema_name = "hr_public")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub resource: String,
    pub action: String,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::role::Entity")]
    Roles,
}

impl Related<super::role::Entity> for Entity {
    fn to() -> RelationDef {
        super::role_permission::Relation::Role.def()
    }

    fn via() -> Option<RelationDef> {
        Some(super::role_permission::Relation::Permission.def().rev())
    }
}

impl ActiveModelBehavior for ActiveModel {}

/// GraphQL Object implementation for Permission
#[Object(name = "permission_Model")]
impl Model {
    /// Unique permission identifier
    async fn id(&self) -> Uuid {
        self.id
    }

    /// Resource this permission applies to (e.g., "employees", "departments")
    async fn resource(&self) -> &str {
        &self.resource
    }

    /// Action allowed on the resource (e.g., "read", "write", "delete", "*")
    async fn action(&self) -> &str {
        &self.action
    }

    /// Permission description (optional)
    async fn description(&self) -> Option<&str> {
        self.description.as_deref()
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

    /// Roles that have this permission
    async fn roles(&self, ctx: &Context<'_>) -> GqlResult<Vec<super::role::Model>> {
        let db = get_db_from_context(ctx)?;

        let roles = Entity::find_by_id(self.id)
            .find_with_related(super::role::Entity)
            .all(&db)
            .await?
            .into_iter()
            .flat_map(|(_, roles)| roles)
            .collect();

        Ok(roles)
    }

    /// Count of roles that have this permission
    async fn role_count(&self, ctx: &Context<'_>) -> GqlResult<i64> {
        let db = get_db_from_context(ctx)?;

        let count = super::role_permission::Entity::find()
            .filter(super::role_permission::Column::PermissionId.eq(self.id))
            .filter(super::role_permission::Column::DeletedAt.is_null())
            .count(&db)
            .await?;

        Ok(count as i64)
    }

    /// Full permission string in format "resource:action"
    async fn full_permission(&self) -> String {
        format!("{}:{}", self.resource, self.action)
    }
}

/// Permission creation input
#[derive(Debug, Clone, InputObject)]
pub struct CreatePermissionInput {
    pub resource: String,
    pub action: String,
    pub description: Option<String>,
}

/// Permission update input
#[derive(Debug, Clone, InputObject)]
pub struct UpdatePermissionInput {
    pub resource: Option<String>,
    pub action: Option<String>,
    pub description: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use super::Model as Permission;

    #[test]
    fn test_permission_model_compiles() {
        let permission = Permission {
            id: Uuid::new_v4(),
            resource: "employees".to_string(),
            action: "read".to_string(),
            description: Some("Read employee data".to_string()),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            deleted_at: None,
        };

        assert_eq!(permission.resource, "employees");
        assert_eq!(permission.action, "read");
    }
}
