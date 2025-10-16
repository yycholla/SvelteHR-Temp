//! HR Report Model
//!
//! Maps to hr_public.hr_reports table

use async_graphql::{InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use sea_orm::{entity::prelude::*, JsonValue, QueryFilter};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{database::get_db_from_context, error::AppError};

/// Generated HR report
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "hr_reports")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub title: String,
    pub report_type: String,
    pub data: JsonValue,
    pub creator_id: Uuid,
    pub generated_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "crate::models::user::Entity",
        from = "Column::CreatorId",
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
        let db = get_db_from_context(ctx)?;
        let user = crate::models::user::Entity::find_by_id(self.creator_id)
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

        Ok(user)
    }
}
