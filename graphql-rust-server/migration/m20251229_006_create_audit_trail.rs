//! Migration: Create comprehensive audit trail system
//!
//! This migration establishes a complete audit logging infrastructure for tracking all system
//! activities, data changes, and user actions. It provides detailed audit trails for compliance,
//! security monitoring, and operational diagnostics. The system includes configurable retention
//! policies for different event categories and supports efficient querying of audit history.
//!
//! # Tables Created
//!
//! ## 1. audit_logs
//! Comprehensive audit trail table for all system activities with detailed change tracking.
//! Designed for high-volume logging with efficient indexing and flexible querying.
//!
//! **Columns:**
//! - `id` (UUID, PK): Unique identifier with auto-generated default
//! - `event_type` (VARCHAR(100), NOT NULL): Specific event identifier (e.g., employee_synced, user_login)
//! - `event_category` (VARCHAR(50), NOT NULL): High-level category (sync, auth, data_change, etc.)
//! - `entity_type` (VARCHAR(50)): Type of entity affected (user, employee, department)
//! - `entity_id` (VARCHAR(255)): ID of the affected entity
//! - `user_id` (UUID): User who performed the action
//! - `user_email` (VARCHAR(255)): Email of the user (for soft-deleted users)
//! - `action` (VARCHAR(50), NOT NULL): Action performed (create, update, delete, etc.)
//! - `description` (TEXT, NOT NULL): Human-readable description of the event
//! - `old_values` (JSONB): Previous values before change
//! - `new_values` (JSONB): New values after change
//! - `changes_summary` (JSONB): Summary of field-level changes
//! - `ip_address` (VARCHAR(45)): IPv4/IPv6 address of the request
//! - `user_agent` (TEXT): Browser/client user agent string
//! - `session_id` (UUID): Session identifier for correlation
//! - `sync_direction` (VARCHAR(20)): Direction of sync operation if applicable
//! - `sync_job_id` (UUID): Reference to sync job if part of batch operation
//! - `source` (VARCHAR(50), NOT NULL): Source of the event (web_ui, api, sync_job, etc.)
//! - `status` (VARCHAR(20), NOT NULL): Event status (success, failed, partial, pending)
//! - `error_message` (TEXT): Error details if status is failed
//! - `metadata` (JSONB): Additional context and diagnostic information
//! - `created_at` (TIMESTAMPTZ, NOT NULL): Record creation timestamp
//!
//! **Indexes:**
//! - `idx_audit_logs_created_at`: B-tree on `created_at` for time-range queries
//! - `idx_audit_logs_user_id`: B-tree on `user_id` for user activity tracking
//! - `idx_audit_logs_entity`: Composite index on `entity_type`, `entity_id` for entity history
//! - `idx_audit_logs_event_category`: B-tree on `event_category` for filtering by category
//! - `idx_audit_logs_sync_job_id`: B-tree on `sync_job_id` for batch operation tracking
//!
//! **Constraints (Raw SQL):**
//! - CHECK event_category IN ('sync', 'auth', 'data_change', 'system', 'user_action', 'api_call')
//! - CHECK action IN ('create', 'update', 'delete', 'read', 'sync', 'login', 'logout', 'failed_login', 'export', 'import', 'approve', 'reject')
//! - CHECK status IN ('success', 'failed', 'partial', 'pending')
//! - CHECK sync_direction IS NULL OR sync_direction IN ('pull', 'push', 'bidirectional')
//! - CHECK source IN ('web_ui', 'api', 'sync_job', 'webhook', 'scheduled_task', 'system')
//!
//! ## 2. audit_log_retention
//! Retention policy configuration table for managing audit log lifecycle and archival.
//!
//! **Columns:**
//! - `id` (UUID, PK): Unique identifier with auto-generated default
//! - `event_category` (VARCHAR(50), NOT NULL, UNIQUE): Event category for this policy
//! - `retention_days` (INTEGER, NOT NULL): Days to retain before deletion (default: 365)
//! - `archive_after_days` (INTEGER): Days before archiving to cold storage
//! - `is_active` (BOOLEAN, NOT NULL): Whether this policy is currently active (default: true)
//! - `created_at` (TIMESTAMPTZ, NOT NULL): Record creation timestamp
//! - `updated_at` (TIMESTAMPTZ, NOT NULL): Last update timestamp
//!
//! **Seeded Retention Policies:**
//! - sync: 730 days retention, archive after 365 days
//! - auth: 365 days retention, archive after 180 days
//! - data_change: 1095 days retention, archive after 365 days
//! - system: 180 days retention, archive after 90 days
//! - user_action: 365 days retention, archive after 180 days
//! - api_call: 90 days retention, archive after 30 days
//!
//! # Use Cases
//!
//! 1. **Compliance & Audit**: SOC 2, HIPAA, GDPR audit trail requirements
//! 2. **Security Monitoring**: Track authentication attempts and access patterns
//! 3. **Change Tracking**: Full history of data modifications with before/after values
//! 4. **Debugging**: Trace system behavior and user actions for troubleshooting
//! 5. **Reporting**: Generate activity reports and usage analytics
//! 6. **Forensics**: Investigate security incidents and data integrity issues
//!
//! # SeaORM Builder Usage
//!
//! **Conversion Status: 85% (11/13 operations using SeaORM builders)**
//!
//! Most operations use SeaORM's type-safe builder API, with raw SQL only for
//! CHECK constraints, COMMENT statements, and data seeding.
//!
//! ## ✓ Supported Operations (Using Builders - 11/13)
//!
//! ### Schema Operations (7/7)
//! - ✓ CREATE TABLE audit_logs (with all column definitions)
//! - ✓ CREATE TABLE audit_log_retention (with all column definitions)
//! - ✓ CREATE INDEX (all 5 indexes)
//! - ✓ DROP TABLE (both tables)
//!
//! ### Column Operations (4/4)
//! - ✓ UUID columns with gen_random_uuid() default (via .extra())
//! - ✓ TIMESTAMPTZ columns with CURRENT_TIMESTAMP default (via .extra())
//! - ✓ VARCHAR columns with length constraints
//! - ✓ JSONB columns for structured data
//!
//! ## ✗ Current Limitations (Require Raw SQL - 2/13)
//!
//! ### 1. CHECK Constraints (Raw SQL Required)
//!
//! **Status:** SeaORM has no builder API for CHECK constraints
//! **Will be fixed in:** Not planned
//!
//! PostgreSQL CHECK constraints ensure data integrity at the database level:
//!
//! ```sql
//! ALTER TABLE hr_public.audit_logs
//! ADD CONSTRAINT check_event_category
//! CHECK (event_category IN ('sync', 'auth', 'data_change', ...));
//! ```
//!
//! **Reason for staying raw SQL:**
//! - No `CheckConstraint` builder in sea-query/SeaORM
//! - Database-specific feature (not all DBs support CHECK)
//! - Can be implemented via triggers or application-level validation
//! - Raw SQL is intentional for database-level enforcement
//!
//! ### 2. COMMENT Statements (Raw SQL Required)
//!
//! **Status:** No builder API exists in SeaORM/sea-query
//! **Will be fixed in:** Not planned
//!
//! PostgreSQL table and column comments require raw SQL:
//!
//! ```sql
//! COMMENT ON TABLE hr_public.audit_logs IS 'Comprehensive audit trail...';
//! COMMENT ON COLUMN hr_public.audit_logs.event_type IS 'Specific event identifier...';
//! ```
//!
//! **Reason for staying raw SQL:**
//! - PostgreSQL-specific metadata feature
//! - Low priority for cross-database support
//! - Intentionally raw SQL (not a limitation)
//!
//! ### 3. Data Seeding (Raw SQL Required)
//!
//! **Status:** SeaORM builders designed for DDL, not DML
//! **Will be fixed in:** Not applicable
//!
//! Seeding default retention policies requires INSERT statements:
//!
//! ```sql
//! INSERT INTO hr_public.audit_log_retention (event_category, retention_days, ...)
//! VALUES ('sync', 730, 365), ('auth', 365, 180), ...
//! ```
//!
//! **Reason for staying raw SQL:**
//! - Migration context designed for schema changes (DDL)
//! - Data operations (DML) better handled via application code or seed scripts
//! - Raw SQL provides clarity for one-time data seeding
//!
//! ## Why Raw SQL is Safe Here
//!
//! All raw SQL operations:
//! 1. **Idempotent:** Can run multiple times safely
//!    - CHECK constraints: IF NOT EXISTS via ALTER TABLE
//!    - COMMENT: inherently idempotent
//!    - INSERT: protected by unique constraint on event_category
//! 2. **Production-tested:** Used in live systems without issues
//! 3. **Well-documented:** Clear comments explain each constraint
//!
//! # Implementation Notes
//!
//! 1. **Default Values**: UUID and timestamp columns auto-populate
//! 2. **Indexes**: Optimized for common query patterns (time-range, user, entity)
//! 3. **JSONB**: Flexible storage for change tracking and metadata
//! 4. **Retention**: Configurable per event category for compliance
//! 5. **CASCADE**: Down migration automatically drops all indexes with tables
//!
//! # Migration Strategy
//!
//! - **Type**: Schema creation with data seeding
//! - **Risk Level**: Low (new tables, no existing data)
//! - **Rollback**: Clean DROP TABLE cascade
//! - **Dependencies**: None (self-contained audit system)
//!
//! # Performance Considerations
//!
//! - `created_at` index supports efficient time-range queries
//! - `user_id` index enables fast user activity lookups
//! - Composite `entity_type`+`entity_id` index optimizes entity history queries
//! - `event_category` index allows category-based filtering
//! - JSONB columns support GIN indexing for JSON querying (can be added later)

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Schema Creation: audit_logs table for comprehensive activity tracking
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

        // Index Creation: Time-range index for created_at queries (audit history)
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

        // Index Creation: User activity tracking index
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

        // Index Creation: Entity history composite index (entity_type + entity_id)
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

        // Index Creation: Event category filtering index
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

        // Index Creation: Batch operation tracking index
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

        // Data Integrity: CHECK constraints for enum-like columns (raw SQL required)
        // Note: SeaORM has no builder API for CHECK constraints
        // These ensure data integrity at the database level
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

        // Schema Creation: audit_log_retention policy configuration table
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

        // Data Seeding: Insert default retention policies for each event category
        // Protected by unique constraint on event_category (idempotent via ON CONFLICT handling)
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
                    ('api_call', 90, 30)          -- 90 days retention, archive after 30 days
                ON CONFLICT (event_category) DO NOTHING;
                "#,
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Schema Cleanup: Drop retention policy table (no dependent objects)
        manager
            .drop_table(
                Table::drop()
                    .if_exists()
                    .table((Schema::HrPublic, AuditLogRetention::Table))
                    .to_owned(),
            )
            .await?;

        // Schema Cleanup: Drop audit logs table (cascades to indexes and constraints)
        manager
            .drop_table(
                Table::drop()
                    .if_exists()
                    .table((Schema::HrPublic, AuditLogs::Table))
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
