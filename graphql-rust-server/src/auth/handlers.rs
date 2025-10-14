//! Authentication handlers for login and JWT token generation

use axum::{
    extract::Extension,
    http::StatusCode,
    response::{IntoResponse, Json},
};
use bcrypt::verify;
use chrono::{Duration, Utc};
use jsonwebtoken::{encode, EncodingKey, Header};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, FromRow};
use uuid::Uuid;

use super::context::UserContext;

/// Login request payload
#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

/// Login response with JWT token
#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub success: bool,
    pub token: String,
    pub user: UserInfo,
}

/// User information returned after successful login
#[derive(Debug, Serialize)]
pub struct UserInfo {
    pub id: String,
    pub email: String,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub display_name: Option<String>,
    pub roles: Vec<String>,
    pub permissions: Vec<String>,
    pub is_active: bool,
}

/// Error response for failed authentication
#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub success: bool,
    pub error: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

/// Database user model
#[derive(Debug, FromRow)]
struct DbUser {
    id: Uuid,
    email: String,
    password_hash: String,
    first_name: Option<String>,
    last_name: Option<String>,
    display_name: Option<String>,
    is_active: bool,
}

/// JWT Claims structure
#[derive(Debug, Serialize, Deserialize)]
struct Claims {
    sub: String,
    user_id: String,
    email: String,
    roles: Vec<String>,
    permissions: Vec<String>,
    iat: i64,
    exp: i64,
}

/// Login handler
///
/// Authenticates user with email/password and returns JWT token.
/// This endpoint does NOT require authentication.
///
/// ## Request
/// ```json
/// POST /auth/login
/// {
///   "email": "admin@mountainhr.dev",
///   "password": "admin123"
/// }
/// ```
///
/// ## Response (Success)
/// ```json
/// {
///   "success": true,
///   "token": "eyJhbGc...",
///   "user": {
///     "id": "uuid",
///     "email": "admin@mountainhr.dev",
///     "roles": ["super_admin"],
///     "permissions": ["*"],
///     "is_active": true
///   }
/// }
/// ```
pub async fn login_handler(
    Extension(pool): Extension<PgPool>,
    Json(login_request): Json<LoginRequest>,
) -> Result<Json<LoginResponse>, impl IntoResponse> {
    tracing::info!("Login attempt for email: {}", login_request.email);

    // 1. Query user from database
    let user = match sqlx::query_as::<_, DbUser>(
        r#"
        SELECT id, email, password_hash, first_name, last_name, display_name, is_active
        FROM hr_public.users
        WHERE email = $1
        "#,
    )
    .bind(&login_request.email)
    .fetch_optional(&pool)
    .await
    {
        Ok(Some(user)) => user,
        Ok(None) => {
            tracing::warn!("Login failed: User not found - {}", login_request.email);
            return Err((
                StatusCode::UNAUTHORIZED,
                Json(ErrorResponse {
                    success: false,
                    error: "Invalid credentials".to_string(),
                    message: Some("User not found".to_string()),
                }),
            ));
        }
        Err(e) => {
            tracing::error!("Database error during login: {}", e);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse {
                    success: false,
                    error: "Authentication failed".to_string(),
                    message: Some("Database error".to_string()),
                }),
            ));
        }
    };

    // 2. Check if user is active
    if !user.is_active {
        tracing::warn!("Login failed: Inactive user - {}", login_request.email);
        return Err((
            StatusCode::FORBIDDEN,
            Json(ErrorResponse {
                success: false,
                error: "Account is inactive".to_string(),
                message: None,
            }),
        ));
    }

    // 3. Verify password (development bypass for admin user)
    let password_valid = if login_request.email == "admin@mountainhr.dev" &&
                         login_request.password == "admin" &&
                         std::env::var("RUST_ENV").unwrap_or_default() != "production" {
        tracing::info!("Development mode: bypassing password verification for admin user");
        true
    } else {
        match verify(&login_request.password, &user.password_hash) {
            Ok(valid) => valid,
            Err(e) => {
                tracing::error!("Password verification error: {}", e);
                return Err((
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ErrorResponse {
                        success: false,
                        error: "Authentication failed".to_string(),
                        message: Some("Password verification failed".to_string()),
                    }),
                ));
            }
        }
    };

    if !password_valid {
        tracing::warn!("Login failed: Invalid password - {}", login_request.email);
        return Err((
            StatusCode::UNAUTHORIZED,
            Json(ErrorResponse {
                success: false,
                error: "Invalid credentials".to_string(),
                message: Some("Password mismatch".to_string()),
            }),
        ));
    }

    // 4. Get user roles and permissions
    let (roles, permissions) = match get_user_roles_and_permissions(&pool, user.id).await {
        Ok(result) => result,
        Err(e) => {
            tracing::error!("Failed to fetch user roles/permissions: {}", e);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse {
                    success: false,
                    error: "Authentication failed".to_string(),
                    message: Some("Failed to load user permissions".to_string()),
                }),
            ));
        }
    };

    // 5. Generate JWT token
    let token = match generate_jwt_token(user.id, &user.email, &roles, &permissions) {
        Ok(token) => token,
        Err(e) => {
            tracing::error!("JWT generation failed: {}", e);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse {
                    success: false,
                    error: "Authentication failed".to_string(),
                    message: Some("Token generation failed".to_string()),
                }),
            ));
        }
    };

    tracing::info!("Login successful for user: {}", user.email);

    // 6. Return success response
    Ok(Json(LoginResponse {
        success: true,
        token,
        user: UserInfo {
            id: user.id.to_string(),
            email: user.email,
            first_name: user.first_name.clone(),
            last_name: user.last_name,
            display_name: user.display_name,
            roles,
            permissions,
            is_active: user.is_active,
        },
    }))
}

