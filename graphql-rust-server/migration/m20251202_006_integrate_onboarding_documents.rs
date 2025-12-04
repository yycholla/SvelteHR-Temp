use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // 1. Create "Onboarding Documents" category (only if it doesn't exist)
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                INSERT INTO hr_public.document_categories
                (id, name, description, created_at, updated_at)
                SELECT
                    gen_random_uuid(),
                    'Onboarding Documents',
                    'Documents uploaded during employee onboarding (W-4, I-9, ID verification, etc.)',
                    NOW(),
                    NOW()
                WHERE NOT EXISTS (
                    SELECT 1 FROM hr_public.document_categories
                    WHERE name = 'Onboarding Documents'
                )
                "#,
            )
            .await?;

        // 2. Add document_id column to onboarding_document_uploads
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                ALTER TABLE hr_public.onboarding_document_uploads
                ADD COLUMN IF NOT EXISTS document_id UUID,
                ADD CONSTRAINT fk_onboarding_document_uploads_document_id
                    FOREIGN KEY (document_id)
                    REFERENCES hr_public.documents(id)
                    ON DELETE CASCADE
                "#,
            )
            .await?;

        // 3. Create index on document_id for faster lookups
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                CREATE INDEX IF NOT EXISTS idx_onboarding_document_uploads_document_id
                ON hr_public.onboarding_document_uploads(document_id)
                "#,
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop index
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                DROP INDEX IF EXISTS hr_public.idx_onboarding_document_uploads_document_id
                "#,
            )
            .await?;

        // Drop foreign key constraint and column
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                ALTER TABLE hr_public.onboarding_document_uploads
                DROP CONSTRAINT IF EXISTS fk_onboarding_document_uploads_document_id,
                DROP COLUMN IF EXISTS document_id
                "#,
            )
            .await?;

        // Delete onboarding documents category
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                DELETE FROM hr_public.document_categories
                WHERE name = 'Onboarding Documents'
                "#,
            )
            .await?;

        Ok(())
    }
}
