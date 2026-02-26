//! Migration: Add teams permissions
//!
//! Adds team management permissions that were missing from initial permissions migration

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Insert teams permissions
        manager
            .get_connection()
            .execute_unprepared(
                "INSERT INTO hr_public.permissions (id, resource, action, description) VALUES
                (gen_random_uuid(), 'teams', 'read', 'View teams and team information'),
                (gen_random_uuid(), 'teams', 'write', 'Create and manage teams')
                ON CONFLICT (resource, action) DO NOTHING",
            )
            .await?;

        // Assign teams permissions to Admin role
        manager
            .get_connection()
            .execute_unprepared(
                "INSERT INTO hr_public.role_permissions (id, role_id, permission_id)
                SELECT gen_random_uuid(), r.id, p.id
                FROM hr_public.roles r
                CROSS JOIN hr_public.permissions p
                WHERE r.name = 'Admin'
                AND p.resource = 'teams'
                AND NOT EXISTS (
                    SELECT 1 FROM hr_public.role_permissions rp
                    WHERE rp.role_id = r.id AND rp.permission_id = p.id
                )
                ON CONFLICT DO NOTHING",
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Remove teams permissions
        manager
            .get_connection()
            .execute_unprepared(
                "DELETE FROM hr_public.permissions
                WHERE resource = 'teams'
                AND action IN ('read', 'write')",
            )
            .await?;

        Ok(())
    }
}
