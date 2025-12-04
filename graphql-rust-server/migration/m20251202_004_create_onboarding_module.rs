use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create onboarding content type enum
        manager
            .get_connection()
            .execute_unprepared(
                "CREATE TYPE hr_public.onboarding_content_type AS ENUM ('TEXT', 'DOCUMENT', 'FORM', 'FILE_UPLOAD', 'SIGNATURE')"
            )
            .await?;

        // Create form field type enum
        manager
            .get_connection()
            .execute_unprepared(
                "CREATE TYPE hr_public.form_field_type AS ENUM ('TEXT', 'TEXTAREA', 'NUMBER', 'EMAIL', 'PHONE', 'DATE', 'DROPDOWN', 'RADIO', 'CHECKBOX', 'SIGNATURE', 'INITIALS', 'ADDRESS', 'SSN', 'FILE_UPLOAD')"
            )
            .await?;

        // Create onboarding progress status enum
        manager
            .get_connection()
            .execute_unprepared(
                "CREATE TYPE hr_public.onboarding_progress_status AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED')"
            )
            .await?;

        // Create onboarding_modules table
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
                            .from((Schema::HrPublic, OnboardingModules::Table), OnboardingModules::AuthorId)
                            .to((Schema::HrPublic, Alias::new("users")), Alias::new("id"))
                            .on_delete(ForeignKeyAction::SetNull),
                    )
                    .to_owned(),
            )
            .await?;

        // Create onboarding_form_templates table
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
                    .col(ColumnDef::new(OnboardingFormTemplates::Name).string().not_null())
                    .col(ColumnDef::new(OnboardingFormTemplates::Description).text())
                    .col(ColumnDef::new(OnboardingFormTemplates::Category).string())
                    .col(ColumnDef::new(OnboardingFormTemplates::Version).string())
                    .col(
                        ColumnDef::new(OnboardingFormTemplates::IsActive)
                            .boolean()
                            .not_null()
                            .default(true),
                    )
                    .col(ColumnDef::new(OnboardingFormTemplates::Fields).json_binary().not_null())
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

        // Create onboarding_content_blocks table
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
                    .col(ColumnDef::new(OnboardingContentBlocks::OnboardingModuleId).uuid().not_null())
                    .col(ColumnDef::new(OnboardingContentBlocks::Title).string().not_null())
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
                    .col(ColumnDef::new(OnboardingContentBlocks::FileUploadRequirements).json_binary())
                    .col(ColumnDef::new(OnboardingContentBlocks::SignatureRequirements).json_binary())
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
                            .from((Schema::HrPublic, OnboardingContentBlocks::Table), OnboardingContentBlocks::OnboardingModuleId)
                            .to((Schema::HrPublic, OnboardingModules::Table), OnboardingModules::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_onboarding_blocks_form_template_id")
                            .from((Schema::HrPublic, OnboardingContentBlocks::Table), OnboardingContentBlocks::FormTemplateId)
                            .to((Schema::HrPublic, OnboardingFormTemplates::Table), OnboardingFormTemplates::Id)
                            .on_delete(ForeignKeyAction::SetNull),
                    )
                    .to_owned(),
            )
            .await?;

        // Create onboarding_assignments table
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
                    .col(ColumnDef::new(OnboardingAssignments::UserId).uuid().not_null())
                    .col(ColumnDef::new(OnboardingAssignments::OnboardingModuleId).uuid().not_null())
                    .col(ColumnDef::new(OnboardingAssignments::AssignedById).uuid())
                    .col(
                        ColumnDef::new(OnboardingAssignments::AssignedAt)
                            .timestamp_with_time_zone()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(ColumnDef::new(OnboardingAssignments::DueDate).timestamp_with_time_zone())
                    .col(ColumnDef::new(OnboardingAssignments::CompletedAt).timestamp_with_time_zone())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_onboarding_assignments_user_id")
                            .from((Schema::HrPublic, OnboardingAssignments::Table), OnboardingAssignments::UserId)
                            .to((Schema::HrPublic, Alias::new("users")), Alias::new("id"))
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_onboarding_assignments_module_id")
                            .from((Schema::HrPublic, OnboardingAssignments::Table), OnboardingAssignments::OnboardingModuleId)
                            .to((Schema::HrPublic, OnboardingModules::Table), OnboardingModules::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_onboarding_assignments_assigned_by_id")
                            .from((Schema::HrPublic, OnboardingAssignments::Table), OnboardingAssignments::AssignedById)
                            .to((Schema::HrPublic, Alias::new("users")), Alias::new("id"))
                            .on_delete(ForeignKeyAction::SetNull),
                    )
                    .to_owned(),
            )
            .await?;

        // Create onboarding_progress table
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
                    .col(ColumnDef::new(OnboardingProgress::ContentBlockId).uuid().not_null())
                    .col(
                        ColumnDef::new(OnboardingProgress::Status)
                            .string()
                            .not_null()
                            .default("NOT_STARTED"),
                    )
                    .col(ColumnDef::new(OnboardingProgress::StartedAt).timestamp_with_time_zone())
                    .col(ColumnDef::new(OnboardingProgress::CompletedAt).timestamp_with_time_zone())
                    .col(ColumnDef::new(OnboardingProgress::LastAccessedAt).timestamp_with_time_zone())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_onboarding_progress_user_id")
                            .from((Schema::HrPublic, OnboardingProgress::Table), OnboardingProgress::UserId)
                            .to((Schema::HrPublic, Alias::new("users")), Alias::new("id"))
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_onboarding_progress_block_id")
                            .from((Schema::HrPublic, OnboardingProgress::Table), OnboardingProgress::ContentBlockId)
                            .to((Schema::HrPublic, OnboardingContentBlocks::Table), OnboardingContentBlocks::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // Create onboarding_form_submissions table
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
                    .col(ColumnDef::new(OnboardingFormSubmissions::UserId).uuid().not_null())
                    .col(ColumnDef::new(OnboardingFormSubmissions::ContentBlockId).uuid().not_null())
                    .col(ColumnDef::new(OnboardingFormSubmissions::FormTemplateId).uuid())
                    .col(ColumnDef::new(OnboardingFormSubmissions::FormData).json_binary().not_null())
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
                            .from((Schema::HrPublic, OnboardingFormSubmissions::Table), OnboardingFormSubmissions::UserId)
                            .to((Schema::HrPublic, Alias::new("users")), Alias::new("id"))
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_onboarding_form_submissions_block_id")
                            .from((Schema::HrPublic, OnboardingFormSubmissions::Table), OnboardingFormSubmissions::ContentBlockId)
                            .to((Schema::HrPublic, OnboardingContentBlocks::Table), OnboardingContentBlocks::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_onboarding_form_submissions_form_template_id")
                            .from((Schema::HrPublic, OnboardingFormSubmissions::Table), OnboardingFormSubmissions::FormTemplateId)
                            .to((Schema::HrPublic, OnboardingFormTemplates::Table), OnboardingFormTemplates::Id)
                            .on_delete(ForeignKeyAction::SetNull),
                    )
                    .to_owned(),
            )
            .await?;

        // Create onboarding_document_uploads table
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
                    .col(ColumnDef::new(OnboardingDocumentUploads::UserId).uuid().not_null())
                    .col(ColumnDef::new(OnboardingDocumentUploads::ContentBlockId).uuid().not_null())
                    .col(ColumnDef::new(OnboardingDocumentUploads::FileName).string().not_null())
                    .col(ColumnDef::new(OnboardingDocumentUploads::FileSizeBytes).big_integer().not_null())
                    .col(ColumnDef::new(OnboardingDocumentUploads::MimeType).string().not_null())
                    .col(ColumnDef::new(OnboardingDocumentUploads::StoragePath).string().not_null())
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
                            .from((Schema::HrPublic, OnboardingDocumentUploads::Table), OnboardingDocumentUploads::UserId)
                            .to((Schema::HrPublic, Alias::new("users")), Alias::new("id"))
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_onboarding_document_uploads_block_id")
                            .from((Schema::HrPublic, OnboardingDocumentUploads::Table), OnboardingDocumentUploads::ContentBlockId)
                            .to((Schema::HrPublic, OnboardingContentBlocks::Table), OnboardingContentBlocks::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // Create indexes for better query performance
        manager
            .create_index(
                Index::create()
                    .name("idx_onboarding_blocks_module")
                    .table((Schema::HrPublic, OnboardingContentBlocks::Table))
                    .col(OnboardingContentBlocks::OnboardingModuleId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
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
                    .name("idx_onboarding_assignments_user")
                    .table((Schema::HrPublic, OnboardingAssignments::Table))
                    .col(OnboardingAssignments::UserId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_onboarding_assignments_module")
                    .table((Schema::HrPublic, OnboardingAssignments::Table))
                    .col(OnboardingAssignments::OnboardingModuleId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_onboarding_progress_user")
                    .table((Schema::HrPublic, OnboardingProgress::Table))
                    .col(OnboardingProgress::UserId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_onboarding_progress_block")
                    .table((Schema::HrPublic, OnboardingProgress::Table))
                    .col(OnboardingProgress::ContentBlockId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_onboarding_form_submissions_user")
                    .table((Schema::HrPublic, OnboardingFormSubmissions::Table))
                    .col(OnboardingFormSubmissions::UserId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_onboarding_document_uploads_user")
                    .table((Schema::HrPublic, OnboardingDocumentUploads::Table))
                    .col(OnboardingDocumentUploads::UserId)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop tables in reverse order
        manager
            .drop_table(Table::drop().table((Schema::HrPublic, OnboardingDocumentUploads::Table)).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table((Schema::HrPublic, OnboardingFormSubmissions::Table)).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table((Schema::HrPublic, OnboardingProgress::Table)).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table((Schema::HrPublic, OnboardingAssignments::Table)).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table((Schema::HrPublic, OnboardingContentBlocks::Table)).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table((Schema::HrPublic, OnboardingFormTemplates::Table)).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table((Schema::HrPublic, OnboardingModules::Table)).to_owned())
            .await?;

        // Drop enums
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
