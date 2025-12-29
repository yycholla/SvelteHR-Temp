//! Migration: Create Sync Health Monitoring Tables
//!
//! This migration creates the infrastructure for comprehensive sync health monitoring:
//! 1. sync_health_metrics: Time-series data for performance tracking
//! 2. sync_health_alerts: Alert system for degraded sync health
//! 3. Indexes for efficient querying and trending

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // 1. Create sync_health_metrics table for time-series performance data
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, SyncHealthMetrics::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(SyncHealthMetrics::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()".to_string()),
                    )
                    .col(
                        ColumnDef::new(SyncHealthMetrics::RecordedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .extra("DEFAULT NOW()".to_string()),
                    )
                    .col(
                        ColumnDef::new(SyncHealthMetrics::SyncDurationMs)
                            .integer()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(SyncHealthMetrics::RecordsProcessed)
                            .integer()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(SyncHealthMetrics::ErrorsCount)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(SyncHealthMetrics::ApiCallsUsed)
                            .integer()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(SyncHealthMetrics::ConnectionStatus)
                            .string_len(20)
                            .not_null()
                            .default("unknown"),
                    )
                    .col(
                        ColumnDef::new(SyncHealthMetrics::EntityType)
                            .string_len(50)
                            .null(),
                    )
                    .col(
                        ColumnDef::new(SyncHealthMetrics::SyncDirection)
                            .string_len(20)
                            .null(),
                    )
                    .col(
                        ColumnDef::new(SyncHealthMetrics::SuccessRate)
                            .double()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(SyncHealthMetrics::Metadata)
                            .json_binary()
                            .null(),
                    )
                    .to_owned(),
            )
            .await?;

        // 2. Create sync_health_alerts table for alerting system
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, SyncHealthAlerts::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(SyncHealthAlerts::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()".to_string()),
                    )
                    .col(
                        ColumnDef::new(SyncHealthAlerts::AlertType)
                            .string_len(50)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(SyncHealthAlerts::Severity)
                            .string_len(20)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(SyncHealthAlerts::Message)
                            .text()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(SyncHealthAlerts::TriggeredAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .extra("DEFAULT NOW()".to_string()),
                    )
                    .col(
                        ColumnDef::new(SyncHealthAlerts::ResolvedAt)
                            .timestamp_with_time_zone()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(SyncHealthAlerts::EntityType)
                            .string_len(50)
                            .null(),
                    )
                    .col(
                        ColumnDef::new(SyncHealthAlerts::MetricSnapshot)
                            .json_binary()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(SyncHealthAlerts::NotifiedUsers)
                            .array(ColumnType::Uuid)
                            .null(),
                    )
                    .col(
                        ColumnDef::new(SyncHealthAlerts::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .extra("DEFAULT NOW()".to_string()),
                    )
                    .col(
                        ColumnDef::new(SyncHealthAlerts::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .extra("DEFAULT NOW()".to_string()),
                    )
                    .to_owned(),
            )
            .await?;

        // 3. Create indexes for efficient time-series queries on metrics
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_sync_health_metrics_recorded_at")
                    .table((Schema::HrPublic, SyncHealthMetrics::Table))
                    .col(SyncHealthMetrics::RecordedAt)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_sync_health_metrics_status")
                    .table((Schema::HrPublic, SyncHealthMetrics::Table))
                    .col(SyncHealthMetrics::ConnectionStatus)
                    .col(SyncHealthMetrics::RecordedAt)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_sync_health_metrics_entity")
                    .table((Schema::HrPublic, SyncHealthMetrics::Table))
                    .col(SyncHealthMetrics::EntityType)
                    .col(SyncHealthMetrics::RecordedAt)
                    .to_owned(),
            )
            .await?;

        // 4. Create indexes for alerts
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_sync_health_alerts_triggered")
                    .table((Schema::HrPublic, SyncHealthAlerts::Table))
                    .col(SyncHealthAlerts::TriggeredAt)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_sync_health_alerts_unresolved")
                    .table((Schema::HrPublic, SyncHealthAlerts::Table))
                    .col(SyncHealthAlerts::ResolvedAt)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_sync_health_alerts_severity")
                    .table((Schema::HrPublic, SyncHealthAlerts::Table))
                    .col(SyncHealthAlerts::Severity)
                    .col(SyncHealthAlerts::TriggeredAt)
                    .to_owned(),
            )
            .await?;

        // 5. Add check constraints for data integrity
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                ALTER TABLE hr_public.sync_health_metrics
                ADD CONSTRAINT valid_connection_status
                CHECK (connection_status IN ('healthy', 'degraded', 'down', 'unknown'))
                "#,
            )
            .await?;

        manager
            .get_connection()
            .execute_unprepared(
                r#"
                ALTER TABLE hr_public.sync_health_alerts
                ADD CONSTRAINT valid_severity
                CHECK (severity IN ('info', 'warning', 'error', 'critical'))
                "#,
            )
            .await?;

        manager
            .get_connection()
            .execute_unprepared(
                r#"
                ALTER TABLE hr_public.sync_health_alerts
                ADD CONSTRAINT valid_alert_type
                CHECK (alert_type IN (
                    'high_error_rate',
                    'slow_sync',
                    'connection_down',
                    'api_quota_low',
                    'consecutive_failures',
                    'sync_timeout',
                    'data_validation_failure'
                ))
                "#,
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop tables in reverse order
        manager
            .drop_table(
                Table::drop()
                    .if_exists()
                    .table((Schema::HrPublic, SyncHealthAlerts::Table))
                    .to_owned(),
            )
            .await?;

        manager
            .drop_table(
                Table::drop()
                    .if_exists()
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
    SuccessRate,
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
    EntityType,
    MetricSnapshot,
    NotifiedUsers,
    CreatedAt,
    UpdatedAt,
}
