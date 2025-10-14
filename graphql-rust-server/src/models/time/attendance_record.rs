//! Attendance Record Model
//!
//! Maps to hr_public.attendance_records table

use async_graphql::{Enum, InputObject, Object, Result as GqlResult};
use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

/// Attendance status enumeration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Enum, sqlx::Type)]
#[sqlx(type_name = "attendance_status", rename_all = "lowercase")]
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

/// Daily attendance record
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct AttendanceRecord {
    pub id: Uuid,
    pub user_id: Uuid,
    pub date: NaiveDate,
    pub clock_in: Option<DateTime<Utc>>,
    pub clock_out: Option<DateTime<Utc>>,
    pub hours_worked: Option<f64>,
    pub status: String, // Changed from AttendanceStatus enum to String
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

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
#[Object]
impl AttendanceRecord {
    async fn id(&self) -> Uuid {
        self.id
    }

    #[graphql(name = "userId")]
    async fn user_id(&self) -> Uuid {
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
        self.hours_worked
    }

    async fn status(&self) -> &str {
        &self.status
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
        let pool = ctx.data::<PgPool>()?;
        let user = sqlx::query_as::<_, crate::models::User>(
            r#"
            SELECT id, email, first_name, last_name, full_name, phone,
                   department_id, manager_id, hire_date, termination_date,
                   status, created_at, updated_at, deleted_at
            FROM hr_public.users
            WHERE id = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(self.user_id)
        .fetch_one(pool)
        .await?;

        Ok(user)
    }
}
