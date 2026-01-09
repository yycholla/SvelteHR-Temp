use async_graphql::{Context, Object, Result};
use sea_orm::{EntityTrait, QueryFilter, QueryOrder, QuerySelect, ColumnTrait};
use uuid::Uuid;

use crate::{
    auth::{UserContext, RlsFilterable},
    database::get_db_from_context,
    models::{
        task::{TaskStatus, TaskPriority, Model as Task, Entity as TaskEntity, Column as TaskColumn},
        tasks::task_type::{Model as TaskTypeModel, Entity as TaskTypeEntity, Column as TaskTypeColumn},
    },
};

/// Task filter input for advanced querying
#[derive(async_graphql::InputObject)]
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

#[derive(Default)]
#[allow(dead_code)]
pub struct TaskQueries;

#[Object]
#[allow(dead_code)]
impl TaskQueries {
    /// Users can only view tasks from their department unless they have Admin role.
    async fn tasks(
        &self,
        ctx: &Context<'_>,
        filter: Option<TaskFilter>,
        order_by: Option<String>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<Task>> {
        let db = get_db_from_context(ctx)?;
        let limit = limit.unwrap_or(100).clamp(1, 1000);
        let offset = offset.unwrap_or(0).max(0);

        // Extract UserContext for RLS filtering
        let user_context = ctx.data::<UserContext>()
            .map_err(|_| async_graphql::Error::new("Authentication required - UserContext not found"))?;

        let mut query = TaskEntity::find()
            .filter(TaskColumn::DeletedAt.is_null());

        // Apply RLS filter FIRST (before user-provided filters)
        query = TaskEntity::apply_rls(query, user_context);

        // Apply filters if provided
        if let Some(f) = &filter {
            if let Some(status) = &f.status {
                query = query.filter(TaskColumn::Status.eq(status.as_str()));
            }
            if let Some(priority) = &f.priority {
                query = query.filter(TaskColumn::Priority.eq(priority.as_str()));
            }
            if let Some(assignee_id) = f.assignee_id {
                query = query.filter(TaskColumn::AssigneeId.eq(assignee_id));
            }
            if let Some(created_by) = f.created_by {
                query = query.filter(TaskColumn::CreatedBy.eq(created_by));
            }
            if let Some(department_id) = f.department_id {
                query = query.filter(TaskColumn::DepartmentId.eq(department_id));
            }
            if let Some(task_type_id) = f.task_type_id {
                query = query.filter(TaskColumn::TaskTypeId.eq(task_type_id));
            }
            if let Some(parent_task_id) = f.parent_task_id {
                query = query.filter(TaskColumn::ParentTaskId.eq(parent_task_id));
            }
            if let Some(archived) = f.archived {
                query = query.filter(TaskColumn::Archived.eq(archived));
            }
        }

        // Apply ordering
        let order_by = order_by.as_deref().unwrap_or("created_at_desc");
        match order_by {
            "created_at_asc" => query = query.order_by_asc(TaskColumn::CreatedAt),
            "created_at_desc" => query = query.order_by_desc(TaskColumn::CreatedAt),
            "due_date_asc" => query = query.order_by_asc(TaskColumn::DueDate),
            "due_date_desc" => query = query.order_by_desc(TaskColumn::DueDate),
            "priority_asc" => query = query.order_by_asc(TaskColumn::Priority),
            "priority_desc" => query = query.order_by_desc(TaskColumn::Priority),
            "status_asc" => query = query.order_by_asc(TaskColumn::Status),
            "status_desc" => query = query.order_by_desc(TaskColumn::Status),
            "title_asc" => query = query.order_by_asc(TaskColumn::Title),
            "title_desc" => query = query.order_by_desc(TaskColumn::Title),
            _ => query = query.order_by_desc(TaskColumn::CreatedAt), // Default
        }

        let tasks = query
            .limit(Some(limit as u64))
            .offset(offset as u64)
            .all(&db)
            .await?;

        Ok(tasks)
    }

    /// Get a single task by ID
    ///
    /// # Security: RLS Enforced
    /// Users can only view tasks from their department. Direct ID access is filtered.
    async fn task(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<Task>> {
        let db = get_db_from_context(ctx)?;

        // Extract UserContext for RLS filtering
        let user_context = ctx.data::<UserContext>()
            .map_err(|_| async_graphql::Error::new("Authentication required - UserContext not found"))?;

        // Build query with RLS filter
        let mut query = TaskEntity::find()
            .filter(TaskColumn::Id.eq(id))
            .filter(TaskColumn::DeletedAt.is_null());

        // Apply RLS filter
        query = TaskEntity::apply_rls(query, user_context);

        let task = query.one(&db).await?;
        Ok(task)
    }

    /// Get all task types (optionally filter by active status)
    async fn task_types(
        &self,
        ctx: &Context<'_>,
        is_active: Option<bool>,
    ) -> Result<Vec<TaskTypeModel>> {
        let db = get_db_from_context(ctx)?;
        let mut query = TaskTypeEntity::find();

        // Filter by active status if provided
        if let Some(active) = is_active {
            query = query.filter(TaskTypeColumn::IsActive.eq(active));
        }

        let task_types = query
            .order_by_asc(TaskTypeColumn::Name)
            .all(&db)
            .await?;

        Ok(task_types)
    }

    /// Get a single task type by ID
    async fn task_type(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<TaskTypeModel>> {
        let db = get_db_from_context(ctx)?;
        let task_type = TaskTypeEntity::find_by_id(id)
            .one(&db)
            .await?;
        Ok(task_type)
    }
}

