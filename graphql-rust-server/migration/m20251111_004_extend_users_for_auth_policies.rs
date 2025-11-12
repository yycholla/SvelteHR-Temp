use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // NOTE: failed_login_attempts already exists in users table from m20251017_003_auth
        // NOTE: locked_until already exists in users table from m20251017_003_auth
        // We're adding account_locked and password_last_changed fields

        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, Users::Table))
                    .add_column_if_not_exists(
                        ColumnDef::new(Users::AccountLocked)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .add_column_if_not_exists(
                        ColumnDef::new(Users::PasswordLastChanged)
                            .timestamp_with_time_zone()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        // Create index for account lockout queries
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_users_account_locked")
                    .table((Schema::HrPublic, Users::Table))
                    .col(Users::AccountLocked)
                    .to_owned(),
            )
            .await?;

        // Create index for password expiration queries
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_users_password_last_changed")
                    .table((Schema::HrPublic, Users::Table))
                    .col(Users::PasswordLastChanged)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop indexes first
        manager
            .drop_index(
                Index::drop()
                    .name("idx_users_password_last_changed")
                    .table((Schema::HrPublic, Users::Table))
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .name("idx_users_account_locked")
                    .table((Schema::HrPublic, Users::Table))
                    .to_owned(),
            )
            .await?;

        // Drop columns
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, Users::Table))
                    .drop_column(Users::AccountLocked)
                    .drop_column(Users::PasswordLastChanged)
                    .to_owned(),
            )
            .await
    }
}

#[derive(Iden)]
enum Schema {
    HrPublic,
}

#[derive(Iden)]
enum Users {
    Table,
    AccountLocked,
    PasswordLastChanged,
}
