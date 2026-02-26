use async_graphql::{Context, Object, Result};
use chrono::Utc;
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, Set};
use uuid::Uuid;

use crate::{
    auth::UserContext,
    database::get_db_from_context,
    error::AppError,
    models::{
        CreateAssignmentInput, CreateTrainingContentInput, CreateTrainingInput, Training,
        TrainingAssignment, TrainingContent, TrainingProgress, UpdateProgressInput,
        UpdateTrainingContentInput, UpdateTrainingInput,
    },
};

pub struct TrainingMutations;

#[Object]
impl TrainingMutations {
    // Training
    async fn create_training(
        &self,
        ctx: &Context<'_>,
        input: CreateTrainingInput,
    ) -> Result<Training> {
        let db = get_db_from_context(ctx)?;
        // TODO: Add RBAC check (e.g. admin or training manager)

        let training = crate::models::training::training::ActiveModel {
            id: Set(Uuid::new_v4()),
            title: Set(input.title),
            description: Set(input.description),
            start_date: Set(input.start_date),
            end_date: Set(input.end_date),
            is_active: Set(input.is_active.unwrap_or(true)),
            meta_title: Set(input.meta_title),
            meta_description: Set(input.meta_description),
            tags: Set(input.tags),
            author_id: Set(input.author_id),
            rrule: Set(input.rrule),
            recurrence_id: Set(input.recurrence_id),
            recurrence_end_date: Set(input.recurrence_end_date),
            created_at: Set(Utc::now()),
            updated_at: Set(Utc::now()),
        };

        let res = training.insert(&db).await?;
        Ok(res)
    }

    async fn update_training(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateTrainingInput,
    ) -> Result<Training> {
        let db = get_db_from_context(ctx)?;
        // TODO: Add RBAC check

        let training = crate::models::training::training::Entity::find_by_id(id)
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Training not found".to_string()))?;

        let mut training: crate::models::training::training::ActiveModel = training.into();

        if let Some(title) = input.title {
            training.title = Set(title);
        }
        if let Some(description) = input.description {
            training.description = Set(Some(description));
        }
        if let Some(start_date) = input.start_date {
            training.start_date = Set(Some(start_date));
        }
        if let Some(end_date) = input.end_date {
            training.end_date = Set(Some(end_date));
        }
        if let Some(is_active) = input.is_active {
            training.is_active = Set(is_active);
        }
        if let Some(meta_title) = input.meta_title {
            training.meta_title = Set(Some(meta_title));
        }
        if let Some(meta_description) = input.meta_description {
            training.meta_description = Set(Some(meta_description));
        }
        if let Some(tags) = input.tags {
            training.tags = Set(Some(tags));
        }
        if let Some(author_id) = input.author_id {
            training.author_id = Set(Some(author_id));
        }
        if let Some(rrule) = input.rrule {
            training.rrule = Set(Some(rrule));
        }
        if let Some(recurrence_id) = input.recurrence_id {
            training.recurrence_id = Set(Some(recurrence_id));
        }
        if let Some(recurrence_end_date) = input.recurrence_end_date {
            training.recurrence_end_date = Set(Some(recurrence_end_date));
        }
        training.updated_at = Set(Utc::now());

        let res = training.update(&db).await?;
        Ok(res)
    }

    async fn delete_training(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;
        // TODO: Add RBAC check

        let res = crate::models::training::training::Entity::delete_by_id(id)
            .exec(&db)
            .await?;
        Ok(res.rows_affected > 0)
    }

    // Content
    async fn create_training_content(
        &self,
        ctx: &Context<'_>,
        input: CreateTrainingContentInput,
    ) -> Result<TrainingContent> {
        let db = get_db_from_context(ctx)?;
        // TODO: Add RBAC check

        let content = crate::models::training::content::ActiveModel {
            id: Set(Uuid::new_v4()),
            training_id: Set(input.training_id),
            title: Set(input.title),
            r#type: Set(input.r#type),
            data: Set(input.data),
            sequence_order: Set(input.sequence_order.unwrap_or(0)),
            created_at: Set(Utc::now()),
            updated_at: Set(Utc::now()),
        };

        let res = content.insert(&db).await?;
        Ok(res)
    }

    async fn update_training_content(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateTrainingContentInput,
    ) -> Result<TrainingContent> {
        let db = get_db_from_context(ctx)?;

        let content = crate::models::training::content::Entity::find_by_id(id)
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Content not found".to_string()))?;

        let mut content: crate::models::training::content::ActiveModel = content.into();

        if let Some(title) = input.title {
            content.title = Set(title);
        }
        if let Some(r#type) = input.r#type {
            content.r#type = Set(r#type);
        }
        if let Some(data) = input.data {
            content.data = Set(data);
        }
        if let Some(sequence_order) = input.sequence_order {
            content.sequence_order = Set(sequence_order);
        }
        content.updated_at = Set(Utc::now());

        let res = content.update(&db).await?;
        Ok(res)
    }

    async fn delete_training_content(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;

        let res = crate::models::training::content::Entity::delete_by_id(id)
            .exec(&db)
            .await?;
        Ok(res.rows_affected > 0)
    }

