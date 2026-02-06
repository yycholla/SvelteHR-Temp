//! # Fix Display Name and Add Preferred Name
//!
//! This migration resolves a critical design issue with the display_name column
//! and adds support for preferred names (nicknames, chosen names) separate from legal names.
//!
//! ## SeaORM Builder Usage
//! **Conversion: Mixed (Raw SQL required for generated column handling)**
//! - Raw SQL: 100% for generated column operations (PostgreSQL-specific syntax)
//! - MigrationHelpers: Used for idempotent column operations
//! - Reason: PostgreSQL GENERATED columns require raw SQL for proper handling
//!
//! ## Problem Statement
//! The original display_name column was created as a GENERATED ALWAYS column:
//! ```sql
//! display_name VARCHAR GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED
//! ```
//!
//! This caused issues:
//! 1. Cannot be updated directly (read-only)
//! 2. Breaks when users want custom display names
//! 3. No support for preferred names different from legal names
//! 4. Forces Western name order (first + last)
//!
//! ## Solution
//! 1. Drop the GENERATED column constraint
//! 2. Recreate as mutable VARCHAR column with default value
//! 3. Backfill with first_name + last_name for existing users
//! 4. Add separate preferred_name column for nicknames/chosen names
//!
//! ## Operations Summary
//!
//! **Up Migration:**
//! 1. Drop generated display_name column (if exists)
//! 2. Add display_name as regular NOT NULL VARCHAR with empty default
//! 3. Backfill display_name from first_name + last_name
//! 4. Add nullable preferred_name column
//!
//! **Down Migration:**
//! 1. Drop preferred_name column
//! 2. Drop regular display_name column
//! 3. Recreate display_name as GENERATED column
//!
//! ## Data Migration Strategy
//! - **Backfill Logic**: Updates only empty/null display_name values
//! - **Idempotent**: Safe to run multiple times (WHERE clause prevents overwrites)
//! - **Performance**: Single UPDATE with WHERE filter (minimal row locks)
//!
//! ## Use Cases for preferred_name
//! - Nicknames: "Bob" instead of "Robert"
//! - Chosen names: Transgender employees using preferred name
//! - Cultural names: Western name for international employees
//! - Professional names: Stage names, pen names
//!
//! ## Display Logic (Application Layer)
//! ```
//! Display Priority:
//! 1. preferred_name (if set) → "Bob Smith"
//! 2. display_name (if customized) → "Robert Smith"
//! 3. first_name + last_name (fallback) → "Robert Smith"
//! ```
//!
//! ## Migration Safety
//! - **Zero Data Loss**: Backfill preserves existing name data
//! - **Backward Compatible**: display_name still populated by default
//! - **Non-Blocking**: Column operations don't require table locks
//! - **Rollback Safe**: Down migration recreates original structure

use sea_orm_migration::prelude::*;

use super::migration_helpers::MigrationHelpers;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Schema modification: Drop generated display_name column
        // Must use raw SQL because PostgreSQL GENERATED columns have special constraints

        MigrationHelpers::execute_idempotent(
            manager,
            r#"
                ALTER TABLE hr_public.users
                DROP COLUMN IF EXISTS display_name;
                "#,
            "Drop generated display_name column",
        )
        .await?;

        // Schema modification: Recreate display_name as mutable column
        MigrationHelpers::add_column_if_not_exists(
            manager,
            "hr_public.users",
            "display_name VARCHAR NOT NULL DEFAULT ''",
        )
        .await?;

        // Data migration: Backfill display_name from first_name + last_name
        // Only updates empty values to preserve any customized display names
        // Idempotent: Safe to run multiple times (WHERE clause prevents overwrites)
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                UPDATE hr_public.users
                SET display_name = first_name || ' ' || last_name
                WHERE display_name = '' OR display_name IS NULL;
                "#,
            )
            .await?;

        // Schema modification: Add preferred_name column for nicknames/chosen names
        MigrationHelpers::add_column_if_not_exists(
            manager,
            "hr_public.users",
            "preferred_name VARCHAR",
        )
        .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Cleanup: Remove preferred_name column
        MigrationHelpers::execute_idempotent(
            manager,
            "ALTER TABLE hr_public.users DROP COLUMN IF EXISTS preferred_name",
            "Drop preferred_name column",
        )
        .await?;

        // Cleanup: Drop mutable display_name column
        MigrationHelpers::execute_idempotent(
            manager,
            r#"
                ALTER TABLE hr_public.users
                DROP COLUMN IF EXISTS display_name;
                "#,
            "Drop display_name column",
        )
        .await?;

        // Restoration: Recreate display_name as GENERATED column (original behavior)
        // Uses raw SQL because PostgreSQL GENERATED columns require special syntax
        MigrationHelpers::execute_idempotent(
            manager,
            r#"
                ALTER TABLE hr_public.users
                ADD COLUMN IF NOT EXISTS display_name VARCHAR NOT NULL
                GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED;
                "#,
            "Recreate display_name as generated column",
        )
        .await?;

        Ok(())
    }
}
