use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // 1. Add birth_date to users
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, Users::Table))
                    .add_column(ColumnDef::new(Users::BirthDate).date().null())
                    .to_owned(),
            )
            .await?;

        // 2. Create employee_import_jobs
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

        // 3. Create employee_import_rows
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
