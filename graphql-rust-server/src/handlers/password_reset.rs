//! Password reset REST API handlers
//!
//! Public endpoints for password reset flow - no authentication required

use axum::{extract::State, http::StatusCode, response::Json};
use chrono::{Duration, Utc};
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, Set};
use serde::{Deserialize, Serialize};

use crate::{
    handlers::AppState,
    models::{password_reset_token, user},
};

/// Request password reset payload
#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct RequestPasswordResetRequest {
    #[schema(example = "user@example.com")]
    pub email: String,
}

/// Request password reset response
#[derive(Debug, Serialize, utoipa::ToSchema)]
pub struct RequestPasswordResetResponse {
    pub success: bool,
    pub message: String,
}

/// Reset password payload
#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct ResetPasswordRequest {
    #[schema(example = "abc123def456...")]
    pub token: String,
    #[schema(example = "NewSecurePassword123!")]
    pub new_password: String,
}

/// Reset password response
#[derive(Debug, Serialize, utoipa::ToSchema)]
pub struct ResetPasswordResponse {
    pub success: bool,
    pub message: String,
}

/// Request a password reset link via email (PUBLIC ENDPOINT)
///
/// This endpoint verifies the email exists in the system before sending a reset link.
/// Returns success even if email doesn't exist to prevent email enumeration.
#[utoipa::path(
    post,
    path = "/api/auth/request-reset",
    request_body = RequestPasswordResetRequest,
    responses(
        (status = 200, description = "Password reset request processed", body = RequestPasswordResetResponse),
        (status = 500, description = "Internal server error")
    ),
    tag = "Authentication"
)]
pub async fn request_password_reset_handler(
    State(app_state): State<AppState>,
    Json(payload): Json<RequestPasswordResetRequest>,
) -> Result<Json<RequestPasswordResetResponse>, (StatusCode, Json<RequestPasswordResetResponse>)> {
    // Validate email format
    if !payload.email.contains('@') {
        return Ok(Json(RequestPasswordResetResponse {
            success: false,
            message: "Invalid email address".to_string(),
        }));
    }

    // Find user by email
    let user_model = match user::Entity::find()
        .filter(user::Column::Email.eq(&payload.email))
        .filter(user::Column::DeletedAt.is_null())
        .one(&app_state.db)
        .await
    {
        Ok(Some(user)) => user,
        Ok(None) => {
            tracing::info!("Password reset requested for non-existent email: {}", payload.email);
            // Return success to prevent email enumeration
            return Ok(Json(RequestPasswordResetResponse {
                success: true,
                message: "If an account with that email exists, a password reset link has been sent.".to_string(),
            }));
        }
        Err(e) => {
            tracing::error!("Database error during password reset request: {:?}", e);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(RequestPasswordResetResponse {
                    success: false,
                    message: "An error occurred. Please try again later.".to_string(),
                }),
            ));
        }
    };

    // Generate secure random token
    let token = uuid::Uuid::new_v4().to_string().replace("-", "");
    let token_hash = match bcrypt::hash(&token, bcrypt::DEFAULT_COST) {
        Ok(hash) => hash,
        Err(e) => {
            tracing::error!("Failed to hash token: {:?}", e);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(RequestPasswordResetResponse {
                    success: false,
                    message: "An error occurred. Please try again later.".to_string(),
                }),
            ));
        }
    };

    // Create expiration time (30 minutes from now)
    let expires_at = Utc::now() + Duration::minutes(30);

    // Save token to database
    let reset_token = password_reset_token::ActiveModel {
        id: Set(uuid::Uuid::new_v4()),
        user_id: Set(user_model.id),
        token: Set(token_hash),
        expires_at: Set(expires_at.into()),
        used_at: Set(None),
        ip_address: Set(None), // TODO: Extract from request headers
        created_at: Set(Utc::now().into()),
    };

    if let Err(e) = reset_token.insert(&app_state.db).await {
        tracing::error!("Failed to save password reset token: {:?}", e);
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(RequestPasswordResetResponse {
                success: false,
                message: "An error occurred. Please try again later.".to_string(),
            }),
        ));
    }

    // Send email if email service is configured
    if let Some(email_service) = &app_state.email_service {
        if let Err(e) = email_service
            .send_password_reset(user_model.email.clone(), token, 30)
            .await
        {
            tracing::error!("Failed to send password reset email: {}", e);
            // Continue anyway - token is still valid and user can request another
        } else {
            tracing::info!("Password reset email sent to {}", user_model.email);
        }
    } else {
        tracing::warn!(
            "Email service not configured - password reset token created but email not sent"
        );
    }

    Ok(Json(RequestPasswordResetResponse {
        success: true,
        message: "If an account with that email exists, a password reset link has been sent."
            .to_string(),
    }))
}

