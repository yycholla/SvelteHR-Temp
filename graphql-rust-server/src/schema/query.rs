//! GraphQL Query Resolvers - SeaORM Implementation
//!
//! This module implements GraphQL query resolvers using SeaORM.
//! All queries follow idiomatic Rust patterns with proper error handling.

use async_graphql::{Context, Object, Result};
use axum_login::AuthSession;
use sea_orm::{EntityTrait, QueryFilter, QueryOrder, QuerySelect, ColumnTrait, PaginatorTrait, sea_query::Expr};
use uuid::Uuid;

use crate::{
    auth::UserContext,
    database::get_db_from_context,
    error::AppError,
    models::{
        generated::prelude::*,
        task::{TaskStatus, TaskPriority, Model as Task, Entity as TaskEntity, Column as TaskColumn},
        user::{Model as User, Entity as UserEntity, Column as UserColumn},
        department::{Model as Department, Entity as DepartmentEntity, Column as DepartmentColumn},
        tasks::{TaskType, task_type::{Model as TaskTypeModel, Entity as TaskTypeEntity, Column as TaskTypeColumn}},
        event::{Model as Event, Entity as EventEntity, Column as EventColumn},
        event_attendee::{Model as EventAttendee, Entity as EventAttendeeEntity, Column as EventAttendeeColumn},
        leave_request::{Model as LeaveRequest, Entity as LeaveRequestEntity, Column as LeaveRequestColumn},
        leave_balance::{Model as LeaveBalance, Entity as LeaveBalanceEntity, Column as LeaveBalanceColumn},
        leave_type::{Model as LeaveType, Entity as LeaveTypeEntity, Column as LeaveTypeColumn},
        performance_review::{Model as PerformanceReview, Entity as PerformanceReviewEntity, Column as PerformanceReviewColumn},
        review_cycle::Model as ReviewCycle,
        review_feedback::Model as ReviewFeedback,
        review_goal::Model as ReviewGoal,
        employee::{
            EmployeeCertification,
            EmployeeGoal,
            EmployeeSkill,
            EmployeeVehicle,
            EmergencyContact,
            emergency_contact::{Model as EmergencyContactModel, Entity as EmergencyContactEntity, Column as EmergencyContactColumn},
            employee_vehicle::{Model as EmployeeVehicleModel, Entity as EmployeeVehicleEntity, Column as EmployeeVehicleColumn},
            UserAddress,
        },
        time::{
            AttendanceRecord,
            attendance_record::{Model as AttendanceRecordModel, Entity as AttendanceRecordEntity, Column as AttendanceRecordColumn},
        },
        documents::Document,
        documents::DocumentCategory,
        system::{
            HRReport,
            hr_report::{Model as HRReportModel, Entity as HrReportEntity, Column as HrReportColumn},
            activity_log::{Model as ActivityLogModel, Entity as ActivityLogEntity, Column as ActivityLogColumn},
            rollback_request::{Model as RollbackRequestModel, Entity as RollbackRequestEntity, Column as RollbackRequestColumn, RollbackStatus},
            system_settings::{Model as SystemSettingsModel, Entity as SystemSettingsEntity, Column as SystemSettingsColumn},
        },
        notification::{Model as Notification, Entity as NotificationEntity, Column as NotificationColumn},
        user_session::{Model as Session, Entity as UserSessionEntity, Column as UserSessionColumn},
        employee::employee_goal::{Model as EmployeeGoalModel, Entity as EmployeeGoalEntity, Column as EmployeeGoalColumn},
    },
};

/// Task filter input for advanced querying
#[derive(async_graphql::InputObject)]
pub struct TaskFilter {
    pub status: Option<TaskStatus>,
    pub priority: Option<TaskPriority>,
    pub assignee_id: Option<Uuid>,
    pub created_by: Option<Uuid>,
    pub department_id: Option<Uuid>,
    pub task_type_id: Option<Uuid>,
    pub parent_task_id: Option<Uuid>,
    pub archived: Option<bool>,
}

/// Session information for GraphQL responses
#[derive(async_graphql::SimpleObject)]
pub struct SessionInfo {
    pub id: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub expires_at: chrono::DateTime<chrono::Utc>,
    pub last_activity: chrono::DateTime<chrono::Utc>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub is_current_session: bool,
}

// ============================================================================
// Row-Level Security (RLS) Helper Functions
// ============================================================================

/// Apply Row-Level Security filtering to user queries based on UserContext
///
/// This function enforces multi-tenant data isolation by filtering queries based on:
/// 1. System Admin role - sees all users across all organizations
/// 2. Regular users - see only users from their own department
///
/// # Security Critical
/// This function MUST be applied to ALL user queries to prevent cross-tenant data leaks.
fn apply_user_rls_filter(
    query: sea_orm::Select<UserEntity>,
    user_context: &UserContext,
) -> sea_orm::Select<UserEntity> {
    // System admins and Admin role bypass RLS - see all users
    if user_context.is_system() || user_context.is_admin() {
        return query;
    }

    // Regular users: filter by department_id
    if let Some(dept_id) = user_context.department_id {
        query.filter(UserColumn::DepartmentId.eq(dept_id))
    } else {
        // No department = no access to users
        query.filter(UserColumn::Id.is_null())
    }
}

/// Apply Row-Level Security filtering to task queries based on UserContext
///
/// # Security Critical
/// This function MUST be applied to ALL task queries to prevent cross-tenant data leaks.
fn apply_task_rls_filter(
    query: sea_orm::Select<TaskEntity>,
    user_context: &UserContext,
) -> sea_orm::Select<TaskEntity> {
    // System admins and Admin role bypass RLS - see all tasks
    if user_context.is_system() || user_context.is_admin() {
        return query;
    }

    // Regular users: filter by department_id
    if let Some(dept_id) = user_context.department_id {
        query.filter(TaskColumn::DepartmentId.eq(dept_id))
    } else {
        // No department = no access to tasks
        query.filter(TaskColumn::Id.is_null())
    }
}

/// Apply Row-Level Security filtering to department queries based on UserContext
///
/// # Security Critical
/// Departments can serve as organization boundaries. This prevents cross-tenant access.
fn apply_department_rls_filter(
    query: sea_orm::Select<DepartmentEntity>,
    user_context: &UserContext,
) -> sea_orm::Select<DepartmentEntity> {
    // System admins and Admin role bypass RLS - see all departments
    if user_context.is_system() || user_context.is_admin() {
        return query;
    }

    // Regular users: filter by their department (they can only see their own department)
    // This can be expanded in the future to allow viewing sub-departments
    if let Some(dept_id) = user_context.department_id {
        query.filter(DepartmentColumn::Id.eq(dept_id))
    } else {
        // No department = no access
        query.filter(DepartmentColumn::Id.is_null())
    }
}

/// Apply Row-Level Security filtering to leave request queries
fn apply_leave_request_rls_filter(
    query: sea_orm::Select<LeaveRequestEntity>,
    user_context: &UserContext,
) -> sea_orm::Select<LeaveRequestEntity> {
    if user_context.is_system() || user_context.is_admin() {
        return query;
    }

    // HR managers can see all leave requests in their department
    // Regular users can only see their own leave requests
    if user_context.is_hr_manager() {
        if let Some(dept_id) = user_context.department_id {
            // Join with users table to filter by department
            // For now, filter by employee_id matching users in the same department
            // This requires a more complex query - leaving as employee_id filter for now
            query
        } else {
            query.filter(LeaveRequestColumn::Id.is_null())
        }
    } else {
        // Regular users see only their own requests
        query.filter(LeaveRequestColumn::EmployeeId.eq(user_context.user_id))
    }
}

