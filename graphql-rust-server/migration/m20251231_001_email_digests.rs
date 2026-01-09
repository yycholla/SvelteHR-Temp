//! Migration: Email Digest System
//!
//! Creates tables for email digest configuration and delivery tracking.
//!
//! Features:
//! - Customizable email digest schedules with cron expressions
//! - Content toggles for sync summaries, conflicts, health metrics, and new employees
//! - Recipient management with array support
//! - Delivery tracking and error logging
//! - Template support for future HTML/plain text customization

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create email_digests table for digest configuration
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

        // Create email_digest_log table for delivery tracking
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

        // Add foreign key from email_digest_log to email_digests
        manager
            .create_foreign_key(
                ForeignKey::create()
                    .name("fk_email_digest_log_digest_id")
                    .from((Schema::HrPublic, EmailDigestLog::Table), EmailDigestLog::DigestId)
                    .to((Schema::HrPublic, EmailDigests::Table), EmailDigests::Id)
                    .on_delete(ForeignKeyAction::Cascade)
                    .to_owned(),
            )
            .await?;

        // Add foreign key from email_digests.created_by to users
        manager
            .create_foreign_key(
                ForeignKey::create()
                    .name("fk_email_digests_created_by")
                    .from((Schema::HrPublic, EmailDigests::Table), EmailDigests::CreatedBy)
                    .to((Schema::HrPublic, Users::Table), Users::Id)
                    .on_delete(ForeignKeyAction::Cascade)
                    .to_owned(),
            )
            .await?;

        // Create index on digest_id for faster log queries
        manager
            .create_index(
                Index::create()
                    .name("idx_email_digest_log_digest_id")
                    .table((Schema::HrPublic, EmailDigestLog::Table))
                    .col(EmailDigestLog::DigestId)
                    .to_owned(),
            )
            .await?;

        // Create index on sent_at for temporal queries
        manager
            .create_index(
                Index::create()
                    .name("idx_email_digest_log_sent_at")
                    .table((Schema::HrPublic, EmailDigestLog::Table))
                    .col(EmailDigestLog::SentAt)
                    .to_owned(),
            )
            .await?;

        // Create index on success status for filtering failures
        manager
            .create_index(
                Index::create()
                    .name("idx_email_digest_log_success")
                    .table((Schema::HrPublic, EmailDigestLog::Table))
                    .col(EmailDigestLog::Success)
                    .to_owned(),
            )
            .await?;

        // Create index on enabled digests for scheduler queries
        manager
            .create_index(
                Index::create()
                    .name("idx_email_digests_enabled")
                    .table((Schema::HrPublic, EmailDigests::Table))
                    .col(EmailDigests::Enabled)
                    .to_owned(),
            )
            .await?;

        // Create index on next_send_at for scheduler queries
        manager
            .create_index(
                Index::create()
                    .name("idx_email_digests_next_send_at")
                    .table((Schema::HrPublic, EmailDigests::Table))
                    .col(EmailDigests::NextSendAt)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop email_digest_log table (cascade will handle foreign keys)
        manager
            .drop_table(
                Table::drop()
                    .table((Schema::HrPublic, EmailDigestLog::Table))
                    .if_exists()
                    .to_owned(),
            )
            .await?;

        // Drop email_digests table
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
