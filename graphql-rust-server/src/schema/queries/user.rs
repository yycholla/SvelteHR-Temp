use async_graphql::{Context, InputObject, Object, Result, SimpleObject};
use sea_orm::{ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter, QueryOrder, QuerySelect};
use uuid::Uuid;

use crate::{
    auth::{RlsFilterable, UserContext},
    database::get_db_from_context,
    models::user::{Column as UserColumn, Entity as UserEntity, Model as User},
};

#[derive(Debug, Clone, InputObject, Default)]
pub struct UserFilter {
    /// Search term to match against email, firstName, or lastName
    pub search_term: Option<String>,
    /// Filter by department ID
    pub department_id: Option<Uuid>,
    /// Filter by active status
    pub is_active: Option<bool>,
    /// Filter by status string (e.g., "active", "inactive")
    pub status: Option<String>,
    /// Filter by manager ID
    pub manager_id: Option<Uuid>,
}

#[derive(Debug, Clone, InputObject, Default)]
pub struct UserSort {
    /// Field to sort by (e.g., "firstName", "lastName", "email", "hireDate")
    pub field: Option<String>,
    /// Sort direction ("asc" or "desc")
    pub direction: Option<String>,
}

#[derive(Debug, Clone, SimpleObject)]
pub struct EmployeeStatistics {
    /// Total number of employees (excluding soft-deleted)
    pub total: i64,
    /// Number of active employees
    pub active: i64,
    /// Number of inactive employees
    pub inactive: i64,
    /// Count by department (optional, can be empty for now)
    pub by_department: Vec<DepartmentCount>,
}

#[derive(Debug, Clone, SimpleObject)]
pub struct DepartmentCount {
    pub department_id: Option<Uuid>,
    pub department_name: Option<String>,
    pub count: i64,
}

#[derive(Default)]
#[allow(dead_code)]
pub struct UserQueries;

#[Object]
#[allow(dead_code)]
impl UserQueries {
    /// Get all users with optional filtering, sorting, and pagination
    ///
    /// # Security: RLS Enforced
    /// This query applies Row-Level Security based on the user's department and role.
    async fn users(
        &self,
        ctx: &Context<'_>,
        filter: Option<UserFilter>,
        sort: Option<UserSort>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<User>> {
        let db = get_db_from_context(ctx)?;
        let limit = limit.unwrap_or(100).clamp(1, 1000);
        let offset = offset.unwrap_or(0).max(0);

        // Extract UserContext for RLS filtering
        let user_context = ctx.data::<UserContext>().map_err(|_| {
            async_graphql::Error::new("Authentication required - UserContext not found")
        })?;

        // Build query with RLS filter (removed hardcoded isActive filter - let client filter)
        let mut query = UserEntity::find().filter(UserColumn::DeletedAt.is_null());

        // Apply RLS filter based on user context
        query = UserEntity::apply_rls(query, user_context);

        // Apply filters
        if let Some(f) = &filter {
            if let Some(search) = &f.search_term {
                let pattern = format!("%{}%", search.to_lowercase());
                query = query.filter(
                    sea_orm::Condition::any()
                        .add(UserColumn::Email.contains(&pattern))
                        .add(UserColumn::FirstName.contains(&pattern))
                        .add(UserColumn::LastName.contains(&pattern)),
                );
            }
            if let Some(dept_id) = f.department_id {
                query = query.filter(UserColumn::DepartmentId.eq(dept_id));
            }
            if let Some(is_active) = f.is_active {
                query = query.filter(UserColumn::IsActive.eq(is_active));
            }
            if let Some(status) = &f.status {
                query = query.filter(UserColumn::Status.eq(status));
            }
            if let Some(manager_id) = f.manager_id {
                query = query.filter(UserColumn::ManagerId.eq(manager_id));
            }
        }

        // Apply sorting
        query = if let Some(s) = &sort {
            let direction = s.direction.as_deref().unwrap_or("asc");
            let field = s.field.as_deref().unwrap_or("lastName");

            match (field, direction) {
                ("firstName", "desc") => query.order_by_desc(UserColumn::FirstName),
                ("firstName", _) => query.order_by_asc(UserColumn::FirstName),
                ("lastName", "desc") => query.order_by_desc(UserColumn::LastName),
                ("lastName", _) => query.order_by_asc(UserColumn::LastName),
                ("email", "desc") => query.order_by_desc(UserColumn::Email),
                ("email", _) => query.order_by_asc(UserColumn::Email),
                ("hireDate", "desc") => query.order_by_desc(UserColumn::HireDate),
                ("hireDate", _) => query.order_by_asc(UserColumn::HireDate),
                (_, _) => query.order_by_asc(UserColumn::LastName),
            }
        } else {
            // Default sort
            query.order_by_desc(UserColumn::CreatedAt)
        };

        let users = query
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
        let user_context = ctx.data::<UserContext>().map_err(|_| {
            async_graphql::Error::new("Authentication required - UserContext not found")
        })?;

        // Build query with RLS filter (CRITICAL: even direct ID lookups must be filtered!)
        let mut query = UserEntity::find()
            .filter(UserColumn::Id.eq(id))
            .filter(UserColumn::DeletedAt.is_null());

        // Apply RLS filter to prevent cross-tenant access
        query = UserEntity::apply_rls(query, user_context);

        let user = query.one(&db).await?;
        Ok(user)
    }

    /// Get a single user by email address
    ///
    /// # Security: RLS Enforced
    /// This query applies Row-Level Security - users can only access employees from their department.
    /// Email lookups are normalized to lowercase for case-insensitive matching.
    async fn user_by_email(&self, ctx: &Context<'_>, email: String) -> Result<Option<User>> {
        let db = get_db_from_context(ctx)?;

        // Extract UserContext for RLS filtering
        let user_context = ctx.data::<UserContext>().map_err(|_| {
            async_graphql::Error::new("Authentication required - UserContext not found")
        })?;

        // Normalize email to lowercase for case-insensitive lookup
        let normalized_email = email.to_lowercase();

        // Build query with RLS filter
        let mut query = UserEntity::find()
            .filter(UserColumn::Email.eq(&normalized_email))
            .filter(UserColumn::DeletedAt.is_null());

        // Apply RLS filter to prevent cross-tenant access
        query = UserEntity::apply_rls(query, user_context);

        let user = query.one(&db).await?;
        Ok(user)
    }

    /// Get employee statistics for dashboard
    ///
    /// Returns counts of total, active, and inactive employees
    async fn employee_statistics(&self, ctx: &Context<'_>) -> Result<EmployeeStatistics> {
        let db = get_db_from_context(ctx)?;

        // Count total (excluding soft-deleted)
        let total = UserEntity::find()
            .filter(UserColumn::DeletedAt.is_null())
            .count(&db)
            .await? as i64;

        // Count active
        let active = UserEntity::find()
            .filter(UserColumn::DeletedAt.is_null())
            .filter(UserColumn::IsActive.eq(true))
            .count(&db)
            .await? as i64;

        let inactive = total - active;

        Ok(EmployeeStatistics {
            total,
            active,
            inactive,
            by_department: vec![], // Simplified for now
        })
    }
}
