use async_graphql::{Context, Object, Result};
use chrono::Utc;
use sea_orm::{ActiveModelTrait, EntityTrait, Set, QueryFilter, ColumnTrait};
use uuid::Uuid;

use crate::{
    database::get_db_from_context,
    error::AppError,
    models::{
        CreateOnboardingModuleInput, UpdateOnboardingModuleInput, OnboardingModule,
        CreateFormTemplateInput, UpdateFormTemplateInput, FormTemplate,
        CreateContentBlockInput, UpdateContentBlockInput, ContentBlockGraphQL,
        CreateOnboardingFormInput, UpdateOnboardingFormInput, OnboardingFormGraphQL,
        CreateFormBlockInput, UpdateFormBlockInput, FormBlockGraphQL,
        SaveFormProgressInput, CompleteFormInput, FormProgressGraphQL, OnboardingFormProgressStatus,
        CreateOnboardingAssignmentInput, UpdateOnboardingAssignmentInput, Assignment,
        UpdateOnboardingProgressInput, ProgressGraphQL, OnboardingProgressStatus,
        CreateFormSubmissionInput, FormSubmission,
        CreateDocumentUploadInput, UpdateDocumentUploadInput, DocumentUpload,
    },
    auth::UserContext,
};

pub struct OnboardingMutations;

#[Object]
impl OnboardingMutations {
    // =========================================================================
    // Onboarding Module Mutations
    // =========================================================================

    async fn create_onboarding_module(&self, ctx: &Context<'_>, input: CreateOnboardingModuleInput) -> Result<OnboardingModule> {
        let db = get_db_from_context(ctx)?;
        let user_context = ctx.data::<UserContext>()?;
        // TODO: Add RBAC check (e.g. admin or HR manager)

        let module = crate::models::onboarding::onboarding_module::ActiveModel {
            id: Set(Uuid::new_v4()),
            title: Set(input.title),
            description: Set(input.description),
            is_active: Set(input.is_active.unwrap_or(true)),
            category: Set(input.category),
            tags: Set(input.tags),
            author_id: Set(Some(user_context.user_id)),
            created_at: Set(Utc::now()),
            updated_at: Set(Utc::now()),
        };

        let res = module.insert(&db).await?;
        Ok(res)
    }

    async fn update_onboarding_module(&self, ctx: &Context<'_>, id: Uuid, input: UpdateOnboardingModuleInput) -> Result<OnboardingModule> {
        let db = get_db_from_context(ctx)?;
        // TODO: Add RBAC check

        let module = crate::models::onboarding::onboarding_module::Entity::find_by_id(id).one(&db).await?
            .ok_or_else(|| AppError::NotFound("Onboarding module not found".to_string()))?;

        let mut module: crate::models::onboarding::onboarding_module::ActiveModel = module.into();

        if let Some(title) = input.title {
            module.title = Set(title);
        }
        if let Some(description) = input.description {
            module.description = Set(Some(description));
        }
        if let Some(is_active) = input.is_active {
            module.is_active = Set(is_active);
        }
        if let Some(category) = input.category {
            module.category = Set(Some(category));
        }
        if let Some(tags) = input.tags {
            module.tags = Set(Some(tags));
        }
        module.updated_at = Set(Utc::now());

        let res = module.update(&db).await?;
        Ok(res)
    }

    async fn delete_onboarding_module(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;
        // TODO: Add RBAC check

        let res = crate::models::onboarding::onboarding_module::Entity::delete_by_id(id).exec(&db).await?;
        Ok(res.rows_affected > 0)
    }

    // =========================================================================
    // Form Template Mutations
    // =========================================================================

    async fn create_form_template(&self, ctx: &Context<'_>, input: CreateFormTemplateInput) -> Result<FormTemplate> {
        let db = get_db_from_context(ctx)?;
        // TODO: Add RBAC check

        let template = crate::models::onboarding::form_template::ActiveModel {
            id: Set(Uuid::new_v4()),
            name: Set(input.name),
            description: Set(input.description),
            category: Set(input.category),
            version: Set(input.version),
            is_active: Set(true),
            fields: Set(input.fields),
            created_at: Set(Utc::now()),
            updated_at: Set(Utc::now()),
        };

        let res = template.insert(&db).await?;
        Ok(res)
    }

