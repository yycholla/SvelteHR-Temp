use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Add tokens_valid_after column to users table
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, Users::Table))
                    .add_column(
                        ColumnDef::new(Users::TokensValidAfter)
                            .timestamp_with_time_zone()
                            .not_null()
                            .extra("DEFAULT NOW()".to_string()),
                    )
                    .to_owned(),
            )
            .await?;

        // Create index for fast token validation lookups
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_users_token_valid")
                    .table((Schema::HrPublic, Users::Table))
                    .col(Users::Id)
                    .col(Users::TokensValidAfter)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop index first
        manager
            .drop_index(
                Index::drop()
                    .name("idx_users_token_valid")
                    .table((Schema::HrPublic, Users::Table))
                    .to_owned(),
            )
            .await?;

        // Drop column
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, Users::Table))
                    .drop_column(Users::TokensValidAfter)
                    .to_owned(),
            )
            .await
    }
}

#[derive(DeriveIden)]
enum Schema {
    HrPublic,
}

#[derive(DeriveIden)]
enum Users {
    Table,
    Id,
    TokensValidAfter,
}
