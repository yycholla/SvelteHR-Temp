//! Common test utilities and helpers for integration tests

use sqlx::{PgPool, postgres::PgPoolOptions};
use std::sync::Once;

static INIT: Once = Once::new();

/// Initialize test logging (call once per test suite)
pub fn init_test_logging() {
    INIT.call_once(|| {
        tracing_subscriber::fmt()
            .with_test_writer()
            .with_env_filter("info,hr_graphql_server=debug,sqlx=warn")
            .init();
    });
}

/// Create a test database pool for integration tests
pub async fn create_test_pool() -> PgPool {
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgresql://postgres:password@localhost:5432/sveltehr_test".to_string());

    PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Failed to create test database pool")
}

/// Generate a test JWT token for authentication tests
pub fn generate_test_jwt(user_id: &str, roles: Vec<String>) -> String {
    use jsonwebtoken::{encode, Header, EncodingKey};
    use serde::{Serialize, Deserialize};
    use chrono::{Utc, Duration};

    #[derive(Debug, Serialize, Deserialize)]
    struct Claims {
        sub: String,
        user_id: String,
        roles: Vec<String>,
        exp: i64,
    }

    let claims = Claims {
        sub: user_id.to_string(),
        user_id: user_id.to_string(),
        roles,
        exp: (Utc::now() + Duration::hours(1)).timestamp(),
    };

    let secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "test-secret-key".to_string());
    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .expect("Failed to generate test JWT")
}

/// Clean up test data after tests (soft delete or hard delete for test isolation)
pub async fn cleanup_test_data(pool: &PgPool, table: &str) {
    let query = format!("DELETE FROM hr_public.{} WHERE created_at > NOW() - INTERVAL '1 hour'", table);
    sqlx::query(&query)
        .execute(pool)
        .await
        .ok(); // Ignore errors in cleanup
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_pool_creation() {
        let _pool = create_test_pool().await;
        // If we get here, pool creation succeeded
    }

    #[test]
    fn test_jwt_generation() {
        let token = generate_test_jwt("test-user-id", vec!["Admin".to_string()]);
        assert!(!token.is_empty());
    }
}
