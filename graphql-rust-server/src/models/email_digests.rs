//! Email Digests Model
//!
//! Configuration for automated email digest sending with customizable schedules and content

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(schema_name = "hr_public", table_name = "email_digests")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: Uuid,
    pub name: String,
    pub schedule_cron: String,
    pub recipients: Vec<String>,
    pub include_sync_summary: bool,
    pub include_conflicts: bool,
    pub include_health_metrics: bool,
    pub include_new_employees: bool,
    pub template_id: Option<Uuid>,
    pub enabled: bool,
    pub last_sent_at: Option<DateTimeWithTimeZone>,
    pub next_send_at: Option<DateTimeWithTimeZone>,
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

    #[sea_orm(has_many = "crate::models::email_digest_log::Entity")]
    DigestLogs,
}

impl Related<crate::models::user::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::CreatedBy.def()
    }
}

impl Related<crate::models::email_digest_log::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::DigestLogs.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

/// Digest frequency for common schedules
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DigestFrequency {
    Daily,
    Weekly,
    Monthly,
    Custom,
}

impl DigestFrequency {
    pub fn to_cron(&self) -> &str {
        match self {
            DigestFrequency::Daily => "0 9 * * *",      // Daily at 9 AM
            DigestFrequency::Weekly => "0 9 * * 1",     // Weekly Monday at 9 AM
            DigestFrequency::Monthly => "0 9 1 * *",    // Monthly on 1st at 9 AM
            DigestFrequency::Custom => "",              // User provides custom cron
        }
    }

    pub fn from_cron(cron: &str) -> Self {
        match cron {
            "0 9 * * *" => DigestFrequency::Daily,
            "0 9 * * 1" => DigestFrequency::Weekly,
            "0 9 1 * *" => DigestFrequency::Monthly,
            _ => DigestFrequency::Custom,
        }
    }
}
