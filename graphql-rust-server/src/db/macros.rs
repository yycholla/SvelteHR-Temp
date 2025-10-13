//! Ergonomic macros for RLS-aware database operations
//!
//! These macros reduce boilerplate when working with RLS transactions.

/// Execute a query with automatic RLS setup
///
/// This macro extracts the RLS session from context and executes
/// the provided closure with an RLS-aware transaction.
///
/// # Usage
///
/// ```rust,no_run
/// use crate::with_rls;
///
/// async fn my_resolver(ctx: &Context<'_>) -> Result<Vec<Notification>> {
///     let pool = ctx.data::<PgPool>()?;
///
///     with_rls!(ctx, pool, |mut tx| async move {
///         sqlx::query_as::<_, Notification>(
///             "SELECT * FROM hr_public.notifications"
///         )
///         .fetch_all(&mut **tx.as_mut())
///         .await
///     })
/// }
/// ```
///
/// # Expansion
///
/// The macro expands to:
/// ```rust,ignore
/// {
///     let session = ctx.rls_session()?;
///     session.execute(pool, |tx| async move {
///         // Your code here
///     }).await
/// }
/// ```
#[macro_export]
macro_rules! with_rls {
    ($ctx:expr, $pool:expr, $f:expr) => {{
        use $crate::db::rls_context::RlsContextExt;
        let session = $ctx.rls_session()?;
        session.execute($pool, $f).await
    }};
}

/// Execute a simple SELECT query with RLS
///
/// Convenience macro for common SELECT queries.
///
/// # Usage
///
/// ```rust,no_run
/// use crate::rls_query;
///
/// async fn get_user(ctx: &Context<'_>, id: Uuid) -> Result<Option<User>> {
///     let pool = ctx.data::<PgPool>()?;
///
///     rls_query!(
///         ctx, pool, User,
///         "SELECT * FROM hr_public.users WHERE id = $1",
///         id
///     )
/// }
/// ```
#[macro_export]
macro_rules! rls_query {
    ($ctx:expr, $pool:expr, $type:ty, $sql:expr $(, $arg:expr)*) => {{
        use $crate::db::rls_context::RlsContextExt;
        let session = $ctx.rls_session()?;
        session.execute($pool, |mut tx| async move {
            sqlx::query_as::<_, $type>($sql)
                $(.bind($arg))*
                .fetch_all(&mut **tx.as_mut())
                .await
                .map_err(|e| {
                    tracing::error!("RLS query failed: {}", e);
                    async_graphql::Error::new("Database query failed")
                })
        }).await
    }};
}

/// Execute a simple SELECT ONE query with RLS
///
/// Convenience macro for fetching a single record.
///
/// # Usage
///
/// ```rust,no_run
/// use crate::rls_query_one;
///
/// async fn get_user(ctx: &Context<'_>, id: Uuid) -> Result<User> {
///     let pool = ctx.data::<PgPool>()?;
///
///     rls_query_one!(
///         ctx, pool, User,
///         "SELECT * FROM hr_public.users WHERE id = $1",
///         id
///     )
/// }
/// ```
#[macro_export]
macro_rules! rls_query_one {
    ($ctx:expr, $pool:expr, $type:ty, $sql:expr $(, $arg:expr)*) => {{
        use $crate::db::rls_context::RlsContextExt;
        let session = $ctx.rls_session()?;
        session.execute($pool, |mut tx| async move {
            sqlx::query_as::<_, $type>($sql)
                $(.bind($arg))*
                .fetch_one(&mut **tx.as_mut())
                .await
                .map_err(|e| {
                    tracing::error!("RLS query_one failed: {}", e);
                    async_graphql::Error::new("Database query failed")
                })
        }).await
    }};
}

/// Execute a SELECT OPTIONAL query with RLS
///
/// Convenience macro for fetching an optional record.
///
/// # Usage
///
/// ```rust,no_run
/// use crate::rls_query_optional;
///
/// async fn find_user(ctx: &Context<'_>, email: &str) -> Result<Option<User>> {
///     let pool = ctx.data::<PgPool>()?;
///
///     rls_query_optional!(
///         ctx, pool, User,
///         "SELECT * FROM hr_public.users WHERE email = $1",
///         email
///     )
/// }
/// ```
#[macro_export]
macro_rules! rls_query_optional {
    ($ctx:expr, $pool:expr, $type:ty, $sql:expr $(, $arg:expr)*) => {{
        use $crate::db::rls_context::RlsContextExt;
        let session = $ctx.rls_session()?;
        session.execute($pool, |mut tx| async move {
            sqlx::query_as::<_, $type>($sql)
                $(.bind($arg))*
                .fetch_optional(&mut **tx.as_mut())
                .await
                .map_err(|e| {
                    tracing::error!("RLS query_optional failed: {}", e);
                    async_graphql::Error::new("Database query failed")
                })
        }).await
    }};
}

/// Execute a scalar query (like COUNT) with RLS
///
/// Convenience macro for COUNT, SUM, MAX, etc. queries.
///
/// # Usage
///
/// ```rust,no_run
/// use crate::rls_query_scalar;
///
/// async fn count_users(ctx: &Context<'_>) -> Result<i64> {
///     let pool = ctx.data::<PgPool>()?;
///
///     rls_query_scalar!(
///         ctx, pool, i64,
///         "SELECT COUNT(*) FROM hr_public.users"
///     )
/// }
/// ```
#[macro_export]
macro_rules! rls_query_scalar {
    ($ctx:expr, $pool:expr, $type:ty, $sql:expr $(, $arg:expr)*) => {{
        use $crate::db::rls_context::RlsContextExt;
        let session = $ctx.rls_session()?;
        session.execute($pool, |mut tx| async move {
            let row = sqlx::query($sql)
                $(.bind($arg))*
                .fetch_one(&mut **tx.as_mut())
                .await
                .map_err(|e| {
                    tracing::error!("RLS scalar query failed: {}", e);
                    async_graphql::Error::new("Database query failed")
                })?;

            row.try_get::<$type, _>(0)
                .map_err(|e| {
                    tracing::error!("Failed to decode scalar: {}", e);
                    async_graphql::Error::new("Database query failed")
                })
        }).await
    }};
}

#[cfg(test)]
mod tests {
    // Macro tests would go here
    // These are compile-time tests, so they verify the macros expand correctly
}
