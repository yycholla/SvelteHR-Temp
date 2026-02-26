//! Event Comment Model
//!
//! Maps to hr_public.event_comments table

use async_graphql::{InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use sea_orm::{entity::prelude::*, QueryFilter};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{database::get_db_from_context, error::AppError};

/// SeaORM Event comment entity
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "event_comments", schema_name = "hr_public")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub event_id: Uuid,
    pub user_id: Uuid,
    pub comment: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
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
        from = "Column::UserId",
        to = "crate::models::user::Column::Id"
    )]
    User,
}

impl ActiveModelBehavior for ActiveModel {}

/// Legacy EventComment struct for GraphQL backward compatibility
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventComment {
    pub id: Uuid,
    pub event_id: Uuid,
    pub user_id: Uuid,
    pub comment: String,
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
    pub comment: String,
}

/// Input for updating an event comment
#[derive(Debug, Clone, InputObject)]
pub struct UpdateEventCommentInput {
    #[graphql(name = "commentText")]
    pub comment: Option<String>,
}

/// GraphQL Object implementation with camelCase field names
#[Object(name = "events_event_comment_Model")]
impl Model {
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
    async fn comment(&self) -> &str {
        &self.comment
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
    async fn event(
        &self,
        ctx: &async_graphql::Context<'_>,
    ) -> GqlResult<crate::models::event::Model> {
        let db = get_db_from_context(ctx)?;
        let event = crate::models::event::Entity::find_by_id(self.event_id)
            .filter(crate::models::event::Column::DeletedAt.is_null())
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Event not found".to_string()))?;

        Ok(event)
    }

    /// User relationship (lazy-loaded)
    async fn user(
        &self,
        ctx: &async_graphql::Context<'_>,
    ) -> GqlResult<crate::models::user::Model> {
        let db = get_db_from_context(ctx)?;
        let user = crate::models::user::Entity::find_by_id(self.user_id)
            .filter(crate::models::user::Column::DeletedAt.is_null())
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

        Ok(user)
    }
}
