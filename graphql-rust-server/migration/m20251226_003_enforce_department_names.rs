use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Add CHECK constraint to prevent empty department names
        manager
            .get_connection()
            .execute_unprepared(
                "ALTER TABLE hr_public.departments 
                 ADD CONSTRAINT chk_departments_name_not_empty 
                 CHECK (name IS NOT NULL AND length(trim(name)) > 0)"
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Remove the CHECK constraint
        manager
            .get_connection()
            .execute_unprepared(
                "ALTER TABLE hr_public.departments 
                 DROP CONSTRAINT IF EXISTS chk_departments_name_not_empty"
            )
            .await?;

        Ok(())
    }
}
