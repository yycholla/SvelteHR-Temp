//! HR Report Model
//!
//! Maps to hr_public.hr_reports table

use async_graphql::{InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use sea_orm::{entity::prelude::*, JsonValue};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{database::get_db_from_context, error::AppError};

/// Generated HR report
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "hr_reports", schema_name = "hr_public")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub title: String,
    pub report_type: String,
    pub generated_by: Uuid,
    pub parameters: Option<JsonValue>,
    pub file_path: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "crate::models::user::Entity",
        from = "Column::GeneratedBy",
        to = "crate::models::user::Column::Id"
    )]
    Creator,
}

impl ActiveModelBehavior for ActiveModel {}

/// Input for creating a new HR report
#[derive(Debug, Clone, InputObject)]
pub struct CreateHRReportInput {
    #[graphql(name = "title")]
    pub title: String,
    #[graphql(name = "reportType")]
    pub report_type: String,
    #[graphql(name = "parameters")]
    pub parameters: Option<String>, // JSON string
    #[graphql(name = "filePath")]
    pub file_path: Option<String>,
    #[graphql(name = "generatedBy")]
    pub generated_by: Uuid,
}

/// GraphQL Object implementation with camelCase field names
#[Object(name = "system_hr_report_Model")]
impl Model {
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

    #[graphql(name = "generatedBy")]
    async fn generated_by(&self) -> Uuid {
        self.generated_by
    }

    #[graphql(name = "parameters")]
    async fn parameters(&self) -> Option<String> {
        self.parameters.as_ref().map(|v| v.to_string())
    }

    #[graphql(name = "filePath")]
    async fn file_path(&self) -> Option<&str> {
        self.file_path.as_deref()
    }

    #[graphql(name = "createdAt")]
    async fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }

    /// Creator relationship (lazy-loaded)
    async fn creator(&self, ctx: &async_graphql::Context<'_>) -> GqlResult<crate::models::User> {
        let db = get_db_from_context(ctx)?;
        let user = crate::models::user::Entity::find_by_id(self.generated_by)
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

        Ok(user)
    }
}
