use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, RefreshTokens::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(RefreshTokens::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()".to_string()),
                    )
                    .col(ColumnDef::new(RefreshTokens::UserId).uuid().not_null())
                    .col(ColumnDef::new(RefreshTokens::TokenHash).text().not_null())
                    .col(
                        ColumnDef::new(RefreshTokens::TokenFamilyId)
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(RefreshTokens::ExpiresAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(RefreshTokens::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .extra("DEFAULT NOW()".to_string()),
                    )
                    .col(
                        ColumnDef::new(RefreshTokens::LastUsedAt)
                            .timestamp_with_time_zone()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(RefreshTokens::RevokedAt)
                            .timestamp_with_time_zone()
                            .null(),
                    )
                    .col(ColumnDef::new(RefreshTokens::DeviceInfo).text().null())
                    .col(ColumnDef::new(RefreshTokens::IpAddress).string().null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_refresh_tokens_user_id")
                            .from(
                                (Schema::HrPublic, RefreshTokens::Table),
                                RefreshTokens::UserId,
                            )
                            .to((Schema::HrPublic, Users::Table), Users::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // Create index for user tokens lookup
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_refresh_tokens_user_tokens")
                    .table((Schema::HrPublic, RefreshTokens::Table))
                    .col(RefreshTokens::UserId)
                    .col(RefreshTokens::RevokedAt)
                    .to_owned(),
            )
            .await?;

        // Create index for token hash lookup (fast validation)
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_refresh_tokens_token_hash")
                    .table((Schema::HrPublic, RefreshTokens::Table))
                    .col(RefreshTokens::TokenHash)
                    .to_owned(),
            )
            .await?;

        // Create index for expiration cleanup
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_refresh_tokens_expires")
                    .table((Schema::HrPublic, RefreshTokens::Table))
                    .col(RefreshTokens::ExpiresAt)
                    .to_owned(),
            )
            .await?;

        // Create composite index for token lookup (most common query)
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_refresh_tokens_lookup")
                    .table((Schema::HrPublic, RefreshTokens::Table))
                    .col(RefreshTokens::TokenHash)
                    .col(RefreshTokens::ExpiresAt)
                    .col(RefreshTokens::RevokedAt)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(
                Table::drop()
                    .table((Schema::HrPublic, RefreshTokens::Table))
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
enum RefreshTokens {
    Table,
    Id,
    UserId,
    TokenHash,
    TokenFamilyId,
    ExpiresAt,
    CreatedAt,
    LastUsedAt,
    RevokedAt,
    DeviceInfo,
    IpAddress,
}

#[derive(DeriveIden)]
enum Users {
    Table,
    Id,
}
