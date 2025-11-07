use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Add scoped read permissions (read:self, read:team, read:all) and standardized write/delete
        // for all resource categories
        manager.get_connection().execute_unprepared(
            "INSERT INTO hr_public.permissions (resource, action, description) VALUES
            -- Dashboard
            ('dashboard', 'read:self', 'View own dashboard'),
            ('dashboard', 'read:team', 'View team dashboard'),
            ('dashboard', 'read:all', 'View all dashboards'),
            ('dashboard', 'write', 'Manage dashboard settings'),
            ('dashboard', 'delete', 'Delete dashboard items'),

            -- Users
            ('users', 'read:self', 'View own user profile'),
            ('users', 'read:team', 'View team user profiles'),
            ('users', 'read:all', 'View all user profiles'),
            ('users', 'write', 'Create and update users'),
            ('users', 'delete', 'Delete users'),

            -- Employees
            ('employees', 'read:self', 'View own employee record'),
            ('employees', 'read:team', 'View team employee records'),
            ('employees', 'read:all', 'View all employee records'),
            ('employees', 'write', 'Create and update employees'),
            ('employees', 'delete', 'Delete employees'),

            -- Departments
            ('departments', 'read:self', 'View own department'),
            ('departments', 'read:team', 'View team departments'),
            ('departments', 'read:all', 'View all departments'),
            ('departments', 'write', 'Create and update departments'),
            ('departments', 'delete', 'Delete departments'),

            -- Events
            ('events', 'read:self', 'View own events'),
            ('events', 'read:team', 'View team events'),
            ('events', 'read:all', 'View all events'),
            ('events', 'delete', 'Delete events'),

            -- Tasks
            ('tasks', 'read:self', 'View own tasks'),
            ('tasks', 'read:team', 'View team tasks'),
            ('tasks', 'read:all', 'View all tasks'),

            -- Activities
            ('activities', 'read:self', 'View own activities'),
            ('activities', 'read:team', 'View team activities'),
            ('activities', 'read:all', 'View all activities'),
            ('activities', 'write', 'Create and update activities'),
            ('activities', 'delete', 'Delete activities'),

            -- Notifications
            ('notifications', 'read:self', 'View own notifications'),
            ('notifications', 'read:team', 'View team notifications'),
            ('notifications', 'read:all', 'View all notifications'),
            ('notifications', 'delete', 'Delete notifications'),

            -- Attendance
            ('attendance', 'read:self', 'View own attendance'),
            ('attendance', 'read:team', 'View team attendance'),
            ('attendance', 'read:all', 'View all attendance'),
            ('attendance', 'delete', 'Delete attendance records'),

            -- Leave
            ('leave', 'read:self', 'View own leave'),
            ('leave', 'read:team', 'View team leave'),
            ('leave', 'read:all', 'View all leave'),
            ('leave', 'write', 'Create and update leave requests'),
            ('leave', 'delete', 'Delete leave requests'),

            -- Performance
            ('performance', 'read:self', 'View own performance'),
            ('performance', 'read:team', 'View team performance'),
            ('performance', 'read:all', 'View all performance'),
            ('performance', 'delete', 'Delete performance records'),

            -- Reviews
            ('reviews', 'read:self', 'View own reviews'),
            ('reviews', 'read:team', 'View team reviews'),
            ('reviews', 'read:all', 'View all reviews'),
            ('reviews', 'write', 'Create and update reviews'),
            ('reviews', 'delete', 'Delete reviews'),

            -- Goals
            ('goals', 'read:self', 'View own goals'),
            ('goals', 'read:team', 'View team goals'),
            ('goals', 'read:all', 'View all goals'),
            ('goals', 'delete', 'Delete goals'),

            -- Reports
            ('reports', 'read:self', 'View own reports'),
            ('reports', 'read:team', 'View team reports'),
            ('reports', 'read:all', 'View all reports'),
            ('reports', 'write', 'Create and update reports'),
            ('reports', 'delete', 'Delete reports'),

            -- Documents
            ('documents', 'read:self', 'View own documents'),
            ('documents', 'read:team', 'View team documents'),
            ('documents', 'read:all', 'View all documents'),
            ('documents', 'write', 'Create and update documents'),
            ('documents', 'delete', 'Delete documents'),

            -- Management
            ('management', 'read:self', 'View own management data'),
            ('management', 'read:team', 'View team management data'),
            ('management', 'read:all', 'View all management data'),
            ('management', 'write', 'Create and update management data'),
            ('management', 'delete', 'Delete management data'),

            -- Teams
            ('teams', 'read:self', 'View own team'),
            ('teams', 'read:team', 'View managed teams'),
            ('teams', 'read:all', 'View all teams'),
            ('teams', 'write', 'Create and update teams'),
            ('teams', 'delete', 'Delete teams'),

            -- Roles
            ('roles', 'read:self', 'View own roles'),
            ('roles', 'read:team', 'View team roles'),
            ('roles', 'read:all', 'View all roles'),
            ('roles', 'write', 'Create and update roles'),
            ('roles', 'delete', 'Delete roles'),

            -- Permissions
            ('permissions', 'read:self', 'View own permissions'),
            ('permissions', 'read:team', 'View team permissions'),
            ('permissions', 'read:all', 'View all permissions'),
            ('permissions', 'write', 'Create and update permissions'),
            ('permissions', 'delete', 'Delete permissions'),

            -- Payroll
            ('payroll', 'read:self', 'View own payroll'),
            ('payroll', 'read:team', 'View team payroll'),
            ('payroll', 'read:all', 'View all payroll'),
            ('payroll', 'write', 'Create and update payroll'),
            ('payroll', 'delete', 'Delete payroll'),

            -- Admin
            ('admin', 'read:self', 'View own admin data'),
            ('admin', 'read:team', 'View team admin data'),
            ('admin', 'read:all', 'View all admin data'),
            ('admin', 'delete', 'Delete admin data')
            ON CONFLICT (resource, action) DO NOTHING"
        ).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Remove the scoped permissions
        manager.get_connection().execute_unprepared(
            "DELETE FROM hr_public.permissions WHERE action IN ('read:self', 'read:team', 'read:all')
            OR (resource, action) IN (
                ('dashboard', 'write'),
                ('dashboard', 'delete'),
                ('users', 'write'),
                ('users', 'delete'),
                ('employees', 'write'),
                ('employees', 'delete'),
                ('departments', 'write'),
                ('departments', 'delete'),
                ('events', 'delete'),
                ('activities', 'write'),
                ('activities', 'delete'),
                ('notifications', 'delete'),
                ('attendance', 'delete'),
                ('leave', 'write'),
                ('leave', 'delete'),
                ('performance', 'delete'),
                ('reviews', 'write'),
                ('reviews', 'delete'),
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
                ('payroll', 'write'),
                ('payroll', 'delete'),
                ('admin', 'delete')
            )"
        ).await?;

        Ok(())
    }
}
