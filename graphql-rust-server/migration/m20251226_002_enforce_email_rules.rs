use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Add CHECK constraint to prevent empty emails
        manager
            .get_connection()
            .execute_unprepared(
                "ALTER TABLE hr_public.users 
                 ADD CONSTRAINT chk_users_email_not_empty 
                 CHECK (email IS NOT NULL AND length(trim(email)) > 0)"
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Remove the CHECK constraint
        manager
            .get_connection()
            .execute_unprepared(
                "ALTER TABLE hr_public.users 
                 DROP CONSTRAINT IF EXISTS chk_users_email_not_empty"
            )
            .await?;

        Ok(())
    }
}
