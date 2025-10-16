//! Bulk Rollback Item Model
//!
//! Maps to hr_public.bulk_rollback_items table

use async_graphql::{InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use sea_orm::{entity::prelude::*, QueryFilter};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use crate::{database::get_db_from_context, error::AppError};

/// SeaORM Bulk rollback item entity
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "bulk_rollback_items")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub batch_id: Uuid,
    pub resource_type: String,
    pub resource_id: Uuid,
    pub rollback_to_timestamp: DateTime<Utc>,
    pub status: String,
    pub error_message: Option<String>,
    pub completed_at: Option<DateTime<Utc>>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::bulk_rollback_batch::Entity",
        from = "Column::BatchId",
        to = "super::bulk_rollback_batch::Column::Id"
    )]
    Batch,
}

impl ActiveModelBehavior for ActiveModel {}

impl Related<super::bulk_rollback_batch::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Batch.def()
    }
}

/// SQLx-compatible BulkRollbackItem struct for backward compatibility during migration
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct BulkRollbackItem {
    pub id: Uuid,
    pub batch_id: Uuid,
    pub resource_type: String,
    pub resource_id: Uuid,
    pub rollback_to_timestamp: DateTime<Utc>,
    pub status: String,
    pub error_message: Option<String>,
    pub completed_at: Option<DateTime<Utc>>,
}

/// Input for creating a new bulk rollback item
#[derive(Debug, Clone, InputObject)]
pub struct CreateBulkRollbackItemInput {
    #[graphql(name = "batchId")]
    pub batch_id: Uuid,
    #[graphql(name = "resourceType")]
    pub resource_type: String,
    #[graphql(name = "resourceId")]
    pub resource_id: Uuid,
    #[graphql(name = "rollbackToTimestamp")]
    pub rollback_to_timestamp: DateTime<Utc>,
}

/// Input for updating a bulk rollback item (status)
#[derive(Debug, Clone, InputObject)]
pub struct UpdateBulkRollbackItemInput {
    pub status: Option<String>,
    #[graphql(name = "errorMessage")]
    pub error_message: Option<String>,
}

/// GraphQL Object implementation with camelCase field names
#[Object(name = "system_bulk_rollback_item_Model")]
impl Model {
    async fn id(&self) -> Uuid {
        self.id
    }

    #[graphql(name = "batchId")]
    async fn batch_id(&self) -> Uuid {
        self.batch_id
    }

    #[graphql(name = "resourceType")]
    async fn resource_type(&self) -> &str {
        &self.resource_type
    }

    #[graphql(name = "resourceId")]
    async fn resource_id(&self) -> Uuid {
        self.resource_id
    }

    #[graphql(name = "rollbackToTimestamp")]
    async fn rollback_to_timestamp(&self) -> DateTime<Utc> {
        self.rollback_to_timestamp
    }

    async fn status(&self) -> &str {
        &self.status
    }

    #[graphql(name = "errorMessage")]
    async fn error_message(&self) -> Option<&str> {
        self.error_message.as_deref()
    }

    #[graphql(name = "completedAt")]
    async fn completed_at(&self) -> Option<DateTime<Utc>> {
        self.completed_at
    }

    /// Batch relationship (lazy-loaded)
    async fn batch(
        &self,
        ctx: &async_graphql::Context<'_>,
    ) -> GqlResult<super::bulk_rollback_batch::Model> {
        let db = get_db_from_context(ctx)?;
        let batch = super::bulk_rollback_batch::Entity::find_by_id(self.batch_id)
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Batch not found".to_string()))?;

        Ok(batch)
    }
}
