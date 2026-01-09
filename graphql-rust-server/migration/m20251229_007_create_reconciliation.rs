use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create reconciliation_reports table
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, ReconciliationReports::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(ReconciliationReports::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(ColumnDef::new(ReconciliationReports::EntityType).string_len(50).not_null())
                    .col(ColumnDef::new(ReconciliationReports::Status).string_len(20).not_null().default("running"))
                    .col(ColumnDef::new(ReconciliationReports::TotalLocal).integer().not_null().default(0))
                    .col(ColumnDef::new(ReconciliationReports::TotalRemote).integer().not_null().default(0))
                    .col(ColumnDef::new(ReconciliationReports::TotalMatched).integer().not_null().default(0))
                    .col(ColumnDef::new(ReconciliationReports::TotalDiscrepancies).integer().not_null().default(0))
                    .col(ColumnDef::new(ReconciliationReports::MissingInLocal).integer().not_null().default(0))
                    .col(ColumnDef::new(ReconciliationReports::MissingInRemote).integer().not_null().default(0))
                    .col(ColumnDef::new(ReconciliationReports::DataMismatches).integer().not_null().default(0))
                    .col(ColumnDef::new(ReconciliationReports::TriggeredBy).uuid().null())
                    .col(ColumnDef::new(ReconciliationReports::TriggeredByEmail).string_len(255).null())
                    .col(ColumnDef::new(ReconciliationReports::DurationMs).integer().null())
                    .col(ColumnDef::new(ReconciliationReports::ErrorMessage).text().null())
                    .col(ColumnDef::new(ReconciliationReports::Summary).json_binary().null())
                    .col(ColumnDef::new(ReconciliationReports::Metadata).json_binary().null())
                    .col(
                        ColumnDef::new(ReconciliationReports::StartedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .extra("DEFAULT CURRENT_TIMESTAMP"),
                    )
                    .col(ColumnDef::new(ReconciliationReports::CompletedAt).timestamp_with_time_zone().null())
                    .col(
                        ColumnDef::new(ReconciliationReports::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .extra("DEFAULT CURRENT_TIMESTAMP"),
                    )
                    .to_owned(),
            )
            .await?;

        // Create reconciliation_discrepancies table
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, ReconciliationDiscrepancies::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(ReconciliationDiscrepancies::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(
                        ColumnDef::new(ReconciliationDiscrepancies::ReportId)
                            .uuid()
                            .not_null(),
                    )
                    .col(ColumnDef::new(ReconciliationDiscrepancies::EntityType).string_len(50).not_null())
                    .col(ColumnDef::new(ReconciliationDiscrepancies::EntityId).string_len(255).not_null())
                    .col(ColumnDef::new(ReconciliationDiscrepancies::DiscrepancyType).string_len(50).not_null())
                    .col(ColumnDef::new(ReconciliationDiscrepancies::Severity).string_len(20).not_null().default("medium"))
                    .col(ColumnDef::new(ReconciliationDiscrepancies::FieldName).string_len(100).null())
                    .col(ColumnDef::new(ReconciliationDiscrepancies::LocalValue).text().null())
                    .col(ColumnDef::new(ReconciliationDiscrepancies::RemoteValue).text().null())
                    .col(ColumnDef::new(ReconciliationDiscrepancies::Description).text().not_null())
                    .col(ColumnDef::new(ReconciliationDiscrepancies::SuggestedAction).text().null())
                    .col(ColumnDef::new(ReconciliationDiscrepancies::IsResolved).boolean().not_null().default(false))
                    .col(ColumnDef::new(ReconciliationDiscrepancies::ResolvedAt).timestamp_with_time_zone().null())
                    .col(ColumnDef::new(ReconciliationDiscrepancies::ResolvedBy).uuid().null())
                    .col(ColumnDef::new(ReconciliationDiscrepancies::ResolutionNotes).text().null())
                    .col(ColumnDef::new(ReconciliationDiscrepancies::Metadata).json_binary().null())
                    .col(
                        ColumnDef::new(ReconciliationDiscrepancies::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .extra("DEFAULT CURRENT_TIMESTAMP"),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_discrepancy_report")
                            .from(
                                (Schema::HrPublic, ReconciliationDiscrepancies::Table),
                                ReconciliationDiscrepancies::ReportId,
                            )
                            .to((Schema::HrPublic, ReconciliationReports::Table), ReconciliationReports::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // Create indexes
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_reconciliation_reports_entity_type")
                    .table((Schema::HrPublic, ReconciliationReports::Table))
                    .col(ReconciliationReports::EntityType)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_reconciliation_reports_created_at")
                    .table((Schema::HrPublic, ReconciliationReports::Table))
                    .col(ReconciliationReports::CreatedAt)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_reconciliation_discrepancies_report_id")
                    .table((Schema::HrPublic, ReconciliationDiscrepancies::Table))
                    .col(ReconciliationDiscrepancies::ReportId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_reconciliation_discrepancies_entity")
                    .table((Schema::HrPublic, ReconciliationDiscrepancies::Table))
                    .col(ReconciliationDiscrepancies::EntityType)
                    .col(ReconciliationDiscrepancies::EntityId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_reconciliation_discrepancies_resolved")
                    .table((Schema::HrPublic, ReconciliationDiscrepancies::Table))
                    .col(ReconciliationDiscrepancies::IsResolved)
                    .to_owned(),
            )
            .await?;

        // Add constraints
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                ALTER TABLE hr_public.reconciliation_reports
                ADD CONSTRAINT check_report_status
                CHECK (status IN ('running', 'completed', 'failed', 'cancelled'));

                ALTER TABLE hr_public.reconciliation_reports
                ADD CONSTRAINT check_entity_type
                CHECK (entity_type IN ('employee', 'department', 'all'));

                ALTER TABLE hr_public.reconciliation_discrepancies
                ADD CONSTRAINT check_discrepancy_type
                CHECK (discrepancy_type IN ('missing_in_local', 'missing_in_remote', 'data_mismatch', 'id_mismatch', 'sync_conflict', 'orphaned_record'));

                ALTER TABLE hr_public.reconciliation_discrepancies
                ADD CONSTRAINT check_severity
                CHECK (severity IN ('low', 'medium', 'high', 'critical'));

                COMMENT ON TABLE hr_public.reconciliation_reports IS 'Reconciliation reports comparing local and QuickBooks data';
                COMMENT ON TABLE hr_public.reconciliation_discrepancies IS 'Individual discrepancies found during reconciliation';
                COMMENT ON COLUMN hr_public.reconciliation_reports.total_matched IS 'Number of records that matched perfectly';
                COMMENT ON COLUMN hr_public.reconciliation_reports.total_discrepancies IS 'Total number of discrepancies found';
                COMMENT ON COLUMN hr_public.reconciliation_discrepancies.discrepancy_type IS 'Type of discrepancy detected';
                COMMENT ON COLUMN hr_public.reconciliation_discrepancies.severity IS 'Severity level of the discrepancy';
                "#,
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(
                Table::drop()
                    .table((Schema::HrPublic, ReconciliationDiscrepancies::Table))
                    .to_owned(),
            )
            .await?;

        manager
            .drop_table(
                Table::drop()
                    .table((Schema::HrPublic, ReconciliationReports::Table))
                    .to_owned(),
            )
            .await?;

        Ok(())
    }
}

#[derive(DeriveIden)]
enum Schema {
    #[sea_orm(iden = "hr_public")]
    HrPublic,
}

#[derive(DeriveIden)]
enum ReconciliationReports {
    #[sea_orm(iden = "reconciliation_reports")]
    Table,
    #[sea_orm(iden = "id")]
    Id,
    #[sea_orm(iden = "entity_type")]
    EntityType,
    #[sea_orm(iden = "status")]
    Status,
    #[sea_orm(iden = "total_local")]
    TotalLocal,
    #[sea_orm(iden = "total_remote")]
    TotalRemote,
    #[sea_orm(iden = "total_matched")]
    TotalMatched,
    #[sea_orm(iden = "total_discrepancies")]
    TotalDiscrepancies,
    #[sea_orm(iden = "missing_in_local")]
    MissingInLocal,
    #[sea_orm(iden = "missing_in_remote")]
    MissingInRemote,
    #[sea_orm(iden = "data_mismatches")]
    DataMismatches,
    #[sea_orm(iden = "triggered_by")]
    TriggeredBy,
    #[sea_orm(iden = "triggered_by_email")]
    TriggeredByEmail,
    #[sea_orm(iden = "duration_ms")]
    DurationMs,
    #[sea_orm(iden = "error_message")]
    ErrorMessage,
    #[sea_orm(iden = "summary")]
    Summary,
    #[sea_orm(iden = "metadata")]
    Metadata,
    #[sea_orm(iden = "started_at")]
    StartedAt,
    #[sea_orm(iden = "completed_at")]
    CompletedAt,
    #[sea_orm(iden = "created_at")]
    CreatedAt,
}

#[derive(DeriveIden)]
enum ReconciliationDiscrepancies {
    #[sea_orm(iden = "reconciliation_discrepancies")]
    Table,
    #[sea_orm(iden = "id")]
    Id,
    #[sea_orm(iden = "report_id")]
    ReportId,
    #[sea_orm(iden = "entity_type")]
    EntityType,
    #[sea_orm(iden = "entity_id")]
    EntityId,
    #[sea_orm(iden = "discrepancy_type")]
    DiscrepancyType,
    #[sea_orm(iden = "severity")]
    Severity,
    #[sea_orm(iden = "field_name")]
    FieldName,
    #[sea_orm(iden = "local_value")]
    LocalValue,
    #[sea_orm(iden = "remote_value")]
    RemoteValue,
    #[sea_orm(iden = "description")]
    Description,
    #[sea_orm(iden = "suggested_action")]
    SuggestedAction,
    #[sea_orm(iden = "is_resolved")]
    IsResolved,
    #[sea_orm(iden = "resolved_at")]
    ResolvedAt,
    #[sea_orm(iden = "resolved_by")]
    ResolvedBy,
    #[sea_orm(iden = "resolution_notes")]
    ResolutionNotes,
    #[sea_orm(iden = "metadata")]
    Metadata,
    #[sea_orm(iden = "created_at")]
    CreatedAt,
}
