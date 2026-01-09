use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop the generated constraint from display_name and make it a regular column
        // We need to:
        // 1. Drop the generated column
        // 2. Recreate it as a regular NOT NULL column with a default based on first_name + last_name

        manager
            .get_connection()
            .execute_unprepared(
                r#"
                ALTER TABLE hr_public.users
                DROP COLUMN display_name;
                "#,
            )
            .await?;

        manager
            .get_connection()
            .execute_unprepared(
                r#"
                ALTER TABLE hr_public.users
                ADD COLUMN display_name VARCHAR NOT NULL DEFAULT '';
                "#,
            )
            .await?;

        // Set display_name to first_name + last_name for existing users
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                UPDATE hr_public.users
                SET display_name = first_name || ' ' || last_name;
                "#,
            )
            .await?;

        // Add preferred_name column (nullable)
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, Users::Table))
                    .add_column(
                        ColumnDef::new(Users::PreferredName)
                            .string()
                            .null()
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Remove preferred_name column
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, Users::Table))
                    .drop_column(Users::PreferredName)
                    .to_owned(),
            )
            .await?;

        // Convert display_name back to a generated column
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                ALTER TABLE hr_public.users
                DROP COLUMN display_name;
                "#,
            )
            .await?;

        manager
            .get_connection()
            .execute_unprepared(
                r#"
                ALTER TABLE hr_public.users
                ADD COLUMN display_name VARCHAR NOT NULL
                GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED;
                "#,
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
    PreferredName,
}