    async fn update_form_template(&self, ctx: &Context<'_>, id: Uuid, input: UpdateFormTemplateInput) -> Result<FormTemplate> {
        let db = get_db_from_context(ctx)?;

        let template = crate::models::onboarding::form_template::Entity::find_by_id(id).one(&db).await?
            .ok_or_else(|| AppError::NotFound("Form template not found".to_string()))?;

        let mut template: crate::models::onboarding::form_template::ActiveModel = template.into();

        if let Some(name) = input.name {
            template.name = Set(name);
        }
        if let Some(description) = input.description {
            template.description = Set(Some(description));
        }
        if let Some(category) = input.category {
            template.category = Set(Some(category));
        }
        if let Some(version) = input.version {
            template.version = Set(Some(version));
        }
        if let Some(is_active) = input.is_active {
            template.is_active = Set(is_active);
        }
        if let Some(fields) = input.fields {
            template.fields = Set(fields);
        }
        template.updated_at = Set(Utc::now());

        let res = template.update(&db).await?;
        Ok(res)
    }

    async fn delete_form_template(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;

        let res = crate::models::onboarding::form_template::Entity::delete_by_id(id).exec(&db).await?;
        Ok(res.rows_affected > 0)
    }

    // =========================================================================
    // Content Block Mutations
    // =========================================================================

    async fn create_content_block(&self, ctx: &Context<'_>, input: CreateContentBlockInput) -> Result<ContentBlockGraphQL> {
        let db = get_db_from_context(ctx)?;
        // TODO: Add RBAC check

        let content_type_str: String = input.content_type.into();

        let block = crate::models::onboarding::content_block::ActiveModel {
            id: Set(Uuid::new_v4()),
            onboarding_module_id: Set(input.onboarding_module_id),
            title: Set(input.title),
            content_type: Set(content_type_str),
            sequence_order: Set(input.sequence_order),
            is_required: Set(input.is_required),
            text_content: Set(input.text_content),
            document_url: Set(input.document_url),
            form_template_id: Set(input.form_template_id),
            inline_form_elements: Set(input.inline_form_elements),
            file_upload_requirements: Set(input.file_upload_requirements),
            signature_requirements: Set(input.signature_requirements),
            created_at: Set(Utc::now()),
            updated_at: Set(Utc::now()),
        };

        let res = block.insert(&db).await?;
        Ok(ContentBlockGraphQL::from(res))
    }

    async fn update_content_block(&self, ctx: &Context<'_>, id: Uuid, input: UpdateContentBlockInput) -> Result<ContentBlockGraphQL> {
        let db = get_db_from_context(ctx)?;

        let block = crate::models::onboarding::content_block::Entity::find_by_id(id).one(&db).await?
            .ok_or_else(|| AppError::NotFound("Content block not found".to_string()))?;

        let mut block: crate::models::onboarding::content_block::ActiveModel = block.into();

        if let Some(title) = input.title {
            block.title = Set(title);
        }
        if let Some(sequence_order) = input.sequence_order {
            block.sequence_order = Set(sequence_order);
        }
        if let Some(is_required) = input.is_required {
            block.is_required = Set(is_required);
        }
        if let Some(text_content) = input.text_content {
            block.text_content = Set(Some(text_content));
        }
        if let Some(document_url) = input.document_url {
            block.document_url = Set(Some(document_url));
        }
        if let Some(form_template_id) = input.form_template_id {
            block.form_template_id = Set(Some(form_template_id));
        }
        if let Some(inline_form_elements) = input.inline_form_elements {
            block.inline_form_elements = Set(Some(inline_form_elements));
        }
        if let Some(file_upload_requirements) = input.file_upload_requirements {
            block.file_upload_requirements = Set(Some(file_upload_requirements));
        }
        if let Some(signature_requirements) = input.signature_requirements {
            block.signature_requirements = Set(Some(signature_requirements));
        }
        block.updated_at = Set(Utc::now());

        let res = block.update(&db).await?;
        Ok(ContentBlockGraphQL::from(res))
    }

