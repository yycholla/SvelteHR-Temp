use async_graphql::{Context, Object, Result};
use axum_login::{AuthSession, AuthnBackend};
use base64;
use chrono::{Datelike, Utc};
use sea_orm::{DatabaseConnection, EntityTrait, Set, ActiveModelTrait, QueryFilter, ColumnTrait, TransactionTrait};
use sea_orm::prelude::Expr;
use uuid::Uuid;

use crate::{
    auth::{context::UserContext, AuthBackend, Credentials},
    database::get_db_from_context,
    error::AppError,
    schema::mutations::{
        AuthMutations, UserMutations, DepartmentMutations, TaskMutations, RbacMutations, TimeMutations, EmployeeMutations, EmployeeImportMutations, TrainingMutations, OnboardingMutations,
        // Import auth types to avoid naming conflicts
        auth::{LoginInput, AuthResponse, LogoutResult, RefreshSessionResponse},
    },
    models::{
        ApproveLeaveRequestInput, AssignRoleInput, AssignTaskInput,
        ChangeTaskStatusInput, CreateEventAttendeeInput, CreateEventInput,
        CreateLeaveBalanceInput, CreateLeaveRequestInput, CreateLeaveTypeInput,
        CreateLinkedResourceInput, CreatePerformanceReviewInput, CreatePermissionInput,
        CreateReviewCycleInput, CreateReviewFeedbackInput, CreateReviewGoalInput, CreateRoleInput,
        CreateTaskDependencyInput, CreateTaskInput, CreateTaskTypeInput, Event,
        EventAttendee, LeaveBalance, LeaveRequest, LeaveType, LinkedResource, Permission, RejectLeaveRequestInput, ReviewCycle, ReviewFeedback,
        ReviewGoal, Role, Task, TaskAssignee, TaskDependency, TaskStatus, UpdateEventAttendeeInput, UpdateEventInput,
        UpdateLeaveBalanceInput, UpdateLeaveRequestInput, UpdateLeaveTypeInput,
        UpdateLinkedResourceInput, UpdatePerformanceReviewInput, UpdatePermissionInput,
        UpdateReviewCycleInput, UpdateReviewFeedbackInput, UpdateReviewGoalInput, UpdateRoleInput,
        UpdateTaskAssigneeInput, UpdateTaskDependencyInput, UpdateTaskInput, UpdateTaskTypeInput,
        UserRoleAssignment,
        CreateDepartmentInput, Department, UpdateDepartmentInput,
        // Employee domain new models
        CreateEmployeeCertificationInput, CreateEmployeeGoalInput, CreateEmployeeSkillInput,
        CreateEmployeeVehicleInput, CreateEmergencyContactInput, EmergencyContact,
        EmployeeCertification, EmployeeGoal, EmployeeSkill, EmployeeVehicle, GoalStatus, UpdateEmployeeGoalInput, UpdateEmployeeSkillInput,
        UpdateEmployeeVehicleInput, UpdateEmergencyContactInput,
        // Documents domain
        CreateDocumentAccessLogInput, CreateDocumentAssignmentInput, CreateDocumentCategoryInput,
        CreateDocumentInput, CreateDocumentVersionInput, CreateEncryptedFileStorageInput, DocumentAccessLog, DocumentAssignment,
        DocumentCategory, DocumentVersion, EncryptedFileStorage, UpdateDocumentCategoryInput,
        UpdateDocumentInput, UploadDocumentInput,
        // Time domain
        AttendanceRecord, CreateAttendanceRecordInput, UpdateAttendanceRecordInput,
        // System domain
        ActivityLog, BulkRollbackBatch, BulkRollbackItem, CompensationBand,
        CreateActivityLogInput, CreateBulkRollbackBatchInput, CreateBulkRollbackItemInput,
        CreateCompensationBandInput, CreateEncryptionKeyInput, CreateHRReportInput,
        CreatePayrollRecordInput, CreateRollbackRequestInput, HRReport, PayrollRecord,
        RollbackRequest, RollbackStatus,
        SystemSettings, UpdateBulkRollbackBatchInput, UpdateBulkRollbackItemInput, UpdateSystemSettingsInput,
        UpdateCompensationBandInput, UpdateRollbackRequestInput,
        // Events domain (new models)
        CreateEventCommentInput, CreateEventHistoryInput, CreateEventWaitlistInput, EventComment,
        EventHistory, EventWaitlist, UpdateEventCommentInput, UpdateEventWaitlistInput,
        // Tasks domain
        TaskType,
        // Reviews domain
        CreateReviewTemplateInput, ReviewTemplate, UpdateReviewTemplateInput,
    },
};

// ==================================================================================
// REMOVED: Authentication types moved to schema::mutations::auth
// ==================================================================================
// The following types are now defined in src/schema/mutations/auth.rs:
// - UserInfo
// - AuthSessionInfo
// - AuthResult
// - AuthError
// - AuthResponse (Union)
// - LogoutResult
// - RefreshSessionResponse
// - LoginInput
//
// These were removed to eliminate GraphQL naming conflicts during Phase 2
// mutation.rs decomposition. All authentication logic now lives in the
// dedicated auth mutations module.
// ==================================================================================

// ==================================================================================
// Leave Request Business Logic Validation Functions
// ==================================================================================

/// Check if user has overlapping leave requests (same user, same period)
async fn check_overlapping_requests(
    db: &DatabaseConnection,
    user_id: Uuid,
    start_date: chrono::NaiveDate,
    end_date: chrono::NaiveDate,
    exclude_id: Option<Uuid>,
) -> Result<bool> {
    use crate::models::leave_request;

    let mut query = leave_request::Entity::find()
        .filter(leave_request::Column::EmployeeId.eq(user_id))
        .filter(leave_request::Column::Status.ne("rejected"))
        .filter(leave_request::Column::Status.ne("cancelled"))
        .filter(leave_request::Column::DeletedAt.is_null());

    // Exclude current request if updating
    if let Some(id) = exclude_id {
        query = query.filter(leave_request::Column::Id.ne(id));
    }

    let existing_requests = query.all(db).await?;

    // Check for overlap: start1 < end2 AND end1 > start2
    for request in existing_requests {
        if start_date < request.end_date && end_date > request.start_date {
            return Ok(true); // Overlap detected
        }
    }

    Ok(false)
}

/// Check if user has sufficient leave balance for the requested days
async fn check_sufficient_balance(
    db: &DatabaseConnection,
    user_id: Uuid,
    leave_type_id: Uuid,
    days_requested: rust_decimal::Decimal,
) -> Result<bool> {
    use crate::models::leave_balance;

    // Get current year
    let current_year = chrono::Utc::now().year();

    // Find balance for this user, leave type, and year
    let balance = leave_balance::Entity::find()
        .filter(leave_balance::Column::EmployeeId.eq(user_id))
        .filter(leave_balance::Column::LeaveTypeId.eq(leave_type_id))
        .filter(leave_balance::Column::Year.eq(current_year))
        .filter(leave_balance::Column::DeletedAt.is_null())
        .one(db)
        .await?;

    if let Some(balance) = balance {
        // Calculate available days: total_days - used_days
        let available = balance.total_days - balance.used_days;
        Ok(available >= days_requested)
    } else {
        // No balance record found - insufficient balance
        Ok(false)
    }
}

/// Validate leave request dates
fn validate_leave_dates(
    start_date: chrono::NaiveDate,
    end_date: chrono::NaiveDate,
    allow_past_dates: bool,
) -> Result<()> {
    let today = chrono::Utc::now().date_naive();

    // End date must be after start date
    if end_date <= start_date {
        return Err("End date must be after start date".into());
    }

    // Start date must not be in the past (unless explicitly allowed)
    if !allow_past_dates && start_date < today {
        return Err("Start date cannot be in the past".into());
    }

    Ok(())
}

pub struct MutationRoot;

#[Object]
impl MutationRoot {

    // ============================================================
    // Authentication Mutations
    // Types imported from schema::mutations::auth to avoid conflicts
    // ============================================================

    /// Login with email and password
    async fn login(&self, ctx: &Context<'_>, input: LoginInput) -> Result<AuthResponse> {
        // Delegate to AuthMutations module
        use crate::schema::mutations::auth::{UserInfo, AuthSessionInfo, AuthResult, AuthError};

        let db = get_db_from_context(ctx)?;

        let creds = Credentials {
            email: input.email.clone(),
            password: input.password,
        };

        let auth_backend = AuthBackend::new(db.clone());
        match auth_backend.authenticate(creds).await {
            Ok(Some(user)) => {
                let session_info = AuthSessionInfo {
                    id: uuid::Uuid::new_v4().to_string(),
                    created_at: chrono::Utc::now().to_rfc3339(),
                    expires_at: (chrono::Utc::now() + chrono::Duration::minutes(30)).to_rfc3339(),
                    last_activity: chrono::Utc::now().to_rfc3339(),
                    ip_address: None,
                    user_agent: None,
                };

                let user_info = UserInfo {
                    id: user.id.to_string(),
                    email: user.email,
                    role: user.role,
                    is_active: user.is_active,
                    force_password_change: user.force_password_change,
                };

                Ok(AuthResponse::AuthResult(AuthResult {
                    user: user_info,
                    session: session_info,
                }))
            }
            Ok(None) => {
                Ok(AuthResponse::AuthError(AuthError {
                    code: "INVALID_CREDENTIALS".to_string(),
                    message: "Invalid email or password".to_string(),
                    retry_after: Some(60),
                }))
            }
            Err(e) => {
                tracing::error!("Authentication error: {:?}", e);
                Ok(AuthResponse::AuthError(AuthError {
                    code: "AUTH_ERROR".to_string(),
                    message: "Authentication service temporarily unavailable".to_string(),
                    retry_after: Some(300),
                }))
            }
        }
    }

    /// Refresh current session to extend its lifetime
    async fn refresh_session(&self, ctx: &Context<'_>) -> Result<RefreshSessionResponse> {
        let auth_session = ctx.data::<AuthSession<AuthBackend>>()?;

        match &auth_session.user {
            Some(_user) => {
                Ok(RefreshSessionResponse {
                    success: true,
                    session_expires_at: Some((chrono::Utc::now() + chrono::Duration::minutes(30)).to_rfc3339()),
                    message: "Use REST /auth/refresh endpoint to properly extend session".to_string(),
                })
            }
            None => {
                Ok(RefreshSessionResponse {
                    success: false,
                    session_expires_at: None,
                    message: "No active session to refresh".to_string(),
                })
            }
        }
    }

    /// Logout current user session
    async fn logout(&self, ctx: &Context<'_>) -> Result<LogoutResult> {
        let auth_session = ctx.data::<AuthSession<AuthBackend>>()?;

        if auth_session.user.is_some() {
            Ok(LogoutResult {
                success: true,
                message: "Use REST /auth/logout endpoint to properly end session".to_string(),
            })
        } else {
            Ok(LogoutResult {
                success: false,
                message: "No active session to logout from".to_string(),
            })
        }
    }

    /// Create a new event attendee
    async fn create_event_attendee(
        &self,
        ctx: &Context<'_>,
        input: CreateEventAttendeeInput,
    ) -> Result<EventAttendee> {
        let db = get_db_from_context(ctx)?;

        // Check if attendee already exists (upsert pattern)
        let existing = crate::models::event_attendee::Entity::find()
            .filter(crate::models::event_attendee::Column::EventId.eq(input.event_id))
            .filter(crate::models::event_attendee::Column::EmployeeId.eq(input.employee_id))
            .one(&db)
            .await?;

        let attendee = if let Some(existing_attendee) = existing {
            // Update existing attendee
            let mut active: crate::models::event_attendee::ActiveModel = existing_attendee.into();
            active.response_status = Set(input.response_status);
            active.is_required = Set(input.is_required);
            active.reminder_time = Set(input.reminder_time);
            active.scope = Set(input.scope);
            active.is_organizer = Set(input.is_organizer);
            active.update(&db).await?
        } else {
            // Create new attendee
            let attendee = crate::models::event_attendee::ActiveModel {
                event_id: Set(input.event_id),
                employee_id: Set(input.employee_id),
                response_status: Set(input.response_status),
                is_required: Set(input.is_required),
                reminder_time: Set(input.reminder_time),
                scope: Set(input.scope),
                is_organizer: Set(input.is_organizer),
                ..Default::default()
            };
            attendee.insert(&db).await?
        };

        Ok(attendee)
    }

    /// Update an existing event attendee
    async fn update_event_attendee(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateEventAttendeeInput,
    ) -> Result<EventAttendee> {
        let db = get_db_from_context(ctx)?;

        // Find existing attendee
        let existing_attendee = crate::models::event_attendee::Entity::find_by_id(id)
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Event attendee not found".to_string()))?;

        // Build active model with updates
        let mut attendee: crate::models::event_attendee::ActiveModel = existing_attendee.into();

        if let Some(response_status) = input.response_status {
            attendee.response_status = Set(response_status);
        }

        if let Some(reminder_time) = input.reminder_time {
            attendee.reminder_time = Set(Some(reminder_time));
        }

        if let Some(scope) = input.scope {
            attendee.scope = Set(Some(scope));
        }

        // Save changes
        let updated_attendee = attendee.update(&db).await?;
        Ok(updated_attendee)
    }

    /// Delete an event attendee
    async fn delete_event_attendee(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;

        let result = crate::models::event_attendee::Entity::delete_by_id(id)
            .exec(&db)
            .await?;

        Ok(result.rows_affected > 0)
    }





    // ============================================================
    // Role Mutations
    // ============================================================

    /// Create a new role
    async fn create_role(&self, ctx: &Context<'_>, input: CreateRoleInput) -> Result<Role> {
        let db = get_db_from_context(ctx)?;

        let role = crate::models::role::ActiveModel {
            name: Set(input.name.clone()),
            description: Set(input.description.clone()),
            level: Set(input.level),
            ..Default::default()
        };

        let role = role.insert(&db).await?;
        Ok(role)
    }

    /// Update an existing role
    async fn update_role(&self, ctx: &Context<'_>, id: Uuid, input: UpdateRoleInput) -> Result<Role> {
        let db = get_db_from_context(ctx)?;

        // Find existing role
        let existing_role = crate::models::role::Entity::find_by_id(id)
            .filter(crate::models::role::Column::DeletedAt.is_null())
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Role not found".to_string()))?;

        // Build active model with updates
        let mut role: crate::models::role::ActiveModel = existing_role.into();

        if let Some(name) = input.name {
            role.name = Set(name);
        }

        if let Some(description) = input.description {
            role.description = Set(Some(description));
        }

        if let Some(level) = input.level {
            role.level = Set(level);
        }

        // Update timestamp
        role.updated_at = Set(Utc::now());

        // Save changes
        let updated_role = role.update(&db).await?;
        Ok(updated_role)
    }

    /// Soft delete a role
    async fn delete_role(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;

        // Find the role first to ensure it exists
        let role = crate::models::role::Entity::find_by_id(id)
            .filter(crate::models::role::Column::DeletedAt.is_null())
            .one(&db)
            .await?;

        if role.is_none() {
            return Ok(false);
        }

        // Soft delete by setting deleted_at
        let mut role: crate::models::role::ActiveModel = role.unwrap().into();
        role.deleted_at = Set(Some(Utc::now()));

        role.update(&db).await?;

        Ok(true)
    }

