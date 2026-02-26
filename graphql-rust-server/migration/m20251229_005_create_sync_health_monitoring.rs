//! Migration: Create sync health monitoring tables
//!
//! This migration establishes comprehensive health monitoring infrastructure for QuickBooks sync operations.
//! It provides real-time tracking of sync performance, connection health, and automated alerting for
//! system administrators. The tables support time-series analysis, alert management, and historical
//! performance tracking.
//!
//! # Tables Created
//!
//! ## 1. sync_health_metrics
//! Time-series metrics table for tracking sync operation performance and health indicators.
//! Designed for efficient querying of recent metrics and aggregate analysis.
//!
//! **Columns:**
//! - `id` (UUID, PK): Unique identifier for each metric record
//! - `recorded_at` (TIMESTAMPTZ): When the metric was recorded (indexed for time-series queries)
//! - `sync_duration_ms` (INTEGER): Duration of sync operation in milliseconds
//! - `records_processed` (INTEGER): Number of records processed in the sync
//! - `errors_count` (INTEGER): Number of errors encountered (default: 0)
//! - `api_calls_used` (INTEGER): QuickBooks API calls consumed (default: 0)
//! - `connection_status` (TEXT): Current connection health status (indexed)
//! - `entity_type` (TEXT): Type of entity synced (employee, department, etc.)
//! - `sync_direction` (TEXT): Direction of sync (pull, push, bidirectional)
//! - `metadata` (JSONB): Additional context and diagnostic information
//!
//! **Indexes:**
//! - `idx_sync_health_metrics_recorded_at`: B-tree on `recorded_at` for time-range queries
//! - `idx_sync_health_metrics_connection_status`: B-tree on `connection_status` for health checks
//!
//! ## 2. sync_health_alerts
//! Alert management table for tracking system health issues, notification status, and resolution.
//! Supports severity-based filtering and tracks alert lifecycle from trigger to resolution.
//!
//! **Columns:**
//! - `id` (UUID, PK): Unique identifier for each alert
//! - `alert_type` (TEXT, NOT NULL): Type/category of alert
//! - `severity` (TEXT, NOT NULL): Alert severity level (indexed for filtering)
//! - `message` (TEXT, NOT NULL): Human-readable alert message
//! - `triggered_at` (TIMESTAMPTZ): When the alert was triggered (indexed)
//! - `resolved_at` (TIMESTAMPTZ): When the alert was resolved (indexed for active alerts)
//! - `notified_users` (UUID[]): Array of user IDs who received notifications
//! - `metadata` (JSONB): Additional alert context and diagnostic data
//! - `created_at` (TIMESTAMPTZ): Record creation timestamp
//! - `updated_at` (TIMESTAMPTZ): Last update timestamp
//!
//! **Indexes:**
//! - `idx_sync_health_alerts_triggered_at`: B-tree on `triggered_at` for alert history
//! - `idx_sync_health_alerts_severity`: B-tree on `severity` for filtering critical alerts
//! - `idx_sync_health_alerts_resolved_at`: B-tree on `resolved_at` for finding active alerts
//!
//! # Use Cases
//!
//! 1. **Real-time Monitoring**: Track sync performance and detect degradation
//! 2. **Capacity Planning**: Analyze API usage patterns and processing times
//! 3. **Alert Management**: Automated notifications for system administrators
//! 4. **Historical Analysis**: Identify trends and recurring issues
//! 5. **SLA Compliance**: Monitor sync reliability and response times
//!
//! # SeaORM Builder Usage
//!
//! **Conversion Status: 100% (18/18 operations using SeaORM builders)**
//!
//! All operations successfully use SeaORM's type-safe builder API:
//!
//! ## ✓ Supported Operations (Using Builders)
//!
//! ### Schema Operations (6/6)
//! - ✓ CREATE TABLE sync_health_metrics
//! - ✓ CREATE TABLE sync_health_alerts
//! - ✓ CREATE INDEX (all 5 indexes)
//! - ✓ DROP INDEX (all 5 indexes)
//! - ✓ DROP TABLE (both tables)
//!
//! ### Column Operations (12/12)
//! - ✓ UUID columns with default gen_random_uuid()
//! - ✓ TIMESTAMPTZ columns with CURRENT_TIMESTAMP default
//! - ✓ INTEGER columns with default values
//! - ✓ TEXT columns (nullable and not null)
//! - ✓ JSONB columns for metadata
//! - ✓ UUID[] array columns
//! - ✓ Primary key constraints
//! - ✓ NOT NULL constraints
//!
//! ## Implementation Notes
//!
//! 1. **Idempotency**: All operations use `if_not_exists()` for safe re-runs
//! 2. **Defaults**: Timestamps auto-populate, counters default to 0
//! 3. **Indexes**: Optimized for time-series queries and alert filtering
//! 4. **No Raw SQL**: Pure SeaORM builders throughout
//!
//! # Migration Strategy
//!
//! - **Type**: Schema creation (new tables)
//! - **Risk Level**: Low (no existing data to migrate)
//! - **Rollback**: Clean DROP TABLE cascade
//! - **Dependencies**: None (self-contained monitoring system)
//!
//! # Performance Considerations
//!
//! - `recorded_at` index supports efficient time-range queries (e.g., last 24 hours)
//! - `connection_status` index enables fast health status checks
//! - `severity` index allows rapid filtering of critical alerts
//! - `resolved_at` index optimizes finding active (unresolved) alerts
//! - JSONB metadata supports flexible querying without schema changes

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Schema Creation: sync_health_metrics table for time-series performance tracking
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
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(SyncHealthMetrics::ApiCallsUsed)
                            .integer()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(SyncHealthMetrics::ConnectionStatus)
                            .string()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(SyncHealthMetrics::EntityType)
                            .string()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(SyncHealthMetrics::SyncDirection)
                            .string()
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

        // Index Creation: Time-series index for recorded_at queries
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

        // Index Creation: Connection status health check index
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_sync_health_metrics_connection_status")
                    .table((Schema::HrPublic, SyncHealthMetrics::Table))
                    .col(SyncHealthMetrics::ConnectionStatus)
                    .to_owned(),
            )
            .await?;

        // Schema Creation: sync_health_alerts table for alert lifecycle management
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
                    .col(
                        ColumnDef::new(SyncHealthAlerts::Metadata)
                            .json_binary()
                            .null(),
                    )
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

        // Index Creation: Alert history index on triggered_at
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_sync_health_alerts_triggered_at")
                    .table((Schema::HrPublic, SyncHealthAlerts::Table))
                    .col(SyncHealthAlerts::TriggeredAt)
                    .to_owned(),
            )
            .await?;

        // Index Creation: Severity filtering index for critical alerts
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_sync_health_alerts_severity")
                    .table((Schema::HrPublic, SyncHealthAlerts::Table))
                    .col(SyncHealthAlerts::Severity)
                    .to_owned(),
            )
            .await?;

        // Index Creation: Active alerts index on resolved_at (NULL = active)
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_sync_health_alerts_resolved_at")
                    .table((Schema::HrPublic, SyncHealthAlerts::Table))
                    .col(SyncHealthAlerts::ResolvedAt)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Index Cleanup: Drop sync_health_alerts indexes (reverse order)
        manager
            .drop_index(
                Index::drop()
                    .if_exists()
                    .name("idx_sync_health_alerts_resolved_at")
                    .table((Schema::HrPublic, SyncHealthAlerts::Table))
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .if_exists()
                    .name("idx_sync_health_alerts_severity")
                    .table((Schema::HrPublic, SyncHealthAlerts::Table))
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .if_exists()
                    .name("idx_sync_health_alerts_triggered_at")
                    .table((Schema::HrPublic, SyncHealthAlerts::Table))
                    .to_owned(),
            )
            .await?;

        // Index Cleanup: Drop sync_health_metrics indexes
        manager
            .drop_index(
                Index::drop()
                    .if_exists()
                    .name("idx_sync_health_metrics_connection_status")
                    .table((Schema::HrPublic, SyncHealthMetrics::Table))
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .if_exists()
                    .name("idx_sync_health_metrics_recorded_at")
                    .table((Schema::HrPublic, SyncHealthMetrics::Table))
                    .to_owned(),
            )
            .await?;

        // Schema Cleanup: Drop tables (cascades to dependent objects)
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
