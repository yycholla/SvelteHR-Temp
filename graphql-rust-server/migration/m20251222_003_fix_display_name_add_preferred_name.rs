use sea_orm_migration::prelude::*;

use super::migration_helpers::MigrationHelpers;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop the generated constraint from display_name and make it a regular column
        // We need to:
        // 1. Drop the generated column (if it exists)
        // 2. Recreate it as a regular NOT NULL column with a default based on first_name + last_name

        MigrationHelpers::execute_idempotent(
            manager,
            r#"
                ALTER TABLE hr_public.users
                DROP COLUMN IF EXISTS display_name;
                "#,
            "Drop generated display_name column",
        )
        .await?;

        MigrationHelpers::add_column_if_not_exists(
            manager,
            "hr_public.users",
            "display_name VARCHAR NOT NULL DEFAULT ''",
        )
        .await?;

        // Set display_name to first_name + last_name for existing users
        // Safe to run multiple times - just updates the value
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                UPDATE hr_public.users
                SET display_name = first_name || ' ' || last_name
                WHERE display_name = '' OR display_name IS NULL;
                "#,
            )
            .await?;

        // Add preferred_name column (nullable)
        MigrationHelpers::add_column_if_not_exists(
            manager,
            "hr_public.users",
            "preferred_name VARCHAR",
        )
        .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Remove preferred_name column
        MigrationHelpers::execute_idempotent(
            manager,
            "ALTER TABLE hr_public.users DROP COLUMN IF EXISTS preferred_name",
            "Drop preferred_name column",
        )
        .await?;

        // Convert display_name back to a generated column
        MigrationHelpers::execute_idempotent(
            manager,
            r#"
                ALTER TABLE hr_public.users
                DROP COLUMN IF EXISTS display_name;
                "#,
            "Drop display_name column",
        )
        .await?;

        MigrationHelpers::execute_idempotent(
            manager,
            r#"
                ALTER TABLE hr_public.users
                ADD COLUMN IF NOT EXISTS display_name VARCHAR NOT NULL
                GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED;
                "#,
            "Recreate display_name as generated column",
        )
        .await?;

        Ok(())
    }
}
