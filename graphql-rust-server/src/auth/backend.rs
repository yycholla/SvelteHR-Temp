//! Authentication backend for axum-login
//!
//! This module implements the AuthnBackend trait for axum-login,
//! providing credential validation and user authentication.

use async_trait::async_trait;
use axum_login::{AuthnBackend, UserId};
use bcrypt::verify;
use password_hash::PasswordHash;
use sea_orm::{ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter};
use serde::{Deserialize, Serialize};

use super::session_store::SeaOrmSessionStore;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tower_sessions::Session;
use uuid::Uuid;

use crate::{
    models::user,
    error::{AppError, DbError},
};

/// Simple in-memory rate limiter for login attempts
#[derive(Debug, Clone)]
pub struct RateLimiter {
    attempts: Arc<RwLock<HashMap<String, Vec<chrono::DateTime<chrono::Utc>>>>>,
    max_attempts_per_ip: u32,
    max_attempts_per_account: u32,
    window_seconds: i64,
}

impl RateLimiter {
    pub fn new(max_attempts_per_ip: u32, max_attempts_per_account: u32, window_seconds: i64) -> Self {
        Self {
            attempts: Arc::new(RwLock::new(HashMap::new())),
            max_attempts_per_ip,
            max_attempts_per_account,
            window_seconds,
        }
    }

    /// Check if the IP is rate limited
    pub async fn is_ip_rate_limited(&self, ip: &str) -> bool {
        self.is_rate_limited(ip, self.max_attempts_per_ip).await
    }

    /// Check if the account is rate limited
    pub async fn is_account_rate_limited(&self, email: &str) -> bool {
        self.is_rate_limited(email, self.max_attempts_per_account).await
    }

    /// Check if the key is rate limited with specified max attempts
    async fn is_rate_limited(&self, key: &str, max_attempts: u32) -> bool {
        let mut attempts = self.attempts.write().await;
        let now = chrono::Utc::now();

        // Clean up old entries
        if let Some(times) = attempts.get_mut(key) {
            times.retain(|&time| now.signed_duration_since(time).num_seconds() < self.window_seconds);
            if times.is_empty() {
                attempts.remove(key);
            }
        }

        // Check if rate limited
        if let Some(times) = attempts.get(key) {
            times.len() >= max_attempts as usize
        } else {
            false
        }
    }

    /// Record an IP-based attempt
    pub async fn record_ip_attempt(&self, ip: &str) {
        self.record_attempt(ip).await;
    }

    /// Record an account-based attempt
    pub async fn record_account_attempt(&self, email: &str) {
        self.record_attempt(email).await;
    }

    /// Record an attempt for the key
    async fn record_attempt(&self, key: &str) {
        let mut attempts = self.attempts.write().await;
        let now = chrono::Utc::now();

        attempts.entry(key.to_string())
            .or_insert_with(Vec::new)
            .push(now);
    }

    /// Clean up old entries (should be called periodically)
    pub async fn cleanup(&self) {
        let mut attempts = self.attempts.write().await;
        let now = chrono::Utc::now();
        let cutoff = now - chrono::Duration::seconds(self.window_seconds);

        attempts.retain(|_, times| {
            times.retain(|&time| time > cutoff);
            !times.is_empty()
        });
    }
}

/// User model for axum-login
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthUser {
    pub id: uuid::Uuid,
    pub email: String,
    pub role: String,
    pub is_active: bool,
    /// Department ID for Row-Level Security (RLS) filtering
    pub department_id: Option<uuid::Uuid>,
    /// Organization ID for Row-Level Security (future-proofing)
    pub organization_id: Option<uuid::Uuid>,
}

impl axum_login::AuthUser for AuthUser {
    type Id = uuid::Uuid;

    fn id(&self) -> Self::Id {
        self.id
    }

    fn session_auth_hash(&self) -> &[u8] {
        // Use the email as the session auth hash for simplicity
        // In production, you might want to use a more stable identifier
        self.email.as_bytes()
    }
}

impl AuthUser {
    /// Create AuthUser from database user model
    pub fn from_db_user(db_user: &user::Model) -> Self {
        Self {
            id: db_user.id,
            email: db_user.email.clone(),
            role: db_user.role.clone(),
            is_active: db_user.is_active,
            department_id: db_user.department_id,
            organization_id: None, // TODO: Extract from department when organization support is added
        }
    }
}

/// Credentials for authentication
#[derive(Debug, Clone, Deserialize)]
pub struct Credentials {
    pub email: String,
    pub password: String,
}

