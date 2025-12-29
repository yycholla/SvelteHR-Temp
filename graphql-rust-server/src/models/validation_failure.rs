//! Validation Failure entity model

use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, Serialize, Deserialize)]
#[sea_orm(table_name = "validation_failures")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub rule_id: Uuid,
    pub entity_type: String,
    pub entity_id: Option<String>,
    pub field_name: String,
    pub invalid_value: Option<String>,
    pub error_message: String,
    pub severity: String,
    pub detected_at: DateTime<Utc>,
    pub resolved_at: Option<DateTime<Utc>>,
    pub resolution: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::validation_rule::Entity",
        from = "Column::RuleId",
        to = "super::validation_rule::Column::Id",
        on_update = "Cascade",
        on_delete = "Cascade"
    )]
    ValidationRule,
}

impl Related<super::validation_rule::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::ValidationRule.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
