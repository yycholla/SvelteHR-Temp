# Contract: TestContext

**Module**: `src/testing/context.rs`
**Type**: Struct
**Purpose**: Complete test environment with database, GraphQL schema, and authentication

## Public API

### Constructor

```rust
impl TestContext {
    /// Creates a new test context with all components initialized
    ///
    /// # Behavior
    /// 1. Creates TestDatabase (isolated PostgreSQL)
    /// 2. Generates authentication tokens for all roles
    /// 3. Initializes GraphQL schema
    /// 4. Creates HTTP client for requests
    ///
    /// # Returns
    /// - Ok(TestContext) with fully initialized environment
    /// - Err(TestContextError) if any component fails
    ///
    /// # Performance
    /// - Expected time: 2-4 seconds
    /// - Blocking: Yes (database setup is slowest part)
    ///
    /// # Example
    /// ```rust
    /// let ctx = TestContext::new().await?;
    /// let result = ctx.execute_query(QUERY, variables).await?;
    /// ```
    ///
    /// # Contract
    /// - MUST provide isolated database
    /// - MUST generate valid JWT tokens for all roles
    /// - MUST initialize functional GraphQL schema
    /// - MUST be ready for immediate use after construction
    pub async fn new() -> Result<Self, TestContextError>;
}
```

**Contract**:
- MUST create fully functional test environment
- MUST handle component initialization failures gracefully
- MUST provide clear error messages on failure
- MUST clean up all resources on drop

### GraphQL Operations

```rust
impl TestContext {
    /// Executes a GraphQL query with authentication
    ///
    /// # Arguments
    /// - `query`: GraphQL query string
    /// - `variables`: Query variables (JSON)
    /// - `role`: Optional user role for authentication (None = unauthenticated)
    ///
    /// # Returns
    /// - Ok(Response<T>) with query result
    /// - Err(GraphQLError) if query fails
    ///
    /// # Example
    /// ```rust
    /// let query = r#"
    ///     query GetEmployee($id: ID!) {
    ///         employee(id: $id) {
    ///             id
    ///             fullName
    ///             email
    ///         }
    ///     }
    /// "#;
    ///
    /// let variables = serde_json::json!({
    ///     "id": "123"
    /// });
    ///
    /// let result = ctx.execute_query::<Employee>(
    ///     query,
    ///     variables,
    ///     Some(UserRole::Admin)
    /// ).await?;
    /// ```
    ///
    /// # Contract
    /// - MUST execute query against isolated database
    /// - MUST include authentication token if role provided
    /// - MUST return deserialized response or detailed error
    /// - MUST validate GraphQL syntax before execution
    pub async fn execute_query<T>(
        &self,
        query: &str,
        variables: serde_json::Value,
        role: Option<UserRole>
    ) -> Result<Response<T>, GraphQLError>
    where
        T: serde::de::DeserializeOwned;

    /// Executes a GraphQL mutation with authentication
    ///
    /// # Arguments
    /// - `mutation`: GraphQL mutation string
    /// - `variables`: Mutation variables (JSON)
    /// - `role`: Optional user role for authentication
    ///
    /// # Returns
    /// - Ok(Response<T>) with mutation result
    /// - Err(GraphQLError) if mutation fails
    ///
    /// # Example
    /// ```rust
    /// let mutation = r#"
    ///     mutation CreateEmployee($input: CreateEmployeeInput!) {
    ///         createEmployee(input: $input) {
    ///             id
    ///             fullName
    ///         }
    ///     }
    /// "#;
    ///
    /// let variables = serde_json::json!({
    ///     "input": {
    ///         "fullName": "John Doe",
    ///         "email": "john@test.com"
    ///     }
    /// });
    ///
    /// let result = ctx.execute_mutation::<Employee>(
    ///     mutation,
    ///     variables,
    ///     Some(UserRole::HRManager)
    /// ).await?;
    /// ```
    ///
    /// # Contract
    /// - MUST execute mutation in isolated database transaction
    /// - MUST rollback on validation errors
    /// - MUST respect RBAC permissions
    /// - MUST return complete mutation result or error
    pub async fn execute_mutation<T>(
        &self,
        mutation: &str,
        variables: serde_json::Value,
        role: Option<UserRole>
    ) -> Result<Response<T>, GraphQLError>
    where
        T: serde::de::DeserializeOwned;

