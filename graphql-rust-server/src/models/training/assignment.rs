use async_graphql::{SimpleObject, InputObject};
use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize, SimpleObject)]
#[sea_orm(table_name = "assignments", schema_name = "hr_public")]
#[graphql(name = "TrainingAssignment")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub user_id: Uuid,
    pub training_id: Uuid,
    pub assigned_at: DateTime<Utc>,
    pub due_date: Option<DateTime<Utc>>,
}

/// Training assignment with user information populated
#[derive(Clone, Debug, SimpleObject)]
pub struct TrainingAssignmentWithUser {
    pub id: Uuid,
    pub user_id: Uuid,
    pub training_id: Uuid,
    pub assigned_at: DateTime<Utc>,
    pub due_date: Option<DateTime<Utc>>,
    pub user: Option<crate::models::user::Model>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "crate::models::user::Entity",
        from = "Column::UserId",
        to = "crate::models::user::Column::Id"
    )]
    User,
    #[sea_orm(
        belongs_to = "super::training::Entity",
        from = "Column::TrainingId",
        to = "super::training::Column::Id"
    )]
    Training,
}

impl Related<crate::models::user::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::User.def()
    }
}

impl Related<super::training::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Training.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

#[derive(InputObject)]
#[graphql(name = "CreateTrainingAssignmentInput")]
pub struct CreateAssignmentInput {
    pub user_id: Uuid,
    pub training_id: Uuid,
    pub due_date: Option<DateTime<Utc>>,
}
