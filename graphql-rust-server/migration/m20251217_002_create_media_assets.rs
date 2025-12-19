use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        db.execute(sea_orm::Statement::from_string(
            manager.get_database_backend(),
            r#"
            CREATE TABLE IF NOT EXISTS hr_public.media_assets (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                filename TEXT NOT NULL,
                storage_path TEXT NOT NULL,
                mime_type TEXT NOT NULL,
                size_bytes BIGINT NOT NULL,
                uploaded_by UUID REFERENCES hr_public.users(id) ON DELETE SET NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            "#.to_owned(),
        )).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        db.execute(sea_orm::Statement::from_string(
            manager.get_database_backend(),
            r#"
            DROP TABLE IF EXISTS hr_public.media_assets;
            "#.to_owned(),
        )).await?;

        Ok(())
    }
}