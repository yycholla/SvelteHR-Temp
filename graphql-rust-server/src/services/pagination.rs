//! Pagination utilities for SeaORM queries
//!
//! Provides cursor-based and offset-based pagination with consistent
//! GraphQL relay-style connection patterns.

use async_graphql::{Error, connection::{Connection, Edge, EmptyFields}, OutputType, SimpleObject};
use sea_orm::{
    entity::prelude::*,
    DatabaseConnection, EntityTrait, PaginatorTrait, QueryFilter, QueryOrder, QuerySelect, Select,
};
use serde::{Deserialize, Serialize};

/// Pagination parameters for offset-based pagination
#[derive(Debug, Clone, Copy)]
pub struct OffsetPagination {
    pub page: u64,
    pub page_size: u64,
}

impl OffsetPagination {
    pub fn new(page: u64, page_size: u64) -> Self {
        Self {
            page: page.max(1),
            page_size: page_size.clamp(1, 100),
        }
    }

    pub fn offset(&self) -> u64 {
        (self.page - 1) * self.page_size
    }

    pub fn limit(&self) -> u64 {
        self.page_size
    }
}

impl Default for OffsetPagination {
    fn default() -> Self {
        Self::new(1, 20)
    }
}

/// Pagination parameters for cursor-based pagination
#[derive(Debug, Clone)]
pub struct CursorPagination {
    pub after: Option<String>,
    pub before: Option<String>,
    pub first: Option<u64>,
    pub last: Option<u64>,
}

impl CursorPagination {
    pub fn new() -> Self {
        Self {
            after: None,
            before: None,
            first: None,
            last: None,
        }
    }

    pub fn first(mut self, first: u64) -> Self {
        self.first = Some(first.clamp(1, 100));
        self
    }

    pub fn after(mut self, cursor: String) -> Self {
        self.after = Some(cursor);
        self
    }

    pub fn before(mut self, cursor: String) -> Self {
        self.before = Some(cursor);
        self
    }

    pub fn last(mut self, last: u64) -> Self {
        self.last = Some(last.clamp(1, 100));
        self
    }

    pub fn limit(&self) -> u64 {
        self.first.or(self.last).unwrap_or(20).clamp(1, 100)
    }
}

impl Default for CursorPagination {
    fn default() -> Self {
        Self::new()
    }
}

/// Page info for cursor-based pagination
#[derive(Debug, Clone, Serialize, Deserialize, SimpleObject)]
pub struct PageInfo {
    pub has_next_page: bool,
    pub has_previous_page: bool,
    pub start_cursor: Option<String>,
    pub end_cursor: Option<String>,
}

impl PageInfo {
    pub fn new() -> Self {
        Self {
            has_next_page: false,
            has_previous_page: false,
            start_cursor: None,
            end_cursor: None,
        }
    }
}

impl Default for PageInfo {
    fn default() -> Self {
        Self::new()
    }
}

/// Paginated result for offset-based pagination
#[derive(Debug, Clone)]
pub struct PaginatedResult<T> {
    pub items: Vec<T>,
    pub total_count: u64,
    pub page: u64,
    pub page_size: u64,
    pub total_pages: u64,
}

impl<T> PaginatedResult<T> {
    pub fn new(items: Vec<T>, total_count: u64, page: u64, page_size: u64) -> Self {
        let total_pages = if page_size > 0 {
            (total_count + page_size - 1) / page_size
        } else {
            0
        };

        Self {
            items,
            total_count,
            page,
            page_size,
            total_pages,
        }
    }

    pub fn has_next_page(&self) -> bool {
        self.page < self.total_pages
    }

    pub fn has_previous_page(&self) -> bool {
        self.page > 1
    }
}

/// Paginator for SeaORM queries
pub struct Paginator<'a, E: EntityTrait> {
    db: &'a DatabaseConnection,
    select: Select<E>,
}

impl<'a, E: EntityTrait> Paginator<'a, E> {
    pub fn new(db: &'a DatabaseConnection, select: Select<E>) -> Self {
        Self { db, select }
    }

    pub async fn paginate_offset(
        &self,
        pagination: OffsetPagination,
    ) -> Result<PaginatedResult<E::Model>, Error> {
        // For now, skip counting and set to 0 - this can be optimized later
        let total_count = 0;

        let items = self.select.clone()
            .limit(Some(pagination.page_size))
            .offset(Some(((pagination.page - 1) * pagination.page_size) as u64))
            .all(self.db)
            .await
            .map_err(|e| Error::new(format!("Failed to fetch page: {}", e)))?;

        Ok(PaginatedResult::new(
            items,
            total_count,
            pagination.page,
            pagination.page_size,
        ))
    }

