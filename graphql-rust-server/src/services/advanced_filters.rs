//! Advanced filtering with SeaORM condition builders
//!
//! Provides sophisticated filtering capabilities for complex query requirements,
//! including dynamic filters, search, and custom conditions.

use async_graphql::Error;
use sea_orm::{
    entity::prelude::*,
    sea_query::{Expr, Func},
    Condition, QueryFilter, QuerySelect, Select,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::services::query_builder::{FilterBuilder, FilterOp};

/// Advanced filter for User entities
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserFilter {
    pub email: Option<String>,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub role: Option<String>,
    pub status: Option<String>,
    pub department_id: Option<uuid::Uuid>,
    pub manager_id: Option<uuid::Uuid>,
    pub is_active: Option<bool>,
    pub created_after: Option<DateTime<Utc>>,
    pub created_before: Option<DateTime<Utc>>,
    pub search: Option<String>,
}

impl UserFilter {
    pub fn to_condition(&self) -> Condition {
        use crate::models::user::Column;

        let mut builder = FilterBuilder::new();
        let mut condition = Condition::all();

        if let Some(ref email) = self.email {
            condition = condition.add(Column::Email.eq(email));
        }

        if let Some(ref first_name) = self.first_name {
            condition = condition.add(Column::FirstName.eq(first_name));
        }

        if let Some(ref last_name) = self.last_name {
            condition = condition.add(Column::LastName.eq(last_name));
        }

        if let Some(ref role) = self.role {
            condition = condition.add(Column::Role.eq(role));
        }

        if let Some(ref status) = self.status {
            condition = condition.add(Column::Status.eq(status));
        }

        if let Some(department_id) = self.department_id {
            condition = condition.add(Column::DepartmentId.eq(department_id));
        }

        if let Some(manager_id) = self.manager_id {
            condition = condition.add(Column::ManagerId.eq(manager_id));
        }

        if let Some(is_active) = self.is_active {
            condition = condition.add(Column::IsActive.eq(is_active));
        }

        if let Some(created_after) = self.created_after {
            condition = condition.add(Column::CreatedAt.gte(created_after));
        }

        if let Some(created_before) = self.created_before {
            condition = condition.add(Column::CreatedAt.lte(created_before));
        }

        if let Some(ref search) = self.search {
            let search_pattern = format!("%{}%", search);
            let search_condition = Condition::any()
                .add(Column::Email.like(&search_pattern))
                .add(Column::FirstName.like(&search_pattern))
                .add(Column::LastName.like(&search_pattern))
                .add(Column::DisplayName.like(&search_pattern));
            condition = condition.add(search_condition);
        }

        condition
    }
}

/// Advanced filter for Task entities
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskFilter {
    pub title: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub assignee_id: Option<uuid::Uuid>,
    pub created_by: Option<uuid::Uuid>,
    pub due_date_before: Option<DateTime<Utc>>,
    pub due_date_after: Option<DateTime<Utc>>,
    pub is_completed: Option<bool>,
    pub search: Option<String>,
}

impl TaskFilter {
    pub fn to_condition(&self) -> Condition {
        use crate::models::task::Column;

        let mut condition = Condition::all();

        if let Some(ref title) = self.title {
            condition = condition.add(Column::Title.like(format!("%{}%", title)));
        }

        if let Some(ref status) = self.status {
            condition = condition.add(Column::Status.eq(status));
        }

        if let Some(ref priority) = self.priority {
            condition = condition.add(Column::Priority.eq(priority));
        }

        if let Some(assignee_id) = self.assignee_id {
            condition = condition.add(Column::AssigneeId.eq(assignee_id));
        }

        if let Some(created_by) = self.created_by {
            condition = condition.add(Column::CreatedBy.eq(created_by));
        }

        if let Some(due_date_before) = self.due_date_before {
            condition = condition.add(Column::DueDate.lte(due_date_before));
        }

        if let Some(due_date_after) = self.due_date_after {
            condition = condition.add(Column::DueDate.gte(due_date_after));
        }

        if let Some(ref search) = self.search {
            let search_pattern = format!("%{}%", search);
            let search_condition = Condition::any()
                .add(Column::Title.like(&search_pattern))
                .add(Column::Description.like(&search_pattern));
            condition = condition.add(search_condition);
        }

        condition
    }
}

/// Advanced filter for LeaveRequest entities
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LeaveRequestFilter {
    pub employee_id: Option<uuid::Uuid>,
    pub status: Option<String>,
    pub leave_type: Option<String>,
    pub start_date_after: Option<DateTime<Utc>>,
    pub start_date_before: Option<DateTime<Utc>>,
    pub end_date_after: Option<DateTime<Utc>>,
    pub end_date_before: Option<DateTime<Utc>>,
    pub approved_by: Option<uuid::Uuid>,
}

impl LeaveRequestFilter {
    pub fn to_condition(&self) -> Condition {
        use crate::models::leave_request::Column;

        let mut condition = Condition::all();

        if let Some(employee_id) = self.employee_id {
            condition = condition.add(Column::EmployeeId.eq(employee_id));
        }

        if let Some(ref status) = self.status {
            condition = condition.add(Column::Status.eq(status));
        }

        if let Some(ref leave_type) = self.leave_type {
            condition = condition.add(Column::LeaveType.eq(leave_type));
        }

        if let Some(start_date_after) = self.start_date_after {
            condition = condition.add(Column::StartDate.gte(start_date_after));
        }

        if let Some(start_date_before) = self.start_date_before {
            condition = condition.add(Column::StartDate.lte(start_date_before));
        }

        if let Some(end_date_after) = self.end_date_after {
            condition = condition.add(Column::EndDate.gte(end_date_after));
        }

        if let Some(end_date_before) = self.end_date_before {
            condition = condition.add(Column::EndDate.lte(end_date_before));
        }

        if let Some(approved_by) = self.approved_by {
            condition = condition.add(Column::ApprovedBy.eq(approved_by));
        }

        condition
    }
}

/// Advanced filter for Department entities
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DepartmentFilter {
    pub name: Option<String>,
    pub manager_id: Option<uuid::Uuid>,
    pub parent_department_id: Option<uuid::Uuid>,
    pub search: Option<String>,
}

impl DepartmentFilter {
    pub fn to_condition(&self) -> Condition {
        use crate::models::department::Column;

        let mut condition = Condition::all();

        if let Some(ref name) = self.name {
            condition = condition.add(Column::Name.like(format!("%{}%", name)));
        }

        if let Some(manager_id) = self.manager_id {
            condition = condition.add(Column::ManagerId.eq(manager_id));
        }

        if let Some(parent_id) = self.parent_department_id {
            condition = condition.add(Column::ParentDepartmentId.eq(parent_id));
        }

        if let Some(ref search) = self.search {
            let search_pattern = format!("%{}%", search);
            let search_condition = Condition::any()
                .add(Column::Name.like(&search_pattern))
                .add(Column::Description.like(&search_pattern));
            condition = condition.add(search_condition);
        }

        condition
    }
}

/// Combine multiple filters with logical operators
pub struct FilterCombinator {
    conditions: Vec<Condition>,
    operator: LogicalOperator,
}

#[derive(Debug, Clone, Copy)]
pub enum LogicalOperator {
    And,
    Or,
}

impl FilterCombinator {
    pub fn new(operator: LogicalOperator) -> Self {
        Self {
            conditions: Vec::new(),
            operator,
        }
    }

    pub fn add(mut self, condition: Condition) -> Self {
        self.conditions.push(condition);
        self
    }

    pub fn build(self) -> Condition {
        let mut result = match self.operator {
            LogicalOperator::And => Condition::all(),
            LogicalOperator::Or => Condition::any(),
        };

        for condition in self.conditions {
            result = result.add(condition);
        }

        result
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_user_filter() {
        let filter = UserFilter {
            email: Some("test@example.com".to_string()),
            first_name: None,
            last_name: None,
            role: Some("admin".to_string()),
            status: None,
            department_id: None,
            manager_id: None,
            is_active: Some(true),
            created_after: None,
            created_before: None,
            search: None,
        };

        let condition = filter.to_condition();
        // Condition is built successfully
    }

    #[test]
    fn test_filter_combinator() {
        let combinator = FilterCombinator::new(LogicalOperator::And)
            .add(Condition::all())
            .add(Condition::all());
        
        let condition = combinator.build();
        // Condition is combined successfully
    }
}