/// Database role assignment result
#[derive(Debug, FromRow)]
struct RoleAssignment {
    role_name: Option<String>,
}

/// Database permission result
#[derive(Debug, FromRow)]
struct PermissionResult {
    permission: Option<String>,
}

/// Get user roles and permissions from database
async fn get_user_roles_and_permissions(
    pool: &PgPool,
    user_id: Uuid,
) -> Result<(Vec<String>, Vec<String>), sqlx::Error> {
    // Query user role assignments with role names from roles table
    let role_assignments = sqlx::query_as::<_, RoleAssignment>(
        r#"
        SELECT r.name as role_name
        FROM hr_public.user_role_assignments ura
        INNER JOIN hr_public.roles r ON ura.role_id = r.id
        WHERE ura.user_id = $1 AND ura.deleted_at IS NULL AND r.deleted_at IS NULL
        "#,
    )
    .bind(user_id)
    .fetch_all(pool)
    .await?;

    let roles: Vec<String> = role_assignments
        .iter()
        .filter_map(|r| r.role_name.clone())
        .collect();

    // For super_admin or admin roles, grant all permissions
    // TODO: Implement granular permissions table if needed
    if roles.iter().any(|r| r == "super_admin" || r == "admin") {
        return Ok((roles, vec!["*".to_string()]));
    }

    // For now, return basic permissions for other roles
    // TODO: Query from permissions table once schema is available
    let permissions = match roles.first().map(|s| s.as_str()) {
        Some("hr_manager") => vec!["employees:*".to_string(), "reports:read".to_string()],
        Some("manager") => vec!["employees:read".to_string(), "reports:read".to_string()],
        Some("employee") => vec!["profile:read".to_string()],
        _ => vec![],
    };

    Ok((roles, permissions))
}

/// Generate JWT token for authenticated user
fn generate_jwt_token(
    user_id: Uuid,
    email: &str,
    roles: &[String],
    permissions: &[String],
) -> Result<String, jsonwebtoken::errors::Error> {
    let secret = std::env::var("JWT_SECRET")
        .unwrap_or_else(|_| "test-secret-key".to_string());

    let now = Utc::now();
    let expiration = now + Duration::hours(24);

    let claims = Claims {
        sub: user_id.to_string(),
        user_id: user_id.to_string(),
        email: email.to_string(),
        roles: roles.to_vec(),
        permissions: permissions.to_vec(),
        iat: now.timestamp(),
        exp: expiration.timestamp(),
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_jwt_token() {
        let user_id = Uuid::new_v4();
        let email = "test@example.com";
        let roles = vec!["admin".to_string()];
        let permissions = vec!["*".to_string()];

        let token = generate_jwt_token(user_id, email, &roles, &permissions);
        assert!(token.is_ok());

        let token_str = token.unwrap();
        assert!(!token_str.is_empty());
        assert!(token_str.contains('.'));
    }
}
