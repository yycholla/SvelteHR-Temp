use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, Serialize, Deserialize)]
#[sea_orm(table_name = "sync_schedule_history", schema_name = "hr_public")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub schedule_id: Uuid,
    pub started_at: DateTimeWithTimeZone,
    pub completed_at: Option<DateTimeWithTimeZone>,
    pub status: String,
    pub records_synced: Option<i32>,
    pub records_pushed: Option<i32>,
    pub records_pulled: Option<i32>,
    pub errors_count: Option<i32>,
    pub error_message: Option<String>,
    pub execution_time_ms: Option<i32>,
    pub created_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::sync_schedule::Entity",
        from = "Column::ScheduleId",
        to = "super::sync_schedule::Column::Id"
    )]
    Schedule,
}

impl Related<super::sync_schedule::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Schedule.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
