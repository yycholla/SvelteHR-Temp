//! HTTP request handlers

use axum::{
    extract::{ConnectInfo, State},
    response::{Html, Json, Redirect},
    http::StatusCode,
};
use axum_login::AuthSession;
use sea_orm::{DatabaseConnection, EntityTrait, ColumnTrait, QueryFilter};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::net::SocketAddr;

use crate::{
    auth::{AuthBackend, Credentials},
    schema::{MutationRoot, QueryRoot},
};

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
    pub role: String,
}

/// Login handler
pub async fn login_handler(
    mut auth_session: AuthSession<AuthBackend>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    State(_db): State<DatabaseConnection>,
    Json(login_req): Json<LoginRequest>,
) -> Result<Json<LoginResponse>, StatusCode> {
    let client_ip = addr.ip().to_string();

    // Rate limiting: Check if IP is rate limited
    if auth_session.backend.rate_limiter().is_rate_limited(&client_ip).await {
        tracing::warn!("Rate limit exceeded for IP: {}", client_ip);
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

            let response = LoginResponse {
                user: UserInfo {
                    id: user.id.to_string(),
                    email: user.email,
                    role: user.role,
                },
                session_expires: (chrono::Utc::now() + chrono::Duration::minutes(30)).to_rfc3339(),
            };

            Ok(Json(response))
        }
        Ok(None) => {
            // Authentication failed - record rate limiting attempt
            auth_session.backend.rate_limiter().record_attempt(&client_ip).await;
            tracing::warn!("Failed login attempt from IP: {} for user: {}", client_ip, login_req.email);
            Err(StatusCode::UNAUTHORIZED)
        }
        Err(_) => {
            // Internal error - still record the attempt for rate limiting
            auth_session.backend.rate_limiter().record_attempt(&client_ip).await;
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

/// Logout handler
pub async fn logout_handler(
    mut auth_session: AuthSession<AuthBackend>,
) -> Result<Redirect, StatusCode> {
    match auth_session.logout().await {
        Ok(_) => {
            // Redirect to login page after logout
            Ok(Redirect::to("/login"))
        }
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}

/// Get current user info handler
pub async fn me_handler(
    auth_session: AuthSession<AuthBackend>,
) -> Result<Json<UserInfo>, StatusCode> {
    match &auth_session.user {
        Some(user) => {
            let user_info = UserInfo {
                id: user.id.to_string(),
                email: user.email.clone(),
                role: user.role.clone(),
            };
            Ok(Json(user_info))
        }
        None => Err(StatusCode::UNAUTHORIZED),
    }
}

/// Session refresh handler
pub async fn refresh_handler(
    auth_session: AuthSession<AuthBackend>,
) -> Result<Json<RefreshResponse>, StatusCode> {
    match &auth_session.user {
        Some(user) => {
            // Session is valid, extend it by updating the session store
            // The session store will automatically update the last_activity timestamp
            // when the session is saved

            let response = RefreshResponse {
                success: true,
                session_expires: (chrono::Utc::now() + chrono::Duration::minutes(30)).to_rfc3339(),
                message: "Session refreshed successfully".to_string(),
            };

            Ok(Json(response))
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
    State(db): State<DatabaseConnection>,
) -> Result<Json<SessionsResponse>, StatusCode> {
    let Some(user) = &auth_session.user else {
        return Err(StatusCode::UNAUTHORIZED);
    };

    let sessions = crate::models::user_session::Entity::find()
        .filter(crate::models::user_session::Column::UserId.eq(user.id))
        .filter(crate::models::user_session::Column::IsActive.eq(true))
        .filter(crate::models::user_session::Column::ExpiresAt.gt(chrono::Utc::now()))
        .all(&db)
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

/// GraphQL handler
pub async fn graphql_handler(
    State(db): State<DatabaseConnection>,
    auth_session: AuthSession<AuthBackend>,
    req: async_graphql_axum::GraphQLRequest,
) -> async_graphql_axum::GraphQLResponse {
    let schema = async_graphql::Schema::build(QueryRoot, MutationRoot, async_graphql::EmptySubscription)
        .data(db)
        .data(auth_session)
        .finish();

    schema.execute(req.into_inner()).await.into()
}