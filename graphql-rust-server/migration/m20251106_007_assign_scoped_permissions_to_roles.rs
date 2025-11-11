use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Assign scoped permissions to roles based on their access levels

        // Employee role: read:self for most resources
        manager.get_connection().execute_unprepared(
            "INSERT INTO hr_public.role_permissions (role_id, permission_id)
            SELECT r.id, p.id
            FROM hr_public.roles r
            CROSS JOIN hr_public.permissions p
            WHERE r.name = 'Employee'
            AND (p.resource, p.action) IN (
                -- Self-access for most resources
                ('dashboard', 'read:self'),
                ('users', 'read:self'),
                ('employees', 'read:self'),
                ('departments', 'read:self'),
                ('events', 'read:all'),  -- Events are typically visible to all
                ('tasks', 'read:self'),
                ('activities', 'read:self'),
                ('notifications', 'read:self'),
                ('attendance', 'read:self'),
                ('leave', 'read:self'),
                ('performance', 'read:self'),
                ('reviews', 'read:self'),
                ('goals', 'read:self'),
                ('reports', 'read:self'),
                ('documents', 'read:self'),
                ('payroll', 'read:self'),
                -- Write permissions for own data
                ('leave', 'write'),  -- Can create leave requests
                ('goals', 'write'),  -- Can manage own goals
                ('tasks', 'write')   -- Can update own tasks
            )
            ON CONFLICT DO NOTHING"
        ).await?;

        // Manager role: read:team + write for managed resources
        manager.get_connection().execute_unprepared(
            "INSERT INTO hr_public.role_permissions (role_id, permission_id)
            SELECT r.id, p.id
            FROM hr_public.roles r
            CROSS JOIN hr_public.permissions p
            WHERE r.name = 'Manager'
            AND (p.resource, p.action) IN (
                -- Team-level read access
                ('dashboard', 'read:team'),
                ('users', 'read:team'),
                ('employees', 'read:team'),
                ('departments', 'read:team'),
                ('events', 'read:all'),
                ('tasks', 'read:team'),
                ('activities', 'read:team'),
                ('notifications', 'read:team'),
                ('attendance', 'read:team'),
                ('leave', 'read:team'),
                ('performance', 'read:team'),
                ('reviews', 'read:team'),
                ('goals', 'read:team'),
                ('reports', 'read:team'),
                ('documents', 'read:team'),
                ('management', 'read:team'),
                ('teams', 'read:team'),
                -- Write permissions for team resources
                ('tasks', 'write'),
                ('performance', 'write'),
                ('reviews', 'write'),
                ('goals', 'write'),
                ('management', 'write'),
                ('teams', 'write'),
                ('attendance', 'write'),
                -- Special permissions
                ('leave', 'approve'),
                ('tasks', 'reassign'),
                ('reports', 'execute')
            )
            ON CONFLICT DO NOTHING"
        ).await?;

        // HR Manager role: read:all + write + delete for HR resources
        manager.get_connection().execute_unprepared(
            "INSERT INTO hr_public.role_permissions (role_id, permission_id)
            SELECT r.id, p.id
            FROM hr_public.roles r
            CROSS JOIN hr_public.permissions p
            WHERE r.name = 'HR Manager'
            AND (p.resource, p.action) IN (
                -- Full read access to all resources
                ('dashboard', 'read:all'),
                ('users', 'read:all'),
                ('employees', 'read:all'),
                ('departments', 'read:all'),
                ('events', 'read:all'),
                ('tasks', 'read:all'),
                ('activities', 'read:all'),
                ('notifications', 'read:all'),
                ('attendance', 'read:all'),
                ('leave', 'read:all'),
                ('performance', 'read:all'),
                ('reviews', 'read:all'),
                ('goals', 'read:all'),
                ('reports', 'read:all'),
                ('documents', 'read:all'),
                ('management', 'read:all'),
                ('teams', 'read:all'),
                ('roles', 'read:all'),
                ('permissions', 'read:all'),
                ('admin', 'read:all'),
                ('payroll', 'read:all'),
                -- Write permissions
                ('employees', 'write'),
                ('departments', 'write'),
                ('events', 'write'),
                ('tasks', 'write'),
                ('notifications', 'write'),
                ('attendance', 'write'),
                ('leave', 'write'),
                ('performance', 'write'),
                ('reviews', 'write'),
                ('goals', 'write'),
                ('reports', 'write'),
                ('documents', 'write'),
                ('management', 'write'),
                ('teams', 'write'),
                ('roles', 'write'),
                ('permissions', 'write'),
                ('admin', 'write'),
                ('payroll', 'write'),
                -- Delete permissions
                ('employees', 'delete'),
                ('departments', 'delete'),
                ('events', 'delete'),
                ('tasks', 'delete'),
                ('notifications', 'delete'),
                ('attendance', 'delete'),
                ('leave', 'delete'),
                ('performance', 'delete'),
                ('reviews', 'delete'),
                ('goals', 'delete'),
                ('reports', 'delete'),
                ('documents', 'delete'),
                -- Special permissions
                ('leave', 'approve'),
                ('tasks', 'reassign'),
                ('reports', 'execute'),
                ('reports', 'analytics'),
                ('documents', 'audit')
            )
            ON CONFLICT DO NOTHING"
        ).await?;

        // System Admin: Already has wildcard permission from previous migrations
        // No additional assignments needed as * covers everything

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Remove scoped permission assignments from roles
        manager.get_connection().execute_unprepared(
            "DELETE FROM hr_public.role_permissions
            WHERE role_id IN (
                SELECT id FROM hr_public.roles
                WHERE name IN ('Employee', 'Manager', 'HR Manager')
            )
            AND permission_id IN (
                SELECT id FROM hr_public.permissions
                WHERE action IN ('read:self', 'read:team', 'read:all')
                OR (resource, action) IN (
                    ('employees', 'write'),
                    ('employees', 'delete'),
                    ('departments', 'write'),
                    ('departments', 'delete'),
                    ('events', 'write'),
                    ('events', 'delete'),
                    ('tasks', 'write'),
                    ('tasks', 'delete'),
                    ('notifications', 'write'),
                    ('notifications', 'delete'),
                    ('attendance', 'write'),
                    ('attendance', 'delete'),
                    ('leave', 'write'),
                    ('leave', 'delete'),
                    ('performance', 'write'),
                    ('performance', 'delete'),
                    ('reviews', 'write'),
                    ('reviews', 'delete'),
                    ('goals', 'write'),
                    ('goals', 'delete'),
                    ('reports', 'write'),
                    ('reports', 'delete'),
                    ('documents', 'write'),
                    ('documents', 'delete'),
                    ('management', 'write'),
                    ('management', 'delete'),
                    ('teams', 'write'),
                    ('teams', 'delete'),
                    ('roles', 'write'),
                    ('roles', 'delete'),
                    ('permissions', 'write'),
                    ('permissions', 'delete'),
                    ('admin', 'write'),
                    ('admin', 'delete'),
                    ('payroll', 'write'),
                    ('payroll', 'delete'),
                    ('dashboard', 'write'),
                    ('dashboard', 'delete'),
                    ('users', 'write'),
                    ('users', 'delete'),
                    ('activities', 'write'),
                    ('activities', 'delete')
                )
            )"
        ).await?;

        Ok(())
    }
}
