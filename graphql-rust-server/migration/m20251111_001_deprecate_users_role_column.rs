//! Migration: Deprecate users.role column and migrate to RBAC user_role_assignments
//!
//! This migration:
//! 1. Migrates existing user role data from users.role to user_role_assignments table
//! 2. Removes the legacy users.role column
//! 3. Makes the system rely entirely on RBAC for role management

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
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
                ON CONFLICT (user_id, role_id) DO NOTHING"
            )
            .await?;

        // Step 2: Remove the users.role column
        manager
            .get_connection()
            .execute_unprepared(
                "ALTER TABLE hr_public.users DROP COLUMN IF EXISTS role"
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Step 1: Re-add the role column
        manager
            .get_connection()
            .execute_unprepared(
                "ALTER TABLE hr_public.users
                ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'employee' NOT NULL"
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
                END"
            )
            .await?;

        Ok(())
    }
}
