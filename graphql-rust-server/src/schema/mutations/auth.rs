//! JWT Authentication mutations
//!
//! Handles user authentication with JWT tokens: login, token refresh, logout

use async_graphql::{Context, InputObject, Object, Result, SimpleObject, Union};
use bcrypt::verify;
use sea_orm::{ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, Set};
use chrono::{Duration, Utc};
use uuid::Uuid;

use crate::{
    auth::{JwtService, UserContext},
    database::get_db_from_context,
    models::{password_reset_token, user},
};

// ============================================================================
// Input Types
// ============================================================================

/// Login input for JWT authentication
#[derive(InputObject)]
pub struct LoginInput {
    /// User's email address
    pub email: String,
    /// User's password
    pub password: String,
    /// Optional device information for audit trail
    pub device_info: Option<String>,
    /// Optional IP address for audit trail
    pub ip_address: Option<String>,
}

/// Refresh token input
#[derive(InputObject)]
pub struct RefreshTokenInput {
    /// JWT refresh token (from login response)
    pub refresh_token: String,
    /// Plaintext refresh token (from login response)
    pub refresh_token_plaintext: String,
    /// Optional device information
    pub device_info: Option<String>,
    /// Optional IP address
    pub ip_address: Option<String>,
}

// ============================================================================
// Response Types
// ============================================================================

/// User information returned after successful authentication
#[derive(SimpleObject)]
pub struct AuthUserInfo {
    pub id: String,
    pub email: String,
    pub display_name: String,
    pub roles: Vec<String>,
    pub permissions: Vec<String>,
    pub is_active: bool,
    pub force_password_change: bool,
}

/// JWT token pair
#[derive(SimpleObject)]
pub struct TokenPair {
    /// Access token (JWT, 15 min expiry) - Include in Authorization header
    pub access_token: String,
    /// Refresh token (JWT, 7 day expiry) - Store securely, use to get new access token
    pub refresh_token: String,
    /// Plaintext refresh token - Required for token refresh operation
    pub refresh_token_plaintext: String,
    /// Token type (always "Bearer")
    pub token_type: String,
    /// Access token expiry in seconds
    pub expires_in: i64,
}

/// Successful authentication result
#[derive(SimpleObject)]
pub struct AuthSuccess {
    pub user: AuthUserInfo,
    pub tokens: TokenPair,
}

/// Authentication error
#[derive(SimpleObject)]
pub struct AuthError {
    pub code: String,
    pub message: String,
}

/// Union type for authentication responses
#[derive(Union)]
pub enum AuthResponse {
    Success(AuthSuccess),
    Error(AuthError),
}

