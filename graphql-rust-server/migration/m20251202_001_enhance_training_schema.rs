//! Migration: Enhance trainings table with metadata and authorship
//!
//! This migration adds SEO metadata, categorization, and authorship tracking
//! to the trainings table:
//! - meta_title: SEO-friendly title for training listings
//! - meta_description: SEO-friendly description
//! - tags: Text array for categorization and search
//! - author_id: References user who created the training
//!
//! ## SeaORM Builder Usage: 100% Converted (8/8 operations)
//!
//! All schema operations use idempotent SeaORM builders.
//!
//! ### Operations (SeaORM Builders - 8 operations):
//!
//! **Up Migration:**
//! 1. ALTER TABLE trainings ADD COLUMN meta_title
//!    - Using: `add_column_if_not_exists()` (idempotent)
//!    - Type: VARCHAR, nullable
//!    - Purpose: SEO metadata for training listings
//!
//! 2. ALTER TABLE trainings ADD COLUMN meta_description
//!    - Using: `add_column_if_not_exists()` (idempotent)
//!    - Type: VARCHAR, nullable
//!    - Purpose: SEO metadata for search engine descriptions
//!
//! 3. ALTER TABLE trainings ADD COLUMN tags
//!    - Using: `add_column_if_not_exists()` (idempotent)
//!    - Type: TEXT[], nullable (PostgreSQL array)
//!    - Purpose: Categorization, filtering, and search
//!
//! 4. ALTER TABLE trainings ADD COLUMN author_id
//!    - Using: `add_column_if_not_exists()` (idempotent)
//!    - Type: UUID, nullable
//!    - Purpose: Track who created the training (no FK constraint)
//!
//! **Down Migration:**
//! 5. ALTER TABLE trainings DROP COLUMN meta_title
//!    - Using: `drop_column_if_exists()` (idempotent)
//!
//! 6. ALTER TABLE trainings DROP COLUMN meta_description
//!    - Using: `drop_column_if_exists()` (idempotent)
//!
//! 7. ALTER TABLE trainings DROP COLUMN tags
//!    - Using: `drop_column_if_exists()` (idempotent)
//!
//! 8. ALTER TABLE trainings DROP COLUMN author_id
//!    - Using: `drop_column_if_exists()` (idempotent)
//!
//! ### Migration Strategy
//!
//! This is a **schema enhancement migration** that:
//! - Adds SEO metadata fields for better discoverability
//! - Uses PostgreSQL TEXT[] array for flexible tag storage
//! - Tracks authorship without enforcing foreign key (soft reference)
//! - All columns nullable (optional metadata)
//! - Idempotent operations (IF NOT EXISTS / IF EXISTS)
//!
//! **Use Cases:**
//! - **SEO:** meta_title and meta_description improve search rankings
//! - **Categorization:** tags enable filtering by topic/skill/department
//! - **Search:** tags support full-text search and autocomplete
//! - **Audit:** author_id tracks who created each training
//!
//! **Why No Foreign Key on author_id:**
//! - Soft reference allows historical tracking even if user deleted
//! - Avoids CASCADE complexity for audit fields
//! - Application layer handles validation
//!
//! ## Migration Type: Schema Enhancement (100% SeaORM Builders)
//!
//! This migration demonstrates proper use of idempotent column operations
//! and PostgreSQL array types for flexible metadata storage.

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Schema modification operation - Using SeaORM builder (ALTER TABLE)
        // Add 4 metadata and authorship columns with IF NOT EXISTS for idempotency
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, Trainings::Table))
                    .add_column_if_not_exists(ColumnDef::new(Trainings::MetaTitle).string().null())
                    .add_column_if_not_exists(ColumnDef::new(Trainings::MetaDescription).string().null())
                    .add_column_if_not_exists(ColumnDef::new(Trainings::Tags).array(ColumnType::Text).null())
                    .add_column_if_not_exists(ColumnDef::new(Trainings::AuthorId).uuid().null())
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Schema modification operation - Using SeaORM builder (ALTER TABLE)
        // Drop 4 metadata columns with IF EXISTS for idempotency
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, Trainings::Table))
                    .drop_column_if_exists(Trainings::MetaTitle)
                    .drop_column_if_exists(Trainings::MetaDescription)
                    .drop_column_if_exists(Trainings::Tags)
                    .drop_column_if_exists(Trainings::AuthorId)
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
enum Trainings {
    Table,
    MetaTitle,
    MetaDescription,
    Tags,
    AuthorId,
}
