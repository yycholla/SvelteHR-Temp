//! Activity Log Model
//!
//! Maps to hr_public.activity_logs table

use async_graphql::{InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use sqlx::PgPool;
use uuid::Uuid;

/// System activity audit log
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ActivityLog {
    pub id: Uuid,
    pub user_id: Option<Uuid>,
    pub action_type: String,
    pub resource_type: Option<String>,
    pub resource_id: Option<Uuid>,
    pub details: Option<JsonValue>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub created_at: DateTime<Utc>,
}

/// Input for creating a new activity log entry (audit trail)
#[derive(Debug, Clone, InputObject)]
pub struct CreateActivityLogInput {
    #[graphql(name = "userId")]
    pub user_id: Option<Uuid>,
    #[graphql(name = "actionType")]
    pub action_type: String,
    #[graphql(name = "resourceType")]
    pub resource_type: Option<String>,
    #[graphql(name = "resourceId")]
    pub resource_id: Option<Uuid>,
    pub details: Option<String>, // JSON string
    #[graphql(name = "ipAddress")]
    pub ip_address: Option<String>,
    #[graphql(name = "userAgent")]
    pub user_agent: Option<String>,
}

/// GraphQL Object implementation with camelCase field names
#[Object]
impl ActivityLog {
    async fn id(&self) -> Uuid {
        self.id
    }

    #[graphql(name = "userId")]
    async fn user_id(&self) -> Option<Uuid> {
        self.user_id
    }

    #[graphql(name = "actionType")]
    async fn action_type(&self) -> &str {
        &self.action_type
    }

    #[graphql(name = "resourceType")]
    async fn resource_type(&self) -> Option<&str> {
        self.resource_type.as_deref()
    }

    #[graphql(name = "resourceId")]
    async fn resource_id(&self) -> Option<Uuid> {
        self.resource_id
    }

    async fn details(&self) -> Option<String> {
        self.details.as_ref().map(|v| v.to_string())
    }

    #[graphql(name = "ipAddress")]
    async fn ip_address(&self) -> Option<&str> {
        self.ip_address.as_deref()
    }

    #[graphql(name = "userAgent")]
    async fn user_agent(&self) -> Option<&str> {
        self.user_agent.as_deref()
    }

    #[graphql(name = "createdAt")]
    async fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }

    /// User relationship (lazy-loaded)
    async fn user(&self, ctx: &async_graphql::Context<'_>) -> GqlResult<Option<crate::models::User>> {
        if let Some(user_id) = self.user_id {
            let pool = ctx.data::<PgPool>()?;
            let user = sqlx::query_as::<_, crate::models::User>(
                r#"
                SELECT id, email, first_name, last_name, full_name, phone,
                       department_id, manager_id, hire_date, termination_date,
                       status, created_at, updated_at, deleted_at
                FROM hr_public.users
                WHERE id = $1 AND deleted_at IS NULL
                "#,
            )
            .bind(user_id)
            .fetch_optional(pool)
            .await?;

            Ok(user)
        } else {
            Ok(None)
        }
    }
}
