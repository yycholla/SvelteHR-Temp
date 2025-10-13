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
    pub report_name: String,
    pub report_type: String,
    pub report_data: JsonValue,
    pub generator_id: Uuid,
    pub generated_at: DateTime<Utc>,
}

/// Input for creating a new HR report
#[derive(Debug, Clone, InputObject)]
pub struct CreateHRReportInput {
    #[graphql(name = "reportName")]
    pub report_name: String,
    #[graphql(name = "reportType")]
    pub report_type: String,
    #[graphql(name = "reportData")]
    pub report_data: String, // JSON string
    #[graphql(name = "generatorId")]
    pub generator_id: Uuid,
}

/// GraphQL Object implementation with camelCase field names
#[Object]
impl HRReport {
    async fn id(&self) -> Uuid {
        self.id
    }

    #[graphql(name = "reportName")]
    async fn report_name(&self) -> &str {
        &self.report_name
    }

    #[graphql(name = "reportType")]
    async fn report_type(&self) -> &str {
        &self.report_type
    }

    #[graphql(name = "reportData")]
    async fn report_data(&self) -> String {
        self.report_data.to_string()
    }

    #[graphql(name = "generatorId")]
    async fn generator_id(&self) -> Uuid {
        self.generator_id
    }

    #[graphql(name = "generatedAt")]
    async fn generated_at(&self) -> DateTime<Utc> {
        self.generated_at
    }

    /// Generator relationship (lazy-loaded)
    async fn generator(&self, ctx: &async_graphql::Context<'_>) -> GqlResult<crate::models::User> {
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
        .bind(self.generator_id)
        .fetch_one(pool)
        .await?;

        Ok(user)
    }
}
