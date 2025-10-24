use async_graphql::{Context, Result};
use chrono::Utc;
use sea_orm::{DatabaseConnection, EntityTrait, Set, ActiveModelTrait, QueryFilter, ColumnTrait, TransactionTrait};
use uuid::Uuid;

use crate::{
    database::get_db_from_context,
    error::AppError,
    models::{
        generated::prelude::*,
        task_audit_entry,
        AssignTaskInput, ChangeTaskStatusInput, CreateLinkedResourceInput, CreateTaskDependencyInput,
        CreateTaskInput, CreateTaskTypeInput, DependencyType, LinkedResource, ResourceType, Task,
        TaskAssignee, TaskDependency, TaskPriority, TaskStatus, TaskType, UpdateLinkedResourceInput,
        UpdateTaskAssigneeInput, UpdateTaskDependencyInput, UpdateTaskInput, UpdateTaskTypeInput,
    },
};

/// Task mutations
pub struct TaskMutations;

#[async_graphql::Object]
impl TaskMutations {
    /// Create a new task
    async fn create_task(&self, ctx: &Context<'_>, input: CreateTaskInput) -> Result<Task> {
        let db = get_db_from_context(ctx)?;

        // Get creator ID from context
        let creator_id = ctx
            .data_opt::<crate::auth::context::UserContext>()
            .map(|uc| uc.user_id)
            .ok_or_else(|| AppError::Authentication("Authentication required to create tasks".to_string()))?;

        // Start transaction for atomic operation
        let txn = db.begin().await?;

        let task = crate::models::task::ActiveModel {
            title: Set(input.title.clone()),
            description: Set(input.description.clone()),
            task_type_id: Set(input.task_type_id),
            status: Set(input.status.unwrap_or(TaskStatus::Todo).as_str().to_string()),
            priority: Set(input.priority.as_str().to_string()),
            due_date: Set(input.due_date),
            estimated_hours: Set(input.estimated_hours),
            tags: Set(input.tags.clone()),
            department_id: Set(input.department_id),
            created_by: Set(creator_id),
            assignee_id: Set(input.assignee_id),
            parent_task_id: Set(input.parent_task_id),
            requires_manual_reassignment: Set(Some(input.requires_manual_reassignment.unwrap_or(false))),
            ..Default::default()
        };

        let task = task.insert(&txn).await?;

        // Create audit entry for task creation
        let audit_entry = crate::models::task_audit_entry::ActiveModel {
            task_id: Set(task.id),
            user_id: Set(creator_id),
            action: Set("created".to_string()),
            new_value: Set(serde_json::to_value(&task).ok()),
            ..Default::default()
        };
        audit_entry.insert(&txn).await?;

        // Commit transaction
        txn.commit().await?;

        Ok(task)
    }

