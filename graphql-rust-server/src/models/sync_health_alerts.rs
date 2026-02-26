//! Sync Health Alerts Model
//!
//! Alert system for degraded sync health and failures

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(schema_name = "hr_public", table_name = "sync_health_alerts")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: Uuid,

    pub alert_type: String,
    pub severity: String,
    pub message: String,

    pub triggered_at: DateTimeWithTimeZone,
    pub resolved_at: Option<DateTimeWithTimeZone>,

    pub entity_type: Option<String>,
    #[sea_orm(column_name = "metadata")]
    pub metric_snapshot: Option<Json>,
    pub notified_users: Option<Vec<Uuid>>,

    pub created_at: DateTimeWithTimeZone,
    pub updated_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

/// Alert type enum
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AlertType {
    HighErrorRate,
    SlowSync,
    ConnectionDown,
    ApiQuotaLow,
    ConsecutiveFailures,
    SyncTimeout,
    DataValidationFailure,
}

impl AlertType {
    pub fn as_str(&self) -> &str {
        match self {
            Self::HighErrorRate => "high_error_rate",
            Self::SlowSync => "slow_sync",
            Self::ConnectionDown => "connection_down",
            Self::ApiQuotaLow => "api_quota_low",
            Self::ConsecutiveFailures => "consecutive_failures",
            Self::SyncTimeout => "sync_timeout",
            Self::DataValidationFailure => "data_validation_failure",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "high_error_rate" => Some(Self::HighErrorRate),
            "slow_sync" => Some(Self::SlowSync),
            "connection_down" => Some(Self::ConnectionDown),
            "api_quota_low" => Some(Self::ApiQuotaLow),
            "consecutive_failures" => Some(Self::ConsecutiveFailures),
            "sync_timeout" => Some(Self::SyncTimeout),
            "data_validation_failure" => Some(Self::DataValidationFailure),
            _ => None,
        }
    }
}

/// Alert severity enum
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AlertSeverity {
    Info,
    Warning,
    Error,
    Critical,
}

impl AlertSeverity {
    pub fn as_str(&self) -> &str {
        match self {
            Self::Info => "info",
            Self::Warning => "warning",
            Self::Error => "error",
            Self::Critical => "critical",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "info" => Some(Self::Info),
            "warning" => Some(Self::Warning),
            "error" => Some(Self::Error),
            "critical" => Some(Self::Critical),
            _ => None,
        }
    }
}
