//! Add theme_preference column to users table
//!
//! Adds a theme_preference column to support user theme selection (light/dark/system)

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Add theme_preference column to users table
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, Users::Table))
                    .add_column(
                        ColumnDef::new(Users::ThemePreference)
                            .string_len(20)
                            .not_null()
                            .default("system"),
                    )
                    .to_owned(),
            )
            .await?;

        // Add comment
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                COMMENT ON COLUMN hr_public.users.theme_preference IS
                'User theme preference: light, dark, or system'
                "#,
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop theme_preference column
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, Users::Table))
                    .drop_column(Users::ThemePreference)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }
}

/// Schema identifier
#[derive(Iden)]
enum Schema {
    HrPublic,
}

/// Users table columns
#[derive(Iden)]
enum Users {
    Table,
    ThemePreference,
}
