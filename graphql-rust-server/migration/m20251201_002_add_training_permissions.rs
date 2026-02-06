//! Migration: Add training permissions and role assignments
//!
//! This migration seeds training-related permissions and assigns them to appropriate roles:
//! - Employee: read training
//! - Manager: read, assign training
//! - HR Manager: read, write, assign training
//! - Admin: already has wildcard (*:*)
//!
//! ## SeaORM Builder Usage: Not Applicable (Data Migration)
//!
//! ### Why This Migration Uses Raw SQL
//!
//! This is a **data migration** that:
//! - Seeds permission records (INSERT INTO permissions)
//! - Creates role-permission relationships (INSERT INTO role_permissions)
//! - Uses INSERT SELECT with CROSS JOIN for role-permission mapping
//! - SeaORM builders are for DDL (schema), not DML (data operations)
//!
//! ### Operations (Raw SQL - 5 operations):
//!
//! **Up Migration:**
//! 1. INSERT INTO permissions (3 training permissions)
//!    - Using: `manager.get_connection().execute_unprepared()`
//!    - Permissions: training:read, training:write, training:assign
//!    - ON CONFLICT DO NOTHING for idempotency
//!
//! 2. INSERT INTO role_permissions for Employee (1 permission)
//!    - Using: INSERT SELECT with CROSS JOIN
//!    - Employee gets: training:read
//!
//! 3. INSERT INTO role_permissions for Manager (2 permissions)
//!    - Using: INSERT SELECT with CROSS JOIN
//!    - Manager gets: training:read, training:assign
//!
//! 4. INSERT INTO role_permissions for HR Manager (3 permissions)
//!    - Using: INSERT SELECT with CROSS JOIN
//!    - HR Manager gets: training:read, training:write, training:assign
//!
//! **Down Migration:**
//! 5. DELETE FROM permissions WHERE resource = 'training'
//!    - Cascades to role_permissions due to foreign key
//!    - Removes all 3 training permissions and their assignments
//!
//! ### Permission Hierarchy
//!
//! - **read**: View training modules and content (all roles)
//! - **assign**: Assign training to employees (managers and above)
//! - **write**: Create and manage training modules (HR Manager and above)
//! - **Admin**: Has wildcard (*:*) permission covering all training operations
//!
//! ### Migration Strategy
//!
//! This is a **permission seeding migration** that:
//! - Establishes RBAC for training module
//! - Uses role hierarchy (Employee < Manager < HR Manager < Admin)
//! - Enables granular access control for training management
//! - Maintains idempotency with ON CONFLICT DO NOTHING
//!
//! ## Migration Type: Data Migration (Raw SQL)
//!
//! This migration demonstrates appropriate use of raw SQL for data seeding
//! operations with INSERT SELECT and CROSS JOIN patterns.

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Data seeding operation - Using raw SQL (INSERT data operation)
        // 1. Insert 3 training permissions with ON CONFLICT DO NOTHING for idempotency
        manager.get_connection().execute_unprepared(
            "INSERT INTO hr_public.permissions (resource, action, description) VALUES
            ('training', 'read', 'View training modules and content'),
            ('training', 'write', 'Create and manage training modules'),
            ('training', 'assign', 'Assign training to employees')
            ON CONFLICT (resource, action) DO NOTHING"
        ).await?;

        // Data seeding operation - Using raw SQL (INSERT SELECT with CROSS JOIN)
        // 2. Assign training:read permission to Employee role
        manager.get_connection().execute_unprepared(
            "INSERT INTO hr_public.role_permissions (role_id, permission_id)
            SELECT r.id, p.id
            FROM hr_public.roles r
            CROSS JOIN hr_public.permissions p
            WHERE r.name = 'Employee'
            AND p.resource = 'training' AND p.action = 'read'
            ON CONFLICT DO NOTHING"
        ).await?;

        // Data seeding operation - Using raw SQL (INSERT SELECT with CROSS JOIN)
        // 3. Assign training:read and training:assign permissions to Manager role
        manager.get_connection().execute_unprepared(
            "INSERT INTO hr_public.role_permissions (role_id, permission_id)
            SELECT r.id, p.id
            FROM hr_public.roles r
            CROSS JOIN hr_public.permissions p
            WHERE r.name = 'Manager'
            AND p.resource = 'training' AND p.action IN ('read', 'assign')
            ON CONFLICT DO NOTHING"
        ).await?;

        // Data seeding operation - Using raw SQL (INSERT SELECT with CROSS JOIN)
        // 4. Assign all 3 training permissions to HR Manager role (read, write, assign)
        manager.get_connection().execute_unprepared(
            "INSERT INTO hr_public.role_permissions (role_id, permission_id)
            SELECT r.id, p.id
            FROM hr_public.roles r
            CROSS JOIN hr_public.permissions p
            WHERE r.name = 'HR Manager'
            AND p.resource = 'training' AND p.action IN ('read', 'write', 'assign')
            ON CONFLICT DO NOTHING"
        ).await?;

        // Admin already has wildcard '*'

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.get_connection().execute_unprepared(
            "DELETE FROM hr_public.permissions WHERE resource = 'training'"
        ).await?;

        Ok(())
    }
}
