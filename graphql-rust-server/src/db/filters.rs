//! Database query filters for common patterns
//!
//! Provides reusable filter helpers for soft delete, pagination, sorting, and search.

use chrono::{DateTime, Utc};
use sqlx::QueryBuilder;

/// Soft delete filter clause
///
/// Adds "deleted_at IS NULL" to exclude soft-deleted records.
/// Use this in all queries unless explicitly including deleted records.
///
/// # Example
/// ```rust,no_run
/// use sqlx::QueryBuilder;
/// use hr_graphql_server::db::filters::apply_soft_delete_filter;
///
/// let mut query = QueryBuilder::new("SELECT * FROM users WHERE ");
/// apply_soft_delete_filter(&mut query);
/// // Generates: SELECT * FROM users WHERE deleted_at IS NULL
/// ```
pub fn apply_soft_delete_filter<'a, DB>(query: &mut QueryBuilder<'a, DB>)
where
    DB: sqlx::Database,
{
    query.push("deleted_at IS NULL");
}

/// Soft delete filter with table alias
///
/// Use when joining multiple tables to avoid ambiguous column references.
///
/// # Example
/// ```rust,no_run
/// use sqlx::QueryBuilder;
/// use hr_graphql_server::db::filters::apply_soft_delete_filter_with_alias;
///
/// let mut query = QueryBuilder::new("SELECT u.* FROM users u WHERE ");
/// apply_soft_delete_filter_with_alias(&mut query, "u");
/// // Generates: SELECT u.* FROM users u WHERE u.deleted_at IS NULL
/// ```
pub fn apply_soft_delete_filter_with_alias<'a, DB>(
    query: &mut QueryBuilder<'a, DB>,
    table_alias: &str,
) where
    DB: sqlx::Database,
{
    query.push(format!("{}.deleted_at IS NULL", table_alias));
}

/// Include soft deleted records in query
///
/// Use this when you explicitly want to include deleted records
/// (e.g., for admin views or audit trails).
///
/// # Example
/// ```rust,no_run
/// use sqlx::QueryBuilder;
/// use hr_graphql_server::db::filters::include_deleted_filter;
///
/// let mut query = QueryBuilder::new("SELECT * FROM users WHERE ");
/// include_deleted_filter(&mut query);
/// // Generates: SELECT * FROM users WHERE 1=1 (no filter)
/// ```
pub fn include_deleted_filter<'a, DB>(query: &mut QueryBuilder<'a, DB>)
where
    DB: sqlx::Database,
{
    query.push("1=1"); // No-op filter, includes all records
}

/// Filter by date range (PostgreSQL only)
///
/// Adds date range filtering for created_at, updated_at, or any timestamp column.
///
/// # Example
/// ```rust,no_run
/// use sqlx::{QueryBuilder, Postgres};
/// use hr_graphql_server::db::filters::apply_date_range_filter;
/// use chrono::Utc;
///
/// let mut query = QueryBuilder::<Postgres>::new("SELECT * FROM users WHERE ");
/// let start = Utc::now() - chrono::Duration::days(30);
/// let end = Utc::now();
/// apply_date_range_filter(&mut query, "created_at", Some(start), Some(end));
/// ```
pub fn apply_date_range_filter(
    query: &mut QueryBuilder<'_, sqlx::Postgres>,
    column: &str,
    start: Option<DateTime<Utc>>,
    end: Option<DateTime<Utc>>,
) {
    if let Some(start_date) = start {
        query.push(format!("{} >= ", column));
        query.push_bind(start_date);
        if end.is_some() {
            query.push(" AND ");
        }
    }
    if let Some(end_date) = end {
        query.push(format!("{} <= ", column));
        query.push_bind(end_date);
    }
}

