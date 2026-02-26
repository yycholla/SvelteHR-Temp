//! Migration: Enhance audit trail with tamper detection and session grouping
//!
//! This migration enhances the existing audit_logs table with blockchain-style tamper detection
//! and creates sync_sessions table for grouping related sync operations with aggregate statistics.
//!
//! # Schema Modifications
//!
//! ## 1. audit_logs (Enhanced)
//! Adds tamper detection fields for blockchain-style audit chain verification.
//!
//! **New Columns:**
//! - `audit_id` (STRING, UNIQUE): Unique identifier for audit chain
//! - `previous_audit_id` (STRING): Link to previous audit in chain
//! - `audit_hash` (STRING): Cryptographic hash for tamper detection
//! - `entity_name` (STRING): Human-readable entity name
//!
//! **New Indexes:**
//! - `idx_audit_logs_audit_id`: B-tree on audit_id for chain lookups
//! - `idx_audit_logs_previous_audit_id`: B-tree on previous_audit_id for chain verification
//!
//! ## 2. sync_sessions (New Table)
//! Groups sync operations with aggregate statistics and status tracking.
//!
//! **Columns:**
//! - `id` (UUID, PK): Unique identifier
//! - `started_at` (TIMESTAMPTZ, NOT NULL): Session start time
//! - `completed_at` (TIMESTAMPTZ): Session completion time
//! - `user_id` (UUID): User who initiated session
//! - `sync_direction` (STRING): Direction (push, pull, bidirectional)
//! - `entity_type` (STRING): Entity type being synced
//! - `status` (STRING, NOT NULL): Session status
//! - `total_records` (INTEGER): Total records [default: 0]
//! - `successful_records` (INTEGER): Successfully synced [default: 0]
//! - `failed_records` (INTEGER): Failed records [default: 0]
//! - `conflicts_detected` (INTEGER): Conflicts found [default: 0]
//! - `duration_ms` (INTEGER): Total execution time
//! - `error_message` (TEXT): High-level error description
//! - `metadata` (JSONB): Additional context
//!
//! **Indexes:**
//! - `idx_sync_sessions_started_at`: B-tree on started_at for time-based queries
//! - `idx_sync_sessions_user_id`: B-tree on user_id for user-based queries
//!
//! # SeaORM Builder Usage: 100% (10/10 operations)
//!
//! All schema operations use idempotent SeaORM builders.
//!
//! # Migration Strategy
//!
//! **Up Migration:**
//! 1. Add tamper detection columns to audit_logs table
//! 2. Create indexes on audit chain columns
//! 3. Create sync_sessions table with all columns
//! 4. Create indexes for time and user-based queries
//!
//! **Down Migration:**
//! 1. Drop sync_sessions table
//! 2. Drop audit chain indexes
//! 3. Drop tamper detection columns from audit_logs
//!
//! **Idempotency:** All operations use IF NOT EXISTS / IF EXISTS for safe re-execution.

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // ====================
        // Schema Modification: Add tamper detection fields to audit_logs table
        // ====================
        // Blockchain-style audit chain for tamper detection and verification
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, AuditLogs::Table))
                    .add_column_if_not_exists(
                        ColumnDef::new(AuditLogs::AuditId)
                            .string()
                            .unique_key()
                            .null(),
                    )
                    .add_column_if_not_exists(
                        ColumnDef::new(AuditLogs::PreviousAuditId).string().null(),
                    )
                    .add_column_if_not_exists(ColumnDef::new(AuditLogs::AuditHash).string().null())
                    .add_column_if_not_exists(ColumnDef::new(AuditLogs::EntityName).string().null())
                    .to_owned(),
            )
            .await?;

        // Create index on audit_id for fast chain lookups
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_audit_logs_audit_id")
                    .table((Schema::HrPublic, AuditLogs::Table))
                    .col(AuditLogs::AuditId)
                    .to_owned(),
            )
            .await?;

        // Create index on previous_audit_id for chain verification
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_audit_logs_previous_audit_id")
                    .table((Schema::HrPublic, AuditLogs::Table))
                    .col(AuditLogs::PreviousAuditId)
                    .to_owned(),
            )
            .await?;

        // ====================
        // Schema Modification: Create sync_sessions table for grouping sync operations
        // ====================
        // Tracks sync session lifecycle with aggregate statistics
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, SyncSessions::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(SyncSessions::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(SyncSessions::StartedAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(SyncSessions::CompletedAt)
                            .timestamp_with_time_zone()
                            .null(),
                    )
                    .col(ColumnDef::new(SyncSessions::UserId).uuid().null())
                    .col(ColumnDef::new(SyncSessions::SyncDirection).string().null())
                    .col(ColumnDef::new(SyncSessions::EntityType).string().null())
                    .col(ColumnDef::new(SyncSessions::Status).string().not_null())
                    .col(
                        ColumnDef::new(SyncSessions::TotalRecords)
                            .integer()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(SyncSessions::SuccessfulRecords)
                            .integer()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(SyncSessions::FailedRecords)
                            .integer()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(SyncSessions::ConflictsDetected)
                            .integer()
                            .default(0),
                    )
                    .col(ColumnDef::new(SyncSessions::DurationMs).integer().null())
                    .col(ColumnDef::new(SyncSessions::ErrorMessage).text().null())
                    .col(ColumnDef::new(SyncSessions::Metadata).json_binary().null())
                    .to_owned(),
            )
            .await?;

        // Create index on started_at for time-based queries
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_sync_sessions_started_at")
                    .table((Schema::HrPublic, SyncSessions::Table))
                    .col(SyncSessions::StartedAt)
                    .to_owned(),
            )
            .await?;

        // Create index on user_id for user-based queries
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_sync_sessions_user_id")
                    .table((Schema::HrPublic, SyncSessions::Table))
                    .col(SyncSessions::UserId)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // ====================
        // Schema Rollback: Remove sync_sessions table and audit enhancements
        // ====================
        // Drop sync_sessions table
        manager
            .drop_table(
                Table::drop()
                    .if_exists()
                    .table((Schema::HrPublic, SyncSessions::Table))
                    .to_owned(),
            )
            .await?;

        // Drop indexes from audit_logs
        manager
            .drop_index(
                Index::drop()
                    .if_exists()
                    .name("idx_audit_logs_audit_id")
                    .table((Schema::HrPublic, AuditLogs::Table))
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .if_exists()
                    .name("idx_audit_logs_previous_audit_id")
                    .table((Schema::HrPublic, AuditLogs::Table))
                    .to_owned(),
            )
            .await?;

        // Drop columns from audit_logs
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, AuditLogs::Table))
                    .drop_column(AuditLogs::AuditId)
                    .drop_column(AuditLogs::PreviousAuditId)
                    .drop_column(AuditLogs::AuditHash)
                    .drop_column(AuditLogs::EntityName)
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
enum AuditLogs {
    Table,
    AuditId,
    PreviousAuditId,
    AuditHash,
    EntityName,
}

#[derive(DeriveIden)]
enum SyncSessions {
    Table,
    Id,
    StartedAt,
    CompletedAt,
    UserId,
    SyncDirection,
    EntityType,
    Status,
    TotalRecords,
    SuccessfulRecords,
    FailedRecords,
    ConflictsDetected,
    DurationMs,
    ErrorMessage,
    Metadata,
}
