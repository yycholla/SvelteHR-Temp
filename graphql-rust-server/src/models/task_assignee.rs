//! TaskAssignee domain model with GraphQL integration
//!
//! Represents the many-to-many relationship between tasks and users (assignees).

use async_graphql::{Context, Enum, InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use sea_orm::{entity::prelude::*, Related};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{database::get_db_from_context, models::generated::prelude::*};

/// Assignee role in the task
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum)]
pub enum AssigneeRole {
    Owner,
    Assignee,
    Reviewer,
    Collaborator,
}

impl AssigneeRole {
    pub fn as_str(&self) -> &'static str {
        match self {
            AssigneeRole::Owner => "owner",
            AssigneeRole::Assignee => "assignee",
            AssigneeRole::Reviewer => "reviewer",
            AssigneeRole::Collaborator => "collaborator",
        }
    }
}

/// TaskAssignee entity - maps to hr_public.task_assignees table
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "task_assignees", schema_name = "hr_public")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub task_id: Uuid,
    pub user_id: Uuid,
    pub role: String, // Using string to match database enum
    pub assigned_at: DateTime<Utc>,
    pub assigned_by: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::task::Entity",
        from = "Column::TaskId",
        to = "super::task::Column::Id"
    )]
    Task,
    #[sea_orm(
        belongs_to = "super::user::Entity",
        from = "Column::UserId",
        to = "super::user::Column::Id"
    )]
    User,
    #[sea_orm(
        belongs_to = "super::user::Entity",
        from = "Column::AssignedBy",
        to = "super::user::Column::Id"
    )]
    AssignedByUser,
}

impl Related<super::task::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Task.def().rev()
    }
}

impl Related<super::user::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::User.def().rev()
    }
}

impl ActiveModelBehavior for ActiveModel {}

/// GraphQL Object implementation for TaskAssignee
#[Object(name = "task_assignee_Model")]
impl Model {
    /// Unique task assignee identifier
    async fn id(&self) -> Uuid {
        self.id
    }

    /// Task ID (foreign key)
    async fn task_id(&self) -> Uuid {
        self.task_id
    }

    /// User ID (foreign key)
    async fn user_id(&self) -> Uuid {
        self.user_id
    }

    /// Role of the assignee in this task
    async fn role(&self) -> AssigneeRole {
        match self.role.as_str() {
            "owner" => AssigneeRole::Owner,
            "assignee" => AssigneeRole::Assignee,
            "reviewer" => AssigneeRole::Reviewer,
            "collaborator" => AssigneeRole::Collaborator,
            _ => AssigneeRole::Assignee, // Default fallback
        }
    }

    /// When the user was assigned to the task
    async fn assigned_at(&self) -> DateTime<Utc> {
        self.assigned_at
    }

    /// User ID who made the assignment
    async fn assigned_by(&self) -> Uuid {
        self.assigned_by
    }

    /// Record creation timestamp
    async fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }

    /// Record last update timestamp
    async fn updated_at(&self) -> DateTime<Utc> {
        self.updated_at
    }

    /// Soft delete timestamp (NULL if not deleted)
    async fn deleted_at(&self) -> Option<DateTime<Utc>> {
        self.deleted_at
    }

    /// Task associated with this assignment
    async fn task(&self, ctx: &Context<'_>) -> GqlResult<Option<super::task::Model>> {
        let db = get_db_from_context(ctx)?;
        let task = super::task::Entity::find_by_id(self.task_id).one(&db).await?;
        Ok(task)
    }

    /// User assigned to the task
    async fn user(&self, ctx: &Context<'_>) -> GqlResult<Option<super::user::Model>> {
        let db = get_db_from_context(ctx)?;
        let user = super::user::Entity::find_by_id(self.user_id).one(&db).await?;
        Ok(user)
    }

    /// User who made the assignment
    async fn assigner(&self, ctx: &Context<'_>) -> GqlResult<Option<super::user::Model>> {
        let db = get_db_from_context(ctx)?;
        let user = super::user::Entity::find_by_id(self.assigned_by).one(&db).await?;
        Ok(user)
    }

    /// Whether this is the task owner
    async fn is_owner(&self) -> bool {
        self.role == "owner"
    }
}

/// TaskAssignee creation input
#[derive(Debug, Clone, InputObject)]
pub struct AssignTaskInput {
    pub task_id: Uuid,
    pub user_id: Uuid,
    pub role: AssigneeRole,
}

/// TaskAssignee update input
#[derive(Debug, Clone, InputObject)]
pub struct UpdateTaskAssigneeInput {
    pub role: Option<AssigneeRole>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_task_assignee_model_compiles() {
        let assignee = Model {
            id: Uuid::new_v4(),
            task_id: Uuid::new_v4(),
            user_id: Uuid::new_v4(),
            role: "assignee".to_string(),
            assigned_at: Utc::now(),
            assigned_by: Uuid::new_v4(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            deleted_at: None,
        };

        assert_eq!(assignee.role, "assignee");
    }
}