    async fn delete_content_block(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;

        let res = crate::models::onboarding::content_block::Entity::delete_by_id(id).exec(&db).await?;
        Ok(res.rows_affected > 0)
    }

    // =========================================================================
    // Onboarding Form Mutations (New Forms Architecture)
    // =========================================================================

    async fn create_onboarding_form(&self, ctx: &Context<'_>, input: CreateOnboardingFormInput) -> Result<OnboardingFormGraphQL> {
        let db = get_db_from_context(ctx)?;
        // TODO: Add RBAC check (admin or HR manager)

        let form = crate::models::onboarding::form::ActiveModel {
            id: Set(Uuid::new_v4()),
            onboarding_module_id: Set(input.onboarding_module_id),
            title: Set(input.title),
            description: Set(input.description),
            sequence_order: Set(input.sequence_order),
            is_required: Set(input.is_required),
            created_at: Set(Utc::now()),
            updated_at: Set(Utc::now()),
        };

        let res = form.insert(&db).await?;
        Ok(OnboardingFormGraphQL::from(res))
    }

    async fn update_onboarding_form(&self, ctx: &Context<'_>, id: Uuid, input: UpdateOnboardingFormInput) -> Result<OnboardingFormGraphQL> {
        let db = get_db_from_context(ctx)?;
        // TODO: Add RBAC check

        let form = crate::models::onboarding::form::Entity::find_by_id(id).one(&db).await?
            .ok_or_else(|| AppError::NotFound("Onboarding form not found".to_string()))?;

        let mut form: crate::models::onboarding::form::ActiveModel = form.into();

        if let Some(title) = input.title {
            form.title = Set(title);
        }
        if let Some(description) = input.description {
            form.description = Set(Some(description));
        }
        if let Some(sequence_order) = input.sequence_order {
            form.sequence_order = Set(sequence_order);
        }
        if let Some(is_required) = input.is_required {
            form.is_required = Set(is_required);
        }
        form.updated_at = Set(Utc::now());

        let res = form.update(&db).await?;
        Ok(OnboardingFormGraphQL::from(res))
    }

    async fn delete_onboarding_form(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;
        // TODO: Add RBAC check

        let res = crate::models::onboarding::form::Entity::delete_by_id(id).exec(&db).await?;
        Ok(res.rows_affected > 0)
    }

    /// Reorder forms within a module
    async fn reorder_onboarding_forms(&self, ctx: &Context<'_>, _onboarding_module_id: Uuid, form_ids: Vec<Uuid>) -> Result<bool> {
        let db = get_db_from_context(ctx)?;
        // TODO: Add RBAC check

        for (index, form_id) in form_ids.iter().enumerate() {
            let form = crate::models::onboarding::form::Entity::find_by_id(*form_id).one(&db).await?
                .ok_or_else(|| AppError::NotFound(format!("Form {} not found", form_id)))?;

            let mut form: crate::models::onboarding::form::ActiveModel = form.into();
            form.sequence_order = Set(index as i32);
            form.updated_at = Set(Utc::now());
            form.update(&db).await?;
        }

        Ok(true)
    }

    // =========================================================================
    // Form Block Mutations
    // =========================================================================

    async fn create_form_block(&self, ctx: &Context<'_>, input: CreateFormBlockInput) -> Result<FormBlockGraphQL> {
        let db = get_db_from_context(ctx)?;
        // TODO: Add RBAC check

        let block_type_str: String = input.block_type.into();

        let block = crate::models::onboarding::form_block::ActiveModel {
            id: Set(Uuid::new_v4()),
            onboarding_form_id: Set(input.onboarding_form_id),
            title: Set(input.title),
            block_type: Set(block_type_str),
            sequence_order: Set(input.sequence_order),
            text_content: Set(input.text_content),
            document_url: Set(input.document_url),
            form_template_id: Set(input.form_template_id),
            inline_form_elements: Set(input.inline_form_elements),
            file_upload_requirements: Set(input.file_upload_requirements),
            signature_requirements: Set(input.signature_requirements),
            checkbox_items: Set(input.checkbox_items),
            created_at: Set(Utc::now()),
            updated_at: Set(Utc::now()),
        };

        let res = block.insert(&db).await?;
        Ok(FormBlockGraphQL::from(res))
    }

