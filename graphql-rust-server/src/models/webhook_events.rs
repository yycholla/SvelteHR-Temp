//! Webhook Events Model

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(schema_name = "hr_public", table_name = "webhook_events")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: Uuid,
    pub subscription_id: Uuid,
    pub realm_id: String,
    pub event_type: String,
    pub entity_name: String,
    pub entity_id: String,
    pub payload: Json,
    pub status: String,
    pub processed_at: Option<DateTimeWithTimeZone>,
    pub processing_attempts: i32,
    pub last_error: Option<String>,
    pub metadata: Option<Json>,
    pub received_at: DateTimeWithTimeZone,
    pub created_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::webhook_subscriptions::Entity",
        from = "Column::SubscriptionId",
        to = "super::webhook_subscriptions::Column::Id"
    )]
    WebhookSubscription,
}

impl Related<super::webhook_subscriptions::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::WebhookSubscription.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

/// Webhook event type enumeration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum EventType {
    Create,
    Update,
    Delete,
    Merge,
    Void,
}

impl EventType {
    pub fn as_str(&self) -> &str {
        match self {
            EventType::Create => "create",
            EventType::Update => "update",
            EventType::Delete => "delete",
            EventType::Merge => "merge",
            EventType::Void => "void",
        }
    }
}

/// Webhook event status enumeration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum EventStatus {
    Pending,
    Processing,
    Completed,
    Failed,
    Retrying,
}

impl EventStatus {
    pub fn as_str(&self) -> &str {
        match self {
            EventStatus::Pending => "pending",
            EventStatus::Processing => "processing",
            EventStatus::Completed => "completed",
            EventStatus::Failed => "failed",
            EventStatus::Retrying => "retrying",
        }
    }
}

/// QuickBooks entity name enumeration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum EntityName {
    Employee,
    Department,
    Customer,
    Vendor,
    Item,
    Invoice,
    Payment,
}

impl EntityName {
    pub fn as_str(&self) -> &str {
        match self {
            EntityName::Employee => "Employee",
            EntityName::Department => "Department",
            EntityName::Customer => "Customer",
            EntityName::Vendor => "Vendor",
            EntityName::Item => "Item",
            EntityName::Invoice => "Invoice",
            EntityName::Payment => "Payment",
        }
    }
}
