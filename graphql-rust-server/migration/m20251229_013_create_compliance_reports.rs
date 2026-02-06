//! Migration: Create compliance reporting system
//!
//! This migration creates infrastructure for generating, scheduling, and managing compliance reports
//! for sync operations. Supports multiple report types (audit, reconciliation, sync health), scheduled
//! generation with cron expressions, and multi-format output (PDF, CSV, JSON).
//!
//! # Tables Created
//!
//! ## 1. compliance_reports
//! Master table for tracking generated compliance reports with metadata and file paths.
//!
//! **Columns:**
//! - `id` (UUID, PK): Unique identifier
//! - `report_type` (STRING, NOT NULL): Report type (audit, reconciliation, sync_health, data_quality)
//! - `period_start` (TIMESTAMPTZ, NOT NULL): Report period start date
//! - `period_end` (TIMESTAMPTZ, NOT NULL): Report period end date
//! - `generated_at` (TIMESTAMPTZ, NOT NULL): When report was generated [default: now()]
//! - `generated_by` (UUID, NOT NULL, FK): User who generated the report
//! - `report_data` (JSONB): Structured report data
//! - `pdf_path` (TEXT): Path to PDF file
//! - `csv_path` (TEXT): Path to CSV file
//! - `status` (STRING, NOT NULL): Generation status [default: pending]
//! - `findings` (JSONB): Report findings and issues
//! - `error_message` (TEXT): Generation error details
//! - `created_at` (TIMESTAMPTZ, NOT NULL): Record creation [default: now()]
//! - `updated_at` (TIMESTAMPTZ, NOT NULL): Last update [default: now()]
//!
//! **Foreign Key:**
//! - `fk_compliance_reports_generated_by`: generated_by → users.id (RESTRICT on delete)
//!
//! **Indexes:**
//! - `idx_compliance_reports_type_period`: Composite on (report_type, period_start, period_end)
//! - `idx_compliance_reports_generated_by`: B-tree on generated_by
//! - `idx_compliance_reports_status`: B-tree on status
//!
//! ## 2. report_schedules
//! Automated report generation schedules with cron expressions and recipient management.
//!
//! **Columns:**
//! - `id` (UUID, PK): Unique identifier
//! - `report_type` (STRING, NOT NULL): Report type to generate
//! - `schedule_cron` (STRING, NOT NULL): Cron expression for scheduling
//! - `recipients` (TEXT[], NOT NULL): Email addresses for delivery [default: {}]
//! - `enabled` (BOOLEAN, NOT NULL): Whether schedule is active [default: true]
//! - `last_run_at` (TIMESTAMPTZ): Last execution timestamp
//! - `next_run_at` (TIMESTAMPTZ): Next scheduled execution
//! - `created_by` (UUID, NOT NULL, FK): User who created schedule
//! - `created_at` (TIMESTAMPTZ, NOT NULL): Record creation [default: now()]
//! - `updated_at` (TIMESTAMPTZ, NOT NULL): Last update [default: now()]
//!
//! **Foreign Key:**
//! - `fk_report_schedules_created_by`: created_by → users.id (RESTRICT on delete)
//!
//! **Index:**
//! - `idx_report_schedules_enabled_next_run`: Composite on (enabled, next_run_at)
//!
//! # SeaORM Builder Usage: 100% (8/8 operations)
//!
//! All schema operations use idempotent SeaORM builders.
//!
//! # Migration Strategy
//!
//! **Up Migration:**
//! 1. Create compliance_reports table with foreign key to users
//! 2. Create indexes for report type, period, and status queries
//! 3. Create report_schedules table with foreign key to users
//! 4. Create index for schedule execution queries
//!
//! **Down Migration:**
//! 1. Drop indexes from both tables
//! 2. Drop report_schedules table (foreign keys CASCADE)
//! 3. Drop compliance_reports table (foreign keys CASCADE)
//!
//! **Idempotency:** All operations use IF NOT EXISTS / IF EXISTS for safe re-execution.

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // ====================
        // Schema Modification: Create compliance_reports table
        // ====================
        // Tracks generated compliance reports with multi-format output and findings
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, ComplianceReports::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(ComplianceReports::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(ComplianceReports::ReportType)
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(ComplianceReports::PeriodStart)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(ComplianceReports::PeriodEnd)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(ComplianceReports::GeneratedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(ComplianceReports::GeneratedBy)
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(ComplianceReports::ReportData)
                            .json_binary()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(ComplianceReports::PdfPath)
                            .text()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(ComplianceReports::CsvPath)
                            .text()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(ComplianceReports::Status)
                            .string()
                            .not_null()
                            .default("pending"),
                    )
                    .col(
                        ColumnDef::new(ComplianceReports::Findings)
                            .json_binary()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(ComplianceReports::ErrorMessage)
                            .text()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(ComplianceReports::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(ComplianceReports::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_compliance_reports_generated_by")
                            .from((Schema::HrPublic, ComplianceReports::Table), ComplianceReports::GeneratedBy)
                            .to((Schema::HrPublic, Users::Table), Users::Id)
                            .on_delete(ForeignKeyAction::Restrict),
                    )
                    .to_owned(),
            )
            .await?;

        // Create indexes for compliance_reports
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_compliance_reports_type_period")
                    .table((Schema::HrPublic, ComplianceReports::Table))
                    .col(ComplianceReports::ReportType)
                    .col(ComplianceReports::PeriodStart)
                    .col(ComplianceReports::PeriodEnd)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_compliance_reports_generated_by")
                    .table((Schema::HrPublic, ComplianceReports::Table))
                    .col(ComplianceReports::GeneratedBy)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_compliance_reports_status")
                    .table((Schema::HrPublic, ComplianceReports::Table))
                    .col(ComplianceReports::Status)
                    .to_owned(),
            )
            .await?;

        // ====================
        // Schema Modification: Create report_schedules table
        // ====================
        // Manages automated report generation schedules with cron expressions
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, ReportSchedules::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(ReportSchedules::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(ReportSchedules::ReportType)
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(ReportSchedules::ScheduleCron)
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(ReportSchedules::Recipients)
                            .array(ColumnType::Text)
                            .not_null()
                            .default(Expr::value("{}"))
                    )
                    .col(
                        ColumnDef::new(ReportSchedules::Enabled)
                            .boolean()
                            .not_null()
                            .default(true),
                    )
                    .col(
                        ColumnDef::new(ReportSchedules::LastRunAt)
                            .timestamp_with_time_zone()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(ReportSchedules::NextRunAt)
                            .timestamp_with_time_zone()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(ReportSchedules::CreatedBy)
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(ReportSchedules::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(ReportSchedules::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_report_schedules_created_by")
                            .from((Schema::HrPublic, ReportSchedules::Table), ReportSchedules::CreatedBy)
                            .to((Schema::HrPublic, Users::Table), Users::Id)
                            .on_delete(ForeignKeyAction::Restrict),
                    )
                    .to_owned(),
            )
            .await?;

        // Create indexes for report_schedules
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_report_schedules_enabled_next_run")
                    .table((Schema::HrPublic, ReportSchedules::Table))
                    .col(ReportSchedules::Enabled)
                    .col(ReportSchedules::NextRunAt)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop indexes first
        manager
            .drop_index(
                Index::drop()
                    .if_exists()
                    .name("idx_report_schedules_enabled_next_run")
                    .table((Schema::HrPublic, ReportSchedules::Table))
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .if_exists()
                    .name("idx_compliance_reports_status")
                    .table((Schema::HrPublic, ComplianceReports::Table))
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .if_exists()
                    .name("idx_compliance_reports_generated_by")
                    .table((Schema::HrPublic, ComplianceReports::Table))
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .if_exists()
                    .name("idx_compliance_reports_type_period")
                    .table((Schema::HrPublic, ComplianceReports::Table))
                    .to_owned(),
            )
            .await?;

        // Drop tables
        manager
            .drop_table(Table::drop().if_exists().table((Schema::HrPublic, ReportSchedules::Table)).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().if_exists().table((Schema::HrPublic, ComplianceReports::Table)).to_owned())
            .await?;

        Ok(())
    }
}

#[derive(DeriveIden)]
enum ComplianceReports {
    Table,
    Id,
    ReportType,
    PeriodStart,
    PeriodEnd,
    GeneratedAt,
    GeneratedBy,
    ReportData,
    PdfPath,
    CsvPath,
    Status,
    Findings,
    ErrorMessage,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum ReportSchedules {
    Table,
    Id,
    ReportType,
    ScheduleCron,
    Recipients,
    Enabled,
    LastRunAt,
    NextRunAt,
    CreatedBy,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum Users {
    Table,
    Id,
}

#[derive(DeriveIden)]
enum Schema {
    HrPublic,
}
