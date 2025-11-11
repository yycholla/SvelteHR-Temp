use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Get permission and role IDs for assignments
        // Note: This migration assumes permissions and roles already exist

        // Assign permissions to employee role (basic read access)
        manager.get_connection().execute_unprepared(
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
            ON CONFLICT DO NOTHING"
        ).await?;

        // Assign permissions to manager role (employee permissions + management)
        manager.get_connection().execute_unprepared(
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
            ON CONFLICT DO NOTHING"
        ).await?;

        // Assign permissions to HR Manager role (manager permissions + admin)
        manager.get_connection().execute_unprepared(
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
            ON CONFLICT DO NOTHING"
        ).await?;

        // Assign wildcard permission to Admin role
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

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Remove role-permission assignments added by this migration
        manager.get_connection().execute_unprepared(
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
            )"
        ).await?;

        Ok(())
    }
}
