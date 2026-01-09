//! Email Digest Log Model
//!
//! Tracking of email digest delivery attempts, success/failure, and content summaries

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(schema_name = "hr_public", table_name = "email_digest_log")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: Uuid,
    pub digest_id: Uuid,
    pub sent_at: DateTimeWithTimeZone,
    pub recipients: Vec<String>,
    pub success: bool,
    pub error_message: Option<String>,
    pub period_start: Option<DateTimeWithTimeZone>,
    pub period_end: Option<DateTimeWithTimeZone>,
    pub content_summary: Option<Json>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "crate::models::email_digests::Entity",
        from = "Column::DigestId",
        to = "crate::models::email_digests::Column::Id"
    )]
    EmailDigest,
}

impl Related<crate::models::email_digests::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::EmailDigest.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

/// Summary statistics included in digest log
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DigestContentSummary {
    pub total_syncs: i32,
    pub successful_syncs: i32,
    pub failed_syncs: i32,
    pub conflicts_detected: i32,
    pub conflicts_resolved: i32,
    pub new_employees: i32,
    pub updated_employees: i32,
    pub data_quality_score: Option<f64>,
}
