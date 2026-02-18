//! Test Context Module
//!
//! Provides complete test environment setup combining TestDatabase,
//! authenticated test users, GraphQL schema, and execution helpers.

use async_graphql::{EmptySubscription, Request, Response, Schema};
use sea_orm::{Database, DatabaseConnection};

use crate::schema::{MutationRoot, QueryRoot};
use crate::auth::UserContext;
use super::auth::{TestUser, TestUserRole, TestUsers};
use super::database::TestDatabase;
use super::errors::TestContextError;

/// GraphQL schema type used for testing
pub type TestSchema = Schema<QueryRoot, MutationRoot, EmptySubscription>;

/// Complete test context with database, schema, and authenticated users
pub struct TestContext {
    /// Isolated test database
    db: TestDatabase,

    /// GraphQL schema instance
    schema: TestSchema,

    /// Pre-created test users for different roles
    users: TestUsers,
}

impl TestContext {
    /// Create a new test context with all components initialized
    ///
    /// # Returns
    /// Result containing fully initialized test context
    ///
    /// # Behavior
    /// 1. Creates isolated PostgreSQL database
    /// 2. Runs all migrations
    /// 3. Creates test users for all roles
    /// 4. Builds GraphQL schema
    pub async fn new() -> Result<Self, TestContextError> {
        // Create isolated database
        let db = TestDatabase::new()
            .await
            .map_err(|e| TestContextError::DatabaseError(e))?;

        // Create test users
        let users = TestUsers::create_all(db.connection()).await?;

        // Build GraphQL schema with a dedicated database connection.
        // DatabaseConnection doesn't implement Clone, so we create a second connection
        // to the same test database URL for use by the schema data context.
        let schema_db = Database::connect(&db.url)
            .await
            .map_err(|e| TestContextError::SessionError(format!("Schema DB connection failed: {}", e)))?;

        let schema = Schema::build(QueryRoot, MutationRoot, EmptySubscription)
            .data(schema_db)
            .finish();

        Ok(Self { db, schema, users })
    }

    /// Get reference to the test database
    pub fn db(&self) -> &TestDatabase {
        &self.db
    }

    /// Get reference to database connection
    pub fn connection(&self) -> &DatabaseConnection {
        self.db.connection()
    }

    /// Get reference to GraphQL schema
    pub fn schema(&self) -> &TestSchema {
        &self.schema
    }

    /// Get reference to test users
    pub fn users(&self) -> &TestUsers {
        &self.users
    }

    /// Get a specific test user by role
    pub fn user(&self, role: TestUserRole) -> &TestUser {
        match role {
            TestUserRole::Employee => &self.users.employee,
            TestUserRole::Manager => &self.users.manager,
            TestUserRole::HrManager => &self.users.hr_manager,
            TestUserRole::Admin => &self.users.admin,
            TestUserRole::SystemAdmin => &self.users.system_admin,
        }
    }

    /// Execute a GraphQL query without authentication
    ///
    /// # Arguments
    /// * `query` - GraphQL query string
    ///
    /// # Returns
    /// GraphQL response
    pub async fn execute_query(&self, query: &str) -> Response {
        self.schema.execute(query).await
    }

    /// Execute a GraphQL query with authentication
    ///
    /// # Arguments
    /// * `query` - GraphQL query string
    /// * `user` - Authenticated test user
    ///
    /// # Returns
    /// GraphQL response with user context
    pub async fn execute_query_as(&self, query: &str, user: &TestUser) -> Response {
        let user_context = UserContext::new(
            user.id,
            vec![user.role.clone()],
            vec![], // Permissions can be added if needed
        );

        let request = Request::new(query).data(user_context);

        self.schema.execute(request).await
    }

    /// Execute a GraphQL query with variables without authentication
    ///
    /// # Arguments
    /// * `query` - GraphQL query string
    /// * `variables` - GraphQL variables (use serde_json::json! macro)
    ///
    /// # Returns
    /// GraphQL response
    pub async fn execute_with_variables(
        &self,
        query: &str,
        variables: async_graphql::Variables,
    ) -> Response {
        let request = Request::new(query).variables(variables);
        self.schema.execute(request).await
    }

    /// Execute a GraphQL query with variables and authentication
    ///
    /// # Arguments
    /// * `query` - GraphQL query string
    /// * `variables` - GraphQL variables (use serde_json::json! macro)
    /// * `user` - Authenticated test user
    ///
    /// # Returns
    /// GraphQL response with user context
    pub async fn execute_with_variables_as(
        &self,
        query: &str,
        variables: async_graphql::Variables,
        user: &TestUser,
    ) -> Response {
        let user_context = UserContext::new(
            user.id,
            vec![user.role.clone()],
            vec![],
        );

        let request = Request::new(query)
            .variables(variables)
            .data(user_context);

        self.schema.execute(request).await
    }

    /// Helper method to extract data from GraphQL response as serde_json::Value
    ///
    /// Returns serde_json::Value which supports `[]` indexing syntax in tests.
    pub fn extract_data(&self, response: &Response) -> serde_json::Value {
        serde_json::to_value(&response.data).unwrap_or(serde_json::Value::Null)
    }

    /// Helper method to extract errors from GraphQL response
    ///
    /// # Returns
    /// Vector of error messages
    pub fn extract_errors(&self, response: &Response) -> Vec<String> {
        response
            .errors
            .iter()
            .map(|e| e.message.clone())
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_context_creation() {
        let ctx = TestContext::new()
            .await
            .expect("Failed to create test context");

        // Verify database is accessible
        assert!(ctx.connection().ping().await.is_ok());

        // Verify test users exist
        assert_eq!(ctx.users().employee.role, "Employee");
        assert_eq!(ctx.users().hr_manager.role, "HR Manager");
        assert_eq!(ctx.users().admin.role, "Admin");
        assert_eq!(ctx.users().system_admin.role, "Admin"); // SystemAdmin uses Admin role
    }

    #[tokio::test]
    async fn test_user_accessor() {
        let ctx = TestContext::new()
            .await
            .expect("Failed to create test context");

        let employee = ctx.user(TestUserRole::Employee);
        assert_eq!(employee.role, "Employee");

        let admin = ctx.user(TestUserRole::Admin);
        assert_eq!(admin.role, "Admin");
    }

    #[tokio::test]
    async fn test_execute_query() {
        let ctx = TestContext::new()
            .await
            .expect("Failed to create test context");

        // Simple introspection query
        let query = r#"
            {
                __schema {
                    queryType {
                        name
                    }
                }
            }
        "#;

        let response = ctx.execute_query(query).await;

        // Should have no errors
        assert!(ctx.extract_errors(&response).is_empty());

        // Check that we got schema data back
        let data = ctx.extract_data(&response);
        assert!(data.is_object());
    }
}
