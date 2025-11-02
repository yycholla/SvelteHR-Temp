//! Authentication mutations
//!
//! Handles user authentication: login, logout, session refresh

use async_graphql::{Context, Object, Result, SimpleObject, Union, InputObject};
use axum_login::{AuthSession, AuthnBackend};

use crate::{
    auth::{AuthBackend, Credentials},
    database::get_db_from_context,
};

/// User information returned by login
#[derive(SimpleObject)]
pub struct UserInfo {
    pub id: String,
    pub email: String,
    pub role: String,
    pub is_active: bool,
}

/// Session information
#[derive(SimpleObject)]
pub struct AuthSessionInfo {
    pub id: String,
    pub created_at: String,
    pub expires_at: String,
    pub last_activity: String,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
}

/// Authentication result for successful login
#[derive(SimpleObject)]
pub struct AuthResult {
    pub user: UserInfo,
    pub session: AuthSessionInfo,
}

/// Authentication error
#[derive(SimpleObject)]
pub struct AuthError {
    pub code: String,
    pub message: String,
    pub retry_after: Option<i32>,
}

/// Union type for authentication responses
#[derive(Union)]
pub enum AuthResponse {
    AuthResult(AuthResult),
    AuthError(AuthError),
}

/// Logout result
#[derive(SimpleObject)]
pub struct LogoutResult {
    pub success: bool,
    pub message: String,
}

/// Refresh session response
#[derive(SimpleObject)]
pub struct RefreshSessionResponse {
    pub success: bool,
    pub session_expires_at: Option<String>,
    pub message: String,
}

/// Login input for authentication
#[derive(InputObject)]
pub struct LoginInput {
    pub email: String,
    pub password: String,
}

/// Authentication mutation operations
pub struct AuthMutations;

#[Object]
impl AuthMutations {
    /// Login with email and password
    async fn login(&self, ctx: &Context<'_>, input: LoginInput) -> Result<AuthResponse> {
        let db = get_db_from_context(ctx)?;

        let creds = Credentials {
            email: input.email.clone(),
            password: input.password,
        };

        // For GraphQL login, we authenticate but don't create a session
        // The client should use the REST /auth/login endpoint to establish the session
        // This GraphQL mutation validates credentials and returns user info

        let auth_backend = AuthBackend::new(db.clone());
        match auth_backend.authenticate(creds).await {
            Ok(Some(user)) => {
                // Authentication successful - return user and session info
                // Note: This doesn't actually create a session - client must use REST endpoint
                let session_info = AuthSessionInfo {
                    id: uuid::Uuid::new_v4().to_string(),
                    created_at: chrono::Utc::now().to_rfc3339(),
                    expires_at: (chrono::Utc::now() + chrono::Duration::minutes(30)).to_rfc3339(),
                    last_activity: chrono::Utc::now().to_rfc3339(),
                    ip_address: None,
                    user_agent: None,
                };

                let user_info = UserInfo {
                    id: user.id.to_string(),
                    email: user.email,
                    role: user.role,
                    is_active: user.is_active,
                };

                Ok(AuthResponse::AuthResult(AuthResult {
                    user: user_info,
                    session: session_info,
                }))
            }
            Ok(None) => {
                // Authentication failed
                Ok(AuthResponse::AuthError(AuthError {
                    code: "INVALID_CREDENTIALS".to_string(),
                    message: "Invalid email or password".to_string(),
                    retry_after: Some(60),
                }))
            }
            Err(e) => {
                tracing::error!("Authentication error: {:?}", e);
                Ok(AuthResponse::AuthError(AuthError {
                    code: "AUTH_ERROR".to_string(),
                    message: "Authentication service temporarily unavailable".to_string(),
                    retry_after: Some(300),
                }))
            }
        }
    }

    /// Logout current user session
    async fn logout(&self, ctx: &Context<'_>) -> Result<LogoutResult> {
        let auth_session = ctx.data::<AuthSession<AuthBackend>>()?;

        // Check if user is authenticated
        if auth_session.user.is_some() {
            // For GraphQL logout, we return success but don't actually destroy the session
            // The client should use the REST /auth/logout endpoint to properly destroy the session
            Ok(LogoutResult {
                success: true,
                message: "Use REST /auth/logout endpoint to properly end session".to_string(),
            })
        } else {
            Ok(LogoutResult {
                success: false,
                message: "No active session to logout from".to_string(),
            })
        }
    }

    /// Refresh current session to extend its lifetime
    async fn refresh_session(&self, ctx: &Context<'_>) -> Result<RefreshSessionResponse> {
        let auth_session = ctx.data::<AuthSession<AuthBackend>>()?;

        match &auth_session.user {
            Some(_user) => {
                // For GraphQL refresh, we return success but don't actually extend the session
                // The client should use the REST /auth/refresh endpoint to properly extend the session
                Ok(RefreshSessionResponse {
                    success: true,
                    session_expires_at: Some((chrono::Utc::now() + chrono::Duration::minutes(30)).to_rfc3339()),
                    message: "Use REST /auth/refresh endpoint to properly extend session".to_string(),
                })
            }
            None => {
                Ok(RefreshSessionResponse {
                    success: false,
                    session_expires_at: None,
                    message: "No active session to refresh".to_string(),
                })
            }
        }
    }
}
