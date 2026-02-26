//! Migration: Assign scoped permissions to roles
//!
//! Seeds role-permission assignments using the scoped permissions (read:self, read:team, read:all).
//!
//! ## SeaORM Builder Usage: Not Applicable (Data Migration)
//!
//! ### Why This Migration Uses Raw SQL
//!
//! This is a **complex data migration** that creates fine-grained RBAC relationships between
//! roles and scoped permissions. SeaORM's builder API is for DDL (schema operations), not
//! DML (data operations) with complex joins and relationships.
//!
//! **For data seeding with CROSS JOIN and role-permission assignments, raw SQL is correct.**
//!
//! ### Operations (Raw SQL - 4 operations):
//!
//! **Up Migration:**
//! 1. INSERT role_permissions for Employee role (19 permissions)
//!    - read:self for most resources (self-access only)
//!    - read:all for events (visible to everyone)
//!    - write for leave, goals, tasks (can update own data)
//!
//! 2. INSERT role_permissions for Manager role (30 permissions)
//!    - read:team for most resources (team visibility)
//!    - write for team resources (tasks, performance, reviews, etc.)
//!    - Special permissions: leave:approve, tasks:reassign, reports:execute
//!
//! 3. INSERT role_permissions for HR Manager role (70 permissions)
//!    - read:all for all resources (organization-wide visibility)
//!    - write + delete for HR resources
//!    - Full CRUD on employees, departments, reviews, documents, etc.
//!
//! Each INSERT uses:
//! - `SELECT r.id, p.id FROM roles r CROSS JOIN permissions p` - joins IDs
//! - `ON CONFLICT DO NOTHING` - ensures idempotency
//!
//! **Down Migration:**
//! 4. DELETE role_permissions using subqueries to target scoped permission assignments
//!
//! ### Scope-Based Access Control
//!
//! This migration implements the hierarchy:
//! - **Employee:** Self-access (read:self) + limited write to own data
//! - **Manager:** Team-access (read:team) + team management capabilities
//! - **HR Manager:** Full-access (read:all) + comprehensive CRUD operations
//! - **Admin:** Already has wildcard (*:*) from previous migrations
//!
//! ### Idempotency
//!
//! All INSERTs use `ON CONFLICT DO NOTHING` to safely handle re-runs.
//!
//! ## Migration Type: Seed Data (Scoped RBAC Relationships)
//!
//! This migration establishes scope-based role-permission assignments, enabling
//! fine-grained access control where users only see and modify data within their scope.

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Seed scoped role-permission assignments for RBAC
        // Data seeding operation with CROSS JOIN - intentionally raw SQL
        // Assign scoped permissions to roles based on their access levels

        // Employee role: read:self for most resources
        manager
            .get_connection()
            .execute_unprepared(
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
            ON CONFLICT DO NOTHING",
            )
            .await?;

        // Manager role: read:team + write for managed resources
        manager
            .get_connection()
            .execute_unprepared(
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
            ON CONFLICT DO NOTHING",
            )
            .await?;

        // HR Manager role: read:all + write + delete for HR resources
        manager
            .get_connection()
            .execute_unprepared(
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
            ON CONFLICT DO NOTHING",
            )
            .await?;

        // System Admin: Already has wildcard permission from previous migrations
        // No additional assignments needed as * covers everything

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Remove scoped permission assignments from roles
        // Data cleanup operation with subqueries - intentionally raw SQL
        manager
            .get_connection()
            .execute_unprepared(
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
            )",
            )
            .await?;

        Ok(())
    }
}