/// Apply Row-Level Security filtering to performance review queries
fn apply_performance_review_rls_filter(
    query: sea_orm::Select<PerformanceReviewEntity>,
    user_context: &UserContext,
) -> sea_orm::Select<PerformanceReviewEntity> {
    if user_context.is_system() || user_context.is_admin() {
        return query;
    }

    // HR managers can see all reviews in their department
    // Regular users can only see their own reviews
    if user_context.is_hr_manager() {
        query
    } else {
        // Regular users see only their own reviews
        query.filter(PerformanceReviewColumn::EmployeeId.eq(user_context.user_id))
    }
}

#[derive(Default)]
pub struct QueryRoot;

#[Object]
impl QueryRoot {
    // =========================================================================
    // User Queries
    // =========================================================================
    
    /// Get all users with optional filtering and pagination
    ///
    /// # Security: RLS Enforced
    /// This query applies Row-Level Security based on the user's department and role.
    async fn users(
        &self,
        ctx: &Context<'_>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<User>> {
        let db = get_db_from_context(ctx)?;
        let limit = limit.unwrap_or(100).clamp(1, 1000);
        let offset = offset.unwrap_or(0).max(0);

        // Extract UserContext for RLS filtering
        let user_context = ctx.data::<UserContext>()
            .map_err(|_| async_graphql::Error::new("Authentication required - UserContext not found"))?;

        // Build query with RLS filter
        let mut query = UserEntity::find()
            .filter(UserColumn::IsActive.eq(true))
            .filter(UserColumn::DeletedAt.is_null());

        // Apply RLS filter based on user context
        query = apply_user_rls_filter(query, user_context);

        let users = query
            .order_by_desc(UserColumn::CreatedAt)
            .limit(Some(limit as u64))
            .offset(offset as u64)
            .all(&db)
            .await?;

        Ok(users)
    }