    // Assignment
    async fn assign_training(
        &self,
        ctx: &Context<'_>,
        input: CreateAssignmentInput,
    ) -> Result<TrainingAssignment> {
        let db = get_db_from_context(ctx)?;
        // TODO: Add RBAC check

        let assignment = crate::models::training::assignment::ActiveModel {
            id: Set(Uuid::new_v4()),
            user_id: Set(input.user_id),
            training_id: Set(input.training_id),
            assigned_at: Set(Utc::now()),
            due_date: Set(input.due_date),
        };

        let res = assignment.insert(&db).await?;
        Ok(res)
    }

    async fn delete_training_assignment(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;
        // TODO: Add RBAC check

        let res = crate::models::training::assignment::Entity::delete_by_id(id)
            .exec(&db)
            .await?;
        Ok(res.rows_affected > 0)
    }

    /// Bulk assign training to all users in a department
    async fn assign_training_to_department(
        &self,
        ctx: &Context<'_>,
        training_id: Uuid,
        department_id: Uuid,
        due_date: Option<chrono::DateTime<Utc>>,
    ) -> Result<i32> {
        let db = get_db_from_context(ctx)?;
        // TODO: Add RBAC check (should require admin or HR manager role)

        // Get all users in the department
        let users = crate::models::user::Entity::find()
            .filter(crate::models::user::Column::DepartmentId.eq(department_id))
            .filter(crate::models::user::Column::DeletedAt.is_null())
            .all(&db)
            .await?;

        let mut created_count = 0;

        // Create assignment for each user
        for user in users {
            // Check if assignment already exists
            let existing = crate::models::training::assignment::Entity::find()
                .filter(crate::models::training::assignment::Column::UserId.eq(user.id))
                .filter(crate::models::training::assignment::Column::TrainingId.eq(training_id))
                .one(&db)
                .await?;

            // Only create if not already assigned
            if existing.is_none() {
                let assignment = crate::models::training::assignment::ActiveModel {
                    id: Set(Uuid::new_v4()),
                    user_id: Set(user.id),
                    training_id: Set(training_id),
                    assigned_at: Set(Utc::now()),
                    due_date: Set(due_date),
                };

                assignment.insert(&db).await?;
                created_count += 1;
            }
        }

        Ok(created_count)
    }

    /// Bulk assign training to all active employees
    async fn assign_training_to_all_employees(
        &self,
        ctx: &Context<'_>,
        training_id: Uuid,
        due_date: Option<chrono::DateTime<Utc>>,
    ) -> Result<i32> {
        let db = get_db_from_context(ctx)?;
        // TODO: Add RBAC check (should require admin or HR manager role)

        // Get all active users (not soft-deleted)
        let users = crate::models::user::Entity::find()
            .filter(crate::models::user::Column::DeletedAt.is_null())
            .all(&db)
            .await?;

        let mut created_count = 0;

        // Create assignment for each user
        for user in users {
            // Check if assignment already exists
            let existing = crate::models::training::assignment::Entity::find()
                .filter(crate::models::training::assignment::Column::UserId.eq(user.id))
                .filter(crate::models::training::assignment::Column::TrainingId.eq(training_id))
                .one(&db)
                .await?;

            // Only create if not already assigned
            if existing.is_none() {
                let assignment = crate::models::training::assignment::ActiveModel {
                    id: Set(Uuid::new_v4()),
                    user_id: Set(user.id),
                    training_id: Set(training_id),
                    assigned_at: Set(Utc::now()),
                    due_date: Set(due_date),
                };

                assignment.insert(&db).await?;
                created_count += 1;
            }
        }

        Ok(created_count)
    }

    // Progress
    async fn update_progress(
        &self,
        ctx: &Context<'_>,
        content_id: Uuid,
        input: UpdateProgressInput,
    ) -> Result<TrainingProgress> {
        let db = get_db_from_context(ctx)?;
        let user_context = ctx.data::<UserContext>()?; // Require auth

        // Check if progress record exists
        let existing = crate::models::training::progress::Entity::find()
            .filter(crate::models::training::progress::Column::UserId.eq(user_context.user_id))
            .filter(crate::models::training::progress::Column::TrainingContentId.eq(content_id))
            .one(&db)
            .await?;

        let res = if let Some(progress) = existing {
            let mut progress: crate::models::training::progress::ActiveModel = progress.into();
            progress.status = Set(input.status);
            if input.status == crate::models::training::progress::ProgressStatus::Completed {
                progress.completed_at = Set(Some(Utc::now()));
            }
            progress.last_accessed_at = Set(Some(Utc::now()));
            progress.update(&db).await?
        } else {
            let progress = crate::models::training::progress::ActiveModel {
                id: Set(Uuid::new_v4()),
                user_id: Set(user_context.user_id),
                training_content_id: Set(content_id),
                status: Set(input.status),
                completed_at: Set(
                    if input.status == crate::models::training::progress::ProgressStatus::Completed
                    {
                        Some(Utc::now())
                    } else {
                        None
                    },
                ),
                last_accessed_at: Set(Some(Utc::now())),
            };
            progress.insert(&db).await?
        };

        Ok(res)
    }
}
