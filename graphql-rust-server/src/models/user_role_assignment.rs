//! UserRoleAssignment domain model with GraphQL integration
//!
//! Represents the assignment of roles to users with audit trail.

use async_graphql::{Context, InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use sea_orm::{entity::prelude::*, FromQueryResult, Related};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{database::get_db_from_context, error::AppError, models::generated::prelude::*};


/// UserRoleAssignment entity - maps to hr_public.user_role_assignments table
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "user_role_assignments")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub user_id: Uuid,
    pub role_id: Uuid,
    pub assigned_by: Option<Uuid>,
    pub assigned_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::user::Entity",
        from = "Column::UserId",
        to = "super::user::Column::Id"
    )]
    User,
    #[sea_orm(
        belongs_to = "super::role::Entity",
        from = "Column::RoleId",
        to = "super::role::Column::Id"
    )]
    Role,
    #[sea_orm(
        belongs_to = "super::user::Entity",
        from = "Column::AssignedBy",
        to = "super::user::Column::Id"
    )]
    AssignedByUser,
}

impl Related<super::user::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::User.def().rev()
    }
}

impl Related<super::role::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Role.def().rev()
    }
}

impl ActiveModelBehavior for ActiveModel {}

/// UserRoleAssignments connection for Relay-style pagination (PostGraphile compatibility)
#[derive(Debug, Clone)]
pub struct UserRoleAssignmentsConnection {
    pub nodes: Vec<Model>,
    pub total_count: i64,
}

#[Object]
impl UserRoleAssignmentsConnection {
    async fn nodes(&self) -> &Vec<Model> {
        &self.nodes
    }

    async fn total_count(&self) -> i64 {
        self.total_count
    }
}

/// GraphQL Object implementation for UserRoleAssignment
#[Object]
impl Model {
    /// Unique assignment identifier
    async fn id(&self) -> Uuid {
        self.id
    }

    /// User ID (foreign key)
    async fn user_id(&self) -> Uuid {
        self.user_id
    }

    /// Role ID (foreign key)
    async fn role_id(&self) -> Uuid {
        self.role_id
    }

    /// Role name (loaded from role relationship)
    async fn role_name(&self, ctx: &Context<'_>) -> GqlResult<String> {
        let db = get_db_from_context(ctx)?;
        let role = super::role::Entity::find_by_id(self.role_id).one(db).await?;
        Ok(role.map(|r| r.name).unwrap_or_else(|| "Unknown".to_string()))
    }

    /// User ID who assigned this role (optional)
    async fn assigned_by(&self) -> Option<Uuid> {
        self.assigned_by
    }

    /// When the role was assigned
    async fn assigned_at(&self) -> DateTime<Utc> {
        self.assigned_at
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

    /// User who has this role assignment
    async fn user(&self, ctx: &Context<'_>) -> GqlResult<Option<super::user::Model>> {
        let db = get_db_from_context(ctx)?;
        let user = super::user::Entity::find_by_id(self.user_id).one(db).await?;
        Ok(user)
    }

    /// Role that was assigned
    async fn role(&self, ctx: &Context<'_>) -> GqlResult<Option<super::role::Model>> {
        let db = get_db_from_context(ctx)?;
        let role = super::role::Entity::find_by_id(self.role_id).one(db).await?;
        Ok(role)
    }



    /// User who assigned this role (if tracked)
    async fn assigned_by_user(&self, ctx: &Context<'_>) -> GqlResult<Option<super::user::Model>> {
        if let Some(assigner_id) = self.assigned_by {
            let db = get_db_from_context(ctx)?;
            let user = super::user::Entity::find_by_id(assigner_id).one(db).await?;
            Ok(user)
        } else {
            Ok(None)
        }
    }
}

/// UserRoleAssignment creation input
#[derive(Debug, Clone, InputObject)]
pub struct AssignRoleInput {
    pub user_id: Uuid,
    pub role_id: Uuid,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_user_role_assignment_model_compiles() {
        let assignment = Model {
            id: Uuid::new_v4(),
            user_id: Uuid::new_v4(),
            role_id: Uuid::new_v4(),
            assigned_by: Some(Uuid::new_v4()),
            assigned_at: Utc::now(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            deleted_at: None,
        };

        assert!(assignment.assigned_by.is_some());
    }
}
