//! Add employee_statistics table for historical employee count tracking
//!
//! Creates a table to track daily snapshots of employee statistics:
//! - Total employee count
//! - Active employee count
//! - Inactive employee count
//! - Department breakdown statistics
//! - Supports time-series analysis and trend visualization
//! - Unique constraint on snapshot_date to prevent duplicates

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

        // Create comment on table
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                COMMENT ON TABLE hr_public.employee_statistics IS
                'Daily snapshots of employee statistics for historical tracking and trend analysis'
                "#,
            )
            .await?;

        // Create comment on snapshot_date column
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
