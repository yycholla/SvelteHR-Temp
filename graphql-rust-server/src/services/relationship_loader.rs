//! Type-safe relationship loading utilities
//!
//! Provides utilities for loading related entities with type safety,
//! eager loading, and N+1 query prevention.

use async_graphql::Error;
use sea_orm::{
    entity::prelude::*,
    DatabaseConnection, EntityTrait, QueryFilter, QuerySelect, RelationTrait,
};
use std::collections::HashMap;
use uuid::Uuid;

use crate::models::{
    user, department, task, leave_request, performance_review,
    task_assignee, task_audit_entry, task_dependency,
};

/// Relationship loader for User entity
pub struct UserRelationLoader<'a> {
    db: &'a DatabaseConnection,
}

impl<'a> UserRelationLoader<'a> {
    pub fn new(db: &'a DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn load_department(&self, user: &user::Model) -> Result<Option<department::Model>, Error> {
        if let Some(dept_id) = user.department_id {
            department::Entity::find_by_id(dept_id)
                .one(self.db)
                .await
                .map_err(|e| Error::new(format!("Failed to load department: {}", e)))
        } else {
            Ok(None)
        }
    }

    pub async fn load_manager(&self, user: &user::Model) -> Result<Option<user::Model>, Error> {
        if let Some(manager_id) = user.manager_id {
            user::Entity::find_by_id(manager_id)
                .one(self.db)
                .await
                .map_err(|e| Error::new(format!("Failed to load manager: {}", e)))
        } else {
            Ok(None)
        }
    }

    pub async fn load_direct_reports(&self, user: &user::Model) -> Result<Vec<user::Model>, Error> {
        user::Entity::find()
            .filter(user::Column::ManagerId.eq(user.id))
            .all(self.db)
            .await
            .map_err(|e| Error::new(format!("Failed to load direct reports: {}", e)))
    }

    pub async fn load_tasks(&self, user: &user::Model) -> Result<Vec<task::Model>, Error> {
        task::Entity::find()
            .filter(task::Column::AssigneeId.eq(user.id))
            .all(self.db)
            .await
            .map_err(|e| Error::new(format!("Failed to load tasks: {}", e)))
    }

    pub async fn load_leave_requests(&self, user: &user::Model) -> Result<Vec<leave_request::Model>, Error> {
        leave_request::Entity::find()
            .filter(leave_request::Column::EmployeeId.eq(user.id))
            .all(self.db)
            .await
            .map_err(|e| Error::new(format!("Failed to load leave requests: {}", e)))
    }

    pub async fn load_performance_reviews(&self, user: &user::Model) -> Result<Vec<performance_review::Model>, Error> {
        performance_review::Entity::find()
            .filter(performance_review::Column::EmployeeId.eq(user.id))
            .all(self.db)
            .await
            .map_err(|e| Error::new(format!("Failed to load performance reviews: {}", e)))
    }
}

/// Relationship loader for Department entity
pub struct DepartmentRelationLoader<'a> {
    db: &'a DatabaseConnection,
}

impl<'a> DepartmentRelationLoader<'a> {
    pub fn new(db: &'a DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn load_parent(&self, dept: &department::Model) -> Result<Option<department::Model>, Error> {
        if let Some(parent_id) = dept.parent_department_id {
            department::Entity::find_by_id(parent_id)
                .one(self.db)
                .await
                .map_err(|e| Error::new(format!("Failed to load parent department: {}", e)))
        } else {
            Ok(None)
        }
    }

    pub async fn load_children(&self, dept: &department::Model) -> Result<Vec<department::Model>, Error> {
        department::Entity::find()
            .filter(department::Column::ParentDepartmentId.eq(dept.id))
            .all(self.db)
            .await
            .map_err(|e| Error::new(format!("Failed to load child departments: {}", e)))
    }

    pub async fn load_manager(&self, dept: &department::Model) -> Result<Option<user::Model>, Error> {
        if let Some(manager_id) = dept.manager_id {
            user::Entity::find_by_id(manager_id)
                .one(self.db)
                .await
                .map_err(|e| Error::new(format!("Failed to load manager: {}", e)))
        } else {
            Ok(None)
        }
    }

    pub async fn load_members(&self, dept: &department::Model) -> Result<Vec<user::Model>, Error> {
        user::Entity::find()
            .filter(user::Column::DepartmentId.eq(dept.id))
            .all(self.db)
            .await
            .map_err(|e| Error::new(format!("Failed to load department members: {}", e)))
    }
}

/// Relationship loader for Task entity
pub struct TaskRelationLoader<'a> {
    db: &'a DatabaseConnection,
}

impl<'a> TaskRelationLoader<'a> {
    pub fn new(db: &'a DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn load_assignee(&self, task: &task::Model) -> Result<Option<user::Model>, Error> {
        if let Some(assignee_id) = task.assignee_id {
            user::Entity::find_by_id(assignee_id)
                .one(self.db)
                .await
                .map_err(|e| Error::new(format!("Failed to load assignee: {}", e)))
        } else {
            Ok(None)
        }
    }

    pub async fn load_creator(&self, task: &task::Model) -> Result<Option<user::Model>, Error> {
        if let Some(created_by) = task.created_by {
            user::Entity::find_by_id(created_by)
                .one(self.db)
                .await
                .map_err(|e| Error::new(format!("Failed to load creator: {}", e)))
        } else {
            Ok(None)
        }
    }

