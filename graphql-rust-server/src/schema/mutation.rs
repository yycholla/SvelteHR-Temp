use async_graphql::{Context, Object, Result, SimpleObject};
use axum_login::{AuthSession, AuthnBackend};
use chrono::Utc;
use sea_orm::{DatabaseConnection, EntityTrait, Set, ActiveModelTrait, QueryFilter, ColumnTrait};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{
    auth::{context::UserContext, AuthBackend, Credentials, AuthUser},
    database::get_db_from_context,
    error::AppError,
    models::{
        generated::prelude::*,
        task_audit_entry,
        ApproveLeaveRequestInput, AssignRoleInput, AssignTaskInput, AssigneeRole, AuditAction,
        ChangeTaskStatusInput, CreateDepartmentInput, CreateEventAttendeeInput, CreateEventInput,
        CreateLeaveBalanceInput, CreateLeaveRequestInput, CreateLeaveTypeInput,
        CreateLinkedResourceInput, CreatePerformanceReviewInput, CreatePermissionInput,
        CreateReviewCycleInput, CreateReviewFeedbackInput, CreateReviewGoalInput, CreateRoleInput,
        CreateTaskDependencyInput, CreateTaskInput, CreateUserInput, Department, DependencyType, Event,
        EventAttendee, FeedbackType, LeaveBalance, LeaveRequest, LeaveRequestStatus, LeaveType, LinkedResource,
        PerformanceReview, PerformanceReviewStatus, Permission, RejectLeaveRequestInput, ResourceType, ReviewCycle, ReviewCycleStatus, ReviewFeedback,
        ReviewGoal, GoalCompletionStatus, ReviewType, Role, RsvpStatus, Task, TaskAssignee, TaskAuditEntry, TaskDependency,
        TaskPriority, TaskStatus, UpdateDepartmentInput, UpdateEventAttendeeInput, UpdateEventInput,
        UpdateLeaveBalanceInput, UpdateLeaveRequestInput, UpdateLeaveTypeInput,
        UpdateLinkedResourceInput, UpdatePerformanceReviewInput, UpdatePermissionInput,
        UpdateReviewCycleInput, UpdateReviewFeedbackInput, UpdateReviewGoalInput, UpdateRoleInput,
        UpdateTaskAssigneeInput, UpdateTaskDependencyInput, UpdateTaskInput, UpdateUserInput, User,
        UserRoleAssignment, UserStatus,
        // Employee domain new models
        CreateEmployeeCertificationInput, CreateEmployeeGoalInput, CreateEmployeeSkillInput,
        CreateEmployeeVehicleInput, CreateEmergencyContactInput, EmergencyContact,
        EmployeeCertification, EmployeeGoal, EmployeeSkill, EmployeeVehicle, GoalStatus,
        ProficiencyLevel, UpdateEmployeeGoalInput, UpdateEmployeeSkillInput,
        UpdateEmployeeVehicleInput, UpdateEmergencyContactInput,
        // Documents domain
        CreateDocumentAccessLogInput, CreateDocumentAssignmentInput, CreateDocumentCategoryInput,
        CreateDocumentInput, CreateDocumentVersionInput, CreateEncryptedFileStorageInput, Document,
        DocumentAccessLevel, DocumentAccessLog, DocumentAccessType, DocumentAssignment,
        DocumentCategory, DocumentVersion, EncryptedFileStorage, UpdateDocumentCategoryInput,
        UpdateDocumentInput,
        // Time domain
        AttendanceRecord, AttendanceStatus, CreateAttendanceRecordInput, CreateTimeOffPolicyInput,
        TimeOffPolicy, UpdateAttendanceRecordInput, UpdateTimeOffPolicyInput,
        // System domain
        ActivityLog, BulkRollbackBatch, BulkRollbackItem, CompensationBand,
        CreateActivityLogInput, CreateBulkRollbackBatchInput, CreateBulkRollbackItemInput,
        CreateCompensationBandInput, CreateEncryptionKeyInput, CreateHRReportInput,
        CreatePayrollRecordInput, CreateRollbackRequestInput, EncryptionKey, HRReport, PayrollRecord,
        RollbackRequest, RollbackRequestCondition, RollbackRequestsConnection, RollbackRequestsOrderBy, RollbackStatus,
        SystemSettings, UpdateBulkRollbackBatchInput, UpdateBulkRollbackItemInput, UpdateSystemSettingsInput,
        UpdateCompensationBandInput, UpdateRollbackRequestInput,
        // Events domain (new models)
        CreateEventCommentInput, CreateEventHistoryInput, CreateEventWaitlistInput, EventComment,
        EventHistory, EventWaitlist, UpdateEventCommentInput, UpdateEventWaitlistInput,
        // Tasks domain
        CreateTaskTypeInput, TaskType, UpdateTaskTypeInput,
        // Reviews domain
        CreateReviewTemplateInput, ReviewTemplate, UpdateReviewTemplateInput,
    },
};



/// User information returned by login
#[derive(SimpleObject)]
pub struct UserInfo {
    pub id: String,
    pub email: String,
    pub role: String,
    pub is_active: bool,
}

/// Refresh session response
#[derive(SimpleObject)]
pub struct RefreshSessionResponse {
    pub success: bool,
    pub session_expires_at: Option<String>,
    pub message: String,
}

/// Authentication result for successful login
#[derive(SimpleObject)]
pub struct AuthResult {
    pub user: UserInfo,
    pub session: AuthSessionInfo,
}

/// Session information
#[derive(SimpleObject)]
pub struct AuthSessionInfo {
    pub id: String,
    pub created_at: String,
    pub expires_at: String,
    pub last_activity: String,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
}

/// Authentication error
#[derive(SimpleObject)]
pub struct AuthError {
    pub code: String,
    pub message: String,
    pub retry_after: Option<i32>,
}

/// Logout result
#[derive(SimpleObject)]
pub struct LogoutResult {
    pub success: bool,
    pub message: String,
}

/// Login input for authentication
#[derive(async_graphql::InputObject)]
pub struct LoginInput {
    pub email: String,
    pub password: String,
}

/// Union type for authentication responses
#[derive(async_graphql::Union)]
pub enum AuthResponse {
    AuthResult(AuthResult),
    AuthError(AuthError),
}

pub struct MutationRoot;

#[Object]
impl MutationRoot {

