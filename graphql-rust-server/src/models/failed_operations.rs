//! Failed Operations Model

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(schema_name = "hr_public", table_name = "failed_operations")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: Uuid,
    pub sync_log_id: Option<Uuid>,
    pub operation_type: String,
    pub entity_type: String,
    pub entity_id: Option<Uuid>,
    pub quickbooks_id: Option<String>,
    pub error_type: String,
    pub error_code: Option<String>,
    pub error_message: String,
    pub error_details: Option<Json>,
    pub request_payload: Option<Json>,
    pub response_payload: Option<Json>,
    pub retry_count: i32,
    pub max_retries: i32,
    pub next_retry_at: Option<DateTimeWithTimeZone>,
    pub last_retry_at: Option<DateTimeWithTimeZone>,
    pub status: String,
    pub is_retryable: bool,
    pub recovery_strategy: Option<String>,
    pub priority: i32,
    pub moved_to_dead_letter: bool,
    pub dead_letter_reason: Option<String>,
    pub resolved_at: Option<DateTimeWithTimeZone>,
    pub resolved_by: Option<Uuid>,
    pub resolution_notes: Option<String>,
    pub metadata: Option<Json>,
    pub created_at: DateTimeWithTimeZone,
    pub updated_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::intuit_sync_log::Entity",
        from = "Column::SyncLogId",
        to = "super::intuit_sync_log::Column::Id"
    )]
    IntuitSyncLog,
}

impl Related<super::intuit_sync_log::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::IntuitSyncLog.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

/// Failed operation status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FailedOperationStatus {
    Pending,
    Retrying,
    Succeeded,
    Failed,
    DeadLetter,
    Cancelled,
}

impl FailedOperationStatus {
    pub fn as_str(&self) -> &str {
        match self {
            FailedOperationStatus::Pending => "pending",
            FailedOperationStatus::Retrying => "retrying",
            FailedOperationStatus::Succeeded => "succeeded",
            FailedOperationStatus::Failed => "failed",
            FailedOperationStatus::DeadLetter => "dead_letter",
            FailedOperationStatus::Cancelled => "cancelled",
        }
    }
}

/// Error type classification
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ErrorType {
    Network,
    Authentication,
    Authorization,
    Validation,
    RateLimit,
    ServerError,
    ClientError,
    Timeout,
    Unknown,
}

impl ErrorType {
    pub fn as_str(&self) -> &str {
        match self {
            ErrorType::Network => "network",
            ErrorType::Authentication => "authentication",
            ErrorType::Authorization => "authorization",
            ErrorType::Validation => "validation",
            ErrorType::RateLimit => "rate_limit",
            ErrorType::ServerError => "server_error",
            ErrorType::ClientError => "client_error",
            ErrorType::Timeout => "timeout",
            ErrorType::Unknown => "unknown",
        }
    }

    /// Determine if error type is retryable by default
    pub fn is_retryable(&self) -> bool {
        match self {
            ErrorType::Network => true,
            ErrorType::Authentication => false, // Usually requires manual intervention
            ErrorType::Authorization => false,  // Usually requires manual intervention
            ErrorType::Validation => false,     // Requires data correction
            ErrorType::RateLimit => true,       // Can retry after backoff
            ErrorType::ServerError => true,     // Server might recover
            ErrorType::ClientError => false,    // Client issue, won't change on retry
            ErrorType::Timeout => true,         // Can retry
            ErrorType::Unknown => true,         // Give it a chance
        }
    }
}

/// Recovery strategy
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RecoveryStrategy {
    Automatic,
    Manual,
    Ignore,
    Compensate,
}

impl RecoveryStrategy {
    pub fn as_str(&self) -> &str {
        match self {
            RecoveryStrategy::Automatic => "automatic",
            RecoveryStrategy::Manual => "manual",
            RecoveryStrategy::Ignore => "ignore",
            RecoveryStrategy::Compensate => "compensate",
        }
    }
}
