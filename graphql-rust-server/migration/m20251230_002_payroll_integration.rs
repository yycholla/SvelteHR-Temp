//! Migration: Payroll Integration for QuickBooks
//!
//! Adds compensation fields to users table and creates payroll_sync_history table
//! for tracking compensation changes and QuickBooks payroll synchronization.
//!
//! Features:
//! - Multiple compensation types (SALARY, HOURLY, COMMISSION, CONTRACT)
//! - Pay schedules (WEEKLY, BIWEEKLY, SEMIMONTHLY, MONTHLY)
//! - QuickBooks payroll item mapping
//! - Comprehensive audit trail for compensation changes

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create compensation_type enum
        manager
            .get_connection()
            .execute_unprepared(
                "CREATE TYPE hr_public.compensation_type AS ENUM ('SALARY', 'HOURLY', 'COMMISSION', 'CONTRACT')"
            )
            .await?;

        // Create pay_schedule enum
        manager
            .get_connection()
            .execute_unprepared(
                "CREATE TYPE hr_public.pay_schedule AS ENUM ('WEEKLY', 'BIWEEKLY', 'SEMIMONTHLY', 'MONTHLY')"
            )
            .await?;

        // Add compensation fields to users table
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, Users::Table))
                    // Compensation type
                    .add_column(
                        ColumnDef::new(Users::CompensationType)
                            .custom(Alias::new("hr_public.compensation_type"))
                            .null()
                    )
                    // Annual salary for SALARY compensation type
                    .add_column(
                        ColumnDef::new(Users::AnnualSalary)
                            .decimal_len(12, 2)
                            .null()
                    )
                    // Hourly rate for HOURLY compensation type
                    .add_column(
                        ColumnDef::new(Users::HourlyRate)
                            .decimal_len(8, 2)
                            .null()
                    )
                    // Pay schedule
                    .add_column(
                        ColumnDef::new(Users::PaySchedule)
                            .custom(Alias::new("hr_public.pay_schedule"))
                            .null()
                    )
                    // QuickBooks payroll item ID
                    .add_column(
                        ColumnDef::new(Users::QuickbooksPayrollItemId)
                            .string_len(255)
                            .null()
                    )
                    // Commission rate (percentage) for COMMISSION compensation type
                    .add_column(
                        ColumnDef::new(Users::CommissionRate)
                            .decimal_len(5, 2)
                            .null()
                    )
                    // Bonus eligibility flag
                    .add_column(
                        ColumnDef::new(Users::BonusEligible)
                            .boolean()
                            .default(false)
                            .not_null()
                    )
                    .to_owned(),
            )
            .await?;

        // Create payroll_sync_history table for compensation change tracking
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, PayrollSyncHistory::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(PayrollSyncHistory::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(
                        ColumnDef::new(PayrollSyncHistory::UserId)
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(PayrollSyncHistory::SyncDirection)
                            .string_len(50)
                            .not_null()
                            .comment("Direction of sync: 'TO_QUICKBOOKS', 'FROM_QUICKBOOKS'"),
                    )
                    .col(
                        ColumnDef::new(PayrollSyncHistory::ChangeType)
                            .string_len(100)
                            .not_null()
                            .comment("Type of change: 'COMPENSATION_TYPE', 'SALARY', 'HOURLY_RATE', etc."),
                    )
                    .col(
                        ColumnDef::new(PayrollSyncHistory::OldValue)
                            .json()
                            .null()
                            .comment("Previous compensation values"),
                    )
                    .col(
                        ColumnDef::new(PayrollSyncHistory::NewValue)
                            .json()
                            .not_null()
                            .comment("New compensation values"),
                    )
                    .col(
                        ColumnDef::new(PayrollSyncHistory::QuickbooksPayrollItemId)
                            .string_len(255)
                            .null(),
                    )
                    .col(
                        ColumnDef::new(PayrollSyncHistory::SyncStatus)
                            .string_len(50)
                            .not_null()
                            .default("SUCCESS")
                            .comment("Status: 'SUCCESS', 'FAILED', 'PENDING'"),
                    )
                    .col(
                        ColumnDef::new(PayrollSyncHistory::ErrorMessage)
                            .text()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(PayrollSyncHistory::ChangedBy)
                            .uuid()
                            .null()
                            .comment("User who initiated the change"),
                    )
                    .col(
                        ColumnDef::new(PayrollSyncHistory::Metadata)
                            .json()
                            .null()
                            .comment("Additional sync metadata"),
                    )
                    .col(
                        ColumnDef::new(PayrollSyncHistory::EffectiveDate)
                            .timestamp_with_time_zone()
                            .null()
                            .comment("Date when compensation change becomes effective"),
                    )
                    .col(
                        ColumnDef::new(PayrollSyncHistory::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        // Add foreign key constraint for user_id
        manager
            .create_foreign_key(
                ForeignKey::create()
                    .name("fk_payroll_sync_history_user_id")
                    .from((Schema::HrPublic, PayrollSyncHistory::Table), PayrollSyncHistory::UserId)
                    .to((Schema::HrPublic, Users::Table), Users::Id)
                    .on_delete(ForeignKeyAction::Cascade)
                    .to_owned(),
            )
            .await?;

        // Add foreign key constraint for changed_by
        manager
            .create_foreign_key(
                ForeignKey::create()
                    .name("fk_payroll_sync_history_changed_by")
                    .from((Schema::HrPublic, PayrollSyncHistory::Table), PayrollSyncHistory::ChangedBy)
                    .to((Schema::HrPublic, Users::Table), Users::Id)
                    .on_delete(ForeignKeyAction::SetNull)
                    .to_owned(),
            )
            .await?;

        // Create index on user_id for faster queries
        manager
            .create_index(
                Index::create()
                    .name("idx_payroll_sync_history_user_id")
                    .table((Schema::HrPublic, PayrollSyncHistory::Table))
                    .col(PayrollSyncHistory::UserId)
                    .to_owned(),
            )
            .await?;

        // Create index on created_at for temporal queries
        manager
            .create_index(
                Index::create()
                    .name("idx_payroll_sync_history_created_at")
                    .table((Schema::HrPublic, PayrollSyncHistory::Table))
                    .col(PayrollSyncHistory::CreatedAt)
                    .to_owned(),
            )
            .await?;

        // Create index on sync_status for filtering failed syncs
        manager
            .create_index(
                Index::create()
                    .name("idx_payroll_sync_history_sync_status")
                    .table((Schema::HrPublic, PayrollSyncHistory::Table))
                    .col(PayrollSyncHistory::SyncStatus)
                    .to_owned(),
            )
            .await?;

        // Add check constraint for annual_salary range (0 - 10,000,000)
        manager
            .get_connection()
            .execute_unprepared(
                "ALTER TABLE hr_public.users
                ADD CONSTRAINT check_annual_salary_range
                CHECK (annual_salary IS NULL OR (annual_salary >= 0 AND annual_salary <= 10000000))"
            )
            .await?;

        // Add check constraint for hourly_rate range (0 - 1,000)
        manager
            .get_connection()
            .execute_unprepared(
                "ALTER TABLE hr_public.users
                ADD CONSTRAINT check_hourly_rate_range
                CHECK (hourly_rate IS NULL OR (hourly_rate >= 0 AND hourly_rate <= 1000))"
            )
            .await?;

        // Add check constraint for commission_rate range (0 - 100%)
        manager
            .get_connection()
            .execute_unprepared(
                "ALTER TABLE hr_public.users
                ADD CONSTRAINT check_commission_rate_range
                CHECK (commission_rate IS NULL OR (commission_rate >= 0 AND commission_rate <= 100))"
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop check constraints
        manager
            .get_connection()
            .execute_unprepared(
                "ALTER TABLE hr_public.users DROP CONSTRAINT IF EXISTS check_commission_rate_range"
            )
            .await?;

        manager
            .get_connection()
            .execute_unprepared(
                "ALTER TABLE hr_public.users DROP CONSTRAINT IF EXISTS check_hourly_rate_range"
            )
            .await?;

        manager
            .get_connection()
            .execute_unprepared(
                "ALTER TABLE hr_public.users DROP CONSTRAINT IF EXISTS check_annual_salary_range"
            )
            .await?;

        // Drop payroll_sync_history table
        manager
            .drop_table(
                Table::drop()
                    .table((Schema::HrPublic, PayrollSyncHistory::Table))
                    .if_exists()
                    .to_owned(),
            )
            .await?;

        // Drop compensation fields from users table
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, Users::Table))
                    .drop_column(Users::CompensationType)
                    .drop_column(Users::AnnualSalary)
                    .drop_column(Users::HourlyRate)
                    .drop_column(Users::PaySchedule)
                    .drop_column(Users::QuickbooksPayrollItemId)
                    .drop_column(Users::CommissionRate)
                    .drop_column(Users::BonusEligible)
                    .to_owned(),
            )
            .await?;

        // Drop enums
        manager
            .get_connection()
            .execute_unprepared("DROP TYPE IF EXISTS hr_public.pay_schedule CASCADE")
            .await?;

        manager
            .get_connection()
            .execute_unprepared("DROP TYPE IF EXISTS hr_public.compensation_type CASCADE")
            .await?;

        Ok(())
    }
}

#[derive(DeriveIden)]
enum Schema {
    #[sea_orm(iden = "hr_public")]
    HrPublic,
}

#[derive(DeriveIden)]
enum Users {
    Table,
    Id,
    CompensationType,
    AnnualSalary,
    HourlyRate,
    PaySchedule,
    QuickbooksPayrollItemId,
    CommissionRate,
    BonusEligible,
}

#[derive(DeriveIden)]
enum PayrollSyncHistory {
    Table,
    Id,
    UserId,
    SyncDirection,
    ChangeType,
    OldValue,
    NewValue,
    QuickbooksPayrollItemId,
    SyncStatus,
    ErrorMessage,
    ChangedBy,
    Metadata,
    EffectiveDate,
    CreatedAt,
}
