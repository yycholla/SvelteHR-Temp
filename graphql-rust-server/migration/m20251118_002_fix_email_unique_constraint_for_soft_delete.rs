//! Migration: Fix email unique constraint to allow soft-deleted users to free up emails
//!
//! Problem: The original UNIQUE constraint on users.email doesn't account for soft deletes.
//! This prevents reusing emails of soft-deleted users.
//!
//! Solution: Replace the simple UNIQUE constraint with a partial unique index
//! that only applies to non-deleted users (WHERE deleted_at IS NULL).
//!
//! SeaORM Support (v0.30.7):
//! - Index::create() basic support ✓
//! - Index::drop() supports dropping indexes ✓
//! - Partial indexes (.and_where) NOT available in v0.30.7 (requires v0.32+) ✗
//! - DROP CONSTRAINT not supported - use execute_unprepared ✗
//! - ADD CONSTRAINT not supported - use execute_unprepared ✗
//!
//! IMPORTANT: Partial indexes require sea-query >= 0.32.0 with ConditionalStatement trait.
//! Current version (0.30.7) does not support this, so we use raw SQL for the partial index.

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop the existing unique constraint on email
        // NOTE: SeaORM doesn't support DROP CONSTRAINT via builders
        // This is a schema operation that requires raw SQL
        manager
            .get_connection()
            .execute_unprepared(
                "ALTER TABLE hr_public.users DROP CONSTRAINT IF EXISTS users_email_key",
            )
            .await?;

        // Create a partial unique index that only applies to non-deleted users
        // This allows deleted users' emails to be reused
        // NOTE: Partial indexes (WHERE clause) require sea-query >= 0.32.0
        // Current version is 0.30.7, so we use raw SQL
        // TODO: Once sea-orm-migration upgrades to sea-query 0.32+, replace with:
        //   Index::create().and_where(Expr::col(Users::DeletedAt).is_null())
        manager
            .get_connection()
            .execute_unprepared(
                "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique_when_active
                 ON hr_public.users(email)
                 WHERE deleted_at IS NULL",
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop the partial unique index
        // Using raw SQL to match PostgreSQL-specific index naming with schema
        manager
            .get_connection()
            .execute_unprepared("DROP INDEX IF EXISTS hr_public.idx_users_email_unique_when_active")
            .await?;

        // Restore the original unique constraint
        // NOTE: SeaORM doesn't support ADD CONSTRAINT via builders
        // This is a schema operation that requires raw SQL
        // WARNING: This will fail if there are duplicate emails in soft-deleted records
        manager
            .get_connection()
            .execute_unprepared(
                "ALTER TABLE hr_public.users ADD CONSTRAINT users_email_key UNIQUE (email)",
            )
            .await?;

        Ok(())
    }
}