    async fn update_form_block(&self, ctx: &Context<'_>, id: Uuid, input: UpdateFormBlockInput) -> Result<FormBlockGraphQL> {
        let db = get_db_from_context(ctx)?;
        // TODO: Add RBAC check

        let block = crate::models::onboarding::form_block::Entity::find_by_id(id).one(&db).await?
            .ok_or_else(|| AppError::NotFound("Form block not found".to_string()))?;

        let mut block: crate::models::onboarding::form_block::ActiveModel = block.into();

        if let Some(title) = input.title {
            block.title = Set(Some(title));
        }
        if let Some(sequence_order) = input.sequence_order {
            block.sequence_order = Set(sequence_order);
        }
        if let Some(text_content) = input.text_content {
            block.text_content = Set(Some(text_content));
        }
        if let Some(document_url) = input.document_url {
            block.document_url = Set(Some(document_url));
        }
        if let Some(form_template_id) = input.form_template_id {
            block.form_template_id = Set(Some(form_template_id));
        }
        if let Some(inline_form_elements) = input.inline_form_elements {
            block.inline_form_elements = Set(Some(inline_form_elements));
        }
        if let Some(file_upload_requirements) = input.file_upload_requirements {
            block.file_upload_requirements = Set(Some(file_upload_requirements));
        }
        if let Some(signature_requirements) = input.signature_requirements {
            block.signature_requirements = Set(Some(signature_requirements));
        }
        if let Some(checkbox_items) = input.checkbox_items {
            block.checkbox_items = Set(Some(checkbox_items));
        }
        block.updated_at = Set(Utc::now());

        let res = block.update(&db).await?;
        Ok(FormBlockGraphQL::from(res))
    }

    async fn delete_form_block(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;
        // TODO: Add RBAC check

        let res = crate::models::onboarding::form_block::Entity::delete_by_id(id).exec(&db).await?;
        Ok(res.rows_affected > 0)
    }

    /// Reorder blocks within a form
    async fn reorder_form_blocks(&self, ctx: &Context<'_>, _onboarding_form_id: Uuid, block_ids: Vec<Uuid>) -> Result<bool> {
        let db = get_db_from_context(ctx)?;
        // TODO: Add RBAC check

        for (index, block_id) in block_ids.iter().enumerate() {
            let block = crate::models::onboarding::form_block::Entity::find_by_id(*block_id).one(&db).await?
                .ok_or_else(|| AppError::NotFound(format!("Form block {} not found", block_id)))?;

            let mut block: crate::models::onboarding::form_block::ActiveModel = block.into();
            block.sequence_order = Set(index as i32);
            block.updated_at = Set(Utc::now());
            block.update(&db).await?;
        }

        Ok(true)
    }

    // =========================================================================
    // Form Progress Mutations
    // =========================================================================

    async fn save_form_progress(&self, ctx: &Context<'_>, input: SaveFormProgressInput) -> Result<FormProgressGraphQL> {
        let db = get_db_from_context(ctx)?;
        let user_context = ctx.data::<UserContext>()?; // Require auth

        let status_str: String = input.status.into();

        // Check if progress record exists
        let existing = crate::models::onboarding::form_progress::Entity::find()
            .filter(crate::models::onboarding::form_progress::Column::UserId.eq(user_context.user_id))
            .filter(crate::models::onboarding::form_progress::Column::OnboardingFormId.eq(input.onboarding_form_id))
            .one(&db)
            .await?;

        let res = if let Some(progress) = existing {
            let mut progress: crate::models::onboarding::form_progress::ActiveModel = progress.into();
            progress.status = Set(status_str);
            progress.form_data = Set(input.form_data);
            if input.status == OnboardingFormProgressStatus::Completed {
                progress.completed_at = Set(Some(Utc::now()));
            }
            progress.last_accessed_at = Set(Some(Utc::now()));
            progress.updated_at = Set(Utc::now());
            progress.update(&db).await?
        } else {
            let progress = crate::models::onboarding::form_progress::ActiveModel {
                id: Set(Uuid::new_v4()),
                user_id: Set(user_context.user_id),
                onboarding_form_id: Set(input.onboarding_form_id),
                status: Set(status_str.clone()),
                form_data: Set(input.form_data),
                started_at: Set(if status_str != "NOT_STARTED" { Some(Utc::now()) } else { None }),
                completed_at: Set(if input.status == OnboardingFormProgressStatus::Completed { Some(Utc::now()) } else { None }),
                last_accessed_at: Set(Some(Utc::now())),
                created_at: Set(Utc::now()),
                updated_at: Set(Utc::now()),
            };
            progress.insert(&db).await?
        };

        Ok(FormProgressGraphQL::from(res))
    }

