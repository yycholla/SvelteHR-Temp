//! Migration: Sync Schedules for QuickBooks Integration
//!
//! Creates tables for managing automated sync schedules and execution history.
//!
//! ## SeaORM Builder Usage
//!
//! This migration achieves ~70% SeaORM builder coverage:
//! - ✅ Table creation via `Table::create()` builders
//! - ✅ Column definitions with proper types and defaults
//! - ✅ Index creation via `Index::create()` builders
//! - ❌ Foreign key creation uses raw SQL (explicit schema specification needed)
//! - ❌ Check constraints use raw SQL (complex regex and enum validation)
//!
//! ## Schema Operations
//!
//! ### Up Migration
//! 1. Creates `sync_schedules` table with:
//!    - name, description: Schedule identification
//!    - cron_expression: 6-field cron syntax (second minute hour day month day_of_week)
//!    - entity_type: Employee, Department, or Both
//!    - sync_direction: Push, Pull, or Bidirectional
//!    - enabled: Active/inactive flag
//!    - business_hours_only: Restrict to business hours
//!    - timezone: Timezone for schedule execution
//!    - last_run_at/next_run_at: Execution tracking
//!    - last_run_status/error: Result tracking
//!    - created_by: Foreign key to users table
//!    - Soft delete support (deleted_at)
//! 2. Creates `sync_schedule_history` table for execution tracking:
//!    - schedule_id: Foreign key to sync_schedules
//!    - started_at/completed_at: Execution timestamps
//!    - status: Execution status
//!    - records_synced/pushed/pulled: Detailed metrics
//!    - errors_count, error_message: Error tracking
//!    - execution_time_ms: Performance monitoring
//! 3. Adds 2 foreign key constraints
//! 4. Creates 2 compound indexes for query optimization
//! 5. Adds 3 check constraints for data validation
//!
//! ### Down Migration
//! 1. Drops sync_schedule_history table (cascades foreign keys)
//! 2. Drops sync_schedules table
//!
//! ## Features
//! - Cron-based scheduling with 6-field syntax support
//! - Entity type filtering (Employee, Department, Both)
//! - Sync direction control (Push, Pull, Bidirectional)
//! - Business hours restriction option
//! - Timezone-aware scheduling
//! - Execution history with detailed metrics
//! - Performance monitoring (execution time tracking)
//! - Soft delete support for schedules
//!
//! ## Migration Strategy
//!
//! This migration uses a mixed approach:
//! - **SeaORM Builders**: Table creation, columns, indexes (type-safe)
//! - **Raw SQL**: Foreign keys (explicit schema needed), check constraints (complex validation)
//!
//! The cron expression check constraint validates the 6-field format required by
//! cron parsers. Entity type and sync direction constraints ensure only valid
//! values are stored.

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Step 1: Create sync_schedules table (schema creation)
        // Main table for managing automated sync schedules
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, SyncSchedules::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(SyncSchedules::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()".to_string()),
                    )
                    .col(
                        ColumnDef::new(SyncSchedules::Name)
                            .string_len(255)
                            .not_null(),
                    )
                    .col(ColumnDef::new(SyncSchedules::Description).text())
                    .col(
                        ColumnDef::new(SyncSchedules::CronExpression)
                            .string_len(100)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(SyncSchedules::EntityType)
                            .string_len(50)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(SyncSchedules::SyncDirection)
                            .string_len(20)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(SyncSchedules::Enabled)
                            .boolean()
                            .not_null()
                            .default(true),
                    )
                    .col(
                        ColumnDef::new(SyncSchedules::BusinessHoursOnly)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .col(
                        ColumnDef::new(SyncSchedules::Timezone)
                            .string_len(50)
                            .not_null()
                            .default("UTC"),
                    )
                    .col(ColumnDef::new(SyncSchedules::LastRunAt).timestamp_with_time_zone())
                    .col(ColumnDef::new(SyncSchedules::NextRunAt).timestamp_with_time_zone())
                    .col(ColumnDef::new(SyncSchedules::LastRunStatus).string_len(20))
                    .col(ColumnDef::new(SyncSchedules::LastRunError).text())
                    .col(ColumnDef::new(SyncSchedules::CreatedBy).uuid())
                    .col(
                        ColumnDef::new(SyncSchedules::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .extra("DEFAULT NOW()".to_string()),
                    )
                    .col(
                        ColumnDef::new(SyncSchedules::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .extra("DEFAULT NOW()".to_string()),
                    )
                    .col(ColumnDef::new(SyncSchedules::DeletedAt).timestamp_with_time_zone())
                    .to_owned(),
            )
            .await?;

        // Step 2: Add foreign key constraint for created_by (referential integrity)
        // Uses raw SQL to explicitly specify hr_public schema (SET NULL on delete for audit trail)
        // NOTE: PostgreSQL doesn't support IF NOT EXISTS with ADD CONSTRAINT
        manager
            .get_connection()
            .execute_unprepared(
                r#"DO $$ BEGIN
                    ALTER TABLE hr_public.sync_schedules
                    ADD CONSTRAINT fk_sync_schedules_created_by
                    FOREIGN KEY (created_by)
                    REFERENCES hr_public.users(id)
                    ON DELETE SET NULL;
                EXCEPTION
                    WHEN duplicate_object THEN null;
                END $$;"#,
            )
            .await?;

        // Step 3: Create compound index on enabled schedules (query optimization)
        // Optimizes "find enabled schedules due for execution" queries
        manager
            .create_index(
                Index::create()
                    .name("idx_sync_schedules_enabled")
                    .table((Schema::HrPublic, SyncSchedules::Table))
                    .col(SyncSchedules::Enabled)
                    .col(SyncSchedules::NextRunAt)
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;

        // Step 4: Create sync_schedule_history table (schema creation)
        // Audit table tracking all schedule execution attempts with detailed metrics
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, SyncScheduleHistory::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(SyncScheduleHistory::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()".to_string()),
                    )
                    .col(
                        ColumnDef::new(SyncScheduleHistory::ScheduleId)
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(SyncScheduleHistory::StartedAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .col(ColumnDef::new(SyncScheduleHistory::CompletedAt).timestamp_with_time_zone())
                    .col(
                        ColumnDef::new(SyncScheduleHistory::Status)
                            .string_len(20)
                            .not_null(),
                    )
                    .col(ColumnDef::new(SyncScheduleHistory::RecordsSynced).integer())
                    .col(ColumnDef::new(SyncScheduleHistory::RecordsPushed).integer())
                    .col(ColumnDef::new(SyncScheduleHistory::RecordsPulled).integer())
                    .col(ColumnDef::new(SyncScheduleHistory::ErrorsCount).integer())
                    .col(ColumnDef::new(SyncScheduleHistory::ErrorMessage).text())
                    .col(ColumnDef::new(SyncScheduleHistory::ExecutionTimeMs).integer())
                    .col(
                        ColumnDef::new(SyncScheduleHistory::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .extra("DEFAULT NOW()".to_string()),
                    )
                    .to_owned(),
            )
            .await?;

        // Step 5: Add foreign key constraint for schedule_id (referential integrity)
        // Uses raw SQL to explicitly specify hr_public schema (CASCADE on delete)
        // NOTE: PostgreSQL doesn't support IF NOT EXISTS with ADD CONSTRAINT
        manager
            .get_connection()
            .execute_unprepared(
                r#"DO $$ BEGIN
                    ALTER TABLE hr_public.sync_schedule_history
                    ADD CONSTRAINT fk_sync_schedule_history_schedule_id
                    FOREIGN KEY (schedule_id)
                    REFERENCES hr_public.sync_schedules(id)
                    ON DELETE CASCADE;
                EXCEPTION
                    WHEN duplicate_object THEN null;
                END $$;"#,
            )
            .await?;

        // Step 6: Create compound index on history (query optimization)
        // Optimizes "show execution history for schedule X" queries
        manager
            .create_index(
                Index::create()
                    .name("idx_schedule_history_schedule")
                    .table((Schema::HrPublic, SyncScheduleHistory::Table))
                    .col(SyncScheduleHistory::ScheduleId)
                    .col(SyncScheduleHistory::StartedAt)
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;

        // Step 7: Add check constraint for cron expression format (data validation)
        // Validates 6-field cron syntax required by cron parsers
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                DO $$ BEGIN
                    ALTER TABLE hr_public.sync_schedules
                    ADD CONSTRAINT valid_cron_expression
                    CHECK (cron_expression ~ '^[0-9\*\/\,\-]+ [0-9\*\/\,\-]+ [0-9\*\/\,\-]+ [0-9\*\/\,\-]+ [0-9\*\/\,\-]+ [0-9\*\/\,\-]+$');
                EXCEPTION
                    WHEN duplicate_object THEN NULL;
                END $$;
                "#,
            )
            .await?;

        // Step 8: Add check constraint for entity type (data validation)
        // Ensures only valid entity types (Employee, Department, Both)
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                DO $$ BEGIN
                    ALTER TABLE hr_public.sync_schedules
                    ADD CONSTRAINT valid_entity_type
                    CHECK (entity_type IN ('Employee', 'Department', 'Both'));
                EXCEPTION
                    WHEN duplicate_object THEN NULL;
                END $$;
                "#,
            )
            .await?;

        // Step 9: Add check constraint for sync direction (data validation)
        // Ensures only valid sync directions (Push, Pull, Bidirectional)
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                DO $$ BEGIN
                    ALTER TABLE hr_public.sync_schedules
                    ADD CONSTRAINT valid_sync_direction
                    CHECK (sync_direction IN ('Push', 'Pull', 'Bidirectional'));
                EXCEPTION
                    WHEN duplicate_object THEN NULL;
                END $$;
                "#,
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Step 1: Drop tables in reverse order (cascades foreign keys, indexes, and constraints)
        manager
            .drop_table(Table::drop().table((Schema::HrPublic, SyncScheduleHistory::Table)).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table((Schema::HrPublic, SyncSchedules::Table)).to_owned())
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
enum SyncSchedules {
    Table,
    Id,
    Name,
    Description,
    CronExpression,
    EntityType,
    SyncDirection,
    Enabled,
    BusinessHoursOnly,
    Timezone,
    LastRunAt,
    NextRunAt,
    LastRunStatus,
    LastRunError,
    CreatedBy,
    CreatedAt,
    UpdatedAt,
    DeletedAt,
}

#[derive(DeriveIden)]
enum SyncScheduleHistory {
    Table,
    Id,
    ScheduleId,
    StartedAt,
    CompletedAt,
    Status,
    RecordsSynced,
    RecordsPushed,
    RecordsPulled,
    ErrorsCount,
    ErrorMessage,
    ExecutionTimeMs,
    CreatedAt,
}