    /// Update an existing task
    async fn update_task(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateTaskInput,
    ) -> Result<Task> {
        let db = get_db_from_context(ctx)?;

        // Get user ID from context for audit trail
        let user_id = ctx
            .data_opt::<crate::auth::context::UserContext>()
            .map(|uc| uc.user_id)
            .ok_or_else(|| AppError::Authentication("Authentication required to update tasks".to_string()))?;

        // Start transaction for atomic operation
        let txn = db.begin().await?;

        // Find existing task
        let existing_task = crate::models::task::Entity::find_by_id(id)
            .filter(crate::models::task::Column::DeletedAt.is_null())
            .one(&txn)
            .await?
            .ok_or_else(|| AppError::NotFound("Task not found".to_string()))?;

        // Build active model with updates
        let mut task: crate::models::task::ActiveModel = existing_task.into();

        if let Some(title) = input.title {
            task.title = Set(title);
        }

        if let Some(description) = input.description {
            task.description = Set(Some(description));
        }

        if let Some(status) = input.status {
            task.status = Set(status.as_str().to_string());
            // Set completed_at if status changed to done
            if status == TaskStatus::Done {
                task.completed_at = Set(Some(Utc::now()));
            }
        }

        if let Some(priority) = input.priority {
            task.priority = Set(priority.as_str().to_string());
        }

        if let Some(due_date) = input.due_date {
            task.due_date = Set(Some(due_date));
        }

        if let Some(estimated_hours) = input.estimated_hours {
            task.estimated_hours = Set(Some(estimated_hours));
        }

        if let Some(actual_hours) = input.actual_hours {
            task.actual_hours = Set(Some(actual_hours));
        }

        if let Some(tags) = input.tags {
            task.tags = Set(Some(tags));
        }

        if let Some(department_id) = input.department_id {
            task.department_id = Set(Some(department_id));
        }

        if let Some(task_type_id) = input.task_type_id {
            task.task_type_id = Set(Some(task_type_id));
        }

        if let Some(assignee_id) = input.assignee_id {
            task.assignee_id = Set(Some(assignee_id));
        }

        if let Some(parent_task_id) = input.parent_task_id {
            task.parent_task_id = Set(Some(parent_task_id));
        }

        if let Some(requires_manual_reassignment) = input.requires_manual_reassignment {
            task.requires_manual_reassignment = Set(Some(requires_manual_reassignment));
        }

        if let Some(archived) = input.archived {
            task.archived = Set(archived);
        }

        // Update timestamp
        task.updated_at = Set(Utc::now());

        // Save changes
        let updated_task = task.update(&txn).await?;

        // Create audit entry for task update
        let audit_entry = crate::models::task_audit_entry::ActiveModel {
            task_id: Set(updated_task.id),
            user_id: Set(user_id),
            action: Set("updated".to_string()),
            new_value: Set(serde_json::to_value(&updated_task).ok()),
            ..Default::default()
        };
        audit_entry.insert(&txn).await?;

        // Commit transaction
        txn.commit().await?;

        Ok(updated_task)
    }

    /// Change task status with optional comment
    async fn change_task_status(
        &self,
        ctx: &Context<'_>,
        input: ChangeTaskStatusInput,
    ) -> Result<Task> {
        let db = get_db_from_context(ctx)?;

        let user_id = ctx
            .data_opt::<crate::auth::context::UserContext>()
            .map(|uc| uc.user_id)
            .ok_or("User context not found - authentication required")?;

        // Start transaction for atomic operation
        let txn = db.begin().await?;

        // Find existing task
        let existing_task = crate::models::task::Entity::find_by_id(input.task_id)
            .filter(crate::models::task::Column::DeletedAt.is_null())
            .one(&txn)
            .await?
            .ok_or_else(|| AppError::NotFound("Task not found".to_string()))?;

        let old_status = existing_task.status.clone();

        // Build active model with status change
        let mut task: crate::models::task::ActiveModel = existing_task.into();
        task.status = Set(input.status.as_str().to_string());

        // If changing to done, set completed_at
        if input.status == TaskStatus::Done {
            task.completed_at = Set(Some(Utc::now()));
        }

        task.updated_at = Set(Utc::now());

        // Save changes
        let updated_task = task.update(&txn).await?;

        // Create audit entry
        let audit_entry = crate::models::task_audit_entry::ActiveModel {
            task_id: Set(updated_task.id),
            user_id: Set(user_id),
            action: Set("status_changed".to_string()),
            field_name: Set(Some("status".to_string())),
            old_value: Set(Some(serde_json::Value::String(old_status))),
            new_value: Set(Some(serde_json::Value::String(input.status.as_str().to_string()))),
            comment: Set(input.comment),
            ..Default::default()
        };
        audit_entry.insert(&txn).await?;

        // Commit transaction
        txn.commit().await?;

        Ok(updated_task)
    }