    /// Login with email and password
    async fn login(&self, ctx: &Context<'_>, input: LoginInput) -> Result<AuthResponse> {
        let db = get_db_from_context(ctx)?;

        let creds = Credentials {
            email: input.email.clone(),
            password: input.password,
        };

        // For GraphQL login, we authenticate but don't create a session
        // The client should use the REST /auth/login endpoint to establish the session
        // This GraphQL mutation validates credentials and returns user info

        let auth_backend = AuthBackend::new(db.clone());
        match auth_backend.authenticate(creds).await {
            Ok(Some(user)) => {
                // Authentication successful - return user and session info
                // Note: This doesn't actually create a session - client must use REST endpoint
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
                };

                Ok(AuthResponse::AuthResult(AuthResult {
                    user: user_info,
                    session: session_info,
                }))
            }
            Ok(None) => {
                // Authentication failed
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
                // For GraphQL refresh, we return success but don't actually extend the session
                // The client should use the REST /auth/refresh endpoint to properly extend the session
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

        // Check if user is authenticated
        if auth_session.user.is_some() {
            // For GraphQL logout, we return success but don't actually destroy the session
            // The client should use the REST /auth/logout endpoint to properly destroy the session
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

        let attendee = attendee.insert(&db).await?;

        // Convert SeaORM model to legacy EventAttendee struct for compatibility
        let attendee = EventAttendee {
            id: attendee.id,
            event_id: attendee.event_id,
            employee_id: attendee.employee_id,
            response_status: attendee.response_status,
            is_required: attendee.is_required,
            created_at: attendee.created_at,
            reminder_time: attendee.reminder_time,
            scope: attendee.scope,
            is_organizer: attendee.is_organizer,
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

        // Convert to legacy EventAttendee struct for compatibility
        let attendee = EventAttendee {
            id: updated_attendee.id,
            event_id: updated_attendee.event_id,
            employee_id: updated_attendee.employee_id,
            response_status: updated_attendee.response_status,
            is_required: updated_attendee.is_required,
            created_at: updated_attendee.created_at,
            reminder_time: updated_attendee.reminder_time,
            scope: updated_attendee.scope,
            is_organizer: updated_attendee.is_organizer,
        };

        Ok(attendee)
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
    // User Mutations
    // ============================================================

    /// Create a new user
    async fn create_user(&self, ctx: &Context<'_>, input: CreateUserInput) -> Result<User> {
        let db = get_db_from_context(ctx)?;

        // Generate computed fields
        let display_name = format!("{} {}", input.first_name, input.last_name);
        let full_name = display_name.clone();

        // Create SeaORM active model
        let user = crate::models::user::ActiveModel {
            email: Set(input.email.clone()),
            first_name: Set(input.first_name.clone()),
            last_name: Set(input.last_name.clone()),
            display_name: Set(display_name.clone()),
            full_name: Set(full_name.clone()),
            role: Set("hr_employee".to_string()), // Default role
            phone_number: Set(input.phone.clone()),
            department_id: Set(input.department_id),
            manager_id: Set(input.manager_id),
            hire_date: Set(input.hire_date),
            status: Set(Some(input.status.as_str().to_string())),
            is_active: Set(true),
            ..Default::default()
        };

        let user = user.insert(&db).await?;

        // Convert SeaORM model to legacy User struct for compatibility
        let user = User {
            id: user.id,
            email: user.email,
            password_hash: user.password_hash,
            first_name: user.first_name,
            last_name: user.last_name,
            display_name: user.display_name,
            full_name: user.full_name,
            role: user.role,
            phone_number: user.phone_number,
            alternate_phone: user.alternate_phone,
            job_title: user.job_title,
            status: user.status,
            department_id: user.department_id,
            manager_id: user.manager_id,
            hire_date: user.hire_date,
            termination_date: user.termination_date,
            is_active: user.is_active,
            failed_login_attempts: user.failed_login_attempts,
            locked_until: user.locked_until,
            last_login: user.last_login,
            created_at: user.created_at,
            updated_at: user.updated_at,
            deleted_at: user.deleted_at,
        };

        Ok(user)
    }

    /// Update an existing user
    async fn update_user(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateUserInput,
    ) -> Result<User> {
        let db = get_db_from_context(ctx)?;

        // Find existing user
        let existing_user = crate::models::user::Entity::find_by_id(id)
            .filter(crate::models::user::Column::DeletedAt.is_null())
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

        // Store existing values for full_name calculation
        let existing_first_name = existing_user.first_name.clone();
        let existing_last_name = existing_user.last_name.clone();

        // Build active model with updates
        let mut user: crate::models::user::ActiveModel = existing_user.into();

        if let Some(email) = input.email {
            user.email = Set(email);
        }

        // Store references to avoid moving
        let new_first_name = input.first_name.as_ref();
        let new_last_name = input.last_name.as_ref();

        if let Some(first_name) = &input.first_name {
            user.first_name = Set(first_name.clone());
        }

        if let Some(last_name) = &input.last_name {
            user.last_name = Set(last_name.clone());
        }

        // Recalculate full_name if first or last name changed
        if new_first_name.is_some() || new_last_name.is_some() {
            let first_name = new_first_name.unwrap_or(&existing_first_name);
            let last_name = new_last_name.unwrap_or(&existing_last_name);
            let full_name = format!("{} {}", first_name, last_name);
            user.full_name = Set(full_name);
        }

        if let Some(phone) = input.phone {
            user.phone_number = Set(Some(phone));
        }

        if let Some(department_id) = input.department_id {
            user.department_id = Set(Some(department_id));
        }

        if let Some(manager_id) = input.manager_id {
            user.manager_id = Set(Some(manager_id));
        }

        if let Some(hire_date) = input.hire_date {
            user.hire_date = Set(Some(hire_date));
        }

        if let Some(termination_date) = input.termination_date {
            user.termination_date = Set(Some(termination_date));
        }

        if let Some(status) = input.status {
            user.status = Set(Some(status.as_str().to_string()));
        }

        // Update timestamp
        user.updated_at = Set(Utc::now());

        // Save changes
        let updated_user = user.update(&db).await?;

        // Convert to legacy User struct for compatibility
        let user = User {
            id: updated_user.id,
            email: updated_user.email,
            password_hash: updated_user.password_hash,
            first_name: updated_user.first_name,
            last_name: updated_user.last_name,
            display_name: updated_user.display_name,
            full_name: updated_user.full_name,
            role: updated_user.role,
            phone_number: updated_user.phone_number,
            alternate_phone: updated_user.alternate_phone,
            job_title: updated_user.job_title,
            status: updated_user.status,
            department_id: updated_user.department_id,
            manager_id: updated_user.manager_id,
            hire_date: updated_user.hire_date,
            termination_date: updated_user.termination_date,
            is_active: updated_user.is_active,
            failed_login_attempts: updated_user.failed_login_attempts,
            locked_until: updated_user.locked_until,
            last_login: updated_user.last_login,
            created_at: updated_user.created_at,
            updated_at: updated_user.updated_at,
            deleted_at: updated_user.deleted_at,
        };

        Ok(user)
    }

    /// Soft delete a user (sets deleted_at timestamp)
    async fn delete_user(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;

        // Find the user first to ensure it exists
        let user = crate::models::user::Entity::find_by_id(id)
            .filter(crate::models::user::Column::DeletedAt.is_null())
            .one(&db)
            .await?;

        if user.is_none() {
            return Ok(false);
        }

        // Soft delete by setting deleted_at
        let mut user: crate::models::user::ActiveModel = user.unwrap().into();
        user.deleted_at = Set(Some(Utc::now()));

        user.update(&db).await?;

        Ok(true)
    }

    // ============================================================
    // Department Mutations
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

        // Convert SeaORM model to legacy Department struct for compatibility
        let department = Department {
            id: department.id,
            name: department.name,
            description: department.description,
            parent_department_id: department.parent_department_id,
            manager_id: department.manager_id,
            created_at: department.created_at,
            updated_at: department.updated_at,
            deleted_at: department.deleted_at,
        };

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

        // Convert to legacy Department struct for compatibility
        let department = Department {
            id: updated_dept.id,
            name: updated_dept.name,
            description: updated_dept.description,
            parent_department_id: updated_dept.parent_department_id,
            manager_id: updated_dept.manager_id,
            created_at: updated_dept.created_at,
            updated_at: updated_dept.updated_at,
            deleted_at: updated_dept.deleted_at,
        };

        Ok(department)
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

        // Convert SeaORM model to legacy Role struct for compatibility
        let role = Role {
            id: role.id,
            name: role.name,
            description: role.description,
            level: role.level,
            created_at: role.created_at,
            updated_at: role.updated_at,
            deleted_at: role.deleted_at,
        };

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

        // Convert to legacy Role struct for compatibility
        let role = Role {
            id: updated_role.id,
            name: updated_role.name,
            description: updated_role.description,
            level: updated_role.level,
            created_at: updated_role.created_at,
            updated_at: updated_role.updated_at,
            deleted_at: updated_role.deleted_at,
        };

        Ok(role)
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

        // Convert SeaORM model to legacy Permission struct for compatibility
        let permission = Permission {
            id: permission.id,
            resource: permission.resource,
            action: permission.action,
            description: permission.description,
            created_at: permission.created_at,
            updated_at: permission.updated_at,
            deleted_at: permission.deleted_at,
        };

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

        // Convert to legacy Permission struct for compatibility
        let permission = Permission {
            id: updated_permission.id,
            resource: updated_permission.resource,
            action: updated_permission.action,
            description: updated_permission.description,
            created_at: updated_permission.created_at,
            updated_at: updated_permission.updated_at,
            deleted_at: updated_permission.deleted_at,
        };

        Ok(permission)
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
        let assigner_id = ctx.data_opt::<UserContext>().map(|uc| uc.user_id);

        let assignment = crate::models::user_role_assignment::ActiveModel {
            user_id: Set(input.user_id),
            role_id: Set(input.role_id),
            assigned_by: Set(assigner_id),
            assigned_at: Set(Utc::now()),
            ..Default::default()
        };

        let assignment = assignment.insert(&db).await?;

        // Convert SeaORM model to legacy UserRoleAssignment struct for compatibility
        let assignment = UserRoleAssignment {
            id: assignment.id,
            user_id: assignment.user_id,
            role_id: assignment.role_id,
            assigned_by: assignment.assigned_by,
            assigned_at: assignment.assigned_at,
            created_at: assignment.created_at,
            updated_at: assignment.updated_at,
            deleted_at: assignment.deleted_at,
        };

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
            location: Set(input.location.clone()),
            start_time: Set(input.start_time),
            end_time: Set(input.end_time),
            is_all_day: Set(input.is_all_day),
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
            default_days_per_year: Set(input.default_days_per_year),
            requires_approval: Set(input.requires_approval),
            max_consecutive_days: Set(input.max_consecutive_days),
            is_paid: Set(input.is_paid),
            color: Set(input.color.clone()),
            icon: Set(input.icon.clone()),
            ..Default::default()
        };

        let leave_type = leave_type.insert(&db).await?;

        // Convert SeaORM model to legacy LeaveType struct for compatibility
        let leave_type = LeaveType {
            id: leave_type.id,
            name: leave_type.name,
            description: leave_type.description,
            default_days_per_year: leave_type.default_days_per_year,
            requires_approval: leave_type.requires_approval,
            max_consecutive_days: leave_type.max_consecutive_days,
            is_paid: leave_type.is_paid,
            color: leave_type.color,
            icon: leave_type.icon,
            created_at: leave_type.created_at,
            updated_at: leave_type.updated_at,
            deleted_at: leave_type.deleted_at,
        };

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

        if let Some(default_days) = input.default_days_per_year {
            leave_type.default_days_per_year = Set(default_days);
        }

        if let Some(requires_approval) = input.requires_approval {
            leave_type.requires_approval = Set(requires_approval);
        }

        if let Some(max_days) = input.max_consecutive_days {
            leave_type.max_consecutive_days = Set(Some(max_days));
        }

        if let Some(is_paid) = input.is_paid {
            leave_type.is_paid = Set(is_paid);
        }

        if let Some(color) = input.color {
            leave_type.color = Set(Some(color));
        }

        if let Some(icon) = input.icon {
            leave_type.icon = Set(Some(icon));
        }

        // Update timestamp
        leave_type.updated_at = Set(Utc::now());

        // Save changes
        let updated_leave_type = leave_type.update(&db).await?;

        // Convert to legacy LeaveType struct for compatibility
        let leave_type = LeaveType {
            id: updated_leave_type.id,
            name: updated_leave_type.name,
            description: updated_leave_type.description,
            default_days_per_year: updated_leave_type.default_days_per_year,
            requires_approval: updated_leave_type.requires_approval,
            max_consecutive_days: updated_leave_type.max_consecutive_days,
            is_paid: updated_leave_type.is_paid,
            color: updated_leave_type.color,
            icon: updated_leave_type.icon,
            created_at: updated_leave_type.created_at,
            updated_at: updated_leave_type.updated_at,
            deleted_at: updated_leave_type.deleted_at,
        };

        Ok(leave_type)
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

        let balance = crate::models::leave_balance::ActiveModel {
            employee_id: Set(input.employee_id),
            policy_id: Set(input.policy_id),
            year: Set(input.year),
            balance_days: Set(input.balance_days),
            used_days: Set(0.0),
            ..Default::default()
        };

        let balance = balance.insert(&db).await?;

        // Convert SeaORM model to legacy LeaveBalance struct for compatibility
        let balance = LeaveBalance {
            id: balance.id,
            employee_id: balance.employee_id,
            policy_id: balance.policy_id,
            year: balance.year,
            balance_days: balance.balance_days,
            used_days: balance.used_days,
            pending_days: balance.pending_days,
            carried_over_days: balance.carried_over_days,
            created_at: balance.created_at,
            updated_at: balance.updated_at,
            deleted_at: balance.deleted_at,
        };

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

        if let Some(balance_days) = input.balance_days {
            balance.balance_days = Set(balance_days);
        }

        if let Some(used_days) = input.used_days {
            balance.used_days = Set(used_days);
        }

        // Update timestamp
        balance.updated_at = Set(Utc::now());

        // Save changes
        let updated_balance = balance.update(&db).await?;

        // Convert to legacy LeaveBalance struct for compatibility
        let balance = LeaveBalance {
            id: updated_balance.id,
            employee_id: updated_balance.employee_id,
            policy_id: updated_balance.policy_id,
            year: updated_balance.year,
            balance_days: updated_balance.balance_days,
            used_days: updated_balance.used_days,
            pending_days: updated_balance.pending_days,
            carried_over_days: updated_balance.carried_over_days,
            created_at: updated_balance.created_at,
            updated_at: updated_balance.updated_at,
            deleted_at: updated_balance.deleted_at,
        };

        Ok(balance)
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

        // For now, we'll use a placeholder - this should be updated to fetch the actual leave type name
        // TODO: Fetch leave type name from database using leave_type_id
        let leave_type_name = "vacation".to_string(); // Placeholder

        let request = crate::models::leave_request::ActiveModel {
            employee_id: Set(user_id),
            leave_type: Set(leave_type_name),
            start_date: Set(input.start_date),
            end_date: Set(input.end_date),
            days_requested: Set(input.days_requested),
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

        // Build active model with updates
        let mut request: crate::models::leave_request::ActiveModel = existing_request.into();

        if let Some(start_date) = input.start_date {
            request.start_date = Set(start_date);
        }

        if let Some(end_date) = input.end_date {
            request.end_date = Set(end_date);
        }

        if let Some(days_requested) = input.days_requested {
            request.days_requested = Set(days_requested);
        }

        if let Some(reason) = input.reason {
            request.reason = Set(Some(reason));
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

        // Convert to legacy LeaveRequest struct for compatibility
        let request = LeaveRequest {
            id: updated_request.id,
            employee_id: updated_request.employee_id,
            manager_id: updated_request.manager_id,
            leave_type: updated_request.leave_type,
            start_date: updated_request.start_date,
            end_date: updated_request.end_date,
            days_requested: updated_request.days_requested,
            status: LeaveRequestStatus::Rejected.as_str().to_string(),
            reason: updated_request.reason,
            manager_comments: updated_request.manager_comments,
            created_at: updated_request.created_at,
            updated_at: updated_request.updated_at,
            deleted_at: updated_request.deleted_at,
        };

        Ok(request)
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

        // Convert to legacy LeaveRequest struct for compatibility
        let request = LeaveRequest {
            id: updated_request.id,
            employee_id: updated_request.employee_id,
            manager_id: updated_request.manager_id,
            leave_type: updated_request.leave_type,
            start_date: updated_request.start_date,
            end_date: updated_request.end_date,
            days_requested: updated_request.days_requested,
            status: LeaveRequestStatus::Cancelled.as_str().to_string(),
            reason: updated_request.reason,
            manager_comments: updated_request.manager_comments,
            created_at: updated_request.created_at,
            updated_at: updated_request.updated_at,
            deleted_at: updated_request.deleted_at,
        };

        Ok(request)
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

    // ============================================================
    // Task Mutations
    // ============================================================

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
            new_value: Set(Some(serde_json::to_string(&task).unwrap_or_default())),
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
            new_value: Set(Some(serde_json::to_string(&updated_task).unwrap_or_default())),
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
            old_value: Set(Some(old_status)),
            new_value: Set(Some(input.status.as_str().to_string())),
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

        // Convert SeaORM model to legacy TaskAssignee struct for compatibility
        let assignee = TaskAssignee {
            id: assignee.id,
            task_id: assignee.task_id,
            user_id: assignee.user_id,
            role: assignee.role.clone(),
            assigned_at: assignee.assigned_at,
            assigned_by: assignee.assigned_by,
            created_at: assignee.created_at,
            updated_at: assignee.updated_at,
            deleted_at: assignee.deleted_at,
        };

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

        // Convert to legacy TaskAssignee struct for compatibility
        let assignee = TaskAssignee {
            id: updated_assignee.id,
            task_id: updated_assignee.task_id,
            user_id: updated_assignee.user_id,
            role: updated_assignee.role.clone(),
            assigned_at: updated_assignee.assigned_at,
            assigned_by: updated_assignee.assigned_by,
            created_at: updated_assignee.created_at,
            updated_at: updated_assignee.updated_at,
            deleted_at: updated_assignee.deleted_at,
        };

        Ok(assignee)
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

        // Convert SeaORM model to legacy TaskDependency struct for compatibility
        let dependency = TaskDependency {
            id: dependency.id,
            task_id: dependency.task_id,
            depends_on_task_id: dependency.depends_on_task_id,
            dependency_type: dependency.dependency_type.clone(),
            lag_days: dependency.lag_days,
            created_by: dependency.created_by,
            created_at: dependency.created_at,
            updated_at: dependency.updated_at,
            deleted_at: dependency.deleted_at,
        };

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

        // Convert to legacy TaskDependency struct for compatibility
        let dependency = TaskDependency {
            id: updated_dependency.id,
            task_id: updated_dependency.task_id,
            depends_on_task_id: updated_dependency.depends_on_task_id,
            dependency_type: updated_dependency.dependency_type.clone(),
            lag_days: updated_dependency.lag_days,
            created_by: updated_dependency.created_by,
            created_at: updated_dependency.created_at,
            updated_at: updated_dependency.updated_at,
            deleted_at: updated_dependency.deleted_at,
        };

        Ok(dependency)
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

        // Convert SeaORM model to legacy LinkedResource struct for compatibility
        let resource = LinkedResource {
            id: resource.id,
            task_id: resource.task_id,
            resource_type: resource.resource_type.clone(),
            title: resource.title,
            url: resource.url,
            file_path: resource.file_path,
            file_size: resource.file_size,
            mime_type: resource.mime_type,
            description: resource.description,
            uploaded_by: resource.uploaded_by,
            created_at: resource.created_at,
            updated_at: resource.updated_at,
            deleted_at: resource.deleted_at,
        };

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

        // Convert to legacy LinkedResource struct for compatibility
        let resource = LinkedResource {
            id: updated_resource.id,
            task_id: updated_resource.task_id,
            resource_type: updated_resource.resource_type.clone(),
            title: updated_resource.title,
            url: updated_resource.url,
            file_path: updated_resource.file_path,
            file_size: updated_resource.file_size,
            mime_type: updated_resource.mime_type,
            description: updated_resource.description,
            uploaded_by: updated_resource.uploaded_by,
            created_at: updated_resource.created_at,
            updated_at: updated_resource.updated_at,
            deleted_at: updated_resource.deleted_at,
        };

        Ok(resource)
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

        // Convert SeaORM model to legacy ReviewCycle struct for compatibility
        let cycle = ReviewCycle {
            id: cycle.id,
            name: cycle.name,
            description: cycle.description,
            review_type: cycle.review_type.clone(),
            start_date: cycle.start_date,
            end_date: cycle.end_date,
            status: cycle.status.clone(),
            created_by: cycle.created_by,
            created_at: cycle.created_at,
            updated_at: cycle.updated_at,
            deleted_at: cycle.deleted_at,
        };

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

        // Convert to legacy ReviewCycle struct for compatibility
        let cycle = ReviewCycle {
            id: updated_cycle.id,
            name: updated_cycle.name,
            description: updated_cycle.description,
            review_type: updated_cycle.review_type.clone(),
            start_date: updated_cycle.start_date,
            end_date: updated_cycle.end_date,
            status: updated_cycle.status.clone(),
            created_by: updated_cycle.created_by,
            created_at: updated_cycle.created_at,
            updated_at: updated_cycle.updated_at,
            deleted_at: updated_cycle.deleted_at,
        };

        Ok(cycle)
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
    ) -> Result<PerformanceReview> {
        let db = get_db_from_context(ctx)?;

        let review = crate::models::performance_review::ActiveModel {
            employee_id: Set(input.employee_id),
            reviewer_id: Set(input.reviewer_id),
            review_period: Set(input.review_period.clone()),
            status: Set("draft".to_string()),
            ..Default::default()
        };

        let review = review.insert(&db).await?;

        // Convert SeaORM model to legacy PerformanceReview struct for compatibility
        let review = PerformanceReview {
            id: review.id,
            employee_id: review.employee_id,
            reviewer_id: review.reviewer_id,
            review_period: review.review_period,
            status: review.status.clone(),
            overall_rating: review.overall_rating,
            goals: review.goals,
            achievements: review.achievements,
            areas_for_improvement: review.areas_for_improvement,
            manager_feedback: review.manager_feedback,
            created_at: review.created_at,
            updated_at: review.updated_at,
            review_period_start: review.review_period_start,
            review_period_end: review.review_period_end,
            review_type: review.review_type,
            notes: review.notes,
            deleted_at: review.deleted_at,
        };

        Ok(Ok(review)
            .map_err(|e: sea_orm::DbErr| {
                tracing::error!("Failed to create performance review: {}", e);
                AppError::Internal("Failed to create performance review".to_string())
            })?)
    }

    /// Update an existing performance review
    async fn update_performance_review(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdatePerformanceReviewInput,
    ) -> Result<PerformanceReview> {
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

        if let Some(rating_str) = input.overall_rating {
            use std::str::FromStr;
            let rating = rust_decimal::Decimal::from_str(&rating_str)
                .map_err(|_| "Invalid rating format - must be a valid decimal number")?;
            review.overall_rating = Set(Some(rating));
        }

        if let Some(goals) = input.goals {
            review.goals = Set(Some(goals));
        }

        if let Some(achievements) = input.achievements {
            review.achievements = Set(Some(achievements));
        }

        if let Some(areas) = input.areas_for_improvement {
            review.areas_for_improvement = Set(Some(areas));
        }

        if let Some(feedback) = input.manager_feedback {
            review.manager_feedback = Set(Some(feedback));
        }

        if let Some(start) = input.review_period_start {
            review.review_period_start = Set(Some(start));
        }

        if let Some(end) = input.review_period_end {
            review.review_period_end = Set(Some(end));
        }

        if let Some(review_type) = input.review_type {
            review.review_type = Set(Some(review_type));
        }

        if let Some(notes) = input.notes {
            review.notes = Set(Some(notes));
        }

        // Update timestamp
        review.updated_at = Set(Utc::now());

        // Save changes
        let updated_review = review.update(&db).await?;

        // Convert to legacy PerformanceReview struct for compatibility
        let review = PerformanceReview {
            id: updated_review.id,
            employee_id: updated_review.employee_id,
            reviewer_id: updated_review.reviewer_id,
            review_period: updated_review.review_period,
            status: updated_review.status.clone(),
            overall_rating: updated_review.overall_rating,
            goals: updated_review.goals,
            achievements: updated_review.achievements,
            areas_for_improvement: updated_review.areas_for_improvement,
            manager_feedback: updated_review.manager_feedback,
            created_at: updated_review.created_at,
            updated_at: updated_review.updated_at,
            review_period_start: updated_review.review_period_start,
            review_period_end: updated_review.review_period_end,
            review_type: updated_review.review_type,
            notes: updated_review.notes,
            deleted_at: updated_review.deleted_at,
        };

        Ok(review)
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
            performance_review_id: Set(input.performance_review_id),
            title: Set(input.title.clone()),
            description: Set(input.description.clone()),
            target_date: Set(input.target_date),
            completion_status: Set("not_started".to_string()),
            weight: Set(input.weight),
            ..Default::default()
        };

        let goal = goal.insert(&db).await?;

        // Convert SeaORM model to legacy ReviewGoal struct for compatibility
        let goal = ReviewGoal {
            id: goal.id,
            performance_review_id: goal.performance_review_id,
            title: goal.title,
            description: goal.description,
            target_date: goal.target_date,
            completion_status: goal.completion_status.clone(),
            weight: goal.weight,
            created_at: goal.created_at,
            updated_at: goal.updated_at,
            deleted_at: goal.deleted_at,
        };

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

        // Convert to legacy ReviewGoal struct for compatibility
        let goal = ReviewGoal {
            id: updated_goal.id,
            performance_review_id: updated_goal.performance_review_id,
            title: updated_goal.title,
            description: updated_goal.description,
            target_date: updated_goal.target_date,
            completion_status: updated_goal.completion_status.clone(),
            weight: updated_goal.weight,
            created_at: updated_goal.created_at,
            updated_at: updated_goal.updated_at,
            deleted_at: updated_goal.deleted_at,
        };

        Ok(goal)
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
            performance_review_id: Set(input.performance_review_id),
            provider_id: Set(provider_id),
            feedback_type: Set(input.feedback_type.as_str().to_string()),
            content: Set(input.content.clone()),
            is_visible_to_employee: Set(input.is_visible_to_employee.unwrap_or(true)),
            ..Default::default()
        };

        let feedback = feedback.insert(&db).await?;

        // Convert SeaORM model to legacy ReviewFeedback struct for compatibility
        let feedback = ReviewFeedback {
            id: feedback.id,
            performance_review_id: feedback.performance_review_id,
            provider_id: feedback.provider_id,
            feedback_type: feedback.feedback_type.clone(),
            content: feedback.content,
            is_visible_to_employee: feedback.is_visible_to_employee,
            created_at: feedback.created_at,
            updated_at: feedback.updated_at,
            deleted_at: feedback.deleted_at,
        };

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

        // Convert to legacy ReviewFeedback struct for compatibility
        let feedback = ReviewFeedback {
            id: updated_feedback.id,
            performance_review_id: updated_feedback.performance_review_id,
            provider_id: updated_feedback.provider_id,
            feedback_type: updated_feedback.feedback_type.clone(),
            content: updated_feedback.content,
            is_visible_to_employee: updated_feedback.is_visible_to_employee,
            created_at: updated_feedback.created_at,
            updated_at: updated_feedback.updated_at,
            deleted_at: updated_feedback.deleted_at,
        };

        Ok(feedback)
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

        let verified = input.verified.unwrap_or(false);

        let skill = crate::models::employee::employee_skill::ActiveModel {
            employee_id: Set(input.employee_id),
            skill_name: Set(input.skill_name.clone()),
            proficiency_level: Set(input.proficiency_level.as_str().to_string()),
            years_experience: Set(input.years_experience),
            verified: Set(verified),
            ..Default::default()
        };

        let skill = skill.insert(&db).await?;

        // Convert SeaORM model to legacy EmployeeSkill struct for compatibility
        let skill = EmployeeSkill {
            id: skill.id,
            employee_id: skill.employee_id,
            skill_name: skill.skill_name,
            proficiency_level: skill.proficiency_level.clone(),
            years_experience: skill.years_experience,
            verified: skill.verified,
            verifier_id: skill.verifier_id,
            created_at: skill.created_at,
            updated_at: skill.updated_at,
        };

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

        if let Some(verified) = input.verified {
            skill.verified = Set(verified);
        }

        if let Some(verifier_id) = input.verifier_id {
            skill.verifier_id = Set(Some(verifier_id));
        }

        // Update timestamp
        skill.updated_at = Set(Utc::now());

        // Save changes
        let updated_skill = skill.update(&db).await?;

        // Convert to legacy EmployeeSkill struct for compatibility
        let skill = EmployeeSkill {
            id: updated_skill.id,
            employee_id: updated_skill.employee_id,
            skill_name: updated_skill.skill_name,
            proficiency_level: updated_skill.proficiency_level.clone(),
            years_experience: updated_skill.years_experience,
            verified: updated_skill.verified,
            verifier_id: updated_skill.verifier_id,
            created_at: updated_skill.created_at,
            updated_at: updated_skill.updated_at,
        };

        Ok(skill)
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

        // Convert SeaORM model to legacy EmployeeCertification struct for compatibility
        let cert = EmployeeCertification {
            id: cert.id,
            employee_id: cert.employee_id,
            certification_name: cert.certification_name,
            issuing_organization: cert.issuing_organization,
            issue_date: cert.issue_date,
            expiration_date: cert.expiration_date,
            certification_number: cert.certification_number,
            created_at: cert.created_at,
            updated_at: cert.updated_at,
        };

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

        // Convert SeaORM model to legacy EmployeeVehicle struct for compatibility
        let vehicle = EmployeeVehicle {
            id: vehicle.id,
            employee_id: vehicle.employee_id,
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year,
            license_plate: vehicle.license_plate,
            color: vehicle.color,
            created_at: vehicle.created_at,
            updated_at: vehicle.updated_at,
        };

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

        // Convert to legacy EmployeeVehicle struct for compatibility
        let vehicle = EmployeeVehicle {
            id: updated_vehicle.id,
            employee_id: updated_vehicle.employee_id,
            make: updated_vehicle.make,
            model: updated_vehicle.model,
            year: updated_vehicle.year,
            license_plate: updated_vehicle.license_plate,
            color: updated_vehicle.color,
            created_at: updated_vehicle.created_at,
            updated_at: updated_vehicle.updated_at,
        };

        Ok(vehicle)
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
            contact_name: Set(input.contact_name.clone()),
            relationship: Set(input.relationship.clone()),
            phone_number: Set(input.phone_number.clone()),
            email: Set(input.email.clone()),
            is_primary: Set(input.is_primary),
            ..Default::default()
        };

        let contact = contact.insert(&db).await?;

        // Convert SeaORM model to legacy EmergencyContact struct for compatibility
        let contact = EmergencyContact {
            id: contact.id,
            employee_id: contact.employee_id,
            contact_name: contact.contact_name,
            relationship: contact.relationship,
            phone_number: contact.phone_number,
            email: contact.email,
            is_primary: contact.is_primary,
            created_at: contact.created_at,
            updated_at: contact.updated_at,
        };

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

        if let Some(contact_name) = input.contact_name {
            contact.contact_name = Set(contact_name);
        }

        if let Some(relationship) = input.relationship {
            contact.relationship = Set(relationship);
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

        // Convert to legacy EmergencyContact struct for compatibility
        let contact = EmergencyContact {
            id: updated_contact.id,
            employee_id: updated_contact.employee_id,
            contact_name: updated_contact.contact_name,
            relationship: updated_contact.relationship,
            phone_number: updated_contact.phone_number,
            email: updated_contact.email,
            is_primary: updated_contact.is_primary,
            created_at: updated_contact.created_at,
            updated_at: updated_contact.updated_at,
        };

        Ok(contact)
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

        // Convert SeaORM model to legacy EmployeeGoal struct for compatibility
        let goal = EmployeeGoal {
            id: goal.id,
            employee_id: goal.employee_id,
            title: goal.title.clone(),
            description: goal.description.clone(),
            target_date: goal.target_date,
            status: goal.status.clone(),
            progress_percentage: goal.progress_percentage,
            created_at: goal.created_at,
            updated_at: goal.updated_at,
        };

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

        // Convert to legacy EmployeeGoal struct for compatibility
        let goal = EmployeeGoal {
            id: updated_goal.id,
            employee_id: updated_goal.employee_id,
            title: updated_goal.title.clone(),
            description: updated_goal.description.clone(),
            target_date: updated_goal.target_date,
            status: updated_goal.status.clone(),
            progress_percentage: updated_goal.progress_percentage,
            created_at: updated_goal.created_at,
            updated_at: updated_goal.updated_at,
        };

        Ok(goal)
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

        // Convert SeaORM model to legacy DocumentCategory struct for compatibility
        let category = DocumentCategory {
            id: category.id,
            name: category.name,
            description: category.description,
            parent_category_id: category.parent_category_id,
            created_at: category.created_at,
            updated_at: category.updated_at,
            deleted_at: category.deleted_at,
        };

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

        // Convert to legacy DocumentCategory struct for compatibility
        let category = DocumentCategory {
            id: updated_category.id,
            name: updated_category.name,
            description: updated_category.description,
            parent_category_id: updated_category.parent_category_id,
            created_at: updated_category.created_at,
            updated_at: updated_category.updated_at,
            deleted_at: updated_category.deleted_at,
        };

        Ok(category)
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

        // Convert SeaORM model to legacy DocumentVersion struct for compatibility
        let version = DocumentVersion {
            id: version.id,
            document_id: version.document_id,
            version_number: version.version_number,
            file_path: version.file_path,
            file_size: version.file_size,
            uploader_id: version.uploader_id,
            change_summary: version.change_summary,
            created_at: version.created_at,
        };

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
            assigned_by_id: Set(assigner_id),
            ..Default::default()
        };

        let assignment = assignment.insert(&db).await?;

        // Convert SeaORM model to legacy DocumentAssignment struct for compatibility
        let assignment = DocumentAssignment {
            id: assignment.id,
            document_id: assignment.document_id,
            user_id: assignment.user_id,
            department_id: assignment.department_id,
            access_level: assignment.access_level.clone(),
            assigned_at: assignment.assigned_at,
            assigned_by_id: assignment.assigned_by_id,
        };

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

        // Convert SeaORM model to legacy DocumentAccessLog struct for compatibility
        let log = DocumentAccessLog {
            id: log.id,
            document_id: log.document_id,
            user_id: log.user_id,
            access_type: log.access_type.clone(),
            accessed_at: log.accessed_at,
            ip_address: log.ip_address,
        };

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
            document_id: Set(input.document_id),
            encryption_key_id: Set(input.encryption_key_id),
            ..Default::default()
        };

        let storage = storage.insert(&db).await?;

        // Convert SeaORM model to legacy EncryptedFileStorage struct for compatibility
        let storage = EncryptedFileStorage {
            id: storage.id,
            document_id: storage.document_id,
            encryption_key_id: storage.encryption_key_id,
            created_at: storage.created_at,
        };

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
            hours_worked: Set(input.hours_worked),
            status: Set(input.status.as_str().to_string()),
            notes: Set(input.notes.clone()),
            ..Default::default()
        };

