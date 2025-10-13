//! Event Waitlist Model
//!
//! Maps to hr_public.event_waitlist table

use async_graphql::{InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

/// Waitlist entry for at-capacity events
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct EventWaitlist {
    pub id: Uuid,
    pub event_id: Uuid,
    pub user_id: Uuid,
    pub position: i32,
    pub promoted: bool,
    pub promoted_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

/// Input for creating a new event waitlist entry
#[derive(Debug, Clone, InputObject)]
pub struct CreateEventWaitlistInput {
    #[graphql(name = "eventId")]
    pub event_id: Uuid,
    #[graphql(name = "userId")]
    pub user_id: Uuid,
    pub position: i32,
}

/// Input for updating an event waitlist entry (promotion)
#[derive(Debug, Clone, InputObject)]
pub struct UpdateEventWaitlistInput {
    pub promoted: Option<bool>,
}

/// GraphQL Object implementation with camelCase field names
#[Object]
impl EventWaitlist {
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

    async fn position(&self) -> i32 {
        self.position
    }

    async fn promoted(&self) -> bool {
        self.promoted
    }

    #[graphql(name = "promotedAt")]
    async fn promoted_at(&self) -> Option<DateTime<Utc>> {
        self.promoted_at
    }

    #[graphql(name = "createdAt")]
    async fn created_at(&self) -> DateTime<Utc> {
        self.created_at
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
