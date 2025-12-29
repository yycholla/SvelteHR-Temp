use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create sync_schedules table
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, SyncSchedules::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(SyncSchedules::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()".to_string()),
                    )
                    .col(
                        ColumnDef::new(SyncSchedules::Name)
                            .string_len(255)
                            .not_null(),
                    )
                    .col(ColumnDef::new(SyncSchedules::Description).text())
                    .col(
                        ColumnDef::new(SyncSchedules::CronExpression)
                            .string_len(100)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(SyncSchedules::EntityType)
                            .string_len(50)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(SyncSchedules::SyncDirection)
                            .string_len(20)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(SyncSchedules::Enabled)
                            .boolean()
                            .not_null()
                            .default(true),
                    )
                    .col(
                        ColumnDef::new(SyncSchedules::BusinessHoursOnly)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .col(
                        ColumnDef::new(SyncSchedules::Timezone)
                            .string_len(50)
                            .not_null()
                            .default("UTC"),
                    )
                    .col(ColumnDef::new(SyncSchedules::LastRunAt).timestamp_with_time_zone())
                    .col(ColumnDef::new(SyncSchedules::NextRunAt).timestamp_with_time_zone())
                    .col(ColumnDef::new(SyncSchedules::LastRunStatus).string_len(20))
                    .col(ColumnDef::new(SyncSchedules::LastRunError).text())
                    .col(ColumnDef::new(SyncSchedules::CreatedBy).uuid())
                    .col(
                        ColumnDef::new(SyncSchedules::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .extra("DEFAULT NOW()".to_string()),
                    )
                    .col(
                        ColumnDef::new(SyncSchedules::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .extra("DEFAULT NOW()".to_string()),
                    )
                    .col(ColumnDef::new(SyncSchedules::DeletedAt).timestamp_with_time_zone())
                    .to_owned(),
            )
            .await?;

        // Add foreign key constraint using raw SQL to specify hr_public schema
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                ALTER TABLE hr_public.sync_schedules
                ADD CONSTRAINT fk_sync_schedules_created_by
                FOREIGN KEY (created_by)
                REFERENCES hr_public.users(id)
                ON DELETE SET NULL
                "#,
            )
            .await?;

        // Create index on enabled schedules for faster queries
        manager
            .create_index(
                Index::create()
                    .name("idx_sync_schedules_enabled")
                    .table((Schema::HrPublic, SyncSchedules::Table))
                    .col(SyncSchedules::Enabled)
                    .col(SyncSchedules::NextRunAt)
                    .to_owned(),
            )
            .await?;

        // Create sync_schedule_history table
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, SyncScheduleHistory::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(SyncScheduleHistory::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()".to_string()),
                    )
                    .col(
                        ColumnDef::new(SyncScheduleHistory::ScheduleId)
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(SyncScheduleHistory::StartedAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .col(ColumnDef::new(SyncScheduleHistory::CompletedAt).timestamp_with_time_zone())
                    .col(
                        ColumnDef::new(SyncScheduleHistory::Status)
                            .string_len(20)
                            .not_null(),
                    )
                    .col(ColumnDef::new(SyncScheduleHistory::RecordsSynced).integer())
                    .col(ColumnDef::new(SyncScheduleHistory::RecordsPushed).integer())
                    .col(ColumnDef::new(SyncScheduleHistory::RecordsPulled).integer())
                    .col(ColumnDef::new(SyncScheduleHistory::ErrorsCount).integer())
                    .col(ColumnDef::new(SyncScheduleHistory::ErrorMessage).text())
                    .col(ColumnDef::new(SyncScheduleHistory::ExecutionTimeMs).integer())
                    .col(
                        ColumnDef::new(SyncScheduleHistory::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .extra("DEFAULT NOW()".to_string()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_sync_schedule_history_schedule_id")
                            .from(SyncScheduleHistory::Table, SyncScheduleHistory::ScheduleId)
                            .to(SyncSchedules::Table, SyncSchedules::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // Create index on history for faster lookups by schedule
        manager
            .create_index(
                Index::create()
                    .name("idx_schedule_history_schedule")
                    .table((Schema::HrPublic, SyncScheduleHistory::Table))
                    .col(SyncScheduleHistory::ScheduleId)
                    .col(SyncScheduleHistory::StartedAt)
                    .to_owned(),
            )
            .await?;

        // Add constraint to validate cron expression format (basic validation)
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                ALTER TABLE hr_public.sync_schedules
                ADD CONSTRAINT valid_cron_expression
                CHECK (cron_expression ~ '^[0-9\*\/\,\-]+ [0-9\*\/\,\-]+ [0-9\*\/\,\-]+ [0-9\*\/\,\-]+ [0-9\*\/\,\-]+$')
                "#,
            )
            .await?;

        // Add constraint to validate entity type
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                ALTER TABLE hr_public.sync_schedules
                ADD CONSTRAINT valid_entity_type
                CHECK (entity_type IN ('Employee', 'Department', 'Both'))
                "#,
            )
            .await?;

        // Add constraint to validate sync direction
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                ALTER TABLE hr_public.sync_schedules
                ADD CONSTRAINT valid_sync_direction
                CHECK (sync_direction IN ('Push', 'Pull', 'Bidirectional'))
                "#,
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop tables in reverse order
        manager
            .drop_table(Table::drop().table((Schema::HrPublic, SyncScheduleHistory::Table)).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table((Schema::HrPublic, SyncSchedules::Table)).to_owned())
            .await?;

        Ok(())
    }
}

#[derive(DeriveIden)]
enum Schema {
    HrPublic,
}

#[derive(DeriveIden)]
enum SyncSchedules {
    Table,
    Id,
    Name,
    Description,
    CronExpression,
    EntityType,
    SyncDirection,
    Enabled,
    BusinessHoursOnly,
    Timezone,
    LastRunAt,
    NextRunAt,
    LastRunStatus,
    LastRunError,
    CreatedBy,
    CreatedAt,
    UpdatedAt,
    DeletedAt,
}

#[derive(DeriveIden)]
enum SyncScheduleHistory {
    Table,
    Id,
    ScheduleId,
    StartedAt,
    CompletedAt,
    Status,
    RecordsSynced,
    RecordsPushed,
    RecordsPulled,
    ErrorsCount,
    ErrorMessage,
    ExecutionTimeMs,
    CreatedAt,
}

#[derive(DeriveIden)]
enum Users {
    Table,
    Id,
}
