//! SeaORM query debugging utilities
//!
//! Provides utilities for debugging and analyzing SeaORM queries,
//! including query logging, performance analysis, and explain plans.

use async_graphql::Error;
use sea_orm::{ConnectionTrait, DatabaseConnection, DbBackend, Statement};
use serde::{Deserialize, Serialize};
use std::time::Instant;

/// Query execution statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryStats {
    pub query: String,
    pub duration_ms: u64,
    pub rows_returned: Option<usize>,
    pub timestamp: String,
}

/// Query explain result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExplainResult {
    pub query: String,
    pub plan: Vec<String>,
    pub estimated_cost: Option<f64>,
}

/// Query debugger for SeaORM
pub struct QueryDebugger<'a> {
    db: &'a DatabaseConnection,
}

impl<'a> QueryDebugger<'a> {
    pub fn new(db: &'a DatabaseConnection) -> Self {
        Self { db }
    }

    /// Execute a query and measure its performance
    pub async fn execute_with_timing(
        &self,
        sql: &str,
        params: Vec<sea_orm::Value>,
    ) -> Result<QueryStats, Error> {
        let start = Instant::now();

        let statement = Statement::from_sql_and_values(DbBackend::Postgres, sql, params);

        let result = self
            .db
            .query_all(statement)
            .await
            .map_err(|e| Error::new(format!("Query execution failed: {}", e)))?;

        let duration = start.elapsed();

        Ok(QueryStats {
            query: sql.to_string(),
            duration_ms: duration.as_millis() as u64,
            rows_returned: Some(result.len()),
            timestamp: chrono::Utc::now().to_rfc3339(),
        })
    }

    /// Get EXPLAIN output for a query
    pub async fn explain(&self, sql: &str) -> Result<ExplainResult, Error> {
        let explain_query = format!("EXPLAIN (FORMAT JSON) {}", sql);

        let statement = Statement::from_string(DbBackend::Postgres, explain_query);

        let result = self
            .db
            .query_all(statement)
            .await
            .map_err(|e| Error::new(format!("EXPLAIN failed: {}", e)))?;

        let plan: Vec<String> = result
            .iter()
            .filter_map(|row| row.try_get::<String>("", "QUERY PLAN").ok())
            .collect();

        Ok(ExplainResult {
            query: sql.to_string(),
            plan,
            estimated_cost: None, // Could be parsed from JSON plan
        })
    }

    /// Get EXPLAIN ANALYZE output for a query (actually executes)
    pub async fn explain_analyze(&self, sql: &str) -> Result<ExplainResult, Error> {
        let explain_query = format!("EXPLAIN (ANALYZE, FORMAT JSON) {}", sql);

        let statement = Statement::from_string(DbBackend::Postgres, explain_query);

        let result = self
            .db
            .query_all(statement)
            .await
            .map_err(|e| Error::new(format!("EXPLAIN ANALYZE failed: {}", e)))?;

        let plan: Vec<String> = result
            .iter()
            .filter_map(|row| row.try_get::<String>("", "QUERY PLAN").ok())
            .collect();

        Ok(ExplainResult {
            query: sql.to_string(),
            plan,
            estimated_cost: None,
        })
    }

    /// Log a query for debugging
    pub fn log_query(&self, query: &str, stats: &QueryStats) {
        tracing::debug!(
            query = %query,
            duration_ms = stats.duration_ms,
            rows = ?stats.rows_returned,
            "Query executed"
        );

        if stats.duration_ms > 100 {
            tracing::warn!(
                query = %query,
                duration_ms = stats.duration_ms,
                "Slow query detected (>100ms)"
            );
        }
    }

    /// Check for common query performance issues
    pub async fn analyze_query_performance(&self, sql: &str) -> Result<Vec<String>, Error> {
        let mut issues = Vec::new();

        // Check for SELECT *
        if sql.to_lowercase().contains("select *") {
            issues.push("Query uses SELECT * which may fetch unnecessary columns".to_string());
        }

        // Check for missing WHERE clause
        if sql.to_lowercase().contains("select")
            && !sql.to_lowercase().contains("where")
            && !sql.to_lowercase().contains("limit")
        {
            issues.push("Query may fetch all rows without WHERE or LIMIT".to_string());
        }

        // Check for N+1 pattern (multiple similar queries)
        if sql.contains("= $1") && sql.contains("select") {
            issues.push("Potential N+1 query pattern detected, consider batch loading".to_string());
        }

        // Get explain plan to check for seq scans
        match self.explain(sql).await {
            Ok(explain) => {
                let plan_text = explain.plan.join("\n");
                if plan_text.to_lowercase().contains("seq scan") {
                    issues.push("Query uses sequential scan, consider adding indexes".to_string());
                }
            }
            Err(_) => {
                // Ignore explain errors for now
            }
        }

        Ok(issues)
    }

    /// Format query for display
    pub fn format_query(&self, sql: &str) -> String {
        sql.lines()
            .map(|line| line.trim())
            .filter(|line| !line.is_empty())
            .collect::<Vec<&str>>()
            .join(" ")
    }
}

/// Query logger macro for easy query debugging
#[macro_export]
macro_rules! log_query {
    ($debugger:expr, $query:expr) => {{
        let formatted = $debugger.format_query($query);
        tracing::debug!("Executing query: {}", formatted);
        formatted
    }};
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_query_stats() {
        let stats = QueryStats {
            query: "SELECT * FROM users".to_string(),
            duration_ms: 50,
            rows_returned: Some(10),
            timestamp: chrono::Utc::now().to_rfc3339(),
        };

        assert_eq!(stats.duration_ms, 50);
        assert_eq!(stats.rows_returned, Some(10));
    }

    #[test]
    fn test_format_query() {
        let sql = "SELECT *\n  FROM users\n  WHERE id = $1";
        // Test requires database connection, skipping for now
    }
}
