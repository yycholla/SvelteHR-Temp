//! Extends time_entries table for hexagonal sync architecture
//!
//! Adds:
//! - last_modified_at: Timestamp for incremental sync
//! - quickbooks_sync_token: QuickBooks optimistic locking
//! - Renames sync_status -> sync_state for clarity

use sea_orm::ConnectionTrait;
use sea_orm::Statement;
use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // 1. Add last_modified_at column
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, TimeEntries::Table))
                    .add_column(
                        ColumnDef::new(TimeEntries::LastModifiedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp())
                    )
                    .to_owned(),
            )
            .await?;

        // 2. Add quickbooks_sync_token column
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, TimeEntries::Table))
                    .add_column(
                        ColumnDef::new(TimeEntries::QuickbooksSyncToken)
                            .string()
                            .null()
                    )
                    .to_owned(),
            )
            .await?;

        // 3. Backfill last_modified_at from updated_at
        let db = manager.get_connection();
        db.execute(Statement::from_string(
            manager.get_database_backend(),
            "UPDATE hr_public.time_entries
             SET last_modified_at = updated_at
             WHERE last_modified_at IS NULL".to_string(),
        ))
        .await?;

        // 4. Rename sync_status to sync_state
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, TimeEntries::Table))
                    .rename_column(TimeEntries::SyncStatus, TimeEntries::SyncState)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, TimeEntries::Table))
                    .rename_column(TimeEntries::SyncState, TimeEntries::SyncStatus)
                    .to_owned(),
            )
            .await?;

        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, TimeEntries::Table))
                    .drop_column(TimeEntries::QuickbooksSyncToken)
                    .drop_column(TimeEntries::LastModifiedAt)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }
}

#[derive(Iden)]
enum Schema {
    HrPublic,
}

#[derive(Iden)]
enum TimeEntries {
    Table,
    SyncStatus,
    SyncState,
    LastModifiedAt,
    QuickbooksSyncToken,
}
