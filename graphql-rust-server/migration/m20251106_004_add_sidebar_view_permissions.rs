//! Migration: Add sidebar view permissions
//!
//! Seeds permission data for sidebar menu item visibility control.
//!
//! ## SeaORM Builder Usage: Not Applicable (Data Migration)
//!
//! ### Why This Migration Uses Raw SQL
//!
//! This is a **data migration** that inserts and deletes permission records.
//! SeaORM's builder API is designed for DDL (Data Definition Language) schema operations:
//! - CREATE/ALTER/DROP TABLE
//! - CREATE/DROP INDEX
//! - ADD/DROP FOREIGN KEY
//!
//! It intentionally does NOT provide builders for DML (Data Manipulation Language):
//! - INSERT (data seeding)
//! - DELETE (data cleanup)
//! - UPDATE (data modification)
//! - SELECT (data queries)
//!
//! **For data operations, raw SQL is the correct and idiomatic approach.**
//!
//! ### Operations (Raw SQL - 2 operations):
//!
//! **Up Migration:**
//! 1. INSERT 22 permission records with ON CONFLICT DO NOTHING (idempotent)
//!    - Dashboard, Events, Notifications, Activities
//!    - Attendance, Tasks (5 permissions), Performance
//!    - Goals, Reports (2 permissions), Admin
//!
//! **Down Migration:**
//! 2. DELETE the 22 permission records added by this migration
//!
//! ### Idempotency
//!
//! The INSERT uses `ON CONFLICT (resource, action) DO NOTHING` to ensure
//! the migration can be run multiple times safely without creating duplicates.
//!
//! ## Migration Type: Seed Data
//!
//! This migration populates the permissions table with predefined permission
//! records for sidebar menu visibility and access control.

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Add permissions for sidebar menu item visibility
        // Data seeding operation - intentionally raw SQL
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
        // Data cleanup operation - intentionally raw SQL
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