    // ============================================================
    // Permission Mutations
    // ============================================================

    /// Create a new permission
    async fn create_permission(&self, ctx: &Context<'_>, input: CreatePermissionInput) -> Result<Permission> {
        let db = get_db_from_context(ctx)?;

        let permission = crate::models::permission::ActiveModel {
            resource: Set(input.resource.clone()),
            action: Set(input.action.clone()),
            description: Set(input.description.clone()),
            ..Default::default()
        };

        let permission = permission.insert(&db).await?;
        Ok(permission)
    }

    /// Update an existing permission
    async fn update_permission(&self, ctx: &Context<'_>, id: Uuid, input: UpdatePermissionInput) -> Result<Permission> {
        let db = get_db_from_context(ctx)?;

        // Find existing permission
        let existing_permission = crate::models::permission::Entity::find_by_id(id)
            .filter(crate::models::permission::Column::DeletedAt.is_null())
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Permission not found".to_string()))?;

        // Build active model with updates
        let mut permission: crate::models::permission::ActiveModel = existing_permission.into();

        if let Some(resource) = input.resource {
            permission.resource = Set(resource);
        }

        if let Some(action) = input.action {
            permission.action = Set(action);
        }

        if let Some(description) = input.description {
            permission.description = Set(Some(description));
        }

        // Update timestamp
        permission.updated_at = Set(Utc::now());

        // Save changes
        let updated_permission = permission.update(&db).await?;
        Ok(updated_permission)
    }

    /// Soft delete a permission
    async fn delete_permission(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;

        // Find the permission first to ensure it exists
        let permission = crate::models::permission::Entity::find_by_id(id)
            .filter(crate::models::permission::Column::DeletedAt.is_null())
            .one(&db)
            .await?;

        if permission.is_none() {
            return Ok(false);
        }

        // Soft delete by setting deleted_at
        let mut permission: crate::models::permission::ActiveModel = permission.unwrap().into();
        permission.deleted_at = Set(Some(Utc::now()));

        permission.update(&db).await?;

        Ok(true)
    }

    // ============================================================
    // User Role Assignment Mutations
    // ============================================================

    /// Assign a role to a user
    async fn assign_role_to_user(&self, ctx: &Context<'_>, input: AssignRoleInput) -> Result<UserRoleAssignment> {
        let db = get_db_from_context(ctx)?;

        // Get the assigner's user ID from context if available
        let _assigner_id = ctx.data_opt::<UserContext>().map(|uc| uc.user_id);

        let assignment = crate::models::user_role_assignment::ActiveModel {
            user_id: Set(input.user_id),
            role_id: Set(input.role_id),
            ..Default::default()
        };

        let assignment = assignment.insert(&db).await?;
        Ok(assignment)
    }

    /// Remove a role from a user (soft delete the assignment)
    async fn remove_role_from_user(&self, ctx: &Context<'_>, user_id: Uuid, role_id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;

        // Find the assignment
        let assignment = crate::models::user_role_assignment::Entity::find()
            .filter(crate::models::user_role_assignment::Column::UserId.eq(user_id))
            .filter(crate::models::user_role_assignment::Column::RoleId.eq(role_id))
            .filter(crate::models::user_role_assignment::Column::DeletedAt.is_null())
            .one(&db)
            .await?;

        if let Some(assignment) = assignment {
            // Soft delete by setting deleted_at
            let mut assignment: crate::models::user_role_assignment::ActiveModel = assignment.into();
            assignment.deleted_at = Set(Some(Utc::now()));

            assignment.update(&db).await?;
            Ok(true)
        } else {
            Ok(false)
        }
    }

    /// Assign a permission to a role
    async fn assign_permission_to_role(&self, ctx: &Context<'_>, role_id: Uuid, permission_id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;

        // Check if the assignment already exists
        let existing = crate::models::role_permission::Entity::find()
            .filter(crate::models::role_permission::Column::RoleId.eq(role_id))
            .filter(crate::models::role_permission::Column::PermissionId.eq(permission_id))
            .filter(crate::models::role_permission::Column::DeletedAt.is_null())
            .one(&db)
            .await?;

        if existing.is_some() {
            return Ok(false); // Already exists
        }

        let assignment = crate::models::role_permission::ActiveModel {
            role_id: Set(role_id),
            permission_id: Set(permission_id),
            ..Default::default()
        };

        assignment.insert(&db).await?;
        Ok(true)
    }

    /// Remove a permission from a role (soft delete)
    async fn remove_permission_from_role(&self, ctx: &Context<'_>, role_id: Uuid, permission_id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;

        // Find the assignment
        let assignment = crate::models::role_permission::Entity::find()
            .filter(crate::models::role_permission::Column::RoleId.eq(role_id))
            .filter(crate::models::role_permission::Column::PermissionId.eq(permission_id))
            .filter(crate::models::role_permission::Column::DeletedAt.is_null())
            .one(&db)
            .await?;

        if let Some(assignment) = assignment {
            // Soft delete by setting deleted_at
            let mut assignment: crate::models::role_permission::ActiveModel = assignment.into();
            assignment.deleted_at = Set(Some(Utc::now()));

            assignment.update(&db).await?;
            Ok(true)
        } else {
            Ok(false)
        }
    }

    /// Bulk assign multiple permissions to a role
    async fn bulk_assign_permissions(
        &self,
        ctx: &Context<'_>,
        input: crate::schema::mutations::rbac::BulkAssignPermissionsInput,
    ) -> Result<crate::schema::mutations::rbac::BulkAssignPermissionsResponse> {
        let db = get_db_from_context(ctx)?;

        // Verify role exists
        let _ = crate::models::role::Entity::find_by_id(input.role_id)
            .filter(crate::models::role::Column::DeletedAt.is_null())
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Role not found".to_string()))?;

        let mut assigned_count = 0;

        for permission_id in input.permission_ids {
            // Verify permission exists
            let permission = crate::models::permission::Entity::find_by_id(permission_id)
                .filter(crate::models::permission::Column::DeletedAt.is_null())
                .one(&db)
                .await?;

            if permission.is_none() {
                continue; // Skip invalid permissions
            }

            // Check if assignment already exists
            let existing = crate::models::role_permission::Entity::find()
                .filter(crate::models::role_permission::Column::RoleId.eq(input.role_id))
                .filter(crate::models::role_permission::Column::PermissionId.eq(permission_id))
                .one(&db)
                .await?;

            if let Some(existing) = existing {
                // If soft-deleted, restore it
                if existing.deleted_at.is_some() {
                    let mut role_perm: crate::models::role_permission::ActiveModel = existing.into();
                    role_perm.deleted_at = Set(None);
                    role_perm.updated_at = Set(Utc::now());
                    role_perm.update(&db).await?;
                    assigned_count += 1;
                }
                // If already active, skip
            } else {
                // Create new assignment
                let role_permission = crate::models::role_permission::ActiveModel {
                    role_id: Set(input.role_id),
                    permission_id: Set(permission_id),
                    ..Default::default()
                };
                role_permission.insert(&db).await?;
                assigned_count += 1;
            }
        }

        Ok(crate::schema::mutations::rbac::BulkAssignPermissionsResponse {
            success: true,
            assigned_count,
            message: format!("{} permission(s) assigned to role successfully", assigned_count),
        })
    }

    /// Bulk remove multiple permissions from a role
    async fn bulk_remove_permissions(
        &self,
        ctx: &Context<'_>,
        input: crate::schema::mutations::rbac::BulkRemovePermissionsInput,
    ) -> Result<crate::schema::mutations::rbac::BulkRemovePermissionsResponse> {
        let db = get_db_from_context(ctx)?;

        let mut removed_count = 0;

        for permission_id in input.permission_ids {
            // Find and soft delete the assignment
            let role_permission = crate::models::role_permission::Entity::find()
                .filter(crate::models::role_permission::Column::RoleId.eq(input.role_id))
                .filter(crate::models::role_permission::Column::PermissionId.eq(permission_id))
                .filter(crate::models::role_permission::Column::DeletedAt.is_null())
                .one(&db)
                .await?;

            if let Some(rp) = role_permission {
                let mut rp: crate::models::role_permission::ActiveModel = rp.into();
                rp.deleted_at = Set(Some(Utc::now()));
                rp.update(&db).await?;
                removed_count += 1;
            }
        }

        Ok(crate::schema::mutations::rbac::BulkRemovePermissionsResponse {
            success: true,
            removed_count,
            message: format!("{} permission(s) removed from role successfully", removed_count),
        })
    }

    // ============================================================
    // Event Mutations
    // ============================================================

    /// Create a new event
    async fn create_event(&self, ctx: &Context<'_>, input: CreateEventInput) -> Result<Event> {
        let db = get_db_from_context(ctx)?;

        // Get the creator's user ID from context
        let creator_id = ctx
            .data_opt::<UserContext>()
            .map(|uc| uc.user_id)
            .ok_or("User context not found - authentication required")?;

        let event = crate::models::event::ActiveModel {
            title: Set(input.title.clone()),
            description: Set(input.description.clone()),
            event_type: Set(input.event_type.unwrap_or_else(|| "other".to_string())),
            location: Set(input.location.clone()),
            start_time: Set(input.start_time),
            end_time: Set(input.end_time),
            is_all_day: Set(input.is_all_day),
            status: Set(input.status.unwrap_or_else(|| "scheduled".to_string())),
            is_public: Set(input.is_public.unwrap_or(false)),
            recurrence_rule: Set(input.recurrence_rule.clone()),
            recurrence_end_date: Set(input.recurrence_end_date),
            capacity: Set(input.capacity),
            image_url: Set(input.image_url.clone()),
            image_aspect_ratio: Set(input.image_aspect_ratio.clone()),
            organizer_id: Set(creator_id),
            ..Default::default()
        };

        let event = event.insert(&db).await?;

        Ok(event)
    }

    /// Update an existing event
    async fn update_event(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateEventInput,
    ) -> Result<Event> {
        let db = get_db_from_context(ctx)?;

        // Find existing event
        let existing_event = crate::models::event::Entity::find_by_id(id)
            .filter(crate::models::event::Column::DeletedAt.is_null())
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Event not found".to_string()))?;

        // Build active model with updates
        let mut event: crate::models::event::ActiveModel = existing_event.into();

        if let Some(title) = input.title {
            event.title = Set(title);
        }

        if let Some(description) = input.description {
            event.description = Set(Some(description));
        }

        if let Some(location) = input.location {
            event.location = Set(Some(location));
        }

        if let Some(start_time) = input.start_time {
            event.start_time = Set(start_time);
        }

        if let Some(end_time) = input.end_time {
            event.end_time = Set(end_time);
        }

        if let Some(is_all_day) = input.is_all_day {
            event.is_all_day = Set(is_all_day);
        }

        if let Some(recurrence_rule) = input.recurrence_rule {
            event.recurrence_rule = Set(Some(recurrence_rule));
        }

        if let Some(recurrence_end_date) = input.recurrence_end_date {
            event.recurrence_end_date = Set(Some(recurrence_end_date));
        }

        if let Some(capacity) = input.capacity {
            event.capacity = Set(Some(capacity));
        }

        if let Some(image_url) = input.image_url {
            event.image_url = Set(Some(image_url));
        }

        if let Some(image_aspect_ratio) = input.image_aspect_ratio {
            event.image_aspect_ratio = Set(Some(image_aspect_ratio));
        }

        // Update timestamp
        event.updated_at = Set(Utc::now());

        // Save changes
        let updated_event = event.update(&db).await?;

        Ok(updated_event)
    }

    /// Soft delete an event (sets deleted_at timestamp)
    async fn delete_event(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;

        // Find the event first to ensure it exists
        let event = crate::models::event::Entity::find_by_id(id)
            .filter(crate::models::event::Column::DeletedAt.is_null())
            .one(&db)
            .await?;

        if event.is_none() {
            return Ok(false);
        }

        // Soft delete by setting deleted_at
        let mut event: crate::models::event::ActiveModel = event.unwrap().into();
        event.deleted_at = Set(Some(Utc::now()));

        event.update(&db).await?;

        Ok(true)
    }

    // ============================================================
    // Leave Type Mutations
    // ============================================================

    /// Create a new leave type
    async fn create_leave_type(
        &self,
        ctx: &Context<'_>,
        input: CreateLeaveTypeInput,
    ) -> Result<LeaveType> {
        let db = get_db_from_context(ctx)?;

        let leave_type = crate::models::leave_type::ActiveModel {
            name: Set(input.name.clone()),
            description: Set(input.description.clone()),
            default_days: Set(input.default_days),
            requires_approval: Set(input.requires_approval),
            is_paid: Set(input.is_paid),
            color: Set(input.color.clone()),
            ..Default::default()
        };

        let leave_type = leave_type.insert(&db).await?;
        Ok(leave_type)
    }

    /// Update an existing leave type
    async fn update_leave_type(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateLeaveTypeInput,
    ) -> Result<LeaveType> {
        let db = get_db_from_context(ctx)?;

        // Find existing leave type
        let existing_leave_type = crate::models::leave_type::Entity::find_by_id(id)
            .filter(crate::models::leave_type::Column::DeletedAt.is_null())
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Leave type not found".to_string()))?;

        // Build active model with updates
        let mut leave_type: crate::models::leave_type::ActiveModel = existing_leave_type.into();

        if let Some(name) = input.name {
            leave_type.name = Set(name);
        }

        if let Some(description) = input.description {
            leave_type.description = Set(Some(description));
        }

        if let Some(default_days) = input.default_days {
            leave_type.default_days = Set(default_days);
        }

        if let Some(requires_approval) = input.requires_approval {
            leave_type.requires_approval = Set(requires_approval);
        }

        if let Some(is_paid) = input.is_paid {
            leave_type.is_paid = Set(is_paid);
        }

        if let Some(color) = input.color {
            leave_type.color = Set(Some(color));
        }

        // Update timestamp
        leave_type.updated_at = Set(Utc::now());

        // Save changes
        let updated_leave_type = leave_type.update(&db).await?;
        Ok(updated_leave_type)
    }

    /// Soft delete a leave type
    async fn delete_leave_type(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;

        // Find the leave type first to ensure it exists
        let leave_type = crate::models::leave_type::Entity::find_by_id(id)
            .filter(crate::models::leave_type::Column::DeletedAt.is_null())
            .one(&db)
            .await?;

        if leave_type.is_none() {
            return Ok(false);
        }

        // Soft delete by setting deleted_at
        let mut leave_type: crate::models::leave_type::ActiveModel = leave_type.unwrap().into();
        leave_type.deleted_at = Set(Some(Utc::now()));

        leave_type.update(&db).await?;

        Ok(true)
    }

    // ============================================================
    // Leave Balance Mutations
    // ============================================================

