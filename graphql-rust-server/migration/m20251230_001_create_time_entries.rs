//! Migration: Time Entries for QuickBooks Time Tracking Sync
//!
//! Creates tables for time tracking and QuickBooks Time Activities integration:
//! - time_entries: Individual time entry records with QB sync
//! - projects: Projects/jobs for time allocation
//!
//! Supports billable/non-billable hours, project allocation, approval workflows,
//! and synchronization with QuickBooks Time Activities.

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create projects table for time allocation
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, Projects::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Projects::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(
                        ColumnDef::new(Projects::Name)
                            .string_len(255)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Projects::Code)
                            .string_len(50)
                            .null(),
                    )
                    .col(
                        ColumnDef::new(Projects::Description)
                            .text()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(Projects::ClientName)
                            .string_len(255)
                            .null(),
                    )
                    .col(
                        ColumnDef::new(Projects::IsActive)
                            .boolean()
                            .not_null()
                            .default(true),
                    )
                    .col(
                        ColumnDef::new(Projects::IsBillable)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .col(
                        ColumnDef::new(Projects::QuickbooksCustomerId)
                            .string_len(255)
                            .null(),
                    )
                    .col(
                        ColumnDef::new(Projects::QuickbooksServiceItemId)
                            .string_len(255)
                            .null(),
                    )
                    .col(
                        ColumnDef::new(Projects::SyncedAt)
                            .timestamp_with_time_zone()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(Projects::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Projects::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(Projects::DeletedAt)
                            .timestamp_with_time_zone()
                            .null(),
                    )
                    .to_owned(),
            )
            .await?;

        // Create unique index on project code
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_projects_code")
                    .table((Schema::HrPublic, Projects::Table))
                    .col(Projects::Code)
                    .unique()
                    .to_owned(),
            )
            .await?;

        // Create index on QuickBooks Customer ID for sync
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_projects_qb_customer")
                    .table((Schema::HrPublic, Projects::Table))
                    .col(Projects::QuickbooksCustomerId)
                    .to_owned(),
            )
            .await?;

        // Create time_entries table
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, TimeEntries::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(TimeEntries::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(
                        ColumnDef::new(TimeEntries::UserId)
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(TimeEntries::EntryDate)
                            .date()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(TimeEntries::Hours)
                            .decimal_len(5, 2)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(TimeEntries::ProjectId)
                            .uuid()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(TimeEntries::IsBillable)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .col(
                        ColumnDef::new(TimeEntries::Description)
                            .text()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(TimeEntries::Status)
                            .string_len(20)
                            .not_null()
                            .default("draft"),
                    )
                    .col(
                        ColumnDef::new(TimeEntries::ApprovedBy)
                            .uuid()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(TimeEntries::ApprovedAt)
                            .timestamp_with_time_zone()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(TimeEntries::RejectedReason)
                            .text()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(TimeEntries::QuickbooksTimeActivityId)
                            .string_len(255)
                            .null(),
                    )
                    .col(
                        ColumnDef::new(TimeEntries::SyncStatus)
                            .string_len(20)
                            .not_null()
                            .default("not_synced"),
                    )
                    .col(
                        ColumnDef::new(TimeEntries::SyncedAt)
                            .timestamp_with_time_zone()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(TimeEntries::SyncError)
                            .text()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(TimeEntries::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(TimeEntries::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(TimeEntries::DeletedAt)
                            .timestamp_with_time_zone()
                            .null(),
                    )
                    .to_owned(),
            )
            .await?;

        // Add foreign keys using raw SQL for schema specification
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                ALTER TABLE hr_public.time_entries
                ADD CONSTRAINT fk_time_entries_user
                FOREIGN KEY (user_id)
                REFERENCES hr_public.users(id)
                ON DELETE CASCADE,

                ADD CONSTRAINT fk_time_entries_project
                FOREIGN KEY (project_id)
                REFERENCES hr_public.projects(id)
                ON DELETE SET NULL,

                ADD CONSTRAINT fk_time_entries_approved_by
                FOREIGN KEY (approved_by)
                REFERENCES hr_public.users(id)
                ON DELETE SET NULL
                "#,
            )
            .await?;

        // Create indexes for efficient queries
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_time_entries_user_date")
                    .table((Schema::HrPublic, TimeEntries::Table))
                    .col(TimeEntries::UserId)
                    .col(TimeEntries::EntryDate)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_time_entries_project")
                    .table((Schema::HrPublic, TimeEntries::Table))
                    .col(TimeEntries::ProjectId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_time_entries_status")
                    .table((Schema::HrPublic, TimeEntries::Table))
                    .col(TimeEntries::Status)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_time_entries_sync_status")
                    .table((Schema::HrPublic, TimeEntries::Table))
                    .col(TimeEntries::SyncStatus)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_time_entries_qb_time_activity")
                    .table((Schema::HrPublic, TimeEntries::Table))
                    .col(TimeEntries::QuickbooksTimeActivityId)
                    .to_owned(),
            )
            .await?;

        // Add time tracking permissions
        manager.get_connection().execute_unprepared(
            r#"
            INSERT INTO hr_public.permissions (id, resource, action, description, created_at, updated_at)
            VALUES
            -- Time Entry Management
            (gen_random_uuid(), 'time_entries', 'create', 'Create time entries', NOW(), NOW()),
            (gen_random_uuid(), 'time_entries', 'view_own', 'View own time entries', NOW(), NOW()),
            (gen_random_uuid(), 'time_entries', 'view_all', 'View all time entries', NOW(), NOW()),
            (gen_random_uuid(), 'time_entries', 'edit_own', 'Edit own time entries', NOW(), NOW()),
            (gen_random_uuid(), 'time_entries', 'edit_all', 'Edit all time entries', NOW(), NOW()),
            (gen_random_uuid(), 'time_entries', 'delete_own', 'Delete own time entries', NOW(), NOW()),
            (gen_random_uuid(), 'time_entries', 'delete_all', 'Delete all time entries', NOW(), NOW()),
            (gen_random_uuid(), 'time_entries', 'approve', 'Approve time entries', NOW(), NOW()),
            (gen_random_uuid(), 'time_entries', 'reject', 'Reject time entries', NOW(), NOW()),

            -- Time Sync Operations
            (gen_random_uuid(), 'time_sync', 'trigger', 'Trigger time entry sync to QuickBooks', NOW(), NOW()),
            (gen_random_uuid(), 'time_sync', 'view_status', 'View time sync status', NOW(), NOW()),
            (gen_random_uuid(), 'time_sync', 'retry_failed', 'Retry failed time syncs', NOW(), NOW()),

            -- Project Management
            (gen_random_uuid(), 'projects', 'create', 'Create projects', NOW(), NOW()),
            (gen_random_uuid(), 'projects', 'view', 'View projects', NOW(), NOW()),
            (gen_random_uuid(), 'projects', 'edit', 'Edit projects', NOW(), NOW()),
            (gen_random_uuid(), 'projects', 'delete', 'Delete projects', NOW(), NOW()),
            (gen_random_uuid(), 'projects', 'sync_qb', 'Sync projects with QuickBooks', NOW(), NOW())
            ON CONFLICT (resource, action) DO NOTHING
            "#
        ).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop indexes
        manager
            .drop_index(
                Index::drop()
                    .if_exists()
                    .name("idx_time_entries_qb_time_activity")
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .if_exists()
                    .name("idx_time_entries_sync_status")
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .if_exists()
                    .name("idx_time_entries_status")
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .if_exists()
                    .name("idx_time_entries_project")
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .if_exists()
                    .name("idx_time_entries_user_date")
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .if_exists()
                    .name("idx_projects_qb_customer")
                    .to_owned(),
            )
            .await?;

        manager
            .drop_index(
                Index::drop()
                    .if_exists()
                    .name("idx_projects_code")
                    .to_owned(),
            )
            .await?;

        // Drop tables
        manager
            .drop_table(
                Table::drop()
                    .if_exists()
                    .table((Schema::HrPublic, TimeEntries::Table))
                    .to_owned(),
            )
            .await?;

        manager
            .drop_table(
                Table::drop()
                    .if_exists()
                    .table((Schema::HrPublic, Projects::Table))
                    .to_owned(),
            )
            .await?;

        // Remove permissions (soft delete)
        manager.get_connection().execute_unprepared(
            r#"
            UPDATE hr_public.permissions
            SET deleted_at = NOW()
            WHERE resource IN ('time_entries', 'time_sync', 'projects')
            AND action IN (
                'create', 'view_own', 'view_all', 'edit_own', 'edit_all',
                'delete_own', 'delete_all', 'approve', 'reject',
                'trigger', 'view_status', 'retry_failed',
                'view', 'edit', 'delete', 'sync_qb'
            )
            "#
        ).await?;

        Ok(())
    }
}

#[derive(Iden)]
enum Schema {
    HrPublic,
}

#[derive(Iden)]
enum Projects {
    Table,
    Id,
    Name,
    Code,
    Description,
    ClientName,
    IsActive,
    IsBillable,
    QuickbooksCustomerId,
    QuickbooksServiceItemId,
    SyncedAt,
    CreatedAt,
    UpdatedAt,
    DeletedAt,
}

#[derive(Iden)]
enum TimeEntries {
    Table,
    Id,
    UserId,
    EntryDate,
    Hours,
    ProjectId,
    IsBillable,
    Description,
    Status,
    ApprovedBy,
    ApprovedAt,
    RejectedReason,
    QuickbooksTimeActivityId,
    SyncStatus,
    SyncedAt,
    SyncError,
    CreatedAt,
    UpdatedAt,
    DeletedAt,
}

#[derive(Iden)]
#[allow(dead_code)]
enum Users {
    Table,
    Id,
}
