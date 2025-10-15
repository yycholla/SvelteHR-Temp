use async_graphql::{Context, Error, ErrorExtensions, Object, Result};
use sea_orm::{DatabaseConnection, EntityTrait, QueryFilter, QueryOrder, PaginatorTrait, ColumnTrait};
use uuid::Uuid;

use crate::{
    database::get_db_from_context,
    error::AppError,
    models::{
        // Core models (SeaORM entities)
        department::Entity as DepartmentEntity,
        user::Entity as UserEntity,
        task::Entity as TaskEntity,
        leave_request::Entity as LeaveRequestEntity,
        performance_review::Entity as PerformanceReviewEntity,
        system::activity_log::Entity as ActivityLogEntity,
        // Legacy models for compatibility
        AuditAction, Department, DependencyType, Event, EventAttendee, EventAttendeeFilter,
        EventCondition, EventsOrderBy, EventStatus,
        FeedbackType, GoalCompletionStatus, LeaveBalance, LeaveRequest, LeaveRequestStatus,
        LeaveType, LinkedResource, Notification, NotificationCategory, NotificationResourceType,
        NotificationType, PerformanceReview, PerformanceReviewStatus, Permission,
        ResourceType, ReviewCycle, ReviewCycleStatus, ReviewFeedback, ReviewGoal, ReviewType,
        Role, Task, TaskAssignee, TaskAuditEntry, TaskDependency, TaskFilter, TaskPriority, TaskStatus, User,
        UserCondition, UsersConnection, UserRoleAssignment, UserRoleAssignmentsConnection, UserStatus,
        // OrderBy enums
        department::DepartmentsOrderBy, user::UsersOrderBy, ActivityLogsOrderBy,
        // Employee domain
        EmployeeSkill, EmployeeCertification, EmployeeVehicle, EmergencyContact, EmployeeGoal,
        ProficiencyLevel, GoalStatus,
        // Documents domain
        Document, DocumentVersion, DocumentCategory, DocumentAssignment, DocumentAccessLog,
        EncryptedFileStorage, DocumentAccessLevel, DocumentAccessType,
        // Time domain
        TimeOffPolicy, AttendanceRecord, AttendanceStatus,
        // Analytics domain
        DashboardSummary, DepartmentMetric, GoalStatistic, ReportAnalytic,
        // System domain
        ActivityLog, ActivityLogsConnection, BulkRollbackBatch, BulkRollbackItem, CompensationBand, EncryptionKey,
        HRReport, PayrollRecord, RollbackRequest, RollbackRequestCondition, RollbackRequestsConnection, RollbackRequestsOrderBy, RollbackStatus,
        // Activity log condition
        system::activity_log::ActivityLogCondition,
        // Events domain
        EventComment, EventHistory, EventWaitlist,
        // Tasks domain
        TaskType,
        // Reviews domain
        ReviewTemplate,
    },
};

// PostGraphile-style pagination types
#[derive(Debug, Clone)]
pub struct PageInfo {
    pub has_next_page: bool,
    pub has_previous_page: bool,
    pub start_cursor: Option<String>,
    pub end_cursor: Option<String>,
}

#[Object]
impl PageInfo {
    async fn has_next_page(&self) -> bool {
        self.has_next_page
    }

    async fn has_previous_page(&self) -> bool {
        self.has_previous_page
    }

    async fn start_cursor(&self) -> Option<String> {
        self.start_cursor.clone()
    }

    async fn end_cursor(&self) -> Option<String> {
        self.end_cursor.clone()
    }
}

#[derive(Debug, Clone)]
pub struct EventsConnection {
    pub nodes: Vec<Event>,
    pub total_count: i64,
    pub page_info: PageInfo,
}

#[Object]
impl EventsConnection {
    async fn nodes(&self) -> &Vec<Event> {
        &self.nodes
    }

    async fn total_count(&self) -> i64 {
        self.total_count
    }

    async fn page_info(&self) -> &PageInfo {
        &self.page_info
    }
}

pub struct QueryRoot;

#[Object]
impl QueryRoot {
    /// Get a single event attendee by ID
    async fn event_attendee(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
    ) -> Result<Option<EventAttendee>> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let attendee = sqlx::query_as::<_, EventAttendee>(
            r#"
            SELECT id, event_id, employee_id, response_status, is_required,
                   created_at, reminder_time, scope, is_organizer
            FROM hr_public.event_attendees
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(pool)
        .await?;

        Ok(attendee)
    }

    /// Get all event attendees with optional filtering and pagination
    async fn event_attendees(
        &self,
        ctx: &Context<'_>,
        filter: Option<EventAttendeeFilter>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<EventAttendee>> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let limit = limit.unwrap_or(100).min(1000); // Max 1000 records
        let offset = offset.unwrap_or(0);

        // Build query with QueryBuilder for type-safe parameter binding
        let mut query_builder = sqlx::QueryBuilder::new(
            r#"
            SELECT id, event_id, employee_id, response_status, is_required,
                   created_at, reminder_time, scope, is_organizer
            FROM hr_public.event_attendees
            "#,
        );

        // Apply filter conditions if provided
        if let Some(ref filter) = filter {
            if filter.has_filters() {
                query_builder.push(" WHERE ");
                filter.apply_to_query(&mut query_builder);
            }
        }

        // Add ordering and pagination
        query_builder.push(" ORDER BY created_at DESC LIMIT ");
        query_builder.push_bind(limit);
        query_builder.push(" OFFSET ");
        query_builder.push_bind(offset);

        // Execute query with proper parameter binding
        let attendees = query_builder
            .build_query_as::<EventAttendee>()
            .fetch_all(pool)
            .await?;

        Ok(attendees)
    }