/// Logout result
#[derive(SimpleObject)]
pub struct LogoutResult {
    pub success: bool,
    pub message: String,
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

// ============================================================================
// Mutations
// ============================================================================

/// Authentication mutation operations
pub struct AuthMutations;

#[Object]
impl AuthMutations {
    /// Login with email and password, returns JWT tokens
    ///
    /// # Example
    /// ```graphql
    /// mutation {
    ///   login(input: {
    ///     email: "user@example.com"
    ///     password: "password123"
    ///   }) {
    ///     ... on AuthSuccess {
    ///       user { id email roles permissions }
    ///       tokens {
    ///         accessToken
    ///         refreshToken
    ///         refreshTokenPlaintext
    ///         expiresIn
    ///       }
    ///     }
    ///     ... on AuthError {
    ///       code
    ///       message
    ///     }
    ///   }
    /// }
    /// ```
    async fn login(&self, ctx: &Context<'_>, input: LoginInput) -> Result<AuthResponse> {
        let db = get_db_from_context(ctx)?;
        let jwt_service = ctx.data::<JwtService>()?;

        tracing::info!("Login attempt for email: {}", input.email);

        // 1. Find user by email
        let user_model = match user::Entity::find()
            .filter(user::Column::Email.eq(&input.email))
            .filter(user::Column::DeletedAt.is_null())
            .one(&db)
            .await?
        {
            Some(user) => user,
            None => {
                tracing::warn!("Login failed: User not found - {}", input.email);
                return Ok(AuthResponse::Error(AuthError {
                    code: "INVALID_CREDENTIALS".to_string(),
                    message: "Invalid email or password".to_string(),
                }));
            }
        };

        // 2. Check if user is active
        if !user_model.is_active {
            tracing::warn!("Login failed: Inactive user - {}", input.email);
            return Ok(AuthResponse::Error(AuthError {
                code: "ACCOUNT_INACTIVE".to_string(),
                message: "Account is inactive. Please contact support.".to_string(),
            }));
        }

        // 3. Verify password
        let password_valid = match verify(&input.password, &user_model.password_hash) {
            Ok(valid) => valid,
            Err(e) => {
                tracing::error!("Password verification error: {}", e);
                return Ok(AuthResponse::Error(AuthError {
                    code: "AUTH_ERROR".to_string(),
                    message: "Authentication service error".to_string(),
                }));
            }
        };

        if !password_valid {
            tracing::warn!("Login failed: Invalid password - {}", input.email);
            return Ok(AuthResponse::Error(AuthError {
                code: "INVALID_CREDENTIALS".to_string(),
                message: "Invalid email or password".to_string(),
            }));
        }

        // 4. Load user roles and permissions
        let (roles, permissions) = jwt_service
            .load_user_roles_permissions(user_model.id)
            .await
            .map_err(|e| {
                tracing::error!("Failed to load user roles/permissions: {:?}", e);
                async_graphql::Error::new("Failed to load user permissions")
            })?;

        // 5. Generate access token
        let display_name = format!("{} {}", user_model.first_name, user_model.last_name);
        let access_token = jwt_service
            .generate_access_token(
                user_model.id,
                user_model.email.clone(),
                display_name.clone(),
                user_model.department_id,
            )
            .await
            .map_err(|e| {
                tracing::error!("Failed to generate access token: {:?}", e);
                async_graphql::Error::new("Token generation failed")
            })?;

        // 6. Generate refresh token
        let family_id = Uuid::new_v4();
        let (refresh_token_plaintext, refresh_token_jwt) = jwt_service
            .generate_refresh_token(
                user_model.id,
                family_id,
                input.device_info,
                input.ip_address,
            )
            .await
            .map_err(|e| {
                tracing::error!("Failed to generate refresh token: {:?}", e);
                async_graphql::Error::new("Token generation failed")
            })?;

        tracing::info!("Login successful for user: {}", user_model.email);

        // 7. Return success response
        Ok(AuthResponse::Success(AuthSuccess {
            user: AuthUserInfo {
                id: user_model.id.to_string(),
                email: user_model.email,
                display_name,
                roles,
                permissions,
                is_active: user_model.is_active,
                force_password_change: user_model.force_password_change,
            },
            tokens: TokenPair {
                access_token,
                refresh_token: refresh_token_jwt,
                refresh_token_plaintext,
                token_type: "Bearer".to_string(),
                expires_in: 15 * 60, // 15 minutes in seconds
            },
        }))
    }

    /// Refresh access token using refresh token
    ///
    /// Returns new access token and new refresh token (token rotation).
    /// Old refresh token is marked as used and cannot be reused.
    ///
    /// # Example
    /// ```graphql
    /// mutation {
    ///   refreshToken(input: {
    ///     refreshToken: "<jwt-refresh-token>"
    ///     refreshTokenPlaintext: "<plaintext-token>"
    ///   }) {
    ///     ... on AuthSuccess {
    ///       tokens {
    ///         accessToken
    ///         refreshToken
    ///         refreshTokenPlaintext
    ///       }
    ///     }
    ///     ... on AuthError {
    ///       code
    ///       message
    ///     }
    ///   }
    /// }
    /// ```
    async fn refresh_token(
        &self,
        ctx: &Context<'_>,
        input: RefreshTokenInput,
    ) -> Result<AuthResponse> {
        let jwt_service = ctx.data::<JwtService>()?;

        tracing::debug!("Token refresh attempt");

        // Refresh access token (includes token rotation)
        let result = jwt_service
            .refresh_access_token(
                &input.refresh_token,
                &input.refresh_token_plaintext,
                input.device_info,
                input.ip_address,
            )
            .await;

        match result {
            Ok((new_access_token, new_refresh_jwt, new_plaintext)) => {
                tracing::debug!("Token refresh successful");

                // Extract user info from new access token for response
                let claims = jwt_service
                    .validate_access_token(&new_access_token)
                    .await
                    .map_err(|e| {
                        tracing::error!("Failed to validate new access token: {:?}", e);
                        async_graphql::Error::new("Token validation failed")
                    })?;

                Ok(AuthResponse::Success(AuthSuccess {
                    user: AuthUserInfo {
                        id: claims.sub.clone(),
                        email: claims.email.clone(),
                        display_name: claims.display_name.clone(),
                        roles: claims.roles.clone(),
                        permissions: claims.permissions.clone(),
                        is_active: true, // Token wouldn't be valid if user inactive
                        force_password_change: false,
                    },
                    tokens: TokenPair {
                        access_token: new_access_token,
                        refresh_token: new_refresh_jwt,
                        refresh_token_plaintext: new_plaintext,
                        token_type: "Bearer".to_string(),
                        expires_in: 15 * 60, // 15 minutes
                    },
                }))
            }
            Err(e) => {
                tracing::warn!("Token refresh failed: {:?}", e);
                let (code, message) = match e {
                    crate::auth::JwtError::TokenExpired => {
                        ("TOKEN_EXPIRED", "Refresh token has expired. Please log in again.")
                    }
                    crate::auth::JwtError::RefreshTokenReused => {
                        ("TOKEN_REUSED", "Refresh token was already used. Possible security breach detected.")
                    }
                    crate::auth::JwtError::TokenRevoked => {
                        ("TOKEN_REVOKED", "Token has been revoked. Please log in again.")
                    }
                    crate::auth::JwtError::RefreshTokenNotFound => {
                        ("INVALID_TOKEN", "Invalid refresh token. Please log in again.")
                    }
                    _ => ("AUTH_ERROR", "Token refresh failed. Please log in again."),
                };

                Ok(AuthResponse::Error(AuthError {
                    code: code.to_string(),
                    message: message.to_string(),
                }))
            }
        }
    }

