use async_graphql::{Context, Enum, Object, Result};
use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::database::get_db_from_context;

#[derive(
    Debug, Clone, Copy, PartialEq, Eq, EnumIter, DeriveActiveEnum, Serialize, Deserialize, Enum,
)]
#[sea_orm(rs_type = "String", db_type = "String(None)")]
pub enum ImportJobStatus {
    #[sea_orm(string_value = "PENDING")]
    Pending,
    #[sea_orm(string_value = "MAPPED")]
    Mapped,
    #[sea_orm(string_value = "VALIDATED")]
    Validated,
    #[sea_orm(string_value = "COMPLETED")]
    Completed,
    #[sea_orm(string_value = "FAILED")]
    Failed,
}

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "employee_import_jobs", schema_name = "hr_public")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub status: ImportJobStatus,
    pub total_rows: i32,
    pub valid_rows: i32,
    pub error_rows: i32,
    pub mapping_config: Option<Json>,
    pub matching_strategy: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
    pub created_by: Option<Uuid>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::import_row::Entity")]
    ImportRows,
    #[sea_orm(
        belongs_to = "crate::models::user::Entity",
        from = "Column::CreatedBy",
        to = "crate::models::user::Column::Id"
    )]
    Creator,
}

impl Related<super::import_row::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::ImportRows.def()
    }
}

impl Related<crate::models::user::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Creator.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

#[Object(name = "EmployeeImportJob")]
impl Model {
    async fn id(&self) -> Uuid {
        self.id
    }
    async fn status(&self) -> ImportJobStatus {
        self.status
    }
    async fn total_rows(&self) -> i32 {
        self.total_rows
    }
    async fn valid_rows(&self) -> i32 {
        self.valid_rows
    }
    async fn error_rows(&self) -> i32 {
        self.error_rows
    }
    // JSON fields need special handling in GQL usually, or return as String
    async fn mapping_config(&self) -> Option<String> {
        self.mapping_config.as_ref().map(|j| j.to_string())
    }
    async fn matching_strategy(&self) -> Option<&str> {
        self.matching_strategy.as_deref()
    }
    async fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }
    async fn updated_at(&self) -> DateTime<Utc> {
        self.updated_at
    }
    async fn completed_at(&self) -> Option<DateTime<Utc>> {
        self.completed_at
    }

    async fn import_rows(&self, ctx: &Context<'_>) -> Result<Vec<super::import_row::Model>> {
        let db = get_db_from_context(ctx)?;
        let rows = self
            .find_related(super::import_row::Entity)
            .all(&db)
            .await?;
        Ok(rows)
    }
}