/// Pagination limit and offset
///
/// Adds LIMIT and OFFSET clauses for cursor-based pagination.
/// Defaults to limit 100 (as per spec clarification).
///
/// # Example
/// ```rust,no_run
/// use sqlx::QueryBuilder;
/// use hr_graphql_server::db::filters::apply_pagination;
///
/// let mut query = QueryBuilder::new("SELECT * FROM users");
/// apply_pagination(&mut query, Some(20), Some(40));
/// // Generates: SELECT * FROM users LIMIT 20 OFFSET 40
/// ```
pub fn apply_pagination<'a, DB>(
    query: &mut QueryBuilder<'a, DB>,
    limit: Option<i32>,
    offset: Option<i32>,
) where
    DB: sqlx::Database,
{
    let limit_value = limit.unwrap_or(100).min(100); // Cap at 100 per spec
    query.push(format!(" LIMIT {}", limit_value));

    if let Some(offset_value) = offset {
        query.push(format!(" OFFSET {}", offset_value));
    }
}

/// Sorting/ordering
///
/// Adds ORDER BY clause with direction (ASC/DESC).
///
/// # Example
/// ```rust,no_run
/// use sqlx::QueryBuilder;
/// use hr_graphql_server::db::filters::apply_sorting;
///
/// let mut query = QueryBuilder::new("SELECT * FROM users");
/// apply_sorting(&mut query, "created_at", SortDirection::Desc);
/// // Generates: SELECT * FROM users ORDER BY created_at DESC
/// ```
pub fn apply_sorting<'a, DB>(
    query: &mut QueryBuilder<'a, DB>,
    column: &str,
    direction: SortDirection,
) where
    DB: sqlx::Database,
{
    query.push(format!(
        " ORDER BY {} {}",
        column,
        match direction {
            SortDirection::Asc => "ASC",
            SortDirection::Desc => "DESC",
        }
    ));
}

/// Sort direction enum
#[derive(Debug, Clone, Copy)]
pub enum SortDirection {
    Asc,
    Desc,
}

/// Full-text search filter (PostgreSQL only)
///
/// Adds ILIKE filter for simple text search across multiple columns.
/// For production, consider using PostgreSQL full-text search (tsvector).
///
/// # Example
/// ```rust,no_run
/// use sqlx::{QueryBuilder, Postgres};
/// use hr_graphql_server::db::filters::apply_search_filter;
///
/// let mut query = QueryBuilder::<Postgres>::new("SELECT * FROM users WHERE ");
/// apply_search_filter(&mut query, &["full_name", "email"], "john");
/// ```
pub fn apply_search_filter(
    query: &mut QueryBuilder<'_, sqlx::Postgres>,
    columns: &[&str],
    search_term: &str,
) {
    query.push("(");
    for (i, column) in columns.iter().enumerate() {
        if i > 0 {
            query.push(" OR ");
        }
        query.push(format!("{} ILIKE ", column));
        query.push_bind(format!("%{}%", search_term));
    }
    query.push(")");
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::Postgres;

    #[test]
    fn test_soft_delete_filter() {
        let mut query = QueryBuilder::<Postgres>::new("SELECT * FROM users WHERE ");
        apply_soft_delete_filter(&mut query);
        let sql = query.sql();
        assert!(sql.contains("deleted_at IS NULL"));
    }

    #[test]
    fn test_soft_delete_with_alias() {
        let mut query = QueryBuilder::<Postgres>::new("SELECT u.* FROM users u WHERE ");
        apply_soft_delete_filter_with_alias(&mut query, "u");
        let sql = query.sql();
        assert!(sql.contains("u.deleted_at IS NULL"));
    }

    #[test]
    fn test_pagination() {
        let mut query = QueryBuilder::<Postgres>::new("SELECT * FROM users");
        apply_pagination(&mut query, Some(20), Some(40));
        let sql = query.sql();
        assert!(sql.contains("LIMIT 20"));
        assert!(sql.contains("OFFSET 40"));
    }

    #[test]
    fn test_pagination_default_limit() {
        let mut query = QueryBuilder::<Postgres>::new("SELECT * FROM users");
        apply_pagination(&mut query, None, None);
        let sql = query.sql();
        assert!(sql.contains("LIMIT 100")); // Default limit per spec
    }

    #[test]
    fn test_sorting() {
        let mut query = QueryBuilder::<Postgres>::new("SELECT * FROM users");
        apply_sorting(&mut query, "created_at", SortDirection::Desc);
        let sql = query.sql();
        assert!(sql.contains("ORDER BY created_at DESC"));
    }
}
