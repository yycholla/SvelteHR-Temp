//! Migration: Seed initial data (admin user, roles, permissions)

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Insert admin user with bcrypt hash for password "admin123"
        // Hash generated with: bcrypt hash -c 12 "admin123"
        manager
            .get_connection()
            .execute_unprepared(
                "INSERT INTO hr_public.users (
                    id, email, password_hash, first_name, last_name, role, is_active, hire_date
                ) VALUES (
                    gen_random_uuid(),
                    'admin@mountainhr.dev',
                    '$2b$12$2gLwMJCF1vg/WnFrDPgB0eT663zBtCQw.iiOq15NLSuWWrUqkfH9e',
                    'System',
                    'Administrator',
                    'system_admin',
                    true,
                    NOW()
                ) ON CONFLICT (email) DO NOTHING",
            )
            .await?;

        // Insert basic roles
        manager
            .get_connection()
            .execute_unprepared(
                "INSERT INTO hr_public.roles (id, name, description, level) VALUES
                (gen_random_uuid(), 'Admin', 'Full system access', 100),
                (gen_random_uuid(), 'HR Manager', 'HR management access', 75),
                (gen_random_uuid(), 'Manager', 'Team management access', 50),
                (gen_random_uuid(), 'Employee', 'Basic employee access', 25)
                ON CONFLICT (name) DO NOTHING",
            )
            .await?;

        // Insert basic permissions
        manager
            .get_connection()
            .execute_unprepared(
                "INSERT INTO hr_public.permissions (id, resource, action, description) VALUES
                (gen_random_uuid(), 'users', 'read', 'Read user information'),
                (gen_random_uuid(), 'users', 'write', 'Create and update users'),
                (gen_random_uuid(), 'users', 'delete', 'Delete users'),
                (gen_random_uuid(), 'departments', 'read', 'Read department information'),
                (gen_random_uuid(), 'departments', 'write', 'Create and update departments'),
                (gen_random_uuid(), 'roles', 'read', 'Read role information'),
                (gen_random_uuid(), 'roles', 'write', 'Manage roles'),
                (gen_random_uuid(), 'permissions', 'read', 'Read permissions'),
                (gen_random_uuid(), 'permissions', 'write', 'Manage permissions'),
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
                (gen_random_uuid(), 'reports', 'generate', 'Generate custom reports'),
                (gen_random_uuid(), 'teams', 'read', 'View teams and team information'),
                (gen_random_uuid(), 'teams', 'write', 'Create and manage teams')
                ON CONFLICT (resource, action) DO NOTHING",
            )
            .await?;

        // Assign all permissions to Admin role
        manager
            .get_connection()
            .execute_unprepared(
                "INSERT INTO hr_public.role_permissions (id, role_id, permission_id)
                SELECT gen_random_uuid(), r.id, p.id
                FROM hr_public.roles r
                CROSS JOIN hr_public.permissions p
                WHERE r.name = 'Admin'
                ON CONFLICT DO NOTHING",
            )
            .await?;

        // Assign Admin role to admin user
        manager
            .get_connection()
            .execute_unprepared(
                "INSERT INTO hr_public.user_role_assignments (id, user_id, role_id)
                SELECT gen_random_uuid(), u.id, r.id
                FROM hr_public.users u
                CROSS JOIN hr_public.roles r
                WHERE u.email = 'admin@mountainhr.dev' AND r.name = 'Admin'
                ON CONFLICT DO NOTHING",
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Remove admin user and related data
        manager
            .get_connection()
            .execute_unprepared("DELETE FROM hr_public.users WHERE email = 'admin@mountainhr.dev'")
            .await?;

        manager
            .get_connection()
            .execute_unprepared("DELETE FROM hr_public.roles WHERE name IN ('Admin', 'HR Manager', 'Manager', 'Employee')")
            .await?;

        Ok(())
    }
}
