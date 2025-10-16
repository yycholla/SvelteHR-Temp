//! Activity Log Model
//!
//! Maps to hr_public.activity_logs table

use async_graphql::{Context, Enum, InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use sea_orm::{entity::prelude::*, FromQueryResult, Related};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use uuid::Uuid;

use crate::{database::get_db_from_context, error::AppError, models::generated::prelude::*, schema::PageInfo};

/// ActivityLog entity - maps to hr_public.activity_logs table
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "activity_logs")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub user_id: Uuid,
    pub employee_id: Option<Uuid>,
    pub action: String,
    pub resource_type: String,
    pub resource_id: Option<Uuid>,
    pub details: Option<JsonValue>,
    pub before_snapshot: Option<JsonValue>,
    pub after_snapshot: Option<JsonValue>,
    pub is_rollback: bool,
    pub rolled_back_log_id: Option<Uuid>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub signature_id: Option<Uuid>,
    pub batch_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "crate::models::user::Entity",
        from = "Column::UserId",
        to = "crate::models::user::Column::Id"
    )]
    User,
    #[sea_orm(
        belongs_to = "crate::models::user::Entity",
        from = "Column::EmployeeId",
        to = "crate::models::user::Column::Id"
    )]
    Employee,
}

impl Related<crate::models::user::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::User.def().rev()
    }
}

impl ActiveModelBehavior for ActiveModel {}

/// GraphQL Object implementation for ActivityLog
#[Object]
impl Model {
    /// Unique activity log identifier
    async fn id(&self) -> Uuid {
        self.id
    }

    /// User ID who performed the action
    async fn user_id(&self) -> Uuid {
        self.user_id
    }

    /// Employee ID if action was performed on behalf of another user
    async fn employee_id(&self) -> Option<Uuid> {
        self.employee_id
    }

    /// Action performed (CREATE, UPDATE, DELETE, etc.)
    async fn action(&self) -> &str {
        &self.action
    }

    /// Type of resource affected
    async fn resource_type(&self) -> &str {
        &self.resource_type
    }

    /// ID of the resource affected
    async fn resource_id(&self) -> Option<Uuid> {
        self.resource_id
    }

    /// Additional details about the action
    async fn details(&self) -> Option<&JsonValue> {
        self.details.as_ref()
    }

    /// State before the action
    async fn before_snapshot(&self) -> Option<&JsonValue> {
        self.before_snapshot.as_ref()
    }

    /// State after the action
    async fn after_snapshot(&self) -> Option<&JsonValue> {
        self.after_snapshot.as_ref()
    }

    /// Whether this is a rollback action
    async fn is_rollback(&self) -> bool {
        self.is_rollback
    }

    /// ID of the original log if this is a rollback
    async fn rolled_back_log_id(&self) -> Option<Uuid> {
        self.rolled_back_log_id
    }

    /// IP address of the user
    async fn ip_address(&self) -> Option<&str> {
        self.ip_address.as_deref()
    }

    /// User agent string
    async fn user_agent(&self) -> Option<&str> {
        self.user_agent.as_deref()
    }

    /// Signature ID for verification
    async fn signature_id(&self) -> Option<Uuid> {
        self.signature_id
    }

    /// Batch ID for bulk operations
    async fn batch_id(&self) -> Option<Uuid> {
        self.batch_id
    }

    /// Record creation timestamp
    async fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }

    /// User who performed the action
    async fn user(&self, ctx: &Context<'_>) -> GqlResult<Option<crate::models::user::Model>> {
        let db = get_db_from_context(ctx)?;
        let user = crate::models::user::Entity::find_by_id(self.user_id).one(&db).await?;
        Ok(user)
    }

    /// Employee if action was performed on behalf of another user
    async fn employee(&self, ctx: &Context<'_>) -> GqlResult<Option<crate::models::user::Model>> {
        if let Some(employee_id) = self.employee_id {
            let db = get_db_from_context(ctx)?;
            let employee = crate::models::user::Entity::find_by_id(employee_id).one(&db).await?;
            Ok(employee)
        } else {
            Ok(None)
        }
    }
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

/// Condition input for filtering activity logs (PostGraphile-style)
#[derive(Debug, Clone, InputObject)]
pub struct ActivityLogCondition {
    pub id: Option<Uuid>,
    #[graphql(name = "userId")]
    pub user_id: Option<Uuid>,
    #[graphql(name = "employeeId")]
    pub employee_id: Option<Uuid>,
    pub action: Option<String>,
    #[graphql(name = "resourceType")]
    pub resource_type: Option<String>,
    #[graphql(name = "resourceId")]
    pub resource_id: Option<Uuid>,
    #[graphql(name = "isRollback")]
    pub is_rollback: Option<bool>,
    #[graphql(name = "rolledBackLogId")]
    pub rolled_back_log_id: Option<Uuid>,
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

/// Connection type for paginated activity logs
#[derive(Debug, Clone)]
pub struct ActivityLogsConnection {
    pub nodes: Vec<Model>,
    pub total_count: i64,
    pub page_info: PageInfo,
}

#[Object]
impl ActivityLogsConnection {
    async fn nodes(&self) -> &Vec<Model> {
        &self.nodes
    }

    async fn total_count(&self) -> i64 {
        self.total_count
    }

    async fn page_info(&self) -> &PageInfo {
        &self.page_info
    }
}

