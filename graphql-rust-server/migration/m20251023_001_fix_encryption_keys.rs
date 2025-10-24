//! Migration: Fix encryption_keys schema and add pgcrypto functions
//!
//! Adds algorithm and user_id columns to encryption_keys table and creates
//! helper functions for server-side key encryption using pgcrypto.

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Ensure pgcrypto extension is available
        manager
            .get_connection()
            .execute_unprepared("CREATE EXTENSION IF NOT EXISTS pgcrypto")
            .await?;

        // Add algorithm column to encryption_keys table
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, EncryptionKeys::Table))
                    .add_column(
                        ColumnDef::new(EncryptionKeys::Algorithm)
                            .string()
                            .not_null()
                            .default("AES-256-GCM")
                    )
                    .to_owned(),
            )
            .await?;

        // Add user_id column to encryption_keys table
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, EncryptionKeys::Table))
                    .add_column(
                        ColumnDef::new(EncryptionKeys::UserId)
                            .uuid()
                            .not_null()
                    )
                    .to_owned(),
            )
            .await?;

        // Add foreign key constraint for user_id
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, EncryptionKeys::Table))
                    .add_foreign_key(
                        TableForeignKey::new()
                            .name("fk_encryption_keys_user_id")
                            .from_tbl(EncryptionKeys::Table)
                            .from_col(EncryptionKeys::UserId)
                            .to_tbl(Users::Table)
                            .to_col(Users::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                    )
                    .to_owned(),
            )
            .await?;

        // Create index on user_id for efficient queries
        manager
            .create_index(
                Index::create()
                    .name("idx_encryption_keys_user_id")
                    .table((Schema::HrPublic, EncryptionKeys::Table))
                    .col(EncryptionKeys::UserId)
                    .to_owned(),
            )
            .await?;

        // Create helper function to encrypt key data before storage (server-side encryption)
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                CREATE OR REPLACE FUNCTION hr_public.encrypt_key_data(
                    p_key_data BYTEA,
                    p_key_identifier VARCHAR
                )
                RETURNS BYTEA AS $$
                DECLARE
                    encryption_password TEXT;
                BEGIN
                    -- Use key_identifier + server secret as encryption password
                    -- TODO: Replace with environment variable in production
                    encryption_password := p_key_identifier || '_SERVER_SECRET_KEY_PLACEHOLDER';

                    -- Encrypt using pgcrypto's symmetric encryption (AES-256)
                    RETURN pgp_sym_encrypt_bytea(p_key_data, encryption_password);
                END;
                $$ LANGUAGE plpgsql SECURITY DEFINER;
                "#
            )
            .await?;

        // Create helper function to decrypt key data (server-side decryption)
        manager
            .get_connection()
            .execute_unprepared(
                r#"
                CREATE OR REPLACE FUNCTION hr_public.decrypt_key_data(
                    p_encrypted_key_data BYTEA,
                    p_key_identifier VARCHAR
                )
                RETURNS BYTEA AS $$
                DECLARE
                    encryption_password TEXT;
                BEGIN
                    encryption_password := p_key_identifier || '_SERVER_SECRET_KEY_PLACEHOLDER';

                    -- Decrypt using pgcrypto
                    RETURN pgp_sym_decrypt_bytea(p_encrypted_key_data, encryption_password);
                END;
                $$ LANGUAGE plpgsql SECURITY DEFINER;
                "#
            )
            .await?;

        // Grant execute permissions on functions
        manager
            .get_connection()
            .execute_unprepared(
                "GRANT EXECUTE ON FUNCTION hr_public.encrypt_key_data(BYTEA, VARCHAR) TO authenticated"
            )
            .await?;

        manager
            .get_connection()
            .execute_unprepared(
                "GRANT EXECUTE ON FUNCTION hr_public.decrypt_key_data(BYTEA, VARCHAR) TO authenticated"
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop functions
        manager
            .get_connection()
            .execute_unprepared("DROP FUNCTION IF EXISTS hr_public.decrypt_key_data")
            .await?;

        manager
            .get_connection()
            .execute_unprepared("DROP FUNCTION IF EXISTS hr_public.encrypt_key_data")
            .await?;

        // Drop index
        manager
            .drop_index(
                Index::drop()
                    .name("idx_encryption_keys_user_id")
                    .table((Schema::HrPublic, EncryptionKeys::Table))
                    .to_owned(),
            )
            .await?;

        // Drop foreign key constraint
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, EncryptionKeys::Table))
                    .drop_foreign_key(Alias::new("fk_encryption_keys_user_id"))
                    .to_owned(),
            )
            .await?;

        // Remove user_id column
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, EncryptionKeys::Table))
                    .drop_column(EncryptionKeys::UserId)
                    .to_owned(),
            )
            .await?;

        // Remove algorithm column
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, EncryptionKeys::Table))
                    .drop_column(EncryptionKeys::Algorithm)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }
}

#[derive(Iden)]
enum Schema { HrPublic }

#[derive(Iden)]
enum EncryptionKeys {
    Table,
    Algorithm,
    UserId
}

#[derive(Iden)]
enum Users {
    Table,
    Id
}
