use sea_orm_migration::prelude::*;

/// Helper utilities for safe, idempotent migrations
pub struct MigrationHelpers;

impl MigrationHelpers {
    /// Execute SQL with better error reporting
    /// Returns Ok(()) even if the operation was skipped due to already existing
    pub async fn execute_idempotent(
        manager: &SchemaManager<'_>,
        sql: &str,
        operation_desc: &str,
    ) -> Result<(), DbErr> {
        match manager.get_connection().execute_unprepared(sql).await {
            Ok(_) => {
                println!("✓ {}", operation_desc);
                Ok(())
            }
            Err(e) => {
                let error_msg = e.to_string();

                // Check if error is due to already existing (idempotent - safe to ignore)
                if error_msg.contains("already exists") {
                    println!("⊙ {} (already exists, skipping)", operation_desc);
                    Ok(())
                } else if error_msg.contains("does not exist") && sql.contains("DROP") {
                    println!("⊙ {} (doesn't exist, skipping)", operation_desc);
                    Ok(())
                } else {
                    eprintln!("✗ {} failed: {}", operation_desc, error_msg);
                    Err(e)
                }
            }
        }
    }

    /// Add column with IF NOT EXISTS guard
    pub async fn add_column_if_not_exists(
        manager: &SchemaManager<'_>,
        table: &str,
        column_def: &str,
    ) -> Result<(), DbErr> {
        let sql = format!(
            "ALTER TABLE {} ADD COLUMN IF NOT EXISTS {}",
            table, column_def
        );
        Self::execute_idempotent(
            manager,
            &sql,
            &format!("Add column to {}: {}", table, column_def.split_whitespace().next().unwrap_or("")),
        )
        .await
    }

    /// Create index with IF NOT EXISTS guard
    pub async fn create_index_if_not_exists(
        manager: &SchemaManager<'_>,
        index_name: &str,
        table: &str,
        columns: &str,
    ) -> Result<(), DbErr> {
        let sql = format!(
            "CREATE INDEX IF NOT EXISTS {} ON {} ({})",
            index_name, table, columns
        );
        Self::execute_idempotent(manager, &sql, &format!("Create index {}", index_name))
            .await
    }

    /// Drop index with IF EXISTS guard
    pub async fn drop_index_if_exists(
        manager: &SchemaManager<'_>,
        index_name: &str,
    ) -> Result<(), DbErr> {
        let sql = format!("DROP INDEX IF EXISTS {}", index_name);
        Self::execute_idempotent(manager, &sql, &format!("Drop index {}", index_name))
            .await
    }

    /// Add multiple columns in a single ALTER TABLE (more efficient)
    /// All columns will use IF NOT EXISTS
    pub async fn add_columns_if_not_exist(
        manager: &SchemaManager<'_>,
        table: &str,
        columns: &[&str],
    ) -> Result<(), DbErr> {
        // PostgreSQL doesn't support IF NOT EXISTS with multiple columns in one statement
        // So we execute them individually for safety
        for column_def in columns {
            Self::add_column_if_not_exists(manager, table, column_def).await?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_migration_helpers_exist() {
        // Basic compilation test
        let _helpers = MigrationHelpers;
    }
}
