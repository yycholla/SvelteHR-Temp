use async_graphql::{Context, Object, Result};
use sea_orm::{EntityTrait, QueryFilter, QueryOrder, QuerySelect, ColumnTrait};
use uuid::Uuid;

use crate::{
    auth::{UserContext, RlsFilterable},
    database::get_db_from_context,
    models::user::{Model as User, Entity as UserEntity, Column as UserColumn},
};

#[derive(Default)]
#[allow(dead_code)]
pub struct UserQueries;

#[Object]
#[allow(dead_code)]
impl UserQueries {
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

        // Build query with RLS filter (removed hardcoded isActive filter - let client filter)
        let mut query = UserEntity::find()
            .filter(UserColumn::DeletedAt.is_null());

        // Apply RLS filter based on user context
        query = UserEntity::apply_rls(query, user_context);

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
        let user_context = ctx.data::<UserContext>()
            .map_err(|_| async_graphql::Error::new("Authentication required - UserContext not found"))?;

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
}

