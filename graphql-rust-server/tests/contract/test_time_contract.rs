//! Time Management Domain - Contract Tests (TDD RED Phase)
//!
//! Tests validate GraphQL schema structure for:
//! - TimeOffPolicy
//! - AttendanceRecord (with AttendanceStatus enum)
//!
//! Expected Result: ALL TESTS FAIL until models are implemented (Phase 3.3)

#[cfg(test)]
mod time_off_policy_contract {
    use async_graphql::{EmptyMutation, EmptySubscription, Schema};

    #[test]
    #[should_panic(expected = "Type 'TimeOffPolicy' should exist in schema")]
    fn test_time_off_policy_type_exists() {
        let schema = Schema::build(
            crate::contract::QueryRoot::default(),
            EmptyMutation,
            EmptySubscription,
        )
        .finish();

        crate::contract::assert_type_exists(&schema, "TimeOffPolicy");
    }

    #[test]
    #[should_panic(expected = "Field 'policyName' should exist on type 'TimeOffPolicy'")]
    fn test_time_off_policy_has_name_field() {
        let schema = Schema::build(
            crate::contract::QueryRoot::default(),
            EmptyMutation,
            EmptySubscription,
        )
        .finish();

        crate::contract::assert_field_exists(&schema, "TimeOffPolicy", "policyName", "String");
    }

    #[test]
    #[should_panic(expected = "Field 'accrualRate' should exist on type 'TimeOffPolicy'")]
    fn test_time_off_policy_has_accrual_rate_field() {
        let schema = Schema::build(
            crate::contract::QueryRoot::default(),
            EmptyMutation,
            EmptySubscription,
        )
        .finish();

        crate::contract::assert_field_exists(&schema, "TimeOffPolicy", "accrualRate", "Float");
    }
}

#[cfg(test)]
mod attendance_record_contract {
    use async_graphql::{EmptyMutation, EmptySubscription, Schema};

    #[test]
    #[should_panic(expected = "Type 'AttendanceRecord' should exist in schema")]
    fn test_attendance_record_type_exists() {
        let schema = Schema::build(
            crate::contract::QueryRoot::default(),
            EmptyMutation,
            EmptySubscription,
        )
        .finish();

        crate::contract::assert_type_exists(&schema, "AttendanceRecord");
    }

    #[test]
    #[should_panic(expected = "Type 'AttendanceStatus' should exist in schema")]
    fn test_attendance_status_enum_exists() {
        let schema = Schema::build(
            crate::contract::QueryRoot::default(),
            EmptyMutation,
            EmptySubscription,
        )
        .finish();

        crate::contract::assert_type_exists(&schema, "AttendanceStatus");
    }

    #[test]
    #[should_panic(expected = "Field 'clockIn' should exist on type 'AttendanceRecord'")]
    fn test_attendance_record_has_clock_in_field() {
        let schema = Schema::build(
            crate::contract::QueryRoot::default(),
            EmptyMutation,
            EmptySubscription,
        )
        .finish();

        crate::contract::assert_field_exists(&schema, "AttendanceRecord", "clockIn", "DateTime");
    }

    #[test]
    #[should_panic(expected = "Field 'totalHours' should exist on type 'AttendanceRecord'")]
    fn test_attendance_record_has_total_hours_field() {
        let schema = Schema::build(
            crate::contract::QueryRoot::default(),
            EmptyMutation,
            EmptySubscription,
        )
        .finish();

        crate::contract::assert_field_exists(&schema, "AttendanceRecord", "totalHours", "Float");
    }
}

#[cfg(test)]
mod query_resolver_contract {
    use async_graphql::{EmptyMutation, EmptySubscription, Schema};

    #[test]
    #[should_panic(expected = "Field 'timeOffPolicies' should exist on type 'Query'")]
    fn test_time_off_policies_query_exists() {
        let schema = Schema::build(
            crate::contract::QueryRoot::default(),
            EmptyMutation,
            EmptySubscription,
        )
        .finish();

        crate::contract::assert_field_exists(&schema, "Query", "timeOffPolicies", "[TimeOffPolicy!]");
    }

    #[test]
    #[should_panic(expected = "Field 'attendanceRecords' should exist on type 'Query'")]
    fn test_attendance_records_query_exists() {
        let schema = Schema::build(
            crate::contract::QueryRoot::default(),
            EmptyMutation,
            EmptySubscription,
        )
        .finish();

        crate::contract::assert_field_exists(
            &schema,
            "Query",
            "attendanceRecords",
            "[AttendanceRecord!]",
        );
    }
}
