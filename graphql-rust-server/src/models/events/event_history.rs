//! Event History Model
//!
//! Maps to hr_public.event_history table

use async_graphql::{InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use sqlx::PgPool;
use uuid::Uuid;

/// Event change history for auditing
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct EventHistory {
    pub id: Uuid,
    pub event_id: Uuid,
    pub changed_by_id: Uuid,
    pub change_type: String,
    pub old_values: Option<JsonValue>,
    pub new_values: Option<JsonValue>,
    pub created_at: DateTime<Utc>,
}

/// Input for creating a new event history entry (audit trail)
#[derive(Debug, Clone, InputObject)]
pub struct CreateEventHistoryInput {
    #[graphql(name = "eventId")]
    pub event_id: Uuid,
    #[graphql(name = "changedById")]
    pub changed_by_id: Uuid,
    #[graphql(name = "changeType")]
    pub change_type: String,
    #[graphql(name = "oldValues")]
    pub old_values: Option<String>, // JSON string
    #[graphql(name = "newValues")]
    pub new_values: Option<String>, // JSON string
}

/// GraphQL Object implementation with camelCase field names
#[Object]
impl EventHistory {
    async fn id(&self) -> Uuid {
        self.id
    }

    #[graphql(name = "eventId")]
    async fn event_id(&self) -> Uuid {
        self.event_id
    }

    #[graphql(name = "changedById")]
    async fn changed_by_id(&self) -> Uuid {
        self.changed_by_id
    }

    #[graphql(name = "changeType")]
    async fn change_type(&self) -> &str {
        &self.change_type
    }

    #[graphql(name = "oldValues")]
    async fn old_values(&self) -> Option<String> {
        self.old_values.as_ref().map(|v| v.to_string())
    }

    #[graphql(name = "newValues")]
    async fn new_values(&self) -> Option<String> {
        self.new_values.as_ref().map(|v| v.to_string())
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

    /// Changed by user relationship (lazy-loaded)
    #[graphql(name = "changedBy")]
    async fn changed_by(&self, ctx: &async_graphql::Context<'_>) -> GqlResult<crate::models::User> {
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
        .bind(self.changed_by_id)
        .fetch_one(pool)
        .await?;

        Ok(user)
    }
}