    /// Executes a raw GraphQL operation (query or mutation)
    ///
    /// # Arguments
    /// - `operation`: GraphQL operation string
    /// - `variables`: Variables (JSON)
    /// - `auth_token`: Optional JWT token string
    ///
    /// # Returns
    /// - Ok(serde_json::Value) with raw response
    /// - Err(GraphQLError) if operation fails
    ///
    /// # Use Case
    /// - Testing error handling
    /// - Custom authentication scenarios
    /// - Raw response inspection
    ///
    /// # Contract
    /// - MUST accept any valid GraphQL syntax
    /// - MUST include auth_token in request headers if provided
    /// - MUST return raw JSON response (including errors)
    pub async fn execute_raw(
        &self,
        operation: &str,
        variables: serde_json::Value,
        auth_token: Option<&str>
    ) -> Result<serde_json::Value, GraphQLError>;
}
```

### Test Data Helpers

```rust
impl TestContext {
    /// Creates a test user with the specified role
    ///
    /// # Arguments
    /// - `role`: User role to assign
    ///
    /// # Returns
    /// - Ok(User) with user inserted into database
    /// - Err(Error) if creation fails
    ///
    /// # Example
    /// ```rust
    /// let admin = ctx.create_test_user(UserRole::Admin).await?;
    /// assert_eq!(admin.role, UserRole::Admin);
    /// ```
    ///
    /// # Contract
    /// - MUST insert user into test database
    /// - MUST assign correct role
    /// - MUST generate valid credentials
    /// - MUST be immediately usable for authentication
    pub async fn create_test_user(&self, role: UserRole)
        -> Result<User, Error>;

    /// Creates a test employee linked to a user
    ///
    /// # Arguments
    /// - `user_id`: Optional user to link to
    /// - `department_id`: Optional department assignment
    ///
    /// # Returns
    /// - Ok(Employee) with employee inserted into database
    /// - Err(Error) if creation fails
    ///
    /// # Contract
    /// - MUST insert employee into test database
    /// - MUST respect foreign key constraints
    /// - MUST generate realistic test data
    pub async fn create_test_employee(
        &self,
        user_id: Option<Uuid>,
        department_id: Option<Uuid>
    ) -> Result<Employee, Error>;

    /// Creates a test department
    ///
    /// # Returns
    /// - Ok(Department) with department inserted into database
    /// - Err(Error) if creation fails
    ///
    /// # Contract
    /// - MUST insert department into test database
    /// - MUST generate unique department name
    pub async fn create_test_department(&self)
        -> Result<Department, Error>;
}
```

### Access to Components

```rust
impl TestContext {
    /// Gets a reference to the test database
    ///
    /// # Returns
    /// - Reference to TestDatabase
    ///
    /// # Usage
    /// ```rust
    /// let conn = ctx.database().connection();
    /// let user = User::find_by_id(1).one(conn).await?;
    /// ```
    ///
    /// # Contract
    /// - MUST return reference to isolated database
    /// - MUST be valid for lifetime of TestContext
    pub fn database(&self) -> &TestDatabase;

    /// Gets a JWT token for the specified role
    ///
    /// # Arguments
    /// - `role`: User role to get token for
    ///
    /// # Returns
    /// - JWT token string
    ///
    /// # Contract
    /// - MUST return valid, non-expired token
    /// - MUST contain correct role claims
    /// - MUST be accepted by authentication middleware
    pub fn token_for_role(&self, role: UserRole) -> &str;

    /// Gets a reference to the GraphQL schema
    ///
    /// # Returns
    /// - Reference to async-graphql Schema
    ///
    /// # Contract
    /// - MUST return functional schema
    /// - MUST include all resolvers and mutations
    pub fn schema(&self) -> &Schema<Query, Mutation, Subscription>;

