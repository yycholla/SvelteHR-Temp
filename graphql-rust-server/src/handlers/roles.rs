use axum::{
    extract::State,
    response::{IntoResponse, Json},
    Extension,
};
use sea_orm::{EntityTrait, QueryOrder};

use crate::{
    auth::UserContext,
    error::AppError,
    handlers::AppState,
    models::role::{Column as RoleColumn, Entity as RoleEntity},
};

/// Handler to get all roles
/// Returns a list of roles ordered by level and name
#[utoipa::path(
    get,
    path = "/api/roles",
    tag = "Roles",
    responses(
        (status = 200, description = "List of all roles", body = Vec<crate::models::role::Model>),
        (status = 401, description = "Not authenticated"),
    ),
    security(
        ("session_cookie" = [])
    )
)]
pub async fn get_roles_handler(
    State(state): State<AppState>,
    Extension(_user_context): Extension<UserContext>, // Require authentication
) -> Result<impl IntoResponse, AppError> {
    let roles = RoleEntity::find()
        .order_by_asc(RoleColumn::Level)
        .order_by_asc(RoleColumn::Name)
        .all(&state.db)
        .await
        .map_err(AppError::from)?;

    Ok(Json(roles))
}
