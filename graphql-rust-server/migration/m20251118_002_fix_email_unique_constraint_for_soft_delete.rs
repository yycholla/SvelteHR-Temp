//! Migration: Fix email unique constraint to allow soft-deleted users to free up emails
//!
//! Problem: The original UNIQUE constraint on users.email doesn't account for soft deletes.
//! This prevents reusing emails of soft-deleted users.
//!
//! Solution: Replace the simple UNIQUE constraint with a partial unique index
//! that only applies to non-deleted users (WHERE deleted_at IS NULL).

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop the existing unique constraint on email
        // Note: SeaORM doesn't have a direct way to drop unique constraints,
        // so we use raw SQL
        manager
            .get_connection()
            .execute_unprepared(
                "ALTER TABLE hr_public.users DROP CONSTRAINT IF EXISTS users_email_key"
            )
            .await?;

        // Create a partial unique index that only applies to non-deleted users
        // This allows deleted users' emails to be reused
        manager
            .get_connection()
            .execute_unprepared(
                "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique_when_active
                 ON hr_public.users(email)
                 WHERE deleted_at IS NULL"
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop the partial unique index
        manager
            .get_connection()
            .execute_unprepared(
                "DROP INDEX IF EXISTS hr_public.idx_users_email_unique_when_active"
            )
            .await?;

        // Restore the original unique constraint
        // WARNING: This will fail if there are duplicate emails in soft-deleted records
        manager
            .get_connection()
            .execute_unprepared(
                "ALTER TABLE hr_public.users ADD CONSTRAINT users_email_key UNIQUE (email)"
            )
            .await?;

        Ok(())
    }
}
