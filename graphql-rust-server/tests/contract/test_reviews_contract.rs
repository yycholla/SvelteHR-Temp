//! Performance Review Extensions Domain - Contract Tests (TDD RED Phase)
//!
//! Tests validate GraphQL schema structure for:
//! - ReviewTemplate
//!
//! Expected Result: ALL TESTS FAIL until models are implemented (Phase 3.3)

#[cfg(test)]
mod review_template_contract {
    use async_graphql::{EmptyMutation, EmptySubscription, Schema};

    #[test]
    #[should_panic(expected = "Type 'ReviewTemplate' should exist in schema")]
    fn test_review_template_type_exists() {
        let schema = Schema::build(
            crate::contract::QueryRoot::default(),
            EmptyMutation,
            EmptySubscription,
        )
        .finish();

        crate::contract::assert_type_exists(&schema, "ReviewTemplate");
    }

    #[test]
    #[should_panic(expected = "Field 'name' should exist on type 'ReviewTemplate'")]
    fn test_review_template_has_name_field() {
        let schema = Schema::build(
            crate::contract::QueryRoot::default(),
            EmptyMutation,
            EmptySubscription,
        )
        .finish();

        crate::contract::assert_field_exists(&schema, "ReviewTemplate", "name", "String");
    }

    #[test]
    #[should_panic(expected = "Field 'description' should exist on type 'ReviewTemplate'")]
    fn test_review_template_has_description_field() {
        let schema = Schema::build(
            crate::contract::QueryRoot::default(),
            EmptyMutation,
            EmptySubscription,
        )
        .finish();

        crate::contract::assert_field_exists(&schema, "ReviewTemplate", "description", "String");
    }

    #[test]
    #[should_panic(expected = "Field 'templateData' should exist on type 'ReviewTemplate'")]
    fn test_review_template_has_template_data_field() {
        let schema = Schema::build(
            crate::contract::QueryRoot::default(),
            EmptyMutation,
            EmptySubscription,
        )
        .finish();

        crate::contract::assert_field_exists(&schema, "ReviewTemplate", "templateData", "JSON");
    }
}

#[cfg(test)]
mod query_resolver_contract {
    use async_graphql::{EmptyMutation, EmptySubscription, Schema};

    #[test]
    #[should_panic(expected = "Field 'reviewTemplates' should exist on type 'Query'")]
    fn test_review_templates_query_exists() {
        let schema = Schema::build(
            crate::contract::QueryRoot::default(),
            EmptyMutation,
            EmptySubscription,
        )
        .finish();

        crate::contract::assert_field_exists(&schema, "Query", "reviewTemplates", "[ReviewTemplate!]");
    }

    #[test]
    #[should_panic(expected = "Field 'reviewTemplate' should exist on type 'Query'")]
    fn test_review_template_single_query_exists() {
        let schema = Schema::build(
            crate::contract::QueryRoot::default(),
            EmptyMutation,
            EmptySubscription,
        )
        .finish();

        crate::contract::assert_field_exists(&schema, "Query", "reviewTemplate", "ReviewTemplate");
    }
}
