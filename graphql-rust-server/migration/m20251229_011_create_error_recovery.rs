use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create failed_operations table
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
                    .col(
                        ColumnDef::new(FailedOperations::SyncLogId)
                            .uuid()
                            .null(),
                    )
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
                    .col(
                        ColumnDef::new(FailedOperations::EntityId)
                            .uuid()
                            .null(),
                    )
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
                    .col(
                        ColumnDef::new(FailedOperations::ResolvedBy)
                            .uuid()
                            .null(),
                    )
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

        // Create retry_history table
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
                    .col(
                        ColumnDef::new(RetryHistory::ErrorMessage)
                            .text()
                            .null(),
                    )
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
                    .col(
                        ColumnDef::new(RetryHistory::DurationMs)
                            .integer()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(RetryHistory::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        // Add foreign key constraints
        manager
            .create_foreign_key(
                ForeignKey::create()
                    .name("fk_failed_operations_sync_log")
                    .from((Schema::HrPublic, FailedOperations::Table), FailedOperations::SyncLogId)
                    .to((Schema::HrPublic, IntuitSyncLog::Table), IntuitSyncLog::Id)
                    .on_delete(ForeignKeyAction::SetNull)
                    .to_owned(),
            )
            .await?;

        manager
            .create_foreign_key(
                ForeignKey::create()
                    .name("fk_retry_history_failed_operation")
                    .from((Schema::HrPublic, RetryHistory::Table), RetryHistory::FailedOperationId)
                    .to((Schema::HrPublic, FailedOperations::Table), FailedOperations::Id)
                    .on_delete(ForeignKeyAction::Cascade)
                    .to_owned(),
            )
            .await?;

        // Add indexes
        manager
            .create_index(
                Index::create()
                    .name("idx_failed_operations_status")
                    .table((Schema::HrPublic, FailedOperations::Table))
                    .col(FailedOperations::Status)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_failed_operations_next_retry")
                    .table((Schema::HrPublic, FailedOperations::Table))
                    .col(FailedOperations::NextRetryAt)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_failed_operations_entity")
                    .table((Schema::HrPublic, FailedOperations::Table))
                    .col(FailedOperations::EntityType)
                    .col(FailedOperations::EntityId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_failed_operations_dead_letter")
                    .table((Schema::HrPublic, FailedOperations::Table))
                    .col(FailedOperations::MovedToDeadLetter)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_retry_history_operation")
                    .table((Schema::HrPublic, RetryHistory::Table))
                    .col(RetryHistory::FailedOperationId)
                    .to_owned(),
            )
            .await?;

        // Add check constraints and comments
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
        manager
            .drop_table(
                Table::drop()
                    .table((Schema::HrPublic, RetryHistory::Table))
                    .to_owned(),
            )
            .await?;

        manager
            .drop_table(
                Table::drop()
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
