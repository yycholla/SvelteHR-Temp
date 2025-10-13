//! Task Management Extensions Domain - Contract Tests (TDD RED Phase)
//!
//! Tests validate GraphQL schema structure for:
//! - TaskType
//!
//! Expected Result: ALL TESTS FAIL until models are implemented (Phase 3.3)

#[cfg(test)]
mod task_type_contract {
    use async_graphql::{EmptyMutation, EmptySubscription, Schema};

    #[test]
    #[should_panic(expected = "Type 'TaskType' should exist in schema")]
    fn test_task_type_type_exists() {
        let schema = Schema::build(
            crate::contract::QueryRoot::default(),
            EmptyMutation,
            EmptySubscription,
        )
        .finish();

        crate::contract::assert_type_exists(&schema, "TaskType");
    }

    #[test]
    #[should_panic(expected = "Field 'name' should exist on type 'TaskType'")]
    fn test_task_type_has_name_field() {
        let schema = Schema::build(
            crate::contract::QueryRoot::default(),
            EmptyMutation,
            EmptySubscription,
        )
        .finish();

        crate::contract::assert_field_exists(&schema, "TaskType", "name", "String");
    }

    #[test]
    #[should_panic(expected = "Field 'description' should exist on type 'TaskType'")]
    fn test_task_type_has_description_field() {
        let schema = Schema::build(
            crate::contract::QueryRoot::default(),
            EmptyMutation,
            EmptySubscription,
        )
        .finish();

        crate::contract::assert_field_exists(&schema, "TaskType", "description", "String");
    }

    #[test]
    #[should_panic(expected = "Field 'color' should exist on type 'TaskType'")]
    fn test_task_type_has_color_field() {
        let schema = Schema::build(
            crate::contract::QueryRoot::default(),
            EmptyMutation,
            EmptySubscription,
        )
        .finish();

        crate::contract::assert_field_exists(&schema, "TaskType", "color", "String");
    }
}

#[cfg(test)]
mod query_resolver_contract {
    use async_graphql::{EmptyMutation, EmptySubscription, Schema};

    #[test]
    #[should_panic(expected = "Field 'taskTypes' should exist on type 'Query'")]
    fn test_task_types_query_exists() {
        let schema = Schema::build(
            crate::contract::QueryRoot::default(),
            EmptyMutation,
            EmptySubscription,
        )
        .finish();

        crate::contract::assert_field_exists(&schema, "Query", "taskTypes", "[TaskType!]");
    }

    #[test]
    #[should_panic(expected = "Field 'taskType' should exist on type 'Query'")]
    fn test_task_type_single_query_exists() {
        let schema = Schema::build(
            crate::contract::QueryRoot::default(),
            EmptyMutation,
            EmptySubscription,
        )
        .finish();

        crate::contract::assert_field_exists(&schema, "Query", "taskType", "TaskType");
    }
}
