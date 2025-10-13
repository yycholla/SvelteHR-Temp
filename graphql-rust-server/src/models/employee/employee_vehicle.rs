//! Employee Vehicle Model
//!
//! Maps to hr_public.employee_vehicles table

use async_graphql::{InputObject, Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

/// Employee vehicle registration
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct EmployeeVehicle {
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
impl EmployeeVehicle {
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
        let pool = ctx.data::<PgPool>()?;
        let user = sqlx::query_as::<_, crate::models::User>(
            r#"
            SELECT id, email, first_name, last_name, full_name, phone,
                   department_id, manager_id, hire_date, termination_date,
                   status, created_at, updated_at, deleted_at
            FROM hr_public.users
            WHERE id = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(self.employee_id)
        .fetch_one(pool)
        .await?;

        Ok(user)
    }
}
