use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create onboarding form block type enum
        manager
            .get_connection()
            .execute_unprepared(
                "CREATE TYPE hr_public.onboarding_form_block_type AS ENUM ('TEXT', 'FORM_FIELDS', 'DOCUMENT', 'FILE_UPLOAD', 'SIGNATURE', 'CHECKBOX')"
            )
            .await?;

        // Create onboarding form progress status enum
        manager
            .get_connection()
            .execute_unprepared(
                "CREATE TYPE hr_public.onboarding_form_progress_status AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED')"
            )
            .await?;

        // Create onboarding_forms table
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
                    .col(ColumnDef::new(OnboardingForms::OnboardingModuleId).uuid().not_null())
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
                            .from((Schema::HrPublic, OnboardingForms::Table), OnboardingForms::OnboardingModuleId)
                            .to((Schema::HrPublic, Alias::new("onboarding_modules")), Alias::new("id"))
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // Create onboarding_form_blocks table
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
                    .col(ColumnDef::new(OnboardingFormBlocks::OnboardingFormId).uuid().not_null())
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
                            .from((Schema::HrPublic, OnboardingFormBlocks::Table), OnboardingFormBlocks::OnboardingFormId)
                            .to((Schema::HrPublic, OnboardingForms::Table), OnboardingForms::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_form_blocks_template_id")
                            .from((Schema::HrPublic, OnboardingFormBlocks::Table), OnboardingFormBlocks::FormTemplateId)
                            .to((Schema::HrPublic, Alias::new("onboarding_form_templates")), Alias::new("id"))
                            .on_delete(ForeignKeyAction::SetNull),
                    )
                    .to_owned(),
            )
            .await?;

        // Create onboarding_form_progress table
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
                    .col(ColumnDef::new(OnboardingFormProgress::UserId).uuid().not_null())
                    .col(ColumnDef::new(OnboardingFormProgress::OnboardingFormId).uuid().not_null())
                    .col(
                        ColumnDef::new(OnboardingFormProgress::Status)
                            .string()
                            .not_null()
                            .default("NOT_STARTED"),
                    )
                    .col(ColumnDef::new(OnboardingFormProgress::FormData).json_binary())
                    .col(ColumnDef::new(OnboardingFormProgress::StartedAt).timestamp_with_time_zone())
                    .col(ColumnDef::new(OnboardingFormProgress::CompletedAt).timestamp_with_time_zone())
                    .col(ColumnDef::new(OnboardingFormProgress::LastAccessedAt).timestamp_with_time_zone())
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
                            .from((Schema::HrPublic, OnboardingFormProgress::Table), OnboardingFormProgress::UserId)
                            .to((Schema::HrPublic, Alias::new("users")), Alias::new("id"))
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_form_progress_form_id")
                            .from((Schema::HrPublic, OnboardingFormProgress::Table), OnboardingFormProgress::OnboardingFormId)
                            .to((Schema::HrPublic, OnboardingForms::Table), OnboardingForms::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // Create indexes for better query performance
        manager
            .create_index(
                Index::create()
                    .name("idx_onboarding_forms_module_id")
                    .table((Schema::HrPublic, OnboardingForms::Table))
                    .col(OnboardingForms::OnboardingModuleId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_onboarding_forms_sequence")
                    .table((Schema::HrPublic, OnboardingForms::Table))
                    .col(OnboardingForms::OnboardingModuleId)
                    .col(OnboardingForms::SequenceOrder)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_form_blocks_form_id")
                    .table((Schema::HrPublic, OnboardingFormBlocks::Table))
                    .col(OnboardingFormBlocks::OnboardingFormId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_form_blocks_sequence")
                    .table((Schema::HrPublic, OnboardingFormBlocks::Table))
                    .col(OnboardingFormBlocks::OnboardingFormId)
                    .col(OnboardingFormBlocks::SequenceOrder)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_form_blocks_template")
                    .table((Schema::HrPublic, OnboardingFormBlocks::Table))
                    .col(OnboardingFormBlocks::FormTemplateId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_form_progress_user")
                    .table((Schema::HrPublic, OnboardingFormProgress::Table))
                    .col(OnboardingFormProgress::UserId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_form_progress_form")
                    .table((Schema::HrPublic, OnboardingFormProgress::Table))
                    .col(OnboardingFormProgress::OnboardingFormId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_form_progress_status")
                    .table((Schema::HrPublic, OnboardingFormProgress::Table))
                    .col(OnboardingFormProgress::Status)
                    .to_owned(),
            )
            .await?;

        // Create unique constraint for user-form combination
        manager
            .create_index(
                Index::create()
                    .name("idx_form_progress_unique_user_form")
                    .table((Schema::HrPublic, OnboardingFormProgress::Table))
                    .col(OnboardingFormProgress::UserId)
                    .col(OnboardingFormProgress::OnboardingFormId)
                    .unique()
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop tables in reverse order
        manager
            .drop_table(Table::drop().table((Schema::HrPublic, OnboardingFormProgress::Table)).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table((Schema::HrPublic, OnboardingFormBlocks::Table)).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table((Schema::HrPublic, OnboardingForms::Table)).to_owned())
            .await?;

        // Drop enums
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
