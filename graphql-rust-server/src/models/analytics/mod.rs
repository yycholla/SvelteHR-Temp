//! Analytics Domain
//!
//! Contains read-only materialized view models for dashboards and reporting.
//! These models are READ-ONLY - mutations refresh the underlying views.

pub mod dashboard_summary;
pub mod department_metric;
pub mod employee_statistic;
pub mod goal_statistic;
pub mod report_analytic;

// Re-exports for convenient access
pub use dashboard_summary::DashboardSummary;
pub use department_metric::Model as DepartmentMetric;
pub use employee_statistic::{Entity as EmployeeStatisticEntity, Model as EmployeeStatistic};
pub use goal_statistic::Model as GoalStatistic;
pub use report_analytic::Model as ReportAnalytic;
