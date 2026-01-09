use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop the old constraint (might be 5-field version)
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                ALTER TABLE hr_public.sync_schedules
                DROP CONSTRAINT IF EXISTS valid_cron_expression
                "#,
            )
            .await?;

        // Add the correct 6-field constraint (second minute hour day month day_of_week)
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                ALTER TABLE hr_public.sync_schedules
                ADD CONSTRAINT valid_cron_expression
                CHECK (cron_expression ~ '^[0-9\*\/\,\-]+ [0-9\*\/\,\-]+ [0-9\*\/\,\-]+ [0-9\*\/\,\-]+ [0-9\*\/\,\-]+ [0-9\*\/\,\-]+$')
                "#,
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop the 6-field constraint
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                ALTER TABLE hr_public.sync_schedules
                DROP CONSTRAINT IF EXISTS valid_cron_expression
                "#,
            )
            .await?;

        // Restore the 5-field version (for compatibility with rollback)
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                ALTER TABLE hr_public.sync_schedules
                ADD CONSTRAINT valid_cron_expression
                CHECK (cron_expression ~ '^[0-9\*\/\,\-]+ [0-9\*\/\,\-]+ [0-9\*\/\,\-]+ [0-9\*\/\,\-]+ [0-9\*\/\,\-]+$')
                "#,
            )
            .await?;

        Ok(())
    }
}
