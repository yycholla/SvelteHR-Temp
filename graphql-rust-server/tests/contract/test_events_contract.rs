//! Event Management Extensions Domain - Contract Tests (TDD RED Phase)
//!
//! Tests validate GraphQL schema structure for:
//! - EventComment
//! - EventHistory
//! - EventWaitlist
//!
//! Expected Result: ALL TESTS FAIL until models are implemented (Phase 3.3)

#[cfg(test)]
mod event_comment_contract {
    use async_graphql::{EmptyMutation, EmptySubscription, Schema};

    #[test]
    #[should_panic(expected = "Type 'EventComment' should exist in schema")]
    fn test_event_comment_type_exists() {
        let schema = Schema::build(
            crate::contract::QueryRoot::default(),
            EmptyMutation,
            EmptySubscription,
        )
        .finish();

        crate::contract::assert_type_exists(&schema, "EventComment");
    }

    #[test]
    #[should_panic(expected = "Field 'commentText' should exist on type 'EventComment'")]
    fn test_event_comment_has_comment_text_field() {
        let schema = Schema::build(
            crate::contract::QueryRoot::default(),
            EmptyMutation,
            EmptySubscription,
        )
        .finish();

        crate::contract::assert_field_exists(&schema, "EventComment", "commentText", "String");
    }

    #[test]
    #[should_panic(expected = "Field 'parentCommentId' should exist on type 'EventComment'")]
    fn test_event_comment_has_parent_comment_id_field() {
        let schema = Schema::build(
            crate::contract::QueryRoot::default(),
            EmptyMutation,
            EmptySubscription,
        )
        .finish();

        crate::contract::assert_field_exists(&schema, "EventComment", "parentCommentId", "UUID");
    }
}

#[cfg(test)]
mod event_history_contract {
    use async_graphql::{EmptyMutation, EmptySubscription, Schema};

    #[test]
    #[should_panic(expected = "Type 'EventHistory' should exist in schema")]
    fn test_event_history_type_exists() {
        let schema = Schema::build(
            crate::contract::QueryRoot::default(),
            EmptyMutation,
            EmptySubscription,
        )
        .finish();

        crate::contract::assert_type_exists(&schema, "EventHistory");
    }

    #[test]
    #[should_panic(expected = "Field 'changeType' should exist on type 'EventHistory'")]
    fn test_event_history_has_change_type_field() {
        let schema = Schema::build(
            crate::contract::QueryRoot::default(),
            EmptyMutation,
            EmptySubscription,
        )
        .finish();

        crate::contract::assert_field_exists(&schema, "EventHistory", "changeType", "String");
    }

    #[test]
    #[should_panic(expected = "Field 'oldValue' should exist on type 'EventHistory'")]
    fn test_event_history_has_old_value_field() {
        let schema = Schema::build(
            crate::contract::QueryRoot::default(),
            EmptyMutation,
            EmptySubscription,
        )
        .finish();

        crate::contract::assert_field_exists(&schema, "EventHistory", "oldValue", "JSON");
    }
}

#[cfg(test)]
mod event_waitlist_contract {
    use async_graphql::{EmptyMutation, EmptySubscription, Schema};

    #[test]
    #[should_panic(expected = "Type 'EventWaitlist' should exist in schema")]
    fn test_event_waitlist_type_exists() {
        let schema = Schema::build(
            crate::contract::QueryRoot::default(),
            EmptyMutation,
            EmptySubscription,
        )
        .finish();

        crate::contract::assert_type_exists(&schema, "EventWaitlist");
    }

    #[test]
    #[should_panic(expected = "Field 'position' should exist on type 'EventWaitlist'")]
    fn test_event_waitlist_has_position_field() {
        let schema = Schema::build(
            crate::contract::QueryRoot::default(),
            EmptyMutation,
            EmptySubscription,
        )
        .finish();

        crate::contract::assert_field_exists(&schema, "EventWaitlist", "position", "Int");
    }

    #[test]
    #[should_panic(expected = "Field 'promoted' should exist on type 'EventWaitlist'")]
    fn test_event_waitlist_has_promoted_field() {
        let schema = Schema::build(
            crate::contract::QueryRoot::default(),
            EmptyMutation,
            EmptySubscription,
        )
        .finish();

        crate::contract::assert_field_exists(&schema, "EventWaitlist", "promoted", "Boolean");
    }
}

#[cfg(test)]
mod query_resolver_contract {
    use async_graphql::{EmptyMutation, EmptySubscription, Schema};

    #[test]
    #[should_panic(expected = "Field 'eventComments' should exist on type 'Query'")]
    fn test_event_comments_query_exists() {
        let schema = Schema::build(
            crate::contract::QueryRoot::default(),
            EmptyMutation,
            EmptySubscription,
        )
        .finish();

        crate::contract::assert_field_exists(&schema, "Query", "eventComments", "[EventComment!]");
    }
}
