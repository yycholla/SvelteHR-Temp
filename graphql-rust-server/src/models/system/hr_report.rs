//! HR Report Model
//!
//! Maps to hr_public.hr_reports table

use async_graphql::{InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use sqlx::PgPool;
use uuid::Uuid;

/// Generated HR report
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct HRReport {
    pub id: Uuid,
    pub title: String,
    pub report_type: String,
    pub data: JsonValue,
    pub creator_id: Uuid,
    pub generated_at: DateTime<Utc>,
}

/// Input for creating a new HR report
#[derive(Debug, Clone, InputObject)]
pub struct CreateHRReportInput {
    #[graphql(name = "title")]
    pub title: String,
    #[graphql(name = "reportType")]
    pub report_type: String,
    #[graphql(name = "category")]
    pub category: String,
    #[graphql(name = "data")]
    pub data: String, // JSON string
    #[graphql(name = "creatorId")]
    pub creator_id: Uuid,
    #[graphql(name = "departmentId")]
    pub department_id: Uuid,
}

/// GraphQL Object implementation with camelCase field names
#[Object]
impl HRReport {
    async fn id(&self) -> Uuid {
        self.id
    }

    #[graphql(name = "title")]
    async fn title(&self) -> &str {
        &self.title
    }

    #[graphql(name = "reportType")]
    async fn report_type(&self) -> &str {
        &self.report_type
    }

    #[graphql(name = "data")]
    async fn data(&self) -> String {
        self.data.to_string()
    }

    #[graphql(name = "creatorId")]
    async fn creator_id(&self) -> Uuid {
        self.creator_id
    }

    #[graphql(name = "generatedAt")]
    async fn generated_at(&self) -> DateTime<Utc> {
        self.generated_at
    }

    /// Creator relationship (lazy-loaded)
    async fn creator(&self, ctx: &async_graphql::Context<'_>) -> GqlResult<crate::models::User> {
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
        .bind(self.creator_id)
        .fetch_one(pool)
        .await?;

        Ok(user)
    }
}
