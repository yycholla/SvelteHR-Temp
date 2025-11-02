//! Task domain model with GraphQL integration
//!
//! Represents tasks in the HR system with status tracking, assignments, and dependencies.

use async_graphql::{Context, Enum, InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use sea_orm::{entity::prelude::*, QueryOrder, Related};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{database::get_db_from_context, dataloader::DataLoaderContext, models::generated::prelude::*};

/// Custom validator for future dates
fn validate_future_date(value: &DateTime<Utc>) -> Result<(), String> {
    if *value < Utc::now() {
        return Err("Due date must be in the future".to_string());
    }
    Ok(())
}

/// Task status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum)]
pub enum TaskStatus {
    Todo,
    InProgress,
    Blocked,
    Review,
    Done,
    Cancelled,
}

impl TaskStatus {
    pub fn as_str(&self) -> &str {
        match self {
            TaskStatus::Todo => "todo",
            TaskStatus::InProgress => "in_progress",
            TaskStatus::Blocked => "blocked",
            TaskStatus::Review => "review",
            TaskStatus::Done => "done",
            TaskStatus::Cancelled => "cancelled",
        }
    }
}

/// Task priority
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum)]
pub enum TaskPriority {
    Low,
    Medium,
    High,
    Urgent,
}

impl TaskPriority {
    pub fn as_str(&self) -> &str {
        match self {
            TaskPriority::Low => "low",
            TaskPriority::Medium => "medium",
            TaskPriority::High => "high",
            TaskPriority::Urgent => "urgent",
        }
    }
}

/// Task entity - maps to hr_public.tasks table
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "tasks", schema_name = "hr_public")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub task_type_id: Option<Uuid>,
    pub status: String, // Using string to match database enum
    pub priority: String, // Using string to match database enum
    pub due_date: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub estimated_hours: Option<i32>,
    pub actual_hours: Option<i32>,
    pub tags: Option<Vec<String>>,
    pub department_id: Option<Uuid>,
    pub created_by: Uuid,
    pub assignee_id: Option<Uuid>,
    pub parent_task_id: Option<Uuid>,
    pub requires_manual_reassignment: Option<bool>,
    pub archived: bool,
    pub archived_at: Option<DateTime<Utc>>,
    pub archived_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::user::Entity",
        from = "Column::CreatedBy",
        to = "super::user::Column::Id"
    )]
    Creator,
    #[sea_orm(
        belongs_to = "super::user::Entity",
        from = "Column::AssigneeId",
        to = "super::user::Column::Id"
    )]
    Assignee,
    #[sea_orm(
        belongs_to = "super::department::Entity",
        from = "Column::DepartmentId",
        to = "super::department::Column::Id"
    )]
    Department,
    #[sea_orm(
        belongs_to = "Entity",
        from = "Column::ParentTaskId",
        to = "Column::Id"
    )]
    Parent,
    #[sea_orm(
        belongs_to = "super::tasks::task_type::Entity",
        from = "Column::TaskTypeId",
        to = "super::tasks::task_type::Column::Id"
    )]
    TaskType,
}

impl Related<super::user::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Creator.def().rev()
    }
}

impl Related<Entity> for super::user::Entity {
    fn to() -> RelationDef {
        Relation::Assignee.def().rev()
    }
}

impl Related<super::tasks::task_type::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::TaskType.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

/// GraphQL Object implementation for Task
#[Object(name = "Task")]
impl Model {
    /// Unique task identifier
    async fn id(&self) -> Uuid {
        self.id
    }

    /// Task title
    async fn title(&self) -> &str {
        &self.title
    }

    /// Task description
    async fn description(&self) -> Option<&str> {
        self.description.as_deref()
    }

    /// Task type ID for categorization
    async fn task_type_id(&self) -> Option<Uuid> {
        self.task_type_id
    }

    /// Whether task requires manual reassignment approval
    async fn requires_manual_reassignment(&self) -> Option<bool> {
        self.requires_manual_reassignment
    }

