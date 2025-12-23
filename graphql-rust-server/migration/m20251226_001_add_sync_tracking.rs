use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Add sync tracking fields to users table
        manager
            .get_connection()
            .execute_unprepared(
                "ALTER TABLE hr_public.users
                ADD COLUMN employee_number VARCHAR(50),
                ADD COLUMN last_synced_at TIMESTAMPTZ,
                ADD COLUMN last_modified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                ADD COLUMN quickbooks_sync_token TEXT,
                ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced'"
            )
            .await?;

        // Add sync tracking fields to departments table
        manager
            .get_connection()
            .execute_unprepared(
                "ALTER TABLE hr_public.departments
                ADD COLUMN last_synced_at TIMESTAMPTZ,
                ADD COLUMN last_modified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                ADD COLUMN quickbooks_sync_token TEXT,
                ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced'"
            )
            .await?;

        // Create indexes for efficient querying on users table
        manager
            .get_connection()
            .execute_unprepared(
                "CREATE INDEX idx_users_last_synced_at ON hr_public.users (last_synced_at)"
            )
            .await?;

        manager
            .get_connection()
            .execute_unprepared(
                "CREATE INDEX idx_users_sync_status ON hr_public.users (sync_status)"
            )
            .await?;

        manager
            .get_connection()
            .execute_unprepared(
                "CREATE INDEX idx_users_intuit_id_sync_status ON hr_public.users (intuit_employee_id, sync_status)"
            )
            .await?;

        // Create indexes for efficient querying on departments table
        manager
            .get_connection()
            .execute_unprepared(
                "CREATE INDEX idx_departments_last_synced_at ON hr_public.departments (last_synced_at)"
            )
            .await?;

        manager
            .get_connection()
            .execute_unprepared(
                "CREATE INDEX idx_departments_sync_status ON hr_public.departments (sync_status)"
            )
            .await?;

        manager
            .get_connection()
            .execute_unprepared(
                "CREATE INDEX idx_departments_intuit_id_sync_status ON hr_public.departments (intuit_department_id, sync_status)"
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop indexes first
        manager
            .get_connection()
            .execute_unprepared(
                "DROP INDEX IF EXISTS hr_public.idx_departments_intuit_id_sync_status"
            )
            .await?;

        manager
            .get_connection()
            .execute_unprepared(
                "DROP INDEX IF EXISTS hr_public.idx_departments_sync_status"
            )
            .await?;

        manager
            .get_connection()
            .execute_unprepared(
                "DROP INDEX IF EXISTS hr_public.idx_departments_last_synced_at"
            )
            .await?;

        manager
            .get_connection()
            .execute_unprepared(
                "DROP INDEX IF EXISTS hr_public.idx_users_intuit_id_sync_status"
            )
            .await?;

        manager
            .get_connection()
            .execute_unprepared(
                "DROP INDEX IF EXISTS hr_public.idx_users_sync_status"
            )
            .await?;

        manager
            .get_connection()
            .execute_unprepared(
                "DROP INDEX IF EXISTS hr_public.idx_users_last_synced_at"
            )
            .await?;

        // Drop columns from departments table
        manager
            .get_connection()
            .execute_unprepared(
                "ALTER TABLE hr_public.departments
                DROP COLUMN sync_status,
                DROP COLUMN quickbooks_sync_token,
                DROP COLUMN last_modified_at,
                DROP COLUMN last_synced_at"
            )
            .await?;

        // Drop columns from users table
        manager
            .get_connection()
            .execute_unprepared(
                "ALTER TABLE hr_public.users
                DROP COLUMN sync_status,
                DROP COLUMN quickbooks_sync_token,
                DROP COLUMN last_modified_at,
                DROP COLUMN last_synced_at,
                DROP COLUMN employee_number"
            )
            .await?;

        Ok(())
    }
}
