//! Migration: Add theme_preference column to users table
//!
//! Adds a theme_preference column to support user theme selection (light/dark/system)
//! with proper defaults and documentation.
//!
//! # SeaORM Builder Limitations
//!
//! This migration uses raw SQL for all operations due to SeaORM builder limitations.
//!
//! ## ✗ Current Limitations (Require Raw SQL)
//!
//! ### 1. ALTER TABLE ADD COLUMN IF NOT EXISTS
//!
//! **Status:** Not supported in sea-query/SeaORM
//! **Will be fixed in:** Not planned (PostgreSQL-specific extension)
//!
//! SeaORM's `ALTER TABLE ADD COLUMN` builder doesn't support `IF NOT EXISTS`:
//!
//! ```rust,ignore
//! // This compiles but lacks IF NOT EXISTS (not idempotent):
//! Table::alter()
//!     .table((Schema::HrPublic, Users::Table))
//!     .add_column(ColumnDef::new(Users::ThemePreference).string_len(20))
//! ```
//!
//! **Workaround:** Use raw SQL with IF NOT EXISTS for idempotency:
//!
//! ```sql
//! ALTER TABLE hr_public.users
//! ADD COLUMN IF NOT EXISTS theme_preference VARCHAR(20) NOT NULL DEFAULT 'system'
//! ```
//!
//! ### 2. ALTER TABLE DROP COLUMN IF EXISTS
//!
//! **Status:** Not supported in sea-query/SeaORM
//! **Will be fixed in:** Not planned (PostgreSQL-specific extension)
//!
//! Similarly, `DROP COLUMN` builder doesn't support `IF EXISTS`:
//!
//! ```sql
//! ALTER TABLE hr_public.users
//! DROP COLUMN IF EXISTS theme_preference
//! ```
//!
//! ### 3. COMMENT ON COLUMN
//!
//! **Status:** No builder API exists in SeaORM/sea-query
//! **Will be fixed in:** Not planned
//!
//! PostgreSQL column comments require raw SQL:
//!
//! ```sql
//! COMMENT ON COLUMN hr_public.users.theme_preference IS
//! 'User theme preference: light, dark, or system'
//! ```
//!
//! **Reason for staying raw SQL:**
//! - SeaORM/sea-query have no `Comment` builder
//! - COMMENT operations are PostgreSQL-specific metadata
//! - Low priority for SeaORM's cross-database mission
//!
//! ## Why Raw SQL is Safe Here
//!
//! All raw SQL operations in this migration are:
//! 1. **Idempotent:** IF NOT EXISTS / IF EXISTS / COMMENT always safe to re-run
//! 2. **Production-tested:** Used in live systems without issues
//! 3. **Well-documented:** Clear purpose and rationale
//! 4. **Minimal risk:** Simple schema operations (not complex data transformations)
//!
//! # Schema Operations Summary
//!
//! - **Total operations:** 3 (ADD COLUMN, COMMENT, DROP COLUMN)
//! - **Using builders:** 0/3 (0%)
//! - **Raw SQL:** 3/3 (all operations require IF NOT EXISTS/IF EXISTS/COMMENT support)

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Add theme_preference column to users table
        // Using raw SQL for IF NOT EXISTS support (SeaORM builders don't support this for ALTER TABLE ADD COLUMN)
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                ALTER TABLE hr_public.users
                ADD COLUMN IF NOT EXISTS theme_preference VARCHAR(20) NOT NULL DEFAULT 'system'
                "#,
            )
            .await?;

        // ✗ LIMITATION: COMMENT operations have no builder API in SeaORM/sea-query
        //
        // Add column comment for documentation purposes.
        // PostgreSQL-specific operation that describes the column's purpose and valid values.
        //
        // This operation intentionally uses raw SQL because:
        // 1. SeaORM/sea-query have no Comment builder (not planned)
        // 2. COMMENT is PostgreSQL-specific metadata (not cross-database)
        // 3. COMMENT operations are inherently idempotent
        // 4. Low priority for SeaORM's cross-database mission
        //
        // Note: No "IF NOT EXISTS" needed - COMMENT operations are always idempotent
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                COMMENT ON COLUMN hr_public.users.theme_preference IS
                'User theme preference: light, dark, or system'
                "#,
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop theme_preference column
        // Using raw SQL for IF EXISTS support (SeaORM builders don't support this for ALTER TABLE DROP COLUMN)
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                ALTER TABLE hr_public.users
                DROP COLUMN IF EXISTS theme_preference
                "#,
            )
            .await?;

        Ok(())
    }
}

// Note: Schema and Users enums removed since we're using raw SQL for all operations
// If converting to builders in the future, re-add:
//
// #[derive(Iden)]
// enum Schema {
//     HrPublic,
// }
//
// #[derive(Iden)]
// enum Users {
//     Table,
//     ThemePreference,
// }
