//! HTTP request handlers

use axum::{
    extract::{ConnectInfo, Extension, State},
    response::{Html, Json, Redirect},
    http::StatusCode,
};
use axum_login::AuthSession;
use sea_orm::{DatabaseConnection, EntityTrait, ColumnTrait, QueryFilter, ActiveModelTrait};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;

use crate::{
    auth::{AuthBackend, Credentials},
    dataloader::DataLoaderContext,
    schema::GraphQLSchema,
};

pub mod events;
pub mod roles;
pub mod users;
pub mod upload;

use crate::models::user::Entity as UserEntity; // Import UserEntity

/// Application state containing shared resources
#[derive(Clone)]
pub struct AppState {
    pub db: DatabaseConnection,
    pub schema: GraphQLSchema,
    pub dataloaders: DataLoaderContext,
}

/// GraphQL playground handler
pub async fn graphql_playground() -> Html<String> {
    Html(async_graphql::http::playground_source(
        async_graphql::http::GraphQLPlaygroundConfig::new("/graphql"),
    ))
}

/// Login request payload
#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

/// Login response
#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub user: UserInfo,
    pub session_expires: String,
}

/// User information in responses
#[derive(Debug, Serialize)]
pub struct UserInfo {
    pub id: String,
    pub email: String,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub display_name: Option<String>,
    pub role: String,       // Legacy single role field for backward compatibility
    pub roles: Vec<String>, // RBAC roles array
    pub permissions: Vec<String>,
}

