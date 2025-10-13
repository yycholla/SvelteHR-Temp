//! Row-Level Security (RLS) session variable helper
//!
//! Manages PostgreSQL transaction-level session variables for RLS policies.
//! RLS policies use `current_setting('app.user_id')` and `current_setting('app.roles')`
//! to filter data based on authenticated user context.

use sqlx::{PgConnection, Postgres, Transaction};
use uuid::Uuid;

/// Set RLS session variables for a database transaction
///
/// This must be called at the start of each GraphQL request transaction
/// to ensure RLS policies have access to user context.
///
/// # Example
/// ```rust,no_run
/// use sqlx::PgPool;
/// use uuid::Uuid;
///
/// async fn example(pool: &PgPool, user_id: Uuid, roles: Vec<String>) -> Result<(), sqlx::Error> {
///     let mut tx = pool.begin().await?;
///     set_rls_variables(&mut tx, user_id, &roles).await?;
///     // ... perform queries with RLS filtering ...
///     tx.commit().await?;
///     Ok(())
/// }
/// ```
pub async fn set_rls_variables(
    tx: &mut Transaction<'_, Postgres>,
    user_id: Uuid,
    roles: &[String],
) -> Result<(), sqlx::Error> {
    // Set user_id for RLS policies
    sqlx::query(&format!(
        "SET LOCAL app.user_id = '{}'",
        user_id
    ))
    .execute(&mut **tx)
    .await?;

    // Set roles as comma-separated string for RLS policies
    let roles_str = roles.join(",");
    sqlx::query(&format!(
        "SET LOCAL app.roles = '{}'",
        roles_str
    ))
    .execute(&mut **tx)
    .await?;

    Ok(())
}

/// Set RLS session variables on a single connection (non-transactional)
///
/// Use this for testing or single-query scenarios. For production GraphQL resolvers,
/// prefer `set_rls_variables` with transactions.
pub async fn set_rls_variables_on_connection(
    conn: &mut PgConnection,
    user_id: Uuid,
    roles: &[String],
) -> Result<(), sqlx::Error> {
    sqlx::query(&format!(
        "SET LOCAL app.user_id = '{}'",
        user_id
    ))
    .execute(&mut *conn)
    .await?;

    let roles_str = roles.join(",");
    sqlx::query(&format!(
        "SET LOCAL app.roles = '{}'",
        roles_str
    ))
    .execute(&mut *conn)
    .await?;

    Ok(())
}

/// Clear RLS session variables (useful for cleanup in tests)
pub async fn clear_rls_variables(
    tx: &mut Transaction<'_, Postgres>,
) -> Result<(), sqlx::Error> {
    sqlx::query("RESET app.user_id")
        .execute(&mut **tx)
        .await?;

    sqlx::query("RESET app.roles")
        .execute(&mut **tx)
        .await?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::PgPool;

    async fn create_test_pool() -> PgPool {
        let database_url = std::env::var("DATABASE_URL")
            .unwrap_or_else(|_| "postgresql://postgres:password@localhost:5432/sveltehr_test".to_string());

        sqlx::PgPool::connect(&database_url)
            .await
            .expect("Failed to connect to test database")
    }

    #[tokio::test]
    #[ignore] // Requires database connection
    async fn test_set_rls_variables() {
        let pool = create_test_pool().await;
        let mut tx = pool.begin().await.unwrap();

        let user_id = Uuid::new_v4();
        let roles = vec!["Admin".to_string(), "HR_Manager".to_string()];

        // Set RLS variables
        set_rls_variables(&mut tx, user_id, &roles).await.unwrap();

        // Verify variables are set
        let result: (String,) = sqlx::query_as(
            "SELECT current_setting('app.user_id', true)"
        )
        .fetch_one(&mut *tx)
        .await
        .unwrap();

        assert_eq!(result.0, user_id.to_string());

        let result: (String,) = sqlx::query_as(
            "SELECT current_setting('app.roles', true)"
        )
        .fetch_one(&mut *tx)
        .await
        .unwrap();

        assert_eq!(result.0, "Admin,HR_Manager");

        tx.rollback().await.unwrap();
    }

    #[tokio::test]
    #[ignore] // Requires database connection
    async fn test_clear_rls_variables() {
        let pool = create_test_pool().await;
        let mut tx = pool.begin().await.unwrap();

        let user_id = Uuid::new_v4();
        let roles = vec!["Admin".to_string()];

        // Set and then clear
        set_rls_variables(&mut tx, user_id, &roles).await.unwrap();
        clear_rls_variables(&mut tx).await.unwrap();

        // Verify variables are cleared (should return NULL or empty)
        let result: Option<String> = sqlx::query_scalar(
            "SELECT current_setting('app.user_id', true)"
        )
        .fetch_optional(&mut *tx)
        .await
        .unwrap();

        assert!(result.is_none() || result.unwrap().is_empty());

        tx.rollback().await.unwrap();
    }

    #[tokio::test]
    #[ignore] // Requires database connection
    async fn test_multiple_roles() {
        let pool = create_test_pool().await;
        let mut tx = pool.begin().await.unwrap();

        let user_id = Uuid::new_v4();
        let roles = vec![
            "Admin".to_string(),
            "HR_Manager".to_string(),
            "Manager".to_string(),
        ];

        set_rls_variables(&mut tx, user_id, &roles).await.unwrap();

        let result: (String,) = sqlx::query_as(
            "SELECT current_setting('app.roles', true)"
        )
        .fetch_one(&mut *tx)
        .await
        .unwrap();

        assert_eq!(result.0, "Admin,HR_Manager,Manager");

        tx.rollback().await.unwrap();
    }
}