    /// Create a new leave balance
    async fn create_leave_balance(
        &self,
        ctx: &Context<'_>,
        input: CreateLeaveBalanceInput,
    ) -> Result<LeaveBalance> {
        let db = get_db_from_context(ctx)?;

        // Parse decimal values from strings
        let total_days = input.total_days.parse::<rust_decimal::Decimal>()
            .map_err(|_| AppError::Validation("Invalid total_days format".to_string()))?;

        let balance = crate::models::leave_balance::ActiveModel {
            employee_id: Set(input.employee_id),
            leave_type_id: Set(input.leave_type_id),
            year: Set(input.year),
            total_days: Set(total_days),
            used_days: Set(rust_decimal::Decimal::ZERO),
            remaining_days: Set(total_days),
            ..Default::default()
        };

        let balance = balance.insert(&db).await?;
        Ok(balance)
    }

    /// Update an existing leave balance
    async fn update_leave_balance(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateLeaveBalanceInput,
    ) -> Result<LeaveBalance> {
        let db = get_db_from_context(ctx)?;

        // Find existing leave balance
        let existing_balance = crate::models::leave_balance::Entity::find_by_id(id)
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Leave balance not found".to_string()))?;

        // Build active model with updates
        let mut balance: crate::models::leave_balance::ActiveModel = existing_balance.into();

        if let Some(total_days_str) = input.total_days {
            let total_days = total_days_str.parse::<rust_decimal::Decimal>()
                .map_err(|_| AppError::Validation("Invalid total_days format".to_string()))?;
            balance.total_days = Set(total_days);
        }

        if let Some(used_days_str) = input.used_days {
            let used_days = used_days_str.parse::<rust_decimal::Decimal>()
                .map_err(|_| AppError::Validation("Invalid used_days format".to_string()))?;
            balance.used_days = Set(used_days);
        }

        if let Some(remaining_days_str) = input.remaining_days {
            let remaining_days = remaining_days_str.parse::<rust_decimal::Decimal>()
                .map_err(|_| AppError::Validation("Invalid remaining_days format".to_string()))?;
            balance.remaining_days = Set(remaining_days);
        }

        // Update timestamp
        balance.updated_at = Set(Utc::now());

        // Save changes
        let updated_balance = balance.update(&db).await?;
        Ok(updated_balance)
    }

    // ============================================================
    // Leave Request Mutations
    // ============================================================

    /// Create a new leave request
    async fn create_leave_request(
        &self,
        ctx: &Context<'_>,
        input: CreateLeaveRequestInput,
    ) -> Result<LeaveRequest> {
        let db = get_db_from_context(ctx)?;

        // Get user ID from context
        let user_id = ctx
            .data_opt::<UserContext>()
            .map(|uc| uc.user_id)
            .ok_or("User context not found - authentication required")?;

        // Parse days_requested from string to Decimal
        use std::str::FromStr;
        let days = rust_decimal::Decimal::from_str(&input.days_requested)
            .map_err(|_| "Invalid days_requested format")?;

        let start_date = input.start_date.date_naive();
        let end_date = input.end_date.date_naive();

        // VALIDATION 1: Date validation (end > start, no past dates)
        validate_leave_dates(start_date, end_date, false)?;

        // VALIDATION 2: Check for overlapping leave requests
        let has_overlap = check_overlapping_requests(
            &db,
            user_id,
            start_date,
            end_date,
            None, // No exclusion for new requests
        ).await?;

        if has_overlap {
            return Err("Cannot create leave request: overlapping dates with existing request".into());
        }

        // VALIDATION 3: Check sufficient leave balance
        let has_balance = check_sufficient_balance(
            &db,
            user_id,
            input.leave_type_id,
            days,
        ).await?;

        if !has_balance {
            return Err("Cannot create leave request: insufficient leave balance".into());
        }

        let request = crate::models::leave_request::ActiveModel {
            employee_id: Set(user_id),
            leave_type_id: Set(input.leave_type_id),
            start_date: Set(start_date),
            end_date: Set(end_date),
            days_requested: Set(days),
            status: Set("pending".to_string()),
            reason: Set(input.reason.clone()),
            ..Default::default()
        };

        let request = request.insert(&db).await?;

        Ok(request)
    }

    /// Update an existing leave request (only for pending requests)
    async fn update_leave_request(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateLeaveRequestInput,
    ) -> Result<LeaveRequest> {
        let db = get_db_from_context(ctx)?;

        // Find existing leave request (only pending ones can be updated)
        let existing_request = crate::models::leave_request::Entity::find_by_id(id)
            .filter(crate::models::leave_request::Column::Status.eq("pending"))
            .filter(crate::models::leave_request::Column::DeletedAt.is_null())
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Leave request not found or not pending".to_string()))?;

        // Track whether dates are being updated for validation
        let mut final_start_date = existing_request.start_date;
        let mut final_end_date = existing_request.end_date;
        let mut final_days = existing_request.days_requested;
        let user_id = existing_request.employee_id;
        let leave_type_id = existing_request.leave_type_id;

        // Build active model with updates
        let mut request: crate::models::leave_request::ActiveModel = existing_request.into();

        if let Some(start_date) = input.start_date {
            final_start_date = start_date.date_naive();
            request.start_date = Set(final_start_date);
        }

        if let Some(end_date) = input.end_date {
            final_end_date = end_date.date_naive();
            request.end_date = Set(final_end_date);
        }

        if let Some(days_requested_str) = input.days_requested {
            use std::str::FromStr;
            let days = rust_decimal::Decimal::from_str(&days_requested_str)
                .map_err(|_| "Invalid days_requested format")?;
            final_days = days;
            request.days_requested = Set(days);
        }

        if let Some(reason) = input.reason {
            request.reason = Set(Some(reason));
        }

        // VALIDATION 1: Date validation (end > start, allow past dates for updates)
        validate_leave_dates(final_start_date, final_end_date, true)?;

        // VALIDATION 2: Check for overlapping leave requests (exclude this request)
        let has_overlap = check_overlapping_requests(
            &db,
            user_id,
            final_start_date,
            final_end_date,
            Some(id), // Exclude this request from overlap check
        ).await?;

        if has_overlap {
            return Err("Cannot update leave request: overlapping dates with existing request".into());
        }

        // VALIDATION 3: Check sufficient leave balance
        let has_balance = check_sufficient_balance(
            &db,
            user_id,
            leave_type_id,
            final_days,
        ).await?;

        if !has_balance {
            return Err("Cannot update leave request: insufficient leave balance".into());
        }

        // Update timestamp
        request.updated_at = Set(Utc::now());

        // Save changes
        let updated_request = request.update(&db).await?;

        Ok(updated_request)
    }

    /// Approve a leave request
    async fn approve_leave_request(
        &self,
        ctx: &Context<'_>,
        input: ApproveLeaveRequestInput,
    ) -> Result<LeaveRequest> {
        let db = get_db_from_context(ctx)?;

        // Get approver ID from context
        let approver_id = ctx
            .data_opt::<UserContext>()
            .map(|uc| uc.user_id)
            .ok_or("User context not found - authentication required")?;

        // Find existing leave request (only pending ones can be approved)
        let existing_request = crate::models::leave_request::Entity::find_by_id(input.request_id)
            .filter(crate::models::leave_request::Column::Status.eq("pending"))
            .filter(crate::models::leave_request::Column::DeletedAt.is_null())
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Leave request not found or not pending".to_string()))?;

        // VALIDATION 4: Prevent self-approval
        if existing_request.employee_id == approver_id {
            return Err("Cannot approve own leave request".into());
        }

        // Build active model with approval
        let mut request: crate::models::leave_request::ActiveModel = existing_request.into();
        request.status = Set("approved".to_string());
        request.manager_id = Set(Some(approver_id));
        request.updated_at = Set(Utc::now());

        // Save changes
        let updated_request = request.update(&db).await?;

        Ok(updated_request)
    }

    /// Reject a leave request
    async fn reject_leave_request(
        &self,
        ctx: &Context<'_>,
        input: RejectLeaveRequestInput,
    ) -> Result<LeaveRequest> {
        let db = get_db_from_context(ctx)?;

        // Get approver ID from context
        let approver_id = ctx
            .data_opt::<UserContext>()
            .map(|uc| uc.user_id)
            .ok_or("User context not found - authentication required")?;

        // Find existing leave request (only pending ones can be rejected)
        let existing_request = crate::models::leave_request::Entity::find_by_id(input.request_id)
            .filter(crate::models::leave_request::Column::Status.eq("pending"))
            .filter(crate::models::leave_request::Column::DeletedAt.is_null())
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Leave request not found or not pending".to_string()))?;

        // Build active model with rejection
        let mut request: crate::models::leave_request::ActiveModel = existing_request.into();
        request.status = Set("rejected".to_string());
        request.manager_id = Set(Some(approver_id));
        request.manager_comments = Set(Some(input.rejection_reason.clone()));
        request.updated_at = Set(Utc::now());

        // Save changes
        let updated_request = request.update(&db).await?;
        Ok(updated_request)
    }

    /// Cancel a leave request (by the user who created it)
    async fn cancel_leave_request(&self, ctx: &Context<'_>, id: Uuid) -> Result<LeaveRequest> {
        let db = get_db_from_context(ctx)?;

        // Find existing leave request (only pending or approved ones can be cancelled)
        let existing_request = crate::models::leave_request::Entity::find_by_id(id)
            .filter(
                crate::models::leave_request::Column::Status
                    .eq("pending")
                    .or(crate::models::leave_request::Column::Status.eq("approved"))
            )
            .filter(crate::models::leave_request::Column::DeletedAt.is_null())
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Leave request not found or cannot be cancelled".to_string()))?;

        // Build active model with cancellation
        let mut request: crate::models::leave_request::ActiveModel = existing_request.into();
        request.status = Set("cancelled".to_string());
        request.updated_at = Set(Utc::now());

        // Save changes
        let updated_request = request.update(&db).await?;
        Ok(updated_request)
    }

    /// Soft delete a leave request
    async fn delete_leave_request(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;

        // Find the leave request first to ensure it exists
        let request = crate::models::leave_request::Entity::find_by_id(id)
            .filter(crate::models::leave_request::Column::DeletedAt.is_null())
            .one(&db)
            .await?;

        if request.is_none() {
            return Ok(false);
        }

        // Soft delete by setting deleted_at
        let mut request: crate::models::leave_request::ActiveModel = request.unwrap().into();
        request.deleted_at = Set(Some(Utc::now()));

        request.update(&db).await?;

        Ok(true)
    }

    /// Create a new task
    async fn create_task(&self, ctx: &Context<'_>, input: CreateTaskInput) -> Result<Task> {
        let db = get_db_from_context(ctx)?;

        // Get creator ID from context
        let creator_id = ctx
            .data_opt::<UserContext>()
            .map(|uc| uc.user_id)
            .ok_or("User context not found - authentication required")?;

        let task = crate::models::task::ActiveModel {
            title: Set(input.title.clone()),
            description: Set(input.description.clone()),
            task_type_id: Set(input.task_type_id),
            status: Set(input.status.unwrap_or(TaskStatus::Todo).as_str().to_string()),
            priority: Set(input.priority.as_str().to_string()),
            due_date: Set(input.due_date),
            estimated_hours: Set(input.estimated_hours),
            tags: Set(input.tags.clone()),
            department_id: Set(input.department_id),
            created_by: Set(creator_id),
            assignee_id: Set(input.assignee_id),
            parent_task_id: Set(input.parent_task_id),
            requires_manual_reassignment: Set(Some(input.requires_manual_reassignment.unwrap_or(false))),
            ..Default::default()
        };

        let task = task.insert(&db).await?;

        // Create audit entry for task creation
        let audit_entry = crate::models::task_audit_entry::ActiveModel {
            task_id: Set(task.id),
            user_id: Set(creator_id),
            action: Set("created".to_string()),
            new_value: Set(serde_json::to_value(&task).ok()),
            ..Default::default()
        };
        let _ = audit_entry.insert(&db).await;

        Ok(task)
    }

    /// Update an existing task
    async fn update_task(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateTaskInput,
    ) -> Result<Task> {
        let db = get_db_from_context(ctx)?;

        // Get user ID from context for audit trail
        let user_id = ctx
            .data_opt::<UserContext>()
            .map(|uc| uc.user_id)
            .ok_or("User context not found - authentication required")?;

        // Find existing task
        let existing_task = crate::models::task::Entity::find_by_id(id)
            .filter(crate::models::task::Column::DeletedAt.is_null())
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Task not found".to_string()))?;

        // Build active model with updates
        let mut task: crate::models::task::ActiveModel = existing_task.into();

        if let Some(title) = input.title {
            task.title = Set(title);
        }

        if let Some(description) = input.description {
            task.description = Set(Some(description));
        }

        if let Some(status) = input.status {
            task.status = Set(status.as_str().to_string());
            // Set completed_at if status changed to done
            if status == TaskStatus::Done {
                task.completed_at = Set(Some(Utc::now()));
            }
        }

        if let Some(priority) = input.priority {
            task.priority = Set(priority.as_str().to_string());
        }

        if let Some(due_date) = input.due_date {
            task.due_date = Set(Some(due_date));
        }

        if let Some(estimated_hours) = input.estimated_hours {
            task.estimated_hours = Set(Some(estimated_hours));
        }

        if let Some(actual_hours) = input.actual_hours {
            task.actual_hours = Set(Some(actual_hours));
        }

        if let Some(tags) = input.tags {
            task.tags = Set(Some(tags));
        }

        if let Some(department_id) = input.department_id {
            task.department_id = Set(Some(department_id));
        }

        if let Some(task_type_id) = input.task_type_id {
            task.task_type_id = Set(Some(task_type_id));
        }

        if let Some(assignee_id) = input.assignee_id {
            task.assignee_id = Set(Some(assignee_id));
        }

        if let Some(parent_task_id) = input.parent_task_id {
            task.parent_task_id = Set(Some(parent_task_id));
        }

        if let Some(requires_manual_reassignment) = input.requires_manual_reassignment {
            task.requires_manual_reassignment = Set(Some(requires_manual_reassignment));
        }

        if let Some(archived) = input.archived {
            task.archived = Set(archived);
        }

        // Update timestamp
        task.updated_at = Set(Utc::now());

        // Save changes
        let updated_task = task.update(&db).await?;

        // Create audit entry for task update
        let audit_entry = crate::models::task_audit_entry::ActiveModel {
            task_id: Set(updated_task.id),
            user_id: Set(user_id),
            action: Set("updated".to_string()),
            new_value: Set(serde_json::to_value(&updated_task).ok()),
            ..Default::default()
        };
        let _ = audit_entry.insert(&db).await;

        Ok(updated_task)
    }

    /// Change task status with optional comment
    async fn change_task_status(
        &self,
        ctx: &Context<'_>,
        input: ChangeTaskStatusInput,
    ) -> Result<Task> {
        let db = get_db_from_context(ctx)?;

        let user_id = ctx
            .data_opt::<UserContext>()
            .map(|uc| uc.user_id)
            .ok_or("User context not found - authentication required")?;

        // Find existing task
        let existing_task = crate::models::task::Entity::find_by_id(input.task_id)
            .filter(crate::models::task::Column::DeletedAt.is_null())
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Task not found".to_string()))?;

        let old_status = existing_task.status.clone();

        // Build active model with status change
        let mut task: crate::models::task::ActiveModel = existing_task.into();
        task.status = Set(input.status.as_str().to_string());

        // If changing to done, set completed_at
        if input.status == TaskStatus::Done {
            task.completed_at = Set(Some(Utc::now()));
        }

        task.updated_at = Set(Utc::now());

        // Save changes
        let updated_task = task.update(&db).await?;

        // Create audit entry
        let audit_entry = crate::models::task_audit_entry::ActiveModel {
            task_id: Set(updated_task.id),
            user_id: Set(user_id),
            action: Set("status_changed".to_string()),
            field_name: Set(Some("status".to_string())),
            old_value: Set(serde_json::to_value(&old_status).ok()),
            new_value: Set(serde_json::to_value(input.status.as_str()).ok()),
            comment: Set(input.comment),
            ..Default::default()
        };
        let _ = audit_entry.insert(&db).await;

        Ok(updated_task)
    }

