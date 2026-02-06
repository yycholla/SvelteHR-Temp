//! Migration: Extend users table for advanced authentication policies
//!
//! This migration adds columns to support:
//! - Account lockout: Permanent account locking (beyond temporary locked_until)
//! - Password expiration: Track when password was last changed for expiry policies
//!
//! ## SeaORM Builder Usage: 100% Converted (5/5 operations)
//!
//! All schema operations use SeaORM builders.
//!
//! ### Operations (SeaORM Builders - 5 operations):
//!
//! **Up Migration:**
//! 1. ALTER TABLE users ADD COLUMN account_locked (boolean)
//!    - Using: `manager.alter_table()` with Table::alter().add_column_if_not_exists() builder
//!    - Default: false (all accounts active by default)
//!    - Permanent lockout flag (distinct from temporary locked_until)
//!
//! 2. ALTER TABLE users ADD COLUMN password_last_changed (timestamptz)
//!    - Using: `manager.alter_table()` with Table::alter().add_column_if_not_exists() builder
//!    - Default: CURRENT_TIMESTAMP (assumes existing passwords changed now)
//!    - Tracks when password was last changed for expiry policies
//!
//! 3. CREATE INDEX idx_users_account_locked
//!    - Using: `manager.create_index()` with Index::create() builder
//!    - Optimizes queries filtering locked accounts
//!
//! 4. CREATE INDEX idx_users_password_last_changed
//!    - Using: `manager.create_index()` with Index::create() builder
//!    - Optimizes queries finding expired passwords
//!
//! **Down Migration:**
//! 5. DROP INDEX (2 indexes) + DROP COLUMN (2 columns)
//!    - Using: `manager.drop_index()` with Index::drop() builder (2x)
//!    - Using: `manager.alter_table()` with Table::alter().drop_column() builder
//!    - Indexes dropped before columns (proper dependency order)
//!
//! ### Migration Strategy
//!
//! This is a **schema extension migration** that:
//! - Adds fields for advanced authentication policies (lockout + expiry)
//! - Maintains backward compatibility (nullable password_last_changed, false account_locked)
//! - Optimizes auth policy queries with targeted indexes
//! - Complements existing auth fields (failed_login_attempts, locked_until from m20251017_003_auth)
//!
//! **Design Notes:**
//! - account_locked: Permanent lockout (manual intervention required to unlock)
//! - locked_until: Temporary lockout (auto-unlock after time expires)
//! - password_last_changed: Nullable to support accounts without password expiry
//!
//! ## Migration Type: Pure Schema Extension (100% SeaORM Builders)
//!
//! This migration demonstrates proper use of SeaORM builders for ALTER TABLE
//! operations with IF NOT EXISTS for safe column additions.

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
