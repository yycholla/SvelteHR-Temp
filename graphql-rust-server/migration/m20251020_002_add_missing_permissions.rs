//! Migration: Add missing permissions for documents, management, employees, reviews, leave, and reports
//!
//! Adds comprehensive permissions that were missing from initial seed

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Insert missing permissions
        manager
            .get_connection()
            .execute_unprepared(
                "INSERT INTO hr_public.permissions (id, resource, action, description) VALUES
                (gen_random_uuid(), 'documents', 'read', 'View documents'),
                (gen_random_uuid(), 'documents', 'write', 'Upload and manage documents'),
                (gen_random_uuid(), 'documents', 'delete', 'Delete documents'),
                (gen_random_uuid(), 'documents', 'audit', 'View document audit logs'),
                (gen_random_uuid(), 'management', 'read', 'Access management dashboard'),
                (gen_random_uuid(), 'management', 'write', 'Manage team operations'),
                (gen_random_uuid(), 'employees', 'read', 'View employee information'),
                (gen_random_uuid(), 'employees', 'write', 'Create and update employees'),
                (gen_random_uuid(), 'employees', 'delete', 'Delete employees'),
                (gen_random_uuid(), 'reviews', 'read', 'View performance reviews'),
                (gen_random_uuid(), 'reviews', 'write', 'Create and manage performance reviews'),
                (gen_random_uuid(), 'leave', 'read', 'View leave requests'),
                (gen_random_uuid(), 'leave', 'write', 'Manage leave requests'),
                (gen_random_uuid(), 'leave', 'approve', 'Approve/deny leave requests'),
                (gen_random_uuid(), 'reports', 'read', 'View reports'),
                (gen_random_uuid(), 'reports', 'generate', 'Generate custom reports')
                ON CONFLICT (resource, action) DO NOTHING"
            )
            .await?;

        // Assign all new permissions to Admin role
        manager
            .get_connection()
            .execute_unprepared(
                "INSERT INTO hr_public.role_permissions (id, role_id, permission_id)
                SELECT gen_random_uuid(), r.id, p.id
                FROM hr_public.roles r
                CROSS JOIN hr_public.permissions p
                WHERE r.name = 'Admin'
                AND NOT EXISTS (
                    SELECT 1 FROM hr_public.role_permissions rp
                    WHERE rp.role_id = r.id AND rp.permission_id = p.id
                )
                ON CONFLICT DO NOTHING"
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Remove the added permissions
        manager
            .get_connection()
            .execute_unprepared(
                "DELETE FROM hr_public.permissions
                WHERE resource IN ('documents', 'management', 'employees', 'reviews', 'leave', 'reports')
                AND action IN ('read', 'write', 'delete', 'audit', 'approve', 'generate')"
            )
            .await?;

        Ok(())
    }
}
