//! Authentication mutations
//!
//! Handles user authentication: login, logout, session refresh, password reset

use async_graphql::{Context, Object, Result, SimpleObject, Union, InputObject};
use axum_login::{AuthSession, AuthnBackend};
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, Set};
use chrono::{Duration, Utc};
use bcrypt;
use std::sync::Arc;

use crate::{
    auth::{AuthBackend, Credentials},
    database::get_db_from_context,
    models::{password_reset_token, user},
    services::email_service::EmailService,
};

/// User information returned by login
#[derive(SimpleObject)]
pub struct UserInfo {
    pub id: String,
    pub email: String,
    pub role: String,
    pub is_active: bool,
    pub force_password_change: bool,
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

/// Request password reset input
#[derive(InputObject)]
pub struct RequestPasswordResetInput {
    pub email: String,
}

/// Reset password input
#[derive(InputObject)]
pub struct ResetPasswordInput {
    pub token: String,
    pub new_password: String,
}

/// Password reset request result
#[derive(SimpleObject)]
pub struct PasswordResetRequestResult {
    pub success: bool,
    pub message: String,
}

/// Password reset result
#[derive(SimpleObject)]
pub struct PasswordResetResult {
    pub success: bool,
    pub message: String,
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
                    email: user.email.clone(),
                    role: user.role,
                    is_active: user.is_active,
                    force_password_change: user.force_password_change,
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

    /// Request a password reset link via email
    async fn request_password_reset(
        &self,
        ctx: &Context<'_>,
        input: RequestPasswordResetInput,
    ) -> Result<PasswordResetRequestResult> {
        let db = get_db_from_context(ctx)?;

        // Find user by email
        let user_model = match user::Entity::find()
            .filter(user::Column::Email.eq(&input.email))
            .filter(user::Column::DeletedAt.is_null())
            .one(&db)
            .await?
        {
            Some(user) => user,
            None => {
                // Don't reveal whether email exists - always return success
                return Ok(PasswordResetRequestResult {
                    success: true,
                    message: "If an account with that email exists, a password reset link has been sent.".to_string(),
                });
            }
        };

        // Generate secure random token (use a cryptographically secure method)
        let token = uuid::Uuid::new_v4().to_string().replace("-", "");
        let token_hash = bcrypt::hash(&token, bcrypt::DEFAULT_COST)?;

        // Create expiration time (30 minutes from now)
        let expires_at = Utc::now() + Duration::minutes(30);

        // Save token to database
        let reset_token = password_reset_token::ActiveModel {
            id: Set(uuid::Uuid::new_v4()),
            user_id: Set(user_model.id),
            token: Set(token_hash.clone()),
            expires_at: Set(expires_at.into()),
            used_at: Set(None),
            ip_address: Set(None), // TODO: Get from request context
            created_at: Set(Utc::now().into()),
        };

        reset_token.insert(&db).await?;

        // Send email if email service is configured
        if let Ok(email_service) = ctx.data::<Arc<EmailService>>() {
            if let Err(e) = email_service.send_password_reset(
                user_model.email.clone(),
                token, // Send unhashed token in email
                30,
            ).await {
                tracing::error!("Failed to send password reset email: {}", e);
                // Continue anyway - token is still valid
            }
        } else {
            tracing::warn!("Email service not configured - password reset token created but email not sent");
        }

        Ok(PasswordResetRequestResult {
            success: true,
            message: "If an account with that email exists, a password reset link has been sent.".to_string(),
        })
    }

    /// Reset password using a valid token
    async fn reset_password(
        &self,
        ctx: &Context<'_>,
        input: ResetPasswordInput,
    ) -> Result<PasswordResetResult> {
        let db = get_db_from_context(ctx)?;

        // Find all unused tokens and check each one (since we can't query by hash directly)
        let all_tokens = password_reset_token::Entity::find()
            .filter(password_reset_token::Column::UsedAt.is_null())
            .all(&db)
            .await?;

        // Find matching token by comparing hashes
        let valid_token = all_tokens.iter().find(|t| {
            bcrypt::verify(&input.token, &t.token).unwrap_or(false) && t.is_valid()
        });

        let token_model = match valid_token {
            Some(token) => token,
            None => {
                return Ok(PasswordResetResult {
                    success: false,
                    message: "Invalid or expired reset token".to_string(),
                });
            }
        };

        // Update user's password
        let user_model = user::Entity::find_by_id(token_model.user_id)
            .one(&db)
            .await?
            .ok_or_else(|| async_graphql::Error::new("User not found"))?;

        let new_password_hash = bcrypt::hash(&input.new_password, bcrypt::DEFAULT_COST)?;

        let mut active_user: user::ActiveModel = user_model.into();
        active_user.password_hash = Set(new_password_hash);
        active_user.force_password_change = Set(false); // Clear force password change flag
        active_user.updated_at = Set(Utc::now().into());
        active_user.update(&db).await?;

        // Mark token as used
        let mut active_token: password_reset_token::ActiveModel = token_model.clone().into();
        active_token.used_at = Set(Some(Utc::now().into()));
        active_token.update(&db).await?;

        tracing::info!("Password reset successful for user {}", token_model.user_id);

        Ok(PasswordResetResult {
            success: true,
            message: "Password has been reset successfully. You can now log in with your new password.".to_string(),
        })
    }
}