    /// Soft delete a task
    async fn delete_task(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;

        let user_id = ctx.data_opt::<crate::auth::context::UserContext>().map(|uc| uc.user_id);

        // Start transaction for atomic operation
        let txn = db.begin().await?;

        // Find the task first to ensure it exists
        let task = crate::models::task::Entity::find_by_id(id)
            .filter(crate::models::task::Column::DeletedAt.is_null())
            .one(&txn)
            .await?;

        if task.is_none() {
            return Ok(false);
        }

        // Soft delete by setting deleted_at
        let mut task: crate::models::task::ActiveModel = task.unwrap().into();
        task.deleted_at = Set(Some(Utc::now()));

        task.update(&txn).await?;

        // Create audit entry if user context available
        if let Some(uid) = user_id {
            let audit_entry = crate::models::task_audit_entry::ActiveModel {
                task_id: Set(id),
                user_id: Set(uid),
                action: Set("deleted".to_string()),
                comment: Set(Some("Task deleted".to_string())),
                ..Default::default()
            };
            audit_entry.insert(&txn).await?;
        }

        // Commit transaction
        txn.commit().await?;

        Ok(true)
    }

    /// Assign a user to a task
    async fn assign_task_to_user(
        &self,
        ctx: &Context<'_>,
        input: AssignTaskInput,
    ) -> Result<TaskAssignee> {
        let db = get_db_from_context(ctx)?;

        let assigner_id = ctx
            .data_opt::<crate::auth::context::UserContext>()
            .map(|uc| uc.user_id)
            .ok_or("User context not found - authentication required")?;

        let assignee = crate::models::task_assignee::ActiveModel {
            task_id: Set(input.task_id),
            user_id: Set(input.user_id),
            role: Set(input.role.as_str().to_string()),
            assigned_at: Set(Utc::now()),
            assigned_by: Set(assigner_id),
            ..Default::default()
        };

        let assignee = assignee.insert(&db).await?;

        // Create audit entry
        let audit_entry = crate::models::task_audit_entry::ActiveModel {
            task_id: Set(input.task_id),
            user_id: Set(assigner_id),
            action: Set("assigned".to_string()),
            comment: Set(Some("User assigned to task".to_string())),
            ..Default::default()
        };
        let _ = audit_entry.insert(&db).await;

        // Convert SeaORM model to legacy TaskAssignee struct for compatibility
        let assignee = TaskAssignee {
            id: assignee.id,
            task_id: assignee.task_id,
            user_id: assignee.user_id,
            role: assignee.role.clone(),
            assigned_at: assignee.assigned_at,
            assigned_by: assignee.assigned_by,
            created_at: assignee.created_at,
            updated_at: assignee.updated_at,
            deleted_at: assignee.deleted_at,
        };

        Ok(assignee)
    }

    /// Update task assignee role
    async fn update_task_assignee(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateTaskAssigneeInput,
    ) -> Result<TaskAssignee> {
        let db = get_db_from_context(ctx)?;

        // Find existing task assignee
        let existing_assignee = crate::models::task_assignee::Entity::find_by_id(id)
            .filter(crate::models::task_assignee::Column::DeletedAt.is_null())
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Task assignee not found".to_string()))?;

        // Build active model with updates
        let mut assignee: crate::models::task_assignee::ActiveModel = existing_assignee.into();

        if let Some(role) = input.role {
            assignee.role = Set(role.as_str().to_string());
        }

        // Update timestamp
        assignee.updated_at = Set(Utc::now());

        // Save changes
        let updated_assignee = assignee.update(&db).await?;

        // Convert to legacy TaskAssignee struct for compatibility
        let assignee = TaskAssignee {
            id: updated_assignee.id,
            task_id: updated_assignee.task_id,
            user_id: updated_assignee.user_id,
            role: updated_assignee.role.clone(),
            assigned_at: updated_assignee.assigned_at,
            assigned_by: updated_assignee.assigned_by,
            created_at: updated_assignee.created_at,
            updated_at: updated_assignee.updated_at,
            deleted_at: updated_assignee.deleted_at,
        };

        Ok(assignee)
    }

