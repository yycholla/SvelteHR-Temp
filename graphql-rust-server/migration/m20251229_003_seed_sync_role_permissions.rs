//! Migration: Seed Sync Permissions to Roles
//!
//! **Purpose:**
//! Seeds role-permission associations for QuickBooks synchronization operations.
//! This migration establishes the RBAC foundation for sync features by granting
//! appropriate permissions to each role based on organizational hierarchy and
//! responsibilities.
//!
//! **Permission Matrix:**
//!
//! | Role       | Trigger Sync | Resolve Conflicts | View History | Configure | Admin |
//! |------------|-------------|-------------------|--------------|-----------|-------|
//! | Admin      | All         | All               | All          | All       | All   |
//! | HR Manager | Yes         | Yes               | Yes          | No        | No    |
//! | Manager    | No          | Dept-scoped       | Dept-scoped  | No        | No    |
//! | Employee   | No          | No                | Self-scoped  | No        | No    |
//!
//! **SeaORM Builder Usage:**
//! - Data seeding (0% builders): 100% raw SQL for complex permission joins
//! - Soft delete operations: Raw SQL for UPDATE with JOIN
//!
//! **Operations:**
//! 1. Grant all sync and integration permissions to Admin role (16 permissions)
//! 2. Grant operational permissions to HR Manager (9 permissions)
//! 3. Grant limited permissions to Manager role (3 permissions, dept-scoped in code)
//! 4. Grant minimal permissions to Employee role (1 permission, self-scoped in code)
//!
//! **Idempotency:**
//! Uses `ON CONFLICT DO NOTHING` to safely handle re-runs. Down migration uses
//! soft delete (sets `deleted_at`) to preserve audit history.
//!
//! **Permission Categories:**
//! - **Trigger Operations:** `trigger_employee`, `trigger_department`, `trigger_bidirectional`
//! - **View Operations:** `view_history`, `view_conflicts`, `view_metrics`, `view_audit_trail`
//! - **Resolution:** `resolve_conflicts`
//! - **Data Flow:** `push`, `pull`, `export_data`
//! - **Administration:** Full admin access (Admin role only)
//!
//! **Migration Strategy:**
//! This is a data migration that seeds initial RBAC configuration. Raw SQL is
//! required because:
//! 1. Complex CROSS JOIN between roles and permissions tables
//! 2. Conditional permission filtering based on resource and action
//! 3. UUID generation with `gen_random_uuid()`
//! 4. ON CONFLICT handling for idempotency
//!
//! **Data Seeded:**
//! - ~20-30 role_permissions records (exact count depends on existing permissions)
//! - All records have timestamps (created_at, updated_at) set to NOW()
//! - Designed to be safe on existing systems (no overwrites)
//!
//! **Dependencies:**
//! - Requires m20251229_002_add_sync_permissions (sync permissions must exist)
//! - Requires existing roles table with Admin, HR Manager, Manager, Employee roles
//! - Requires existing role_permissions table structure
//!
//! **Testing:**
//! - Verifies compilation and type safety
//! - Tests permission counts for each role
//! - Validates idempotent re-runs
//! - Tests soft delete in down migration
//! - Validates permission-role associations
//! - Tests full migration cycle (up -> down -> up)

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // ============================================================
        // DATA SEEDING: Admin Role - All Sync Permissions
        // ============================================================
        // Grant all sync and integration permissions to Admin role
        // Admin already has wildcard via existing system, but explicit
        // grants provide audit trail and clearer permission inspection
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

        // ============================================================
        // DATA SEEDING: HR Manager Role - Operational Permissions
        // ============================================================
        // Grant HR Manager permissions for day-to-day sync operations:
        // - Trigger sync: trigger_employee, trigger_department, trigger_bidirectional
        // - View operations: view_history, view_conflicts, view_metrics, view_audit_trail
        // - Conflict resolution: resolve_conflicts
        // - Data push: push (to QuickBooks)
        // - Data export: export_data
        // Total: 9 permissions (no administrative or configuration access)
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

        // ============================================================
        // DATA SEEDING: Manager Role - Department-Scoped Permissions
        // ============================================================
        // Grant Manager permissions (limited, department-scoped in application code):
        // - View operations: view_history, view_conflicts (scoped to department)
        // - Conflict resolution: resolve_conflicts (scoped to department)
        // Total: 3 permissions (no trigger capabilities, scope enforced at runtime)
        // Note: Department scoping is enforced in application logic, not at DB level
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

        // ============================================================
        // DATA SEEDING: Employee Role - Self-Scoped Permissions
        // ============================================================
        // Grant Employee minimal permissions (self-scoped in application code):
        // - View operations: view_history (scoped to self only)
        // Total: 1 permission (read-only, self-scoped, enforced at runtime)
        // Allows employees to see their own sync history for transparency
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
        // ============================================================
        // SOFT DELETE: Remove All Sync Role Permissions
        // ============================================================
        // Soft delete all sync and integration role_permissions
        // Uses UPDATE with deleted_at to preserve audit history
        // Removes permissions for sync and integrations resources
        manager
            .get_connection()
            .execute_unprepared(
                r#"
            UPDATE hr_public.role_permissions rp
            SET deleted_at = NOW()
            FROM hr_public.permissions p
            WHERE rp.permission_id = p.id
            AND p.resource IN ('sync', 'integrations')
            AND rp.deleted_at IS NULL
            "#,
            )
            .await?;

        Ok(())
    }
}
