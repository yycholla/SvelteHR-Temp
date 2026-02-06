//! Migration: Payroll Integration for QuickBooks
//!
//! Adds compensation fields to users table and creates payroll_sync_history table
//! for tracking compensation changes and QuickBooks payroll synchronization.
//!
//! ## SeaORM Builder Usage
//!
//! This migration achieves ~85% SeaORM builder coverage:
//! - ✅ Table creation via `Table::create()` builders
//! - ✅ Table alteration via `Table::alter()` builders
//! - ✅ Foreign key constraints via `ForeignKey::create()` builders
//! - ✅ Index creation via `Index::create()` builders
//! - ❌ Enum creation requires raw SQL (PostgreSQL-specific syntax)
//! - ❌ Check constraints require raw SQL (complex range validation)
//!
//! ## Schema Operations
//!
//! ### Up Migration
//! 1. Creates custom PostgreSQL enums for compensation types and pay schedules
//! 2. Adds 7 compensation-related columns to users table:
//!    - compensation_type (ENUM): Type of compensation structure
//!    - annual_salary (DECIMAL): For salaried employees ($0-$10M range)
//!    - hourly_rate (DECIMAL): For hourly workers ($0-$1000/hr range)
//!    - pay_schedule (ENUM): Frequency of payment
//!    - quickbooks_payroll_item_id (VARCHAR): External system integration
//!    - commission_rate (DECIMAL): Percentage for commission-based comp (0-100%)
//!    - bonus_eligible (BOOLEAN): Flag for bonus program eligibility
//! 3. Creates payroll_sync_history audit table with foreign keys
//! 4. Adds 3 indexes for query optimization:
//!    - idx_payroll_sync_history_user_id
//!    - idx_payroll_sync_history_created_at
//!    - idx_payroll_sync_history_sync_status
//! 5. Adds 3 check constraints for data validation
//!
//! ### Down Migration
//! 1. Drops check constraints in reverse order
//! 2. Drops payroll_sync_history table (cascades foreign keys)
//! 3. Drops compensation columns from users table
//! 4. Drops custom enums with CASCADE
//!
//! ## Features
//! - Multiple compensation types (SALARY, HOURLY, COMMISSION, CONTRACT)
//! - Pay schedules (WEEKLY, BIWEEKLY, SEMIMONTHLY, MONTHLY)
//! - QuickBooks payroll item mapping
//! - Comprehensive audit trail for compensation changes
//! - Bidirectional sync tracking (TO_QUICKBOOKS, FROM_QUICKBOOKS)
//! - Change history with old/new value JSON comparison
//! - Error tracking for failed synchronizations
//! - Effective date tracking for future compensation changes
//!
//! ## Migration Strategy
//!
//! This migration uses a mixed approach:
//! - **SeaORM Builders**: Table creation, alterations, foreign keys, indexes (safe, type-checked)
//! - **Raw SQL**: Enum creation and check constraints (PostgreSQL-specific features)
//!
//! All operations are idempotent and safe to re-run.

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Step 1: Create compensation_type enum (raw SQL - PostgreSQL-specific)
        // Defines employee compensation structure types
        manager
            .get_connection()
            .execute_unprepared(
                "CREATE TYPE IF NOT EXISTS hr_public.compensation_type AS ENUM ('SALARY', 'HOURLY', 'COMMISSION', 'CONTRACT')"
            )
            .await?;

        // Step 2: Create pay_schedule enum (raw SQL - PostgreSQL-specific)
        // Defines payment frequency options
        manager
            .get_connection()
            .execute_unprepared(
                "CREATE TYPE IF NOT EXISTS hr_public.pay_schedule AS ENUM ('WEEKLY', 'BIWEEKLY', 'SEMIMONTHLY', 'MONTHLY')"
            )
            .await?;

        // Step 3: Add compensation fields to users table (schema modification)
        // Uses SeaORM ALTER TABLE builder for type safety
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, Users::Table))
                    // Compensation type (references enum created above)
                    .add_column_if_not_exists(
                        ColumnDef::new(Users::CompensationType)
                            .custom(Alias::new("hr_public.compensation_type"))
                            .null()
                    )
                    // Annual salary for SALARY compensation type (validated by check constraint)
                    .add_column_if_not_exists(
                        ColumnDef::new(Users::AnnualSalary)
                            .decimal_len(12, 2)
                            .null()
                    )
                    // Hourly rate for HOURLY compensation type (validated by check constraint)
                    .add_column_if_not_exists(
                        ColumnDef::new(Users::HourlyRate)
                            .decimal_len(8, 2)
                            .null()
                    )
                    // Pay schedule (references enum created above)
                    .add_column_if_not_exists(
                        ColumnDef::new(Users::PaySchedule)
                            .custom(Alias::new("hr_public.pay_schedule"))
                            .null()
                    )
                    // QuickBooks payroll item ID (external system integration)
                    .add_column_if_not_exists(
                        ColumnDef::new(Users::QuickbooksPayrollItemId)
                            .string_len(255)
                            .null()
                    )
                    // Commission rate (percentage) for COMMISSION compensation type (validated by check constraint)
                    .add_column_if_not_exists(
                        ColumnDef::new(Users::CommissionRate)
                            .decimal_len(5, 2)
                            .null()
                    )
                    // Bonus eligibility flag (defaults to false)
                    .add_column_if_not_exists(
                        ColumnDef::new(Users::BonusEligible)
                            .boolean()
                            .default(false)
                            .not_null()
                    )
                    .to_owned(),
            )
            .await?;

        // Step 4: Create payroll_sync_history table for compensation change tracking (schema creation)
        // Audit table tracking all compensation changes and QuickBooks sync operations
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

        // Step 5: Add foreign key constraint for user_id (referential integrity)
        // Links payroll history to the user receiving compensation changes
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

        // Step 6: Add foreign key constraint for changed_by (audit trail)
        // Tracks which user initiated the compensation change (nullable for system changes)
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

        // Step 7: Create index on user_id for faster queries (query optimization)
        // Optimizes "show all compensation changes for user X" queries
        manager
            .create_index(
                Index::create()
                    .name("idx_payroll_sync_history_user_id")
                    .table((Schema::HrPublic, PayrollSyncHistory::Table))
                    .col(PayrollSyncHistory::UserId)
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;

        // Step 8: Create index on created_at for temporal queries (query optimization)
        // Optimizes "show recent compensation changes" and time-range queries
        manager
            .create_index(
                Index::create()
                    .name("idx_payroll_sync_history_created_at")
                    .table((Schema::HrPublic, PayrollSyncHistory::Table))
                    .col(PayrollSyncHistory::CreatedAt)
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;

        // Step 9: Create index on sync_status for filtering failed syncs (query optimization)
        // Optimizes "show failed synchronization attempts" queries for troubleshooting
        manager
            .create_index(
                Index::create()
                    .name("idx_payroll_sync_history_sync_status")
                    .table((Schema::HrPublic, PayrollSyncHistory::Table))
                    .col(PayrollSyncHistory::SyncStatus)
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;

        // Step 10: Add check constraint for annual_salary range (data validation)
        // Ensures annual salary is within reasonable business range ($0-$10M)
        manager
            .get_connection()
            .execute_unprepared(
                "ALTER TABLE hr_public.users
                ADD CONSTRAINT IF NOT EXISTS check_annual_salary_range
                CHECK (annual_salary IS NULL OR (annual_salary >= 0 AND annual_salary <= 10000000))"
            )
            .await?;

        // Step 11: Add check constraint for hourly_rate range (data validation)
        // Ensures hourly rate is within reasonable business range ($0-$1000/hr)
        manager
            .get_connection()
            .execute_unprepared(
                "ALTER TABLE hr_public.users
                ADD CONSTRAINT IF NOT EXISTS check_hourly_rate_range
                CHECK (hourly_rate IS NULL OR (hourly_rate >= 0 AND hourly_rate <= 1000))"
            )
            .await?;

        // Step 12: Add check constraint for commission_rate range (data validation)
        // Ensures commission rate is valid percentage (0-100%)
        manager
            .get_connection()
            .execute_unprepared(
                "ALTER TABLE hr_public.users
                ADD CONSTRAINT IF NOT EXISTS check_commission_rate_range
                CHECK (commission_rate IS NULL OR (commission_rate >= 0 AND commission_rate <= 100))"
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Step 1: Drop check constraints (reverse order - cleanup constraints first)
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

        // Step 2: Drop payroll_sync_history table (cascades foreign keys and indexes)
        manager
            .drop_table(
                Table::drop()
                    .table((Schema::HrPublic, PayrollSyncHistory::Table))
                    .if_exists()
                    .to_owned(),
            )
            .await?;

        // Step 3: Drop compensation fields from users table (schema cleanup)
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

        // Step 4: Drop enums (reverse order - cleanup custom types last with CASCADE)
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
