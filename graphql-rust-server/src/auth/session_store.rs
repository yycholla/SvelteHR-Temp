//! SeaORM-based session store for axum-login
//!
//! This module provides a session store implementation that uses SeaORM
//! to persist session data in the PostgreSQL database using the standard
//! tower-sessions table structure.

use async_trait::async_trait;
use sea_orm::{
    ActiveModelTrait, ActiveValue, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter,
};
use tower_sessions::{session::Id, session_store, SessionStore};
use std::sync::Arc;

use crate::models::session as session;

use time::OffsetDateTime;

/// SeaORM-based session store for axum-login using tower-sessions standard table
#[derive(Debug, Clone)]
pub struct SeaOrmSessionStore {
    db: Arc<DatabaseConnection>,
}

impl SeaOrmSessionStore {
    /// Create a new SeaORM session store
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db: Arc::new(db) }
    }


}



#[async_trait]
impl SessionStore for SeaOrmSessionStore {
    async fn save(&self, session: &tower_sessions::session::Record) -> session_store::Result<()> {
        let session_id = session.id.to_string();
        let data = serde_json::to_vec(&session.data)
            .map_err(|e| session_store::Error::Backend(format!("Serialization error: {}", e)))?;

        // Check if session already exists
        let existing = session::Entity::find()
            .filter(session::Column::Id.eq(&session_id))
            .one(&*self.db)
            .await
            .map_err(|e| session_store::Error::Backend(e.to_string()))?;

        if let Some(_) = existing {
            // Update existing session
            let mut active_session: session::ActiveModel = existing.unwrap().into();
            active_session.data = ActiveValue::Set(data);
            active_session.expiry_date = ActiveValue::Set(chrono::DateTime::from_timestamp(session.expiry_date.unix_timestamp(), 0).unwrap_or_else(|| chrono::Utc::now()));
            active_session
                .update(&*self.db)
                .await
                .map_err(|e| session_store::Error::Backend(e.to_string()))?;
        } else {
            // Create new session
            let new_session = session::ActiveModel {
                id: ActiveValue::Set(session_id),
                data: ActiveValue::Set(data),
                expiry_date: ActiveValue::Set(chrono::DateTime::from_timestamp(session.expiry_date.unix_timestamp(), 0).unwrap_or_else(|| chrono::Utc::now())),
            };

            new_session
                .insert(&*self.db)
                .await
                .map_err(|e| session_store::Error::Backend(e.to_string()))?;
        }

        Ok(())
    }

    async fn load(&self, session_id: &Id) -> session_store::Result<Option<tower_sessions::session::Record>> {
        let session_id_str = session_id.to_string();

        // Find the session in database
        let session_model = session::Entity::find()
            .filter(session::Column::Id.eq(&session_id_str))
            .filter(session::Column::ExpiryDate.gt(chrono::Utc::now()))
            .one(&*self.db)
            .await
            .map_err(|e| session_store::Error::Backend(e.to_string()))?;

        if let Some(model) = session_model {
            let data: std::collections::HashMap<String, serde_json::Value> = serde_json::from_slice(&model.data)
                .map_err(|e| session_store::Error::Backend(format!("Deserialization error: {}", e)))?;

            let record = tower_sessions::session::Record {
                id: session_id.clone(),
                data,
                expiry_date: OffsetDateTime::from_unix_timestamp(model.expiry_date.timestamp()).unwrap_or_else(|_| OffsetDateTime::now_utc()),
            };

            Ok(Some(record))
        } else {
            Ok(None)
        }
    }

    async fn delete(&self, session_id: &Id) -> session_store::Result<()> {
        let session_id_str = session_id.to_string();

        session::Entity::delete_many()
            .filter(session::Column::Id.eq(session_id_str))
            .exec(&*self.db)
            .await
            .map_err(|e| session_store::Error::Backend(e.to_string()))?;

        Ok(())
    }
}

/// Clean up expired sessions (should be called periodically)
pub async fn cleanup_expired_sessions(db: &DatabaseConnection) -> Result<u64, sea_orm::DbErr> {
    let now = chrono::Utc::now();

    let delete_result = session::Entity::delete_many()
        .filter(session::Column::ExpiryDate.lt(now))
        .exec(db)
        .await?;

    Ok(delete_result.rows_affected)
}

/// Deactivate all sessions for a specific user (used during logout)
pub async fn deactivate_user_sessions(db: &DatabaseConnection, user_id: uuid::Uuid) -> Result<u64, sea_orm::DbErr> {
    // Deactivate user sessions by setting is_active to false
    // This works with the user_session table, not the tower-sessions table
    let update_result = crate::models::user_session::Entity::update_many()
        .col_expr(
            crate::models::user_session::Column::IsActive,
            sea_orm::prelude::Expr::value(false)
        )
        .filter(crate::models::user_session::Column::UserId.eq(user_id))
        .exec(db)
        .await?;

    Ok(update_result.rows_affected)
}