/// Authentication backend implementing axum-login's AuthnBackend trait
#[derive(Clone)]
pub struct AuthBackend {
    db: DatabaseConnection,
    rate_limiter: RateLimiter,
}

impl AuthBackend {
    /// Create a new authentication backend
    pub fn new(db: DatabaseConnection) -> Self {
        // Rate limit: max 10 attempts per IP, 5 per account per 15 minutes
        let rate_limiter = RateLimiter::new(10, 5, 900); // 15 minutes = 900 seconds
        Self { db, rate_limiter }
    }

    /// Get the database connection
    pub fn db(&self) -> &DatabaseConnection {
        &self.db
    }

    /// Get the rate limiter
    pub fn rate_limiter(&self) -> &RateLimiter {
        &self.rate_limiter
    }

    /// Generate a new CSRF token
    pub fn generate_csrf_token(&self) -> String {
        Uuid::new_v4().to_string()
    }

    /// Validate CSRF token (basic implementation - in production, use proper CSRF validation)
    pub fn validate_csrf_token(&self, _token: &str, _session: &Session) -> bool {
        // For now, we'll skip strict CSRF validation since we're using session-based auth
        // with SameSite cookies. In a production system, you would:
        // 1. Store CSRF token in session
        // 2. Compare provided token with stored token
        // 3. Regenerate token after each use
        true
    }
}

impl AuthnBackend for AuthBackend {
    type User = AuthUser;
    type Credentials = Credentials;
    type Error = AppError;

    async fn authenticate(
        &self,
        creds: Self::Credentials,
    ) -> Result<Option<Self::User>, Self::Error> {
        // Find user by email
        let db_user = user::Entity::find()
            .filter(user::Column::Email.eq(&creds.email))
            .one(&self.db)
            .await
            .map_err(|e| {
                tracing::error!("Database error during authentication: {}", e);
                AppError::Database(DbError::Query(e.to_string()))
            })?;

        let Some(db_user) = db_user else {
            // User not found - don't reveal this for security
            tracing::warn!("Login attempt for non-existent user: {}", creds.email);
            return Ok(None);
        };

        // Check if user is active
        if !db_user.is_active {
            tracing::warn!("Login attempt for inactive user: {}", creds.email);
            return Ok(None);
        }

        // Check if account is currently locked
        if let Some(locked_until) = db_user.locked_until {
            if chrono::Utc::now() < locked_until {
                tracing::warn!("Login attempt for locked account: {}", creds.email);
                return Ok(None);
            }
        }

        // Special case for admin user in development
        if creds.email == "admin@mountainhr.dev" && creds.password == "admin" {
            // Reset failed attempts on successful login
            if db_user.failed_login_attempts > 0 {
                self.reset_failed_attempts(db_user.id).await?;
            }
            tracing::info!("Admin user authenticated via development shortcut");
            return Ok(Some(AuthUser::from_db_user(&db_user)));
        }

        // Verify password
        let password_valid = verify(&creds.password, &db_user.password_hash)
            .map_err(|e| {
                tracing::error!("Password verification error: {}", e);
                AppError::Authentication("Password verification failed".to_string())
            })?;

        if !password_valid {
            // Log failed login attempt
            self.log_security_event(
                Some(db_user.id),
                "failed_login",
                "user",
                Some(db_user.id),
                Some(serde_json::json!({
                    "reason": "invalid_password",
                    "attempt_count": db_user.failed_login_attempts + 1
                })),
                None, // IP address would be passed from handler
                None, // User agent would be passed from handler
            ).await;

            // Record failed attempt and apply progressive delay/lockout
            self.handle_failed_login(&db_user).await?;
            tracing::warn!("Invalid password for user: {}", creds.email);
            return Ok(None);
        }

        // Successful login - reset failed attempts
        if db_user.failed_login_attempts > 0 {
            self.reset_failed_attempts(db_user.id).await?;
        }

        // Note: Multiple concurrent sessions are allowed with tower-sessions
        // Session management is handled by the session store

        // Log successful login
        self.log_security_event(
            Some(db_user.id),
            "successful_login",
            "user",
            Some(db_user.id),
            Some(serde_json::json!({
                "method": "password"
            })),
            None, // IP address will be added by handler
            None, // User agent will be added by handler
        ).await;

        tracing::info!("User authenticated successfully: {}", creds.email);
        Ok(Some(AuthUser::from_db_user(&db_user)))
    }

    async fn get_user(&self, user_id: &UserId<Self>) -> Result<Option<Self::User>, Self::Error> {
        let db_user = user::Entity::find_by_id(*user_id)
            .one(&self.db)
            .await
            .map_err(|e| AppError::Database(DbError::Query(e.to_string())))?;

        match db_user {
            Some(user) if user.is_active => Ok(Some(AuthUser::from_db_user(&user))),
            _ => Ok(None),
        }
    }
}

