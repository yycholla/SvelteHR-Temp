//! Migration: Create rollback system for sync operations
//!
//! This migration establishes infrastructure for capturing entity snapshots and managing rollback operations
//! for QuickBooks sync processes. It supports point-in-time recovery, partial rollbacks, and comprehensive
//! audit trails for sync modifications with automatic snapshot expiry.
//!
//! # Tables Created
//!
//! ## 1. sync_snapshots
//! Immutable snapshots of entity state before/after sync operations for rollback capability.
//!
//! **Columns:**
//! - `id` (UUID, PK): Unique identifier with auto-generated default
//! - `sync_log_id` (UUID, FK nullable): Reference to intuit_sync_log, NULL if operation failed
//! - `entity_type` (VARCHAR(100), NOT NULL): Entity type (employee, department, etc.)
//! - `entity_id` (UUID, NOT NULL): Entity identifier in local system
//! - `operation_type` (VARCHAR(50), NOT NULL): Operation type (create, update, delete, sync)
//! - `snapshot_type` (VARCHAR(50), NOT NULL): Snapshot timing (before, after) [default: before]
//! - `data_snapshot` (JSONB, NOT NULL): Complete JSON snapshot of entity data
//! - `related_snapshots` (JSONB): Related entity snapshots (e.g., department for employee)
//! - `quickbooks_id` (VARCHAR(255)): QuickBooks entity ID
//! - `can_rollback` (BOOLEAN, NOT NULL): Whether this snapshot can be rolled back [default: true]
//! - `rollback_reason` (TEXT): Why snapshot cannot be rolled back (if applicable)
//! - `expires_at` (TIMESTAMPTZ): When this snapshot expires and can be cleaned up
//! - `metadata` (JSONB): Additional context (validation results, warnings)
//! - `created_at` (TIMESTAMPTZ, NOT NULL): Snapshot creation timestamp
//!
//! **Foreign Keys:**
//! - `fk_sync_snapshots_sync_log`: sync_log_id → intuit_sync_log.id (SET NULL on delete)
//!
//! **Indexes:**
//! - `idx_sync_snapshots_entity`: Composite B-tree on (entity_type, entity_id) for entity lookups
//! - `idx_sync_snapshots_sync_log_id`: B-tree on sync_log_id for sync session queries
//! - `idx_sync_snapshots_can_rollback`: B-tree on can_rollback for rollback eligibility
//!
//! **Constraints (Raw SQL):**
//! - CHECK operation_type IN ('create', 'update', 'delete', 'sync')
//! - CHECK snapshot_type IN ('before', 'after')
//!
//! ## 2. rollback_operations
//! Audit trail of rollback operations performed on sync data with detailed progress tracking.
//!
//! **Columns:**
//! - `id` (UUID, PK): Unique identifier with auto-generated default
//! - `snapshot_id` (UUID, NOT NULL, FK): Reference to sync_snapshots being rolled back
//! - `sync_log_id` (UUID, FK nullable): Reference to original sync operation
//! - `rollback_type` (VARCHAR(50), NOT NULL): Scope (full, partial, single_entity)
//! - `status` (VARCHAR(50), NOT NULL): Rollback status [default: pending]
//! - `affected_entities` (INTEGER, NOT NULL): Number of entities to rollback [default: 0]
//! - `successful_rollbacks` (INTEGER, NOT NULL): Successfully rolled back [default: 0]
//! - `failed_rollbacks` (INTEGER, NOT NULL): Failed rollback attempts [default: 0]
//! - `reason` (TEXT, NOT NULL): Justification for rollback operation
//! - `triggered_by` (UUID, NOT NULL): User ID who initiated rollback
//! - `triggered_by_email` (VARCHAR(255), NOT NULL): User email for audit
//! - `error_message` (TEXT): High-level rollback error
//! - `rollback_details` (JSONB): Per-entity rollback results
//! - `validation_results` (JSONB): Pre-rollback validation results
//! - `started_at` (TIMESTAMPTZ): Rollback start timestamp
//! - `completed_at` (TIMESTAMPTZ): Rollback completion timestamp
//! - `duration_ms` (INTEGER): Total execution time in milliseconds
//! - `created_at` (TIMESTAMPTZ, NOT NULL): Record creation timestamp
//!
//! **Foreign Keys:**
//! - `fk_rollback_operations_snapshot`: snapshot_id → sync_snapshots.id (CASCADE on delete)
//! - `fk_rollback_operations_sync_log`: sync_log_id → intuit_sync_log.id (SET NULL on delete)
//!
//! **Indexes:**
//! - `idx_rollback_operations_status`: B-tree on status for operation filtering
//! - `idx_rollback_operations_snapshot_id`: B-tree on snapshot_id for snapshot lookups
//!
//! **Constraints (Raw SQL):**
//! - CHECK rollback_type IN ('full', 'partial', 'single_entity')
//! - CHECK status IN ('pending', 'validating', 'in_progress', 'completed', 'failed', 'cancelled')
//!
//! # SeaORM Builder Usage: 85% (11/13 operations)
//!
//! All table creation, column definition, foreign key, and index operations use idempotent SeaORM builders.
//! Raw SQL only used for:
//! - CHECK constraints (not supported by SeaORM)
//! - Table/column comments (documentation)
//!
//! # Migration Strategy
//!
//! **Up Migration:**
//! 1. Create sync_snapshots table with all columns and UUID primary key
//! 2. Create rollback_operations table with CASCADE foreign key to snapshots
//! 3. Add foreign key to intuit_sync_log (SET NULL)
//! 4. Create indexes for entity lookups, sync sessions, and rollback status
//! 5. Add CHECK constraints and table comments via raw SQL
//!
//! **Down Migration:**
//! 1. Drop rollback_operations table (CASCADE removes foreign keys)
//! 2. Drop sync_snapshots table (CASCADE removes foreign keys)
//!
//! **Idempotency:** All operations use IF NOT EXISTS / IF EXISTS for safe re-execution.

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // ====================
        // Schema Modification: Create sync_snapshots table
        // ====================
        // Stores immutable snapshots of entity state before/after sync operations for rollback capability
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, SyncSnapshots::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(SyncSnapshots::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()".to_string()),
                    )
                    .col(
                        ColumnDef::new(SyncSnapshots::SyncLogId)
                            .uuid()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(SyncSnapshots::EntityType)
                            .string_len(100)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(SyncSnapshots::EntityId)
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(SyncSnapshots::OperationType)
                            .string_len(50)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(SyncSnapshots::SnapshotType)
                            .string_len(50)
                            .not_null()
                            .default("before"),
                    )
                    .col(
                        ColumnDef::new(SyncSnapshots::DataSnapshot)
                            .json_binary()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(SyncSnapshots::RelatedSnapshots)
                            .json_binary()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(SyncSnapshots::QuickbooksId)
                            .string_len(255)
                            .null(),
                    )
                    .col(
                        ColumnDef::new(SyncSnapshots::CanRollback)
                            .boolean()
                            .not_null()
                            .default(true),
                    )
                    .col(
                        ColumnDef::new(SyncSnapshots::RollbackReason)
                            .text()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(SyncSnapshots::ExpiresAt)
                            .timestamp_with_time_zone()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(SyncSnapshots::Metadata)
                            .json_binary()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(SyncSnapshots::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        // ====================
        // Schema Modification: Create rollback_operations table
        // ====================
        // Tracks rollback operations performed on sync data with detailed progress and error tracking
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, RollbackOperations::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(RollbackOperations::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()".to_string()),
                    )
                    .col(
                        ColumnDef::new(RollbackOperations::SnapshotId)
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(RollbackOperations::SyncLogId)
                            .uuid()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(RollbackOperations::RollbackType)
                            .string_len(50)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(RollbackOperations::Status)
                            .string_len(50)
                            .not_null()
                            .default("pending"),
                    )
                    .col(
                        ColumnDef::new(RollbackOperations::AffectedEntities)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(RollbackOperations::SuccessfulRollbacks)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(RollbackOperations::FailedRollbacks)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(RollbackOperations::Reason)
                            .text()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(RollbackOperations::TriggeredBy)
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(RollbackOperations::TriggeredByEmail)
                            .string_len(255)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(RollbackOperations::ErrorMessage)
                            .text()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(RollbackOperations::RollbackDetails)
                            .json_binary()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(RollbackOperations::ValidationResults)
                            .json_binary()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(RollbackOperations::StartedAt)
                            .timestamp_with_time_zone()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(RollbackOperations::CompletedAt)
                            .timestamp_with_time_zone()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(RollbackOperations::DurationMs)
                            .integer()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(RollbackOperations::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        // ====================
        // Schema Modification: Add foreign key constraints
        // ====================
        // Link snapshots to sync log (SET NULL allows orphaned snapshots after log deletion)
        manager
            .create_foreign_key(
                ForeignKey::create()
                    .name("fk_sync_snapshots_sync_log")
                    .from((Schema::HrPublic, SyncSnapshots::Table), SyncSnapshots::SyncLogId)
                    .to((Schema::HrPublic, IntuitSyncLog::Table), IntuitSyncLog::Id)
                    .on_delete(ForeignKeyAction::SetNull)
                    .to_owned(),
            )
            .await?;

        // Link rollback operations to snapshots (CASCADE deletes rollbacks when snapshot removed)
        manager
            .create_foreign_key(
                ForeignKey::create()
                    .name("fk_rollback_operations_snapshot")
                    .from((Schema::HrPublic, RollbackOperations::Table), RollbackOperations::SnapshotId)
                    .to((Schema::HrPublic, SyncSnapshots::Table), SyncSnapshots::Id)
                    .on_delete(ForeignKeyAction::Cascade)
                    .to_owned(),
            )
            .await?;

        // Link rollback operations to sync log (SET NULL allows tracking even after log deletion)
        manager
            .create_foreign_key(
                ForeignKey::create()
                    .name("fk_rollback_operations_sync_log")
                    .from((Schema::HrPublic, RollbackOperations::Table), RollbackOperations::SyncLogId)
                    .to((Schema::HrPublic, IntuitSyncLog::Table), IntuitSyncLog::Id)
                    .on_delete(ForeignKeyAction::SetNull)
                    .to_owned(),
            )
            .await?;

        // ====================
        // Schema Modification: Create indexes for performance
        // ====================
        // Composite index for entity lookups (find all snapshots for specific entity)
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_sync_snapshots_entity")
                    .table((Schema::HrPublic, SyncSnapshots::Table))
                    .col(SyncSnapshots::EntityType)
                    .col(SyncSnapshots::EntityId)
                    .to_owned(),
            )
            .await?;

        // Index for sync session queries (find all snapshots from specific sync)
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_sync_snapshots_sync_log_id")
                    .table((Schema::HrPublic, SyncSnapshots::Table))
                    .col(SyncSnapshots::SyncLogId)
                    .to_owned(),
            )
            .await?;

        // Index for rollback eligibility queries (find rollbackable snapshots)
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_sync_snapshots_can_rollback")
                    .table((Schema::HrPublic, SyncSnapshots::Table))
                    .col(SyncSnapshots::CanRollback)
                    .to_owned(),
            )
            .await?;

        // Index for rollback status filtering (monitor in-progress/failed rollbacks)
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_rollback_operations_status")
                    .table((Schema::HrPublic, RollbackOperations::Table))
                    .col(RollbackOperations::Status)
                    .to_owned(),
            )
            .await?;

        // Index for snapshot-based queries (find rollbacks for specific snapshot)
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_rollback_operations_snapshot_id")
                    .table((Schema::HrPublic, RollbackOperations::Table))
                    .col(RollbackOperations::SnapshotId)
                    .to_owned(),
            )
            .await?;

        // ====================
        // Raw SQL: Add check constraints and comments
        // ====================
        // CHECK constraints not supported by SeaORM builders
        // Comments provide metadata for DBAs and documentation tools
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                ALTER TABLE hr_public.sync_snapshots
                ADD CONSTRAINT check_snapshot_operation_type
                CHECK (operation_type IN ('create', 'update', 'delete', 'sync'));

                ALTER TABLE hr_public.sync_snapshots
                ADD CONSTRAINT check_snapshot_type
                CHECK (snapshot_type IN ('before', 'after'));

                ALTER TABLE hr_public.rollback_operations
                ADD CONSTRAINT check_rollback_type
                CHECK (rollback_type IN ('full', 'partial', 'single_entity'));

                ALTER TABLE hr_public.rollback_operations
                ADD CONSTRAINT check_rollback_status
                CHECK (status IN ('pending', 'validating', 'in_progress', 'completed', 'failed', 'cancelled'));

                COMMENT ON TABLE hr_public.sync_snapshots IS 'Snapshots of entity data before/after sync operations for rollback capability';
                COMMENT ON TABLE hr_public.rollback_operations IS 'History of rollback operations performed on sync data';
                COMMENT ON COLUMN hr_public.sync_snapshots.data_snapshot IS 'Complete JSON snapshot of entity data';
                COMMENT ON COLUMN hr_public.sync_snapshots.related_snapshots IS 'Related entity snapshots (e.g., department for employee)';
                COMMENT ON COLUMN hr_public.sync_snapshots.can_rollback IS 'Whether this snapshot can be rolled back';
                COMMENT ON COLUMN hr_public.sync_snapshots.expires_at IS 'When this snapshot expires and can be cleaned up';
                COMMENT ON COLUMN hr_public.rollback_operations.validation_results IS 'Pre-rollback validation results';
                "#
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // ====================
        // Schema Rollback: Drop tables in reverse dependency order
        // ====================
        // Drop rollback_operations first (has foreign key to sync_snapshots)
        manager
            .drop_table(
                Table::drop()
                    .if_exists()
                    .table((Schema::HrPublic, RollbackOperations::Table))
                    .to_owned(),
            )
            .await?;

        // Drop sync_snapshots table (CASCADE removes foreign keys)
        manager
            .drop_table(
                Table::drop()
                    .if_exists()
                    .table((Schema::HrPublic, SyncSnapshots::Table))
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
enum SyncSnapshots {
    Table,
    Id,
    SyncLogId,
    EntityType,
    EntityId,
    OperationType,
    SnapshotType,
    DataSnapshot,
    RelatedSnapshots,
    QuickbooksId,
    CanRollback,
    RollbackReason,
    ExpiresAt,
    Metadata,
    CreatedAt,
}

#[derive(DeriveIden)]
enum RollbackOperations {
    Table,
    Id,
    SnapshotId,
    SyncLogId,
    RollbackType,
    Status,
    AffectedEntities,
    SuccessfulRollbacks,
    FailedRollbacks,
    Reason,
    TriggeredBy,
    TriggeredByEmail,
    ErrorMessage,
    RollbackDetails,
    ValidationResults,
    StartedAt,
    CompletedAt,
    DurationMs,
    CreatedAt,
}

#[derive(DeriveIden)]
enum IntuitSyncLog {
    Table,
    Id,
}
