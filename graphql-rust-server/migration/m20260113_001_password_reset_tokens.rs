//! Migration: Password Reset Tokens
//!
//! Creates table for password reset token management with expiration tracking.
//!
//! Features:
//! - Secure token storage for password reset flow
//! - Automatic expiration (30 minutes)
//! - One-time use tracking
//! - IP address tracking for security auditing

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create password_reset_tokens table
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, PasswordResetTokens::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(PasswordResetTokens::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(
                        ColumnDef::new(PasswordResetTokens::UserId)
                            .uuid()
                            .not_null()
                            .comment("User requesting password reset"),
                    )
                    .col(
                        ColumnDef::new(PasswordResetTokens::Token)
                            .string_len(64)
                            .not_null()
                            .unique_key()
                            .comment("Secure random token (hashed)"),
                    )
                    .col(
                        ColumnDef::new(PasswordResetTokens::ExpiresAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .comment("Token expiration time (30 minutes from creation)"),
                    )
                    .col(
                        ColumnDef::new(PasswordResetTokens::UsedAt)
                            .timestamp_with_time_zone()
                            .null()
                            .comment("When token was used (null if unused)"),
                    )
                    .col(
                        ColumnDef::new(PasswordResetTokens::IpAddress)
                            .string_len(45)
                            .null()
                            .comment("IP address that requested the reset"),
                    )
                    .col(
                        ColumnDef::new(PasswordResetTokens::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        // Add foreign key to users table
        manager
            .create_foreign_key(
                ForeignKey::create()
                    .name("fk_password_reset_tokens_user_id")
                    .from((Schema::HrPublic, PasswordResetTokens::Table), PasswordResetTokens::UserId)
                    .to((Schema::HrPublic, Users::Table), Users::Id)
                    .on_delete(ForeignKeyAction::Cascade)
                    .to_owned(),
            )
            .await?;

        // Create index on token for fast lookups
        manager
            .create_index(
                Index::create()
                    .name("idx_password_reset_tokens_token")
                    .table((Schema::HrPublic, PasswordResetTokens::Table))
                    .col(PasswordResetTokens::Token)
                    .to_owned(),
            )
            .await?;

        // Create index on user_id + expires_at for cleanup queries
        manager
            .create_index(
                Index::create()
                    .name("idx_password_reset_tokens_user_expires")
                    .table((Schema::HrPublic, PasswordResetTokens::Table))
                    .col(PasswordResetTokens::UserId)
                    .col(PasswordResetTokens::ExpiresAt)
                    .to_owned(),
            )
            .await?;

        // Create index on expires_at for automatic cleanup
        manager
            .create_index(
                Index::create()
                    .name("idx_password_reset_tokens_expires_at")
                    .table((Schema::HrPublic, PasswordResetTokens::Table))
                    .col(PasswordResetTokens::ExpiresAt)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop password_reset_tokens table
        manager
            .drop_table(
                Table::drop()
                    .table((Schema::HrPublic, PasswordResetTokens::Table))
                    .if_exists()
                    .to_owned(),
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
    Id,
}

#[derive(DeriveIden)]
enum PasswordResetTokens {
    Table,
    Id,
    UserId,
    Token,
    ExpiresAt,
    UsedAt,
    IpAddress,
    CreatedAt,
}