    /// User ID assigned to the task (primary assignee)
    async fn assignee_id(&self) -> Option<Uuid> {
        self.assignee_id
    }

    /// Current task status
    async fn status(&self) -> TaskStatus {
        match self.status.as_str() {
            "todo" => TaskStatus::Todo,
            "in_progress" => TaskStatus::InProgress,
            "blocked" => TaskStatus::Blocked,
            "review" => TaskStatus::Review,
            "done" => TaskStatus::Done,
            "cancelled" => TaskStatus::Cancelled,
            _ => TaskStatus::Todo, // Default fallback
        }
    }

    /// Task priority level
    async fn priority(&self) -> TaskPriority {
        match self.priority.as_str() {
            "low" => TaskPriority::Low,
            "medium" => TaskPriority::Medium,
            "high" => TaskPriority::High,
            "urgent" => TaskPriority::Urgent,
            _ => TaskPriority::Medium, // Default fallback
        }
    }

    /// Task due date
    async fn due_date(&self) -> Option<DateTime<Utc>> {
        self.due_date
    }

    /// Task completion timestamp
    async fn completed_at(&self) -> Option<DateTime<Utc>> {
        self.completed_at
    }

    /// Estimated hours to complete
    async fn estimated_hours(&self) -> Option<i32> {
        self.estimated_hours
    }

    /// Actual hours spent
    async fn actual_hours(&self) -> Option<i32> {
        self.actual_hours
    }

    /// Task tags for categorization
    async fn tags(&self) -> Option<Vec<String>> {
        self.tags.clone()
    }

    /// Department ID if task is department-specific
    async fn department_id(&self) -> Option<Uuid> {
        self.department_id
    }

    /// User ID who created the task
    #[graphql(name = "creatorId")]
    async fn created_by(&self) -> Uuid {
        self.created_by
    }



    /// Parent task ID (for subtasks)
    async fn parent_task_id(&self) -> Option<Uuid> {
        self.parent_task_id
    }

    /// Whether task is archived
    async fn archived(&self) -> bool {
        self.archived
    }

    /// Timestamp when task was archived
    async fn archived_at(&self) -> Option<DateTime<Utc>> {
        self.archived_at
    }

