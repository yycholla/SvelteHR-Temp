use chrono::Utc;
use sea_orm::{ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, Set};
use uuid::Uuid;

use crate::error::AppError;
use crate::models::event::{self, ActiveModel, Entity};

/// Service for managing events
pub struct EventService;

impl EventService {
    /// Soft delete an event (sets deleted_at timestamp)
    pub async fn delete_event(db: &DatabaseConnection, id: Uuid) -> Result<bool, AppError> {
        // Find the event first to ensure it exists
        let event = Entity::find_by_id(id)
            .filter(event::Column::DeletedAt.is_null())
            .one(db)
            .await
            .map_err(AppError::from)?;

        if let Some(event) = event {
            // Soft delete by setting deleted_at
            let mut event: ActiveModel = event.into();
            event.deleted_at = Set(Some(Utc::now()));

            event.update(db).await.map_err(AppError::from)?;
            Ok(true)
        } else {
            Ok(false)
        }
    }
}