    pub async fn load_assignees(&self, task: &task::Model) -> Result<Vec<user::Model>, Error> {
        let assignee_records = task_assignee::Entity::find()
            .filter(task_assignee::Column::TaskId.eq(task.id))
            .all(self.db)
            .await
            .map_err(|e| Error::new(format!("Failed to load assignees: {}", e)))?;

        let user_ids: Vec<Uuid> = assignee_records.iter().map(|a| a.user_id).collect();
        
        if user_ids.is_empty() {
            return Ok(Vec::new());
        }

        user::Entity::find()
            .filter(user::Column::Id.is_in(user_ids))
            .all(self.db)
            .await
            .map_err(|e| Error::new(format!("Failed to load assignee users: {}", e)))
    }

    pub async fn load_dependencies(&self, task: &task::Model) -> Result<Vec<task::Model>, Error> {
        let dependency_records = task_dependency::Entity::find()
            .filter(task_dependency::Column::TaskId.eq(task.id))
            .all(self.db)
            .await
            .map_err(|e| Error::new(format!("Failed to load dependencies: {}", e)))?;

        let task_ids: Vec<Uuid> = dependency_records.iter().map(|d| d.depends_on_task_id).collect();
        
        if task_ids.is_empty() {
            return Ok(Vec::new());
        }

        task::Entity::find()
            .filter(task::Column::Id.is_in(task_ids))
            .all(self.db)
            .await
            .map_err(|e| Error::new(format!("Failed to load dependency tasks: {}", e)))
    }

    pub async fn load_audit_trail(&self, task: &task::Model) -> Result<Vec<task_audit_entry::Model>, Error> {
        task_audit_entry::Entity::find()
            .filter(task_audit_entry::Column::TaskId.eq(task.id))
            .all(self.db)
            .await
            .map_err(|e| Error::new(format!("Failed to load audit trail: {}", e)))
    }
}

/// Relationship loader for LeaveRequest entity
pub struct LeaveRequestRelationLoader<'a> {
    db: &'a DatabaseConnection,
}

impl<'a> LeaveRequestRelationLoader<'a> {
    pub fn new(db: &'a DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn load_employee(&self, leave: &leave_request::Model) -> Result<user::Model, Error> {
        user::Entity::find_by_id(leave.employee_id)
            .one(self.db)
            .await
            .map_err(|e| Error::new(format!("Failed to load employee: {}", e)))?
            .ok_or_else(|| Error::new("Employee not found"))
    }

    pub async fn load_approver(&self, leave: &leave_request::Model) -> Result<Option<user::Model>, Error> {
        if let Some(approver_id) = leave.approved_by {
            user::Entity::find_by_id(approver_id)
                .one(self.db)
                .await
                .map_err(|e| Error::new(format!("Failed to load approver: {}", e)))
        } else {
            Ok(None)
        }
    }
}

/// Relationship loader for PerformanceReview entity
pub struct PerformanceReviewRelationLoader<'a> {
    db: &'a DatabaseConnection,
}

impl<'a> PerformanceReviewRelationLoader<'a> {
    pub fn new(db: &'a DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn load_employee(&self, review: &performance_review::Model) -> Result<user::Model, Error> {
        user::Entity::find_by_id(review.employee_id)
            .one(self.db)
            .await
            .map_err(|e| Error::new(format!("Failed to load employee: {}", e)))?
            .ok_or_else(|| Error::new("Employee not found"))
    }

    pub async fn load_reviewer(&self, review: &performance_review::Model) -> Result<Option<user::Model>, Error> {
        if let Some(reviewer_id) = review.reviewer_id {
            user::Entity::find_by_id(reviewer_id)
                .one(self.db)
                .await
                .map_err(|e| Error::new(format!("Failed to load reviewer: {}", e)))
        } else {
            Ok(None)
        }
    }
}

/// Batch loader for preventing N+1 queries
pub struct BatchLoader<'a> {
    db: &'a DatabaseConnection,
}

impl<'a> BatchLoader<'a> {
    pub fn new(db: &'a DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn load_users_by_ids(&self, ids: Vec<Uuid>) -> Result<HashMap<Uuid, user::Model>, Error> {
        let users = user::Entity::find()
            .filter(user::Column::Id.is_in(ids))
            .all(self.db)
            .await
            .map_err(|e| Error::new(format!("Failed to batch load users: {}", e)))?;

        Ok(users.into_iter().map(|u| (u.id, u)).collect())
    }

    pub async fn load_departments_by_ids(&self, ids: Vec<Uuid>) -> Result<HashMap<Uuid, department::Model>, Error> {
        let depts = department::Entity::find()
            .filter(department::Column::Id.is_in(ids))
            .all(self.db)
            .await
            .map_err(|e| Error::new(format!("Failed to batch load departments: {}", e)))?;

        Ok(depts.into_iter().map(|d| (d.id, d)).collect())
    }

    pub async fn load_tasks_by_ids(&self, ids: Vec<Uuid>) -> Result<HashMap<Uuid, task::Model>, Error> {
        let tasks = task::Entity::find()
            .filter(task::Column::Id.is_in(ids))
            .all(self.db)
            .await
            .map_err(|e| Error::new(format!("Failed to batch load tasks: {}", e)))?;

        Ok(tasks.into_iter().map(|t| (t.id, t)).collect())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_batch_loader_creation() {
        use sea_orm::Database;
        
    }
}
