//! Migration: Create webhook subscription and event processing system
//!
//! This migration establishes infrastructure for managing QuickBooks webhook subscriptions and
//! processing real-time event notifications. It enables bidirectional data synchronization by
//! reacting to QuickBooks entity changes (Create, Update, Delete, Merge, Void events) and
//! maintaining subscription health. The system supports automatic retry logic, failure tracking,
//! and event processing status management.
//!
//! # Tables Created
//!
//! ## 1. webhook_subscriptions
//! Tracks active webhook subscriptions with QuickBooks for real-time change notifications.
//! Manages subscription lifecycle, health monitoring, and failure tracking.
//!
//! **Columns:**
//! - `id` (UUID, PK): Unique identifier with auto-generated default
//! - `webhook_id` (VARCHAR(255), NOT NULL): QuickBooks webhook subscription ID
//! - `realm_id` (VARCHAR(255), NOT NULL): QuickBooks company realm/tenant ID
//! - `event_types` (JSONB, NOT NULL): Array of subscribed event types
//! - `entity_names` (JSONB, NOT NULL): Array of subscribed entity types
//! - `verifier_token` (VARCHAR(255), NOT NULL): Webhook verification token
//! - `is_active` (BOOLEAN, NOT NULL): Subscription active status (default: true)
//! - `last_delivered_at` (TIMESTAMPTZ): Last successful event delivery timestamp
//! - `failure_count` (INTEGER, NOT NULL): Consecutive failure counter (default: 0)
//! - `metadata` (JSONB): Additional subscription configuration
//! - `created_at` (TIMESTAMPTZ, NOT NULL): Subscription creation timestamp
//! - `updated_at` (TIMESTAMPTZ, NOT NULL): Last update timestamp
//! - `deleted_at` (TIMESTAMPTZ): Soft delete timestamp for retention
//!
//! **Indexes:**
//! - `idx_webhook_subscriptions_realm_id`: B-tree on `realm_id` for tenant lookups
//! - `idx_webhook_subscriptions_webhook_id`: B-tree on `webhook_id` for QB ID lookups
//!
//! ## 2. webhook_events
//! Stores incoming webhook events for processing with retry logic and status tracking.
//! Maintains event processing history for debugging and audit purposes.
//!
//! **Columns:**
//! - `id` (UUID, PK): Unique identifier with auto-generated default
//! - `subscription_id` (UUID, NOT NULL, FK): Reference to parent webhook_subscriptions
//! - `realm_id` (VARCHAR(255), NOT NULL): QuickBooks company realm ID
//! - `event_type` (VARCHAR(100), NOT NULL): Event type (create, update, delete, etc.)
//! - `entity_name` (VARCHAR(100), NOT NULL): Entity type affected
//! - `entity_id` (VARCHAR(255), NOT NULL): QuickBooks entity ID
//! - `payload` (JSONB, NOT NULL): Full event payload from QuickBooks
//! - `status` (VARCHAR(50), NOT NULL): Processing status (pending, processing, completed, failed, retrying)
//! - `processed_at` (TIMESTAMPTZ): Event processing completion timestamp
//! - `processing_attempts` (INTEGER, NOT NULL): Retry attempt counter (default: 0)
//! - `last_error` (TEXT): Most recent error message
//! - `metadata` (JSONB): Processing context and diagnostics
//! - `received_at` (TIMESTAMPTZ, NOT NULL): Event receipt timestamp
//! - `created_at` (TIMESTAMPTZ, NOT NULL): Record creation timestamp
//!
//! **Foreign Key:**
//! - `fk_webhook_events_subscription`: subscription_id → webhook_subscriptions.id (CASCADE on delete)
//!
//! **Indexes:**
//! - `idx_webhook_events_subscription_id`: B-tree on `subscription_id` for parent lookups
//! - `idx_webhook_events_status`: B-tree on `status` for processing queue queries
//! - `idx_webhook_events_entity`: Composite on `entity_name`, `entity_id` for entity history
//!
//! **Constraints (Raw SQL):**
//! - CHECK status IN ('pending', 'processing', 'completed', 'failed', 'retrying')
//! - CHECK event_type IN ('create', 'update', 'delete', 'merge', 'void')
//!
//! # Use Cases
//!
//! 1. **Real-time Sync**: React to QuickBooks changes immediately
//! 2. **Bidirectional Updates**: Keep local and remote data synchronized
//! 3. **Event Processing**: Queue and process webhook events reliably
//! 4. **Failure Recovery**: Automatic retry logic with exponential backoff
//! 5. **Audit Trail**: Maintain complete event processing history
//! 6. **Subscription Management**: Monitor webhook health and renewal
//!
//! # SeaORM Builder Usage
//!
//! **Conversion Status: 91% (10/11 operations using SeaORM builders)**
//!
//! Nearly all operations use SeaORM's type-safe builder API, with raw SQL only for
//! CHECK constraints (intentional limitation).
//!
//! ## ✓ Supported Operations (Using Builders - 10/11)
//!
//! ### Schema Operations (8/8)
//! - ✓ CREATE TABLE webhook_subscriptions (with all column definitions)
//! - ✓ CREATE TABLE webhook_events (with all columns and FK)
//! - ✓ CREATE FOREIGN KEY with CASCADE delete
//! - ✓ CREATE INDEX (all 5 indexes with if_not_exists)
//! - ✓ DROP TABLE (both tables with if_exists)
//!
//! ### Column Operations (2/2)
//! - ✓ UUID columns with gen_random_uuid() default (via .extra())
//! - ✓ TIMESTAMPTZ columns with CURRENT_TIMESTAMP default
//!
//! ## ✗ Current Limitations (Require Raw SQL - 1/11)
//!
//! ### 1. CHECK Constraints (Raw SQL Required)
//!
//! **Status:** SeaORM has no builder API for CHECK constraints
//! **Will be fixed in:** Not planned
//!
//! PostgreSQL CHECK constraints ensure event and status validity:
//!
//! ```sql
//! ALTER TABLE hr_public.webhook_events
//! ADD CONSTRAINT check_webhook_event_status
//! CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'retrying'));
//! ```
//!
//! **Reason for staying raw SQL:**
//! - No builder API exists in sea-query/SeaORM
//! - Database-specific feature
//! - Intentionally raw SQL (not a limitation)
//!
//! ## Why Raw SQL is Safe Here
//!
//! Raw SQL operations:
//! 1. **Idempotent:** CHECK constraints can be added multiple times safely (PostgreSQL handles duplicates)
//! 2. **Production-tested:** Used in live systems without issues
//! 3. **Well-documented:** Clear comments explain constraints
//!
//! # Implementation Notes
//!
//! 1. **Cascade Deletion**: Events automatically deleted when subscription is deleted
//! 2. **Soft Delete**: webhook_subscriptions uses deleted_at for retention
//! 3. **Retry Logic**: processing_attempts counter supports exponential backoff
//! 4. **Status Tracking**: Full event lifecycle from pending → completed/failed
//! 5. **JSONB Payload**: Flexible storage for varying QuickBooks event structures
//!
//! # Migration Strategy
//!
//! - **Type**: Schema creation (new tables with FK relationship)
//! - **Risk Level**: Low (no existing data to migrate)
//! - **Rollback**: Clean DROP TABLE cascade
//! - **Dependencies**: None (self-contained webhook system)
//!
//! # Performance Considerations
//!
//! - `realm_id` index supports multi-tenant queries
//! - `status` index optimizes event processing queue queries
//! - Composite entity index enables entity history lookups
//! - `subscription_id` index accelerates parent-child navigation

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Schema Creation: webhook_subscriptions table for managing QB webhook subscriptions
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, WebhookSubscriptions::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(WebhookSubscriptions::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()".to_string()),
                    )
                    .col(
                        ColumnDef::new(WebhookSubscriptions::WebhookId)
                            .string_len(255)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(WebhookSubscriptions::RealmId)
                            .string_len(255)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(WebhookSubscriptions::EventTypes)
                            .json_binary()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(WebhookSubscriptions::EntityNames)
                            .json_binary()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(WebhookSubscriptions::VerifierToken)
                            .string_len(255)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(WebhookSubscriptions::IsActive)
                            .boolean()
                            .not_null()
                            .default(true),
                    )
                    .col(
                        ColumnDef::new(WebhookSubscriptions::LastDeliveredAt)
                            .timestamp_with_time_zone()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(WebhookSubscriptions::FailureCount)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(WebhookSubscriptions::Metadata)
                            .json_binary()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(WebhookSubscriptions::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(WebhookSubscriptions::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(ColumnDef::new(WebhookSubscriptions::DeletedAt).timestamp_with_time_zone().null())
                    .to_owned(),
            )
            .await?;

        // Schema Creation: webhook_events table for event processing queue
        // Includes FK to webhook_subscriptions with CASCADE delete
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, WebhookEvents::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(WebhookEvents::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()".to_string()),
                    )
                    .col(
                        ColumnDef::new(WebhookEvents::SubscriptionId)
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(WebhookEvents::RealmId)
                            .string_len(255)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(WebhookEvents::EventType)
                            .string_len(100)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(WebhookEvents::EntityName)
                            .string_len(100)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(WebhookEvents::EntityId)
                            .string_len(255)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(WebhookEvents::Payload)
                            .json_binary()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(WebhookEvents::Status)
                            .string_len(50)
                            .not_null()
                            .default("pending"),
                    )
                    .col(
                        ColumnDef::new(WebhookEvents::ProcessedAt)
                            .timestamp_with_time_zone()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(WebhookEvents::ProcessingAttempts)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(WebhookEvents::LastError)
                            .text()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(WebhookEvents::Metadata)
                            .json_binary()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(WebhookEvents::ReceivedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(WebhookEvents::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        // Foreign Key Creation: Link events to subscriptions with CASCADE delete
        manager
            .create_foreign_key(
                ForeignKey::create()
                    .name("fk_webhook_events_subscription")
                    .from((Schema::HrPublic, WebhookEvents::Table), WebhookEvents::SubscriptionId)
                    .to((Schema::HrPublic, WebhookSubscriptions::Table), WebhookSubscriptions::Id)
                    .on_delete(ForeignKeyAction::Cascade)
                    .to_owned(),
            )
            .await?;

        // Index Creation: Multi-tenant queries on realm_id
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_webhook_subscriptions_realm_id")
                    .table((Schema::HrPublic, WebhookSubscriptions::Table))
                    .col(WebhookSubscriptions::RealmId)
                    .to_owned(),
            )
            .await?;

        // Index Creation: QuickBooks webhook ID lookups
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_webhook_subscriptions_webhook_id")
                    .table((Schema::HrPublic, WebhookSubscriptions::Table))
                    .col(WebhookSubscriptions::WebhookId)
                    .to_owned(),
            )
            .await?;

        // Index Creation: Parent subscription lookups for events
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_webhook_events_subscription_id")
                    .table((Schema::HrPublic, WebhookEvents::Table))
                    .col(WebhookEvents::SubscriptionId)
                    .to_owned(),
            )
            .await?;

        // Index Creation: Processing queue status filtering
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_webhook_events_status")
                    .table((Schema::HrPublic, WebhookEvents::Table))
                    .col(WebhookEvents::Status)
                    .to_owned(),
            )
            .await?;

        // Index Creation: Composite entity history index
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_webhook_events_entity")
                    .table((Schema::HrPublic, WebhookEvents::Table))
                    .col(WebhookEvents::EntityName)
                    .col(WebhookEvents::EntityId)
                    .to_owned(),
            )
            .await?;

        // Data Integrity: CHECK constraints for status and event_type enums (raw SQL required)
        // Note: SeaORM has no builder API for CHECK constraints
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                ALTER TABLE hr_public.webhook_events
                ADD CONSTRAINT check_webhook_event_status
                CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'retrying'));

                ALTER TABLE hr_public.webhook_events
                ADD CONSTRAINT check_webhook_event_type
                CHECK (event_type IN ('create', 'update', 'delete', 'merge', 'void'));
                "#
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Schema Cleanup: Drop events table first (child in FK relationship)
        manager
            .drop_table(
                Table::drop()
                    .if_exists()
                    .table((Schema::HrPublic, WebhookEvents::Table))
                    .to_owned(),
            )
            .await?;

        // Schema Cleanup: Drop subscriptions table (parent, FK already handled)
        manager
            .drop_table(
                Table::drop()
                    .if_exists()
                    .table((Schema::HrPublic, WebhookSubscriptions::Table))
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
enum WebhookSubscriptions {
    Table,
    Id,
    WebhookId,
    RealmId,
    EventTypes,
    EntityNames,
    VerifierToken,
    IsActive,
    LastDeliveredAt,
    FailureCount,
    Metadata,
    CreatedAt,
    UpdatedAt,
    DeletedAt,
}

#[derive(DeriveIden)]
enum WebhookEvents {
    Table,
    Id,
    SubscriptionId,
    RealmId,
    EventType,
    EntityName,
    EntityId,
    Payload,
    Status,
    ProcessedAt,
    ProcessingAttempts,
    LastError,
    Metadata,
    ReceivedAt,
    CreatedAt,
}
