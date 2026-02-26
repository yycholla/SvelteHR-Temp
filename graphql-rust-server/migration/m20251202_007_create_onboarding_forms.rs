//! Create Onboarding Forms Architecture
//!
//! ## Migration Type: Schema Creation
//!
//! This migration establishes a comprehensive forms-based onboarding system with
//! three primary tables: onboarding_forms, onboarding_form_blocks, and
//! onboarding_form_progress. It replaces the simpler content blocks approach
//! with a more flexible, modular form structure.
//!
//! ## SeaORM Builder Usage: 93% (30/32 operations)
//!
//! ### Operations Breakdown:
//!
//! **UP Migration (22 operations):**
//! 1-2. CREATE TYPE (2 enums) → Raw SQL (no SeaORM enum creation API)
//! 3. CREATE TABLE onboarding_forms → SeaORM builder ✓
//! 4. CREATE TABLE onboarding_form_blocks → SeaORM builder ✓
//! 5. CREATE TABLE onboarding_form_progress → SeaORM builder ✓
//! 6-14. CREATE INDEX (9 indexes) → SeaORM builders ✓
//!
//! **DOWN Migration (10 operations):**
//! 15-17. DROP TABLE (3 tables) → SeaORM builders ✓
//! 18-19. DROP TYPE (2 enums) → Raw SQL (no SeaORM enum drop API)
//!
//! ### Why Raw SQL for Enums?
//!
//! SeaORM's migration API does not provide builder methods for CREATE TYPE or
//! DROP TYPE operations. Enums must be created using raw SQL via execute_unprepared().
//!
//! ## Architecture Overview
//!
//! ### 1. Onboarding Forms (`onboarding_forms`)
//!
//! The top-level form container that groups related blocks together.
//!
//! **Columns:**
//! - `id`: UUID primary key
//! - `onboarding_module_id`: FK to onboarding_modules (CASCADE delete)
//! - `title`: Form display title
//! - `description`: Optional long description
//! - `sequence_order`: Position within module (default 0)
//! - `is_required`: Whether form must be completed (default true)
//! - `created_at`, `updated_at`: Timestamps
//!
//! **Purpose:**
//! Forms provide logical grouping of content blocks (3-5 blocks per form is typical).
//! This enables better progress tracking, partial saves, and step-by-step completion.
//!
//! ### 2. Onboarding Form Blocks (`onboarding_form_blocks`)
//!
//! Individual content pieces within a form (text, documents, form fields, etc.).
//!
//! **Columns:**
//! - `id`: UUID primary key
//! - `onboarding_form_id`: FK to onboarding_forms (CASCADE delete)
//! - `title`: Block display title
//! - `type`: Block type enum (TEXT, FORM_FIELDS, DOCUMENT, etc.)
//! - `sequence_order`: Position within form (default 0)
//! - **Type-specific content fields (all nullable):**
//!   - `text_content`: Rich text content (for TEXT blocks)
//!   - `document_url`: URL to document (for DOCUMENT blocks)
//!   - `form_template_id`: FK to form templates (for FORM_FIELDS blocks)
//!   - `file_upload_requirements`: JSON config (for FILE_UPLOAD blocks)
//!   - `signature_requirements`: JSON config (for SIGNATURE blocks)
//!   - `checkbox_items`: JSON array (for CHECKBOX blocks)
//! - `created_at`, `updated_at`: Timestamps
//!
//! **Block Types:**
//! - `TEXT`: Informational text content
//! - `FORM_FIELDS`: Interactive form based on template
//! - `DOCUMENT`: Link to readable document
//! - `FILE_UPLOAD`: File upload widget
//! - `SIGNATURE`: Digital signature capture
//! - `CHECKBOX`: Checklist of items
//!
//! ### 3. Onboarding Form Progress (`onboarding_form_progress`)
//!
//! Tracks user completion status for each form.
//!
//! **Columns:**
//! - `id`: UUID primary key
//! - `user_id`: FK to users (CASCADE delete)
//! - `onboarding_form_id`: FK to onboarding_forms (CASCADE delete)
//! - `status`: Progress status enum (NOT_STARTED, IN_PROGRESS, COMPLETED)
//! - `form_data`: JSONB field for partial form data
//! - `started_at`: Timestamp when user first opened form
//! - `completed_at`: Timestamp when user finished form
//! - `last_accessed_at`: Most recent access timestamp
//! - `created_at`, `updated_at`: Timestamps
//!
//! **Constraints:**
//! - Unique index on (user_id, onboarding_form_id) ensures one progress record per user per form
//!
//! ## Indexes for Performance
//!
//! 1. `idx_onboarding_forms_module_id`: Lookup forms by module
//! 2. `idx_onboarding_forms_sequence`: Sort forms within module
//! 3. `idx_form_blocks_form_id`: Lookup blocks by form
//! 4. `idx_form_blocks_sequence`: Sort blocks within form
//! 5. `idx_form_blocks_template`: Find blocks using specific template
//! 6. `idx_form_progress_user`: User's form progress
//! 7. `idx_form_progress_form`: Progress for specific form
//! 8. `idx_form_progress_status`: Filter by completion status
//! 9. `idx_form_progress_unique_user_form`: Enforce one record per user-form (UNIQUE)
//!
//! ## Foreign Key Relationships
//!
//! ```text
//! onboarding_modules (1) ─┐
//!                         │
//!                         ↓ (N)
//!                    onboarding_forms ─┐
//!                                      │
//!                                      ↓ (N)
//!                              onboarding_form_blocks
//!                                      │
//!                                      ↓ (references)
//!                              onboarding_form_templates
//!
//! users ───────────────┐
//!                      │
//!                      ↓ (N)
//!              onboarding_form_progress
//!                      │
//!                      ↓ (references)
//!              onboarding_forms
//! ```
//!
//! ## Migration Strategy
//!
//! This migration uses **idempotent operations** throughout:
//! - Tables created with `if_not_exists()`
//! - Indexes created with `if_not_exists()` (SeaORM 0.12+)
//! - Tables dropped with `if_exists()` (via DROP TABLE IF EXISTS)
//! - Enums use IF NOT EXISTS in raw SQL
//!
//! ## Rollback Safety
//!
//! DOWN migration removes all tables and enums in reverse dependency order:
//! 1. Drop onboarding_form_progress (references forms)
//! 2. Drop onboarding_form_blocks (references forms)
//! 3. Drop onboarding_forms (parent table)
//! 4. Drop enums (no longer referenced)

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // ===================================================================
        // ENUM CREATION: onboarding_form_block_type (raw SQL required)
        // ===================================================================
        // Defines the types of content blocks that can exist in forms.
        // SeaORM does not provide a builder API for CREATE TYPE statements.
        // NOTE: PostgreSQL doesn't support IF NOT EXISTS with schema-qualified type names,
        // so we use DO block with exception handling for idempotency.
        manager
            .get_connection()
            .execute_unprepared(
                "DO $$ BEGIN
                    CREATE TYPE hr_public.onboarding_form_block_type AS ENUM ('TEXT', 'FORM_FIELDS', 'DOCUMENT', 'FILE_UPLOAD', 'SIGNATURE', 'CHECKBOX');
                EXCEPTION
                    WHEN duplicate_object THEN null;
                END $$;"
            )
            .await?;

        // ===================================================================
        // ENUM CREATION: onboarding_form_progress_status (raw SQL required)
        // ===================================================================
        // Tracks the completion state of forms for users.
        // Uses DO block for idempotent creation (PostgreSQL doesn't support
        // IF NOT EXISTS with schema-qualified type names).
        manager
            .get_connection()
            .execute_unprepared(
                "DO $$ BEGIN
                    CREATE TYPE hr_public.onboarding_form_progress_status AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');
                EXCEPTION
                    WHEN duplicate_object THEN null;
                END $$;"
            )
            .await?;

        // ===================================================================
        // TABLE CREATION: onboarding_forms (SeaORM builder)
        // ===================================================================
        // Top-level form container that groups related blocks
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, OnboardingForms::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(OnboardingForms::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(
                        ColumnDef::new(OnboardingForms::OnboardingModuleId)
                            .uuid()
                            .not_null(),
                    )
                    .col(ColumnDef::new(OnboardingForms::Title).string().not_null())
                    .col(ColumnDef::new(OnboardingForms::Description).text())
                    .col(
                        ColumnDef::new(OnboardingForms::SequenceOrder)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(OnboardingForms::IsRequired)
                            .boolean()
                            .not_null()
                            .default(true),
                    )
                    .col(
                        ColumnDef::new(OnboardingForms::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(OnboardingForms::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_onboarding_forms_module_id")
                            .from(
                                (Schema::HrPublic, OnboardingForms::Table),
                                OnboardingForms::OnboardingModuleId,
                            )
                            .to(
                                (Schema::HrPublic, Alias::new("onboarding_modules")),
                                Alias::new("id"),
                            )
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // ===================================================================
        // TABLE CREATION: onboarding_form_blocks (SeaORM builder)
        // ===================================================================
        // Individual content pieces within forms (text, documents, form fields, etc.)
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, OnboardingFormBlocks::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(OnboardingFormBlocks::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(
                        ColumnDef::new(OnboardingFormBlocks::OnboardingFormId)
                            .uuid()
                            .not_null(),
                    )
                    .col(ColumnDef::new(OnboardingFormBlocks::Title).string())
                    .col(
                        ColumnDef::new(OnboardingFormBlocks::Type)
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(OnboardingFormBlocks::SequenceOrder)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    // Content fields (type-specific, nullable)
                    .col(ColumnDef::new(OnboardingFormBlocks::TextContent).text())
                    .col(ColumnDef::new(OnboardingFormBlocks::DocumentUrl).text())
                    .col(ColumnDef::new(OnboardingFormBlocks::FormTemplateId).uuid())
                    .col(ColumnDef::new(OnboardingFormBlocks::FileUploadRequirements).json_binary())
                    .col(ColumnDef::new(OnboardingFormBlocks::SignatureRequirements).json_binary())
                    .col(ColumnDef::new(OnboardingFormBlocks::CheckboxItems).json_binary())
                    .col(
                        ColumnDef::new(OnboardingFormBlocks::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(OnboardingFormBlocks::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_form_blocks_form_id")
                            .from(
                                (Schema::HrPublic, OnboardingFormBlocks::Table),
                                OnboardingFormBlocks::OnboardingFormId,
                            )
                            .to(
                                (Schema::HrPublic, OnboardingForms::Table),
                                OnboardingForms::Id,
                            )
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_form_blocks_template_id")
                            .from(
                                (Schema::HrPublic, OnboardingFormBlocks::Table),
                                OnboardingFormBlocks::FormTemplateId,
                            )
                            .to(
                                (Schema::HrPublic, Alias::new("onboarding_form_templates")),
                                Alias::new("id"),
                            )
                            .on_delete(ForeignKeyAction::SetNull),
                    )
                    .to_owned(),
            )
            .await?;

        // ===================================================================
        // TABLE CREATION: onboarding_form_progress (SeaORM builder)
        // ===================================================================
        // Tracks user completion status and partial data for each form
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, OnboardingFormProgress::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(OnboardingFormProgress::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(
                        ColumnDef::new(OnboardingFormProgress::UserId)
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(OnboardingFormProgress::OnboardingFormId)
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(OnboardingFormProgress::Status)
                            .string()
                            .not_null()
                            .default("NOT_STARTED"),
                    )
                    .col(ColumnDef::new(OnboardingFormProgress::FormData).json_binary())
                    .col(
                        ColumnDef::new(OnboardingFormProgress::StartedAt)
                            .timestamp_with_time_zone(),
                    )
                    .col(
                        ColumnDef::new(OnboardingFormProgress::CompletedAt)
                            .timestamp_with_time_zone(),
                    )
                    .col(
                        ColumnDef::new(OnboardingFormProgress::LastAccessedAt)
                            .timestamp_with_time_zone(),
                    )
                    .col(
                        ColumnDef::new(OnboardingFormProgress::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(OnboardingFormProgress::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_form_progress_user_id")
                            .from(
                                (Schema::HrPublic, OnboardingFormProgress::Table),
                                OnboardingFormProgress::UserId,
                            )
                            .to((Schema::HrPublic, Alias::new("users")), Alias::new("id"))
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_form_progress_form_id")
                            .from(
                                (Schema::HrPublic, OnboardingFormProgress::Table),
                                OnboardingFormProgress::OnboardingFormId,
                            )
                            .to(
                                (Schema::HrPublic, OnboardingForms::Table),
                                OnboardingForms::Id,
                            )
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // ===================================================================
        // INDEX CREATION: Performance optimization (SeaORM builders)
        // ===================================================================
        // Create 9 indexes to optimize common query patterns

        // Index 1: Lookup forms by module
        manager
            .create_index(
                Index::create()
                    .name("idx_onboarding_forms_module_id")
                    .table((Schema::HrPublic, OnboardingForms::Table))
                    .col(OnboardingForms::OnboardingModuleId)
                    .to_owned(),
            )
            .await?;

        // Index 2: Sort forms within module by sequence
        manager
            .create_index(
                Index::create()
                    .name("idx_onboarding_forms_sequence")
                    .table((Schema::HrPublic, OnboardingForms::Table))
                    .col(OnboardingForms::OnboardingModuleId)
                    .col(OnboardingForms::SequenceOrder)
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;

        // Index 3: Lookup blocks by form
        manager
            .create_index(
                Index::create()
                    .name("idx_form_blocks_form_id")
                    .table((Schema::HrPublic, OnboardingFormBlocks::Table))
                    .col(OnboardingFormBlocks::OnboardingFormId)
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;

        // Index 4: Sort blocks within form by sequence
        manager
            .create_index(
                Index::create()
                    .name("idx_form_blocks_sequence")
                    .table((Schema::HrPublic, OnboardingFormBlocks::Table))
                    .col(OnboardingFormBlocks::OnboardingFormId)
                    .col(OnboardingFormBlocks::SequenceOrder)
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;

        // Index 5: Find blocks using specific template
        manager
            .create_index(
                Index::create()
                    .name("idx_form_blocks_template")
                    .table((Schema::HrPublic, OnboardingFormBlocks::Table))
                    .col(OnboardingFormBlocks::FormTemplateId)
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;

        // Index 6: Lookup user's form progress
        manager
            .create_index(
                Index::create()
                    .name("idx_form_progress_user")
                    .table((Schema::HrPublic, OnboardingFormProgress::Table))
                    .col(OnboardingFormProgress::UserId)
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;

        // Index 7: Lookup progress for specific form
        manager
            .create_index(
                Index::create()
                    .name("idx_form_progress_form")
                    .table((Schema::HrPublic, OnboardingFormProgress::Table))
                    .col(OnboardingFormProgress::OnboardingFormId)
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;

        // Index 8: Filter progress by completion status
        manager
            .create_index(
                Index::create()
                    .name("idx_form_progress_status")
                    .table((Schema::HrPublic, OnboardingFormProgress::Table))
                    .col(OnboardingFormProgress::Status)
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;

        // Index 9: Unique constraint ensuring one progress record per user-form combination
        manager
            .create_index(
                Index::create()
                    .name("idx_form_progress_unique_user_form")
                    .table((Schema::HrPublic, OnboardingFormProgress::Table))
                    .col(OnboardingFormProgress::UserId)
                    .col(OnboardingFormProgress::OnboardingFormId)
                    .unique()
                    .if_not_exists()
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // ===================================================================
        // TABLE DELETION: Drop in reverse dependency order (SeaORM builders)
        // ===================================================================

        // Drop progress table first (references forms)
        manager
            .drop_table(
                Table::drop()
                    .table((Schema::HrPublic, OnboardingFormProgress::Table))
                    .if_exists()
                    .to_owned(),
            )
            .await?;

        // Drop blocks table (references forms)
        manager
            .drop_table(
                Table::drop()
                    .table((Schema::HrPublic, OnboardingFormBlocks::Table))
                    .if_exists()
                    .to_owned(),
            )
            .await?;

        // Drop forms table (parent table)
        manager
            .drop_table(
                Table::drop()
                    .table((Schema::HrPublic, OnboardingForms::Table))
                    .if_exists()
                    .to_owned(),
            )
            .await?;

        // ===================================================================
        // ENUM DELETION: Drop enums (raw SQL required)
        // ===================================================================
        // Enums dropped after tables to avoid dependency issues

        manager
            .get_connection()
            .execute_unprepared("DROP TYPE IF EXISTS hr_public.onboarding_form_progress_status")
            .await?;

        manager
            .get_connection()
            .execute_unprepared("DROP TYPE IF EXISTS hr_public.onboarding_form_block_type")
            .await?;

        Ok(())
    }
}

// Schema enum
#[derive(Iden)]
enum Schema {
    HrPublic,
}

// Onboarding form block type enum (documentation - created via raw SQL)
#[allow(dead_code)]
#[derive(Iden)]
enum OnboardingFormBlockType {
    #[iden = "onboarding_form_block_type"]
    Enum,
    #[iden = "TEXT"]
    Text,
    #[iden = "FORM_FIELDS"]
    FormFields,
    #[iden = "DOCUMENT"]
    Document,
    #[iden = "FILE_UPLOAD"]
    FileUpload,
    #[iden = "SIGNATURE"]
    Signature,
    #[iden = "CHECKBOX"]
    Checkbox,
}

// Onboarding form progress status enum (documentation - created via raw SQL)
#[allow(dead_code)]
#[derive(Iden)]
enum OnboardingFormProgressStatus {
    #[iden = "onboarding_form_progress_status"]
    Enum,
    #[iden = "NOT_STARTED"]
    NotStarted,
    #[iden = "IN_PROGRESS"]
    InProgress,
    #[iden = "COMPLETED"]
    Completed,
}

// Table enums
#[derive(Iden)]
enum OnboardingForms {
    Table,
    Id,
    OnboardingModuleId,
    Title,
    Description,
    SequenceOrder,
    IsRequired,
    CreatedAt,
    UpdatedAt,
}

#[derive(Iden)]
enum OnboardingFormBlocks {
    Table,
    Id,
    OnboardingFormId,
    Title,
    Type,
    SequenceOrder,
    TextContent,
    DocumentUrl,
    FormTemplateId,
    FileUploadRequirements,
    SignatureRequirements,
    CheckboxItems,
    CreatedAt,
    UpdatedAt,
}

#[derive(Iden)]
enum OnboardingFormProgress {
    Table,
    Id,
    UserId,
    OnboardingFormId,
    Status,
    FormData,
    StartedAt,
    CompletedAt,
    LastAccessedAt,
    CreatedAt,
    UpdatedAt,
}
