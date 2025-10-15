//! Database schema validation utilities
//!
//! Validates that SeaORM entity definitions match the actual database schema,
//! detecting schema drift and mismatches.

use async_graphql::Error;
use sea_orm::{ConnectionTrait, DatabaseConnection, DbBackend, Statement};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Column information from database schema
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColumnInfo {
    pub name: String,
    pub data_type: String,
    pub is_nullable: bool,
    pub column_default: Option<String>,
}

/// Table information from database schema
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableInfo {
    pub name: String,
    pub columns: Vec<ColumnInfo>,
}

/// Schema validation result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationResult {
    pub is_valid: bool,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
}

impl ValidationResult {
    pub fn new() -> Self {
        Self {
            is_valid: true,
            errors: Vec::new(),
            warnings: Vec::new(),
        }
    }

    pub fn add_error(&mut self, error: impl Into<String>) {
        self.is_valid = false;
        self.errors.push(error.into());
    }

    pub fn add_warning(&mut self, warning: impl Into<String>) {
        self.warnings.push(warning.into());
    }
}

impl Default for ValidationResult {
    fn default() -> Self {
        Self::new()
    }
}

/// Schema validator for SeaORM entities
pub struct SchemaValidator<'a> {
    db: &'a DatabaseConnection,
}

impl<'a> SchemaValidator<'a> {
    pub fn new(db: &'a DatabaseConnection) -> Self {
        Self { db }
    }

    /// Get all tables in the database
    pub async fn get_tables(&self) -> Result<Vec<String>, Error> {
        let query = Statement::from_string(
            DbBackend::Postgres,
            r#"
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'hr_public'
            ORDER BY table_name
            "#
            .to_string(),
        );

        let result = self
            .db
            .query_all(query)
            .await
            .map_err(|e| Error::new(format!("Failed to query tables: {}", e)))?;

        let tables: Vec<String> = result
            .into_iter()
            .filter_map(|row| row.try_get("", "table_name").ok())
            .collect();

        Ok(tables)
    }

    /// Get column information for a table
    pub async fn get_table_columns(&self, table_name: &str) -> Result<Vec<ColumnInfo>, Error> {
        let query = Statement::from_string(
            DbBackend::Postgres,
            format!(
                r#"
                SELECT 
                    column_name,
                    data_type,
                    is_nullable,
                    column_default
                FROM information_schema.columns
                WHERE table_schema = 'hr_public' 
                    AND table_name = '{}'
                ORDER BY ordinal_position
                "#,
                table_name
            ),
        );

        let result = self
            .db
            .query_all(query)
            .await
            .map_err(|e| Error::new(format!("Failed to query columns: {}", e)))?;

        let columns: Vec<ColumnInfo> = result
            .into_iter()
            .filter_map(|row| {
                let name: String = row.try_get("", "column_name").ok()?;
                let data_type: String = row.try_get("", "data_type").ok()?;
                let is_nullable: String = row.try_get("", "is_nullable").ok()?;
                let column_default: Option<String> = row.try_get("", "column_default").ok();

                Some(ColumnInfo {
                    name,
                    data_type,
                    is_nullable: is_nullable == "YES",
                    column_default,
                })
            })
            .collect();

        Ok(columns)
    }

    /// Get full table information
    pub async fn get_table_info(&self, table_name: &str) -> Result<TableInfo, Error> {
        let columns = self.get_table_columns(table_name).await?;
        Ok(TableInfo {
            name: table_name.to_string(),
            columns,
        })
    }

    /// Validate schema consistency
    pub async fn validate_schema(&self) -> Result<ValidationResult, Error> {
        let mut result = ValidationResult::new();

        // Get all tables
        let tables = self.get_tables().await?;
        
        if tables.is_empty() {
            result.add_error("No tables found in database");
            return Ok(result);
        }

        // Expected core tables from our entities
        let expected_tables = vec![
            "users",
            "departments",
            "tasks",
            "leave_requests",
            "performance_reviews",
            "activity_logs",
        ];

        // Check for missing core tables
        for expected in &expected_tables {
            if !tables.contains(&expected.to_string()) {
                result.add_error(format!("Missing core table: {}", expected));
            }
        }

        // Validate each table structure
        for table_name in &expected_tables {
            if tables.contains(&table_name.to_string()) {
                match self.get_table_info(table_name).await {
                    Ok(table_info) => {
                        self.validate_table_structure(&table_info, &mut result);
                    }
                    Err(e) => {
                        result.add_error(format!("Failed to get info for table {}: {}", table_name, e));
                    }
                }
            }
        }

        Ok(result)
    }

    /// Validate table structure
    fn validate_table_structure(&self, table: &TableInfo, result: &mut ValidationResult) {
        // Check for required columns
        let required_columns = vec!["id", "created_at", "updated_at"];
        
        for required in &required_columns {
            if !table.columns.iter().any(|c| c.name == *required) {
                result.add_warning(format!(
                    "Table '{}' missing recommended column: {}",
                    table.name, required
                ));
            }
        }

        // Check for primary key
        let has_id = table.columns.iter().any(|c| c.name == "id");
        if !has_id {
            result.add_error(format!("Table '{}' missing primary key column 'id'", table.name));
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validation_result() {
        let mut result = ValidationResult::new();
        assert!(result.is_valid);
        assert_eq!(result.errors.len(), 0);

        result.add_error("Test error");
        assert!(!result.is_valid);
        assert_eq!(result.errors.len(), 1);

        result.add_warning("Test warning");
        assert_eq!(result.warnings.len(), 1);
    }
}
