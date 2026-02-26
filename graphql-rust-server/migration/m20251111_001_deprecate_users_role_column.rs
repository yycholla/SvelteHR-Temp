//! Migration: Deprecate users.role column and migrate to RBAC user_role_assignments
//!
//! This migration:
//! 1. Migrates existing user role data from users.role to user_role_assignments table
//! 2. Removes the legacy users.role column
//! 3. Makes the system rely entirely on RBAC for role management
//!
//! ## SeaORM Builder Usage: Not Applicable (Mixed Migration)
//!
//! ### Why This Migration Uses Raw SQL
//!
//! This is a **complex mixed migration** combining:
//! 1. **Data migration:** INSERT SELECT with CROSS JOIN and CASE logic
//! 2. **Schema migration:** ALTER TABLE DROP/ADD COLUMN with IF EXISTS/IF NOT EXISTS
//!
//! **Schema operations use raw SQL because:**
//! - `DROP COLUMN IF EXISTS` - SeaORM builders don't support IF EXISTS
//! - `ADD COLUMN IF NOT EXISTS` - SeaORM builders don't support IF NOT EXISTS
//! - These clauses are critical for idempotency
//!
//! **Data operations use raw SQL because:**
//! - INSERT SELECT with CROSS JOIN and complex WHERE logic
//! - UPDATE with nested CASE WHEN EXISTS subqueries
//! - SeaORM builders are for DDL (schema), not DML (data operations)
//!
//! **For migrations combining schema and data operations with idempotency requirements, raw SQL is correct.**
//!
//! ### Operations (Raw SQL - 4 operations):
//!
//! **Up Migration:**
//! 1. INSERT INTO user_role_assignments SELECT with CROSS JOIN
//!    - Maps legacy role strings to RBAC role IDs
//!    - system_admin/admin → Admin, hr_manager → HR Manager, etc.
//!    - Uses ON CONFLICT DO NOTHING for idempotency
//!
//! 2. ALTER TABLE users DROP COLUMN IF EXISTS role
//!    - Removes legacy role column from users table
//!    - IF EXISTS ensures safe re-runs
//!
//! **Down Migration:**
//! 3. ALTER TABLE users ADD COLUMN IF NOT EXISTS role
//!    - Restores legacy role column with default 'employee'
//!    - IF NOT EXISTS ensures safe re-runs
//!
//! 4. UPDATE users SET role with CASE WHEN EXISTS
//!    - Reverse migration: RBAC roles → legacy role strings
//!    - Takes highest-level role if user has multiple roles
//!    - Uses nested EXISTS subqueries for role resolution
//!
//! ### Migration Strategy
//!
//! This is a **deprecation migration** that transitions from:
//! - **Legacy:** Single-role column (users.role VARCHAR)
//! - **RBAC:** Many-to-many role assignments (user_role_assignments table)
//!
//! The down migration is best-effort: if a user has multiple RBAC roles,
//! only the highest-level role is preserved in the legacy column.
//!
//! ## Migration Type: Complex Mixed (Schema + Data + Deprecation)
//!
//! This migration permanently transitions the system to RBAC while maintaining
//! data integrity and providing a rollback path (with limitations).

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Migrate from legacy role column to RBAC
        // Data + schema migration - intentionally raw SQL
        // Step 1: Migrate existing user roles to user_role_assignments
        // Map legacy role values to RBAC role names:
        // 'system_admin' | 'admin' → 'Admin'
        // 'hr_manager' → 'HR Manager'
        // 'manager' → 'Manager'
        // 'hr_employee' | 'employee' → 'Employee'

        manager
            .get_connection()
            .execute_unprepared(
                "INSERT INTO hr_public.user_role_assignments (id, user_id, role_id)
                SELECT
                    gen_random_uuid(),
                    u.id,
                    r.id
                FROM hr_public.users u
                CROSS JOIN hr_public.roles r
                WHERE
                    (u.role IN ('system_admin', 'admin') AND r.name = 'Admin')
                    OR (u.role = 'hr_manager' AND r.name = 'HR Manager')
                    OR (u.role = 'manager' AND r.name = 'Manager')
                    OR (u.role IN ('hr_employee', 'employee') AND r.name = 'Employee')
                ON CONFLICT (user_id, role_id) DO NOTHING",
            )
            .await?;

        // Step 2: Remove the users.role column
        manager
            .get_connection()
            .execute_unprepared("ALTER TABLE hr_public.users DROP COLUMN IF EXISTS role")
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Reverse migration: RBAC → legacy role column
        // Data + schema migration - intentionally raw SQL
        // Step 1: Re-add the role column
        manager
            .get_connection()
            .execute_unprepared(
                "ALTER TABLE hr_public.users
                ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'employee' NOT NULL",
            )
            .await?;

        // Step 2: Migrate RBAC roles back to users.role column (reverse migration)
        // This is best-effort: if a user has multiple roles, we take the highest level one
        manager
            .get_connection()
            .execute_unprepared(
                "UPDATE hr_public.users u
                SET role = CASE
                    WHEN EXISTS (
                        SELECT 1 FROM hr_public.user_role_assignments ura
                        JOIN hr_public.roles r ON r.id = ura.role_id
                        WHERE ura.user_id = u.id AND r.name = 'Admin'
                    ) THEN 'system_admin'
                    WHEN EXISTS (
                        SELECT 1 FROM hr_public.user_role_assignments ura
                        JOIN hr_public.roles r ON r.id = ura.role_id
                        WHERE ura.user_id = u.id AND r.name = 'HR Manager'
                    ) THEN 'hr_manager'
                    WHEN EXISTS (
                        SELECT 1 FROM hr_public.user_role_assignments ura
                        JOIN hr_public.roles r ON r.id = ura.role_id
                        WHERE ura.user_id = u.id AND r.name = 'Manager'
                    ) THEN 'manager'
                    ELSE 'hr_employee'
                END",
            )
            .await?;

        Ok(())
    }
}
