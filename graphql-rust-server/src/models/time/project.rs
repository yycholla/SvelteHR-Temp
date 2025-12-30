//! Project Model
//!
//! Maps to hr_public.projects table for time allocation and QuickBooks sync

use async_graphql::{InputObject, Object};
use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Project/job for time tracking
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "projects", schema_name = "hr_public")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub name: String,
    pub code: Option<String>,
    pub description: Option<String>,
    pub client_name: Option<String>,
    pub is_active: bool,
    pub is_billable: bool,
    pub quickbooks_customer_id: Option<String>,
    pub quickbooks_service_item_id: Option<String>,
    pub synced_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

/// Input for creating a new project
#[derive(Debug, Clone, InputObject)]
pub struct CreateProjectInput {
    pub name: String,
    pub code: Option<String>,
    pub description: Option<String>,
    #[graphql(name = "clientName")]
    pub client_name: Option<String>,
    #[graphql(name = "isBillable")]
    pub is_billable: Option<bool>,
}

/// Input for updating a project
#[derive(Debug, Clone, InputObject)]
pub struct UpdateProjectInput {
    pub name: Option<String>,
    pub code: Option<String>,
    pub description: Option<String>,
    #[graphql(name = "clientName")]
    pub client_name: Option<String>,
    #[graphql(name = "isActive")]
    pub is_active: Option<bool>,
    #[graphql(name = "isBillable")]
    pub is_billable: Option<bool>,
}

/// GraphQL Object implementation with camelCase field names
#[Object(name = "Project")]
impl Model {
    async fn id(&self) -> Uuid {
        self.id
    }

    async fn name(&self) -> &str {
        &self.name
    }

    async fn code(&self) -> Option<&str> {
        self.code.as_deref()
    }

    async fn description(&self) -> Option<&str> {
        self.description.as_deref()
    }

    #[graphql(name = "clientName")]
    async fn client_name(&self) -> Option<&str> {
        self.client_name.as_deref()
    }

    #[graphql(name = "isActive")]
    async fn is_active(&self) -> bool {
        self.is_active
    }

    #[graphql(name = "isBillable")]
    async fn is_billable(&self) -> bool {
        self.is_billable
    }

    #[graphql(name = "quickbooksCustomerId")]
    async fn quickbooks_customer_id(&self) -> Option<&str> {
        self.quickbooks_customer_id.as_deref()
    }

    #[graphql(name = "quickbooksServiceItemId")]
    async fn quickbooks_service_item_id(&self) -> Option<&str> {
        self.quickbooks_service_item_id.as_deref()
    }

    #[graphql(name = "syncedAt")]
    async fn synced_at(&self) -> Option<DateTime<Utc>> {
        self.synced_at
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
