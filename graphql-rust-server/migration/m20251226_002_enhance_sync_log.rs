use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Add enhanced tracking fields to intuit_sync_log table
        manager
            .get_connection()
            .execute_unprepared(
                "ALTER TABLE hr_public.intuit_sync_log
                ADD COLUMN change_direction TEXT,
                ADD COLUMN conflict_detected BOOLEAN NOT NULL DEFAULT FALSE,
                ADD COLUMN conflict_resolution TEXT,
                ADD COLUMN pushed_count INTEGER NOT NULL DEFAULT 0,
                ADD COLUMN pulled_count INTEGER NOT NULL DEFAULT 0,
                ADD COLUMN updated_count INTEGER NOT NULL DEFAULT 0,
                ADD COLUMN skipped_count INTEGER NOT NULL DEFAULT 0,
                ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0,
                ADD COLUMN next_retry_at TIMESTAMPTZ,
                ADD COLUMN quickbooks_metadata JSONB"
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop enhanced tracking fields from intuit_sync_log table
        manager
            .get_connection()
            .execute_unprepared(
                "ALTER TABLE hr_public.intuit_sync_log
                DROP COLUMN quickbooks_metadata,
                DROP COLUMN next_retry_at,
                DROP COLUMN retry_count,
                DROP COLUMN skipped_count,
                DROP COLUMN updated_count,
                DROP COLUMN pulled_count,
                DROP COLUMN pushed_count,
                DROP COLUMN conflict_resolution,
                DROP COLUMN conflict_detected,
                DROP COLUMN change_direction"
            )
            .await?;

        Ok(())
    }
}
