//! Permission domain model with GraphQL integration
//!
//! Represents RBAC permissions for resource-based access control.

use async_graphql::{Context, InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

/// Permission model - maps to hr_public.permissions table
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Permission {
    pub id: Uuid,
    pub resource: String,
    pub action: String,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

/// GraphQL Object implementation for Permission
#[Object]
impl Permission {
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
    async fn roles(&self, ctx: &Context<'_>) -> GqlResult<Vec<super::role::Role>> {
        let pool = ctx.data::<PgPool>()?;

        let roles = sqlx::query_as::<_, super::role::Role>(
            r#"
            SELECT r.id, r.name, r.description, r.level,
                   r.created_at, r.updated_at, r.deleted_at
            FROM hr_public.roles r
            INNER JOIN hr_public.role_permissions rp ON r.id = rp.role_id
            WHERE rp.permission_id = $1 AND r.deleted_at IS NULL AND rp.deleted_at IS NULL
            ORDER BY r.level DESC, r.name
            "#,
        )
        .bind(self.id)
        .fetch_all(pool)
        .await?;

        Ok(roles)
    }

    /// Count of roles that have this permission
    async fn role_count(&self, ctx: &Context<'_>) -> GqlResult<i64> {
        let pool = ctx.data::<PgPool>()?;

        let count: (i64,) = sqlx::query_as(
            r#"
            SELECT COUNT(*)::bigint
            FROM hr_public.role_permissions
            WHERE permission_id = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(self.id)
        .fetch_one(pool)
        .await?;

        Ok(count.0)
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
