//! TaskDependency domain model with GraphQL integration
//!
//! Represents dependencies between tasks (predecessor-successor relationships).

use async_graphql::{Context, Enum, InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use sea_orm::{entity::prelude::*, FromQueryResult, Related};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{database::get_db_from_context, error::AppError, models::generated::prelude::*};

/// Dependency type
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum)]
pub enum DependencyType {
    /// Task must finish before dependent task can start
    FinishToStart,
    /// Task must finish before dependent task can finish
    FinishToFinish,
    /// Task must start before dependent task can start
    StartToStart,
    /// Task must start before dependent task can finish
    StartToFinish,
}

/// TaskDependency entity - maps to hr_public.task_dependencies table
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "task_dependencies")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub task_id: Uuid,
    pub depends_on_task_id: Uuid,
    pub dependency_type: String, // Using string to match database enum
    pub lag_days: Option<i32>,
    pub created_by: Uuid,
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
        belongs_to = "super::task::Entity",
        from = "Column::DependsOnTaskId",
        to = "super::task::Column::Id"
    )]
    DependsOnTask,
    #[sea_orm(
        belongs_to = "super::user::Entity",
        from = "Column::CreatedBy",
        to = "super::user::Column::Id"
    )]
    CreatedByUser,
}

impl Related<super::task::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Task.def().rev()
    }
}

impl ActiveModelBehavior for ActiveModel {}

/// GraphQL Object implementation for TaskDependency
#[Object]
impl Model {
    /// Unique task dependency identifier
    async fn id(&self) -> Uuid {
        self.id
    }

    /// Task ID (the dependent task)
    async fn task_id(&self) -> Uuid {
        self.task_id
    }

    /// Task ID that this task depends on (the prerequisite)
    async fn depends_on_task_id(&self) -> Uuid {
        self.depends_on_task_id
    }

    /// Type of dependency relationship
    async fn dependency_type(&self) -> DependencyType {
        match self.dependency_type.as_str() {
            "finish_to_start" => DependencyType::FinishToStart,
            "finish_to_finish" => DependencyType::FinishToFinish,
            "start_to_start" => DependencyType::StartToStart,
            "start_to_finish" => DependencyType::StartToFinish,
            _ => DependencyType::FinishToStart, // Default fallback
        }
    }

    /// Lag time in days (positive for delay, negative for overlap)
    async fn lag_days(&self) -> Option<i32> {
        self.lag_days
    }

    /// User ID who created the dependency
    async fn created_by(&self) -> Uuid {
        self.created_by
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

    /// The dependent task (the one that has a dependency)
    async fn task(&self, ctx: &Context<'_>) -> GqlResult<Option<super::task::Model>> {
        let db = get_db_from_context(ctx)?;
        let task = super::task::Entity::find_by_id(self.task_id).one(db).await?;
        Ok(task)
    }

    /// The prerequisite task (the one being depended on)
    async fn depends_on_task(&self, ctx: &Context<'_>) -> GqlResult<Option<super::task::Model>> {
        let db = get_db_from_context(ctx)?;
        let task = super::task::Entity::find_by_id(self.depends_on_task_id).one(db).await?;
        Ok(task)
    }

    /// User who created the dependency
    async fn creator(&self, ctx: &Context<'_>) -> GqlResult<Option<super::user::Model>> {
        let db = get_db_from_context(ctx)?;
        let user = super::user::Entity::find_by_id(self.created_by).one(db).await?;
        Ok(user)
    }

    /// Whether this is a blocking dependency (finish-to-start)
    async fn is_blocking(&self) -> bool {
        self.dependency_type == "finish_to_start"
    }
}

/// TaskDependency creation input
#[derive(Debug, Clone, InputObject)]
pub struct CreateTaskDependencyInput {
    pub task_id: Uuid,
    pub depends_on_task_id: Uuid,
    pub dependency_type: DependencyType,
    pub lag_days: Option<i32>,
}

/// TaskDependency update input
#[derive(Debug, Clone, InputObject)]
pub struct UpdateTaskDependencyInput {
    pub dependency_type: Option<DependencyType>,
    pub lag_days: Option<i32>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_task_dependency_model_compiles() {
        let dependency = Model {
            id: Uuid::new_v4(),
            task_id: Uuid::new_v4(),
            depends_on_task_id: Uuid::new_v4(),
            dependency_type: "finish_to_start".to_string(),
            lag_days: Some(2),
            created_by: Uuid::new_v4(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            deleted_at: None,
        };

        assert_eq!(dependency.dependency_type, "finish_to_start");
    }
}
