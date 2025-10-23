use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create custom encryption functions for key management
        let sql = r#"
            -- Create encrypt_key_data function
            CREATE OR REPLACE FUNCTION hr_public.encrypt_key_data(
                data bytea,
                key_identifier text
            ) RETURNS bytea
            LANGUAGE plpgsql
            AS $$
            BEGIN
                -- Use symmetric encryption with a derived key
                -- For production, you might want to use a more sophisticated key derivation
                RETURN pgp_sym_encrypt(data::text, key_identifier || '-encryption-key');
            END;
            $$;

            -- Create decrypt_key_data function
            CREATE OR REPLACE FUNCTION hr_public.decrypt_key_data(
                encrypted_data bytea,
                key_identifier text
            ) RETURNS bytea
            LANGUAGE plpgsql
            AS $$
            BEGIN
                -- Use symmetric decryption with the same derived key
                RETURN pgp_sym_decrypt(encrypted_data, key_identifier || '-encryption-key')::bytea;
            END;
            $$;

            -- Grant execute permissions to public (functions are accessible to all database users)
            -- Note: In production, you may want to restrict this based on your RLS policies
        "#;

        manager.get_connection().execute_unprepared(sql).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let sql = r#"
            -- Drop the custom functions
            DROP FUNCTION IF EXISTS hr_public.decrypt_key_data(bytea, text);
            DROP FUNCTION IF EXISTS hr_public.encrypt_key_data(bytea, text);
        "#;

        manager.get_connection().execute_unprepared(sql).await?;

        Ok(())
    }
}