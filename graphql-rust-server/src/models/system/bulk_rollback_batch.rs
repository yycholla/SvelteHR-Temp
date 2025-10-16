//! Bulk Rollback Batch Model
//!
//! Maps to hr_public.bulk_rollback_batches table

use async_graphql::{InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use sea_orm::{entity::prelude::*, QueryFilter};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use crate::{database::get_db_from_context, error::AppError};

/// SeaORM Bulk rollback batch entity
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "bulk_rollback_batches")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub batch_name: String,
    pub requester_id: Uuid,
    pub total_items: i32,
    pub completed_items: i32,
    pub status: String,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "crate::models::user::Entity",
        from = "Column::RequesterId",
        to = "crate::models::user::Column::Id"
    )]
    Requester,
    #[sea_orm(has_many = "super::bulk_rollback_item::Entity")]
    Items,
}

impl ActiveModelBehavior for ActiveModel {}

/// SQLx-compatible BulkRollbackBatch struct for backward compatibility during migration
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct BulkRollbackBatch {
    pub id: Uuid,
    pub batch_name: String,
    pub requester_id: Uuid,
    pub total_items: i32,
    pub completed_items: i32,
    pub status: String,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

/// Input for creating a new bulk rollback batch
#[derive(Debug, Clone, InputObject)]
pub struct CreateBulkRollbackBatchInput {
    #[graphql(name = "batchName")]
    pub batch_name: String,
    #[graphql(name = "requesterId")]
    pub requester_id: Uuid,
    #[graphql(name = "totalItems")]
    pub total_items: i32,
}

/// Input for updating a bulk rollback batch (progress/status)
#[derive(Debug, Clone, InputObject)]
pub struct UpdateBulkRollbackBatchInput {
    #[graphql(name = "completedItems")]
    pub completed_items: Option<i32>,
    pub status: Option<String>,
}

/// GraphQL Object implementation with camelCase field names
#[Object]
impl Model {
    async fn id(&self) -> Uuid {
        self.id
    }

    #[graphql(name = "batchName")]
    async fn batch_name(&self) -> &str {
        &self.batch_name
    }

    #[graphql(name = "requesterId")]
    async fn requester_id(&self) -> Uuid {
        self.requester_id
    }

    #[graphql(name = "totalItems")]
    async fn total_items(&self) -> i32 {
        self.total_items
    }

    #[graphql(name = "completedItems")]
    async fn completed_items(&self) -> i32 {
        self.completed_items
    }

    async fn status(&self) -> &str {
        &self.status
    }

    #[graphql(name = "startedAt")]
    async fn started_at(&self) -> Option<DateTime<Utc>> {
        self.started_at
    }

    #[graphql(name = "completedAt")]
    async fn completed_at(&self) -> Option<DateTime<Utc>> {
        self.completed_at
    }

    #[graphql(name = "createdAt")]
    async fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }

    /// Requester relationship (lazy-loaded)
    async fn requester(&self, ctx: &async_graphql::Context<'_>) -> GqlResult<crate::models::user::Model> {
        let db = get_db_from_context(ctx)?;
        let user = crate::models::user::Entity::find_by_id(self.requester_id)
            .filter(crate::models::user::Column::DeletedAt.is_null())
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Requester not found".to_string()))?;

        Ok(user)
    }

    /// Items relationship (lazy-loaded)
    async fn items(
        &self,
        ctx: &async_graphql::Context<'_>,
    ) -> GqlResult<Vec<super::bulk_rollback_item::Model>> {
        let db = get_db_from_context(ctx)?;
        let items = super::bulk_rollback_item::Entity::find()
            .filter(super::bulk_rollback_item::Column::BatchId.eq(self.id))
            .all(&db)
            .await?;

        Ok(items)
    }
}
