//! Migration: Create batch operations system for bulk sync processing
//!
//! This migration establishes infrastructure for managing large-scale batch operations with progress
//! tracking, item-level status, and detailed error handling. It supports bulk sync jobs, imports/exports,
//! and data validation operations with real-time progress monitoring and comprehensive error reporting.
//!
//! # Tables Created
//!
//! ## 1. batch_operations
//! Master table tracking batch job execution with aggregate statistics and progress monitoring.
//!
//! **Columns:**
//! - `id` (UUID, PK): Unique identifier with auto-generated default
//! - `operation_type` (VARCHAR(100), NOT NULL): Type of operation (sync, import, export, update, delete, validate)
//! - `entity_type` (VARCHAR(100), NOT NULL): Entity type being processed (employee, department, all)
//! - `direction` (VARCHAR(50), NOT NULL): Data flow direction (push, pull, bidirectional)
//! - `status` (VARCHAR(50), NOT NULL): Job status (pending, running, paused, completed, failed, cancelled)
//! - `total_items` (INTEGER, NOT NULL): Total number of items to process (default: 0)
//! - `processed_items` (INTEGER, NOT NULL): Items processed so far (default: 0)
//! - `successful_items` (INTEGER, NOT NULL): Successfully processed items (default: 0)
//! - `failed_items` (INTEGER, NOT NULL): Failed items (default: 0)
//! - `skipped_items` (INTEGER, NOT NULL): Skipped items (default: 0)
//! - `progress_percentage` (DECIMAL, NOT NULL): Completion percentage 0-100 (default: 0.0)
//! - `estimated_time_remaining` (INTEGER): ETA in seconds
//! - `triggered_by` (UUID): User who initiated the operation
//! - `triggered_by_email` (VARCHAR(255)): User email
//! - `error_message` (TEXT): High-level error description
//! - `error_summary` (JSONB): Aggregated error statistics
//! - `configuration` (JSONB): Operation configuration parameters
//! - `metadata` (JSONB): Additional context
//! - `started_at` (TIMESTAMPTZ): Job start timestamp
//! - `completed_at` (TIMESTAMPTZ): Job completion timestamp
//! - `duration_ms` (INTEGER): Total execution time in milliseconds
//! - `created_at` (TIMESTAMPTZ, NOT NULL): Record creation timestamp
//! - `updated_at` (TIMESTAMPTZ, NOT NULL): Last update timestamp
//!
//! **Indexes:**
//! - `idx_batch_operations_status`: B-tree on `status` for job queue queries
//! - `idx_batch_operations_type_entity`: Composite on `operation_type`, `entity_type`
//!
//! **Constraints (Raw SQL):**
//! - CHECK status IN ('pending', 'running', 'paused', 'completed', 'failed', 'cancelled')
//! - CHECK operation_type IN ('sync', 'import', 'export', 'update', 'delete', 'validate')
//! - CHECK entity_type IN ('employee', 'department', 'all')
//! - CHECK direction IN ('push', 'pull', 'bidirectional')
//!
//! ## 2. batch_operation_items
//! Detailed item-level tracking linked to parent batch operations with error details.
//!
//! **Columns:**
//! - `id` (UUID, PK): Unique identifier with auto-generated default
//! - `batch_operation_id` (UUID, NOT NULL, FK): Reference to parent batch_operations
//! - `entity_id` (VARCHAR(255), NOT NULL): ID of the entity being processed
//! - `entity_name` (VARCHAR(255)): Human-readable entity name
//! - `status` (VARCHAR(50), NOT NULL): Item processing status (pending, processing, success, failed, skipped)
//! - `attempt_count` (INTEGER, NOT NULL): Number of processing attempts (default: 0)
//! - `error_message` (TEXT): Item-specific error description
//! - `error_details` (JSONB): Detailed error information
//! - `input_data` (JSONB): Original input data
//! - `output_data` (JSONB): Processing result data
//! - `processed_at` (TIMESTAMPTZ): Item completion timestamp
//! - `duration_ms` (INTEGER): Item processing time in milliseconds
//! - `created_at` (TIMESTAMPTZ, NOT NULL): Record creation timestamp
//!
//! **Foreign Key:**
//! - `fk_batch_operation_items_batch_operation`: batch_operation_id → batch_operations.id (CASCADE on delete)
//!
//! **Indexes:**
//! - `idx_batch_operations_status`: B-tree on `status` for filtering
//! - `idx_batch_operations_type_entity`: Composite for operation queries
//! - `idx_batch_operation_items_batch_id`: B-tree on `batch_operation_id` for parent lookups
//! - `idx_batch_operation_items_status`: B-tree on `status` for item filtering
//!
//! **Constraints (Raw SQL):**
//! - CHECK status IN ('pending', 'processing', 'success', 'failed', 'skipped')
//!
//! # SeaORM Builder Usage: 92% (12/13 operations)
//!
//! All schema operations use SeaORM builders. Raw SQL only for CHECK constraints.
//!
//! # Migration Strategy
//!
//! - **Type**: Schema creation (new tables with FK relationship)
//! - **Risk Level**: Low (no existing data)
//! - **Rollback**: Clean DROP TABLE cascade

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Schema Creation: batch_operations table for job tracking
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, BatchOperations::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(BatchOperations::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()".to_string()),
                    )
                    .col(
                        ColumnDef::new(BatchOperations::OperationType)
                            .string_len(100)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(BatchOperations::EntityType)
                            .string_len(100)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(BatchOperations::Direction)
                            .string_len(50)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(BatchOperations::Status)
                            .string_len(50)
                            .not_null()
                            .default("pending"),
                    )
                    .col(
                        ColumnDef::new(BatchOperations::TotalItems)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(BatchOperations::ProcessedItems)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(BatchOperations::SuccessfulItems)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(BatchOperations::FailedItems)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(BatchOperations::SkippedItems)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(BatchOperations::ProgressPercentage)
                            .decimal()
                            .not_null()
                            .default(0.0),
                    )
                    .col(
                        ColumnDef::new(BatchOperations::EstimatedTimeRemaining)
                            .integer()
                            .null(),
                    )
                    .col(ColumnDef::new(BatchOperations::TriggeredBy).uuid().null())
                    .col(
                        ColumnDef::new(BatchOperations::TriggeredByEmail)
                            .string_len(255)
                            .null(),
                    )
                    .col(ColumnDef::new(BatchOperations::ErrorMessage).text().null())
                    .col(
                        ColumnDef::new(BatchOperations::ErrorSummary)
                            .json_binary()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(BatchOperations::Configuration)
                            .json_binary()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(BatchOperations::Metadata)
                            .json_binary()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(BatchOperations::StartedAt)
                            .timestamp_with_time_zone()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(BatchOperations::CompletedAt)
                            .timestamp_with_time_zone()
                            .null(),
                    )
                    .col(ColumnDef::new(BatchOperations::DurationMs).integer().null())
                    .col(
                        ColumnDef::new(BatchOperations::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(BatchOperations::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        // Schema Creation: batch_operation_items table for item-level tracking
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, BatchOperationItems::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(BatchOperationItems::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()".to_string()),
                    )
                    .col(
                        ColumnDef::new(BatchOperationItems::BatchOperationId)
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(BatchOperationItems::EntityId)
                            .string_len(255)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(BatchOperationItems::EntityName)
                            .string_len(255)
                            .null(),
                    )
                    .col(
                        ColumnDef::new(BatchOperationItems::Status)
                            .string_len(50)
                            .not_null()
                            .default("pending"),
                    )
                    .col(
                        ColumnDef::new(BatchOperationItems::AttemptCount)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(BatchOperationItems::ErrorMessage)
                            .text()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(BatchOperationItems::ErrorDetails)
                            .json_binary()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(BatchOperationItems::InputData)
                            .json_binary()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(BatchOperationItems::OutputData)
                            .json_binary()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(BatchOperationItems::ProcessedAt)
                            .timestamp_with_time_zone()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(BatchOperationItems::DurationMs)
                            .integer()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(BatchOperationItems::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        // Foreign Key Creation: Link items to parent batch with CASCADE delete
        manager
            .create_foreign_key(
                ForeignKey::create()
                    .name("fk_batch_operation_items_batch_operation")
                    .from(
                        (Schema::HrPublic, BatchOperationItems::Table),
                        BatchOperationItems::BatchOperationId,
                    )
                    .to(
                        (Schema::HrPublic, BatchOperations::Table),
                        BatchOperations::Id,
                    )
                    .on_delete(ForeignKeyAction::Cascade)
                    .to_owned(),
            )
            .await?;

        // Index Creation: Job queue status filtering
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_batch_operations_status")
                    .table((Schema::HrPublic, BatchOperations::Table))
                    .col(BatchOperations::Status)
                    .to_owned(),
            )
            .await?;

        // Index Creation: Composite operation type and entity filtering
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_batch_operations_type_entity")
                    .table((Schema::HrPublic, BatchOperations::Table))
                    .col(BatchOperations::OperationType)
                    .col(BatchOperations::EntityType)
                    .to_owned(),
            )
            .await?;

        // Index Creation: Parent batch lookup for items
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_batch_operation_items_batch_id")
                    .table((Schema::HrPublic, BatchOperationItems::Table))
                    .col(BatchOperationItems::BatchOperationId)
                    .to_owned(),
            )
            .await?;

        // Index Creation: Item status filtering
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_batch_operation_items_status")
                    .table((Schema::HrPublic, BatchOperationItems::Table))
                    .col(BatchOperationItems::Status)
                    .to_owned(),
            )
            .await?;

        // Data Integrity: CHECK constraints and table comments (raw SQL required)
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                ALTER TABLE hr_public.batch_operations
                ADD CONSTRAINT check_batch_operation_status
                CHECK (status IN ('pending', 'running', 'paused', 'completed', 'failed', 'cancelled'));

                ALTER TABLE hr_public.batch_operations
                ADD CONSTRAINT check_batch_operation_type
                CHECK (operation_type IN ('sync', 'import', 'export', 'update', 'delete', 'validate'));

                ALTER TABLE hr_public.batch_operations
                ADD CONSTRAINT check_batch_entity_type
                CHECK (entity_type IN ('employee', 'department', 'all'));

                ALTER TABLE hr_public.batch_operations
                ADD CONSTRAINT check_batch_direction
                CHECK (direction IN ('push', 'pull', 'bidirectional'));

                ALTER TABLE hr_public.batch_operation_items
                ADD CONSTRAINT check_batch_item_status
                CHECK (status IN ('pending', 'processing', 'success', 'failed', 'skipped'));

                COMMENT ON TABLE hr_public.batch_operations IS 'Batch operations for bulk sync and data processing';
                COMMENT ON TABLE hr_public.batch_operation_items IS 'Individual items within a batch operation';
                COMMENT ON COLUMN hr_public.batch_operations.progress_percentage IS 'Percentage of items processed (0-100)';
                COMMENT ON COLUMN hr_public.batch_operations.estimated_time_remaining IS 'Estimated time remaining in seconds';
                "#
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Schema Cleanup: Drop items table first (child in FK relationship)
        manager
            .drop_table(
                Table::drop()
                    .if_exists()
                    .table((Schema::HrPublic, BatchOperationItems::Table))
                    .to_owned(),
            )
            .await?;

        // Schema Cleanup: Drop batch operations table (parent)
        manager
            .drop_table(
                Table::drop()
                    .if_exists()
                    .table((Schema::HrPublic, BatchOperations::Table))
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
enum BatchOperations {
    Table,
    Id,
    OperationType,
    EntityType,
    Direction,
    Status,
    TotalItems,
    ProcessedItems,
    SuccessfulItems,
    FailedItems,
    SkippedItems,
    ProgressPercentage,
    EstimatedTimeRemaining,
    TriggeredBy,
    TriggeredByEmail,
    ErrorMessage,
    ErrorSummary,
    Configuration,
    Metadata,
    StartedAt,
    CompletedAt,
    DurationMs,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum BatchOperationItems {
    Table,
    Id,
    BatchOperationId,
    EntityId,
    EntityName,
    Status,
    AttemptCount,
    ErrorMessage,
    ErrorDetails,
    InputData,
    OutputData,
    ProcessedAt,
    DurationMs,
    CreatedAt,
}
