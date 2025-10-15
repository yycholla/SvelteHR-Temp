//! LeaveBalance domain model with GraphQL integration
//!
//! Tracks leave balance for each user and leave type combination.

use async_graphql::{Context, InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use sea_orm::{entity::prelude::*, QueryFilter};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{database::get_db_from_context, error::AppError};

/// LeaveBalance entity - maps to hr_public.time_off_balances table
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "time_off_balances")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub employee_id: Uuid,
    pub policy_id: Uuid,
    pub year: i32,
    pub balance_days: f64,
    pub used_days: f64,
    pub pending_days: i32,
    pub carried_over_days: i32,
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
    User,
}

impl ActiveModelBehavior for ActiveModel {}

/// GraphQL Object implementation for LeaveBalance
#[Object]
impl Model {
    /// Unique leave balance identifier
    async fn id(&self) -> Uuid {
        self.id
    }

    /// Employee ID (foreign key)
    async fn employee_id(&self) -> Uuid {
        self.employee_id
    }

    /// Policy ID (foreign key)
    async fn policy_id(&self) -> Uuid {
        self.policy_id
    }

    /// Calendar year for this balance
    async fn year(&self) -> i32 {
        self.year
    }

    /// Total days allocated for this policy
    async fn total_days(&self) -> f64 {
        self.balance_days
    }

    /// Days already used
    async fn used_days(&self) -> f64 {
        self.used_days
    }

    /// Days pending approval
    async fn pending_days(&self) -> i32 {
        self.pending_days
    }

    /// Days carried over from previous year
    async fn carried_over_days(&self) -> i32 {
        self.carried_over_days
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

    /// Available days remaining (total - used - pending)
    async fn available_days(&self) -> f64 {
        self.balance_days - self.used_days - self.pending_days as f64
    }

    /// User who owns this balance
    async fn user(&self, ctx: &Context<'_>) -> GqlResult<Option<super::user::Model>> {
        let db = get_db_from_context(ctx)?;

        let user = super::user::Entity::find_by_id(self.employee_id)
            .one(db)
            .await?;

        Ok(user)
    }

    /// Leave type for this balance
    async fn leave_type(&self, ctx: &Context<'_>) -> GqlResult<Option<super::leave_type::Model>> {
        let db = get_db_from_context(ctx)?;

        let leave_type = super::leave_type::Entity::find_by_id(self.policy_id)
            .filter(super::leave_type::Column::DeletedAt.is_null())
            .one(db)
            .await?;

        Ok(leave_type)
    }

    /// Percentage of balance used (0-100)
    async fn usage_percentage(&self) -> i32 {
        if self.balance_days == 0.0 {
            0
        } else {
            ((self.used_days / self.balance_days) * 100.0) as i32
        }
    }
}

/// LeaveBalance creation input
#[derive(Debug, Clone, InputObject)]
pub struct CreateLeaveBalanceInput {
    pub employee_id: Uuid,
    pub policy_id: Uuid,
    pub year: i32,
    pub balance_days: f64,
}

/// LeaveBalance update input
#[derive(Debug, Clone, InputObject)]
pub struct UpdateLeaveBalanceInput {
    pub balance_days: Option<f64>,
    pub used_days: Option<f64>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_leave_balance_model_compiles() {
        let balance = LeaveBalance {
            id: Uuid::new_v4(),
            employee_id: Uuid::new_v4(),
            policy_id: Uuid::new_v4(),
            year: 2025,
            balance_days: 15.0,
            used_days: 5.0,
            pending_days: 2,
            carried_over_days: 3,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            deleted_at: None,
        };

        assert_eq!(balance.year, 2025);
        assert_eq!(balance.balance_days, 15.0);
    }
}
