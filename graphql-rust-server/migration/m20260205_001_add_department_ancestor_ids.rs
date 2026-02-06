//! Migration: Add ancestor_ids column to departments table
//!
//! Adds denormalized ancestor chain for performance optimization.
//! The `ancestor_ids` array contains ordered UUIDs from immediate parent to root.
//!
//! This eliminates N+1 queries when building department hierarchies.
//!
//! Example:
//! - Root department: ancestor_ids = []
//! - Child of root: ancestor_ids = [root_id]
//! - Grandchild: ancestor_ids = [parent_id, root_id]

use sea_orm::ConnectionTrait;
use sea_orm::Statement;
use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // Check if column already exists (for idempotency)
        let column_exists = db
            .query_one(Statement::from_string(
                manager.get_database_backend(),
                "SELECT COUNT(*) as count FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'departments'
                 AND column_name = 'ancestor_ids'".to_string(),
            ))
            .await?;

        let count: i64 = column_exists
            .and_then(|row| row.try_get("", "count").ok())
            .unwrap_or(0);

        // Add ancestor_ids column as UUID array if it doesn't exist
        if count == 0 {
            manager
                .alter_table(
                    Table::alter()
                        .table((Schema::HrPublic, Departments::Table))
                        .add_column(
                            ColumnDef::new(Departments::AncestorIds)
                                .array(ColumnType::Uuid)
                                .not_null()
                                .default(Expr::cust("ARRAY[]::uuid[]"))
                        )
                        .to_owned(),
                )
                .await?;
        }

        // Create GIN index on ancestor_ids for efficient hierarchy queries
        // GIN indexes are optimized for array containment queries (@> operator)
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

        // Backfill existing departments with ancestor chains
        // This uses a recursive CTE to compute ancestor chains for all departments
        // Note: This data migration uses raw SQL as it's a complex computation
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

        // Check if index exists before dropping (for idempotency)
        let index_exists = db
            .query_one(Statement::from_string(
                manager.get_database_backend(),
                "SELECT COUNT(*) as count FROM pg_indexes
                 WHERE schemaname = 'hr_public'
                 AND tablename = 'departments'
                 AND indexname = 'idx_departments_ancestor_ids'".to_string(),
            ))
            .await?;

        let index_count: i64 = index_exists
            .and_then(|row| row.try_get("", "count").ok())
            .unwrap_or(0);

        // Drop index first if it exists
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

        // Check if column exists before dropping (for idempotency)
        let column_exists = db
            .query_one(Statement::from_string(
                manager.get_database_backend(),
                "SELECT COUNT(*) as count FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'departments'
                 AND column_name = 'ancestor_ids'".to_string(),
            ))
            .await?;

        let column_count: i64 = column_exists
            .and_then(|row| row.try_get("", "count").ok())
            .unwrap_or(0);

        // Drop column if it exists
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