    async fn complete_form(&self, ctx: &Context<'_>, input: CompleteFormInput) -> Result<FormProgressGraphQL> {
        let db = get_db_from_context(ctx)?;
        let user_context = ctx.data::<UserContext>()?; // Require auth

        // Check if progress record exists
        let existing = crate::models::onboarding::form_progress::Entity::find()
            .filter(crate::models::onboarding::form_progress::Column::UserId.eq(user_context.user_id))
            .filter(crate::models::onboarding::form_progress::Column::OnboardingFormId.eq(input.onboarding_form_id))
            .one(&db)
            .await?;

        let res = if let Some(progress) = existing {
            let mut progress: crate::models::onboarding::form_progress::ActiveModel = progress.into();
            progress.status = Set("COMPLETED".to_string());
            progress.form_data = Set(Some(input.form_data));
            progress.completed_at = Set(Some(Utc::now()));
            progress.last_accessed_at = Set(Some(Utc::now()));
            progress.updated_at = Set(Utc::now());
            progress.update(&db).await?
        } else {
            let progress = crate::models::onboarding::form_progress::ActiveModel {
                id: Set(Uuid::new_v4()),
                user_id: Set(user_context.user_id),
                onboarding_form_id: Set(input.onboarding_form_id),
                status: Set("COMPLETED".to_string()),
                form_data: Set(Some(input.form_data)),
                started_at: Set(Some(Utc::now())),
                completed_at: Set(Some(Utc::now())),
                last_accessed_at: Set(Some(Utc::now())),
                created_at: Set(Utc::now()),
                updated_at: Set(Utc::now()),
            };
            progress.insert(&db).await?
        };

        Ok(FormProgressGraphQL::from(res))
    }

    // =========================================================================
    // Assignment Mutations
    // =========================================================================

    async fn assign_onboarding(&self, ctx: &Context<'_>, input: CreateOnboardingAssignmentInput) -> Result<Assignment> {
        let db = get_db_from_context(ctx)?;
        let user_context = ctx.data::<UserContext>()?;
        // TODO: Add RBAC check

        let assignment = crate::models::onboarding::assignment::ActiveModel {
            id: Set(Uuid::new_v4()),
            user_id: Set(input.user_id),
            onboarding_module_id: Set(input.onboarding_module_id),
            assigned_by_id: Set(Some(user_context.user_id)),
            assigned_at: Set(Utc::now()),
            due_date: Set(input.due_date),
            completed_at: Set(None),
        };

        let res = assignment.insert(&db).await?;
        Ok(res)
    }

    async fn update_onboarding_assignment(&self, ctx: &Context<'_>, id: Uuid, input: UpdateOnboardingAssignmentInput) -> Result<Assignment> {
        let db = get_db_from_context(ctx)?;

        let assignment = crate::models::onboarding::assignment::Entity::find_by_id(id).one(&db).await?
            .ok_or_else(|| AppError::NotFound("Assignment not found".to_string()))?;

        let mut assignment: crate::models::onboarding::assignment::ActiveModel = assignment.into();

        if let Some(due_date) = input.due_date {
            assignment.due_date = Set(Some(due_date));
        }
        if let Some(completed_at) = input.completed_at {
            assignment.completed_at = Set(Some(completed_at));
        }

        let res = assignment.update(&db).await?;
        Ok(res)
    }

