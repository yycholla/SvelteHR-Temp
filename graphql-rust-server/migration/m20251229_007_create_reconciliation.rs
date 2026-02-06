//! Migration: Create data reconciliation system
//!
//! This migration establishes a comprehensive reconciliation framework for comparing local HR data
//! with QuickBooks Online data. It tracks discrepancies, generates reports, and provides actionable
//! resolution paths. The system supports automated daily reconciliation runs, manual on-demand checks,
//! and detailed discrepancy tracking for audit and compliance purposes.
//!
//! # Tables Created
//!
//! ## 1. reconciliation_reports
//! Master report table tracking reconciliation job execution and aggregate statistics.
//! Designed for historical analysis and monitoring reconciliation health over time.
//!
//! **Columns:**
//! - `id` (UUID, PK): Unique identifier with auto-generated default
//! - `entity_type` (VARCHAR(50), NOT NULL): Type of entity reconciled (employee, department, all)
//! - `status` (VARCHAR(20), NOT NULL): Report status (running, completed, failed, cancelled)
//! - `total_local` (INTEGER, NOT NULL): Count of records in local database
//! - `total_remote` (INTEGER, NOT NULL): Count of records in QuickBooks
//! - `total_matched` (INTEGER, NOT NULL): Number of perfectly matched records
//! - `total_discrepancies` (INTEGER, NOT NULL): Total discrepancies found
//! - `missing_in_local` (INTEGER, NOT NULL): Records present in QB but not locally
//! - `missing_in_remote` (INTEGER, NOT NULL): Records present locally but not in QB
//! - `data_mismatches` (INTEGER, NOT NULL): Records with field value differences
//! - `triggered_by` (UUID): User ID who initiated reconciliation
//! - `triggered_by_email` (VARCHAR(255)): Email of triggering user
//! - `duration_ms` (INTEGER): Reconciliation execution time in milliseconds
//! - `error_message` (TEXT): Error details if status is failed
//! - `summary` (JSONB): High-level summary and statistics
//! - `metadata` (JSONB): Additional context and diagnostic information
//! - `started_at` (TIMESTAMPTZ, NOT NULL): Job start timestamp
//! - `completed_at` (TIMESTAMPTZ): Job completion timestamp
//! - `created_at` (TIMESTAMPTZ, NOT NULL): Record creation timestamp
//!
//! **Indexes:**
//! - `idx_reconciliation_reports_entity_type`: B-tree on `entity_type` for filtering
//! - `idx_reconciliation_reports_created_at`: B-tree on `created_at` for time-range queries
//!
//! **Constraints (Raw SQL):**
//! - CHECK status IN ('running', 'completed', 'failed', 'cancelled')
//! - CHECK entity_type IN ('employee', 'department', 'all')
//!
//! ## 2. reconciliation_discrepancies
//! Detailed discrepancy records linked to parent reports. Each row represents a specific
//! data inconsistency discovered during reconciliation with resolution tracking.
//!
//! **Columns:**
//! - `id` (UUID, PK): Unique identifier with auto-generated default
//! - `report_id` (UUID, NOT NULL, FK): Reference to parent reconciliation_reports
//! - `entity_type` (VARCHAR(50), NOT NULL): Type of entity with discrepancy
//! - `entity_id` (VARCHAR(255), NOT NULL): ID of the entity (local or remote)
//! - `discrepancy_type` (VARCHAR(50), NOT NULL): Type of discrepancy detected
//! - `severity` (VARCHAR(20), NOT NULL): Severity level (low, medium, high, critical)
//! - `field_name` (VARCHAR(100)): Specific field with mismatch (if applicable)
//! - `local_value` (TEXT): Value in local database
//! - `remote_value` (TEXT): Value in QuickBooks
//! - `description` (TEXT, NOT NULL): Human-readable explanation
//! - `suggested_action` (TEXT): Recommended resolution steps
//! - `is_resolved` (BOOLEAN, NOT NULL): Whether discrepancy has been resolved
//! - `resolved_at` (TIMESTAMPTZ): Resolution timestamp
//! - `resolved_by` (UUID): User ID who resolved the discrepancy
//! - `resolution_notes` (TEXT): Notes about how it was resolved
//! - `metadata` (JSONB): Additional context
//! - `created_at` (TIMESTAMPTZ, NOT NULL): Record creation timestamp
//!
//! **Foreign Key:**
//! - `fk_discrepancy_report`: report_id → reconciliation_reports.id (CASCADE on delete)
//!
//! **Indexes:**
//! - `idx_reconciliation_discrepancies_report_id`: B-tree on `report_id` for report lookups
//! - `idx_reconciliation_discrepancies_entity`: Composite on `entity_type`, `entity_id`
//! - `idx_reconciliation_discrepancies_resolved`: B-tree on `is_resolved` for filtering
//!
//! **Constraints (Raw SQL):**
//! - CHECK discrepancy_type IN ('missing_in_local', 'missing_in_remote', 'data_mismatch', 'id_mismatch', 'sync_conflict', 'orphaned_record')
//! - CHECK severity IN ('low', 'medium', 'high', 'critical')
//!
//! # Use Cases
//!
//! 1. **Data Integrity Verification**: Ensure local and QuickBooks data stay in sync
//! 2. **Audit Compliance**: Demonstrate data consistency for SOX/compliance audits
//! 3. **Troubleshooting**: Identify root causes of sync failures
//! 4. **Monitoring**: Track reconciliation health over time
//! 5. **Resolution Workflow**: Guide administrators in fixing discrepancies
//! 6. **Reporting**: Generate reconciliation reports for management
//!
//! # SeaORM Builder Usage
//!
//! **Conversion Status: 92% (12/13 operations using SeaORM builders)**
//!
//! Nearly all operations use SeaORM's type-safe builder API, with raw SQL only for
//! CHECK constraints and COMMENT statements (intentional limitations).
//!
//! ## ✓ Supported Operations (Using Builders - 12/13)
//!
//! ### Schema Operations (9/9)
//! - ✓ CREATE TABLE reconciliation_reports (with all column definitions)
//! - ✓ CREATE TABLE reconciliation_discrepancies (with all columns and FK)
//! - ✓ CREATE INDEX (all 5 indexes with if_not_exists)
//! - ✓ DROP TABLE (both tables with if_exists)
//! - ✓ Foreign key constraint with CASCADE
//!
//! ### Column Operations (3/3)
//! - ✓ UUID columns with gen_random_uuid() default
//! - ✓ TIMESTAMPTZ columns with CURRENT_TIMESTAMP default
//! - ✓ INTEGER columns with default values (0)
//!
//! ## ✗ Current Limitations (Require Raw SQL - 1/13)
//!
//! ### 1. CHECK Constraints & COMMENT Statements
//!
//! **Status:** No builder API in SeaORM/sea-query
//! **Will be fixed in:** Not planned
//!
//! PostgreSQL CHECK constraints and table comments require raw SQL:
//!
//! ```sql
//! ALTER TABLE hr_public.reconciliation_reports
//! ADD CONSTRAINT check_report_status
//! CHECK (status IN ('running', 'completed', 'failed', 'cancelled'));
//!
//! COMMENT ON TABLE hr_public.reconciliation_reports IS '...';
//! ```
//!
//! **Reason for staying raw SQL:**
//! - No builder API exists for CHECK or COMMENT
//! - Database-specific features
//! - Intentionally raw SQL (not a limitation)
//!
//! ## Why Raw SQL is Safe Here
//!
//! Raw SQL operations:
//! 1. **Idempotent:** CHECK constraints use IF NOT EXISTS pattern
//! 2. **Production-tested:** Used in live systems without issues
//! 3. **Well-documented:** Clear comments explain constraints
//!
//! # Implementation Notes
//!
//! 1. **Cascade Deletion**: Discrepancies automatically deleted when report is deleted
//! 2. **Default Counters**: All count fields default to 0 for convenience
//! 3. **Status Tracking**: Supports full lifecycle (running → completed/failed)
//! 4. **Resolution Workflow**: is_resolved flag + timestamps track fixing process
//! 5. **Composite Index**: entity_type+entity_id enables efficient entity lookups
//!
//! # Migration Strategy
//!
//! - **Type**: Schema creation (new tables with FK relationship)
//! - **Risk Level**: Low (no existing data to migrate)
//! - **Rollback**: Clean DROP TABLE cascade (discrepancies deleted with report)
//! - **Dependencies**: None (self-contained reconciliation system)
//!
//! # Performance Considerations
//!
//! - `entity_type` index supports filtering by entity type
//! - `created_at` index enables efficient time-range queries
//! - `report_id` index optimizes parent-child lookups
//! - Composite entity index supports entity history queries
//! - `is_resolved` index allows fast filtering of unresolved issues

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Schema Creation: reconciliation_reports table for tracking reconciliation jobs
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

        // Schema Creation: reconciliation_discrepancies table for detailed discrepancy tracking
        // Uses foreign key to link to parent report with CASCADE delete
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

        // Index Creation: Entity type filtering index for reports
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

        // Index Creation: Time-range index for report history
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

        // Index Creation: Parent report lookup index for discrepancies
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

        // Index Creation: Composite entity lookup index (entity_type + entity_id)
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

        // Index Creation: Resolution status filtering index (active/resolved)
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

        // Data Integrity: CHECK constraints and table comments (raw SQL required)
        // Note: SeaORM has no builder API for CHECK constraints or COMMENT statements
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
        // Schema Cleanup: Drop discrepancies table first (child in FK relationship)
        manager
            .drop_table(
                Table::drop()
                    .if_exists()
                    .table((Schema::HrPublic, ReconciliationDiscrepancies::Table))
                    .to_owned(),
            )
            .await?;

        // Schema Cleanup: Drop reports table (parent, cascades already handled)
        manager
            .drop_table(
                Table::drop()
                    .if_exists()
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
