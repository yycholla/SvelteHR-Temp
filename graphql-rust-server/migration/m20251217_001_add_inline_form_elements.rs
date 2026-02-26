//! Add Inline Form Elements to Onboarding Tables
//!
//! ## Migration Type: Schema Modification
//!
//! This migration adds a JSONB column for inline form elements to both
//! onboarding_content_blocks and onboarding_form_blocks tables. This enables
//! embedding simple form fields directly within text/document blocks without
//! requiring separate form block creation.
//!
//! ## SeaORM Builder Usage: 100% (2/2 operations)
//!
//! All operations use idempotent SeaORM builders with helper functions.
//!
//! ### Operations Breakdown:
//!
//! **UP Migration (2 operations):**
//! 1. ALTER TABLE onboarding_content_blocks ADD COLUMN → SeaORM builder ✓ (with IF NOT EXISTS)
//! 2. ALTER TABLE onboarding_form_blocks ADD COLUMN → SeaORM builder ✓ (with IF NOT EXISTS)
//!
//! **DOWN Migration (2 operations):**
//! 1. ALTER TABLE onboarding_form_blocks DROP COLUMN → Helper function ✓ (with IF EXISTS)
//! 2. ALTER TABLE onboarding_content_blocks DROP COLUMN → Helper function ✓ (with IF EXISTS)
//!
//! ## Use Case: Inline Form Elements
//!
//! ### Problem Statement
//!
//! Previously, collecting user input required creating separate FORM_FIELDS blocks
//! that link to form templates. This was heavyweight for simple inputs like:
//! - Single checkbox: "I agree to terms and conditions"
//! - Quick date picker: "When is your first day?"
//! - Short text input: "What's your preferred name?"
//!
//! ### Solution
//!
//! The `inline_form_elements` JSONB column allows embedding lightweight form
//! elements directly within TEXT or DOCUMENT blocks:
//!
//! ```json
//! {
//!   "inline_form_elements": [
//!     {
//!       "id": "agree_terms",
//!       "type": "checkbox",
//!       "label": "I agree to the terms and conditions",
//!       "required": true
//!     },
//!     {
//!       "id": "start_date",
//!       "type": "date",
//!       "label": "First Day",
//!       "required": true
//!     }
//!   ]
//! }
//! ```
//!
//! ### Benefits
//!
//! 1. **Simpler Content Authoring**: No need for separate form blocks
//! 2. **Better UX**: Forms appear contextually within content
//! 3. **Flexibility**: Mix text and simple inputs seamlessly
//! 4. **Backward Compatible**: Nullable column, existing blocks unaffected
//!
//! ## Column Properties
//!
//! - **Name**: `inline_form_elements`
//! - **Type**: `JSONB` (efficient binary JSON storage with indexing support)
//! - **Nullable**: `true` (most blocks won't have inline elements)
//! - **Default**: `NULL`
//!
//! ## Expected JSON Structure
//!
//! ```typescript
//! interface InlineFormElement {
//!   id: string;              // Unique identifier for the field
//!   type: 'text' | 'checkbox' | 'date' | 'select' | 'number';
//!   label: string;           // Display label
//!   required?: boolean;      // Whether field is required
//!   placeholder?: string;    // Placeholder text (for text inputs)
//!   options?: string[];      // Options (for select inputs)
//!   validation?: {
//!     min?: number;
//!     max?: number;
//!     pattern?: string;
//!   };
//! }
//! ```
//!
//! ## Migration Strategy
//!
//! 1. **Idempotent Column Addition**: Uses `add_column_if_not_exists()` to safely
//!    add columns without failing on re-runs.
//!
//! 2. **Idempotent Column Removal**: Uses `MigrationHelpers::drop_column_if_exists()`
//!    since SeaORM's builder doesn't support IF EXISTS on drop_column.
//!
//! 3. **Reverse Order Removal**: DOWN migration drops from onboarding_form_blocks
//!    first (newer table), then onboarding_content_blocks (legacy table).
//!
//! ## Rollback Safety
//!
//! - Dropping nullable columns is safe - no data loss risk
//! - IF EXISTS prevents errors if column already dropped
//! - Safe to run multiple times

use sea_orm_migration::prelude::*;

use crate::migration::MigrationHelpers;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // ===================================================================
        // SCHEMA OPERATION 1: Add inline_form_elements to content_blocks
        // ===================================================================
        // Adds nullable JSONB column for embedding simple form fields.
        // Uses add_column_if_not_exists() for idempotency.
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, OnboardingContentBlocks::Table))
                    .add_column_if_not_exists(
                        ColumnDef::new(OnboardingContentBlocks::InlineFormElements).json_binary(),
                    )
                    .to_owned(),
            )
            .await?;

        // ===================================================================
        // SCHEMA OPERATION 2: Add inline_form_elements to form_blocks
        // ===================================================================
        // Mirrors the column addition for the newer forms architecture.
        // Uses add_column_if_not_exists() for idempotency.
        manager
            .alter_table(
                Table::alter()
                    .table((Schema::HrPublic, OnboardingFormBlocks::Table))
                    .add_column_if_not_exists(
                        ColumnDef::new(OnboardingFormBlocks::InlineFormElements).json_binary(),
                    )
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // ===================================================================
        // SCHEMA OPERATION 1: Drop column from form_blocks (reverse order)
        // ===================================================================
        // Remove inline_form_elements from newer forms table first.
        // Uses helper function for IF EXISTS support (not in SeaORM's drop_column API).
        MigrationHelpers::drop_column_if_exists(
            manager,
            "hr_public.onboarding_form_blocks",
            "inline_form_elements",
        )
        .await?;

        // ===================================================================
        // SCHEMA OPERATION 2: Drop column from content_blocks
        // ===================================================================
        // Remove inline_form_elements from legacy content blocks table.
        // Safe to drop - nullable column with no data loss risk.
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
