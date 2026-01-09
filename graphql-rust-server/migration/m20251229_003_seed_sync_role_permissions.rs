//! Migration: Seed Sync Permissions to Roles
//!
//! Assigns sync permissions to existing roles according to the permission matrix:
//!
//! | Role       | Trigger Sync | Resolve Conflicts | View History | Configure | Admin |
//! |------------|-------------|-------------------|--------------|-----------|-------|
//! | Admin      | All         | All               | All          | All       | All   |
//! | HR Manager | Yes         | Yes               | Yes          | No        | No    |
//! | Manager    | No          | Own dept only     | Own dept     | No        | No    |
//! | Employee   | No          | No                | Self only    | No        | No    |

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Grant all sync permissions to Admin role
        // (Admin already has wildcard via existing system, but explicit grants for audit)
        manager.get_connection().execute_unprepared(
            r#"
            -- Admin role gets all sync permissions
            INSERT INTO hr_public.role_permissions (id, role_id, permission_id, created_at, updated_at)
            SELECT
                gen_random_uuid(),
                r.id,
                p.id,
                NOW(),
                NOW()
            FROM hr_public.roles r
            CROSS JOIN hr_public.permissions p
            WHERE r.name = 'Admin'
            AND r.deleted_at IS NULL
            AND p.deleted_at IS NULL
            AND p.resource IN ('sync', 'integrations')
            ON CONFLICT DO NOTHING
            "#
        ).await?;

        // Grant HR Manager permissions
        // - Trigger sync: trigger_employee, trigger_department, trigger_bidirectional
        // - View: view_history, view_conflicts, view_metrics, view_audit_trail
        // - Resolve: resolve_conflicts
        // - Push: push (to QuickBooks)
        manager.get_connection().execute_unprepared(
            r#"
            INSERT INTO hr_public.role_permissions (id, role_id, permission_id, created_at, updated_at)
            SELECT
                gen_random_uuid(),
                r.id,
                p.id,
                NOW(),
                NOW()
            FROM hr_public.roles r
            CROSS JOIN hr_public.permissions p
            WHERE r.name = 'HR Manager'
            AND r.deleted_at IS NULL
            AND p.deleted_at IS NULL
            AND (
                (p.resource = 'sync' AND p.action IN (
                    'trigger_employee',
                    'trigger_department',
                    'trigger_bidirectional',
                    'push',
                    'view_history',
                    'view_conflicts',
                    'view_metrics',
                    'view_audit_trail',
                    'resolve_conflicts',
                    'export_data'
                ))
            )
            ON CONFLICT DO NOTHING
            "#
        ).await?;

        // Grant Manager permissions (limited, department-scoped in practice)
        // - View: view_history, view_conflicts (scoped to department in code)
        // - Resolve: resolve_conflicts (scoped to department in code)
        manager.get_connection().execute_unprepared(
            r#"
            INSERT INTO hr_public.role_permissions (id, role_id, permission_id, created_at, updated_at)
            SELECT
                gen_random_uuid(),
                r.id,
                p.id,
                NOW(),
                NOW()
            FROM hr_public.roles r
            CROSS JOIN hr_public.permissions p
            WHERE r.name = 'Manager'
            AND r.deleted_at IS NULL
            AND p.deleted_at IS NULL
            AND (
                (p.resource = 'sync' AND p.action IN (
                    'view_history',
                    'view_conflicts',
                    'resolve_conflicts'
                ))
            )
            ON CONFLICT DO NOTHING
            "#
        ).await?;

        // Grant Employee permissions (very limited, self-scoped in practice)
        // - View: view_history (scoped to self in code)
        manager.get_connection().execute_unprepared(
            r#"
            INSERT INTO hr_public.role_permissions (id, role_id, permission_id, created_at, updated_at)
            SELECT
                gen_random_uuid(),
                r.id,
                p.id,
                NOW(),
                NOW()
            FROM hr_public.roles r
            CROSS JOIN hr_public.permissions p
            WHERE r.name = 'Employee'
            AND r.deleted_at IS NULL
            AND p.deleted_at IS NULL
            AND (
                (p.resource = 'sync' AND p.action IN (
                    'view_history'
                ))
            )
            ON CONFLICT DO NOTHING
            "#
        ).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Soft delete all sync role_permissions
        manager.get_connection().execute_unprepared(
            r#"
            UPDATE hr_public.role_permissions rp
            SET deleted_at = NOW()
            FROM hr_public.permissions p
            WHERE rp.permission_id = p.id
            AND p.resource IN ('sync', 'integrations')
            AND rp.deleted_at IS NULL
            "#
        ).await?;

        Ok(())
    }
}
