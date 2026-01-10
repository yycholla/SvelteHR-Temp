use sea_orm_migration::prelude::*;

use super::migration_helpers::MigrationHelpers;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Add sync tracking fields to users table
        // NOTE: employee_number already exists from m20251222_002_add_quickbooks_employee_fields.rs
        // Adding it here would cause migration failure
        MigrationHelpers::add_columns_if_not_exist(
            manager,
            "hr_public.users",
            &[
                "last_synced_at TIMESTAMPTZ",
                "last_modified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
                "quickbooks_sync_token TEXT",
                "sync_status TEXT NOT NULL DEFAULT 'synced'",
            ],
        )
        .await?;

        // Add sync tracking fields to departments table
        MigrationHelpers::add_columns_if_not_exist(
            manager,
            "hr_public.departments",
            &[
                "last_synced_at TIMESTAMPTZ",
                "last_modified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
                "quickbooks_sync_token TEXT",
                "sync_status TEXT NOT NULL DEFAULT 'synced'",
            ],
        )
        .await?;

        // Create indexes for efficient querying on users table
        MigrationHelpers::create_index_if_not_exists(
            manager,
            "idx_users_last_synced_at",
            "hr_public.users",
            "last_synced_at",
        )
        .await?;

        MigrationHelpers::create_index_if_not_exists(
            manager,
            "idx_users_sync_status",
            "hr_public.users",
            "sync_status",
        )
        .await?;

        MigrationHelpers::create_index_if_not_exists(
            manager,
            "idx_users_intuit_id_sync_status",
            "hr_public.users",
            "intuit_employee_id, sync_status",
        )
        .await?;

        // Create indexes for efficient querying on departments table
        MigrationHelpers::create_index_if_not_exists(
            manager,
            "idx_departments_last_synced_at",
            "hr_public.departments",
            "last_synced_at",
        )
        .await?;

        MigrationHelpers::create_index_if_not_exists(
            manager,
            "idx_departments_sync_status",
            "hr_public.departments",
            "sync_status",
        )
        .await?;

        MigrationHelpers::create_index_if_not_exists(
            manager,
            "idx_departments_intuit_id_sync_status",
            "hr_public.departments",
            "intuit_department_id, sync_status",
        )
        .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop indexes first (departments)
        MigrationHelpers::drop_index_if_exists(
            manager,
            "hr_public.idx_departments_intuit_id_sync_status",
        )
        .await?;

        MigrationHelpers::drop_index_if_exists(manager, "hr_public.idx_departments_sync_status")
            .await?;

        MigrationHelpers::drop_index_if_exists(
            manager,
            "hr_public.idx_departments_last_synced_at",
        )
        .await?;

        // Drop indexes (users)
        MigrationHelpers::drop_index_if_exists(
            manager,
            "hr_public.idx_users_intuit_id_sync_status",
        )
        .await?;

        MigrationHelpers::drop_index_if_exists(manager, "hr_public.idx_users_sync_status")
            .await?;

        MigrationHelpers::drop_index_if_exists(manager, "hr_public.idx_users_last_synced_at")
            .await?;

        // Drop columns from departments table
        MigrationHelpers::execute_idempotent(
            manager,
            "ALTER TABLE hr_public.departments
                DROP COLUMN IF EXISTS sync_status,
                DROP COLUMN IF EXISTS quickbooks_sync_token,
                DROP COLUMN IF EXISTS last_modified_at,
                DROP COLUMN IF EXISTS last_synced_at",
            "Drop sync tracking columns from departments",
        )
        .await?;

        // Drop columns from users table
        // NOTE: employee_number is NOT dropped here as it belongs to m20251222_002_add_quickbooks_employee_fields.rs
        MigrationHelpers::execute_idempotent(
            manager,
            "ALTER TABLE hr_public.users
                DROP COLUMN IF EXISTS sync_status,
                DROP COLUMN IF EXISTS quickbooks_sync_token,
                DROP COLUMN IF EXISTS last_modified_at,
                DROP COLUMN IF EXISTS last_synced_at",
            "Drop sync tracking columns from users",
        )
        .await?;

        Ok(())
    }
}
