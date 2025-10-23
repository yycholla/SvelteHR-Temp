use async_graphql::{Context, Result};
use chrono::Utc;
use sea_orm::{DatabaseConnection, EntityTrait, Set, ActiveModelTrait, QueryFilter, ColumnTrait};
use uuid::Uuid;

use crate::{
    database::get_db_from_context,
    error::AppError,
    models::{
        generated::prelude::*,
        CreateDepartmentInput, UpdateDepartmentInput, Department,
    },
};

/// Department mutations
pub struct DepartmentMutations;

#[async_graphql::Object]
impl DepartmentMutations {
    /// Create a new department
    async fn create_department(
        &self,
        ctx: &Context<'_>,
        input: CreateDepartmentInput,
    ) -> Result<Department> {
        let db = get_db_from_context(ctx)?;

        let department = crate::models::department::ActiveModel {
            name: Set(input.name.clone()),
            description: Set(input.description.clone()),
            manager_id: Set(input.manager_id),
            ..Default::default()
        };

        let department = department.insert(&db).await?;

        // Convert SeaORM model to legacy Department struct for compatibility
        let department = Department {
            id: department.id,
            name: department.name,
            description: department.description,
            parent_department_id: department.parent_department_id,
            manager_id: department.manager_id,
            created_at: department.created_at,
            updated_at: department.updated_at,
            deleted_at: department.deleted_at,
        };

        Ok(department)
    }

    /// Update an existing department
    async fn update_department(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateDepartmentInput,
    ) -> Result<Department> {
        let db = get_db_from_context(ctx)?;

        // Find existing department
        let existing_dept = crate::models::department::Entity::find_by_id(id)
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Department not found".to_string()))?;

        // Build active model with updates
        let mut dept: crate::models::department::ActiveModel = existing_dept.into();

        if let Some(name) = input.name {
            dept.name = Set(name);
        }

        if let Some(description) = input.description {
            dept.description = Set(Some(description));
        }

        if let Some(manager_id) = input.manager_id {
            dept.manager_id = Set(Some(manager_id));
        }

        // Update timestamp
        dept.updated_at = Set(Utc::now());

        // Save changes
        let updated_dept = dept.update(&db).await?;

        // Convert to legacy Department struct for compatibility
        let department = Department {
            id: updated_dept.id,
            name: updated_dept.name,
            description: updated_dept.description,
            parent_department_id: updated_dept.parent_department_id,
            manager_id: updated_dept.manager_id,
            created_at: updated_dept.created_at,
            updated_at: updated_dept.updated_at,
            deleted_at: updated_dept.deleted_at,
        };

        Ok(department)
    }

    /// Soft delete a department (sets deleted_at timestamp)
    async fn delete_department(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;

        // Find the department first to ensure it exists
        let dept = crate::models::department::Entity::find_by_id(id)
            .filter(crate::models::department::Column::DeletedAt.is_null())
            .one(&db)
            .await?;

        if dept.is_none() {
            return Ok(false);
        }

        // Soft delete by setting deleted_at
        let mut dept: crate::models::department::ActiveModel = dept.unwrap().into();
        dept.deleted_at = Set(Some(Utc::now()));

        dept.update(&db).await?;

        Ok(true)
    }
}