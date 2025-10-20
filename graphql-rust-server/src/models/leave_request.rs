//! LeaveRequest domain model with GraphQL integration
//!
//! Represents time-off requests with approval workflow.

use async_graphql::{Context, Enum, InputObject, Object, Result as GqlResult};
use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use sea_orm::{entity::prelude::*, FromQueryResult, Related};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{database::get_db_from_context, error::AppError, models::generated::prelude::*};

/// Leave request status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum)]
pub enum LeaveRequestStatus {
    Pending,
    Approved,
    Rejected,
    Cancelled,
}

impl LeaveRequestStatus {
    pub fn as_str(&self) -> &str {
        match self {
            LeaveRequestStatus::Pending => "pending",
            LeaveRequestStatus::Approved => "approved",
            LeaveRequestStatus::Rejected => "rejected",
            LeaveRequestStatus::Cancelled => "cancelled",
        }
    }
}

/// LeaveRequest entity - maps to hr_public.leave_requests table
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "leave_requests", schema_name = "hr_public")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub employee_id: Uuid,
    pub leave_type_id: Uuid,
    pub start_date: NaiveDate,
    pub end_date: NaiveDate,
    #[sea_orm(column_name = "total_days")]
    pub days_requested: Decimal,
    pub status: String,
    pub reason: Option<String>,
    #[sea_orm(column_name = "approved_by")]
    pub manager_id: Option<Uuid>,
    pub approved_at: Option<DateTime<Utc>>,
    #[sea_orm(column_name = "rejection_reason")]
    pub manager_comments: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::user::Entity",
        from = "Column::EmployeeId",
        to = "super::user::Column::Id"
    )]
    Employee,
    #[sea_orm(
        belongs_to = "super::user::Entity",
        from = "Column::ManagerId",
        to = "super::user::Column::Id"
    )]
    Manager,
}

impl Related<super::user::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Employee.def().rev()
    }
}

impl ActiveModelBehavior for ActiveModel {}

/// GraphQL Object implementation for LeaveRequest
#[Object(name = "leave_request_Model")]
impl Model {
    /// Unique leave request identifier
    async fn id(&self) -> Uuid {
        self.id
    }

    /// Employee ID requesting leave (foreign key)
    async fn employee_id(&self) -> Uuid {
        self.employee_id
    }

    /// Manager ID who can approve/reject (optional foreign key)
    async fn manager_id(&self) -> Option<Uuid> {
        self.manager_id
    }

    /// Leave type ID (foreign key to leave_types)
    async fn leave_type_id(&self) -> Uuid {
        self.leave_type_id
    }

    /// Leave type details (relationship resolver)
    async fn leave_type(&self, ctx: &Context<'_>) -> GqlResult<Option<super::leave_type::Model>> {
        let db = get_db_from_context(ctx)?;
        let leave_type = super::leave_type::Entity::find_by_id(self.leave_type_id)
            .one(&db)
            .await?;
        Ok(leave_type)
    }

    /// Leave start date
    async fn start_date(&self) -> NaiveDate {
        self.start_date
    }

    /// Leave end date
    async fn end_date(&self) -> NaiveDate {
        self.end_date
    }

    /// Number of days requested (including fractional days like 0.5 for half-day)
    async fn days_requested(&self) -> String {
        self.days_requested.to_string()
    }

    /// Current status of the request
    async fn status(&self) -> LeaveRequestStatus {
        match self.status.as_str() {
            "pending" => LeaveRequestStatus::Pending,
            "approved" => LeaveRequestStatus::Approved,
            "rejected" => LeaveRequestStatus::Rejected,
            "cancelled" => LeaveRequestStatus::Cancelled,
            _ => LeaveRequestStatus::Pending, // Default fallback
        }
    }

    /// Reason for leave (optional)
    async fn reason(&self) -> Option<&str> {
        self.reason.as_deref()
    }

    /// Manager comments (optional)
    async fn manager_comments(&self) -> Option<&str> {
        self.manager_comments.as_deref()
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

    /// Employee requesting leave
    async fn employee(&self, ctx: &Context<'_>) -> GqlResult<Option<super::user::Model>> {
        let db = get_db_from_context(ctx)?;
        let employee = super::user::Entity::find_by_id(self.employee_id).one(&db).await?;
        Ok(employee)
    }

    /// Manager who can approve/reject the request
    async fn manager(&self, ctx: &Context<'_>) -> GqlResult<Option<super::user::Model>> {
        if let Some(manager_id) = self.manager_id {
            let db = get_db_from_context(ctx)?;
            let manager = super::user::Entity::find_by_id(manager_id).one(&db).await?;
            Ok(manager)
        } else {
            Ok(None)
        }
    }

    /// Employee requesting leave (legacy resolver for compatibility)
    async fn user_by_employee_id(&self, ctx: &Context<'_>) -> GqlResult<Option<super::user::Model>> {
        let db = get_db_from_context(ctx)?;
        let user = super::user::Entity::find_by_id(self.employee_id).one(&db).await?;
        Ok(user)
    }

    /// Manager who can approve/reject the request (legacy resolver for compatibility)
    async fn user_by_manager_id(&self, ctx: &Context<'_>) -> GqlResult<Option<super::user::Model>> {
        if let Some(manager_id) = self.manager_id {
            let db = get_db_from_context(ctx)?;
            let manager = super::user::Entity::find_by_id(manager_id).one(&db).await?;
            Ok(manager)
        } else {
            Ok(None)
        }
    }

    /// Whether the request is currently pending
    async fn is_pending(&self) -> bool {
        self.status == "pending"
    }

    /// Whether the request is approved
    async fn is_approved(&self) -> bool {
        self.status == "approved"
    }

    /// Duration in days (calculated from start/end dates)
    async fn duration_days(&self) -> String {
        self.days_requested.to_string()
    }
}



/// LeaveRequest creation input
#[derive(Debug, Clone, InputObject)]
pub struct CreateLeaveRequestInput {
    pub leave_type_id: Uuid,
    pub start_date: DateTime<Utc>,
    pub end_date: DateTime<Utc>,
    /// Number of days (can be fractional like "0.5" for half-day)
    pub days_requested: String,
    pub reason: Option<String>,
}

/// LeaveRequest update input
#[derive(Debug, Clone, InputObject)]
pub struct UpdateLeaveRequestInput {
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    /// Number of days (can be fractional like "0.5" for half-day)
    pub days_requested: Option<String>,
    pub reason: Option<String>,
}

/// LeaveRequest approval input
#[derive(Debug, Clone, InputObject)]
pub struct ApproveLeaveRequestInput {
    pub request_id: Uuid,
}

/// LeaveRequest rejection input
#[derive(Debug, Clone, InputObject)]
pub struct RejectLeaveRequestInput {
    pub request_id: Uuid,
    pub rejection_reason: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_leave_request_model_compiles() {
        let request = Model {
            id: Uuid::new_v4(),
            employee_id: Uuid::new_v4(),
            leave_type_id: Uuid::new_v4(),
            start_date: chrono::Utc::now().date_naive(),
            end_date: chrono::Utc::now().date_naive(),
            days_requested: Decimal::from(5),
            status: "pending".to_string(),
            reason: Some("Family vacation".to_string()),
            manager_id: Some(Uuid::new_v4()),
            approved_at: None,
            manager_comments: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            deleted_at: None,
        };

        assert_eq!(request.status, "pending");
        assert_eq!(request.days_requested, Decimal::from(5));
    }
}
