use async_graphql::{Context, Object, Result};
use chrono::Utc;
use sea_orm::{DatabaseConnection, Set, ActiveModelTrait};
use uuid::Uuid;

use crate::{
    auth::context::UserContext,
    database::get_db_from_context,
    error::AppError,
    models::{
        generated::prelude::*,
        system::task_audit_entry,
        ApproveLeaveRequestInput, AssignRoleInput, AssignTaskInput, AuditAction,
        ChangeTaskStatusInput, CreateDepartmentInput, CreateEventAttendeeInput, CreateEventInput,
        CreateLeaveBalanceInput, CreateLeaveRequestInput, CreateLeaveTypeInput,
        CreateLinkedResourceInput, CreatePerformanceReviewInput, CreatePermissionInput,
        CreateReviewCycleInput, CreateReviewFeedbackInput, CreateReviewGoalInput, CreateRoleInput,
        CreateTaskDependencyInput, CreateTaskInput, CreateUserInput, Department, Event,
        EventAttendee, LeaveBalance, LeaveRequest, LeaveRequestStatus, LeaveType, LinkedResource,
        PerformanceReview, Permission, RejectLeaveRequestInput, ReviewCycle, ReviewFeedback,
        ReviewGoal, Role, RsvpStatus, Task, TaskAssignee, TaskAuditEntry, TaskDependency,
        TaskStatus, UpdateDepartmentInput, UpdateEventAttendeeInput, UpdateEventInput,
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
        CreatePayrollRecordInput, CreateRollbackRequestInput, EncryptionKey, HRReport,
        PayrollRecord, RollbackRequest, RollbackStatus, UpdateBulkRollbackBatchInput,
        UpdateBulkRollbackItemInput, UpdateCompensationBandInput, UpdateRollbackRequestInput,
        // Events domain (new models)
        CreateEventCommentInput, CreateEventHistoryInput, CreateEventWaitlistInput, EventComment,
        EventHistory, EventWaitlist, UpdateEventCommentInput, UpdateEventWaitlistInput,
        // Tasks domain
        CreateTaskTypeInput, TaskType, UpdateTaskTypeInput,
        // Reviews domain
        CreateReviewTemplateInput, ReviewTemplate, UpdateReviewTemplateInput,
    },
};

pub struct MutationRoot;

#[Object]
impl MutationRoot {
    /// Create a new event attendee
    async fn create_event_attendee(
        &self,
        ctx: &Context<'_>,
        input: CreateEventAttendeeInput,
    ) -> Result<EventAttendee> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let attendee = sqlx::query_as::<_, EventAttendee>(
            r#"
            INSERT INTO hr_public.event_attendees
            (event_id, employee_id, response_status, is_required, reminder_time, scope, is_organizer)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, event_id, employee_id, response_status, is_required,
                      created_at, reminder_time, scope, is_organizer
            "#,
        )
        .bind(input.event_id)
        .bind(input.employee_id)
        .bind(input.response_status.unwrap_or(RsvpStatus::Pending))
        .bind(input.is_required.unwrap_or(false))
        .bind(input.reminder_time)
        .bind(input.scope)
        .bind(input.is_organizer.unwrap_or(false))
        .fetch_one(pool)
        .await?;