/// Login handler
pub async fn login_handler(
    mut auth_session: AuthSession<AuthBackend>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    State(app_state): State<AppState>,
    Json(login_req): Json<LoginRequest>,
) -> Result<Json<LoginResponse>, StatusCode> {
    let client_ip = addr.ip().to_string();

    // Rate limiting: Check if IP or account is rate limited
    if auth_session.backend.rate_limiter().is_ip_rate_limited(&client_ip).await {
        tracing::warn!("IP rate limit exceeded for IP: {}", client_ip);
        return Err(StatusCode::TOO_MANY_REQUESTS);
    }

    if auth_session.backend.rate_limiter().is_account_rate_limited(&login_req.email).await {
        tracing::warn!("Account rate limit exceeded for email: {}", login_req.email);
        return Err(StatusCode::TOO_MANY_REQUESTS);
    }

    let creds = Credentials {
        email: login_req.email.clone(),
        password: login_req.password,
    };

    match auth_session.authenticate(creds).await {
        Ok(Some(user)) => {
            // Login successful - create session
            auth_session.login(&user).await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

            // Fetch the full User entity from the database
            let full_user = UserEntity::find_by_id(user.id)
                .one(&app_state.db)
                .await
                .map_err(|e| {
                    tracing::error!("Failed to fetch full user details in login: {}", e);
                    StatusCode::INTERNAL_SERVER_ERROR
                })?
                .ok_or(StatusCode::INTERNAL_SERVER_ERROR)?; // User must exist if authenticated

            // Load roles and permissions from database via RBAC tables
            let (roles, permissions) = crate::auth::get_user_roles_and_permissions(&app_state.db, user.id)
                .await
                .map_err(|e| {
                    tracing::error!("Failed to load user roles/permissions in login: {}", e);
                    StatusCode::INTERNAL_SERVER_ERROR
                })?;

            let response = LoginResponse {
                user: UserInfo {
                    id: user.id.to_string(),
                    email: user.email.clone(),
                    first_name: Some(full_user.first_name),
                    last_name: Some(full_user.last_name),
                    display_name: Some(full_user.display_name),
                    role: roles.first().cloned().unwrap_or_else(|| "Employee".to_string()), // Legacy field
                    roles,        // RBAC roles array
                    permissions,  // RBAC permissions array
                },
                session_expires: (chrono::Utc::now() + chrono::Duration::minutes(30)).to_rfc3339(),
            };

            Ok(Json(response))
        }
        Ok(None) => {
            // Authentication failed - record rate limiting attempts
            auth_session.backend.rate_limiter().record_ip_attempt(&client_ip).await;
            auth_session.backend.rate_limiter().record_account_attempt(&login_req.email).await;

            // Log additional security event with IP and user agent
            let activity_log = crate::models::system::activity_log::ActiveModel {
                id: sea_orm::ActiveValue::Set(uuid::Uuid::new_v4()),
                user_id: sea_orm::ActiveValue::Set(uuid::Uuid::nil()), // No user ID for failed login
                employee_id: sea_orm::ActiveValue::NotSet,
                action: sea_orm::ActiveValue::Set("login_failed".to_string()),
                resource_type: sea_orm::ActiveValue::Set("authentication".to_string()),
                resource_id: sea_orm::ActiveValue::NotSet,
                details: sea_orm::ActiveValue::Set(Some(serde_json::json!({
                    "email": login_req.email,
                    "reason": "authentication_failed"
                }))),
                before_snapshot: sea_orm::ActiveValue::NotSet,
                after_snapshot: sea_orm::ActiveValue::NotSet,
                is_rollback: sea_orm::ActiveValue::Set(false),
                rolled_back_log_id: sea_orm::ActiveValue::NotSet,
                ip_address: sea_orm::ActiveValue::Set(Some(client_ip.clone())),
                user_agent: sea_orm::ActiveValue::NotSet, // Would need to extract from headers
                signature_id: sea_orm::ActiveValue::NotSet,
                batch_id: sea_orm::ActiveValue::NotSet,
                created_at: sea_orm::ActiveValue::Set(chrono::Utc::now().into()),
            };
            let _ = activity_log.insert(&app_state.db).await;

            tracing::warn!("Failed login attempt from IP: {} for user: {}", client_ip, login_req.email);
            Err(StatusCode::UNAUTHORIZED)
        }
        Err(_) => {
            // Internal error - still record the attempts for rate limiting
            auth_session.backend.rate_limiter().record_ip_attempt(&client_ip).await;
            auth_session.backend.rate_limiter().record_account_attempt(&login_req.email).await;
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// Logout handler
pub async fn logout_handler(
    mut auth_session: AuthSession<AuthBackend>,
    State(app_state): State<AppState>,
) -> Result<Redirect, StatusCode> {
    // Get user ID before logout
    let user_id = auth_session.user.as_ref().map(|u| u.id);

    match auth_session.logout().await {
        Ok(_) => {
            // Deactivate all sessions for this user in database
            if let Some(uid) = user_id {
                if let Err(e) = crate::auth::session_store::deactivate_user_sessions(&app_state.db, uid).await {
                    tracing::error!("Failed to deactivate user sessions during logout: {:?}", e);
                    // Don't fail logout if session cleanup fails
                }
            }

            // Redirect to login page after logout
            Ok(Redirect::to("/login"))
        }
        Err(e) => {
            tracing::error!("Logout error: {:?}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// Get current user info handler
pub async fn me_handler(
    auth_session: AuthSession<AuthBackend>,
    State(app_state): State<AppState>,
) -> Result<Json<UserInfo>, StatusCode> {
    match &auth_session.user {
        Some(user) => {
            // Fetch the full User entity from the database
            let full_user = UserEntity::find_by_id(user.id)
                .one(&app_state.db)
                .await
                .map_err(|e| {
                    tracing::error!("Failed to fetch full user details in /auth/me: {}", e);
                    StatusCode::INTERNAL_SERVER_ERROR
                })?
                .ok_or(StatusCode::INTERNAL_SERVER_ERROR)?; // User must exist if authenticated

            // Load roles and permissions from database via RBAC tables
            let (roles, permissions) = crate::auth::get_user_roles_and_permissions(&app_state.db, user.id)
                .await
                .map_err(|e| {
                    tracing::error!("Failed to load user roles/permissions in /auth/me: {}", e);
                    StatusCode::INTERNAL_SERVER_ERROR
                })?;

            let user_info = UserInfo {
                id: user.id.to_string(),
                email: user.email.clone(),
                first_name: Some(full_user.first_name),
                last_name: Some(full_user.last_name),
                display_name: Some(full_user.display_name),
                role: roles.first().cloned().unwrap_or_else(|| "Employee".to_string()), // Legacy field: use first role
                roles,        // RBAC roles array
                permissions,  // RBAC permissions array
            };
            Ok(Json(user_info))
        }
        None => Err(StatusCode::UNAUTHORIZED),
    }
}

/// Session refresh handler
pub async fn refresh_handler(
    auth_session: AuthSession<AuthBackend>,
    State(app_state): State<AppState>,
) -> Result<Json<RefreshResponse>, StatusCode> {
    match &auth_session.user {
        Some(user) => {
            // Find and update the session in database to extend expiration
            // We need to get the current session ID from the session store
            // For now, we'll extend all active sessions for this user

            let now = chrono::Utc::now();
            let new_expires_at = now + chrono::Duration::minutes(30);

            // Update session expiration in database
            let update_result = crate::models::user_session::Entity::update_many()
                .col_expr(
                    crate::models::user_session::Column::ExpiresAt,
                    sea_orm::prelude::Expr::value(new_expires_at)
                )
                .col_expr(
                    crate::models::user_session::Column::LastActivity,
                    sea_orm::prelude::Expr::value(now)
                )
                .filter(crate::models::user_session::Column::UserId.eq(user.id))
                .filter(crate::models::user_session::Column::IsActive.eq(true))
                .filter(crate::models::user_session::Column::ExpiresAt.gt(now))
                .exec(&app_state.db)
                .await;

            match update_result {
                Ok(_) => {
                    let response = RefreshResponse {
                        success: true,
                        session_expires: new_expires_at.to_rfc3339(),
                        message: "Session refreshed successfully".to_string(),
                    };
                    Ok(Json(response))
                }
                Err(e) => {
                    tracing::error!("Failed to refresh session: {:?}", e);
                    let response = RefreshResponse {
                        success: false,
                        session_expires: String::new(),
                        message: "Failed to refresh session".to_string(),
                    };
                    Ok(Json(response))
                }
            }
        }
        None => {
            let response = RefreshResponse {
                success: false,
                session_expires: String::new(),
                message: "No active session to refresh".to_string(),
            };
            Ok(Json(response))
        }
    }
}

/// Refresh response
#[derive(Debug, Serialize)]
pub struct RefreshResponse {
    pub success: bool,
    pub session_expires: String,
    pub message: String,
}

/// Session information for REST responses
#[derive(Debug, Serialize)]
pub struct SessionInfoResponse {
    pub id: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub expires_at: chrono::DateTime<chrono::Utc>,
    pub last_activity: chrono::DateTime<chrono::Utc>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub is_current_session: bool,
}

/// Sessions list response
#[derive(Debug, Serialize)]
pub struct SessionsResponse {
    pub sessions: Vec<SessionInfoResponse>,
}

/// List active sessions handler
pub async fn sessions_handler(
    auth_session: AuthSession<AuthBackend>,
    State(app_state): State<AppState>,
) -> Result<Json<SessionsResponse>, StatusCode> {
    let Some(user) = &auth_session.user else {
        return Err(StatusCode::UNAUTHORIZED);
    };

    let sessions = crate::models::user_session::Entity::find()
        .filter(crate::models::user_session::Column::UserId.eq(user.id))
        .filter(crate::models::user_session::Column::IsActive.eq(true))
        .filter(crate::models::user_session::Column::ExpiresAt.gt(chrono::Utc::now()))
        .all(&app_state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let current_session_id = None; // TODO: Get current session ID if needed

    let session_responses = sessions
        .into_iter()
        .map(|session| SessionInfoResponse {
            id: session.id.to_string(),
            created_at: session.created_at.into(),
            expires_at: session.expires_at.into(),
            last_activity: session.last_activity.into(),
            ip_address: session.ip_address,
            user_agent: session.user_agent,
            is_current_session: current_session_id.as_ref() == Some(&session.session_token),
        })
        .collect();

    Ok(Json(SessionsResponse {
        sessions: session_responses,
    }))
}

/// Request metadata for audit logging
#[derive(Debug, Clone)]
pub struct RequestMetadata {
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
}

/// GraphQL handler
pub async fn graphql_handler(
    State(app_state): State<AppState>,
    auth_session: AuthSession<AuthBackend>,
    headers: axum::http::HeaderMap,
    user_context_ext: Option<axum::extract::Extension<crate::auth::UserContext>>,
    req: async_graphql_axum::GraphQLRequest,
) -> async_graphql_axum::GraphQLResponse {
    // Extract operation name before moving req
    let operation_name = req.0.operation_name.clone();

    // Create request context with database and auth session
    let mut request = req.into_inner();

    // Extract request metadata for audit logging
    let ip_address = headers
        .get("x-forwarded-for")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.split(',').next().unwrap_or(s).trim().to_string())
        .or_else(|| {
            headers
                .get("x-real-ip")
                .and_then(|v| v.to_str().ok())
                .map(String::from)
        });

    let user_agent = headers
        .get("user-agent")
        .and_then(|v| v.to_str().ok())
        .map(String::from);

    let request_metadata = RequestMetadata {
        ip_address,
        user_agent,
    };

    // Add database connection to request context
    request = request.data(app_state.db.clone());
    request = request.data(auth_session.clone());
    request = request.data(request_metadata.clone());

    // Add DataLoaders to request context
    request = request.data(app_state.dataloaders.clone());

    // Use UserContext from middleware (which has correct roles/permissions from database)
    if let Some(Extension(user_context)) = user_context_ext {
        request = request.data(user_context);
    }

    // Execute the GraphQL request
    let response = app_state.schema.execute(request).await;

    // Log GraphQL errors with structured JSON logging
    if !response.errors.is_empty() {
        let user_id = auth_session.user.as_ref().map(|u| u.id.to_string());
        let user_email = auth_session.user.as_ref().map(|u| u.email.clone());

        for error in &response.errors {
            // Log error with structured context including actual error message
            tracing::error!(
                user_id = %user_id.as_deref().unwrap_or("anonymous"),
                user_email = %user_email.as_deref().unwrap_or("anonymous"),
                operation_name = %operation_name.as_deref().unwrap_or("unknown"),
                error_message = %error.message,
                error_path = ?error.path,
                "GraphQL request error"
            );
        }

        // Log summary
        tracing::error!(
            user_id = %user_id.as_deref().unwrap_or("anonymous"),
            error_count = response.errors.len(),
            operation_name = %operation_name.as_deref().unwrap_or("unknown"),
            "GraphQL request completed with errors"
        );


    } else {
        // Successful requests - logging disabled to reduce verbosity
        // Uncomment for debugging:
        // let user_id = auth_session.user.as_ref().map(|u| u.id.to_string());
        // tracing::debug!(
        //     user_id = %user_id.as_deref().unwrap_or("anonymous"),
        //     operation_name = %operation_name.as_deref().unwrap_or("unknown"),
        //     "GraphQL request completed successfully"
        // );
    }

    response.into()
}