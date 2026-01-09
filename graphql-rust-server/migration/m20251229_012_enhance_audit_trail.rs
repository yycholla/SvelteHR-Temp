use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Add tamper detection fields to audit_logs table
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, AuditLogs::Table))
                    .add_column(
                        ColumnDef::new(AuditLogs::AuditId)
                            .string()
                            .unique_key()
                            .null(),
                    )
                    .add_column(
                        ColumnDef::new(AuditLogs::PreviousAuditId)
                            .string()
                            .null(),
                    )
                    .add_column(
                        ColumnDef::new(AuditLogs::AuditHash)
                            .string()
                            .null(),
                    )
                    .add_column(
                        ColumnDef::new(AuditLogs::EntityName)
                            .string()
                            .null(),
                    )
                    .to_owned(),
            )
            .await?;

        // Create index on audit_id for fast chain lookups
        manager
            .create_index(
                Index::create()
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
                    .name("idx_audit_logs_previous_audit_id")
                    .table((Schema::HrPublic, AuditLogs::Table))
                    .col(AuditLogs::PreviousAuditId)
                    .to_owned(),
            )
            .await?;

        // Create sync_sessions table for grouping sync operations
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
                    .col(ColumnDef::new(SyncSessions::StartedAt).timestamp_with_time_zone().not_null())
                    .col(ColumnDef::new(SyncSessions::CompletedAt).timestamp_with_time_zone().null())
                    .col(ColumnDef::new(SyncSessions::UserId).uuid().null())
                    .col(ColumnDef::new(SyncSessions::SyncDirection).string().null())
                    .col(ColumnDef::new(SyncSessions::EntityType).string().null())
                    .col(ColumnDef::new(SyncSessions::Status).string().not_null())
                    .col(ColumnDef::new(SyncSessions::TotalRecords).integer().default(0))
                    .col(ColumnDef::new(SyncSessions::SuccessfulRecords).integer().default(0))
                    .col(ColumnDef::new(SyncSessions::FailedRecords).integer().default(0))
                    .col(ColumnDef::new(SyncSessions::ConflictsDetected).integer().default(0))
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
                    .name("idx_sync_sessions_user_id")
                    .table((Schema::HrPublic, SyncSessions::Table))
                    .col(SyncSessions::UserId)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop sync_sessions table
        manager
            .drop_table(Table::drop().table((Schema::HrPublic, SyncSessions::Table)).to_owned())
            .await?;

        // Drop indexes
        manager
            .drop_index(
                Index::drop()
                    .name("idx_audit_logs_audit_id")
                    .table((Schema::HrPublic, AuditLogs::Table))
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
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