    /// Soft delete a task
    async fn delete_task(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;

        let user_id = ctx.data_opt::<UserContext>().map(|uc| uc.user_id);

        // Find the task first to ensure it exists
        let task = crate::models::task::Entity::find_by_id(id)
            .filter(crate::models::task::Column::DeletedAt.is_null())
            .one(&db)
            .await?;

        if task.is_none() {
            return Ok(false);
        }

        // Soft delete by setting deleted_at
        let mut task: crate::models::task::ActiveModel = task.unwrap().into();
        task.deleted_at = Set(Some(Utc::now()));

        task.update(&db).await?;

        // Create audit entry if user context available
        if let Some(uid) = user_id {
            let audit_entry = crate::models::task_audit_entry::ActiveModel {
                task_id: Set(id),
                user_id: Set(uid),
                action: Set("deleted".to_string()),
                comment: Set(Some("Task deleted".to_string())),
                ..Default::default()
            };
            let _ = audit_entry.insert(&db).await;
        }

        Ok(true)
    }

    // ============================================================
    // Task Assignee Mutations
    // ============================================================

    /// Assign a user to a task
    async fn assign_task_to_user(
        &self,
        ctx: &Context<'_>,
        input: AssignTaskInput,
    ) -> Result<TaskAssignee> {
        let db = get_db_from_context(ctx)?;

        let assigner_id = ctx
            .data_opt::<UserContext>()
            .map(|uc| uc.user_id)
            .ok_or("User context not found - authentication required")?;

        let assignee = crate::models::task_assignee::ActiveModel {
            task_id: Set(input.task_id),
            user_id: Set(input.user_id),
            role: Set(input.role.as_str().to_string()),
            assigned_at: Set(Utc::now()),
            assigned_by: Set(assigner_id),
            ..Default::default()
        };

        let assignee = assignee.insert(&db).await?;

        // Create audit entry
        let audit_entry = crate::models::task_audit_entry::ActiveModel {
            task_id: Set(input.task_id),
            user_id: Set(assigner_id),
            action: Set("assigned".to_string()),
            comment: Set(Some("User assigned to task".to_string())),
            ..Default::default()
        };
        let _ = audit_entry.insert(&db).await;
        Ok(assignee)
    }

    /// Update task assignee role
    async fn update_task_assignee(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateTaskAssigneeInput,
    ) -> Result<TaskAssignee> {
        let db = get_db_from_context(ctx)?;

        // Find existing task assignee
        let existing_assignee = crate::models::task_assignee::Entity::find_by_id(id)
            .filter(crate::models::task_assignee::Column::DeletedAt.is_null())
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Task assignee not found".to_string()))?;

        // Build active model with updates
        let mut assignee: crate::models::task_assignee::ActiveModel = existing_assignee.into();

        if let Some(role) = input.role {
            assignee.role = Set(role.as_str().to_string());
        }

        // Update timestamp
        assignee.updated_at = Set(Utc::now());

        // Save changes
        let updated_assignee = assignee.update(&db).await?;
        Ok(updated_assignee)
    }

    /// Remove a user from a task (soft delete)
    async fn unassign_task_from_user(
        &self,
        ctx: &Context<'_>,
        task_id: Uuid,
        user_id: Uuid,
    ) -> Result<bool> {
        let db = get_db_from_context(ctx)?;

        let unassigner_id = ctx.data_opt::<UserContext>().map(|uc| uc.user_id);

        // Find the task assignee first to ensure it exists
        let assignee = crate::models::task_assignee::Entity::find()
            .filter(crate::models::task_assignee::Column::TaskId.eq(task_id))
            .filter(crate::models::task_assignee::Column::UserId.eq(user_id))
            .filter(crate::models::task_assignee::Column::DeletedAt.is_null())
            .one(&db)
            .await?;

        if assignee.is_none() {
            return Ok(false);
        }

        // Soft delete by setting deleted_at
        let mut assignee: crate::models::task_assignee::ActiveModel = assignee.unwrap().into();
        assignee.deleted_at = Set(Some(Utc::now()));

        assignee.update(&db).await?;

        // Create audit entry if user context available
        if let Some(uid) = unassigner_id {
            let audit_entry = crate::models::task_audit_entry::ActiveModel {
                task_id: Set(task_id),
                user_id: Set(uid),
                action: Set("unassigned".to_string()),
                comment: Set(Some("User unassigned from task".to_string())),
                ..Default::default()
            };
            let _ = audit_entry.insert(&db).await;
        }

        Ok(true)
    }

    // ============================================================
    // Task Dependency Mutations
    // ============================================================

    /// Create a task dependency
    async fn create_task_dependency(
        &self,
        ctx: &Context<'_>,
        input: CreateTaskDependencyInput,
    ) -> Result<TaskDependency> {
        let db = get_db_from_context(ctx)?;

        let creator_id = ctx
            .data_opt::<UserContext>()
            .map(|uc| uc.user_id)
            .ok_or("User context not found - authentication required")?;

        let dependency = crate::models::task_dependency::ActiveModel {
            task_id: Set(input.task_id),
            depends_on_task_id: Set(input.depends_on_task_id),
            dependency_type: Set(input.dependency_type.as_str().to_string()),
            lag_days: Set(input.lag_days),
            created_by: Set(creator_id),
            ..Default::default()
        };

        let dependency = dependency.insert(&db).await?;
        Ok(dependency)
    }

    /// Update a task dependency
    async fn update_task_dependency(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateTaskDependencyInput,
    ) -> Result<TaskDependency> {
        let db = get_db_from_context(ctx)?;

        // Find existing task dependency
        let existing_dependency = crate::models::task_dependency::Entity::find_by_id(id)
            .filter(crate::models::task_dependency::Column::DeletedAt.is_null())
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Task dependency not found".to_string()))?;

        // Build active model with updates
        let mut dependency: crate::models::task_dependency::ActiveModel = existing_dependency.into();

        if let Some(dependency_type) = input.dependency_type {
            dependency.dependency_type = Set(dependency_type.as_str().to_string());
        }

        if let Some(lag_days) = input.lag_days {
            dependency.lag_days = Set(Some(lag_days));
        }

        // Update timestamp
        dependency.updated_at = Set(Utc::now());

        // Save changes
        let updated_dependency = dependency.update(&db).await?;
        Ok(updated_dependency)
    }

    /// Delete a task dependency (soft delete)
    async fn delete_task_dependency(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;

        // Find the task dependency first to ensure it exists
        let dependency = crate::models::task_dependency::Entity::find_by_id(id)
            .filter(crate::models::task_dependency::Column::DeletedAt.is_null())
            .one(&db)
            .await?;

        if dependency.is_none() {
            return Ok(false);
        }

        // Soft delete by setting deleted_at
        let mut dependency: crate::models::task_dependency::ActiveModel = dependency.unwrap().into();
        dependency.deleted_at = Set(Some(Utc::now()));

        dependency.update(&db).await?;

        Ok(true)
    }

    // ============================================================
    // Linked Resource Mutations
    // ============================================================

    /// Create a linked resource
    async fn create_linked_resource(
        &self,
        ctx: &Context<'_>,
        input: CreateLinkedResourceInput,
    ) -> Result<LinkedResource> {
        let db = get_db_from_context(ctx)?;

        let uploaded_by = ctx
            .data_opt::<UserContext>()
            .map(|uc| uc.user_id)
            .ok_or("User context not found - authentication required")?;

        let resource = crate::models::linked_resource::ActiveModel {
            task_id: Set(input.task_id),
            resource_type: Set(input.resource_type.as_str().to_string()),
            title: Set(input.title.clone()),
            url: Set(input.url.clone()),
            file_path: Set(input.file_path.clone()),
            file_size: Set(input.file_size),
            mime_type: Set(input.mime_type.clone()),
            description: Set(input.description.clone()),
            uploaded_by: Set(uploaded_by),
            ..Default::default()
        };

        let resource = resource.insert(&db).await?;
        Ok(resource)
    }

    /// Update a linked resource
    async fn update_linked_resource(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateLinkedResourceInput,
    ) -> Result<LinkedResource> {
        let db = get_db_from_context(ctx)?;

        // Find existing linked resource
        let existing_resource = crate::models::linked_resource::Entity::find_by_id(id)
            .filter(crate::models::linked_resource::Column::DeletedAt.is_null())
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Linked resource not found".to_string()))?;

        // Build active model with updates
        let mut resource: crate::models::linked_resource::ActiveModel = existing_resource.into();

        if let Some(title) = input.title {
            resource.title = Set(title);
        }

        if let Some(url) = input.url {
            resource.url = Set(Some(url));
        }

        if let Some(description) = input.description {
            resource.description = Set(Some(description));
        }

        // Update timestamp
        resource.updated_at = Set(Utc::now());

        // Save changes
        let updated_resource = resource.update(&db).await?;
        Ok(updated_resource)
    }

    /// Delete a linked resource (soft delete)
    async fn delete_linked_resource(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;

        // Find the linked resource first to ensure it exists
        let resource = crate::models::linked_resource::Entity::find_by_id(id)
            .filter(crate::models::linked_resource::Column::DeletedAt.is_null())
            .one(&db)
            .await?;

        if resource.is_none() {
            return Ok(false);
        }

        // Soft delete by setting deleted_at
        let mut resource: crate::models::linked_resource::ActiveModel = resource.unwrap().into();
        resource.deleted_at = Set(Some(Utc::now()));

        resource.update(&db).await?;

        Ok(true)
    }

    // ============================================================
    // Review Cycle Mutations
    // ============================================================

    /// Create a new review cycle
    async fn create_review_cycle(
        &self,
        ctx: &Context<'_>,
        input: CreateReviewCycleInput,
    ) -> Result<ReviewCycle> {
        let db = get_db_from_context(ctx)?;

        let creator_id = ctx
            .data_opt::<UserContext>()
            .map(|uc| uc.user_id)
            .ok_or("User context not found - authentication required")?;

        let cycle = crate::models::review_cycle::ActiveModel {
            name: Set(input.name.clone()),
            description: Set(input.description.clone()),
            review_type: Set(input.review_type.as_str().to_string()),
            start_date: Set(input.start_date),
            end_date: Set(input.end_date),
            status: Set("draft".to_string()),
            created_by: Set(creator_id),
            ..Default::default()
        };

        let cycle = cycle.insert(&db).await?;
        Ok(cycle)
    }

    /// Update an existing review cycle
    async fn update_review_cycle(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateReviewCycleInput,
    ) -> Result<ReviewCycle> {
        let db = get_db_from_context(ctx)?;

        // Find existing review cycle
        let existing_cycle = crate::models::review_cycle::Entity::find_by_id(id)
            .filter(crate::models::review_cycle::Column::DeletedAt.is_null())
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Review cycle not found".to_string()))?;

        // Build active model with updates
        let mut cycle: crate::models::review_cycle::ActiveModel = existing_cycle.into();

        if let Some(name) = input.name {
            cycle.name = Set(name);
        }

        if let Some(description) = input.description {
            cycle.description = Set(Some(description));
        }

        if let Some(start_date) = input.start_date {
            cycle.start_date = Set(start_date);
        }

        if let Some(end_date) = input.end_date {
            cycle.end_date = Set(end_date);
        }

        if let Some(status) = input.status {
            cycle.status = Set(status.as_str().to_string());
        }

        // Update timestamp
        cycle.updated_at = Set(Utc::now());

        // Save changes
        let updated_cycle = cycle.update(&db).await?;
        Ok(updated_cycle)
    }

    /// Soft delete a review cycle
    async fn delete_review_cycle(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;

        // Find the review cycle first to ensure it exists
        let cycle = crate::models::review_cycle::Entity::find_by_id(id)
            .filter(crate::models::review_cycle::Column::DeletedAt.is_null())
            .one(&db)
            .await?;

        if cycle.is_none() {
            return Ok(false);
        }

        // Soft delete by setting deleted_at
        let mut cycle: crate::models::review_cycle::ActiveModel = cycle.unwrap().into();
        cycle.deleted_at = Set(Some(Utc::now()));

        cycle.update(&db).await?;

        Ok(true)
    }

    // ============================================================
    // Performance Review Mutations
    // ============================================================

    /// Create a new performance review
    async fn create_performance_review(
        &self,
        ctx: &Context<'_>,
        input: CreatePerformanceReviewInput,
    ) -> Result<crate::models::performance_review::Model> {
        let db = get_db_from_context(ctx)?;

        let review = crate::models::performance_review::ActiveModel {
            employee_id: Set(input.employee_id),
            reviewer_id: Set(input.reviewer_id),
            cycle_id: Set(input.cycle_id),
            template_id: Set(input.template_id),
            status: Set("draft".to_string()),
            ..Default::default()
        };

        let review = review.insert(&db).await?;
        Ok(review)
    }

    /// Update an existing performance review
    async fn update_performance_review(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdatePerformanceReviewInput,
    ) -> Result<crate::models::performance_review::Model> {
        let db = get_db_from_context(ctx)?;

        // Find existing performance review
        let existing_review = crate::models::performance_review::Entity::find_by_id(id)
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Performance review not found".to_string()))?;

        // Build active model with updates
        let mut review: crate::models::performance_review::ActiveModel = existing_review.into();

        if let Some(status) = input.status {
            review.status = Set(status.as_str().to_string());
        }

        if let Some(rating) = input.overall_rating {
            review.overall_rating = Set(Some(rating));
        }

        if let Some(cycle_id) = input.cycle_id {
            review.cycle_id = Set(Some(cycle_id));
        }

        if let Some(template_id) = input.template_id {
            review.template_id = Set(Some(template_id));
        }

        // Update timestamp
        review.updated_at = Set(Utc::now());

        // Save changes
        let updated_review = review.update(&db).await?;
        Ok(updated_review)
    }

    /// Soft delete a performance review
    async fn delete_performance_review(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;

        // Find the performance review first to ensure it exists
        let review = crate::models::performance_review::Entity::find_by_id(id)
            .filter(crate::models::performance_review::Column::DeletedAt.is_null())
            .one(&db)
            .await?;

        if review.is_none() {
            return Ok(false);
        }

        // Soft delete by setting deleted_at
        let mut review: crate::models::performance_review::ActiveModel = review.unwrap().into();
        review.deleted_at = Set(Some(Utc::now()));

        review.update(&db).await?;

        Ok(true)
    }

    // ============================================================
    // Review Goal Mutations
    // ============================================================

