use sea_orm_migration::prelude::*;

use super::migration_helpers::MigrationHelpers;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Add enhanced tracking fields to intuit_sync_log table
        MigrationHelpers::add_columns_if_not_exist(
            manager,
            "hr_public.intuit_sync_log",
            &[
                "change_direction TEXT",
                "conflict_detected BOOLEAN NOT NULL DEFAULT FALSE",
                "conflict_resolution TEXT",
                "pushed_count INTEGER NOT NULL DEFAULT 0",
                "pulled_count INTEGER NOT NULL DEFAULT 0",
                "updated_count INTEGER NOT NULL DEFAULT 0",
                "skipped_count INTEGER NOT NULL DEFAULT 0",
                "retry_count INTEGER NOT NULL DEFAULT 0",
                "next_retry_at TIMESTAMPTZ",
                "quickbooks_metadata JSONB",
            ],
        )
        .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop enhanced tracking fields from intuit_sync_log table
        MigrationHelpers::execute_idempotent(
            manager,
            "ALTER TABLE hr_public.intuit_sync_log
                DROP COLUMN IF EXISTS quickbooks_metadata,
                DROP COLUMN IF EXISTS next_retry_at,
                DROP COLUMN IF EXISTS retry_count,
                DROP COLUMN IF EXISTS skipped_count,
                DROP COLUMN IF EXISTS updated_count,
                DROP COLUMN IF EXISTS pulled_count,
                DROP COLUMN IF EXISTS pushed_count,
                DROP COLUMN IF EXISTS conflict_resolution,
                DROP COLUMN IF EXISTS conflict_detected,
                DROP COLUMN IF EXISTS change_direction",
            "Drop enhanced tracking fields from intuit_sync_log",
        )
        .await?;

        Ok(())
    }
}
