use async_graphql::{SimpleObject, InputObject, Enum};
use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, EnumIter, DeriveActiveEnum, Serialize, Deserialize, Enum)]
#[sea_orm(rs_type = "String", db_type = "String(None)")]
pub enum ContentType {
    #[sea_orm(string_value = "TEXT")]
    Text,
    #[sea_orm(string_value = "VIDEO")]
    Video,
    #[sea_orm(string_value = "URL")]
    Url,
    #[sea_orm(string_value = "IMAGE")]
    Image,
    #[sea_orm(string_value = "DOCUMENT")]
    Document,
}

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize, SimpleObject)]
#[sea_orm(table_name = "training_contents", schema_name = "hr_public")]
#[graphql(name = "TrainingContent")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub training_id: Uuid,
    pub title: String,
    pub r#type: ContentType,
    pub data: String, // Could be text content, video URL, or link
    pub sequence_order: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::training::Entity",
        from = "Column::TrainingId",
        to = "super::training::Column::Id"
    )]
    Training,
}

impl Related<super::training::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Training.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

#[derive(InputObject)]
pub struct CreateTrainingContentInput {
    pub training_id: Uuid,
    pub title: String,
    pub r#type: ContentType,
    pub data: String,
    pub sequence_order: Option<i32>,
}

#[derive(InputObject)]
pub struct UpdateTrainingContentInput {
    pub title: Option<String>,
    pub r#type: Option<ContentType>,
    pub data: Option<String>,
    pub sequence_order: Option<i32>,
}
