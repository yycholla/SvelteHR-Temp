//! Attendance Record Model
//!
//! Maps to hr_public.attendance_records table

use async_graphql::{Enum, InputObject, Object, Result as GqlResult};
use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use rust_decimal::prelude::ToPrimitive;
use sea_orm::{entity::prelude::*, QueryFilter};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{database::get_db_from_context, error::AppError};

/// Attendance status enumeration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum)]
pub enum AttendanceStatus {
    #[graphql(name = "PRESENT")]
    Present,
    #[graphql(name = "ABSENT")]
    Absent,
    #[graphql(name = "LATE")]
    Late,
    #[graphql(name = "HALF_DAY")]
    HalfDay,
}

impl AttendanceStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            AttendanceStatus::Present => "present",
            AttendanceStatus::Absent => "absent",
            AttendanceStatus::Late => "late",
            AttendanceStatus::HalfDay => "half_day",
        }
    }
}

/// Daily attendance record
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "attendance_records", schema_name = "hr_public")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    #[sea_orm(column_name = "employee_id")]
    pub user_id: Uuid,
    pub date: NaiveDate,
    #[sea_orm(column_name = "check_in")]
    pub clock_in: Option<DateTime<Utc>>,
    #[sea_orm(column_name = "check_out")]
    pub clock_out: Option<DateTime<Utc>>,
    pub hours_worked: Option<Decimal>,
    pub status: String, // Will be converted to enum in GraphQL
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "crate::models::user::Entity",
        from = "Column::UserId",
        to = "crate::models::user::Column::Id"
    )]
    User,
}

impl ActiveModelBehavior for ActiveModel {}

/// Input for creating a new attendance record
#[derive(Debug, Clone, InputObject)]
pub struct CreateAttendanceRecordInput {
    #[graphql(name = "userId")]
    pub user_id: Uuid,
    pub date: NaiveDate,
    #[graphql(name = "clockIn")]
    pub clock_in: Option<DateTime<Utc>>,
    #[graphql(name = "clockOut")]
    pub clock_out: Option<DateTime<Utc>>,
    #[graphql(name = "hoursWorked")]
    pub hours_worked: Option<f64>,
    pub status: String,
    pub notes: Option<String>,
}

/// Input for updating an attendance record
#[derive(Debug, Clone, InputObject)]
pub struct UpdateAttendanceRecordInput {
    #[graphql(name = "clockIn")]
    pub clock_in: Option<DateTime<Utc>>,
    #[graphql(name = "clockOut")]
    pub clock_out: Option<DateTime<Utc>>,
    #[graphql(name = "hoursWorked")]
    pub hours_worked: Option<f64>,
    pub status: Option<String>,
    pub notes: Option<String>,
}

/// GraphQL Object implementation with camelCase field names
#[Object(name = "time_attendance_record_Model")]
impl Model {
    async fn id(&self) -> Uuid {
        self.id
    }

    #[graphql(name = "userId")]
    async fn user_id(&self) -> Uuid {
        self.user_id
    }

    /// Employee ID (alias for userId for frontend compatibility)
    #[graphql(name = "employeeId")]
    async fn employee_id(&self) -> Uuid {
        self.user_id
    }

    async fn date(&self) -> NaiveDate {
        self.date
    }

    #[graphql(name = "clockIn")]
    async fn clock_in(&self) -> Option<DateTime<Utc>> {
        self.clock_in
    }

    #[graphql(name = "clockOut")]
    async fn clock_out(&self) -> Option<DateTime<Utc>> {
        self.clock_out
    }

    #[graphql(name = "hoursWorked")]
    async fn hours_worked(&self) -> Option<f64> {
        self.hours_worked.and_then(|d| d.to_f64())
    }

    async fn status(&self) -> AttendanceStatus {
        match self.status.as_str() {
            "present" => AttendanceStatus::Present,
            "absent" => AttendanceStatus::Absent,
            "late" => AttendanceStatus::Late,
            "half_day" => AttendanceStatus::HalfDay,
            _ => AttendanceStatus::Present, // Default fallback
        }
    }

    async fn notes(&self) -> Option<&str> {
        self.notes.as_deref()
    }

    #[graphql(name = "createdAt")]
    async fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }

    #[graphql(name = "updatedAt")]
    async fn updated_at(&self) -> DateTime<Utc> {
        self.updated_at
    }

    /// User/Employee relationship (lazy-loaded)
    async fn user(&self, ctx: &async_graphql::Context<'_>) -> GqlResult<crate::models::User> {
        let db = get_db_from_context(ctx)?;
        let user = crate::models::user::Entity::find_by_id(self.user_id)
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

        Ok(user)
    }
}