        Ok(attendee)
    }

    /// Update an existing event attendee
    async fn update_event_attendee(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateEventAttendeeInput,
    ) -> Result<EventAttendee> {
        let pool = ctx.data::<DatabaseConnection>()?;

        // Build dynamic UPDATE query based on provided fields
        let mut updates = Vec::new();
        let mut param_count = 2; // Start at 2 because $1 is the ID

        if input.response_status.is_some() {
            updates.push(format!("response_status = ${}", param_count));
            param_count += 1;
        }

        if input.reminder_time.is_some() {
            updates.push(format!("reminder_time = ${}", param_count));
            param_count += 1;
        }

        if input.scope.is_some() {
            updates.push(format!("scope = ${}", param_count));
            param_count += 1;
        }

        if updates.is_empty() {
            return Err("No fields to update".into());
        }

        let query = format!(
            r#"
            UPDATE hr_public.event_attendees
            SET {}
            WHERE id = $1
            RETURNING id, event_id, employee_id, response_status, is_required,
                      created_at, reminder_time, scope, is_organizer
            "#,
            updates.join(", ")
        );

        let mut query_builder = sqlx::query_as::<_, EventAttendee>(&query).bind(id);

        if let Some(status) = input.response_status {
            query_builder = query_builder.bind(status);
        }

        if let Some(reminder_time) = input.reminder_time {
            query_builder = query_builder.bind(reminder_time);
        }

        if let Some(scope) = input.scope {
            query_builder = query_builder.bind(scope);
        }

        let attendee = query_builder.fetch_one(pool).await?;

        Ok(attendee)
    }

    /// Delete an event attendee
    async fn delete_event_attendee(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let result = sqlx::query("DELETE FROM hr_public.event_attendees WHERE id = $1")
            .bind(id)
            .execute(pool)
            .await?;

        Ok(result.rows_affected() > 0)
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
        let user = user::ActiveModel {
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
            status: Set(input.status.unwrap_or("active".to_string())),
            is_active: Set(true),
            ..Default::default()
        };

        let user = user.insert(db).await?;

        // Convert SeaORM model to legacy User struct for compatibility
        let user = User {
            id: user.id,
            email: user.email,
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
            is_active: user.is_active,
            created_at: user.created_at,
            updated_at: user.updated_at,
        };

        Ok(user)
            .map_err(|e| {
                tracing::error!("Failed to create user: {}", e);
                Error::new("Failed to create user")
            })
    }

    /// Update an existing user
    async fn update_user(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateUserInput,
    ) -> Result<User> {
        let pool = ctx.data::<DatabaseConnection>()?;

        // Build dynamic UPDATE query based on provided fields
        let mut updates = Vec::new();
        let mut param_count = 2; // Start at 2 because $1 is the ID

        if input.email.is_some() {
            updates.push(format!("email = ${}", param_count));
            param_count += 1;
        }

        if input.first_name.is_some() || input.last_name.is_some() {
            // If either first or last name changes, we need to recalculate full_name
            if input.first_name.is_some() {
                updates.push(format!("first_name = ${}", param_count));
                param_count += 1;
            }
            if input.last_name.is_some() {
                updates.push(format!("last_name = ${}", param_count));
                param_count += 1;
            }
            // We'll update full_name in a second query after fetching current values
        }

        if input.phone.is_some() {
            updates.push(format!("phone = ${}", param_count));
            param_count += 1;
        }

        if input.department_id.is_some() {
            updates.push(format!("department_id = ${}", param_count));
            param_count += 1;
        }

        if input.manager_id.is_some() {
            updates.push(format!("manager_id = ${}", param_count));
            param_count += 1;
        }

        if input.hire_date.is_some() {
            updates.push(format!("hire_date = ${}", param_count));
            param_count += 1;
        }

        if input.termination_date.is_some() {
            updates.push(format!("termination_date = ${}", param_count));
            param_count += 1;
        }

        if input.status.is_some() {
            updates.push(format!("status = ${}", param_count));
            param_count += 1;
        }

        if updates.is_empty() {
            return Err("No fields to update".into());
        }

        // Always update updated_at timestamp
        updates.push("updated_at = NOW()".to_string());

        let query = format!(
            r#"
            UPDATE hr_public.users
            SET {}
            WHERE id = $1 AND deleted_at IS NULL
            RETURNING id, email, first_name, last_name, full_name, phone,
                      department_id, manager_id, hire_date, termination_date,
                      status, created_at, updated_at, deleted_at
            "#,
            updates.join(", ")
        );

        let mut query_builder = sqlx::query_as::<_, User>(&query).bind(id);

        if let Some(email) = input.email {
            query_builder = query_builder.bind(email);
        }

        if let Some(first_name) = &input.first_name {
            query_builder = query_builder.bind(first_name);
        }

        if let Some(last_name) = &input.last_name {
            query_builder = query_builder.bind(last_name);
        }

        if let Some(phone) = input.phone {
            query_builder = query_builder.bind(phone);
        }

        if let Some(department_id) = input.department_id {
            query_builder = query_builder.bind(department_id);
        }

        if let Some(manager_id) = input.manager_id {
            query_builder = query_builder.bind(manager_id);
        }

        if let Some(hire_date) = input.hire_date {
            query_builder = query_builder.bind(hire_date);
        }

        if let Some(termination_date) = input.termination_date {
            query_builder = query_builder.bind(termination_date);
        }

        if let Some(status) = input.status {
            query_builder = query_builder.bind(status);
        }

        let mut user = query_builder.fetch_one(pool).await?;

        // Update full_name if first or last name changed
        if input.first_name.is_some() || input.last_name.is_some() {
            let full_name = format!("{} {}", user.first_name, user.last_name);
            user = sqlx::query_as::<_, User>(
                r#"
                UPDATE hr_public.users
                SET full_name = $1
                WHERE id = $2
                RETURNING id, email, first_name, last_name, full_name, phone,
                          department_id, manager_id, hire_date, termination_date,
                          status, created_at, updated_at, deleted_at
                "#,
            )
            .bind(&full_name)
            .bind(id)
            .fetch_one(pool)
            .await?;
        }

        Ok(user)
    }

    /// Soft delete a user (sets deleted_at timestamp)
    async fn delete_user(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let result = sqlx::query(
            "UPDATE hr_public.users SET deleted_at = $1 WHERE id = $2 AND deleted_at IS NULL",
        )
        .bind(Utc::now())
        .bind(id)
        .execute(pool)
        .await?;

        Ok(result.rows_affected() > 0)
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

        let department = department::ActiveModel {
            name: Set(input.name.clone()),
            description: Set(input.description.clone()),
            manager_id: Set(input.manager_id),
            ..Default::default()
        };

        let department = department.insert(db).await?;

        // Convert SeaORM model to legacy Department struct for compatibility
        let department = Department {
            id: department.id,
            name: department.name,
            description: department.description,
            parent_department_id: department.parent_department_id,
            manager_id: department.manager_id,
            created_at: department.created_at,
            updated_at: department.updated_at,
        };

        Ok(department)
            .map_err(|e| {
                tracing::error!("Failed to create department: {}", e);
                Error::new("Failed to create department")
            })
    }

    /// Update an existing department
    async fn update_department(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateDepartmentInput,
    ) -> Result<Department> {
        let pool = ctx.data::<DatabaseConnection>()?;

        // Build dynamic UPDATE query based on provided fields
        let mut updates = Vec::new();
        let mut param_count = 2; // Start at 2 because $1 is the ID

        if input.name.is_some() {
            updates.push(format!("name = ${}", param_count));
            param_count += 1;
        }

        if input.description.is_some() {
            updates.push(format!("description = ${}", param_count));
            param_count += 1;
        }

        if input.manager_id.is_some() {
            updates.push(format!("manager_id = ${}", param_count));
            param_count += 1;
        }

        if updates.is_empty() {
            return Err("No fields to update".into());
        }

        // Always update updated_at timestamp
        updates.push("updated_at = NOW()".to_string());

        let query = format!(
            r#"
            UPDATE hr_public.departments
            SET {}
            WHERE id = $1
            RETURNING id, name, description, manager_id,
                      created_at, updated_at
            "#,
            updates.join(", ")
        );

        let mut query_builder = sqlx::query_as::<_, Department>(&query).bind(id);

        if let Some(name) = input.name {
            query_builder = query_builder.bind(name);
        }

        if let Some(description) = input.description {
            query_builder = query_builder.bind(description);
        }

        if let Some(manager_id) = input.manager_id {
            query_builder = query_builder.bind(manager_id);
        }

        let department = query_builder.fetch_one(pool).await?;

        Ok(department)
    }

    /// Soft delete a department (sets deleted_at timestamp)
    async fn delete_department(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let result = sqlx::query(
            "UPDATE hr_public.departments SET deleted_at = $1 WHERE id = $2 AND deleted_at IS NULL",
        )
        .bind(Utc::now())
        .bind(id)
        .execute(pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    // ============================================================
    // Role Mutations
    // ============================================================

    /// Create a new role
    async fn create_role(&self, ctx: &Context<'_>, input: CreateRoleInput) -> Result<Role> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let role = sqlx::query_as::<_, Role>(
            r#"
            INSERT INTO hr_public.roles (name, description, level)
            VALUES ($1, $2, $3)
            RETURNING id, name, description, level,
                      created_at, updated_at, deleted_at
            "#,
        )
        .bind(&input.name)
        .bind(&input.description)
        .bind(input.level)
        .fetch_one(pool)
        .await?;

        Ok(role)
    }

    /// Update an existing role
    async fn update_role(&self, ctx: &Context<'_>, id: Uuid, input: UpdateRoleInput) -> Result<Role> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let mut updates = Vec::new();
        let mut param_count = 2;

        if input.name.is_some() {
            updates.push(format!("name = ${}", param_count));
            param_count += 1;
        }

        if input.description.is_some() {
            updates.push(format!("description = ${}", param_count));
            param_count += 1;
        }

        if input.level.is_some() {
            updates.push(format!("level = ${}", param_count));
            param_count += 1;
        }

        if updates.is_empty() {
            return Err("No fields to update".into());
        }

        updates.push("updated_at = NOW()".to_string());

        let query = format!(
            r#"
            UPDATE hr_public.roles
            SET {}
            WHERE id = $1 AND deleted_at IS NULL
            RETURNING id, name, description, level,
                      created_at, updated_at, deleted_at
            "#,
            updates.join(", ")
        );

        let mut query_builder = sqlx::query_as::<_, Role>(&query).bind(id);

        if let Some(name) = input.name {
            query_builder = query_builder.bind(name);
        }

        if let Some(description) = input.description {
            query_builder = query_builder.bind(description);
        }

        if let Some(level) = input.level {
            query_builder = query_builder.bind(level);
        }

        let role = query_builder.fetch_one(pool).await?;

        Ok(role)
    }

    /// Soft delete a role
    async fn delete_role(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let result = sqlx::query(
            "UPDATE hr_public.roles SET deleted_at = $1 WHERE id = $2 AND deleted_at IS NULL",
        )
        .bind(Utc::now())
        .bind(id)
        .execute(pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    // ============================================================
    // Permission Mutations
    // ============================================================

    /// Create a new permission
    async fn create_permission(&self, ctx: &Context<'_>, input: CreatePermissionInput) -> Result<Permission> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let permission = sqlx::query_as::<_, Permission>(
            r#"
            INSERT INTO hr_public.permissions (resource, action, description)
            VALUES ($1, $2, $3)
            RETURNING id, resource, action, description,
                      created_at, updated_at, deleted_at
            "#,
        )
        .bind(&input.resource)
        .bind(&input.action)
        .bind(&input.description)
        .fetch_one(pool)
        .await?;

        Ok(permission)
    }

    /// Update an existing permission
    async fn update_permission(&self, ctx: &Context<'_>, id: Uuid, input: UpdatePermissionInput) -> Result<Permission> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let mut updates = Vec::new();
        let mut param_count = 2;

        if input.resource.is_some() {
            updates.push(format!("resource = ${}", param_count));
            param_count += 1;
        }

        if input.action.is_some() {
            updates.push(format!("action = ${}", param_count));
            param_count += 1;
        }

        if input.description.is_some() {
            updates.push(format!("description = ${}", param_count));
            param_count += 1;
        }

        if updates.is_empty() {
            return Err("No fields to update".into());
        }

        updates.push("updated_at = NOW()".to_string());

        let query = format!(
            r#"
            UPDATE hr_public.permissions
            SET {}
            WHERE id = $1 AND deleted_at IS NULL
            RETURNING id, resource, action, description,
                      created_at, updated_at, deleted_at
            "#,
            updates.join(", ")
        );

        let mut query_builder = sqlx::query_as::<_, Permission>(&query).bind(id);

        if let Some(resource) = input.resource {
            query_builder = query_builder.bind(resource);
        }

        if let Some(action) = input.action {
            query_builder = query_builder.bind(action);
        }

        if let Some(description) = input.description {
            query_builder = query_builder.bind(description);
        }

        let permission = query_builder.fetch_one(pool).await?;

        Ok(permission)
    }

    /// Soft delete a permission
    async fn delete_permission(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let result = sqlx::query(
            "UPDATE hr_public.permissions SET deleted_at = $1 WHERE id = $2 AND deleted_at IS NULL",
        )
        .bind(Utc::now())
        .bind(id)
        .execute(pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    // ============================================================
    // User Role Assignment Mutations
    // ============================================================

    /// Assign a role to a user
    async fn assign_role_to_user(&self, ctx: &Context<'_>, input: AssignRoleInput) -> Result<UserRoleAssignment> {
        let pool = ctx.data::<DatabaseConnection>()?;

        // Get the assigner's user ID from context if available
        let assigner_id = ctx.data_opt::<UserContext>().map(|uc| uc.user_id);

        let assignment = sqlx::query_as::<_, UserRoleAssignment>(
            r#"
            INSERT INTO hr_public.user_role_assignments
            (user_id, role_id, assigned_by, assigned_at)
            VALUES ($1, $2, $3, NOW())
            RETURNING id, user_id, role_id, assigned_by, assigned_at,
                      created_at, updated_at, deleted_at
            "#,
        )
        .bind(input.user_id)
        .bind(input.role_id)
        .bind(assigner_id)
        .fetch_one(pool)
        .await?;

        Ok(assignment)
    }

    /// Remove a role from a user (soft delete the assignment)
    async fn remove_role_from_user(&self, ctx: &Context<'_>, user_id: Uuid, role_id: Uuid) -> Result<bool> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let result = sqlx::query(
            r#"
            UPDATE hr_public.user_role_assignments
            SET deleted_at = $1
            WHERE user_id = $2 AND role_id = $3 AND deleted_at IS NULL
            "#,
        )
        .bind(Utc::now())
        .bind(user_id)
        .bind(role_id)
        .execute(pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    /// Assign a permission to a role
    async fn assign_permission_to_role(&self, ctx: &Context<'_>, role_id: Uuid, permission_id: Uuid) -> Result<bool> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let result = sqlx::query(
            r#"
            INSERT INTO hr_public.role_permissions (role_id, permission_id)
            VALUES ($1, $2)
            ON CONFLICT (role_id, permission_id) DO NOTHING
            "#,
        )
        .bind(role_id)
        .bind(permission_id)
        .execute(pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    /// Remove a permission from a role (soft delete)
    async fn remove_permission_from_role(&self, ctx: &Context<'_>, role_id: Uuid, permission_id: Uuid) -> Result<bool> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let result = sqlx::query(
            r#"
            UPDATE hr_public.role_permissions
            SET deleted_at = $1
            WHERE role_id = $2 AND permission_id = $3 AND deleted_at IS NULL
            "#,
        )
        .bind(Utc::now())
        .bind(role_id)
        .bind(permission_id)
        .execute(pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    // ============================================================
    // Event Mutations
    // ============================================================

    /// Create a new event
    async fn create_event(&self, ctx: &Context<'_>, input: CreateEventInput) -> Result<Event> {
        let pool = ctx.data::<DatabaseConnection>()?;

        // Get the creator's user ID from context
        let creator_id = ctx
            .data_opt::<UserContext>()
            .map(|uc| uc.user_id)
            .ok_or("User context not found - authentication required")?;

        let event = sqlx::query_as::<_, Event>(
            r#"
            INSERT INTO hr_public.events
            (title, description, location, start_time, end_time, is_all_day,
             recurrence_rule, recurrence_end_date, capacity, image_url,
             image_aspect_ratio, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id, title, description, location, start_time, end_time,
                      is_all_day, recurrence_rule, recurrence_end_date, capacity,
                      image_url, image_aspect_ratio, created_by,
                      created_at, updated_at, deleted_at
            "#,
        )
        .bind(&input.title)
        .bind(&input.description)
        .bind(&input.location)
        .bind(input.start_time)
        .bind(input.end_time)
        .bind(input.is_all_day)
        .bind(&input.recurrence_rule)
        .bind(input.recurrence_end_date)
        .bind(input.capacity)
        .bind(&input.image_url)
        .bind(&input.image_aspect_ratio)
        .bind(creator_id)
        .fetch_one(pool)
        .await?;

        Ok(event)
    }

    /// Update an existing event
    async fn update_event(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateEventInput,
    ) -> Result<Event> {
        let pool = ctx.data::<DatabaseConnection>()?;

        // Build dynamic UPDATE query based on provided fields
        let mut updates = Vec::new();
        let mut param_count = 2; // Start at 2 because $1 is the ID

        if input.title.is_some() {
            updates.push(format!("title = ${}", param_count));
            param_count += 1;
        }

        if input.description.is_some() {
            updates.push(format!("description = ${}", param_count));
            param_count += 1;
        }

        if input.location.is_some() {
            updates.push(format!("location = ${}", param_count));
            param_count += 1;
        }

        if input.start_time.is_some() {
            updates.push(format!("start_time = ${}", param_count));
            param_count += 1;
        }

        if input.end_time.is_some() {
            updates.push(format!("end_time = ${}", param_count));
            param_count += 1;
        }

        if input.is_all_day.is_some() {
            updates.push(format!("is_all_day = ${}", param_count));
            param_count += 1;
        }

        if input.recurrence_rule.is_some() {
            updates.push(format!("recurrence_rule = ${}", param_count));
            param_count += 1;
        }

        if input.recurrence_end_date.is_some() {
            updates.push(format!("recurrence_end_date = ${}", param_count));
            param_count += 1;
        }

        if input.capacity.is_some() {
            updates.push(format!("capacity = ${}", param_count));
            param_count += 1;
        }

        if input.image_url.is_some() {
            updates.push(format!("image_url = ${}", param_count));
            param_count += 1;
        }

        if input.image_aspect_ratio.is_some() {
            updates.push(format!("image_aspect_ratio = ${}", param_count));
            param_count += 1;
        }

        if updates.is_empty() {
            return Err("No fields to update".into());
        }

        // Always update updated_at timestamp
        updates.push("updated_at = NOW()".to_string());

        let query = format!(
            r#"
            UPDATE hr_public.events
            SET {}
            WHERE id = $1 AND deleted_at IS NULL
            RETURNING id, title, description, location, start_time, end_time,
                      is_all_day, recurrence_rule, recurrence_end_date, capacity,
                      image_url, image_aspect_ratio, created_by,
                      created_at, updated_at, deleted_at
            "#,
            updates.join(", ")
        );

        let mut query_builder = sqlx::query_as::<_, Event>(&query).bind(id);

        if let Some(title) = input.title {
            query_builder = query_builder.bind(title);
        }

        if let Some(description) = input.description {
            query_builder = query_builder.bind(description);
        }

        if let Some(location) = input.location {
            query_builder = query_builder.bind(location);
        }

        if let Some(start_time) = input.start_time {
            query_builder = query_builder.bind(start_time);
        }

        if let Some(end_time) = input.end_time {
            query_builder = query_builder.bind(end_time);
        }

        if let Some(is_all_day) = input.is_all_day {
            query_builder = query_builder.bind(is_all_day);
        }

        if let Some(recurrence_rule) = input.recurrence_rule {
            query_builder = query_builder.bind(recurrence_rule);
        }

        if let Some(recurrence_end_date) = input.recurrence_end_date {
            query_builder = query_builder.bind(recurrence_end_date);
        }

        if let Some(capacity) = input.capacity {
            query_builder = query_builder.bind(capacity);
        }

        if let Some(image_url) = input.image_url {
            query_builder = query_builder.bind(image_url);
        }

        if let Some(image_aspect_ratio) = input.image_aspect_ratio {
            query_builder = query_builder.bind(image_aspect_ratio);
        }

        let event = query_builder.fetch_one(pool).await?;

        Ok(event)
    }

    /// Soft delete an event (sets deleted_at timestamp)
    async fn delete_event(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let result = sqlx::query(
            "UPDATE hr_public.events SET deleted_at = $1 WHERE id = $2 AND deleted_at IS NULL",
        )
        .bind(Utc::now())
        .bind(id)
        .execute(pool)
        .await?;

        Ok(result.rows_affected() > 0)
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
        let pool = ctx.data::<DatabaseConnection>()?;

        let leave_type = sqlx::query_as::<_, LeaveType>(
            r#"
            INSERT INTO hr_public.leave_types
            (name, description, default_days_per_year, requires_approval,
             max_consecutive_days, is_paid, color, icon)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, name, description, default_days_per_year,
                      requires_approval, max_consecutive_days, is_paid,
                      color, icon, created_at, updated_at, deleted_at
            "#,
        )
        .bind(&input.name)
        .bind(&input.description)
        .bind(input.default_days_per_year)
        .bind(input.requires_approval)
        .bind(input.max_consecutive_days)
        .bind(input.is_paid)
        .bind(&input.color)
        .bind(&input.icon)
        .fetch_one(pool)
        .await?;

        Ok(leave_type)
    }

    /// Update an existing leave type
    async fn update_leave_type(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateLeaveTypeInput,
    ) -> Result<LeaveType> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let mut updates = Vec::new();
        let mut param_count = 2;

        if input.name.is_some() {
            updates.push(format!("name = ${}", param_count));
            param_count += 1;
        }

        if input.description.is_some() {
            updates.push(format!("description = ${}", param_count));
            param_count += 1;
        }

        if input.default_days_per_year.is_some() {
            updates.push(format!("default_days_per_year = ${}", param_count));
            param_count += 1;
        }

        if input.requires_approval.is_some() {
            updates.push(format!("requires_approval = ${}", param_count));
            param_count += 1;
        }

        if input.max_consecutive_days.is_some() {
            updates.push(format!("max_consecutive_days = ${}", param_count));
            param_count += 1;
        }

        if input.is_paid.is_some() {
            updates.push(format!("is_paid = ${}", param_count));
            param_count += 1;
        }

        if input.color.is_some() {
            updates.push(format!("color = ${}", param_count));
            param_count += 1;
        }

        if input.icon.is_some() {
            updates.push(format!("icon = ${}", param_count));
            param_count += 1;
        }

        if updates.is_empty() {
            return Err("No fields to update".into());
        }

        updates.push("updated_at = NOW()".to_string());

        let query = format!(
            r#"
            UPDATE hr_public.leave_types
            SET {}
            WHERE id = $1 AND deleted_at IS NULL
            RETURNING id, name, description, default_days_per_year,
                      requires_approval, max_consecutive_days, is_paid,
                      color, icon, created_at, updated_at, deleted_at
            "#,
            updates.join(", ")
        );

        let mut query_builder = sqlx::query_as::<_, LeaveType>(&query).bind(id);

        if let Some(name) = input.name {
            query_builder = query_builder.bind(name);
        }

        if let Some(description) = input.description {
            query_builder = query_builder.bind(description);
        }

        if let Some(days) = input.default_days_per_year {
            query_builder = query_builder.bind(days);
        }

        if let Some(requires_approval) = input.requires_approval {
            query_builder = query_builder.bind(requires_approval);
        }

        if let Some(max_days) = input.max_consecutive_days {
            query_builder = query_builder.bind(max_days);
        }

        if let Some(is_paid) = input.is_paid {
            query_builder = query_builder.bind(is_paid);
        }

        if let Some(color) = input.color {
            query_builder = query_builder.bind(color);
        }

        if let Some(icon) = input.icon {
            query_builder = query_builder.bind(icon);
        }

        let leave_type = query_builder.fetch_one(pool).await?;

        Ok(leave_type)
    }

    /// Soft delete a leave type
    async fn delete_leave_type(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let result = sqlx::query(
            "UPDATE hr_public.leave_types SET deleted_at = $1 WHERE id = $2 AND deleted_at IS NULL",
        )
        .bind(Utc::now())
        .bind(id)
        .execute(pool)
        .await?;

        Ok(result.rows_affected() > 0)
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
        let pool = ctx.data::<DatabaseConnection>()?;

        let balance = sqlx::query_as::<_, LeaveBalance>(
            r#"
            INSERT INTO hr_public.time_off_balances
            (employee_id, policy_id, year, balance_days, used_days)
            VALUES ($1, $2, $3, $4, 0)
            RETURNING id, employee_id, policy_id, year, balance_days, used_days,
                      created_at, updated_at
            "#,
        )
        .bind(input.employee_id)
        .bind(input.policy_id)
        .bind(input.year)
        .bind(input.balance_days)
        .fetch_one(pool)
        .await?;

        Ok(balance)
    }

    /// Update an existing leave balance
    async fn update_leave_balance(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateLeaveBalanceInput,
    ) -> Result<LeaveBalance> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let mut updates = Vec::new();
        let mut param_count = 2;

        if input.balance_days.is_some() {
            updates.push(format!("balance_days = ${}", param_count));
            param_count += 1;
        }

        if input.used_days.is_some() {
            updates.push(format!("used_days = ${}", param_count));
            param_count += 1;
        }



        if updates.is_empty() {
            return Err("No fields to update".into());
        }

        updates.push("updated_at = NOW()".to_string());

        let query = format!(
            r#"
            UPDATE hr_public.time_off_balances
            SET {}
            WHERE id = $1
            RETURNING id, employee_id, policy_id, year, balance_days, used_days,
                      created_at, updated_at
            "#,
            updates.join(", ")
        );

        let mut query_builder = sqlx::query_as::<_, LeaveBalance>(&query).bind(id);

        if let Some(balance) = input.balance_days {
            query_builder = query_builder.bind(balance);
        }

        if let Some(used) = input.used_days {
            query_builder = query_builder.bind(used);
        }



        let balance = query_builder.fetch_one(pool).await?;

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

        let request = leave_request::ActiveModel {
            employee_id: Set(user_id),
            leave_type: Set(input.leave_type.clone()),
            start_date: Set(input.start_date),
            end_date: Set(input.end_date),
            days_requested: Set(input.days_requested),
            status: Set("pending".to_string()),
            reason: Set(input.reason.clone()),
            ..Default::default()
        };

        let request = request.insert(db).await?;

        // Convert SeaORM model to legacy LeaveRequest struct for compatibility
        let request = LeaveRequest {
            id: request.id,
            employee_id: request.employee_id,
            manager_id: request.manager_id,
            leave_type: request.leave_type,
            start_date: request.start_date,
            end_date: request.end_date,
            days_requested: request.days_requested,
            status: LeaveRequestStatus::from_str(&request.status).unwrap_or(LeaveRequestStatus::Pending),
            reason: request.reason,
            manager_comments: request.manager_comments,
            created_at: request.created_at,
            updated_at: request.updated_at,
            deleted_at: request.deleted_at,
        };

        Ok(request)
            .map_err(|e| {
                tracing::error!("Failed to create leave request: {}", e);
                Error::new("Failed to create leave request")
            })
    }

    /// Update an existing leave request (only for pending requests)
    async fn update_leave_request(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateLeaveRequestInput,
    ) -> Result<LeaveRequest> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let mut updates = Vec::new();
        let mut param_count = 2;

        if input.start_date.is_some() {
            updates.push(format!("start_date = ${}", param_count));
            param_count += 1;
        }

        if input.end_date.is_some() {
            updates.push(format!("end_date = ${}", param_count));
            param_count += 1;
        }

        if input.days_requested.is_some() {
            updates.push(format!("days_requested = ${}", param_count));
            param_count += 1;
        }

        if input.reason.is_some() {
            updates.push(format!("reason = ${}", param_count));
            param_count += 1;
        }

        if updates.is_empty() {
            return Err("No fields to update".into());
        }

        updates.push("updated_at = NOW()".to_string());

        let query = format!(
            r#"
            UPDATE hr_public.leave_requests
            SET {}
            WHERE id = $1 AND status = 'pending' AND deleted_at IS NULL
            RETURNING id, user_id, leave_type_id, start_date, end_date,
                      days_requested, status, reason, approved_by, approved_at,
                      rejection_reason, created_at, updated_at, deleted_at
            "#,
            updates.join(", ")
        );

        let mut query_builder = sqlx::query_as::<_, LeaveRequest>(&query).bind(id);

        if let Some(start) = input.start_date {
            query_builder = query_builder.bind(start);
        }

        if let Some(end) = input.end_date {
            query_builder = query_builder.bind(end);
        }

        if let Some(days) = input.days_requested {
            query_builder = query_builder.bind(days);
        }

        if let Some(reason) = input.reason {
            query_builder = query_builder.bind(reason);
        }

        let request = query_builder.fetch_one(pool).await?;

        Ok(request)
    }

    /// Approve a leave request
    async fn approve_leave_request(
        &self,
        ctx: &Context<'_>,
        input: ApproveLeaveRequestInput,
    ) -> Result<LeaveRequest> {
        let pool = ctx.data::<DatabaseConnection>()?;

        // Get approver ID from context
        let approver_id = ctx
            .data_opt::<UserContext>()
            .map(|uc| uc.user_id)
            .ok_or("User context not found - authentication required")?;

        let request = sqlx::query_as::<_, LeaveRequest>(
            r#"
            UPDATE hr_public.leave_requests
            SET status = 'approved', approved_by = $1, approved_at = NOW(), updated_at = NOW()
            WHERE id = $2 AND status = 'pending' AND deleted_at IS NULL
            RETURNING id, user_id, leave_type_id, start_date, end_date,
                      days_requested, status, reason, approved_by, approved_at,
                      rejection_reason, created_at, updated_at, deleted_at
            "#,
        )
        .bind(approver_id)
        .bind(input.request_id)
        .fetch_one(pool)
        .await?;

        Ok(request)
    }

    /// Reject a leave request
    async fn reject_leave_request(
        &self,
        ctx: &Context<'_>,
        input: RejectLeaveRequestInput,
    ) -> Result<LeaveRequest> {
        let pool = ctx.data::<DatabaseConnection>()?;

        // Get approver ID from context
        let approver_id = ctx
            .data_opt::<UserContext>()
            .map(|uc| uc.user_id)
            .ok_or("User context not found - authentication required")?;

        let request = sqlx::query_as::<_, LeaveRequest>(
            r#"
            UPDATE hr_public.leave_requests
            SET status = 'rejected', approved_by = $1, approved_at = NOW(),
                rejection_reason = $2, updated_at = NOW()
            WHERE id = $3 AND status = 'pending' AND deleted_at IS NULL
            RETURNING id, user_id, leave_type_id, start_date, end_date,
                      days_requested, status, reason, approved_by, approved_at,
                      rejection_reason, created_at, updated_at, deleted_at
            "#,
        )
        .bind(approver_id)
        .bind(&input.rejection_reason)
        .bind(input.request_id)
        .fetch_one(pool)
        .await?;

        Ok(request)
    }

    /// Cancel a leave request (by the user who created it)
    async fn cancel_leave_request(&self, ctx: &Context<'_>, id: Uuid) -> Result<LeaveRequest> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let request = sqlx::query_as::<_, LeaveRequest>(
            r#"
            UPDATE hr_public.leave_requests
            SET status = 'cancelled', updated_at = NOW()
            WHERE id = $1 AND status IN ('pending', 'approved') AND deleted_at IS NULL
            RETURNING id, user_id, leave_type_id, start_date, end_date,
                      days_requested, status, reason, approved_by, approved_at,
                      rejection_reason, created_at, updated_at, deleted_at
            "#,
        )
        .bind(id)
        .fetch_one(pool)
        .await?;

        Ok(request)
    }

    /// Soft delete a leave request
    async fn delete_leave_request(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let result = sqlx::query(
            "UPDATE hr_public.leave_requests SET deleted_at = $1 WHERE id = $2 AND deleted_at IS NULL",
        )
        .bind(Utc::now())
        .bind(id)
        .execute(pool)
        .await?;

        Ok(result.rows_affected() > 0)
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

        let task = task::ActiveModel {
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
            requires_manual_reassignment: Set(input.requires_manual_reassignment.unwrap_or(false)),
            ..Default::default()
        };

        let task = task.insert(db).await?;

        // Create audit entry for task creation
        let audit_entry = task_audit_entry::ActiveModel {
            task_id: Set(task.id),
            changed_by: Set(creator_id),
            change_type: Set("created".to_string()),
            new_value: Set(serde_json::to_value(&task).unwrap_or_default()),
            ..Default::default()
        };
        let _ = audit_entry.insert(db).await;

        // Convert SeaORM model to legacy Task struct for compatibility
        let task = Task {
            id: task.id,
            title: task.title,
            description: task.description,
            task_type_id: task.task_type_id,
            status: TaskStatus::from_str(&task.status).unwrap_or(TaskStatus::Todo),
            priority: TaskPriority::from_str(&task.priority).unwrap_or(TaskPriority::Medium),
            due_date: task.due_date,
            completed_at: task.completed_at,
            estimated_hours: task.estimated_hours,
            actual_hours: task.actual_hours,
            tags: task.tags,
            department_id: task.department_id,
            created_by: task.created_by,
            assignee_id: task.assignee_id,
            parent_task_id: task.parent_task_id,
            requires_manual_reassignment: task.requires_manual_reassignment,
            archived: task.archived,
            archived_at: task.archived_at,
            archived_by: task.archived_by,
            created_at: task.created_at,
            updated_at: task.updated_at,
            deleted_at: task.deleted_at,
        };

        Ok(task)
    }

    /// Update an existing task
    async fn update_task(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateTaskInput,
    ) -> Result<Task> {
        let pool = ctx.data::<DatabaseConnection>()?;

        // Get user ID from context for audit trail
        let user_id = ctx
            .data_opt::<UserContext>()
            .map(|uc| uc.user_id)
            .ok_or("User context not found - authentication required")?;

        let mut updates = Vec::new();
        let mut param_count = 2;

        if input.title.is_some() {
            updates.push(format!("title = ${}", param_count));
            param_count += 1;
        }

        if input.description.is_some() {
            updates.push(format!("description = ${}", param_count));
            param_count += 1;
        }

        if input.status.is_some() {
            updates.push(format!("status = ${}", param_count));
            param_count += 1;
        }

        if input.priority.is_some() {
            updates.push(format!("priority = ${}", param_count));
            param_count += 1;
        }

        if input.due_date.is_some() {
            updates.push(format!("due_date = ${}", param_count));
            param_count += 1;
        }

        if input.estimated_hours.is_some() {
            updates.push(format!("estimated_hours = ${}", param_count));
            param_count += 1;
        }

        if input.actual_hours.is_some() {
            updates.push(format!("actual_hours = ${}", param_count));
            param_count += 1;
        }

        if input.tags.is_some() {
            updates.push(format!("tags = ${}", param_count));
            param_count += 1;
        }

        if input.department_id.is_some() {
            updates.push(format!("department_id = ${}", param_count));
            param_count += 1;
        }

        if input.task_type_id.is_some() {
            updates.push(format!("task_type_id = ${}", param_count));
            param_count += 1;
        }

        if input.assignee_id.is_some() {
            updates.push(format!("assignee_id = ${}", param_count));
            param_count += 1;
        }

        if input.parent_task_id.is_some() {
            updates.push(format!("parent_task_id = ${}", param_count));
            param_count += 1;
        }

        if input.requires_manual_reassignment.is_some() {
            updates.push(format!("requires_manual_reassignment = ${}", param_count));
            param_count += 1;
        }

        if input.archived.is_some() {
            updates.push(format!("archived = ${}", param_count));
            param_count += 1;
        }

        if updates.is_empty() {
            return Err("No fields to update".into());
        }

        // Update completed_at if status changed to done
        if let Some(status) = &input.status {
            if *status == TaskStatus::Done {
                updates.push("completed_at = NOW()".to_string());
            }
        }

        updates.push("updated_at = NOW()".to_string());

        let query = format!(
            r#"
            UPDATE hr_public.tasks
            SET {}
            WHERE id = $1 AND deleted_at IS NULL
            RETURNING id, title, description, task_type_id, status, priority, due_date,
                      completed_at, estimated_hours, actual_hours, tags, department_id,
                      created_by, assignee_id, parent_task_id, requires_manual_reassignment,
                      archived, archived_at, archived_by,
                      created_at, updated_at, deleted_at
            "#,
            updates.join(", ")
        );

        let mut query_builder = sqlx::query_as::<_, Task>(&query).bind(id);

        if let Some(title) = input.title {
            query_builder = query_builder.bind(title);
        }

        if let Some(description) = input.description {
            query_builder = query_builder.bind(description);
        }

        if let Some(status) = input.status {
            query_builder = query_builder.bind(status);
        }

        if let Some(priority) = input.priority {
            query_builder = query_builder.bind(priority);
        }

        if let Some(due_date) = input.due_date {
            query_builder = query_builder.bind(due_date);
        }


        if let Some(estimated) = input.estimated_hours {
            query_builder = query_builder.bind(estimated);
        }

        if let Some(actual) = input.actual_hours {
            query_builder = query_builder.bind(actual);
        }

        if let Some(tags) = input.tags {
            query_builder = query_builder.bind(tags);
        }

        if let Some(dept_id) = input.department_id {
            query_builder = query_builder.bind(dept_id);
        }

        if let Some(task_type_id) = input.task_type_id {
            query_builder = query_builder.bind(task_type_id);
        }

        if let Some(assignee_id) = input.assignee_id {
            query_builder = query_builder.bind(assignee_id);
        }

        if let Some(parent_task_id) = input.parent_task_id {
            query_builder = query_builder.bind(parent_task_id);
        }

        if let Some(requires_manual) = input.requires_manual_reassignment {
            query_builder = query_builder.bind(requires_manual);
        }

        if let Some(archived) = input.archived {
            query_builder = query_builder.bind(archived);
        }

        let task = query_builder.fetch_one(pool).await?;

        // Create audit entry for task update
        let _ = sqlx::query(
            r#"
            INSERT INTO hr_public.task_audit_entries
            (task_id, user_id, action, comment)
            VALUES ($1, $2, 'updated', 'Task updated')
            "#,
        )
        .bind(task.id)
        .bind(user_id)
        .execute(pool)
        .await;

        Ok(task)
    }

    /// Change task status with optional comment
    async fn change_task_status(
        &self,
        ctx: &Context<'_>,
        input: ChangeTaskStatusInput,
    ) -> Result<Task> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let user_id = ctx
            .data_opt::<UserContext>()
            .map(|uc| uc.user_id)
            .ok_or("User context not found - authentication required")?;

        // Get old status for audit trail
        let old_status: (TaskStatus,) = sqlx::query_as(
            "SELECT status FROM hr_public.tasks WHERE id = $1 AND deleted_at IS NULL",
        )
        .bind(input.task_id)
        .fetch_one(pool)
        .await?;

        // Update task status
        let mut query = format!(
            "UPDATE hr_public.tasks SET status = $1, updated_at = NOW()"
        );

        // If changing to done, set completed_at
        if input.status == TaskStatus::Done {
            query.push_str(", completed_at = NOW()");
        }

        query.push_str(" WHERE id = $2 AND deleted_at IS NULL RETURNING id, title, description, status, priority, due_date, start_date, completed_at, estimated_hours, actual_hours, tags, department_id, created_by, created_at, updated_at, deleted_at");

        let task = sqlx::query_as::<_, Task>(&query)
            .bind(input.status)
            .bind(input.task_id)
            .fetch_one(pool)
            .await?;

        // Create audit entry
        let _ = sqlx::query(
            r#"
            INSERT INTO hr_public.task_audit_entries
            (task_id, user_id, action, field_name, old_value, new_value, comment)
            VALUES ($1, $2, 'status_changed', 'status', $3, $4, $5)
            "#,
        )
        .bind(task.id)
        .bind(user_id)
        .bind(format!("{:?}", old_status.0))
        .bind(format!("{:?}", input.status))
        .bind(&input.comment)
        .execute(pool)
        .await;

        Ok(task)
    }

    /// Soft delete a task
    async fn delete_task(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let user_id = ctx
            .data_opt::<UserContext>()
            .map(|uc| uc.user_id);

        let result = sqlx::query(
            "UPDATE hr_public.tasks SET deleted_at = $1 WHERE id = $2 AND deleted_at IS NULL",
        )
        .bind(Utc::now())
        .bind(id)
        .execute(pool)
        .await?;

        // Create audit entry if user context available
        if let Some(uid) = user_id {
            let _ = sqlx::query(
                r#"
                INSERT INTO hr_public.task_audit_entries
                (task_id, user_id, action, comment)
                VALUES ($1, $2, 'deleted', 'Task deleted')
                "#,
            )
            .bind(id)
            .bind(uid)
            .execute(pool)
            .await;
        }

        Ok(result.rows_affected() > 0)
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
        let pool = ctx.data::<DatabaseConnection>()?;

        let assigner_id = ctx
            .data_opt::<UserContext>()
            .map(|uc| uc.user_id)
            .ok_or("User context not found - authentication required")?;

        let assignee = sqlx::query_as::<_, TaskAssignee>(
            r#"
            INSERT INTO hr_public.task_assignees
            (task_id, user_id, role, assigned_at, assigned_by)
            VALUES ($1, $2, $3, NOW(), $4)
            RETURNING id, task_id, user_id, role, assigned_at, assigned_by,
                      created_at, updated_at, deleted_at
            "#,
        )
        .bind(input.task_id)
        .bind(input.user_id)
        .bind(input.role)
        .bind(assigner_id)
        .fetch_one(pool)
        .await?;

        // Create audit entry
        let _ = sqlx::query(
            r#"
            INSERT INTO hr_public.task_audit_entries
            (task_id, user_id, action, comment)
            VALUES ($1, $2, 'assigned', 'User assigned to task')
            "#,
        )
        .bind(input.task_id)
        .bind(assigner_id)
        .execute(pool)
        .await;

        Ok(assignee)
    }

    /// Update task assignee role
    async fn update_task_assignee(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateTaskAssigneeInput,
    ) -> Result<TaskAssignee> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let mut updates = Vec::new();
        let mut param_count = 2;

        if input.role.is_some() {
            updates.push(format!("role = ${}", param_count));
            param_count += 1;
        }

        if updates.is_empty() {
            return Err("No fields to update".into());
        }

        updates.push("updated_at = NOW()".to_string());

        let query = format!(
            r#"
            UPDATE hr_public.task_assignees
            SET {}
            WHERE id = $1 AND deleted_at IS NULL
            RETURNING id, task_id, user_id, role, assigned_at, assigned_by,
                      created_at, updated_at, deleted_at
            "#,
            updates.join(", ")
        );

        let mut query_builder = sqlx::query_as::<_, TaskAssignee>(&query).bind(id);

        if let Some(role) = input.role {
            query_builder = query_builder.bind(role);
        }

        let assignee = query_builder.fetch_one(pool).await?;

        Ok(assignee)
    }

    /// Remove a user from a task (soft delete)
    async fn unassign_task_from_user(
        &self,
        ctx: &Context<'_>,
        task_id: Uuid,
        user_id: Uuid,
    ) -> Result<bool> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let unassigner_id = ctx.data_opt::<UserContext>().map(|uc| uc.user_id);

        let result = sqlx::query(
            r#"
            UPDATE hr_public.task_assignees
            SET deleted_at = $1
            WHERE task_id = $2 AND user_id = $3 AND deleted_at IS NULL
            "#,
        )
        .bind(Utc::now())
        .bind(task_id)
        .bind(user_id)
        .execute(pool)
        .await?;

        // Create audit entry if user context available
        if let Some(uid) = unassigner_id {
            let _ = sqlx::query(
                r#"
                INSERT INTO hr_public.task_audit_entries
                (task_id, user_id, action, comment)
                VALUES ($1, $2, 'unassigned', 'User unassigned from task')
                "#,
            )
            .bind(task_id)
            .bind(uid)
            .execute(pool)
            .await;
        }

        Ok(result.rows_affected() > 0)
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
        let pool = ctx.data::<DatabaseConnection>()?;

        let creator_id = ctx
            .data_opt::<UserContext>()
            .map(|uc| uc.user_id)
            .ok_or("User context not found - authentication required")?;

        let dependency = sqlx::query_as::<_, TaskDependency>(
            r#"
            INSERT INTO hr_public.task_dependencies
            (task_id, depends_on_task_id, dependency_type, lag_days, created_by)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, task_id, depends_on_task_id, dependency_type, lag_days,
                      created_by, created_at, updated_at, deleted_at
            "#,
        )
        .bind(input.task_id)
        .bind(input.depends_on_task_id)
        .bind(input.dependency_type)
        .bind(input.lag_days)
        .bind(creator_id)
        .fetch_one(pool)
        .await?;

        Ok(dependency)
    }

    /// Update a task dependency
    async fn update_task_dependency(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateTaskDependencyInput,
    ) -> Result<TaskDependency> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let mut updates = Vec::new();
        let mut param_count = 2;

        if input.dependency_type.is_some() {
            updates.push(format!("dependency_type = ${}", param_count));
            param_count += 1;
        }

        if input.lag_days.is_some() {
            updates.push(format!("lag_days = ${}", param_count));
            param_count += 1;
        }

        if updates.is_empty() {
            return Err("No fields to update".into());
        }

        updates.push("updated_at = NOW()".to_string());

        let query = format!(
            r#"
            UPDATE hr_public.task_dependencies
            SET {}
            WHERE id = $1 AND deleted_at IS NULL
            RETURNING id, task_id, depends_on_task_id, dependency_type, lag_days,
                      created_by, created_at, updated_at, deleted_at
            "#,
            updates.join(", ")
        );

        let mut query_builder = sqlx::query_as::<_, TaskDependency>(&query).bind(id);

        if let Some(dep_type) = input.dependency_type {
            query_builder = query_builder.bind(dep_type);
        }

        if let Some(lag) = input.lag_days {
            query_builder = query_builder.bind(lag);
        }

        let dependency = query_builder.fetch_one(pool).await?;

        Ok(dependency)
    }

    /// Delete a task dependency (soft delete)
    async fn delete_task_dependency(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let result = sqlx::query(
            "UPDATE hr_public.task_dependencies SET deleted_at = $1 WHERE id = $2 AND deleted_at IS NULL",
        )
        .bind(Utc::now())
        .bind(id)
        .execute(pool)
        .await?;

        Ok(result.rows_affected() > 0)
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
        let pool = ctx.data::<DatabaseConnection>()?;

        let uploader_id = ctx
            .data_opt::<UserContext>()
            .map(|uc| uc.user_id)
            .ok_or("User context not found - authentication required")?;

        let resource = sqlx::query_as::<_, LinkedResource>(
            r#"
            INSERT INTO hr_public.linked_resources
            (task_id, resource_type, title, url, file_path, file_size, mime_type,
             description, uploaded_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, task_id, resource_type, title, url, file_path, file_size,
                      mime_type, description, uploaded_by, created_at, updated_at, deleted_at
            "#,
        )
        .bind(input.task_id)
        .bind(input.resource_type)
        .bind(&input.title)
        .bind(&input.url)
        .bind(&input.file_path)
        .bind(input.file_size)
        .bind(&input.mime_type)
        .bind(&input.description)
        .bind(uploader_id)
        .fetch_one(pool)
        .await?;

        Ok(resource)
    }

    /// Update a linked resource
    async fn update_linked_resource(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateLinkedResourceInput,
    ) -> Result<LinkedResource> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let mut updates = Vec::new();
        let mut param_count = 2;

        if input.title.is_some() {
            updates.push(format!("title = ${}", param_count));
            param_count += 1;
        }

        if input.url.is_some() {
            updates.push(format!("url = ${}", param_count));
            param_count += 1;
        }

        if input.description.is_some() {
            updates.push(format!("description = ${}", param_count));
            param_count += 1;
        }

        if updates.is_empty() {
            return Err("No fields to update".into());
        }

        updates.push("updated_at = NOW()".to_string());

        let query = format!(
            r#"
            UPDATE hr_public.linked_resources
            SET {}
            WHERE id = $1 AND deleted_at IS NULL
            RETURNING id, task_id, resource_type, title, url, file_path, file_size,
                      mime_type, description, uploaded_by, created_at, updated_at, deleted_at
            "#,
            updates.join(", ")
        );

        let mut query_builder = sqlx::query_as::<_, LinkedResource>(&query).bind(id);

        if let Some(title) = input.title {
            query_builder = query_builder.bind(title);
        }

        if let Some(url) = input.url {
            query_builder = query_builder.bind(url);
        }

        if let Some(description) = input.description {
            query_builder = query_builder.bind(description);
        }

        let resource = query_builder.fetch_one(pool).await?;

        Ok(resource)
    }

    /// Delete a linked resource (soft delete)
    async fn delete_linked_resource(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let result = sqlx::query(
            "UPDATE hr_public.linked_resources SET deleted_at = $1 WHERE id = $2 AND deleted_at IS NULL",
        )
        .bind(Utc::now())
        .bind(id)
        .execute(pool)
        .await?;

        Ok(result.rows_affected() > 0)
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
        let pool = ctx.data::<DatabaseConnection>()?;

        let creator_id = ctx
            .data_opt::<UserContext>()
            .map(|uc| uc.user_id)
            .ok_or("User context not found - authentication required")?;

        let cycle = sqlx::query_as::<_, ReviewCycle>(
            r#"
            INSERT INTO hr_public.review_cycles
            (name, description, review_type, start_date, end_date, status, created_by)
            VALUES ($1, $2, $3, $4, $5, 'draft', $6)
            RETURNING id, name, description, review_type, start_date, end_date,
                      status, created_by, created_at, updated_at, deleted_at
            "#,
        )
        .bind(&input.name)
        .bind(&input.description)
        .bind(input.review_type)
        .bind(input.end_date)
        .bind(creator_id)
        .fetch_one(pool)
        .await?;

        Ok(cycle)
    }

    /// Update an existing review cycle
    async fn update_review_cycle(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateReviewCycleInput,
    ) -> Result<ReviewCycle> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let mut updates = Vec::new();
        let mut param_count = 2;

        if input.name.is_some() {
            updates.push(format!("name = ${}", param_count));
            param_count += 1;
        }

        if input.description.is_some() {
            updates.push(format!("description = ${}", param_count));
            param_count += 1;
        }

        if input.end_date.is_some() {
            updates.push(format!("end_date = ${}", param_count));
            param_count += 1;
        }

        if input.status.is_some() {
            updates.push(format!("status = ${}", param_count));
            param_count += 1;
        }

        if updates.is_empty() {
            return Err("No fields to update".into());
        }

        updates.push("updated_at = NOW()".to_string());

        let query = format!(
            r#"
            UPDATE hr_public.review_cycles
            SET {}
            WHERE id = $1 AND deleted_at IS NULL
            RETURNING id, name, description, review_type, start_date, end_date,
                      status, created_by, created_at, updated_at, deleted_at
            "#,
            updates.join(", ")
        );

        let mut query_builder = sqlx::query_as::<_, ReviewCycle>(&query).bind(id);

        if let Some(name) = input.name {
            query_builder = query_builder.bind(name);
        }

        if let Some(description) = input.description {
            query_builder = query_builder.bind(description);
        }


        if let Some(end_date) = input.end_date {
            query_builder = query_builder.bind(end_date);
        }

        if let Some(status) = input.status {
            query_builder = query_builder.bind(status);
        }

        let cycle = query_builder.fetch_one(pool).await?;

        Ok(cycle)
    }

    /// Soft delete a review cycle
    async fn delete_review_cycle(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let result = sqlx::query(
            "UPDATE hr_public.review_cycles SET deleted_at = $1 WHERE id = $2 AND deleted_at IS NULL",
        )
        .bind(Utc::now())
        .bind(id)
        .execute(pool)
        .await?;

        Ok(result.rows_affected() > 0)
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

        let review = performance_review::ActiveModel {
            employee_id: Set(input.employee_id),
            reviewer_id: Set(input.reviewer_id),
            review_period: Set(input.review_period.clone()),
            status: Set("draft".to_string()),
            ..Default::default()
        };

        let review = review.insert(db).await?;

        // Convert SeaORM model to legacy PerformanceReview struct for compatibility
        let review = PerformanceReview {
            id: review.id,
            employee_id: review.employee_id,
            reviewer_id: review.reviewer_id,
            review_period: review.review_period,
            status: PerformanceReviewStatus::from_str(&review.status).unwrap_or(PerformanceReviewStatus::NotStarted),
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
        };

        Ok(review)
            .map_err(|e| {
                tracing::error!("Failed to create performance review: {}", e);
                Error::new("Failed to create performance review")
            })
    }

    /// Update an existing performance review
    async fn update_performance_review(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdatePerformanceReviewInput,
    ) -> Result<PerformanceReview> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let mut updates = Vec::new();
        let mut param_count = 2;

        if input.status.is_some() {
            updates.push(format!("status = ${}", param_count));
            param_count += 1;
        }

        if input.overall_rating.is_some() {
            updates.push(format!("overall_rating = ${}", param_count));
            param_count += 1;
        }

        if input.goals.is_some() {
            updates.push(format!("goals = ${}", param_count));
            param_count += 1;
        }

        if input.achievements.is_some() {
            updates.push(format!("achievements = ${}", param_count));
            param_count += 1;
        }

        if input.areas_for_improvement.is_some() {
            updates.push(format!("areas_for_improvement = ${}", param_count));
            param_count += 1;
        }

        if input.manager_feedback.is_some() {
            updates.push(format!("manager_feedback = ${}", param_count));
            param_count += 1;
        }

        if input.review_period_start.is_some() {
            updates.push(format!("review_period_start = ${}", param_count));
            param_count += 1;
        }

        if input.review_period_end.is_some() {
            updates.push(format!("review_period_end = ${}", param_count));
            param_count += 1;
        }

        if input.review_type.is_some() {
            updates.push(format!("review_type = ${}", param_count));
            param_count += 1;
        }

        if input.notes.is_some() {
            updates.push(format!("notes = ${}", param_count));
            param_count += 1;
        }

        if updates.is_empty() {
            return Err("No fields to update".into());
        }

        updates.push("updated_at = NOW()".to_string());

        let query = format!(
            r#"
            UPDATE hr_public.performance_reviews
            SET {}
            WHERE id = $1
            RETURNING id, employee_id, reviewer_id, review_period, status,
                      overall_rating, goals, achievements, areas_for_improvement,
                      manager_feedback, created_at, updated_at,
                      review_period_start, review_period_end, review_type, notes
            "#,
            updates.join(", ")
        );

        let mut query_builder = sqlx::query_as::<_, PerformanceReview>(&query).bind(id);

        if let Some(status) = input.status {
            query_builder = query_builder.bind(status);
        }

        if let Some(rating_str) = input.overall_rating {
            use std::str::FromStr;
            let rating = rust_decimal::Decimal::from_str(&rating_str)
                .map_err(|_| "Invalid rating format - must be a valid decimal number")?;
            query_builder = query_builder.bind(rating);
        }

        if let Some(goals) = input.goals {
            query_builder = query_builder.bind(goals);
        }

        if let Some(achievements) = input.achievements {
            query_builder = query_builder.bind(achievements);
        }

        if let Some(areas) = input.areas_for_improvement {
            query_builder = query_builder.bind(areas);
        }

        if let Some(feedback) = input.manager_feedback {
            query_builder = query_builder.bind(feedback);
        }

        if let Some(start) = input.review_period_start {
            query_builder = query_builder.bind(start);
        }

        if let Some(end) = input.review_period_end {
            query_builder = query_builder.bind(end);
        }

        if let Some(review_type) = input.review_type {
            query_builder = query_builder.bind(review_type);
        }

        if let Some(notes) = input.notes {
            query_builder = query_builder.bind(notes);
        }

        let review = query_builder.fetch_one(pool).await?;

        Ok(review)
    }

    /// Soft delete a performance review
    async fn delete_performance_review(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let result = sqlx::query(
            "UPDATE hr_public.performance_reviews SET deleted_at = $1 WHERE id = $2 AND deleted_at IS NULL",
        )
        .bind(Utc::now())
        .bind(id)
        .execute(pool)
        .await?;

        Ok(result.rows_affected() > 0)
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
        let pool = ctx.data::<DatabaseConnection>()?;

        let goal = sqlx::query_as::<_, ReviewGoal>(
            r#"
            INSERT INTO hr_public.review_goals
            (performance_review_id, title, description, target_date, completion_status, weight)
            VALUES ($1, $2, $3, $4, 'not_started', $5)
            RETURNING id, performance_review_id, title, description, target_date,
                      completion_status, weight, created_at, updated_at, deleted_at
            "#,
        )
        .bind(input.performance_review_id)
        .bind(&input.title)
        .bind(&input.description)
        .bind(input.target_date)
        .bind(input.weight)
        .fetch_one(pool)
        .await?;

        Ok(goal)
    }

    /// Update an existing review goal
    async fn update_review_goal(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateReviewGoalInput,
    ) -> Result<ReviewGoal> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let mut updates = Vec::new();
        let mut param_count = 2;

        if input.title.is_some() {
            updates.push(format!("title = ${}", param_count));
            param_count += 1;
        }

        if input.description.is_some() {
            updates.push(format!("description = ${}", param_count));
            param_count += 1;
        }

        if input.target_date.is_some() {
            updates.push(format!("target_date = ${}", param_count));
            param_count += 1;
        }

        if input.completion_status.is_some() {
            updates.push(format!("completion_status = ${}", param_count));
            param_count += 1;
        }

        if input.weight.is_some() {
            updates.push(format!("weight = ${}", param_count));
            param_count += 1;
        }

        if updates.is_empty() {
            return Err("No fields to update".into());
        }

        updates.push("updated_at = NOW()".to_string());

        let query = format!(
            r#"
            UPDATE hr_public.review_goals
            SET {}
            WHERE id = $1 AND deleted_at IS NULL
            RETURNING id, performance_review_id, title, description, target_date,
                      completion_status, weight, created_at, updated_at, deleted_at
            "#,
            updates.join(", ")
        );

        let mut query_builder = sqlx::query_as::<_, ReviewGoal>(&query).bind(id);

        if let Some(title) = input.title {
            query_builder = query_builder.bind(title);
        }

        if let Some(description) = input.description {
            query_builder = query_builder.bind(description);
        }

        if let Some(target_date) = input.target_date {
            query_builder = query_builder.bind(target_date);
        }

        if let Some(status) = input.completion_status {
            query_builder = query_builder.bind(status);
        }

        if let Some(weight) = input.weight {
            query_builder = query_builder.bind(weight);
        }

        let goal = query_builder.fetch_one(pool).await?;

        Ok(goal)
    }

    /// Soft delete a review goal
    async fn delete_review_goal(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let result = sqlx::query(
            "UPDATE hr_public.review_goals SET deleted_at = $1 WHERE id = $2 AND deleted_at IS NULL",
        )
        .bind(Utc::now())
        .bind(id)
        .execute(pool)
        .await?;

        Ok(result.rows_affected() > 0)
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
        let pool = ctx.data::<DatabaseConnection>()?;

        let provider_id = ctx
            .data_opt::<UserContext>()
            .map(|uc| uc.user_id)
            .ok_or("User context not found - authentication required")?;

        let feedback = sqlx::query_as::<_, ReviewFeedback>(
            r#"
            INSERT INTO hr_public.review_feedback
            (performance_review_id, provider_id, feedback_type, content, is_visible_to_employee)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, performance_review_id, provider_id, feedback_type,
                      content, is_visible_to_employee, created_at, updated_at, deleted_at
            "#,
        )
        .bind(input.performance_review_id)
        .bind(provider_id)
        .bind(input.feedback_type)
        .bind(&input.content)
        .bind(input.is_visible_to_employee.unwrap_or(true))
        .fetch_one(pool)
        .await?;

        Ok(feedback)
    }

    /// Update an existing review feedback
    async fn update_review_feedback(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateReviewFeedbackInput,
    ) -> Result<ReviewFeedback> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let mut updates = Vec::new();
        let mut param_count = 2;

        if input.content.is_some() {
            updates.push(format!("content = ${}", param_count));
            param_count += 1;
        }

        if input.is_visible_to_employee.is_some() {
            updates.push(format!("is_visible_to_employee = ${}", param_count));
            param_count += 1;
        }

        if updates.is_empty() {
            return Err("No fields to update".into());
        }

        updates.push("updated_at = NOW()".to_string());

        let query = format!(
            r#"
            UPDATE hr_public.review_feedback
            SET {}
            WHERE id = $1 AND deleted_at IS NULL
            RETURNING id, performance_review_id, provider_id, feedback_type,
                      content, is_visible_to_employee, created_at, updated_at, deleted_at
            "#,
            updates.join(", ")
        );

        let mut query_builder = sqlx::query_as::<_, ReviewFeedback>(&query).bind(id);

        if let Some(content) = input.content {
            query_builder = query_builder.bind(content);
        }

        if let Some(visible) = input.is_visible_to_employee {
            query_builder = query_builder.bind(visible);
        }

        let feedback = query_builder.fetch_one(pool).await?;

        Ok(feedback)
    }

    /// Soft delete review feedback
    async fn delete_review_feedback(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let result = sqlx::query(
            "UPDATE hr_public.review_feedback SET deleted_at = $1 WHERE id = $2 AND deleted_at IS NULL",
        )
        .bind(Utc::now())
        .bind(id)
        .execute(pool)
        .await?;

        Ok(result.rows_affected() > 0)
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
        let pool = ctx.data::<DatabaseConnection>()?;

        let verified = input.verified.unwrap_or(false);

        let skill = sqlx::query_as::<_, EmployeeSkill>(
            r#"
            INSERT INTO hr_public.employee_skills
            (employee_id, skill_name, proficiency_level, years_experience, verified)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, employee_id, skill_name, proficiency_level, years_experience,
                      verified, verifier_id, created_at, updated_at
            "#,
        )
        .bind(input.employee_id)
        .bind(&input.skill_name)
        .bind(input.proficiency_level)
        .bind(input.years_experience)
        .bind(verified)
        .fetch_one(pool)
        .await?;

        Ok(skill)
    }

    /// Update an existing employee skill
    async fn update_employee_skill(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateEmployeeSkillInput,
    ) -> Result<EmployeeSkill> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let mut updates = Vec::new();
        let mut param_count = 2;

        if input.skill_name.is_some() {
            updates.push(format!("skill_name = ${}", param_count));
            param_count += 1;
        }

        if input.proficiency_level.is_some() {
            updates.push(format!("proficiency_level = ${}", param_count));
            param_count += 1;
        }

        if input.years_experience.is_some() {
            updates.push(format!("years_experience = ${}", param_count));
            param_count += 1;
        }

        if input.verified.is_some() {
            updates.push(format!("verified = ${}", param_count));
            param_count += 1;
        }

        if input.verifier_id.is_some() {
            updates.push(format!("verifier_id = ${}", param_count));
            param_count += 1;
        }

        if updates.is_empty() {
            return Err("No fields to update".into());
        }

        updates.push("updated_at = NOW()".to_string());

        let query = format!(
            r#"
            UPDATE hr_public.employee_skills
            SET {}
            WHERE id = $1
            RETURNING id, employee_id, skill_name, proficiency_level, years_experience,
                      verified, verifier_id, created_at, updated_at
            "#,
            updates.join(", ")
        );

        let mut query_builder = sqlx::query_as::<_, EmployeeSkill>(&query).bind(id);

        if let Some(skill_name) = input.skill_name {
            query_builder = query_builder.bind(skill_name);
        }

        if let Some(proficiency) = input.proficiency_level {
            query_builder = query_builder.bind(proficiency);
        }

        if let Some(years) = input.years_experience {
            query_builder = query_builder.bind(years);
        }

        if let Some(verified) = input.verified {
            query_builder = query_builder.bind(verified);
        }

        if let Some(verifier) = input.verifier_id {
            query_builder = query_builder.bind(verifier);
        }

        let skill = query_builder.fetch_one(pool).await?;

        Ok(skill)
    }

    /// Delete an employee skill (hard delete - no soft delete for skills)
    async fn delete_employee_skill(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let result = sqlx::query("DELETE FROM hr_public.employee_skills WHERE id = $1")
            .bind(id)
            .execute(pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    /// Create a new employee certification
    async fn create_employee_certification(
        &self,
        ctx: &Context<'_>,
        input: CreateEmployeeCertificationInput,
    ) -> Result<EmployeeCertification> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let cert = sqlx::query_as::<_, EmployeeCertification>(
            r#"
            INSERT INTO hr_public.employee_certifications
            (employee_id, certification_name, issuing_organization, issue_date,
             expiration_date, certification_number)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, employee_id, certification_name, issuing_organization,
                      issue_date, expiration_date, certification_number,
                      created_at, updated_at
            "#,
        )
        .bind(input.employee_id)
        .bind(&input.certification_name)
        .bind(&input.issuing_organization)
        .bind(input.issue_date)
        .bind(input.expiration_date)
        .bind(&input.certification_number)
        .fetch_one(pool)
        .await?;

        Ok(cert)
    }

    /// Delete an employee certification (hard delete)
    async fn delete_employee_certification(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let result = sqlx::query("DELETE FROM hr_public.employee_certifications WHERE id = $1")
            .bind(id)
            .execute(pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    /// Create a new employee vehicle
    async fn create_employee_vehicle(
        &self,
        ctx: &Context<'_>,
        input: CreateEmployeeVehicleInput,
    ) -> Result<EmployeeVehicle> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let vehicle = sqlx::query_as::<_, EmployeeVehicle>(
            r#"
            INSERT INTO hr_public.employee_vehicles
            (employee_id, make, model, year, license_plate, color)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, employee_id, make, model, year, license_plate, color,
                      created_at, updated_at
            "#,
        )
        .bind(input.employee_id)
        .bind(&input.make)
        .bind(&input.model)
        .bind(input.year)
        .bind(&input.license_plate)
        .bind(&input.color)
        .fetch_one(pool)
        .await?;

        Ok(vehicle)
    }

    /// Update an existing employee vehicle
    async fn update_employee_vehicle(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateEmployeeVehicleInput,
    ) -> Result<EmployeeVehicle> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let mut updates = Vec::new();
        let mut param_count = 2;

        if input.make.is_some() {
            updates.push(format!("make = ${}", param_count));
            param_count += 1;
        }
        if input.model.is_some() {
            updates.push(format!("model = ${}", param_count));
            param_count += 1;
        }
        if input.year.is_some() {
            updates.push(format!("year = ${}", param_count));
            param_count += 1;
        }
        if input.license_plate.is_some() {
            updates.push(format!("license_plate = ${}", param_count));
            param_count += 1;
        }
        if input.color.is_some() {
            updates.push(format!("color = ${}", param_count));
            param_count += 1;
        }

        updates.push("updated_at = NOW()".to_string());

        let query = format!(
            r#"
            UPDATE hr_public.employee_vehicles
            SET {}
            WHERE id = $1
            RETURNING id, employee_id, make, model, year, license_plate, color,
                      created_at, updated_at
            "#,
            updates.join(", ")
        );

        let mut query_builder = sqlx::query_as::<_, EmployeeVehicle>(&query).bind(id);

        if let Some(make) = input.make {
            query_builder = query_builder.bind(make);
        }
        if let Some(model) = input.model {
            query_builder = query_builder.bind(model);
        }
        if let Some(year) = input.year {
            query_builder = query_builder.bind(year);
        }
        if let Some(license_plate) = input.license_plate {
            query_builder = query_builder.bind(license_plate);
        }
        if let Some(color) = input.color {
            query_builder = query_builder.bind(color);
        }

        let vehicle = query_builder.fetch_one(pool).await?;
        Ok(vehicle)
    }

    /// Delete an employee vehicle (hard delete)
    async fn delete_employee_vehicle(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let result = sqlx::query("DELETE FROM hr_public.employee_vehicles WHERE id = $1")
            .bind(id)
            .execute(pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    /// Create a new emergency contact
    async fn create_emergency_contact(
        &self,
        ctx: &Context<'_>,
        input: CreateEmergencyContactInput,
    ) -> Result<EmergencyContact> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let contact = sqlx::query_as::<_, EmergencyContact>(
            r#"
            INSERT INTO hr_public.emergency_contacts
            (employee_id, contact_name, relationship, phone_number, email, is_primary)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, employee_id, contact_name, relationship, phone_number,
                      email, is_primary, created_at, updated_at
            "#,
        )
        .bind(input.employee_id)
        .bind(&input.contact_name)
        .bind(&input.relationship)
        .bind(&input.phone_number)
        .bind(&input.email)
        .bind(input.is_primary)
        .fetch_one(pool)
        .await?;

        Ok(contact)
    }

    /// Update an existing emergency contact
    async fn update_emergency_contact(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateEmergencyContactInput,
    ) -> Result<EmergencyContact> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let mut updates = Vec::new();
        let mut param_count = 2;

        if input.contact_name.is_some() {
            updates.push(format!("contact_name = ${}", param_count));
            param_count += 1;
        }
        if input.relationship.is_some() {
            updates.push(format!("relationship = ${}", param_count));
            param_count += 1;
        }
        if input.phone_number.is_some() {
            updates.push(format!("phone_number = ${}", param_count));
            param_count += 1;
        }
        if input.email.is_some() {
            updates.push(format!("email = ${}", param_count));
            param_count += 1;
        }
        if input.is_primary.is_some() {
            updates.push(format!("is_primary = ${}", param_count));
            param_count += 1;
        }

        updates.push("updated_at = NOW()".to_string());

        let query = format!(
            r#"
            UPDATE hr_public.emergency_contacts
            SET {}
            WHERE id = $1
            RETURNING id, employee_id, contact_name, relationship, phone_number,
                      email, is_primary, created_at, updated_at
            "#,
            updates.join(", ")
        );

        let mut query_builder = sqlx::query_as::<_, EmergencyContact>(&query).bind(id);

        if let Some(contact_name) = input.contact_name {
            query_builder = query_builder.bind(contact_name);
        }
        if let Some(relationship) = input.relationship {
            query_builder = query_builder.bind(relationship);
        }
        if let Some(phone_number) = input.phone_number {
            query_builder = query_builder.bind(phone_number);
        }
        if let Some(email) = input.email {
            query_builder = query_builder.bind(email);
        }
        if let Some(is_primary) = input.is_primary {
            query_builder = query_builder.bind(is_primary);
        }

        let contact = query_builder.fetch_one(pool).await?;
        Ok(contact)
    }

    /// Delete an emergency contact (hard delete)
    async fn delete_emergency_contact(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let result = sqlx::query("DELETE FROM hr_public.emergency_contacts WHERE id = $1")
            .bind(id)
            .execute(pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    /// Create a new employee goal
    async fn create_employee_goal(
        &self,
        ctx: &Context<'_>,
        input: CreateEmployeeGoalInput,
    ) -> Result<EmployeeGoal> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let status = input.status.unwrap_or(GoalStatus::NotStarted);
        let progress = input.progress_percentage.unwrap_or(0);

        let goal = sqlx::query_as::<_, EmployeeGoal>(
            r#"
            INSERT INTO hr_public.employee_goals
            (employee_id, goal_title, goal_description, target_date, status, progress_percentage)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, employee_id, goal_title, goal_description, target_date,
                      status, progress_percentage, created_at, updated_at
            "#,
        )
        .bind(input.employee_id)
        .bind(&input.title)
        .bind(&input.description)
        .bind(input.target_date)
        .bind(status)
        .bind(progress)
        .fetch_one(pool)
        .await?;

        Ok(goal)
    }

    /// Update an existing employee goal
    async fn update_employee_goal(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateEmployeeGoalInput,
    ) -> Result<EmployeeGoal> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let mut updates = Vec::new();
        let mut param_count = 2;

        if input.title.is_some() {
            updates.push(format!("goal_title = ${}", param_count));
            param_count += 1;
        }
        if input.description.is_some() {
            updates.push(format!("goal_description = ${}", param_count));
            param_count += 1;
        }
        if input.target_date.is_some() {
            updates.push(format!("target_date = ${}", param_count));
            param_count += 1;
        }
        if input.status.is_some() {
            updates.push(format!("status = ${}", param_count));
            param_count += 1;
        }
        if input.progress_percentage.is_some() {
            updates.push(format!("progress_percentage = ${}", param_count));
            param_count += 1;
        }

        updates.push("updated_at = NOW()".to_string());

        let query = format!(
            r#"
            UPDATE hr_public.employee_goals
            SET {}
            WHERE id = $1
            RETURNING id, employee_id, goal_title, goal_description, target_date,
                      status, progress_percentage, created_at, updated_at
            "#,
            updates.join(", ")
        );

        let mut query_builder = sqlx::query_as::<_, EmployeeGoal>(&query).bind(id);

        if let Some(title) = input.title {
            query_builder = query_builder.bind(title);
        }
        if let Some(description) = input.description {
            query_builder = query_builder.bind(description);
        }
        if let Some(target_date) = input.target_date {
            query_builder = query_builder.bind(target_date);
        }
        if let Some(status) = input.status {
            query_builder = query_builder.bind(status);
        }
        if let Some(progress_percentage) = input.progress_percentage {
            query_builder = query_builder.bind(progress_percentage);
        }

        let goal = query_builder.fetch_one(pool).await?;
        Ok(goal)
    }

    /// Delete an employee goal (hard delete)
    async fn delete_employee_goal(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let result = sqlx::query("DELETE FROM hr_public.employee_goals WHERE id = $1")
            .bind(id)
            .execute(pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    // ============================================================
    // NEW MODELS - Documents Domain Mutations
    // ============================================================

    /// Create a new document
    async fn create_document(
        &self,
        ctx: &Context<'_>,
        input: CreateDocumentInput,
    ) -> Result<Document> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let document = sqlx::query_as::<_, Document>(
            r#"
            INSERT INTO hr_public.documents
            (title, description, category_id, file_path, file_size, mime_type, uploader_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, title, description, category_id, file_path, file_size, mime_type,
                      uploader_id, created_at, updated_at, deleted_at
            "#,
        )
        .bind(&input.title)
        .bind(&input.description)
        .bind(input.category_id)
        .bind(&input.file_path)
        .bind(input.file_size)
        .bind(&input.mime_type)
        .bind(input.uploader_id)
        .fetch_one(pool)
        .await?;

        Ok(document)
    }

    /// Update an existing document
    async fn update_document(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateDocumentInput,
    ) -> Result<Document> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let mut updates = Vec::new();
        let mut param_count = 2;

        if input.title.is_some() {
            updates.push(format!("title = ${}", param_count));
            param_count += 1;
        }
        if input.description.is_some() {
            updates.push(format!("description = ${}", param_count));
            param_count += 1;
        }
        if input.category_id.is_some() {
            updates.push(format!("category_id = ${}", param_count));
            param_count += 1;
        }

        updates.push("updated_at = NOW()".to_string());

        let query = format!(
            r#"
            UPDATE hr_public.documents
            SET {}
            WHERE id = $1 AND deleted_at IS NULL
            RETURNING id, title, description, category_id, file_path, file_size, mime_type,
                      uploader_id, created_at, updated_at, deleted_at
            "#,
            updates.join(", ")
        );

        let mut query_builder = sqlx::query_as::<_, Document>(&query).bind(id);

        if let Some(title) = input.title {
            query_builder = query_builder.bind(title);
        }
        if let Some(description) = input.description {
            query_builder = query_builder.bind(description);
        }
        if let Some(category_id) = input.category_id {
            query_builder = query_builder.bind(category_id);
        }

        let document = query_builder.fetch_one(pool).await?;
        Ok(document)
    }

    /// Delete a document (soft delete)
    async fn delete_document(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let result = sqlx::query(
            r#"
            UPDATE hr_public.documents
            SET deleted_at = NOW()
            WHERE id = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(id)
        .execute(pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    /// Create a new document category
    async fn create_document_category(
        &self,
        ctx: &Context<'_>,
        input: CreateDocumentCategoryInput,
    ) -> Result<DocumentCategory> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let category = sqlx::query_as::<_, DocumentCategory>(
            r#"
            INSERT INTO hr_public.document_categories
            (name, description, parent_category_id)
            VALUES ($1, $2, $3)
            RETURNING id, name, description, parent_category_id, created_at, updated_at, deleted_at
            "#,
        )
        .bind(&input.name)
        .bind(&input.description)
        .bind(input.parent_category_id)
        .fetch_one(pool)
        .await?;

        Ok(category)
    }

    /// Update an existing document category
    async fn update_document_category(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateDocumentCategoryInput,
    ) -> Result<DocumentCategory> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let mut updates = Vec::new();
        let mut param_count = 2;

        if input.name.is_some() {
            updates.push(format!("name = ${}", param_count));
            param_count += 1;
        }
        if input.description.is_some() {
            updates.push(format!("description = ${}", param_count));
            param_count += 1;
        }
        if input.parent_category_id.is_some() {
            updates.push(format!("parent_category_id = ${}", param_count));
            param_count += 1;
        }

        updates.push("updated_at = NOW()".to_string());

        let query = format!(
            r#"
            UPDATE hr_public.document_categories
            SET {}
            WHERE id = $1 AND deleted_at IS NULL
            RETURNING id, name, description, parent_category_id, created_at, updated_at, deleted_at
            "#,
            updates.join(", ")
        );

        let mut query_builder = sqlx::query_as::<_, DocumentCategory>(&query).bind(id);

        if let Some(name) = input.name {
            query_builder = query_builder.bind(name);
        }
        if let Some(description) = input.description {
            query_builder = query_builder.bind(description);
        }
        if let Some(parent_category_id) = input.parent_category_id {
            query_builder = query_builder.bind(parent_category_id);
        }

        let category = query_builder.fetch_one(pool).await?;
        Ok(category)
    }

    /// Delete a document category (soft delete)
    async fn delete_document_category(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let result = sqlx::query(
            r#"
            UPDATE hr_public.document_categories
            SET deleted_at = NOW()
            WHERE id = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(id)
        .execute(pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    /// Create a new document version
    async fn create_document_version(
        &self,
        ctx: &Context<'_>,
        input: CreateDocumentVersionInput,
    ) -> Result<DocumentVersion> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let version = sqlx::query_as::<_, DocumentVersion>(
            r#"
            INSERT INTO hr_public.document_versions
            (document_id, version_number, file_path, file_size, uploader_id, change_summary)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, document_id, version_number, file_path, file_size, uploader_id,
                      change_summary, created_at
            "#,
        )
        .bind(input.document_id)
        .bind(input.version_number)
        .bind(&input.file_path)
        .bind(input.file_size)
        .bind(input.uploader_id)
        .bind(&input.change_summary)
        .fetch_one(pool)
        .await?;

        Ok(version)
    }

    /// Create a new document assignment
    async fn create_document_assignment(
        &self,
        ctx: &Context<'_>,
        input: CreateDocumentAssignmentInput,
    ) -> Result<DocumentAssignment> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let assignment = sqlx::query_as::<_, DocumentAssignment>(
            r#"
            INSERT INTO hr_public.document_assignments
            (document_id, user_id, department_id, access_level, assigned_by_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, document_id, user_id, department_id, access_level, assigned_at, assigned_by_id
            "#,
        )
        .bind(input.document_id)
        .bind(input.user_id)
        .bind(input.department_id)
        .bind(input.access_level)
        .bind(input.assigned_by_id)
        .fetch_one(pool)
        .await?;

        Ok(assignment)
    }

    /// Delete a document assignment (hard delete - revoke access)
    async fn delete_document_assignment(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let result = sqlx::query("DELETE FROM hr_public.document_assignments WHERE id = $1")
            .bind(id)
            .execute(pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    /// Create a document access log entry (audit trail)
    async fn create_document_access_log(
        &self,
        ctx: &Context<'_>,
        input: CreateDocumentAccessLogInput,
    ) -> Result<DocumentAccessLog> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let log = sqlx::query_as::<_, DocumentAccessLog>(
            r#"
            INSERT INTO hr_public.document_access_logs
            (document_id, user_id, access_type, ip_address)
            VALUES ($1, $2, $3, $4)
            RETURNING id, document_id, user_id, access_type, accessed_at, ip_address
            "#,
        )
        .bind(input.document_id)
        .bind(input.user_id)
        .bind(input.access_type)
        .bind(&input.ip_address)
        .fetch_one(pool)
        .await?;

        Ok(log)
    }

    /// Create an encrypted file storage record
    async fn create_encrypted_file_storage(
        &self,
        ctx: &Context<'_>,
        input: CreateEncryptedFileStorageInput,
    ) -> Result<EncryptedFileStorage> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let storage = sqlx::query_as::<_, EncryptedFileStorage>(
            r#"
            INSERT INTO hr_public.encrypted_file_storage
            (document_id, encryption_key_id)
            VALUES ($1, $2)
            RETURNING id, document_id, encryption_key_id, created_at
            "#,
        )
        .bind(input.document_id)
        .bind(input.encryption_key_id)
        .fetch_one(pool)
        .await?;

        Ok(storage)
    }

    // ============================================================
    // NEW MODELS - Time Domain Mutations
    // ============================================================

    /// Create a new time-off policy
    async fn create_time_off_policy(
        &self,
        ctx: &Context<'_>,
        input: CreateTimeOffPolicyInput,
    ) -> Result<TimeOffPolicy> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let policy = sqlx::query_as::<_, TimeOffPolicy>(
            r#"
            INSERT INTO hr_public.time_off_policies
            (policy_name, leave_type, accrual_rate, max_balance, carryover_limit, effective_date)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, policy_name, leave_type, accrual_rate, max_balance, carryover_limit,
                      effective_date, created_at, updated_at
            "#,
        )
        .bind(&input.policy_name)
        .bind(&input.leave_type)
        .bind(input.accrual_rate)
        .bind(input.max_balance)
        .bind(input.carryover_limit)
        .bind(input.effective_date)
        .fetch_one(pool)
        .await?;

        Ok(policy)
    }

    /// Update an existing time-off policy
    async fn update_time_off_policy(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateTimeOffPolicyInput,
    ) -> Result<TimeOffPolicy> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let mut updates = Vec::new();
        let mut param_count = 2;

        if input.policy_name.is_some() {
            updates.push(format!("policy_name = ${}", param_count));
            param_count += 1;
        }
        if input.leave_type.is_some() {
            updates.push(format!("leave_type = ${}", param_count));
            param_count += 1;
        }
        if input.accrual_rate.is_some() {
            updates.push(format!("accrual_rate = ${}", param_count));
            param_count += 1;
        }
        if input.max_balance.is_some() {
            updates.push(format!("max_balance = ${}", param_count));
            param_count += 1;
        }
        if input.carryover_limit.is_some() {
            updates.push(format!("carryover_limit = ${}", param_count));
            param_count += 1;
        }
        if input.effective_date.is_some() {
            updates.push(format!("effective_date = ${}", param_count));
            param_count += 1;
        }

        updates.push("updated_at = NOW()".to_string());

        let query = format!(
            r#"
            UPDATE hr_public.time_off_policies
            SET {}
            WHERE id = $1
            RETURNING id, policy_name, leave_type, accrual_rate, max_balance, carryover_limit,
                      effective_date, created_at, updated_at
            "#,
            updates.join(", ")
        );

        let mut query_builder = sqlx::query_as::<_, TimeOffPolicy>(&query).bind(id);

        if let Some(policy_name) = input.policy_name {
            query_builder = query_builder.bind(policy_name);
        }
        if let Some(leave_type) = input.leave_type {
            query_builder = query_builder.bind(leave_type);
        }
        if let Some(accrual_rate) = input.accrual_rate {
            query_builder = query_builder.bind(accrual_rate);
        }
        if let Some(max_balance) = input.max_balance {
            query_builder = query_builder.bind(max_balance);
        }
        if let Some(carryover_limit) = input.carryover_limit {
            query_builder = query_builder.bind(carryover_limit);
        }
        if let Some(effective_date) = input.effective_date {
            query_builder = query_builder.bind(effective_date);
        }

        let policy = query_builder.fetch_one(pool).await?;
        Ok(policy)
    }

    /// Delete a time-off policy (hard delete)
    async fn delete_time_off_policy(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let result = sqlx::query("DELETE FROM hr_public.time_off_policies WHERE id = $1")
            .bind(id)
            .execute(pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    /// Create a new attendance record
    async fn create_attendance_record(
        &self,
        ctx: &Context<'_>,
        input: CreateAttendanceRecordInput,
    ) -> Result<AttendanceRecord> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let record = sqlx::query_as::<_, AttendanceRecord>(
            r#"
            INSERT INTO hr_public.attendance_records
            (user_id, date, clock_in, clock_out, hours_worked, status, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, user_id, date, clock_in, clock_out, hours_worked, status, notes,
                      created_at, updated_at
            "#,
        )
        .bind(input.user_id)
        .bind(input.date)
        .bind(input.clock_in)
        .bind(input.clock_out)
        .bind(input.hours_worked)
        .bind(input.status)
        .bind(&input.notes)
        .fetch_one(pool)
        .await?;

        Ok(record)
    }

    /// Update an existing attendance record
    async fn update_attendance_record(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateAttendanceRecordInput,
    ) -> Result<AttendanceRecord> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let mut updates = Vec::new();
        let mut param_count = 2;

        if input.clock_in.is_some() {
            updates.push(format!("clock_in = ${}", param_count));
            param_count += 1;
        }
        if input.clock_out.is_some() {
            updates.push(format!("clock_out = ${}", param_count));
            param_count += 1;
        }
        if input.hours_worked.is_some() {
            updates.push(format!("hours_worked = ${}", param_count));
            param_count += 1;
        }
        if input.status.is_some() {
            updates.push(format!("status = ${}", param_count));
            param_count += 1;
        }
        if input.notes.is_some() {
            updates.push(format!("notes = ${}", param_count));
            param_count += 1;
        }

        updates.push("updated_at = NOW()".to_string());

        let query = format!(
            r#"
            UPDATE hr_public.attendance_records
            SET {}
            WHERE id = $1
            RETURNING id, user_id, date, clock_in, clock_out, hours_worked, status, notes,
                      created_at, updated_at
            "#,
            updates.join(", ")
        );

        let mut query_builder = sqlx::query_as::<_, AttendanceRecord>(&query).bind(id);

        if let Some(clock_in) = input.clock_in {
            query_builder = query_builder.bind(clock_in);
        }
        if let Some(clock_out) = input.clock_out {
            query_builder = query_builder.bind(clock_out);
        }
        if let Some(hours_worked) = input.hours_worked {
            query_builder = query_builder.bind(hours_worked);
        }
        if let Some(status) = input.status {
            query_builder = query_builder.bind(status);
        }
        if let Some(notes) = input.notes {
            query_builder = query_builder.bind(notes);
        }

        let record = query_builder.fetch_one(pool).await?;
        Ok(record)
    }

    /// Delete an attendance record (hard delete)
    async fn delete_attendance_record(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let result = sqlx::query("DELETE FROM hr_public.attendance_records WHERE id = $1")
            .bind(id)
            .execute(pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    // ===== System Domain Mutations =====

    /// Create a new activity log entry (audit trail)
    async fn create_activity_log(
        &self,
        ctx: &Context<'_>,
        input: CreateActivityLogInput,
    ) -> Result<ActivityLog> {
        let pool = ctx.data::<DatabaseConnection>()?;

        // Parse details JSON string if provided
        let details_json = if let Some(details) = &input.details {
            Some(serde_json::from_str::<serde_json::Value>(details)?)
        } else {
            None
        };

        let log = sqlx::query_as::<_, ActivityLog>(
            r#"
            INSERT INTO hr_public.activity_logs
            (user_id, employee_id, action, resource_type, resource_id, details)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, user_id, employee_id, action, resource_type, resource_id, details, created_at
            "#,
        )
        .bind(input.user_id)
        .bind(input.employee_id)
        .bind(&input.action)
        .bind(&input.resource_type)
        .bind(input.resource_id)
        .bind(details_json)
        .fetch_one(pool)
        .await?;

        Ok(log)
    }

    /// Create a new compensation band
    async fn create_compensation_band(
        &self,
        ctx: &Context<'_>,
        input: CreateCompensationBandInput,
    ) -> Result<CompensationBand> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let band = sqlx::query_as::<_, CompensationBand>(
            r#"
            INSERT INTO hr_public.compensation_bands
            (band_name, min_salary, max_salary, currency)
            VALUES ($1, $2, $3, $4)
            RETURNING id, band_name, min_salary, max_salary, currency, created_at, updated_at
            "#,
        )
        .bind(&input.band_name)
        .bind(input.min_salary)
        .bind(input.max_salary)
        .bind(&input.currency)
        .fetch_one(pool)
        .await?;

        Ok(band)
    }

    /// Update a compensation band
    async fn update_compensation_band(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateCompensationBandInput,
    ) -> Result<CompensationBand> {
        let pool = ctx.data::<DatabaseConnection>()?;

        // Build dynamic UPDATE query
        let mut updates = Vec::new();
        let mut param_count = 2;

        if input.band_name.is_some() {
            updates.push(format!("band_name = ${}", param_count));
            param_count += 1;
        }
        if input.min_salary.is_some() {
            updates.push(format!("min_salary = ${}", param_count));
            param_count += 1;
        }
        if input.max_salary.is_some() {
            updates.push(format!("max_salary = ${}", param_count));
            param_count += 1;
        }
        if input.currency.is_some() {
            updates.push(format!("currency = ${}", param_count));
            param_count += 1;
        }

        updates.push("updated_at = NOW()".to_string());

        if updates.len() == 1 {
            return Err("No fields to update".into());
        }

        let query = format!(
            r#"
            UPDATE hr_public.compensation_bands
            SET {}
            WHERE id = $1
            RETURNING id, band_name, min_salary, max_salary, currency, created_at, updated_at
            "#,
            updates.join(", ")
        );

        let mut query_builder = sqlx::query_as::<_, CompensationBand>(&query).bind(id);

        if let Some(band_name) = input.band_name {
            query_builder = query_builder.bind(band_name);
        }
        if let Some(min_salary) = input.min_salary {
            query_builder = query_builder.bind(min_salary);
        }
        if let Some(max_salary) = input.max_salary {
            query_builder = query_builder.bind(max_salary);
        }
        if let Some(currency) = input.currency {
            query_builder = query_builder.bind(currency);
        }

        let band = query_builder.fetch_one(pool).await?;
        Ok(band)
    }

    /// Delete a compensation band (hard delete)
    async fn delete_compensation_band(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let result = sqlx::query("DELETE FROM hr_public.compensation_bands WHERE id = $1")
            .bind(id)
            .execute(pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    /// Create a new HR report (generated report record)
    async fn create_hr_report(
        &self,
        ctx: &Context<'_>,
        input: CreateHRReportInput,
    ) -> Result<HRReport> {
        let pool = ctx.data::<DatabaseConnection>()?;

        // Parse data JSON string
        let data_json = serde_json::from_str::<serde_json::Value>(&input.data)?;

        let report = sqlx::query_as::<_, HRReport>(
            r#"
            INSERT INTO hr_public.hr_reports
            (title, report_type, category, data, creator_id, department_id, generated_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            RETURNING id, title, report_type, data, creator_id, generated_at
            "#,
        )
        .bind(&input.title)
        .bind(&input.report_type)
        .bind(&input.category)
        .bind(data_json)
        .bind(input.creator_id)
        .bind(input.department_id)
        .fetch_one(pool)
        .await?;

        Ok(report)
    }

    /// Create a new rollback request
    async fn create_rollback_request(
        &self,
        ctx: &Context<'_>,
        input: CreateRollbackRequestInput,
    ) -> Result<RollbackRequest> {
        let pool = ctx.data::<DatabaseConnection>()?;

        // Get user ID from context
        let user_id = ctx
            .data_opt::<UserContext>()
            .map(|uc| uc.user_id)
            .ok_or("User context not found - authentication required")?;

        let request = sqlx::query_as::<_, RollbackRequest>(
            r#"
            INSERT INTO hr_public.rollback_requests
            (activity_log_id, requested_by, reason, status)
            VALUES ($1, $2, $3, 'pending')
            RETURNING id, activity_log_id, requested_by, requested_at, reason,
                      status, reviewed_by, reviewed_at, review_reason, created_at, updated_at
            "#,
        )
        .bind(input.activity_log_id)
        .bind(user_id)
        .bind(&input.reason)
        .fetch_one(pool)
        .await?;

        Ok(request)
    }

    /// Update a rollback request (status changes)
    async fn update_rollback_request(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateRollbackRequestInput,
    ) -> Result<RollbackRequest> {
        let pool = ctx.data::<DatabaseConnection>()?;

        // Build dynamic UPDATE query
        let mut updates = Vec::new();
        let mut param_count = 2;

        if input.status.is_some() {
            updates.push(format!("status = ${}", param_count));
            param_count += 1;
        }
        if input.reviewed_by.is_some() {
            updates.push(format!("reviewed_by = ${}", param_count));
            param_count += 1;
        }
        if input.review_reason.is_some() {
            updates.push(format!("review_reason = ${}", param_count));
            param_count += 1;
        }

        // If status is 'completed', set reviewed_at
        if input.status.is_some() {
            updates.push("reviewed_at = NOW()".to_string());
        }

        if updates.is_empty() {
            return Err("No fields to update".into());
        }

        let query = format!(
            r#"
            UPDATE hr_public.rollback_requests
            SET {}
            WHERE id = $1
            RETURNING id, activity_log_id, requested_by, requested_at, reason,
                      status, reviewed_by, reviewed_at, review_reason, created_at, updated_at
            "#,
            updates.join(", ")
        );

        let mut query_builder = sqlx::query_as::<_, RollbackRequest>(&query).bind(id);

        if let Some(status) = input.status {
            query_builder = query_builder.bind(status);
        }
        if let Some(reviewed_by) = input.reviewed_by {
            query_builder = query_builder.bind(reviewed_by);
        }
        if let Some(review_reason) = &input.review_reason {
            query_builder = query_builder.bind(review_reason);
        }

        let request = query_builder.fetch_one(pool).await?;
        Ok(request)
    }

    /// Create a new bulk rollback batch
    async fn create_bulk_rollback_batch(
        &self,
        ctx: &Context<'_>,
        input: CreateBulkRollbackBatchInput,
    ) -> Result<BulkRollbackBatch> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let batch = sqlx::query_as::<_, BulkRollbackBatch>(
            r#"
            INSERT INTO hr_public.bulk_rollback_batches
            (batch_name, requester_id, total_items, completed_items, status)
            VALUES ($1, $2, $3, 0, 'pending')
            RETURNING id, batch_name, requester_id, total_items, completed_items, status,
                      started_at, completed_at, created_at
            "#,
        )
        .bind(&input.batch_name)
        .bind(input.requester_id)
        .bind(input.total_items)
        .fetch_one(pool)
        .await?;

        Ok(batch)
    }

    /// Update a bulk rollback batch (progress/status)
    async fn update_bulk_rollback_batch(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateBulkRollbackBatchInput,
    ) -> Result<BulkRollbackBatch> {
        let pool = ctx.data::<DatabaseConnection>()?;

        // Build dynamic UPDATE query
        let mut updates = Vec::new();
        let mut param_count = 2;

        if input.completed_items.is_some() {
            updates.push(format!("completed_items = ${}", param_count));
            param_count += 1;
        }
        if input.status.is_some() {
            updates.push(format!("status = ${}", param_count));
            param_count += 1;
        }

        // If status is 'processing', set started_at if not already set
        // If status is 'completed' or 'failed', set completed_at
        if let Some(status) = &input.status {
            if status == "processing" {
                updates.push(
                    "started_at = COALESCE(started_at, NOW())".to_string(),
                );
            }
            if status == "completed" || status == "failed" {
                updates.push("completed_at = NOW()".to_string());
            }
        }

        if updates.is_empty() {
            return Err("No fields to update".into());
        }

        let query = format!(
            r#"
            UPDATE hr_public.bulk_rollback_batches
            SET {}
            WHERE id = $1
            RETURNING id, batch_name, requester_id, total_items, completed_items, status,
                      started_at, completed_at, created_at
            "#,
            updates.join(", ")
        );

        let mut query_builder = sqlx::query_as::<_, BulkRollbackBatch>(&query).bind(id);

        if let Some(completed_items) = input.completed_items {
            query_builder = query_builder.bind(completed_items);
        }
        if let Some(status) = input.status {
            query_builder = query_builder.bind(status);
        }

        let batch = query_builder.fetch_one(pool).await?;
        Ok(batch)
    }

    /// Create a new bulk rollback item
    async fn create_bulk_rollback_item(
        &self,
        ctx: &Context<'_>,
        input: CreateBulkRollbackItemInput,
    ) -> Result<BulkRollbackItem> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let item = sqlx::query_as::<_, BulkRollbackItem>(
            r#"
            INSERT INTO hr_public.bulk_rollback_items
            (batch_id, resource_type, resource_id, rollback_to_timestamp, status)
            VALUES ($1, $2, $3, $4, 'pending')
            RETURNING id, batch_id, resource_type, resource_id, rollback_to_timestamp,
                      status, error_message, completed_at
            "#,
        )
        .bind(input.batch_id)
        .bind(&input.resource_type)
        .bind(input.resource_id)
        .bind(input.rollback_to_timestamp)
        .fetch_one(pool)
        .await?;

        Ok(item)
    }

    /// Update a bulk rollback item (status)
    async fn update_bulk_rollback_item(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateBulkRollbackItemInput,
    ) -> Result<BulkRollbackItem> {
        let pool = ctx.data::<DatabaseConnection>()?;

        // Build dynamic UPDATE query
        let mut updates = Vec::new();
        let mut param_count = 2;

        if input.status.is_some() {
            updates.push(format!("status = ${}", param_count));
            param_count += 1;
        }
        if input.error_message.is_some() {
            updates.push(format!("error_message = ${}", param_count));
            param_count += 1;
        }

        // If status is 'completed' or 'failed', set completed_at
        if let Some(status) = &input.status {
            if status == "completed" || status == "failed" {
                updates.push("completed_at = NOW()".to_string());
            }
        }

        if updates.is_empty() {
            return Err("No fields to update".into());
        }

        let query = format!(
            r#"
            UPDATE hr_public.bulk_rollback_items
            SET {}
            WHERE id = $1
            RETURNING id, batch_id, resource_type, resource_id, rollback_to_timestamp,
                      status, error_message, completed_at
            "#,
            updates.join(", ")
        );

        let mut query_builder = sqlx::query_as::<_, BulkRollbackItem>(&query).bind(id);

        if let Some(status) = input.status {
            query_builder = query_builder.bind(status);
        }
        if let Some(error_message) = input.error_message {
            query_builder = query_builder.bind(error_message);
        }

        let item = query_builder.fetch_one(pool).await?;
        Ok(item)
    }

    /// Create a new payroll record (immutable record)
    async fn create_payroll_record(
        &self,
        ctx: &Context<'_>,
        input: CreatePayrollRecordInput,
    ) -> Result<PayrollRecord> {
        let pool = ctx.data::<DatabaseConnection>()?;

        // Parse JSON strings for deductions and bonuses
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

        let record = sqlx::query_as::<_, PayrollRecord>(
            r#"
            INSERT INTO hr_public.payroll_records
            (employee_id, pay_period_start, pay_period_end, gross_pay, net_pay,
             deductions, bonuses, processed_at, processor_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
            RETURNING id, employee_id, pay_period_start, pay_period_end, gross_pay, net_pay,
                      deductions, bonuses, processed_at, processor_id, created_at
            "#,
        )
        .bind(input.employee_id)
        .bind(input.pay_period_start)
        .bind(input.pay_period_end)
        .bind(input.gross_pay)
        .bind(input.net_pay)
        .bind(deductions_json)
        .bind(bonuses_json)
        .bind(input.processor_id)
        .fetch_one(pool)
        .await?;

        Ok(record)
    }

    /// Create a new encryption key (security - create only)
    async fn create_encryption_key(
        &self,
        ctx: &Context<'_>,
        input: CreateEncryptionKeyInput,
    ) -> Result<EncryptionKey> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let key = sqlx::query_as::<_, EncryptionKey>(
            r#"
            INSERT INTO hr_public.encryption_keys
            (key_name, algorithm, active)
            VALUES ($1, $2, true)
            RETURNING id, key_name, algorithm, created_at, rotated_at, active
            "#,
        )
        .bind(&input.key_name)
        .bind(&input.algorithm)
        .fetch_one(pool)
        .await?;

        Ok(key)
    }

    // ===== Events Domain Mutations =====

    /// Create a new event comment
    async fn create_event_comment(
        &self,
        ctx: &Context<'_>,
        input: CreateEventCommentInput,
    ) -> Result<EventComment> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let comment = sqlx::query_as::<_, EventComment>(
            r#"
            INSERT INTO hr_public.event_comments
            (event_id, user_id, comment_text)
            VALUES ($1, $2, $3)
            RETURNING id, event_id, user_id, comment_text, created_at, updated_at, deleted_at
            "#,
        )
        .bind(input.event_id)
        .bind(input.user_id)
        .bind(&input.comment_text)
        .fetch_one(pool)
        .await?;

        Ok(comment)
    }

    /// Update an event comment
    async fn update_event_comment(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateEventCommentInput,
    ) -> Result<EventComment> {
        let pool = ctx.data::<DatabaseConnection>()?;

        // Build dynamic UPDATE query
        let mut updates = Vec::new();
        let mut param_count = 2;

        if input.comment_text.is_some() {
            updates.push(format!("comment_text = ${}", param_count));
            param_count += 1;
        }

        updates.push("updated_at = NOW()".to_string());

        if updates.len() == 1 {
            return Err("No fields to update".into());
        }

        let query = format!(
            r#"
            UPDATE hr_public.event_comments
            SET {}
            WHERE id = $1 AND deleted_at IS NULL
            RETURNING id, event_id, user_id, comment_text, created_at, updated_at, deleted_at
            "#,
            updates.join(", ")
        );

        let mut query_builder = sqlx::query_as::<_, EventComment>(&query).bind(id);

        if let Some(comment_text) = input.comment_text {
            query_builder = query_builder.bind(comment_text);
        }

        let comment = query_builder.fetch_one(pool).await?;
        Ok(comment)
    }

    /// Delete an event comment (soft delete)
    async fn delete_event_comment(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let result = sqlx::query(
            "UPDATE hr_public.event_comments SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL",
        )
        .bind(id)
        .execute(pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    /// Create a new event history entry (audit trail)
    async fn create_event_history(
        &self,
        ctx: &Context<'_>,
        input: CreateEventHistoryInput,
    ) -> Result<EventHistory> {
        let pool = ctx.data::<DatabaseConnection>()?;

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

        let history = sqlx::query_as::<_, EventHistory>(
            r#"
            INSERT INTO hr_public.event_history
            (event_id, changed_by_id, change_type, old_values, new_values)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, event_id, changed_by_id, change_type, old_values, new_values, created_at
            "#,
        )
        .bind(input.event_id)
        .bind(input.changed_by_id)
        .bind(&input.change_type)
        .bind(old_values_json)
        .bind(new_values_json)
        .fetch_one(pool)
        .await?;

        Ok(history)
    }

    /// Create a new event waitlist entry
    async fn create_event_waitlist(
        &self,
        ctx: &Context<'_>,
        input: CreateEventWaitlistInput,
    ) -> Result<EventWaitlist> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let waitlist = sqlx::query_as::<_, EventWaitlist>(
            r#"
            INSERT INTO hr_public.event_waitlist
            (event_id, user_id, position, promoted)
            VALUES ($1, $2, $3, false)
            RETURNING id, event_id, user_id, position, promoted, promoted_at, created_at
            "#,
        )
        .bind(input.event_id)
        .bind(input.user_id)
        .bind(input.position)
        .fetch_one(pool)
        .await?;

        Ok(waitlist)
    }

    /// Update an event waitlist entry (promotion)
    async fn update_event_waitlist(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateEventWaitlistInput,
    ) -> Result<EventWaitlist> {
        let pool = ctx.data::<DatabaseConnection>()?;

        // Build dynamic UPDATE query
        let mut updates = Vec::new();
        let mut param_count = 2;

        if input.promoted.is_some() {
            updates.push(format!("promoted = ${}", param_count));
            param_count += 1;
        }

        // If promoting, set promoted_at
        if input.promoted == Some(true) {
            updates.push("promoted_at = NOW()".to_string());
        }

        if updates.is_empty() {
            return Err("No fields to update".into());
        }

        let query = format!(
            r#"
            UPDATE hr_public.event_waitlist
            SET {}
            WHERE id = $1
            RETURNING id, event_id, user_id, position, promoted, promoted_at, created_at
            "#,
            updates.join(", ")
        );

        let mut query_builder = sqlx::query_as::<_, EventWaitlist>(&query).bind(id);

        if let Some(promoted) = input.promoted {
            query_builder = query_builder.bind(promoted);
        }

        let waitlist = query_builder.fetch_one(pool).await?;
        Ok(waitlist)
    }

    /// Delete an event waitlist entry (hard delete)
    async fn delete_event_waitlist(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let result = sqlx::query("DELETE FROM hr_public.event_waitlist WHERE id = $1")
            .bind(id)
            .execute(pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    // ===== Tasks/Reviews Domain Mutations =====

    /// Create a new task type
    async fn create_task_type(
        &self,
        ctx: &Context<'_>,
        input: CreateTaskTypeInput,
    ) -> Result<TaskType> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let task_type = sqlx::query_as::<_, TaskType>(
            r#"
            INSERT INTO hr_public.task_types
            (name, description, default_priority, color_code, is_active)
            VALUES ($1, $2, $3, $4, true)
            RETURNING id, name, description, default_priority, color_code, is_active,
                      created_at, updated_at
            "#,
        )
        .bind(&input.name)
        .bind(&input.description)
        .bind(&input.default_priority)
        .bind(&input.color_code)
        .fetch_one(pool)
        .await?;

        Ok(task_type)
    }

    /// Update a task type
    async fn update_task_type(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateTaskTypeInput,
    ) -> Result<TaskType> {
        let pool = ctx.data::<DatabaseConnection>()?;

        // Build dynamic UPDATE query
        let mut updates = Vec::new();
        let mut param_count = 2;

        if input.name.is_some() {
            updates.push(format!("name = ${}", param_count));
            param_count += 1;
        }
        if input.description.is_some() {
            updates.push(format!("description = ${}", param_count));
            param_count += 1;
        }
        if input.default_priority.is_some() {
            updates.push(format!("default_priority = ${}", param_count));
            param_count += 1;
        }
        if input.color_code.is_some() {
            updates.push(format!("color_code = ${}", param_count));
            param_count += 1;
        }
        if input.is_active.is_some() {
            updates.push(format!("is_active = ${}", param_count));
            param_count += 1;
        }

        updates.push("updated_at = NOW()".to_string());

        if updates.len() == 1 {
            return Err("No fields to update".into());
        }

        let query = format!(
            r#"
            UPDATE hr_public.task_types
            SET {}
            WHERE id = $1
            RETURNING id, name, description, default_priority, color_code, is_active,
                      created_at, updated_at
            "#,
            updates.join(", ")
        );

        let mut query_builder = sqlx::query_as::<_, TaskType>(&query).bind(id);

        if let Some(name) = input.name {
            query_builder = query_builder.bind(name);
        }
        if let Some(description) = input.description {
            query_builder = query_builder.bind(description);
        }
        if let Some(default_priority) = input.default_priority {
            query_builder = query_builder.bind(default_priority);
        }
        if let Some(color_code) = input.color_code {
            query_builder = query_builder.bind(color_code);
        }
        if let Some(is_active) = input.is_active {
            query_builder = query_builder.bind(is_active);
        }

        let task_type = query_builder.fetch_one(pool).await?;
        Ok(task_type)
    }

    /// Delete a task type (soft delete by setting is_active = false)
    async fn delete_task_type(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let result = sqlx::query(
            "UPDATE hr_public.task_types SET is_active = false, updated_at = NOW() WHERE id = $1",
        )
        .bind(id)
        .execute(pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    /// Create a new review template
    async fn create_review_template(
        &self,
        ctx: &Context<'_>,
        input: CreateReviewTemplateInput,
    ) -> Result<ReviewTemplate> {
        let pool = ctx.data::<DatabaseConnection>()?;

        // Parse sections JSON string if provided
        let sections_json = if let Some(sections) = &input.sections {
            Some(serde_json::from_str::<serde_json::Value>(sections)?)
        } else {
            None
        };

        let template = sqlx::query_as::<_, ReviewTemplate>(
            r#"
            INSERT INTO hr_public.review_templates
            (name, description, sections, is_active, created_by_id)
            VALUES ($1, $2, $3, true, $4)
            RETURNING id, name, description, sections, is_active, created_by_id,
                      created_at, updated_at
            "#,
        )
        .bind(&input.name)
        .bind(&input.description)
        .bind(sections_json)
        .bind(input.created_by_id)
        .fetch_one(pool)
        .await?;

        Ok(template)
    }

    /// Update a review template
    async fn update_review_template(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateReviewTemplateInput,
    ) -> Result<ReviewTemplate> {
        let pool = ctx.data::<DatabaseConnection>()?;

        // Build dynamic UPDATE query
        let mut updates = Vec::new();
        let mut param_count = 2;

        if input.name.is_some() {
            updates.push(format!("name = ${}", param_count));
            param_count += 1;
        }
        if input.description.is_some() {
            updates.push(format!("description = ${}", param_count));
            param_count += 1;
        }
        if input.sections.is_some() {
            updates.push(format!("sections = ${}", param_count));
            param_count += 1;
        }
        if input.is_active.is_some() {
            updates.push(format!("is_active = ${}", param_count));
            param_count += 1;
        }

        updates.push("updated_at = NOW()".to_string());

        if updates.len() == 1 {
            return Err("No fields to update".into());
        }

        let query = format!(
            r#"
            UPDATE hr_public.review_templates
            SET {}
            WHERE id = $1
            RETURNING id, name, description, sections, is_active, created_by_id,
                      created_at, updated_at
            "#,
            updates.join(", ")
        );

        let mut query_builder = sqlx::query_as::<_, ReviewTemplate>(&query).bind(id);

        if let Some(name) = input.name {
            query_builder = query_builder.bind(name);
        }
        if let Some(description) = input.description {
            query_builder = query_builder.bind(description);
        }
        if let Some(sections) = input.sections {
            let sections_json = serde_json::from_str::<serde_json::Value>(&sections)?;
            query_builder = query_builder.bind(sections_json);
        }
        if let Some(is_active) = input.is_active {
            query_builder = query_builder.bind(is_active);
        }

        let template = query_builder.fetch_one(pool).await?;
        Ok(template)
    }

    /// Delete a review template (soft delete by setting is_active = false)
    async fn delete_review_template(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let result = sqlx::query(
            "UPDATE hr_public.review_templates SET is_active = false, updated_at = NOW() WHERE id = $1",
        )
        .bind(id)
        .execute(pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }
}
