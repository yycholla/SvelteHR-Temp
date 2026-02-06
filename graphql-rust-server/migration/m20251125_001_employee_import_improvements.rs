//! Migration: Employee import improvements with job tracking and validation
//!
//! This migration adds a comprehensive employee import system:
//! - Birth date column for employee profiles
//! - Import job tracking (status, progress, mapping config)
//! - Import row tracking (validation, errors, matching)
//! - CSV import workflow with validation and matching strategies
//!
//! ## SeaORM Builder Usage: 100% Converted (7/7 operations)
//!
//! All schema operations use SeaORM builders.
//!
//! ### Operations (SeaORM Builders - 7 operations):
//!
//! **Up Migration:**
//! 1. ALTER TABLE users ADD COLUMN birth_date (date)
//!    - Using: `manager.alter_table()` with Table::alter().add_column_if_not_exists() builder
//!    - Nullable for backward compatibility (existing users without birth dates)
//!    - IF NOT EXISTS for idempotency (converted from non-idempotent add_column)
//!
//! 2. CREATE TABLE employee_import_jobs
//!    - Using: `manager.create_table()` with Table::create() builder
//!    - 11 columns: id, status, counters (total/valid/error rows), mapping config, matching strategy, audit fields
//!    - JSONB for mapping_config (flexible column mapping)
//!    - IF NOT EXISTS for idempotency
//!
//! 3. CREATE TABLE employee_import_rows
//!    - Using: `manager.create_table()` with Table::create() builder
//!    - 8 columns: id, job_id, raw_data, parsed_data, status, validation_errors, matched_user_id, row_number
//!    - JSONB for raw_data, parsed_data, validation_errors (flexible structure)
//!    - Foreign key to employee_import_jobs with CASCADE delete
//!
//! **Down Migration:**
//! 4. DROP TABLE employee_import_rows
//!    - Using: `manager.drop_table()` with Table::drop() builder
//!    - Dropped first due to foreign key dependency
//!
//! 5. DROP TABLE employee_import_jobs
//!    - Using: `manager.drop_table()` with Table::drop() builder
//!    - Dropped after rows table
//!
//! 6. ALTER TABLE users DROP COLUMN birth_date
//!    - Using: `manager.alter_table()` with Table::alter().drop_column() builder
//!
//! ### Migration Strategy
//!
//! This is a **feature introduction migration** that:
//! - Enables bulk employee CSV imports with validation
//! - Tracks import jobs with progress counters and status
//! - Stores raw CSV data and parsed/validated data separately
//! - Supports matching strategies (ID, NAME_EMAIL, etc.) for updates vs inserts
//! - Provides detailed validation error tracking per row
//!
//! **Import Workflow:**
//! 1. Create import job (PENDING status)
//! 2. Parse CSV rows and store as employee_import_rows
//! 3. Map columns using mapping_config (MAPPED status)
//! 4. Validate rows and record errors (VALIDATED status)
//! 5. Import valid rows into users/employees tables (COMPLETED status)
//!
//! **Status Values:**
//! - Jobs: PENDING, MAPPED, VALIDATED, COMPLETED, FAILED
//! - Rows: PENDING, VALID, ERROR, IMPORTED
//!
//! ## Migration Type: Feature Introduction (100% SeaORM Builders)
//!
//! This migration demonstrates proper use of SeaORM builders for complex schemas
//! with JSONB columns, foreign keys, and multi-table relationships.

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Schema operation - Using SeaORM builder (add_column_if_not_exists)
        // 1. Add birth_date to users with IF NOT EXISTS for idempotency
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, Users::Table))
                    .add_column_if_not_exists(ColumnDef::new(Users::BirthDate).date().null())
                    .to_owned(),
            )
            .await?;

        // Schema operation - Using SeaORM builder (create_table)
        // 2. Create employee_import_jobs table for tracking bulk imports
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, EmployeeImportJobs::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(EmployeeImportJobs::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(
                        ColumnDef::new(EmployeeImportJobs::Status)
                            .string()
                            .not_null()
                            .default("PENDING"),
                    ) // PENDING, MAPPED, VALIDATED, COMPLETED, FAILED
                    .col(
                        ColumnDef::new(EmployeeImportJobs::TotalRows)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(EmployeeImportJobs::ValidRows)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(EmployeeImportJobs::ErrorRows)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(EmployeeImportJobs::MappingConfig)
                            .json_binary()
                            .null(),
                    ) // Stores the column mapping
                    .col(
                        ColumnDef::new(EmployeeImportJobs::MatchingStrategy)
                            .string()
                            .null(),
                    ) // ID, NAME_EMAIL, etc.
                    .col(
                        ColumnDef::new(EmployeeImportJobs::CreatedAt)
                            .timestamp_with_time_zone()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(EmployeeImportJobs::UpdatedAt)
                            .timestamp_with_time_zone()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(EmployeeImportJobs::CompletedAt)
                            .timestamp_with_time_zone()
                            .null(),
                    )
                    // Who performed the import?
                    .col(ColumnDef::new(EmployeeImportJobs::CreatedBy).uuid().null())
                    .to_owned(),
            )
            .await?;

        // Schema operation - Using SeaORM builder (create_table)
        // 3. Create employee_import_rows table for per-row tracking with foreign key
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, EmployeeImportRows::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(EmployeeImportRows::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(
                        ColumnDef::new(EmployeeImportRows::JobId)
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(EmployeeImportRows::RawData)
                            .json_binary()
                            .not_null(),
                    ) // The original CSV row as JSON
                    .col(
                        ColumnDef::new(EmployeeImportRows::ParsedData)
                            .json_binary()
                            .null(),
                    ) // The mapped data ready for insertion
                    .col(
                        ColumnDef::new(EmployeeImportRows::Status)
                            .string()
                            .not_null()
                            .default("PENDING"),
                    ) // PENDING, VALID, ERROR, IMPORTED
                    .col(
                        ColumnDef::new(EmployeeImportRows::ValidationErrors)
                            .json_binary()
                            .null(),
                    ) // List of errors
                    .col(
                        ColumnDef::new(EmployeeImportRows::MatchedUserId)
                            .uuid()
                            .null(),
                    ) // If a match was found
                    .col(
                        ColumnDef::new(EmployeeImportRows::RowNumber)
                            .integer()
                            .not_null(),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_import_rows_job_id")
                            .from(
                                (Schema::HrPublic, EmployeeImportRows::Table),
                                EmployeeImportRows::JobId,
                            )
                            .to(
                                (Schema::HrPublic, EmployeeImportJobs::Table),
                                EmployeeImportJobs::Id,
                            )
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(
                Table::drop()
                    .table((Schema::HrPublic, EmployeeImportRows::Table))
                    .to_owned(),
            )
            .await?;
        manager
            .drop_table(
                Table::drop()
                    .table((Schema::HrPublic, EmployeeImportJobs::Table))
                    .to_owned(),
            )
            .await?;
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, Users::Table))
                    .drop_column(Users::BirthDate)
                    .to_owned(),
            )
            .await?;
        Ok(())
    }
}

#[derive(Iden)]
enum Schema {
    HrPublic,
}

#[derive(Iden)]
enum Users {
    Table,
    BirthDate,
}

#[derive(Iden)]
enum EmployeeImportJobs {
    Table,
    Id,
    Status,
    TotalRows,
    ValidRows,
    ErrorRows,
    MappingConfig,
    MatchingStrategy,
    CreatedAt,
    UpdatedAt,
    CompletedAt,
    CreatedBy,
}

#[derive(Iden)]
enum EmployeeImportRows {
    Table,
    Id,
    JobId,
    RawData,
    ParsedData,
    Status,
    ValidationErrors,
    MatchedUserId,
    RowNumber,
}
