//! Migration: Assign sidebar permissions to roles
//!
//! Seeds role-permission assignments for RBAC (Role-Based Access Control).
//!
//! ## SeaORM Builder Usage: Not Applicable (Data Migration)
//!
//! ### Why This Migration Uses Raw SQL
//!
//! This is a **complex data migration** that performs relationship seeding between roles and permissions.
//! SeaORM's builder API is designed for DDL (Data Definition Language) schema operations, not DML
//! (Data Manipulation Language) operations like:
//!
//! - INSERT SELECT with CROSS JOIN (creating role-permission relationships)
//! - DELETE with subqueries (cleaning up specific relationships)
//! - Complex WHERE clauses with multiple tables
//!
//! **For data operations with joins and subqueries, raw SQL is the correct approach.**
//!
//! ### Operations (Raw SQL - 5 operations):
//!
//! **Up Migration:**
//! 1. INSERT role_permissions for Employee role (13 read-only permissions)
//! 2. INSERT role_permissions for Manager role (24 permissions including management)
//! 3. INSERT role_permissions for HR Manager role (40 permissions including admin)
//! 4. INSERT role_permissions for Admin role (wildcard permission *)
//!
//! Each INSERT uses:
//! - `SELECT r.id, p.id FROM roles r CROSS JOIN permissions p` - joins role and permission IDs
//! - `ON CONFLICT DO NOTHING` - ensures idempotency
//!
//! **Down Migration:**
//! 5. DELETE role_permissions using subqueries to find role and permission IDs
//!
//! ### Idempotency
//!
//! All INSERTs use `ON CONFLICT DO NOTHING` to safely handle re-runs without creating duplicates.
//!
//! ## Migration Type: Seed Data (RBAC Relationships)
//!
//! This migration establishes the initial RBAC permission structure:
//! - **Employee:** Basic read access to most resources
//! - **Manager:** Employee permissions + team management and approval rights
//! - **HR Manager:** Manager permissions + employee/department management + admin read access
//! - **Admin:** Wildcard permission (*:*) granting full access

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Seed role-permission assignments for RBAC
        // Data seeding operation with CROSS JOIN - intentionally raw SQL
        // Note: This migration assumes permissions and roles already exist

        // Assign permissions to employee role (basic read access)
        manager
            .get_connection()
            .execute_unprepared(
                "INSERT INTO hr_public.role_permissions (role_id, permission_id)
            SELECT r.id, p.id
            FROM hr_public.roles r
            CROSS JOIN hr_public.permissions p
            WHERE r.name = 'Employee'
            AND (p.resource, p.action) IN (
                ('dashboard', 'read'),
                ('employees', 'read'),
                ('departments', 'read'),
                ('events', 'read'),
                ('tasks', 'read'),
                ('notifications', 'read'),
                ('activities', 'read'),
                ('attendance', 'read'),
                ('performance', 'read'),
                ('reviews', 'read'),
                ('leave', 'read'),
                ('documents', 'read'),
                ('goals', 'read')
            )
            ON CONFLICT DO NOTHING",
            )
            .await?;

        // Assign permissions to manager role (employee permissions + management)
        manager
            .get_connection()
            .execute_unprepared(
                "INSERT INTO hr_public.role_permissions (role_id, permission_id)
            SELECT r.id, p.id
            FROM hr_public.roles r
            CROSS JOIN hr_public.permissions p
            WHERE r.name = 'Manager'
            AND (p.resource, p.action) IN (
                -- All employee permissions
                ('dashboard', 'read'),
                ('employees', 'read'),
                ('departments', 'read'),
                ('events', 'read'),
                ('tasks', 'read'),
                ('notifications', 'read'),
                ('activities', 'read'),
                ('attendance', 'read'),
                ('performance', 'read'),
                ('reviews', 'read'),
                ('leave', 'read'),
                ('documents', 'read'),
                ('goals', 'read'),
                -- Management permissions
                ('management', 'read'),
                ('management', 'write'),
                ('teams', 'read'),
                ('teams', 'write'),
                ('tasks', 'write'),
                ('tasks', 'reassign'),
                ('leave', 'approve'),
                ('performance', 'write'),
                ('reviews', 'write'),
                ('goals', 'write'),
                ('reports', 'read'),
                ('reports', 'generate')
            )
            ON CONFLICT DO NOTHING",
            )
            .await?;

        // Assign permissions to HR Manager role (manager permissions + admin)
        manager
            .get_connection()
            .execute_unprepared(
                "INSERT INTO hr_public.role_permissions (role_id, permission_id)
            SELECT r.id, p.id
            FROM hr_public.roles r
            CROSS JOIN hr_public.permissions p
            WHERE r.name = 'HR Manager'
            AND (p.resource, p.action) IN (
                -- All manager permissions
                ('dashboard', 'read'),
                ('employees', 'read'),
                ('employees', 'write'),
                ('employees', 'delete'),
                ('departments', 'read'),
                ('departments', 'write'),
                ('events', 'read'),
                ('events', 'write'),
                ('tasks', 'read'),
                ('tasks', 'write'),
                ('tasks', 'create'),
                ('tasks', 'delete'),
                ('tasks', 'reassign'),
                ('notifications', 'read'),
                ('notifications', 'write'),
                ('activities', 'read'),
                ('attendance', 'read'),
                ('attendance', 'write'),
                ('performance', 'read'),
                ('performance', 'write'),
                ('reviews', 'read'),
                ('reviews', 'write'),
                ('leave', 'read'),
                ('leave', 'write'),
                ('leave', 'approve'),
                ('documents', 'read'),
                ('documents', 'write'),
                ('documents', 'audit'),
                ('goals', 'read'),
                ('goals', 'write'),
                ('management', 'read'),
                ('management', 'write'),
                ('teams', 'read'),
                ('teams', 'write'),
                ('reports', 'read'),
                ('reports', 'write'),
                ('reports', 'generate'),
                ('reports', 'execute'),
                ('reports', 'analytics'),
                -- Admin permissions
                ('admin', 'read'),
                ('admin', 'write'),
                ('users', 'read'),
                ('users', 'write'),
                ('roles', 'read'),
                ('permissions', 'read')
            )
            ON CONFLICT DO NOTHING",
            )
            .await?;

        // Assign wildcard permission to Admin role
        manager
            .get_connection()
            .execute_unprepared(
                "INSERT INTO hr_public.role_permissions (role_id, permission_id)
            SELECT r.id, p.id
            FROM hr_public.roles r
            CROSS JOIN hr_public.permissions p
            WHERE r.name = 'Admin'
            AND p.resource = '*'
            AND p.action = '*'
            ON CONFLICT DO NOTHING",
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Remove role-permission assignments added by this migration
        // Data cleanup operation with subqueries - intentionally raw SQL
        manager
            .get_connection()
            .execute_unprepared(
                "DELETE FROM hr_public.role_permissions
            WHERE role_id IN (
                SELECT id FROM hr_public.roles
                WHERE name IN ('Employee', 'Manager', 'HR Manager', 'Admin')
            )
            AND permission_id IN (
                SELECT id FROM hr_public.permissions
                WHERE (resource, action) IN (
                    ('dashboard', 'read'),
                    ('events', 'read'),
                    ('events', 'write'),
                    ('notifications', 'read'),
                    ('notifications', 'write'),
                    ('activities', 'read'),
                    ('attendance', 'read'),
                    ('attendance', 'write'),
                    ('tasks', 'read'),
                    ('tasks', 'write'),
                    ('tasks', 'create'),
                    ('tasks', 'delete'),
                    ('tasks', 'reassign'),
                    ('performance', 'read'),
                    ('performance', 'write'),
                    ('goals', 'read'),
                    ('goals', 'write'),
                    ('reports', 'execute'),
                    ('reports', 'analytics'),
                    ('admin', 'read'),
                    ('admin', 'write'),
                    ('management', 'read'),
                    ('management', 'write')
                )
            )",
            )
            .await?;

        Ok(())
    }
}
