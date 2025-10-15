//! Department domain model with GraphQL integration
//!
//! Represents organizational departments with hierarchical relationships.

use async_graphql::{Context, Enum, InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use sea_orm::{entity::prelude::*, FromQueryResult, Related};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{database::get_db_from_context, error::AppError, models::generated::prelude::*};

/// Department ordering options for GraphQL queries
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum)]
pub enum DepartmentsOrderBy {
    /// Order by ID ascending
    #[graphql(name = "ID_ASC")]
    IdAsc,
    /// Order by ID descending
    #[graphql(name = "ID_DESC")]
    IdDesc,
    /// Order by name ascending (A-Z)
    #[graphql(name = "NAME_ASC")]
    NameAsc,
    /// Order by name descending (Z-A)
    #[graphql(name = "NAME_DESC")]
    NameDesc,
    /// Order by manager ID ascending
    #[graphql(name = "MANAGER_ID_ASC")]
    ManagerIdAsc,
    /// Order by manager ID descending
    #[graphql(name = "MANAGER_ID_DESC")]
    ManagerIdDesc,
    /// Order by created date ascending (oldest first)
    #[graphql(name = "CREATED_AT_ASC")]
    CreatedAtAsc,
    /// Order by created date descending (newest first)
    #[graphql(name = "CREATED_AT_DESC")]
    CreatedAtDesc,
    /// Order by updated date ascending (oldest first)
    #[graphql(name = "UPDATED_AT_ASC")]
    UpdatedAtAsc,
    /// Order by updated date descending (newest first)
    #[graphql(name = "UPDATED_AT_DESC")]
    UpdatedAtDesc,
}

impl DepartmentsOrderBy {
    /// Convert to SQL ORDER BY clause
    pub fn to_sql(&self) -> &'static str {
        match self {
            DepartmentsOrderBy::IdAsc => "id ASC",
            DepartmentsOrderBy::IdDesc => "id DESC",
            DepartmentsOrderBy::NameAsc => "name ASC",
            DepartmentsOrderBy::NameDesc => "name DESC",
            DepartmentsOrderBy::ManagerIdAsc => "manager_id ASC",
            DepartmentsOrderBy::ManagerIdDesc => "manager_id DESC",
            DepartmentsOrderBy::CreatedAtAsc => "created_at ASC",
            DepartmentsOrderBy::CreatedAtDesc => "created_at DESC",
            DepartmentsOrderBy::UpdatedAtAsc => "updated_at ASC",
            DepartmentsOrderBy::UpdatedAtDesc => "updated_at DESC",
        }
    }
}




/// Department entity - maps to hr_public.departments table
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "departments")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub parent_department_id: Option<Uuid>,
    pub manager_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "Entity",
        from = "Column::ParentDepartmentId",
        to = "Column::Id"
    )]
    Parent,
    #[sea_orm(has_many = "Entity")]
    Children,
    #[sea_orm(
        belongs_to = "super::user::Entity",
        from = "Column::ManagerId",
        to = "super::user::Column::Id"
    )]
    Manager,
    #[sea_orm(has_many = "super::user::Entity")]
    Users,
}

impl Related<Entity> for super::user::Entity {
    fn to() -> RelationDef {
        Relation::Manager.def().rev()
    }
}

impl ActiveModelBehavior for ActiveModel {}

/// GraphQL Object implementation for Department
#[Object]
impl Model {
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

    /// Parent department ID (self-referential foreign key)
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

    /// Department manager (lazy-loaded)
    async fn manager(&self, ctx: &Context<'_>) -> GqlResult<Option<super::user::Model>> {
        if let Some(manager_id) = self.manager_id {
            let db = get_db_from_context(ctx)?;
            let manager = super::user::Entity::find_by_id(manager_id).one(db).await?;
            Ok(manager)
        } else {
            Ok(None)
        }
    }

    /// Employees in this department
    async fn employees(&self, ctx: &Context<'_>) -> GqlResult<Vec<super::user::Model>> {
        let db = get_db_from_context(ctx)?;
        let employees = super::user::Entity::find()
            .filter(super::user::Column::DepartmentId.eq(self.id))
            .all(db)
            .await?;

        Ok(employees)
    }

    /// Total employee count in this department
    async fn employee_count(&self, ctx: &Context<'_>) -> GqlResult<i64> {
        let db = get_db_from_context(ctx)?;
        let count = super::user::Entity::find()
            .filter(super::user::Column::DepartmentId.eq(self.id))
            .count(db)
            .await?;

        Ok(count as i64)
    }
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

    /// Parent department ID (self-referential foreign key)
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

    // Note: Hierarchical departments (parent/child) not yet implemented in database
    // These features will be added when the database schema is updated

    /// Department manager (lazy-loaded via DataLoader)
    async fn user_by_manager_id(&self, ctx: &Context<'_>) -> GqlResult<Option<super::user::User>> {
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
            SELECT id, email, first_name, last_name, display_name, role, phone_number,
                   department_id, manager_id, hire_date, is_active,
                   created_at, updated_at
            FROM hr_public.users
            WHERE department_id = $1
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
            WHERE department_id = $1
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
    pub manager_id: Option<Uuid>,
}

/// Department update input
#[derive(Debug, Clone, InputObject)]
pub struct UpdateDepartmentInput {
    pub name: Option<String>,
    pub description: Option<String>,
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
        };

        assert_eq!(dept.name, "Engineering");
    }
}
