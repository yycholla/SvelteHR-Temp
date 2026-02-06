//! Migration: Add wildcard permissions
//!
//! Seeds wildcard permissions for admin roles (*:* and category-level wildcards).
//!
//! ## SeaORM Builder Usage: Not Applicable (Data Migration)
//!
//! ### Why This Migration Uses Raw SQL
//!
//! This is a **mixed data migration** that:
//! 1. Seeds permission records (INSERT)
//! 2. Creates role-permission relationships (INSERT SELECT with CROSS JOIN)
//!
//! SeaORM's builder API is for DDL (schema operations), not DML (data operations).
//! **For permission seeding and RBAC relationship creation, raw SQL is correct.**
//!
//! ### Operations (Raw SQL - 6 operations):
//!
//! **Up Migration:**
//! 1. INSERT full wildcard permission (*:* - unlimited access)
//! 2. INSERT 20 category-level wildcard permissions (e.g., employees:*, departments:*)
//! 3. INSERT role_permissions: Assign *:* to Admin role
//! 4. INSERT role_permissions: Assign *:* to system_admin role (if exists)
//! 5. INSERT role_permissions: Assign all category wildcards to Admin and system_admin
//!
//! Each INSERT uses `ON CONFLICT DO NOTHING` for idempotency.
//!
//! **Down Migration:**
//! 6. DELETE role_permissions for all wildcard permissions
//! 7. DELETE all wildcard permissions (action = '*')
//!
//! ### Wildcard Permission Semantics
//!
//! - **Full wildcard (*:*):** Grants unrestricted access to all resources and all actions.
//!   Used for System Admin role with unlimited privileges.
//!
//! - **Category wildcards (resource:*):** Grants full access to all actions on a specific
//!   resource category. For example:
//!   - `employees:*` = full CRUD on employees (read, write, delete, etc.)
//!   - `documents:*` = full document management capabilities
//!
//! This enables granular admin delegation where a user might have `employees:*` (full employee
//! management) without having system-wide `*:*` access.
//!
//! ### Idempotency
//!
//! All INSERTs use `ON CONFLICT DO NOTHING` to safely handle re-runs without duplicates.
//!
//! ## Migration Type: Seed Data (Wildcard Permissions + Admin Role Assignments)
//!
//! This migration establishes the wildcard permission system, enabling both full system
//! admins (*:*) and category-specific admins (resource:*) for flexible access control.

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Seed wildcard permissions for admin roles
        // Data seeding operation - intentionally raw SQL
        // Create the wildcard permission for full system access
        manager.get_connection().execute_unprepared(
            "INSERT INTO hr_public.permissions (resource, action, description)
            VALUES ('*', '*', 'Wildcard permission - full access to all resources and actions')
            ON CONFLICT (resource, action) DO NOTHING"
        ).await?;

        // Create category-level wildcard permissions for granular control
        manager.get_connection().execute_unprepared(
            "INSERT INTO hr_public.permissions (resource, action, description) VALUES
            ('employees', '*', 'Full access to all employee operations'),
            ('departments', '*', 'Full access to all department operations'),
            ('users', '*', 'Full access to all user operations'),
            ('roles', '*', 'Full access to all role operations'),
            ('permissions', '*', 'Full access to all permission operations'),
            ('documents', '*', 'Full access to all document operations'),
            ('management', '*', 'Full access to all management operations'),
            ('reviews', '*', 'Full access to all review operations'),
            ('leave', '*', 'Full access to all leave operations'),
            ('reports', '*', 'Full access to all report operations'),
            ('teams', '*', 'Full access to all team operations'),
            ('tasks', '*', 'Full access to all task operations'),
            ('events', '*', 'Full access to all event operations'),
            ('notifications', '*', 'Full access to all notification operations'),
            ('activities', '*', 'Full access to all activity operations'),
            ('attendance', '*', 'Full access to all attendance operations'),
            ('performance', '*', 'Full access to all performance operations'),
            ('goals', '*', 'Full access to all goal operations'),
            ('dashboard', '*', 'Full access to all dashboard operations'),
            ('admin', '*', 'Full access to all admin operations')
            ON CONFLICT (resource, action) DO NOTHING"
        ).await?;

        // Assign full wildcard permission to Admin role
        manager.get_connection().execute_unprepared(
            "INSERT INTO hr_public.role_permissions (role_id, permission_id)
            SELECT r.id, p.id
            FROM hr_public.roles r
            CROSS JOIN hr_public.permissions p
            WHERE r.name = 'Admin'
            AND p.resource = '*'
            AND p.action = '*'
            ON CONFLICT DO NOTHING"
        ).await?;

        // Assign full wildcard permission to system_admin role (if it exists)
        manager.get_connection().execute_unprepared(
            "INSERT INTO hr_public.role_permissions (role_id, permission_id)
            SELECT r.id, p.id
            FROM hr_public.roles r
            CROSS JOIN hr_public.permissions p
            WHERE r.name = 'system_admin'
            AND p.resource = '*'
            AND p.action = '*'
            ON CONFLICT DO NOTHING"
        ).await?;

        // Also assign all category-level wildcards to Admin and system_admin roles
        manager.get_connection().execute_unprepared(
            "INSERT INTO hr_public.role_permissions (role_id, permission_id)
            SELECT r.id, p.id
            FROM hr_public.roles r
            CROSS JOIN hr_public.permissions p
            WHERE r.name IN ('Admin', 'system_admin')
            AND p.action = '*'
            AND p.resource != '*'
            ON CONFLICT DO NOTHING"
        ).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Remove wildcard permissions and assignments
        // Data cleanup operation - intentionally raw SQL
        // Remove all wildcard permission assignments (both full and category-level)
        manager.get_connection().execute_unprepared(
            "DELETE FROM hr_public.role_permissions
            WHERE permission_id IN (
                SELECT id FROM hr_public.permissions
                WHERE action = '*'
            )"
        ).await?;

        // Remove all wildcard permissions (both full and category-level)
        manager.get_connection().execute_unprepared(
            "DELETE FROM hr_public.permissions
            WHERE action = '*'"
        ).await?;

        Ok(())
    }
}
