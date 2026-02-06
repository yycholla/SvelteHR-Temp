use async_graphql::{Context, Result};
use chrono::Utc;
use sea_orm::{EntityTrait, Set, ActiveModelTrait, QueryFilter, ColumnTrait, TransactionTrait};
use uuid::Uuid;

use crate::{
    database::get_db_from_context,
    error::AppError,
    models::{
        BulkUpdateDepartmentInput, CreateDepartmentInput, UpdateDepartmentInput, Department,
    },
};

/// Department mutations
pub struct DepartmentMutations;

#[async_graphql::Object]
impl DepartmentMutations {
    /// Create a new department
    async fn create_department(
        &self,
        ctx: &Context<'_>,
        input: CreateDepartmentInput,
    ) -> Result<Department> {
        let db = get_db_from_context(ctx)?;

        // Compute ancestor_ids based on parent
        let ancestor_ids = if let Some(parent_id) = input.parent_id {
            // Fetch parent to get its ancestor chain
            if let Some(parent) = crate::models::department::Entity::find_by_id(parent_id)
                .one(&db)
                .await?
            {
                // Build chain: [parent_id, ...parent's ancestors]
                let mut chain = vec![parent_id];
                chain.extend(parent.ancestor_ids);
                chain
            } else {
                // Parent not found - return error
                return Err(AppError::NotFound(format!("Parent department {} not found", parent_id)).into());
            }
        } else {
            // Root department - empty ancestor chain
            vec![]
        };

        let department = crate::models::department::ActiveModel {
            name: Set(input.name.clone()),
            description: Set(input.description.clone()),
            manager_id: Set(input.manager_id),
            parent_department_id: Set(input.parent_id),
            ancestor_ids: Set(ancestor_ids),
            ..Default::default()
        };

        let department = department.insert(&db).await?;
        Ok(department)
    }

    /// Update an existing department
    async fn update_department(
        &self,
        ctx: &Context<'_>,
        id: Uuid,
        input: UpdateDepartmentInput,
    ) -> Result<Department> {
        let db = get_db_from_context(ctx)?;

        // Find existing department
        let existing_dept = crate::models::department::Entity::find_by_id(id)
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("Department not found".to_string()))?;

        // Build active model with updates
        let mut dept: crate::models::department::ActiveModel = existing_dept.into();

        if let Some(name) = input.name {
            dept.name = Set(name);
        }

        if let Some(description) = input.description {
            dept.description = Set(Some(description));
        }

        if let Some(manager_id) = input.manager_id {
            dept.manager_id = Set(Some(manager_id));
        }

        // Update timestamp
        dept.updated_at = Set(Utc::now());

