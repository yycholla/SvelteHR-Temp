//! Migration: Create notification_channels table for multi-channel notification system
//!
//! This migration creates a flexible notification system supporting multiple channels:
//! - Email, SMS, Slack, Discord, Webhook, etc.
//! - Channel-specific configuration stored as JSONB
//! - Enable/disable channels without deletion
//! - Optimized indexes for common query patterns
//!
//! ## SeaORM Builder Usage: 100% Converted (5/5 operations)
//!
//! All schema operations use SeaORM builders.
//!
//! ### Operations (SeaORM Builders - 5 operations):
//!
//! **Up Migration:**
//! 1. CREATE TABLE notification_channels
//!    - Using: `manager.create_table()` with Table::create() builder
//!    - 6 columns: id (UUID PK), channel_type, enabled, config_json (JSONB), audit fields
//!    - gen_random_uuid() for default UUID generation
//!    - IF NOT EXISTS for idempotency
//!
//! 2. CREATE INDEX idx_notification_channels_enabled
//!    - Using: `manager.create_index()` with Index::create() builder
//!    - Single column index on enabled (boolean)
//!    - Optimizes queries filtering by enabled status
//!
//! 3. CREATE INDEX idx_notification_channels_type
//!    - Using: `manager.create_index()` with Index::create() builder
//!    - Single column index on channel_type (varchar)
//!    - Optimizes queries filtering by channel type (email, sms, slack, etc.)
//!
//! 4. CREATE INDEX idx_notification_channels_enabled_type
//!    - Using: `manager.create_index()` with Index::create() builder
//!    - Composite index on (enabled, channel_type)
//!    - Optimizes queries filtering by both enabled status AND channel type
//!
//! **Down Migration:**
//! 5. DROP TABLE notification_channels
//!    - Using: `manager.drop_table()` with Table::drop() builder
//!    - Removes table and all indexes (CASCADE)
//!
//! ### Migration Strategy
//!
//! This is a **pure schema creation migration** that:
//! - Establishes flexible notification channel system (JSONB for channel-specific config)
//! - Supports multiple notification backends (email, SMS, Slack, Discord, webhook, etc.)
//! - Enables dynamic channel management (enable/disable without deletion)
//! - Optimizes common query patterns with 3 indexes (single + composite)
//!
//! **Index Strategy:**
//! - Single column indexes: Quick filtering by enabled OR type
//! - Composite index: Optimizes queries filtering by BOTH enabled AND type
//! - PostgreSQL query planner chooses optimal index based on query
//!
//! ## Migration Type: Pure Schema Creation (100% SeaORM Builders)
//!
//! This migration demonstrates proper use of SeaORM builders for table and index
//! creation with JSONB columns and query optimization.

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // pgcrypto extension already created in m20251017_001_schemas

        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, NotificationChannels::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(NotificationChannels::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(
                        ColumnDef::new(NotificationChannels::ChannelType)
                            .string_len(50)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(NotificationChannels::Enabled)
                            .boolean()
                            .not_null()
                            .default(true),
                    )
                    .col(
                        ColumnDef::new(NotificationChannels::ConfigJson)
                            .json_binary()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(NotificationChannels::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(NotificationChannels::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        // Create indexes for common query patterns
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_notification_channels_enabled")
                    .table((Schema::HrPublic, NotificationChannels::Table))
                    .col(NotificationChannels::Enabled)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_notification_channels_type")
                    .table((Schema::HrPublic, NotificationChannels::Table))
                    .col(NotificationChannels::ChannelType)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_notification_channels_enabled_type")
                    .table((Schema::HrPublic, NotificationChannels::Table))
                    .col(NotificationChannels::Enabled)
                    .col(NotificationChannels::ChannelType)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(
                Table::drop()
                    .table((Schema::HrPublic, NotificationChannels::Table))
                    .to_owned(),
            )
            .await
    }
}

#[derive(Iden)]
enum Schema {
    HrPublic,
}

#[derive(Iden)]
enum NotificationChannels {
    Table,
    Id,
    ChannelType,
    Enabled,
    ConfigJson,
    CreatedAt,
    UpdatedAt,
}
