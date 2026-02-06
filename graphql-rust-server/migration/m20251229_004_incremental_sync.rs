//! Migration: Add Incremental Sync Support
//!
//! **Purpose:**
//! Enhances the QuickBooks synchronization system with incremental sync capabilities.
//! This migration transforms the system from full sync only to supporting both full
//! and incremental sync modes, dramatically reducing API calls and improving performance.
//!
//! **SeaORM Builder Usage:**
//! - Schema modifications (100% builders): All column additions and index creation
//! - No raw SQL required for this migration
//!
//! **Operations:**
//! 1. **Sync Mode Tracking (intuit_sync_log):**
//!    - Add `sync_mode` column (full/incremental, default='full')
//!    - Add `changes_detected` column (count of changes found)
//!    - Add `changes_processed` column (count of changes applied)
//!    - Add `sync_duration_ms` column (performance tracking)
//!
//! 2. **Entity-Level Sync Tokens (intuit_connections):**
//!    - Add `employee_sync_token` column (QuickBooks change tracking)
//!    - Add `department_sync_token` column (QuickBooks change tracking)
//!    - Add `last_employee_sync_at` timestamp (last employee sync time)
//!    - Add `last_department_sync_at` timestamp (last department sync time)
//!
//! 3. **Performance Indexes (users table):**
//!    - idx_users_last_modified_at (for incremental change detection)
//!    - idx_users_last_synced_at (for sync status queries)
//!    - idx_users_sync_status (for filtering by sync state)
//!
//! 4. **Performance Indexes (departments table):**
//!    - idx_departments_last_modified_at (for incremental change detection)
//!    - idx_departments_last_synced_at (for sync status queries)
//!    - idx_departments_sync_status (for filtering by sync state)
//!
//! 5. **Sync Log Indexes:**
//!    - idx_intuit_sync_log_created_at (for historical queries)
//!    - idx_intuit_sync_log_sync_mode (for mode-based filtering)
//!
//! **Incremental Sync Strategy:**
//! - QuickBooks sync tokens enable change tracking at entity level
//! - Local timestamps (last_modified_at) identify changed records
//! - Sync mode field enables mixed full/incremental sync strategies
//! - Performance metrics track efficiency gains
//!
//! **Benefits:**
//! - Reduces API calls to QuickBooks (cost savings)
//! - Faster sync operations (only process changes)
//! - Better monitoring (change counts and duration tracking)
//! - Enables fine-grained sync scheduling (employees vs departments)
//!
//! **Migration Strategy:**
//! All operations use idempotent SeaORM builders:
//! - `.if_not_exists()` for index creation
//! - `.to_owned()` pattern for builder API
//! - Nullable columns for backward compatibility
//! - Default values for required fields
//!
//! **Dependencies:**
//! - Requires m20251226_001_add_sync_tracking (sync tracking columns must exist)
//! - Requires m20251222_create_intuit_integration (intuit tables must exist)
//!
//! **Testing:**
//! - Verifies all 4 columns added to intuit_sync_log
//! - Verifies all 4 columns added to intuit_connections
//! - Validates 8 indexes created (3 users + 3 departments + 2 sync_log)
//! - Tests column properties (nullability, defaults)
//! - Validates idempotent re-runs
//! - Tests down migration cleanup
//! - Full migration cycle verification

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // ============================================================
        // SCHEMA MODIFICATION: Enhance intuit_sync_log Table
        // ============================================================
        // Add sync mode tracking fields for incremental sync support
        // - sync_mode: Distinguishes full vs incremental sync operations
        // - changes_detected/processed: Metrics for monitoring efficiency
        // - sync_duration_ms: Performance tracking for optimization
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, IntuitSyncLog::Table))
                    .add_column(
                        ColumnDef::new(IntuitSyncLog::SyncMode)
                            .string_len(20)
                            .default("full")
                            .not_null(),
                    )
                    .add_column(
                        ColumnDef::new(IntuitSyncLog::ChangesDetected)
                            .integer()
                            .default(0)
                            .not_null(),
                    )
                    .add_column(
                        ColumnDef::new(IntuitSyncLog::ChangesProcessed)
                            .integer()
                            .default(0)
                            .not_null(),
                    )
                    .add_column(
                        ColumnDef::new(IntuitSyncLog::SyncDurationMs)
                            .integer()
                            .null(),
                    )
                    .to_owned(),
            )
            .await?;

        // ============================================================
        // SCHEMA MODIFICATION: Enhance intuit_connections Table
        // ============================================================
        // Add entity-level sync token tracking for QuickBooks CDC
        // - employee_sync_token/department_sync_token: QuickBooks change tracking tokens
        // - last_*_sync_at: Timestamp tracking for each entity type
        // Enables independent sync scheduling for employees vs departments
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, IntuitConnections::Table))
                    .add_column(
                        ColumnDef::new(IntuitConnections::EmployeeSyncToken)
                            .string_len(50)
                            .null(),
                    )
                    .add_column(
                        ColumnDef::new(IntuitConnections::DepartmentSyncToken)
                            .string_len(50)
                            .null(),
                    )
                    .add_column(
                        ColumnDef::new(IntuitConnections::LastEmployeeSyncAt)
                            .timestamp_with_time_zone()
                            .null(),
                    )
                    .add_column(
                        ColumnDef::new(IntuitConnections::LastDepartmentSyncAt)
                            .timestamp_with_time_zone()
                            .null(),
                    )
                    .to_owned(),
            )
            .await?;

        // ============================================================
        // INDEX CREATION: Users Table Performance Indexes
        // ============================================================
        // Create indexes for efficient timestamp-based change detection
        // Enables fast queries for incremental sync (find records modified since last sync)

        // Index for finding users modified since a specific time
        manager
            .create_index(
                Index::create().if_not_exists()
                    .name("idx_users_last_modified_at")
                    .table((Schema::HrPublic, Users::Table))
                    .col(Users::LastModifiedAt)
                    .to_owned(),
            )
            .await?;

        // Index for finding users by last sync time (sync history queries)
        manager
            .create_index(
                Index::create().if_not_exists()
                    .name("idx_users_last_synced_at")
                    .table((Schema::HrPublic, Users::Table))
                    .col(Users::LastSyncedAt)
                    .to_owned(),
            )
            .await?;

        // Index for filtering users by sync status (synced, pending, failed)
        manager
            .create_index(
                Index::create().if_not_exists()
                    .name("idx_users_sync_status")
                    .table((Schema::HrPublic, Users::Table))
                    .col(Users::SyncStatus)
                    .to_owned(),
            )
            .await?;

        // ============================================================
        // INDEX CREATION: Departments Table Performance Indexes
        // ============================================================
        // Create indexes for efficient timestamp-based change detection
        // Enables fast queries for incremental department sync

        // Index for finding departments modified since a specific time
        manager
            .create_index(
                Index::create().if_not_exists()
                    .name("idx_departments_last_modified_at")
                    .table((Schema::HrPublic, Departments::Table))
                    .col(Departments::LastModifiedAt)
                    .to_owned(),
            )
            .await?;

        // Index for finding departments by last sync time (sync history queries)
        manager
            .create_index(
                Index::create().if_not_exists()
                    .name("idx_departments_last_synced_at")
                    .table((Schema::HrPublic, Departments::Table))
                    .col(Departments::LastSyncedAt)
                    .to_owned(),
            )
            .await?;

        // Index for filtering departments by sync status (synced, pending, failed)
        manager
            .create_index(
                Index::create().if_not_exists()
                    .name("idx_departments_sync_status")
                    .table((Schema::HrPublic, Departments::Table))
                    .col(Departments::SyncStatus)
                    .to_owned(),
            )
            .await?;

        // ============================================================
        // INDEX CREATION: Sync Log Performance Indexes
        // ============================================================
        // Create indexes for sync log queries and reporting

        // Index for historical sync log queries (most recent syncs)
        manager
            .create_index(
                Index::create().if_not_exists()
                    .name("idx_intuit_sync_log_created_at")
                    .table((Schema::HrPublic, IntuitSyncLog::Table))
                    .col(IntuitSyncLog::CreatedAt)
                    .to_owned(),
            )
            .await?;

        // Index for filtering sync logs by mode (full vs incremental)
        // Enables performance comparison between sync strategies
        manager
            .create_index(
                Index::create().if_not_exists()
                    .name("idx_intuit_sync_log_sync_mode")
                    .table((Schema::HrPublic, IntuitSyncLog::Table))
                    .col(IntuitSyncLog::SyncMode)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // ============================================================
        // INDEX REMOVAL: Drop All Performance Indexes
        // ============================================================
        // Drop sync log indexes first
        manager
            .drop_index(
                Index::drop()
                    .name("idx_intuit_sync_log_sync_mode")
                    .table((Schema::HrPublic, IntuitSyncLog::Table))
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .name("idx_intuit_sync_log_created_at")
                    .table((Schema::HrPublic, IntuitSyncLog::Table))
                    .to_owned(),
            )
            .await?;

        // Drop departments table indexes
        manager
            .drop_index(
                Index::drop()
                    .name("idx_departments_sync_status")
                    .table((Schema::HrPublic, Departments::Table))
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .name("idx_departments_last_synced_at")
                    .table((Schema::HrPublic, Departments::Table))
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .name("idx_departments_last_modified_at")
                    .table((Schema::HrPublic, Departments::Table))
                    .to_owned(),
            )
            .await?;

        // Drop users table indexes
        manager
            .drop_index(
                Index::drop()
                    .name("idx_users_sync_status")
                    .table((Schema::HrPublic, Users::Table))
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .name("idx_users_last_synced_at")
                    .table((Schema::HrPublic, Users::Table))
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .name("idx_users_last_modified_at")
                    .table((Schema::HrPublic, Users::Table))
                    .to_owned(),
            )
            .await?;

        // ============================================================
        // SCHEMA MODIFICATION: Remove Sync Token Columns
        // ============================================================
        // Drop entity-level sync tracking columns from intuit_connections
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, IntuitConnections::Table))
                    .drop_column(IntuitConnections::LastDepartmentSyncAt)
                    .drop_column(IntuitConnections::LastEmployeeSyncAt)
                    .drop_column(IntuitConnections::DepartmentSyncToken)
                    .drop_column(IntuitConnections::EmployeeSyncToken)
                    .to_owned(),
            )
            .await?;

        // ============================================================
        // SCHEMA MODIFICATION: Remove Sync Mode Tracking Columns
        // ============================================================
        // Drop sync mode tracking columns from intuit_sync_log
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, IntuitSyncLog::Table))
                    .drop_column(IntuitSyncLog::SyncDurationMs)
                    .drop_column(IntuitSyncLog::ChangesProcessed)
                    .drop_column(IntuitSyncLog::ChangesDetected)
                    .drop_column(IntuitSyncLog::SyncMode)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }
}

#[derive(DeriveIden)]
enum Schema {
    HrPublic,
}

#[derive(DeriveIden)]
enum IntuitSyncLog {
    Table,
    SyncMode,
    ChangesDetected,
    ChangesProcessed,
    SyncDurationMs,
    CreatedAt,
}

#[derive(DeriveIden)]
enum IntuitConnections {
    Table,
    EmployeeSyncToken,
    DepartmentSyncToken,
    LastEmployeeSyncAt,
    LastDepartmentSyncAt,
}

#[derive(DeriveIden)]
enum Users {
    Table,
    LastModifiedAt,
    LastSyncedAt,
    SyncStatus,
}

#[derive(DeriveIden)]
enum Departments {
    Table,
    LastModifiedAt,
    LastSyncedAt,
    SyncStatus,
}
