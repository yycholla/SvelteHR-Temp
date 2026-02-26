use axum::{
    extract::{Path, State},
    response::{IntoResponse, Json},
    Extension,
};
use sea_orm::EntityTrait;
use serde_json::json;
use uuid::Uuid;

use crate::{auth::UserContext, error::AppError, handlers::AppState, models::event};

// Use absolute path from crate root to avoid resolution ambiguity
use crate::services::events::EventService;

/// Handler to delete an event
#[utoipa::path(
    delete,
    path = "/api/events/{id}",
    tag = "Events",
    params(
        ("id" = uuid::Uuid, Path, description = "Event UUID to delete")
    ),
    responses(
        (status = 200, description = "Event deleted successfully", body = serde_json::Value,
            example = json!({"success": true, "message": "Event deleted successfully"})),
        (status = 404, description = "Event not found"),
        (status = 403, description = "Not authorized to delete this event"),
        (status = 401, description = "Not authenticated"),
    ),
    security(
        ("session_cookie" = [])
    )
)]
pub async fn delete_event_handler(
    State(state): State<AppState>,
    Extension(user_context): Extension<UserContext>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    // 1. Fetch the event to check ownership
    let event = event::Entity::find_by_id(id)
        .one(&state.db)
        .await
        .map_err(AppError::from)?;

    let event = match event {
        Some(e) => e,
        None => return Err(AppError::NotFound("Event not found".to_string())),
    };

    // 2. Check permissions
    // Logic: Admin OR has 'events:delete' permission OR is the organizer
    let is_admin = user_context.roles.iter().any(|r| r == "Admin");
    let has_delete_permission = user_context
        .permissions
        .iter()
        .any(|p| p == "events:delete" || p == "*");
    let is_organizer = event.organizer_id == user_context.user_id;

    if !is_admin && !has_delete_permission && !is_organizer {
        return Err(AppError::Authorization(
            "You do not have permission to delete this event".to_string(),
        ));
    }

    // 3. Proceed with deletion
    let deleted = EventService::delete_event(&state.db, id).await?;

    if deleted {
        Ok(Json(
            json!({ "success": true, "message": "Event deleted successfully" }),
        ))
    } else {
        Err(AppError::NotFound(
            "Event not found or already deleted".to_string(),
        ))
    }
}
