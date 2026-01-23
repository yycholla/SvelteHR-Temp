//! Migration: Clean Invalid Hire Dates
//!
//! Data quality migration to clean up invalid hire dates in the users table.
//!
//! **Context**: The fake crate intentionally generates varied data to test validation logic.
//! The seed data builder had a bug where `rand::random::<i64>() % 1095` could produce negative
//! values, resulting in future hire dates when subtracted from current time.
//!
//! Invalid data found:
//! - Future hire dates: hire_date > NOW()
//!
//! Valid constraint (domain rule): Hire date must be in the past or today
//!
//! Strategy: Set invalid hire_date values to NULL
//! - Preserves user records
//! - Flags bad data for manual review
//! - Maintains data integrity
//!
//! **Note**: The adapter layer now validates hire dates at the boundary,
//! so new invalid data will be flagged and rejected automatically.

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Clean hire_date column - set future dates to NULL
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                UPDATE hr_public.users
                SET hire_date = NULL
                WHERE hire_date IS NOT NULL
                  AND hire_date > NOW();
                "#,
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // This is a data cleanup migration - cannot reverse
        // Original invalid data is lost (intentionally)
        // Log warning that this migration cannot be reversed
        tracing::warn!(
            "Migration m20260120_002_clean_invalid_hire_dates cannot be reversed - \
             original invalid hire date data has been cleaned"
        );

        Ok(())
    }
}
