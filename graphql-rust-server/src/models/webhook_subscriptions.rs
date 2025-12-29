//! Webhook Subscriptions Model

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(schema_name = "hr_public", table_name = "webhook_subscriptions")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: Uuid,
    pub webhook_id: String,
    pub realm_id: String,
    pub event_types: Json,
    pub entity_names: Json,
    pub verifier_token: String,
    pub is_active: bool,
    pub last_delivered_at: Option<DateTimeWithTimeZone>,
    pub failure_count: i32,
    pub metadata: Option<Json>,
    pub created_at: DateTimeWithTimeZone,
    pub updated_at: DateTimeWithTimeZone,
    pub deleted_at: Option<DateTimeWithTimeZone>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::webhook_events::Entity")]
    WebhookEvents,
}

impl Related<super::webhook_events::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::WebhookEvents.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
