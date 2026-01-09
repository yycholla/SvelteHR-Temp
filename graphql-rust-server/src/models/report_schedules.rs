//! Report Schedules Model
//!
//! Automated scheduling for compliance report generation

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(schema_name = "hr_public", table_name = "report_schedules")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: Uuid,
    pub report_type: String,
    pub schedule_cron: String,
    pub recipients: Vec<String>,
    pub enabled: bool,
    pub last_run_at: Option<DateTimeWithTimeZone>,
    pub next_run_at: Option<DateTimeWithTimeZone>,
    pub created_by: Uuid,
    pub created_at: DateTimeWithTimeZone,
    pub updated_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "crate::models::user::Entity",
        from = "Column::CreatedBy",
        to = "crate::models::user::Column::Id"
    )]
    CreatedBy,
}

impl ActiveModelBehavior for ActiveModel {}
