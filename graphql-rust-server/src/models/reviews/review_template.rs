//! Review Template Model
//!
//! Maps to hr_public.review_templates table

use async_graphql::{InputObject, Object};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use uuid::Uuid;

/// Reusable review template with predefined sections
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ReviewTemplate {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub sections: Option<JsonValue>,
    pub is_active: bool,
    pub created_by_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Input for creating a new review template
#[derive(Debug, Clone, InputObject)]
pub struct CreateReviewTemplateInput {
    pub name: String,
    pub description: Option<String>,
    pub sections: Option<String>, // JSON string
    #[graphql(name = "createdById")]
    pub created_by_id: Uuid,
}

/// Input for updating a review template
#[derive(Debug, Clone, InputObject)]
pub struct UpdateReviewTemplateInput {
    pub name: Option<String>,
    pub description: Option<String>,
    pub sections: Option<String>, // JSON string
    #[graphql(name = "isActive")]
    pub is_active: Option<bool>,
}

/// GraphQL Object implementation with camelCase field names
#[Object]
impl ReviewTemplate {
    async fn id(&self) -> Uuid {
        self.id
    }

    async fn name(&self) -> &str {
        &self.name
    }

    async fn description(&self) -> Option<&str> {
        self.description.as_deref()
    }

    async fn sections(&self) -> Option<String> {
        self.sections.as_ref().map(|v| v.to_string())
    }

    #[graphql(name = "isActive")]
    async fn is_active(&self) -> bool {
        self.is_active
    }

    #[graphql(name = "createdById")]
    async fn created_by_id(&self) -> Uuid {
        self.created_by_id
    }

    #[graphql(name = "createdAt")]
    async fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }

    #[graphql(name = "updatedAt")]
    async fn updated_at(&self) -> DateTime<Utc> {
        self.updated_at
    }

    /// Creator relationship (lazy-loaded)
    #[graphql(name = "createdBy")]
    async fn created_by(
        &self,
        ctx: &async_graphql::Context<'_>,
    ) -> async_graphql::Result<crate::models::User> {
        let pool = ctx.data::<sqlx::PgPool>()?;
        let user = sqlx::query_as::<_, crate::models::User>(
            r#"
            SELECT id, email, first_name, last_name, full_name, phone,
                   department_id, manager_id, hire_date, termination_date,
                   status, created_at, updated_at, deleted_at
            FROM hr_public.users
            WHERE id = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(self.created_by_id)
        .fetch_one(pool)
        .await?;

        Ok(user)
    }
}
