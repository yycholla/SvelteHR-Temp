pub mod filters;
pub mod optimistic_lock;
pub mod rls;
pub mod rls_context;
pub mod macros;

use anyhow::Result;
use sqlx::postgres::PgPoolOptions;
use sqlx::{Pool, Postgres};

pub type DbPool = Pool<Postgres>;

// Legacy RLS helpers (for backward compatibility)
pub use rls::{set_rls_variables, set_rls_variables_on_connection, clear_rls_variables};

// New idiomatic RLS API (recommended)
pub use rls_context::{RlsSession, RlsTransaction, RlsContextExt};
pub use filters::{
    apply_soft_delete_filter,
    apply_soft_delete_filter_with_alias,
    include_deleted_filter,
    apply_date_range_filter,
    apply_pagination,
    apply_sorting,
    apply_search_filter,
    SortDirection,
};
pub use optimistic_lock::{
    validate_optimistic_lock,
    validate_optimistic_lock_with_tx,
    extract_updated_at_from_input,
    OptimisticLockError,
};

pub async fn create_pool(database_url: &str) -> Result<DbPool> {
    let pool = PgPoolOptions::new()
        .max_connections(20)
        .connect(database_url)
        .await?;

    tracing::info!("Database pool created successfully");

    Ok(pool)
}