    /// Create a new review goal
    async fn create_review_goal(
        &self,
        ctx: &Context<'_>,
        input: CreateReviewGoalInput,
    ) -> Result<ReviewGoal> {
        let db = get_db_from_context(ctx)?;

        let goal = crate::models::review_goal::ActiveModel {
            review_id: Set(input.performance_review_id),
            title: Set(input.title.clone()),
            description: Set(input.description.clone()),
            target_date: Set(input.target_date),
            completion_status: Set("not_started".to_string()),
            weight: Set(input.weight),
            ..Default::default()
        };

        let goal = goal.insert(&db).await?;
        Ok(goal)
    }

    /// Update an existing review goal
    async fn update_review_goal(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateReviewGoalInput,
    ) -> Result<ReviewGoal> {
        let db = get_db_from_context(ctx)?;

        // Find existing review goal
        let existing_goal = crate::models::review_goal::Entity::find_by_id(id)
            .filter(crate::models::review_goal::Column::DeletedAt.is_null())
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Review goal not found".to_string()))?;

        // Build active model with updates
        let mut goal: crate::models::review_goal::ActiveModel = existing_goal.into();

        if let Some(title) = input.title {
            goal.title = Set(title);
        }

        if let Some(description) = input.description {
            goal.description = Set(Some(description));
        }

        if let Some(target_date) = input.target_date {
            goal.target_date = Set(Some(target_date));
        }

        if let Some(completion_status) = input.completion_status {
            goal.completion_status = Set(completion_status.as_str().to_string());
        }

        if let Some(weight) = input.weight {
            goal.weight = Set(Some(weight));
        }

        // Update timestamp
        goal.updated_at = Set(Utc::now());

        // Save changes
        let updated_goal = goal.update(&db).await?;
        Ok(updated_goal)
    }

    /// Soft delete a review goal
    async fn delete_review_goal(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;

        // Find the review goal first to ensure it exists
        let goal = crate::models::review_goal::Entity::find_by_id(id)
            .filter(crate::models::review_goal::Column::DeletedAt.is_null())
            .one(&db)
            .await?;

        if goal.is_none() {
            return Ok(false);
        }

        // Soft delete by setting deleted_at
        let mut goal: crate::models::review_goal::ActiveModel = goal.unwrap().into();
        goal.deleted_at = Set(Some(Utc::now()));

        goal.update(&db).await?;

        Ok(true)
    }

    // ============================================================
    // Review Feedback Mutations
    // ============================================================

    /// Create a new review feedback
    async fn create_review_feedback(
        &self,
        ctx: &Context<'_>,
        input: CreateReviewFeedbackInput,
    ) -> Result<ReviewFeedback> {
        let db = get_db_from_context(ctx)?;

        let provider_id = ctx
            .data_opt::<UserContext>()
            .map(|uc| uc.user_id)
            .ok_or("User context not found - authentication required")?;

        let feedback = crate::models::review_feedback::ActiveModel {
            review_id: Set(input.performance_review_id),
            provider_id: Set(provider_id),
            feedback_type: Set(input.feedback_type.as_str().to_string()),
            content: Set(input.content.clone()),
            is_visible_to_employee: Set(input.is_visible_to_employee.unwrap_or(true)),
            ..Default::default()
        };

        let feedback = feedback.insert(&db).await?;
        Ok(feedback)
    }

    /// Update an existing review feedback
    async fn update_review_feedback(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateReviewFeedbackInput,
    ) -> Result<ReviewFeedback> {
        let db = get_db_from_context(ctx)?;

        // Find existing review feedback
        let existing_feedback = crate::models::review_feedback::Entity::find_by_id(id)
            .filter(crate::models::review_feedback::Column::DeletedAt.is_null())
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Review feedback not found".to_string()))?;

        // Build active model with updates
        let mut feedback: crate::models::review_feedback::ActiveModel = existing_feedback.into();

        if let Some(content) = input.content {
            feedback.content = Set(content);
        }

        if let Some(is_visible_to_employee) = input.is_visible_to_employee {
            feedback.is_visible_to_employee = Set(is_visible_to_employee);
        }

        // Update timestamp
        feedback.updated_at = Set(Utc::now());

        // Save changes
        let updated_feedback = feedback.update(&db).await?;
        Ok(updated_feedback)
    }

    /// Soft delete review feedback
    async fn delete_review_feedback(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;

        // Find the review feedback first to ensure it exists
        let feedback = crate::models::review_feedback::Entity::find_by_id(id)
            .filter(crate::models::review_feedback::Column::DeletedAt.is_null())
            .one(&db)
            .await?;

        if feedback.is_none() {
            return Ok(false);
        }

        // Soft delete by setting deleted_at
        let mut feedback: crate::models::review_feedback::ActiveModel = feedback.unwrap().into();
        feedback.deleted_at = Set(Some(Utc::now()));

        feedback.update(&db).await?;

        Ok(true)
    }

    // ============================================================
    // NEW MODELS - Employee Domain Mutations
    // ============================================================

    /// Create a new employee skill
    async fn create_employee_skill(
        &self,
        ctx: &Context<'_>,
        input: CreateEmployeeSkillInput,
    ) -> Result<EmployeeSkill> {
        let db = get_db_from_context(ctx)?;

        let skill = crate::models::employee::employee_skill::ActiveModel {
            employee_id: Set(input.employee_id),
            skill_name: Set(input.skill_name.clone()),
            proficiency_level: Set(input.proficiency_level.as_str().to_string()),
            years_experience: Set(input.years_experience),
            ..Default::default()
        };

        let skill = skill.insert(&db).await?;
        Ok(skill)
    }

    /// Update an existing employee skill
    async fn update_employee_skill(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateEmployeeSkillInput,
    ) -> Result<EmployeeSkill> {
        let db = get_db_from_context(ctx)?;

        // Find existing employee skill
        let existing_skill = crate::models::employee::employee_skill::Entity::find_by_id(id)
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Employee skill not found".to_string()))?;

        // Build active model with updates
        let mut skill: crate::models::employee::employee_skill::ActiveModel = existing_skill.into();

        if let Some(skill_name) = input.skill_name {
            skill.skill_name = Set(skill_name);
        }

        if let Some(proficiency_level) = input.proficiency_level {
            skill.proficiency_level = Set(proficiency_level.as_str().to_string());
        }

        if let Some(years_experience) = input.years_experience {
            skill.years_experience = Set(Some(years_experience));
        }

        // Update timestamp
        skill.updated_at = Set(Utc::now());

        // Save changes
        let updated_skill = skill.update(&db).await?;
        Ok(updated_skill)
    }

    /// Delete an employee skill (hard delete - no soft delete for skills)
    async fn delete_employee_skill(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;

        let result = crate::models::employee::employee_skill::Entity::delete_by_id(id)
            .exec(&db)
            .await?;

        Ok(result.rows_affected > 0)
    }

    /// Create a new employee certification
    async fn create_employee_certification(
        &self,
        ctx: &Context<'_>,
        input: CreateEmployeeCertificationInput,
    ) -> Result<EmployeeCertification> {
        let db = get_db_from_context(ctx)?;

        let cert = crate::models::employee::employee_certification::ActiveModel {
            employee_id: Set(input.employee_id),
            certification_name: Set(input.certification_name.clone()),
            issuing_organization: Set(input.issuing_organization.clone()),
            issue_date: Set(input.issue_date),
            expiration_date: Set(input.expiration_date),
            certification_number: Set(input.certification_number.clone()),
            ..Default::default()
        };

        let cert = cert.insert(&db).await?;
        Ok(cert)
    }

    /// Delete an employee certification (hard delete)
    async fn delete_employee_certification(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;

        let result = crate::models::employee::employee_certification::Entity::delete_by_id(id)
            .exec(&db)
            .await?;

        Ok(result.rows_affected > 0)
    }

    /// Create a new employee vehicle
    async fn create_employee_vehicle(
        &self,
        ctx: &Context<'_>,
        input: CreateEmployeeVehicleInput,
    ) -> Result<EmployeeVehicle> {
        let db = get_db_from_context(ctx)?;

        let vehicle = crate::models::employee::employee_vehicle::ActiveModel {
            employee_id: Set(input.employee_id),
            make: Set(input.make.clone()),
            model: Set(input.model.clone()),
            year: Set(input.year),
            license_plate: Set(input.license_plate.clone()),
            color: Set(input.color.clone()),
            ..Default::default()
        };

        let vehicle = vehicle.insert(&db).await?;
        Ok(vehicle)
    }

    /// Update an existing employee vehicle
    async fn update_employee_vehicle(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateEmployeeVehicleInput,
    ) -> Result<EmployeeVehicle> {
        let db = get_db_from_context(ctx)?;

        // Find existing employee vehicle
        let existing_vehicle = crate::models::employee::employee_vehicle::Entity::find_by_id(id)
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Employee vehicle not found".to_string()))?;

        // Build active model with updates
        let mut vehicle: crate::models::employee::employee_vehicle::ActiveModel = existing_vehicle.into();

        if let Some(make) = input.make {
            vehicle.make = Set(make);
        }

        if let Some(model) = input.model {
            vehicle.model = Set(model);
        }

        if let Some(year) = input.year {
            vehicle.year = Set(year);
        }

        if let Some(license_plate) = input.license_plate {
            vehicle.license_plate = Set(license_plate);
        }

        if let Some(color) = input.color {
            vehicle.color = Set(Some(color));
        }

        // Update timestamp
        vehicle.updated_at = Set(Utc::now());

        // Save changes
        let updated_vehicle = vehicle.update(&db).await?;
        Ok(updated_vehicle)
    }

    /// Delete an employee vehicle (hard delete)
    async fn delete_employee_vehicle(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;

        let result = crate::models::employee::employee_vehicle::Entity::delete_by_id(id)
            .exec(&db)
            .await?;

        Ok(result.rows_affected > 0)
    }

    /// Create a new emergency contact
    async fn create_emergency_contact(
        &self,
        ctx: &Context<'_>,
        input: CreateEmergencyContactInput,
    ) -> Result<EmergencyContact> {
        let db = get_db_from_context(ctx)?;

        let contact = crate::models::employee::emergency_contact::ActiveModel {
            employee_id: Set(input.employee_id),
            name: Set(input.name.clone()),
            relationship: Set(input.relationship.clone()),
            phone_number: Set(input.phone_number.clone()),
            email: Set(input.email.clone()),
            is_primary: Set(input.is_primary),
            ..Default::default()
        };

        let contact = contact.insert(&db).await?;
        Ok(contact)
    }

    /// Update an existing emergency contact
    async fn update_emergency_contact(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateEmergencyContactInput,
    ) -> Result<EmergencyContact> {
        let db = get_db_from_context(ctx)?;

        // Find existing emergency contact
        let existing_contact = crate::models::employee::emergency_contact::Entity::find_by_id(id)
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Emergency contact not found".to_string()))?;

        // Build active model with updates
        let mut contact: crate::models::employee::emergency_contact::ActiveModel = existing_contact.into();

        if let Some(name) = input.name {
            contact.name = Set(name);
        }

        if let Some(relationship) = input.relationship {
            contact.relationship = Set(Some(relationship));
        }

        if let Some(phone_number) = input.phone_number {
            contact.phone_number = Set(phone_number);
        }

        if let Some(email) = input.email {
            contact.email = Set(Some(email));
        }

        if let Some(is_primary) = input.is_primary {
            contact.is_primary = Set(is_primary);
        }

        // Update timestamp
        contact.updated_at = Set(Utc::now());

        // Save changes
        let updated_contact = contact.update(&db).await?;
        Ok(updated_contact)
    }

    /// Delete an emergency contact (hard delete)
    async fn delete_emergency_contact(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;

        let result = crate::models::employee::emergency_contact::Entity::delete_by_id(id)
            .exec(&db)
            .await?;

        Ok(result.rows_affected > 0)
    }

    /// Create a new employee goal
    async fn create_employee_goal(
        &self,
        ctx: &Context<'_>,
        input: CreateEmployeeGoalInput,
    ) -> Result<EmployeeGoal> {
        let db = get_db_from_context(ctx)?;
        let status = input.status.unwrap_or(GoalStatus::NotStarted);
        let progress = input.progress_percentage.unwrap_or(0);

        let goal = crate::models::employee::employee_goal::ActiveModel {
            employee_id: Set(input.employee_id),
            title: Set(input.title.clone()),
            description: Set(input.description.clone()),
            target_date: Set(input.target_date),
            status: Set(status.as_str().to_string()),
            progress_percentage: Set(progress),
            ..Default::default()
        };

        let goal = goal.insert(&db).await?;
        Ok(goal)
    }

    /// Update an existing employee goal
    async fn update_employee_goal(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateEmployeeGoalInput,
    ) -> Result<EmployeeGoal> {
        let db = get_db_from_context(ctx)?;

        // Find existing employee goal
        let existing_goal = crate::models::employee::employee_goal::Entity::find_by_id(id)
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Employee goal not found".to_string()))?;

        // Build active model with updates
        let mut goal: crate::models::employee::employee_goal::ActiveModel = existing_goal.into();

        if let Some(title) = input.title {
            goal.title = Set(title);
        }

        if let Some(description) = input.description {
            goal.description = Set(Some(description));
        }

        if let Some(target_date) = input.target_date {
            goal.target_date = Set(Some(target_date));
        }

        if let Some(status) = input.status {
            goal.status = Set(status.as_str().to_string());
        }

        if let Some(progress_percentage) = input.progress_percentage {
            goal.progress_percentage = Set(progress_percentage);
        }

        // Update timestamp
        goal.updated_at = Set(Utc::now());

        // Save changes
        let updated_goal = goal.update(&db).await?;
        Ok(updated_goal)
    }

    /// Delete an employee goal (hard delete)
    async fn delete_employee_goal(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;

        let result = crate::models::employee::employee_goal::Entity::delete_by_id(id)
            .exec(&db)
            .await?;

        Ok(result.rows_affected > 0)
    }

    // ============================================================
    // NEW MODELS - Documents Domain Mutations
    // ============================================================

    /// Create a new document
    async fn create_document(
        &self,
        ctx: &Context<'_>,
        input: CreateDocumentInput,
    ) -> Result<crate::models::documents::document::Model> {
        let db = get_db_from_context(ctx)?;

        let document = crate::models::documents::document::ActiveModel {
            title: Set(input.title.clone()),
            description: Set(input.description.clone()),
            category_id: Set(input.category_id),
            file_path: Set(input.file_path.clone()),
            file_size: Set(input.file_size),
            mime_type: Set(input.mime_type.clone()),
            uploader_id: Set(input.uploader_id),
            ..Default::default()
        };

        let document = document.insert(&db).await?;

        Ok(document)
    }

    /// Update an existing document
    async fn update_document(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateDocumentInput,
    ) -> Result<crate::models::documents::document::Model> {
        let db = get_db_from_context(ctx)?;

        // Find existing document
        let existing_document = crate::models::documents::document::Entity::find_by_id(id)
            .filter(crate::models::documents::document::Column::DeletedAt.is_null())
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Document not found".to_string()))?;

        // Build active model with updates
        let mut document: crate::models::documents::document::ActiveModel = existing_document.into();

        if let Some(title) = input.title {
            document.title = Set(title);
        }

        if let Some(description) = input.description {
            document.description = Set(Some(description));
        }

        if let Some(category_id) = input.category_id {
            document.category_id = Set(Some(category_id));
        }

        // Update timestamp
        document.updated_at = Set(Utc::now());

        // Save changes
        let updated_document = document.update(&db).await?;

        Ok(updated_document)
    }

