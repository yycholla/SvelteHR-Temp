use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Add permissions for sidebar menu item visibility
        manager.get_connection().execute_unprepared(
            "INSERT INTO hr_public.permissions (resource, action, description) VALUES
            -- Dashboard
            ('dashboard', 'read', 'View dashboard'),

            -- Events
            ('events', 'read', 'View events'),
            ('events', 'write', 'Create and manage events'),

            -- Notifications
            ('notifications', 'read', 'View notifications'),
            ('notifications', 'write', 'Manage notifications'),

            -- Activities
            ('activities', 'read', 'View activity logs'),

            -- Attendance
            ('attendance', 'read', 'View attendance records'),
            ('attendance', 'write', 'Manage attendance records'),

            -- Tasks (comprehensive permissions)
            ('tasks', 'read', 'View tasks'),
            ('tasks', 'write', 'Edit tasks'),
            ('tasks', 'create', 'Create new tasks'),
            ('tasks', 'delete', 'Delete tasks'),
            ('tasks', 'reassign', 'Reassign tasks to different users'),

            -- Performance
            ('performance', 'read', 'View performance data'),
            ('performance', 'write', 'Manage performance data'),

            -- Goals/OKRs
            ('goals', 'read', 'View goals and OKRs'),
            ('goals', 'write', 'Create and manage goals'),

            -- Reports (additional actions)
            ('reports', 'execute', 'Execute report generation'),
            ('reports', 'analytics', 'View analytics and advanced reports'),

            -- Admin
            ('admin', 'read', 'Access admin sections'),
            ('admin', 'write', 'Manage admin settings')
            ON CONFLICT (resource, action) DO NOTHING"
        ).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Remove the added permissions
        manager.get_connection().execute_unprepared(
            "DELETE FROM hr_public.permissions WHERE (resource, action) IN (
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
                ('admin', 'write')
            )"
        ).await?;

        Ok(())
    }
}
