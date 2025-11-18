//! Add force_password_change column to users table
//!
//! Adds a force_password_change boolean column to support temporary passwords
//! that must be changed on next login (for bulk imports and password resets)

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Add force_password_change column to users table
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, Users::Table))
                    .add_column(
                        ColumnDef::new(Users::ForcePasswordChange)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .to_owned(),
            )
            .await?;

        // Add comment explaining the column's purpose
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                COMMENT ON COLUMN hr_public.users.force_password_change IS
                'Requires user to change password on next login (for temporary/bulk-imported passwords)'
                "#,
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop force_password_change column
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, Users::Table))
                    .drop_column(Users::ForcePasswordChange)
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
    ForcePasswordChange,
}