    /// Delete a document (soft delete)
    async fn delete_document(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;

        // Find the document first to ensure it exists
        let document = crate::models::documents::document::Entity::find_by_id(id)
            .filter(crate::models::documents::document::Column::DeletedAt.is_null())
            .one(&db)
            .await?;

        if document.is_none() {
            return Ok(false);
        }

        // Soft delete by setting deleted_at
        let mut document: crate::models::documents::document::ActiveModel = document.unwrap().into();
        document.deleted_at = Set(Some(Utc::now()));

        document.update(&db).await?;

        Ok(true)
    }

    /// Create a new document category
    async fn create_document_category(
        &self,
        ctx: &Context<'_>,
        input: CreateDocumentCategoryInput,
    ) -> Result<DocumentCategory> {
        let db = get_db_from_context(ctx)?;

        let category = crate::models::documents::document_category::ActiveModel {
            name: Set(input.name.clone()),
            description: Set(input.description.clone()),
            parent_category_id: Set(input.parent_category_id),
            ..Default::default()
        };

        let category = category.insert(&db).await?;
        Ok(category)
    }

    /// Update an existing document category
    async fn update_document_category(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateDocumentCategoryInput,
    ) -> Result<DocumentCategory> {
        let db = get_db_from_context(ctx)?;

        // Find existing document category
        let existing_category = crate::models::documents::document_category::Entity::find_by_id(id)
            .filter(crate::models::documents::document_category::Column::DeletedAt.is_null())
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Document category not found".to_string()))?;

        // Build active model with updates
        let mut category: crate::models::documents::document_category::ActiveModel = existing_category.into();

        if let Some(name) = input.name {
            category.name = Set(name);
        }

        if let Some(description) = input.description {
            category.description = Set(Some(description));
        }

        if let Some(parent_category_id) = input.parent_category_id {
            category.parent_category_id = Set(Some(parent_category_id));
        }

        // Update timestamp
        category.updated_at = Set(Utc::now());

        // Save changes
        let updated_category = category.update(&db).await?;
        Ok(updated_category)
    }

    /// Delete a document category (soft delete)
    async fn delete_document_category(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;

        // Find the document category first to ensure it exists
        let category = crate::models::documents::document_category::Entity::find_by_id(id)
            .filter(crate::models::documents::document_category::Column::DeletedAt.is_null())
            .one(&db)
            .await?;

        if category.is_none() {
            return Ok(false);
        }

        // Soft delete by setting deleted_at
        let mut category: crate::models::documents::document_category::ActiveModel = category.unwrap().into();
        category.deleted_at = Set(Some(Utc::now()));

        category.update(&db).await?;

        Ok(true)
    }

    /// Create a new document version
    async fn create_document_version(
        &self,
        ctx: &Context<'_>,
        input: CreateDocumentVersionInput,
    ) -> Result<DocumentVersion> {
        let db = get_db_from_context(ctx)?;

        let version = crate::models::documents::document_version::ActiveModel {
            document_id: Set(input.document_id),
            version_number: Set(input.version_number),
            file_path: Set(input.file_path.clone()),
            file_size: Set(input.file_size),
            uploader_id: Set(input.uploader_id),
            change_summary: Set(input.change_summary.clone()),
            ..Default::default()
        };

        let version = version.insert(&db).await?;
        Ok(version)
    }

    /// Create a new document assignment
    async fn create_document_assignment(
        &self,
        ctx: &Context<'_>,
        input: CreateDocumentAssignmentInput,
    ) -> Result<DocumentAssignment> {
        let db = get_db_from_context(ctx)?;

        let assigner_id = ctx
            .data_opt::<UserContext>()
            .map(|uc| uc.user_id)
            .ok_or("User context not found - authentication required")?;

        let assignment = crate::models::documents::document_assignment::ActiveModel {
            document_id: Set(input.document_id),
            user_id: Set(input.user_id),
            department_id: Set(input.department_id),
            access_level: Set(input.access_level.as_str().to_string()),
            assigned_by: Set(assigner_id),
            ..Default::default()
        };

        let assignment = assignment.insert(&db).await?;
        Ok(assignment)
    }

    /// Delete a document assignment (hard delete - revoke access)
    async fn delete_document_assignment(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;

        let result = crate::models::documents::document_assignment::Entity::delete_by_id(id)
            .exec(&db)
            .await?;

        Ok(result.rows_affected > 0)
    }

    /// Create a document access log entry (audit trail)
    async fn create_document_access_log(
        &self,
        ctx: &Context<'_>,
        input: CreateDocumentAccessLogInput,
    ) -> Result<DocumentAccessLog> {
        let db = get_db_from_context(ctx)?;

        let log = crate::models::documents::document_access_log::ActiveModel {
            document_id: Set(input.document_id),
            user_id: Set(input.user_id),
            access_type: Set(input.access_type.as_str().to_string()),
            ip_address: Set(input.ip_address.clone()),
            ..Default::default()
        };

        let log = log.insert(&db).await?;

        // Return the SeaORM model directly
        Ok(log)
    }

    /// Create an encrypted file storage record
    async fn create_encrypted_file_storage(
        &self,
        ctx: &Context<'_>,
        input: CreateEncryptedFileStorageInput,
    ) -> Result<EncryptedFileStorage> {
        let db = get_db_from_context(ctx)?;

        let storage = crate::models::documents::encrypted_file_storage::ActiveModel {
            id: Set(uuid::Uuid::new_v4()),
            document_id: Set(input.document_id),
            encrypted_data: Set(vec![]),  // TODO: This mutation needs to be updated to accept encrypted data
            encryption_key_id: Set(input.encryption_key_id),
            iv: Set(vec![]),  // TODO: This mutation needs to be updated to accept IV
            created_at: Set(Utc::now()),
        };

        let storage = storage.insert(&db).await?;

        // Return the inserted model directly
        Ok(storage)
    }

    // ============================================================
    // NEW MODELS - Time Domain Mutations
    // ============================================================

    // TODO: Implement time-off policy mutations when SeaORM entities are available
    // /// Create a new time-off policy
    // async fn create_time_off_policy(
    //     &self,
    //     ctx: &Context<'_>,
    //     input: CreateTimeOffPolicyInput,
    // ) -> Result<TimeOffPolicy> {
    //     let db = get_db_from_context(ctx)?;
    //
    //     let policy = crate::models::time_off_policy::ActiveModel {
    //         policy_name: Set(input.policy_name.clone()),
    //         leave_type: Set(input.leave_type.clone()),
    //         accrual_rate: Set(input.accrual_rate),
    //         max_balance: Set(input.max_balance),
    //         carryover_limit: Set(input.carryover_limit),
    //         effective_date: Set(input.effective_date),
    //         ..Default::default()
    //     };
    //
    //     let policy = policy.insert(&db).await?;
    //
    //     // Convert SeaORM model to legacy TimeOffPolicy struct for compatibility
    //     let policy = TimeOffPolicy {
    //         id: policy.id,
    //         policy_name: policy.policy_name,
    //         leave_type: policy.leave_type,
    //         accrual_rate: policy.accrual_rate,
    //         max_balance: policy.max_balance,
    //         carryover_limit: policy.carryover_limit,
    //         effective_date: policy.effective_date,
    //         created_at: policy.created_at,
    //         updated_at: policy.updated_at,
    //     };
    //
    //     Ok(policy)
    // }

    // /// Update an existing time-off policy
    // async fn update_time_off_policy(
    //     &self,
    //     ctx: &Context<'_>,
    //     id: Uuid,
    //     input: UpdateTimeOffPolicyInput,
    // ) -> Result<TimeOffPolicy> {
    //     let db = get_db_from_context(ctx)?;
    //
    //     // Find existing time-off policy
    //     let existing_policy = crate::models::time_off_policy::Entity::find_by_id(id)
    //         .one(&db)
    //         .await?
    //         .ok_or_else(|| AppError::NotFound("Time-off policy not found".to_string()))?;
    //
    //     // Build active model with updates
    //     let mut policy: crate::models::time_off_policy::ActiveModel = existing_policy.into();
    //
    //     if let Some(policy_name) = input.policy_name {
    //         policy.policy_name = Set(policy_name);
    //     }
    //
    //     if let Some(leave_type) = input.leave_type {
    //         policy.leave_type = Set(leave_type);
    //     }
    //
    //     if let Some(accrual_rate) = input.accrual_rate {
    //         policy.accrual_rate = Set(accrual_rate);
    //     }
    //
    //     if let Some(max_balance) = input.max_balance {
    //         policy.max_balance = Set(max_balance);
    //     }
    //
    //     if let Some(carryover_limit) = input.carryover_limit {
    //         policy.carryover_limit = Set(carryover_limit);
    //     }
    //
    //     if let Some(effective_date) = input.effective_date {
    //         policy.effective_date = Set(effective_date);
    //     }
    //
    //     // Update timestamp
    //     policy.updated_at = Set(Utc::now());
    //
    //     // Save changes
    //     let updated_policy = policy.update(&db).await?;
    //
    //     // Convert to legacy TimeOffPolicy struct for compatibility
    //     let policy = TimeOffPolicy {
    //         id: updated_policy.id,
    //         policy_name: updated_policy.policy_name,
    //         leave_type: updated_policy.leave_type,
    //         accrual_rate: updated_policy.accrual_rate,
    //         max_balance: updated_policy.max_balance,
    //         carryover_limit: updated_policy.carryover_limit,
    //         effective_date: updated_policy.effective_date,
    //         created_at: updated_policy.created_at,
    //         updated_at: updated_policy.updated_at,
    //     };
    //
    //     Ok(policy)
    // }

    // /// Delete a time-off policy (hard delete)
    // async fn delete_time_off_policy(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
    //     let db = get_db_from_context(ctx)?;
    //
    //     let result = crate::models::time_off_policy::Entity::delete_by_id(id)
    //         .exec(db)
    //         .await?;
    //
    //     Ok(result.rows_affected > 0)
    // }

    /// Create a new attendance record
    async fn create_attendance_record(
        &self,
        ctx: &Context<'_>,
        input: CreateAttendanceRecordInput,
    ) -> Result<AttendanceRecord> {
        let db = get_db_from_context(ctx)?;

        let record = crate::models::time::attendance_record::ActiveModel {
            user_id: Set(input.user_id),
            date: Set(input.date),
            clock_in: Set(input.clock_in),
            clock_out: Set(input.clock_out),
            hours_worked: Set(input.hours_worked.and_then(rust_decimal::Decimal::from_f64_retain)),
            status: Set(input.status.as_str().to_string()),
            notes: Set(input.notes.clone()),
            ..Default::default()
        };

        let record = record.insert(&db).await?;
        Ok(record)
    }

    /// Update an existing attendance record
    async fn update_attendance_record(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateAttendanceRecordInput,
    ) -> Result<AttendanceRecord> {
        let db = get_db_from_context(ctx)?;

        // Find existing attendance record
        let existing_record = crate::models::time::attendance_record::Entity::find_by_id(id)
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Attendance record not found".to_string()))?;

        // Build active model with updates
        let mut record: crate::models::time::attendance_record::ActiveModel = existing_record.into();

        if let Some(clock_in) = input.clock_in {
            record.clock_in = Set(Some(clock_in));
        }

        if let Some(clock_out) = input.clock_out {
            record.clock_out = Set(Some(clock_out));
        }

        if let Some(hours_worked) = input.hours_worked {
            record.hours_worked = Set(rust_decimal::Decimal::from_f64_retain(hours_worked));
        }

        if let Some(status) = input.status {
            record.status = Set(status.as_str().to_string());
        }

        if let Some(notes) = input.notes {
            record.notes = Set(Some(notes));
        }

        // Update timestamp
        record.updated_at = Set(Utc::now());

        // Save changes
        let updated_record = record.update(&db).await?;
        Ok(updated_record)
    }

    /// Delete an attendance record (hard delete)
    async fn delete_attendance_record(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;

        let result = crate::models::time::attendance_record::Entity::delete_by_id(id)
            .exec(&db)
            .await?;

        Ok(result.rows_affected > 0)
    }

    // ===== System Domain Mutations =====

    /// Create a new activity log entry (audit trail)
    async fn create_activity_log(
        &self,
        ctx: &Context<'_>,
        input: CreateActivityLogInput,
    ) -> Result<ActivityLog> {
        let db = get_db_from_context(ctx)?;

        // Parse details JSON string if provided
        let details_json = if let Some(details) = &input.details {
            Some(serde_json::from_str::<serde_json::Value>(details)?)
        } else {
            None
        };

        let log = crate::models::system::activity_log::ActiveModel {
            user_id: Set(input.user_id),
            employee_id: Set(input.employee_id),
            action: Set(input.action.clone()),
            resource_type: Set(input.resource_type.clone()),
            resource_id: Set(input.resource_id),
            details: Set(details_json),
            ..Default::default()
        };

        let log = log.insert(&db).await?;
        Ok(log)
    }

    /// Create a new compensation band
    async fn create_compensation_band(
        &self,
        ctx: &Context<'_>,
        input: CreateCompensationBandInput,
    ) -> Result<CompensationBand> {
        let db = get_db_from_context(ctx)?;

        let band = crate::models::system::compensation_band::ActiveModel {
            band_name: Set(input.band_name.clone()),
            min_salary: Set(input.min_salary),
            max_salary: Set(input.max_salary),
            currency: Set(input.currency.clone()),
            ..Default::default()
        };

        let band = band.insert(&db).await?;
        Ok(band)
    }

    /// Update a compensation band
    async fn update_compensation_band(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateCompensationBandInput,
    ) -> Result<CompensationBand> {
        let db = get_db_from_context(ctx)?;

        // Find existing compensation band
        let existing_band = crate::models::system::compensation_band::Entity::find_by_id(id)
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Compensation band not found".to_string()))?;

        // Build active model with updates
        let mut band: crate::models::system::compensation_band::ActiveModel = existing_band.into();

        if let Some(band_name) = input.band_name {
            band.band_name = Set(band_name);
        }

        if let Some(min_salary) = input.min_salary {
            band.min_salary = Set(min_salary);
        }

        if let Some(max_salary) = input.max_salary {
            band.max_salary = Set(max_salary);
        }

        if let Some(currency) = input.currency {
            band.currency = Set(currency);
        }

        // Update timestamp
        band.updated_at = Set(Utc::now());

        // Save changes
        let updated_band = band.update(&db).await?;
        Ok(updated_band)
    }

    /// Delete a compensation band (hard delete)
    async fn delete_compensation_band(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;

        let result = crate::models::system::compensation_band::Entity::delete_by_id(id)
            .exec(&db)
            .await?;

        Ok(result.rows_affected > 0)
    }