    /// Remove a user from a task (soft delete)
    async fn unassign_task_from_user(
        &self,
        ctx: &Context<'_>,
        task_id: Uuid,
        user_id: Uuid,
    ) -> Result<bool> {
        let db = get_db_from_context(ctx)?;

        let unassigner_id = ctx.data_opt::<crate::auth::context::UserContext>().map(|uc| uc.user_id);

        // Find the task assignee first to ensure it exists
        let assignee = crate::models::task_assignee::Entity::find()
            .filter(crate::models::task_assignee::Column::TaskId.eq(task_id))
            .filter(crate::models::task_assignee::Column::UserId.eq(user_id))
            .filter(crate::models::task_assignee::Column::DeletedAt.is_null())
            .one(&db)
            .await?;

        if assignee.is_none() {
            return Ok(false);
        }

        // Soft delete by setting deleted_at
        let mut assignee: crate::models::task_assignee::ActiveModel = assignee.unwrap().into();
        assignee.deleted_at = Set(Some(Utc::now()));

        assignee.update(&db).await?;

        // Create audit entry if user context available
        if let Some(uid) = unassigner_id {
            let audit_entry = crate::models::task_audit_entry::ActiveModel {
                task_id: Set(task_id),
                user_id: Set(uid),
                action: Set("unassigned".to_string()),
                comment: Set(Some("User unassigned from task".to_string())),
                ..Default::default()
            };
            let _ = audit_entry.insert(&db).await;
        }

        Ok(true)
    }

    /// Create a task dependency
    async fn create_task_dependency(
        &self,
        ctx: &Context<'_>,
        input: CreateTaskDependencyInput,
    ) -> Result<TaskDependency> {
        let db = get_db_from_context(ctx)?;

        let creator_id = ctx
            .data_opt::<crate::auth::context::UserContext>()
            .map(|uc| uc.user_id)
            .ok_or("User context not found - authentication required")?;

        let dependency = crate::models::task_dependency::ActiveModel {
            task_id: Set(input.task_id),
            depends_on_task_id: Set(input.depends_on_task_id),
            dependency_type: Set(input.dependency_type.as_str().to_string()),
            lag_days: Set(input.lag_days),
            created_by: Set(creator_id),
            ..Default::default()
        };

        let dependency = dependency.insert(&db).await?;

        // Convert SeaORM model to legacy TaskDependency struct for compatibility
        let dependency = TaskDependency {
            id: dependency.id,
            task_id: dependency.task_id,
            depends_on_task_id: dependency.depends_on_task_id,
            dependency_type: dependency.dependency_type.clone(),
            lag_days: dependency.lag_days,
            created_by: dependency.created_by,
            created_at: dependency.created_at,
            updated_at: dependency.updated_at,
            deleted_at: dependency.deleted_at,
        };

        Ok(dependency)
    }

    /// Update a task dependency
    async fn update_task_dependency(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateTaskDependencyInput,
    ) -> Result<TaskDependency> {
        let db = get_db_from_context(ctx)?;

        // Find existing task dependency
        let existing_dependency = crate::models::task_dependency::Entity::find_by_id(id)
            .filter(crate::models::task_dependency::Column::DeletedAt.is_null())
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Task dependency not found".to_string()))?;

        // Build active model with updates
        let mut dependency: crate::models::task_dependency::ActiveModel = existing_dependency.into();

        if let Some(dependency_type) = input.dependency_type {
            dependency.dependency_type = Set(dependency_type.as_str().to_string());
        }

        if let Some(lag_days) = input.lag_days {
            dependency.lag_days = Set(Some(lag_days));
        }

        // Update timestamp
        dependency.updated_at = Set(Utc::now());

        // Save changes
        let updated_dependency = dependency.update(&db).await?;

        // Convert to legacy TaskDependency struct for compatibility
        let dependency = TaskDependency {
            id: updated_dependency.id,
            task_id: updated_dependency.task_id,
            depends_on_task_id: updated_dependency.depends_on_task_id,
            dependency_type: updated_dependency.dependency_type.clone(),
            lag_days: updated_dependency.lag_days,
            created_by: updated_dependency.created_by,
            created_at: updated_dependency.created_at,
            updated_at: updated_dependency.updated_at,
            deleted_at: updated_dependency.deleted_at,
        };

        Ok(dependency)
    }