    async fn delete_onboarding_assignment(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;
        // TODO: Add RBAC check

        let res = crate::models::onboarding::assignment::Entity::delete_by_id(id).exec(&db).await?;
        Ok(res.rows_affected > 0)
    }

    /// Bulk assign onboarding to all users in a department
    async fn assign_onboarding_to_department(
        &self,
        ctx: &Context<'_>,
        onboarding_module_id: Uuid,
        department_id: Uuid,
        due_date: Option<chrono::DateTime<Utc>>
    ) -> Result<i32> {
        let db = get_db_from_context(ctx)?;
        let user_context = ctx.data::<UserContext>()?;
        // TODO: Add RBAC check (should require admin or HR manager role)

        // Get all users in the department
        let users = crate::models::user::Entity::find()
            .filter(crate::models::user::Column::DepartmentId.eq(department_id))
            .filter(crate::models::user::Column::DeletedAt.is_null())
            .all(&db)
            .await?;

        let mut created_count = 0;

        // Create assignment for each user
        for user in users {
            // Check if assignment already exists
            let existing = crate::models::onboarding::assignment::Entity::find()
                .filter(crate::models::onboarding::assignment::Column::UserId.eq(user.id))
                .filter(crate::models::onboarding::assignment::Column::OnboardingModuleId.eq(onboarding_module_id))
                .one(&db)
                .await?;

            // Only create if not already assigned
            if existing.is_none() {
                let assignment = crate::models::onboarding::assignment::ActiveModel {
                    id: Set(Uuid::new_v4()),
                    user_id: Set(user.id),
                    onboarding_module_id: Set(onboarding_module_id),
                    assigned_by_id: Set(Some(user_context.user_id)),
                    assigned_at: Set(Utc::now()),
                    due_date: Set(due_date),
                    completed_at: Set(None),
                };

                assignment.insert(&db).await?;
                created_count += 1;
            }
        }

        Ok(created_count)
    }

    // =========================================================================
    // Progress Mutations
    // =========================================================================

    async fn update_onboarding_progress(&self, ctx: &Context<'_>, content_block_id: Uuid, input: UpdateOnboardingProgressInput) -> Result<ProgressGraphQL> {
        let db = get_db_from_context(ctx)?;
        let user_context = ctx.data::<UserContext>()?; // Require auth

        let status_str: String = input.status.into();

        // Check if progress record exists
        let existing = crate::models::onboarding::progress::Entity::find()
            .filter(crate::models::onboarding::progress::Column::UserId.eq(user_context.user_id))
            .filter(crate::models::onboarding::progress::Column::ContentBlockId.eq(content_block_id))
            .one(&db)
            .await?;

        let res = if let Some(progress) = existing {
            let mut progress: crate::models::onboarding::progress::ActiveModel = progress.into();
            progress.status = Set(status_str);
            if input.status == OnboardingProgressStatus::Completed {
                progress.completed_at = Set(Some(Utc::now()));
            }
            progress.last_accessed_at = Set(Some(Utc::now()));
            progress.update(&db).await?
        } else {
            let progress = crate::models::onboarding::progress::ActiveModel {
                id: Set(Uuid::new_v4()),
                user_id: Set(user_context.user_id),
                content_block_id: Set(content_block_id),
                status: Set(status_str.clone()),
                started_at: Set(if status_str != "NOT_STARTED" { Some(Utc::now()) } else { None }),
                completed_at: Set(if input.status == OnboardingProgressStatus::Completed { Some(Utc::now()) } else { None }),
                last_accessed_at: Set(Some(Utc::now())),
            };
            progress.insert(&db).await?
        };

        Ok(ProgressGraphQL::from(res))
    }

    // =========================================================================
    // Form Submission Mutations
    // =========================================================================

