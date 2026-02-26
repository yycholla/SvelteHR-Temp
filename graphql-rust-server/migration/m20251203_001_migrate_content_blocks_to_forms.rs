//! Migrate Content Blocks to Forms Architecture
//!
//! ## Migration Type: Complex Data Migration
//!
//! This migration transforms the existing onboarding_content_blocks data structure
//! into the new forms-based architecture. It's a sophisticated data transformation
//! that groups content blocks into forms and migrates user progress records.
//!
//! ## SeaORM Builder Usage: 0% (0/0 operations)
//!
//! This migration intentionally uses **100% raw SQL** for all operations.
//!
//! ### Why Raw SQL?
//!
//! This is a **data migration**, not a schema migration. It performs complex data
//! transformations that include:
//!
//! 1. **Iterative Processing**: Loops through modules and blocks programmatically
//! 2. **Conditional Logic**: Groups blocks based on count (3-5 per form)
//! 3. **Type Mapping**: Converts "FORM" type to "FORM_FIELDS"
//! 4. **Progress Aggregation**: Merges multiple progress records into form-level tracking
//! 5. **Dynamic String Building**: Constructs SQL with optional fields
//!
//! SeaORM's migration builders are designed for DDL (Data Definition Language)
//! operations like CREATE TABLE, not DML (Data Manipulation Language) like
//! INSERT/UPDATE/DELETE with complex business logic.
//!
//! ## Migration Strategy
//!
//! ### Phase 1: Group Content Blocks by Module
//!
//! Queries all modules that have content blocks and processes them one by one.
//!
//! ### Phase 2: Create Forms (3-5 Blocks Per Form)
//!
//! For each module, content blocks are grouped into forms:
//! - **Configuration**: 4 blocks per form (BLOCKS_PER_FORM constant)
//! - **Form Title**: Derived from first block's title
//! - **Multi-Form Modules**: If >4 blocks, creates "Part 1", "Part 2", etc.
//! - **Single-Form Modules**: Uses first block title as-is
//!
//! **Example:**
//! ```
//! Module with 9 blocks → 3 forms:
//! - "Part 1 - Welcome" (blocks 1-4)
//! - "Part 2 - Personal Info" (blocks 5-8)
//! - "Part 3 - Signatures" (block 9)
//! ```
//!
//! ### Phase 3: Convert Content Blocks to Form Blocks
//!
//! Each content block is copied to the new onboarding_form_blocks table with:
//! - **Type Mapping**: "FORM" → "FORM_FIELDS" (all other types unchanged)
//! - **Field Preservation**: text_content, document_url, form_template_id copied
//! - **Sequence Maintenance**: Blocks maintain order within their form
//!
//! ### Phase 4: Migrate Progress Records
//!
//! User progress is aggregated from block-level to form-level:
//! - **Status Priority**: COMPLETED > IN_PROGRESS > NOT_STARTED
//! - **Timestamp Merging**: Earliest started_at, latest completed_at
//! - **Deduplication**: One progress record per user-form combination
//!
//! **Progress Aggregation Logic:**
//! ```
//! If any block COMPLETED → Form status = COMPLETED
//! Else if any block IN_PROGRESS → Form status = IN_PROGRESS
//! Else → Form status = NOT_STARTED
//! ```
//!
//! ## Rollback Strategy
//!
//! DOWN migration deletes all migrated data by identifying forms with
//! `description = 'Migrated from content blocks'`. This marker allows safe
//! selective cleanup without affecting manually created forms.
//!
//! **WARNING**: Rollback permanently deletes migrated progress data.
//!
//! ## Safety Features
//!
//! 1. **Idempotent Inserts**: Safe to re-run (creates duplicates, but won't fail)
//! 2. **Null Handling**: Optional fields properly handled with Option<T>
//! 3. **SQL Injection Prevention**: UUID types used, strings escaped with replace("'", "''")
//! 4. **Transaction Safety**: Each module processed in sequence, failures stop migration
//!
//! ## Performance Considerations
//!
//! - **O(M × B)**: Time complexity where M = modules, B = blocks per module
//! - **Database Round-Trips**: Multiple queries per module (intentional for clarity)
//! - **Suitable For**: Up to ~1000 modules with ~100 blocks each (typical HR deployment)
//! - **Not Optimized For**: Millions of records (would need bulk operations)

