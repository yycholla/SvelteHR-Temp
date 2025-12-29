//! Validation Rule entity model

use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, Serialize, Deserialize)]
#[sea_orm(table_name = "validation_rules")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub entity_type: String,
    pub field_name: String,
    pub rule_type: String,
    pub condition: String,
    pub severity: String,
    pub auto_fix_strategy: String,
    pub enabled: bool,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::validation_failure::Entity")]
    ValidationFailures,
}

impl Related<super::validation_failure::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::ValidationFailures.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
