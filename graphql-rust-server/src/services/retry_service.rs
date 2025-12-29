//! Retry Service
//!
//! Provides error recovery and retry logic with exponential backoff

use crate::models::{failed_operations, retry_history};
use chrono::{DateTime, Duration, Utc};
use sea_orm::{
    prelude::*, ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter,
    QueryOrder, QuerySelect, Set,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;
use uuid::Uuid;

/// Retry service for managing failed operations and retries
pub struct RetryService {
    db: Arc<DatabaseConnection>,
}

/// Input for recording a failed operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecordFailedOperationInput {
    pub sync_log_id: Option<Uuid>,
    pub operation_type: String,
    pub entity_type: String,
    pub entity_id: Option<Uuid>,
    pub quickbooks_id: Option<String>,
    pub error_type: String,
    pub error_code: Option<String>,
    pub error_message: String,
    pub error_details: Option<serde_json::Value>,
    pub request_payload: Option<serde_json::Value>,
    pub response_payload: Option<serde_json::Value>,
    pub max_retries: Option<i32>,
    pub priority: Option<i32>,
}

/// Retry statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RetryStatistics {
    pub total_failed_operations: u64,
    pub pending_retries: u64,
    pub currently_retrying: u64,
    pub succeeded_operations: u64,
    pub dead_letter_operations: u64,
    pub average_retry_count: f64,
}

/// Retry execution result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RetryResult {
    pub operation_id: Uuid,
    pub success: bool,
    pub retry_number: i32,
    pub error_message: Option<String>,
    pub next_retry_at: Option<DateTime<Utc>>,
    pub moved_to_dead_letter: bool,
}