    /// Create a new HR report (generated report record)
    async fn create_hr_report(
        &self,
        ctx: &Context<'_>,
        input: CreateHRReportInput,
    ) -> Result<HRReport> {
        let db = get_db_from_context(ctx)?;

        // Parse parameters JSON string if provided
        let params_json = if let Some(params) = input.parameters {
            Some(serde_json::from_str::<serde_json::Value>(&params)?)
        } else {
            None
        };

        let report = crate::models::system::hr_report::ActiveModel {
            title: Set(input.title.clone()),
            report_type: Set(input.report_type.clone()),
            generated_by: Set(input.generated_by),
            parameters: Set(params_json),
            file_path: Set(input.file_path.clone()),
            ..Default::default()
        };

        let report = report.insert(&db).await?;

        Ok(report)
    }

    /// Create a new rollback request
    async fn create_rollback_request(
        &self,
        ctx: &Context<'_>,
        input: CreateRollbackRequestInput,
    ) -> Result<RollbackRequest> {
        let db = get_db_from_context(ctx)?;

        // Get user ID from context
        let user_id = ctx
            .data_opt::<UserContext>()
            .map(|uc| uc.user_id)
            .ok_or("User context not found - authentication required")?;

        let request = crate::models::system::rollback_request::ActiveModel {
            entity_type: Set(input.entity_type.clone()),
            entity_id: Set(input.entity_id),
            requested_by: Set(user_id),
            reason: Set(input.reason.clone()),
            status: Set("pending".to_string()),
            ..Default::default()
        };

        let request = request.insert(&db).await?;

        // Return the SeaORM Model directly (exported as RollbackRequest)
        Ok(request)
    }

    /// Update a rollback request (status changes)
    async fn update_rollback_request(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateRollbackRequestInput,
    ) -> Result<RollbackRequest> {
        let db = get_db_from_context(ctx)?;

        // Find existing rollback request
        let existing_request = crate::models::system::rollback_request::Entity::find_by_id(id)
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Rollback request not found".to_string()))?;

        // Build active model with updates
        let mut request: crate::models::system::rollback_request::ActiveModel = existing_request.into();

        if let Some(status) = input.status {
            request.status = Set(status.as_str().to_string());
            // If status is 'completed', set processed_at
            if status == RollbackStatus::Completed {
                request.processed_at = Set(Some(Utc::now()));
            }
        }

        if let Some(approved_by) = input.approved_by {
            request.approved_by = Set(Some(approved_by));
        }

        // Save changes
        let updated_request = request.update(&db).await?;

        // Return the SeaORM Model directly (exported as RollbackRequest)
        Ok(updated_request)
    }

    /// Create a new bulk rollback batch
    async fn create_bulk_rollback_batch(
        &self,
        ctx: &Context<'_>,
        input: CreateBulkRollbackBatchInput,
    ) -> Result<BulkRollbackBatch> {
        let db = get_db_from_context(ctx)?;

        let batch = crate::models::system::bulk_rollback_batch::ActiveModel {
            requested_by: Set(input.requested_by),
            total_items: Set(input.total_items),
            processed_items: Set(0),
            status: Set("pending".to_string()),
            ..Default::default()
        };

        let batch = batch.insert(&db).await?;

        // Return the SeaORM Model directly (exported as BulkRollbackBatch)
        Ok(batch)
    }

    /// Update a bulk rollback batch (progress/status)
    async fn update_bulk_rollback_batch(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateBulkRollbackBatchInput,
    ) -> Result<BulkRollbackBatch> {
        let db = get_db_from_context(ctx)?;

        // Find existing bulk rollback batch
        let existing_batch = crate::models::system::bulk_rollback_batch::Entity::find_by_id(id)
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Bulk rollback batch not found".to_string()))?;

        // Build active model with updates
        let mut batch: crate::models::system::bulk_rollback_batch::ActiveModel = existing_batch.into();

        if let Some(processed_items) = input.processed_items {
            batch.processed_items = Set(processed_items);
        }

        if let Some(status) = input.status {
            batch.status = Set(status.clone());
            // If status is 'completed' or 'failed', set completed_at
            if status == "completed" || status == "failed" {
                batch.completed_at = Set(Some(Utc::now()));
            }
        }

        // Save changes
        let updated_batch = batch.update(&db).await?;

        // Return the SeaORM Model directly (exported as BulkRollbackBatch)
        Ok(updated_batch)
    }

    /// Create a new bulk rollback item
    async fn create_bulk_rollback_item(
        &self,
        ctx: &Context<'_>,
        input: CreateBulkRollbackItemInput,
    ) -> Result<BulkRollbackItem> {
        let db = get_db_from_context(ctx)?;

        let item = crate::models::system::bulk_rollback_item::ActiveModel {
            batch_id: Set(input.batch_id),
            resource_type: Set(input.resource_type.clone()),
            resource_id: Set(input.resource_id),
            rollback_to_timestamp: Set(input.rollback_to_timestamp),
            status: Set("pending".to_string()),
            ..Default::default()
        };

        let item = item.insert(&db).await?;
        Ok(item)
    }

    /// Update a bulk rollback item (status)
    async fn update_bulk_rollback_item(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateBulkRollbackItemInput,
    ) -> Result<BulkRollbackItem> {
        let db = get_db_from_context(ctx)?;

        // Find existing bulk rollback item
        let existing_item = crate::models::system::bulk_rollback_item::Entity::find_by_id(id)
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Bulk rollback item not found".to_string()))?;

        // Build active model with updates
        let mut item: crate::models::system::bulk_rollback_item::ActiveModel = existing_item.into();

        if let Some(status) = input.status {
            item.status = Set(status.clone());
            // If status is 'completed' or 'failed', set completed_at
            if status == "completed" || status == "failed" {
                item.completed_at = Set(Some(Utc::now()));
            }
        }

        if let Some(error_message) = input.error_message {
            item.error_message = Set(Some(error_message));
        }

        // Save changes
        let updated_item = item.update(&db).await?;
        Ok(updated_item)
    }

    /// Create a new payroll record (immutable record)
    async fn create_payroll_record(
        &self,
        ctx: &Context<'_>,
        input: CreatePayrollRecordInput,
    ) -> Result<PayrollRecord> {
        let db = get_db_from_context(ctx)?;

        // Parse deductions JSON string if provided
        let deductions_json = if let Some(deductions) = &input.deductions {
            Some(serde_json::from_str::<serde_json::Value>(deductions)?)
        } else {
            None
        };

        let bonuses_json = if let Some(bonuses) = &input.bonuses {
            Some(serde_json::from_str::<serde_json::Value>(bonuses)?)
        } else {
            None
        };

        let record = crate::models::system::payroll_record::ActiveModel {
            employee_id: Set(input.employee_id),
            pay_period_start: Set(input.pay_period_start),
            pay_period_end: Set(input.pay_period_end),
            gross_pay: Set(input.gross_pay),
            net_pay: Set(input.net_pay),
            deductions: Set(deductions_json),
            bonuses: Set(bonuses_json),
            processed_at: Set(Utc::now()),
            processor_id: Set(input.processor_id),
            ..Default::default()
        };

        let record = record.insert(&db).await?;
        Ok(record)
    }

    /// Create a new encryption key (security - create only)
    async fn create_encryption_key(
        &self,
        ctx: &Context<'_>,
        input: CreateEncryptionKeyInput,
    ) -> Result<crate::models::system::encryption_key::Model> {
        use base64::{Engine as _, engine::general_purpose};

        let db = get_db_from_context(ctx)?;

        // Get user ID from authenticated context (security - don't trust client input)
        let user_context = ctx
            .data_opt::<UserContext>()
            .ok_or_else(|| AppError::Authentication("Authentication required".to_string()))?;
        let user_id = user_context.user_id;

        // Decode base64 encrypted key data to raw bytes
        let raw_key_bytes = general_purpose::STANDARD
            .decode(&input.encrypted_key)
            .map_err(|e| AppError::Validation(format!("Invalid base64 encrypted key: {}", e)))?;

        // Call pgcrypto function to encrypt the key data server-side
        use sea_orm::FromQueryResult;
        use crate::error::DbError;
        #[derive(FromQueryResult)]
        struct EncryptedResult {
            encrypt_key_data: Vec<u8>,
        }

        let result = EncryptedResult::find_by_statement(sea_orm::Statement::from_sql_and_values(
            sea_orm::DatabaseBackend::Postgres,
            "SELECT hr_public.encrypt_key_data($1, $2) as encrypt_key_data",
            vec![
                sea_orm::Value::Bytes(Some(Box::new(raw_key_bytes))),
                sea_orm::Value::String(Some(Box::new(input.key_name.clone()))),
            ]
        ))
        .one(&db)
        .await
        .map_err(|e| AppError::Database(DbError::Query(e.to_string())))?
        .ok_or_else(|| AppError::Database(DbError::Query("Failed to encrypt key data".to_string())))?;

        // Create the encryption key record with encrypted data
        let key = crate::models::system::encryption_key::ActiveModel {
            key_name: Set(input.key_name.clone()),
            algorithm: Set(input.algorithm.clone()),
            encrypted_key: Set(result.encrypt_key_data),
            user_id: Set(user_id),
            active: Set(true),
            ..Default::default()
        };

        let key = key.insert(&db).await?;

        Ok(key)
    }

    /// Update system settings by category (requires system_settings:write permission)
    #[graphql(guard = "crate::middleware::guards::RequirePermission::new(\"system_settings:write\")")]
    async fn update_system_settings(
        &self,
        ctx: &Context<'_>,
        input: UpdateSystemSettingsInput,
    ) -> Result<SystemSettings> {
        let db = get_db_from_context(ctx)?;
        let user_ctx = ctx.data::<UserContext>()?;

        // Parse JSON string to JsonValue
        let settings_json: serde_json::Value = serde_json::from_str(&input.settings)
            .map_err(|e| async_graphql::Error::new(format!("Invalid JSON: {}", e)))?;

        // Update settings using the helper method
        let updated = crate::models::system::system_settings::Model::update_settings(
            &db,
            &input.category,
            settings_json,
            user_ctx.user_id,
        )
        .await?;

        Ok(updated)
    }

    // ===== Events Domain Mutations =====

    /// Create a new event comment
    async fn create_event_comment(
        &self,
        ctx: &Context<'_>,
        input: CreateEventCommentInput,
    ) -> Result<EventComment> {
        let db = get_db_from_context(ctx)?;

        let comment = crate::models::events::event_comment::ActiveModel {
            event_id: Set(input.event_id),
            user_id: Set(input.user_id),
            comment: Set(input.comment.clone()),
            ..Default::default()
        };

        let comment = comment.insert(&db).await?;
        Ok(comment)
    }

    /// Update an event comment
    async fn update_event_comment(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateEventCommentInput,
    ) -> Result<EventComment> {
        let db = get_db_from_context(ctx)?;

        // Find existing comment
        let existing_comment = crate::models::events::event_comment::Entity::find_by_id(id)
            .filter(crate::models::events::event_comment::Column::DeletedAt.is_null())
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Event comment not found".to_string()))?;

        // Build active model with updates
        let mut comment: crate::models::events::event_comment::ActiveModel = existing_comment.into();

        if let Some(comment_text) = input.comment {
            comment.comment = Set(comment_text);
        }

        // Update timestamp
        comment.updated_at = Set(Utc::now());

        // Save changes
        let updated_comment = comment.update(&db).await?;
        Ok(updated_comment)
    }

    /// Delete an event comment (soft delete)
    async fn delete_event_comment(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;

        // Find existing comment
        let existing_comment = crate::models::events::event_comment::Entity::find_by_id(id)
            .filter(crate::models::events::event_comment::Column::DeletedAt.is_null())
            .one(&db)
            .await?;

        if let Some(comment) = existing_comment {
            // Build active model for soft delete
            let mut comment: crate::models::events::event_comment::ActiveModel = comment.into();
            comment.deleted_at = Set(Some(Utc::now()));

            // Save changes
            comment.update(&db).await?;
            Ok(true)
        } else {
            Ok(false)
        }
    }

    /// Create a new event history entry (audit trail)
    async fn create_event_history(
        &self,
        ctx: &Context<'_>,
        input: CreateEventHistoryInput,
    ) -> Result<EventHistory> {
        let db = get_db_from_context(ctx)?;

        // Parse JSON string if provided
        let changes_json = if let Some(changes) = &input.changes {
            Some(serde_json::from_str::<serde_json::Value>(changes)?)
        } else {
            None
        };

        let history = crate::models::events::event_history::ActiveModel {
            event_id: Set(input.event_id),
            user_id: Set(input.user_id),
            action: Set(input.action.clone()),
            changes: Set(changes_json),
            ..Default::default()
        };

        let history = history.insert(&db).await?;
        Ok(history)
    }

    /// Create a new event waitlist entry
    async fn create_event_waitlist(
        &self,
        ctx: &Context<'_>,
        input: CreateEventWaitlistInput,
    ) -> Result<EventWaitlist> {
        let db = get_db_from_context(ctx)?;

        let waitlist = crate::models::events::event_waitlist::ActiveModel {
            event_id: Set(input.event_id),
            user_id: Set(input.user_id),
            position: Set(input.position),
            promoted: Set(false),
            ..Default::default()
        };

        let waitlist = waitlist.insert(&db).await?;
        Ok(waitlist)
    }

    /// Update an event waitlist entry (promotion)
    async fn update_event_waitlist(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateEventWaitlistInput,
    ) -> Result<EventWaitlist> {
        let db = get_db_from_context(ctx)?;

        // Find existing waitlist entry
        let existing_waitlist = crate::models::events::event_waitlist::Entity::find_by_id(id)
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Event waitlist entry not found".to_string()))?;

        // Build active model with updates
        let mut waitlist: crate::models::events::event_waitlist::ActiveModel = existing_waitlist.into();

        if let Some(promoted) = input.promoted {
            waitlist.promoted = Set(promoted);
            // If promoting, set promoted_at
            if promoted {
                waitlist.promoted_at = Set(Some(Utc::now()));
            }
        }

        // Save changes
        let updated_waitlist = waitlist.update(&db).await?;
        Ok(updated_waitlist)
    }

    /// Delete an event waitlist entry (hard delete)
    async fn delete_event_waitlist(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;

        let result = crate::models::events::event_waitlist::Entity::delete_by_id(id)
            .exec(&db)
            .await?;

        Ok(result.rows_affected > 0)
    }

    // ===== Tasks/Reviews Domain Mutations =====

    /// Create a new task type
    async fn create_task_type(
        &self,
        ctx: &Context<'_>,
        input: CreateTaskTypeInput,
    ) -> Result<TaskType> {
        let db = get_db_from_context(ctx)?;

        let task_type = crate::models::tasks::task_type::ActiveModel {
            name: Set(input.name.clone()),
            description: Set(input.description.clone()),
            default_priority: Set(input.default_priority.clone()),
            color_code: Set(input.color_code.clone()),
            is_active: Set(true),
            ..Default::default()
        };

        let task_type = task_type.insert(&db).await?;
        Ok(task_type)
    }

