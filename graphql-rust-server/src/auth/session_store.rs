//! SeaORM-based session store for axum-login
//!
//! This module provides a session store implementation that uses SeaORM
//! to persist session data in the PostgreSQL database.

use async_trait::async_trait;
use axum_login::{AuthnBackend, UserId};
use sea_orm::{
    ActiveModelTrait, ActiveValue, ColumnTrait, DatabaseConnection, EntityTrait, PaginatorTrait, QueryFilter,
    QueryOrder, QuerySelect, prelude::Expr,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tower_sessions::{session::Id, session_store, Session, SessionStore};
use uuid::Uuid;

use crate::{
    models::{user, user_session},
};

/// Session data stored in the database
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionData {
    pub user_id: Uuid,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub last_activity: chrono::DateTime<chrono::Utc>,
}

/// SeaORM-based session store for axum-login
#[derive(Debug)]
pub struct SeaOrmSessionStore {
    db: DatabaseConnection,
}

impl SeaOrmSessionStore {
    /// Create a new SeaORM session store
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    /// Get the database connection
    pub fn db(&self) -> &DatabaseConnection {
        &self.db
    }
}

#[async_trait]
impl SessionStore for SeaOrmSessionStore {
    async fn save(&self, session: &tower_sessions::session::Record) -> session_store::Result<()> {
        let session_id = session.id.to_string();

        // Extract user_id from session data if present
        let user_id = session
            .data
            .get("auth")
            .and_then(|v| serde_json::from_value::<SessionData>(v.clone()).ok())
            .map(|data| data.user_id);

        let now = chrono::Utc::now();

        // Check if session already exists
        let existing = user_session::Entity::find()
            .filter(user_session::Column::SessionToken.eq(&session_id))
            .one(&self.db)
            .await
            .map_err(|e| session_store::Error::Backend(e.to_string()))?;

        if let Some(existing_session) = existing {
            // Update existing session
            let mut active_session: user_session::ActiveModel = existing_session.into();
            active_session.last_activity = ActiveValue::Set(now.into());
            active_session
                .update(&self.db)
                .await
                .map_err(|e| session_store::Error::Backend(e.to_string()))?;
        } else if let Some(user_id) = user_id {
            // Create new session
            let new_session = user_session::ActiveModel {
                id: ActiveValue::Set(Uuid::new_v4()),
                user_id: ActiveValue::Set(user_id),
                session_token: ActiveValue::Set(session_id),
                created_at: ActiveValue::Set(now.into()),
                expires_at: ActiveValue::Set((now + chrono::Duration::minutes(30)).into()),
                last_activity: ActiveValue::Set(now.into()),
                ip_address: ActiveValue::NotSet,
                user_agent: ActiveValue::NotSet,
                is_active: ActiveValue::Set(true),
            };

            new_session
                .insert(&self.db)
                .await
                .map_err(|e| session_store::Error::Backend(e.to_string()))?;
        }

        Ok(())
    }

    async fn load(&self, _session_id: &Id) -> session_store::Result<Option<tower_sessions::session::Record>> {
        // TODO: Implement session loading
        Ok(None)
    }

    async fn delete(&self, session_id: &Id) -> session_store::Result<()> {
        let session_id_str = session_id.to_string();

        user_session::Entity::delete_many()
            .filter(user_session::Column::SessionToken.eq(session_id_str))
            .exec(&self.db)
            .await
            .map_err(|e| session_store::Error::Backend(e.to_string()))?;

        Ok(())
    }
}

/// Clean up expired sessions (should be called periodically)
pub async fn cleanup_expired_sessions(db: &DatabaseConnection) -> Result<u64, sea_orm::DbErr> {
    let now = chrono::Utc::now();

    let delete_result = user_session::Entity::delete_many()
        .filter(
            user_session::Column::ExpiresAt.lt(now)
                .or(user_session::Column::IsActive.eq(false))
        )
        .exec(db)
        .await?;

    Ok(delete_result.rows_affected)
}

/// Get active session count for a user
pub async fn get_active_session_count(
    db: &DatabaseConnection,
    user_id: Uuid,
) -> Result<i64, sea_orm::DbErr> {
    let count = user_session::Entity::find()
        .filter(user_session::Column::UserId.eq(user_id))
        .filter(user_session::Column::IsActive.eq(true))
        .filter(user_session::Column::ExpiresAt.gt(chrono::Utc::now()))
        .count(db)
        .await?;

    Ok(count as i64)
}

/// Deactivate all sessions for a user (for logout or security)
pub async fn deactivate_user_sessions(
    db: &DatabaseConnection,
    user_id: Uuid,
) -> Result<u64, sea_orm::DbErr> {
    let update_result = user_session::Entity::update_many()
        .col_expr(user_session::Column::IsActive, Expr::value(false))
        .filter(user_session::Column::UserId.eq(user_id))
        .filter(user_session::Column::IsActive.eq(true))
        .exec(db)
        .await?;

    Ok(update_result.rows_affected)
}