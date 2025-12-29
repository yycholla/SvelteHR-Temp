//! Migration: Add incremental sync support
//!
//! This migration adds the infrastructure for incremental synchronization:
//! 1. Enhances intuit_sync_log with sync mode tracking
//! 2. Adds entity-level sync token tracking to intuit_connections
//! 3. Creates indexes for efficient timestamp-based queries

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // 1. Add sync mode tracking fields to intuit_sync_log
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

        // 2. Add entity-level sync token tracking to intuit_connections
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

        // 3. Create indexes for efficient timestamp queries on users table
        manager
            .create_index(
                Index::create().if_not_exists()
                    .name("idx_users_last_modified_at")
                    .table((Schema::HrPublic, Users::Table))
                    .col(Users::LastModifiedAt)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create().if_not_exists()
                    .name("idx_users_last_synced_at")
                    .table((Schema::HrPublic, Users::Table))
                    .col(Users::LastSyncedAt)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create().if_not_exists()
                    .name("idx_users_sync_status")
                    .table((Schema::HrPublic, Users::Table))
                    .col(Users::SyncStatus)
                    .to_owned(),
            )
            .await?;

        // 4. Create indexes for efficient timestamp queries on departments table
        manager
            .create_index(
                Index::create().if_not_exists()
                    .name("idx_departments_last_modified_at")
                    .table((Schema::HrPublic, Departments::Table))
                    .col(Departments::LastModifiedAt)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create().if_not_exists()
                    .name("idx_departments_last_synced_at")
                    .table((Schema::HrPublic, Departments::Table))
                    .col(Departments::LastSyncedAt)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create().if_not_exists()
                    .name("idx_departments_sync_status")
                    .table((Schema::HrPublic, Departments::Table))
                    .col(Departments::SyncStatus)
                    .to_owned(),
            )
            .await?;

        // 5. Create index on intuit_sync_log for performance queries
        manager
            .create_index(
                Index::create().if_not_exists()
                    .name("idx_intuit_sync_log_created_at")
                    .table((Schema::HrPublic, IntuitSyncLog::Table))
                    .col(IntuitSyncLog::CreatedAt)
                    .to_owned(),
            )
            .await?;

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
        // Drop indexes
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

        // Drop columns from intuit_connections
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

        // Drop columns from intuit_sync_log
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
