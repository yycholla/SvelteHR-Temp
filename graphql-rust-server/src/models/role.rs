//! Role domain model with GraphQL integration
//!
//! Represents RBAC roles with hierarchical levels and permission associations.

use async_graphql::{Context, InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

/// Role model - maps to hr_public.roles table
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Role {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub level: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

/// GraphQL Object implementation for Role
#[Object]
impl Role {
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
    async fn permissions(&self, ctx: &Context<'_>) -> GqlResult<Vec<super::permission::Permission>> {
        let pool = ctx.data::<PgPool>()?;

        let permissions = sqlx::query_as::<_, super::permission::Permission>(
            r#"
            SELECT p.id, p.resource, p.action, p.description,
                   p.created_at, p.updated_at, p.deleted_at
            FROM hr_public.permissions p
            INNER JOIN hr_public.role_permissions rp ON p.id = rp.permission_id
            WHERE rp.role_id = $1 AND p.deleted_at IS NULL AND rp.deleted_at IS NULL
            ORDER BY p.resource, p.action
            "#,
        )
        .bind(self.id)
        .fetch_all(pool)
        .await?;

        Ok(permissions)
    }

    /// Users assigned to this role
    async fn users(&self, ctx: &Context<'_>) -> GqlResult<Vec<super::user::User>> {
        let pool = ctx.data::<PgPool>()?;

        let users = sqlx::query_as::<_, super::user::User>(
            r#"
            SELECT u.id, u.email, u.first_name, u.last_name, u.full_name, u.phone,
                   u.department_id, u.manager_id, u.hire_date, u.termination_date,
                   u.status, u.created_at, u.updated_at, u.deleted_at
            FROM hr_public.users u
            INNER JOIN hr_public.user_role_assignments ura ON u.id = ura.user_id
            WHERE ura.role_id = $1 AND u.deleted_at IS NULL AND ura.deleted_at IS NULL
            ORDER BY u.last_name, u.first_name
            "#,
        )
        .bind(self.id)
        .fetch_all(pool)
        .await?;

        Ok(users)
    }

    /// Count of users assigned to this role
    async fn user_count(&self, ctx: &Context<'_>) -> GqlResult<i64> {
        let pool = ctx.data::<PgPool>()?;

        let count: (i64,) = sqlx::query_as(
            r#"
            SELECT COUNT(*)::bigint
            FROM hr_public.user_role_assignments
            WHERE role_id = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(self.id)
        .fetch_one(pool)
        .await?;

        Ok(count.0)
    }

    /// Count of permissions associated with this role
    async fn permission_count(&self, ctx: &Context<'_>) -> GqlResult<i64> {
        let pool = ctx.data::<PgPool>()?;

        let count: (i64,) = sqlx::query_as(
            r#"
            SELECT COUNT(*)::bigint
            FROM hr_public.role_permissions
            WHERE role_id = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(self.id)
        .fetch_one(pool)
        .await?;

        Ok(count.0)
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
