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
#[sea_orm(table_name = "bulk_rollback_batches", schema_name = "hr_public")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub requested_by: Uuid,
    pub total_items: i32,
    pub processed_items: i32,
    pub status: String,
    pub completed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "crate::models::user::Entity",
        from = "Column::RequestedBy",
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
    pub requested_by: Uuid,
    pub total_items: i32,
    pub processed_items: i32,
    pub status: String,
    pub completed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

/// Input for creating a new bulk rollback batch
#[derive(Debug, Clone, InputObject)]
pub struct CreateBulkRollbackBatchInput {
    #[graphql(name = "requestedBy")]
    pub requested_by: Uuid,
    #[graphql(name = "totalItems")]
    pub total_items: i32,
}

/// Input for updating a bulk rollback batch (progress/status)
#[derive(Debug, Clone, InputObject)]
pub struct UpdateBulkRollbackBatchInput {
    #[graphql(name = "processedItems")]
    pub processed_items: Option<i32>,
    pub status: Option<String>,
}

/// GraphQL Object implementation with camelCase field names
#[Object(name = "system_bulk_rollback_batch_Model")]
impl Model {
    async fn id(&self) -> Uuid {
        self.id
    }

    #[graphql(name = "requestedBy")]
    async fn requested_by(&self) -> Uuid {
        self.requested_by
    }

    #[graphql(name = "totalItems")]
    async fn total_items(&self) -> i32 {
        self.total_items
    }

    #[graphql(name = "processedItems")]
    async fn processed_items(&self) -> i32 {
        self.processed_items
    }

    async fn status(&self) -> &str {
        &self.status
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
        let user = crate::models::user::Entity::find_by_id(self.requested_by)
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