        let record = record.insert(&db).await?;

        // Convert SeaORM model to legacy AttendanceRecord struct for compatibility
        let record = AttendanceRecord {
            id: record.id,
            user_id: record.user_id,
            date: record.date,
            clock_in: record.clock_in,
            clock_out: record.clock_out,
            hours_worked: record.hours_worked,
            status: record.status.clone(),
            notes: record.notes,
            created_at: record.created_at,
            updated_at: record.updated_at,
        };

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
            record.hours_worked = Set(Some(hours_worked));
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

        // Convert to legacy AttendanceRecord struct for compatibility
        let record = AttendanceRecord {
            id: updated_record.id,
            user_id: updated_record.user_id,
            date: updated_record.date,
            clock_in: updated_record.clock_in,
            clock_out: updated_record.clock_out,
            hours_worked: updated_record.hours_worked,
            status: updated_record.status.clone(),
            notes: updated_record.notes,
            created_at: updated_record.created_at,
            updated_at: updated_record.updated_at,
        };

        Ok(record)
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

        // Convert SeaORM model to legacy ActivityLog struct for compatibility
        let log = ActivityLog {
            id: log.id,
            user_id: log.user_id,
            employee_id: log.employee_id,
            action: log.action,
            resource_type: log.resource_type,
            resource_id: log.resource_id,
            details: log.details,
            before_snapshot: log.before_snapshot,
            after_snapshot: log.after_snapshot,
            is_rollback: log.is_rollback,
            rolled_back_log_id: log.rolled_back_log_id,
            ip_address: log.ip_address,
            user_agent: log.user_agent,
            signature_id: log.signature_id,
            batch_id: log.batch_id,
            created_at: log.created_at,
        };

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

