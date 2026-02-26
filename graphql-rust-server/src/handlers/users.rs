use axum::{
    extract::{Query, State},
    response::{IntoResponse, Json},
    Extension,
};
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter, QueryOrder, QuerySelect};
use serde::Deserialize;

use crate::{
    auth::UserContext,
    error::AppError,
    handlers::AppState,
    models::user::{Column as UserColumn, Entity as UserEntity},
    schema::apply_user_rls_filter,
};

/// Query parameters for the users endpoint
#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct GetUsersQuery {
    /// Maximum number of users to return (defaults to 1000, max 1000)
    #[serde(default = "default_limit")]
    #[param(example = 100, maximum = 1000)]
    pub limit: i64,
    /// Offset for pagination
    #[serde(default)]
    #[param(example = 0)]
    pub offset: i64,
}

fn default_limit() -> i64 {
    1000
}

/// Handler to get all users with optional limit and offset
/// Returns a list of users ordered by creation date
///
/// # Security: RLS Enforced
/// This endpoint applies Row-Level Security based on the user's department and role.
#[utoipa::path(
    get,
    path = "/api/users",
    tag = "Users",
    params(
        GetUsersQuery
    ),
    responses(
        (status = 200, description = "List of users with RLS applied", body = Vec<crate::models::user::Model>),
        (status = 401, description = "Not authenticated"),
    ),
    security(
        ("session_cookie" = [])
    )
)]
pub async fn get_users_handler(
    State(state): State<AppState>,
    Extension(user_context): Extension<UserContext>, // Require authentication
    Query(params): Query<GetUsersQuery>,
) -> Result<impl IntoResponse, AppError> {
    let limit = params.limit.clamp(1, 1000);
    let offset = params.offset.max(0);

    // Build query with RLS filter
    let mut query = UserEntity::find().filter(UserColumn::DeletedAt.is_null());

    // Apply RLS filter based on user context
    query = apply_user_rls_filter(query, &user_context);

    let users = query
        .order_by_desc(UserColumn::CreatedAt)
        .limit(Some(limit as u64))
        .offset(offset as u64)
        .all(&state.db)
        .await
        .map_err(AppError::from)?;

    Ok(Json(users))
}
