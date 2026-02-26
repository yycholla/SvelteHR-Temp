//! Centralized QuickBooks client manager with automatic token refresh
//!
//! This manager ensures all QuickBooks API operations use valid tokens
//! by automatically refreshing expired tokens before creating clients.

use super::client::IntuitClient;
use super::oauth::refresh_access_token;
use crate::models::intuit_connection::{
    ActiveModel as IntuitConnectionActiveModel, Column as IntuitConnectionColumn,
    Entity as IntuitConnectionEntity,
};
use anyhow::{Context, Result};
use chrono::Utc;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, PaginatorTrait, QueryFilter,
    QueryOrder, Set,
};

/// Manager for QuickBooks API clients with automatic token refresh
pub struct IntuitClientManager {
    db: DatabaseConnection,
}

impl IntuitClientManager {
    /// Create a new client manager
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    /// Get a valid QuickBooks client with automatic token refresh
    ///
    /// This method:
    /// 1. Fetches the active QuickBooks connection from the database
    /// 2. Checks if the access token is expired or expiring soon (within 5 minutes)
    /// 3. Automatically refreshes the token if needed
    /// 4. Returns a client with a valid access token
    ///
    /// # Errors
    ///
    /// Returns an error if:
    /// - No active QuickBooks connection is found
    /// - Token refresh fails
    /// - Database operations fail
    pub async fn get_client(&self) -> Result<IntuitClient> {
        // Get active Intuit connection from database
        let connection = IntuitConnectionEntity::find()
            .filter(IntuitConnectionColumn::IsActive.eq(true))
            .filter(IntuitConnectionColumn::DeletedAt.is_null())
            .order_by_desc(IntuitConnectionColumn::UpdatedAt)
            .order_by_desc(IntuitConnectionColumn::CreatedAt)
            .one(&self.db)
            .await
            .context("Failed to query Intuit connection")?
            .ok_or_else(|| anyhow::anyhow!("No active QuickBooks connection found"))?;

        // Check if token is expired or about to expire (within 5 minutes)
        let now = Utc::now();
        let expires_soon = connection.token_expires_at <= now + chrono::Duration::minutes(5);

        let access_token = if expires_soon {
            tracing::warn!(
                realm_id = %connection.realm_id,
                expires_at = %connection.token_expires_at,
                "QuickBooks access token expired or expiring soon, refreshing..."
            );

            if connection.refresh_token.trim().is_empty() {
                return Err(anyhow::anyhow!(
                    "QuickBooks refresh token is missing; reconnect integration to continue"
                ));
            }

            // Refresh the token
            let new_tokens = refresh_access_token(connection.refresh_token.clone())
                .await
                .context("Failed to refresh QuickBooks access token")?;

            // Calculate new expiration time
            let new_expires_at = Utc::now() + chrono::Duration::seconds(new_tokens.expires_in);

            // Update connection with new tokens
            let mut active_model: IntuitConnectionActiveModel = connection.clone().into();
            active_model.access_token = Set(new_tokens.access_token.clone());
            active_model.refresh_token = Set(new_tokens.refresh_token);
            active_model.token_expires_at = Set(new_expires_at.into());
            active_model.updated_at = Set(Utc::now().into());
            active_model
                .update(&self.db)
                .await
                .context("Failed to update connection with new tokens")?;

            tracing::info!(
                realm_id = %connection.realm_id,
                new_expires_at = %new_expires_at,
                "QuickBooks access token refreshed successfully"
            );

            new_tokens.access_token
        } else {
            tracing::debug!(
                realm_id = %connection.realm_id,
                expires_at = %connection.token_expires_at,
                "Using existing QuickBooks access token"
            );
            connection.access_token.clone()
        };

        // Create and return client with valid token
        IntuitClient::new(access_token, connection.realm_id)
            .context("Failed to create QuickBooks client")
    }

    /// Get the realm ID of the active QuickBooks connection
    pub async fn get_realm_id(&self) -> Result<String> {
        let connection = IntuitConnectionEntity::find()
            .filter(IntuitConnectionColumn::IsActive.eq(true))
            .filter(IntuitConnectionColumn::DeletedAt.is_null())
            .order_by_desc(IntuitConnectionColumn::UpdatedAt)
            .order_by_desc(IntuitConnectionColumn::CreatedAt)
            .one(&self.db)
            .await
            .context("Failed to query Intuit connection")?
            .ok_or_else(|| anyhow::anyhow!("No active QuickBooks connection found"))?;

        Ok(connection.realm_id)
    }

    /// Check if there's an active QuickBooks connection
    pub async fn has_active_connection(&self) -> Result<bool> {
        let count = IntuitConnectionEntity::find()
            .filter(IntuitConnectionColumn::IsActive.eq(true))
            .filter(IntuitConnectionColumn::DeletedAt.is_null())
            .count(&self.db)
            .await
            .context("Failed to check for active connection")?;

        Ok(count > 0)
    }

    /// Get the connection ID of the active QuickBooks connection
    pub async fn get_connection_id(&self) -> Result<uuid::Uuid> {
        let connection = IntuitConnectionEntity::find()
            .filter(IntuitConnectionColumn::IsActive.eq(true))
            .filter(IntuitConnectionColumn::DeletedAt.is_null())
            .order_by_desc(IntuitConnectionColumn::UpdatedAt)
            .order_by_desc(IntuitConnectionColumn::CreatedAt)
            .one(&self.db)
            .await
            .context("Failed to query Intuit connection")?
            .ok_or_else(|| anyhow::anyhow!("No active QuickBooks connection found"))?;

        Ok(connection.id)
    }
}