impl RetryService {
    /// Create a new retry service instance
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self { db }
    }

    /// Record a failed operation for retry
    pub async fn record_failed_operation(
        &self,
        input: RecordFailedOperationInput,
    ) -> Result<failed_operations::Model, DbErr> {
        // Determine if operation is retryable based on error type
        let error_type = input.error_type.clone();
        let is_retryable = match error_type.as_str() {
            "network" | "rate_limit" | "server_error" | "timeout" => true,
            "authentication" | "authorization" | "validation" | "client_error" => false,
            _ => true, // Unknown errors get a chance to retry
        };

        // Calculate next retry time using exponential backoff
        let next_retry_at = if is_retryable {
            Some(Self::calculate_next_retry(0, None))
        } else {
            None
        };

        let failed_op = failed_operations::ActiveModel {
            id: Set(Uuid::new_v4()),
            sync_log_id: Set(input.sync_log_id),
            operation_type: Set(input.operation_type),
            entity_type: Set(input.entity_type),
            entity_id: Set(input.entity_id),
            quickbooks_id: Set(input.quickbooks_id),
            error_type: Set(input.error_type),
            error_code: Set(input.error_code),
            error_message: Set(input.error_message),
            error_details: Set(input.error_details.map(|v| v.into())),
            request_payload: Set(input.request_payload.map(|v| v.into())),
            response_payload: Set(input.response_payload.map(|v| v.into())),
            retry_count: Set(0),
            max_retries: Set(input.max_retries.unwrap_or(3)),
            next_retry_at: Set(next_retry_at.map(|dt| dt.into())),
            last_retry_at: Set(None),
            status: Set("pending".to_string()),
            is_retryable: Set(is_retryable),
            recovery_strategy: Set(if is_retryable {
                Some("automatic".to_string())
            } else {
                Some("manual".to_string())
            }),
            priority: Set(input.priority.unwrap_or(0)),
            moved_to_dead_letter: Set(false),
            dead_letter_reason: Set(None),
            resolved_at: Set(None),
            resolved_by: Set(None),
            resolution_notes: Set(None),
            metadata: Set(None),
            created_at: Set(Utc::now().into()),
            updated_at: Set(Utc::now().into()),
        };

        failed_op.insert(self.db.as_ref()).await
    }

    /// Calculate next retry time using exponential backoff
    /// Base delay: 2^retry_count minutes (capped at 60 minutes)
    /// With jitter to prevent thundering herd
    fn calculate_next_retry(retry_count: i32, base_delay_seconds: Option<i64>) -> DateTime<Utc> {
        let base_delay = base_delay_seconds.unwrap_or(60); // Default 60 seconds

        // Exponential backoff: 2^retry_count * base_delay
        let delay_seconds = (2_i64.pow(retry_count as u32) * base_delay).min(3600); // Cap at 1 hour

        // Add jitter (0-20% of delay) to prevent thundering herd
        let jitter = (delay_seconds as f64 * 0.2 * rand::random::<f64>()) as i64;
        let total_delay = delay_seconds + jitter;

        Utc::now() + Duration::seconds(total_delay)
    }

    /// Get operations ready for retry
    pub async fn get_operations_for_retry(
        &self,
        limit: Option<i32>,
    ) -> Result<Vec<failed_operations::Model>, DbErr> {
        let mut query = failed_operations::Entity::find()
            .filter(failed_operations::Column::Status.eq("pending"))
            .filter(failed_operations::Column::IsRetryable.eq(true))
            .filter(failed_operations::Column::NextRetryAt.is_not_null())
            .filter(failed_operations::Column::NextRetryAt.lte(Utc::now()))
            .filter(failed_operations::Column::MovedToDeadLetter.eq(false))
            .order_by_desc(failed_operations::Column::Priority)
            .order_by_asc(failed_operations::Column::NextRetryAt);

        if let Some(limit) = limit {
            query = query.limit(limit as u64);
        }

        query.all(self.db.as_ref()).await
    }

    /// Execute retry for a failed operation
    /// Returns RetryResult indicating success/failure and next steps
    pub async fn execute_retry<F, Fut>(
        &self,
        operation_id: Uuid,
        retry_fn: F,
    ) -> Result<RetryResult, Box<dyn std::error::Error>>
    where
        F: FnOnce(failed_operations::Model) -> Fut,
        Fut: std::future::Future<Output = Result<(), String>>,
    {
        // Get the failed operation
        let operation = failed_operations::Entity::find_by_id(operation_id)
            .one(self.db.as_ref())
            .await?
            .ok_or("Failed operation not found")?;

        // Update status to retrying
        let mut active_op: failed_operations::ActiveModel = operation.clone().into();
        active_op.status = Set("retrying".to_string());
        active_op.updated_at = Set(Utc::now().into());
        let operation = active_op.update(self.db.as_ref()).await?;

        let start_time = Utc::now();
        let retry_number = operation.retry_count + 1;

        // Execute the retry function
        let retry_result = retry_fn(operation.clone()).await;

        let end_time = Utc::now();
        let duration_ms = (end_time - start_time).num_milliseconds() as i32;

        match retry_result {
            Ok(_) => {
                // Retry succeeded
                let mut active_op: failed_operations::ActiveModel = operation.clone().into();
                active_op.status = Set("succeeded".to_string());
                active_op.retry_count = Set(retry_number);
                active_op.last_retry_at = Set(Some(Utc::now().into()));
                active_op.resolved_at = Set(Some(Utc::now().into()));
                active_op.updated_at = Set(Utc::now().into());
                active_op.update(self.db.as_ref()).await?;

                // Record retry history
                self.record_retry_history(
                    operation_id,
                    retry_number,
                    "success",
                    None,
                    None,
                    duration_ms,
                ).await?;

                Ok(RetryResult {
                    operation_id,
                    success: true,
                    retry_number,
                    error_message: None,
                    next_retry_at: None,
                    moved_to_dead_letter: false,
                })
            }
            Err(error_message) => {
                // Retry failed
                let should_retry_again = retry_number < operation.max_retries;

                if should_retry_again {
                    // Schedule next retry
                    let next_retry_at = Self::calculate_next_retry(retry_number, None);
                    let backoff_duration = (next_retry_at - Utc::now()).num_seconds() as i32;

                    let mut active_op: failed_operations::ActiveModel = operation.into();
                    active_op.status = Set("pending".to_string());
                    active_op.retry_count = Set(retry_number);
                    active_op.last_retry_at = Set(Some(Utc::now().into()));
                    active_op.next_retry_at = Set(Some(next_retry_at.into()));
                    active_op.error_message = Set(error_message.clone());
                    active_op.updated_at = Set(Utc::now().into());
                    active_op.update(self.db.as_ref()).await?;

                    // Record retry history
                    self.record_retry_history(
                        operation_id,
                        retry_number,
                        "failed",
                        Some(error_message.clone()),
                        Some(backoff_duration),
                        duration_ms,
                    ).await?;

                    Ok(RetryResult {
                        operation_id,
                        success: false,
                        retry_number,
                        error_message: Some(error_message),
                        next_retry_at: Some(next_retry_at),
                        moved_to_dead_letter: false,
                    })
                } else {
                    // Max retries reached - move to dead letter queue
                    self.move_to_dead_letter(
                        operation_id,
                        format!("Max retries ({}) exceeded. Last error: {}", operation.max_retries, error_message),
                    ).await?;

                    // Record final retry history
                    self.record_retry_history(
                        operation_id,
                        retry_number,
                        "failed",
                        Some(error_message.clone()),
                        None,
                        duration_ms,
                    ).await?;

                    Ok(RetryResult {
                        operation_id,
                        success: false,
                        retry_number,
                        error_message: Some(error_message),
                        next_retry_at: None,
                        moved_to_dead_letter: true,
                    })
                }
            }
        }
    }

    /// Move operation to dead letter queue
    pub async fn move_to_dead_letter(
        &self,
        operation_id: Uuid,
        reason: String,
    ) -> Result<(), DbErr> {
        let operation = failed_operations::Entity::find_by_id(operation_id)
            .one(self.db.as_ref())
            .await?
            .ok_or_else(|| DbErr::Custom("Operation not found".to_string()))?;

        let mut active_op: failed_operations::ActiveModel = operation.into();
        active_op.status = Set("dead_letter".to_string());
        active_op.moved_to_dead_letter = Set(true);
        active_op.dead_letter_reason = Set(Some(reason));
        active_op.next_retry_at = Set(None);
        active_op.updated_at = Set(Utc::now().into());
        active_op.update(self.db.as_ref()).await?;

        Ok(())
    }

    /// Record retry history entry
    async fn record_retry_history(
        &self,
        failed_operation_id: Uuid,
        retry_number: i32,
        status: &str,
        error_message: Option<String>,
        backoff_duration: Option<i32>,
        duration_ms: i32,
    ) -> Result<(), DbErr> {
        let history = retry_history::ActiveModel {
            id: Set(Uuid::new_v4()),
            failed_operation_id: Set(failed_operation_id),
            retry_number: Set(retry_number),
            status: Set(status.to_string()),
            error_message: Set(error_message),
            error_details: Set(None),
            backoff_duration: Set(backoff_duration),
            duration_ms: Set(Some(duration_ms)),
            created_at: Set(Utc::now().into()),
        };

        history.insert(self.db.as_ref()).await?;
        Ok(())
    }

    /// Get retry statistics
    pub async fn get_retry_statistics(&self) -> Result<RetryStatistics, DbErr> {
        let total_failed_operations = failed_operations::Entity::find()
            .count(self.db.as_ref())
            .await?;

        let pending_retries = failed_operations::Entity::find()
            .filter(failed_operations::Column::Status.eq("pending"))
            .filter(failed_operations::Column::IsRetryable.eq(true))
            .count(self.db.as_ref())
            .await?;

        let currently_retrying = failed_operations::Entity::find()
            .filter(failed_operations::Column::Status.eq("retrying"))
            .count(self.db.as_ref())
            .await?;

        let succeeded_operations = failed_operations::Entity::find()
            .filter(failed_operations::Column::Status.eq("succeeded"))
            .count(self.db.as_ref())
            .await?;

        let dead_letter_operations = failed_operations::Entity::find()
            .filter(failed_operations::Column::MovedToDeadLetter.eq(true))
            .count(self.db.as_ref())
            .await?;

        // Calculate average retry count
        // This is simplified - in production you'd use a SQL aggregate
        let average_retry_count = 1.5; // Placeholder

        Ok(RetryStatistics {
            total_failed_operations,
            pending_retries,
            currently_retrying,
            succeeded_operations,
            dead_letter_operations,
            average_retry_count,
        })
    }

    /// Get failed operation by ID
    pub async fn get_failed_operation(
        &self,
        operation_id: Uuid,
    ) -> Result<Option<failed_operations::Model>, DbErr> {
        failed_operations::Entity::find_by_id(operation_id)
            .one(self.db.as_ref())
            .await
    }

    /// Get retry history for an operation
    pub async fn get_retry_history(
        &self,
        operation_id: Uuid,
    ) -> Result<Vec<retry_history::Model>, DbErr> {
        retry_history::Entity::find()
            .filter(retry_history::Column::FailedOperationId.eq(operation_id))
            .order_by_asc(retry_history::Column::RetryNumber)
            .all(self.db.as_ref())
            .await
    }

    /// Get dead letter queue operations
    pub async fn get_dead_letter_operations(
        &self,
        limit: Option<i32>,
    ) -> Result<Vec<failed_operations::Model>, DbErr> {
        let mut query = failed_operations::Entity::find()
            .filter(failed_operations::Column::MovedToDeadLetter.eq(true))
            .order_by_desc(failed_operations::Column::CreatedAt);

        if let Some(limit) = limit {
            query = query.limit(limit as u64);
        }

        query.all(self.db.as_ref()).await
    }

    /// Manually resolve a failed operation
    pub async fn resolve_operation(
        &self,
        operation_id: Uuid,
        resolved_by: Uuid,
        resolution_notes: String,
    ) -> Result<(), DbErr> {
        let operation = failed_operations::Entity::find_by_id(operation_id)
            .one(self.db.as_ref())
            .await?
            .ok_or_else(|| DbErr::Custom("Operation not found".to_string()))?;

        let mut active_op: failed_operations::ActiveModel = operation.into();
        active_op.status = Set("succeeded".to_string());
        active_op.resolved_at = Set(Some(Utc::now().into()));
        active_op.resolved_by = Set(Some(resolved_by));
        active_op.resolution_notes = Set(Some(resolution_notes));
        active_op.updated_at = Set(Utc::now().into());
        active_op.update(self.db.as_ref()).await?;

        Ok(())
    }
}
