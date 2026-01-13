//! Intuit QuickBooks OAuth Callback Handler
//!
//! Handles the OAuth 2.0 callback from QuickBooks after user authorization

use axum::{
    extract::{Query, State},
    response::{IntoResponse, Redirect},
};
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, Set};
use serde::Deserialize;
use uuid::Uuid;

use crate::{
    handlers::AppState,
    integrations::intuit::{exchange_code_for_tokens, IntuitClient, IntuitClientManager},
    models::intuit_connection,
    services::{
        sync_orchestrator::SyncOrchestrator,
        conflict_resolver::ConflictStrategy,
        sync_tracker::EntityType,
        incremental_sync::SyncMode,
    },
};

/// OAuth callback query parameters
#[derive(Debug, Deserialize)]
pub struct OAuthCallbackQuery {
    /// Authorization code from QuickBooks
    pub code: Option<String>,
    /// Realm ID (QuickBooks company ID)
    #[serde(rename = "realmId")]
    pub realm_id: Option<String>,
    /// State parameter for CSRF protection
    pub state: Option<String>,
    /// Error from QuickBooks (if authorization was denied)
    pub error: Option<String>,
}

/// Handle OAuth callback from QuickBooks
pub async fn intuit_oauth_callback_handler(
    State(state): State<AppState>,
    Query(params): Query<OAuthCallbackQuery>,
) -> impl IntoResponse {
    // Check for error from QuickBooks (user denied authorization)
    if let Some(error) = params.error {
        tracing::warn!("QuickBooks OAuth error: {}", error);
        return Redirect::to(&format!(
            "/admin/settings/integrations?error={}",
            urlencoding::encode(&format!("Authorization failed: {}", error))
        ));
    }

    // Extract required parameters
    let code = match params.code {
        Some(c) => c,
        None => {
            tracing::error!("Missing authorization code in OAuth callback");
            return Redirect::to("/admin/settings/integrations?error=missing_code");
        }
    };

    let realm_id = match params.realm_id {
        Some(r) => r,
        None => {
            tracing::error!("Missing realm_id in OAuth callback");
            return Redirect::to("/admin/settings/integrations?error=missing_realm_id");
        }
    };

    // Exchange authorization code for tokens
    let tokens = match exchange_code_for_tokens(code).await {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Failed to exchange code for tokens: {}", e);
            return Redirect::to(&format!(
                "/admin/settings/integrations?error={}",
                urlencoding::encode(&format!("Failed to get tokens: {}", e))
            ));
        }
    };

    // Get company info from QuickBooks
    let company_name = match get_company_name(&tokens.access_token, &realm_id).await {
        Ok(name) => Some(name),
        Err(e) => {
            tracing::warn!("Failed to get company name: {}", e);
            None
        }
    };

    // Calculate token expiration
    let expires_at = chrono::Utc::now() + chrono::Duration::seconds(tokens.expires_in);

    // Check if connection already exists for this realm
    let existing_connection = intuit_connection::Entity::find()
        .filter(intuit_connection::Column::RealmId.eq(&realm_id))
        .filter(intuit_connection::Column::DeletedAt.is_null())
        .one(&state.db)
        .await;

    match existing_connection {
        Ok(Some(existing)) => {
            // Update existing connection
            let mut active_model: intuit_connection::ActiveModel = existing.into();
            active_model.access_token = Set(tokens.access_token);
            active_model.refresh_token = Set(tokens.refresh_token);
            active_model.token_expires_at = Set(expires_at.into());
            active_model.company_name = Set(company_name);
            active_model.is_active = Set(true);
            active_model.updated_at = Set(chrono::Utc::now().into());

            match active_model.update(&state.db).await {
                Ok(_) => {
                    tracing::info!(realm_id = %realm_id, "Updated existing QuickBooks connection");

                    // Spawn background task to sync initial data from QuickBooks
                    let db_clone = state.db.clone();
                    let realm_id_clone = realm_id.clone();
                    tokio::spawn(async move {
                        trigger_initial_sync(db_clone, realm_id_clone).await;
                    });

                    Redirect::to("/admin/settings/integrations?success=reconnected")
                }
                Err(e) => {
                    tracing::error!("Failed to update connection: {}", e);
                    Redirect::to(&format!(
                        "/admin/settings/integrations?error={}",
                        urlencoding::encode(&format!("Failed to save connection: {}", e))
                    ))
                }
            }
        }
        Ok(None) => {
            // Create new connection
            let new_connection = intuit_connection::ActiveModel {
                id: Set(Uuid::new_v4()),
                realm_id: Set(realm_id.clone()),
                access_token: Set(tokens.access_token),
                refresh_token: Set(tokens.refresh_token),
                token_expires_at: Set(expires_at.into()),
                company_name: Set(company_name),
                is_active: Set(true),
                last_sync_at: Set(None),
                employee_sync_token: Set(None),
                department_sync_token: Set(None),
                last_employee_sync_at: Set(None),
                last_department_sync_at: Set(None),
                created_at: Set(chrono::Utc::now().into()),
                updated_at: Set(chrono::Utc::now().into()),
                deleted_at: Set(None),
            };

            match new_connection.insert(&state.db).await {
                Ok(_) => {
                    tracing::info!(realm_id = %realm_id, "Created new QuickBooks connection");

                    // Spawn background task to sync initial data from QuickBooks
                    let db_clone = state.db.clone();
                    let realm_id_clone = realm_id.clone();
                    tokio::spawn(async move {
                        trigger_initial_sync(db_clone, realm_id_clone).await;
                    });

                    Redirect::to("/admin/settings/integrations?success=connected")
                }
                Err(e) => {
                    tracing::error!("Failed to save connection: {}", e);
                    Redirect::to(&format!(
                        "/admin/settings/integrations?error={}",
                        urlencoding::encode(&format!("Failed to save connection: {}", e))
                    ))
                }
            }
        }
        Err(e) => {
            tracing::error!("Database error checking for existing connection: {}", e);
            Redirect::to(&format!(
                "/admin/settings/integrations?error={}",
                urlencoding::encode(&format!("Database error: {}", e))
            ))
        }
    }
}

