use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create compliance_reports table
        manager
            .create_table(
                Table::create()
                    .table(ComplianceReports::Table)
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
                            .from(ComplianceReports::Table, ComplianceReports::GeneratedBy)
                            .to(Users::Table, Users::Id)
                            .on_delete(ForeignKeyAction::Restrict),
                    )
                    .to_owned(),
            )
            .await?;

        // Create indexes for compliance_reports
        manager
            .create_index(
                Index::create()
                    .name("idx_compliance_reports_type_period")
                    .table(ComplianceReports::Table)
                    .col(ComplianceReports::ReportType)
                    .col(ComplianceReports::PeriodStart)
                    .col(ComplianceReports::PeriodEnd)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_compliance_reports_generated_by")
                    .table(ComplianceReports::Table)
                    .col(ComplianceReports::GeneratedBy)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_compliance_reports_status")
                    .table(ComplianceReports::Table)
                    .col(ComplianceReports::Status)
                    .to_owned(),
            )
            .await?;

        // Create report_schedules table
        manager
            .create_table(
                Table::create()
                    .table(ReportSchedules::Table)
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
                            .from(ReportSchedules::Table, ReportSchedules::CreatedBy)
                            .to(Users::Table, Users::Id)
                            .on_delete(ForeignKeyAction::Restrict),
                    )
                    .to_owned(),
            )
            .await?;

        // Create indexes for report_schedules
        manager
            .create_index(
                Index::create()
                    .name("idx_report_schedules_enabled_next_run")
                    .table(ReportSchedules::Table)
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
                    .name("idx_report_schedules_enabled_next_run")
                    .table(ReportSchedules::Table)
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .name("idx_compliance_reports_status")
                    .table(ComplianceReports::Table)
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .name("idx_compliance_reports_generated_by")
                    .table(ComplianceReports::Table)
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .name("idx_compliance_reports_type_period")
                    .table(ComplianceReports::Table)
                    .to_owned(),
            )
            .await?;

        // Drop tables
        manager
            .drop_table(Table::drop().table(ReportSchedules::Table).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table(ComplianceReports::Table).to_owned())
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