    pub async fn paginate_cursor<F>(
        &self,
        pagination: CursorPagination,
        cursor_fn: F,
    ) -> Result<Connection<String, E::Model, EmptyFields, EmptyFields>, Error>
    where
        F: Fn(&E::Model) -> String,
        E::Model: OutputType,
    {
        let limit = pagination.limit();
        
        let mut query = self.select.clone().limit(limit + 1);

        if let Some(after) = &pagination.after {
            let decoded_cursor = decode_cursor(after)?;
            query = query.offset(decoded_cursor);
        }

        let items = query
            .all(self.db)
            .await
            .map_err(|e| Error::new(format!("Failed to fetch items: {}", e)))?;

        let has_next_page = items.len() > limit as usize;
        let items: Vec<E::Model> = items.into_iter().take(limit as usize).collect();

        let mut connection = Connection::new(false, has_next_page);
        
        for item in items {
            let cursor = cursor_fn(&item);
            connection.edges.push(Edge::new(cursor, item));
        }

        Ok(connection)
    }
}

/// Encode a cursor for pagination
pub fn encode_cursor(value: impl ToString) -> String {
    base64::encode(value.to_string())
}

/// Decode a cursor for pagination
pub fn decode_cursor(cursor: &str) -> Result<u64, Error> {
    let decoded = base64::decode(cursor)
        .map_err(|e| Error::new(format!("Invalid cursor format: {}", e)))?;
    
    let string = String::from_utf8(decoded)
        .map_err(|e| Error::new(format!("Invalid cursor encoding: {}", e)))?;
    
    string.parse::<u64>()
        .map_err(|e| Error::new(format!("Invalid cursor value: {}", e)))
}

/// Helper function to create a paginated query
pub async fn paginate<E: EntityTrait>(
    db: &DatabaseConnection,
    select: Select<E>,
    pagination: OffsetPagination,
) -> Result<PaginatedResult<E::Model>, Error> {
    let paginator = Paginator::new(db, select);
    paginator.paginate_offset(pagination).await
}

/// Helper function to create a cursor-paginated query
pub async fn paginate_cursor<E: EntityTrait, F>(
    db: &DatabaseConnection,
    mut select: Select<E>,
    pagination: CursorPagination,
    cursor_fn: F,
) -> Result<Connection<String, E::Model, EmptyFields, EmptyFields>, Error>
where
    F: Fn(&E::Model) -> String,
    E::Model: OutputType,
{
    let limit = pagination.limit();

    select = select.limit(limit + 1);

    if let Some(after) = &pagination.after {
        let decoded_cursor = decode_cursor(after)?;
        select = select.offset(decoded_cursor);
    }

    let items = select
        .all(db)
        .await
        .map_err(|e| Error::new(format!("Failed to fetch items: {}", e)))?;

    let has_next_page = items.len() > limit as usize;
    let items: Vec<E::Model> = items.into_iter().take(limit as usize).collect();

    let mut connection = Connection::new(false, has_next_page);

    for item in items {
        let cursor = cursor_fn(&item);
        connection.edges.push(Edge::new(cursor, item));
    }

    Ok(connection)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_offset_pagination_defaults() {
        let pagination = OffsetPagination::default();
        assert_eq!(pagination.page, 1);
        assert_eq!(pagination.page_size, 20);
        assert_eq!(pagination.offset(), 0);
    }

    #[test]
    fn test_offset_pagination_calculations() {
        let pagination = OffsetPagination::new(3, 10);
        assert_eq!(pagination.offset(), 20);
        assert_eq!(pagination.limit(), 10);
    }

    #[test]
    fn test_offset_pagination_clamping() {
        let pagination = OffsetPagination::new(0, 200);
        assert_eq!(pagination.page, 1);
        assert_eq!(pagination.page_size, 100);
    }

    #[test]
    fn test_cursor_pagination_defaults() {
        let pagination = CursorPagination::default();
        assert_eq!(pagination.limit(), 20);
        assert!(pagination.after.is_none());
        assert!(pagination.before.is_none());
    }

    #[test]
    fn test_cursor_encoding() {
        let cursor = encode_cursor("123");
        let decoded = decode_cursor(&cursor).unwrap();
        assert_eq!(decoded, 123);
    }

    #[test]
    fn test_paginated_result() {
        let result = PaginatedResult::new(vec![1, 2, 3], 50, 2, 10);
        assert_eq!(result.total_pages, 5);
        assert!(result.has_next_page());
        assert!(result.has_previous_page());
    }
}