    /// Get event attendees by event ID
    async fn event_attendees_by_event(
        &self,
        ctx: &Context<'_>,
        event_id: Uuid,
        limit: Option<i64>,
    ) -> Result<Vec<EventAttendee>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);

        let attendees = sqlx::query_as::<_, EventAttendee>(
            r#"
            SELECT id, event_id, employee_id, response_status, is_required,
                   created_at, reminder_time, scope, is_organizer
            FROM hr_public.event_attendees
            WHERE event_id = $1
            ORDER BY created_at DESC
            LIMIT $2
            "#,
        )
        .bind(event_id)
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Ok(attendees)
    }

    /// Get event attendees by employee ID
    async fn event_attendees_by_employee(
        &self,
        ctx: &Context<'_>,
        employee_id: Uuid,
        limit: Option<i64>,
    ) -> Result<Vec<EventAttendee>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);

        let attendees = sqlx::query_as::<_, EventAttendee>(
            r#"
            SELECT id, event_id, employee_id, response_status, is_required,
                   created_at, reminder_time, scope, is_organizer
            FROM hr_public.event_attendees
            WHERE employee_id = $1
            ORDER BY created_at DESC
            LIMIT $2
            "#,
        )
        .bind(employee_id)
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Ok(attendees)
    }

    /// Count event attendees with optional filtering
    async fn event_attendees_count(
        &self,
        ctx: &Context<'_>,
        filter: Option<EventAttendeeFilter>,
    ) -> Result<i64> {
        let pool = ctx.data::<DatabaseConnection>()?;

        // Build count query with QueryBuilder
        let mut query_builder = sqlx::QueryBuilder::new(
            "SELECT COUNT(*) FROM hr_public.event_attendees"
        );

        // Apply filter conditions if provided
        if let Some(ref filter) = filter {
            if filter.has_filters() {
                query_builder.push(" WHERE ");
                filter.apply_to_query(&mut query_builder);
            }
        }

        // Execute count query with proper parameter binding
        let count: (i64,) = query_builder
            .build_query_as()
            .fetch_one(pool)
            .await?;

        Ok(count.0)
    }

    // ============================================================
    // User Queries
    // ============================================================

    /// Get a single user by ID
    /// Requires: Any authenticated user (employee-level access)
    #[graphql(guard = "RequireMinRoleLevel::employee()")]
    async fn user_by_id(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<User>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, User>(
                r#"
                SELECT id, email, first_name, last_name, display_name, full_name, role,
                       phone_number, alternate_phone, job_title, status,
                       department_id, manager_id, hire_date, is_active,
                       created_at, updated_at
                FROM hr_public.users
                WHERE id = $1
                "#,
            )
            .bind(id)
            .fetch_optional(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch user: {}", e);
                Error::new("Failed to fetch user")
            })
        })).await
    }

    /// Get all users with optional filtering and pagination
    /// Requires: Any authenticated user (employee-level access)
    #[graphql(guard = "RequireMinRoleLevel::employee()")]
    async fn users(
        &self,
        ctx: &Context<'_>,
        limit: Option<i64>,
        offset: Option<i64>,
        status: Option<UserStatus>,
    ) -> Result<Vec<User>> {
        let db = get_db_from_context(ctx)?;

        let limit = limit.unwrap_or(100).min(1000);
        let offset = offset.unwrap_or(0);

        let mut query = UserEntity::find();

        // Apply active filter if provided (status parameter maps to is_active)
        if let Some(user_status) = status {
            match user_status {
                UserStatus::Active => {
                    query = query.filter(user::Column::IsActive.eq(true));
                },
                UserStatus::Inactive => {
                    query = query.filter(user::Column::IsActive.eq(false));
                },
                UserStatus::Terminated => {
                    query = query.filter(user::Column::IsActive.eq(false));
                },
            }
        }

        // Add ordering and pagination
        let users = query
            .order_by_desc(user::Column::LastName)
            .order_by_desc(user::Column::FirstName)
            .limit(Some(limit as u64))
            .offset(offset as u64)
            .all(db)
            .await?;

        // Convert SeaORM models to legacy User struct for compatibility
        let users = users.into_iter().map(|model| User {
            id: model.id,
            email: model.email,
            first_name: model.first_name,
            last_name: model.last_name,
            display_name: model.display_name,
            full_name: model.full_name,
            role: model.role,
            phone_number: model.phone_number,
            alternate_phone: model.alternate_phone,
            job_title: model.job_title,
            status: model.status,
            department_id: model.department_id,
            manager_id: model.manager_id,
            hire_date: model.hire_date,
            is_active: model.is_active,
            created_at: model.created_at,
            updated_at: model.updated_at,
        }).collect();

        Ok(users)
    }

    /// Get all users with PostGraphile-style Relay connection (for frontend compatibility)
    #[graphql(guard = "RequireMinRoleLevel::employee()")]
    async fn all_users(
        &self,
        ctx: &Context<'_>,
        first: Option<i64>,
        offset: Option<i64>,
        #[graphql(name = "orderBy")] order_by: Option<UsersOrderBy>,
        condition: Option<UserCondition>,
    ) -> Result<UsersConnection> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;

        let first = first.unwrap_or(50).min(1000);
        let offset = offset.unwrap_or(0);

        session.execute(pool, |tx| Box::pin(async move {
            let mut query_builder = sqlx::QueryBuilder::new(
                r#"
                SELECT id, email, first_name, last_name, display_name, full_name, role,
                       phone_number, alternate_phone, job_title, status,
                       department_id, manager_id, hire_date, is_active,
                       created_at, updated_at
                FROM hr_public.users
                WHERE 1=1
                "#,
            );

            // Apply conditions
            if let Some(cond) = &condition {
                if let Some(id) = cond.id {
                    query_builder.push(" AND id = ");
                    query_builder.push_bind(id);
                }
                if let Some(email) = &cond.email {
                    query_builder.push(" AND email = ");
                    query_builder.push_bind(email);
                }
                if let Some(dept_id) = cond.department_id {
                    query_builder.push(" AND department_id = ");
                    query_builder.push_bind(dept_id);
                }
                if let Some(mgr_id) = cond.manager_id {
                    query_builder.push(" AND manager_id = ");
                    query_builder.push_bind(mgr_id);
                }
                if let Some(is_active) = cond.is_active {
                    query_builder.push(" AND is_active = ");
                    query_builder.push_bind(is_active);
                }
                if let Some(status) = &cond.status {
                    query_builder.push(" AND status = ");
                    query_builder.push_bind(status);
                }
            }

            // Add ordering
            let order_clause = if let Some(order) = order_by {
                format!("ORDER BY {}", order.to_sql())
            } else {
                "ORDER BY created_at DESC".to_string() // Default
            };
            query_builder.push(order_clause);
            query_builder.push(" LIMIT ");
            query_builder.push_bind(first);
            query_builder.push(" OFFSET ");
            query_builder.push_bind(offset);

            let users: Vec<User> = query_builder
                .build_query_as()
                .fetch_all(&mut **tx.as_mut())
                .await
                .map_err(|e| {
                    tracing::error!("Failed to fetch all users: {}", e);
                    Error::new("Failed to fetch users")
                })?;

            // Get total count
            let mut count_builder = sqlx::QueryBuilder::new(
                "SELECT COUNT(*) FROM hr_public.users WHERE 1=1",
            );

            if let Some(cond) = &condition {
                if let Some(id) = cond.id {
                    count_builder.push(" AND id = ");
                    count_builder.push_bind(id);
                }
                if let Some(email) = &cond.email {
                    count_builder.push(" AND email = ");
                    count_builder.push_bind(email);
                }
                if let Some(dept_id) = cond.department_id {
                    count_builder.push(" AND department_id = ");
                    count_builder.push_bind(dept_id);
                }
                if let Some(mgr_id) = cond.manager_id {
                    count_builder.push(" AND manager_id = ");
                    count_builder.push_bind(mgr_id);
                }
                if let Some(is_active) = cond.is_active {
                    count_builder.push(" AND is_active = ");
                    count_builder.push_bind(is_active);
                }
                if let Some(status) = &cond.status {
                    count_builder.push(" AND status = ");
                    count_builder.push_bind(status);
                }
            }

            let total_count: (i64,) = count_builder
                .build_query_as()
                .fetch_one(&mut **tx.as_mut())
                .await
                .map_err(|e| {
                    tracing::error!("Failed to count users: {}", e);
                    Error::new("Failed to count users")
                })?;

            Ok(UsersConnection {
                nodes: users,
                total_count: total_count.0,
            })
        })).await
    }

    /// Get users by department ID
    async fn users_by_department(
        &self,
        ctx: &Context<'_>,
        department_id: Uuid,
        limit: Option<i64>,
    ) -> Result<Vec<User>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;

        let limit = limit.unwrap_or(100).min(1000);

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, User>(
                r#"
                SELECT id, email, first_name, last_name, display_name, full_name, role,
                       phone_number, alternate_phone, job_title, status,
                       department_id, manager_id, hire_date, is_active,
                       created_at, updated_at
                FROM hr_public.users
                WHERE department_id = $1
                ORDER BY last_name, first_name
                LIMIT $2
                "#,
            )
            .bind(department_id)
            .bind(limit)
            .fetch_all(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch users by department: {}", e);
                Error::new("Failed to fetch users by department")
            })
        })).await
    }

    /// Get users by manager ID (direct reports)
    async fn users_by_manager(
        &self,
        ctx: &Context<'_>,
        manager_id: Uuid,
        limit: Option<i64>,
    ) -> Result<Vec<User>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;

        let limit = limit.unwrap_or(100).min(1000);

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, User>(
                r#"
                SELECT id, email, first_name, last_name, display_name, full_name, role,
                       phone_number, alternate_phone, job_title, status,
                       department_id, manager_id, hire_date, is_active,
                       created_at, updated_at
                FROM hr_public.users
                WHERE manager_id = $1
                ORDER BY last_name, first_name
                LIMIT $2
                "#,
            )
            .bind(manager_id)
            .bind(limit)
            .fetch_all(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch users by manager: {}", e);
                Error::new("Failed to fetch users by manager")
            })
        })).await
    }

    /// Count total users with optional status filter
    async fn users_count(&self, ctx: &Context<'_>, status: Option<UserStatus>) -> Result<i64> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;

        session.execute(pool, |tx| Box::pin(async move {
            let mut query_builder = sqlx::QueryBuilder::new(
                "SELECT COUNT(*) FROM hr_public.users "
            );

            if let Some(user_status) = status {
                query_builder.push(" AND status = ");
                query_builder.push_bind(user_status);
            }

            let count: (i64,) = query_builder
                .build_query_as()
                .fetch_one(&mut **tx.as_mut())
                .await
                .map_err(|e| {
                    tracing::error!("Failed to count users: {}", e);
                    Error::new("Failed to count users")
                })?;

            Ok(count.0)
        })).await
    }

    // ============================================================
    // Department Queries
    // ============================================================

    /// Get a single department by ID
    async fn department(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<Department>> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let department = sqlx::query_as::<_, Department>(
            r#"
            SELECT id, name, description, parent_department_id, manager_id,
                   created_at, updated_at
            FROM hr_public.departments
            WHERE id = $1 
            "#,
        )
        .bind(id)
        .fetch_optional(pool)
        .await?;

        Ok(department)
    }

    /// Get all departments with pagination
    /// Requires: Any authenticated user (employee-level access)
    #[graphql(guard = "RequireMinRoleLevel::employee()")]
    async fn departments(
        &self,
        ctx: &Context<'_>,
        limit: Option<i64>,
        offset: Option<i64>,
        #[graphql(name = "orderBy")] order_by: Option<Vec<DepartmentsOrderBy>>,
    ) -> Result<Vec<Department>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);
        let offset = offset.unwrap_or(0);

        let mut query_builder = sqlx::QueryBuilder::new(
            r#"
            SELECT id, name, description, parent_department_id, manager_id,
                   created_at, updated_at
            FROM hr_public.departments
            "#,
        );

            // Add ordering
            let order_clause = if let Some(orders) = order_by {
                if orders.is_empty() {
                    "name ASC".to_string()
                } else {
                    let sql_parts: Vec<String> = orders.iter().map(|o| o.to_sql().to_string()).collect();
                    sql_parts.join(", ")
                }
            } else {
                "name ASC".to_string() // Default
            };
        query_builder.push(" ORDER BY ");
        query_builder.push(order_clause);

        query_builder.push(" LIMIT ");
        query_builder.push_bind(limit);
        query_builder.push(" OFFSET ");
        query_builder.push_bind(offset);

        let departments = query_builder
            .build_query_as::<Department>()
            .fetch_all(pool)
            .await?;

        Ok(departments)
    }

    /// Get child departments by parent department ID
    async fn departments_by_parent(
        &self,
        ctx: &Context<'_>,
        parent_department_id: Uuid,
        limit: Option<i64>,
    ) -> Result<Vec<Department>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);

        let departments = sqlx::query_as::<_, Department>(
            r#"
            SELECT id, name, description, parent_department_id, manager_id,
                   created_at, updated_at
            FROM hr_public.departments
            WHERE parent_department_id = $1 
            ORDER BY name
            LIMIT $2
            "#,
        )
        .bind(parent_department_id)
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Ok(departments)
    }

    /// Get top-level departments (no parent)
    async fn root_departments(&self, ctx: &Context<'_>, limit: Option<i64>) -> Result<Vec<Department>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);

        let departments = sqlx::query_as::<_, Department>(
            r#"
            SELECT id, name, description, parent_department_id, manager_id,
                   created_at, updated_at
            FROM hr_public.departments
            WHERE parent_department_id IS NULL 
            ORDER BY name
            LIMIT $1
            "#,
        )
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Ok(departments)
    }

    /// Count total departments
    async fn departments_count(&self, ctx: &Context<'_>) -> Result<i64> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let count: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM hr_public.departments "
        )
        .fetch_one(pool)
        .await?;

        Ok(count.0)
    }

    // ============================================================
    // Role Queries
    // ============================================================

    /// Get a single role by ID
    async fn role(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<Role>> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let role = sqlx::query_as::<_, Role>(
            r#"
            SELECT id, name, description, level,
                   created_at, updated_at
            FROM hr_public.roles
            WHERE id = $1 
            "#,
        )
        .bind(id)
        .fetch_optional(pool)
        .await?;

        Ok(role)
    }

    /// Get all roles with pagination
    async fn roles(&self, ctx: &Context<'_>, limit: Option<i64>, offset: Option<i64>) -> Result<Vec<Role>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);
        let offset = offset.unwrap_or(0);

        let roles = sqlx::query_as::<_, Role>(
            r#"
            SELECT id, name, description, level,
                   created_at, updated_at
            FROM hr_public.roles
            
            ORDER BY level DESC, name
            LIMIT $1 OFFSET $2
            "#,
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(pool)
        .await?;

        Ok(roles)
    }

    /// Get roles by minimum level (for hierarchy filtering)
    async fn roles_by_min_level(&self, ctx: &Context<'_>, min_level: i32) -> Result<Vec<Role>> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let roles = sqlx::query_as::<_, Role>(
            r#"
            SELECT id, name, description, level,
                   created_at, updated_at
            FROM hr_public.roles
            WHERE level >= $1 
            ORDER BY level DESC, name
            "#,
        )
        .bind(min_level)
        .fetch_all(pool)
        .await?;

        Ok(roles)
    }

    /// Count total roles
    async fn roles_count(&self, ctx: &Context<'_>) -> Result<i64> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let count: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM hr_public.roles "
        )
        .fetch_one(pool)
        .await?;

        Ok(count.0)
    }

    // ============================================================
    // Permission Queries
    // ============================================================

    /// Get a single permission by ID
    async fn permission(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<Permission>> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let permission = sqlx::query_as::<_, Permission>(
            r#"
            SELECT id, resource, action, description,
                   created_at, updated_at
            FROM hr_public.permissions
            WHERE id = $1 
            "#,
        )
        .bind(id)
        .fetch_optional(pool)
        .await?;

        Ok(permission)
    }

    /// Get all permissions with pagination
    async fn permissions(&self, ctx: &Context<'_>, limit: Option<i64>, offset: Option<i64>) -> Result<Vec<Permission>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);
        let offset = offset.unwrap_or(0);

        let permissions = sqlx::query_as::<_, Permission>(
            r#"
            SELECT id, resource, action, description,
                   created_at, updated_at
            FROM hr_public.permissions
            
            ORDER BY resource, action
            LIMIT $1 OFFSET $2
            "#,
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(pool)
        .await?;

        Ok(permissions)
    }

    /// Get permissions by resource
    async fn permissions_by_resource(&self, ctx: &Context<'_>, resource: String) -> Result<Vec<Permission>> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let permissions = sqlx::query_as::<_, Permission>(
            r#"
            SELECT id, resource, action, description,
                   created_at, updated_at
            FROM hr_public.permissions
            WHERE resource = $1 
            ORDER BY action
            "#,
        )
        .bind(&resource)
        .fetch_all(pool)
        .await?;

        Ok(permissions)
    }

    /// Count total permissions
    async fn permissions_count(&self, ctx: &Context<'_>) -> Result<i64> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let count: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM hr_public.permissions "
        )
        .fetch_one(pool)
        .await?;

        Ok(count.0)
    }

    // ============================================================
    // User Role Assignment Queries
    // ============================================================

    /// Get a single user role assignment by ID
    async fn user_role_assignment(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<UserRoleAssignment>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, UserRoleAssignment>(
                r#"
                SELECT ura.id, ura.user_id, r.name as role_name, ura.assigned_by, ura.assigned_at,
                        ura.created_at, ura.updated_at, ura.deleted_at
                FROM hr_public.user_role_assignments ura
                INNER JOIN hr_public.roles r ON ura.role_id = r.id
                WHERE ura.id = $1 AND ura.deleted_at IS NULL AND r.deleted_at IS NULL
                "#,
            )
            .bind(id)
            .fetch_optional(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch user role assignment: {}", e);
                Error::new("Failed to fetch user role assignment")
            })
        })).await
    }

    /// Get all role assignments for a user
    async fn user_role_assignments(&self, ctx: &Context<'_>, user_id: Uuid) -> Result<Vec<UserRoleAssignment>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, UserRoleAssignment>(
                r#"
                SELECT ura.id, ura.user_id, r.name as role_name, ura.assigned_by, ura.assigned_at,
                        ura.created_at, ura.updated_at, ura.deleted_at
                FROM hr_public.user_role_assignments ura
                INNER JOIN hr_public.roles r ON ura.role_id = r.id
                WHERE ura.user_id = $1 AND ura.deleted_at IS NULL AND r.deleted_at IS NULL
                ORDER BY r.name
                "#,
            )
            .bind(user_id)
            .fetch_all(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch user role assignments: {}", e);
                Error::new("Failed to fetch user role assignments")
            })
        })).await
    }

    /// Get all user role assignments with PostGraphile-style Relay connection
    async fn all_user_role_assignments(
        &self,
        ctx: &Context<'_>,
        first: Option<i64>,
        offset: Option<i64>,
    ) -> Result<UserRoleAssignmentsConnection> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;

        let first = first.unwrap_or(50).min(1000);
        let offset = offset.unwrap_or(0);

        session.execute(pool, |tx| Box::pin(async move {
            let assignments: Vec<UserRoleAssignment> = sqlx::query_as::<_, UserRoleAssignment>(
                r#"
                SELECT ura.id, ura.user_id, r.name as role_name, ura.assigned_by, ura.assigned_at,
                        ura.created_at, ura.updated_at, ura.deleted_at
                FROM hr_public.user_role_assignments ura
                INNER JOIN hr_public.roles r ON ura.role_id = r.id
                WHERE ura.deleted_at IS NULL AND r.deleted_at IS NULL
                ORDER BY ura.created_at DESC
                LIMIT $1 OFFSET $2
                "#,
            )
            .bind(first)
            .bind(offset)
            .fetch_all(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch all user role assignments: {}", e);
                Error::new("Failed to fetch user role assignments")
            })?;

            // Get total count
            let total_count: (i64,) = sqlx::query_as(
                "SELECT COUNT(*) FROM hr_public.user_role_assignments ura
                 WHERE ura.deleted_at IS NULL",
            )
            .fetch_one(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to count user role assignments: {}", e);
                Error::new("Failed to count user role assignments")
            })?;

            Ok(UserRoleAssignmentsConnection {
                nodes: assignments,
                total_count: total_count.0,
            })
        })).await
    }

    /// Get all users with a specific role
    async fn role_assignments(&self, ctx: &Context<'_>, role_name: String) -> Result<Vec<UserRoleAssignment>> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let assignments = sqlx::query_as::<_, UserRoleAssignment>(
            r#"
            SELECT ura.id, ura.user_id, r.name as role_name, ura.assigned_by, ura.assigned_at,
                    ura.created_at, ura.updated_at, ura.deleted_at
            FROM hr_public.user_role_assignments ura
            INNER JOIN hr_public.roles r ON ura.role_id = r.id
            WHERE r.name = $1 AND ura.deleted_at IS NULL AND r.deleted_at IS NULL
            ORDER BY ura.created_at DESC
            "#,
        )
        .bind(role_name)
        .fetch_all(pool)
        .await?;

        Ok(assignments)
    }

    // ============================================================
    // Event Queries
    // ============================================================

    /// Get a single event by ID
    async fn event(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<Event>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, Event>(
                r#"
                SELECT id, title, description, event_type, location, start_time, end_time,
                       all_day, status, is_public, color, organizer_id,
                       rrule, recurrence_id, recurrence_end_date, max_capacity,
                       image_url, image_aspect_ratio,
                       created_at, updated_at, deleted_at
                FROM hr_public.events
                WHERE id = $1
                "#,
            )
            .bind(id)
            .fetch_optional(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch event: {}", e);
                Error::new("Failed to fetch event")
            })
        })).await
    }

    /// Get all events with pagination and ordering
    async fn events(
        &self,
        ctx: &Context<'_>,
        limit: Option<i64>,
        offset: Option<i64>,
        order_by: Option<Vec<EventsOrderBy>>,
    ) -> Result<Vec<Event>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;

        let limit = limit.unwrap_or(100).min(1000);
        let offset = offset.unwrap_or(0);

        // Build ORDER BY clause from order_by parameter
        let order_clause = if let Some(orders) = order_by {
            if orders.is_empty() {
                "start_time DESC".to_string()
            } else {
                orders
                    .iter()
                    .map(|o| o.to_sql())
                    .collect::<Vec<_>>()
                    .join(", ")
            }
        } else {
            "start_time DESC".to_string()
        };

        let query = format!(
            r#"
            SELECT id, title, description, event_type, location, start_time, end_time,
                   all_day, status, is_public, color, organizer_id,
                   rrule, recurrence_id, recurrence_end_date, max_capacity,
                   image_url, image_aspect_ratio,
                   created_at, updated_at, deleted_at
            FROM hr_public.events
            WHERE deleted_at IS NULL
            ORDER BY {}
            LIMIT $1 OFFSET $2
            "#,
            order_clause
        );

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, Event>(&query)
                .bind(limit)
                .bind(offset)
                .fetch_all(&mut **tx.as_mut())
                .await
                .map_err(|e| {
                    tracing::error!("Failed to fetch events: {}", e);
                    Error::new("Failed to fetch events")
                })
        })).await
    }

    /// Get all events with PostGraphile-style pagination (alias for compatibility)
    async fn all_events(
        &self,
        ctx: &Context<'_>,
        first: Option<i64>,
        offset: Option<i64>,
        order_by: Option<Vec<EventsOrderBy>>,
        condition: Option<EventCondition>,
    ) -> Result<EventsConnection> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;

        let limit = first.unwrap_or(100).min(1000);
        let offset_val = offset.unwrap_or(0);

        // Build ORDER BY clause from order_by parameter
        let order_clause = if let Some(orders) = order_by {
            if orders.is_empty() {
                "start_time DESC".to_string()
            } else {
                orders
                    .iter()
                    .map(|o| o.to_sql())
                    .collect::<Vec<_>>()
                    .join(", ")
            }
        } else {
            "start_time DESC".to_string()
        };

        // Build WHERE clause from condition
        let mut where_clauses = vec![];
        let mut bind_count = 1;

        if let Some(cond) = condition {
            if let Some(status) = cond.status {
                where_clauses.push(format!("status = ${}", bind_count));
                bind_count += 1;
            }
            if cond.is_public.is_some() {
                where_clauses.push(format!("is_public = ${}", bind_count));
                bind_count += 1;
            }
        }

        let where_clause = if where_clauses.is_empty() {
            String::new()
        } else {
            format!("AND {}", where_clauses.join(" AND "))
        };

        let query = format!(
            r#"
            SELECT id, title, description, event_type, location, start_time, end_time,
                   all_day, status, is_public, color, organizer_id,
                   rrule, recurrence_id, recurrence_end_date, max_capacity,
                   image_url, image_aspect_ratio,
                   created_at, updated_at, deleted_at
            FROM hr_public.events
            WHERE 1=1 {}
            ORDER BY {}
            LIMIT ${} OFFSET ${}
            "#,
            where_clause, order_clause, bind_count, bind_count + 1
        );

        let count_query = format!(
            r#"
            SELECT COUNT(*)::bigint
            FROM hr_public.events
            WHERE 1=1 {}
            "#,
            where_clause
        );

        session.execute(pool, |tx| Box::pin(async move {
            // Get total count
            let total_count: (i64,) = sqlx::query_as(&count_query)
                .fetch_one(&mut **tx.as_mut())
                .await
                .map_err(|e| {
                    tracing::error!("Failed to count events: {}", e);
                    Error::new("Failed to count events")
                })?;

            // Get events
            let events = sqlx::query_as::<_, Event>(&query)
                .bind(limit)
                .bind(offset_val)
                .fetch_all(&mut **tx.as_mut())
                .await
                .map_err(|e| {
                    tracing::error!("Failed to fetch events: {}", e);
                    Error::new("Failed to fetch events")
                })?;

            let has_next_page = offset_val + limit < total_count.0;
            let has_previous_page = offset_val > 0;

            Ok(EventsConnection {
                nodes: events,
                total_count: total_count.0,
                page_info: PageInfo {
                    has_next_page,
                    has_previous_page,
                    start_cursor: None,
                    end_cursor: None,
                },
            })
        })).await
    }

    /// Get events by creator ID (organizer)
    async fn events_by_creator(
        &self,
        ctx: &Context<'_>,
        created_by: Uuid,
        limit: Option<i64>,
    ) -> Result<Vec<Event>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;

        let limit = limit.unwrap_or(100).min(1000);

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, Event>(
                r#"
                SELECT id, title, description, event_type, location, start_time, end_time,
                       all_day, status, is_public, color, organizer_id,
                       rrule, recurrence_id, recurrence_end_date, max_capacity,
                       image_url, image_aspect_ratio,
                       created_at, updated_at, deleted_at
                FROM hr_public.events
                WHERE organizer_id = $1 AND deleted_at IS NULL
                ORDER BY start_time DESC
                LIMIT $2
                "#,
            )
            .bind(created_by)
            .bind(limit)
            .fetch_all(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch events by creator: {}", e);
                Error::new("Failed to fetch events by creator")
            })
        })).await
    }

    /// Get events within a date range
    async fn events_by_date_range(
        &self,
        ctx: &Context<'_>,
        start_date: chrono::DateTime<chrono::Utc>,
        end_date: chrono::DateTime<chrono::Utc>,
        limit: Option<i64>,
    ) -> Result<Vec<Event>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;

        let limit = limit.unwrap_or(100).min(1000);

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, Event>(
                r#"
                SELECT id, title, description, event_type, location, start_time, end_time,
                       all_day, status, is_public, color, organizer_id,
                       rrule, recurrence_id, recurrence_end_date, max_capacity,
                       image_url, image_aspect_ratio,
                       created_at, updated_at, deleted_at
                FROM hr_public.events
                WHERE deleted_at IS NULL
                  AND start_time >= $1
                  AND end_time <= $2
                ORDER BY start_time ASC
                LIMIT $3
                "#,
            )
            .bind(start_date)
            .bind(end_date)
            .bind(limit)
            .fetch_all(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch events by date range: {}", e);
                Error::new("Failed to fetch events by date range")
            })
        })).await
    }

    /// Get upcoming events (starts in the future)
    async fn upcoming_events(&self, ctx: &Context<'_>, limit: Option<i64>) -> Result<Vec<Event>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;

        let limit = limit.unwrap_or(100).min(1000);

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, Event>(
                r#"
                SELECT id, title, description, event_type, location, start_time, end_time,
                       all_day, status, is_public, color, organizer_id,
                       rrule, recurrence_id, recurrence_end_date, max_capacity,
                       image_url, image_aspect_ratio,
                       created_at, updated_at, deleted_at
                FROM hr_public.events
                WHERE deleted_at IS NULL
                  AND start_time >= NOW()
                ORDER BY start_time ASC
                LIMIT $1
                "#,
            )
            .bind(limit)
            .fetch_all(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch upcoming events: {}", e);
                Error::new("Failed to fetch upcoming events")
            })
        })).await
    }

    /// Get past events (ended in the past)
    async fn past_events(&self, ctx: &Context<'_>, limit: Option<i64>) -> Result<Vec<Event>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;

        let limit = limit.unwrap_or(100).min(1000);

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, Event>(
                r#"
                SELECT id, title, description, event_type, location, start_time, end_time,
                       all_day, status, is_public, color, organizer_id,
                       rrule, recurrence_id, recurrence_end_date, max_capacity,
                       image_url, image_aspect_ratio,
                       created_at, updated_at, deleted_at
                FROM hr_public.events
                WHERE deleted_at IS NULL
                  AND end_time < NOW()
                ORDER BY start_time DESC
                LIMIT $1
                "#,
            )
            .bind(limit)
            .fetch_all(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch past events: {}", e);
                Error::new("Failed to fetch past events")
            })
        })).await
    }

    /// Get only recurring events (events with recurrence rules)
    async fn recurring_events(&self, ctx: &Context<'_>, limit: Option<i64>) -> Result<Vec<Event>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;

        let limit = limit.unwrap_or(100).min(1000);

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, Event>(
                r#"
                SELECT id, title, description, event_type, location, start_time, end_time,
                       all_day, status, is_public, color, organizer_id,
                       rrule, recurrence_id, recurrence_end_date, max_capacity,
                       image_url, image_aspect_ratio,
                       created_at, updated_at, deleted_at
                FROM hr_public.events
                WHERE deleted_at IS NULL
                  AND rrule IS NOT NULL
                ORDER BY start_time DESC
                LIMIT $1
                "#,
            )
            .bind(limit)
            .fetch_all(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch recurring events: {}", e);
                Error::new("Failed to fetch recurring events")
            })
        })).await
    }

    /// Count total events
    async fn events_count(&self, ctx: &Context<'_>) -> Result<i64> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;

        session.execute(pool, |tx| Box::pin(async move {
            let count: (i64,) = sqlx::query_as(
                "SELECT COUNT(*) FROM hr_public.events "
            )
            .fetch_one(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to count events: {}", e);
                Error::new("Failed to count events")
            })?;

            Ok(count.0)
        })).await
    }

    // ============================================================
    // Leave Type Queries
    // ============================================================

    /// Get a single leave type by ID
    async fn leave_type(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<LeaveType>> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let leave_type = sqlx::query_as::<_, LeaveType>(
            r#"
            SELECT id, name, description, default_days_per_year,
                   requires_approval, max_consecutive_days, is_paid,
                   color, icon, created_at, updated_at
            FROM hr_public.leave_types
            WHERE id = $1 
            "#,
        )
        .bind(id)
        .fetch_optional(pool)
        .await?;

        Ok(leave_type)
    }

    /// Get all leave types with pagination
    async fn leave_types(
        &self,
        ctx: &Context<'_>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<LeaveType>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);
        let offset = offset.unwrap_or(0);

        let leave_types = sqlx::query_as::<_, LeaveType>(
            r#"
            SELECT id, name, description, default_days_per_year,
                   requires_approval, max_consecutive_days, is_paid,
                   color, icon, created_at, updated_at
            FROM hr_public.leave_types
            
            ORDER BY name
            LIMIT $1 OFFSET $2
            "#,
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(pool)
        .await?;

        Ok(leave_types)
    }

    /// Count total leave types
    async fn leave_types_count(&self, ctx: &Context<'_>) -> Result<i64> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let count: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM hr_public.leave_types "
        )
        .fetch_one(pool)
        .await?;

        Ok(count.0)
    }

    // ============================================================
    // Leave Balance Queries
    // ============================================================

    /// Get a single leave balance by ID
    async fn leave_balance(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<LeaveBalance>> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let balance = sqlx::query_as::<_, LeaveBalance>(
            r#"
            SELECT id, user_id, leave_type_id, year, total_days,
                   used_days, pending_days, carried_over_days,
                   created_at, updated_at
            FROM hr_public.leave_balances
            WHERE id = $1 
            "#,
        )
        .bind(id)
        .fetch_optional(pool)
        .await?;

        Ok(balance)
    }

    /// Get leave balances by user ID
    async fn leave_balances_by_user(
        &self,
        ctx: &Context<'_>,
        user_id: Uuid,
        year: Option<i32>,
    ) -> Result<Vec<LeaveBalance>> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let balances = if let Some(y) = year {
            sqlx::query_as::<_, LeaveBalance>(
                r#"
                SELECT tob.id, tob.employee_id, tob.policy_id, tob.year, tob.balance_days,
                       tob.used_days, 0 as pending_days, 0 as carried_over_days,
                       tob.created_at, tob.updated_at
                FROM hr_public.time_off_balances tob
                WHERE tob.employee_id = $1 AND tob.year = $2
                ORDER BY tob.year DESC
                "#,
            )
            .bind(user_id)
            .bind(y)
            .fetch_all(pool)
            .await?
        } else {
            sqlx::query_as::<_, LeaveBalance>(
                r#"
                SELECT tob.id, tob.employee_id, tob.policy_id, tob.year, tob.balance_days,
                       tob.used_days, 0 as pending_days, 0 as carried_over_days,
                       tob.created_at, tob.updated_at
                FROM hr_public.time_off_balances tob
                WHERE tob.employee_id = $1
                ORDER BY tob.year DESC
                "#,
            )
            .bind(user_id)
            .fetch_all(pool)
            .await?
        };

        Ok(balances)
    }

    /// Get leave balance by user and leave type for specific year
    async fn leave_balance_by_user_and_type(
        &self,
        ctx: &Context<'_>,
        user_id: Uuid,
        leave_type_id: Uuid,
        year: i32,
    ) -> Result<Option<LeaveBalance>> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let balance = sqlx::query_as::<_, LeaveBalance>(
            r#"
            SELECT id, user_id, leave_type_id, year, total_days,
                   used_days, pending_days, carried_over_days,
                   created_at, updated_at
            FROM hr_public.leave_balances
            WHERE user_id = $1 AND leave_type_id = $2 AND year = $3 
            "#,
        )
        .bind(user_id)
        .bind(leave_type_id)
        .bind(year)
        .fetch_optional(pool)
        .await?;

        Ok(balance)
    }

    // ============================================================
    // Leave Request Queries
    // ============================================================

    /// Get a single leave request by ID
    async fn leave_request(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<LeaveRequest>> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let request = sqlx::query_as::<_, LeaveRequest>(
            r#"
            SELECT id, employee_id, manager_id, leave_type, start_date, end_date,
                   days_requested, status, reason, manager_comments, created_at, updated_at
            FROM hr_public.leave_requests
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(pool)
        .await?;

        Ok(request)
    }

    /// Get all leave requests with optional filtering and pagination
    /// Requires: Any authenticated user (employee-level access)
    #[graphql(guard = "RequireMinRoleLevel::employee()")]
    async fn leave_requests(
        &self,
        ctx: &Context<'_>,
        limit: Option<i64>,
        offset: Option<i64>,
        status: Option<LeaveRequestStatus>,
    ) -> Result<Vec<LeaveRequest>> {
        let db = get_db_from_context(ctx)?;
        let limit = limit.unwrap_or(100).min(1000);
        let offset = offset.unwrap_or(0);

        let mut query = LeaveRequestEntity::find();

        // Apply status filter if provided
        if let Some(req_status) = status {
            query = query.filter(leave_request::Column::Status.eq(req_status.as_str()));
        }

        // Add ordering and pagination
        let requests = query
            .order_by_desc(leave_request::Column::CreatedAt)
            .limit(Some(limit as u64))
            .offset(offset as u64)
            .all(db)
            .await?;

        // Convert SeaORM models to legacy LeaveRequest struct for compatibility
        let requests = requests.into_iter().map(|model| LeaveRequest {
            id: model.id,
            employee_id: model.employee_id,
            manager_id: model.manager_id,
            leave_type: model.leave_type,
            start_date: model.start_date,
            end_date: model.end_date,
            days_requested: model.days_requested,
            status: LeaveRequestStatus::from_str(&model.status).unwrap_or(LeaveRequestStatus::Pending),
            reason: model.reason,
            manager_comments: model.manager_comments,
            created_at: model.created_at,
            updated_at: model.updated_at,
            deleted_at: model.deleted_at,
        }).collect();

        Ok(requests)
            .map_err(|e| {
                tracing::error!("Failed to fetch leave requests: {}", e);
                Error::new("Failed to fetch leave requests")
            })
    }

    /// Get leave requests by user ID
    async fn leave_requests_by_user(
        &self,
        ctx: &Context<'_>,
        user_id: Uuid,
        status: Option<LeaveRequestStatus>,
        limit: Option<i64>,
    ) -> Result<Vec<LeaveRequest>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);

        let requests = if let Some(req_status) = status {
            sqlx::query_as::<_, LeaveRequest>(
                r#"
                SELECT id, employee_id, manager_id, leave_type, start_date, end_date,
                       days_requested, status, reason, manager_comments, created_at, updated_at
                FROM hr_public.leave_requests
                WHERE employee_id = $1 AND status = $2
                ORDER BY start_date DESC
                LIMIT $3
                "#,
            )
            .bind(user_id)
            .bind(req_status)
            .bind(limit)
            .fetch_all(pool)
            .await?
        } else {
            sqlx::query_as::<_, LeaveRequest>(
                r#"
                SELECT id, employee_id, manager_id, leave_type, start_date, end_date,
                       days_requested, status, reason, manager_comments, created_at, updated_at
                FROM hr_public.leave_requests
                WHERE employee_id = $1
                ORDER BY start_date DESC
                LIMIT $2
                "#,
            )
            .bind(user_id)
            .bind(limit)
            .fetch_all(pool)
            .await?
        };

        Ok(requests)
    }

    /// Get pending leave requests (for managers/approvers)
    async fn pending_leave_requests(
        &self,
        ctx: &Context<'_>,
        limit: Option<i64>,
    ) -> Result<Vec<LeaveRequest>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);

        let requests = sqlx::query_as::<_, LeaveRequest>(
            r#"
            SELECT id, employee_id, manager_id, leave_type, start_date, end_date,
                   days_requested, status, reason, manager_comments, created_at, updated_at
            FROM hr_public.leave_requests
            WHERE status = 'pending'
            ORDER BY created_at ASC
            LIMIT $1
            "#,
        )
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Ok(requests)
    }

    /// Get leave requests by date range
    async fn leave_requests_by_date_range(
        &self,
        ctx: &Context<'_>,
        start_date: chrono::DateTime<chrono::Utc>,
        end_date: chrono::DateTime<chrono::Utc>,
        limit: Option<i64>,
    ) -> Result<Vec<LeaveRequest>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);

        let requests = sqlx::query_as::<_, LeaveRequest>(
            r#"
            SELECT id, employee_id, manager_id, leave_type, start_date, end_date,
                   days_requested, status, reason, manager_comments, created_at, updated_at
            FROM hr_public.leave_requests
            WHERE start_date >= $1
              AND end_date <= $2
              AND status = 'approved'
            ORDER BY start_date ASC
            LIMIT $3
            "#,
        )
        .bind(start_date)
        .bind(end_date)
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Ok(requests)
    }

    /// Count leave requests by status
    async fn leave_requests_count(
        &self,
        ctx: &Context<'_>,
        status: Option<LeaveRequestStatus>,
    ) -> Result<i64> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let count: (i64,) = if let Some(req_status) = status {
            sqlx::query_as(
                "SELECT COUNT(*) FROM hr_public.leave_requests WHERE status = $1 "
            )
            .bind(req_status)
            .fetch_one(pool)
            .await?
        } else {
            sqlx::query_as(
                "SELECT COUNT(*) FROM hr_public.leave_requests "
            )
            .fetch_one(pool)
            .await?
        };

        Ok(count.0)
    }

    // ============================================================
    // Task Queries
    // ============================================================

    /// Get a single task by ID
    async fn task(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<Task>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, Task>(
                r#"
                SELECT id, title, description, status, priority, due_date,
                       completed_at, estimated_hours, actual_hours, tags, department_id,
                       created_by, assignee_id, parent_task_id, archived, archived_at, archived_by,
                       created_at, updated_at, deleted_at
                FROM hr_public.tasks
                WHERE id = $1
                "#,
            )
            .bind(id)
            .fetch_optional(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch task: {}", e);
                Error::new("Failed to fetch task")
            })
        })).await
    }

    /// Get all tasks with pagination
    async fn tasks(
        &self,
        ctx: &Context<'_>,
        limit: Option<i64>,
        offset: Option<i64>,
        filter: Option<TaskFilter>,
        order_by: Option<String>,
    ) -> Result<Vec<Task>> {
        let db = get_db_from_context(ctx)?;
        let limit = limit.unwrap_or(100).min(1000);
        let offset = offset.unwrap_or(0);

        let mut query = TaskEntity::find()
            .filter(task::Column::DeletedAt.is_null()); // Only non-deleted tasks

        if let Some(ref f) = filter {
            if let Some(status) = &f.status {
                query = query.filter(task::Column::Status.eq(status.as_str()));
            }
            if let Some(priority) = &f.priority {
                query = query.filter(task::Column::Priority.eq(priority.as_str()));
            }
            if let Some(assignee_id) = f.assignee_id {
                query = query.filter(task::Column::AssigneeId.eq(assignee_id));
            }
            if let Some(created_by) = f.created_by {
                query = query.filter(task::Column::CreatedBy.eq(created_by));
            }
            if let Some(department_id) = f.department_id {
                query = query.filter(task::Column::DepartmentId.eq(department_id));
            }
            if let Some(task_type_id) = f.task_type_id {
                query = query.filter(task::Column::TaskTypeId.eq(task_type_id));
            }
            if let Some(parent_task_id) = f.parent_task_id {
                query = query.filter(task::Column::ParentTaskId.eq(parent_task_id));
            }
            if let Some(archived) = f.archived {
                query = query.filter(task::Column::Archived.eq(archived));
            }
        }

        // Add ordering
        if let Some(order) = order_by {
            match order.as_str() {
                "id_asc" => query = query.order_by_asc(task::Column::Id),
                "id_desc" => query = query.order_by_desc(task::Column::Id),
                "title_asc" => query = query.order_by_asc(task::Column::Title),
                "title_desc" => query = query.order_by_desc(task::Column::Title),
                "status_asc" => query = query.order_by_asc(task::Column::Status),
                "status_desc" => query = query.order_by_desc(task::Column::Status),
                "priority_asc" => query = query.order_by_asc(task::Column::Priority),
                "priority_desc" => query = query.order_by_desc(task::Column::Priority),
                "due_date_asc" => query = query.order_by_asc(task::Column::DueDate),
                "due_date_desc" => query = query.order_by_desc(task::Column::DueDate),
                "created_at_asc" => query = query.order_by_asc(task::Column::CreatedAt),
                "created_at_desc" => query = query.order_by_desc(task::Column::CreatedAt),
                "updated_at_asc" => query = query.order_by_asc(task::Column::UpdatedAt),
                "updated_at_desc" => query = query.order_by_desc(task::Column::UpdatedAt),
                _ => query = query.order_by_desc(task::Column::Priority).order_by_desc(task::Column::CreatedAt), // Default
            }
        } else {
            query = query.order_by_desc(task::Column::Priority).order_by_desc(task::Column::CreatedAt); // Default
        }

        let tasks = query
            .limit(Some(limit as u64))
            .offset(offset as u64)
            .all(db)
            .await?;

        // Convert SeaORM models to legacy Task struct for compatibility
        let tasks = tasks.into_iter().map(|model| Task {
            id: model.id,
            title: model.title,
            description: model.description,
            task_type_id: model.task_type_id,
            status: TaskStatus::from_str(&model.status).unwrap_or(TaskStatus::Todo),
            priority: TaskPriority::from_str(&model.priority).unwrap_or(TaskPriority::Medium),
            due_date: model.due_date,
            completed_at: model.completed_at,
            estimated_hours: model.estimated_hours,
            actual_hours: model.actual_hours,
            tags: model.tags,
            department_id: model.department_id,
            created_by: model.created_by,
            assignee_id: model.assignee_id,
            parent_task_id: model.parent_task_id,
            requires_manual_reassignment: model.requires_manual_reassignment,
            archived: model.archived,
            archived_at: model.archived_at,
            archived_by: model.archived_by,
            created_at: model.created_at,
            updated_at: model.updated_at,
            deleted_at: model.deleted_at,
        }).collect();

        Ok(tasks)
    }



    /// Get tasks by creator ID
    async fn tasks_by_creator(
        &self,
        ctx: &Context<'_>,
        created_by: Uuid,
        limit: Option<i64>,
    ) -> Result<Vec<Task>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;

        let limit = limit.unwrap_or(100).min(1000);

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, Task>(
                r#"
                SELECT id, title, description, status, priority, due_date,
                       completed_at, estimated_hours, actual_hours, tags, department_id,
                       created_by, assignee_id, parent_task_id, archived, archived_at, archived_by,
                       created_at, updated_at, deleted_at
                FROM hr_public.tasks
                WHERE created_by = $1
                ORDER BY created_at DESC
                LIMIT $2
                "#,
            )
            .bind(created_by)
            .bind(limit)
            .fetch_all(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch tasks by creator: {}", e);
                Error::new("Failed to fetch tasks by creator")
            })
        })).await
    }

    /// Get tasks by assignee ID
    async fn tasks_by_assignee(
        &self,
        ctx: &Context<'_>,
        user_id: Uuid,
        limit: Option<i64>,
    ) -> Result<Vec<Task>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;

        let limit = limit.unwrap_or(100).min(1000);

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, Task>(
                r#"
                SELECT DISTINCT t.id, t.title, t.description, t.status, t.priority, t.due_date,
                       t.completed_at, t.estimated_hours, t.actual_hours, t.tags,
                       t.department_id, t.created_by, t.assignee_id, t.parent_task_id,
                       t.archived, t.archived_at, t.archived_by,
                       t.created_at, t.updated_at, t.deleted_at
                FROM hr_public.tasks t
                INNER JOIN hr_public.task_assignees ta ON t.id = ta.task_id
                WHERE ta.user_id = $1 AND t.deleted_at IS NULL AND ta.deleted_at IS NULL
                ORDER BY t.priority DESC, t.created_at DESC
                LIMIT $2
                "#,
            )
            .bind(user_id)
            .bind(limit)
            .fetch_all(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch tasks by assignee: {}", e);
                Error::new("Failed to fetch tasks by assignee")
            })
        })).await
    }

    /// Get tasks by status
    async fn tasks_by_status(
        &self,
        ctx: &Context<'_>,
        status: TaskStatus,
        limit: Option<i64>,
    ) -> Result<Vec<Task>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;

        let limit = limit.unwrap_or(100).min(1000);

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, Task>(
                r#"
                SELECT id, title, description, status, priority, due_date,
                       completed_at, estimated_hours, actual_hours, tags, department_id,
                       created_by, assignee_id, parent_task_id, archived, archived_at, archived_by,
                       created_at, updated_at, deleted_at
                FROM hr_public.tasks
                WHERE status = $1
                ORDER BY priority DESC, created_at DESC
                LIMIT $2
                "#,
            )
            .bind(status)
            .bind(limit)
            .fetch_all(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch tasks by status: {}", e);
                Error::new("Failed to fetch tasks by status")
            })
        })).await
    }

    /// Get tasks by priority
    async fn tasks_by_priority(
        &self,
        ctx: &Context<'_>,
        priority: TaskPriority,
        limit: Option<i64>,
    ) -> Result<Vec<Task>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;

        let limit = limit.unwrap_or(100).min(1000);

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, Task>(
                r#"
                SELECT id, title, description, status, priority, due_date,
                       completed_at, estimated_hours, actual_hours, tags, department_id,
                       created_by, assignee_id, parent_task_id, archived, archived_at, archived_by,
                       created_at, updated_at, deleted_at
                FROM hr_public.tasks
                WHERE priority = $1
                ORDER BY created_at DESC
                LIMIT $2
                "#,
            )
            .bind(priority)
            .bind(limit)
            .fetch_all(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch tasks by priority: {}", e);
                Error::new("Failed to fetch tasks by priority")
            })
        })).await
    }

    /// Get tasks by department ID
    async fn tasks_by_department(
        &self,
        ctx: &Context<'_>,
        department_id: Uuid,
        limit: Option<i64>,
    ) -> Result<Vec<Task>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;

        let limit = limit.unwrap_or(100).min(1000);

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, Task>(
                r#"
                SELECT id, title, description, status, priority, due_date,
                       completed_at, estimated_hours, actual_hours, tags, department_id,
                       created_by, created_at, updated_at
                FROM hr_public.tasks
                WHERE department_id = $1 
                ORDER BY priority DESC, created_at DESC
                LIMIT $2
                "#,
            )
            .bind(department_id)
            .bind(limit)
            .fetch_all(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch tasks by department: {}", e);
                Error::new("Failed to fetch tasks by department")
            })
        })).await
    }

    /// Get overdue tasks
    async fn overdue_tasks(&self, ctx: &Context<'_>, limit: Option<i64>) -> Result<Vec<Task>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;

        let limit = limit.unwrap_or(100).min(1000);

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, Task>(
                r#"
                SELECT id, title, description, status, priority, due_date,
                       completed_at, estimated_hours, actual_hours, tags, department_id,
                       created_by, created_at, updated_at
                FROM hr_public.tasks
                
                  AND due_date < NOW()
                  AND status NOT IN ('done', 'cancelled')
                ORDER BY due_date ASC
                LIMIT $1
                "#,
            )
            .bind(limit)
            .fetch_all(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch overdue tasks: {}", e);
                Error::new("Failed to fetch overdue tasks")
            })
        })).await
    }

    /// Count tasks by status
    async fn tasks_count(&self, ctx: &Context<'_>, status: Option<TaskStatus>) -> Result<i64> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;

        session.execute(pool, |tx| Box::pin(async move {
            let count: (i64,) = if let Some(task_status) = status {
                sqlx::query_as(
                    "SELECT COUNT(*) FROM hr_public.tasks WHERE status = $1 ",
                )
                .bind(task_status)
                .fetch_one(&mut **tx.as_mut())
                .await
                .map_err(|e| {
                    tracing::error!("Failed to count tasks by status: {}", e);
                    Error::new("Failed to count tasks")
                })?
            } else {
                sqlx::query_as("SELECT COUNT(*) FROM hr_public.tasks ")
                    .fetch_one(&mut **tx.as_mut())
                    .await
                    .map_err(|e| {
                        tracing::error!("Failed to count tasks: {}", e);
                        Error::new("Failed to count tasks")
                    })?
            };

            Ok(count.0)
        })).await
    }

    // ============================================================
    // Task Assignee Queries
    // ============================================================

    /// Get a single task assignee by ID
    async fn task_assignee(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<TaskAssignee>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, TaskAssignee>(
                r#"
                SELECT id, task_id, user_id, role, assigned_at, assigned_by,
                       created_at, updated_at
                FROM hr_public.task_assignees
                WHERE id = $1 
                "#,
            )
            .bind(id)
            .fetch_optional(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch task assignee: {}", e);
                Error::new("Failed to fetch task assignee")
            })
        })).await
    }

    /// Get task assignees by task ID
    async fn task_assignees_by_task(
        &self,
        ctx: &Context<'_>,
        task_id: Uuid,
        limit: Option<i64>,
    ) -> Result<Vec<TaskAssignee>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;
        let limit = limit.unwrap_or(100).min(1000);

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, TaskAssignee>(
                r#"
                SELECT id, task_id, user_id, role, assigned_at, assigned_by,
                       created_at, updated_at
                FROM hr_public.task_assignees
                WHERE task_id = $1 
                ORDER BY assigned_at ASC
                LIMIT $2
                "#,
            )
            .bind(task_id)
            .bind(limit)
            .fetch_all(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch task assignees by task: {}", e);
                Error::new("Failed to fetch task assignees")
            })
        })).await
    }

    /// Get task assignees by user ID
    async fn task_assignees_by_user(
        &self,
        ctx: &Context<'_>,
        user_id: Uuid,
        limit: Option<i64>,
    ) -> Result<Vec<TaskAssignee>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;
        let limit = limit.unwrap_or(100).min(1000);

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, TaskAssignee>(
                r#"
                SELECT id, task_id, user_id, role, assigned_at, assigned_by,
                       created_at, updated_at
                FROM hr_public.task_assignees
                WHERE user_id = $1 
                ORDER BY assigned_at DESC
                LIMIT $2
                "#,
            )
            .bind(user_id)
            .bind(limit)
            .fetch_all(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch task assignees by user: {}", e);
                Error::new("Failed to fetch task assignees")
            })
        })).await
    }

    // ============================================================
    // Task Audit Entry Queries
    // ============================================================

    /// Get task audit entries by task ID
    async fn task_audit_entries(
        &self,
        ctx: &Context<'_>,
        task_id: Uuid,
        limit: Option<i64>,
    ) -> Result<Vec<TaskAuditEntry>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;
        let limit = limit.unwrap_or(100).min(1000);

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, TaskAuditEntry>(
                r#"
                SELECT id, task_id, user_id, action, field_name, old_value,
                       new_value, comment, created_at
                FROM hr_public.task_audit_entries
                WHERE task_id = $1
                ORDER BY created_at DESC
                LIMIT $2
                "#,
            )
            .bind(task_id)
            .bind(limit)
            .fetch_all(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch task audit entries: {}", e);
                Error::new("Failed to fetch task audit entries")
            })
        })).await
    }

    /// Get task audit entries by user ID
    async fn task_audit_entries_by_user(
        &self,
        ctx: &Context<'_>,
        user_id: Uuid,
        limit: Option<i64>,
    ) -> Result<Vec<TaskAuditEntry>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;
        let limit = limit.unwrap_or(100).min(1000);

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, TaskAuditEntry>(
                r#"
                SELECT id, task_id, user_id, action, field_name, old_value,
                       new_value, comment, created_at
                FROM hr_public.task_audit_entries
                WHERE user_id = $1
                ORDER BY created_at DESC
                LIMIT $2
                "#,
            )
            .bind(user_id)
            .bind(limit)
            .fetch_all(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch task audit entries by user: {}", e);
                Error::new("Failed to fetch task audit entries")
            })
        })).await
    }

    /// Get task audit entries by action type
    async fn task_audit_entries_by_action(
        &self,
        ctx: &Context<'_>,
        action: AuditAction,
        limit: Option<i64>,
    ) -> Result<Vec<TaskAuditEntry>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;
        let limit = limit.unwrap_or(100).min(1000);

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, TaskAuditEntry>(
                r#"
                SELECT id, task_id, user_id, action, field_name, old_value,
                       new_value, comment, created_at
                FROM hr_public.task_audit_entries
                WHERE action = $1
                ORDER BY created_at DESC
                LIMIT $2
                "#,
            )
            .bind(action)
            .bind(limit)
            .fetch_all(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch task audit entries by action: {}", e);
                Error::new("Failed to fetch task audit entries")
            })
        })).await
    }

    // ============================================================
    // Task Dependency Queries
    // ============================================================

    /// Get a single task dependency by ID
    async fn task_dependency(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<TaskDependency>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, TaskDependency>(
                r#"
                SELECT id, task_id, depends_on_task_id, dependency_type, lag_days,
                       created_by, created_at, updated_at
                FROM hr_public.task_dependencies
                WHERE id = $1 
                "#,
            )
            .bind(id)
            .fetch_optional(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch task dependency: {}", e);
                Error::new("Failed to fetch task dependency")
            })
        })).await
    }

    /// Get task dependencies by task ID (tasks that depend on this task)
    async fn task_dependencies_by_task(
        &self,
        ctx: &Context<'_>,
        task_id: Uuid,
        limit: Option<i64>,
    ) -> Result<Vec<TaskDependency>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;
        let limit = limit.unwrap_or(100).min(1000);

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, TaskDependency>(
                r#"
                SELECT id, task_id, depends_on_task_id, dependency_type, lag_days,
                       created_by, created_at, updated_at
                FROM hr_public.task_dependencies
                WHERE task_id = $1 
                ORDER BY created_at ASC
                LIMIT $2
                "#,
            )
            .bind(task_id)
            .bind(limit)
            .fetch_all(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch task dependencies by task: {}", e);
                Error::new("Failed to fetch task dependencies")
            })
        })).await
    }

    /// Get task prerequisites by task ID (tasks this task depends on)
    async fn task_prerequisites(
        &self,
        ctx: &Context<'_>,
        depends_on_task_id: Uuid,
        limit: Option<i64>,
    ) -> Result<Vec<TaskDependency>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;
        let limit = limit.unwrap_or(100).min(1000);

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, TaskDependency>(
                r#"
                SELECT id, task_id, depends_on_task_id, dependency_type, lag_days,
                       created_by, created_at, updated_at
                FROM hr_public.task_dependencies
                WHERE depends_on_task_id = $1 
                ORDER BY created_at ASC
                LIMIT $2
                "#,
            )
            .bind(depends_on_task_id)
            .bind(limit)
            .fetch_all(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch task prerequisites: {}", e);
                Error::new("Failed to fetch task prerequisites")
            })
        })).await
    }

    // ============================================================
    // Linked Resource Queries
    // ============================================================

    /// Get a single linked resource by ID
    async fn linked_resource(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<LinkedResource>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, LinkedResource>(
                r#"
                SELECT id, task_id, resource_type, title, url, file_path, file_size,
                       mime_type, description, uploaded_by, created_at, updated_at
                FROM hr_public.linked_resources
                WHERE id = $1 
                "#,
            )
            .bind(id)
            .fetch_optional(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch linked resource: {}", e);
                Error::new("Failed to fetch linked resource")
            })
        })).await
    }

    /// Get linked resources by task ID
    async fn linked_resources_by_task(
        &self,
        ctx: &Context<'_>,
        task_id: Uuid,
        limit: Option<i64>,
    ) -> Result<Vec<LinkedResource>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;
        let limit = limit.unwrap_or(100).min(1000);

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, LinkedResource>(
                r#"
                SELECT id, task_id, resource_type, title, url, file_path, file_size,
                       mime_type, description, uploaded_by, created_at, updated_at
                FROM hr_public.linked_resources
                WHERE task_id = $1 
                ORDER BY created_at DESC
                LIMIT $2
                "#,
            )
            .bind(task_id)
            .bind(limit)
            .fetch_all(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch linked resources by task: {}", e);
                Error::new("Failed to fetch linked resources")
            })
        })).await
    }

    /// Get linked resources by resource type
    async fn linked_resources_by_type(
        &self,
        ctx: &Context<'_>,
        resource_type: ResourceType,
        limit: Option<i64>,
    ) -> Result<Vec<LinkedResource>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;
        let limit = limit.unwrap_or(100).min(1000);

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, LinkedResource>(
                r#"
                SELECT id, task_id, resource_type, title, url, file_path, file_size,
                       mime_type, description, uploaded_by, created_at, updated_at
                FROM hr_public.linked_resources
                WHERE resource_type = $1 
                ORDER BY created_at DESC
                LIMIT $2
                "#,
            )
            .bind(resource_type)
            .bind(limit)
            .fetch_all(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch linked resources by type: {}", e);
                Error::new("Failed to fetch linked resources")
            })
        })).await
    }

    /// Get linked resources by uploader ID
    async fn linked_resources_by_uploader(
        &self,
        ctx: &Context<'_>,
        uploaded_by: Uuid,
        limit: Option<i64>,
    ) -> Result<Vec<LinkedResource>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;
        let limit = limit.unwrap_or(100).min(1000);

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, LinkedResource>(
                r#"
                SELECT id, task_id, resource_type, title, url, file_path, file_size,
                       mime_type, description, uploaded_by, created_at, updated_at
                FROM hr_public.linked_resources
                WHERE uploaded_by = $1 
                ORDER BY created_at DESC
                LIMIT $2
                "#,
            )
            .bind(uploaded_by)
            .bind(limit)
            .fetch_all(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch linked resources by uploader: {}", e);
                Error::new("Failed to fetch linked resources")
            })
        })).await
    }

    // ============================================================
    // Review Cycle Queries
    // ============================================================

    /// Get a single review cycle by ID
    async fn review_cycle(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<ReviewCycle>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, ReviewCycle>(
                r#"
                SELECT id, name, description, review_type, start_date, end_date,
                       status, created_by, created_at, updated_at
                FROM hr_public.review_cycles
                WHERE id = $1 
                "#,
            )
            .bind(id)
            .fetch_optional(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch review cycle: {}", e);
                Error::new("Failed to fetch review cycle")
            })
        })).await
    }

    /// Get all review cycles with pagination
    async fn review_cycles(
        &self,
        ctx: &Context<'_>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<ReviewCycle>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;
        let limit = limit.unwrap_or(100).min(1000);
        let offset = offset.unwrap_or(0);

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, ReviewCycle>(
                r#"
                SELECT id, name, description, review_type, start_date, end_date,
                       status, created_by, created_at, updated_at
                FROM hr_public.review_cycles
                
                ORDER BY start_date DESC
                LIMIT $1 OFFSET $2
                "#,
            )
            .bind(limit)
            .bind(offset)
            .fetch_all(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch review cycles: {}", e);
                Error::new("Failed to fetch review cycles")
            })
        })).await
    }

    /// Get review cycles by type
    async fn review_cycles_by_type(
        &self,
        ctx: &Context<'_>,
        review_type: ReviewType,
        limit: Option<i64>,
    ) -> Result<Vec<ReviewCycle>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;
        let limit = limit.unwrap_or(100).min(1000);

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, ReviewCycle>(
                r#"
                SELECT id, name, description, review_type, start_date, end_date,
                       status, created_by, created_at, updated_at
                FROM hr_public.review_cycles
                WHERE review_type = $1 
                ORDER BY start_date DESC
                LIMIT $2
                "#,
            )
            .bind(review_type)
            .bind(limit)
            .fetch_all(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch review cycles by type: {}", e);
                Error::new("Failed to fetch review cycles by type")
            })
        })).await
    }

    /// Get active review cycles
    async fn active_review_cycles(&self, ctx: &Context<'_>, limit: Option<i64>) -> Result<Vec<ReviewCycle>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;
        let limit = limit.unwrap_or(100).min(1000);

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, ReviewCycle>(
                r#"
                SELECT id, name, description, review_type, start_date, end_date,
                       status, created_by, created_at, updated_at
                FROM hr_public.review_cycles
                WHERE status = 'active' 
                ORDER BY start_date DESC
                LIMIT $1
                "#,
            )
            .bind(limit)
            .fetch_all(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch active review cycles: {}", e);
                Error::new("Failed to fetch active review cycles")
            })
        })).await
    }

    /// Count review cycles
    async fn review_cycles_count(&self, ctx: &Context<'_>, status: Option<ReviewCycleStatus>) -> Result<i64> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;

        session.execute(pool, |tx| Box::pin(async move {
            let count: (i64,) = if let Some(cycle_status) = status {
                sqlx::query_as(
                    "SELECT COUNT(*) FROM hr_public.review_cycles WHERE status = $1 ",
                )
                .bind(cycle_status)
                .fetch_one(&mut **tx.as_mut())
                .await
                .map_err(|e| {
                    tracing::error!("Failed to count review cycles by status: {}", e);
                    Error::new("Failed to count review cycles")
                })?
            } else {
                sqlx::query_as("SELECT COUNT(*) FROM hr_public.review_cycles ")
                    .fetch_one(&mut **tx.as_mut())
                    .await
                    .map_err(|e| {
                        tracing::error!("Failed to count review cycles: {}", e);
                        Error::new("Failed to count review cycles")
                    })?
            };

            Ok(count.0)
        })).await
    }

    // ============================================================
    // Performance Review Queries
    // ============================================================

    /// Get a single performance review by ID
    async fn performance_review(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<PerformanceReview>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, PerformanceReview>(
                r#"
                SELECT id, employee_id, reviewer_id, review_period, status,
                       overall_rating, goals, achievements, areas_for_improvement,
                       manager_feedback, created_at, updated_at,
                       review_period_start, review_period_end, review_type, notes
                FROM hr_public.performance_reviews
                WHERE id = $1
                "#,
            )
            .bind(id)
            .fetch_optional(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch performance review: {}", e);
                Error::new("Failed to fetch performance review")
            })
        })).await
    }

    /// Get all performance reviews with pagination
    async fn performance_reviews(
        &self,
        ctx: &Context<'_>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<PerformanceReview>> {
        let db = get_db_from_context(ctx)?;
        let limit = limit.unwrap_or(100).min(1000);
        let offset = offset.unwrap_or(0);

        let reviews = PerformanceReviewEntity::find()
            .order_by_desc(performance_review::Column::CreatedAt)
            .limit(Some(limit as u64))
            .offset(offset as u64)
            .all(db)
            .await?;

        // Convert SeaORM models to legacy PerformanceReview struct for compatibility
        let reviews = reviews.into_iter().map(|model| PerformanceReview {
            id: model.id,
            employee_id: model.employee_id,
            reviewer_id: model.reviewer_id,
            review_period: model.review_period,
            status: PerformanceReviewStatus::from_str(&model.status).unwrap_or(PerformanceReviewStatus::NotStarted),
            overall_rating: model.overall_rating,
            goals: model.goals,
            achievements: model.achievements,
            areas_for_improvement: model.areas_for_improvement,
            manager_feedback: model.manager_feedback,
            created_at: model.created_at,
            updated_at: model.updated_at,
            review_period_start: model.review_period_start,
            review_period_end: model.review_period_end,
            review_type: model.review_type,
            notes: model.notes,
        }).collect();

        Ok(reviews)
            .map_err(|e| {
                tracing::error!("Failed to fetch performance reviews: {}", e);
                Error::new("Failed to fetch performance reviews")
            })
    }

    /// Get performance reviews by review cycle
    async fn performance_reviews_by_cycle(
        &self,
        ctx: &Context<'_>,
        review_cycle_id: Uuid,
        limit: Option<i64>,
    ) -> Result<Vec<PerformanceReview>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;
        let limit = limit.unwrap_or(100).min(1000);

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, PerformanceReview>(
                r#"
                SELECT id, employee_id, reviewer_id, review_period, status,
                       overall_rating, goals, achievements, areas_for_improvement,
                       manager_feedback, created_at, updated_at,
                       review_period_start, review_period_end, review_type, notes
                FROM hr_public.performance_reviews
                WHERE review_cycle_id = $1
                ORDER BY created_at DESC
                LIMIT $2
                "#,
            )
            .bind(review_cycle_id)
            .bind(limit)
            .fetch_all(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch performance reviews by cycle: {}", e);
                Error::new("Failed to fetch performance reviews by cycle")
            })
        })).await
    }

    /// Get performance reviews by employee
    async fn performance_reviews_by_employee(
        &self,
        ctx: &Context<'_>,
        employee_id: Uuid,
        limit: Option<i64>,
    ) -> Result<Vec<PerformanceReview>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;
        let limit = limit.unwrap_or(100).min(1000);

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, PerformanceReview>(
                r#"
                SELECT id, employee_id, reviewer_id, review_period, status,
                       overall_rating, goals, achievements, areas_for_improvement,
                       manager_feedback, created_at, updated_at,
                       review_period_start, review_period_end, review_type, notes
                FROM hr_public.performance_reviews
                WHERE employee_id = $1
                ORDER BY created_at DESC
                LIMIT $2
                "#,
            )
            .bind(employee_id)
            .bind(limit)
            .fetch_all(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch performance reviews by employee: {}", e);
                Error::new("Failed to fetch performance reviews by employee")
            })
        })).await
    }

    /// Get performance reviews by reviewer
    async fn performance_reviews_by_reviewer(
        &self,
        ctx: &Context<'_>,
        reviewer_id: Uuid,
        limit: Option<i64>,
    ) -> Result<Vec<PerformanceReview>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;
        let limit = limit.unwrap_or(100).min(1000);

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, PerformanceReview>(
                r#"
                SELECT id, employee_id, reviewer_id, review_period, status,
                       overall_rating, goals, achievements, areas_for_improvement,
                       manager_feedback, created_at, updated_at,
                       review_period_start, review_period_end, review_type, notes
                FROM hr_public.performance_reviews
                WHERE reviewer_id = $1
                ORDER BY created_at DESC
                LIMIT $2
                "#,
            )
            .bind(reviewer_id)
            .bind(limit)
            .fetch_all(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch performance reviews by reviewer: {}", e);
                Error::new("Failed to fetch performance reviews by reviewer")
            })
        })).await
    }

    /// Get overdue performance reviews
    async fn overdue_performance_reviews(&self, ctx: &Context<'_>, limit: Option<i64>) -> Result<Vec<PerformanceReview>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;
        let limit = limit.unwrap_or(100).min(1000);

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, PerformanceReview>(
                r#"
                SELECT id, employee_id, reviewer_id, review_period, status,
                       overall_rating, goals, achievements, areas_for_improvement,
                       manager_feedback, created_at, updated_at,
                       review_period_start, review_period_end, review_type, notes
                FROM hr_public.performance_reviews
                WHERE due_date < NOW()
                  AND status NOT IN ('completed', 'cancelled')
                ORDER BY due_date ASC
                LIMIT $1
                "#,
            )
            .bind(limit)
            .fetch_all(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch overdue performance reviews: {}", e);
                Error::new("Failed to fetch overdue performance reviews")
            })
        })).await
    }

    /// Count performance reviews
    async fn performance_reviews_count(
        &self,
        ctx: &Context<'_>,
        status: Option<PerformanceReviewStatus>,
    ) -> Result<i64> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;

        session.execute(pool, |tx| Box::pin(async move {
            let count: (i64,) = if let Some(review_status) = status {
                sqlx::query_as(
                    "SELECT COUNT(*) FROM hr_public.performance_reviews WHERE status = $1 ",
                )
                .bind(review_status)
                .fetch_one(&mut **tx.as_mut())
                .await
                .map_err(|e| {
                    tracing::error!("Failed to count performance reviews by status: {}", e);
                    Error::new("Failed to count performance reviews")
                })?
            } else {
                sqlx::query_as("SELECT COUNT(*) FROM hr_public.performance_reviews ")
                    .fetch_one(&mut **tx.as_mut())
                    .await
                    .map_err(|e| {
                        tracing::error!("Failed to count performance reviews: {}", e);
                        Error::new("Failed to count performance reviews")
                    })?
            };

            Ok(count.0)
        })).await
    }

    // ============================================================
    // Review Goal Queries
    // ============================================================

    /// Get a single review goal by ID
    async fn review_goal(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<ReviewGoal>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, ReviewGoal>(
                r#"
                SELECT id, performance_review_id, title, description, target_date,
                       completion_status, weight, created_at, updated_at
                FROM hr_public.review_goals
                WHERE id = $1 
                "#,
            )
            .bind(id)
            .fetch_optional(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch review goal: {}", e);
                Error::new("Failed to fetch review goal")
            })
        })).await
    }

    /// Get review goals by performance review ID
    async fn review_goals_by_review(
        &self,
        ctx: &Context<'_>,
        performance_review_id: Uuid,
        limit: Option<i64>,
    ) -> Result<Vec<ReviewGoal>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;
        let limit = limit.unwrap_or(100).min(1000);

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, ReviewGoal>(
                r#"
                SELECT id, performance_review_id, title, description, target_date,
                       completion_status, weight, created_at, updated_at
                FROM hr_public.review_goals
                WHERE performance_review_id = $1 
                ORDER BY weight DESC, created_at ASC
                LIMIT $2
                "#,
            )
            .bind(performance_review_id)
            .bind(limit)
            .fetch_all(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch review goals by review: {}", e);
                Error::new("Failed to fetch review goals by review")
            })
        })).await
    }

    /// Count review goals
    async fn review_goals_count(
        &self,
        ctx: &Context<'_>,
        performance_review_id: Uuid,
        completion_status: Option<GoalCompletionStatus>,
    ) -> Result<i64> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;

        session.execute(pool, |tx| Box::pin(async move {
            let count: (i64,) = if let Some(status) = completion_status {
                sqlx::query_as(
                    "SELECT COUNT(*) FROM hr_public.review_goals WHERE performance_review_id = $1 AND completion_status = $2 ",
                )
                .bind(performance_review_id)
                .bind(status)
                .fetch_one(&mut **tx.as_mut())
                .await
                .map_err(|e| {
                    tracing::error!("Failed to count review goals by status: {}", e);
                    Error::new("Failed to count review goals")
                })?
            } else {
                sqlx::query_as(
                    "SELECT COUNT(*) FROM hr_public.review_goals WHERE performance_review_id = $1 ",
                )
                .bind(performance_review_id)
                .fetch_one(&mut **tx.as_mut())
                .await
                .map_err(|e| {
                    tracing::error!("Failed to count review goals: {}", e);
                    Error::new("Failed to count review goals")
                })?
            };

            Ok(count.0)
        })).await
    }

    // ============================================================
    // Review Feedback Queries
    // ============================================================

    /// Get a single review feedback by ID
    async fn review_feedback(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<ReviewFeedback>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, ReviewFeedback>(
                r#"
                SELECT id, performance_review_id, provider_id, feedback_type,
                       content, is_visible_to_employee, created_at, updated_at
                FROM hr_public.review_feedback
                WHERE id = $1 
                "#,
            )
            .bind(id)
            .fetch_optional(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch review feedback: {}", e);
                Error::new("Failed to fetch review feedback")
            })
        })).await
    }

    /// Get review feedback by performance review ID
    async fn review_feedback_by_review(
        &self,
        ctx: &Context<'_>,
        performance_review_id: Uuid,
        limit: Option<i64>,
    ) -> Result<Vec<ReviewFeedback>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;
        let limit = limit.unwrap_or(100).min(1000);

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, ReviewFeedback>(
                r#"
                SELECT id, performance_review_id, provider_id, feedback_type,
                       content, is_visible_to_employee, created_at, updated_at
                FROM hr_public.review_feedback
                WHERE performance_review_id = $1 
                ORDER BY created_at ASC
                LIMIT $2
                "#,
            )
            .bind(performance_review_id)
            .bind(limit)
            .fetch_all(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch review feedback by review: {}", e);
                Error::new("Failed to fetch review feedback by review")
            })
        })).await
    }

    /// Get review feedback by provider ID
    async fn review_feedback_by_provider(
        &self,
        ctx: &Context<'_>,
        provider_id: Uuid,
        limit: Option<i64>,
    ) -> Result<Vec<ReviewFeedback>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;
        let limit = limit.unwrap_or(100).min(1000);

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, ReviewFeedback>(
                r#"
                SELECT id, performance_review_id, provider_id, feedback_type,
                       content, is_visible_to_employee, created_at, updated_at
                FROM hr_public.review_feedback
                WHERE provider_id = $1 
                ORDER BY created_at DESC
                LIMIT $2
                "#,
            )
            .bind(provider_id)
            .bind(limit)
            .fetch_all(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch review feedback by provider: {}", e);
                Error::new("Failed to fetch review feedback by provider")
            })
        })).await
    }

    /// Count review feedback
    async fn review_feedback_count(
        &self,
        ctx: &Context<'_>,
        performance_review_id: Uuid,
        feedback_type: Option<FeedbackType>,
    ) -> Result<i64> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;

        session.execute(pool, |tx| Box::pin(async move {
            let count: (i64,) = if let Some(fb_type) = feedback_type {
                sqlx::query_as(
                    "SELECT COUNT(*) FROM hr_public.review_feedback WHERE performance_review_id = $1 AND feedback_type = $2 ",
                )
                .bind(performance_review_id)
                .bind(fb_type)
                .fetch_one(&mut **tx.as_mut())
                .await
                .map_err(|e| {
                    tracing::error!("Failed to count review feedback by type: {}", e);
                    Error::new("Failed to count review feedback")
                })?
            } else {
                sqlx::query_as(
                    "SELECT COUNT(*) FROM hr_public.review_feedback WHERE performance_review_id = $1 ",
                )
                .bind(performance_review_id)
                .fetch_one(&mut **tx.as_mut())
                .await
                .map_err(|e| {
                    tracing::error!("Failed to count review feedback: {}", e);
                    Error::new("Failed to count review feedback")
                })?
            };

            Ok(count.0)
        })).await
    }

    // ============================================================
    // Notification Queries
    // ============================================================

    /// Get a single notification by ID
    /// Get a single notification by ID (with RLS enforcement)
    async fn notification(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<Notification>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;
        let user_id = session.user_id(); // Capture before moving into closure

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, Notification>(
                r#"
                SELECT id, recipient_id, type, category, title, message,
                       related_resource_type, related_resource_id, read_status,
                       delivered_at, read_at, created_at
                FROM hr_public.notifications
                WHERE id = $1 AND recipient_id = $2
                "#,
            )
            .bind(id)
            .bind(user_id) // Use captured value
            .fetch_optional(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch notification: {}", e);
                Error::new("Failed to fetch notification")
            })
        })).await
    }

    /// Get notifications by recipient ID with optional filters (with RLS enforcement)
    async fn notifications(
        &self,
        ctx: &Context<'_>,
        recipient_id: Option<Uuid>, // Made optional - defaults to authenticated user
        read_status: Option<bool>,
        notification_type: Option<NotificationType>,
        category: Option<NotificationCategory>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<Notification>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;

        // Security: Use authenticated user's ID if not specified, or if specified user is not self
        let effective_recipient_id = recipient_id.unwrap_or(session.user_id());

        // Enforce: users can only query their own notifications unless they have admin permissions
        if effective_recipient_id != session.user_id() && !session.has_wildcard_permission() {
            return Err(Error::new("Access denied: can only view your own notifications")
                .extend_with(|_, e| e.set("code", "FORBIDDEN")));
        }

        let limit = limit.unwrap_or(20).min(100); // Default 20, max 100 for notifications
        let offset = offset.unwrap_or(0);

        session.execute(pool, |tx| Box::pin(async move {
            let mut query_builder = sqlx::QueryBuilder::new(
                r#"
                SELECT id, recipient_id, type, category, title, message,
                       related_resource_type, related_resource_id, read_status,
                       delivered_at, read_at, created_at
                FROM hr_public.notifications
                WHERE recipient_id =
                "#,
            );
            query_builder.push_bind(effective_recipient_id);

            // Apply optional filters
            if let Some(is_read) = read_status {
                query_builder.push(" AND read_status = ");
                query_builder.push_bind(is_read);
            }

            if let Some(notif_type) = notification_type {
                query_builder.push(" AND type = ");
                query_builder.push_bind(notif_type);
            }

            if let Some(notif_category) = category {
                query_builder.push(" AND category = ");
                query_builder.push_bind(notif_category);
            }

            // Add ordering and pagination
            query_builder.push(" ORDER BY created_at DESC LIMIT ");
            query_builder.push_bind(limit);
            query_builder.push(" OFFSET ");
            query_builder.push_bind(offset);

            query_builder
                .build_query_as::<Notification>()
                .fetch_all(&mut **tx.as_mut())
                .await
                .map_err(|e| {
                    tracing::error!("Failed to fetch notifications: {}", e);
                    Error::new("Failed to fetch notifications")
                })
        })).await
    }

    /// Get unread notifications by recipient ID (with RLS enforcement)
    async fn unread_notifications(
        &self,
        ctx: &Context<'_>,
        recipient_id: Option<Uuid>, // Made optional - defaults to authenticated user
        limit: Option<i64>,
    ) -> Result<Vec<Notification>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;

        let effective_recipient_id = recipient_id.unwrap_or(session.user_id());

        // Security check
        if effective_recipient_id != session.user_id() && !session.has_wildcard_permission() {
            return Err(Error::new("Access denied: can only view your own notifications")
                .extend_with(|_, e| e.set("code", "FORBIDDEN")));
        }

        let limit = limit.unwrap_or(20).min(100);

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, Notification>(
                r#"
                SELECT id, recipient_id, type, category, title, message,
                       related_resource_type, related_resource_id, read_status,
                       delivered_at, read_at, created_at
                FROM hr_public.notifications
                WHERE recipient_id = $1 AND read_status = FALSE
                ORDER BY created_at DESC
                LIMIT $2
                "#,
            )
            .bind(effective_recipient_id)
            .bind(limit)
            .fetch_all(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch unread notifications: {}", e);
                Error::new("Failed to fetch unread notifications")
            })
        })).await
    }

    /// Get notifications by type
    async fn notifications_by_type(
        &self,
        ctx: &Context<'_>,
        recipient_id: Uuid,
        notification_type: NotificationType,
        limit: Option<i64>,
    ) -> Result<Vec<Notification>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(20).min(100);

        let notifications = sqlx::query_as::<_, Notification>(
            r#"
            SELECT id, recipient_id, type, category, title, message,
                   related_resource_type, related_resource_id, read_status,
                   delivered_at, read_at, created_at
            FROM hr_public.notifications
            WHERE recipient_id = $1 AND type = $2
            ORDER BY created_at DESC
            LIMIT $3
            "#,
        )
        .bind(recipient_id)
        .bind(notification_type)
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Ok(notifications)
    }

    /// Get notifications by category
    async fn notifications_by_category(
        &self,
        ctx: &Context<'_>,
        recipient_id: Uuid,
        category: NotificationCategory,
        limit: Option<i64>,
    ) -> Result<Vec<Notification>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(20).min(100);

        let notifications = sqlx::query_as::<_, Notification>(
            r#"
            SELECT id, recipient_id, type, category, title, message,
                   related_resource_type, related_resource_id, read_status,
                   delivered_at, read_at, created_at
            FROM hr_public.notifications
            WHERE recipient_id = $1 AND category = $2
            ORDER BY created_at DESC
            LIMIT $3
            "#,
        )
        .bind(recipient_id)
        .bind(category)
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Ok(notifications)
    }

    /// Get notifications by related resource
    async fn notifications_by_resource(
        &self,
        ctx: &Context<'_>,
        recipient_id: Uuid,
        resource_type: NotificationResourceType,
        resource_id: Uuid,
        limit: Option<i64>,
    ) -> Result<Vec<Notification>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(20).min(100);

        let notifications = sqlx::query_as::<_, Notification>(
            r#"
            SELECT id, recipient_id, type, category, title, message,
                   related_resource_type, related_resource_id, read_status,
                   delivered_at, read_at, created_at
            FROM hr_public.notifications
            WHERE recipient_id = $1
              AND related_resource_type = $2
              AND related_resource_id = $3
            ORDER BY created_at DESC
            LIMIT $4
            "#,
        )
        .bind(recipient_id)
        .bind(resource_type)
        .bind(resource_id)
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Ok(notifications)
    }

    /// Count unread notifications for a user (with RLS enforcement)
    async fn unread_notifications_count(
        &self,
        ctx: &Context<'_>,
        recipient_id: Option<Uuid>, // Made optional - defaults to authenticated user
    ) -> Result<i64> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;

        let effective_recipient_id = recipient_id.unwrap_or(session.user_id());

        // Security check
        if effective_recipient_id != session.user_id() && !session.has_wildcard_permission() {
            return Err(Error::new("Access denied: can only view your own notification count")
                .extend_with(|_, e| e.set("code", "FORBIDDEN")));
        }

        session.execute(pool, |tx| Box::pin(async move {
            let count: (i64,) = sqlx::query_as(
                "SELECT COUNT(*) FROM hr_public.notifications WHERE recipient_id = $1 AND read_status = FALSE"
            )
            .bind(effective_recipient_id)
            .fetch_one(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to count unread notifications: {}", e);
                Error::new("Failed to count unread notifications")
            })?;

            Ok(count.0)
        })).await
    }

    /// Count total notifications for a user
    async fn notifications_count(
        &self,
        ctx: &Context<'_>,
        recipient_id: Uuid,
        read_status: Option<bool>,
    ) -> Result<i64> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let count: (i64,) = if let Some(is_read) = read_status {
            sqlx::query_as(
                "SELECT COUNT(*) FROM hr_public.notifications WHERE recipient_id = $1 AND read_status = $2"
            )
            .bind(recipient_id)
            .bind(is_read)
            .fetch_one(pool)
            .await?
        } else {
            sqlx::query_as(
                "SELECT COUNT(*) FROM hr_public.notifications WHERE recipient_id = $1"
            )
            .bind(recipient_id)
            .fetch_one(pool)
            .await?
        };

        Ok(count.0)
    }

    // ============================================================
    // Employee Skill Queries
    // ============================================================

    /// Get a single employee skill by ID
    async fn employee_skill(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<EmployeeSkill>> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let skill = sqlx::query_as::<_, EmployeeSkill>(
            r#"
            SELECT id, employee_id, skill_name, proficiency_level, years_experience,
                   verified, verifier_id, created_at, updated_at
            FROM hr_public.employee_skills
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(pool)
        .await?;

        Ok(skill)
    }

    /// Get all employee skills with pagination
    async fn employee_skills(
        &self,
        ctx: &Context<'_>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<EmployeeSkill>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);
        let offset = offset.unwrap_or(0);

        let skills = sqlx::query_as::<_, EmployeeSkill>(
            r#"
            SELECT id, employee_id, skill_name, proficiency_level, years_experience,
                   verified, verifier_id, created_at, updated_at
            FROM hr_public.employee_skills
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
            "#,
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(pool)
        .await?;

        Ok(skills)
    }

    /// Get employee skills by employee ID
    async fn employee_skills_by_employee(
        &self,
        ctx: &Context<'_>,
        employee_id: Uuid,
        limit: Option<i64>,
    ) -> Result<Vec<EmployeeSkill>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);

        let skills = sqlx::query_as::<_, EmployeeSkill>(
            r#"
            SELECT id, employee_id, skill_name, proficiency_level, years_experience,
                   verified, verifier_id, created_at, updated_at
            FROM hr_public.employee_skills
            WHERE employee_id = $1
            ORDER BY proficiency_level DESC, skill_name ASC
            LIMIT $2
            "#,
        )
        .bind(employee_id)
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Ok(skills)
    }

    /// Get employee skills by proficiency level
    async fn employee_skills_by_proficiency(
        &self,
        ctx: &Context<'_>,
        proficiency_level: ProficiencyLevel,
        limit: Option<i64>,
    ) -> Result<Vec<EmployeeSkill>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);

        let skills = sqlx::query_as::<_, EmployeeSkill>(
            r#"
            SELECT id, employee_id, skill_name, proficiency_level, years_experience,
                   verified, verifier_id, created_at, updated_at
            FROM hr_public.employee_skills
            WHERE proficiency_level = $1
            ORDER BY years_experience DESC, skill_name ASC
            LIMIT $2
            "#,
        )
        .bind(proficiency_level)
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Ok(skills)
    }

    /// Get verified employee skills
    async fn verified_employee_skills(
        &self,
        ctx: &Context<'_>,
        verified: bool,
        limit: Option<i64>,
    ) -> Result<Vec<EmployeeSkill>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);

        let skills = sqlx::query_as::<_, EmployeeSkill>(
            r#"
            SELECT id, employee_id, skill_name, proficiency_level, years_experience,
                   verified, verifier_id, created_at, updated_at
            FROM hr_public.employee_skills
            WHERE verified = $1
            ORDER BY created_at DESC
            LIMIT $2
            "#,
        )
        .bind(verified)
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Ok(skills)
    }

    /// Count employee skills
    async fn employee_skills_count(
        &self,
        ctx: &Context<'_>,
        employee_id: Option<Uuid>,
    ) -> Result<i64> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let count: (i64,) = if let Some(emp_id) = employee_id {
            sqlx::query_as(
                "SELECT COUNT(*) FROM hr_public.employee_skills WHERE employee_id = $1"
            )
            .bind(emp_id)
            .fetch_one(pool)
            .await?
        } else {
            sqlx::query_as("SELECT COUNT(*) FROM hr_public.employee_skills")
                .fetch_one(pool)
                .await?
        };

        Ok(count.0)
    }

    // ============================================================
    // Employee Certification Queries
    // ============================================================

    /// Get a single employee certification by ID
    async fn employee_certification(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
    ) -> Result<Option<EmployeeCertification>> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let certification = sqlx::query_as::<_, EmployeeCertification>(
            r#"
            SELECT id, employee_id, certification_name, issuing_organization,
                   issue_date, expiration_date, certification_number,
                   created_at, updated_at
            FROM hr_public.employee_certifications
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(pool)
        .await?;

        Ok(certification)
    }

    /// Get all employee certifications with pagination
    async fn employee_certifications(
        &self,
        ctx: &Context<'_>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<EmployeeCertification>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);
        let offset = offset.unwrap_or(0);

        let certifications = sqlx::query_as::<_, EmployeeCertification>(
            r#"
            SELECT id, employee_id, certification_name, issuing_organization,
                   issue_date, expiration_date, certification_number,
                   created_at, updated_at
            FROM hr_public.employee_certifications
            ORDER BY issue_date DESC
            LIMIT $1 OFFSET $2
            "#,
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(pool)
        .await?;

        Ok(certifications)
    }

    /// Get employee certifications by employee ID
    async fn employee_certifications_by_employee(
        &self,
        ctx: &Context<'_>,
        employee_id: Uuid,
        limit: Option<i64>,
    ) -> Result<Vec<EmployeeCertification>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);

        let certifications = sqlx::query_as::<_, EmployeeCertification>(
            r#"
            SELECT id, employee_id, certification_name, issuing_organization,
                   issue_date, expiration_date, certification_number,
                   created_at, updated_at
            FROM hr_public.employee_certifications
            WHERE employee_id = $1
            ORDER BY issue_date DESC
            LIMIT $2
            "#,
        )
        .bind(employee_id)
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Ok(certifications)
    }

    /// Get expiring certifications (within 90 days)
    async fn expiring_certifications(
        &self,
        ctx: &Context<'_>,
        limit: Option<i64>,
    ) -> Result<Vec<EmployeeCertification>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);

        let certifications = sqlx::query_as::<_, EmployeeCertification>(
            r#"
            SELECT id, employee_id, certification_name, issuing_organization,
                   issue_date, expiration_date, certification_number,
                   created_at, updated_at
            FROM hr_public.employee_certifications
            WHERE expiration_date IS NOT NULL
              AND expiration_date <= CURRENT_DATE + INTERVAL '90 days'
              AND expiration_date >= CURRENT_DATE
            ORDER BY expiration_date ASC
            LIMIT $1
            "#,
        )
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Ok(certifications)
    }

    /// Get expired certifications
    async fn expired_certifications(
        &self,
        ctx: &Context<'_>,
        limit: Option<i64>,
    ) -> Result<Vec<EmployeeCertification>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);

        let certifications = sqlx::query_as::<_, EmployeeCertification>(
            r#"
            SELECT id, employee_id, certification_name, issuing_organization,
                   issue_date, expiration_date, certification_number,
                   created_at, updated_at
            FROM hr_public.employee_certifications
            WHERE expiration_date IS NOT NULL
              AND expiration_date < CURRENT_DATE
            ORDER BY expiration_date DESC
            LIMIT $1
            "#,
        )
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Ok(certifications)
    }

    /// Count employee certifications
    async fn employee_certifications_count(
        &self,
        ctx: &Context<'_>,
        employee_id: Option<Uuid>,
    ) -> Result<i64> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let count: (i64,) = if let Some(emp_id) = employee_id {
            sqlx::query_as(
                "SELECT COUNT(*) FROM hr_public.employee_certifications WHERE employee_id = $1"
            )
            .bind(emp_id)
            .fetch_one(pool)
            .await?
        } else {
            sqlx::query_as("SELECT COUNT(*) FROM hr_public.employee_certifications")
                .fetch_one(pool)
                .await?
        };

        Ok(count.0)
    }

    // ============================================================
    // Employee Vehicle Queries
    // ============================================================

    /// Get a single employee vehicle by ID
    async fn employee_vehicle(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
    ) -> Result<Option<EmployeeVehicle>> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let vehicle = sqlx::query_as::<_, EmployeeVehicle>(
            r#"
            SELECT id, employee_id, make, model, year, license_plate, color,
                   created_at, updated_at
            FROM hr_public.employee_vehicles
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(pool)
        .await?;

        Ok(vehicle)
    }

    /// Get all employee vehicles with pagination
    async fn employee_vehicles(
        &self,
        ctx: &Context<'_>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<EmployeeVehicle>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);
        let offset = offset.unwrap_or(0);

        let vehicles = sqlx::query_as::<_, EmployeeVehicle>(
            r#"
            SELECT id, employee_id, make, model, year, license_plate, color,
                   created_at, updated_at
            FROM hr_public.employee_vehicles
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
            "#,
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(pool)
        .await?;

        Ok(vehicles)
    }

    /// Get employee vehicles by employee ID
    async fn employee_vehicles_by_employee(
        &self,
        ctx: &Context<'_>,
        employee_id: Uuid,
        limit: Option<i64>,
    ) -> Result<Vec<EmployeeVehicle>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);

        let vehicles = sqlx::query_as::<_, EmployeeVehicle>(
            r#"
            SELECT id, employee_id, make, model, year, license_plate, color,
                   created_at, updated_at
            FROM hr_public.employee_vehicles
            WHERE employee_id = $1
            ORDER BY year DESC, make ASC
            LIMIT $2
            "#,
        )
        .bind(employee_id)
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Ok(vehicles)
    }

    /// Count employee vehicles
    async fn employee_vehicles_count(
        &self,
        ctx: &Context<'_>,
        employee_id: Option<Uuid>,
    ) -> Result<i64> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let count: (i64,) = if let Some(emp_id) = employee_id {
            sqlx::query_as(
                "SELECT COUNT(*) FROM hr_public.employee_vehicles WHERE employee_id = $1"
            )
            .bind(emp_id)
            .fetch_one(pool)
            .await?
        } else {
            sqlx::query_as("SELECT COUNT(*) FROM hr_public.employee_vehicles")
                .fetch_one(pool)
                .await?
        };

        Ok(count.0)
    }

    // ============================================================
    // Emergency Contact Queries
    // ============================================================

    /// Get a single emergency contact by ID
    async fn emergency_contact(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
    ) -> Result<Option<EmergencyContact>> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let contact = sqlx::query_as::<_, EmergencyContact>(
            r#"
            SELECT id, employee_id, contact_name, relationship, phone_number,
                   email, is_primary, created_at, updated_at
            FROM hr_public.emergency_contacts
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(pool)
        .await?;

        Ok(contact)
    }

    /// Get all emergency contacts with pagination
    async fn emergency_contacts(
        &self,
        ctx: &Context<'_>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<EmergencyContact>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);
        let offset = offset.unwrap_or(0);

        let contacts = sqlx::query_as::<_, EmergencyContact>(
            r#"
            SELECT id, employee_id, contact_name, relationship, phone_number,
                   email, is_primary, created_at, updated_at
            FROM hr_public.emergency_contacts
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
            "#,
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(pool)
        .await?;

        Ok(contacts)
    }

    /// Get emergency contacts by employee ID
    async fn emergency_contacts_by_employee(
        &self,
        ctx: &Context<'_>,
        employee_id: Uuid,
        limit: Option<i64>,
    ) -> Result<Vec<EmergencyContact>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);

        let contacts = sqlx::query_as::<_, EmergencyContact>(
            r#"
            SELECT id, employee_id, contact_name, relationship, phone_number,
                   email, is_primary, created_at, updated_at
            FROM hr_public.emergency_contacts
            WHERE employee_id = $1
            ORDER BY is_primary DESC, contact_name ASC
            LIMIT $2
            "#,
        )
        .bind(employee_id)
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Ok(contacts)
    }

    /// Get primary emergency contact for an employee
    async fn primary_emergency_contact(
        &self,
        ctx: &Context<'_>,
        employee_id: Uuid,
    ) -> Result<Option<EmergencyContact>> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let contact = sqlx::query_as::<_, EmergencyContact>(
            r#"
            SELECT id, employee_id, contact_name, relationship, phone_number,
                   email, is_primary, created_at, updated_at
            FROM hr_public.emergency_contacts
            WHERE employee_id = $1 AND is_primary = TRUE
            LIMIT 1
            "#,
        )
        .bind(employee_id)
        .fetch_optional(pool)
        .await?;

        Ok(contact)
    }

    /// Count emergency contacts
    async fn emergency_contacts_count(
        &self,
        ctx: &Context<'_>,
        employee_id: Option<Uuid>,
    ) -> Result<i64> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let count: (i64,) = if let Some(emp_id) = employee_id {
            sqlx::query_as(
                "SELECT COUNT(*) FROM hr_public.emergency_contacts WHERE employee_id = $1"
            )
            .bind(emp_id)
            .fetch_one(pool)
            .await?
        } else {
            sqlx::query_as("SELECT COUNT(*) FROM hr_public.emergency_contacts")
                .fetch_one(pool)
                .await?
        };

        Ok(count.0)
    }

    // ============================================================
    // Employee Goal Queries
    // ============================================================

    /// Get a single employee goal by ID
    async fn employee_goal(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<EmployeeGoal>> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let goal = sqlx::query_as::<_, EmployeeGoal>(
            r#"
            SELECT id, employee_id, goal_title, goal_description, target_date,
                   status, progress_percentage, created_at, updated_at
            FROM hr_public.employee_goals
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(pool)
        .await?;

        Ok(goal)
    }

    /// Get all employee goals with pagination
    async fn employee_goals(
        &self,
        ctx: &Context<'_>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<EmployeeGoal>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);
        let offset = offset.unwrap_or(0);

        let goals = sqlx::query_as::<_, EmployeeGoal>(
            r#"
            SELECT id, employee_id, goal_title, goal_description, target_date,
                   status, progress_percentage, created_at, updated_at
            FROM hr_public.employee_goals
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
            "#,
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(pool)
        .await?;

        Ok(goals)
    }

    /// Get employee goals by employee ID
    async fn employee_goals_by_employee(
        &self,
        ctx: &Context<'_>,
        employee_id: Uuid,
        limit: Option<i64>,
    ) -> Result<Vec<EmployeeGoal>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);

        let goals = sqlx::query_as::<_, EmployeeGoal>(
            r#"
            SELECT id, employee_id, goal_title, goal_description, target_date,
                   status, progress_percentage, created_at, updated_at
            FROM hr_public.employee_goals
            WHERE employee_id = $1
            ORDER BY status ASC, target_date ASC
            LIMIT $2
            "#,
        )
        .bind(employee_id)
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Ok(goals)
    }

    /// Get employee goals by status
    async fn employee_goals_by_status(
        &self,
        ctx: &Context<'_>,
        status: GoalStatus,
        limit: Option<i64>,
    ) -> Result<Vec<EmployeeGoal>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);

        let goals = sqlx::query_as::<_, EmployeeGoal>(
            r#"
            SELECT id, employee_id, goal_title, goal_description, target_date,
                   status, progress_percentage, created_at, updated_at
            FROM hr_public.employee_goals
            WHERE status = $1
            ORDER BY target_date ASC, progress_percentage DESC
            LIMIT $2
            "#,
        )
        .bind(status)
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Ok(goals)
    }

    /// Get overdue employee goals
    async fn overdue_employee_goals(
        &self,
        ctx: &Context<'_>,
        limit: Option<i64>,
    ) -> Result<Vec<EmployeeGoal>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);

        let goals = sqlx::query_as::<_, EmployeeGoal>(
            r#"
            SELECT id, employee_id, goal_title, goal_description, target_date,
                   status, progress_percentage, created_at, updated_at
            FROM hr_public.employee_goals
            WHERE target_date IS NOT NULL
              AND target_date < CURRENT_DATE
              AND status NOT IN ('completed', 'cancelled')
            ORDER BY target_date ASC
            LIMIT $1
            "#,
        )
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Ok(goals)
    }

    /// Count employee goals
    async fn employee_goals_count(
        &self,
        ctx: &Context<'_>,
        employee_id: Option<Uuid>,
        status: Option<GoalStatus>,
    ) -> Result<i64> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let count: (i64,) = match (employee_id, status) {
            (Some(emp_id), Some(goal_status)) => {
                sqlx::query_as(
                    "SELECT COUNT(*) FROM hr_public.employee_goals WHERE employee_id = $1 AND status = $2"
                )
                .bind(emp_id)
                .bind(goal_status)
                .fetch_one(pool)
                .await?
            }
            (Some(emp_id), None) => {
                sqlx::query_as(
                    "SELECT COUNT(*) FROM hr_public.employee_goals WHERE employee_id = $1"
                )
                .bind(emp_id)
                .fetch_one(pool)
                .await?
            }
            (None, Some(goal_status)) => {
                sqlx::query_as(
                    "SELECT COUNT(*) FROM hr_public.employee_goals WHERE status = $1"
                )
                .bind(goal_status)
                .fetch_one(pool)
                .await?
            }
            (None, None) => {
                sqlx::query_as("SELECT COUNT(*) FROM hr_public.employee_goals")
                    .fetch_one(pool)
                    .await?
            }
        };

        Ok(count.0)
    }

    // ============================================================
    // Document Queries
    // ============================================================

    /// Get a single document by ID
    async fn document(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<Document>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, Document>(
                r#"
                SELECT id, title, description, category_id, file_path, file_size,
                       mime_type, uploader_id, created_at, updated_at
                FROM hr_public.documents
                WHERE id = $1 
                "#,
            )
            .bind(id)
            .fetch_optional(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch document: {}", e);
                Error::new("Failed to fetch document")
            })
        })).await
    }

    /// Get all documents with pagination
    async fn documents(
        &self,
        ctx: &Context<'_>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<Document>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;
        let limit = limit.unwrap_or(100).min(1000);
        let offset = offset.unwrap_or(0);

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, Document>(
                r#"
                SELECT id, title, description, category_id, file_path, file_size,
                       mime_type, uploader_id, created_at, updated_at
                FROM hr_public.documents
                
                ORDER BY created_at DESC
                LIMIT $1 OFFSET $2
                "#,
            )
            .bind(limit)
            .bind(offset)
            .fetch_all(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch documents: {}", e);
                Error::new("Failed to fetch documents")
            })
        })).await
    }

    /// Get documents by category ID
    async fn documents_by_category(
        &self,
        ctx: &Context<'_>,
        category_id: Uuid,
        limit: Option<i64>,
    ) -> Result<Vec<Document>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;
        let limit = limit.unwrap_or(100).min(1000);

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, Document>(
                r#"
                SELECT id, title, description, category_id, file_path, file_size,
                       mime_type, uploader_id, created_at, updated_at
                FROM hr_public.documents
                WHERE category_id = $1 
                ORDER BY title ASC
                LIMIT $2
                "#,
            )
            .bind(category_id)
            .bind(limit)
            .fetch_all(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch documents by category: {}", e);
                Error::new("Failed to fetch documents")
            })
        })).await
    }

    /// Get documents by uploader ID
    async fn documents_by_uploader(
        &self,
        ctx: &Context<'_>,
        uploader_id: Uuid,
        limit: Option<i64>,
    ) -> Result<Vec<Document>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;
        let limit = limit.unwrap_or(100).min(1000);

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, Document>(
                r#"
                SELECT id, title, description, category_id, file_path, file_size,
                       mime_type, uploader_id, created_at, updated_at
                FROM hr_public.documents
                WHERE uploader_id = $1 
                ORDER BY created_at DESC
                LIMIT $2
                "#,
            )
            .bind(uploader_id)
            .bind(limit)
            .fetch_all(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch documents by uploader: {}", e);
                Error::new("Failed to fetch documents")
            })
        })).await
    }

    /// Count documents
    async fn documents_count(
        &self,
        ctx: &Context<'_>,
        category_id: Option<Uuid>,
    ) -> Result<i64> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;

        session.execute(pool, |tx| Box::pin(async move {
            let count: (i64,) = if let Some(cat_id) = category_id {
                sqlx::query_as(
                    "SELECT COUNT(*) FROM hr_public.documents WHERE category_id = $1 "
                )
                .bind(cat_id)
                .fetch_one(&mut **tx.as_mut())
                .await
                .map_err(|e| {
                    tracing::error!("Failed to count documents by category: {}", e);
                    Error::new("Failed to count documents")
                })?
            } else {
                sqlx::query_as("SELECT COUNT(*) FROM hr_public.documents ")
                    .fetch_one(&mut **tx.as_mut())
                    .await
                    .map_err(|e| {
                        tracing::error!("Failed to count documents: {}", e);
                        Error::new("Failed to count documents")
                    })?
            };

            Ok(count.0)
        })).await
    }

    // ============================================================
    // Document Version Queries
    // ============================================================

    /// Get a single document version by ID
    async fn document_version(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
    ) -> Result<Option<DocumentVersion>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, DocumentVersion>(
                r#"
                SELECT id, document_id, version_number, file_path, file_size,
                       uploader_id, change_summary, created_at
                FROM hr_public.document_versions
                WHERE id = $1
                "#,
            )
            .bind(id)
            .fetch_optional(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch document version: {}", e);
                Error::new("Failed to fetch document version")
            })
        })).await
    }

    /// Get document versions by document ID
    async fn document_versions_by_document(
        &self,
        ctx: &Context<'_>,
        document_id: Uuid,
        limit: Option<i64>,
    ) -> Result<Vec<DocumentVersion>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;
        let limit = limit.unwrap_or(100).min(1000);

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, DocumentVersion>(
                r#"
                SELECT id, document_id, version_number, file_path, file_size,
                       uploader_id, change_summary, created_at
                FROM hr_public.document_versions
                WHERE document_id = $1
                ORDER BY version_number DESC
                LIMIT $2
                "#,
            )
            .bind(document_id)
            .bind(limit)
            .fetch_all(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch document versions: {}", e);
                Error::new("Failed to fetch document versions")
            })
        })).await
    }

    /// Get latest document version
    async fn latest_document_version(
        &self,
        ctx: &Context<'_>,
        document_id: Uuid,
    ) -> Result<Option<DocumentVersion>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, DocumentVersion>(
                r#"
                SELECT id, document_id, version_number, file_path, file_size,
                       uploader_id, change_summary, created_at
                FROM hr_public.document_versions
                WHERE document_id = $1
                ORDER BY version_number DESC
                LIMIT 1
                "#,
            )
            .bind(document_id)
            .fetch_optional(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch latest document version: {}", e);
                Error::new("Failed to fetch latest document version")
            })
        })).await
    }

    /// Count document versions
    async fn document_versions_count(
        &self,
        ctx: &Context<'_>,
        document_id: Uuid,
    ) -> Result<i64> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;

        session.execute(pool, |tx| Box::pin(async move {
            let count: (i64,) = sqlx::query_as(
                "SELECT COUNT(*) FROM hr_public.document_versions WHERE document_id = $1"
            )
            .bind(document_id)
            .fetch_one(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to count document versions: {}", e);
                Error::new("Failed to count document versions")
            })?;

            Ok(count.0)
        })).await
    }

    // ============================================================
    // Document Category Queries
    // ============================================================

    /// Get a single document category by ID
    async fn document_category(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
    ) -> Result<Option<DocumentCategory>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, DocumentCategory>(
                r#"
                SELECT id, name, description, parent_category_id,
                       created_at, updated_at
                FROM hr_public.document_categories
                WHERE id = $1 
                "#,
            )
            .bind(id)
            .fetch_optional(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch document category: {}", e);
                Error::new("Failed to fetch document category")
            })
        })).await
    }

    /// Get all document categories with pagination
    async fn document_categories(
        &self,
        ctx: &Context<'_>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<DocumentCategory>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;
        let limit = limit.unwrap_or(100).min(1000);
        let offset = offset.unwrap_or(0);

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, DocumentCategory>(
                r#"
                SELECT id, name, description, parent_category_id,
                       created_at, updated_at
                FROM hr_public.document_categories
                
                ORDER BY name ASC
                LIMIT $1 OFFSET $2
                "#,
            )
            .bind(limit)
            .bind(offset)
            .fetch_all(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch document categories: {}", e);
                Error::new("Failed to fetch document categories")
            })
        })).await
    }

    /// Get child document categories by parent ID
    async fn document_categories_by_parent(
        &self,
        ctx: &Context<'_>,
        parent_category_id: Uuid,
        limit: Option<i64>,
    ) -> Result<Vec<DocumentCategory>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;
        let limit = limit.unwrap_or(100).min(1000);

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, DocumentCategory>(
                r#"
                SELECT id, name, description, parent_category_id,
                       created_at, updated_at
                FROM hr_public.document_categories
                WHERE parent_category_id = $1 
                ORDER BY name ASC
                LIMIT $2
                "#,
            )
            .bind(parent_category_id)
            .bind(limit)
            .fetch_all(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch document categories by parent: {}", e);
                Error::new("Failed to fetch document categories")
            })
        })).await
    }

    /// Get root document categories (no parent)
    async fn root_document_categories(
        &self,
        ctx: &Context<'_>,
        limit: Option<i64>,
    ) -> Result<Vec<DocumentCategory>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;
        let limit = limit.unwrap_or(100).min(1000);

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, DocumentCategory>(
                r#"
                SELECT id, name, description, parent_category_id,
                       created_at, updated_at
                FROM hr_public.document_categories
                WHERE parent_category_id IS NULL 
                ORDER BY name ASC
                LIMIT $1
                "#,
            )
            .bind(limit)
            .fetch_all(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch root document categories: {}", e);
                Error::new("Failed to fetch root document categories")
            })
        })).await
    }

    /// Count document categories
    async fn document_categories_count(&self, ctx: &Context<'_>) -> Result<i64> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;

        session.execute(pool, |tx| Box::pin(async move {
            let count: (i64,) = sqlx::query_as(
                "SELECT COUNT(*) FROM hr_public.document_categories "
            )
            .fetch_one(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to count document categories: {}", e);
                Error::new("Failed to count document categories")
            })?;

            Ok(count.0)
        })).await
    }

    // ============================================================
    // Document Assignment Queries
    // ============================================================

    /// Get a single document assignment by ID
    async fn document_assignment(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
    ) -> Result<Option<DocumentAssignment>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, DocumentAssignment>(
                r#"
                SELECT id, document_id, user_id, department_id, access_level,
                       assigned_at, assigned_by_id
                FROM hr_public.document_assignments
                WHERE id = $1
                "#,
            )
            .bind(id)
            .fetch_optional(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch document assignment: {}", e);
                Error::new("Failed to fetch document assignment")
            })
        })).await
    }

    /// Get document assignments by document ID
    async fn document_assignments_by_document(
        &self,
        ctx: &Context<'_>,
        document_id: Uuid,
        limit: Option<i64>,
    ) -> Result<Vec<DocumentAssignment>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;
        let limit = limit.unwrap_or(100).min(1000);

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, DocumentAssignment>(
                r#"
                SELECT id, document_id, user_id, department_id, access_level,
                       assigned_at, assigned_by_id
                FROM hr_public.document_assignments
                WHERE document_id = $1
                ORDER BY assigned_at DESC
                LIMIT $2
                "#,
            )
            .bind(document_id)
            .bind(limit)
            .fetch_all(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch document assignments by document: {}", e);
                Error::new("Failed to fetch document assignments")
            })
        })).await
    }

    /// Get document assignments by user ID
    async fn document_assignments_by_user(
        &self,
        ctx: &Context<'_>,
        user_id: Uuid,
        limit: Option<i64>,
    ) -> Result<Vec<DocumentAssignment>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;
        let limit = limit.unwrap_or(100).min(1000);

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, DocumentAssignment>(
                r#"
                SELECT id, document_id, user_id, department_id, access_level,
                       assigned_at, assigned_by_id
                FROM hr_public.document_assignments
                WHERE user_id = $1
                ORDER BY assigned_at DESC
                LIMIT $2
                "#,
            )
            .bind(user_id)
            .bind(limit)
            .fetch_all(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch document assignments by user: {}", e);
                Error::new("Failed to fetch document assignments")
            })
        })).await
    }

    /// Get document assignments by department ID
    async fn document_assignments_by_department(
        &self,
        ctx: &Context<'_>,
        department_id: Uuid,
        limit: Option<i64>,
    ) -> Result<Vec<DocumentAssignment>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;
        let limit = limit.unwrap_or(100).min(1000);

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, DocumentAssignment>(
                r#"
                SELECT id, document_id, user_id, department_id, access_level,
                       assigned_at, assigned_by_id
                FROM hr_public.document_assignments
                WHERE department_id = $1
                ORDER BY assigned_at DESC
                LIMIT $2
                "#,
            )
            .bind(department_id)
            .bind(limit)
            .fetch_all(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch document assignments by department: {}", e);
                Error::new("Failed to fetch document assignments")
            })
        })).await
    }

    /// Count document assignments
    async fn document_assignments_count(
        &self,
        ctx: &Context<'_>,
        document_id: Option<Uuid>,
    ) -> Result<i64> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;

        session.execute(pool, |tx| Box::pin(async move {
            let count: (i64,) = if let Some(doc_id) = document_id {
                sqlx::query_as(
                    "SELECT COUNT(*) FROM hr_public.document_assignments WHERE document_id = $1"
                )
                .bind(doc_id)
                .fetch_one(&mut **tx.as_mut())
                .await
                .map_err(|e| {
                    tracing::error!("Failed to count document assignments by document: {}", e);
                    Error::new("Failed to count document assignments")
                })?
            } else {
                sqlx::query_as("SELECT COUNT(*) FROM hr_public.document_assignments")
                    .fetch_one(&mut **tx.as_mut())
                    .await
                    .map_err(|e| {
                        tracing::error!("Failed to count document assignments: {}", e);
                        Error::new("Failed to count document assignments")
                    })?
            };

            Ok(count.0)
        })).await
    }

    // ============================================================
    // Document Access Log Queries
    // ============================================================

    /// Get a single document access log by ID
    async fn document_access_log(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
    ) -> Result<Option<DocumentAccessLog>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, DocumentAccessLog>(
                r#"
                SELECT id, document_id, user_id, access_type, accessed_at, ip_address
                FROM hr_public.document_access_logs
                WHERE id = $1
                "#,
            )
            .bind(id)
            .fetch_optional(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch document access log: {}", e);
                Error::new("Failed to fetch document access log")
            })
        })).await
    }

    /// Get document access logs by document ID
    async fn document_access_logs_by_document(
        &self,
        ctx: &Context<'_>,
        document_id: Uuid,
        limit: Option<i64>,
    ) -> Result<Vec<DocumentAccessLog>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;
        let limit = limit.unwrap_or(100).min(1000);

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, DocumentAccessLog>(
                r#"
                SELECT id, document_id, user_id, access_type, accessed_at, ip_address
                FROM hr_public.document_access_logs
                WHERE document_id = $1
                ORDER BY accessed_at DESC
                LIMIT $2
                "#,
            )
            .bind(document_id)
            .bind(limit)
            .fetch_all(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch document access logs by document: {}", e);
                Error::new("Failed to fetch document access logs")
            })
        })).await
    }

    /// Get document access logs by user ID
    async fn document_access_logs_by_user(
        &self,
        ctx: &Context<'_>,
        user_id: Uuid,
        limit: Option<i64>,
    ) -> Result<Vec<DocumentAccessLog>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;
        let limit = limit.unwrap_or(100).min(1000);

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, DocumentAccessLog>(
                r#"
                SELECT id, document_id, user_id, access_type, accessed_at, ip_address
                FROM hr_public.document_access_logs
                WHERE user_id = $1
                ORDER BY accessed_at DESC
                LIMIT $2
                "#,
            )
            .bind(user_id)
            .bind(limit)
            .fetch_all(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch document access logs by user: {}", e);
                Error::new("Failed to fetch document access logs")
            })
        })).await
    }

    /// Get document access logs by access type
    async fn document_access_logs_by_type(
        &self,
        ctx: &Context<'_>,
        access_type: DocumentAccessType,
        limit: Option<i64>,
    ) -> Result<Vec<DocumentAccessLog>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;
        let limit = limit.unwrap_or(100).min(1000);

        session.execute(pool, |tx| Box::pin(async move {
            sqlx::query_as::<_, DocumentAccessLog>(
                r#"
                SELECT id, document_id, user_id, access_type, accessed_at, ip_address
                FROM hr_public.document_access_logs
                WHERE access_type = $1
                ORDER BY accessed_at DESC
                LIMIT $2
                "#,
            )
            .bind(access_type)
            .bind(limit)
            .fetch_all(&mut **tx.as_mut())
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch document access logs by type: {}", e);
                Error::new("Failed to fetch document access logs")
            })
        })).await
    }

    /// Count document access logs
    async fn document_access_logs_count(
        &self,
        ctx: &Context<'_>,
        document_id: Option<Uuid>,
    ) -> Result<i64> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;

        session.execute(pool, |tx| Box::pin(async move {
            let count: (i64,) = if let Some(doc_id) = document_id {
                sqlx::query_as(
                    "SELECT COUNT(*) FROM hr_public.document_access_logs WHERE document_id = $1"
                )
                .bind(doc_id)
                .fetch_one(&mut **tx.as_mut())
                .await
                .map_err(|e| {
                    tracing::error!("Failed to count document access logs by document: {}", e);
                    Error::new("Failed to count document access logs")
                })?
            } else {
                sqlx::query_as("SELECT COUNT(*) FROM hr_public.document_access_logs")
                    .fetch_one(&mut **tx.as_mut())
                    .await
                    .map_err(|e| {
                        tracing::error!("Failed to count document access logs: {}", e);
                        Error::new("Failed to count document access logs")
                    })?
            };

            Ok(count.0)
        })).await
    }

    // ============================================================
    // Encrypted File Storage Queries
    // ============================================================

    /// Get a single encrypted file storage by ID
    async fn encrypted_file_storage(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
    ) -> Result<Option<EncryptedFileStorage>> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let storage = sqlx::query_as::<_, EncryptedFileStorage>(
            r#"
            SELECT id, document_id, encryption_key_id, created_at
            FROM hr_public.encrypted_file_storage
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(pool)
        .await?;

        Ok(storage)
    }

    /// Get encrypted file storage by document ID
    async fn encrypted_file_storage_by_document(
        &self,
        ctx: &Context<'_>,
        document_id: Uuid,
    ) -> Result<Option<EncryptedFileStorage>> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let storage = sqlx::query_as::<_, EncryptedFileStorage>(
            r#"
            SELECT id, document_id, encryption_key_id, created_at
            FROM hr_public.encrypted_file_storage
            WHERE document_id = $1
            LIMIT 1
            "#,
        )
        .bind(document_id)
        .fetch_optional(pool)
        .await?;

        Ok(storage)
    }

    /// Get encrypted file storages by encryption key ID
    async fn encrypted_file_storages_by_key(
        &self,
        ctx: &Context<'_>,
        encryption_key_id: Uuid,
        limit: Option<i64>,
    ) -> Result<Vec<EncryptedFileStorage>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);

        let storages = sqlx::query_as::<_, EncryptedFileStorage>(
            r#"
            SELECT id, document_id, encryption_key_id, created_at
            FROM hr_public.encrypted_file_storage
            WHERE encryption_key_id = $1
            ORDER BY created_at DESC
            LIMIT $2
            "#,
        )
        .bind(encryption_key_id)
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Ok(storages)
    }

    /// Count encrypted file storages
    async fn encrypted_file_storages_count(
        &self,
        ctx: &Context<'_>,
        encryption_key_id: Option<Uuid>,
    ) -> Result<i64> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let count: (i64,) = if let Some(key_id) = encryption_key_id {
            sqlx::query_as(
                "SELECT COUNT(*) FROM hr_public.encrypted_file_storage WHERE encryption_key_id = $1"
            )
            .bind(key_id)
            .fetch_one(pool)
            .await?
        } else {
            sqlx::query_as("SELECT COUNT(*) FROM hr_public.encrypted_file_storage")
                .fetch_one(pool)
                .await?
        };

        Ok(count.0)
    }

    // ============================================================
    // Time-Off Policy Queries
    // ============================================================

    /// Get a single time-off policy by ID
    async fn time_off_policy(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
    ) -> Result<Option<TimeOffPolicy>> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let policy = sqlx::query_as::<_, TimeOffPolicy>(
            r#"
            SELECT id, name as policy_name, '' as leave_type, 0.0 as accrual_rate,
                   NULL as max_balance, NULL as carryover_limit,
                   CURRENT_DATE as effective_date, created_at, updated_at
            FROM hr_public.time_off_policies
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(pool)
        .await?;

        Ok(policy)
    }

    /// Get all time-off policies with pagination
    async fn time_off_policies(
        &self,
        ctx: &Context<'_>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<TimeOffPolicy>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);
        let offset = offset.unwrap_or(0);

        let policies = sqlx::query_as::<_, TimeOffPolicy>(
            r#"
            SELECT id, name as policy_name, '' as leave_type, 0.0 as accrual_rate,
                   NULL as max_balance, NULL as carryover_limit,
                   CURRENT_DATE as effective_date, created_at, updated_at
            FROM hr_public.time_off_policies
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
            "#,
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(pool)
        .await?;

        Ok(policies)
    }

    /// Get time-off policies by leave type
    async fn time_off_policies_by_leave_type(
        &self,
        ctx: &Context<'_>,
        leave_type: String,
        limit: Option<i64>,
    ) -> Result<Vec<TimeOffPolicy>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);

        let policies = sqlx::query_as::<_, TimeOffPolicy>(
            r#"
            SELECT id, name as policy_name, '' as leave_type, 0.0 as accrual_rate,
                   NULL as max_balance, NULL as carryover_limit,
                   CURRENT_DATE as effective_date, created_at, updated_at
            FROM hr_public.time_off_policies
            WHERE name ILIKE $1 || '%'
            ORDER BY created_at DESC
            LIMIT $2
            "#,
        )
        .bind(leave_type)
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Ok(policies)
    }

    /// Get active time-off policies (effective as of today)
    async fn active_time_off_policies(
        &self,
        ctx: &Context<'_>,
        limit: Option<i64>,
    ) -> Result<Vec<TimeOffPolicy>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);

        let policies = sqlx::query_as::<_, TimeOffPolicy>(
            r#"
            SELECT id, name as policy_name, '' as leave_type, 0.0 as accrual_rate,
                   NULL as max_balance, NULL as carryover_limit,
                   CURRENT_DATE as effective_date, created_at, updated_at
            FROM hr_public.time_off_policies
            ORDER BY created_at DESC
            LIMIT $1
            "#,
        )
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Ok(policies)
    }

    /// Count time-off policies
    async fn time_off_policies_count(
        &self,
        ctx: &Context<'_>,
        leave_type: Option<String>,
    ) -> Result<i64> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let count: (i64,) = if let Some(lt) = leave_type {
            sqlx::query_as(
                "SELECT COUNT(*) FROM hr_public.time_off_policies WHERE name ILIKE $1 || '%'"
            )
            .bind(lt)
            .fetch_one(pool)
            .await?
        } else {
            sqlx::query_as("SELECT COUNT(*) FROM hr_public.time_off_policies")
                .fetch_one(pool)
                .await?
        };

        Ok(count.0)
    }

    // ============================================================
    // Attendance Record Queries
    // ============================================================

    /// Get a single attendance record by ID
    async fn attendance_record(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
    ) -> Result<Option<AttendanceRecord>> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let record = sqlx::query_as::<_, AttendanceRecord>(
            r#"
            SELECT id, employee_id, date, clock_in, clock_out, total_hours,
                   status, notes, created_at, updated_at
            FROM hr_public.attendance_records
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(pool)
        .await?;

        Ok(record)
    }

    /// Get all attendance records with pagination
    async fn attendance_records(
        &self,
        ctx: &Context<'_>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<AttendanceRecord>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);
        let offset = offset.unwrap_or(0);

        let records = sqlx::query_as::<_, AttendanceRecord>(
            r#"
            SELECT id, employee_id, date, clock_in, clock_out, total_hours,
                   status, notes, created_at, updated_at
            FROM hr_public.attendance_records
            ORDER BY date DESC
            LIMIT $1 OFFSET $2
            "#,
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(pool)
        .await?;

        Ok(records)
    }

    /// Get attendance records by employee ID
    async fn attendance_records_by_employee(
        &self,
        ctx: &Context<'_>,
        user_id: Uuid,
        limit: Option<i64>,
    ) -> Result<Vec<AttendanceRecord>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);

        let records = sqlx::query_as::<_, AttendanceRecord>(
            r#"
            SELECT id, user_id, date, clock_in, clock_out, hours_worked,
                   status, notes, created_at, updated_at
            FROM hr_public.attendance_records
            WHERE user_id = $1
            ORDER BY date DESC
            LIMIT $2
            "#,
        )
        .bind(user_id)
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Ok(records)
    }

    /// Get attendance records by status
    async fn attendance_records_by_status(
        &self,
        ctx: &Context<'_>,
        status: AttendanceStatus,
        limit: Option<i64>,
    ) -> Result<Vec<AttendanceRecord>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);

        let records = sqlx::query_as::<_, AttendanceRecord>(
            r#"
            SELECT id, employee_id, date, clock_in, clock_out, total_hours,
                   status, notes, created_at, updated_at
            FROM hr_public.attendance_records
            WHERE status = $1
            ORDER BY date DESC
            LIMIT $2
            "#,
        )
        .bind(status)
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Ok(records)
    }

    /// Get attendance records by date range
    async fn attendance_records_by_date_range(
        &self,
        ctx: &Context<'_>,
        start_date: chrono::NaiveDate,
        end_date: chrono::NaiveDate,
        employee_id: Option<Uuid>,
        limit: Option<i64>,
    ) -> Result<Vec<AttendanceRecord>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);

        let records = if let Some(emp_id) = employee_id {
            sqlx::query_as::<_, AttendanceRecord>(
                r#"
                SELECT id, employee_id, date, clock_in, clock_out, total_hours,
                       status, notes, created_at, updated_at
                FROM hr_public.attendance_records
                WHERE employee_id = $1 AND date >= $2 AND date <= $3
                ORDER BY date DESC
                LIMIT $4
                "#,
            )
            .bind(emp_id)
            .bind(start_date)
            .bind(end_date)
            .bind(limit)
            .fetch_all(pool)
            .await?
        } else {
            sqlx::query_as::<_, AttendanceRecord>(
                r#"
                SELECT id, employee_id, date, clock_in, clock_out, total_hours,
                       status, notes, created_at, updated_at
                FROM hr_public.attendance_records
                WHERE date >= $1 AND date <= $2
                ORDER BY date DESC
                LIMIT $3
                "#,
            )
            .bind(start_date)
            .bind(end_date)
            .bind(limit)
            .fetch_all(pool)
            .await?
        };

        Ok(records)
    }

    /// Get incomplete attendance records (no clock out)
    async fn incomplete_attendance_records(
        &self,
        ctx: &Context<'_>,
        limit: Option<i64>,
    ) -> Result<Vec<AttendanceRecord>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);

        let records = sqlx::query_as::<_, AttendanceRecord>(
            r#"
            SELECT id, employee_id, date, clock_in, clock_out, total_hours,
                   status, notes, created_at, updated_at
            FROM hr_public.attendance_records
            WHERE clock_in IS NOT NULL AND clock_out IS NULL
            ORDER BY date DESC, clock_in DESC
            LIMIT $1
            "#,
        )
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Ok(records)
    }

    /// Count attendance records
    async fn attendance_records_count(
        &self,
        ctx: &Context<'_>,
        employee_id: Option<Uuid>,
        status: Option<AttendanceStatus>,
    ) -> Result<i64> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let count: (i64,) = match (employee_id, status) {
            (Some(emp_id), Some(att_status)) => {
                sqlx::query_as(
                    "SELECT COUNT(*) FROM hr_public.attendance_records WHERE employee_id = $1 AND status = $2"
                )
                .bind(emp_id)
                .bind(att_status)
                .fetch_one(pool)
                .await?
            }
            (Some(emp_id), None) => {
                sqlx::query_as(
                    "SELECT COUNT(*) FROM hr_public.attendance_records WHERE employee_id = $1"
                )
                .bind(emp_id)
                .fetch_one(pool)
                .await?
            }
            (None, Some(att_status)) => {
                sqlx::query_as(
                    "SELECT COUNT(*) FROM hr_public.attendance_records WHERE status = $1"
                )
                .bind(att_status)
                .fetch_one(pool)
                .await?
            }
            (None, None) => {
                sqlx::query_as("SELECT COUNT(*) FROM hr_public.attendance_records")
                    .fetch_one(pool)
                    .await?
            }
        };

        Ok(count.0)
    }

    // ============================================================
    // Dashboard Summary Queries (Materialized View)
    // ============================================================

    /// Get global dashboard summary (always single record)
    async fn dashboard_summary(&self, ctx: &Context<'_>) -> Result<Option<DashboardSummary>> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let summary = sqlx::query_as::<_, DashboardSummary>(
            r#"
            SELECT summary_key, total_active_employees, tasks_in_progress,
                   pending_leave_requests, expired_certifications, last_refreshed_at
            FROM hr_public.dashboard_summaries
            WHERE summary_key = 'global'
            LIMIT 1
            "#,
        )
        .fetch_optional(pool)
        .await?;

        Ok(summary)
    }

    // ============================================================
    // Department Metric Queries (Materialized View)
    // ============================================================

    /// Get department metric by department ID
    async fn department_metric(
        &self,
        ctx: &Context<'_>,
        department_id: Uuid,
    ) -> Result<Option<DepartmentMetric>> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let metric = sqlx::query_as::<_, DepartmentMetric>(
            r#"
            SELECT department_id, department_name, active_employee_count,
                   total_employee_count, avg_performance_rating, active_tasks_count,
                   pending_leave_requests, last_refreshed_at
            FROM hr_public.department_metrics
            WHERE department_id = $1
            "#,
        )
        .bind(department_id)
        .fetch_optional(pool)
        .await?;

        Ok(metric)
    }

    /// Get all department metrics
    async fn department_metrics(
        &self,
        ctx: &Context<'_>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<DepartmentMetric>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);
        let offset = offset.unwrap_or(0);

        let metrics = sqlx::query_as::<_, DepartmentMetric>(
            r#"
            SELECT department_id, department_name, active_employee_count,
                   total_employee_count, avg_performance_rating, active_tasks_count,
                   pending_leave_requests, last_refreshed_at
            FROM hr_public.department_metrics
            ORDER BY department_name ASC
            LIMIT $1 OFFSET $2
            "#,
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(pool)
        .await?;

        Ok(metrics)
    }

    /// Get department metrics ordered by active employee count
    async fn department_metrics_by_size(
        &self,
        ctx: &Context<'_>,
        limit: Option<i64>,
    ) -> Result<Vec<DepartmentMetric>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);

        let metrics = sqlx::query_as::<_, DepartmentMetric>(
            r#"
            SELECT department_id, department_name, active_employee_count,
                   total_employee_count, avg_performance_rating, active_tasks_count,
                   pending_leave_requests, last_refreshed_at
            FROM hr_public.department_metrics
            ORDER BY active_employee_count DESC
            LIMIT $1
            "#,
        )
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Ok(metrics)
    }

    /// Get department metrics ordered by performance rating
    async fn department_metrics_by_performance(
        &self,
        ctx: &Context<'_>,
        limit: Option<i64>,
    ) -> Result<Vec<DepartmentMetric>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);

        let metrics = sqlx::query_as::<_, DepartmentMetric>(
            r#"
            SELECT department_id, department_name, active_employee_count,
                   total_employee_count, avg_performance_rating, active_tasks_count,
                   pending_leave_requests, last_refreshed_at
            FROM hr_public.department_metrics
            WHERE avg_performance_rating IS NOT NULL
            ORDER BY avg_performance_rating DESC
            LIMIT $1
            "#,
        )
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Ok(metrics)
    }

    /// Count department metrics
    async fn department_metrics_count(&self, ctx: &Context<'_>) -> Result<i64> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM hr_public.department_metrics")
            .fetch_one(pool)
            .await?;

        Ok(count.0)
    }

    // ============================================================
    // Goal Statistic Queries (Materialized View)
    // ============================================================

    /// Get goal statistic by user ID
    async fn goal_statistic_by_user(
        &self,
        ctx: &Context<'_>,
        user_id: Uuid,
        limit: Option<i64>,
    ) -> Result<Vec<GoalStatistic>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);

        let statistics = sqlx::query_as::<_, GoalStatistic>(
            r#"
            SELECT user_id, first_name, last_name, department_id, quarter, year,
                   total_goals, completed_goals, completion_percentage, last_refreshed_at
            FROM hr_public.goal_statistics
            WHERE user_id = $1
            ORDER BY year DESC, quarter DESC
            LIMIT $2
            "#,
        )
        .bind(user_id)
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Ok(statistics)
    }

    /// Get goal statistics by quarter and year
    async fn goal_statistics_by_period(
        &self,
        ctx: &Context<'_>,
        quarter: String,
        year: i32,
        limit: Option<i64>,
    ) -> Result<Vec<GoalStatistic>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);

        let statistics = sqlx::query_as::<_, GoalStatistic>(
            r#"
            SELECT user_id, first_name, last_name, department_id, quarter, year,
                   total_goals, completed_goals, completion_percentage, last_refreshed_at
            FROM hr_public.goal_statistics
            WHERE quarter = $1 AND year = $2
            ORDER BY completion_percentage DESC
            LIMIT $3
            "#,
        )
        .bind(quarter)
        .bind(year)
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Ok(statistics)
    }

    /// Get goal statistics by department ID
    async fn goal_statistics_by_department(
        &self,
        ctx: &Context<'_>,
        department_id: Uuid,
        limit: Option<i64>,
    ) -> Result<Vec<GoalStatistic>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);

        let statistics = sqlx::query_as::<_, GoalStatistic>(
            r#"
            SELECT user_id, first_name, last_name, department_id, quarter, year,
                   total_goals, completed_goals, completion_percentage, last_refreshed_at
            FROM hr_public.goal_statistics
            WHERE department_id = $1
            ORDER BY year DESC, quarter DESC, completion_percentage DESC
            LIMIT $2
            "#,
        )
        .bind(department_id)
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Ok(statistics)
    }

    /// Get all goal statistics
    async fn goal_statistics(
        &self,
        ctx: &Context<'_>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<GoalStatistic>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);
        let offset = offset.unwrap_or(0);

        let statistics = sqlx::query_as::<_, GoalStatistic>(
            r#"
            SELECT user_id, first_name, last_name, department_id, quarter, year,
                   total_goals, completed_goals, completion_percentage, last_refreshed_at
            FROM hr_public.goal_statistics
            ORDER BY year DESC, quarter DESC
            LIMIT $1 OFFSET $2
            "#,
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(pool)
        .await?;

        Ok(statistics)
    }

    /// Count goal statistics
    async fn goal_statistics_count(&self, ctx: &Context<'_>) -> Result<i64> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM hr_public.goal_statistics")
            .fetch_one(pool)
            .await?;

        Ok(count.0)
    }

    // ============================================================
    // Report Analytic Queries (Materialized View)
    // ============================================================

    /// Get report analytic by department ID
    async fn report_analytics_by_department(
        &self,
        ctx: &Context<'_>,
        department_id: Uuid,
        limit: Option<i64>,
    ) -> Result<Vec<ReportAnalytic>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);

        let analytics = sqlx::query_as::<_, ReportAnalytic>(
            r#"
            SELECT department_id, department_name, month, headcount, days_present,
                   attendance_rate_percentage, last_refreshed_at
            FROM hr_public.report_analytics
            WHERE department_id = $1
            ORDER BY month DESC
            LIMIT $2
            "#,
        )
        .bind(department_id)
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Ok(analytics)
    }

    /// Get report analytics by month
    async fn report_analytics_by_month(
        &self,
        ctx: &Context<'_>,
        month: chrono::NaiveDate,
        limit: Option<i64>,
    ) -> Result<Vec<ReportAnalytic>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);

        let analytics = sqlx::query_as::<_, ReportAnalytic>(
            r#"
            SELECT department_id, department_name, month, headcount, days_present,
                   attendance_rate_percentage, last_refreshed_at
            FROM hr_public.report_analytics
            WHERE month = $1
            ORDER BY department_name ASC
            LIMIT $2
            "#,
        )
        .bind(month)
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Ok(analytics)
    }

    /// Get report analytics by date range
    async fn report_analytics_by_date_range(
        &self,
        ctx: &Context<'_>,
        start_month: chrono::NaiveDate,
        end_month: chrono::NaiveDate,
        limit: Option<i64>,
    ) -> Result<Vec<ReportAnalytic>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);

        let analytics = sqlx::query_as::<_, ReportAnalytic>(
            r#"
            SELECT department_id, department_name, month, headcount, days_present,
                   attendance_rate_percentage, last_refreshed_at
            FROM hr_public.report_analytics
            WHERE month >= $1 AND month <= $2
            ORDER BY month DESC, department_name ASC
            LIMIT $3
            "#,
        )
        .bind(start_month)
        .bind(end_month)
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Ok(analytics)
    }

    /// Get all report analytics
    async fn report_analytics(
        &self,
        ctx: &Context<'_>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<ReportAnalytic>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);
        let offset = offset.unwrap_or(0);

        let analytics = sqlx::query_as::<_, ReportAnalytic>(
            r#"
            SELECT department_id, department_name, month, headcount, days_present,
                   attendance_rate_percentage, last_refreshed_at
            FROM hr_public.report_analytics
            ORDER BY month DESC
            LIMIT $1 OFFSET $2
            "#,
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(pool)
        .await?;

        Ok(analytics)
    }

    /// Count report analytics
    async fn report_analytics_count(&self, ctx: &Context<'_>) -> Result<i64> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM hr_public.report_analytics")
            .fetch_one(pool)
            .await?;

        Ok(count.0)
    }

    // ============================================================
    // Activity Log Queries
    // ============================================================

    /// Get a single activity log by ID
    async fn activity_log(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<ActivityLog>> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let log = sqlx::query_as::<_, ActivityLog>(
            r#"
            SELECT id, user_id, employee_id, action, resource_type, resource_id,
                   details, created_at
            FROM hr_public.activity_logs
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(pool)
        .await?;

        Ok(log)
    }

    /// Get all activity logs with pagination
    async fn activity_logs(
        &self,
        ctx: &Context<'_>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<ActivityLog>> {
        let db = get_db_from_context(ctx)?;
        let limit = limit.unwrap_or(100).min(1000);
        let offset = offset.unwrap_or(0);

        let logs = ActivityLogEntity::find()
            .order_by_desc(activity_log::Column::CreatedAt)
            .limit(Some(limit as u64))
            .offset(offset as u64)
            .all(db)
            .await?;

        // Convert SeaORM models to legacy ActivityLog struct for compatibility
        let logs = logs.into_iter().map(|model| ActivityLog {
            id: model.id,
            user_id: model.user_id,
            employee_id: model.employee_id,
            action: model.action,
            resource_type: model.resource_type,
            resource_id: model.resource_id,
            details: model.details,
            before_snapshot: model.before_snapshot,
            after_snapshot: model.after_snapshot,
            is_rollback: model.is_rollback,
            rolled_back_log_id: model.rolled_back_log_id,
            ip_address: model.ip_address,
            user_agent: model.user_agent,
            signature_id: model.signature_id,
            batch_id: model.batch_id,
            created_at: model.created_at,
        }).collect();

        Ok(logs)
            .map_err(|e| {
                tracing::error!("Failed to fetch activity logs: {}", e);
                Error::new("Failed to fetch activity logs")
            })
    }

    /// Get activity logs by user ID
    async fn activity_logs_by_user(
        &self,
        ctx: &Context<'_>,
        user_id: Uuid,
        limit: Option<i64>,
    ) -> Result<Vec<ActivityLog>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);

        let logs = sqlx::query_as::<_, ActivityLog>(
            r#"
            SELECT id, user_id, employee_id, action, resource_type, resource_id,
                   details, created_at
            FROM hr_public.activity_logs
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT $2
            "#,
        )
        .bind(user_id)
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Ok(logs)
    }

    /// Get activity logs by action type
    async fn activity_logs_by_action(
        &self,
        ctx: &Context<'_>,
        action_type: String,
        limit: Option<i64>,
    ) -> Result<Vec<ActivityLog>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);

        let logs = sqlx::query_as::<_, ActivityLog>(
            r#"
            SELECT id, user_id, action_type, resource_type, resource_id,
                   details, ip_address, user_agent, created_at
            FROM hr_public.activity_logs
            WHERE action_type = $1
            ORDER BY created_at DESC
            LIMIT $2
            "#,
        )
        .bind(action_type)
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Ok(logs)
    }

    /// Get activity logs by resource type
    async fn activity_logs_by_resource_type(
        &self,
        ctx: &Context<'_>,
        resource_type: String,
        limit: Option<i64>,
    ) -> Result<Vec<ActivityLog>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);

        let logs = sqlx::query_as::<_, ActivityLog>(
            r#"
            SELECT id, user_id, action_type, resource_type, resource_id,
                   details, ip_address, user_agent, created_at
            FROM hr_public.activity_logs
            WHERE resource_type = $1
            ORDER BY created_at DESC
            LIMIT $2
            "#,
        )
        .bind(resource_type)
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Ok(logs)
    }

    /// Count activity logs
    async fn activity_logs_count(&self, ctx: &Context<'_>) -> Result<i64> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM hr_public.activity_logs")
            .fetch_one(pool)
            .await?;

        Ok(count.0)
    }

    /// Get all activity logs with PostGraphile-style Relay connection (for frontend compatibility)
    async fn all_activity_logs(
        &self,
        ctx: &Context<'_>,
        first: Option<i64>,
        offset: Option<i64>,
        #[graphql(name = "orderBy")] order_by: Option<Vec<ActivityLogsOrderBy>>,
        condition: Option<ActivityLogCondition>,
    ) -> Result<ActivityLogsConnection> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;

        let first = first.unwrap_or(50).min(1000);
        let offset = offset.unwrap_or(0);

        session.execute(pool, |tx| Box::pin(async move {
            let mut query_builder = sqlx::QueryBuilder::new(
                r#"
                SELECT id, user_id, employee_id, action, resource_type, resource_id,
                        details, before_snapshot, after_snapshot, is_rollback,
                        rolled_back_log_id, ip_address, user_agent, created_at
                FROM hr_public.activity_logs
                WHERE 1=1
                "#,
            );

            // Apply conditions
            if let Some(cond) = &condition {
                if let Some(id) = cond.id {
                    query_builder.push(" AND id = ");
                    query_builder.push_bind(id);
                }
                if let Some(user_id) = cond.user_id {
                    query_builder.push(" AND user_id = ");
                    query_builder.push_bind(user_id);
                }
                if let Some(employee_id) = cond.employee_id {
                    query_builder.push(" AND employee_id = ");
                    query_builder.push_bind(employee_id);
                }
                if let Some(action) = &cond.action {
                    query_builder.push(" AND action = ");
                    query_builder.push_bind(action);
                }
                if let Some(resource_type) = &cond.resource_type {
                    query_builder.push(" AND resource_type = ");
                    query_builder.push_bind(resource_type);
                }
                if let Some(resource_id) = cond.resource_id {
                    query_builder.push(" AND resource_id = ");
                    query_builder.push_bind(resource_id);
                }
                if let Some(is_rollback) = cond.is_rollback {
                    query_builder.push(" AND is_rollback = ");
                    query_builder.push_bind(is_rollback);
                }
                if let Some(rolled_back_log_id) = cond.rolled_back_log_id {
                    query_builder.push(" AND rolled_back_log_id = ");
                    query_builder.push_bind(rolled_back_log_id);
                }
            }

            // Add ordering
            let order_clause = if let Some(orders) = order_by {
                if orders.is_empty() {
                    "ORDER BY created_at DESC".to_string()
                } else {
                    let sql_parts: Vec<String> = orders.iter().map(|o| o.to_sql().to_string()).collect();
                    format!("ORDER BY {}", sql_parts.join(", "))
                }
            } else {
                "ORDER BY created_at DESC".to_string() // Default
            };
            query_builder.push(order_clause);
            query_builder.push(" LIMIT ");
            query_builder.push_bind(first);
            query_builder.push(" OFFSET ");
            query_builder.push_bind(offset);

            let logs: Vec<ActivityLog> = query_builder
                .build_query_as()
                .fetch_all(&mut **tx.as_mut())
                .await
                .map_err(|e| {
                    tracing::error!("Failed to fetch all activity logs: {}", e);
                    Error::new("Failed to fetch activity logs")
                })?;

            // Get total count with same conditions
            let mut count_builder = sqlx::QueryBuilder::new(
                "SELECT COUNT(*)::bigint FROM hr_public.activity_logs WHERE 1=1",
            );

            if let Some(cond) = &condition {
                if let Some(id) = cond.id {
                    count_builder.push(" AND id = ");
                    count_builder.push_bind(id);
                }
                if let Some(user_id) = cond.user_id {
                    count_builder.push(" AND user_id = ");
                    count_builder.push_bind(user_id);
                }
                if let Some(employee_id) = cond.employee_id {
                    count_builder.push(" AND employee_id = ");
                    count_builder.push_bind(employee_id);
                }
                if let Some(action) = &cond.action {
                    count_builder.push(" AND action = ");
                    count_builder.push_bind(action);
                }
                if let Some(resource_type) = &cond.resource_type {
                    count_builder.push(" AND resource_type = ");
                    count_builder.push_bind(resource_type);
                }
                if let Some(resource_id) = cond.resource_id {
                    count_builder.push(" AND resource_id = ");
                    count_builder.push_bind(resource_id);
                }
                if let Some(is_rollback) = cond.is_rollback {
                    count_builder.push(" AND is_rollback = ");
                    count_builder.push_bind(is_rollback);
                }
                if let Some(rolled_back_log_id) = cond.rolled_back_log_id {
                    count_builder.push(" AND rolled_back_log_id = ");
                    count_builder.push_bind(rolled_back_log_id);
                }
            }

            let total_count: (i64,) = count_builder
                .build_query_as()
                .fetch_one(&mut **tx.as_mut())
                .await
                .map_err(|e| {
                    tracing::error!("Failed to count activity logs: {}", e);
                    Error::new("Failed to count activity logs")
                })?;

            // Calculate pagination info
            let has_next_page = offset + first < total_count.0;
            let has_previous_page = offset > 0;

            Ok(ActivityLogsConnection {
                nodes: logs,
                total_count: total_count.0,
                page_info: PageInfo {
                    has_next_page,
                    has_previous_page,
                    start_cursor: None,
                    end_cursor: None,
                },
            })
        })).await
    }

    // ============================================================
    // Compensation Band Queries
    // ============================================================

    /// Get a single compensation band by ID
    async fn compensation_band(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
    ) -> Result<Option<CompensationBand>> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let band = sqlx::query_as::<_, CompensationBand>(
            r#"
            SELECT id, band_name, min_salary, max_salary, currency,
                   created_at, updated_at
            FROM hr_public.compensation_bands
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(pool)
        .await?;

        Ok(band)
    }

    /// Get all compensation bands with pagination
    async fn compensation_bands(
        &self,
        ctx: &Context<'_>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<CompensationBand>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);
        let offset = offset.unwrap_or(0);

        let bands = sqlx::query_as::<_, CompensationBand>(
            r#"
            SELECT id, band_name, min_salary, max_salary, currency,
                   created_at, updated_at
            FROM hr_public.compensation_bands
            ORDER BY min_salary ASC
            LIMIT $1 OFFSET $2
            "#,
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(pool)
        .await?;

        Ok(bands)
    }

    /// Get compensation bands by currency
    async fn compensation_bands_by_currency(
        &self,
        ctx: &Context<'_>,
        currency: String,
        limit: Option<i64>,
    ) -> Result<Vec<CompensationBand>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);

        let bands = sqlx::query_as::<_, CompensationBand>(
            r#"
            SELECT id, band_name, min_salary, max_salary, currency,
                   created_at, updated_at
            FROM hr_public.compensation_bands
            WHERE currency = $1
            ORDER BY min_salary ASC
            LIMIT $2
            "#,
        )
        .bind(currency)
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Ok(bands)
    }

    /// Count compensation bands
    async fn compensation_bands_count(&self, ctx: &Context<'_>) -> Result<i64> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM hr_public.compensation_bands")
            .fetch_one(pool)
            .await?;

        Ok(count.0)
    }

    // ============================================================
    // Encryption Key Queries
    // ============================================================

    /// Get a single encryption key by ID
    async fn encryption_key(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
    ) -> Result<Option<EncryptionKey>> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let key = sqlx::query_as::<_, EncryptionKey>(
            r#"
            SELECT id, key_name, algorithm, created_at, rotated_at, active
            FROM hr_public.encryption_keys
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(pool)
        .await?;

        Ok(key)
    }

    /// Get all encryption keys with pagination
    async fn encryption_keys(
        &self,
        ctx: &Context<'_>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<EncryptionKey>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);
        let offset = offset.unwrap_or(0);

        let keys = sqlx::query_as::<_, EncryptionKey>(
            r#"
            SELECT id, key_name, algorithm, created_at, rotated_at, active
            FROM hr_public.encryption_keys
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
            "#,
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(pool)
        .await?;

        Ok(keys)
    }

    /// Get active encryption keys
    async fn active_encryption_keys(
        &self,
        ctx: &Context<'_>,
        limit: Option<i64>,
    ) -> Result<Vec<EncryptionKey>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);

        let keys = sqlx::query_as::<_, EncryptionKey>(
            r#"
            SELECT id, key_name, algorithm, created_at, rotated_at, active
            FROM hr_public.encryption_keys
            WHERE active = TRUE
            ORDER BY created_at DESC
            LIMIT $1
            "#,
        )
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Ok(keys)
    }

    /// Count encryption keys
    async fn encryption_keys_count(&self, ctx: &Context<'_>) -> Result<i64> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM hr_public.encryption_keys")
            .fetch_one(pool)
            .await?;

        Ok(count.0)
    }

    // ============================================================
    // HR Report Queries
    // ============================================================

    /// Get a single HR report by ID
    async fn hr_report(&self, ctx: &Context<'_>, id: Uuid) -> Result<Option<HRReport>> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let report = sqlx::query_as::<_, HRReport>(
            r#"
            SELECT id, title, report_type, data,
                   creator_id, generated_at
            FROM hr_public.hr_reports
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(pool)
        .await?;

        Ok(report)
    }

    /// Get all HR reports with pagination
    async fn hr_reports(
        &self,
        ctx: &Context<'_>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<HRReport>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);
        let offset = offset.unwrap_or(0);

        let reports = sqlx::query_as::<_, HRReport>(
            r#"
            SELECT id, title, report_type, data,
                   creator_id, generated_at
            FROM hr_public.hr_reports
            ORDER BY generated_at DESC
            LIMIT $1 OFFSET $2
            "#,
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(pool)
        .await?;

        Ok(reports)
    }

    /// Get HR reports by type
    async fn hr_reports_by_type(
        &self,
        ctx: &Context<'_>,
        report_type: String,
        limit: Option<i64>,
    ) -> Result<Vec<HRReport>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);

        let reports = sqlx::query_as::<_, HRReport>(
            r#"
            SELECT id, title, report_type, data,
                   creator_id, generated_at
            FROM hr_public.hr_reports
            WHERE report_type = $1
            ORDER BY generated_at DESC
            LIMIT $2
            "#,
        )
        .bind(report_type)
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Ok(reports)
    }

    /// Get HR reports by generator
    async fn hr_reports_by_generator(
        &self,
        ctx: &Context<'_>,
        generator_id: Uuid,
        limit: Option<i64>,
    ) -> Result<Vec<HRReport>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);

        let reports = sqlx::query_as::<_, HRReport>(
            r#"
            SELECT id, title, report_type, data,
                   creator_id, generated_at
            FROM hr_public.hr_reports
            WHERE creator_id = $1
            ORDER BY generated_at DESC
            LIMIT $2
            "#,
        )
        .bind(generator_id)
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Ok(reports)
    }

    /// Count HR reports
    async fn hr_reports_count(&self, ctx: &Context<'_>) -> Result<i64> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM hr_public.hr_reports")
            .fetch_one(pool)
            .await?;

        Ok(count.0)
    }

    // ============================================================
    // Payroll Record Queries
    // ============================================================

    /// Get a single payroll record by ID
    async fn payroll_record(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
    ) -> Result<Option<PayrollRecord>> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let record = sqlx::query_as::<_, PayrollRecord>(
            r#"
            SELECT id, employee_id, pay_period_start, pay_period_end, gross_pay,
                   net_pay, deductions, bonuses, processed_at, processor_id, created_at
            FROM hr_public.payroll_records
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(pool)
        .await?;

        Ok(record)
    }

    /// Get all payroll records with pagination
    async fn payroll_records(
        &self,
        ctx: &Context<'_>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<PayrollRecord>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);
        let offset = offset.unwrap_or(0);

        let records = sqlx::query_as::<_, PayrollRecord>(
            r#"
            SELECT id, employee_id, pay_period_start, pay_period_end, gross_pay,
                   net_pay, deductions, bonuses, processed_at, processor_id, created_at
            FROM hr_public.payroll_records
            ORDER BY processed_at DESC
            LIMIT $1 OFFSET $2
            "#,
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(pool)
        .await?;

        Ok(records)
    }

    /// Get payroll records by employee ID
    async fn payroll_records_by_employee(
        &self,
        ctx: &Context<'_>,
        employee_id: Uuid,
        limit: Option<i64>,
    ) -> Result<Vec<PayrollRecord>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);

        let records = sqlx::query_as::<_, PayrollRecord>(
            r#"
            SELECT id, employee_id, pay_period_start, pay_period_end, gross_pay,
                   net_pay, deductions, bonuses, processed_at, processor_id, created_at
            FROM hr_public.payroll_records
            WHERE employee_id = $1
            ORDER BY pay_period_start DESC
            LIMIT $2
            "#,
        )
        .bind(employee_id)
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Ok(records)
    }

    /// Get payroll records by pay period
    async fn payroll_records_by_period(
        &self,
        ctx: &Context<'_>,
        start_date: chrono::NaiveDate,
        end_date: chrono::NaiveDate,
        limit: Option<i64>,
    ) -> Result<Vec<PayrollRecord>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);

        let records = sqlx::query_as::<_, PayrollRecord>(
            r#"
            SELECT id, employee_id, pay_period_start, pay_period_end, gross_pay,
                   net_pay, deductions, bonuses, processed_at, processor_id, created_at
            FROM hr_public.payroll_records
            WHERE pay_period_start >= $1 AND pay_period_end <= $2
            ORDER BY pay_period_start DESC
            LIMIT $3
            "#,
        )
        .bind(start_date)
        .bind(end_date)
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Ok(records)
    }

    /// Count payroll records
    async fn payroll_records_count(&self, ctx: &Context<'_>) -> Result<i64> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM hr_public.payroll_records")
            .fetch_one(pool)
            .await?;

        Ok(count.0)
    }

    // ============================================================
    // Rollback Request Queries
    // ============================================================

    /// Get a single rollback request by ID
    async fn rollback_request(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
    ) -> Result<Option<RollbackRequest>> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let request = sqlx::query_as::<_, RollbackRequest>(
            r#"
            SELECT id, activity_log_id, requested_by, requested_at, reason,
                    status, reviewed_by, reviewed_at, review_reason, created_at, updated_at
            FROM hr_public.rollback_requests
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(pool)
        .await?;

        Ok(request)
    }

    /// Get all rollback requests with pagination
    async fn rollback_requests(
        &self,
        ctx: &Context<'_>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<RollbackRequest>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);
        let offset = offset.unwrap_or(0);

        let requests = sqlx::query_as::<_, RollbackRequest>(
            r#"
            SELECT id, activity_log_id, requested_by, requested_at, reason,
                    status, reviewed_by, reviewed_at, review_reason, created_at, updated_at
            FROM hr_public.rollback_requests
            ORDER BY requested_at DESC
            LIMIT $1 OFFSET $2
            "#,
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(pool)
        .await?;

        Ok(requests)
    }

    /// Get rollback requests by status
    async fn rollback_requests_by_status(
        &self,
        ctx: &Context<'_>,
        status: RollbackStatus,
        limit: Option<i64>,
    ) -> Result<Vec<RollbackRequest>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);

        let requests = sqlx::query_as::<_, RollbackRequest>(
            r#"
            SELECT id, activity_log_id, requested_by, requested_at, reason,
                    status, reviewed_by, reviewed_at, review_reason, created_at, updated_at
            FROM hr_public.rollback_requests
            WHERE status = $1
            ORDER BY created_at DESC
            LIMIT $2
            "#,
        )
        .bind(status)
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Ok(requests)
    }

    /// Get rollback requests by requester
    async fn rollback_requests_by_requester(
        &self,
        ctx: &Context<'_>,
        requester_id: Uuid,
        limit: Option<i64>,
    ) -> Result<Vec<RollbackRequest>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);

        let requests = sqlx::query_as::<_, RollbackRequest>(
            r#"
            SELECT id, activity_log_id, requested_by, requested_at, reason,
                    status, reviewed_by, reviewed_at, review_reason, created_at, updated_at
            FROM hr_public.rollback_requests
            WHERE requested_by = $1
            ORDER BY requested_at DESC
            LIMIT $2
            "#,
        )
        .bind(requester_id)
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Ok(requests)
    }

    /// Count rollback requests
    async fn rollback_requests_count(&self, ctx: &Context<'_>) -> Result<i64> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM hr_public.rollback_requests")
            .fetch_one(pool)
            .await?;

        Ok(count.0)
    }

    /// Get all possible rollback status values (ensures enum is registered in schema)
    async fn rollback_statuses(&self, _ctx: &Context<'_>) -> Result<Vec<RollbackStatus>> {
        Ok(vec![
            RollbackStatus::Pending,
            RollbackStatus::Approved,
            RollbackStatus::Rejected,
            RollbackStatus::Completed,
        ])
    }

    /// Get a single rollback status (ensures enum is registered in schema)
    async fn rollback_status(&self, _ctx: &Context<'_>, status: RollbackStatus) -> Result<RollbackStatus> {
        Ok(status)
    }

    /// Get all rollback requests with PostGraphile-style Relay connection (for frontend compatibility)
    async fn all_rollback_requests(
        &self,
        ctx: &Context<'_>,
        first: Option<i64>,
        offset: Option<i64>,
        #[graphql(name = "orderBy")] order_by: Option<Vec<RollbackRequestsOrderBy>>,
        condition: Option<RollbackRequestCondition>,
    ) -> Result<RollbackRequestsConnection> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let session = ctx.rls_session()?;

        let first = first.unwrap_or(50).min(1000);
        let offset = offset.unwrap_or(0);

        session.execute(pool, |tx| Box::pin(async move {
            let mut query_builder = sqlx::QueryBuilder::new(
                r#"
                SELECT id, activity_log_id, requested_by, requested_at, reason,
                        status, reviewed_by, reviewed_at, review_reason, created_at, updated_at
                FROM hr_public.rollback_requests
                WHERE 1=1
                "#,
            );

            // Apply conditions
            if let Some(cond) = &condition {
                if let Some(id) = cond.id {
                    query_builder.push(" AND id = ");
                    query_builder.push_bind(id);
                }
                if let Some(activity_log_id) = cond.activity_log_id {
                    query_builder.push(" AND activity_log_id = ");
                    query_builder.push_bind(activity_log_id);
                }
                if let Some(requested_by) = cond.requested_by {
                    query_builder.push(" AND requested_by = ");
                    query_builder.push_bind(requested_by);
                }
                if let Some(status) = cond.status {
                    query_builder.push(" AND status = ");
                    query_builder.push_bind(status);
                }
                if let Some(reviewed_by) = cond.reviewed_by {
                    query_builder.push(" AND reviewed_by = ");
                    query_builder.push_bind(reviewed_by);
                }
            }

            // Add ordering
            let order_clause = if let Some(orders) = order_by {
                if orders.is_empty() {
                    "ORDER BY requested_at DESC".to_string()
                } else {
                    let sql_parts: Vec<String> = orders.iter().map(|o| o.to_sql().to_string()).collect();
                    format!("ORDER BY {}", sql_parts.join(", "))
                }
            } else {
                "ORDER BY requested_at DESC".to_string() // Default
            };
            query_builder.push(order_clause);
            query_builder.push(" LIMIT ");
            query_builder.push_bind(first);
            query_builder.push(" OFFSET ");
            query_builder.push_bind(offset);

            let requests: Vec<RollbackRequest> = query_builder
                .build_query_as()
                .fetch_all(&mut **tx.as_mut())
                .await
                .map_err(|e| {
                    tracing::error!("Failed to fetch all rollback requests: {}", e);
                    Error::new("Failed to fetch rollback requests")
                })?;

            // Get total count with same conditions
            let mut count_builder = sqlx::QueryBuilder::new(
                "SELECT COUNT(*)::bigint FROM hr_public.rollback_requests WHERE 1=1",
            );

            if let Some(cond) = &condition {
                if let Some(id) = cond.id {
                    count_builder.push(" AND id = ");
                    count_builder.push_bind(id);
                }
                if let Some(activity_log_id) = cond.activity_log_id {
                    count_builder.push(" AND activity_log_id = ");
                    count_builder.push_bind(activity_log_id);
                }
                if let Some(requested_by) = cond.requested_by {
                    count_builder.push(" AND requested_by = ");
                    count_builder.push_bind(requested_by);
                }
                if let Some(status) = cond.status {
                    count_builder.push(" AND status = ");
                    count_builder.push_bind(status);
                }
                if let Some(reviewed_by) = cond.reviewed_by {
                    count_builder.push(" AND reviewed_by = ");
                    count_builder.push_bind(reviewed_by);
                }
            }

            let total_count: (i64,) = count_builder
                .build_query_as()
                .fetch_one(&mut **tx.as_mut())
                .await
                .map_err(|e| {
                    tracing::error!("Failed to count rollback requests: {}", e);
                    Error::new("Failed to count rollback requests")
                })?;

            // Calculate pagination info
            let has_next_page = offset + first < total_count.0;
            let has_previous_page = offset > 0;

            Ok(RollbackRequestsConnection {
                nodes: requests,
                total_count: total_count.0,
                page_info: PageInfo {
                    has_next_page,
                    has_previous_page,
                    start_cursor: None,
                    end_cursor: None,
                },
            })
        })).await
    }

    // ============================================================
    // Bulk Rollback Batch Queries
    // ============================================================

    /// Get a single bulk rollback batch by ID
    async fn bulk_rollback_batch(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
    ) -> Result<Option<BulkRollbackBatch>> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let batch = sqlx::query_as::<_, BulkRollbackBatch>(
            r#"
            SELECT id, batch_name, requester_id, total_items, completed_items,
                   status, started_at, completed_at, created_at
            FROM hr_public.bulk_rollback_batches
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(pool)
        .await?;

        Ok(batch)
    }

    /// Get all bulk rollback batches with pagination
    async fn bulk_rollback_batches(
        &self,
        ctx: &Context<'_>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<BulkRollbackBatch>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);
        let offset = offset.unwrap_or(0);

        let batches = sqlx::query_as::<_, BulkRollbackBatch>(
            r#"
            SELECT id, batch_name, requester_id, total_items, completed_items,
                   status, started_at, completed_at, created_at
            FROM hr_public.bulk_rollback_batches
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
            "#,
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(pool)
        .await?;

        Ok(batches)
    }

    /// Get bulk rollback batches by status
    async fn bulk_rollback_batches_by_status(
        &self,
        ctx: &Context<'_>,
        status: String,
        limit: Option<i64>,
    ) -> Result<Vec<BulkRollbackBatch>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);

        let batches = sqlx::query_as::<_, BulkRollbackBatch>(
            r#"
            SELECT id, batch_name, requester_id, total_items, completed_items,
                   status, started_at, completed_at, created_at
            FROM hr_public.bulk_rollback_batches
            WHERE status = $1
            ORDER BY created_at DESC
            LIMIT $2
            "#,
        )
        .bind(status)
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Ok(batches)
    }

    /// Count bulk rollback batches
    async fn bulk_rollback_batches_count(&self, ctx: &Context<'_>) -> Result<i64> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM hr_public.bulk_rollback_batches")
            .fetch_one(pool)
            .await?;

        Ok(count.0)
    }

    // ============================================================
    // Bulk Rollback Item Queries
    // ============================================================

    /// Get a single bulk rollback item by ID
    async fn bulk_rollback_item(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
    ) -> Result<Option<BulkRollbackItem>> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let item = sqlx::query_as::<_, BulkRollbackItem>(
            r#"
            SELECT id, batch_id, resource_type, resource_id, rollback_to_timestamp,
                   status, error_message, completed_at
            FROM hr_public.bulk_rollback_items
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(pool)
        .await?;

        Ok(item)
    }

    /// Get bulk rollback items by batch ID
    async fn bulk_rollback_items_by_batch(
        &self,
        ctx: &Context<'_>,
        batch_id: Uuid,
        limit: Option<i64>,
    ) -> Result<Vec<BulkRollbackItem>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);

        let items = sqlx::query_as::<_, BulkRollbackItem>(
            r#"
            SELECT id, batch_id, resource_type, resource_id, rollback_to_timestamp,
                   status, error_message, completed_at
            FROM hr_public.bulk_rollback_items
            WHERE batch_id = $1
            ORDER BY completed_at DESC
            LIMIT $2
            "#,
        )
        .bind(batch_id)
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Ok(items)
    }

    /// Get bulk rollback items by status
    async fn bulk_rollback_items_by_status(
        &self,
        ctx: &Context<'_>,
        status: String,
        limit: Option<i64>,
    ) -> Result<Vec<BulkRollbackItem>> {
        let pool = ctx.data::<DatabaseConnection>()?;
        let limit = limit.unwrap_or(100).min(1000);

        let items = sqlx::query_as::<_, BulkRollbackItem>(
            r#"
            SELECT id, batch_id, resource_type, resource_id, rollback_to_timestamp,
                   status, error_message, completed_at
            FROM hr_public.bulk_rollback_items
            WHERE status = $1
            ORDER BY completed_at DESC
            LIMIT $2
            "#,
        )
        .bind(status)
        .bind(limit)
        .fetch_all(pool)
        .await?;

        Ok(items)
    }

    /// Count bulk rollback items
    async fn bulk_rollback_items_count(
        &self,
        ctx: &Context<'_>,
        batch_id: Option<Uuid>,
    ) -> Result<i64> {
        let pool = ctx.data::<DatabaseConnection>()?;

        let count: (i64,) = if let Some(bid) = batch_id {
            sqlx::query_as(
                "SELECT COUNT(*) FROM hr_public.bulk_rollback_items WHERE batch_id = $1"
            )
            .bind(bid)
            .fetch_one(pool)
            .await?
        } else {
            sqlx::query_as("SELECT COUNT(*) FROM hr_public.bulk_rollback_items")
                .fetch_one(pool)
                .await?
        };

        Ok(count.0)
    }
}
