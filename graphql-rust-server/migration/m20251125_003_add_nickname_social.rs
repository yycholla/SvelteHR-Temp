//! Migration: Add nickname and social media release fields to users table
//!
//! This migration adds:
//! - Nickname: Preferred name for informal communication
//! - Social media release: Consent flag for public social media posts
//!
//! ## SeaORM Builder Usage: 100% Converted (3/3 operations)
//!
//! All schema operations use SeaORM builders with proper idempotency.
//!
//! ### Operations (SeaORM Builders - 3 operations):
//!
//! **Up Migration:**
//! 1. ALTER TABLE users ADD COLUMN nickname (varchar)
//!    - Using: `manager.alter_table()` with Table::alter().add_column_if_not_exists() builder
//!    - Nullable for backward compatibility (not all users have nicknames)
//!    - IF NOT EXISTS for idempotency (converted from non-idempotent add_column)
//!
//! 2. ALTER TABLE users ADD COLUMN social_media_release (boolean)
//!    - Using: `manager.alter_table()` with Table::alter().add_column_if_not_exists() builder
//!    - Default: false (opt-in for social media content usage)
//!    - IF NOT EXISTS for idempotency (converted from non-idempotent add_column)
//!
//! **Down Migration:**
//! 3. ALTER TABLE users DROP COLUMN (2 columns)
//!    - Using: `manager.alter_table()` with Table::alter().drop_column() builder
//!    - Removes both nickname and social_media_release columns
//!
//! ### Migration Strategy
//!
//! This is a **schema extension migration** that:
//! - Adds nickname for personalized communication (informal contexts)
//! - Adds social media consent flag (GDPR/privacy compliance)
//! - Maintains backward compatibility (nullable nickname, false default for consent)
//! - Enables social media integration with proper consent
//!
//! **Use Cases:**
//! - Nickname: Display preferred name in informal contexts (chat, casual emails)
//! - Social media release: Track employee consent for:
//!   - Company social media posts featuring employees
//!   - Public blog posts with employee quotes
//!   - Marketing materials with employee testimonials
//!   - Team photos on company website
//!
//! **Privacy Compliance:**
//! - social_media_release defaults to false (opt-in, not opt-out)
//! - Explicit consent required before using employee content publicly
//! - GDPR-compliant consent tracking
//!
//! ## Migration Type: Schema Extension (100% SeaORM Builders)
//!
//! This migration demonstrates proper use of SeaORM builders for multi-column
//! additions with different defaults and nullability requirements.

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Schema operation - Using SeaORM builder (add_column_if_not_exists)
        // Add nickname and social_media_release columns with IF NOT EXISTS for idempotency
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, Users::Table))
                    .add_column_if_not_exists(ColumnDef::new(Users::Nickname).string().null())
                    .add_column_if_not_exists(
                        ColumnDef::new(Users::SocialMediaRelease)
                            .boolean()
                            .default(false),
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, Users::Table))
                    .drop_column(Users::Nickname)
                    .drop_column(Users::SocialMediaRelease)
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
    Nickname,
    SocialMediaRelease,
}
