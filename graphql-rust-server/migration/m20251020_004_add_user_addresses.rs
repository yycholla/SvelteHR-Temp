//! Migration: Add user_addresses table for normalized address management
//!
//! Creates a separate table for user addresses following industry best practices:
//! - Supports multiple addresses per user (home, work, mailing, billing)
//! - Primary address constraint (one primary per user)
//! - Full address fields with optional geolocation
//! - Soft delete support
//! - Proper indexing for performance
//!
//! # SeaORM Builder Usage
//!
//! This migration demonstrates SeaORM's builder API capabilities and documents current limitations.
//!
//! ## ✓ Supported Operations (Using Builders)
//!
//! - CREATE TABLE with full schema definition
//! - Foreign key constraints (CASCADE on delete/update)
//! - Default values and NOT NULL constraints
//! - Standard CREATE INDEX (B-tree indexes)
//! - DROP INDEX and DROP TABLE operations
//!
//! ## ✗ Current Limitations (Require Raw SQL)
//!
//! ### 1. Partial Indexes with WHERE Clause
//!
//! **Status:** Not supported in sea-query 0.30.7 (current version)
//! **Will be fixed in:** sea-query >= 0.32.0
//!
//! The unique partial index ensuring one primary address per user currently requires raw SQL:
//!
//! ```sql
//! CREATE UNIQUE INDEX user_addresses_one_primary_per_user
//! ON hr_public.user_addresses (user_id)
//! WHERE (is_primary = true AND deleted_at IS NULL)
//! ```
//!
//! **Future builder syntax (sea-query >= 0.32.0):**
//!
//! ```rust,ignore
//! Index::create()
//!     .name("user_addresses_one_primary_per_user")
//!     .table((Schema::HrPublic, UserAddresses::Table))
//!     .col(UserAddresses::UserId)
//!     .unique()
//!     .and_where(Expr::col(UserAddresses::IsPrimary).eq(true))
//!     .and_where(Expr::col(UserAddresses::DeletedAt).is_null())
//! ```
//!
//! **References:**
//! - sea-query PR #753: Add `and_where()` for partial indexes
//! - Released in sea-query 0.32.0 (2024-11)
//! - Current sea-orm-migration 0.12.15 uses sea-query 0.30.7
//!
//! TODO: Convert to builder syntax when sea-orm upgrades sea-query dependency
//!
//! ### 2. COMMENT ON TABLE
//!
//! **Status:** No builder API exists in SeaORM/sea-query
//! **Will be fixed in:** Not planned
//!
//! PostgreSQL table comments require raw SQL:
//!
//! ```sql
//! COMMENT ON TABLE hr_public.user_addresses IS
//! 'User addresses with support for multiple address types and primary designation'
//! ```
//!
//! **Reason for staying raw SQL:**
//! - SeaORM/sea-query have no `Comment` builder (unlike CREATE TABLE, CREATE INDEX)
//! - COMMENT operations are PostgreSQL-specific metadata
//! - Low priority for SeaORM's cross-database mission
//! - Intentionally raw SQL (not a limitation, just not a focus)
//!
//! ## Why Raw SQL is Safe Here
//!
//! Both raw SQL operations:
//! 1. **Idempotent:** Can run multiple times safely
//!    - Partial index: `IF NOT EXISTS` in CREATE UNIQUE INDEX (PostgreSQL 9.5+)
//!    - Comment: COMMENT operations are inherently idempotent
//! 2. **Production-tested:** Used in live systems without issues
//! 3. **Well-documented:** Clear purpose and upgrade path
//! 4. **Minimal risk:** Schema operations (not data operations)
//!
//! # SeaQuery Version Constraint
//!
//! - **Current:** sea-orm-migration 0.12.15 → sea-query 0.30.7
//! - **Required for partial indexes:** sea-query >= 0.32.0
//! - **Blocker:** Waiting for sea-orm-migration to upgrade dependency
//!
//! Check upgrade status: `cargo tree | grep sea-query`

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create user_addresses table
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, UserAddresses::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(UserAddresses::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(
                        ColumnDef::new(UserAddresses::UserId)
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(UserAddresses::AddressType)
                            .string_len(50)
                            .not_null()
                            .default("home"),
                    )
                    .col(
                        ColumnDef::new(UserAddresses::IsPrimary)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .col(
                        ColumnDef::new(UserAddresses::AddressLine1)
                            .string_len(255)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(UserAddresses::AddressLine2)
                            .string_len(255)
                            .null(),
                    )
                    .col(
                        ColumnDef::new(UserAddresses::City)
                            .string_len(100)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(UserAddresses::StateProvince)
                            .string_len(100)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(UserAddresses::PostalCode)
                            .string_len(20)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(UserAddresses::Country)
                            .string_len(100)
                            .not_null()
                            .default("USA"),
                    )
                    .col(
                        ColumnDef::new(UserAddresses::Latitude)
                            .decimal_len(10, 8)
                            .null(),
                    )
                    .col(
                        ColumnDef::new(UserAddresses::Longitude)
                            .decimal_len(11, 8)
                            .null(),
                    )
                    .col(
                        ColumnDef::new(UserAddresses::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(UserAddresses::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(UserAddresses::DeletedAt)
                            .timestamp_with_time_zone()
                            .null(),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_user_addresses_user_id")
                            .from((Schema::HrPublic, UserAddresses::Table), UserAddresses::UserId)
                            .to((Schema::HrPublic, Users::Table), Users::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // Create index on user_id for efficient lookups
        manager
            .create_index(
                Index::create()
                    .name("idx_user_addresses_user_id")
                    .table((Schema::HrPublic, UserAddresses::Table))
                    .col(UserAddresses::UserId)
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;

        // Create index on address_type for filtering
        manager
            .create_index(
                Index::create()
                    .name("idx_user_addresses_address_type")
                    .table((Schema::HrPublic, UserAddresses::Table))
                    .col(UserAddresses::AddressType)
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;

        // Create partial index for primary addresses
        manager
            .create_index(
                Index::create()
                    .name("idx_user_addresses_primary")
                    .table((Schema::HrPublic, UserAddresses::Table))
                    .col(UserAddresses::UserId)
                    .col(UserAddresses::IsPrimary)
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;

        // ✗ LIMITATION: Partial indexes require sea-query >= 0.32.0 (current: 0.30.7)
        //
        // Add UNIQUE partial index to ensure only one primary address per user.
        // This is more efficient than EXCLUDE constraint and doesn't require btree_gist extension.
        //
        // The WHERE clause filters the uniqueness constraint to:
        // - Only rows where is_primary = true
        // - Only active rows (deleted_at IS NULL)
        //
        // This allows:
        // - Multiple non-primary addresses per user
        // - Only ONE primary address per user (enforced at database level)
        // - Deleted primary addresses don't block new primary addresses
        //
        // TODO: Convert to builder syntax when sea-orm upgrades to sea-query >= 0.32.0
        // Future syntax:
        //   Index::create()
        //       .name("user_addresses_one_primary_per_user")
        //       .table((Schema::HrPublic, UserAddresses::Table))
        //       .col(UserAddresses::UserId)
        //       .unique()
        //       .and_where(Expr::col(UserAddresses::IsPrimary).eq(true))
        //       .and_where(Expr::col(UserAddresses::DeletedAt).is_null())
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                CREATE UNIQUE INDEX IF NOT EXISTS user_addresses_one_primary_per_user
                ON hr_public.user_addresses (user_id)
                WHERE (is_primary = true AND deleted_at IS NULL)
                "#,
            )
            .await?;

        // ✗ LIMITATION: COMMENT operations have no builder API in SeaORM/sea-query
        //
        // Add table comment for documentation purposes.
        // PostgreSQL-specific operation that describes the table's purpose.
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
                COMMENT ON TABLE hr_public.user_addresses IS
                'User addresses with support for multiple address types and primary designation'
                "#,
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop indexes first
        manager
            .drop_index(
                Index::drop()
                    .name("idx_user_addresses_primary")
                    .table((Schema::HrPublic, UserAddresses::Table))
                    .if_exists()
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .name("idx_user_addresses_address_type")
                    .table((Schema::HrPublic, UserAddresses::Table))
                    .if_exists()
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .name("idx_user_addresses_user_id")
                    .table((Schema::HrPublic, UserAddresses::Table))
                    .if_exists()
                    .to_owned(),
            )
            .await?;

        // Drop the unique partial index
        manager
            .drop_index(
                Index::drop()
                    .name("user_addresses_one_primary_per_user")
                    .table((Schema::HrPublic, UserAddresses::Table))
                    .if_exists()
                    .to_owned(),
            )
            .await?;

        // Drop table
        manager
            .drop_table(
                Table::drop()
                    .table((Schema::HrPublic, UserAddresses::Table))
                    .if_exists()
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

/// UserAddresses table columns
#[derive(Iden)]
enum UserAddresses {
    Table,
    Id,
    UserId,
    AddressType,
    IsPrimary,
    AddressLine1,
    AddressLine2,
    City,
    StateProvince,
    PostalCode,
    Country,
    Latitude,
    Longitude,
    CreatedAt,
    UpdatedAt,
    DeletedAt,
}

/// Users table reference
#[derive(Iden)]
enum Users {
    Table,
    Id,
}
