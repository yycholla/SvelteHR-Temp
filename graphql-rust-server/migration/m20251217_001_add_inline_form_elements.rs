use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // Add inline_form_elements to onboarding_content_blocks
        db.execute(sea_orm::Statement::from_string(
            manager.get_database_backend(),
            r#"
            ALTER TABLE hr_public.onboarding_content_blocks 
            ADD COLUMN IF NOT EXISTS inline_form_elements JSONB;
            "#.to_owned(),
        )).await?;

        // Add inline_form_elements to onboarding_form_blocks
        db.execute(sea_orm::Statement::from_string(
            manager.get_database_backend(),
            r#"
            ALTER TABLE hr_public.onboarding_form_blocks 
            ADD COLUMN IF NOT EXISTS inline_form_elements JSONB;
            "#.to_owned(),
        )).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        db.execute(sea_orm::Statement::from_string(
            manager.get_database_backend(),
            r#"
            ALTER TABLE hr_public.onboarding_form_blocks 
            DROP COLUMN IF EXISTS inline_form_elements;
            "#.to_owned(),
        )).await?;

        db.execute(sea_orm::Statement::from_string(
            manager.get_database_backend(),
            r#"
            ALTER TABLE hr_public.onboarding_content_blocks 
            DROP COLUMN IF EXISTS inline_form_elements;
            "#.to_owned(),
        )).await?;

        Ok(())
    }
}
