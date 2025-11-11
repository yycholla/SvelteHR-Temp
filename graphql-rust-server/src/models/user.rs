//! User domain model with GraphQL integration
//!
//! Represents HR system users with RBAC, soft delete, and relationship loading.

use async_graphql::{Context, Enum, InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use sea_orm::{entity::prelude::*, QueryOrder, Related};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{database::get_db_from_context, models::generated::prelude::*};

/// User status enumeration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
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

/// User ordering options for GraphQL queries
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum)]
pub enum UsersOrderBy {
    /// Order by ID ascending
    #[graphql(name = "ID_ASC")]
    IdAsc,
    /// Order by ID descending
    #[graphql(name = "ID_DESC")]
    IdDesc,
    /// Order by email ascending (A-Z)
    #[graphql(name = "EMAIL_ASC")]
    EmailAsc,
    /// Order by email descending (Z-A)
    #[graphql(name = "EMAIL_DESC")]
    EmailDesc,
    /// Order by display name ascending (A-Z)
    #[graphql(name = "DISPLAY_NAME_ASC")]
    DisplayNameAsc,
    /// Order by display name descending (Z-A)
    #[graphql(name = "DISPLAY_NAME_DESC")]
    DisplayNameDesc,
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

impl UsersOrderBy {
    /// Convert to SQL ORDER BY clause
    pub fn to_sql(&self) -> &'static str {
        match self {
            UsersOrderBy::IdAsc => "id ASC",
            UsersOrderBy::IdDesc => "id DESC",
            UsersOrderBy::EmailAsc => "email ASC",
            UsersOrderBy::EmailDesc => "email DESC",
            UsersOrderBy::DisplayNameAsc => "display_name ASC",
            UsersOrderBy::DisplayNameDesc => "display_name DESC",
            UsersOrderBy::CreatedAtAsc => "created_at ASC",
            UsersOrderBy::CreatedAtDesc => "created_at DESC",
            UsersOrderBy::UpdatedAtAsc => "updated_at ASC",
            UsersOrderBy::UpdatedAtDesc => "updated_at DESC",
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

/// User entity - maps to hr_public.users table
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "users", schema_name = "hr_public")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub email: String,
    pub password_hash: String,
    pub first_name: String,
    pub last_name: String,
    pub display_name: String,  // Computed column
    pub full_name: String,    // Computed column
    pub phone_number: Option<String>,
    pub alternate_phone: Option<String>,
    pub job_title: Option<String>,
    pub status: Option<String>,
    pub department_id: Option<Uuid>,
    pub manager_id: Option<Uuid>,
    pub hire_date: Option<DateTime<Utc>>,
    pub termination_date: Option<DateTime<Utc>>,
    pub is_active: bool,
    pub failed_login_attempts: i32,
    pub locked_until: Option<DateTime<Utc>>,
    pub last_login: Option<DateTime<Utc>>,
    pub theme_preference: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::department::Entity",
        from = "Column::DepartmentId",
        to = "super::department::Column::Id"
    )]
    Department,
    #[sea_orm(
        belongs_to = "Entity",
        from = "Column::ManagerId",
        to = "Column::Id"
    )]
    Manager,
    #[sea_orm(has_many = "crate::models::task::Entity")]
    Tasks,
    #[sea_orm(has_many = "super::user_session::Entity")]
    UserSessions,
    #[sea_orm(has_many = "super::leave_request::Entity")]
    LeaveRequests,
    #[sea_orm(has_many = "super::performance_review::Entity")]
    PerformanceReviews,
    #[sea_orm(has_many = "crate::models::employee::user_address::Entity")]
    UserAddresses,
    #[sea_orm(has_many = "super::user_role_assignment::Entity")]
    UserRoleAssignments,
}

impl Related<super::department::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Department.def()
    }
}

impl Related<Entity> for super::department::Entity {
    fn to() -> RelationDef {
        Relation::Manager.def().rev()
    }
}

impl ActiveModelBehavior for ActiveModel {}

/// GraphQL Object implementation for User
#[Object(name = "User")]
impl Model {
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

    /// Display name (computed from first + last in database)
    async fn display_name(&self) -> &str {
        &self.display_name
    }

    /// Full name (computed column from first + last)
    async fn full_name(&self) -> &str {
        &self.full_name
    }

    /// User roles (from RBAC user_role_assignments table)
    async fn roles(&self, ctx: &Context<'_>) -> GqlResult<Vec<super::role::Model>> {
        let db = get_db_from_context(ctx)?;

        // Query roles via user_role_assignments join table
        let role_assignments = super::user_role_assignment::Entity::find()
            .filter(super::user_role_assignment::Column::UserId.eq(self.id))
            .filter(super::user_role_assignment::Column::DeletedAt.is_null())
            .all(&db)
            .await?;

        // Load the actual role records
        let role_ids: Vec<Uuid> = role_assignments
            .iter()
            .map(|ra| ra.role_id)
            .collect();

        let roles = super::role::Entity::find()
            .filter(super::role::Column::Id.is_in(role_ids))
            .filter(super::role::Column::DeletedAt.is_null())
            .order_by_desc(super::role::Column::Level) // Order by hierarchy level
            .all(&db)
            .await?;

        Ok(roles)
    }

    /// Phone number (optional)
    async fn phone(&self) -> Option<&str> {
        self.phone_number.as_deref()
    }

    /// Alternate phone number (optional)
    async fn alternate_phone(&self) -> Option<&str> {
        self.alternate_phone.as_deref()
    }

    /// Job title (optional)
    async fn job_title(&self) -> Option<&str> {
        self.job_title.as_deref()
    }

