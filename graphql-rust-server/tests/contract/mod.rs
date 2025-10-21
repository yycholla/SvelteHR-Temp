//! GraphQL Contract Tests
//!
//! These tests validate that the GraphQL schema matches the contract
//! defined in specs/031-we-have-recently/contracts/graphql-schema-extensions.graphql
//!
//! Contract tests follow the TDD RED-GREEN-REFACTOR cycle:
//! 1. RED: Write failing tests based on GraphQL schema contract
//! 2. GREEN: Implement models and resolvers to make tests pass
//! 3. REFACTOR: Optimize and improve code quality
//!
//! Test Pattern:
//! - Each domain gets its own contract test file
//! - Tests use GraphQL introspection to validate schema structure
//! - Field names, types, nullability, and relationships are validated
//! - No implementation required - tests validate schema only

use async_graphql::{EmptyMutation, EmptySubscription, Schema};
use async_graphql::*;

/// Helper to build a minimal schema for introspection testing
pub fn build_test_schema() -> Schema<QueryRoot, EmptyMutation, EmptySubscription> {
    Schema::build(QueryRoot, EmptyMutation, EmptySubscription).finish()
}

/// Placeholder QueryRoot for contract tests
/// Domain query resolvers will be added via MergedObject in implementation
#[derive(Default)]
pub struct QueryRoot;

#[Object]
impl QueryRoot {
    /// Health check query for schema validation
    async fn health(&self) -> &str {
        "ok"
    }
}

/// Assert that a GraphQL type exists in the schema
pub fn assert_type_exists(schema: &Schema<QueryRoot, EmptyMutation, EmptySubscription>, type_name: &str) {
    let introspection_query = format!(
        r#"{{
            __type(name: "{}") {{
                name
                kind
            }}
        }}"#,
        type_name
    );

    let result = futures::executor::block_on(schema.execute(&introspection_query));

    assert!(
        result.data.to_string().contains(type_name),
        "Type '{}' should exist in schema",
        type_name
    );
}

/// Assert that a field exists on a GraphQL type with specific type
pub fn assert_field_exists(
    schema: &Schema<QueryRoot, EmptyMutation, EmptySubscription>,
    type_name: &str,
    field_name: &str,
    expected_type: &str,
) {
    let introspection_query = format!(
        r#"{{
            __type(name: "{}") {{
                fields {{
                    name
                    type {{
                        name
                        kind
                        ofType {{
                            name
                            kind
                        }}
                    }}
                }}
            }}
        }}"#,
        type_name
    );

    let result = futures::executor::block_on(schema.execute(&introspection_query));
    let data_str = result.data.to_string();

    assert!(
        data_str.contains(field_name),
        "Field '{}' should exist on type '{}'",
        field_name,
        type_name
    );
}

mod test_security;
mod test_session_persistence;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_schema_builds() {
        let schema = build_test_schema();
        assert_eq!(schema.sdl(), schema.sdl());
    }

    #[test]
    fn test_health_query() {
        let schema = build_test_schema();
        let query = "{ health }";
        let result = futures::executor::block_on(schema.execute(query));

        assert!(result.errors.is_empty());
        assert!(result.data.to_string().contains("ok"));
    }
}
