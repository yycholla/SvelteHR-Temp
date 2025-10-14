//! Activity Log Model
//!
//! Maps to hr_public.activity_logs table

use async_graphql::{Enum, InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use sqlx::PgPool;
use uuid::Uuid;

/// System activity audit log
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ActivityLog {
    pub id: Uuid,
    pub user_id: Uuid,
    pub employee_id: Option<Uuid>,
    pub action: String,
    pub resource_type: String,
    pub resource_id: Option<Uuid>,
    pub details: Option<JsonValue>,
    pub created_at: DateTime<Utc>,
}

/// Input for creating a new activity log entry (audit trail)
#[derive(Debug, Clone, InputObject)]
pub struct CreateActivityLogInput {
    #[graphql(name = "userId")]
    pub user_id: Uuid,
    #[graphql(name = "employeeId")]
    pub employee_id: Option<Uuid>,
    pub action: String,
    #[graphql(name = "resourceType")]
    pub resource_type: String,
    #[graphql(name = "resourceId")]
    pub resource_id: Option<Uuid>,
    pub details: Option<String>, // JSON string
}

/// Ordering options for activity logs
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum)]
pub enum ActivityLogsOrderBy {
    #[graphql(name = "ID_ASC")]
    IdAsc,
    #[graphql(name = "ID_DESC")]
    IdDesc,
    #[graphql(name = "USER_ID_ASC")]
    UserIdAsc,
    #[graphql(name = "USER_ID_DESC")]
    UserIdDesc,
    #[graphql(name = "EMPLOYEE_ID_ASC")]
    EmployeeIdAsc,
    #[graphql(name = "EMPLOYEE_ID_DESC")]
    EmployeeIdDesc,
    #[graphql(name = "ACTION_ASC")]
    ActionAsc,
    #[graphql(name = "ACTION_DESC")]
    ActionDesc,
    #[graphql(name = "RESOURCE_TYPE_ASC")]
    ResourceTypeAsc,
    #[graphql(name = "RESOURCE_TYPE_DESC")]
    ResourceTypeDesc,
    #[graphql(name = "RESOURCE_ID_ASC")]
    ResourceIdAsc,
    #[graphql(name = "RESOURCE_ID_DESC")]
    ResourceIdDesc,
    #[graphql(name = "CREATED_AT_ASC")]
    CreatedAtAsc,
    #[graphql(name = "CREATED_AT_DESC")]
    CreatedAtDesc,
}

impl ActivityLogsOrderBy {
    pub fn to_sql(&self) -> &'static str {
        match self {
            ActivityLogsOrderBy::IdAsc => "id ASC",
            ActivityLogsOrderBy::IdDesc => "id DESC",
            ActivityLogsOrderBy::UserIdAsc => "user_id ASC",
            ActivityLogsOrderBy::UserIdDesc => "user_id DESC",
            ActivityLogsOrderBy::EmployeeIdAsc => "employee_id ASC",
            ActivityLogsOrderBy::EmployeeIdDesc => "employee_id DESC",
            ActivityLogsOrderBy::ActionAsc => "action ASC",
            ActivityLogsOrderBy::ActionDesc => "action DESC",
            ActivityLogsOrderBy::ResourceTypeAsc => "resource_type ASC",
            ActivityLogsOrderBy::ResourceTypeDesc => "resource_type DESC",
            ActivityLogsOrderBy::ResourceIdAsc => "resource_id ASC",
            ActivityLogsOrderBy::ResourceIdDesc => "resource_id DESC",
            ActivityLogsOrderBy::CreatedAtAsc => "created_at ASC",
            ActivityLogsOrderBy::CreatedAtDesc => "created_at DESC",
        }
    }
}

/// GraphQL Object implementation with camelCase field names
#[Object]
impl ActivityLog {
    async fn id(&self) -> Uuid {
        self.id
    }

    #[graphql(name = "userId")]
    async fn user_id(&self) -> Uuid {
        self.user_id
    }

    #[graphql(name = "employeeId")]
    async fn employee_id(&self) -> Option<Uuid> {
        self.employee_id
    }

    async fn action(&self) -> &str {
        &self.action
    }

    #[graphql(name = "resourceType")]
    async fn resource_type(&self) -> &str {
        &self.resource_type
    }

    #[graphql(name = "resourceId")]
    async fn resource_id(&self) -> Option<Uuid> {
        self.resource_id
    }

    async fn details(&self) -> Option<String> {
        self.details.as_ref().map(|v| v.to_string())
    }

    #[graphql(name = "createdAt")]
    async fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }

    /// User relationship (lazy-loaded)
    async fn user(&self, ctx: &async_graphql::Context<'_>) -> GqlResult<Option<crate::models::User>> {
        let pool = ctx.data::<PgPool>()?;
        let user = sqlx::query_as::<_, crate::models::User>(
            r#"
            SELECT id, email, first_name, last_name, display_name, full_name, role,
                   phone_number, alternate_phone, job_title, status,
                   department_id, manager_id, hire_date, is_active,
                   created_at, updated_at
            FROM hr_public.users
            WHERE id = $1
            "#,
        )
        .bind(self.user_id)
        .fetch_optional(pool)
        .await?;

        Ok(user)
    }

    /// Employee relationship (lazy-loaded) - same as user but via employee_id
    async fn employee(&self, ctx: &async_graphql::Context<'_>) -> GqlResult<Option<crate::models::User>> {
        if let Some(employee_id) = self.employee_id {
            let pool = ctx.data::<PgPool>()?;
            let user = sqlx::query_as::<_, crate::models::User>(
                r#"
                SELECT id, email, first_name, last_name, display_name, full_name, role,
                       phone_number, alternate_phone, job_title, status,
                       department_id, manager_id, hire_date, is_active,
                       created_at, updated_at
                FROM hr_public.users
                WHERE id = $1
                "#,
            )
            .bind(employee_id)
            .fetch_optional(pool)
            .await?;

            Ok(user)
        } else {
            Ok(None)
        }
    }
}
