//! Time and Attendance tracking mutations
//!
//! Handles employee clock in/out, attendance records, and time-off policies

use async_graphql::{Context, Object, Result};
use chrono::Utc;
use sea_orm::{ActiveModelTrait, EntityTrait, Set};
use uuid::Uuid;

use crate::{
    database::get_db_from_context,
    error::AppError,
    models::{
        AttendanceRecord, CreateAttendanceRecordInput, UpdateAttendanceRecordInput,
    },
};

/// Time and attendance management operations
pub struct TimeMutations;

#[Object]
impl TimeMutations {
    /// Create a new attendance record
    async fn create_attendance_record(
        &self,
        ctx: &Context<'_>,
        input: CreateAttendanceRecordInput,
    ) -> Result<AttendanceRecord> {
        let db = get_db_from_context(ctx)?;

        let record = crate::models::time::attendance_record::ActiveModel {
            user_id: Set(input.user_id),
            date: Set(input.date),
            clock_in: Set(input.clock_in),
            clock_out: Set(input.clock_out),
            hours_worked: Set(input.hours_worked.and_then(rust_decimal::Decimal::from_f64_retain)),
            status: Set(input.status.as_str().to_string()),
            notes: Set(input.notes.clone()),
            ..Default::default()
        };

        let record = record.insert(&db).await?;
        Ok(record)
    }

    /// Update an existing attendance record
    async fn update_attendance_record(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateAttendanceRecordInput,
    ) -> Result<AttendanceRecord> {
        let db = get_db_from_context(ctx)?;

        // Find existing attendance record
        let existing_record = crate::models::time::attendance_record::Entity::find_by_id(id)
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Attendance record not found".to_string()))?;

        // Build active model with updates
        let mut record: crate::models::time::attendance_record::ActiveModel = existing_record.into();

        if let Some(clock_in) = input.clock_in {
            record.clock_in = Set(Some(clock_in));
        }

        if let Some(clock_out) = input.clock_out {
            record.clock_out = Set(Some(clock_out));
        }

        if let Some(hours_worked) = input.hours_worked {
            record.hours_worked = Set(rust_decimal::Decimal::from_f64_retain(hours_worked));
        }

        if let Some(status) = input.status {
            record.status = Set(status.as_str().to_string());
        }

        if let Some(notes) = input.notes {
            record.notes = Set(Some(notes));
        }

        // Update timestamp
        record.updated_at = Set(Utc::now());

        // Save changes
        let updated_record = record.update(&db).await?;
        Ok(updated_record)
    }

    /// Delete an attendance record (hard delete)
    async fn delete_attendance_record(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;

        let result = crate::models::time::attendance_record::Entity::delete_by_id(id)
            .exec(&db)
            .await?;

        Ok(result.rows_affected > 0)
    }

    // TODO: Implement time-off policy mutations when SeaORM entities are available
    // /// Create a new time-off policy
    // async fn create_time_off_policy(
    //     &self,
    //     ctx: &Context<'_>,
    //     input: CreateTimeOffPolicyInput,
    // ) -> Result<TimeOffPolicy> {
    //     let db = get_db_from_context(ctx)?;
    //
    //     let policy = crate::models::time_off_policy::ActiveModel {
    //         policy_name: Set(input.policy_name.clone()),
    //         leave_type: Set(input.leave_type.clone()),
    //         accrual_rate: Set(input.accrual_rate),
    //         max_balance: Set(input.max_balance),
    //         carryover_limit: Set(input.carryover_limit),
    //         effective_date: Set(input.effective_date),
    //         ..Default::default()
    //     };
    //
    //     let policy = policy.insert(&db).await?;
    //
    //     // Convert SeaORM model to legacy TimeOffPolicy struct for compatibility
    //     let policy = TimeOffPolicy {
    //         id: policy.id,
    //         policy_name: policy.policy_name,
    //         leave_type: policy.leave_type,
    //         accrual_rate: policy.accrual_rate,
    //         max_balance: policy.max_balance,
    //         carryover_limit: policy.carryover_limit,
    //         effective_date: policy.effective_date,
    //         created_at: policy.created_at,
    //         updated_at: policy.updated_at,
    //     };
    //
    //     Ok(policy)
    // }

    // /// Update an existing time-off policy
    // async fn update_time_off_policy(
    //     &self,
    //     ctx: &Context<'_>,
    //     id: Uuid,
    //     input: UpdateTimeOffPolicyInput,
    // ) -> Result<TimeOffPolicy> {
    //     let db = get_db_from_context(ctx)?;
    //
    //     // Find existing time-off policy
    //     let existing_policy = crate::models::time_off_policy::Entity::find_by_id(id)
    //         .one(&db)
    //         .await?
    //         .ok_or_else(|| AppError::NotFound("Time-off policy not found".to_string()))?;
    //
    //     // Build active model with updates
    //     let mut policy: crate::models::time_off_policy::ActiveModel = existing_policy.into();
    //
    //     if let Some(policy_name) = input.policy_name {
    //         policy.policy_name = Set(policy_name);
    //     }
    //
    //     if let Some(leave_type) = input.leave_type {
    //         policy.leave_type = Set(leave_type);
    //     }
    //
    //     if let Some(accrual_rate) = input.accrual_rate {
    //         policy.accrual_rate = Set(accrual_rate);
    //     }
    //
    //     if let Some(max_balance) = input.max_balance {
    //         policy.max_balance = Set(max_balance);
    //     }
    //
    //     if let Some(carryover_limit) = input.carryover_limit {
    //         policy.carryover_limit = Set(carryover_limit);
    //     }
    //
    //     if let Some(effective_date) = input.effective_date {
    //         policy.effective_date = Set(effective_date);
    //     }
    //
    //     // Update timestamp
    //     policy.updated_at = Set(Utc::now());
    //
    //     // Save changes
    //     let updated_policy = policy.update(&db).await?;
    //
    //     // Convert to legacy TimeOffPolicy struct for compatibility
    //     let policy = TimeOffPolicy {
    //         id: updated_policy.id,
    //         policy_name: updated_policy.policy_name,
    //         leave_type: updated_policy.leave_type,
    //         accrual_rate: updated_policy.accrual_rate,
    //         max_balance: updated_policy.max_balance,
    //         carryover_limit: updated_policy.carryover_limit,
    //         effective_date: updated_policy.effective_date,
    //         created_at: updated_policy.created_at,
    //         updated_at: updated_policy.updated_at,
    //     };
    //
    //     Ok(policy)
    // }

    // /// Delete a time-off policy (hard delete)
    // async fn delete_time_off_policy(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
    //     let db = get_db_from_context(ctx)?;
    //
    //     let result = crate::models::time_off_policy::Entity::delete_by_id(id)
    //         .exec(db)
    //         .await?;
    //
    //     Ok(result.rows_affected > 0)
    // }
}