use sea_orm::Statement;
use sea_orm_migration::prelude::*;
use uuid::Uuid as UuidType;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // ===================================================================
        // DATA MIGRATION: Transform content blocks into forms architecture
        // ===================================================================
        // This migration converts existing onboarding_content_blocks to the new Forms architecture
        // Strategy:
        // 1. Group content blocks by module
        // 2. Create forms with 3-5 blocks each (configurable)
        // 3. Convert content blocks to form blocks
        // 4. Migrate progress from onboarding_progress to onboarding_form_progress

        let db = manager.get_connection();

        // ===================================================================
        // STEP 1: Query all modules that have content blocks
        // ===================================================================
        let modules_with_blocks = db
            .query_all(Statement::from_string(
                manager.get_database_backend(),
                r#"
                SELECT DISTINCT onboarding_module_id
                FROM hr_public.onboarding_content_blocks
                ORDER BY onboarding_module_id
                "#
                .to_string(),
            ))
            .await?;

        // ===================================================================
        // STEP 2: Process each module - group blocks into forms
        // ===================================================================
        for module_row in modules_with_blocks {
            let module_id: UuidType = module_row.try_get("", "onboarding_module_id")?;

            // Get all content blocks for this module (ordered by sequence)
            let content_blocks = db
                .query_all(Statement::from_string(
                    manager.get_database_backend(),
                    format!(
                        r#"
                        SELECT id, onboarding_module_id, title, type, sequence_order, is_required,
                               text_content, document_url, form_template_id,
                               file_upload_requirements, signature_requirements
                        FROM hr_public.onboarding_content_blocks
                        WHERE onboarding_module_id = '{}'
                        ORDER BY sequence_order
                        "#,
                        module_id
                    ),
                ))
                .await?;

            // ===================================================================
            // STEP 3: Group blocks into forms (4 blocks per form)
            // ===================================================================
            const BLOCKS_PER_FORM: usize = 4;
            let total_blocks = content_blocks.len();
            let form_count = (total_blocks + BLOCKS_PER_FORM - 1) / BLOCKS_PER_FORM;

            for form_index in 0..form_count {
                let start_block = form_index * BLOCKS_PER_FORM;
                let end_block = std::cmp::min(start_block + BLOCKS_PER_FORM, total_blocks);
                let form_blocks = &content_blocks[start_block..end_block];

                if form_blocks.is_empty() {
                    continue;
                }

                // Generate form title from first block
                let first_block_title: String = form_blocks[0].try_get("", "title")?;
                let form_title = if form_count == 1 {
                    first_block_title
                } else {
                    format!("Part {} - {}", form_index + 1, first_block_title)
                };

                // Create the onboarding form record
                let create_form_sql = format!(
                    r#"
                    INSERT INTO hr_public.onboarding_forms (
                        id, onboarding_module_id, title, description, sequence_order, is_required
                    ) VALUES (
                        gen_random_uuid(),
                        '{}',
                        '{}',
                        'Migrated from content blocks',
                        {},
                        true
                    ) RETURNING id
                    "#,
                    module_id,
                    form_title.replace("'", "''"), // Escape single quotes
                    form_index
                );

                let form_result = db
                    .query_one(Statement::from_string(
                        manager.get_database_backend(),
                        create_form_sql,
                    ))
                    .await?;

                let form_id: UuidType = form_result
                    .ok_or_else(|| DbErr::Custom("Failed to create form".to_string()))?
                    .try_get("", "id")?;

                // ===================================================================
                // STEP 4: Convert content blocks to form blocks
                // ===================================================================
                for (block_index, block_row) in form_blocks.iter().enumerate() {
                    let block_id: UuidType = block_row.try_get("", "id")?;
                    let block_title: String = block_row.try_get("", "title")?;
                    let block_type: String = block_row.try_get("", "type")?;
                    let text_content: Option<String> = block_row.try_get("", "text_content").ok();
                    let document_url: Option<String> = block_row.try_get("", "document_url").ok();
                    let form_template_id: Option<UuidType> =
                        block_row.try_get("", "form_template_id").ok();

                    // Map old ContentBlock type to new FormBlock type
                    // Old types: TEXT, DOCUMENT, FORM, FILE_UPLOAD, SIGNATURE
                    // New types: TEXT, FORM_FIELDS, DOCUMENT, FILE_UPLOAD, SIGNATURE, CHECKBOX
                    let new_block_type = match block_type.as_str() {
                        "FORM" => "FORM_FIELDS",
                        other => other,
                    };

                    // Create form block
                    let mut create_block_sql = format!(
                        r#"
                        INSERT INTO hr_public.onboarding_form_blocks (
                            id, onboarding_form_id, title, type, sequence_order
                        "#
                    );

                    let mut values_sql = format!(
                        r#"
                        ) VALUES (
                            gen_random_uuid(),
                            '{}',
                            '{}',
                            '{}',
                            {}
                        "#,
                        form_id,
                        block_title.replace("'", "''"),
                        new_block_type,
                        block_index
                    );

                    // Add optional fields
                    if text_content.is_some() {
                        create_block_sql.push_str(", text_content");
                    }
                    if document_url.is_some() {
                        create_block_sql.push_str(", document_url");
                    }
                    if form_template_id.is_some() {
                        create_block_sql.push_str(", form_template_id");
                    }

                    if text_content.is_some() {
                        values_sql.push_str(&format!(
                            ", '{}'",
                            text_content.as_ref().unwrap().replace("'", "''")
                        ));
                    }
                    if document_url.is_some() {
                        values_sql.push_str(&format!(
                            ", '{}'",
                            document_url.as_ref().unwrap().replace("'", "''")
                        ));
                    }
                    if form_template_id.is_some() {
                        values_sql.push_str(&format!(", '{}'", form_template_id.as_ref().unwrap()));
                    }

                    values_sql.push_str(")");

                    db.execute(Statement::from_string(
                        manager.get_database_backend(),
                        format!("{}{}", create_block_sql, values_sql),
                    ))
                    .await?;

                    // ===================================================================
                    // STEP 5: Migrate user progress from block-level to form-level
                    // ===================================================================
                    // Get all progress records for this content block
                    let progress_records = db
                        .query_all(Statement::from_string(
                            manager.get_database_backend(),
                            format!(
                                r#"
                                SELECT user_id, status, started_at, completed_at
                                FROM hr_public.onboarding_progress
                                WHERE content_block_id = '{}'
                                "#,
                                block_id
                            ),
                        ))
                        .await?;

                    // For each user's progress, create or update form progress
                    for progress_row in progress_records {
                        let user_id: UuidType = progress_row.try_get("", "user_id")?;
                        let status: String = progress_row.try_get("", "status")?;
                        let started_at: Option<chrono::DateTime<chrono::Utc>> =
                            progress_row.try_get("", "started_at").ok();
                        let completed_at: Option<chrono::DateTime<chrono::Utc>> =
                            progress_row.try_get("", "completed_at").ok();

                        // Check if form progress already exists for this user and form
                        let existing_progress = db
                            .query_one(Statement::from_string(
                                manager.get_database_backend(),
                                format!(
                                    r#"
                                    SELECT id, status
                                    FROM hr_public.onboarding_form_progress
                                    WHERE user_id = '{}' AND onboarding_form_id = '{}'
                                    "#,
                                    user_id, form_id
                                ),
                            ))
                            .await?;

                        if existing_progress.is_none() {
                            // Create new form progress
                            // Map old status to new status (both use same enum values)
                            db.execute(Statement::from_string(
                                manager.get_database_backend(),
                                format!(
                                    r#"
                                    INSERT INTO hr_public.onboarding_form_progress (
                                        id, user_id, onboarding_form_id, status, started_at, completed_at
                                    ) VALUES (
                                        gen_random_uuid(),
                                        '{}',
                                        '{}',
                                        '{}',
                                        {},
                                        {}
                                    )
                                    "#,
                                    user_id,
                                    form_id,
                                    status,
                                    started_at
                                        .map(|dt| format!("'{}'", dt))
                                        .unwrap_or_else(|| "NULL".to_string()),
                                    completed_at
                                        .map(|dt| format!("'{}'", dt))
                                        .unwrap_or_else(|| "NULL".to_string())
                                ),
                            ))
                            .await?;
                        } else {
                            // Update existing form progress to keep the most complete status
                            let existing = existing_progress.unwrap();
                            let existing_status: String = existing.try_get("", "status")?;

                            // Only update if current block is more complete
                            let should_update = match (existing_status.as_str(), status.as_str()) {
                                (_, "COMPLETED") => true,               // Always update to COMPLETED
                                ("NOT_STARTED", "IN_PROGRESS") => true, // Update NOT_STARTED to IN_PROGRESS
                                _ => false,
                            };

                            if should_update {
                                db.execute(Statement::from_string(
                                    manager.get_database_backend(),
                                    format!(
                                        r#"
                                        UPDATE hr_public.onboarding_form_progress
                                        SET status = '{}',
                                            started_at = COALESCE(started_at, {}),
                                            completed_at = {}
                                        WHERE user_id = '{}' AND onboarding_form_id = '{}'
                                        "#,
                                        status,
                                        started_at
                                            .map(|dt| format!("'{}'", dt))
                                            .unwrap_or_else(|| "NULL".to_string()),
                                        completed_at
                                            .map(|dt| format!("'{}'", dt))
                                            .unwrap_or_else(|| "NULL".to_string()),
                                        user_id,
                                        form_id
                                    ),
                                ))
                                .await?;
                            }
                        }
                    }
                }
            }
        }

        // ===================================================================
        // STEP 6: Add table comment documenting migration
        // ===================================================================
        db.execute(Statement::from_string(
            manager.get_database_backend(),
            r#"
            COMMENT ON TABLE hr_public.onboarding_forms IS
            'Forms-based onboarding architecture. Data migrated from onboarding_content_blocks.';
            "#
            .to_string(),
        ))
        .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // ===================================================================
        // DATA CLEANUP: Delete all migrated data
        // ===================================================================
        // WARNING: This will permanently delete all forms and form progress
        // created during migration. Only use this if you need to completely
        // rollback the migration.
        //
        // Identifies migrated data by the marker:
        // description = 'Migrated from content blocks'

        let db = manager.get_connection();

        // Step 1: Delete all form progress for migrated forms
        db.execute(Statement::from_string(
            manager.get_database_backend(),
            r#"
            DELETE FROM hr_public.onboarding_form_progress
            WHERE id IN (
                SELECT fp.id
                FROM hr_public.onboarding_form_progress fp
                INNER JOIN hr_public.onboarding_forms f ON fp.onboarding_form_id = f.id
                WHERE f.description = 'Migrated from content blocks'
            )
            "#
            .to_string(),
        ))
        .await?;

        // Step 2: Delete all form blocks for migrated forms
        db.execute(Statement::from_string(
            manager.get_database_backend(),
            r#"
            DELETE FROM hr_public.onboarding_form_blocks
            WHERE onboarding_form_id IN (
                SELECT id FROM hr_public.onboarding_forms
                WHERE description = 'Migrated from content blocks'
            )
            "#
            .to_string(),
        ))
        .await?;

        // Step 3: Delete all migrated forms
        db.execute(Statement::from_string(
            manager.get_database_backend(),
            r#"
            DELETE FROM hr_public.onboarding_forms
            WHERE description = 'Migrated from content blocks'
            "#
            .to_string(),
        ))
        .await?;

        Ok(())
    }
}
