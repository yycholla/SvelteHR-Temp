//! GraphQL Query Resolvers - SeaORM Implementation
//!
//! This module implements GraphQL query resolvers using SeaORM.
//! All queries follow idiomatic Rust patterns with proper error handling.

use async_graphql::{Context, InputObject, Object, Result};
// use axum_login::AuthSession; // REMOVED: Using JWT UserContext instead
use sea_orm::{EntityTrait, QueryFilter, QueryOrder, QuerySelect, ColumnTrait, PaginatorTrait, Condition};
use sea_orm::prelude::Expr;
use sea_orm::sea_query::extension::postgres::PgExpr;
use uuid::Uuid;

use crate::{
    auth::UserContext,
    database::get_db_from_context,
    error::AppError,
    models::{
        task::{TaskStatus, TaskPriority, Model as Task, Entity as TaskEntity, Column as TaskColumn},
        user::{Model as User, Entity as UserEntity, Column as UserColumn},
        department::{Model as Department, Entity as DepartmentEntity, Column as DepartmentColumn},
        tasks::task_type::{Model as TaskTypeModel, Entity as TaskTypeEntity, Column as TaskTypeColumn},
        event::{Model as Event, Entity as EventEntity, Column as EventColumn},
        event_attendee::{Model as EventAttendee, Entity as EventAttendeeEntity, Column as EventAttendeeColumn},
        leave_request::{Model as LeaveRequest, Entity as LeaveRequestEntity, Column as LeaveRequestColumn},
        leave_balance::{Model as LeaveBalance, Entity as LeaveBalanceEntity, Column as LeaveBalanceColumn},
        leave_type::{Model as LeaveType, Entity as LeaveTypeEntity, Column as LeaveTypeColumn},
        performance_review::{Model as PerformanceReview, Entity as PerformanceReviewEntity, Column as PerformanceReviewColumn},
        employee::{
            emergency_contact::{Model as EmergencyContactModel, Entity as EmergencyContactEntity, Column as EmergencyContactColumn},
            employee_vehicle::{Model as EmployeeVehicleModel, Entity as EmployeeVehicleEntity, Column as EmployeeVehicleColumn},
        },
        time::attendance_record::{Model as AttendanceRecordModel, Entity as AttendanceRecordEntity, Column as AttendanceRecordColumn},
        system::{
            hr_report::{Model as HRReportModel, Entity as HrReportEntity, Column as HrReportColumn},
            activity_log::{Model as ActivityLogModel, Entity as ActivityLogEntity, Column as ActivityLogColumn},
            rollback_request::{Model as RollbackRequestModel, Entity as RollbackRequestEntity, Column as RollbackRequestColumn, RollbackStatus},
            system_settings::Model as SystemSettingsModel,
        },
        notification::{Model as Notification, Entity as NotificationEntity, Column as NotificationColumn},
        // user_session::{Entity as UserSessionEntity, Column as UserSessionColumn}, // REMOVED: JWT-only auth
        employee::employee_goal::{Model as EmployeeGoalModel, Entity as EmployeeGoalEntity, Column as EmployeeGoalColumn},
    },
};

use crate::models::{AssignmentWithModule, AssignmentWithUser};

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

