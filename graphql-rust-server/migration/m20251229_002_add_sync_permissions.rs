//! # Add Sync Permissions and Audit Trail System
//!
//! This migration creates a comprehensive permission management system for
//! QuickBooks synchronization operations, including:
//! - sync_permission_audit table: Audit trail for all permission checks
//! - 19 granular sync permissions: Covering sync operations, conflicts, and admin
//!
//! ## SeaORM Builder Usage
//! **Conversion: 85% SeaORM Builders + 15% Raw SQL (appropriate mix)**
//! - Uses SeaORM Table::create() for sync_permission_audit table
//! - Uses SeaORM Index::create() for performance indexes (3 indexes)
//! - Uses raw SQL for foreign key (cross-schema reference to hr_public.users)
//! - Uses raw SQL for permission seeding (INSERT with ON CONFLICT)
//! - Uses raw SQL for permission cleanup (UPDATE with deleted_at)
//!
//! ## Operations Summary
//!
//! ### sync_permission_audit Table (7 columns):
//! 1. **id** (UUID, PRIMARY KEY) - Unique audit record identifier
//! 2. **user_id** (UUID, NOT NULL, FK) - User whose permissions were checked
//! 3. **permission_name** (VARCHAR(100), NOT NULL) - Permission being checked
//! 4. **action** (VARCHAR(100), NOT NULL) - Action attempted
//! 5. **granted** (BOOLEAN, NOT NULL) - Was permission granted?
//! 6. **reason** (TEXT, nullable) - Denial reason or grant context
//! 7. **checked_at** (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()) - Check timestamp
//!
//! ### Performance Indexes (3 indexes):
//! 1. **idx_sync_perm_audit_user** - Find audits by user
//! 2. **idx_sync_perm_audit_checked_at** - Time-based audit queries
//! 3. **idx_sync_perm_audit_permission** - Filter by permission name
//!
//! ### Sync Permissions Seeded (19 permissions):
//! **Sync Operations (6):**
//! - sync:trigger_employee - Trigger employee sync from QB
//! - sync:trigger_department - Trigger department sync from QB
//! - sync:push - Push local data to QB
//! - sync:trigger_bidirectional - Bidirectional sync
//! - sync:force_full - Force complete resync
//! - sync:cancel - Cancel in-progress sync
//!
//! **Conflict Management (3):**
//! - sync:view_conflicts - View sync conflicts
//! - sync:resolve_conflicts - Resolve individual conflicts
//! - sync:bulk_resolve_conflicts - Bulk conflict resolution
//!
//! **Configuration (3):**
//! - sync:manage_schedules - Manage auto-sync schedules
//! - sync:configure_field_mapping - Configure field mappings
//! - sync:manage_validation_rules - Manage validation rules
//!
//! **Viewing (4):**
//! - sync:view_history - View sync history/logs
//! - sync:view_audit_trail - View audit trail
//! - sync:view_metrics - View performance metrics
//! - sync:export_data - Export sync data/reports
//!
//! **Administration (3):**
//! - integrations:manage - Manage QB connection
//! - sync:manage_permissions - Manage sync permissions
//! - sync:view_system_logs - View system logs
//!
//! ## Migration Strategy
//! - **Mixed Approach**: SeaORM for schema, raw SQL for data/cross-schema refs
//! - **Idempotent Seeding**: Uses ON CONFLICT DO NOTHING for permissions
//! - **Soft Delete Cleanup**: Down migration uses deleted_at (preserves history)
//! - **Foreign Key**: Raw SQL required for cross-schema reference
//! - **Audit Trail**: Complete permission check tracking
//!
//! ## Permission Check Workflow
//!
//! ### Record Permission Check:
//! ```sql
//! -- Record successful permission grant
//! INSERT INTO hr_public.sync_permission_audit (id, user_id, permission_name, action, granted, checked_at)
//! VALUES (gen_random_uuid(), '<user_id>', 'sync:trigger_employee', 'pull', true, NOW());
//!
//! -- Record permission denial
//! INSERT INTO hr_public.sync_permission_audit (id, user_id, permission_name, action, granted, reason, checked_at)
//! VALUES (
//!   gen_random_uuid(),
//!   '<user_id>',
//!   'sync:push',
//!   'push',
//!   false,
//!   'User role does not have sync:push permission',
//!   NOW()
//! );
//! ```
//!
//! ### Audit Queries:
//! ```sql
//! -- Find denied permission checks for user
//! SELECT * FROM hr_public.sync_permission_audit
//! WHERE user_id = '<user_id>'
//! AND granted = false
//! ORDER BY checked_at DESC;
//!
//! -- Find all checks for specific permission
//! SELECT * FROM hr_public.sync_permission_audit
//! WHERE permission_name = 'sync:force_full'
//! ORDER BY checked_at DESC;
//!
//! -- Permission usage statistics
//! SELECT
//!   permission_name,
//!   COUNT(*) as total_checks,
//!   SUM(CASE WHEN granted THEN 1 ELSE 0 END) as granted_count,
//!   SUM(CASE WHEN NOT granted THEN 1 ELSE 0 END) as denied_count
//! FROM hr_public.sync_permission_audit
//! WHERE checked_at >= NOW() - INTERVAL '30 days'
//! GROUP BY permission_name;
//! ```
//!
//! ## Permission Hierarchy
//! - **Admin**: All sync permissions
//! - **HR Manager**: View, trigger sync, resolve conflicts
//! - **Manager**: View sync history, view conflicts (read-only)
//! - **Employee**: No sync permissions (data subject only)
//!
//! ## Design Decisions
//! - **Granular Permissions**: 19 permissions for fine-grained control
//! - **Audit Everything**: Track all permission checks (granted + denied)
//! - **Reason Field**: Capture context for denials (debugging, compliance)
//! - **Soft Delete**: Down migration preserves permission history
//! - **Cross-Schema FK**: Audit table in hr_public, references users table
//! - **Indexed for Performance**: User, time, and permission lookups optimized
//!
//! ## Related Migrations
//! - m20251017_003_auth: Creates users and permissions tables
//! - m20251226_001_add_sync_tracking: Entity-level sync tracking
//! - m20251229_003_seed_sync_role_permissions: Assigns permissions to roles
//! - m20251229_004_incremental_sync: Uses permissions for access control
//!
//! ## Security Impact
//! - **Least Privilege**: Granular permissions enable minimal access grants
//! - **Audit Trail**: Complete log of permission checks (compliance)
//! - **Access Control**: Prevents unauthorized sync operations
//! - **QuickBooks Safety**: Protects QB data from unauthorized modifications

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Schema creation: sync_permission_audit table
        // Tracks all permission checks for sync operations (granted + denied)
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, SyncPermissionAudit::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(SyncPermissionAudit::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(SyncPermissionAudit::UserId)
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(SyncPermissionAudit::PermissionName)
                            .string_len(100)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(SyncPermissionAudit::Action)
                            .string_len(100)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(SyncPermissionAudit::Granted)
                            .boolean()
                            .not_null(),
                    )
                    .col(ColumnDef::new(SyncPermissionAudit::Reason).text().null())
                    .col(
                        ColumnDef::new(SyncPermissionAudit::CheckedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        // Foreign key constraint: Link to hr_public.users table
        // Note: Raw SQL required for cross-schema foreign key reference
        // CASCADE delete: Remove audit records when user is deleted
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                ALTER TABLE hr_public.sync_permission_audit
                ADD CONSTRAINT fk_sync_perm_audit_user
                FOREIGN KEY (user_id)
                REFERENCES hr_public.users(id)
                ON DELETE CASCADE
                "#,
            )
            .await?;

        // Performance index: Find permission checks by user
        // Common query: SELECT * FROM sync_permission_audit WHERE user_id = ?
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_sync_perm_audit_user")
                    .table((Schema::HrPublic, SyncPermissionAudit::Table))
                    .col(SyncPermissionAudit::UserId)
                    .to_owned(),
            )
            .await?;

        // Performance index: Time-based audit queries (recent checks first)
        // Common query: SELECT * FROM sync_permission_audit ORDER BY checked_at DESC
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_sync_perm_audit_checked_at")
                    .table((Schema::HrPublic, SyncPermissionAudit::Table))
                    .col(SyncPermissionAudit::CheckedAt)
                    .to_owned(),
            )
            .await?;

        // Performance index: Filter audits by permission name
        // Common query: SELECT * FROM sync_permission_audit WHERE permission_name = ?
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_sync_perm_audit_permission")
                    .table((Schema::HrPublic, SyncPermissionAudit::Table))
                    .col(SyncPermissionAudit::PermissionName)
                    .to_owned(),
            )
            .await?;

        // Data seeding: Insert 19 sync-specific permissions into existing permissions table
        // Note: Raw SQL required for bulk INSERT with ON CONFLICT handling
        // Uses gen_random_uuid() for unique IDs, ON CONFLICT DO NOTHING for idempotency
        manager.get_connection().execute_unprepared(
            r#"
            INSERT INTO hr_public.permissions (id, resource, action, description, created_at, updated_at)
            VALUES
            -- Sync Operations
            (gen_random_uuid(), 'sync', 'trigger_employee', 'Trigger employee synchronization from QuickBooks', NOW(), NOW()),
            (gen_random_uuid(), 'sync', 'trigger_department', 'Trigger department synchronization from QuickBooks', NOW(), NOW()),
            (gen_random_uuid(), 'sync', 'push', 'Push local data to QuickBooks', NOW(), NOW()),
            (gen_random_uuid(), 'sync', 'trigger_bidirectional', 'Trigger bidirectional synchronization', NOW(), NOW()),
            (gen_random_uuid(), 'sync', 'force_full', 'Force a complete resync ignoring change tracking', NOW(), NOW()),
            (gen_random_uuid(), 'sync', 'cancel', 'Cancel an in-progress synchronization', NOW(), NOW()),

            -- Conflict Management
            (gen_random_uuid(), 'sync', 'view_conflicts', 'View synchronization conflicts', NOW(), NOW()),
            (gen_random_uuid(), 'sync', 'resolve_conflicts', 'Resolve individual sync conflicts', NOW(), NOW()),
            (gen_random_uuid(), 'sync', 'bulk_resolve_conflicts', 'Bulk resolve multiple sync conflicts', NOW(), NOW()),

            -- Configuration
            (gen_random_uuid(), 'sync', 'manage_schedules', 'Manage automatic sync schedules', NOW(), NOW()),
            (gen_random_uuid(), 'sync', 'configure_field_mapping', 'Configure field mapping between systems', NOW(), NOW()),
            (gen_random_uuid(), 'sync', 'manage_validation_rules', 'Manage sync validation rules', NOW(), NOW()),

            -- Viewing
            (gen_random_uuid(), 'sync', 'view_history', 'View synchronization history and logs', NOW(), NOW()),
            (gen_random_uuid(), 'sync', 'view_audit_trail', 'View audit trail of sync operations', NOW(), NOW()),
            (gen_random_uuid(), 'sync', 'view_metrics', 'View sync performance metrics', NOW(), NOW()),
            (gen_random_uuid(), 'sync', 'export_data', 'Export sync data and reports', NOW(), NOW()),

            -- Administration
            (gen_random_uuid(), 'integrations', 'manage', 'Manage QuickBooks integration connection', NOW(), NOW()),
            (gen_random_uuid(), 'sync', 'manage_permissions', 'Manage sync-related permissions', NOW(), NOW()),
            (gen_random_uuid(), 'sync', 'view_system_logs', 'View system-level sync logs', NOW(), NOW())
            ON CONFLICT (resource, action) DO NOTHING
            "#
        ).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Cleanup: Drop indexes before table (proper dependency order)
        manager
            .drop_index(
                Index::drop()
                    .if_exists()
                    .name("idx_sync_perm_audit_permission")
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .if_exists()
                    .name("idx_sync_perm_audit_checked_at")
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .if_exists()
                    .name("idx_sync_perm_audit_user")
                    .to_owned(),
            )
            .await?;

        // Cleanup: Drop sync_permission_audit table
        // Uses if_exists guard for idempotent rollback
        manager
            .drop_table(
                Table::drop()
                    .if_exists()
                    .table((Schema::HrPublic, SyncPermissionAudit::Table))
                    .to_owned(),
            )
            .await?;

        // Data cleanup: Soft delete sync permissions (preserves audit history)
        // Note: Uses deleted_at instead of hard DELETE to maintain referential integrity
        // Raw SQL required for bulk UPDATE with complex WHERE clause
        manager
            .get_connection()
            .execute_unprepared(
                r#"
            UPDATE hr_public.permissions
            SET deleted_at = NOW()
            WHERE resource IN ('sync', 'integrations')
            AND action IN (
                'trigger_employee', 'trigger_department', 'push', 'trigger_bidirectional',
                'force_full', 'cancel', 'view_conflicts', 'resolve_conflicts',
                'bulk_resolve_conflicts', 'manage_schedules', 'configure_field_mapping',
                'manage_validation_rules', 'view_history', 'view_audit_trail',
                'view_metrics', 'export_data', 'manage', 'manage_permissions', 'view_system_logs'
            )
            "#,
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
enum SyncPermissionAudit {
    Table,
    Id,
    UserId,
    PermissionName,
    Action,
    Granted,
    Reason,
    CheckedAt,
}

#[derive(Iden)]
#[allow(dead_code)]
enum Users {
    Table,
    Id,
}
