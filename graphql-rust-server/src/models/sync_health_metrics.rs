//! Sync Health Metrics Model
//!
//! Time-series data for tracking sync performance and health metrics

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(schema_name = "hr_public", table_name = "sync_health_metrics")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: Uuid,

    pub recorded_at: DateTimeWithTimeZone,

    pub sync_duration_ms: Option<i32>,
    pub records_processed: Option<i32>,
    pub errors_count: i32,
    pub api_calls_used: Option<i32>,

    pub connection_status: String,
    pub entity_type: Option<String>,
    pub sync_direction: Option<String>,
    pub success_rate: Option<f64>,

    pub metadata: Option<Json>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

/// Health status enum
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ConnectionStatus {
    Healthy,
    Degraded,
    Down,
    Unknown,
}

impl ConnectionStatus {
    pub fn as_str(&self) -> &str {
        match self {
            Self::Healthy => "healthy",
            Self::Degraded => "degraded",
            Self::Down => "down",
            Self::Unknown => "unknown",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "healthy" => Self::Healthy,
            "degraded" => Self::Degraded,
            "down" => Self::Down,
            _ => Self::Unknown,
        }
    }
}
