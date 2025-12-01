use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, ApplicationSettings::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(ApplicationSettings::Id)
                            .integer()
                            .not_null()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(ApplicationSettings::SystemName)
                            .string_len(255)
                            .not_null()
                            .default("MoncuraHR"),
                    )
                    .col(
                        ColumnDef::new(ApplicationSettings::SystemTimezone)
                            .string_len(100)
                            .not_null()
                            .default("UTC"),
                    )
                    .col(
                        ColumnDef::new(ApplicationSettings::SessionTimeoutMinutes)
                            .integer()
                            .not_null()
                            .default(60),
                    )
                    .col(
                        ColumnDef::new(ApplicationSettings::MinPasswordLength)
                            .integer()
                            .not_null()
                            .default(12),
                    )
                    .col(
                        ColumnDef::new(ApplicationSettings::MaxLoginAttempts)
                            .integer()
                            .not_null()
                            .default(5),
                    )
                    .col(
                        ColumnDef::new(ApplicationSettings::RequireMfa)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .col(
                        ColumnDef::new(ApplicationSettings::PasswordExpirationEnabled)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .col(
                        ColumnDef::new(ApplicationSettings::PasswordExpirationDays)
                            .integer()
                            .default(90),
                    )
                    .col(
                        ColumnDef::new(ApplicationSettings::HttpsEnforced)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .col(ColumnDef::new(ApplicationSettings::CspPolicy).text())
                    .col(
                        ColumnDef::new(ApplicationSettings::XFrameOptions)
                            .boolean()
                            .not_null()
                            .default(true),
                    )
                    .col(
                        ColumnDef::new(ApplicationSettings::HstsEnabled)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .col(ColumnDef::new(ApplicationSettings::CorsOrigins).array(ColumnType::Text))
                    .col(
                        ColumnDef::new(ApplicationSettings::LogLevelFrontend)
                            .string_len(20)
                            .not_null()
                            .default("INFO"),
                    )
                    .col(
                        ColumnDef::new(ApplicationSettings::LogLevelBackend)
                            .string_len(20)
                            .not_null()
                            .default("INFO"),
                    )
                    .col(
                        ColumnDef::new(ApplicationSettings::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(ApplicationSettings::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(ColumnDef::new(ApplicationSettings::UpdatedBy).uuid())
                    .to_owned(),
            )
            .await?;

        // Note: CHECK constraint for singleton enforcement (id = 1) and
        // foreign key to users table will be added in a follow-up migration

        // Insert default row
        let insert = Query::insert()
            .into_table((Schema::HrPublic, ApplicationSettings::Table))
            .columns([ApplicationSettings::Id])
            .values_panic([1.into()])
            .on_conflict(
                OnConflict::column(ApplicationSettings::Id)
                    .do_nothing()
                    .to_owned(),
            )
            .to_owned();

        manager.exec_stmt(insert).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(
                Table::drop()
                    .table((Schema::HrPublic, ApplicationSettings::Table))
                    .to_owned(),
            )
            .await
    }
}

#[derive(Iden)]
enum Schema {
    HrPublic,
}

#[derive(Iden)]
enum ApplicationSettings {
    Table,
    Id,
    SystemName,
    SystemTimezone,
    SessionTimeoutMinutes,
    MinPasswordLength,
    MaxLoginAttempts,
    RequireMfa,
    PasswordExpirationEnabled,
    PasswordExpirationDays,
    HttpsEnforced,
    CspPolicy,
    XFrameOptions,
    HstsEnabled,
    CorsOrigins,
    LogLevelFrontend,
    LogLevelBackend,
    CreatedAt,
    UpdatedAt,
    UpdatedBy,
}


