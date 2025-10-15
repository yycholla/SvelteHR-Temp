//! DataLoader implementations for N+1 query prevention with SeaORM
//!
//! Provides async-graphql DataLoader implementations backed by SeaORM
//! for efficient batch loading of related entities.

use async_graphql::dataloader::*;
use async_graphql::Error;
use sea_orm::{DatabaseConnection, EntityTrait, ColumnTrait, QueryFilter};
use std::collections::HashMap;
use std::sync::Arc;
use uuid::Uuid;

use crate::models::{user, department, task, leave_request, performance_review};

/// DataLoader for User entities
pub struct UserLoader {
    db: Arc<DatabaseConnection>,
}

impl UserLoader {
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self { db }
    }
}

#[async_trait::async_trait]
impl Loader<Uuid> for UserLoader {
    type Value = user::Model;
    type Error = Arc<Error>;

    async fn load(&self, keys: &[Uuid]) -> Result<HashMap<Uuid, Self::Value>, Self::Error> {
        let users = user::Entity::find()
            .filter(user::Column::Id.is_in(keys.to_vec()))
            .all(self.db.as_ref())
            .await
            .map_err(|e| Arc::new(Error::new(format!("Failed to load users: {}", e))))?;

        Ok(users.into_iter().map(|u| (u.id, u)).collect())
    }
}

/// DataLoader for Department entities
pub struct DepartmentLoader {
    db: Arc<DatabaseConnection>,
}

impl DepartmentLoader {
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self { db }
    }
}

#[async_trait::async_trait]
impl Loader<Uuid> for DepartmentLoader {
    type Value = department::Model;
    type Error = Arc<Error>;

    async fn load(&self, keys: &[Uuid]) -> Result<HashMap<Uuid, Self::Value>, Self::Error> {
        let departments = department::Entity::find()
            .filter(department::Column::Id.is_in(keys.to_vec()))
            .all(self.db.as_ref())
            .await
            .map_err(|e| Arc::new(Error::new(format!("Failed to load departments: {}", e))))?;

        Ok(departments.into_iter().map(|d| (d.id, d)).collect())
    }
}

/// DataLoader for Task entities
pub struct TaskLoader {
    db: Arc<DatabaseConnection>,
}

impl TaskLoader {
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self { db }
    }
}

#[async_trait::async_trait]
impl Loader<Uuid> for TaskLoader {
    type Value = task::Model;
    type Error = Arc<Error>;

    async fn load(&self, keys: &[Uuid]) -> Result<HashMap<Uuid, Self::Value>, Self::Error> {
        let tasks = task::Entity::find()
            .filter(task::Column::Id.is_in(keys.to_vec()))
            .all(self.db.as_ref())
            .await
            .map_err(|e| Arc::new(Error::new(format!("Failed to load tasks: {}", e))))?;

        Ok(tasks.into_iter().map(|t| (t.id, t)).collect())
    }
}

/// DataLoader for LeaveRequest entities
pub struct LeaveRequestLoader {
    db: Arc<DatabaseConnection>,
}

impl LeaveRequestLoader {
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self { db }
    }
}

#[async_trait::async_trait]
impl Loader<Uuid> for LeaveRequestLoader {
    type Value = leave_request::Model;
    type Error = Arc<Error>;

    async fn load(&self, keys: &[Uuid]) -> Result<HashMap<Uuid, Self::Value>, Self::Error> {
        let leave_requests = leave_request::Entity::find()
            .filter(leave_request::Column::Id.is_in(keys.to_vec()))
            .all(self.db.as_ref())
            .await
            .map_err(|e| Arc::new(Error::new(format!("Failed to load leave requests: {}", e))))?;

        Ok(leave_requests.into_iter().map(|lr| (lr.id, lr)).collect())
    }
}

/// DataLoader for PerformanceReview entities
pub struct PerformanceReviewLoader {
    db: Arc<DatabaseConnection>,
}

impl PerformanceReviewLoader {
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self { db }
    }
}

#[async_trait::async_trait]
impl Loader<Uuid> for PerformanceReviewLoader {
    type Value = performance_review::Model;
    type Error = Arc<Error>;

    async fn load(&self, keys: &[Uuid]) -> Result<HashMap<Uuid, Self::Value>, Self::Error> {
        let reviews = performance_review::Entity::find()
            .filter(performance_review::Column::Id.is_in(keys.to_vec()))
            .all(self.db.as_ref())
            .await
            .map_err(|e| Arc::new(Error::new(format!("Failed to load performance reviews: {}", e))))?;

        Ok(reviews.into_iter().map(|r| (r.id, r)).collect())
    }
}

/// Collection of all DataLoaders
pub struct Loaders {
    pub user_loader: DataLoader<UserLoader>,
    pub department_loader: DataLoader<DepartmentLoader>,
    pub task_loader: DataLoader<TaskLoader>,
    pub leave_request_loader: DataLoader<LeaveRequestLoader>,
    pub performance_review_loader: DataLoader<PerformanceReviewLoader>,
}

impl Loaders {
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self {
            user_loader: DataLoader::new(UserLoader::new(db.clone()), tokio::spawn),
            department_loader: DataLoader::new(DepartmentLoader::new(db.clone()), tokio::spawn),
            task_loader: DataLoader::new(TaskLoader::new(db.clone()), tokio::spawn),
            leave_request_loader: DataLoader::new(LeaveRequestLoader::new(db.clone()), tokio::spawn),
            performance_review_loader: DataLoader::new(PerformanceReviewLoader::new(db), tokio::spawn),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_loader_creation() {
        // Test loader instantiation compiles
    }
}
