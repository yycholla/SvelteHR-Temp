//! Bulk Rollback Item Model
//!
//! Maps to hr_public.bulk_rollback_items table

use async_graphql::{InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

/// Individual item in a bulk rollback batch
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
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
#[Object]
impl BulkRollbackItem {
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
    ) -> GqlResult<super::bulk_rollback_batch::BulkRollbackBatch> {
        let pool = ctx.data::<PgPool>()?;
        let batch = sqlx::query_as::<_, super::bulk_rollback_batch::BulkRollbackBatch>(
            r#"
            SELECT id, batch_name, requester_id, total_items, completed_items,
                   status, started_at, completed_at, created_at
            FROM hr_public.bulk_rollback_batches
            WHERE id = $1
            "#,
        )
        .bind(self.batch_id)
        .fetch_one(pool)
        .await?;

        Ok(batch)
    }
}