        // Save changes
        let updated_dept = dept.update(&db).await?;
        Ok(updated_dept)
    }

    /// Bulk update multiple departments atomically
    ///
    /// # Arguments
    /// * `inputs` - List of department updates with IDs
    ///
    /// # Returns
    /// List of updated departments
    ///
    /// # Behavior
    /// - All updates execute within a single database transaction
    /// - If ANY update fails, ALL changes roll back (atomic operation)
    /// - Supports updating: name, description, manager_id, parent_department_id
    ///
    /// # Errors
    /// - Returns error if any department ID is not found
    /// - Transaction rolls back on any error, no partial updates
    async fn bulk_update_departments(
        &self,
        ctx: &Context<'_>,
        inputs: Vec<BulkUpdateDepartmentInput>,
    ) -> Result<Vec<Department>> {
        let db = get_db_from_context(ctx)?;

        // Begin transaction
        let txn = db.begin().await?;

        let mut updated_departments = Vec::with_capacity(inputs.len());

        for input in inputs {
            // Find existing department
            let existing_dept = crate::models::department::Entity::find_by_id(input.id)
                .one(&txn)
                .await?
                .ok_or_else(|| AppError::NotFound(format!("Department {} not found", input.id)))?;

            // Build active model with updates
            let mut dept: crate::models::department::ActiveModel = existing_dept.into();

            if let Some(name) = input.name {
                dept.name = Set(name);
            }

            if let Some(description) = input.description {
                dept.description = Set(Some(description));
            }

            if let Some(manager_id) = input.manager_id {
                dept.manager_id = Set(Some(manager_id));
            }

            // Update parent_department_id and recompute ancestor_ids if parent changed
            if let Some(parent_department_id) = input.parent_department_id {
                dept.parent_department_id = Set(Some(parent_department_id));

                // Recompute ancestor_ids based on new parent
                let ancestor_ids = if let Some(parent) = crate::models::department::Entity::find_by_id(parent_department_id)
                    .one(&txn)
                    .await?
                {
                    // Build chain: [parent_id, ...parent's ancestors]
                    let mut chain = vec![parent_department_id];
                    chain.extend(parent.ancestor_ids);
                    chain
                } else {
                    // Parent not found - return error to rollback transaction
                    return Err(AppError::NotFound(format!("Parent department {} not found", parent_department_id)).into());
                };

                dept.ancestor_ids = Set(ancestor_ids);
            }

            // Update timestamp
            dept.updated_at = Set(Utc::now());

            // Save changes within transaction
            let updated_dept = dept.update(&txn).await?;
            updated_departments.push(updated_dept);
        }

        // Commit transaction - all updates succeed or all roll back
        txn.commit().await?;

        Ok(updated_departments)
    }

    /// Soft delete a department (sets deleted_at timestamp)
    async fn delete_department(&self, ctx: &Context<'_>, id: Uuid) -> Result<bool> {
        let db = get_db_from_context(ctx)?;

        // Find the department first to ensure it exists
        let dept = crate::models::department::Entity::find_by_id(id)
            .filter(crate::models::department::Column::DeletedAt.is_null())
            .one(&db)
            .await?;

        if dept.is_none() {
            return Ok(false);
        }

        // Soft delete by setting deleted_at
        let mut dept: crate::models::department::ActiveModel = dept.unwrap().into();
        dept.deleted_at = Set(Some(Utc::now()));

        dept.update(&db).await?;

        Ok(true)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::testing::TestContext;

    /// Test successful bulk update of multiple departments
    #[tokio::test]
    async fn test_bulk_update_departments_success() {
        // Arrange
        let ctx = TestContext::new()
            .await
            .expect("Failed to create test context");

        // Get existing departments to update
        let departments_query = r#"
            query {
                departments(limit: 3) {
                    id
                    name
                }
            }
        "#;

        let dept_response = ctx.execute_query(departments_query).await;
        let dept_data = ctx.extract_data(&dept_response);
        let dept_str = dept_data.to_string();

        // Extract department IDs (basic string parsing)
        let dept_ids: Vec<String> = dept_str
            .split("id: \"")
            .skip(1)
            .filter_map(|s| s.split('"').next())
            .take(3)
            .map(|s| s.to_string())
            .collect();

        // Need at least 2 departments for bulk update test
        if dept_ids.len() < 2 {
            println!("Skipping test: not enough departments in database");
            return;
        }

        // Build bulk update mutation
        let mutation = format!(
            r#"
            mutation {{
                bulkUpdateDepartments(inputs: [
                    {{ id: "{}", name: "Updated Dept 1" }},
                    {{ id: "{}", name: "Updated Dept 2", description: "Bulk updated" }}
                ]) {{
                    id
                    name
                    description
                }}
            }}
            "#,
            dept_ids[0], dept_ids[1]
        );

        // Act
        let response = ctx.execute_query(&mutation).await;

        // Assert - No errors
        let errors = ctx.extract_errors(&response);
        assert!(errors.is_empty(), "Expected no errors, got: {:?}", errors);

        // Assert - Returns updated departments
        let data = ctx.extract_data(&response);
        let data_str = data.to_string();
        
        assert!(data_str.contains("Updated Dept 1"), "Should contain updated name 1");
        assert!(data_str.contains("Updated Dept 2"), "Should contain updated name 2");
        assert!(data_str.contains("Bulk updated"), "Should contain updated description");
    }

    /// Test bulk update rolls back on error (atomic transaction)
    #[tokio::test]
    async fn test_bulk_update_departments_rollback() {
        // Arrange
        let ctx = TestContext::new()
            .await
            .expect("Failed to create test context");

        // Get one valid department
        let departments_query = r#"
            query {
                departments(limit: 1) {
                    id
                    name
                }
            }
        "#;

        let dept_response = ctx.execute_query(departments_query).await;
        let dept_data = ctx.extract_data(&dept_response);
        let dept_str = dept_data.to_string();

        let valid_dept_id = dept_str
            .split("id: \"")
            .nth(1)
            .and_then(|s| s.split('"').next())
            .expect("Should have at least one department");

        let original_name = dept_str
            .split("name: \"")
            .nth(1)
            .and_then(|s| s.split('"').next())
            .expect("Should have name");

        // Use one valid ID and one invalid ID - should cause rollback
        let invalid_id = uuid::Uuid::new_v4();
        
        let mutation = format!(
            r#"
            mutation {{
                bulkUpdateDepartments(inputs: [
                    {{ id: "{}", name: "This Should Rollback" }},
                    {{ id: "{}", name: "This Does Not Exist" }}
                ]) {{
                    id
                    name
                }}
            }}
            "#,
            valid_dept_id, invalid_id
        );

        // Act
        let response = ctx.execute_query(&mutation).await;

        // Assert - Should have errors
        let errors = ctx.extract_errors(&response);
        assert!(!errors.is_empty(), "Expected error for invalid department ID");

        let errors_str = errors.join(" ");
        assert!(errors_str.contains("not found"), "Error should mention department not found");

        // Verify the valid department was NOT updated (rollback worked)
        let check_query = format!(
            r#"
            query {{
                departments(limit: 10) {{
                    id
                    name
                }}
            }}
            "#
        );

        let check_response = ctx.execute_query(&check_query).await;
        let check_data = ctx.extract_data(&check_response);
        let check_str = check_data.to_string();

        // Original name should still be present
        assert!(check_str.contains(original_name), 
            "Department name should not have changed due to rollback");
        
        // Updated name should NOT be present
        assert!(!check_str.contains("This Should Rollback"), 
            "Failed update should have been rolled back");
    }

    /// Test bulk update with empty inputs
    #[tokio::test]
    async fn test_bulk_update_departments_empty() {
        // Arrange
        let ctx = TestContext::new()
            .await
            .expect("Failed to create test context");

        let mutation = r#"
            mutation {
                bulkUpdateDepartments(inputs: []) {
                    id
                    name
                }
            }
        "#;

        // Act
        let response = ctx.execute_query(mutation).await;

        // Assert - No errors, returns empty array
        let errors = ctx.extract_errors(&response);
        assert!(errors.is_empty(), "Expected no errors for empty inputs");

        let data = ctx.extract_data(&response);
        let data_str = data.to_string();
        
        assert!(data_str.contains("bulkUpdateDepartments"), 
            "Should contain field name");
    }
}
