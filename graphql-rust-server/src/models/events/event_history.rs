//! Event History Model
//!
//! Maps to hr_public.event_history table

use async_graphql::{InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use sea_orm::{entity::prelude::*, QueryFilter};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use uuid::Uuid;

use crate::{database::get_db_from_context, error::AppError};

/// SeaORM Event history entity
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "event_history")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub event_id: Uuid,
    pub changed_by_id: Uuid,
    pub change_type: String,
    pub old_values: Option<JsonValue>,
    pub new_values: Option<JsonValue>,
    pub created_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "crate::models::event::Entity",
        from = "Column::EventId",
        to = "crate::models::event::Column::Id"
    )]
    Event,
    #[sea_orm(
        belongs_to = "crate::models::user::Entity",
        from = "Column::ChangedById",
        to = "crate::models::user::Column::Id"
    )]
    ChangedBy,
}

impl ActiveModelBehavior for ActiveModel {}

/// Legacy EventHistory struct for GraphQL backward compatibility
#[derive(Debug, Clone, Serialize, Deserialize)]
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
impl Model {
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
    async fn event(&self, ctx: &async_graphql::Context<'_>) -> GqlResult<crate::models::event::Model> {
        let db = get_db_from_context(ctx)?;
        let event = crate::models::event::Entity::find_by_id(self.event_id)
            .filter(crate::models::event::Column::DeletedAt.is_null())
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Event not found".to_string()))?;

        Ok(event)
    }

    /// Changed by user relationship (lazy-loaded)
    #[graphql(name = "changedBy")]
    async fn changed_by(&self, ctx: &async_graphql::Context<'_>) -> GqlResult<crate::models::user::Model> {
        let db = get_db_from_context(ctx)?;
        let user = crate::models::user::Entity::find_by_id(self.changed_by_id)
            .filter(crate::models::user::Column::DeletedAt.is_null())
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

        Ok(user)
    }
}