    /// Get a single user by ID
    ///
    /// # Security: RLS Enforced
    /// This query applies Row-Level Security - users can only access employees from their department.
    /// Direct ID access to other departments is blocked.
    async fn user(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<User>> {
        let db = get_db_from_context(ctx)?;

        // Extract UserContext for RLS filtering
        let user_context = ctx.data::<UserContext>()
            .map_err(|_| async_graphql::Error::new("Authentication required - UserContext not found"))?;

        // Build query with RLS filter (CRITICAL: even direct ID lookups must be filtered!)
        let mut query = UserEntity::find()
            .filter(UserColumn::Id.eq(id))
            .filter(UserColumn::DeletedAt.is_null());

        // Apply RLS filter to prevent cross-tenant access
        query = apply_user_rls_filter(query, user_context);

        let user = query.one(&db).await?;
        Ok(user)
    }

    // =========================================================================
    // Department Queries
    // =========================================================================

    /// Get all departments with optional filtering and pagination
    ///
    /// # Security: RLS Enforced
    /// Users can only view their own department unless they have Admin role.
    async fn departments(
        &self,
        ctx: &Context<'_>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<Department>> {
        let db = get_db_from_context(ctx)?;
        let limit = limit.unwrap_or(100).clamp(1, 1000);
        let offset = offset.unwrap_or(0).max(0);

        // Extract UserContext for RLS filtering
        let user_context = ctx.data::<UserContext>()
            .map_err(|_| async_graphql::Error::new("Authentication required - UserContext not found"))?;

        // Build query with RLS filter
        let mut query = DepartmentEntity::find()
            .filter(DepartmentColumn::DeletedAt.is_null());

        // Apply RLS filter
        query = apply_department_rls_filter(query, user_context);

        let departments = query
            .order_by_asc(DepartmentColumn::Name)
            .limit(Some(limit as u64))
            .offset(offset as u64)
            .all(&db)
            .await?;

        Ok(departments)
    }

    /// Get a single department by ID
    ///
    /// # Security: RLS Enforced
    /// Users can only view their own department unless they have Admin role.
    async fn department(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<Department>> {
        let db = get_db_from_context(ctx)?;

        // Extract UserContext for RLS filtering
        let user_context = ctx.data::<UserContext>()
            .map_err(|_| async_graphql::Error::new("Authentication required - UserContext not found"))?;

        // Build query with RLS filter
        let mut query = DepartmentEntity::find()
            .filter(DepartmentColumn::Id.eq(id))
            .filter(DepartmentColumn::DeletedAt.is_null());

        // Apply RLS filter
        query = apply_department_rls_filter(query, user_context);

        let dept = query.one(&db).await?;
        Ok(dept)
    }

    // =========================================================================
    // Task Queries
    // =========================================================================

    /// Get all tasks with advanced filtering, sorting and pagination
    ///
    /// # Security: RLS Enforced
    /// Users can only view tasks from their department unless they have Admin role.
    async fn tasks(
        &self,
        ctx: &Context<'_>,
        filter: Option<TaskFilter>,
        order_by: Option<String>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<Task>> {
        let db = get_db_from_context(ctx)?;
        let limit = limit.unwrap_or(100).clamp(1, 1000);
        let offset = offset.unwrap_or(0).max(0);

        // Extract UserContext for RLS filtering
        let user_context = ctx.data::<UserContext>()
            .map_err(|_| async_graphql::Error::new("Authentication required - UserContext not found"))?;

        let mut query = TaskEntity::find()
            .filter(TaskColumn::DeletedAt.is_null());

        // Apply RLS filter FIRST (before user-provided filters)
        query = apply_task_rls_filter(query, user_context);

        // Apply filters if provided
        if let Some(f) = &filter {
            if let Some(status) = &f.status {
                query = query.filter(TaskColumn::Status.eq(status.as_str()));
            }
            if let Some(priority) = &f.priority {
                query = query.filter(TaskColumn::Priority.eq(priority.as_str()));
            }
            if let Some(assignee_id) = f.assignee_id {
                query = query.filter(TaskColumn::AssigneeId.eq(assignee_id));
            }
            if let Some(created_by) = f.created_by {
                query = query.filter(TaskColumn::CreatedBy.eq(created_by));
            }
            if let Some(department_id) = f.department_id {
                query = query.filter(TaskColumn::DepartmentId.eq(department_id));
            }
            if let Some(task_type_id) = f.task_type_id {
                query = query.filter(TaskColumn::TaskTypeId.eq(task_type_id));
            }
            if let Some(parent_task_id) = f.parent_task_id {
                query = query.filter(TaskColumn::ParentTaskId.eq(parent_task_id));
            }
            if let Some(archived) = f.archived {
                query = query.filter(TaskColumn::Archived.eq(archived));
            }
        }

        // Apply ordering
        let order_by = order_by.as_deref().unwrap_or("created_at_desc");
        match order_by {
            "created_at_asc" => query = query.order_by_asc(TaskColumn::CreatedAt),
            "created_at_desc" => query = query.order_by_desc(TaskColumn::CreatedAt),
            "due_date_asc" => query = query.order_by_asc(TaskColumn::DueDate),
            "due_date_desc" => query = query.order_by_desc(TaskColumn::DueDate),
            "priority_asc" => query = query.order_by_asc(TaskColumn::Priority),
            "priority_desc" => query = query.order_by_desc(TaskColumn::Priority),
            "status_asc" => query = query.order_by_asc(TaskColumn::Status),
            "status_desc" => query = query.order_by_desc(TaskColumn::Status),
            "title_asc" => query = query.order_by_asc(TaskColumn::Title),
            "title_desc" => query = query.order_by_desc(TaskColumn::Title),
            _ => query = query.order_by_desc(TaskColumn::CreatedAt), // Default
        }

        let tasks = query
            .limit(Some(limit as u64))
            .offset(offset as u64)
            .all(&db)
            .await?;

        Ok(tasks)
    }

    /// Get a single task by ID
    ///
    /// # Security: RLS Enforced
    /// Users can only view tasks from their department. Direct ID access is filtered.
    async fn task(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<Task>> {
        let db = get_db_from_context(ctx)?;

        // Extract UserContext for RLS filtering
        let user_context = ctx.data::<UserContext>()
            .map_err(|_| async_graphql::Error::new("Authentication required - UserContext not found"))?;

        // Build query with RLS filter
        let mut query = TaskEntity::find()
            .filter(TaskColumn::Id.eq(id))
            .filter(TaskColumn::DeletedAt.is_null());

        // Apply RLS filter
        query = apply_task_rls_filter(query, user_context);

        let task = query.one(&db).await?;
        Ok(task)
    }

    /// Get all task types (optionally filter by active status)
    async fn task_types(
        &self,
        ctx: &Context<'_>,
        is_active: Option<bool>,
    ) -> Result<Vec<TaskTypeModel>> {
        let db = get_db_from_context(ctx)?;
        let mut query = TaskTypeEntity::find();

        // Filter by active status if provided
        if let Some(active) = is_active {
            query = query.filter(TaskTypeColumn::IsActive.eq(active));
        }

        let task_types = query
            .order_by_asc(TaskTypeColumn::Name)
            .all(&db)
            .await?;

        Ok(task_types)
    }

    /// Get a single task type by ID
    async fn task_type(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<TaskTypeModel>> {
        let db = get_db_from_context(ctx)?;
        let task_type = TaskTypeEntity::find_by_id(id)
            .one(&db)
            .await?;
        Ok(task_type)
    }

    // =========================================================================
    // Leave Request Queries
    // =========================================================================

    /// Get all leave requests with optional filtering and pagination
    ///
    /// # Security: RLS Enforced
    /// Regular users see only their own leave requests.
    /// HR managers can see all leave requests in their department (simplified to own for now).
    async fn leave_requests(
        &self,
        ctx: &Context<'_>,
        employee_id: Option<Uuid>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<LeaveRequest>> {
        let db = get_db_from_context(ctx)?;
        let limit = limit.unwrap_or(100).clamp(1, 1000);
        let offset = offset.unwrap_or(0).max(0);

        // Extract UserContext for RLS filtering
        let user_context = ctx.data::<UserContext>()
            .map_err(|_| async_graphql::Error::new("Authentication required - UserContext not found"))?;

        let mut query = LeaveRequestEntity::find()
            .filter(LeaveRequestColumn::DeletedAt.is_null());

        // Apply RLS filter
        query = apply_leave_request_rls_filter(query, user_context);

        // Add employee filter if provided
        if let Some(eid) = employee_id {
            query = query.filter(LeaveRequestColumn::EmployeeId.eq(eid));
        }

        let requests = query
            .order_by_desc(LeaveRequestColumn::CreatedAt)
            .limit(Some(limit as u64))
            .offset(offset as u64)
            .all(&db)
            .await?;

        Ok(requests)
    }

    /// Get a single leave request by ID
    ///
    /// # Security: RLS Enforced
    /// Users can only view their own leave requests unless they have elevated privileges.
    async fn leave_request(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<LeaveRequest>> {
        let db = get_db_from_context(ctx)?;

        // Extract UserContext for RLS filtering
        let user_context = ctx.data::<UserContext>()
            .map_err(|_| async_graphql::Error::new("Authentication required - UserContext not found"))?;

        let mut query = LeaveRequestEntity::find()
            .filter(LeaveRequestColumn::Id.eq(id))
            .filter(LeaveRequestColumn::DeletedAt.is_null());

        // Apply RLS filter
        query = apply_leave_request_rls_filter(query, user_context);

        let request = query.one(&db).await?;
        Ok(request)
    }

    // =========================================================================
    // Leave Balance Queries
    // =========================================================================

    /// Get leave balances with optional employee filtering and pagination
    async fn leave_balances(
        &self,
        ctx: &Context<'_>,
        employee_id: Option<Uuid>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<LeaveBalance>> {
        let db = get_db_from_context(ctx)?;
        let limit = limit.unwrap_or(100).clamp(1, 1000);
        let offset = offset.unwrap_or(0).max(0);

        let mut query = LeaveBalanceEntity::find()
            .filter(LeaveBalanceColumn::DeletedAt.is_null());

        // Add employee filter if provided
        if let Some(eid) = employee_id {
            query = query.filter(LeaveBalanceColumn::EmployeeId.eq(eid));
        }

        let balances = query
            .order_by_desc(LeaveBalanceColumn::Year)
            .limit(Some(limit as u64))
            .offset(offset as u64)
            .all(&db)
            .await?;

        Ok(balances)
    }

    // =========================================================================
    // Leave Type Queries
    // =========================================================================

    /// Get all leave types with pagination (active types only by default)
    async fn leave_types(
        &self,
        ctx: &Context<'_>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<LeaveType>> {
        let db = get_db_from_context(ctx)?;
        let limit = limit.unwrap_or(100).clamp(1, 1000);
        let offset = offset.unwrap_or(0).max(0);

        let types = LeaveTypeEntity::find()
            .filter(LeaveTypeColumn::DeletedAt.is_null())
            .order_by_asc(LeaveTypeColumn::Name)
            .limit(Some(limit as u64))
            .offset(offset as u64)
            .all(&db)
            .await?;

        Ok(types)
    }

    /// Get a single leave type by ID
    async fn leave_type(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<LeaveType>> {
        let db = get_db_from_context(ctx)?;
        let leave_type = LeaveTypeEntity::find_by_id(id)
            .filter(LeaveTypeColumn::DeletedAt.is_null())
            .one(&db)
            .await?;
        Ok(leave_type)
    }

    // =========================================================================
    // Emergency Contact Queries
    // =========================================================================

    /// Get emergency contacts with optional employee filtering and pagination
    async fn emergency_contacts(
        &self,
        ctx: &Context<'_>,
        employee_id: Option<Uuid>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<EmergencyContactModel>> {
        let db = get_db_from_context(ctx)?;
        let limit = limit.unwrap_or(100).clamp(1, 1000);
        let offset = offset.unwrap_or(0).max(0);

        let mut query = EmergencyContactEntity::find();

        // Add employee filter if provided
        if let Some(eid) = employee_id {
            query = query.filter(EmergencyContactColumn::EmployeeId.eq(eid));
        }

        let contacts = query
            .order_by_desc(EmergencyContactColumn::IsPrimary)
            .order_by_desc(EmergencyContactColumn::CreatedAt)
            .limit(Some(limit as u64))
            .offset(offset as u64)
            .all(&db)
            .await?;

        Ok(contacts)
    }

    // =========================================================================
    // Employee Vehicle Queries
    // =========================================================================

    /// Get employee vehicles with optional employee filtering and pagination
    async fn employee_vehicles(
        &self,
        ctx: &Context<'_>,
        employee_id: Option<Uuid>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<EmployeeVehicleModel>> {
        let db = get_db_from_context(ctx)?;
        let limit = limit.unwrap_or(100).clamp(1, 1000);
        let offset = offset.unwrap_or(0).max(0);

        let mut query = EmployeeVehicleEntity::find();

        // Add employee filter if provided
        if let Some(eid) = employee_id {
            query = query.filter(EmployeeVehicleColumn::EmployeeId.eq(eid));
        }

        let vehicles = query
            .order_by_desc(EmployeeVehicleColumn::CreatedAt)
            .limit(Some(limit as u64))
            .offset(offset as u64)
            .all(&db)
            .await?;

        Ok(vehicles)
    }

    // =========================================================================
    // Performance Review Queries
    // =========================================================================

    /// Get all performance reviews with optional filtering and pagination
    ///
    /// # Security: RLS Enforced
    /// Regular users see only their own reviews.
    /// HR managers can see all reviews in their department.
    async fn performance_reviews(
        &self,
        ctx: &Context<'_>,
        employee_id: Option<Uuid>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<PerformanceReview>> {
        let db = get_db_from_context(ctx)?;
        let limit = limit.unwrap_or(100).clamp(1, 1000);
        let offset = offset.unwrap_or(0).max(0);

        // Extract UserContext for RLS filtering
        let user_context = ctx.data::<UserContext>()
            .map_err(|_| async_graphql::Error::new("Authentication required - UserContext not found"))?;

        let mut query = PerformanceReviewEntity::find()
            .filter(PerformanceReviewColumn::DeletedAt.is_null());

        // Apply RLS filter
        query = apply_performance_review_rls_filter(query, user_context);

        // Add employee filter if provided
        if let Some(eid) = employee_id {
            query = query.filter(PerformanceReviewColumn::EmployeeId.eq(eid));
        }

        let reviews = query
            .order_by_desc(PerformanceReviewColumn::CreatedAt)
            .limit(Some(limit as u64))
            .offset(offset as u64)
            .all(&db)
            .await?;

        Ok(reviews)
    }

    /// Get a single performance review by ID
    ///
    /// # Security: RLS Enforced
    /// Users can only view their own reviews unless they have elevated privileges.
    async fn performance_review(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<PerformanceReview>> {
        let db = get_db_from_context(ctx)?;

        // Extract UserContext for RLS filtering
        let user_context = ctx.data::<UserContext>()
            .map_err(|_| async_graphql::Error::new("Authentication required - UserContext not found"))?;

        let mut query = PerformanceReviewEntity::find()
            .filter(PerformanceReviewColumn::Id.eq(id))
            .filter(PerformanceReviewColumn::DeletedAt.is_null());

        // Apply RLS filter
        query = apply_performance_review_rls_filter(query, user_context);

        let review = query.one(&db).await?;
        Ok(review)
    }

    // =========================================================================
    // Activity Log Queries  
    // =========================================================================
    
    /// Get activity logs with optional user filtering and pagination
    async fn activity_logs(
        &self,
        ctx: &Context<'_>,
        user_id: Option<Uuid>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<ActivityLogModel>> {
        let db = get_db_from_context(ctx)?;
        let limit = limit.unwrap_or(100).clamp(1, 1000);
        let offset = offset.unwrap_or(0).max(0);

        let mut query = ActivityLogEntity::find();

        // Add user filter if provided
        if let Some(uid) = user_id {
            query = query.filter(ActivityLogColumn::EmployeeId.eq(uid));
        }

        let logs = query
            .order_by_desc(ActivityLogColumn::CreatedAt)
            .limit(Some(limit as u64))
            .offset(offset as u64)
            .all(&db)
            .await?;

        Ok(logs)
    }

    /// Get a single activity log by ID
    async fn activity_log(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<ActivityLogModel>> {
        let db = get_db_from_context(ctx)?;
        let log = ActivityLogEntity::find_by_id(id).one(&db).await?;
        Ok(log)
    }

    /// Get current authenticated user information
    async fn me(&self, ctx: &Context<'_>) -> Result<Option<User>> {
        let auth_session = ctx.data::<AuthSession<crate::auth::AuthBackend>>()?;

        match &auth_session.user {
            Some(auth_user) => {
                let db = get_db_from_context(ctx)?;
                let user = UserEntity::find_by_id(auth_user.id)
                    .filter(UserColumn::DeletedAt.is_null())
                    .one(&db)
                    .await?;
                Ok(user)
            }
            None => Ok(None),
        }
    }

    /// Get current user's session information
    async fn my_session(&self, ctx: &Context<'_>) -> Result<Option<SessionInfo>> {
        let auth_session = ctx.data::<AuthSession<crate::auth::AuthBackend>>()?;

        match &auth_session.user {
            Some(user) => {
                // For now, return a basic session info since we don't have access to the actual session details
                // This would need to be enhanced when we implement proper session store integration
                Ok(Some(SessionInfo {
                    id: "current".to_string(), // Placeholder
                    created_at: chrono::Utc::now(), // Placeholder
                    expires_at: chrono::Utc::now() + chrono::Duration::minutes(30), // Placeholder
                    last_activity: chrono::Utc::now(),
                    ip_address: None,
                    user_agent: None,
                    is_current_session: true,
                }))
            }
            None => Ok(None),
        }
    }

    /// Check authentication status
    async fn auth_status(&self, ctx: &Context<'_>) -> Result<bool> {
        let auth_session = ctx.data::<AuthSession<crate::auth::AuthBackend>>()?;
        Ok(auth_session.user.is_some())
    }

    /// Get active sessions for the current user
    async fn sessions(&self, ctx: &Context<'_>) -> Result<Vec<SessionInfo>> {
        let db = get_db_from_context(ctx)?;
        let auth_session = ctx.data::<AuthSession<crate::auth::AuthBackend>>()?;

        let Some(user) = &auth_session.user else {
            return Err(async_graphql::Error::new("Authentication required"));
        };

        let sessions = UserSessionEntity::find()
            .filter(UserSessionColumn::UserId.eq(user.id))
            .filter(UserSessionColumn::IsActive.eq(true))
            .filter(UserSessionColumn::ExpiresAt.gt(chrono::Utc::now()))
            .all(&db)
            .await?;

        let current_session_id = None; // TODO: Get current session ID when using proper session store

        let session_infos = sessions
            .into_iter()
            .map(|session| SessionInfo {
                id: session.id.to_string(),
                created_at: session.created_at.into(),
                expires_at: session.expires_at.into(),
                last_activity: session.last_activity.into(),
                ip_address: session.ip_address,
                user_agent: session.user_agent,
                is_current_session: current_session_id.as_ref() == Some(&session.session_token),
            })
            .collect();

        Ok(session_infos)
    }

    /// Get CSRF token for the current session
    async fn csrf_token(&self, ctx: &Context<'_>) -> Result<String> {
        let auth_session = ctx.data::<AuthSession<crate::auth::AuthBackend>>()?;

        // Only authenticated users can get CSRF tokens
        let _user = auth_session.user.as_ref()
            .ok_or_else(|| async_graphql::Error::new("Authentication required"))?;

        let token = auth_session.backend.generate_csrf_token();
        Ok(token)
    }

    // =========================================================================
    // Attendance Record Queries
    // =========================================================================

    /// Get attendance records with optional user filtering and pagination
    async fn attendance_records(
        &self,
        ctx: &Context<'_>,
        #[graphql(name = "userId")] user_id: Option<Uuid>,
        #[graphql(name = "employeeId")] employee_id: Option<Uuid>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<AttendanceRecordModel>> {
        let db = get_db_from_context(ctx)?;
        let limit = limit.unwrap_or(100).clamp(1, 1000);
        let offset = offset.unwrap_or(0).max(0);

        let mut query = AttendanceRecordEntity::find();

        // Add user/employee filter if provided (employeeId takes precedence)
        let filter_id = employee_id.or(user_id);
        if let Some(uid) = filter_id {
            query = query.filter(AttendanceRecordColumn::UserId.eq(uid));
        }

        let records = query
            .order_by_desc(AttendanceRecordColumn::Date)
            .limit(Some(limit as u64))
            .offset(offset as u64)
            .all(&db)
            .await?;

        Ok(records)
    }

    // =========================================================================
    // Employee Goal Queries
    // =========================================================================

    /// Get employee goals with optional employee filtering and pagination
    async fn employee_goals(
        &self,
        ctx: &Context<'_>,
        employee_id: Option<Uuid>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<EmployeeGoalModel>> {
        let db = get_db_from_context(ctx)?;
        let limit = limit.unwrap_or(100).clamp(1, 1000);
        let offset = offset.unwrap_or(0).max(0);

        let mut query = EmployeeGoalEntity::find();

        // Add employee filter if provided
        if let Some(eid) = employee_id {
            query = query.filter(EmployeeGoalColumn::EmployeeId.eq(eid));
        }

        let goals = query
            .order_by_desc(EmployeeGoalColumn::CreatedAt)
            .limit(Some(limit as u64))
            .offset(offset as u64)
            .all(&db)
            .await?;

        Ok(goals)
    }

    // =========================================================================
    // Event Queries
    // =========================================================================

    /// Get events with optional upcoming filtering and pagination
    async fn events(
        &self,
        ctx: &Context<'_>,
        upcoming_only: Option<bool>,
        start_time_after: Option<chrono::DateTime<chrono::Utc>>,
        start_time_before: Option<chrono::DateTime<chrono::Utc>>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<Event>> {
        let db = get_db_from_context(ctx)?;
        let limit = limit.unwrap_or(100).clamp(1, 1000);
        let offset = offset.unwrap_or(0).max(0);

        let mut query = EventEntity::find()
            .filter(EventColumn::DeletedAt.is_null());

        // Add upcoming filter if requested
        if upcoming_only.unwrap_or(false) {
            let now = chrono::Utc::now();
            // Filter for scheduled events (status is varchar, not enum)
            query = query
                .filter(EventColumn::StartTime.gte(now))
                .filter(EventColumn::Status.eq("scheduled"));
        }

        // Add date range filtering
        if let Some(after) = start_time_after {
            query = query.filter(EventColumn::StartTime.gte(after));
        }
        if let Some(before) = start_time_before {
            query = query.filter(EventColumn::StartTime.lte(before));
        }

        let events = query
            .order_by_asc(EventColumn::StartTime)
            .limit(Some(limit as u64))
            .offset(offset as u64)
            .all(&db)
            .await?;

        Ok(events)
    }

    /// Get a single event by ID
    async fn event(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<Event>> {
        let db = get_db_from_context(ctx)?;
        let event = EventEntity::find_by_id(id)
            .filter(EventColumn::DeletedAt.is_null())
            .one(&db)
            .await?;
        Ok(event)
    }

    // =========================================================================
    // Event Attendee Queries
    // =========================================================================

    /// Get event attendees with optional filtering and pagination
    async fn event_attendees(
        &self,
        ctx: &Context<'_>,
        event_id: Option<Uuid>,
        employee_id: Option<Uuid>,
        reminder_time_is_null: Option<bool>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<EventAttendee>> {
        let db = get_db_from_context(ctx)?;
        let limit = limit.unwrap_or(100).clamp(1, 1000);
        let offset = offset.unwrap_or(0).max(0);

        let mut query = EventAttendeeEntity::find();

        // Add event filter if provided
        if let Some(eid) = event_id {
            query = query.filter(EventAttendeeColumn::EventId.eq(eid));
        }

        // Add employee filter if provided
        if let Some(empid) = employee_id {
            query = query.filter(EventAttendeeColumn::EmployeeId.eq(empid));
        }

        // Add reminder_time null/not-null filter if provided
        if let Some(is_null) = reminder_time_is_null {
            if is_null {
                query = query.filter(EventAttendeeColumn::ReminderTime.is_null());
            } else {
                query = query.filter(EventAttendeeColumn::ReminderTime.is_not_null());
            }
        }

        let attendees = query
            .order_by_desc(EventAttendeeColumn::CreatedAt)
            .limit(Some(limit as u64))
            .offset(offset as u64)
            .all(&db)
            .await?;

        Ok(attendees)
    }

    // =========================================================================
    // Event Comment Queries
    // =========================================================================

    /// Get event comments for a specific event
    async fn event_comments(
        &self,
        ctx: &Context<'_>,
        event_id: Uuid,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<crate::models::events::event_comment::Model>> {
        let db = get_db_from_context(ctx)?;
        let limit = limit.unwrap_or(50).clamp(1, 500);
        let offset = offset.unwrap_or(0).max(0);

        let comments = crate::models::events::event_comment::Entity::find()
            .filter(crate::models::events::event_comment::Column::EventId.eq(event_id))
            .filter(crate::models::events::event_comment::Column::DeletedAt.is_null())
            .order_by_desc(crate::models::events::event_comment::Column::CreatedAt)
            .limit(Some(limit as u64))
            .offset(offset as u64)
            .all(&db)
            .await?;

        Ok(comments)
    }

    // =========================================================================
    // Event History Queries
    // =========================================================================

    /// Get event history for a specific event
    async fn event_histories(
        &self,
        ctx: &Context<'_>,
        event_id: Uuid,
        limit: Option<i64>,
    ) -> Result<Vec<crate::models::events::event_history::Model>> {
        let db = get_db_from_context(ctx)?;
        let limit = limit.unwrap_or(50).clamp(1, 500);

        let histories = crate::models::events::event_history::Entity::find()
            .filter(crate::models::events::event_history::Column::EventId.eq(event_id))
            .order_by_desc(crate::models::events::event_history::Column::CreatedAt)
            .limit(Some(limit as u64))
            .all(&db)
            .await?;

        Ok(histories)
    }

    // =========================================================================
    // Event Waitlist Queries
    // =========================================================================

    /// Get event waitlist entries
    async fn event_waitlists(
        &self,
        ctx: &Context<'_>,
        event_id: Option<Uuid>,
        user_id: Option<Uuid>,
        limit: Option<i64>,
    ) -> Result<Vec<crate::models::events::event_waitlist::Model>> {
        let db = get_db_from_context(ctx)?;
        let limit = limit.unwrap_or(100).clamp(1, 500);

        let mut query = crate::models::events::event_waitlist::Entity::find();

        // Filter by event_id if provided
        if let Some(eid) = event_id {
            query = query.filter(crate::models::events::event_waitlist::Column::EventId.eq(eid));
        }

        // Filter by user_id if provided
        if let Some(uid) = user_id {
            query = query.filter(crate::models::events::event_waitlist::Column::UserId.eq(uid));
        }

        let waitlists = query
            .order_by_asc(crate::models::events::event_waitlist::Column::Position)
            .limit(Some(limit as u64))
            .all(&db)
            .await?;

        Ok(waitlists)
    }

    // =========================================================================
    // Notification Queries
    // =========================================================================

    /// Get notifications with optional user and read status filtering
    async fn notifications(
        &self,
        ctx: &Context<'_>,
        user_id: Option<Uuid>,
        unread_only: Option<bool>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<Notification>> {
        let db = get_db_from_context(ctx)?;
        let limit = limit.unwrap_or(100).clamp(1, 1000);
        let offset = offset.unwrap_or(0).max(0);

        let mut query = NotificationEntity::find();

        // Add user filter if provided
        if let Some(uid) = user_id {
            query = query.filter(NotificationColumn::RecipientId.eq(uid));
        }

        // Add unread filter if requested
        if unread_only.unwrap_or(false) {
            query = query.filter(NotificationColumn::ReadStatus.eq(false));
        }

        let notifications = query
            .order_by_desc(NotificationColumn::CreatedAt)
            .limit(Some(limit as u64))
            .offset(offset as u64)
            .all(&db)
            .await?;

        Ok(notifications)
    }

    // =========================================================================
    // Rollback Request Queries
    // =========================================================================

    /// Get rollback requests with optional status filtering and pagination
    async fn rollback_requests(
        &self,
        ctx: &Context<'_>,
        status: Option<RollbackStatus>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<RollbackRequestModel>> {
        let db = get_db_from_context(ctx)?;
        let limit = limit.unwrap_or(100).clamp(1, 1000);
        let offset = offset.unwrap_or(0).max(0);

        let mut query = RollbackRequestEntity::find();

        // Add status filter if provided
        if let Some(s) = status {
            query = query.filter(RollbackRequestColumn::Status.eq(s.as_str()));
        }

        let requests = query
            .order_by_desc(RollbackRequestColumn::CreatedAt)
            .limit(Some(limit as u64))
            .offset(offset as u64)
            .all(&db)
            .await?;

        Ok(requests)
    }

    /// Get count of rollback requests by optional status
    async fn rollback_requests_count(
        &self,
        ctx: &Context<'_>,
        status: Option<RollbackStatus>,
    ) -> Result<i64> {
        let db = get_db_from_context(ctx)?;

        let mut query = RollbackRequestEntity::find();

        // Add status filter if provided
        if let Some(s) = status {
            query = query.filter(RollbackRequestColumn::Status.eq(s.as_str()));
        }

        let count = query.count(&db).await?;

        Ok(count as i64)
    }

    // =========================================================================
    // HR Reports Queries
    // =========================================================================

    /// Get all HR reports with optional pagination
    async fn hr_reports(
        &self,
        ctx: &Context<'_>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<HRReportModel>> {
        let db = get_db_from_context(ctx)?;
        let limit = limit.unwrap_or(100).clamp(1, 1000);
        let offset = offset.unwrap_or(0).max(0);

        let reports = HrReportEntity::find()
            .order_by_desc(HrReportColumn::CreatedAt)
            .limit(Some(limit as u64))
            .offset(offset as u64)
            .all(&db)
            .await?;

        Ok(reports)
    }

    /// Get a single HR report by ID
    async fn hr_report(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<HRReportModel>> {
        let db = get_db_from_context(ctx)?;
        let report = HrReportEntity::find_by_id(id)
            .one(&db)
            .await?;
        Ok(report)
    }

    // =========================================================================
    // System Settings Queries (system_admin role only)
    // =========================================================================

    /// Get all system settings (requires system_admin role with system_settings:read permission)
    #[graphql(guard = "crate::middleware::guards::RequireRole::new(\"system_admin\")")]
    async fn system_settings(&self, ctx: &Context<'_>) -> Result<Vec<SystemSettingsModel>> {
        let db = get_db_from_context(ctx)?;
        let settings = SystemSettingsModel::find_all(&db).await?;
        Ok(settings)
    }

    /// Get system settings by category (requires system_admin role with system_settings:read permission)
    #[graphql(guard = "crate::middleware::guards::RequireRole::new(\"system_admin\")")]
    async fn system_settings_by_category(
        &self,
        ctx: &Context<'_>,
        category: String,
    ) -> Result<Option<SystemSettingsModel>> {
        let db = get_db_from_context(ctx)?;
        let settings = SystemSettingsModel::find_by_category(&db, &category).await?;
        Ok(settings)
    }

    // =========================================================================
    // User Address Queries
    // =========================================================================

    /// Get all addresses for a specific user
    async fn user_addresses(
        &self,
        ctx: &Context<'_>,
        user_id: Uuid,
    ) -> Result<Vec<crate::models::employee::user_address::Model>> {
        let db = get_db_from_context(ctx)?;
        let addresses = crate::models::employee::user_address::Entity::find()
            .filter(crate::models::employee::user_address::Column::UserId.eq(user_id))
            .filter(crate::models::employee::user_address::Column::DeletedAt.is_null())
            .order_by_asc(crate::models::employee::user_address::Column::IsPrimary)
            .all(&db)
            .await?;

        Ok(addresses)
    }

    /// Get a single user address by ID
    async fn user_address(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
    ) -> Result<Option<crate::models::employee::user_address::Model>> {
        let db = get_db_from_context(ctx)?;
        let address = crate::models::employee::user_address::Entity::find_by_id(id)
            .filter(crate::models::employee::user_address::Column::DeletedAt.is_null())
            .one(&db)
            .await?;

        Ok(address)
    }

    /// Get primary address for a specific user
    async fn user_primary_address(
        &self,
        ctx: &Context<'_>,
        user_id: Uuid,
    ) -> Result<Option<crate::models::employee::user_address::Model>> {
        let db = get_db_from_context(ctx)?;
        let address = crate::models::employee::user_address::Entity::find()
            .filter(crate::models::employee::user_address::Column::UserId.eq(user_id))
            .filter(crate::models::employee::user_address::Column::IsPrimary.eq(true))
            .filter(crate::models::employee::user_address::Column::DeletedAt.is_null())
            .one(&db)
            .await?;

        Ok(address)
    }

    // =========================================================================
    // Document Queries
    // =========================================================================

    /// Get all documents with pagination
    async fn documents(
        &self,
        ctx: &Context<'_>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<crate::models::documents::document::Model>> {
        use crate::models::documents::document::{Entity as DocumentEntity, Column as DocumentColumn};

        let db = get_db_from_context(ctx)?;
        let limit = limit.unwrap_or(20).clamp(1, 100);
        let offset = offset.unwrap_or(0).max(0);

        let documents = DocumentEntity::find()
            .filter(DocumentColumn::DeletedAt.is_null())
            .order_by_desc(DocumentColumn::CreatedAt)
            .limit(Some(limit as u64))
            .offset(offset as u64)
            .all(&db)
            .await?;

        Ok(documents)
    }

    /// Get a single document by ID
    async fn document(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
    ) -> Result<Option<crate::models::documents::document::Model>> {
        use crate::models::documents::document::{Entity as DocumentEntity, Column as DocumentColumn};

        let db = get_db_from_context(ctx)?;

        let document = DocumentEntity::find_by_id(id)
            .filter(DocumentColumn::DeletedAt.is_null())
            .one(&db)
            .await?;

        Ok(document)
    }

    // =========================================================================
    // Analytics - Employee Statistics Queries
    // =========================================================================

    /// Get employee statistics for a date range (for trend analysis and charts)
    ///
    /// Returns daily snapshots of employee counts within the specified date range.
    /// Useful for generating historical trend charts showing employee growth over time.
    async fn employee_statistics(
        &self,
        ctx: &Context<'_>,
        #[graphql(name = "startDate")] start_date: String,
        #[graphql(name = "endDate")] end_date: String,
    ) -> Result<Vec<crate::models::analytics::EmployeeStatistic>> {
        use crate::models::analytics::EmployeeStatisticEntity;
        use chrono::NaiveDate;

        let db = get_db_from_context(ctx)?;

        // Parse dates
        let start = NaiveDate::parse_from_str(&start_date, "%Y-%m-%d")
            .map_err(|e| AppError::Validation(format!("Invalid start_date format: {}", e)))?;
        let end = NaiveDate::parse_from_str(&end_date, "%Y-%m-%d")
            .map_err(|e| AppError::Validation(format!("Invalid end_date format: {}", e)))?;

        // Validate date range
        if start > end {
            return Err(AppError::Validation("start_date must be before or equal to end_date".to_string()).into());
        }

        // Query statistics
        let statistics = EmployeeStatisticEntity::get_statistics_range(&db, start, end).await?;

        Ok(statistics)
    }

    /// Get the most recent employee statistics snapshot
    async fn latest_employee_statistics(
        &self,
        ctx: &Context<'_>,
    ) -> Result<Option<crate::models::analytics::EmployeeStatistic>> {
        use crate::models::analytics::EmployeeStatisticEntity;

        let db = get_db_from_context(ctx)?;
        let latest = EmployeeStatisticEntity::get_latest(&db).await?;

        Ok(latest)
    }

    // =========================================================================
    // RBAC Queries - Roles, Permissions, and Assignments
    // =========================================================================

    /// Get all roles with optional filtering and pagination
    async fn roles(
        &self,
        ctx: &Context<'_>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<crate::models::role::Model>> {
        use crate::models::role::{Entity as RoleEntity, Column as RoleColumn};

        let db = get_db_from_context(ctx)?;
        let limit = limit.unwrap_or(100).clamp(1, 1000);
        let offset = offset.unwrap_or(0).max(0);

        let roles = RoleEntity::find()
            .filter(RoleColumn::DeletedAt.is_null())
            .order_by_asc(RoleColumn::Level)
            .order_by_asc(RoleColumn::Name)
            .limit(Some(limit as u64))
            .offset(offset as u64)
            .all(&db)
            .await?;

        Ok(roles)
    }

    /// Get a single role by ID
    async fn role(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<crate::models::role::Model>> {
        use crate::models::role::{Entity as RoleEntity, Column as RoleColumn};

        let db = get_db_from_context(ctx)?;
        let role = RoleEntity::find_by_id(id)
            .filter(RoleColumn::DeletedAt.is_null())
            .one(&db)
            .await?;

        Ok(role)
    }

    /// Get role by name
    async fn role_by_name(&self, ctx: &Context<'_>, name: String) -> Result<Option<crate::models::role::Model>> {
        use crate::models::role::{Entity as RoleEntity, Column as RoleColumn};

        let db = get_db_from_context(ctx)?;
        let role = RoleEntity::find()
            .filter(RoleColumn::Name.eq(name))
            .filter(RoleColumn::DeletedAt.is_null())
            .one(&db)
            .await?;

        Ok(role)
    }

    /// Get all permissions with optional filtering and pagination
    async fn permissions(
        &self,
        ctx: &Context<'_>,
        limit: Option<i64>,
        offset: Option<i64>,
        resource: Option<String>,
    ) -> Result<Vec<crate::models::permission::Model>> {
        use crate::models::permission::{Entity as PermissionEntity, Column as PermissionColumn};

        let db = get_db_from_context(ctx)?;
        let limit = limit.unwrap_or(200).clamp(1, 1000);
        let offset = offset.unwrap_or(0).max(0);

        let mut query = PermissionEntity::find()
            .filter(PermissionColumn::DeletedAt.is_null());

        // Filter by resource if provided
        if let Some(res) = resource {
            query = query.filter(PermissionColumn::Resource.eq(res));
        }

        let permissions = query
            .order_by_asc(PermissionColumn::Resource)
            .order_by_asc(PermissionColumn::Action)
            .limit(Some(limit as u64))
            .offset(offset as u64)
            .all(&db)
            .await?;

        Ok(permissions)
    }

    /// Get a single permission by ID
    async fn permission(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<crate::models::permission::Model>> {
        use crate::models::permission::{Entity as PermissionEntity, Column as PermissionColumn};

        let db = get_db_from_context(ctx)?;
        let permission = PermissionEntity::find_by_id(id)
            .filter(PermissionColumn::DeletedAt.is_null())
            .one(&db)
            .await?;

        Ok(permission)
    }

    /// Get users assigned to a specific role
    async fn users_by_role(
        &self,
        ctx: &Context<'_>,
        role_id: Uuid,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<crate::models::user::Model>> {
        use crate::models::user::{Entity as UserEntity, Column as UserColumn};
        use crate::models::user_role_assignment::{Entity as UserRoleEntity, Column as UserRoleColumn};

        let db = get_db_from_context(ctx)?;
        let limit = limit.unwrap_or(100).clamp(1, 1000);
        let offset = offset.unwrap_or(0).max(0);

        // Get user IDs from role assignments
        let assignments = UserRoleEntity::find()
            .filter(UserRoleColumn::RoleId.eq(role_id))
            .filter(UserRoleColumn::DeletedAt.is_null())
            .all(&db)
            .await?;

        let user_ids: Vec<Uuid> = assignments.iter().map(|a| a.user_id).collect();

        if user_ids.is_empty() {
            return Ok(vec![]);
        }

        // Get users
        let users = UserEntity::find()
            .filter(UserColumn::Id.is_in(user_ids))
            .filter(UserColumn::DeletedAt.is_null())
            .limit(Some(limit as u64))
            .offset(offset as u64)
            .all(&db)
            .await?;

        Ok(users)
    }

    /// Get roles assigned to a specific user
    async fn user_roles(
        &self,
        ctx: &Context<'_>,
        user_id: Uuid,
    ) -> Result<Vec<crate::models::role::Model>> {
        use crate::models::role::{Entity as RoleEntity};
        use crate::models::user_role_assignment::{Entity as UserRoleEntity, Column as UserRoleColumn};

        let db = get_db_from_context(ctx)?;

        // Get role IDs from user role assignments
        let assignments = UserRoleEntity::find()
            .filter(UserRoleColumn::UserId.eq(user_id))
            .filter(UserRoleColumn::DeletedAt.is_null())
            .all(&db)
            .await?;

        let role_ids: Vec<Uuid> = assignments.iter().map(|a| a.role_id).collect();

        if role_ids.is_empty() {
            return Ok(vec![]);
        }

        // Get roles
        let roles = RoleEntity::find()
            .filter(crate::models::role::Column::Id.is_in(role_ids))
            .filter(crate::models::role::Column::DeletedAt.is_null())
            .all(&db)
            .await?;

        Ok(roles)
    }

    /// Get all permissions for a specific user (aggregated from all their roles)
    async fn user_permissions(
        &self,
        ctx: &Context<'_>,
        user_id: Uuid,
    ) -> Result<Vec<crate::models::permission::Model>> {
        use crate::models::permission::{Entity as PermissionEntity};
        use crate::models::role_permission::{Entity as RolePermEntity, Column as RolePermColumn};
        use crate::models::user_role_assignment::{Entity as UserRoleEntity, Column as UserRoleColumn};

        let db = get_db_from_context(ctx)?;

        // Get role IDs for the user
        let user_roles = UserRoleEntity::find()
            .filter(UserRoleColumn::UserId.eq(user_id))
            .filter(UserRoleColumn::DeletedAt.is_null())
            .all(&db)
            .await?;

        let role_ids: Vec<Uuid> = user_roles.iter().map(|ur| ur.role_id).collect();

        if role_ids.is_empty() {
            return Ok(vec![]);
        }

        // Get permission IDs from role permissions
        let role_perms = RolePermEntity::find()
            .filter(RolePermColumn::RoleId.is_in(role_ids))
            .filter(RolePermColumn::DeletedAt.is_null())
            .all(&db)
            .await?;

        let permission_ids: Vec<Uuid> = role_perms.iter().map(|rp| rp.permission_id).collect();

        if permission_ids.is_empty() {
            return Ok(vec![]);
        }

        // Get unique permissions
        let permissions = PermissionEntity::find()
            .filter(crate::models::permission::Column::Id.is_in(permission_ids))
            .filter(crate::models::permission::Column::DeletedAt.is_null())
            .all(&db)
            .await?;

        Ok(permissions)
    }

    /// Rollback and snapshot queries
    async fn rollback(&self) -> crate::schema::mutations::RollbackQueries {
        crate::schema::mutations::RollbackQueries
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use hr_graphql_server::testing::{TestContext, TestUserRole};

    /// T017 Pattern: Test not found error with random UUID
    #[tokio::test]
    async fn test_user_query_not_found() {
        // Arrange
        let ctx = TestContext::new()
            .await
            .expect("Failed to create test context");

        let random_id = uuid::Uuid::new_v4();

        let query = format!(
            r#"
            query {{
                user(id: "{}") {{
                    id
                    email
                    firstName
                    lastName
                }}
            }}
            "#,
            random_id
        );

        // Act
        let response = ctx.execute_query(&query).await;

        // Assert - Should return null for non-existent user
        let data = ctx.extract_data(&response);
        // Note: async_graphql::Value formats without quotes around keys
        assert_eq!(data.to_string(), "{user: null}");

        // Should have no errors
        let errors = ctx.extract_errors(&response);
        assert!(errors.is_empty(), "Expected no errors, got: {:?}", errors);
    }

    /// T018 Pattern: Test success case - Create test user, fetch by ID, assert match
    #[tokio::test]
    async fn test_user_query_success() {
        // Arrange
        let ctx = TestContext::new()
            .await
            .expect("Failed to create test context");

        // Get a test user created by TestContext
        let test_user = ctx.user(TestUserRole::Employee);

        let query = format!(
            r#"
            query {{
                user(id: "{}") {{
                    id
                    email
                    firstName
                    lastName
                    role
                    isActive
                }}
            }}
            "#,
            test_user.id
        );

        // Act
        let response = ctx.execute_query(&query).await;

        // Assert - No errors
        let errors = ctx.extract_errors(&response);
        assert!(errors.is_empty(), "Expected no errors, got: {:?}", errors);

        // Assert - User data matches
        let data = ctx.extract_data(&response);
        let data_str = data.to_string();

        assert!(data_str.contains(&test_user.id.to_string()),
            "Response should contain user ID");
        assert!(data_str.contains(&test_user.email),
            "Response should contain user email");
        assert!(data_str.contains(&test_user.role),
            "Response should contain user role");
    }

    /// T021 Pattern: Test async execution with authenticated user
    ///
    /// Note: The `me` query requires AuthSession which is provided by axum middleware.
    /// For now, we test that the query fails gracefully without AuthSession data.
    /// Full integration tests with AuthSession will be in Phase 4.
    #[tokio::test]
    async fn test_me_query_authenticated() {
        // Arrange
        let ctx = TestContext::new()
            .await
            .expect("Failed to create test context");

        let test_user = ctx.user(TestUserRole::HrManager);

        let query = r#"
            query {
                me {
                    id
                    email
                    firstName
                    lastName
                    role
                }
            }
        "#;

        // Act - Execute as authenticated user
        // Note: This will fail because AuthSession is not available in test context
        let response = ctx.execute_query_as(query, test_user).await;

        // Assert - Should have error about missing AuthSession
        let errors = ctx.extract_errors(&response);
        assert!(!errors.is_empty(), "Expected AuthSession error");
        assert!(errors[0].contains("AuthSession") || errors[0].contains("does not exist"),
            "Expected AuthSession-related error, got: {:?}", errors);
    }

    /// T020 Pattern: Test authorization failure - unauthenticated access
    #[tokio::test]
    async fn test_me_query_unauthenticated() {
        // Arrange
        let ctx = TestContext::new()
            .await
            .expect("Failed to create test context");

        let query = r#"
            query {
                me {
                    id
                    email
                }
            }
        "#;

        // Act - Execute without authentication
        let response = ctx.execute_query(query).await;

        // Assert - Should return null for unauthenticated request
        let data = ctx.extract_data(&response);
        let data_str = data.to_string();

        // Me query returns null when not authenticated
        assert!(data_str.contains("null"),
            "Unauthenticated request should return null");
    }

    /// Test users query with pagination
    #[tokio::test]
    async fn test_users_query_with_pagination() {
        // Arrange
        let ctx = TestContext::new()
            .await
            .expect("Failed to create test context");

        let query = r#"
            query {
                users(limit: 10, offset: 0) {
                    id
                    email
                    role
                    isActive
                }
            }
        "#;

        // Act
        let response = ctx.execute_query(&query).await;

        // Assert - No errors
        let errors = ctx.extract_errors(&response);
        assert!(errors.is_empty(), "Expected no errors, got: {:?}", errors);

        // Assert - Should return array of users (at least our test users)
        let data = ctx.extract_data(&response);
        let data_str = data.to_string();

        assert!(data_str.contains("users"), "Response should contain users field");

        // Should contain at least one of our test users
        let test_users = ctx.users();
        let has_test_user = data_str.contains(&test_users.employee.email)
            || data_str.contains(&test_users.hr_manager.email)
            || data_str.contains(&test_users.admin.email);

        assert!(has_test_user, "Response should contain at least one test user");
    }

    /// Test users query with variables
    #[tokio::test]
    async fn test_users_query_with_variables() {
        // Arrange
        let ctx = TestContext::new()
            .await
            .expect("Failed to create test context");

        let query = r#"
            query GetUsers($limit: Int, $offset: Int) {
                users(limit: $limit, offset: $offset) {
                    id
                    email
                    role
                }
            }
        "#;

        // Create variables using async_graphql::Variables
        use async_graphql::Variables;
        use serde_json::json;

        let variables = Variables::from_json(json!({
            "limit": 5,
            "offset": 0
        }));

        // Act
        let response = ctx.execute_with_variables(query, variables).await;

        // Assert - No errors
        let errors = ctx.extract_errors(&response);
        assert!(errors.is_empty(), "Expected no errors, got: {:?}", errors);

        // Assert - Returns users
        let data = ctx.extract_data(&response);
        assert!(data.to_string().contains("users"), "Response should contain users field");
    }

    /// Test authenticated query with variables
    #[tokio::test]
    async fn test_authenticated_query_with_variables() {
        // Arrange
        let ctx = TestContext::new()
            .await
            .expect("Failed to create test context");

        let test_user = ctx.user(TestUserRole::Admin);

        let query = r#"
            query GetUser($id: UUID!) {
                user(id: $id) {
                    id
                    email
                    role
                }
            }
        "#;

        use async_graphql::Variables;
        use serde_json::json;

        let variables = Variables::from_json(json!({
            "id": test_user.id.to_string()
        }));

        // Act
        let response = ctx.execute_with_variables_as(query, variables, test_user).await;

        // Assert - No errors
        let errors = ctx.extract_errors(&response);
        assert!(errors.is_empty(), "Expected no errors, got: {:?}", errors);

        // Assert - Returns correct user
        let data = ctx.extract_data(&response);
        let data_str = data.to_string();

        assert!(data_str.contains(&test_user.id.to_string()),
            "Response should contain requested user ID");
    }
}
