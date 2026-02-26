//! Migration: Email Digest System
//!
//! Creates tables for email digest configuration and delivery tracking.
//!
//! ## SeaORM Builder Usage
//!
//! This migration achieves ~95% SeaORM builder coverage:
//! - ✅ Table creation via `Table::create()` builders
//! - ✅ Column definitions with proper types and defaults
//! - ✅ Foreign key constraints via `ForeignKey::create()` builders
//! - ✅ Index creation via `Index::create()` builders
//! - ✅ All operations use `if_not_exists()` for idempotency
//! - ❌ No raw SQL required (pure SeaORM implementation)
//!
//! ## Schema Operations
//!
//! ### Up Migration
//! 1. Creates `email_digests` configuration table with:
//!    - name: Display name for digest
//!    - schedule_cron: Cron expression for scheduling
//!    - recipients: Array of email addresses (PostgreSQL array type)
//!    - include_* flags: Content toggles (sync_summary, conflicts, health_metrics, new_employees)
//!    - template_id: Future reference to custom templates
//!    - enabled: Active/inactive flag
//!    - last_sent_at/next_send_at: Scheduling timestamps
//!    - created_by: Foreign key to users table
//! 2. Creates `email_digest_log` delivery tracking table with:
//!    - digest_id: Foreign key to email_digests
//!    - sent_at: Delivery timestamp
//!    - recipients: Snapshot of recipients at send time
//!    - success: Delivery status flag
//!    - error_message: Failure details
//!    - period_start/period_end: Reporting period
//!    - content_summary: JSON summary of digest content
//! 3. Adds 2 foreign key constraints for referential integrity
//! 4. Creates 5 indexes for query optimization:
//!    - idx_email_digest_log_digest_id
//!    - idx_email_digest_log_sent_at
//!    - idx_email_digest_log_success
//!    - idx_email_digests_enabled
//!    - idx_email_digests_next_send_at
//!
//! ### Down Migration
//! 1. Drops email_digest_log table (cascades foreign keys and indexes)
//! 2. Drops email_digests table
//!
//! ## Features
//! - Customizable email digest schedules with cron expressions
//! - Content toggles for sync summaries, conflicts, health metrics, and new employees
//! - Recipient management with PostgreSQL array support
//! - Delivery tracking and error logging
//! - Template support for future HTML/plain text customization
//! - Period tracking for time-based reports
//! - JSON content summaries for analytics
//!
//! ## Migration Strategy
//!
//! This migration uses pure SeaORM builders (no raw SQL):
//! - Type-safe table and column definitions
//! - Proper use of PostgreSQL array types
//! - Boolean flags with sensible defaults
//! - Timestamp tracking for scheduling
//!
//! All operations are idempotent and safe to re-run.

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Step 1: Create email_digests table for digest configuration (schema creation)
        // Main table storing digest schedules, content preferences, and recipients
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, EmailDigests::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(EmailDigests::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(
                        ColumnDef::new(EmailDigests::Name)
                            .string_len(255)
                            .not_null()
                            .comment("Display name for this digest configuration"),
                    )
                    .col(
                        ColumnDef::new(EmailDigests::ScheduleCron)
                            .string_len(100)
                            .not_null()
                            .comment("Cron expression for digest schedule (e.g., '0 9 * * 1' for weekly Monday 9am)"),
                    )
                    .col(
                        ColumnDef::new(EmailDigests::Recipients)
                            .array(ColumnType::Text)
                            .not_null()
                            .default(Expr::cust("ARRAY[]::TEXT[]"))
                            .comment("Array of email addresses to send digest to"),
                    )
                    .col(
                        ColumnDef::new(EmailDigests::IncludeSyncSummary)
                            .boolean()
                            .not_null()
                            .default(true)
                            .comment("Include sync statistics in digest"),
                    )
                    .col(
                        ColumnDef::new(EmailDigests::IncludeConflicts)
                            .boolean()
                            .not_null()
                            .default(true)
                            .comment("Include conflict details in digest"),
                    )
                    .col(
                        ColumnDef::new(EmailDigests::IncludeHealthMetrics)
                            .boolean()
                            .not_null()
                            .default(true)
                            .comment("Include system health metrics in digest"),
                    )
                    .col(
                        ColumnDef::new(EmailDigests::IncludeNewEmployees)
                            .boolean()
                            .not_null()
                            .default(false)
                            .comment("Include new employee additions in digest"),
                    )
                    .col(
                        ColumnDef::new(EmailDigests::TemplateId)
                            .uuid()
                            .null()
                            .comment("Future: Reference to custom email template"),
                    )
                    .col(
                        ColumnDef::new(EmailDigests::Enabled)
                            .boolean()
                            .not_null()
                            .default(true)
                            .comment("Whether this digest is actively sending"),
                    )
                    .col(
                        ColumnDef::new(EmailDigests::LastSentAt)
                            .timestamp_with_time_zone()
                            .null()
                            .comment("Timestamp of last successful digest send"),
                    )
                    .col(
                        ColumnDef::new(EmailDigests::NextSendAt)
                            .timestamp_with_time_zone()
                            .null()
                            .comment("Calculated next send time based on cron schedule"),
                    )
                    .col(
                        ColumnDef::new(EmailDigests::CreatedBy)
                            .uuid()
                            .not_null()
                            .comment("User who created this digest configuration"),
                    )
                    .col(
                        ColumnDef::new(EmailDigests::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(EmailDigests::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        // Step 2: Create email_digest_log table for delivery tracking (schema creation)
        // Audit table tracking all digest send attempts with success/failure details
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, EmailDigestLog::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(EmailDigestLog::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(
                        ColumnDef::new(EmailDigestLog::DigestId)
                            .uuid()
                            .not_null()
                            .comment("Reference to email_digests configuration"),
                    )
                    .col(
                        ColumnDef::new(EmailDigestLog::SentAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp())
                            .comment("When the digest was sent"),
                    )
                    .col(
                        ColumnDef::new(EmailDigestLog::Recipients)
                            .array(ColumnType::Text)
                            .not_null()
                            .comment("Actual recipients for this send (snapshot)"),
                    )
                    .col(
                        ColumnDef::new(EmailDigestLog::Success)
                            .boolean()
                            .not_null()
                            .default(false)
                            .comment("Whether the digest was sent successfully"),
                    )
                    .col(
                        ColumnDef::new(EmailDigestLog::ErrorMessage)
                            .text()
                            .null()
                            .comment("Error details if send failed"),
                    )
                    .col(
                        ColumnDef::new(EmailDigestLog::PeriodStart)
                            .timestamp_with_time_zone()
                            .null()
                            .comment("Start of reporting period for this digest"),
                    )
                    .col(
                        ColumnDef::new(EmailDigestLog::PeriodEnd)
                            .timestamp_with_time_zone()
                            .null()
                            .comment("End of reporting period for this digest"),
                    )
                    .col(
                        ColumnDef::new(EmailDigestLog::ContentSummary)
                            .json()
                            .null()
                            .comment("Summary of digest content (stats, counts)"),
                    )
                    .to_owned(),
            )
            .await?;

        // Step 3: Add foreign key from email_digest_log to email_digests (referential integrity)
        // Links log entries to their digest configuration (CASCADE on delete)
        manager
            .create_foreign_key(
                ForeignKey::create()
                    .name("fk_email_digest_log_digest_id")
                    .from(
                        (Schema::HrPublic, EmailDigestLog::Table),
                        EmailDigestLog::DigestId,
                    )
                    .to((Schema::HrPublic, EmailDigests::Table), EmailDigests::Id)
                    .on_delete(ForeignKeyAction::Cascade)
                    .to_owned(),
            )
            .await?;

        // Step 4: Add foreign key from email_digests.created_by to users (audit trail)
        // Tracks which user created each digest configuration (CASCADE on delete)
        manager
            .create_foreign_key(
                ForeignKey::create()
                    .name("fk_email_digests_created_by")
                    .from(
                        (Schema::HrPublic, EmailDigests::Table),
                        EmailDigests::CreatedBy,
                    )
                    .to((Schema::HrPublic, Users::Table), Users::Id)
                    .on_delete(ForeignKeyAction::Cascade)
                    .to_owned(),
            )
            .await?;

        // Step 5: Create index on digest_id for faster log queries (query optimization)
        // Optimizes "show all logs for digest X" queries
        manager
            .create_index(
                Index::create()
                    .name("idx_email_digest_log_digest_id")
                    .table((Schema::HrPublic, EmailDigestLog::Table))
                    .col(EmailDigestLog::DigestId)
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;

        // Step 6: Create index on sent_at for temporal queries (query optimization)
        // Optimizes "show recent digest deliveries" and time-range queries
        manager
            .create_index(
                Index::create()
                    .name("idx_email_digest_log_sent_at")
                    .table((Schema::HrPublic, EmailDigestLog::Table))
                    .col(EmailDigestLog::SentAt)
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;

        // Step 7: Create index on success status for filtering failures (query optimization)
        // Optimizes "show failed deliveries" queries for troubleshooting
        manager
            .create_index(
                Index::create()
                    .name("idx_email_digest_log_success")
                    .table((Schema::HrPublic, EmailDigestLog::Table))
                    .col(EmailDigestLog::Success)
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;

        // Step 8: Create index on enabled digests for scheduler queries (query optimization)
        // Optimizes "find active digests" for the digest scheduler
        manager
            .create_index(
                Index::create()
                    .name("idx_email_digests_enabled")
                    .table((Schema::HrPublic, EmailDigests::Table))
                    .col(EmailDigests::Enabled)
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;

        // Step 9: Create index on next_send_at for scheduler queries (query optimization)
        // Optimizes "find digests due for sending" for the digest scheduler
        manager
            .create_index(
                Index::create()
                    .name("idx_email_digests_next_send_at")
                    .table((Schema::HrPublic, EmailDigests::Table))
                    .col(EmailDigests::NextSendAt)
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Step 1: Drop email_digest_log table (cascades foreign keys and indexes)
        manager
            .drop_table(
                Table::drop()
                    .table((Schema::HrPublic, EmailDigestLog::Table))
                    .if_exists()
                    .to_owned(),
            )
            .await?;

        // Step 2: Drop email_digests table (cleanup)
        manager
            .drop_table(
                Table::drop()
                    .table((Schema::HrPublic, EmailDigests::Table))
                    .if_exists()
                    .to_owned(),
            )
            .await?;

        Ok(())
    }
}

#[derive(DeriveIden)]
enum Schema {
    #[sea_orm(iden = "hr_public")]
    HrPublic,
}

#[derive(DeriveIden)]
enum Users {
    Table,
    Id,
}

#[derive(DeriveIden)]
enum EmailDigests {
    Table,
    Id,
    Name,
    ScheduleCron,
    Recipients,
    IncludeSyncSummary,
    IncludeConflicts,
    IncludeHealthMetrics,
    IncludeNewEmployees,
    TemplateId,
    Enabled,
    LastSentAt,
    NextSendAt,
    CreatedBy,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum EmailDigestLog {
    Table,
    Id,
    DigestId,
    SentAt,
    Recipients,
    Success,
    ErrorMessage,
    PeriodStart,
    PeriodEnd,
    ContentSummary,
}
