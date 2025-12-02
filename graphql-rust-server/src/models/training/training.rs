use async_graphql::{SimpleObject, InputObject};
use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize, SimpleObject)]
#[sea_orm(table_name = "trainings", schema_name = "hr_public")]
#[graphql(name = "Training")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub is_active: bool,
    pub meta_title: Option<String>,
    pub meta_description: Option<String>,
    #[sea_orm(column_type = "Text", nullable)]
    pub tags: Option<Vec<String>>,
    pub author_id: Option<Uuid>,
    // Recurrence fields (RFC 5545 RRULE)
    pub rrule: Option<String>,
    pub recurrence_id: Option<Uuid>,
    pub recurrence_end_date: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::content::Entity")]
    Contents,
    #[sea_orm(has_many = "super::assignment::Entity")]
    Assignments,
}

impl Related<super::content::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Contents.def()
    }
}

impl Related<super::assignment::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Assignments.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

#[derive(InputObject)]
pub struct CreateTrainingInput {
    pub title: String,
    pub description: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub is_active: Option<bool>,
    pub meta_title: Option<String>,
    pub meta_description: Option<String>,
    pub tags: Option<Vec<String>>,
    pub author_id: Option<Uuid>,
    // Recurrence fields
    pub rrule: Option<String>,
    pub recurrence_id: Option<Uuid>,
    pub recurrence_end_date: Option<DateTime<Utc>>,
}

#[derive(InputObject)]
pub struct UpdateTrainingInput {
    pub title: Option<String>,
    pub description: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub is_active: Option<bool>,
    pub meta_title: Option<String>,
    pub meta_description: Option<String>,
    pub tags: Option<Vec<String>>,
    pub author_id: Option<Uuid>,
    // Recurrence fields
    pub rrule: Option<String>,
    pub recurrence_id: Option<Uuid>,
    pub recurrence_end_date: Option<DateTime<Utc>>,
}
