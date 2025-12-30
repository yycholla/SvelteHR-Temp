use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create sync_health_metrics table
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, SyncHealthMetrics::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(SyncHealthMetrics::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(SyncHealthMetrics::RecordedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(ColumnDef::new(SyncHealthMetrics::SyncDurationMs).integer().null())
                    .col(ColumnDef::new(SyncHealthMetrics::RecordsProcessed).integer().null())
                    .col(ColumnDef::new(SyncHealthMetrics::ErrorsCount).integer().default(0))
                    .col(ColumnDef::new(SyncHealthMetrics::ApiCallsUsed).integer().default(0))
                    .col(
                        ColumnDef::new(SyncHealthMetrics::ConnectionStatus)
                            .string()
                            .null(),
                    )
                    .col(ColumnDef::new(SyncHealthMetrics::EntityType).string().null())
                    .col(ColumnDef::new(SyncHealthMetrics::SyncDirection).string().null())
                    .col(ColumnDef::new(SyncHealthMetrics::Metadata).json_binary().null())
                    .to_owned(),
            )
            .await?;

        // Create index on recorded_at for time-series queries
        manager
            .create_index(
                Index::create()
                    .name("idx_sync_health_metrics_recorded_at")
                    .table((Schema::HrPublic, SyncHealthMetrics::Table))
                    .col(SyncHealthMetrics::RecordedAt)
                    .to_owned(),
            )
            .await?;

        // Create index on connection_status for health checks
        manager
            .create_index(
                Index::create()
                    .name("idx_sync_health_metrics_connection_status")
                    .table((Schema::HrPublic, SyncHealthMetrics::Table))
                    .col(SyncHealthMetrics::ConnectionStatus)
                    .to_owned(),
            )
            .await?;

        // Create sync_health_alerts table
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, SyncHealthAlerts::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(SyncHealthAlerts::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(SyncHealthAlerts::AlertType)
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(SyncHealthAlerts::Severity)
                            .string()
                            .not_null(),
                    )
                    .col(ColumnDef::new(SyncHealthAlerts::Message).text().not_null())
                    .col(
                        ColumnDef::new(SyncHealthAlerts::TriggeredAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(SyncHealthAlerts::ResolvedAt)
                            .timestamp_with_time_zone()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(SyncHealthAlerts::NotifiedUsers)
                            .array(ColumnType::Uuid)
                            .null(),
                    )
                    .col(ColumnDef::new(SyncHealthAlerts::Metadata).json_binary().null())
                    .col(
                        ColumnDef::new(SyncHealthAlerts::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(SyncHealthAlerts::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        // Create index on triggered_at for alert history
        manager
            .create_index(
                Index::create()
                    .name("idx_sync_health_alerts_triggered_at")
                    .table((Schema::HrPublic, SyncHealthAlerts::Table))
                    .col(SyncHealthAlerts::TriggeredAt)
                    .to_owned(),
            )
            .await?;

        // Create index on severity for filtering critical alerts
        manager
            .create_index(
                Index::create()
                    .name("idx_sync_health_alerts_severity")
                    .table((Schema::HrPublic, SyncHealthAlerts::Table))
                    .col(SyncHealthAlerts::Severity)
                    .to_owned(),
            )
            .await?;

        // Create index on resolved_at to find active alerts
        manager
            .create_index(
                Index::create()
                    .name("idx_sync_health_alerts_resolved_at")
                    .table((Schema::HrPublic, SyncHealthAlerts::Table))
                    .col(SyncHealthAlerts::ResolvedAt)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop indexes first
        manager
            .drop_index(
                Index::drop()
                    .name("idx_sync_health_alerts_resolved_at")
                    .table((Schema::HrPublic, SyncHealthAlerts::Table))
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .name("idx_sync_health_alerts_severity")
                    .table((Schema::HrPublic, SyncHealthAlerts::Table))
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .name("idx_sync_health_alerts_triggered_at")
                    .table((Schema::HrPublic, SyncHealthAlerts::Table))
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .name("idx_sync_health_metrics_connection_status")
                    .table((Schema::HrPublic, SyncHealthMetrics::Table))
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .name("idx_sync_health_metrics_recorded_at")
                    .table((Schema::HrPublic, SyncHealthMetrics::Table))
                    .to_owned(),
            )
            .await?;

        // Drop tables
        manager
            .drop_table(
                Table::drop()
                    .table((Schema::HrPublic, SyncHealthAlerts::Table))
                    .to_owned(),
            )
            .await?;

        manager
            .drop_table(
                Table::drop()
                    .table((Schema::HrPublic, SyncHealthMetrics::Table))
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
enum SyncHealthMetrics {
    Table,
    Id,
    RecordedAt,
    SyncDurationMs,
    RecordsProcessed,
    ErrorsCount,
    ApiCallsUsed,
    ConnectionStatus,
    EntityType,
    SyncDirection,
    Metadata,
}

#[derive(DeriveIden)]
enum SyncHealthAlerts {
    Table,
    Id,
    AlertType,
    Severity,
    Message,
    TriggeredAt,
    ResolvedAt,
    NotifiedUsers,
    Metadata,
    CreatedAt,
    UpdatedAt,
}
