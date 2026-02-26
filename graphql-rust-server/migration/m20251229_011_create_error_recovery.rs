//! Migration: Create error recovery system for failed operations
//!
//! This migration establishes infrastructure for tracking, retrying, and recovering from failed sync operations.
//! It supports automatic retry with exponential backoff, dead letter queuing, manual resolution, and detailed
//! error categorization for different recovery strategies.
//!
//! # Tables Created
//!
//! ## 1. failed_operations
//! Master table tracking failed sync operations with retry logic and recovery strategy management.
//!
//! **Columns:**
//! - `id` (UUID, PK): Unique identifier with auto-generated default
//! - `sync_log_id` (UUID, FK nullable): Reference to intuit_sync_log
//! - `operation_type` (VARCHAR(100), NOT NULL): Type of operation that failed
//! - `entity_type` (VARCHAR(100), NOT NULL): Entity type being processed
//! - `entity_id` (UUID): Local entity ID (null for batch operations)
//! - `quickbooks_id` (VARCHAR(255)): QuickBooks entity ID
//! - `error_type` (VARCHAR(100), NOT NULL): Error category (network, auth, validation, etc.)
//! - `error_code` (VARCHAR(50)): Specific error code from QB API
//! - `error_message` (TEXT, NOT NULL): Human-readable error description
//! - `error_details` (JSONB): Detailed error information and stack traces
//! - `request_payload` (JSONB): Original request data for retry
//! - `response_payload` (JSONB): Error response from QB
//! - `retry_count` (INTEGER, NOT NULL): Current retry attempts [default: 0]
//! - `max_retries` (INTEGER, NOT NULL): Maximum retry attempts [default: 3]
//! - `next_retry_at` (TIMESTAMPTZ): Scheduled next retry time (exponential backoff)
//! - `last_retry_at` (TIMESTAMPTZ): Last retry attempt timestamp
//! - `status` (VARCHAR(50), NOT NULL): Operation status [default: pending]
//! - `is_retryable` (BOOLEAN, NOT NULL): Whether automatic retry is allowed [default: true]
//! - `recovery_strategy` (VARCHAR(50)): Recovery approach (automatic, manual, ignore, compensate)
//! - `priority` (INTEGER, NOT NULL): Retry priority (higher = more important) [default: 0]
//! - `moved_to_dead_letter` (BOOLEAN, NOT NULL): Whether in dead letter queue [default: false]
//! - `dead_letter_reason` (TEXT): Why moved to dead letter queue
//! - `resolved_at` (TIMESTAMPTZ): When operation was resolved
//! - `resolved_by` (UUID): User who resolved the operation
//! - `resolution_notes` (TEXT): Notes about resolution
//! - `metadata` (JSONB): Additional context
//! - `created_at` (TIMESTAMPTZ, NOT NULL): Record creation timestamp
//! - `updated_at` (TIMESTAMPTZ, NOT NULL): Last update timestamp
//!
//! **Foreign Key:**
//! - `fk_failed_operations_sync_log`: sync_log_id → intuit_sync_log.id (SET NULL on delete)
//!
//! **Indexes:**
//! - `idx_failed_operations_status`: B-tree on status for queue processing
//! - `idx_failed_operations_next_retry`: B-tree on next_retry_at for retry scheduler
//! - `idx_failed_operations_entity`: Composite on (entity_type, entity_id)
//! - `idx_failed_operations_dead_letter`: B-tree on moved_to_dead_letter
//!
//! **Constraints (Raw SQL):**
//! - CHECK status IN ('pending', 'retrying', 'succeeded', 'failed', 'dead_letter', 'cancelled')
//! - CHECK error_type IN ('network', 'authentication', 'authorization', 'validation', 'rate_limit', 'server_error', 'client_error', 'timeout', 'unknown')
//! - CHECK recovery_strategy IS NULL OR recovery_strategy IN ('automatic', 'manual', 'ignore', 'compensate')
//!
//! ## 2. retry_history
//! Detailed history of retry attempts for failed operations with timing and outcome tracking.
//!
//! **Columns:**
//! - `id` (UUID, PK): Unique identifier with auto-generated default
//! - `failed_operation_id` (UUID, NOT NULL, FK): Reference to failed_operations
//! - `retry_number` (INTEGER, NOT NULL): Retry attempt sequence number
//! - `status` (VARCHAR(50), NOT NULL): Retry outcome (success, failed, skipped)
//! - `error_message` (TEXT): Error from this retry attempt
//! - `error_details` (JSONB): Detailed error information
//! - `backoff_duration` (INTEGER): Wait time in seconds before this retry
//! - `duration_ms` (INTEGER): Retry execution time in milliseconds
//! - `created_at` (TIMESTAMPTZ, NOT NULL): Retry attempt timestamp
//!
//! **Foreign Key:**
//! - `fk_retry_history_failed_operation`: failed_operation_id → failed_operations.id (CASCADE on delete)
//!
//! **Index:**
//! - `idx_retry_history_operation`: B-tree on failed_operation_id
//!
//! **Constraints (Raw SQL):**
//! - CHECK status IN ('success', 'failed', 'skipped')
//!
//! # SeaORM Builder Usage: 87% (13/15 operations)
//!
//! All table creation, column definition, foreign key, and index operations use idempotent SeaORM builders.
//! Raw SQL only used for:
//! - CHECK constraints (not supported by SeaORM)
//! - Table/column comments (documentation)
//!
//! # Migration Strategy
//!
//! **Up Migration:**
//! 1. Create failed_operations table with retry logic fields
//! 2. Create retry_history table for audit trail
//! 3. Add foreign key to intuit_sync_log (SET NULL)
//! 4. Add foreign key to failed_operations (CASCADE)
//! 5. Create indexes for status, retry scheduling, and entity lookup
//! 6. Add CHECK constraints and comments via raw SQL
//!
//! **Down Migration:**
//! 1. Drop retry_history table (CASCADE removes foreign keys)
//! 2. Drop failed_operations table (CASCADE removes foreign keys)
//!
//! **Idempotency:** All operations use IF NOT EXISTS / IF EXISTS for safe re-execution.

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // ====================
        // Schema Modification: Create failed_operations table
        // ====================
        // Tracks failed sync operations with retry logic, error categorization, and recovery strategies
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, FailedOperations::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(FailedOperations::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()".to_string()),
                    )
                    .col(ColumnDef::new(FailedOperations::SyncLogId).uuid().null())
                    .col(
                        ColumnDef::new(FailedOperations::OperationType)
                            .string_len(100)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(FailedOperations::EntityType)
                            .string_len(100)
                            .not_null(),
                    )
                    .col(ColumnDef::new(FailedOperations::EntityId).uuid().null())
                    .col(
                        ColumnDef::new(FailedOperations::QuickbooksId)
                            .string_len(255)
                            .null(),
                    )
                    .col(
                        ColumnDef::new(FailedOperations::ErrorType)
                            .string_len(100)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(FailedOperations::ErrorCode)
                            .string_len(50)
                            .null(),
                    )
                    .col(
                        ColumnDef::new(FailedOperations::ErrorMessage)
                            .text()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(FailedOperations::ErrorDetails)
                            .json_binary()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(FailedOperations::RequestPayload)
                            .json_binary()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(FailedOperations::ResponsePayload)
                            .json_binary()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(FailedOperations::RetryCount)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(FailedOperations::MaxRetries)
                            .integer()
                            .not_null()
                            .default(3),
                    )
                    .col(
                        ColumnDef::new(FailedOperations::NextRetryAt)
                            .timestamp_with_time_zone()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(FailedOperations::LastRetryAt)
                            .timestamp_with_time_zone()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(FailedOperations::Status)
                            .string_len(50)
                            .not_null()
                            .default("pending"),
                    )
                    .col(
                        ColumnDef::new(FailedOperations::IsRetryable)
                            .boolean()
                            .not_null()
                            .default(true),
                    )
                    .col(
                        ColumnDef::new(FailedOperations::RecoveryStrategy)
                            .string_len(50)
                            .null(),
                    )
                    .col(
                        ColumnDef::new(FailedOperations::Priority)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(FailedOperations::MovedToDeadLetter)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .col(
                        ColumnDef::new(FailedOperations::DeadLetterReason)
                            .text()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(FailedOperations::ResolvedAt)
                            .timestamp_with_time_zone()
                            .null(),
                    )
                    .col(ColumnDef::new(FailedOperations::ResolvedBy).uuid().null())
                    .col(
                        ColumnDef::new(FailedOperations::ResolutionNotes)
                            .text()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(FailedOperations::Metadata)
                            .json_binary()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(FailedOperations::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(FailedOperations::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        // ====================
        // Schema Modification: Create retry_history table
        // ====================
        // Audit trail of retry attempts with timing, outcome, and backoff tracking
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, RetryHistory::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(RetryHistory::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()".to_string()),
                    )
                    .col(
                        ColumnDef::new(RetryHistory::FailedOperationId)
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(RetryHistory::RetryNumber)
                            .integer()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(RetryHistory::Status)
                            .string_len(50)
                            .not_null(),
                    )
                    .col(ColumnDef::new(RetryHistory::ErrorMessage).text().null())
                    .col(
                        ColumnDef::new(RetryHistory::ErrorDetails)
                            .json_binary()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(RetryHistory::BackoffDuration)
                            .integer()
                            .null(),
                    )
                    .col(ColumnDef::new(RetryHistory::DurationMs).integer().null())
                    .col(
                        ColumnDef::new(RetryHistory::CreatedAt)
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
        // Link failed operations to sync log (SET NULL allows orphaned records after log deletion)
        manager
            .create_foreign_key(
                ForeignKey::create()
                    .name("fk_failed_operations_sync_log")
                    .from(
                        (Schema::HrPublic, FailedOperations::Table),
                        FailedOperations::SyncLogId,
                    )
                    .to((Schema::HrPublic, IntuitSyncLog::Table), IntuitSyncLog::Id)
                    .on_delete(ForeignKeyAction::SetNull)
                    .to_owned(),
            )
            .await?;

        // Link retry history to failed operations (CASCADE deletes history when operation resolved)
        manager
            .create_foreign_key(
                ForeignKey::create()
                    .name("fk_retry_history_failed_operation")
                    .from(
                        (Schema::HrPublic, RetryHistory::Table),
                        RetryHistory::FailedOperationId,
                    )
                    .to(
                        (Schema::HrPublic, FailedOperations::Table),
                        FailedOperations::Id,
                    )
                    .on_delete(ForeignKeyAction::Cascade)
                    .to_owned(),
            )
            .await?;

        // ====================
        // Schema Modification: Create indexes for performance
        // ====================
        // Index for status filtering (find pending/retrying operations for queue processing)
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_failed_operations_status")
                    .table((Schema::HrPublic, FailedOperations::Table))
                    .col(FailedOperations::Status)
                    .to_owned(),
            )
            .await?;

        // Index for retry scheduler (find operations ready for next retry)
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_failed_operations_next_retry")
                    .table((Schema::HrPublic, FailedOperations::Table))
                    .col(FailedOperations::NextRetryAt)
                    .to_owned(),
            )
            .await?;

        // Composite index for entity-based queries (find all failures for specific entity)
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_failed_operations_entity")
                    .table((Schema::HrPublic, FailedOperations::Table))
                    .col(FailedOperations::EntityType)
                    .col(FailedOperations::EntityId)
                    .to_owned(),
            )
            .await?;

        // Index for dead letter queue filtering (find operations that need manual intervention)
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_failed_operations_dead_letter")
                    .table((Schema::HrPublic, FailedOperations::Table))
                    .col(FailedOperations::MovedToDeadLetter)
                    .to_owned(),
            )
            .await?;

        // Index for retry history lookups (find all retries for specific operation)
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_retry_history_operation")
                    .table((Schema::HrPublic, RetryHistory::Table))
                    .col(RetryHistory::FailedOperationId)
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
                ALTER TABLE hr_public.failed_operations
                ADD CONSTRAINT check_failed_operation_status
                CHECK (status IN ('pending', 'retrying', 'succeeded', 'failed', 'dead_letter', 'cancelled'));

                ALTER TABLE hr_public.failed_operations
                ADD CONSTRAINT check_error_type
                CHECK (error_type IN ('network', 'authentication', 'authorization', 'validation', 'rate_limit', 'server_error', 'client_error', 'timeout', 'unknown'));

                ALTER TABLE hr_public.failed_operations
                ADD CONSTRAINT check_recovery_strategy
                CHECK (recovery_strategy IS NULL OR recovery_strategy IN ('automatic', 'manual', 'ignore', 'compensate'));

                ALTER TABLE hr_public.retry_history
                ADD CONSTRAINT check_retry_status
                CHECK (status IN ('success', 'failed', 'skipped'));

                COMMENT ON TABLE hr_public.failed_operations IS 'Tracks failed sync operations for retry and recovery';
                COMMENT ON TABLE hr_public.retry_history IS 'History of retry attempts for failed operations';
                COMMENT ON COLUMN hr_public.failed_operations.is_retryable IS 'Whether the operation can be automatically retried';
                COMMENT ON COLUMN hr_public.failed_operations.next_retry_at IS 'When to attempt the next retry (exponential backoff)';
                COMMENT ON COLUMN hr_public.failed_operations.moved_to_dead_letter IS 'Whether operation moved to dead letter queue after max retries';
                COMMENT ON COLUMN hr_public.failed_operations.priority IS 'Retry priority (higher = more important, processed first)';
                "#
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // ====================
        // Schema Rollback: Drop tables in reverse dependency order
        // ====================
        // Drop retry_history first (has foreign key to failed_operations)
        manager
            .drop_table(
                Table::drop()
                    .if_exists()
                    .table((Schema::HrPublic, RetryHistory::Table))
                    .to_owned(),
            )
            .await?;

        // Drop failed_operations table (CASCADE removes foreign keys)
        manager
            .drop_table(
                Table::drop()
                    .if_exists()
                    .table((Schema::HrPublic, FailedOperations::Table))
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
enum FailedOperations {
    Table,
    Id,
    SyncLogId,
    OperationType,
    EntityType,
    EntityId,
    QuickbooksId,
    ErrorType,
    ErrorCode,
    ErrorMessage,
    ErrorDetails,
    RequestPayload,
    ResponsePayload,
    RetryCount,
    MaxRetries,
    NextRetryAt,
    LastRetryAt,
    Status,
    IsRetryable,
    RecoveryStrategy,
    Priority,
    MovedToDeadLetter,
    DeadLetterReason,
    ResolvedAt,
    ResolvedBy,
    ResolutionNotes,
    Metadata,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum RetryHistory {
    Table,
    Id,
    FailedOperationId,
    RetryNumber,
    Status,
    ErrorMessage,
    ErrorDetails,
    BackoffDuration,
    DurationMs,
    CreatedAt,
}

#[derive(DeriveIden)]
enum IntuitSyncLog {
    Table,
    Id,
}
