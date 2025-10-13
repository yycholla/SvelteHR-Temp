//! Bulk Rollback Batch Model
//!
//! Maps to hr_public.bulk_rollback_batches table

use async_graphql::{InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

/// Bulk rollback batch for multiple items
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
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
impl BulkRollbackBatch {
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
    async fn requester(&self, ctx: &async_graphql::Context<'_>) -> GqlResult<crate::models::User> {
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
        .bind(self.requester_id)
        .fetch_one(pool)
        .await?;

        Ok(user)
    }

    /// Items relationship (lazy-loaded)
    async fn items(
        &self,
        ctx: &async_graphql::Context<'_>,
    ) -> GqlResult<Vec<super::bulk_rollback_item::BulkRollbackItem>> {
        let pool = ctx.data::<PgPool>()?;
        let items = sqlx::query_as::<_, super::bulk_rollback_item::BulkRollbackItem>(
            r#"
            SELECT id, batch_id, resource_type, resource_id, rollback_to_timestamp,
                   status, error_message, completed_at
            FROM hr_public.bulk_rollback_items
            WHERE batch_id = $1
            ORDER BY created_at
            "#,
        )
        .bind(self.id)
        .fetch_all(pool)
        .await?;

        Ok(items)
    }
}
