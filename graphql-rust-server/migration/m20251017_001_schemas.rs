//! Migration: Create schemas and PostgreSQL extensions
//!
//! Sets up:
//! - hr_public schema for all application tables
//! - pgcrypto extension for gen_random_uuid()

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Enable pgcrypto for UUID generation
        manager
            .get_connection()
            .execute_unprepared("CREATE EXTENSION IF NOT EXISTS \"pgcrypto\"")
            .await?;

        // Create hr_public schema
        manager
            .get_connection()
            .execute_unprepared("CREATE SCHEMA IF NOT EXISTS hr_public")
            .await?;

        // Set search_path to include hr_public first, then public
        // This allows unqualified type/table names to resolve to hr_public first
        // Critical for PostgreSQL enums (compensation_type, pay_schedule, etc.)
        manager
            .get_connection()
            .execute_unprepared(
                "DO $$ BEGIN
                    EXECUTE 'ALTER DATABASE ' || current_database() || ' SET search_path TO hr_public, public';
                END $$;"
            )
            .await?;

        // Create tower-sessions table in public schema (required by tower-sessions library)
        manager
            .get_connection()
            .execute_unprepared(
                "CREATE TABLE IF NOT EXISTS sessions (
                    id TEXT PRIMARY KEY,
                    data BYTEA NOT NULL,
                    expiry_date TIMESTAMPTZ NOT NULL
                )"
            )
            .await?;

        // Create index on expiry_date for cleanup operations
        manager
            .get_connection()
            .execute_unprepared("CREATE INDEX IF NOT EXISTS idx_sessions_expiry_date ON sessions (expiry_date)")
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop schema (CASCADE will remove all tables)
        manager
            .get_connection()
            .execute_unprepared("DROP SCHEMA IF EXISTS hr_public CASCADE")
            .await?;

        // Note: We don't drop pgcrypto extension as it might be used by other schemas

        Ok(())
    }
}
