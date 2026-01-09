use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create sync_snapshots table
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

        // Create rollback_operations table
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

        // Add foreign key constraints
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

        // Add indexes
        manager
            .create_index(
                Index::create()
                    .name("idx_sync_snapshots_entity")
                    .table((Schema::HrPublic, SyncSnapshots::Table))
                    .col(SyncSnapshots::EntityType)
                    .col(SyncSnapshots::EntityId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_sync_snapshots_sync_log_id")
                    .table((Schema::HrPublic, SyncSnapshots::Table))
                    .col(SyncSnapshots::SyncLogId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_sync_snapshots_can_rollback")
                    .table((Schema::HrPublic, SyncSnapshots::Table))
                    .col(SyncSnapshots::CanRollback)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_rollback_operations_status")
                    .table((Schema::HrPublic, RollbackOperations::Table))
                    .col(RollbackOperations::Status)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_rollback_operations_snapshot_id")
                    .table((Schema::HrPublic, RollbackOperations::Table))
                    .col(RollbackOperations::SnapshotId)
                    .to_owned(),
            )
            .await?;

        // Add check constraints
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
        manager
            .drop_table(
                Table::drop()
                    .table((Schema::HrPublic, RollbackOperations::Table))
                    .to_owned(),
            )
            .await?;

        manager
            .drop_table(
                Table::drop()
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
