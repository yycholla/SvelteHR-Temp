//! Analytics Domain
//!
//! Contains read-only materialized view models for dashboards and reporting.
//! These models are READ-ONLY - mutations refresh the underlying views.

pub mod dashboard_summary;
pub mod department_metric;
pub mod goal_statistic;
pub mod report_analytic;

// Re-exports for convenient access
pub use dashboard_summary::DashboardSummary;
pub use department_metric::DepartmentMetric;
pub use goal_statistic::GoalStatistic;
pub use report_analytic::ReportAnalytic;
