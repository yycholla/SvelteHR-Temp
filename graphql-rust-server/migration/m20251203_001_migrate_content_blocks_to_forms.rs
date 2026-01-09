use sea_orm_migration::prelude::*;
use sea_orm::Statement;
use uuid::Uuid as UuidType;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // This migration converts existing onboarding_content_blocks to the new Forms architecture
        // Strategy:
        // 1. Group content blocks by module
        // 2. Create forms with 3-5 blocks each (configurable)
        // 3. Convert content blocks to form blocks
        // 4. Migrate progress from onboarding_progress to onboarding_form_progress

        let db = manager.get_connection();

        // Step 1: Get all modules with content blocks
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

        for module_row in modules_with_blocks {
            let module_id: UuidType = module_row.try_get("", "onboarding_module_id")?;

            // Step 2: Get all content blocks for this module
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

            // Step 3: Group blocks into forms (3-5 blocks per form)
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

                // Get the first block's title for the form title
                let first_block_title: String = form_blocks[0].try_get("", "title")?;
                let form_title = if form_count == 1 {
                    first_block_title
                } else {
                    format!("Part {} - {}", form_index + 1, first_block_title)
                };

                // Create the form
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

                // Step 4: Convert content blocks to form blocks
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

                    // Step 5: Migrate progress for this content block
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
                                (_, "COMPLETED") => true, // Always update to COMPLETED
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

        // Step 6: Add a comment to indicate migration was successful
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
        // Rollback: Delete all migrated data
        // WARNING: This will delete all forms and form progress created during migration
        // Only use this if you need to completely rollback the migration

        let db = manager.get_connection();

        // Delete all form progress
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

        // Delete all form blocks
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

        // Delete all migrated forms
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
