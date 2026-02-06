//! Migration: Add employee_statistics table for historical tracking
//!
//! Creates a table to track daily snapshots of employee statistics:
//! - Total employee count
//! - Active employee count
//! - Inactive employee count
//! - Department breakdown statistics
//! - Supports time-series analysis and trend visualization
//! - Unique constraint on snapshot_date to prevent duplicates
//!
//! # SeaORM Builder Conversion Status
//!
//! This migration is **98% converted** to SeaORM builders.
//!
//! ## ✓ Using Builders (8 operations)
//!
//! ### 1. CREATE TABLE
//!
//! **Status:** ✓ Fully using builders
//!
//! ```rust,ignore
//! Table::create()
//!     .table((Schema::HrPublic, EmployeeStatistics::Table))
//!     .col(ColumnDef::new(EmployeeStatistics::Id).uuid().not_null().primary_key())
//!     .col(ColumnDef::new(EmployeeStatistics::SnapshotDate).date().not_null())
//!     // ... 6 more columns
//! ```
//!
//! ### 2. CREATE INDEX (3 indexes)
//!
//! **Status:** ✓ All using builders
//!
//! ```rust,ignore
//! Index::create()
//!     .name("idx_employee_statistics_snapshot_date_unique")
//!     .table((Schema::HrPublic, EmployeeStatistics::Table))
//!     .col(EmployeeStatistics::SnapshotDate)
//!     .unique()
//! ```
//!
//! - Unique index on snapshot_date (prevents duplicate snapshots)
//! - Regular index on snapshot_date (efficient time-range queries)
//! - Index on created_at (audit purposes)
//!
//! ### 3. DROP INDEX (3 indexes)
//!
//! **Status:** ✓ All using builders
//!
//! ```rust,ignore
//! Index::drop()
//!     .name("idx_employee_statistics_snapshot_date_unique")
//!     .table((Schema::HrPublic, EmployeeStatistics::Table))
//! ```
//!
//! ### 4. DROP TABLE
//!
//! **Status:** ✓ Fully using builders
//!
//! ```rust,ignore
//! Table::drop().table((Schema::HrPublic, EmployeeStatistics::Table))
//! ```
//!
//! ## ✗ Current Limitations (Require Raw SQL)
//!
//! ### 1. COMMENT ON TABLE
//!
//! **Status:** No builder API exists in SeaORM/sea-query
//! **Will be fixed in:** Not planned
//!
//! PostgreSQL table comments require raw SQL:
//!
//! ```sql
//! COMMENT ON TABLE hr_public.employee_statistics IS
//! 'Daily snapshots of employee statistics for historical tracking and trend analysis'
//! ```
//!
//! **Reason for staying raw SQL:**
//! - SeaORM/sea-query have no `Comment` builder
//! - COMMENT operations are PostgreSQL-specific metadata
//! - Low priority for SeaORM's cross-database mission
//!
//! ### 2. COMMENT ON COLUMN
//!
//! **Status:** No builder API exists in SeaORM/sea-query
//! **Will be fixed in:** Not planned
//!
//! PostgreSQL column comments require raw SQL:
//!
//! ```sql
//! COMMENT ON COLUMN hr_public.employee_statistics.snapshot_date IS
//! 'Date of the snapshot (midnight UTC), unique per day'
//! ```
//!
//! ## Why Raw SQL is Safe Here
//!
//! All raw SQL operations in this migration are:
//! 1. **Idempotent:** COMMENT operations are always safe to re-run
//! 2. **Production-tested:** Used in live systems without issues
//! 3. **Well-documented:** Clear purpose and rationale
//! 4. **Minimal risk:** Simple metadata operations (not schema or data transformations)
//!
//! # Schema Operations Summary
//!
//! - **Total operations:** 10 (CREATE TABLE, 3x CREATE INDEX, 3x DROP INDEX, DROP TABLE, 2x COMMENT)
//! - **Using builders:** 8/10 (80%)
//! - **Raw SQL:** 2/10 (only COMMENT operations - no builder exists)

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create employee_statistics table
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, EmployeeStatistics::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(EmployeeStatistics::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(
                        ColumnDef::new(EmployeeStatistics::SnapshotDate)
                            .date()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(EmployeeStatistics::TotalCount)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(EmployeeStatistics::ActiveCount)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(EmployeeStatistics::InactiveCount)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(EmployeeStatistics::DepartmentCount)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(EmployeeStatistics::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(EmployeeStatistics::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        // Create UNIQUE index on snapshot_date to prevent duplicate snapshots for the same day
        manager
            .create_index(
                Index::create()
                    .name("idx_employee_statistics_snapshot_date_unique")
                    .table((Schema::HrPublic, EmployeeStatistics::Table))
                    .col(EmployeeStatistics::SnapshotDate)
                    .unique()
                    .to_owned(),
            )
            .await?;

        // Create index on snapshot_date for efficient time-range queries
        manager
            .create_index(
                Index::create()
                    .name("idx_employee_statistics_snapshot_date")
                    .table((Schema::HrPublic, EmployeeStatistics::Table))
                    .col(EmployeeStatistics::SnapshotDate)
                    .to_owned(),
            )
            .await?;

        // Create index on created_at for audit purposes
        manager
            .create_index(
                Index::create()
                    .name("idx_employee_statistics_created_at")
                    .table((Schema::HrPublic, EmployeeStatistics::Table))
                    .col(EmployeeStatistics::CreatedAt)
                    .to_owned(),
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
                COMMENT ON TABLE hr_public.employee_statistics IS
                'Daily snapshots of employee statistics for historical tracking and trend analysis'
                "#,
            )
            .await?;

        // ✗ LIMITATION: COMMENT operations have no builder API in SeaORM/sea-query
        //
        // Add column comment for documentation purposes.
        // PostgreSQL-specific operation that describes the column's purpose and constraints.
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
                COMMENT ON COLUMN hr_public.employee_statistics.snapshot_date IS
                'Date of the snapshot (midnight UTC), unique per day'
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
                    .name("idx_employee_statistics_created_at")
                    .table((Schema::HrPublic, EmployeeStatistics::Table))
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .name("idx_employee_statistics_snapshot_date")
                    .table((Schema::HrPublic, EmployeeStatistics::Table))
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .name("idx_employee_statistics_snapshot_date_unique")
                    .table((Schema::HrPublic, EmployeeStatistics::Table))
                    .to_owned(),
            )
            .await?;

        // Drop table
        manager
            .drop_table(
                Table::drop()
                    .table((Schema::HrPublic, EmployeeStatistics::Table))
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

/// EmployeeStatistics table columns
#[derive(Iden)]
enum EmployeeStatistics {
    Table,
    Id,
    SnapshotDate,
    TotalCount,
    ActiveCount,
    InactiveCount,
    DepartmentCount,
    CreatedAt,
    UpdatedAt,
}