    /// User status (active, inactive, terminated)
    async fn status(&self) -> Option<&str> {
        self.status.as_deref()
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

    /// Is active (true if user is currently active)
    async fn is_active(&self) -> bool {
        self.is_active
    }

    /// User theme preference (light, dark, or system)
    #[graphql(name = "themePreference")]
    async fn theme_preference(&self) -> &str {
        &self.theme_preference
    }

    /// Record creation timestamp
    async fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }

    /// Record last update timestamp
    async fn updated_at(&self) -> DateTime<Utc> {
        self.updated_at
    }

    /// Department relationship (lazy-loaded)
    async fn department(&self, ctx: &Context<'_>) -> GqlResult<Option<super::department::Model>> {
        if let Some(dept_id) = self.department_id {
            let db = get_db_from_context(ctx)?;
            let dept = super::department::Entity::find_by_id(dept_id).one(&db).await?;
            Ok(dept)
        } else {
            Ok(None)
        }
    }

    /// Manager relationship (lazy-loaded)
    async fn manager(&self, ctx: &Context<'_>) -> GqlResult<Option<Model>> {
        if let Some(manager_id) = self.manager_id {
            let db = get_db_from_context(ctx)?;
            let manager = Entity::find_by_id(manager_id).one(&db).await?;
            Ok(manager)
        } else {
            Ok(None)
        }
    }

    /// Direct reports (users managed by this user)
    async fn direct_reports(&self, ctx: &Context<'_>) -> GqlResult<Vec<Model>> {
        let db = get_db_from_context(ctx)?;
        let reports = Entity::find()
            .filter(Column::ManagerId.eq(self.id))
            .filter(Column::IsActive.eq(true))
            .filter(Column::DeletedAt.is_null())
            .all(&db)
            .await?;

        Ok(reports)
    }

    /// User addresses (lazy-loaded)
    async fn addresses(&self, ctx: &Context<'_>) -> GqlResult<Vec<crate::models::employee::user_address::Model>> {
        let db = get_db_from_context(ctx)?;
        let addresses = crate::models::employee::user_address::Entity::find()
            .filter(crate::models::employee::user_address::Column::UserId.eq(self.id))
            .filter(crate::models::employee::user_address::Column::DeletedAt.is_null())
            .all(&db)
            .await?;

        Ok(addresses)
    }

    /// Primary address (lazy-loaded)
    async fn primary_address(&self, ctx: &Context<'_>) -> GqlResult<Option<crate::models::employee::user_address::Model>> {
        let db = get_db_from_context(ctx)?;
        let address = crate::models::employee::user_address::Entity::find()
            .filter(crate::models::employee::user_address::Column::UserId.eq(self.id))
            .filter(crate::models::employee::user_address::Column::IsPrimary.eq(true))
            .filter(crate::models::employee::user_address::Column::DeletedAt.is_null())
            .one(&db)
            .await?;

        Ok(address)
    }

}

/// User condition for filtering queries (PostGraphile-style)
#[derive(Debug, Clone, InputObject)]
pub struct UserCondition {
    pub id: Option<Uuid>,
    pub email: Option<String>,
    pub department_id: Option<Uuid>,
    pub manager_id: Option<Uuid>,
    pub is_active: Option<bool>,
    pub status: Option<String>,
}

/// Users connection for Relay-style pagination (PostGraphile compatibility)
#[derive(Debug, Clone)]
pub struct UsersConnection {
    pub nodes: Vec<Model>,
    pub total_count: i64,
}

#[Object(name = "user_UsersConnection")]
impl UsersConnection {
    async fn nodes(&self) -> &Vec<Model> {
        &self.nodes
    }

    async fn total_count(&self) -> i64 {
        self.total_count
    }
}

/// User creation input
#[derive(Debug, Clone, InputObject)]
pub struct CreateUserInput {
    #[graphql(validator(email))]
    pub email: String,
    #[graphql(validator(min_length = 1, max_length = 50))]
    pub first_name: String,
    #[graphql(validator(min_length = 1, max_length = 50))]
    pub last_name: String,
    #[graphql(validator(regex = r"^\+?[1-9]\d{1,14}$"))]
    pub phone: Option<String>,
    #[graphql(validator(regex = r"^\+?[1-9]\d{1,14}$"))]
    pub alternate_phone: Option<String>,
    #[graphql(validator(max_length = 100))]
    pub job_title: Option<String>,
    pub department_id: Option<Uuid>,
    pub manager_id: Option<Uuid>,
    pub hire_date: Option<DateTime<Utc>>,
    pub status: UserStatus,
    /// Optional password for the user. If not provided, a temporary password will be generated.
    #[graphql(validator(min_length = 8, max_length = 128))]
    pub password: Option<String>,
}

/// User update input
#[derive(Debug, Clone, InputObject)]
pub struct UpdateUserInput {
    #[graphql(validator(email))]
    pub email: Option<String>,
    #[graphql(validator(min_length = 1, max_length = 50))]
    pub first_name: Option<String>,
    #[graphql(validator(min_length = 1, max_length = 50))]
    pub last_name: Option<String>,
    #[graphql(validator(regex = r"^\+?[1-9]\d{1,14}$"))]
    pub phone: Option<String>,
    #[graphql(validator(regex = r"^\+?[1-9]\d{1,14}$"))]
    pub alternate_phone: Option<String>,
    #[graphql(validator(max_length = 100))]
    pub job_title: Option<String>,
    pub department_id: Option<Uuid>,
    pub manager_id: Option<Uuid>,
    pub hire_date: Option<DateTime<Utc>>,
    pub termination_date: Option<DateTime<Utc>>,
    pub status: Option<UserStatus>,
    #[graphql(name = "themePreference", validator(max_length = 20))]
    pub theme_preference: Option<String>,
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
