//! Compensation Band Model
//!
//! Maps to hr_public.compensation_bands table

use async_graphql::{InputObject, Object};
use chrono::{DateTime, Utc};
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// SeaORM Compensation band entity
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "compensation_bands")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub band_name: String,
    pub min_salary: f64,
    pub max_salary: f64,
    pub currency: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

/// SQLx-compatible CompensationBand struct for backward compatibility during migration
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CompensationBand {
    pub id: Uuid,
    pub band_name: String,
    pub min_salary: f64,
    pub max_salary: f64,
    pub currency: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Input for creating a new compensation band
#[derive(Debug, Clone, InputObject)]
pub struct CreateCompensationBandInput {
    #[graphql(name = "bandName")]
    pub band_name: String,
    #[graphql(name = "minSalary")]
    pub min_salary: f64,
    #[graphql(name = "maxSalary")]
    pub max_salary: f64,
    pub currency: String,
}

/// Input for updating a compensation band
#[derive(Debug, Clone, InputObject)]
pub struct UpdateCompensationBandInput {
    #[graphql(name = "bandName")]
    pub band_name: Option<String>,
    #[graphql(name = "minSalary")]
    pub min_salary: Option<f64>,
    #[graphql(name = "maxSalary")]
    pub max_salary: Option<f64>,
    pub currency: Option<String>,
}

/// GraphQL Object implementation with camelCase field names
#[Object]
impl Model {
    async fn id(&self) -> Uuid {
        self.id
    }

    #[graphql(name = "bandName")]
    async fn band_name(&self) -> &str {
        &self.band_name
    }

    #[graphql(name = "minSalary")]
    async fn min_salary(&self) -> f64 {
        self.min_salary
    }

    #[graphql(name = "maxSalary")]
    async fn max_salary(&self) -> f64 {
        self.max_salary
    }

    async fn currency(&self) -> &str {
        &self.currency
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
