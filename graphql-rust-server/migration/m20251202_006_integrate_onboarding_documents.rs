//! Integration between onboarding documents and document management system
//!
//! ## Migration Type: Mixed (Schema + Data)
//!
//! This migration bridges the onboarding module with the document management system
//! by adding a foreign key relationship and creating a dedicated category for onboarding documents.
//!
//! ### Schema Operations (Converted to SeaORM Builders):
//! - ✓ ALTER TABLE ADD COLUMN (document_id to onboarding_document_uploads)
//! - ✓ CREATE INDEX (idx_onboarding_document_uploads_document_id)
//! - ✓ DROP INDEX (on rollback)
//! - ✓ DROP COLUMN (on rollback)
//!
//! ### Data Operations (Intentionally Raw SQL):
//! - INSERT INTO document_categories (seed data)
//! - DELETE FROM document_categories (cleanup on rollback)
//!
//! ### Constraints (No Builder API Available):
//! - ADD CONSTRAINT fk_onboarding_document_uploads_document_id
//!   - Foreign key requires raw SQL as SeaORM's ForeignKey builder is incompatible with ALTER TABLE
//!   - Using ON DELETE CASCADE to maintain referential integrity
//!   - When a document is deleted, the reference is automatically removed
//!
//! ## Why This Design?
//!
//! The nullable document_id column allows gradual migration:
//! 1. Existing onboarding uploads continue to work without documents
//! 2. New uploads can optionally link to document management
//! 3. Future migrations can enforce the relationship if needed
//!
//! ## Rollback Safety
//!
//! All operations use IF EXISTS/IF NOT EXISTS for idempotency.
//! The foreign key constraint will fail if documents table doesn't exist,
//! which is the correct behavior (enforces migration order).

use sea_orm::ConnectionTrait;
use sea_orm::Statement;
use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // ===================================================================
        // DATA OPERATION: Create "Onboarding Documents" category
        // ===================================================================
        // This is a data seeding operation, not a schema change.
        // Uses raw SQL with idempotency via WHERE NOT EXISTS.
        // The category enables proper organization of onboarding-related documents.
        db.execute(Statement::from_string(
            manager.get_database_backend(),
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
            "#
            .to_string(),
        ))
        .await?;

        // ===================================================================
        // SCHEMA OPERATION: Add document_id column (nullable)
        // ===================================================================
        // Check if column exists before adding (idempotency)
        let column_exists = db
            .query_one(Statement::from_string(
                manager.get_database_backend(),
                "SELECT COUNT(*) as count FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'onboarding_document_uploads'
                 AND column_name = 'document_id'"
                    .to_string(),
            ))
            .await?;

        let count: i64 = column_exists
            .and_then(|row| row.try_get("", "count").ok())
            .unwrap_or(0);

        if count == 0 {
            manager
                .alter_table(
                    Table::alter()
                        .table((Schema::HrPublic, OnboardingDocumentUploads::Table))
                        .add_column(
                            ColumnDef::new(OnboardingDocumentUploads::DocumentId)
                                .uuid()
                                .null(), // Nullable to allow gradual migration
                        )
                        .to_owned(),
                )
                .await?;
        }

        // ===================================================================
        // CONSTRAINT: Add foreign key (raw SQL required)
        // ===================================================================
        // SeaORM's ForeignKey builder doesn't support ALTER TABLE ADD CONSTRAINT.
        // This establishes referential integrity between onboarding uploads and documents.
        // ON DELETE CASCADE ensures cleanup when documents are deleted.
        db.execute(Statement::from_string(
            manager.get_database_backend(),
            r#"
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.table_constraints
                        WHERE constraint_schema = 'hr_public'
                        AND table_name = 'onboarding_document_uploads'
                        AND constraint_name = 'fk_onboarding_document_uploads_document_id'
                    ) THEN
                        ALTER TABLE hr_public.onboarding_document_uploads
                        ADD CONSTRAINT fk_onboarding_document_uploads_document_id
                            FOREIGN KEY (document_id)
                            REFERENCES hr_public.documents(id)
                            ON DELETE CASCADE;
                    END IF;
                END $$;
            "#
            .to_string(),
        ))
        .await?;

        // ===================================================================
        // SCHEMA OPERATION: Create index on document_id (SeaORM builder)
        // ===================================================================
        // Improves lookup performance when querying uploads by document
        manager
            .create_index(
                Index::create()
                    .name("idx_onboarding_document_uploads_document_id")
                    .table((Schema::HrPublic, OnboardingDocumentUploads::Table))
                    .col(OnboardingDocumentUploads::DocumentId)
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // ===================================================================
        // SCHEMA OPERATION: Drop index (SeaORM builder)
        // ===================================================================
        // Check if index exists before dropping (idempotency)
        let index_exists = db
            .query_one(Statement::from_string(
                manager.get_database_backend(),
                "SELECT COUNT(*) as count FROM pg_indexes
                 WHERE schemaname = 'hr_public'
                 AND tablename = 'onboarding_document_uploads'
                 AND indexname = 'idx_onboarding_document_uploads_document_id'"
                    .to_string(),
            ))
            .await?;

        let index_count: i64 = index_exists
            .and_then(|row| row.try_get("", "count").ok())
            .unwrap_or(0);

        if index_count > 0 {
            manager
                .drop_index(
                    Index::drop()
                        .name("idx_onboarding_document_uploads_document_id")
                        .table((Schema::HrPublic, OnboardingDocumentUploads::Table))
                        .to_owned(),
                )
                .await?;
        }

        // ===================================================================
        // CONSTRAINT: Drop foreign key (raw SQL required)
        // ===================================================================
        // Drop constraint before dropping column to avoid dependency issues
        db.execute(Statement::from_string(
            manager.get_database_backend(),
            r#"
                ALTER TABLE hr_public.onboarding_document_uploads
                DROP CONSTRAINT IF EXISTS fk_onboarding_document_uploads_document_id
            "#
            .to_string(),
        ))
        .await?;

        // ===================================================================
        // SCHEMA OPERATION: Drop document_id column (SeaORM builder)
        // ===================================================================
        // Check if column exists before dropping (idempotency)
        let column_exists = db
            .query_one(Statement::from_string(
                manager.get_database_backend(),
                "SELECT COUNT(*) as count FROM information_schema.columns
                 WHERE table_schema = 'hr_public'
                 AND table_name = 'onboarding_document_uploads'
                 AND column_name = 'document_id'"
                    .to_string(),
            ))
            .await?;

        let column_count: i64 = column_exists
            .and_then(|row| row.try_get("", "count").ok())
            .unwrap_or(0);

        if column_count > 0 {
            manager
                .alter_table(
                    Table::alter()
                        .table((Schema::HrPublic, OnboardingDocumentUploads::Table))
                        .drop_column(OnboardingDocumentUploads::DocumentId)
                        .to_owned(),
                )
                .await?;
        }

        // ===================================================================
        // DATA OPERATION: Delete onboarding documents category
        // ===================================================================
        // Cleanup the seeded data. This is a data operation, not schema.
        db.execute(Statement::from_string(
            manager.get_database_backend(),
            r#"
                DELETE FROM hr_public.document_categories
                WHERE name = 'Onboarding Documents'
            "#
            .to_string(),
        ))
        .await?;

        Ok(())
    }
}

/// Schema identifier for hr_public schema
#[derive(Iden)]
enum Schema {
    HrPublic,
}

/// Table identifier for onboarding_document_uploads table
#[derive(Iden)]
enum OnboardingDocumentUploads {
    Table,
    DocumentId,
}
