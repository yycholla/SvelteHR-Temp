//! Review Template Model
//!
//! Maps to hr_public.review_templates table

use async_graphql::{InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use sea_orm::{entity::prelude::*, QueryFilter};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use uuid::Uuid;

use crate::{database::get_db_from_context, error::AppError};

/// SeaORM Review template entity
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "review_templates")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub sections: Option<JsonValue>,
    pub is_active: bool,
    pub created_by_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "crate::models::user::Entity",
        from = "Column::CreatedById",
        to = "crate::models::user::Column::Id"
    )]
    CreatedBy,
}

impl ActiveModelBehavior for ActiveModel {}

/// Legacy ReviewTemplate struct for GraphQL backward compatibility
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReviewTemplate {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub sections: Option<JsonValue>,
    pub is_active: bool,
    pub created_by_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Input for creating a new review template
#[derive(Debug, Clone, InputObject)]
pub struct CreateReviewTemplateInput {
    pub name: String,
    pub description: Option<String>,
    pub sections: Option<String>, // JSON string
    #[graphql(name = "createdById")]
    pub created_by_id: Uuid,
}

/// Input for updating a review template
#[derive(Debug, Clone, InputObject)]
pub struct UpdateReviewTemplateInput {
    pub name: Option<String>,
    pub description: Option<String>,
    pub sections: Option<String>, // JSON string
    #[graphql(name = "isActive")]
    pub is_active: Option<bool>,
}

/// GraphQL Object implementation with camelCase field names
#[Object]
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

    async fn sections(&self) -> Option<String> {
        self.sections.as_ref().map(|v| v.to_string())
    }

    #[graphql(name = "isActive")]
    async fn is_active(&self) -> bool {
        self.is_active
    }

    #[graphql(name = "createdById")]
    async fn created_by_id(&self) -> Uuid {
        self.created_by_id
    }

    #[graphql(name = "createdAt")]
    async fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }

    #[graphql(name = "updatedAt")]
    async fn updated_at(&self) -> DateTime<Utc> {
        self.updated_at
    }

    /// Creator relationship (lazy-loaded)
    #[graphql(name = "createdBy")]
    async fn created_by(
        &self,
        ctx: &async_graphql::Context<'_>,
    ) -> GqlResult<crate::models::user::Model> {
        let db = get_db_from_context(ctx)?;
        let user = crate::models::user::Entity::find_by_id(self.created_by_id)
            .filter(crate::models::user::Column::DeletedAt.is_null())
            .one(db)
            .await?
            .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

        Ok(user)
    }
}
