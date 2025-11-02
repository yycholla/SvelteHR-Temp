//! LeaveBalance domain model with GraphQL integration
//!
//! Tracks leave balance for each user and leave type combination.

use async_graphql::{Context, InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use sea_orm::{entity::prelude::*, QueryFilter};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::database::get_db_from_context;

/// LeaveBalance entity - maps to hr_public.leave_balances table
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "leave_balances", schema_name = "hr_public")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub employee_id: Uuid,
    pub leave_type_id: Uuid,
    pub year: i32,
    pub total_days: rust_decimal::Decimal,
    pub used_days: rust_decimal::Decimal,
    pub remaining_days: rust_decimal::Decimal,
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
#[Object(name = "leave_balance_Model")]
impl Model {
    /// Unique leave balance identifier
    async fn id(&self) -> Uuid {
        self.id
    }

    /// Employee ID (foreign key)
    async fn employee_id(&self) -> Uuid {
        self.employee_id
    }

    /// Leave Type ID (foreign key)
    async fn leave_type_id(&self) -> Uuid {
        self.leave_type_id
    }

    /// Calendar year for this balance
    async fn year(&self) -> i32 {
        self.year
    }

    /// Total days allocated for this leave type
    async fn total_days(&self) -> String {
        self.total_days.to_string()
    }

    /// Days already used
    async fn used_days(&self) -> String {
        self.used_days.to_string()
    }

    /// Days remaining
    async fn remaining_days(&self) -> String {
        self.remaining_days.to_string()
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


    /// User who owns this balance
    async fn user(&self, ctx: &Context<'_>) -> GqlResult<Option<super::user::Model>> {
        let db = get_db_from_context(ctx)?;

        let user = super::user::Entity::find_by_id(self.employee_id)
            .one(&db)
            .await?;

        Ok(user)
    }

    /// Leave type for this balance
    async fn leave_type(&self, ctx: &Context<'_>) -> GqlResult<Option<super::leave_type::Model>> {
        let db = get_db_from_context(ctx)?;

        let leave_type = super::leave_type::Entity::find_by_id(self.leave_type_id)
            .filter(super::leave_type::Column::DeletedAt.is_null())
            .one(&db)
            .await?;

        Ok(leave_type)
    }
}

/// LeaveBalance creation input
#[derive(Debug, Clone, InputObject)]
pub struct CreateLeaveBalanceInput {
    pub employee_id: Uuid,
    pub leave_type_id: Uuid,
    pub year: i32,
    pub total_days: String,
}

/// LeaveBalance update input
#[derive(Debug, Clone, InputObject)]
pub struct UpdateLeaveBalanceInput {
    pub total_days: Option<String>,
    pub used_days: Option<String>,
    pub remaining_days: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use super::Model as LeaveBalance;

    #[test]
    fn test_leave_balance_model_compiles() {
        let balance = LeaveBalance {
            id: Uuid::new_v4(),
            employee_id: Uuid::new_v4(),
            leave_type_id: Uuid::new_v4(),
            year: 2025,
            total_days: rust_decimal::Decimal::new(15, 0),
            used_days: rust_decimal::Decimal::new(5, 0),
            remaining_days: rust_decimal::Decimal::new(10, 0),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            deleted_at: None,
        };

        assert_eq!(balance.year, 2025);
        assert_eq!(balance.total_days, rust_decimal::Decimal::new(15, 0));
    }
}