/// Get company name from QuickBooks
async fn get_company_name(access_token: &str, realm_id: &str) -> anyhow::Result<String> {
    let client = IntuitClient::new(access_token.to_string(), realm_id.to_string())?;

    // Get company info from QuickBooks
    let company_info = client.get_company_info().await?;

    company_info
        .company_name
        .ok_or_else(|| anyhow::anyhow!("Company name not found"))
}

/// Trigger initial sync after OAuth connection is established
/// This runs in the background to avoid blocking the OAuth callback response
async fn trigger_initial_sync(db: sea_orm::DatabaseConnection, realm_id: String) {
    tracing::info!(
        realm_id = %realm_id,
        "Starting initial QuickBooks data sync after OAuth connection"
    );

    // Get QuickBooks client with automatic token refresh
    let client_manager = IntuitClientManager::new(db.clone());
    let client = match client_manager.get_client().await {
        Ok(c) => c,
        Err(e) => {
            tracing::error!(
                realm_id = %realm_id,
                error = %e,
                "Failed to create Intuit client for initial sync"
            );
            return;
        }
    };

    // Sync employees first (most critical data)
    tracing::info!("Syncing employees from QuickBooks...");
    let employee_result = SyncOrchestrator::sync_bidirectional_intelligent(
        &db,
        &client,
        EntityType::Employee,
        ConflictStrategy::RemoteWins, // On initial sync, QuickBooks data wins
        SyncMode::Full, // Force full sync on first connection
    )
    .await;

    match employee_result {
        Ok(report) => {
            tracing::info!(
                realm_id = %realm_id,
                pulled = report.pulled_count,
                errors = report.errors.len(),
                "Initial employee sync completed"
            );
        }
        Err(e) => {
            tracing::error!(
                realm_id = %realm_id,
                error = %e,
                "Initial employee sync failed"
            );
        }
    }

    // Sync departments
    tracing::info!("Syncing departments from QuickBooks...");
    let department_result = SyncOrchestrator::sync_bidirectional_intelligent(
        &db,
        &client,
        EntityType::Department,
        ConflictStrategy::RemoteWins,
        SyncMode::Full,
    )
    .await;

    match department_result {
        Ok(report) => {
            tracing::info!(
                realm_id = %realm_id,
                pulled = report.pulled_count,
                errors = report.errors.len(),
                "Initial department sync completed"
            );
        }
        Err(e) => {
            tracing::error!(
                realm_id = %realm_id,
                error = %e,
                "Initial department sync failed"
            );
        }
    }

    tracing::info!(
        realm_id = %realm_id,
        "Initial QuickBooks sync completed. Users can now see their QuickBooks data in SvelteHR."
    );
}