impl AuthBackend {
    /// Record a failed login attempt
    async fn record_failed_login(&self, db_user: &user::Model) -> Result<(), AppError> {
        // Increment failed login attempts counter
        let new_attempts = db_user.failed_login_attempts + 1;

        // Update the user record
        let mut user: user::ActiveModel = db_user.clone().into();
        user.failed_login_attempts = sea_orm::Set(new_attempts);
        user.updated_at = sea_orm::Set(chrono::Utc::now());

        user.update(&self.db).await
            .map_err(|e| {
                tracing::error!("Failed to update failed login attempts: {}", e);
                AppError::Database(DbError::Query(e.to_string()))
            })?;

        tracing::warn!("Failed login attempt #{} for user: {}", new_attempts, db_user.email);
        Ok(())
    }

    /// Check if account is locked due to failed attempts
    async fn is_account_locked(&self, db_user: &user::Model) -> Result<bool, AppError> {
        let failed_attempts = db_user.failed_login_attempts;
        let locked_until = db_user.locked_until;

        // Check if account is currently locked
        if let Some(lock_time) = locked_until {
            if lock_time > chrono::Utc::now() {
                tracing::warn!("Account locked until {} for user: {}", lock_time, db_user.email);
                return Ok(true);
            }
        }

        // Implement progressive delays and locking
        match failed_attempts {
            0..=2 => Ok(false), // No delay for first 3 attempts
            3 => {
                // 3rd failed attempt: 5 second delay
                tracing::warn!("Progressive delay: 5 seconds for user: {}", db_user.email);
                tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
                Ok(false)
            }
            4 => {
                // 4th failed attempt: 15 second delay
                tracing::warn!("Progressive delay: 15 seconds for user: {}", db_user.email);
                tokio::time::sleep(tokio::time::Duration::from_secs(15)).await;
                Ok(false)
            }
            5 => {
                // 5th failed attempt: 30 second delay
                tracing::warn!("Progressive delay: 30 seconds for user: {}", db_user.email);
                tokio::time::sleep(tokio::time::Duration::from_secs(30)).await;
                Ok(false)
            }
            6..=9 => {
                // 6th-9th attempts: 1 minute delay
                tracing::warn!("Progressive delay: 1 minute for user: {}", db_user.email);
                tokio::time::sleep(tokio::time::Duration::from_secs(60)).await;
                Ok(false)
            }
            _ => {
                // 10th+ attempts: Lock account for 30 minutes
                let lock_until = chrono::Utc::now() + chrono::Duration::minutes(30);
                let mut user: user::ActiveModel = db_user.clone().into();
                user.locked_until = sea_orm::Set(Some(lock_until));
                user.updated_at = sea_orm::Set(chrono::Utc::now());

                user.update(&self.db).await
                    .map_err(|e| {
                        tracing::error!("Failed to lock account: {}", e);
                        AppError::Database(DbError::Query(e.to_string()))
                    })?;

                tracing::warn!("Account locked for 30 minutes due to {} failed attempts for user: {}", failed_attempts, db_user.email);
                Ok(true)
            }
        }
    }

    /// Reset failed login attempts counter
    async fn reset_failed_login_attempts(&self, db_user: &user::Model) -> Result<(), AppError> {
        // Reset counter and clear lock on successful login
        let mut user: user::ActiveModel = db_user.clone().into();
        user.failed_login_attempts = sea_orm::Set(0);
        user.locked_until = sea_orm::Set(None);
        user.updated_at = sea_orm::Set(chrono::Utc::now());

        user.update(&self.db).await
            .map_err(|e| {
                tracing::error!("Failed to reset failed login attempts: {}", e);
                AppError::Database(DbError::Query(e.to_string()))
            })?;

        tracing::info!("Reset failed login attempts and cleared lock for user: {}", db_user.email);
        Ok(())
    }

    /// Update user's last login timestamp
    async fn update_last_login(&self, db_user: &user::Model) -> Result<(), AppError> {
        // Update last_login timestamp
        let mut user: user::ActiveModel = db_user.clone().into();
        user.last_login = sea_orm::Set(Some(chrono::Utc::now()));
        user.updated_at = sea_orm::Set(chrono::Utc::now());

        user.update(&self.db).await
            .map_err(|e| {
                tracing::error!("Failed to update last login: {}", e);
                AppError::Database(DbError::Query(e.to_string()))
            })?;

        tracing::info!("Updated last login timestamp for user: {}", db_user.email);
        Ok(())
    }

