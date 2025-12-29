//! Intuit QuickBooks connection model

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "intuit_connections", schema_name = "hr_public")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: Uuid,
    pub realm_id: String,
    pub access_token: String,
    pub refresh_token: String,
    pub token_expires_at: DateTimeWithTimeZone,
    pub company_name: Option<String>,
    pub is_active: bool,
    pub last_sync_at: Option<DateTimeWithTimeZone>,

    // Incremental sync tracking per entity type (Feature 3)
    pub employee_sync_token: Option<String>,
    pub department_sync_token: Option<String>,
    pub last_employee_sync_at: Option<DateTimeWithTimeZone>,
    pub last_department_sync_at: Option<DateTimeWithTimeZone>,

    pub created_at: DateTimeWithTimeZone,
    pub updated_at: DateTimeWithTimeZone,
    pub deleted_at: Option<DateTimeWithTimeZone>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