    async fn submit_form(&self, ctx: &Context<'_>, input: CreateFormSubmissionInput) -> Result<FormSubmission> {
        let db = get_db_from_context(ctx)?;
        let user_context = ctx.data::<UserContext>()?; // Require auth

        let submission = crate::models::onboarding::form_submission::ActiveModel {
            id: Set(Uuid::new_v4()),
            user_id: Set(user_context.user_id),
            content_block_id: Set(input.content_block_id),
            form_template_id: Set(input.form_template_id),
            form_data: Set(input.form_data),
            submitted_at: Set(Utc::now()),
            ip_address: Set(input.ip_address),
            user_agent: Set(input.user_agent),
        };

        let res = submission.insert(&db).await?;
        Ok(res)
    }

    // =========================================================================
    // Document Upload Mutations
    // =========================================================================

    async fn create_document_upload(&self, ctx: &Context<'_>, input: CreateDocumentUploadInput) -> Result<DocumentUpload> {
        let db = get_db_from_context(ctx)?;
        let user_context = ctx.data::<UserContext>()?; // Require auth

        // Optionally create a document record if requested
        let document_id = if input.create_document.unwrap_or(false) {
            // Get "Onboarding Documents" category
            let category = crate::models::documents::document_category::Entity::find()
                .filter(crate::models::documents::document_category::Column::Name.eq("Onboarding Documents"))
                .one(&db)
                .await?
                .ok_or_else(|| AppError::NotFound("Onboarding Documents category not found. Please run migrations.".to_string()))?;

            // Create document record
            let document = crate::models::documents::document::ActiveModel {
                id: Set(Uuid::new_v4()),
                title: Set(input.document_title.unwrap_or_else(|| input.file_name.clone())),
                description: Set(input.document_description),
                category_id: Set(Some(category.id)),
                uploader_id: Set(user_context.user_id),
                file_path: Set(input.storage_path.clone()),
                file_size: Set(input.file_size_bytes),
                mime_type: Set(input.mime_type.clone()),
                access_level: Set(input.document_access_level.unwrap_or_else(|| "private".to_string())),
                is_encrypted: Set(false),
                expiry_date: Set(input.document_expiry_date),
                version_number: Set(1),
                created_at: Set(Utc::now()),
                updated_at: Set(Utc::now()),
                deleted_at: Set(None),
            };

            let doc_result = document.insert(&db).await?;
            Some(doc_result.id)
        } else {
            None
        };

        let upload = crate::models::onboarding::document_upload::ActiveModel {
            id: Set(Uuid::new_v4()),
            user_id: Set(user_context.user_id),
            content_block_id: Set(input.content_block_id),
            file_name: Set(input.file_name),
            file_size_bytes: Set(input.file_size_bytes),
            mime_type: Set(input.mime_type),
            storage_path: Set(input.storage_path),
            storage_url: Set(input.storage_url),
            virus_scan_status: Set(Some("pending".to_string())),
            virus_scan_date: Set(None),
            uploaded_at: Set(Utc::now()),
            document_id: Set(document_id),
        };

        let res = upload.insert(&db).await?;
        Ok(res)
    }

    async fn update_document_upload(&self, ctx: &Context<'_>, id: Uuid, input: UpdateDocumentUploadInput) -> Result<DocumentUpload> {
        let db = get_db_from_context(ctx)?;
        // TODO: Add RBAC check (should require admin or system role)

        let upload = crate::models::onboarding::document_upload::Entity::find_by_id(id).one(&db).await?
            .ok_or_else(|| AppError::NotFound("Document upload not found".to_string()))?;

        let mut upload: crate::models::onboarding::document_upload::ActiveModel = upload.into();

        if let Some(virus_scan_status) = input.virus_scan_status {
            upload.virus_scan_status = Set(Some(virus_scan_status));
        }
        if let Some(virus_scan_date) = input.virus_scan_date {
            upload.virus_scan_date = Set(Some(virus_scan_date));
        }

        let res = upload.update(&db).await?;
        Ok(res)
    }

    async fn delete_document_upload(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;
        // TODO: Add RBAC check

        let res = crate::models::onboarding::document_upload::Entity::delete_by_id(id).exec(&db).await?;
        Ok(res.rows_affected > 0)
    }
}