    /// User ID who archived the task
    async fn archived_by(&self) -> Option<Uuid> {
        self.archived_by
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

    /// User who created the task
    async fn creator(&self, ctx: &Context<'_>) -> GqlResult<Option<super::user::Model>> {
        let dataloaders = ctx.data::<DataLoaderContext>()?;
        let user = dataloaders.users.load_one(self.created_by).await?;
        Ok(user)
    }

    /// User assigned to the task
    async fn assignee(&self, ctx: &Context<'_>) -> GqlResult<Option<super::user::Model>> {
        if let Some(assignee_id) = self.assignee_id {
            let dataloaders = ctx.data::<DataLoaderContext>()?;
            let user = dataloaders.users.load_one(assignee_id).await?;
            Ok(user)
        } else {
            Ok(None)
        }
    }

    /// Parent task (for subtasks)
    async fn parent_task(&self, ctx: &Context<'_>) -> GqlResult<Option<Model>> {
        if let Some(parent_id) = self.parent_task_id {
            let db = get_db_from_context(ctx)?;
            let parent = Entity::find_by_id(parent_id).one(&db).await?;
            Ok(parent)
        } else {
            Ok(None)
        }
    }

    /// Whether task is overdue
    async fn is_overdue(&self) -> bool {
        if let Some(due) = self.due_date {
            if self.status != "done" && self.status != "cancelled" {
                return Utc::now() > due;
            }
        }
        false
    }

    /// Whether task is completed
    async fn is_completed(&self) -> bool {
        self.status == "done"
    }

    /// Whether task is blocked
    async fn is_blocked(&self) -> bool {
        self.status == "blocked"
    }

    /// User who archived the task
    async fn archived_by_user(&self, ctx: &Context<'_>) -> GqlResult<Option<super::user::Model>> {
        if let Some(archived_by_id) = self.archived_by {
            let dataloaders = ctx.data::<DataLoaderContext>()?;
            let user = dataloaders.users.load_one(archived_by_id).await?;
            Ok(user)
        } else {
            Ok(None)
        }
    }

    /// Department if task is department-specific
    async fn department(&self, ctx: &Context<'_>) -> GqlResult<Option<super::department::Model>> {
        if let Some(dept_id) = self.department_id {
            let dataloaders = ctx.data::<DataLoaderContext>()?;
            let dept = dataloaders.departments.load_one(dept_id).await?;
            Ok(dept)
        } else {
            Ok(None)
        }
    }

    /// Task type for categorization
    async fn task_type(&self, ctx: &Context<'_>) -> GqlResult<Option<super::tasks::TaskType>> {
        if let Some(task_type_id) = self.task_type_id {
            let db = get_db_from_context(ctx)?;
            let task_type = crate::models::tasks::task_type::Entity::find_by_id(task_type_id)
                .one(&db)
                .await?;
            Ok(task_type)
        } else {
            Ok(None)
        }
    }

    /// Child tasks (subtasks) of this task
    async fn subtasks(&self, ctx: &Context<'_>) -> GqlResult<Vec<Model>> {
        let db = get_db_from_context(ctx)?;
        let subtasks = Entity::find()
            .filter(Column::ParentTaskId.eq(self.id))
            .filter(Column::DeletedAt.is_null())
            .order_by_asc(Column::CreatedAt)
            .all(&db)
            .await?;
        Ok(subtasks)
    }

    /// Tasks that this task blocks (dependencies where this is the blocking task)
    async fn blocks_tasks(&self, ctx: &Context<'_>) -> GqlResult<Vec<Model>> {
        let db = get_db_from_context(ctx)?;
        // This requires joining with task_dependencies table
        // For now, return empty vec - this would need proper relation setup
        Ok(vec![])
    }

    /// Tasks that block this task (dependencies where this task depends on another)
    async fn blocked_by_tasks(&self, ctx: &Context<'_>) -> GqlResult<Vec<Model>> {
        let db = get_db_from_context(ctx)?;
        // This requires joining with task_dependencies table
        // For now, return empty vec - this would need proper relation setup
        Ok(vec![])
    }

    /// Time remaining until due date (in hours)
    async fn hours_until_due(&self) -> Option<i64> {
        if let Some(due) = self.due_date {
            if self.status != "done" && self.status != "cancelled" {
                let now = Utc::now();
                if due > now {
                    let duration = due - now;
                    return Some(duration.num_hours());
                }
            }
        }
        None
    }

    /// Progress percentage (based on estimated vs actual hours)
    async fn progress_percentage(&self) -> Option<i32> {
        if let (Some(estimated), Some(actual)) = (self.estimated_hours, self.actual_hours) {
            if estimated > 0 {
                let progress = (actual as f32 / estimated as f32 * 100.0).min(100.0);
                return Some(progress as i32);
            }
        }
        None
    }

    /// Count of assignees for this task
    async fn assignee_count(&self, ctx: &Context<'_>) -> GqlResult<i64> {
        let db = get_db_from_context(ctx)?;
        // This requires counting from task_assignees table
        // For now, return 0 - this would need proper implementation
        Ok(0)
    }

    /// Count of dependencies for this task
    async fn dependency_count(&self, ctx: &Context<'_>) -> GqlResult<i64> {
        let db = get_db_from_context(ctx)?;
        // This requires counting from task_dependencies table
        // For now, return 0 - this would need proper implementation
        Ok(0)
    }

    /// Count of linked resources (attachments)
    async fn resource_count(&self, ctx: &Context<'_>) -> GqlResult<i64> {
        let db = get_db_from_context(ctx)?;
        // This requires counting from linked_resources table
        // For now, return 0 - this would need proper implementation
        Ok(0)
    }
}



/// Task creation input
#[derive(Debug, Clone, InputObject)]
pub struct CreateTaskInput {
    #[graphql(validator(min_length = 1, max_length = 200))]
    pub title: String,
    #[graphql(validator(max_length = 2000))]
    pub description: Option<String>,
    pub task_type_id: Option<Uuid>,
    pub status: Option<TaskStatus>,
    pub priority: TaskPriority,
    #[graphql(validator(custom = "validate_future_date"))]
    pub due_date: Option<DateTime<Utc>>,
    #[graphql(validator(minimum = 1, maximum = 10000))]
    pub estimated_hours: Option<i32>,
    #[graphql(validator(list, max_items = 10))]
    pub tags: Option<Vec<String>>,
    pub department_id: Option<Uuid>,
    pub assignee_id: Option<Uuid>,
    pub parent_task_id: Option<Uuid>,
    pub requires_manual_reassignment: Option<bool>,
}

/// Task update input
#[derive(Debug, Clone, InputObject)]
pub struct UpdateTaskInput {
    #[graphql(validator(min_length = 1, max_length = 200))]
    pub title: Option<String>,
    #[graphql(validator(max_length = 2000))]
    pub description: Option<String>,
    pub task_type_id: Option<Uuid>,
    pub status: Option<TaskStatus>,
    pub priority: Option<TaskPriority>,
    #[graphql(validator(custom = "validate_future_date"))]
    pub due_date: Option<DateTime<Utc>>,
    #[graphql(validator(minimum = 1, maximum = 10000))]
    pub estimated_hours: Option<i32>,
    #[graphql(validator(minimum = 0, maximum = 10000))]
    pub actual_hours: Option<i32>,
    #[graphql(validator(list, max_items = 10))]
    pub tags: Option<Vec<String>>,
    pub department_id: Option<Uuid>,
    pub assignee_id: Option<Uuid>,
    pub parent_task_id: Option<Uuid>,
    pub requires_manual_reassignment: Option<bool>,
    pub archived: Option<bool>,
}

/// Task status change input
#[derive(Debug, Clone, InputObject)]
pub struct ChangeTaskStatusInput {
    pub task_id: Uuid,
    pub status: TaskStatus,
    #[graphql(validator(max_length = 500))]
    pub comment: Option<String>,
}

/// Task filter input for querying tasks
#[derive(Debug, Clone, InputObject)]
pub struct TaskFilter {
    pub status: Option<TaskStatus>,
    pub priority: Option<TaskPriority>,
    pub assignee_id: Option<Uuid>,
    pub created_by: Option<Uuid>,
    pub department_id: Option<Uuid>,
    pub task_type_id: Option<Uuid>,
    pub parent_task_id: Option<Uuid>,
    pub archived: Option<bool>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_task_model_compiles() {
        let task = Model {
            id: Uuid::new_v4(),
            title: "Complete GraphQL API".to_string(),
            description: Some("Implement all mutations and queries".to_string()),
            task_type_id: Some(Uuid::new_v4()),
            status: "in_progress".to_string(),
            priority: "high".to_string(),
            due_date: Some(Utc::now()),
            completed_at: None,
            estimated_hours: Some(40),
            actual_hours: Some(20),
            tags: Some(vec!["api".to_string(), "graphql".to_string()]),
            department_id: None,
            created_by: Uuid::new_v4(),
            assignee_id: Some(Uuid::new_v4()),
            parent_task_id: None,
            requires_manual_reassignment: Some(false),
            archived: false,
            archived_at: None,
            archived_by: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            deleted_at: None,
        };

        assert_eq!(task.status, "in_progress");
        assert_eq!(task.priority, "high");
        assert_eq!(task.archived, false);
        assert_eq!(task.requires_manual_reassignment, Some(false));
    }
}
