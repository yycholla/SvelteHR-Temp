//! Event Comment Model
//!
//! Maps to hr_public.event_comments table

use async_graphql::{InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

/// Comment on an event
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct EventComment {
    pub id: Uuid,
    pub event_id: Uuid,
    pub user_id: Uuid,
    pub comment_text: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

/// Input for creating a new event comment
#[derive(Debug, Clone, InputObject)]
pub struct CreateEventCommentInput {
    #[graphql(name = "eventId")]
    pub event_id: Uuid,
    #[graphql(name = "userId")]
    pub user_id: Uuid,
    #[graphql(name = "commentText")]
    pub comment_text: String,
}

/// Input for updating an event comment
#[derive(Debug, Clone, InputObject)]
pub struct UpdateEventCommentInput {
    #[graphql(name = "commentText")]
    pub comment_text: Option<String>,
}

/// GraphQL Object implementation with camelCase field names
#[Object]
impl EventComment {
    async fn id(&self) -> Uuid {
        self.id
    }

    #[graphql(name = "eventId")]
    async fn event_id(&self) -> Uuid {
        self.event_id
    }

    #[graphql(name = "userId")]
    async fn user_id(&self) -> Uuid {
        self.user_id
    }

    #[graphql(name = "commentText")]
    async fn comment_text(&self) -> &str {
        &self.comment_text
    }

    #[graphql(name = "createdAt")]
    async fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }

    #[graphql(name = "updatedAt")]
    async fn updated_at(&self) -> DateTime<Utc> {
        self.updated_at
    }

    #[graphql(name = "deletedAt")]
    async fn deleted_at(&self) -> Option<DateTime<Utc>> {
        self.deleted_at
    }

    /// Event relationship (lazy-loaded)
    async fn event(&self, ctx: &async_graphql::Context<'_>) -> GqlResult<crate::models::Event> {
        let pool = ctx.data::<PgPool>()?;
        let event = sqlx::query_as::<_, crate::models::Event>(
            r#"
            SELECT id, title, description, start_time, end_time, location,
                   capacity, organizer_id, recurrence_rule, recurrence_end_date,
                   is_recurring, parent_event_id, created_at, updated_at, deleted_at
            FROM hr_public.events
            WHERE id = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(self.event_id)
        .fetch_one(pool)
        .await?;

        Ok(event)
    }

    /// User relationship (lazy-loaded)
    async fn user(&self, ctx: &async_graphql::Context<'_>) -> GqlResult<crate::models::User> {
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
        .bind(self.user_id)
        .fetch_one(pool)
        .await?;

        Ok(user)
    }
}
