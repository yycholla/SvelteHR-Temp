//! UserRoleAssignment domain model with GraphQL integration
//!
//! Represents the assignment of roles to users with audit trail.

use async_graphql::{Context, InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use crate::loaders::batch_load_users;

/// UserRoleAssignment model - maps to hr_public.user_role_assignments table
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct UserRoleAssignment {
    pub id: Uuid,
    pub user_id: Uuid,
    pub role_id: Uuid,
    pub assigned_by: Option<Uuid>,
    pub assigned_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

/// GraphQL Object implementation for UserRoleAssignment
#[Object]
impl UserRoleAssignment {
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
    async fn user(&self, ctx: &Context<'_>) -> GqlResult<Option<super::user::User>> {
        let pool = ctx.data::<PgPool>()?;
        let users_map = batch_load_users(pool, &[self.user_id]).await?;
        Ok(users_map.get(&self.user_id).cloned())
    }

    /// Role that was assigned
    async fn role(&self, ctx: &Context<'_>) -> GqlResult<Option<super::role::Role>> {
        let pool = ctx.data::<PgPool>()?;

        let role = sqlx::query_as::<_, super::role::Role>(
            r#"
            SELECT id, name, description, level,
                   created_at, updated_at, deleted_at
            FROM hr_public.roles
            WHERE id = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(self.role_id)
        .fetch_optional(pool)
        .await?;

        Ok(role)
    }

    /// User who assigned this role (if tracked)
    async fn assigner(&self, ctx: &Context<'_>) -> GqlResult<Option<super::user::User>> {
        if let Some(assigner_id) = self.assigned_by {
            let pool = ctx.data::<PgPool>()?;
            let users_map = batch_load_users(pool, &[assigner_id]).await?;
            Ok(users_map.get(&assigner_id).cloned())
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
        let assignment = UserRoleAssignment {
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