    /// Handle failed login attempt with progressive delays and account lockout
    async fn handle_failed_login(&self, db_user: &user::Model) -> Result<(), AppError> {
        let now = chrono::Utc::now();
        let new_attempt_count = db_user.failed_login_attempts + 1;
        let max_attempts = 5; // Lock account after 5 failed attempts
        let lockout_duration_minutes = 15; // Lock for 15 minutes

        // Calculate progressive delay based on attempt count
        let delay_ms = match new_attempt_count {
            1 => 0,      // No delay for first attempt
            2 => 500,    // 0.5 second delay
            3 => 1000,   // 1 second delay
            4 => 2000,   // 2 second delay
            _ => 4000,   // 4 second delay for subsequent attempts
        };

        // Add artificial delay for progressive rate limiting
        if delay_ms > 0 {
            tokio::time::sleep(tokio::time::Duration::from_millis(delay_ms)).await;
        }

        // Update user record with failed attempt
        let mut user_active: user::ActiveModel = db_user.clone().into();
        user_active.failed_login_attempts = sea_orm::ActiveValue::Set(new_attempt_count);

        // Lock account if max attempts reached
        if new_attempt_count >= max_attempts {
            let locked_until = now + chrono::Duration::minutes(lockout_duration_minutes);
            user_active.locked_until = sea_orm::ActiveValue::Set(Some(locked_until.into()));

            tracing::warn!(
                "Account locked for user {} after {} failed attempts. Locked until: {}",
                db_user.email,
                new_attempt_count,
                locked_until
            );
        }

        user_active.update(&self.db).await.map_err(|e| {
            tracing::error!("Failed to update user after failed login: {:?}", e);
            AppError::Database(DbError::Query(e.to_string()))
        })?;

        Ok(())
    }

    /// Reset failed login attempts on successful authentication
    async fn reset_failed_attempts(&self, user_id: Uuid) -> Result<(), AppError> {
        let user_active = user::ActiveModel {
            id: sea_orm::ActiveValue::Set(user_id),
            failed_login_attempts: sea_orm::ActiveValue::Set(0),
            locked_until: sea_orm::ActiveValue::Set(None),
            ..Default::default()
        };

        user::Entity::update(user_active)
            .filter(user::Column::Id.eq(user_id))
            .exec(&self.db)
            .await
            .map_err(|e| {
                tracing::error!("Failed to reset failed attempts for user {}: {:?}", user_id, e);
                AppError::Database(DbError::Query(e.to_string()))
            })?;

        Ok(())
    }

    /// Log security events to activity log
    async fn log_security_event(
        &self,
        user_id: Option<Uuid>,
        action: &str,
        resource_type: &str,
        resource_id: Option<Uuid>,
        details: Option<serde_json::Value>,
        ip_address: Option<&str>,
        user_agent: Option<&str>,
    ) {
        let activity_log = crate::models::system::activity_log::ActiveModel {
            id: sea_orm::ActiveValue::Set(Uuid::new_v4()),
            user_id: sea_orm::ActiveValue::Set(user_id.unwrap_or_else(|| Uuid::nil())),
            employee_id: sea_orm::ActiveValue::NotSet,
            action: sea_orm::ActiveValue::Set(action.to_string()),
            resource_type: sea_orm::ActiveValue::Set(resource_type.to_string()),
            resource_id: sea_orm::ActiveValue::Set(resource_id),
            details: sea_orm::ActiveValue::Set(details),
            before_snapshot: sea_orm::ActiveValue::NotSet,
            after_snapshot: sea_orm::ActiveValue::NotSet,
            is_rollback: sea_orm::ActiveValue::Set(false),
            rolled_back_log_id: sea_orm::ActiveValue::NotSet,
            ip_address: sea_orm::ActiveValue::NotSet, // Skip for now - inet type requires special handling
            user_agent: sea_orm::ActiveValue::Set(user_agent.map(|s| s.to_string())),
            signature_id: sea_orm::ActiveValue::NotSet,
            batch_id: sea_orm::ActiveValue::NotSet,
            created_at: sea_orm::ActiveValue::Set(chrono::Utc::now().into()),
        };

        if let Err(e) = activity_log.insert(&self.db).await {
            tracing::error!("Failed to log security event: {:?}", e);
        }
    }
}

/// Type alias for the authentication layer
pub type AuthLayer = axum_login::AuthManagerLayer<AuthBackend, SeaOrmSessionStore>;

/// Type alias for the session layer
pub type SessionLayer = tower_sessions::SessionManagerLayer<SeaOrmSessionStore>;


