//! Task Type Model
//!
//! Maps to hr_public.task_types table

use async_graphql::{Context, InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use sea_orm::{entity::prelude::*, FromQueryResult, Related};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{database::get_db_from_context, error::AppError, models::generated::prelude::*};

/// Task type/category for classification
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "task_types")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub default_priority: Option<String>,
    pub color_code: Option<String>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "crate::models::task::Entity")]
    Tasks,
}

impl ActiveModelBehavior for ActiveModel {}

/// Input for creating a new task type
#[derive(Debug, Clone, InputObject)]
pub struct CreateTaskTypeInput {
    pub name: String,
    pub description: Option<String>,
    #[graphql(name = "defaultPriority")]
    pub default_priority: Option<String>,
    #[graphql(name = "colorCode")]
    pub color_code: Option<String>,
}

/// Input for updating a task type
#[derive(Debug, Clone, InputObject)]
pub struct UpdateTaskTypeInput {
    pub name: Option<String>,
    pub description: Option<String>,
    #[graphql(name = "defaultPriority")]
    pub default_priority: Option<String>,
    #[graphql(name = "colorCode")]
    pub color_code: Option<String>,
    #[graphql(name = "isActive")]
    pub is_active: Option<bool>,
}

/// GraphQL Object implementation with camelCase field names
#[Object(name = "tasks_task_type_Model")]
impl Model {
    async fn id(&self) -> Uuid {
        self.id
    }

    async fn name(&self) -> &str {
        &self.name
    }

    async fn description(&self) -> Option<&str> {
        self.description.as_deref()
    }

    #[graphql(name = "defaultPriority")]
    async fn default_priority(&self) -> Option<&str> {
        self.default_priority.as_deref()
    }

    #[graphql(name = "colorCode")]
    async fn color_code(&self) -> Option<&str> {
        self.color_code.as_deref()
    }

    #[graphql(name = "isActive")]
    async fn is_active(&self) -> bool {
        self.is_active
    }

    #[graphql(name = "createdAt")]
    async fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }

    #[graphql(name = "updatedAt")]
    async fn updated_at(&self) -> DateTime<Utc> {
        self.updated_at
    }
}
