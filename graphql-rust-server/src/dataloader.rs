//! DataLoader implementations for batching and caching database queries
//!
//! This module provides DataLoader implementations for common entities to prevent
//! N+1 query problems in GraphQL resolvers.

use async_graphql::dataloader::*;
use sea_orm::{DatabaseConnection, EntityTrait, QueryFilter, ColumnTrait, QuerySelect};
use std::collections::HashMap;
use std::sync::Arc;
use uuid::Uuid;

use crate::models::generated::prelude::*;
use crate::models::task::{Model as Task, Entity as TaskEntity, Column as TaskColumn};
use crate::models::user::{Model as User, Entity as UserEntity, Column as UserColumn};
use crate::models::department::{Model as Department, Entity as DepartmentEntity, Column as DepartmentColumn};

/// DataLoader for loading users by ID
pub struct UserLoader {
    pub db: DatabaseConnection,
}

#[async_trait::async_trait]
impl Loader<Uuid> for UserLoader {
    type Value = User;
    type Error = std::sync::Arc<sea_orm::DbErr>;

    async fn load(&self, keys: &[Uuid]) -> Result<HashMap<Uuid, Self::Value>, Self::Error> {
        let users = UserEntity::find()
            .filter(UserColumn::Id.is_in(keys.iter().copied()))
            .filter(UserColumn::DeletedAt.is_null())
            .all(&self.db)
            .await?;

        Ok(users.into_iter().map(|user| (user.id, user)).collect())
    }
}

/// DataLoader for loading departments by ID
pub struct DepartmentLoader {
    pub db: DatabaseConnection,
}

#[async_trait::async_trait]
impl Loader<Uuid> for DepartmentLoader {
    type Value = Department;
    type Error = std::sync::Arc<sea_orm::DbErr>;

    async fn load(&self, keys: &[Uuid]) -> Result<HashMap<Uuid, Self::Value>, Self::Error> {
        let departments = DepartmentEntity::find()
            .filter(DepartmentColumn::Id.is_in(keys.iter().copied()))
            .filter(DepartmentColumn::DeletedAt.is_null())
            .all(&self.db)
            .await?;

        Ok(departments.into_iter().map(|dept| (dept.id, dept)).collect())
    }
}

/// DataLoader for loading tasks by ID
pub struct TaskLoader {
    pub db: DatabaseConnection,
}

#[async_trait::async_trait]
impl Loader<Uuid> for TaskLoader {
    type Value = Task;
    type Error = std::sync::Arc<sea_orm::DbErr>;

    async fn load(&self, keys: &[Uuid]) -> Result<HashMap<Uuid, Self::Value>, Self::Error> {
        let tasks = TaskEntity::find()
            .filter(TaskColumn::Id.is_in(keys.iter().copied()))
            .filter(TaskColumn::DeletedAt.is_null())
            .all(&self.db)
            .await?;

        Ok(tasks.into_iter().map(|task| (task.id, task)).collect())
    }
}

/// DataLoader for loading users by department ID
pub struct UsersByDepartmentLoader {
    pub db: DatabaseConnection,
}

#[async_trait::async_trait]
impl Loader<Uuid> for UsersByDepartmentLoader {
    type Value = Vec<User>;
    type Error = std::sync::Arc<sea_orm::DbErr>;

    async fn load(&self, keys: &[Uuid]) -> Result<HashMap<Uuid, Self::Value>, Self::Error> {
        let users = UserEntity::find()
            .filter(UserColumn::DepartmentId.is_in(keys.iter().copied()))
            .filter(UserColumn::DeletedAt.is_null())
            .all(&self.db)
            .await?;

        // Group users by department_id
        let mut result = HashMap::new();
        for user in users {
            if let Some(dept_id) = user.department_id {
                result.entry(dept_id).or_insert_with(Vec::new).push(user);
            }
        }

        // Ensure all requested keys have entries (even if empty)
        for &key in keys {
            result.entry(key).or_insert_with(Vec::new);
        }

        Ok(result)
    }
}

/// DataLoader for loading tasks by assignee ID
pub struct TasksByAssigneeLoader {
    pub db: DatabaseConnection,
}

#[async_trait::async_trait]
impl Loader<Uuid> for TasksByAssigneeLoader {
    type Value = Vec<Task>;
    type Error = std::sync::Arc<sea_orm::DbErr>;

    async fn load(&self, keys: &[Uuid]) -> Result<HashMap<Uuid, Self::Value>, Self::Error> {
        let tasks = TaskEntity::find()
            .filter(TaskColumn::AssigneeId.is_in(keys.iter().copied()))
            .filter(TaskColumn::DeletedAt.is_null())
            .all(&self.db)
            .await?;

        // Group tasks by assignee_id
        let mut result = HashMap::new();
        for task in tasks {
            if let Some(assignee_id) = task.assignee_id {
                result.entry(assignee_id).or_insert_with(Vec::new).push(task);
            }
        }

        // Ensure all requested keys have entries (even if empty)
        for &key in keys {
            result.entry(key).or_insert_with(Vec::new);
        }

        Ok(result)
    }
}

/// DataLoader for loading tasks by creator ID
pub struct TasksByCreatorLoader {
    pub db: DatabaseConnection,
}

#[async_trait::async_trait]
impl Loader<Uuid> for TasksByCreatorLoader {
    type Value = Vec<Task>;
    type Error = std::sync::Arc<sea_orm::DbErr>;

    async fn load(&self, keys: &[Uuid]) -> Result<HashMap<Uuid, Self::Value>, Self::Error> {
        let tasks = TaskEntity::find()
            .filter(TaskColumn::CreatedBy.is_in(keys.iter().copied()))
            .filter(TaskColumn::DeletedAt.is_null())
            .all(&self.db)
            .await?;

        // Group tasks by created_by
        let mut result = HashMap::new();
        for task in tasks {
            result.entry(task.created_by).or_insert_with(Vec::new).push(task);
        }

        // Ensure all requested keys have entries (even if empty)
        for &key in keys {
            result.entry(key).or_insert_with(Vec::new);
        }

        Ok(result)
    }
}

/// DataLoader context containing all DataLoaders
#[derive(Clone)]
pub struct DataLoaderContext {
    pub users: Arc<DataLoader<UserLoader>>,
    pub departments: Arc<DataLoader<DepartmentLoader>>,
    pub tasks: Arc<DataLoader<TaskLoader>>,
    pub users_by_department: Arc<DataLoader<UsersByDepartmentLoader>>,
    pub tasks_by_assignee: Arc<DataLoader<TasksByAssigneeLoader>>,
    pub tasks_by_creator: Arc<DataLoader<TasksByCreatorLoader>>,
}

impl DataLoaderContext {
    /// Create a new DataLoader context with the given database connection
    pub fn new(db: DatabaseConnection) -> Self {
        Self {
            users: Arc::new(DataLoader::new(UserLoader { db: db.clone() }, tokio::spawn)),
            departments: Arc::new(DataLoader::new(DepartmentLoader { db: db.clone() }, tokio::spawn)),
            tasks: Arc::new(DataLoader::new(TaskLoader { db: db.clone() }, tokio::spawn)),
            users_by_department: Arc::new(DataLoader::new(UsersByDepartmentLoader { db: db.clone() }, tokio::spawn)),
            tasks_by_assignee: Arc::new(DataLoader::new(TasksByAssigneeLoader { db: db.clone() }, tokio::spawn)),
            tasks_by_creator: Arc::new(DataLoader::new(TasksByCreatorLoader { db: db.clone() }, tokio::spawn)),
        }
    }
}