    /// Logout current user (revokes all tokens)
    ///
    /// Requires authentication (JWT access token in Authorization header).
    /// Revokes all refresh tokens for the user and updates tokens_valid_after
    /// timestamp to invalidate all existing access tokens.
    ///
    /// # Example
    /// ```graphql
    /// mutation {
    ///   logout {
    ///     success
    ///     message
    ///   }
    /// }
    /// ```
    async fn logout(&self, ctx: &Context<'_>) -> Result<LogoutResult> {
        let user_context = ctx.data::<UserContext>()?;
        let jwt_service = ctx.data::<JwtService>()?;

        tracing::info!("Logout requested for user: {}", user_context.user_id);

        // Revoke all user tokens (updates tokens_valid_after and marks refresh tokens as revoked)
        jwt_service
            .revoke_all_user_tokens(user_context.user_id)
            .await
            .map_err(|e| {
                tracing::error!("Failed to revoke user tokens: {:?}", e);
                async_graphql::Error::new("Logout failed")
            })?;

        tracing::info!("Logout successful for user: {}", user_context.user_id);

        Ok(LogoutResult {
            success: true,
            message: "Successfully logged out from all devices".to_string(),
        })
    }

    /// Request a password reset link via email
    ///
    /// Sends a password reset email if the account exists.
    /// Always returns success to prevent email enumeration.
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

        // Generate secure random token
        let token = Uuid::new_v4().to_string().replace("-", "");
        let token_hash = bcrypt::hash(&token, bcrypt::DEFAULT_COST)?;

        // Create expiration time (30 minutes from now)
        let expires_at = Utc::now() + Duration::minutes(30);

        // Save token to database
        let reset_token = password_reset_token::ActiveModel {
            id: Set(Uuid::new_v4()),
            user_id: Set(user_model.id),
            token: Set(token_hash),
            expires_at: Set(expires_at.into()),
            used_at: Set(None),
            ip_address: Set(None), // TODO: Extract from request context
            created_at: Set(Utc::now().into()),
        };

        reset_token.insert(&db).await?;

        // TODO: Send email with reset link
        tracing::info!(
            "Password reset token generated for user: {}",
            user_model.email
        );

        Ok(PasswordResetRequestResult {
            success: true,
            message: "If an account with that email exists, a password reset link has been sent."
                .to_string(),
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
        active_user.force_password_change = Set(false);
        active_user.updated_at = Set(Utc::now().into());
        active_user.update(&db).await?;

        // Mark token as used
        let mut active_token: password_reset_token::ActiveModel = token_model.clone().into();
        active_token.used_at = Set(Some(Utc::now().into()));
        active_token.update(&db).await?;

        tracing::info!("Password reset successful for user {}", token_model.user_id);

        Ok(PasswordResetResult {
            success: true,
            message:
                "Password has been reset successfully. You can now log in with your new password."
                    .to_string(),
        })
    }
}
