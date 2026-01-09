use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create audit_logs table for comprehensive activity tracking
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, AuditLogs::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(AuditLogs::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(ColumnDef::new(AuditLogs::EventType).string_len(100).not_null())
                    .col(ColumnDef::new(AuditLogs::EventCategory).string_len(50).not_null())
                    .col(ColumnDef::new(AuditLogs::EntityType).string_len(50).null())
                    .col(ColumnDef::new(AuditLogs::EntityId).string_len(255).null())
                    .col(ColumnDef::new(AuditLogs::UserId).uuid().null())
                    .col(ColumnDef::new(AuditLogs::UserEmail).string_len(255).null())
                    .col(ColumnDef::new(AuditLogs::Action).string_len(50).not_null())
                    .col(ColumnDef::new(AuditLogs::Description).text().not_null())
                    .col(ColumnDef::new(AuditLogs::OldValues).json_binary().null())
                    .col(ColumnDef::new(AuditLogs::NewValues).json_binary().null())
                    .col(ColumnDef::new(AuditLogs::ChangesSummary).json_binary().null())
                    .col(ColumnDef::new(AuditLogs::IpAddress).string_len(45).null())
                    .col(ColumnDef::new(AuditLogs::UserAgent).text().null())
                    .col(ColumnDef::new(AuditLogs::SessionId).uuid().null())
                    .col(ColumnDef::new(AuditLogs::SyncDirection).string_len(20).null())
                    .col(ColumnDef::new(AuditLogs::SyncJobId).uuid().null())
                    .col(ColumnDef::new(AuditLogs::Source).string_len(50).not_null())
                    .col(ColumnDef::new(AuditLogs::Status).string_len(20).not_null().default("success"))
                    .col(ColumnDef::new(AuditLogs::ErrorMessage).text().null())
                    .col(ColumnDef::new(AuditLogs::Metadata).json_binary().null())
                    .col(
                        ColumnDef::new(AuditLogs::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .extra("DEFAULT CURRENT_TIMESTAMP"),
                    )
                    .to_owned(),
            )
            .await?;

        // Create indexes for efficient querying
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_audit_logs_created_at")
                    .table((Schema::HrPublic, AuditLogs::Table))
                    .col(AuditLogs::CreatedAt)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_audit_logs_user_id")
                    .table((Schema::HrPublic, AuditLogs::Table))
                    .col(AuditLogs::UserId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_audit_logs_entity")
                    .table((Schema::HrPublic, AuditLogs::Table))
                    .col(AuditLogs::EntityType)
                    .col(AuditLogs::EntityId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_audit_logs_event_category")
                    .table((Schema::HrPublic, AuditLogs::Table))
                    .col(AuditLogs::EventCategory)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_audit_logs_sync_job_id")
                    .table((Schema::HrPublic, AuditLogs::Table))
                    .col(AuditLogs::SyncJobId)
                    .to_owned(),
            )
            .await?;

        // Add constraints
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                ALTER TABLE hr_public.audit_logs
                ADD CONSTRAINT check_event_category
                CHECK (event_category IN ('sync', 'auth', 'data_change', 'system', 'user_action', 'api_call'));

                ALTER TABLE hr_public.audit_logs
                ADD CONSTRAINT check_action
                CHECK (action IN ('create', 'update', 'delete', 'read', 'sync', 'login', 'logout', 'failed_login', 'export', 'import', 'approve', 'reject'));

                ALTER TABLE hr_public.audit_logs
                ADD CONSTRAINT check_status
                CHECK (status IN ('success', 'failed', 'partial', 'pending'));

                ALTER TABLE hr_public.audit_logs
                ADD CONSTRAINT check_sync_direction
                CHECK (sync_direction IS NULL OR sync_direction IN ('pull', 'push', 'bidirectional'));

                ALTER TABLE hr_public.audit_logs
                ADD CONSTRAINT check_source
                CHECK (source IN ('web_ui', 'api', 'sync_job', 'webhook', 'scheduled_task', 'system'));

                COMMENT ON TABLE hr_public.audit_logs IS 'Comprehensive audit trail for all system activities';
                COMMENT ON COLUMN hr_public.audit_logs.event_type IS 'Specific event identifier (e.g., employee_synced, user_login)';
                COMMENT ON COLUMN hr_public.audit_logs.event_category IS 'High-level category of the event';
                COMMENT ON COLUMN hr_public.audit_logs.entity_type IS 'Type of entity affected (user, employee, department)';
                COMMENT ON COLUMN hr_public.audit_logs.entity_id IS 'ID of the affected entity';
                COMMENT ON COLUMN hr_public.audit_logs.action IS 'Action performed';
                COMMENT ON COLUMN hr_public.audit_logs.old_values IS 'Previous values before change (JSON)';
                COMMENT ON COLUMN hr_public.audit_logs.new_values IS 'New values after change (JSON)';
                COMMENT ON COLUMN hr_public.audit_logs.changes_summary IS 'Summary of field-level changes (JSON)';
                COMMENT ON COLUMN hr_public.audit_logs.sync_direction IS 'Direction of sync operation if applicable';
                COMMENT ON COLUMN hr_public.audit_logs.sync_job_id IS 'Reference to sync job if part of batch operation';
                "#,
            )
            .await?;

        // Create audit_log_retention policy table
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, AuditLogRetention::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(AuditLogRetention::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(ColumnDef::new(AuditLogRetention::EventCategory).string_len(50).not_null().unique_key())
                    .col(ColumnDef::new(AuditLogRetention::RetentionDays).integer().not_null().default(365))
                    .col(ColumnDef::new(AuditLogRetention::ArchiveAfterDays).integer().null())
                    .col(ColumnDef::new(AuditLogRetention::IsActive).boolean().not_null().default(true))
                    .col(
                        ColumnDef::new(AuditLogRetention::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .extra("DEFAULT CURRENT_TIMESTAMP"),
                    )
                    .col(
                        ColumnDef::new(AuditLogRetention::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .extra("DEFAULT CURRENT_TIMESTAMP"),
                    )
                    .to_owned(),
            )
            .await?;

        // Insert default retention policies
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                INSERT INTO hr_public.audit_log_retention (event_category, retention_days, archive_after_days)
                VALUES
                    ('sync', 730, 365),           -- 2 years retention, archive after 1 year
                    ('auth', 365, 180),           -- 1 year retention, archive after 6 months
                    ('data_change', 1095, 365),   -- 3 years retention, archive after 1 year
                    ('system', 180, 90),          -- 6 months retention, archive after 3 months
                    ('user_action', 365, 180),    -- 1 year retention, archive after 6 months
                    ('api_call', 90, 30);         -- 90 days retention, archive after 30 days
                "#,
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table((Schema::HrPublic, AuditLogRetention::Table)).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table((Schema::HrPublic, AuditLogs::Table)).to_owned())
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
enum AuditLogs {
    #[sea_orm(iden = "audit_logs")]
    Table,
    #[sea_orm(iden = "id")]
    Id,
    #[sea_orm(iden = "event_type")]
    EventType,
    #[sea_orm(iden = "event_category")]
    EventCategory,
    #[sea_orm(iden = "entity_type")]
    EntityType,
    #[sea_orm(iden = "entity_id")]
    EntityId,
    #[sea_orm(iden = "user_id")]
    UserId,
    #[sea_orm(iden = "user_email")]
    UserEmail,
    #[sea_orm(iden = "action")]
    Action,
    #[sea_orm(iden = "description")]
    Description,
    #[sea_orm(iden = "old_values")]
    OldValues,
    #[sea_orm(iden = "new_values")]
    NewValues,
    #[sea_orm(iden = "changes_summary")]
    ChangesSummary,
    #[sea_orm(iden = "ip_address")]
    IpAddress,
    #[sea_orm(iden = "user_agent")]
    UserAgent,
    #[sea_orm(iden = "session_id")]
    SessionId,
    #[sea_orm(iden = "sync_direction")]
    SyncDirection,
    #[sea_orm(iden = "sync_job_id")]
    SyncJobId,
    #[sea_orm(iden = "source")]
    Source,
    #[sea_orm(iden = "status")]
    Status,
    #[sea_orm(iden = "error_message")]
    ErrorMessage,
    #[sea_orm(iden = "metadata")]
    Metadata,
    #[sea_orm(iden = "created_at")]
    CreatedAt,
}

#[derive(DeriveIden)]
enum AuditLogRetention {
    #[sea_orm(iden = "audit_log_retention")]
    Table,
    #[sea_orm(iden = "id")]
    Id,
    #[sea_orm(iden = "event_category")]
    EventCategory,
    #[sea_orm(iden = "retention_days")]
    RetentionDays,
    #[sea_orm(iden = "archive_after_days")]
    ArchiveAfterDays,
    #[sea_orm(iden = "is_active")]
    IsActive,
    #[sea_orm(iden = "created_at")]
    CreatedAt,
    #[sea_orm(iden = "updated_at")]
    UpdatedAt,
}