        // Convert SeaORM model to legacy CompensationBand struct for compatibility
        let band = CompensationBand {
            id: band.id,
            band_name: band.band_name,
            min_salary: band.min_salary,
            max_salary: band.max_salary,
            currency: band.currency,
            created_at: band.created_at,
            updated_at: band.updated_at,
        };

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

        // Convert to legacy CompensationBand struct for compatibility
        let band = CompensationBand {
            id: updated_band.id,
            band_name: updated_band.band_name,
            min_salary: updated_band.min_salary,
            max_salary: updated_band.max_salary,
            currency: updated_band.currency,
            created_at: updated_band.created_at,
            updated_at: updated_band.updated_at,
        };

        Ok(band)
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

        // Parse data JSON string
        let data_json = serde_json::from_str::<serde_json::Value>(&input.data)?;

        let report = crate::models::system::hr_report::ActiveModel {
            title: Set(input.title.clone()),
            report_type: Set(input.report_type.clone()),
            data: Set(data_json),
            creator_id: Set(input.creator_id),
            ..Default::default()
        };

        let report = report.insert(&db).await?;

        // Convert SeaORM model to legacy HRReport struct for compatibility
        let report = HRReport {
            id: report.id,
            title: report.title,
            report_type: report.report_type,
            data: report.data,
            creator_id: report.creator_id,
            generated_at: report.generated_at,
        };

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
            activity_log_id: Set(input.activity_log_id),
            requested_by: Set(user_id),
            reason: Set(input.reason.clone()),
            status: Set("pending".to_string()),
            ..Default::default()
        };

        let request = request.insert(&db).await?;

        // Convert SeaORM model to legacy RollbackRequest struct for compatibility
        let request = RollbackRequest {
            id: request.id,
            activity_log_id: request.activity_log_id,
            requested_by: request.requested_by,
            requested_at: request.requested_at,
            reason: request.reason,
            status: request.status.clone(),
            reviewed_by: request.reviewed_by,
            reviewed_at: request.reviewed_at,
            review_reason: request.review_reason,
            created_at: request.created_at,
            updated_at: request.updated_at,
        };

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
            // If status is 'completed', set reviewed_at
            if status == RollbackStatus::Completed {
                request.reviewed_at = Set(Some(Utc::now()));
            }
        }

        if let Some(reviewed_by) = input.reviewed_by {
            request.reviewed_by = Set(Some(reviewed_by));
        }

        if let Some(review_reason) = input.review_reason {
            request.review_reason = Set(Some(review_reason));
        }

        // Update timestamp
        request.updated_at = Set(Utc::now());

        // Save changes
        let updated_request = request.update(&db).await?;

        // Convert to legacy RollbackRequest struct for compatibility
        let request = RollbackRequest {
            id: updated_request.id,
            activity_log_id: updated_request.activity_log_id,
            requested_by: updated_request.requested_by,
            requested_at: updated_request.requested_at,
            reason: updated_request.reason,
            status: updated_request.status.clone(),
            reviewed_by: updated_request.reviewed_by,
            reviewed_at: updated_request.reviewed_at,
            review_reason: updated_request.review_reason,
            created_at: updated_request.created_at,
            updated_at: updated_request.updated_at,
        };

        Ok(request)
    }

    /// Create a new bulk rollback batch
    async fn create_bulk_rollback_batch(
        &self,
        ctx: &Context<'_>,
        input: CreateBulkRollbackBatchInput,
    ) -> Result<BulkRollbackBatch> {
        let db = get_db_from_context(ctx)?;

        let batch = crate::models::system::bulk_rollback_batch::ActiveModel {
            batch_name: Set(input.batch_name.clone()),
            requester_id: Set(input.requester_id),
            total_items: Set(input.total_items),
            completed_items: Set(0),
            status: Set("pending".to_string()),
            ..Default::default()
        };

        let batch = batch.insert(&db).await?;

        // Convert SeaORM model to legacy BulkRollbackBatch struct for compatibility
        let batch = BulkRollbackBatch {
            id: batch.id,
            batch_name: batch.batch_name,
            requester_id: batch.requester_id,
            total_items: batch.total_items,
            completed_items: batch.completed_items,
            status: batch.status,
            started_at: batch.started_at,
            completed_at: batch.completed_at,
            created_at: batch.created_at,
        };

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

        // Store needed fields before moving
        let started_at = existing_batch.started_at;

        // Build active model with updates
        let mut batch: crate::models::system::bulk_rollback_batch::ActiveModel = existing_batch.into();

        if let Some(completed_items) = input.completed_items {
            batch.completed_items = Set(completed_items);
        }

        if let Some(status) = input.status {
            batch.status = Set(status.clone());
            // If status is 'processing', set started_at if not already set
            // If status is 'completed' or 'failed', set completed_at
            if status == "processing" {
                if started_at.is_none() {
                    batch.started_at = Set(Some(Utc::now()));
                }
            }
            if status == "completed" || status == "failed" {
                batch.completed_at = Set(Some(Utc::now()));
            }
        }

        // Save changes
        let updated_batch = batch.update(&db).await?;

        // Convert to legacy BulkRollbackBatch struct for compatibility
        let batch = BulkRollbackBatch {
            id: updated_batch.id,
            batch_name: updated_batch.batch_name,
            requester_id: updated_batch.requester_id,
            total_items: updated_batch.total_items,
            completed_items: updated_batch.completed_items,
            status: updated_batch.status,
            started_at: updated_batch.started_at,
            completed_at: updated_batch.completed_at,
            created_at: updated_batch.created_at,
        };

        Ok(batch)
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

        // Convert SeaORM model to legacy BulkRollbackItem struct for compatibility
        let item = BulkRollbackItem {
            id: item.id,
            batch_id: item.batch_id,
            resource_type: item.resource_type,
            resource_id: item.resource_id,
            rollback_to_timestamp: item.rollback_to_timestamp,
            status: item.status,
            error_message: item.error_message,
            completed_at: item.completed_at,
        };

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

        // Convert to legacy BulkRollbackItem struct for compatibility
        let item = BulkRollbackItem {
            id: updated_item.id,
            batch_id: updated_item.batch_id,
            resource_type: updated_item.resource_type,
            resource_id: updated_item.resource_id,
            rollback_to_timestamp: updated_item.rollback_to_timestamp,
            status: updated_item.status,
            error_message: updated_item.error_message,
            completed_at: updated_item.completed_at,
        };

        Ok(item)
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

        // Convert SeaORM model to legacy PayrollRecord struct for compatibility
        let record = PayrollRecord {
            id: record.id,
            employee_id: record.employee_id,
            pay_period_start: record.pay_period_start,
            pay_period_end: record.pay_period_end,
            gross_pay: record.gross_pay,
            net_pay: record.net_pay,
            deductions: record.deductions,
            bonuses: record.bonuses,
            processed_at: record.processed_at,
            processor_id: record.processor_id,
            created_at: record.created_at,
        };

        Ok(record)
    }

    /// Create a new encryption key (security - create only)
    async fn create_encryption_key(
        &self,
        ctx: &Context<'_>,
        input: CreateEncryptionKeyInput,
    ) -> Result<EncryptionKey> {
        let db = get_db_from_context(ctx)?;

        let key = crate::models::system::encryption_key::ActiveModel {
            key_name: Set(input.key_name.clone()),
            algorithm: Set(input.algorithm.clone()),
            active: Set(true),
            ..Default::default()
        };

        let key = key.insert(&db).await?;

        // Convert SeaORM model to legacy EncryptionKey struct for compatibility
        let key = EncryptionKey {
            id: key.id,
            key_name: key.key_name,
            algorithm: key.algorithm,
            created_at: key.created_at,
            rotated_at: key.rotated_at,
            active: key.active,
        };

        Ok(key)
    }

    /// Update system settings by category (requires system_admin role)
    #[graphql(guard = "crate::middleware::guards::RequireRole::new(\"system_admin\")")]
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
            comment_text: Set(input.comment_text.clone()),
            ..Default::default()
        };

        let comment = comment.insert(&db).await?;

        // Convert SeaORM model to legacy EventComment struct for compatibility
        let comment = EventComment {
            id: comment.id,
            event_id: comment.event_id,
            user_id: comment.user_id,
            comment_text: comment.comment_text,
            created_at: comment.created_at,
            updated_at: comment.updated_at,
            deleted_at: comment.deleted_at,
        };

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

        if let Some(comment_text) = input.comment_text {
            comment.comment_text = Set(comment_text);
        }

        // Update timestamp
        comment.updated_at = Set(Utc::now());

        // Save changes
        let updated_comment = comment.update(&db).await?;

        // Convert to legacy EventComment struct for compatibility
        let comment = EventComment {
            id: updated_comment.id,
            event_id: updated_comment.event_id,
            user_id: updated_comment.user_id,
            comment_text: updated_comment.comment_text,
            created_at: updated_comment.created_at,
            updated_at: updated_comment.updated_at,
            deleted_at: updated_comment.deleted_at,
        };

        Ok(comment)
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

        // Parse JSON strings if provided
        let old_values_json = if let Some(old_values) = &input.old_values {
            Some(serde_json::from_str::<serde_json::Value>(old_values)?)
        } else {
            None
        };

        let new_values_json = if let Some(new_values) = &input.new_values {
            Some(serde_json::from_str::<serde_json::Value>(new_values)?)
        } else {
            None
        };

        let history = crate::models::events::event_history::ActiveModel {
            event_id: Set(input.event_id),
            changed_by_id: Set(input.changed_by_id),
            change_type: Set(input.change_type.clone()),
            old_values: Set(old_values_json),
            new_values: Set(new_values_json),
            ..Default::default()
        };

        let history = history.insert(&db).await?;

        // Convert SeaORM model to legacy EventHistory struct for compatibility
        let history = EventHistory {
            id: history.id,
            event_id: history.event_id,
            changed_by_id: history.changed_by_id,
            change_type: history.change_type,
            old_values: history.old_values,
            new_values: history.new_values,
            created_at: history.created_at,
        };

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

        // Convert SeaORM model to legacy EventWaitlist struct for compatibility
        let waitlist = EventWaitlist {
            id: waitlist.id,
            event_id: waitlist.event_id,
            user_id: waitlist.user_id,
            position: waitlist.position,
            promoted: waitlist.promoted,
            promoted_at: waitlist.promoted_at,
            created_at: waitlist.created_at,
        };

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

        // Convert to legacy EventWaitlist struct for compatibility
        let waitlist = EventWaitlist {
            id: updated_waitlist.id,
            event_id: updated_waitlist.event_id,
            user_id: updated_waitlist.user_id,
            position: updated_waitlist.position,
            promoted: updated_waitlist.promoted,
            promoted_at: updated_waitlist.promoted_at,
            created_at: updated_waitlist.created_at,
        };

        Ok(waitlist)
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

        // Convert SeaORM model to legacy TaskType struct for compatibility
        let task_type = TaskType {
            id: task_type.id,
            name: task_type.name,
            description: task_type.description,
            default_priority: task_type.default_priority,
            color_code: task_type.color_code,
            is_active: task_type.is_active,
            created_at: task_type.created_at,
            updated_at: task_type.updated_at,
        };

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

        // Convert to legacy TaskType struct for compatibility
        let task_type = TaskType {
            id: updated_task_type.id,
            name: updated_task_type.name,
            description: updated_task_type.description,
            default_priority: updated_task_type.default_priority,
            color_code: updated_task_type.color_code,
            is_active: updated_task_type.is_active,
            created_at: updated_task_type.created_at,
            updated_at: updated_task_type.updated_at,
        };

        Ok(task_type)
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

        // Convert SeaORM model to legacy ReviewTemplate struct for compatibility
        let template = ReviewTemplate {
            id: template.id,
            name: template.name,
            description: template.description,
            sections: template.sections,
            is_active: template.is_active,
            created_by_id: template.created_by_id,
            created_at: template.created_at,
            updated_at: template.updated_at,
        };

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

        // Convert to legacy ReviewTemplate struct for compatibility
        let template = ReviewTemplate {
            id: updated_template.id,
            name: updated_template.name,
            description: updated_template.description,
            sections: updated_template.sections,
            is_active: updated_template.is_active,
            created_by_id: updated_template.created_by_id,
            created_at: updated_template.created_at,
            updated_at: updated_template.updated_at,
        };

        Ok(template)
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
}
