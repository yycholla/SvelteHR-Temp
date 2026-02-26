//! Migration: Add ancestor_ids column to departments table
//!
//! Adds denormalized ancestor chain for performance optimization.
//! The `ancestor_ids` array contains ordered UUIDs from immediate parent to root.
//!
//! ## SeaORM Builder Usage
//!
//! This migration achieves ~60% SeaORM builder coverage:
//! - ✅ Column addition via `Table::alter()` builders
//! - ✅ Index creation via `Index::create()` builders with GIN type
//! - ❌ Idempotency checks use raw SQL (information_schema queries)
//! - ❌ Data backfill uses raw SQL (recursive CTE for ancestor computation)
//!
//! ## Schema Operations
//!
//! ### Up Migration
//! 1. Checks if ancestor_ids column exists (idempotent guard)
//! 2. Adds ancestor_ids column as UUID array with empty default
//! 3. Creates GIN index for efficient array containment queries
//! 4. Backfills existing departments with computed ancestor chains:
//!    - Uses recursive CTE to traverse department hierarchy
//!    - Root departments get empty arrays
//!    - Child departments get [parent_id, ...parent's ancestors]
//!
//! ### Down Migration
//! 1. Checks if index exists before dropping (idempotent)
//! 2. Drops GIN index idx_departments_ancestor_ids
//! 3. Checks if column exists before dropping (idempotent)
//! 4. Drops ancestor_ids column
//!
//! ## Features
//! - Eliminates N+1 queries when building department hierarchies
//! - GIN index optimized for array containment queries (@> operator)
//! - Automatic backfill of existing department hierarchies
//! - Full idempotency (safe to re-run multiple times)
//!
//! ## Performance Benefits
//!
//! **Before:** Finding all descendants requires recursive queries
//! ```sql
//! -- Multiple queries or complex recursive CTE
//! WITH RECURSIVE descendants AS (...)
//! SELECT * FROM descendants;
//! ```
//!
//! **After:** Single indexed query using GIN operator
//! ```sql
//! -- Single query with GIN index
//! SELECT * FROM departments
//! WHERE ancestor_ids @> ARRAY['parent-uuid']::uuid[];
//! ```
//!
//! ## Example Data
//! - Root department: ancestor_ids = []
//! - Child of root: ancestor_ids = [root_id]
//! - Grandchild: ancestor_ids = [parent_id, root_id]
//!
//! ## Migration Strategy
//!
//! This migration uses a mixed approach:
//! - **SeaORM Builders**: Column and index operations (type-safe)
//! - **Raw SQL**: Existence checks and recursive CTE for backfill
//!
//! The recursive CTE is necessary for computing ancestor chains efficiently
//! in a single database operation during backfill.

use sea_orm::ConnectionTrait;
use sea_orm::Statement;
use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // Step 1: Check if column already exists (idempotency guard)
        // Prevents errors when migration is re-run
        let column_exists = db
            .query_one(Statement::from_string(
                manager.get_database_backend(),
                "SELECT COUNT(*) as count FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'departments'
                 AND column_name = 'ancestor_ids'"
                    .to_string(),
            ))
            .await?;

        let count: i64 = column_exists
            .and_then(|row| row.try_get("", "count").ok())
            .unwrap_or(0);

        // Step 2: Add ancestor_ids column as UUID array if it doesn't exist (schema modification)
        // Empty array default allows immediate insertion without NULL handling
        if count == 0 {
            manager
                .alter_table(
                    Table::alter()
                        .table((Schema::HrPublic, Departments::Table))
                        .add_column(
                            ColumnDef::new(Departments::AncestorIds)
                                .array(ColumnType::Uuid)
                                .not_null()
                                .default(Expr::cust("ARRAY[]::uuid[]")),
                        )
                        .to_owned(),
                )
                .await?;
        }

        // Step 3: Create GIN index on ancestor_ids for efficient hierarchy queries (query optimization)
        // GIN (Generalized Inverted Index) indexes are optimized for array containment queries (@> operator)
        // Enables fast "find all descendants of X" queries
        manager
            .create_index(
                Index::create()
                    .name("idx_departments_ancestor_ids")
                    .table((Schema::HrPublic, Departments::Table))
                    .col(Departments::AncestorIds)
                    .index_type(IndexType::Custom(SeaRc::new(Alias::new("GIN"))))
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;

        // Step 4: Backfill existing departments with ancestor chains (data migration)
        // Uses recursive CTE to compute ancestor chains efficiently in a single database operation
        // Raw SQL is required for this complex hierarchical computation
        let backfill_sql = r#"
            WITH RECURSIVE department_ancestors AS (
                -- Base case: root departments (no parent)
                SELECT
                    id,
                    ARRAY[]::uuid[] as ancestor_ids
                FROM hr_public.departments
                WHERE parent_department_id IS NULL AND deleted_at IS NULL

                UNION ALL

                -- Recursive case: child departments
                SELECT
                    d.id,
                    ARRAY[d.parent_department_id] || da.ancestor_ids as ancestor_ids
                FROM hr_public.departments d
                INNER JOIN department_ancestors da ON d.parent_department_id = da.id
                WHERE d.deleted_at IS NULL
            )
            UPDATE hr_public.departments d
            SET ancestor_ids = da.ancestor_ids
            FROM department_ancestors da
            WHERE d.id = da.id
        "#;

        db.execute(Statement::from_string(
            manager.get_database_backend(),
            backfill_sql.to_string(),
        ))
        .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // Step 1: Check if index exists before dropping (idempotency guard)
        let index_exists = db
            .query_one(Statement::from_string(
                manager.get_database_backend(),
                "SELECT COUNT(*) as count FROM pg_indexes
                 WHERE schemaname = 'hr_public'
                 AND tablename = 'departments'
                 AND indexname = 'idx_departments_ancestor_ids'"
                    .to_string(),
            ))
            .await?;

        let index_count: i64 = index_exists
            .and_then(|row| row.try_get("", "count").ok())
            .unwrap_or(0);

        // Step 2: Drop index first if it exists (schema cleanup)
        if index_count > 0 {
            manager
                .drop_index(
                    Index::drop()
                        .name("idx_departments_ancestor_ids")
                        .table((Schema::HrPublic, Departments::Table))
                        .to_owned(),
                )
                .await?;
        }

        // Step 3: Check if column exists before dropping (idempotency guard)
        let column_exists = db
            .query_one(Statement::from_string(
                manager.get_database_backend(),
                "SELECT COUNT(*) as count FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'departments'
                 AND column_name = 'ancestor_ids'"
                    .to_string(),
            ))
            .await?;

        let column_count: i64 = column_exists
            .and_then(|row| row.try_get("", "count").ok())
            .unwrap_or(0);

        // Step 4: Drop column if it exists (schema cleanup)
        if column_count > 0 {
            manager
                .alter_table(
                    Table::alter()
                        .table((Schema::HrPublic, Departments::Table))
                        .drop_column(Departments::AncestorIds)
                        .to_owned(),
                )
                .await?;
        }

        Ok(())
    }
}

#[derive(Iden)]
enum Schema {
    HrPublic,
}

#[derive(Iden)]
enum Departments {
    Table,
    AncestorIds,
}