/// Reset password using a valid token (PUBLIC ENDPOINT)
///
/// This endpoint verifies the token is valid, not expired, and not already used
/// before updating the user's password.
#[utoipa::path(
    post,
    path = "/api/auth/reset-password",
    request_body = ResetPasswordRequest,
    responses(
        (status = 200, description = "Password reset successful", body = ResetPasswordResponse),
        (status = 400, description = "Invalid or expired token", body = ResetPasswordResponse),
        (status = 500, description = "Internal server error")
    ),
    tag = "Authentication"
)]
pub async fn reset_password_handler(
    State(app_state): State<AppState>,
    Json(payload): Json<ResetPasswordRequest>,
) -> Result<Json<ResetPasswordResponse>, (StatusCode, Json<ResetPasswordResponse>)> {
    // Validate password strength
    if payload.new_password.len() < 8 {
        return Ok(Json(ResetPasswordResponse {
            success: false,
            message: "Password must be at least 8 characters long".to_string(),
        }));
    }

    if !payload.new_password.chars().any(|c| c.is_uppercase()) {
        return Ok(Json(ResetPasswordResponse {
            success: false,
            message: "Password must contain at least one uppercase letter".to_string(),
        }));
    }

    if !payload.new_password.chars().any(|c| c.is_lowercase()) {
        return Ok(Json(ResetPasswordResponse {
            success: false,
            message: "Password must contain at least one lowercase letter".to_string(),
        }));
    }

    if !payload.new_password.chars().any(|c| c.is_numeric()) {
        return Ok(Json(ResetPasswordResponse {
            success: false,
            message: "Password must contain at least one number".to_string(),
        }));
    }

    // Find all unused tokens and check each one (since we can't query by hash directly)
    let all_tokens = match password_reset_token::Entity::find()
        .filter(password_reset_token::Column::UsedAt.is_null())
        .all(&app_state.db)
        .await
    {
        Ok(tokens) => tokens,
        Err(e) => {
            tracing::error!("Database error finding reset tokens: {:?}", e);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ResetPasswordResponse {
                    success: false,
                    message: "An error occurred. Please try again later.".to_string(),
                }),
            ));
        }
    };

    // Find matching token by comparing hashes
    let valid_token = all_tokens.iter().find(|t| {
        bcrypt::verify(&payload.token, &t.token).unwrap_or(false) && t.is_valid()
    });

    let token_model = match valid_token {
        Some(token) => token,
        None => {
            tracing::warn!("Invalid or expired password reset token attempted");
            return Ok(Json(ResetPasswordResponse {
                success: false,
                message: "Invalid or expired reset token".to_string(),
            }));
        }
    };

    // Update user's password
    let user_model = match user::Entity::find_by_id(token_model.user_id)
        .one(&app_state.db)
        .await
    {
        Ok(Some(user)) => user,
        Ok(None) => {
            tracing::error!(
                "User not found for valid token: {}",
                token_model.user_id
            );
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ResetPasswordResponse {
                    success: false,
                    message: "An error occurred. Please try again later.".to_string(),
                }),
            ));
        }
        Err(e) => {
            tracing::error!("Database error finding user: {:?}", e);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ResetPasswordResponse {
                    success: false,
                    message: "An error occurred. Please try again later.".to_string(),
                }),
            ));
        }
    };

    let new_password_hash = match bcrypt::hash(&payload.new_password, bcrypt::DEFAULT_COST) {
        Ok(hash) => hash,
        Err(e) => {
            tracing::error!("Failed to hash new password: {:?}", e);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ResetPasswordResponse {
                    success: false,
                    message: "An error occurred. Please try again later.".to_string(),
                }),
            ));
        }
    };

    let mut active_user: user::ActiveModel = user_model.into();
    active_user.password_hash = Set(new_password_hash);
    active_user.force_password_change = Set(false); // Clear force password change flag
    active_user.updated_at = Set(Utc::now().into());

    if let Err(e) = active_user.update(&app_state.db).await {
        tracing::error!("Failed to update user password: {:?}", e);
        return Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ResetPasswordResponse {
                success: false,
                message: "An error occurred. Please try again later.".to_string(),
            }),
        ));
    }

    // Mark token as used
    let mut active_token: password_reset_token::ActiveModel = token_model.clone().into();
    active_token.used_at = Set(Some(Utc::now().into()));

    if let Err(e) = active_token.update(&app_state.db).await {
        tracing::error!("Failed to mark token as used: {:?}", e);
        // Continue anyway - password was updated successfully
    }

    tracing::info!(
        "Password reset successful for user {}",
        token_model.user_id
    );

    Ok(Json(ResetPasswordResponse {
        success: true,
        message: "Password has been reset successfully. You can now log in with your new password."
            .to_string(),
    }))
}
