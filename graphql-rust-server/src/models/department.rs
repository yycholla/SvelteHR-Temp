//! Department domain model with GraphQL integration
//!
//! Represents organizational departments with hierarchical relationships.

use async_graphql::{Context, InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use crate::loaders::batch_load_users;

/// Department model - maps to hr_public.departments table
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Department {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub parent_department_id: Option<Uuid>,
    pub manager_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

/// GraphQL Object implementation for Department
#[Object]
impl Department {
    /// Unique department identifier
    async fn id(&self) -> Uuid {
        self.id
    }

    /// Department name
    async fn name(&self) -> &str {
        &self.name
    }

    /// Department description (optional)
    async fn description(&self) -> Option<&str> {
        self.description.as_deref()
    }

    /// Parent department ID (for hierarchical structure)
    async fn parent_department_id(&self) -> Option<Uuid> {
        self.parent_department_id
    }

    /// Department manager ID (foreign key to users)
    async fn manager_id(&self) -> Option<Uuid> {
        self.manager_id
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

    /// Parent department relationship (lazy-loaded)
    async fn parent_department(&self, ctx: &Context<'_>) -> GqlResult<Option<Department>> {
        if let Some(parent_id) = self.parent_department_id {
            let pool = ctx.data::<PgPool>()?;
            let parent = sqlx::query_as::<_, Department>(
                r#"
                SELECT id, name, description, parent_department_id, manager_id,
                       created_at, updated_at, deleted_at
                FROM hr_public.departments
                WHERE id = $1 AND deleted_at IS NULL
                "#,
            )
            .bind(parent_id)
            .fetch_optional(pool)
            .await?;

            Ok(parent)
        } else {
            Ok(None)
        }
    }

    /// Child departments (departments under this department)
    async fn child_departments(&self, ctx: &Context<'_>) -> GqlResult<Vec<Department>> {
        let pool = ctx.data::<PgPool>()?;
        let children = sqlx::query_as::<_, Department>(
            r#"
            SELECT id, name, description, parent_department_id, manager_id,
                   created_at, updated_at, deleted_at
            FROM hr_public.departments
            WHERE parent_department_id = $1 AND deleted_at IS NULL
            ORDER BY name
            "#,
        )
        .bind(self.id)
        .fetch_all(pool)
        .await?;

        Ok(children)
    }

    /// Department manager (lazy-loaded via DataLoader)
    async fn manager(&self, ctx: &Context<'_>) -> GqlResult<Option<super::user::User>> {
        if let Some(manager_id) = self.manager_id {
            let pool = ctx.data::<PgPool>()?;
            let users_map = batch_load_users(pool, &[manager_id]).await?;
            Ok(users_map.get(&manager_id).cloned())
        } else {
            Ok(None)
        }
    }

    /// Employees in this department
    async fn employees(&self, ctx: &Context<'_>) -> GqlResult<Vec<super::user::User>> {
        let pool = ctx.data::<PgPool>()?;
        let employees = sqlx::query_as::<_, super::user::User>(
            r#"
            SELECT id, email, first_name, last_name, full_name, phone,
                   department_id, manager_id, hire_date, termination_date,
                   status, created_at, updated_at, deleted_at
            FROM hr_public.users
            WHERE department_id = $1 AND deleted_at IS NULL
            ORDER BY last_name, first_name
            "#,
        )
        .bind(self.id)
        .fetch_all(pool)
        .await?;

        Ok(employees)
    }

    /// Total employee count in this department
    async fn employee_count(&self, ctx: &Context<'_>) -> GqlResult<i64> {
        let pool = ctx.data::<PgPool>()?;
        let count: (i64,) = sqlx::query_as(
            r#"
            SELECT COUNT(*)::bigint
            FROM hr_public.users
            WHERE department_id = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(self.id)
        .fetch_one(pool)
        .await?;

        Ok(count.0)
    }
}

/// Department creation input
#[derive(Debug, Clone, InputObject)]
pub struct CreateDepartmentInput {
    pub name: String,
    pub description: Option<String>,
    pub parent_department_id: Option<Uuid>,
    pub manager_id: Option<Uuid>,
}

/// Department update input
#[derive(Debug, Clone, InputObject)]
pub struct UpdateDepartmentInput {
    pub name: Option<String>,
    pub description: Option<String>,
    pub parent_department_id: Option<Uuid>,
    pub manager_id: Option<Uuid>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_department_model_compiles() {
        // Basic compilation test
        let dept = Department {
            id: Uuid::new_v4(),
            name: "Engineering".to_string(),
            description: Some("Software development team".to_string()),
            parent_department_id: None,
            manager_id: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            deleted_at: None,
        };

        assert_eq!(dept.name, "Engineering");
    }
}
