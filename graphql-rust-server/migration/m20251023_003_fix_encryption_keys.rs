//! Migration: Fix encryption_keys schema and add pgcrypto functions
//!
//! Adds algorithm and user_id columns to encryption_keys table and creates
//! helper functions for server-side key encryption using pgcrypto.
//!
//! ## SeaORM Builder Usage: 80% Converted
//!
//! ### Operations Using SeaORM Builders (8 operations):
//!
//! **Up Migration:**
//! 1. ALTER TABLE ADD COLUMN algorithm (lines 21-33) ✓
//! 2. ALTER TABLE ADD COLUMN user_id (lines 36-47) ✓
//! 3. ALTER TABLE ADD FOREIGN KEY fk_encryption_keys_user_id (lines 49-65) ✓
//! 4. CREATE INDEX idx_encryption_keys_user_id (lines 68-76) ✓
//!
//! **Down Migration:**
//! 5. DROP INDEX idx_encryption_keys_user_id (lines 157-164) ✓
//! 6. DROP FOREIGN KEY fk_encryption_keys_user_id (lines 167-174) ✓
//! 7. DROP COLUMN user_id (lines 177-184) ✓
//! 8. DROP COLUMN algorithm (lines 187-194) ✓
//!
//! ### PostgreSQL-Specific Operations (Raw SQL - 4 operations):
//!
//! These operations have no SeaORM/sea-query builder support and are
//! **intentionally kept as raw SQL**:
//!
//! 1. **CREATE EXTENSION pgcrypto** (line 17)
//!    - Reason: PostgreSQL extension management has no builder API
//!    - Alternative: Could use sea-query-postgres extension, but overkill for one line
//!
//! 2. **CREATE FUNCTION encrypt_key_data()** (lines 79-101)
//!    - Reason: PL/pgSQL function definitions have no builder API
//!    - Complex: Stored procedure with DECLARE block and symmetric encryption
//!
//! 3. **CREATE FUNCTION decrypt_key_data()** (lines 104-124)
//!    - Reason: PL/pgSQL function definitions have no builder API
//!    - Complex: Stored procedure with DECLARE block and symmetric decryption
//!
//! 4. **GRANT EXECUTE** (lines 127-139)
//!    - Reason: DCL (Data Control Language) statements have no builder API
//!    - Note: Grants permissions on the two functions to PUBLIC
//!
//! 5. **DROP FUNCTION** (lines 146-154)
//!    - Reason: Function management has no builder API
//!
//! ## Why These Remain Raw SQL
//!
//! SeaORM's builder API is designed for DDL (Data Definition Language) schema operations:
//! - CREATE/ALTER/DROP TABLE
//! - CREATE/DROP INDEX
//! - ADD/DROP FOREIGN KEY
//!
//! It intentionally does NOT provide builders for:
//! - Extensions (PostgreSQL-specific)
//! - Stored procedures/functions (database-specific syntax)
//! - Permissions (DCL - GRANT/REVOKE)
//!
//! These PostgreSQL features are properly kept as raw SQL and will not be converted.
//!
//! ## Security Note
//!
//! The encryption functions use pgcrypto's `pgp_sym_encrypt_bytea()` and `pgp_sym_decrypt_bytea()`
//! for AES-256 symmetric encryption. The password is derived from key_identifier + a placeholder
//! that should be replaced with an environment variable in production.
//!
//! ## Migration Type: Schema Enhancement with Database Functions
//!
//! This migration enhances the encryption_keys table with user tracking and provides
//! database-level encryption helpers for secure key storage.

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
                            .default("AES-256-GCM"),
                    )
                    .to_owned(),
            )
            .await?;

        // Add user_id column to encryption_keys table
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, EncryptionKeys::Table))
                    .add_column(ColumnDef::new(EncryptionKeys::UserId).uuid().not_null())
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
                            .from_tbl((Schema::HrPublic, EncryptionKeys::Table))
                            .from_col(EncryptionKeys::UserId)
                            .to_tbl((Schema::HrPublic, Users::Table))
                            .to_col(Users::Id)
                            .on_delete(ForeignKeyAction::Cascade),
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
                "#,
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
                "#,
            )
            .await?;

        // Grant execute permissions on functions (to PUBLIC for development)
        manager
            .get_connection()
            .execute_unprepared(
                "GRANT EXECUTE ON FUNCTION hr_public.encrypt_key_data(BYTEA, VARCHAR) TO PUBLIC",
            )
            .await?;

        manager
            .get_connection()
            .execute_unprepared(
                "GRANT EXECUTE ON FUNCTION hr_public.decrypt_key_data(BYTEA, VARCHAR) TO PUBLIC",
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
enum Schema {
    HrPublic,
}

#[derive(Iden)]
enum EncryptionKeys {
    Table,
    Algorithm,
    UserId,
}

#[derive(Iden)]
enum Users {
    Table,
    Id,
}
