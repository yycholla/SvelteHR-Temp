//! Emergency Contact Model
//!
//! Maps to hr_public.emergency_contacts table

use async_graphql::{InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use sea_orm::{entity::prelude::*, QueryFilter};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{database::get_db_from_context, error::AppError};

/// Employee emergency contact information
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "emergency_contacts")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub employee_id: Uuid,
    pub contact_name: String,
    pub relationship: String,
    pub phone_number: String,
    pub email: Option<String>,
    pub is_primary: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "crate::models::user::Entity",
        from = "Column::EmployeeId",
        to = "crate::models::user::Column::Id"
    )]
    Employee,
}

impl ActiveModelBehavior for ActiveModel {}

/// Input for creating a new emergency contact
#[derive(Debug, Clone, InputObject)]
pub struct CreateEmergencyContactInput {
    #[graphql(name = "employeeId")]
    pub employee_id: Uuid,
    #[graphql(name = "contactName")]
    pub contact_name: String,
    pub relationship: String,
    #[graphql(name = "phoneNumber")]
    pub phone_number: String,
    pub email: Option<String>,
    #[graphql(name = "isPrimary")]
    pub is_primary: bool,
}

/// Input for updating an emergency contact
#[derive(Debug, Clone, InputObject)]
pub struct UpdateEmergencyContactInput {
    #[graphql(name = "contactName")]
    pub contact_name: Option<String>,
    pub relationship: Option<String>,
    #[graphql(name = "phoneNumber")]
    pub phone_number: Option<String>,
    pub email: Option<String>,
    #[graphql(name = "isPrimary")]
    pub is_primary: Option<bool>,
}

/// GraphQL Object implementation with camelCase field names
#[Object]
impl Model {
    async fn id(&self) -> Uuid {
        self.id
    }

    #[graphql(name = "employeeId")]
    async fn employee_id(&self) -> Uuid {
        self.employee_id
    }

    #[graphql(name = "contactName")]
    async fn contact_name(&self) -> &str {
        &self.contact_name
    }

    async fn relationship(&self) -> &str {
        &self.relationship
    }

    #[graphql(name = "phoneNumber")]
    async fn phone_number(&self) -> &str {
        &self.phone_number
    }

    async fn email(&self) -> Option<&str> {
        self.email.as_deref()
    }

    #[graphql(name = "isPrimary")]
    async fn is_primary(&self) -> bool {
        self.is_primary
    }

    #[graphql(name = "createdAt")]
    async fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }

    #[graphql(name = "updatedAt")]
    async fn updated_at(&self) -> DateTime<Utc> {
        self.updated_at
    }

    /// Employee relationship (lazy-loaded)
    async fn employee(&self, ctx: &async_graphql::Context<'_>) -> GqlResult<crate::models::User> {
        let db = get_db_from_context(ctx)?;
        let user = crate::models::user::Entity::find_by_id(self.employee_id)
            .one(db)
            .await?
            .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

        Ok(user)
    }
}
