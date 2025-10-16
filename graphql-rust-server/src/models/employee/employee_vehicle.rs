//! Employee Vehicle Model
//!
//! Maps to hr_public.employee_vehicles table

use async_graphql::{InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use sea_orm::{entity::prelude::*, QueryFilter};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{database::get_db_from_context, error::AppError};

/// Employee vehicle registration
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "employee_vehicles")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub employee_id: Uuid,
    pub make: String,
    pub model: String,
    pub year: i32,
    pub license_plate: String,
    pub color: Option<String>,
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

/// Input for creating a new employee vehicle
#[derive(Debug, Clone, InputObject)]
pub struct CreateEmployeeVehicleInput {
    #[graphql(name = "employeeId")]
    pub employee_id: Uuid,
    pub make: String,
    pub model: String,
    pub year: i32,
    #[graphql(name = "licensePlate")]
    pub license_plate: String,
    pub color: Option<String>,
}

/// Input for updating an employee vehicle
#[derive(Debug, Clone, InputObject)]
pub struct UpdateEmployeeVehicleInput {
    pub make: Option<String>,
    pub model: Option<String>,
    pub year: Option<i32>,
    #[graphql(name = "licensePlate")]
    pub license_plate: Option<String>,
    pub color: Option<String>,
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

    async fn make(&self) -> &str {
        &self.make
    }

    async fn model(&self) -> &str {
        &self.model
    }

    async fn year(&self) -> i32 {
        self.year
    }

    #[graphql(name = "licensePlate")]
    async fn license_plate(&self) -> &str {
        &self.license_plate
    }

    async fn color(&self) -> Option<&str> {
        self.color.as_deref()
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
            .one(&db)
            .await?
            .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

        Ok(user)
    }
}
