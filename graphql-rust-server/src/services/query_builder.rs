//! SeaORM query builder for complex filtering
//!
//! Provides type-safe query building utilities for complex filtering operations
//! across all entities with consistent patterns and error handling.

use async_graphql::Error;
use sea_orm::{
    entity::prelude::*,
    sea_query::{Expr, Func, extension::postgres::PgExpr},
    Condition, Order, QueryOrder, QuerySelect, Select,
};
use chrono::{DateTime, Utc};

/// Filter operator for query building
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FilterOp {
    Eq,
    Ne,
    Gt,
    Gte,
    Lt,
    Lte,
    Like,
    ILike,
    In,
    NotIn,
    IsNull,
    IsNotNull,
    Between,
}

/// Sort direction for ordering
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SortDirection {
    Asc,
    Desc,
}

impl From<SortDirection> for Order {
    fn from(dir: SortDirection) -> Self {
        match dir {
            SortDirection::Asc => Order::Asc,
            SortDirection::Desc => Order::Desc,
        }
    }
}

/// Filter condition builder
pub struct FilterBuilder {
    condition: Condition,
}

impl FilterBuilder {
    pub fn new() -> Self {
        Self {
            condition: Condition::all(),
        }
    }

    pub fn add<C: ColumnTrait>(mut self, column: C, op: FilterOp, value: impl Into<Value>) -> Self {
        self.condition = match op {
            FilterOp::Eq => self.condition.add(column.eq(value)),
            FilterOp::Ne => self.condition.add(column.ne(value)),
            FilterOp::Gt => self.condition.add(column.gt(value)),
            FilterOp::Gte => self.condition.add(column.gte(value)),
            FilterOp::Lt => self.condition.add(column.lt(value)),
            FilterOp::Lte => self.condition.add(column.lte(value)),
            FilterOp::Like => {
                let value: Value = value.into();
                let string_value = match value {
                    Value::String(Some(s)) => *s,
                    _ => value.to_string(),
                };
                self.condition.add(column.like(string_value))
            },
            FilterOp::IsNull => self.condition.add(column.is_null()),
            FilterOp::IsNotNull => self.condition.add(column.is_not_null()),
            _ => self.condition,
        };
        self
    }

    pub fn add_in<C: ColumnTrait>(mut self, column: C, values: Vec<impl Into<Value>>) -> Self {
        let vals: Vec<Value> = values.into_iter().map(|v| v.into()).collect();
        self.condition = self.condition.add(column.is_in(vals));
        self
    }

    pub fn add_not_in<C: ColumnTrait>(mut self, column: C, values: Vec<impl Into<Value>>) -> Self {
        let vals: Vec<Value> = values.into_iter().map(|v| v.into()).collect();
        self.condition = self.condition.add(column.is_not_in(vals));
        self
    }

    pub fn add_between<C: ColumnTrait>(
        mut self,
        column: C,
        start: impl Into<Value>,
        end: impl Into<Value>,
    ) -> Self {
        let start: Value = start.into();
        let end: Value = end.into();
        self.condition = self.condition.add(column.between(start, end));
        self
    }

    pub fn add_custom(mut self, condition: sea_orm::Condition) -> Self {
        self.condition = self.condition.add(condition);
        self
    }

    pub fn build(self) -> Condition {
        self.condition
    }
}

impl Default for FilterBuilder {
    fn default() -> Self {
        Self::new()
    }
}

/// Query builder with pagination and sorting
pub struct QueryBuilder<E: EntityTrait> {
    select: Select<E>,
}

impl<E: EntityTrait> QueryBuilder<E> {
    pub fn new() -> Self {
        Self {
            select: E::find(),
        }
    }

    pub fn filter(mut self, condition: Condition) -> Self {
        self.select = self.select.filter(condition);
        self
    }

    pub fn order_by<C: ColumnTrait>(mut self, column: C, direction: SortDirection) -> Self {
        self.select = match direction {
            SortDirection::Asc => self.select.order_by_asc(column),
            SortDirection::Desc => self.select.order_by_desc(column),
        };
        self
    }

    pub fn limit(mut self, limit: u64) -> Self {
        self.select = self.select.limit(limit);
        self
    }

    pub fn offset(mut self, offset: u64) -> Self {
        self.select = self.select.offset(offset);
        self
    }

    pub fn build(self) -> Select<E> {
        self.select
    }
}

impl<E: EntityTrait> Default for QueryBuilder<E> {
    fn default() -> Self {
        Self::new()
    }
}

/// Text search builder for full-text search
pub struct TextSearchBuilder {
    search_term: String,
}

impl TextSearchBuilder {
    pub fn new(search_term: impl Into<String>) -> Self {
        Self {
            search_term: search_term.into(),
        }
    }

    pub fn build_like_pattern(&self) -> String {
        format!("%{}%", self.search_term.replace('%', "\\%").replace('_', "\\_"))
    }

    pub fn build_ilike_condition<C: ColumnTrait>(&self, columns: Vec<C>) -> Condition {
        let pattern = self.build_like_pattern();
        let mut condition = Condition::any();
        for column in columns {
            condition = condition.add(
                Expr::col(column.as_column_ref()).ilike(pattern.clone())
            );
        }
        condition
    }
}

/// Date range filter builder
pub struct DateRangeBuilder {
    start: Option<DateTime<Utc>>,
    end: Option<DateTime<Utc>>,
}

impl DateRangeBuilder {
    pub fn new() -> Self {
        Self {
            start: None,
            end: None,
        }
    }

    pub fn start(mut self, start: DateTime<Utc>) -> Self {
        self.start = Some(start);
        self
    }

    pub fn end(mut self, end: DateTime<Utc>) -> Self {
        self.end = Some(end);
        self
    }

    pub fn build<C: ColumnTrait>(&self, column: C) -> Option<Condition> {
        match (&self.start, &self.end) {
            (Some(start), Some(end)) => {
                Some(Condition::all()
                    .add(column.gte(*start))
                    .add(column.lte(*end)))
            }
            (Some(start), None) => Some(Condition::all().add(column.gte(*start))),
            (None, Some(end)) => Some(Condition::all().add(column.lte(*end))),
            (None, None) => None,
        }
    }
}

impl Default for DateRangeBuilder {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_filter_builder() {
        let builder = FilterBuilder::new();
        let _condition = builder.build();
        // Test passes if no panic occurs during build
    }

    #[test]
    fn test_text_search_like_pattern() {
        let search = TextSearchBuilder::new("test");
        assert_eq!(search.build_like_pattern(), "%test%");

        let search_with_special = TextSearchBuilder::new("test_%");
        assert_eq!(search_with_special.build_like_pattern(), "%test\\_\\%%");
    }

    #[test]
    fn test_date_range_builder() {
        let builder = DateRangeBuilder::new();
        assert!(builder.start.is_none());
        assert!(builder.end.is_none());

        let now = Utc::now();
        let builder = DateRangeBuilder::new().start(now);
        assert!(builder.start.is_some());
        assert!(builder.end.is_none());
    }
}
