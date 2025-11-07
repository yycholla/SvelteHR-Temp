use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop sidebar tables in reverse dependency order

        // Drop sidebar_layouts (references sidebar_sections and sidebar_items)
        manager
            .get_connection()
            .execute_unprepared("DROP TABLE IF EXISTS hr_public.sidebar_layouts CASCADE")
            .await?;

        // Drop sidebar_sections
        manager
            .get_connection()
            .execute_unprepared("DROP TABLE IF EXISTS hr_public.sidebar_sections CASCADE")
            .await?;

        // Drop sidebar_items
        manager
            .get_connection()
            .execute_unprepared("DROP TABLE IF EXISTS hr_public.sidebar_items CASCADE")
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // This migration is not reversible - sidebar management is being removed permanently
        // If you need to restore it, use the original migrations
        Ok(())
    }
}