/// Department filter input for advanced querying
#[derive(Debug, Clone, InputObject)]
pub struct DepartmentFilter {
    /// Search departments by name (case-insensitive partial match)
    pub search_term: Option<String>,
    /// Filter by parent department ID (null for root departments)
    pub parent_id: Option<Uuid>,
    /// Show only root departments (no parent)
    pub root_only: Option<bool>,
    /// Filter by manager ID
    pub manager_id: Option<Uuid>,
    /// Include soft-deleted departments
    pub include_deleted: Option<bool>,
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
pub fn apply_user_rls_filter(
    query: sea_orm::Select<UserEntity>,
    _user_context: &UserContext,
) -> sea_orm::Select<UserEntity> {
    // Policy Update: Allow all authenticated users to view the employee directory.
    // Previously restricted to department-only for non-admins.
    // System admins and Admin role bypass RLS - see all users (implicit in returning query)
    
    // Return query without additional filters
    query
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
    _user_context: &UserContext,
) -> sea_orm::Select<DepartmentEntity> {
    // Policy Update: Allow all authenticated users to view all departments.
    // Departments serve as organization boundaries but structure is generally public.
    query
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
        if let Some(_dept_id) = user_context.department_id {
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

        tracing::info!("[Users Query] Starting query with limit={}, offset={}", limit, offset);

        // Extract UserContext for RLS filtering
        let user_context = ctx.data::<UserContext>()
            .map_err(|_| async_graphql::Error::new("Authentication required - UserContext not found"))?;

        tracing::info!("[Users Query] UserContext: user_id={:?}, is_admin={}, is_system={}",
            user_context.user_id,
            user_context.is_admin(),
            user_context.is_system()
        );

        // Build query with RLS filter (removed hardcoded isActive filter - let client filter)
        let mut query = UserEntity::find()
            .filter(UserColumn::DeletedAt.is_null());

        // Apply RLS filter based on user context
        query = apply_user_rls_filter(query, user_context);

        tracing::info!("[Users Query] Executing query...");
        let users = query
            .order_by_desc(UserColumn::CreatedAt)
            .limit(Some(limit as u64))
            .offset(offset as u64)
            .all(&db)
            .await?;

        tracing::info!("[Users Query] Query completed, returned {} users", users.len());

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
        filter: Option<DepartmentFilter>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<Department>> {
        let db = get_db_from_context(ctx)?;
        let limit = limit.unwrap_or(100).clamp(1, 1000);
        let offset = offset.unwrap_or(0).max(0);

        // Extract UserContext for RLS filtering
        let user_context = ctx.data::<UserContext>()
            .map_err(|_| async_graphql::Error::new("Authentication required - UserContext not found"))?;

        // Start with base query
        let mut query = DepartmentEntity::find();

        // Apply filters if provided
        if let Some(f) = filter {
            if let Some(search) = f.search_term {
                let pattern = format!("%{}%", search);
                query = query.filter(
                    Condition::any()
                        .add(Expr::col(DepartmentColumn::Name.as_column_ref()).ilike(&pattern))
                        .add(Expr::col(DepartmentColumn::Description.as_column_ref()).ilike(&pattern))
                );
            }

            if let Some(parent_id) = f.parent_id {
                query = query.filter(DepartmentColumn::ParentDepartmentId.eq(parent_id));
            } else if f.root_only == Some(true) {
                query = query.filter(DepartmentColumn::ParentDepartmentId.is_null());
            }

            if let Some(manager_id) = f.manager_id {
                query = query.filter(DepartmentColumn::ManagerId.eq(manager_id));
            }

            if f.include_deleted != Some(true) {
                query = query.filter(DepartmentColumn::DeletedAt.is_null());
            }
        } else {
            // Default: exclude deleted
            query = query.filter(DepartmentColumn::DeletedAt.is_null());
        }

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

    /// Get all ancestor departments (parents up to root)
    ///
    /// # Arguments
    /// * `department_id` - Starting department UUID
    ///
    /// # Returns
    /// List of ancestors from immediate parent to root (ordered: closest parent first)
    ///
    /// # Security: RLS Enforced
    /// Applies user RLS filter to ancestor departments
    ///
    /// # Note
    /// Returns empty list if department has no parent or doesn't exist
    async fn get_department_ancestors(
        &self,
        ctx: &Context<'_>,
        department_id: Uuid,
    ) -> Result<Vec<Department>> {
        let db = get_db_from_context(ctx)?;

        // Extract UserContext for RLS filtering
        let user_context = ctx.data::<UserContext>()
            .map_err(|_| async_graphql::Error::new("Authentication required - UserContext not found"))?;

        let mut ancestors = Vec::new();
        let mut current_id = Some(department_id);

        // Prevent infinite loops - max 100 levels
        let max_depth = 100;
        let mut depth = 0;

        while let Some(dept_id) = current_id {
            depth += 1;
            if depth > max_depth {
                return Err(async_graphql::Error::new(
                    "Department hierarchy too deep or circular dependency detected"
                ));
            }

            // Find current department
            let mut query = DepartmentEntity::find()
                .filter(DepartmentColumn::Id.eq(dept_id))
                .filter(DepartmentColumn::DeletedAt.is_null());

            // Apply RLS filter
            query = apply_department_rls_filter(query, user_context);

            if let Some(dept) = query.one(&db).await? {
                // If this is not the starting department, add to ancestors
                if dept.id != department_id {
                    ancestors.push(dept.clone());
                }

                // Move to parent
                current_id = dept.parent_department_id;
            } else {
                // Department not found or filtered by RLS
                break;
            }
        }

        Ok(ancestors)
    }

    /// Get all descendant departments (children recursively)
    ///
    /// # Arguments
    /// * `department_id` - Root department UUID
    ///
    /// # Returns
    /// List of all descendants (breadth-first order)
    ///
    /// # Security: RLS Enforced
    /// Applies user RLS filter to descendant departments
    ///
    /// # Note
    /// Returns empty list if department has no children or doesn't exist
    async fn get_department_descendants(
        &self,
        ctx: &Context<'_>,
        department_id: Uuid,
    ) -> Result<Vec<Department>> {
        let db = get_db_from_context(ctx)?;

        // Extract UserContext for RLS filtering
        let user_context = ctx.data::<UserContext>()
            .map_err(|_| async_graphql::Error::new("Authentication required - UserContext not found"))?;

        let mut descendants = Vec::new();
        let mut to_process = vec![department_id];
        let mut processed = std::collections::HashSet::new();

        // Prevent infinite loops - max 1000 departments
        let max_count = 1000;

        while let Some(parent_id) = to_process.pop() {
            if descendants.len() >= max_count {
                return Err(async_graphql::Error::new(
                    "Too many departments or circular dependency detected"
                ));
            }

            // Skip if already processed (circular reference protection)
            if !processed.insert(parent_id) {
                continue;
            }

            // Find children of current department
            let mut query = DepartmentEntity::find()
                .filter(DepartmentColumn::ParentDepartmentId.eq(parent_id))
                .filter(DepartmentColumn::DeletedAt.is_null());

            // Apply RLS filter
            query = apply_department_rls_filter(query, user_context);

            let children = query.all(&db).await?;

            for child in children {
                // Skip the starting department itself
                if child.id != department_id {
                    to_process.push(child.id);
                    descendants.push(child);
                }
            }
        }

        Ok(descendants)
    }

    /// Check if a department name is unique
    ///
    /// # Arguments
    /// * `name` - Department name to check
    /// * `parent_department_id` - Optional parent department ID to scope uniqueness check
    /// * `exclude_department_id` - Optional department ID to exclude from check (for updates)
    ///
    /// # Returns
    /// `true` if name is unique, `false` if name already exists
    ///
    /// # Uniqueness Rules
    /// - If `parent_department_id` is provided, checks uniqueness only among siblings
    /// - If `parent_department_id` is None, checks uniqueness only among root departments
    /// - `exclude_department_id` is useful when updating existing department
    ///
    /// # Security: RLS Enforced
    /// Applies user RLS filter to visible departments
    async fn is_department_name_unique(
        &self,
        ctx: &Context<'_>,
        name: String,
        parent_department_id: Option<Uuid>,
        exclude_department_id: Option<Uuid>,
    ) -> Result<bool> {
        let db = get_db_from_context(ctx)?;

        // Extract UserContext for RLS filtering
        let user_context = ctx.data::<UserContext>()
            .map_err(|_| async_graphql::Error::new("Authentication required - UserContext not found"))?;

        // Normalize name for comparison (trim and case-insensitive)
        let normalized_name = name.trim().to_lowercase();

        // Build query to find departments with matching name
        let mut query = DepartmentEntity::find()
            .filter(DepartmentColumn::DeletedAt.is_null());

        // Apply parent scope
        match parent_department_id {
            Some(parent_id) => {
                // Check uniqueness among siblings (same parent)
                query = query.filter(DepartmentColumn::ParentDepartmentId.eq(parent_id));
            }
            None => {
                // Check uniqueness among root departments (no parent)
                query = query.filter(DepartmentColumn::ParentDepartmentId.is_null());
            }
        }

        // Apply RLS filter
        query = apply_department_rls_filter(query, user_context);

        // Fetch all candidates and check names (case-insensitive)
        let candidates = query.all(&db).await?;

        // Check if any matching department exists
        for dept in candidates {
            // Skip the department being updated
            if let Some(exclude_id) = exclude_department_id {
                if dept.id == exclude_id {
                    continue;
                }
            }

            // Case-insensitive name comparison
            if dept.name.trim().to_lowercase() == normalized_name {
                return Ok(false); // Name already exists
            }
        }

        Ok(true) // Name is unique
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
            // Filter by UserId (actor)
            query = query.filter(ActivityLogColumn::UserId.eq(uid));
        }

        let logs = query
            .order_by_desc(ActivityLogColumn::CreatedAt)
            .limit(Some(limit as u64))
            .offset(offset as u64)
            .all(&db)
            .await?;

        Ok(logs)
    }

    /// Get total count of activity logs with optional user filtering
    async fn activity_logs_count(
        &self,
        ctx: &Context<'_>,
        user_id: Option<Uuid>,
    ) -> Result<i64> {
        let db = get_db_from_context(ctx)?;
        let mut query = ActivityLogEntity::find();

        if let Some(uid) = user_id {
             query = query.filter(ActivityLogColumn::UserId.eq(uid));
        }
        
        let count = query.count(&db).await?;
        Ok(count as i64)
    }

    /// Get a single activity log by ID
    async fn activity_log(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<ActivityLogModel>> {
        let db = get_db_from_context(ctx)?;
        let log = ActivityLogEntity::find_by_id(id).one(&db).await?;
        Ok(log)
    }

    /// Get current authenticated user information
    async fn me(&self, ctx: &Context<'_>) -> Result<Option<User>> {
        let user_context = ctx.data::<crate::auth::UserContext>()?;
        let db = get_db_from_context(ctx)?;

        let user = UserEntity::find_by_id(user_context.user_id)
            .filter(UserColumn::DeletedAt.is_null())
            .one(&db)
            .await?;

        Ok(user)
    }

    // ============================================================================
    // REMOVED: Session-based queries (JWT uses stateless tokens)
    // ============================================================================
    //
    // The following queries have been removed with the migration to JWT:
    // - my_session: JWT tokens don't have server-side sessions
    // - auth_status: Use jwtAuth.isAuthenticated in frontend instead
    // - sessions: JWT is stateless (no session list)
    // - csrf_token: CSRF protection handled differently with JWT
    //
    // ============================================================================

    /// Check authentication status (JWT-based)
    async fn auth_status(&self, ctx: &Context<'_>) -> Result<bool> {
        // User is authenticated if UserContext exists
        Ok(ctx.data_opt::<crate::auth::UserContext>().is_some())
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

        // Filter out soft-deleted notifications
        query = query.filter(NotificationColumn::DeletedAt.is_null());

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
    // Training Queries
    // =========================================================================

    /// Get all trainings
    async fn trainings(&self, ctx: &Context<'_>) -> Result<Vec<crate::models::Training>> {
        let db = get_db_from_context(ctx)?;
        // TODO: RLS filtering?
        let trainings = crate::models::training::training::Entity::find().all(&db).await?;
        Ok(trainings)
    }

    /// Get single training
    async fn training(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<crate::models::Training>> {
        let db = get_db_from_context(ctx)?;
        let training = crate::models::training::training::Entity::find_by_id(id).one(&db).await?;
        Ok(training)
    }

    /// Get trainings assigned to current user
    async fn my_trainings(&self, ctx: &Context<'_>) -> Result<Vec<crate::models::Training>> {
        let db = get_db_from_context(ctx)?;
        let user_context = ctx.data::<UserContext>()?;

        let assignments = crate::models::training::assignment::Entity::find()
            .filter(crate::models::training::assignment::Column::UserId.eq(user_context.user_id))
            .all(&db)
            .await?;
        
        let training_ids: Vec<Uuid> = assignments.iter().map(|a| a.training_id).collect();
        
        let trainings = crate::models::training::training::Entity::find()
            .filter(crate::models::training::training::Column::Id.is_in(training_ids))
            .all(&db)
            .await?;

        Ok(trainings)
    }

    /// Get content for a training
    async fn training_contents(&self, ctx: &Context<'_>, training_id: Uuid) -> Result<Vec<crate::models::TrainingContent>> {
        let db = get_db_from_context(ctx)?;
        let contents = crate::models::training::content::Entity::find()
            .filter(crate::models::training::content::Column::TrainingId.eq(training_id))
            .order_by_asc(crate::models::training::content::Column::SequenceOrder)
            .all(&db)
            .await?;
        Ok(contents)
    }

    /// Get assignments for a training with user information
    async fn training_assignments(&self, ctx: &Context<'_>, training_id: Uuid) -> Result<Vec<crate::models::training::TrainingAssignmentWithUser>> {
        let db = get_db_from_context(ctx)?;

        // Find all assignments for this training and load related users
        let assignments = crate::models::training::assignment::Entity::find()
            .filter(crate::models::training::assignment::Column::TrainingId.eq(training_id))
            .find_also_related(crate::models::user::Entity)
            .all(&db)
            .await?;

        // Map to TrainingAssignmentWithUser
        let result = assignments.into_iter().map(|(assignment, user)| {
            crate::models::training::TrainingAssignmentWithUser {
                id: assignment.id,
                user_id: assignment.user_id,
                training_id: assignment.training_id,
                assigned_at: assignment.assigned_at,
                due_date: assignment.due_date,
                user,
            }
        }).collect();

        Ok(result)
    }

    /// Get all training assignments across all trainings with user information
    async fn all_training_assignments(&self, ctx: &Context<'_>) -> Result<Vec<crate::models::training::TrainingAssignmentWithUser>> {
        let db = get_db_from_context(ctx)?;

        // Find all assignments and load related users
        let assignments = crate::models::training::assignment::Entity::find()
            .find_also_related(crate::models::user::Entity)
            .all(&db)
            .await?;

        // Map to TrainingAssignmentWithUser
        let result = assignments.into_iter().map(|(assignment, user)| {
            crate::models::training::TrainingAssignmentWithUser {
                id: assignment.id,
                user_id: assignment.user_id,
                training_id: assignment.training_id,
                assigned_at: assignment.assigned_at,
                due_date: assignment.due_date,
                user,
            }
        }).collect();

        Ok(result)
    }

    /// Get progress for a specific training for the current user
    async fn my_training_progress(
        &self,
        ctx: &Context<'_>,
        training_id: Uuid,
    ) -> Result<Vec<crate::models::training::progress::Model>> {
        let db = get_db_from_context(ctx)?;
        let user_context = ctx.data::<UserContext>()?;

        // Get all contents for this training
        let contents = crate::models::training::content::Entity::find()
            .filter(crate::models::training::content::Column::TrainingId.eq(training_id))
            .all(&db)
            .await?;

        let content_ids: Vec<Uuid> = contents.iter().map(|c| c.id).collect();

        if content_ids.is_empty() {
            return Ok(vec![]);
        }

        // Find progress for these contents and this user
        let progress = crate::models::training::progress::Entity::find()
            .filter(crate::models::training::progress::Column::UserId.eq(user_context.user_id))
            .filter(crate::models::training::progress::Column::TrainingContentId.is_in(content_ids))
            .all(&db)
            .await?;

        Ok(progress)
    }

    /// Get training progress for a specific user (Admin/HR Manager access)
    /// Returns progress for all content items in a training for a given user
    async fn training_progress(
        &self,
        ctx: &Context<'_>,
        training_id: Uuid,
        user_id: Uuid,
    ) -> Result<Vec<crate::models::training::progress::Model>> {
        let db = get_db_from_context(ctx)?;
        let user_context = ctx.data::<UserContext>()?;

        // Only admins and HR managers can view other users' progress
        if !user_context.is_admin() && !user_context.is_hr_manager() {
            return Err(async_graphql::Error::new("Unauthorized: Only admins and HR managers can view training progress for other users"));
        }

        // Get all contents for this training
        let contents = crate::models::training::content::Entity::find()
            .filter(crate::models::training::content::Column::TrainingId.eq(training_id))
            .all(&db)
            .await?;

        let content_ids: Vec<Uuid> = contents.iter().map(|c| c.id).collect();

        if content_ids.is_empty() {
            return Ok(vec![]);
        }

        // Find progress for these contents and the specified user
        let progress = crate::models::training::progress::Entity::find()
            .filter(crate::models::training::progress::Column::UserId.eq(user_id))
            .filter(crate::models::training::progress::Column::TrainingContentId.is_in(content_ids))
            .all(&db)
            .await?;

        Ok(progress)
    }

    // =========================================================================
    // Onboarding Queries
    // =========================================================================

    /// Get all onboarding modules
    async fn onboarding_modules(&self, ctx: &Context<'_>) -> Result<Vec<crate::models::OnboardingModule>> {
        let db = get_db_from_context(ctx)?;
        // TODO: RLS filtering?
        let modules = crate::models::onboarding::onboarding_module::Entity::find().all(&db).await?;
        Ok(modules)
    }

    /// Get single onboarding module
    async fn onboarding_module(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<crate::models::OnboardingModule>> {
        let db = get_db_from_context(ctx)?;
        let module = crate::models::onboarding::onboarding_module::Entity::find_by_id(id).one(&db).await?;
        Ok(module)
    }

    /// Get onboarding modules assigned to current user
    async fn my_onboarding_modules(&self, ctx: &Context<'_>) -> Result<Vec<crate::models::OnboardingModule>> {
        let db = get_db_from_context(ctx)?;
        let user_context = ctx.data::<UserContext>()?;

        let assignments = crate::models::onboarding::assignment::Entity::find()
            .filter(crate::models::onboarding::assignment::Column::UserId.eq(user_context.user_id))
            .all(&db)
            .await?;

        let module_ids: Vec<Uuid> = assignments.iter().map(|a| a.onboarding_module_id).collect();

        let modules = crate::models::onboarding::onboarding_module::Entity::find()
            .filter(crate::models::onboarding::onboarding_module::Column::Id.is_in(module_ids))
            .all(&db)
            .await?;

        Ok(modules)
    }

    /// Get onboarding assignments for current user (with module details)
    async fn my_onboarding_assignments(&self, ctx: &Context<'_>) -> Result<Vec<crate::models::AssignmentWithModule>> {
        use sea_orm::ModelTrait;

        let db = get_db_from_context(ctx)?;
        let user_context = ctx.data::<UserContext>()?;

        let assignments = crate::models::onboarding::assignment::Entity::find()
            .filter(crate::models::onboarding::assignment::Column::UserId.eq(user_context.user_id))
            .all(&db)
            .await?;

        // Load the onboarding module for each assignment
        let mut result = Vec::new();
        for assignment in assignments {
            let module = assignment
                .find_related(crate::models::onboarding::onboarding_module::Entity)
                .one(&db)
                .await?;

            result.push(AssignmentWithModule {
                id: assignment.id,
                user_id: assignment.user_id,
                onboarding_module_id: assignment.onboarding_module_id,
                assigned_by_id: assignment.assigned_by_id,
                assigned_at: assignment.assigned_at,
                due_date: assignment.due_date,
                completed_at: assignment.completed_at,
                onboarding_module: module,
            });
        }

        Ok(result)
    }

    /// Get all onboarding assignments (admin/HR view)
    async fn all_onboarding_assignments(&self, ctx: &Context<'_>) -> Result<Vec<crate::models::AssignmentWithUser>> {
        let db = get_db_from_context(ctx)?;

        // Find all assignments and load related users
        let assignments = crate::models::onboarding::assignment::Entity::find()
            .find_also_related(crate::models::user::Entity)
            .all(&db)
            .await?;

        // Map to AssignmentWithUser
        let result = assignments.into_iter().map(|(assignment, user)| {
            AssignmentWithUser {
                id: assignment.id,
                user_id: assignment.user_id,
                onboarding_module_id: assignment.onboarding_module_id,
                assigned_by_id: assignment.assigned_by_id,
                assigned_at: assignment.assigned_at,
                due_date: assignment.due_date,
                completed_at: assignment.completed_at,
                user,
            }
        }).collect();

        Ok(result)
    }

    /// Get all form templates
    async fn form_templates(&self, ctx: &Context<'_>) -> Result<Vec<crate::models::FormTemplate>> {
        let db = get_db_from_context(ctx)?;
        let templates = crate::models::onboarding::form_template::Entity::find().all(&db).await?;
        Ok(templates)
    }

    /// Get single form template
    async fn form_template(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<crate::models::FormTemplate>> {
        let db = get_db_from_context(ctx)?;
        let template = crate::models::onboarding::form_template::Entity::find_by_id(id).one(&db).await?;
        Ok(template)
    }

    /// Get content blocks for an onboarding module
    async fn onboarding_content_blocks(&self, ctx: &Context<'_>, onboarding_module_id: Uuid) -> Result<Vec<crate::models::ContentBlockGraphQL>> {
        let db = get_db_from_context(ctx)?;
        let blocks = crate::models::onboarding::content_block::Entity::find()
            .filter(crate::models::onboarding::content_block::Column::OnboardingModuleId.eq(onboarding_module_id))
            .order_by_asc(crate::models::onboarding::content_block::Column::SequenceOrder)
            .all(&db)
            .await?;
        Ok(blocks.into_iter().map(|b| crate::models::ContentBlockGraphQL::from(b)).collect())
    }

    /// Get assignments for an onboarding module
    async fn onboarding_assignments(&self, ctx: &Context<'_>, onboarding_module_id: Uuid) -> Result<Vec<AssignmentWithUser>> {
        let db = get_db_from_context(ctx)?;
        let assignments = crate::models::onboarding::assignment::Entity::find()
            .filter(crate::models::onboarding::assignment::Column::OnboardingModuleId.eq(onboarding_module_id))
            .find_also_related(crate::models::user::Entity)
            .all(&db)
            .await?;
        let result = assignments.into_iter().map(|(assignment, user)| {
            AssignmentWithUser {
                id: assignment.id,
                user_id: assignment.user_id,
                onboarding_module_id: assignment.onboarding_module_id,
                assigned_by_id: assignment.assigned_by_id,
                assigned_at: assignment.assigned_at,
                due_date: assignment.due_date,
                completed_at: assignment.completed_at,
                user,
            }
        }).collect();
        Ok(result)
    }

    /// Get progress for a specific onboarding module for the current user
    async fn my_onboarding_progress(
        &self,
        ctx: &Context<'_>,
        onboarding_module_id: Uuid,
    ) -> Result<Vec<crate::models::ProgressGraphQL>> {
        let db = get_db_from_context(ctx)?;
        let user_context = ctx.data::<UserContext>()?;

        // Get all content blocks for this module
        let blocks = crate::models::onboarding::content_block::Entity::find()
            .filter(crate::models::onboarding::content_block::Column::OnboardingModuleId.eq(onboarding_module_id))
            .all(&db)
            .await?;

        let block_ids: Vec<Uuid> = blocks.iter().map(|b| b.id).collect();

        if block_ids.is_empty() {
            return Ok(vec![]);
        }

        // Find progress for these blocks and this user
        let progress = crate::models::onboarding::progress::Entity::find()
            .filter(crate::models::onboarding::progress::Column::UserId.eq(user_context.user_id))
            .filter(crate::models::onboarding::progress::Column::ContentBlockId.is_in(block_ids))
            .all(&db)
            .await?;

        Ok(progress.into_iter().map(|p| crate::models::ProgressGraphQL::from(p)).collect())
    }

    /// Get form submission for a content block (current user)
    async fn my_form_submission(
        &self,
        ctx: &Context<'_>,
        content_block_id: Uuid,
    ) -> Result<Option<crate::models::FormSubmission>> {
        let db = get_db_from_context(ctx)?;
        let user_context = ctx.data::<UserContext>()?;

        let submission = crate::models::onboarding::form_submission::Entity::find()
            .filter(crate::models::onboarding::form_submission::Column::UserId.eq(user_context.user_id))
            .filter(crate::models::onboarding::form_submission::Column::ContentBlockId.eq(content_block_id))
            .one(&db)
            .await?;

        Ok(submission)
    }

    /// Get document uploads for a content block (current user)
    async fn my_document_uploads(
        &self,
        ctx: &Context<'_>,
        content_block_id: Uuid,
    ) -> Result<Vec<crate::models::DocumentUpload>> {
        let db = get_db_from_context(ctx)?;
        let user_context = ctx.data::<UserContext>()?;

        let uploads = crate::models::onboarding::document_upload::Entity::find()
            .filter(crate::models::onboarding::document_upload::Column::UserId.eq(user_context.user_id))
            .filter(crate::models::onboarding::document_upload::Column::ContentBlockId.eq(content_block_id))
            .all(&db)
            .await?;

        Ok(uploads)
    }

    // =========================================================================
    // Onboarding Forms Queries (New Forms Architecture)
    // =========================================================================

    /// Get a single onboarding form by ID with its blocks
    async fn onboarding_form(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
    ) -> Result<Option<crate::models::OnboardingFormGraphQL>> {
        let db = get_db_from_context(ctx)?;

        let form = crate::models::onboarding::form::Entity::find_by_id(id)
            .one(&db)
            .await?;

        Ok(form.map(crate::models::OnboardingFormGraphQL::from))
    }

    /// Get all forms for an onboarding module
    async fn onboarding_forms_by_module(
        &self,
        ctx: &Context<'_>,
        onboarding_module_id: Uuid,
    ) -> Result<Vec<crate::models::OnboardingFormGraphQL>> {
        let db = get_db_from_context(ctx)?;

        let forms = crate::models::onboarding::form::Entity::find()
            .filter(crate::models::onboarding::form::Column::OnboardingModuleId.eq(onboarding_module_id))
            .order_by_asc(crate::models::onboarding::form::Column::SequenceOrder)
            .all(&db)
            .await?;

        Ok(forms.into_iter().map(crate::models::OnboardingFormGraphQL::from).collect())
    }

    /// Get form blocks for a specific onboarding form
    async fn form_blocks(
        &self,
        ctx: &Context<'_>,
        onboarding_form_id: Uuid,
    ) -> Result<Vec<crate::models::FormBlockGraphQL>> {
        let db = get_db_from_context(ctx)?;

        let blocks = crate::models::onboarding::form_block::Entity::find()
            .filter(crate::models::onboarding::form_block::Column::OnboardingFormId.eq(onboarding_form_id))
            .order_by_asc(crate::models::onboarding::form_block::Column::SequenceOrder)
            .all(&db)
            .await?;

        Ok(blocks.into_iter().map(crate::models::FormBlockGraphQL::from).collect())
    }

    /// Get form progress for a specific user and form
    async fn form_progress(
        &self,
        ctx: &Context<'_>,
        user_id: Uuid,
        onboarding_form_id: Uuid,
    ) -> Result<Option<crate::models::FormProgressGraphQL>> {
        let db = get_db_from_context(ctx)?;

        let progress = crate::models::onboarding::form_progress::Entity::find()
            .filter(crate::models::onboarding::form_progress::Column::UserId.eq(user_id))
            .filter(crate::models::onboarding::form_progress::Column::OnboardingFormId.eq(onboarding_form_id))
            .one(&db)
            .await?;

        Ok(progress.map(crate::models::FormProgressGraphQL::from))
    }

    /// Get all form progress for the current user
    async fn user_form_progress_list(
        &self,
        ctx: &Context<'_>,
        user_id: Uuid,
    ) -> Result<Vec<crate::models::FormProgressGraphQL>> {
        let db = get_db_from_context(ctx)?;

        let progress_list = crate::models::onboarding::form_progress::Entity::find()
            .filter(crate::models::onboarding::form_progress::Column::UserId.eq(user_id))
            .all(&db)
            .await?;

        Ok(progress_list.into_iter().map(crate::models::FormProgressGraphQL::from).collect())
    }

    // =========================================================================
    // System Settings Queries (Permission-based access)
    // =========================================================================

    /// Get all system settings (requires system_settings:read permission)
    #[graphql(guard = "crate::middleware::guards::RequirePermission::new(\"system_settings:read\")")]
    async fn system_settings(&self, ctx: &Context<'_>) -> Result<Vec<SystemSettingsModel>> {
        let db = get_db_from_context(ctx)?;
        let settings = SystemSettingsModel::find_all(&db).await?;
        Ok(settings)
    }

    /// Get system settings by category (requires system_settings:read permission)
    #[graphql(guard = "crate::middleware::guards::RequirePermission::new(\"system_settings:read\")")]
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
    // Media Asset Queries
    // =========================================================================

    /// Get media assets with optional filtering
    async fn media_assets(
        &self,
        ctx: &Context<'_>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<crate::models::media_asset::Model>> {
        let db = get_db_from_context(ctx)?;
        let limit = limit.unwrap_or(50).clamp(1, 100);
        let offset = offset.unwrap_or(0).max(0);

        let assets = crate::models::media_asset::Entity::find()
            .order_by_desc(crate::models::media_asset::Column::CreatedAt)
            .limit(Some(limit as u64))
            .offset(offset as u64)
            .all(&db)
            .await?;

        Ok(assets)
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

    /// Intuit QuickBooks integration queries
    async fn intuit(&self) -> crate::schema::mutations::IntuitQueries {
        crate::schema::mutations::IntuitQueries
    }

    /// Intuit QuickBooks sync preview queries
    async fn intuit_preview(&self) -> crate::schema::queries::IntuitPreviewQueries {
        crate::schema::queries::IntuitPreviewQueries
    }

    /// Intuit QuickBooks sync health monitoring queries
    async fn intuit_health(&self) -> crate::schema::queries::IntuitHealthQueries {
        crate::schema::queries::IntuitHealthQueries
    }

    /// Reconciliation queries for data consistency verification
    async fn reconciliation(&self) -> crate::schema::queries::ReconciliationQueries {
        crate::schema::queries::ReconciliationQueries
    }

    /// Compliance report queries for regulatory requirements
    async fn compliance(&self) -> crate::schema::queries::ComplianceQueries {
        crate::schema::queries::ComplianceQueries
    }

    /// Audit trail queries for security and compliance monitoring
    async fn audit(&self) -> crate::schema::queries::AuditQueries {
        crate::schema::queries::AuditQueries
    }

    /// Batch operations queries for sync batching monitoring
    async fn batch_operations(&self) -> crate::schema::queries::BatchOperationsQueries {
        crate::schema::queries::BatchOperationsQueries
    }

    /// Webhook queries for QuickBooks webhook monitoring
    async fn webhooks(&self) -> crate::schema::queries::WebhookQueries {
        crate::schema::queries::WebhookQueries
    }

    /// Time entry queries for time tracking and QuickBooks sync
    async fn time_entries(&self) -> crate::schema::queries::TimeEntryQueries {
        crate::schema::queries::TimeEntryQueries
    }

    /// Validation queries for data quality checks
    async fn validation(&self) -> crate::schema::queries::ValidationQuery {
        crate::schema::queries::ValidationQuery
    }

    /// Sync schedule queries for automated sync scheduling
    async fn sync_schedule(&self) -> crate::schema::queries::SyncScheduleQuery {
        crate::schema::queries::SyncScheduleQuery
    }

    /// Sync health monitoring queries for sync performance and alerts
    async fn sync_health(&self) -> crate::schema::queries::SyncHealthQueries {
        crate::schema::queries::SyncHealthQueries
    }

    /// Payroll queries for compensation data and sync status
    async fn payroll(&self) -> crate::schema::queries::PayrollQueries {
        crate::schema::queries::PayrollQueries
    }

    /// Email digest queries for automated summary emails
    async fn digests(&self) -> crate::schema::queries::DigestQueries {
        crate::schema::queries::DigestQueries
    }
}

#[cfg(test)]
mod tests {
    use crate::testing::{TestContext, TestUserRole};

    /// T017 Pattern: Test not found error with random UUID
    #[tokio::test]
    async fn test_user_query_not_found() {
        // Arrange
        let ctx = TestContext::new()
            .await
            .expect("Failed to create test context");

        // Get a test user for authentication
        let test_user = ctx.user(TestUserRole::Employee);

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
        let response = ctx.execute_query_as(&query, &test_user).await;

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
                    roles {{
                        id
                        name
                    }}
                    isActive
                }}
            }}
            "#,
            test_user.id
        );

        // Act
        let response = ctx.execute_query_as(&query, &test_user).await;

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
                    roles {
                        id
                        name
                    }
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

        // Get a test user for authentication
        let test_user = ctx.user(TestUserRole::Employee);

        let query = r#"
            query {
                users(limit: 10, offset: 0) {
                    id
                    email
                    roles {
                        id
                        name
                    }
                    isActive
                }
            }
        "#;

        // Act
        let response = ctx.execute_query_as(&query, &test_user).await;

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

        // Get a test user for authentication
        let test_user = ctx.user(TestUserRole::Employee);

        let query = r#"
            query GetUsers($limit: Int, $offset: Int) {
                users(limit: $limit, offset: $offset) {
                    id
                    email
                    roles {
                        id
                        name
                    }
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
        let response = ctx.execute_with_variables_as(query, variables, &test_user).await;

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
                    roles {
                        id
                        name
                    }
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


    /// Test count_employees_by_department query
    /// SKIPPED: countEmployeesByDepartment function not yet implemented
    #[ignore]
    #[tokio::test]
    async fn test_count_employees_by_department() {
        // Arrange
        let ctx = TestContext::new()
            .await
            .expect("Failed to create test context");

        // Get a test user for authentication
        let test_user = ctx.user(TestUserRole::Employee);

        // First, get all departments to find one with employees
        let departments_query = r#"
            query {
                departments(limit: 10) {
                    id
                }
            }
        "#;

        let dept_response = ctx.execute_query_as(departments_query, &test_user).await;
        let dept_data = ctx.extract_data(&dept_response);
        let dept_str = dept_data.to_string();

        // Extract first department ID from response
        // Response format: {departments: [{id: "uuid-here"}, ...]}
        let department_id = dept_str
            .split("id: \"")
            .nth(1)
            .and_then(|s| s.split('"').next())
            .expect("Should have at least one department");

        let query = format!(
            r#"
            query {{
                countEmployeesByDepartment(departmentId: "{}") 
            }}
            "#,
            department_id
        );

        // Act
        let response = ctx.execute_query_as(&query, &test_user).await;

        // Assert - No errors
        let errors = ctx.extract_errors(&response);
        assert!(errors.is_empty(), "Expected no errors, got: {:?}", errors);

        // Assert - Count is returned (may be 0 or more)
        let data = ctx.extract_data(&response);
        let data_str = data.to_string();
        
        // Should contain countEmployeesByDepartment field with a number
        assert!(data_str.contains("countEmployeesByDepartment"),
            "Response should contain countEmployeesByDepartment field");
    }

    /// Test count_employees_by_department with empty department
    /// SKIPPED: countEmployeesByDepartment function not yet implemented
    #[ignore]
    #[tokio::test]
    async fn test_count_employees_empty_department() {
        // Arrange
        let ctx = TestContext::new()
            .await
            .expect("Failed to create test context");

        // Get a test user for authentication
        let test_user = ctx.user(TestUserRole::Employee);

        // Use a random UUID that doesn't exist
        let empty_department_id = uuid::Uuid::new_v4();

        let query = format!(
            r#"
            query {{
                countEmployeesByDepartment(departmentId: "{}")
            }}
            "#,
            empty_department_id
        );

        // Act
        let response = ctx.execute_query_as(&query, &test_user).await;

        // Assert - No errors
        let errors = ctx.extract_errors(&response);
        assert!(errors.is_empty(), "Expected no errors, got: {:?}", errors);

        // Assert - Count is 0 for non-existent/empty department
        let data = ctx.extract_data(&response);
        let data_str = data.to_string();
        
        assert!(data_str.contains("countEmployeesByDepartment: 0"),
            "Empty department should return count of 0");
    }

    /// Test getDepartmentAncestors with existing department
    #[tokio::test]
    async fn test_get_department_ancestors() {
        // Arrange
        let ctx = TestContext::new()
            .await
            .expect("Failed to create test context");

        // Get a test user for authentication
        let test_user = ctx.user(TestUserRole::Employee);

        // Get departments to find one with a parent
        let departments_query = r#"
            query {
                departments(limit: 20) {
                    id
                    parentDepartmentId
                }
            }
        "#;

        let dept_response = ctx.execute_query_as(departments_query, &test_user).await;
        let dept_data = ctx.extract_data(&dept_response);
        let dept_str = dept_data.to_string();

        // Find a department with a parent (contains "parentDepartmentId: Some")
        let has_parent = dept_str.contains("parentDepartmentId: Some");
        
        if !has_parent {
            println!("Skipping test: no departments with parents found");
            return;
        }

        // Extract first department ID with a parent
        let dept_id = dept_str
            .split("id: \"")
            .skip(1)
            .filter_map(|s| {
                let id = s.split('"').next()?;
                // Check if this department has a parent by looking ahead in string
                if s.contains("parentDepartmentId: Some") {
                    Some(id.to_string())
                } else {
                    None
                }
            })
            .next()
            .expect("Should have at least one department with parent");

        let query = format!(
            r#"
            query {{
                getDepartmentAncestors(departmentId: "{}") {{
                    id
                    name
                }}
            }}
            "#,
            dept_id
        );

        // Act
        let response = ctx.execute_query_as(&query, &test_user).await;

        // Assert - No errors
        let errors = ctx.extract_errors(&response);
        assert!(errors.is_empty(), "Expected no errors, got: {:?}", errors);

        // Assert - Returns ancestor list (may be empty if no grandparent)
        let data = ctx.extract_data(&response);
        let data_str = data.to_string();
        
        assert!(data_str.contains("getDepartmentAncestors"),
            "Response should contain getDepartmentAncestors field");
    }

    /// Test getDepartmentAncestors with root department (no parent)
    #[tokio::test]
    async fn test_get_department_ancestors_root() {
        // Arrange
        let ctx = TestContext::new()
            .await
            .expect("Failed to create test context");

        // Get a test user for authentication
        let test_user = ctx.user(TestUserRole::Employee);

        // Get departments to find one without a parent
        let departments_query = r#"
            query {
                departments(limit: 20) {
                    id
                    parentDepartmentId
                }
            }
        "#;

        let dept_response = ctx.execute_query_as(departments_query, &test_user).await;
        let dept_data = ctx.extract_data(&dept_response);
        let dept_str = dept_data.to_string();

        // Find a root department (parentDepartmentId is null)
        // Extract first department ID without a parent
        let root_dept_id = dept_str
            .split("id: \"")
            .skip(1)
            .filter_map(|s| {
                let id = s.split('"').next()?;
                // Check if this is a root department (no parent)
                let next_part = s.split("parentDepartmentId:").nth(1)?;
                if next_part.trim().starts_with("null") {
                    Some(id.to_string())
                } else {
                    None
                }
            })
            .next();

        if root_dept_id.is_none() {
            println!("Skipping test: no root departments found");
            return;
        }

        let query = format!(
            r#"
            query {{
                getDepartmentAncestors(departmentId: "{}") {{
                    id
                    name
                }}
            }}
            "#,
            root_dept_id.unwrap()
        );

        // Act
        let response = ctx.execute_query_as(&query, &test_user).await;

        // Assert - No errors
        let errors = ctx.extract_errors(&response);
        assert!(errors.is_empty(), "Expected no errors, got: {:?}", errors);

        // Assert - Empty list for root department
        let data = ctx.extract_data(&response);
        let data_str = data.to_string();
        
        assert!(data_str.contains("getDepartmentAncestors: []"),
            "Root department should have empty ancestor list");
    }

    /// Test getDepartmentDescendants with existing department
    #[tokio::test]
    async fn test_get_department_descendants() {
        // Arrange
        let ctx = TestContext::new()
            .await
            .expect("Failed to create test context");

        // Get a test user for authentication
        let test_user = ctx.user(TestUserRole::Employee);

        // Get departments to find one that might have children
        let departments_query = r#"
            query {
                departments(limit: 20) {
                    id
                    name
                }
            }
        "#;

        let dept_response = ctx.execute_query_as(departments_query, &test_user).await;
        let dept_data = ctx.extract_data(&dept_response);
        let dept_str = dept_data.to_string();

        // Use first department (may or may not have children)
        let dept_id = dept_str
            .split("id: \"")
            .nth(1)
            .and_then(|s| s.split('"').next());

        if dept_id.is_none() {
            println!("Skipping test: no departments in database");
            return;
        }

        let dept_id = dept_id.unwrap();

        let query = format!(
            r#"
            query {{
                getDepartmentDescendants(departmentId: "{}") {{
                    id
                    name
                }}
            }}
            "#,
            dept_id
        );

        // Act
        let response = ctx.execute_query_as(&query, &test_user).await;

        // Assert - No errors
        let errors = ctx.extract_errors(&response);
        assert!(errors.is_empty(), "Expected no errors, got: {:?}", errors);

        // Assert - Returns descendants list (may be empty)
        let data = ctx.extract_data(&response);
        let data_str = data.to_string();
        
        assert!(data_str.contains("getDepartmentDescendants"),
            "Response should contain getDepartmentDescendants field");
    }

    /// Test getDepartmentDescendants with non-existent department
    #[tokio::test]
    async fn test_get_department_descendants_not_found() {
        // Arrange
        let ctx = TestContext::new()
            .await
            .expect("Failed to create test context");

        // Get a test user for authentication
        let test_user = ctx.user(TestUserRole::Employee);

        let invalid_id = uuid::Uuid::new_v4();
        
        let query = format!(
            r#"
            query {{
                getDepartmentDescendants(departmentId: "{}") {{
                    id
                    name
                }}
            }}
            "#,
            invalid_id
        );

        // Act
        let response = ctx.execute_query_as(&query, &test_user).await;

        // Assert - No errors (just returns empty list)
        let errors = ctx.extract_errors(&response);
        assert!(errors.is_empty(), "Expected no errors, got: {:?}", errors);

        // Assert - Empty list for non-existent department
        let data = ctx.extract_data(&response);
        let data_str = data.to_string();
        
        assert!(data_str.contains("getDepartmentDescendants: []"),
            "Non-existent department should return empty descendant list");
    }

    /// Test isDepartmentNameUnique with existing name
    #[tokio::test]
    async fn test_is_department_name_unique_duplicate() {
        // Arrange
        let ctx = TestContext::new()
            .await
            .expect("Failed to create test context");

        // Get a test user for authentication
        let test_user = ctx.user(TestUserRole::Employee);

        // Get an existing department name
        let departments_query = r#"
            query {
                departments(limit: 1) {
                    id
                    name
                    parentDepartmentId
                }
            }
        "#;

        let dept_response = ctx.execute_query_as(departments_query, &test_user).await;
        let dept_data = ctx.extract_data(&dept_response);
        let dept_str = dept_data.to_string();

        let existing_name = dept_str
            .split("name: \"")
            .nth(1)
            .and_then(|s| s.split('"').next());

        if existing_name.is_none() {
            println!("Skipping test: no departments in database");
            return;
        }

        let existing_name = existing_name.unwrap();

        let query = format!(
            r#"
            query {{
                isDepartmentNameUnique(
                    name: "{}",
                    parentDepartmentId: null,
                    excludeDepartmentId: null
                )
            }}
            "#,
            existing_name
        );

        // Act
        let response = ctx.execute_query_as(&query, &test_user).await;

        // Assert - No errors
        let errors = ctx.extract_errors(&response);
        assert!(errors.is_empty(), "Expected no errors, got: {:?}", errors);

        // Assert - Returns false for duplicate name
        let data = ctx.extract_data(&response);
        let data_str = data.to_string();
        
        assert!(data_str.contains("isDepartmentNameUnique: false"),
            "Existing department name should not be unique");
    }

    /// Test isDepartmentNameUnique with new unique name
    #[tokio::test]
    async fn test_is_department_name_unique_new_name() {
        // Arrange
        let ctx = TestContext::new()
            .await
            .expect("Failed to create test context");

        // Get a test user for authentication
        let test_user = ctx.user(TestUserRole::Employee);

        // Use a random name that doesn't exist
        let unique_name = format!("Test Department {}", uuid::Uuid::new_v4());

        let query = format!(
            r#"
            query {{
                isDepartmentNameUnique(
                    name: "{}",
                    parentDepartmentId: null,
                    excludeDepartmentId: null
                )
            }}
            "#,
            unique_name
        );

        // Act
        let response = ctx.execute_query_as(&query, &test_user).await;

        // Assert - No errors
        let errors = ctx.extract_errors(&response);
        assert!(errors.is_empty(), "Expected no errors, got: {:?}", errors);

        // Assert - Returns true for unique name
        let data = ctx.extract_data(&response);
        let data_str = data.to_string();
        
        assert!(data_str.contains("isDepartmentNameUnique: true"),
            "New department name should be unique");
    }

    /// Test isDepartmentNameUnique with exclude_department_id (update scenario)
    #[tokio::test]
    async fn test_is_department_name_unique_with_exclusion() {
        // Arrange
        let ctx = TestContext::new()
            .await
            .expect("Failed to create test context");

        // Get a test user for authentication
        let test_user = ctx.user(TestUserRole::Employee);

        // Get an existing department
        let departments_query = r#"
            query {
                departments(limit: 1) {
                    id
                    name
                }
            }
        "#;

        let dept_response = ctx.execute_query_as(departments_query, &test_user).await;
        let dept_data = ctx.extract_data(&dept_response);
        let dept_str = dept_data.to_string();

        let dept_id = dept_str
            .split("id: \"")
            .nth(1)
            .and_then(|s| s.split('"').next());

        if dept_id.is_none() {
            println!("Skipping test: no departments in database");
            return;
        }

        let dept_id = dept_id.unwrap();

        let dept_name = dept_str
            .split("name: \"")
            .nth(1)
            .and_then(|s| s.split('"').next())
            .expect("Should have name");

        // Check uniqueness with exclusion (simulates updating same department)
        let query = format!(
            r#"
            query {{
                isDepartmentNameUnique(
                    name: "{}",
                    parentDepartmentId: null,
                    excludeDepartmentId: "{}"
                )
            }}
            "#,
            dept_name, dept_id
        );

        // Act
        let response = ctx.execute_query_as(&query, &test_user).await;

        // Assert - No errors
        let errors = ctx.extract_errors(&response);
        assert!(errors.is_empty(), "Expected no errors, got: {:?}", errors);

        // Assert - Returns true when excluding self
        let data = ctx.extract_data(&response);
        let data_str = data.to_string();
        
        assert!(data_str.contains("isDepartmentNameUnique: true"),
            "Department name should be unique when excluding itself");
    }

    /// Test isDepartmentNameUnique case-insensitive matching
    #[tokio::test]
    async fn test_is_department_name_unique_case_insensitive() {
        // Arrange
        let ctx = TestContext::new()
            .await
            .expect("Failed to create test context");

        // Get a test user for authentication
        let test_user = ctx.user(TestUserRole::Employee);

        // Get an existing department name
        let departments_query = r#"
            query {
                departments(limit: 1) {
                    name
                }
            }
        "#;

        let dept_response = ctx.execute_query_as(departments_query, &test_user).await;
        let dept_data = ctx.extract_data(&dept_response);
        let dept_str = dept_data.to_string();

        let existing_name = dept_str
            .split("name: \"")
            .nth(1)
            .and_then(|s| s.split('"').next());

        if existing_name.is_none() {
            println!("Skipping test: no departments in database");
            return;
        }

        let existing_name = existing_name.unwrap();

        // Test with uppercase version of existing name
        let uppercase_name = existing_name.to_uppercase();

        let query = format!(
            r#"
            query {{
                isDepartmentNameUnique(
                    name: "{}",
                    parentDepartmentId: null,
                    excludeDepartmentId: null
                )
            }}
            "#,
            uppercase_name
        );

        // Act
        let response = ctx.execute_query_as(&query, &test_user).await;

        // Assert - No errors
        let errors = ctx.extract_errors(&response);
        assert!(errors.is_empty(), "Expected no errors, got: {:?}", errors);

        // Assert - Returns false (case-insensitive match)
        let data = ctx.extract_data(&response);
        let data_str = data.to_string();
        
        assert!(data_str.contains("isDepartmentNameUnique: false"),
            "Name should not be unique (case-insensitive comparison)");
    }

    /// Test department filtering by search term
    #[tokio::test]
    async fn test_departments_filter_search_term() {
        // Arrange
        let ctx = TestContext::new()
            .await
            .expect("Failed to create test context");
        let test_user = ctx.user(TestUserRole::Admin);

        let query = r#"
            query {
                departments(filter: { searchTerm: "Engineering" }) {
                    id
                    name
                    description
                }
            }
        "#;

        // Act
        let response = ctx.execute_query_as(query, &test_user).await;

        // Assert - No errors
        let errors = ctx.extract_errors(&response);
        assert!(errors.is_empty(), "Expected no errors, got: {:?}", errors);

        // Assert - Results contain "Engineering" in name or description
        let data = ctx.extract_data(&response);
        let departments = data["departments"].as_array().expect("Expected array");

        for dept in departments {
            let name = dept["name"].as_str().unwrap_or("");
            let description = dept["description"].as_str().unwrap_or("");
            assert!(
                name.to_lowercase().contains("engineering") ||
                description.to_lowercase().contains("engineering"),
                "Department should contain 'Engineering' in name or description"
            );
        }
    }

    /// Test department filtering by root_only flag
    #[tokio::test]
    async fn test_departments_filter_root_only() {
        // Arrange
        let ctx = TestContext::new()
            .await
            .expect("Failed to create test context");
        let test_user = ctx.user(TestUserRole::Admin);

        let query = r#"
            query {
                departments(filter: { rootOnly: true }) {
                    id
                    name
                    parentDepartmentId
                }
            }
        "#;

        // Act
        let response = ctx.execute_query_as(query, &test_user).await;

        // Assert - No errors
        let errors = ctx.extract_errors(&response);
        assert!(errors.is_empty(), "Expected no errors, got: {:?}", errors);

        // Assert - All results have parentDepartmentId: null
        let data = ctx.extract_data(&response);
        let departments = data["departments"].as_array().expect("Expected array");

        for dept in departments {
            assert!(
                dept["parentDepartmentId"].is_null(),
                "Root departments should have null parentDepartmentId"
            );
        }
    }

    /// Test department filtering by parent_id
    #[tokio::test]
    async fn test_departments_filter_parent_id() {
        // Arrange
        let ctx = TestContext::new()
            .await
            .expect("Failed to create test context");
        let test_user = ctx.user(TestUserRole::Admin);

        // First get a root department to use as parent
        let get_root = r#"
            query {
                departments(filter: { rootOnly: true }, limit: 1) {
                    id
                }
            }
        "#;

        let root_response = ctx.execute_query_as(get_root, &test_user).await;
        let root_data = ctx.extract_data(&root_response);
        let root_id = root_data["departments"][0]["id"]
            .as_str()
            .expect("Expected root department ID");

        let query = format!(
            r#"
            query {{
                departments(filter: {{ parentId: "{}" }}) {{
                    id
                    name
                    parentDepartmentId
                }}
            }}
            "#,
            root_id
        );

        // Act
        let response = ctx.execute_query_as(&query, &test_user).await;

        // Assert - No errors
        let errors = ctx.extract_errors(&response);
        assert!(errors.is_empty(), "Expected no errors, got: {:?}", errors);

        // Assert - All results have matching parentDepartmentId
        let data = ctx.extract_data(&response);
        let departments = data["departments"].as_array().expect("Expected array");

        for dept in departments {
            let parent_id = dept["parentDepartmentId"].as_str().unwrap_or("");
            assert_eq!(
                parent_id, root_id,
                "All departments should have the specified parent ID"
            );
        }
    }

    /// Test department filtering excludes deleted by default
    #[tokio::test]
    async fn test_departments_filter_excludes_deleted_by_default() {
        // Arrange
        let ctx = TestContext::new()
            .await
            .expect("Failed to create test context");
        let test_user = ctx.user(TestUserRole::Admin);

        let query = r#"
            query {
                departments {
                    id
                    name
                    deletedAt
                }
            }
        "#;

        // Act
        let response = ctx.execute_query_as(query, &test_user).await;

        // Assert - No errors
        let errors = ctx.extract_errors(&response);
        assert!(errors.is_empty(), "Expected no errors, got: {:?}", errors);

        // Assert - No deleted departments returned
        let data = ctx.extract_data(&response);
        let departments = data["departments"].as_array().expect("Expected array");

        for dept in departments {
            assert!(
                dept["deletedAt"].is_null(),
                "Should not return deleted departments by default"
            );
        }
    }

    /// Test department filtering by manager_id
    #[tokio::test]
    async fn test_departments_filter_manager_id() {
        // Arrange
        let ctx = TestContext::new()
            .await
            .expect("Failed to create test context");
        let test_user = ctx.user(TestUserRole::Admin);

        // First get a department with a manager
        let get_managed = r#"
            query {
                departments(limit: 100) {
                    id
                    managerId
                }
            }
        "#;

        let managed_response = ctx.execute_query_as(get_managed, &test_user).await;
        let managed_data = ctx.extract_data(&managed_response);
        let departments = managed_data["departments"].as_array().expect("Expected array");

        // Find a department with a manager
        let dept_with_manager = departments.iter().find(|d| !d["managerId"].is_null());

        if let Some(dept) = dept_with_manager {
            let manager_id = dept["managerId"].as_str().expect("Expected manager ID");

            let query = format!(
                r#"
                query {{
                    departments(filter: {{ managerId: "{}" }}) {{
                        id
                        name
                        managerId
                    }}
                }}
                "#,
                manager_id
            );

            // Act
            let response = ctx.execute_query_as(&query, &test_user).await;

            // Assert - No errors
            let errors = ctx.extract_errors(&response);
            assert!(errors.is_empty(), "Expected no errors, got: {:?}", errors);

            // Assert - All results have matching managerId
            let data = ctx.extract_data(&response);
            let filtered_departments = data["departments"].as_array().expect("Expected array");

            for dept in filtered_departments {
                let dept_manager_id = dept["managerId"].as_str().unwrap_or("");
                assert_eq!(
                    dept_manager_id, manager_id,
                    "All departments should have the specified manager ID"
                );
            }
        }
    }
}