    /// Gets a reference to the HTTP client
    ///
    /// # Returns
    /// - Reference to reqwest Client
    ///
    /// # Usage
    /// ```rust
    /// let response = ctx.client()
    ///     .post("http://localhost:8080/graphql")
    ///     .json(&request_body)
    ///     .send()
    ///     .await?;
    /// ```
    ///
    /// # Contract
    /// - MUST return configured HTTP client
    /// - MUST support JSON requests/responses
    pub fn client(&self) -> &reqwest::Client;
}
```

## Error Handling

```rust
#[derive(Debug, thiserror::Error)]
pub enum TestContextError {
    #[error("Failed to create test database: {0}")]
    DatabaseError(#[from] TestDatabaseError),

    #[error("Failed to generate authentication tokens: {0}")]
    AuthError(#[from] JwtError),

    #[error("Failed to initialize GraphQL schema: {0}")]
    SchemaError(String),

    #[error("HTTP client creation failed: {0}")]
    ClientError(String),
}

#[derive(Debug, thiserror::Error)]
pub enum GraphQLError {
    #[error("GraphQL syntax error: {0}")]
    SyntaxError(String),

    #[error("GraphQL execution error: {0}")]
    ExecutionError(String),

    #[error("HTTP request failed: {0}")]
    RequestError(#[from] reqwest::Error),

    #[error("Response deserialization failed: {0}")]
    DeserializationError(#[from] serde_json::Error),

    #[error("Authentication failed: {0}")]
    AuthenticationError(String),

    #[error("Authorization failed: {0}")]
    AuthorizationError(String),
}
```

## Invariants

1. **Isolation**: Each TestContext has its own database (via TestDatabase)
2. **Validity**: All components (DB, schema, tokens) MUST be functional after construction
3. **Cleanup**: All resources MUST be cleaned up on drop
4. **Thread Safety**: TestContext is NOT Send/Sync (single-test ownership)
5. **Authentication**: Tokens MUST be valid and role-appropriate

## Performance Guarantees

- **Creation Time**: 2-4 seconds (database setup dominates)
- **Query Execution**: <100ms for simple queries
- **Mutation Execution**: <200ms for simple mutations
- **Memory Usage**: ~100MB (database + schema + connections)

## Testing Contract

### Unit Tests

```rust
#[cfg(test)]
mod tests {
    #[tokio::test]
    async fn test_context_creation_succeeds() {
        let ctx = TestContext::new().await.unwrap();
        assert!(ctx.token_for_role(UserRole::Admin).len() > 0);
    }

    #[tokio::test]
    async fn test_execute_query_with_auth() {
        let ctx = TestContext::new().await.unwrap();

        let query = r#"{ currentUser { id } }"#;
        let result = ctx.execute_query::<User>(
            query,
            serde_json::json!({}),
            Some(UserRole::Admin)
        ).await;

        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_execute_mutation_respects_rbac() {
        let ctx = TestContext::new().await.unwrap();

        let mutation = r#"
            mutation { deleteEmployee(id: "123") { success } }
        "#;

        // Employee role should NOT be able to delete
        let result = ctx.execute_mutation::<DeleteResult>(
            mutation,
            serde_json::json!({}),
            Some(UserRole::Employee)
        ).await;

        assert!(matches!(result, Err(GraphQLError::AuthorizationError(_))));
    }

    #[tokio::test]
    async fn test_create_test_user() {
        let ctx = TestContext::new().await.unwrap();
        let user = ctx.create_test_user(UserRole::HRManager).await.unwrap();

        assert_eq!(user.role, UserRole::HRManager);
        assert!(user.id.is_some());
    }
}
```

## Usage Examples

### Basic Query Test

```rust
#[tokio::test]
async fn test_get_employee_by_id() {
    let ctx = TestContext::new().await.unwrap();

    // Create test employee
    let employee = ctx.create_test_employee(None, None).await.unwrap();

    // Query it
    let query = r#"
        query GetEmployee($id: ID!) {
            employee(id: $id) {
                id
                fullName
            }
        }
    "#;

    let result = ctx.execute_query::<Employee>(
        query,
        serde_json::json!({ "id": employee.id }),
        Some(UserRole::Admin)
    ).await.unwrap();

    assert_eq!(result.data.id, employee.id);
}
```

### RBAC Testing

```rust
#[tokio::test]
async fn test_rbac_permissions() {
    let ctx = TestContext::new().await.unwrap();

    let sensitive_query = r#"
        query { allSalaries { employeeId amount } }
    "#;

    // Admin can access salaries
    let admin_result = ctx.execute_query::<Vec<Salary>>(
        sensitive_query,
        serde_json::json!({}),
        Some(UserRole::Admin)
    ).await;
    assert!(admin_result.is_ok());

    // Regular employee cannot
    let employee_result = ctx.execute_query::<Vec<Salary>>(
        sensitive_query,
        serde_json::json!({}),
        Some(UserRole::Employee)
    ).await;
    assert!(matches!(employee_result, Err(GraphQLError::AuthorizationError(_))));
}
```

### Error Handling Test

```rust
#[tokio::test]
async fn test_validation_errors() {
    let ctx = TestContext::new().await.unwrap();

    let mutation = r#"
        mutation CreateEmployee($input: CreateEmployeeInput!) {
            createEmployee(input: $input) { id }
        }
    "#;

    // Invalid email should fail validation
    let result = ctx.execute_mutation::<Employee>(
        mutation,
        serde_json::json!({
            "input": {
                "fullName": "John Doe",
                "email": "invalid-email"  // Invalid format
            }
        }),
        Some(UserRole::HRManager)
    ).await;

    match result {
        Err(GraphQLError::ExecutionError(msg)) => {
            assert!(msg.contains("email"));
        }
        _ => panic!("Expected validation error"),
    }
}
```

## Compatibility

- **Rust Version**: 1.70+ (async/await)
- **async-graphql**: 7.0+
- **reqwest**: 0.11+
- **tokio**: 1.35+

## Future Enhancements

1. **WebSocket Support**: Add subscription testing via WebSocket
2. **Batch Operations**: Support multiple queries in single request
3. **Performance Profiling**: Built-in query timing and metrics
4. **Snapshot Testing**: Automatic response snapshots with `insta`
5. **Mock External APIs**: Integrated mockito for external service mocking
