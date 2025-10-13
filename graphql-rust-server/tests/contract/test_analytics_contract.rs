//! Analytics Domain - Contract Tests (TDD RED Phase)
//!
//! Tests validate GraphQL schema structure for:
//! - DashboardSummary (materialized view - read-only)
//! - DepartmentMetric (materialized view - read-only)
//! - GoalStatistic (materialized view - read-only)
//! - ReportAnalytic (materialized view - read-only)
//!
//! Note: These are materialized views - NO mutations, only queries
//! Expected Result: ALL TESTS FAIL until models are implemented (Phase 3.3)

#[cfg(test)]
mod dashboard_summary_contract {
    use async_graphql::{EmptyMutation, EmptySubscription, Schema};

    #[test]
    #[should_panic(expected = "Type 'DashboardSummary' should exist in schema")]
    fn test_dashboard_summary_type_exists() {
        let schema = Schema::build(
            crate::contract::QueryRoot::default(),
            EmptyMutation,
            EmptySubscription,
        )
        .finish();

        crate::contract::assert_type_exists(&schema, "DashboardSummary");
    }

    #[test]
    #[should_panic(expected = "Field 'totalActiveEmployees' should exist on type 'DashboardSummary'")]
    fn test_dashboard_summary_has_total_active_employees_field() {
        let schema = Schema::build(
            crate::contract::QueryRoot::default(),
            EmptyMutation,
            EmptySubscription,
        )
        .finish();

        crate::contract::assert_field_exists(
            &schema,
            "DashboardSummary",
            "totalActiveEmployees",
            "Int",
        );
    }

    #[test]
    #[should_panic(expected = "Field 'lastRefreshedAt' should exist on type 'DashboardSummary'")]
    fn test_dashboard_summary_has_last_refreshed_at_field() {
        let schema = Schema::build(
            crate::contract::QueryRoot::default(),
            EmptyMutation,
            EmptySubscription,
        )
        .finish();

        crate::contract::assert_field_exists(&schema, "DashboardSummary", "lastRefreshedAt", "DateTime");
    }
}

#[cfg(test)]
mod department_metric_contract {
    use async_graphql::{EmptyMutation, EmptySubscription, Schema};

    #[test]
    #[should_panic(expected = "Type 'DepartmentMetric' should exist in schema")]
    fn test_department_metric_type_exists() {
        let schema = Schema::build(
            crate::contract::QueryRoot::default(),
            EmptyMutation,
            EmptySubscription,
        )
        .finish();

        crate::contract::assert_type_exists(&schema, "DepartmentMetric");
    }

    #[test]
    #[should_panic(expected = "Field 'activeEmployeeCount' should exist on type 'DepartmentMetric'")]
    fn test_department_metric_has_active_employee_count_field() {
        let schema = Schema::build(
            crate::contract::QueryRoot::default(),
            EmptyMutation,
            EmptySubscription,
        )
        .finish();

        crate::contract::assert_field_exists(&schema, "DepartmentMetric", "activeEmployeeCount", "Int");
    }
}

#[cfg(test)]
mod goal_statistic_contract {
    use async_graphql::{EmptyMutation, EmptySubscription, Schema};

    #[test]
    #[should_panic(expected = "Type 'GoalStatistic' should exist in schema")]
    fn test_goal_statistic_type_exists() {
        let schema = Schema::build(
            crate::contract::QueryRoot::default(),
            EmptyMutation,
            EmptySubscription,
        )
        .finish();

        crate::contract::assert_type_exists(&schema, "GoalStatistic");
    }

    #[test]
    #[should_panic(expected = "Field 'completionPercentage' should exist on type 'GoalStatistic'")]
    fn test_goal_statistic_has_completion_percentage_field() {
        let schema = Schema::build(
            crate::contract::QueryRoot::default(),
            EmptyMutation,
            EmptySubscription,
        )
        .finish();

        crate::contract::assert_field_exists(
            &schema,
            "GoalStatistic",
            "completionPercentage",
            "Float",
        );
    }
}

#[cfg(test)]
mod report_analytic_contract {
    use async_graphql::{EmptyMutation, EmptySubscription, Schema};

    #[test]
    #[should_panic(expected = "Type 'ReportAnalytic' should exist in schema")]
    fn test_report_analytic_type_exists() {
        let schema = Schema::build(
            crate::contract::QueryRoot::default(),
            EmptyMutation,
            EmptySubscription,
        )
        .finish();

        crate::contract::assert_type_exists(&schema, "ReportAnalytic");
    }

    #[test]
    #[should_panic(expected = "Field 'headcount' should exist on type 'ReportAnalytic'")]
    fn test_report_analytic_has_headcount_field() {
        let schema = Schema::build(
            crate::contract::QueryRoot::default(),
            EmptyMutation,
            EmptySubscription,
        )
        .finish();

        crate::contract::assert_field_exists(&schema, "ReportAnalytic", "headcount", "Int");
    }
}

#[cfg(test)]
mod query_resolver_contract {
    use async_graphql::{EmptyMutation, EmptySubscription, Schema};

    #[test]
    #[should_panic(expected = "Field 'dashboardSummaries' should exist on type 'Query'")]
    fn test_dashboard_summaries_query_exists() {
        let schema = Schema::build(
            crate::contract::QueryRoot::default(),
            EmptyMutation,
            EmptySubscription,
        )
        .finish();

        crate::contract::assert_field_exists(&schema, "Query", "dashboardSummaries", "DashboardSummary");
    }

    #[test]
    #[should_panic(expected = "Field 'departmentMetrics' should exist on type 'Query'")]
    fn test_department_metrics_query_exists() {
        let schema = Schema::build(
            crate::contract::QueryRoot::default(),
            EmptyMutation,
            EmptySubscription,
        )
        .finish();

        crate::contract::assert_field_exists(
            &schema,
            "Query",
            "departmentMetrics",
            "DepartmentMetricConnection",
        );
    }
}

#[cfg(test)]
mod mutation_resolver_contract {
    use async_graphql::{EmptyMutation, EmptySubscription, Schema};

    #[test]
    #[should_panic(expected = "Field 'refreshDashboardSummaries' should exist on type 'Mutation'")]
    fn test_refresh_dashboard_summaries_mutation_exists() {
        let schema = Schema::build(
            crate::contract::QueryRoot::default(),
            EmptyMutation,
            EmptySubscription,
        )
        .finish();

        crate::contract::assert_field_exists(
            &schema,
            "Mutation",
            "refreshDashboardSummaries",
            "RefreshResult",
        );
    }

    #[test]
    #[should_panic(expected = "Type 'RefreshResult' should exist in schema")]
    fn test_refresh_result_type_exists() {
        let schema = Schema::build(
            crate::contract::QueryRoot::default(),
            EmptyMutation,
            EmptySubscription,
        )
        .finish();

        crate::contract::assert_type_exists(&schema, "RefreshResult");
    }
}
