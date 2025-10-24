use async_graphql::{Context, Result, SimpleObject};
use axum_login::AuthSession;
use chrono::Utc;
use sea_orm::{DatabaseConnection, EntityTrait, Set, ActiveModelTrait, QueryFilter, ColumnTrait};
use uuid::Uuid;

use crate::{
    auth::{context::UserContext, AuthBackend},
    database::get_db_from_context,
    error::AppError,
    models::{
        generated::prelude::*,
        CreateUserInput, UpdateUserInput, User, UserStatus,
    },
};

/// User mutations
pub struct UserMutations;

#[async_graphql::Object]
impl UserMutations {
    /// Create a new user
    async fn create_user(&self, ctx: &Context<'_>, input: CreateUserInput) -> Result<User> {
        let db = get_db_from_context(ctx)?;

        // Generate a temporary secure password hash
        // Users should reset their password on first login
        let temp_password = format!("TempPass{}", uuid::Uuid::new_v4().to_string()[..8].to_uppercase());
        let password_hash = bcrypt::hash(&temp_password, bcrypt::DEFAULT_COST)
            .map_err(|e| AppError::Internal(format!("Failed to hash password: {}", e)))?;

        // Log the temporary password (in production, this should be sent via email)
        tracing::info!("Created user {} with temporary password: {}", input.email, temp_password);

        // Create SeaORM active model
        // Note: display_name and full_name are GENERATED columns in the database
        // and must NOT be set explicitly - they are automatically computed from first_name + last_name
        let user = crate::models::user::ActiveModel {
            email: Set(input.email.clone()),
            password_hash: Set(password_hash),
            first_name: Set(input.first_name.clone()),
            last_name: Set(input.last_name.clone()),
            // display_name: NotSet - generated column, don't set
            // full_name: NotSet - generated column, don't set
            role: Set("hr_employee".to_string()), // Default role
            phone_number: Set(input.phone.clone()),
            job_title: Set(input.job_title.clone()),
            department_id: Set(input.department_id),
            manager_id: Set(input.manager_id),
            hire_date: Set(input.hire_date),
            status: Set(Some(input.status.as_str().to_string())),
            is_active: Set(true),
            ..Default::default()
        };

        let user = user.insert(&db).await?;
        Ok(user)
    }

    /// Update an existing user
    async fn update_user(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateUserInput,
    ) -> Result<User> {
        let db = get_db_from_context(ctx)?;

        // Find existing user
        let existing_user = crate::models::user::Entity::find_by_id(id)
            .filter(crate::models::user::Column::DeletedAt.is_null())
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

        // Build active model with updates
        let mut user: crate::models::user::ActiveModel = existing_user.into();

        if let Some(email) = input.email {
            user.email = Set(email);
        }

        if let Some(first_name) = &input.first_name {
            user.first_name = Set(first_name.clone());
        }

        if let Some(last_name) = &input.last_name {
            user.last_name = Set(last_name.clone());
        }

        // Note: display_name and full_name are GENERATED columns in the database
        // They are automatically computed from first_name + last_name, so we don't set them

        if let Some(phone) = input.phone {
            user.phone_number = Set(Some(phone));
        }

        if let Some(department_id) = input.department_id {
            user.department_id = Set(Some(department_id));
        }

        if let Some(manager_id) = input.manager_id {
            user.manager_id = Set(Some(manager_id));
        }

        if let Some(hire_date) = input.hire_date {
            user.hire_date = Set(Some(hire_date));
        }

        if let Some(termination_date) = input.termination_date {
            user.termination_date = Set(Some(termination_date));
        }

        if let Some(status) = input.status {
            user.status = Set(Some(status.as_str().to_string()));
        }

        if let Some(theme_preference) = input.theme_preference {
            user.theme_preference = Set(theme_preference);
        }

        // Update timestamp
        user.updated_at = Set(Utc::now());

        // Save changes
        let updated_user = user.update(&db).await?;
        Ok(updated_user)
    }

    /// Soft delete a user (sets deleted_at timestamp)
    async fn delete_user(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;

        // Find the user first to ensure it exists
        let user = crate::models::user::Entity::find_by_id(id)
            .filter(crate::models::user::Column::DeletedAt.is_null())
            .one(&db)
            .await?;

        if user.is_none() {
            return Ok(false);
        }

        // Soft delete by setting deleted_at
        let mut user: crate::models::user::ActiveModel = user.unwrap().into();
        user.deleted_at = Set(Some(Utc::now()));

        user.update(&db).await?;

        Ok(true)
    }
}