use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Get a reference to the encryption_keys table
        let encryption_keys_table = Alias::new("encryption_keys");
        let hr_public_schema = Alias::new("hr_public");

        // Add missing columns to encryption_keys table
        manager
            .alter_table(
                Table::alter()
                    .table((hr_public_schema.clone(), encryption_keys_table.clone()))
                    .add_column(
                        ColumnDef::new(Alias::new("key_identifier"))
                            .string()
                            .not_null()
                    )
                    .add_column(
                        ColumnDef::new(Alias::new("encrypted_key_data"))
                            .binary()
                            .not_null()
                    )
                    .add_column(
                        ColumnDef::new(Alias::new("key_algorithm"))
                            .string()
                            .not_null()
                    )
                    .add_column(
                        ColumnDef::new(Alias::new("created_for_user"))
                            .uuid()
                            .not_null()
                    )
                    .to_owned(),
            )
            .await?;

        // Copy data from old columns to new columns where possible
        // For existing records, we'll set default values
        let sql = r#"
            UPDATE hr_public.encryption_keys
            SET
                key_identifier = COALESCE(key_name, 'unknown-' || id::text),
                encrypted_key_data = encrypted_key,
                key_algorithm = 'AES-GCM-256',
                created_for_user = '00000000-0000-0000-0000-000000000000'::uuid
            WHERE key_identifier IS NULL
        "#;

        manager.get_connection().execute_unprepared(sql).await?;

        // Make key_identifier unique and not null, and make old columns nullable
        let sql = r#"
            -- Make key_identifier unique and not null
            ALTER TABLE hr_public.encryption_keys
            ADD CONSTRAINT encryption_keys_key_identifier_key UNIQUE (key_identifier),
            ALTER COLUMN key_identifier SET NOT NULL;

            -- Make old columns nullable for backward compatibility
            ALTER TABLE hr_public.encryption_keys
            ALTER COLUMN key_name DROP NOT NULL,
            ALTER COLUMN encrypted_key DROP NOT NULL;
        "#;

        manager.get_connection().execute_unprepared(sql).await?;

        // Add foreign key constraint for created_for_user
        manager
            .alter_table(
                Table::alter()
                    .table((hr_public_schema.clone(), encryption_keys_table.clone()))
                    .add_foreign_key(
                        TableForeignKey::new()
                            .name("fk_encryption_keys_created_for_user")
                            .from_tbl((hr_public_schema.clone(), encryption_keys_table.clone()))
                            .from_col(Alias::new("created_for_user"))
                            .to_tbl((hr_public_schema.clone(), Alias::new("users")))
                            .to_col(Alias::new("id"))
                            .on_delete(ForeignKeyAction::Cascade)
                    )
                    .to_owned(),
            )
            .await?;

        // Optionally drop old columns after data migration
        // We'll keep them for now in case of rollback needs
        // manager
        //     .alter_table(
        //         Table::alter()
        //             .table((hr_public_schema, encryption_keys_table))
        //             .drop_column(Alias::new("key_name"))
        //             .drop_column(Alias::new("encrypted_key"))
        //             .to_owned(),
        //     )
        //     .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Reverse the schema changes using raw SQL
        let sql = r#"
            -- Remove the unique constraint and make key_identifier nullable
            ALTER TABLE hr_public.encryption_keys
            DROP CONSTRAINT IF EXISTS encryption_keys_key_identifier_key,
            ALTER COLUMN key_identifier DROP NOT NULL;

            -- Make old columns NOT NULL again
            ALTER TABLE hr_public.encryption_keys
            ALTER COLUMN key_name SET NOT NULL,
            ALTER COLUMN encrypted_key SET NOT NULL;

            -- Remove the foreign key constraint
            ALTER TABLE hr_public.encryption_keys
            DROP CONSTRAINT IF EXISTS fk_encryption_keys_created_for_user;

            -- Drop the new columns
            ALTER TABLE hr_public.encryption_keys
            DROP COLUMN IF EXISTS key_identifier,
            DROP COLUMN IF EXISTS encrypted_key_data,
            DROP COLUMN IF EXISTS key_algorithm,
            DROP COLUMN IF EXISTS created_for_user;
        "#;

        manager.get_connection().execute_unprepared(sql).await?;

        Ok(())
    }
}