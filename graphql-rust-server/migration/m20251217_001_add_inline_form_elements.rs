use sea_orm_migration::prelude::*;

use crate::migration::MigrationHelpers;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Add inline_form_elements JSONB column to onboarding_content_blocks
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, OnboardingContentBlocks::Table))
                    .add_column_if_not_exists(
                        ColumnDef::new(OnboardingContentBlocks::InlineFormElements)
                            .json_binary()
                    )
                    .to_owned(),
            )
            .await?;

        // Add inline_form_elements JSONB column to onboarding_form_blocks
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, OnboardingFormBlocks::Table))
                    .add_column_if_not_exists(
                        ColumnDef::new(OnboardingFormBlocks::InlineFormElements)
                            .json_binary()
                    )
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop inline_form_elements from onboarding_form_blocks (reverse order)
        // Using helper for IF EXISTS support (not available in SeaORM's drop_column)
        MigrationHelpers::drop_column_if_exists(
            manager,
            "hr_public.onboarding_form_blocks",
            "inline_form_elements",
        )
        .await?;

        // Drop inline_form_elements from onboarding_content_blocks
        MigrationHelpers::drop_column_if_exists(
            manager,
            "hr_public.onboarding_content_blocks",
            "inline_form_elements",
        )
        .await?;

        Ok(())
    }
}

/// Schema identifier for hr_public
#[derive(DeriveIden)]
enum Schema {
    #[sea_orm(iden = "hr_public")]
    HrPublic,
}

/// Table and column identifiers for onboarding_content_blocks
#[derive(DeriveIden)]
enum OnboardingContentBlocks {
    Table,
    InlineFormElements,
}

/// Table and column identifiers for onboarding_form_blocks
#[derive(DeriveIden)]
enum OnboardingFormBlocks {
    Table,
    InlineFormElements,
}
