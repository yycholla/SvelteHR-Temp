//! Migration: Add accessed_at column to document_access_logs
//!
//! Adds nullable accessed_at column to track when documents are actually accessed
//! (viewed/downloaded) as opposed to when the log entry was created.

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Add accessed_at column (nullable) to document_access_logs table
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, DocumentAccessLogs::Table))
                    .add_column(
                        ColumnDef::new(DocumentAccessLogs::AccessedAt)
                            .timestamp_with_time_zone()
                            .null()  // Nullable - only set for actual accesses, not uploads
                    )
                    .to_owned(),
            )
            .await?;

        // Create index on accessed_at for efficient queries on access patterns
        manager
            .create_index(
                Index::create()
                    .name("idx_document_access_logs_accessed_at")
                    .table((Schema::HrPublic, DocumentAccessLogs::Table))
                    .col(DocumentAccessLogs::AccessedAt)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop index
        manager
            .drop_index(
                Index::drop()
                    .name("idx_document_access_logs_accessed_at")
                    .table((Schema::HrPublic, DocumentAccessLogs::Table))
                    .to_owned(),
            )
            .await?;

        // Remove accessed_at column
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, DocumentAccessLogs::Table))
                    .drop_column(DocumentAccessLogs::AccessedAt)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }
}

#[derive(Iden)]
enum Schema { HrPublic }

#[derive(Iden)]
enum DocumentAccessLogs {
    Table,
    AccessedAt,
}
