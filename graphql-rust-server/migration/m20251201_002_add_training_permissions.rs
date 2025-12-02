use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // 1. Insert new permissions
        manager.get_connection().execute_unprepared(
            "INSERT INTO hr_public.permissions (resource, action, description) VALUES
            ('training', 'read', 'View training modules and content'),
            ('training', 'write', 'Create and manage training modules'),
            ('training', 'assign', 'Assign training to employees')
            ON CONFLICT (resource, action) DO NOTHING"
        ).await?;

        // 2. Assign permissions to roles
        
        // Employee: read
        manager.get_connection().execute_unprepared(
            "INSERT INTO hr_public.role_permissions (role_id, permission_id)
            SELECT r.id, p.id
            FROM hr_public.roles r
            CROSS JOIN hr_public.permissions p
            WHERE r.name = 'Employee'
            AND p.resource = 'training' AND p.action = 'read'
            ON CONFLICT DO NOTHING"
        ).await?;

        // Manager: read, assign
        manager.get_connection().execute_unprepared(
            "INSERT INTO hr_public.role_permissions (role_id, permission_id)
            SELECT r.id, p.id
            FROM hr_public.roles r
            CROSS JOIN hr_public.permissions p
            WHERE r.name = 'Manager'
            AND p.resource = 'training' AND p.action IN ('read', 'assign')
            ON CONFLICT DO NOTHING"
        ).await?;

        // HR Manager: read, write, assign
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
