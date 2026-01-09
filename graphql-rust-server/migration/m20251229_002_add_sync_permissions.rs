//! Migration: Add Sync Permissions
//!
//! Creates tables for granular sync permission management:
//! - sync_permission_audit: Audit trail for permission checks
//!
//! Also seeds sync-specific permissions into the existing permissions table.

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create sync_permission_audit table for tracking permission checks
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
                    .col(
                        ColumnDef::new(SyncPermissionAudit::Reason)
                            .text()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(SyncPermissionAudit::CheckedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        // Add foreign key constraint using raw SQL to specify hr_public schema
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

        // Create index on user_id for efficient lookups
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

        // Create index on checked_at for time-based queries
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

        // Create index on permission_name for filtering
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

        // Insert sync-specific permissions into the existing permissions table
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
        // Drop indexes
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

        // Drop sync_permission_audit table
        manager
            .drop_table(
                Table::drop()
                    .if_exists()
                    .table((Schema::HrPublic, SyncPermissionAudit::Table))
                    .to_owned(),
            )
            .await?;

        // Remove sync permissions (soft approach - just mark as deleted)
        manager.get_connection().execute_unprepared(
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
            "#
        ).await?;

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