    /// Delete a task dependency (soft delete)
    async fn delete_task_dependency(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;

        // Find the task dependency first to ensure it exists
        let dependency = crate::models::task_dependency::Entity::find_by_id(id)
            .filter(crate::models::task_dependency::Column::DeletedAt.is_null())
            .one(&db)
            .await?;

        if dependency.is_none() {
            return Ok(false);
        }

        // Soft delete by setting deleted_at
        let mut dependency: crate::models::task_dependency::ActiveModel = dependency.unwrap().into();
        dependency.deleted_at = Set(Some(Utc::now()));

        dependency.update(&db).await?;

        Ok(true)
    }

    /// Create a linked resource
    async fn create_linked_resource(
        &self,
        ctx: &Context<'_>,
        input: CreateLinkedResourceInput,
    ) -> Result<LinkedResource> {
        let db = get_db_from_context(ctx)?;

        let uploaded_by = ctx
            .data_opt::<crate::auth::context::UserContext>()
            .map(|uc| uc.user_id)
            .ok_or("User context not found - authentication required")?;

        let resource = crate::models::linked_resource::ActiveModel {
            task_id: Set(input.task_id),
            resource_type: Set(input.resource_type.as_str().to_string()),
            title: Set(input.title.clone()),
            url: Set(input.url.clone()),
            file_path: Set(input.file_path.clone()),
            file_size: Set(input.file_size),
            mime_type: Set(input.mime_type.clone()),
            description: Set(input.description.clone()),
            uploaded_by: Set(uploaded_by),
            ..Default::default()
        };

        let resource = resource.insert(&db).await?;

        // Convert SeaORM model to legacy LinkedResource struct for compatibility
        let resource = LinkedResource {
            id: resource.id,
            task_id: resource.task_id,
            resource_type: resource.resource_type.clone(),
            title: resource.title,
            url: resource.url,
            file_path: resource.file_path,
            file_size: resource.file_size,
            mime_type: resource.mime_type,
            description: resource.description,
            uploaded_by: resource.uploaded_by,
            created_at: resource.created_at,
            updated_at: resource.updated_at,
            deleted_at: resource.deleted_at,
        };

        Ok(resource)
    }

    /// Update a linked resource
    async fn update_linked_resource(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateLinkedResourceInput,
    ) -> Result<LinkedResource> {
        let db = get_db_from_context(ctx)?;

        // Find existing linked resource
        let existing_resource = crate::models::linked_resource::Entity::find_by_id(id)
            .filter(crate::models::linked_resource::Column::DeletedAt.is_null())
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Linked resource not found".to_string()))?;

        // Build active model with updates
        let mut resource: crate::models::linked_resource::ActiveModel = existing_resource.into();

        if let Some(title) = input.title {
            resource.title = Set(title);
        }

        if let Some(url) = input.url {
            resource.url = Set(Some(url));
        }

        if let Some(description) = input.description {
            resource.description = Set(Some(description));
        }

        // Update timestamp
        resource.updated_at = Set(Utc::now());

        // Save changes
        let updated_resource = resource.update(&db).await?;

        // Convert to legacy LinkedResource struct for compatibility
        let resource = LinkedResource {
            id: updated_resource.id,
            task_id: updated_resource.task_id,
            resource_type: updated_resource.resource_type.clone(),
            title: updated_resource.title,
            url: updated_resource.url,
            file_path: updated_resource.file_path,
            file_size: updated_resource.file_size,
            mime_type: updated_resource.mime_type,
            description: updated_resource.description,
            uploaded_by: updated_resource.uploaded_by,
            created_at: updated_resource.created_at,
            updated_at: updated_resource.updated_at,
            deleted_at: updated_resource.deleted_at,
        };

        Ok(resource)
    }

