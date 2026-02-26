use async_graphql::{InputObject, SimpleObject};
use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize, SimpleObject)]
#[sea_orm(table_name = "onboarding_assignments", schema_name = "hr_public")]
#[graphql(name = "OnboardingAssignment")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub user_id: Uuid,
    pub onboarding_module_id: Uuid,
    pub assigned_by_id: Option<Uuid>,
    pub assigned_at: DateTime<Utc>,
    pub due_date: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
}

/// Onboarding assignment with module information populated
#[derive(Clone, Debug, SimpleObject)]
#[graphql(name = "OnboardingAssignmentWithModule")]
pub struct AssignmentWithModule {
    pub id: Uuid,
    pub user_id: Uuid,
    pub onboarding_module_id: Uuid,
    pub assigned_by_id: Option<Uuid>,
    pub assigned_at: DateTime<Utc>,
    pub due_date: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub onboarding_module: Option<super::onboarding_module::Model>,
}

/// Onboarding assignment with user information populated
#[derive(Clone, Debug, SimpleObject)]
#[graphql(name = "OnboardingAssignmentWithUser")]
pub struct AssignmentWithUser {
    pub id: Uuid,
    pub user_id: Uuid,
    pub onboarding_module_id: Uuid,
    pub assigned_by_id: Option<Uuid>,
    pub assigned_at: DateTime<Utc>,
    pub due_date: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
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
        belongs_to = "super::onboarding_module::Entity",
        from = "Column::OnboardingModuleId",
        to = "super::onboarding_module::Column::Id"
    )]
    OnboardingModule,
}

impl Related<crate::models::user::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::User.def()
    }
}

impl Related<super::onboarding_module::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::OnboardingModule.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

#[derive(InputObject)]
#[graphql(name = "CreateOnboardingAssignmentInput")]
pub struct CreateAssignmentInput {
    pub user_id: Uuid,
    pub onboarding_module_id: Uuid,
    pub due_date: Option<DateTime<Utc>>,
}

#[derive(InputObject)]
#[graphql(name = "UpdateOnboardingAssignmentInput")]
pub struct UpdateAssignmentInput {
    pub due_date: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
}