    /// Update a task type
    async fn update_task_type(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateTaskTypeInput,
    ) -> Result<TaskType> {
        let db = get_db_from_context(ctx)?;

        // Find existing task type
        let existing_task_type = crate::models::tasks::task_type::Entity::find_by_id(id)
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Task type not found".to_string()))?;

        // Build active model with updates
        let mut task_type: crate::models::tasks::task_type::ActiveModel = existing_task_type.into();

        if let Some(name) = input.name {
            task_type.name = Set(name);
        }
        if let Some(description) = input.description {
            task_type.description = Set(Some(description));
        }
        if let Some(default_priority) = input.default_priority {
            task_type.default_priority = Set(Some(default_priority));
        }
        if let Some(color_code) = input.color_code {
            task_type.color_code = Set(Some(color_code));
        }
        if let Some(is_active) = input.is_active {
            task_type.is_active = Set(is_active);
        }

        // Update timestamp
        task_type.updated_at = Set(Utc::now());

        // Save changes
        let updated_task_type = task_type.update(&db).await?;
        Ok(updated_task_type)
    }

    /// Delete a task type (soft delete by setting is_active = false)
    async fn delete_task_type(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;

        // Find existing task type
        let existing_task_type = crate::models::tasks::task_type::Entity::find_by_id(id)
            .one(&db)
            .await?;

        if let Some(task_type) = existing_task_type {
            // Build active model for soft delete
            let mut task_type: crate::models::tasks::task_type::ActiveModel = task_type.into();
            task_type.is_active = Set(false);
            task_type.updated_at = Set(Utc::now());

            // Save changes
            task_type.update(&db).await?;
            Ok(true)
        } else {
            Ok(false)
        }
    }

    /// Create a new review template
    async fn create_review_template(
        &self,
        ctx: &Context<'_>,
        input: CreateReviewTemplateInput,
    ) -> Result<ReviewTemplate> {
        let db = get_db_from_context(ctx)?;

        // Parse sections JSON string if provided
        let sections_json = if let Some(sections) = &input.sections {
            Some(serde_json::from_str::<serde_json::Value>(sections)?)
        } else {
            None
        };

        let template = crate::models::reviews::review_template::ActiveModel {
            name: Set(input.name.clone()),
            description: Set(input.description.clone()),
            sections: Set(sections_json),
            is_active: Set(true),
            created_by_id: Set(input.created_by_id),
            ..Default::default()
        };

        let template = template.insert(&db).await?;
        Ok(template)
    }

    /// Update a review template
    async fn update_review_template(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateReviewTemplateInput,
    ) -> Result<ReviewTemplate> {
        let db = get_db_from_context(ctx)?;

        // Find existing review template
        let existing_template = crate::models::reviews::review_template::Entity::find_by_id(id)
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Review template not found".to_string()))?;

        // Build active model with updates
        let mut template: crate::models::reviews::review_template::ActiveModel = existing_template.into();

        if let Some(name) = input.name {
            template.name = Set(name);
        }
        if let Some(description) = input.description {
            template.description = Set(Some(description));
        }
        if let Some(sections) = input.sections {
            let sections_json = serde_json::from_str::<serde_json::Value>(&sections)?;
            template.sections = Set(Some(sections_json));
        }
        if let Some(is_active) = input.is_active {
            template.is_active = Set(is_active);
        }

        // Update timestamp
        template.updated_at = Set(Utc::now());

        // Save changes
        let updated_template = template.update(&db).await?;
        Ok(updated_template)
    }

    /// Delete a review template (soft delete by setting is_active = false)
    async fn delete_review_template(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;

        // Find existing review template
        let existing_template = crate::models::reviews::review_template::Entity::find_by_id(id)
            .one(&db)
            .await?;

        if let Some(template) = existing_template {
            // Build active model for soft delete
            let mut template: crate::models::reviews::review_template::ActiveModel = template.into();
            template.is_active = Set(false);
            template.updated_at = Set(Utc::now());

            // Save changes
            template.update(&db).await?;
            Ok(true)
        } else {
            Ok(false)
        }
    }

    // ============================================================================
    // USER ADDRESS MUTATIONS
    // ============================================================================

    /// Create a new user address
    async fn create_user_address(
        &self,
        ctx: &Context<'_>,
        input: crate::models::employee::user_address::CreateUserAddressInput,
    ) -> Result<crate::models::employee::user_address::Model> {
        let db = get_db_from_context(ctx)?;

        // If this is marked as primary, unset any existing primary addresses for this user
        if input.is_primary {
            crate::models::employee::user_address::Entity::update_many()
                .filter(crate::models::employee::user_address::Column::UserId.eq(input.user_id))
                .filter(crate::models::employee::user_address::Column::IsPrimary.eq(true))
                .filter(crate::models::employee::user_address::Column::DeletedAt.is_null())
                .col_expr(
                    crate::models::employee::user_address::Column::IsPrimary,
                    Expr::value(false),
                )
                .exec(&db)
                .await?;
        }

        // Create new address
        let address = crate::models::employee::user_address::ActiveModel {
            user_id: Set(input.user_id),
            address_type: Set(input.address_type),
            is_primary: Set(input.is_primary),
            address_line1: Set(input.address_line1),
            address_line2: Set(input.address_line2),
            city: Set(input.city),
            state_province: Set(input.state_province),
            postal_code: Set(input.postal_code),
            country: Set(input.country),
            latitude: Set(input.latitude),
            longitude: Set(input.longitude),
            created_at: Set(Utc::now()),
            updated_at: Set(Utc::now()),
            ..Default::default()
        };

        let address = address.insert(&db).await?;
        Ok(address)
    }

    /// Update an existing user address
    async fn update_user_address(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: crate::models::employee::user_address::UpdateUserAddressInput,
    ) -> Result<crate::models::employee::user_address::Model> {
        let db = get_db_from_context(ctx)?;

        // Find existing address
        let existing_address = crate::models::employee::user_address::Entity::find_by_id(id)
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Address not found".to_string()))?;

        // If setting this as primary, unset any existing primary addresses for this user
        if let Some(true) = input.is_primary {
            crate::models::employee::user_address::Entity::update_many()
                .filter(crate::models::employee::user_address::Column::UserId.eq(existing_address.user_id))
                .filter(crate::models::employee::user_address::Column::IsPrimary.eq(true))
                .filter(crate::models::employee::user_address::Column::DeletedAt.is_null())
                .filter(crate::models::employee::user_address::Column::Id.ne(id))
                .col_expr(
                    crate::models::employee::user_address::Column::IsPrimary,
                    Expr::value(false),
                )
                .exec(&db)
                .await?;
        }

        // Build active model for update
        let mut address: crate::models::employee::user_address::ActiveModel = existing_address.into();

        // Update fields if provided
        if let Some(address_type) = input.address_type {
            address.address_type = Set(address_type);
        }
        if let Some(is_primary) = input.is_primary {
            address.is_primary = Set(is_primary);
        }
        if let Some(address_line1) = input.address_line1 {
            address.address_line1 = Set(address_line1);
        }
        if let Some(address_line2) = input.address_line2 {
            address.address_line2 = Set(Some(address_line2));
        }
        if let Some(city) = input.city {
            address.city = Set(city);
        }
        if let Some(state_province) = input.state_province {
            address.state_province = Set(state_province);
        }
        if let Some(postal_code) = input.postal_code {
            address.postal_code = Set(postal_code);
        }
        if let Some(country) = input.country {
            address.country = Set(country);
        }
        if let Some(latitude) = input.latitude {
            address.latitude = Set(Some(latitude));
        }
        if let Some(longitude) = input.longitude {
            address.longitude = Set(Some(longitude));
        }

        // Update timestamp
        address.updated_at = Set(Utc::now());

        // Save changes
        let updated_address = address.update(&db).await?;
        Ok(updated_address)
    }

    /// Delete a user address (soft delete)
    async fn delete_user_address(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;

        // Find existing address
        let existing_address = crate::models::employee::user_address::Entity::find_by_id(id)
            .one(&db)
            .await?;

        if let Some(address) = existing_address {
            // Build active model for soft delete
            let mut address: crate::models::employee::user_address::ActiveModel = address.into();
            address.deleted_at = Set(Some(Utc::now()));
            address.updated_at = Set(Utc::now());

            // Save changes
            address.update(&db).await?;
            Ok(true)
        } else {
            Ok(false)
        }
    }

    /// Upload a document with encrypted data and create assignments
    async fn upload_document(
        &self,
        ctx: &Context<'_>,
        input: UploadDocumentInput,
    ) -> Result<crate::models::documents::document::Model> {
        let db = get_db_from_context(ctx)?;
        let auth_session = ctx.data::<AuthSession<crate::auth::AuthBackend>>()?;
        let user = auth_session.user.as_ref().ok_or_else(|| AppError::Authentication("Not authenticated".to_string()))?;

        // Start transaction for atomic operation
        let txn = db.begin().await?;

        // Generate storage path
        let storage_path = format!("{}/{}", user.id, uuid::Uuid::new_v4());

        // Decode base64 encrypted data
        use base64::{Engine as _, engine::general_purpose};
        let encrypted_data = general_purpose::STANDARD.decode(&input.encrypted_data)
            .map_err(|_| AppError::Validation("Invalid base64 encrypted data".to_string()))?;

        // Prepend IV to encrypted data (standard AES-GCM practice)
        let mut file_data = input.iv.clone();
        file_data.extend_from_slice(&encrypted_data);

        // Create document record
        let document = crate::models::documents::document::ActiveModel {
            id: Set(uuid::Uuid::new_v4()),
            title: Set(input.filename.clone()),
            description: Set(None),
            category_id: Set(None), // TODO: Map category string to ID
            uploader_id: Set(user.id),
            file_path: Set(storage_path.clone()),
            file_size: Set(input.file_size_bytes),
            mime_type: Set(format!("application/{}", input.file_type.to_lowercase())),
            access_level: Set(input.sensitivity_level.unwrap_or_else(|| "Internal".to_string())),
            is_encrypted: Set(true),
            expiry_date: Set(input.expiration_date),
            version_number: Set(1),
            ..Default::default()
        };

        let document = document.insert(&txn).await?;

        // Store encrypted file data
        let file_storage = crate::models::documents::encrypted_file_storage::ActiveModel {
            id: Set(uuid::Uuid::new_v4()),
            document_id: Set(document.id),
            encrypted_data: Set(file_data),  // Combined IV + encrypted data
            encryption_key_id: Set(input.encryption_key_id),
            iv: Set(input.iv),  // Store IV separately for reference
            created_at: Set(Utc::now()),
        };

        file_storage.insert(&txn).await?;

        // Create assignments if specified
        if let Some(employee_ids) = &input.assign_to_employees {
            for employee_id in employee_ids {
                let assignment = crate::models::documents::document_assignment::ActiveModel {
                    id: Set(uuid::Uuid::new_v4()),
                    document_id: Set(document.id),
                    user_id: Set(Some(*employee_id)),
                    department_id: Set(None),
                    access_level: Set("read".to_string()),
                    assigned_by: Set(user.id),
                    ..Default::default()
                };
                assignment.insert(&txn).await?;
            }
        }

        // Create department assignments if specified
        if let Some(department_ids) = &input.assign_to_departments {
            for department_id in department_ids {
                let assignment = crate::models::documents::document_assignment::ActiveModel {
                    id: Set(uuid::Uuid::new_v4()),
                    document_id: Set(document.id),
                    user_id: Set(None),
                    department_id: Set(Some(*department_id)),
                    access_level: Set("read".to_string()),
                    assigned_by: Set(user.id),
                    ..Default::default()
                };
                assignment.insert(&txn).await?;
            }
        }

        // Log upload in audit trail (accessed_at is None for uploads)
        let audit_log = crate::models::documents::document_access_log::ActiveModel {
            id: Set(uuid::Uuid::new_v4()),
            document_id: Set(document.id),
            user_id: Set(user.id),
            access_type: Set("upload".to_string()),
            accessed_at: Set(None), // Only set when document is actually accessed (view/download)
            ip_address: Set(None), // TODO: Get from request
            ..Default::default()
        };
        audit_log.insert(&txn).await?;

        // Commit transaction
        txn.commit().await?;

        Ok(document)
    }

    // ============================================================
    // Department Mutations (Flat structure)
    // ============================================================

    /// Create a new department
    async fn create_department(
        &self,
        ctx: &Context<'_>,
        input: CreateDepartmentInput,
    ) -> Result<Department> {
        let db = get_db_from_context(ctx)?;

        let department = crate::models::department::ActiveModel {
            name: Set(input.name.clone()),
            description: Set(input.description.clone()),
            manager_id: Set(input.manager_id),
            ..Default::default()
        };

        let department = department.insert(&db).await?;
        Ok(department)
    }

    /// Update an existing department
    async fn update_department(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateDepartmentInput,
    ) -> Result<Department> {
        let db = get_db_from_context(ctx)?;

        // Find existing department
        let existing_dept = crate::models::department::Entity::find_by_id(id)
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Department not found".to_string()))?;

        // Build active model with updates
        let mut dept: crate::models::department::ActiveModel = existing_dept.into();

        if let Some(name) = input.name {
            dept.name = Set(name);
        }

        if let Some(description) = input.description {
            dept.description = Set(Some(description));
        }

        if let Some(manager_id) = input.manager_id {
            dept.manager_id = Set(Some(manager_id));
        }

        // Update timestamp
        dept.updated_at = Set(Utc::now());

        // Save changes
        let updated_dept = dept.update(&db).await?;
        Ok(updated_dept)
    }

    /// Soft delete a department (sets deleted_at timestamp)
    async fn delete_department(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;

        // Find the department first to ensure it exists
        let dept = crate::models::department::Entity::find_by_id(id)
            .filter(crate::models::department::Column::DeletedAt.is_null())
            .one(&db)
            .await?;

        if dept.is_none() {
            return Ok(false);
        }

        // Soft delete by setting deleted_at
        let mut dept: crate::models::department::ActiveModel = dept.unwrap().into();
        dept.deleted_at = Set(Some(Utc::now()));

        dept.update(&db).await?;

        Ok(true)
    }

    /// Authentication operations (login, logout, refresh)
    async fn auth(&self) -> AuthMutations {
        AuthMutations
    }

    /// Training mutations
    async fn training(&self) -> TrainingMutations {
        TrainingMutations
    }

    /// Onboarding mutations
    async fn onboarding(&self) -> OnboardingMutations {
        OnboardingMutations
    }

    /// User mutations (existing)
    async fn users(&self) -> UserMutations {
        UserMutations
    }

    /// Department mutations
    async fn departments(&self) -> DepartmentMutations {
        DepartmentMutations
    }

    /// Task mutations
    async fn tasks(&self) -> TaskMutations {
        TaskMutations
    }

    /// RBAC mutations - roles, permissions, and assignments
    async fn rbac(&self) -> RbacMutations {
        RbacMutations
    }

    /// Time and attendance operations
    async fn time(&self) -> TimeMutations {
        TimeMutations
    }

    /// Employee data operations (certifications, goals, skills, contacts, vehicles)
    async fn employee(&self) -> EmployeeMutations {
        EmployeeMutations
    }

    /// Rollback execution and snapshot operations
    async fn rollback(&self) -> crate::schema::mutations::RollbackMutations {
        crate::schema::mutations::RollbackMutations
    }

    /// Employee import operations (CSV upload, mapping, commit)
    async fn employee_import(&self) -> EmployeeImportMutations {
        EmployeeImportMutations
    }
}
