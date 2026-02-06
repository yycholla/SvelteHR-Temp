//! Migration: Add force_password_change column to users table
//!
//! This migration adds support for forced password changes on next login:
//! - Temporary passwords (bulk imports, admin-created accounts)
//! - Password resets requiring user to set new password
//! - Expired passwords requiring immediate change
//!
//! ## SeaORM Builder Usage: 67% Converted (2/3 operations)
//!
//! Schema operations use SeaORM builders. Documentation operation uses raw SQL (no builder API).
//!
//! ### Why This Migration Uses Raw SQL
//!
//! **COMMENT operation uses raw SQL because:**
//! - COMMENT ON COLUMN is PostgreSQL documentation metadata
//! - SeaORM builders don't support COMMENT statements
//! - Comments are stored in PostgreSQL system catalogs, not schema structure
//! - COMMENT is optional documentation, not a structural requirement
//!
//! ### Operations (Mixed - 3 operations):
//!
//! **Up Migration:**
//! 1. ALTER TABLE users ADD COLUMN force_password_change (boolean)
//!    - Using: `manager.alter_table()` with Table::alter().add_column_if_not_exists() builder
//!    - Default: false (existing users don't need password change)
//!    - IF NOT EXISTS for idempotency (converted from non-idempotent add_column)
//!
//! 2. COMMENT ON COLUMN users.force_password_change (Raw SQL)
//!    - Using: `manager.get_connection().execute_unprepared()`
//!    - Documents column purpose for DBAs and developers
//!    - No SeaORM builder API for COMMENT statements
//!
//! **Down Migration:**
//! 3. ALTER TABLE users DROP COLUMN force_password_change
//!    - Using: `manager.alter_table()` with Table::alter().drop_column() builder
//!    - Removes column and comment automatically
//!
//! ### Migration Strategy
//!
//! This is a **schema extension migration** that:
//! - Adds flag for temporary passwords requiring change on next login
//! - Supports bulk import workflows (admin creates account with temp password)
//! - Enables password expiration enforcement (force change when expired)
//! - Documents column purpose with PostgreSQL COMMENT
//!
//! **Use Cases:**
//! - Bulk employee imports: Admin sets temporary password, user must change on first login
//! - Password resets: Support "forgot password" flow requiring new password selection
//! - Security policies: Force password change when policy violations detected
//!
//! ## Migration Type: Mixed Schema Extension (67% SeaORM Builders)
//!
//! This migration demonstrates proper use of SeaORM builders for column operations
//! with IF NOT EXISTS for idempotency, plus raw SQL for PostgreSQL-specific metadata.

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Schema operation - Using SeaORM builder (add_column_if_not_exists)
        // Add force_password_change column to users table with IF NOT EXISTS for idempotency
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, Users::Table))
                    .add_column_if_not_exists(
                        ColumnDef::new(Users::ForcePasswordChange)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .to_owned(),
            )
            .await?;

        // Documentation operation - Using raw SQL (COMMENT has no builder API)
        // Add comment explaining the column's purpose for DBAs and developers
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                COMMENT ON COLUMN hr_public.users.force_password_change IS
                'Requires user to change password on next login (for temporary/bulk-imported passwords)'
                "#,
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop force_password_change column
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, Users::Table))
                    .drop_column(Users::ForcePasswordChange)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }
}

/// Schema identifier
#[derive(Iden)]
enum Schema {
    HrPublic,
}

/// Users table columns
#[derive(Iden)]
enum Users {
    Table,
    ForcePasswordChange,
}
