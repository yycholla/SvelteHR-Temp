//! User Address Model
//!
//! Maps to hr_public.user_addresses table
//! Supports multiple addresses per user with primary designation

use async_graphql::{InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use sea_orm::{entity::prelude::*, QueryFilter};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use crate::{database::get_db_from_context, error::AppError};

/// SeaORM User Address entity
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "user_addresses", schema_name = "hr_public")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub user_id: Uuid,
    pub address_type: String,
    pub is_primary: bool,
    pub address_line1: String,
    pub address_line2: Option<String>,
    pub city: String,
    pub state_province: String,
    pub postal_code: String,
    pub country: String,
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "crate::models::user::Entity",
        from = "Column::UserId",
        to = "crate::models::user::Column::Id"
    )]
    User,
}

impl ActiveModelBehavior for ActiveModel {}

/// Related trait implementation for User relationship
impl sea_orm::Related<crate::models::user::Entity> for Entity {
    fn to() -> sea_orm::RelationDef {
        Relation::User.def()
    }
}

/// SQLx-compatible UserAddress struct for backward compatibility
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct UserAddress {
    pub id: Uuid,
    pub user_id: Uuid,
    pub address_type: String,
    pub is_primary: bool,
    pub address_line1: String,
    pub address_line2: Option<String>,
    pub city: String,
    pub state_province: String,
    pub postal_code: String,
    pub country: String,
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

/// Input for creating a new user address
#[derive(Debug, Clone, InputObject)]
pub struct CreateUserAddressInput {
    #[graphql(name = "userId")]
    pub user_id: Uuid,
    #[graphql(name = "addressType")]
    pub address_type: String,
    #[graphql(name = "isPrimary")]
    pub is_primary: bool,
    #[graphql(name = "addressLine1")]
    pub address_line1: String,
    #[graphql(name = "addressLine2")]
    pub address_line2: Option<String>,
    pub city: String,
    #[graphql(name = "stateProvince")]
    pub state_province: String,
    #[graphql(name = "postalCode")]
    pub postal_code: String,
    pub country: String,
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
}

/// Input for updating a user address
#[derive(Debug, Clone, InputObject)]
pub struct UpdateUserAddressInput {
    #[graphql(name = "addressType")]
    pub address_type: Option<String>,
    #[graphql(name = "isPrimary")]
    pub is_primary: Option<bool>,
    #[graphql(name = "addressLine1")]
    pub address_line1: Option<String>,
    #[graphql(name = "addressLine2")]
    pub address_line2: Option<String>,
    pub city: Option<String>,
    #[graphql(name = "stateProvince")]
    pub state_province: Option<String>,
    #[graphql(name = "postalCode")]
    pub postal_code: Option<String>,
    pub country: Option<String>,
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
}

/// GraphQL Object implementation with camelCase field names
#[Object(name = "employee_user_address_Model")]
impl Model {
    async fn id(&self) -> Uuid {
        self.id
    }

    #[graphql(name = "userId")]
    async fn user_id(&self) -> Uuid {
        self.user_id
    }

    #[graphql(name = "addressType")]
    async fn address_type(&self) -> &str {
        &self.address_type
    }

    #[graphql(name = "isPrimary")]
    async fn is_primary(&self) -> bool {
        self.is_primary
    }

    #[graphql(name = "addressLine1")]
    async fn address_line1(&self) -> &str {
        &self.address_line1
    }

    #[graphql(name = "addressLine2")]
    async fn address_line2(&self) -> Option<&str> {
        self.address_line2.as_deref()
    }

    async fn city(&self) -> &str {
        &self.city
    }

    #[graphql(name = "stateProvince")]
    async fn state_province(&self) -> &str {
        &self.state_province
    }

    #[graphql(name = "postalCode")]
    async fn postal_code(&self) -> &str {
        &self.postal_code
    }

    async fn country(&self) -> &str {
        &self.country
    }

    async fn latitude(&self) -> Option<f64> {
        self.latitude
    }

    async fn longitude(&self) -> Option<f64> {
        self.longitude
    }

    #[graphql(name = "createdAt")]
    async fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }

    #[graphql(name = "updatedAt")]
    async fn updated_at(&self) -> DateTime<Utc> {
        self.updated_at
    }

    #[graphql(name = "deletedAt")]
    async fn deleted_at(&self) -> Option<DateTime<Utc>> {
        self.deleted_at
    }

    /// User relationship (lazy-loaded)
    async fn user(
        &self,
        ctx: &async_graphql::Context<'_>,
    ) -> GqlResult<crate::models::user::Model> {
        let db = get_db_from_context(ctx)?;
        let user = crate::models::user::Entity::find_by_id(self.user_id)
            .filter(crate::models::user::Column::DeletedAt.is_null())
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

        Ok(user)
    }

    /// Full formatted address
    #[graphql(name = "fullAddress")]
    async fn full_address(&self) -> String {
        let mut parts = vec![self.address_line1.clone()];

        if let Some(line2) = &self.address_line2 {
            if !line2.is_empty() {
                parts.push(line2.clone());
            }
        }

        parts.push(format!(
            "{}, {} {}",
            self.city, self.state_province, self.postal_code
        ));
        parts.push(self.country.clone());

        parts.join("\n")
    }
}
