//! LeaveBalance domain model with GraphQL integration
//!
//! Tracks leave balance for each user and leave type combination.

use async_graphql::{Context, InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

/// LeaveBalance model - maps to hr_public.time_off_balances table
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct LeaveBalance {
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

/// GraphQL Object implementation for LeaveBalance
#[Object]
impl LeaveBalance {
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
    async fn user(&self, ctx: &Context<'_>) -> GqlResult<Option<super::user::User>> {
        let pool = ctx.data::<PgPool>()?;

        let user = sqlx::query_as::<_, super::user::User>(
            r#"
            SELECT id, email, first_name, last_name, display_name, full_name, role,
                   phone_number, alternate_phone, job_title, status,
                   department_id, manager_id, hire_date, is_active,
                   created_at, updated_at
            FROM hr_public.users
            WHERE id = $1
            "#,
        )
        .bind(self.employee_id)
        .fetch_optional(pool)
        .await?;

        Ok(user)
    }

    /// Leave type for this balance
    async fn leave_type(&self, ctx: &Context<'_>) -> GqlResult<Option<super::leave_type::LeaveType>> {
        let pool = ctx.data::<PgPool>()?;

        let leave_type = sqlx::query_as::<_, super::leave_type::LeaveType>(
            r#"
            SELECT id, name, description, default_days_per_year,
                   requires_approval, max_consecutive_days, is_paid,
                   color, icon, created_at, updated_at, deleted_at
            FROM hr_public.leave_types
            WHERE id = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(self.policy_id)
        .fetch_optional(pool)
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
