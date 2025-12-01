use axum::{
    extract::State,
    response::{IntoResponse, Json},
    Extension,
};
use sea_orm::{EntityTrait, QueryOrder};

use crate::{
    error::AppError,
    handlers::AppState,
    auth::UserContext,
    models::role::{Entity as RoleEntity, Column as RoleColumn},
};

/// Handler to get all roles
/// Returns a list of roles ordered by level and name
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
