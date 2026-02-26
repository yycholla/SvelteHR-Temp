//! Migration: Create comprehensive onboarding module system
//!
//! This migration creates a complete onboarding/employee orientation system with:
//! - 3 PostgreSQL ENUMs (content types, form field types, progress status)
//! - 7 tables (modules, templates, content blocks, assignments, progress, submissions, uploads)
//! - 15 foreign keys (CASCADE and SET NULL strategies)
//! - 8 indexes for query optimization
//!
//! ## SeaORM Builder Usage: Mixed Approach (20/23 operations)
//!
//! - **Raw SQL (3 operations):** PostgreSQL ENUM type creation (no builder API)
//! - **SeaORM Builders (20 operations):** All table/index operations use builders
//!
//! ### Operations Breakdown:
//!
//! **Raw SQL Operations (3 - PostgreSQL-Specific):**
//! 1. CREATE TYPE onboarding_content_type ENUM
//!    - Values: TEXT, DOCUMENT, FORM, FILE_UPLOAD, SIGNATURE
//!    - No SeaORM builder API for custom types
//!
//! 2. CREATE TYPE form_field_type ENUM
//!    - 14 values (TEXT, TEXTAREA, NUMBER, EMAIL, PHONE, DATE, etc.)
//!    - No SeaORM builder API for custom types
//!
//! 3. CREATE TYPE onboarding_progress_status ENUM
//!    - Values: NOT_STARTED, IN_PROGRESS, COMPLETED, SKIPPED
//!    - No SeaORM builder API for custom types
//!
//! **SeaORM Builder Operations (20):**
//! 4-10. CREATE TABLE operations (7 tables)
//! 11-18. CREATE INDEX operations (8 indexes)
//! 19-23. DROP operations (7 tables in down migration)
//!
//! ### Table Structure:
//!
//! **onboarding_modules:**
//! - Core module definition with title, description, category, tags
//! - author_id → users (SET NULL on delete)
//! - 9 columns total
//!
//! **onboarding_form_templates:**
//! - Reusable form definitions with versioning
//! - JSONB fields column stores dynamic form structure
//! - 9 columns total
//!
//! **onboarding_content_blocks:**
//! - Module content with type-specific fields (polymorphic design)
//! - sequence_order for ordering within module
//! - onboarding_module_id → onboarding_modules (CASCADE)
//! - form_template_id → onboarding_form_templates (SET NULL)
//! - 13 columns total
//!
//! **onboarding_assignments:**
//! - Assigns modules to users with due dates
//! - user_id → users (CASCADE), module_id → modules (CASCADE)
//! - assigned_by_id → users (SET NULL)
//! - 7 columns total
//!
//! **onboarding_progress:**
//! - Tracks user progress per content block
//! - user_id → users (CASCADE), content_block_id → blocks (CASCADE)
//! - 7 columns total
//!
//! **onboarding_form_submissions:**
//! - Stores completed form data with audit trail
//! - JSONB form_data column stores submission
//! - 3 FKs: user, content_block, form_template
//! - 8 columns total
//!
//! **onboarding_document_uploads:**
//! - Tracks uploaded files per content block
//! - user_id → users (CASCADE), content_block_id → blocks (CASCADE)
//! - 9 columns total
//!
//! ### Foreign Key Strategy:
//!
//! **CASCADE (delete children):**
//! - Delete user → cascades to assignments, progress, submissions, uploads
//! - Delete module → cascades to content blocks, assignments
//! - Delete content block → cascades to progress, submissions, uploads
//!
//! **SET NULL (preserve children):**
//! - Delete author → sets author_id to NULL (preserve modules)
//! - Delete assigner → sets assigned_by_id to NULL (preserve assignments)
//! - Delete form template → sets form_template_id to NULL (preserve blocks/submissions)
//!
//! ### Indexes:
//! - idx_onboarding_blocks_module: Fast lookup of blocks by module
//! - idx_onboarding_blocks_sequence: Ordered block retrieval
//! - idx_onboarding_assignments_user: User's assignments
//! - idx_onboarding_assignments_module: Module assignments
//! - idx_onboarding_progress_user: User progress tracking
//! - idx_onboarding_progress_block: Block completion status
//! - idx_onboarding_form_submissions_user: User submissions
//! - idx_onboarding_document_uploads_user: User uploads
//!
//! ### Migration Strategy:
//!
//! This is a **feature module migration** that:
//! - Creates complete onboarding/orientation system
//! - Uses polymorphic design for content blocks (type-specific fields)
//! - JSONB for flexible form definitions and submissions
//! - Comprehensive audit trail (timestamps, IP, user agent)
//! - Granular progress tracking per content block
//! - File upload support with storage metadata
//!
//! **Onboarding Workflow:**
//! 1. Create module with content blocks (text, documents, forms, uploads, signatures)
//! 2. Assign module to user with due date
//! 3. User completes blocks in sequence order
//! 4. Progress tracked per block (NOT_STARTED → IN_PROGRESS → COMPLETED)
//! 5. Form submissions and uploads stored with audit trail
//!
//! ## Migration Type: Feature Module (Mixed: Raw SQL ENUMs + SeaORM Builders)
//!
//! This migration demonstrates proper handling of PostgreSQL-specific features
//! (custom ENUMs) combined with SeaORM builder patterns for table creation.

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // PostgreSQL-specific operation - Using raw SQL (CREATE TYPE)
        // 1. Create onboarding_content_type ENUM (no builder API for custom types)
        manager
            .get_connection()
            .execute_unprepared(
                "CREATE TYPE hr_public.onboarding_content_type AS ENUM ('TEXT', 'DOCUMENT', 'FORM', 'FILE_UPLOAD', 'SIGNATURE')"
            )
            .await?;

        // PostgreSQL-specific operation - Using raw SQL (CREATE TYPE)
        // 2. Create form_field_type ENUM (14 field types, no builder API)
        manager
            .get_connection()
            .execute_unprepared(
                "CREATE TYPE hr_public.form_field_type AS ENUM ('TEXT', 'TEXTAREA', 'NUMBER', 'EMAIL', 'PHONE', 'DATE', 'DROPDOWN', 'RADIO', 'CHECKBOX', 'SIGNATURE', 'INITIALS', 'ADDRESS', 'SSN', 'FILE_UPLOAD')"
            )
            .await?;

        // PostgreSQL-specific operation - Using raw SQL (CREATE TYPE)
        // 3. Create onboarding_progress_status ENUM (4 status values, no builder API)
        manager
            .get_connection()
            .execute_unprepared(
                "CREATE TYPE hr_public.onboarding_progress_status AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED')"
            )
            .await?;

        // Schema modification operation - Using SeaORM builder (CREATE TABLE)
        // 4. Create onboarding_modules table (9 columns, 1 FK to users)
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, OnboardingModules::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(OnboardingModules::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(ColumnDef::new(OnboardingModules::Title).string().not_null())
                    .col(ColumnDef::new(OnboardingModules::Description).text())
                    .col(
                        ColumnDef::new(OnboardingModules::IsActive)
                            .boolean()
                            .not_null()
                            .default(true),
                    )
                    .col(ColumnDef::new(OnboardingModules::Category).string())
                    .col(ColumnDef::new(OnboardingModules::Tags).array(ColumnType::Text))
                    .col(ColumnDef::new(OnboardingModules::AuthorId).uuid())
                    .col(
                        ColumnDef::new(OnboardingModules::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(OnboardingModules::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_onboarding_modules_author_id")
                            .from(
                                (Schema::HrPublic, OnboardingModules::Table),
                                OnboardingModules::AuthorId,
                            )
                            .to((Schema::HrPublic, Alias::new("users")), Alias::new("id"))
                            .on_delete(ForeignKeyAction::SetNull),
                    )
                    .to_owned(),
            )
            .await?;

        // Schema modification operation - Using SeaORM builder (CREATE TABLE)
        // 5. Create onboarding_form_templates table (9 columns, JSONB fields)
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, OnboardingFormTemplates::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(OnboardingFormTemplates::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(
                        ColumnDef::new(OnboardingFormTemplates::Name)
                            .string()
                            .not_null(),
                    )
                    .col(ColumnDef::new(OnboardingFormTemplates::Description).text())
                    .col(ColumnDef::new(OnboardingFormTemplates::Category).string())
                    .col(ColumnDef::new(OnboardingFormTemplates::Version).string())
                    .col(
                        ColumnDef::new(OnboardingFormTemplates::IsActive)
                            .boolean()
                            .not_null()
                            .default(true),
                    )
                    .col(
                        ColumnDef::new(OnboardingFormTemplates::Fields)
                            .json_binary()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(OnboardingFormTemplates::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(OnboardingFormTemplates::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        // Schema modification operation - Using SeaORM builder (CREATE TABLE)
        // 6. Create onboarding_content_blocks table (13 columns, 2 FKs, polymorphic design)
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, OnboardingContentBlocks::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(OnboardingContentBlocks::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(
                        ColumnDef::new(OnboardingContentBlocks::OnboardingModuleId)
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(OnboardingContentBlocks::Title)
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(OnboardingContentBlocks::Type)
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(OnboardingContentBlocks::SequenceOrder)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(OnboardingContentBlocks::IsRequired)
                            .boolean()
                            .not_null()
                            .default(true),
                    )
                    // Type-specific content fields
                    .col(ColumnDef::new(OnboardingContentBlocks::TextContent).text())
                    .col(ColumnDef::new(OnboardingContentBlocks::DocumentUrl).string())
                    .col(ColumnDef::new(OnboardingContentBlocks::FormTemplateId).uuid())
                    .col(
                        ColumnDef::new(OnboardingContentBlocks::FileUploadRequirements)
                            .json_binary(),
                    )
                    .col(
                        ColumnDef::new(OnboardingContentBlocks::SignatureRequirements)
                            .json_binary(),
                    )
                    .col(
                        ColumnDef::new(OnboardingContentBlocks::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(OnboardingContentBlocks::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_onboarding_blocks_module_id")
                            .from(
                                (Schema::HrPublic, OnboardingContentBlocks::Table),
                                OnboardingContentBlocks::OnboardingModuleId,
                            )
                            .to(
                                (Schema::HrPublic, OnboardingModules::Table),
                                OnboardingModules::Id,
                            )
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_onboarding_blocks_form_template_id")
                            .from(
                                (Schema::HrPublic, OnboardingContentBlocks::Table),
                                OnboardingContentBlocks::FormTemplateId,
                            )
                            .to(
                                (Schema::HrPublic, OnboardingFormTemplates::Table),
                                OnboardingFormTemplates::Id,
                            )
                            .on_delete(ForeignKeyAction::SetNull),
                    )
                    .to_owned(),
            )
            .await?;

        // Schema modification operation - Using SeaORM builder (CREATE TABLE)
        // 7. Create onboarding_assignments table (7 columns, 3 FKs with mixed CASCADE/SET NULL)
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, OnboardingAssignments::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(OnboardingAssignments::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(
                        ColumnDef::new(OnboardingAssignments::UserId)
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(OnboardingAssignments::OnboardingModuleId)
                            .uuid()
                            .not_null(),
                    )
                    .col(ColumnDef::new(OnboardingAssignments::AssignedById).uuid())
                    .col(
                        ColumnDef::new(OnboardingAssignments::AssignedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(ColumnDef::new(OnboardingAssignments::DueDate).timestamp_with_time_zone())
                    .col(
                        ColumnDef::new(OnboardingAssignments::CompletedAt)
                            .timestamp_with_time_zone(),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_onboarding_assignments_user_id")
                            .from(
                                (Schema::HrPublic, OnboardingAssignments::Table),
                                OnboardingAssignments::UserId,
                            )
                            .to((Schema::HrPublic, Alias::new("users")), Alias::new("id"))
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_onboarding_assignments_module_id")
                            .from(
                                (Schema::HrPublic, OnboardingAssignments::Table),
                                OnboardingAssignments::OnboardingModuleId,
                            )
                            .to(
                                (Schema::HrPublic, OnboardingModules::Table),
                                OnboardingModules::Id,
                            )
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_onboarding_assignments_assigned_by_id")
                            .from(
                                (Schema::HrPublic, OnboardingAssignments::Table),
                                OnboardingAssignments::AssignedById,
                            )
                            .to((Schema::HrPublic, Alias::new("users")), Alias::new("id"))
                            .on_delete(ForeignKeyAction::SetNull),
                    )
                    .to_owned(),
            )
            .await?;

        // Schema modification operation - Using SeaORM builder (CREATE TABLE)
        // 8. Create onboarding_progress table (7 columns, 2 FKs, tracks completion per block)
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, OnboardingProgress::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(OnboardingProgress::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(ColumnDef::new(OnboardingProgress::UserId).uuid().not_null())
                    .col(
                        ColumnDef::new(OnboardingProgress::ContentBlockId)
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(OnboardingProgress::Status)
                            .string()
                            .not_null()
                            .default("NOT_STARTED"),
                    )
                    .col(ColumnDef::new(OnboardingProgress::StartedAt).timestamp_with_time_zone())
                    .col(ColumnDef::new(OnboardingProgress::CompletedAt).timestamp_with_time_zone())
                    .col(
                        ColumnDef::new(OnboardingProgress::LastAccessedAt)
                            .timestamp_with_time_zone(),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_onboarding_progress_user_id")
                            .from(
                                (Schema::HrPublic, OnboardingProgress::Table),
                                OnboardingProgress::UserId,
                            )
                            .to((Schema::HrPublic, Alias::new("users")), Alias::new("id"))
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_onboarding_progress_block_id")
                            .from(
                                (Schema::HrPublic, OnboardingProgress::Table),
                                OnboardingProgress::ContentBlockId,
                            )
                            .to(
                                (Schema::HrPublic, OnboardingContentBlocks::Table),
                                OnboardingContentBlocks::Id,
                            )
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // Schema modification operation - Using SeaORM builder (CREATE TABLE)
        // 9. Create onboarding_form_submissions table (8 columns, 3 FKs, JSONB form_data with audit trail)
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, OnboardingFormSubmissions::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(OnboardingFormSubmissions::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(
                        ColumnDef::new(OnboardingFormSubmissions::UserId)
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(OnboardingFormSubmissions::ContentBlockId)
                            .uuid()
                            .not_null(),
                    )
                    .col(ColumnDef::new(OnboardingFormSubmissions::FormTemplateId).uuid())
                    .col(
                        ColumnDef::new(OnboardingFormSubmissions::FormData)
                            .json_binary()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(OnboardingFormSubmissions::SubmittedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(ColumnDef::new(OnboardingFormSubmissions::IpAddress).string())
                    .col(ColumnDef::new(OnboardingFormSubmissions::UserAgent).text())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_onboarding_form_submissions_user_id")
                            .from(
                                (Schema::HrPublic, OnboardingFormSubmissions::Table),
                                OnboardingFormSubmissions::UserId,
                            )
                            .to((Schema::HrPublic, Alias::new("users")), Alias::new("id"))
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_onboarding_form_submissions_block_id")
                            .from(
                                (Schema::HrPublic, OnboardingFormSubmissions::Table),
                                OnboardingFormSubmissions::ContentBlockId,
                            )
                            .to(
                                (Schema::HrPublic, OnboardingContentBlocks::Table),
                                OnboardingContentBlocks::Id,
                            )
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_onboarding_form_submissions_form_template_id")
                            .from(
                                (Schema::HrPublic, OnboardingFormSubmissions::Table),
                                OnboardingFormSubmissions::FormTemplateId,
                            )
                            .to(
                                (Schema::HrPublic, OnboardingFormTemplates::Table),
                                OnboardingFormTemplates::Id,
                            )
                            .on_delete(ForeignKeyAction::SetNull),
                    )
                    .to_owned(),
            )
            .await?;

        // Schema modification operation - Using SeaORM builder (CREATE TABLE)
        // 10. Create onboarding_document_uploads table (9 columns, 2 FKs, file metadata storage)
        manager
            .create_table(
                Table::create()
                    .table((Schema::HrPublic, OnboardingDocumentUploads::Table))
                    .if_not_exists()
                    .col(
                        ColumnDef::new(OnboardingDocumentUploads::Id)
                            .uuid()
                            .not_null()
                            .primary_key()
                            .extra("DEFAULT gen_random_uuid()"),
                    )
                    .col(
                        ColumnDef::new(OnboardingDocumentUploads::UserId)
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(OnboardingDocumentUploads::ContentBlockId)
                            .uuid()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(OnboardingDocumentUploads::FileName)
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(OnboardingDocumentUploads::FileSizeBytes)
                            .big_integer()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(OnboardingDocumentUploads::MimeType)
                            .string()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(OnboardingDocumentUploads::StoragePath)
                            .string()
                            .not_null(),
                    )
                    .col(ColumnDef::new(OnboardingDocumentUploads::StorageUrl).string())
                    .col(
                        ColumnDef::new(OnboardingDocumentUploads::UploadedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_onboarding_document_uploads_user_id")
                            .from(
                                (Schema::HrPublic, OnboardingDocumentUploads::Table),
                                OnboardingDocumentUploads::UserId,
                            )
                            .to((Schema::HrPublic, Alias::new("users")), Alias::new("id"))
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_onboarding_document_uploads_block_id")
                            .from(
                                (Schema::HrPublic, OnboardingDocumentUploads::Table),
                                OnboardingDocumentUploads::ContentBlockId,
                            )
                            .to(
                                (Schema::HrPublic, OnboardingContentBlocks::Table),
                                OnboardingContentBlocks::Id,
                            )
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // Schema modification operation - Using SeaORM builder (CREATE INDEX)
        // 11-18. Create 8 indexes for query optimization with IF NOT EXISTS for idempotency
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_onboarding_blocks_module")
                    .table((Schema::HrPublic, OnboardingContentBlocks::Table))
                    .col(OnboardingContentBlocks::OnboardingModuleId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_onboarding_blocks_sequence")
                    .table((Schema::HrPublic, OnboardingContentBlocks::Table))
                    .col(OnboardingContentBlocks::OnboardingModuleId)
                    .col(OnboardingContentBlocks::SequenceOrder)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_onboarding_assignments_user")
                    .table((Schema::HrPublic, OnboardingAssignments::Table))
                    .col(OnboardingAssignments::UserId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_onboarding_assignments_module")
                    .table((Schema::HrPublic, OnboardingAssignments::Table))
                    .col(OnboardingAssignments::OnboardingModuleId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_onboarding_progress_user")
                    .table((Schema::HrPublic, OnboardingProgress::Table))
                    .col(OnboardingProgress::UserId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_onboarding_progress_block")
                    .table((Schema::HrPublic, OnboardingProgress::Table))
                    .col(OnboardingProgress::ContentBlockId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_onboarding_form_submissions_user")
                    .table((Schema::HrPublic, OnboardingFormSubmissions::Table))
                    .col(OnboardingFormSubmissions::UserId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_onboarding_document_uploads_user")
                    .table((Schema::HrPublic, OnboardingDocumentUploads::Table))
                    .col(OnboardingDocumentUploads::UserId)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Schema modification operation - Using SeaORM builder (DROP TABLE)
        // 19-25. Drop tables in reverse order with IF EXISTS for idempotency
        manager
            .drop_table(
                Table::drop()
                    .if_exists()
                    .table((Schema::HrPublic, OnboardingDocumentUploads::Table))
                    .to_owned(),
            )
            .await?;

        manager
            .drop_table(
                Table::drop()
                    .if_exists()
                    .table((Schema::HrPublic, OnboardingFormSubmissions::Table))
                    .to_owned(),
            )
            .await?;

        manager
            .drop_table(
                Table::drop()
                    .if_exists()
                    .table((Schema::HrPublic, OnboardingProgress::Table))
                    .to_owned(),
            )
            .await?;

        manager
            .drop_table(
                Table::drop()
                    .if_exists()
                    .table((Schema::HrPublic, OnboardingAssignments::Table))
                    .to_owned(),
            )
            .await?;

        manager
            .drop_table(
                Table::drop()
                    .if_exists()
                    .table((Schema::HrPublic, OnboardingContentBlocks::Table))
                    .to_owned(),
            )
            .await?;

        manager
            .drop_table(
                Table::drop()
                    .if_exists()
                    .table((Schema::HrPublic, OnboardingFormTemplates::Table))
                    .to_owned(),
            )
            .await?;

        manager
            .drop_table(
                Table::drop()
                    .if_exists()
                    .table((Schema::HrPublic, OnboardingModules::Table))
                    .to_owned(),
            )
            .await?;

        // PostgreSQL-specific operation - Using raw SQL (DROP TYPE with IF EXISTS)
        // 26-28. Drop ENUMs (already have IF EXISTS for idempotency)
        manager
            .get_connection()
            .execute_unprepared("DROP TYPE IF EXISTS hr_public.onboarding_progress_status")
            .await?;

        manager
            .get_connection()
            .execute_unprepared("DROP TYPE IF EXISTS hr_public.form_field_type")
            .await?;

        manager
            .get_connection()
            .execute_unprepared("DROP TYPE IF EXISTS hr_public.onboarding_content_type")
            .await?;

        Ok(())
    }
}

// Schema enum
#[derive(Iden)]
enum Schema {
    HrPublic,
}

// Onboarding content type enum (documentation - created via raw SQL)
#[allow(dead_code)]
#[derive(Iden)]
enum OnboardingContentType {
    #[iden = "onboarding_content_type"]
    Enum,
    #[iden = "TEXT"]
    Text,
    #[iden = "DOCUMENT"]
    Document,
    #[iden = "FORM"]
    Form,
    #[iden = "FILE_UPLOAD"]
    FileUpload,
    #[iden = "SIGNATURE"]
    Signature,
}

// Form field type enum (documentation - created via raw SQL)
#[allow(dead_code)]
#[derive(Iden)]
enum FormFieldType {
    #[iden = "form_field_type"]
    Enum,
    #[iden = "TEXT"]
    Text,
    #[iden = "TEXTAREA"]
    Textarea,
    #[iden = "NUMBER"]
    Number,
    #[iden = "EMAIL"]
    Email,
    #[iden = "PHONE"]
    Phone,
    #[iden = "DATE"]
    Date,
    #[iden = "DROPDOWN"]
    Dropdown,
    #[iden = "RADIO"]
    Radio,
    #[iden = "CHECKBOX"]
    Checkbox,
    #[iden = "SIGNATURE"]
    Signature,
    #[iden = "INITIALS"]
    Initials,
    #[iden = "ADDRESS"]
    Address,
    #[iden = "SSN"]
    Ssn,
    #[iden = "FILE_UPLOAD"]
    FileUpload,
}

// Onboarding progress status enum (documentation - created via raw SQL)
#[allow(dead_code)]
#[derive(Iden)]
enum OnboardingProgressStatus {
    #[iden = "onboarding_progress_status"]
    Enum,
    #[iden = "NOT_STARTED"]
    NotStarted,
    #[iden = "IN_PROGRESS"]
    InProgress,
    #[iden = "COMPLETED"]
    Completed,
    #[iden = "SKIPPED"]
    Skipped,
}

// Table enums
#[derive(Iden)]
enum OnboardingModules {
    Table,
    Id,
    Title,
    Description,
    IsActive,
    Category,
    Tags,
    AuthorId,
    CreatedAt,
    UpdatedAt,
}

#[derive(Iden)]
enum OnboardingFormTemplates {
    Table,
    Id,
    Name,
    Description,
    Category,
    Version,
    IsActive,
    Fields,
    CreatedAt,
    UpdatedAt,
}

#[derive(Iden)]
enum OnboardingContentBlocks {
    Table,
    Id,
    OnboardingModuleId,
    Title,
    Type,
    SequenceOrder,
    IsRequired,
    TextContent,
    DocumentUrl,
    FormTemplateId,
    FileUploadRequirements,
    SignatureRequirements,
    CreatedAt,
    UpdatedAt,
}

#[derive(Iden)]
enum OnboardingAssignments {
    Table,
    Id,
    UserId,
    OnboardingModuleId,
    AssignedById,
    AssignedAt,
    DueDate,
    CompletedAt,
}

#[derive(Iden)]
enum OnboardingProgress {
    Table,
    Id,
    UserId,
    ContentBlockId,
    Status,
    StartedAt,
    CompletedAt,
    LastAccessedAt,
}

#[derive(Iden)]
enum OnboardingFormSubmissions {
    Table,
    Id,
    UserId,
    ContentBlockId,
    FormTemplateId,
    FormData,
    SubmittedAt,
    IpAddress,
    UserAgent,
}

#[derive(Iden)]
enum OnboardingDocumentUploads {
    Table,
    Id,
    UserId,
    ContentBlockId,
    FileName,
    FileSizeBytes,
    MimeType,
    StoragePath,
    StorageUrl,
    UploadedAt,
}
