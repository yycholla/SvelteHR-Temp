//! User domain model with GraphQL integration
//!
//! Represents HR system users with RBAC, soft delete, and relationship loading.

use async_graphql::{Context, InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use crate::loaders::batch_load_users;

/// User status enumeration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "user_status", rename_all = "lowercase")]
pub enum UserStatus {
    Active,
    Inactive,
    Terminated,
}

impl UserStatus {
    pub fn as_str(&self) -> &str {
        match self {
            UserStatus::Active => "active",
            UserStatus::Inactive => "inactive",
            UserStatus::Terminated => "terminated",
        }
    }
}

/// GraphQL scalar for UserStatus
#[async_graphql::Scalar]
impl async_graphql::ScalarType for UserStatus {
    fn parse(value: async_graphql::Value) -> async_graphql::InputValueResult<Self> {
        if let async_graphql::Value::String(s) = value {
            match s.as_str() {
                "active" => Ok(UserStatus::Active),
                "inactive" => Ok(UserStatus::Inactive),
                "terminated" => Ok(UserStatus::Terminated),
                _ => Err(async_graphql::InputValueError::custom("Invalid user status")),
            }
        } else {
            Err(async_graphql::InputValueError::custom(
                "User status must be a string",
            ))
        }
    }

    fn to_value(&self) -> async_graphql::Value {
        async_graphql::Value::String(self.as_str().to_string())
    }
}

/// User model - maps to hr_public.users table
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct User {
    pub id: Uuid,
    pub email: String,
    pub first_name: String,
    pub last_name: String,
    pub full_name: String,
    pub phone: Option<String>,
    pub department_id: Option<Uuid>,
    pub manager_id: Option<Uuid>,
    pub hire_date: Option<DateTime<Utc>>,
    pub termination_date: Option<DateTime<Utc>>,
    pub status: UserStatus,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

/// GraphQL Object implementation for User
#[Object]
impl User {
    /// Unique user identifier
    async fn id(&self) -> Uuid {
        self.id
    }

    /// Email address (unique)
    async fn email(&self) -> &str {
        &self.email
    }

    /// First name
    async fn first_name(&self) -> &str {
        &self.first_name
    }

    /// Last name
    async fn last_name(&self) -> &str {
        &self.last_name
    }

    /// Full name (computed from first + last)
    async fn full_name(&self) -> &str {
        &self.full_name
    }

    /// Phone number (optional)
    async fn phone(&self) -> Option<&str> {
        self.phone.as_deref()
    }

    /// Department ID (foreign key)
    async fn department_id(&self) -> Option<Uuid> {
        self.department_id
    }

    /// Manager ID (foreign key, self-referential)
    async fn manager_id(&self) -> Option<Uuid> {
        self.manager_id
    }

    /// Hire date
    async fn hire_date(&self) -> Option<DateTime<Utc>> {
        self.hire_date
    }

    /// Termination date (only for terminated users)
    async fn termination_date(&self) -> Option<DateTime<Utc>> {
        self.termination_date
    }

    /// User status (active, inactive, terminated)
    async fn status(&self) -> UserStatus {
        self.status
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

    /// Department relationship (lazy-loaded)
    async fn department(&self, ctx: &Context<'_>) -> GqlResult<Option<super::department::Department>> {
        if let Some(dept_id) = self.department_id {
            let pool = ctx.data::<PgPool>()?;
            let dept = sqlx::query_as::<_, super::department::Department>(
                r#"
                SELECT id, name, description, parent_department_id, manager_id,
                       created_at, updated_at, deleted_at
                FROM hr_public.departments
                WHERE id = $1 AND deleted_at IS NULL
                "#,
            )
            .bind(dept_id)
            .fetch_optional(pool)
            .await?;

            Ok(dept)
        } else {
            Ok(None)
        }
    }

    /// Manager relationship (lazy-loaded via DataLoader)
    async fn manager(&self, ctx: &Context<'_>) -> GqlResult<Option<User>> {
        if let Some(manager_id) = self.manager_id {
            let pool = ctx.data::<PgPool>()?;
            let users_map = batch_load_users(pool, &[manager_id]).await?;
            Ok(users_map.get(&manager_id).cloned())
        } else {
            Ok(None)
        }
    }

    /// Direct reports (users managed by this user)
    async fn direct_reports(&self, ctx: &Context<'_>) -> GqlResult<Vec<User>> {
        let pool = ctx.data::<PgPool>()?;
        let reports = sqlx::query_as::<_, User>(
            r#"
            SELECT id, email, first_name, last_name, full_name, phone,
                   department_id, manager_id, hire_date, termination_date,
                   status, created_at, updated_at, deleted_at
            FROM hr_public.users
            WHERE manager_id = $1 AND deleted_at IS NULL
            ORDER BY last_name, first_name
            "#,
        )
        .bind(self.id)
        .fetch_all(pool)
        .await?;

        Ok(reports)
    }
}

/// User creation input
#[derive(Debug, Clone, InputObject)]
pub struct CreateUserInput {
    pub email: String,
    pub first_name: String,
    pub last_name: String,
    pub phone: Option<String>,
    pub department_id: Option<Uuid>,
    pub manager_id: Option<Uuid>,
    pub hire_date: Option<DateTime<Utc>>,
    pub status: UserStatus,
}

/// User update input
#[derive(Debug, Clone, InputObject)]
pub struct UpdateUserInput {
    pub email: Option<String>,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub phone: Option<String>,
    pub department_id: Option<Uuid>,
    pub manager_id: Option<Uuid>,
    pub hire_date: Option<DateTime<Utc>>,
    pub termination_date: Option<DateTime<Utc>>,
    pub status: Option<UserStatus>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_user_status_serialization() {
        assert_eq!(UserStatus::Active.as_str(), "active");
        assert_eq!(UserStatus::Inactive.as_str(), "inactive");
        assert_eq!(UserStatus::Terminated.as_str(), "terminated");
    }

    #[test]
    fn test_user_status_equality() {
        assert_eq!(UserStatus::Active, UserStatus::Active);
        assert_ne!(UserStatus::Active, UserStatus::Inactive);
    }
}
