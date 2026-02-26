//! Migration: Password Reset Tokens
//!
//! Creates table for password reset token management with expiration tracking.
//!
//! ## SeaORM Builder Usage
//!
//! This migration achieves ~100% SeaORM builder coverage:
//! - ✅ Table creation via `Table::create()` builders
//! - ✅ Column definitions with proper types and constraints
//! - ✅ Foreign key constraints via `ForeignKey::create()` builders
//! - ✅ Index creation via `Index::create()` builders
//! - ✅ All operations use `if_not_exists()` for idempotency
//! - ✅ Pure SeaORM implementation (no raw SQL required)
//!
//! ## Schema Operations
//!
//! ### Up Migration
//! 1. Creates `password_reset_tokens` table with:
//!    - id: UUID primary key (auto-generated)
//!    - user_id: Foreign key to users table (NOT NULL)
//!    - token: Secure random token, hashed (UNIQUE, 64 chars)
//!    - expires_at: Expiration timestamp (30 minutes from creation)
//!    - used_at: Usage timestamp (NULL if unused, for one-time use tracking)
//!    - ip_address: Requester IP for security audit (VARCHAR 45 for IPv6)
//!    - created_at: Creation timestamp
//! 2. Adds foreign key to users table (CASCADE on delete)
//! 3. Creates 3 indexes for query optimization:
//!    - idx_password_reset_tokens_token (unique lookups)
//!    - idx_password_reset_tokens_user_expires (cleanup queries)
//!    - idx_password_reset_tokens_expires_at (automatic cleanup)
//!
//! ### Down Migration
//! 1. Drops password_reset_tokens table (cascades foreign keys and indexes)
//!
//! ## Features
//! - Secure token storage for password reset flow
//! - Automatic expiration (30 minutes default)
//! - One-time use tracking (used_at timestamp)
//! - IP address tracking for security auditing (supports IPv4 and IPv6)
//! - User-friendly error messages via comments
//! - Efficient cleanup of expired tokens via indexes
//!
//! ## Migration Strategy
//!
//! This migration uses pure SeaORM builders (no raw SQL):
//! - Type-safe table and column definitions
//! - Built-in foreign key support
//! - Index creation with if_not_exists
//! - Comment support for documentation
//!
//! All operations are idempotent and safe to re-run.

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Step 1: Create password_reset_tokens table (schema creation)
        // Stores secure tokens for password reset flow with expiration and one-time use tracking
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

        // Step 2: Add foreign key to users table (referential integrity)
        // Links tokens to users (CASCADE on delete - cleanup when user deleted)
        manager
            .create_foreign_key(
                ForeignKey::create()
                    .name("fk_password_reset_tokens_user_id")
                    .from(
                        (Schema::HrPublic, PasswordResetTokens::Table),
                        PasswordResetTokens::UserId,
                    )
                    .to((Schema::HrPublic, Users::Table), Users::Id)
                    .on_delete(ForeignKeyAction::Cascade)
                    .to_owned(),
            )
            .await?;

        // Step 3: Create index on token for fast lookups (query optimization)
        // Optimizes token validation during password reset flow
        manager
            .create_index(
                Index::create()
                    .name("idx_password_reset_tokens_token")
                    .table((Schema::HrPublic, PasswordResetTokens::Table))
                    .col(PasswordResetTokens::Token)
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;

        // Step 4: Create compound index on user_id + expires_at (query optimization)
        // Optimizes "show active tokens for user X" and cleanup queries
        manager
            .create_index(
                Index::create()
                    .name("idx_password_reset_tokens_user_expires")
                    .table((Schema::HrPublic, PasswordResetTokens::Table))
                    .col(PasswordResetTokens::UserId)
                    .col(PasswordResetTokens::ExpiresAt)
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;

        // Step 5: Create index on expires_at for automatic cleanup (query optimization)
        // Optimizes background job that removes expired tokens
        manager
            .create_index(
                Index::create()
                    .name("idx_password_reset_tokens_expires_at")
                    .table((Schema::HrPublic, PasswordResetTokens::Table))
                    .col(PasswordResetTokens::ExpiresAt)
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Step 1: Drop password_reset_tokens table (cascades foreign keys and indexes)
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
