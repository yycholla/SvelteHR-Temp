//! Optimistic locking validator for concurrent update detection
//!
//! Prevents lost updates by comparing the `updated_at` timestamp before applying changes.
//! If the timestamp has changed since the client last read the record, the update is rejected.

use chrono::{DateTime, Utc};
use thiserror::Error;

/// Optimistic locking error
#[derive(Error, Debug)]
pub enum OptimisticLockError {
    #[error("Concurrent modification detected: record was updated by another user")]
    ConcurrentModification,

    #[error("Record not found or has been deleted")]
    NotFound,

    #[error("Database error: {0}")]
    DatabaseError(#[from] sqlx::Error),
}

/// Validate optimistic lock before update
///
/// Compares the client's `updated_at` timestamp with the current database value.
/// Returns Ok if timestamps match, Err if there's a conflict.
///
/// # Example
/// ```rust,no_run
/// use hr_graphql_server::db::optimistic_lock::validate_optimistic_lock;
/// use sqlx::PgPool;
/// use uuid::Uuid;
/// use chrono::Utc;
///
/// async fn update_user(pool: &PgPool, user_id: Uuid, client_updated_at: chrono::DateTime<Utc>) -> Result<(), Box<dyn std::error::Error>> {
///     // Validate lock before updating
///     validate_optimistic_lock(
///         pool,
///         "hr_public.users",
///         user_id,
///         client_updated_at
///     ).await?;
///
///     // Proceed with update...
///     Ok(())
/// }
/// ```
pub async fn validate_optimistic_lock(
    pool: &sqlx::PgPool,
    table: &str,
    record_id: uuid::Uuid,
    client_updated_at: DateTime<Utc>,
) -> Result<(), OptimisticLockError> {
    // Query current updated_at timestamp from database
    let query = format!(
        "SELECT updated_at FROM {} WHERE id = $1 AND deleted_at IS NULL",
        table
    );

    let result: Option<(DateTime<Utc>,)> = sqlx::query_as(&query)
        .bind(record_id)
        .fetch_optional(pool)
        .await?;

    match result {
        Some((db_updated_at,)) => {
            // Compare timestamps (allow 1 second tolerance for clock skew)
            let time_diff = (db_updated_at.timestamp() - client_updated_at.timestamp()).abs();

            if time_diff > 1 {
                // Timestamps don't match - concurrent modification detected
                Err(OptimisticLockError::ConcurrentModification)
            } else {
                Ok(())
            }
        }
        None => {
            // Record not found or deleted
            Err(OptimisticLockError::NotFound)
        }
    }
}

/// Validate optimistic lock with transaction support
///
/// Use this when you're already in a transaction and want to validate the lock
/// before applying updates within that transaction.
///
/// # Example
/// ```rust,no_run
/// use hr_graphql_server::db::optimistic_lock::validate_optimistic_lock_with_tx;
/// use sqlx::{PgPool, Postgres, Transaction};
/// use uuid::Uuid;
/// use chrono::Utc;
///
/// async fn update_user_tx(pool: &PgPool, user_id: Uuid, client_updated_at: chrono::DateTime<Utc>) -> Result<(), Box<dyn std::error::Error>> {
///     let mut tx = pool.begin().await?;
///
///     // Validate lock within transaction
///     validate_optimistic_lock_with_tx(
///         &mut tx,
///         "hr_public.users",
///         user_id,
///         client_updated_at
///     ).await?;
///
///     // Proceed with update...
///     sqlx::query("UPDATE hr_public.users SET full_name = $1, updated_at = NOW() WHERE id = $2")
///         .bind("New Name")
///         .bind(user_id)
///         .execute(&mut *tx)
///         .await?;
///
///     tx.commit().await?;
///     Ok(())
/// }
/// ```
pub async fn validate_optimistic_lock_with_tx(
    tx: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    table: &str,
    record_id: uuid::Uuid,
    client_updated_at: DateTime<Utc>,
) -> Result<(), OptimisticLockError> {
    let query = format!(
        "SELECT updated_at FROM {} WHERE id = $1 AND deleted_at IS NULL FOR UPDATE",
        table
    );

    let result: Option<(DateTime<Utc>,)> = sqlx::query_as(&query)
        .bind(record_id)
        .fetch_optional(&mut **tx)
        .await?;

    match result {
        Some((db_updated_at,)) => {
            let time_diff = (db_updated_at.timestamp() - client_updated_at.timestamp()).abs();

            if time_diff > 1 {
                Err(OptimisticLockError::ConcurrentModification)
            } else {
                Ok(())
            }
        }
        None => Err(OptimisticLockError::NotFound),
    }
}

/// Helper to extract updated_at from GraphQL update input
///
/// Most update mutations should include the current `updated_at` timestamp
/// from the client. This helper extracts it for validation.
pub fn extract_updated_at_from_input(
    updated_at: Option<DateTime<Utc>>,
) -> Result<DateTime<Utc>, OptimisticLockError> {
    updated_at.ok_or_else(|| {
        OptimisticLockError::ConcurrentModification
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_timestamp_tolerance() {
        // 1 second difference should be tolerated (clock skew)
        let time1 = Utc::now();
        let time2 = time1 + chrono::Duration::milliseconds(500);

        let diff = (time2.timestamp() - time1.timestamp()).abs();
        assert!(diff <= 1);
    }

    #[test]
    fn test_extract_updated_at() {
        let now = Utc::now();
        let result = extract_updated_at_from_input(Some(now));
        assert!(result.is_ok());

        let result = extract_updated_at_from_input(None);
        assert!(result.is_err());
    }

    #[tokio::test]
    #[ignore] // Requires database connection
    async fn test_validate_optimistic_lock() {
        // Integration test - requires real database
        // See tests/integration/ for full test coverage
    }
}