    /// Delete a linked resource (soft delete)
    async fn delete_linked_resource(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;

        // Find the linked resource first to ensure it exists
        let resource = crate::models::linked_resource::Entity::find_by_id(id)
            .filter(crate::models::linked_resource::Column::DeletedAt.is_null())
            .one(&db)
            .await?;

        if resource.is_none() {
            return Ok(false);
        }

        // Soft delete by setting deleted_at
        let mut resource: crate::models::linked_resource::ActiveModel = resource.unwrap().into();
        resource.deleted_at = Set(Some(Utc::now()));

        resource.update(&db).await?;

        Ok(true)
    }

    /// Create a new task type
    async fn create_task_type(&self, ctx: &Context<'_>, input: CreateTaskTypeInput) -> Result<TaskType> {
        let db = get_db_from_context(ctx)?;

        let task_type = crate::models::tasks::task_type::ActiveModel {
            name: Set(input.name.clone()),
            description: Set(input.description.clone()),
            default_priority: Set(input.default_priority),
            color_code: Set(input.color_code.clone()),
            ..Default::default()
        };

        let task_type = task_type.insert(&db).await?;

        // Convert SeaORM model to legacy TaskType struct for compatibility
        let task_type = TaskType {
            id: task_type.id,
            name: task_type.name,
            description: task_type.description,
            default_priority: task_type.default_priority,
            color_code: task_type.color_code,
            is_active: task_type.is_active,
            created_at: task_type.created_at,
            updated_at: task_type.updated_at,
        };

        Ok(task_type)
    }

    /// Update an existing task type
    async fn update_task_type(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateTaskTypeInput,
    ) -> Result<TaskType> {
        let db = get_db_from_context(ctx)?;

        // Find existing task type
        let existing_task_type = crate::models::tasks::task_type::Entity::find_by_id(id)
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Task type not found".to_string()))?;

        // Build active model with updates
        let mut task_type: crate::models::tasks::task_type::ActiveModel = existing_task_type.into();

        if let Some(name) = input.name {
            task_type.name = Set(name);
        }

        if let Some(description) = input.description {
            task_type.description = Set(Some(description));
        }

        if let Some(default_priority) = input.default_priority {
            task_type.default_priority = Set(Some(default_priority));
        }

        if let Some(color_code) = input.color_code {
            task_type.color_code = Set(Some(color_code));
        }

        if let Some(is_active) = input.is_active {
            task_type.is_active = Set(is_active);
        }

        // Update timestamp
        task_type.updated_at = Set(Utc::now());

        // Save changes
        let updated_task_type = task_type.update(&db).await?;

        // Convert to legacy TaskType struct for compatibility
        let task_type = TaskType {
            id: updated_task_type.id,
            name: updated_task_type.name,
            description: updated_task_type.description,
            default_priority: updated_task_type.default_priority,
            color_code: updated_task_type.color_code,
            is_active: updated_task_type.is_active,
            created_at: updated_task_type.created_at,
            updated_at: updated_task_type.updated_at,
        };

        Ok(task_type)
    }

    /// Soft delete a task type
    async fn delete_task_type(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;

        // Find the task type first to ensure it exists
        let task_type = crate::models::tasks::task_type::Entity::find_by_id(id)
            .one(&db)
            .await?;

        if task_type.is_none() {
            return Ok(false);
        }

        // Soft delete by setting is_active = false
        let mut task_type: crate::models::tasks::task_type::ActiveModel = task_type.unwrap().into();
        task_type.is_active = Set(false);
        task_type.updated_at = Set(Utc::now());

        task_type.update(&db).await?;

        Ok(true)
    }
}