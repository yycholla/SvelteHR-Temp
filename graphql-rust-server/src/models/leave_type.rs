//! LeaveType domain model with GraphQL integration
//!
//! Represents different types of leave (vacation, sick, personal, etc.) with their configurations.

use async_graphql::{Context, InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use sea_orm::{entity::prelude::*, DbBackend, Statement};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::database::get_db_from_context;

/// LeaveType entity - maps to hr_public.leave_types table
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "leave_types")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub default_days_per_year: i32,
    pub requires_approval: bool,
    pub max_consecutive_days: Option<i32>,
    pub is_paid: bool,
    pub color: Option<String>, // Hex color for calendar display
    pub icon: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

/// GraphQL Object implementation for LeaveType
#[Object(name = "leave_type_Model")]
impl Model {
    /// Unique leave type identifier
    async fn id(&self) -> Uuid {
        self.id
    }

    /// Leave type name (e.g., "Vacation", "Sick Leave", "Personal")
    async fn name(&self) -> &str {
        &self.name
    }

    /// Leave type description
    async fn description(&self) -> Option<&str> {
        self.description.as_deref()
    }

    /// Default number of days allocated per year
    async fn default_days_per_year(&self) -> i32 {
        self.default_days_per_year
    }

    /// Whether this leave type requires manager approval
    async fn requires_approval(&self) -> bool {
        self.requires_approval
    }

    /// Maximum consecutive days allowed for this leave type
    async fn max_consecutive_days(&self) -> Option<i32> {
        self.max_consecutive_days
    }

    /// Whether this is paid time off
    async fn is_paid(&self) -> bool {
        self.is_paid
    }

    /// Hex color code for calendar display
    async fn color(&self) -> Option<&str> {
        self.color.as_deref()
    }

    /// Icon identifier for UI display
    async fn icon(&self) -> Option<&str> {
        self.icon.as_deref()
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

    /// Count of active leave requests for this type
    async fn active_request_count(&self, ctx: &Context<'_>) -> GqlResult<i64> {
        let db = get_db_from_context(ctx)?;

        let count = crate::models::leave_request::Entity::find()
            .filter(crate::models::leave_request::Column::LeaveType.eq(self.id))
            .filter(crate::models::leave_request::Column::Status.is_in(["pending", "approved"]))
            .filter(crate::models::leave_request::Column::DeletedAt.is_null())
            .count(&db)
            .await?;

        Ok(count as i64)
    }

    /// Total days used across all users for this leave type (current year)
    async fn total_days_used_this_year(&self, ctx: &Context<'_>) -> GqlResult<i32> {
        let db = get_db_from_context(ctx)?;

        let sql = r#"
            SELECT COALESCE(SUM(days_requested), 0)::int
            FROM hr_public.leave_requests
            WHERE leave_type_id = $1
              AND status = 'approved'
              AND EXTRACT(YEAR FROM start_date) = EXTRACT(YEAR FROM CURRENT_DATE)
              AND deleted_at IS NULL
        "#;

        let statement = sea_orm::Statement::from_sql_and_values(
            sea_orm::DbBackend::Postgres,
            sql,
            vec![self.id.into()],
        );

        let result = db
            .query_one(statement)
            .await?
            .and_then(|row| row.try_get_by_index::<i32>(0).ok())
            .unwrap_or(0);

        Ok(result)
    }
}

/// LeaveType creation input
#[derive(Debug, Clone, InputObject)]
pub struct CreateLeaveTypeInput {
    pub name: String,
    pub description: Option<String>,
    pub default_days_per_year: i32,
    pub requires_approval: bool,
    pub max_consecutive_days: Option<i32>,
    pub is_paid: bool,
    pub color: Option<String>,
    pub icon: Option<String>,
}

/// LeaveType update input
#[derive(Debug, Clone, InputObject)]
pub struct UpdateLeaveTypeInput {
    pub name: Option<String>,
    pub description: Option<String>,
    pub default_days_per_year: Option<i32>,
    pub requires_approval: Option<bool>,
    pub max_consecutive_days: Option<i32>,
    pub is_paid: Option<bool>,
    pub color: Option<String>,
    pub icon: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use super::Model as LeaveType;

    #[test]
    fn test_leave_type_model_compiles() {
        let leave_type = LeaveType {
            id: Uuid::new_v4(),
            name: "Vacation".to_string(),
            description: Some("Annual vacation leave".to_string()),
            default_days_per_year: 15,
            requires_approval: true,
            max_consecutive_days: Some(10),
            is_paid: true,
            color: Some("#4CAF50".to_string()),
            icon: Some("beach".to_string()),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            deleted_at: None,
        };

        assert_eq!(leave_type.name, "Vacation");
        assert_eq!(leave_type.default_days_per_year, 15);
        assert!(leave_type.is_paid);
    }
}
