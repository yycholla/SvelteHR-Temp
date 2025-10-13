//! Notification domain model with GraphQL integration
//!
//! Represents system notifications for users with categorization and resource linking.

use async_graphql::{Object, Result as GqlResult};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Notification type enumeration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "notification_type", rename_all = "lowercase")]
pub enum NotificationType {
    Info,
    Warning,
    Success,
    Error,
    #[sqlx(rename = "task_assigned")]
    TaskAssigned,
    #[sqlx(rename = "task_completed")]
    TaskCompleted,
    #[sqlx(rename = "leave_approved")]
    LeaveApproved,
    #[sqlx(rename = "leave_rejected")]
    LeaveRejected,
    #[sqlx(rename = "review_scheduled")]
    ReviewScheduled,
    #[sqlx(rename = "event_reminder")]
    EventReminder,
}

impl NotificationType {
    pub fn as_str(&self) -> &str {
        match self {
            NotificationType::Info => "info",
            NotificationType::Warning => "warning",
            NotificationType::Success => "success",
            NotificationType::Error => "error",
            NotificationType::TaskAssigned => "task_assigned",
            NotificationType::TaskCompleted => "task_completed",
            NotificationType::LeaveApproved => "leave_approved",
            NotificationType::LeaveRejected => "leave_rejected",
            NotificationType::ReviewScheduled => "review_scheduled",
            NotificationType::EventReminder => "event_reminder",
        }
    }
}

/// GraphQL scalar for NotificationType
#[async_graphql::Scalar]
impl async_graphql::ScalarType for NotificationType {
    fn parse(value: async_graphql::Value) -> async_graphql::InputValueResult<Self> {
        if let async_graphql::Value::String(s) = value {
            match s.as_str() {
                "info" => Ok(NotificationType::Info),
                "warning" => Ok(NotificationType::Warning),
                "success" => Ok(NotificationType::Success),
                "error" => Ok(NotificationType::Error),
                "task_assigned" => Ok(NotificationType::TaskAssigned),
                "task_completed" => Ok(NotificationType::TaskCompleted),
                "leave_approved" => Ok(NotificationType::LeaveApproved),
                "leave_rejected" => Ok(NotificationType::LeaveRejected),
                "review_scheduled" => Ok(NotificationType::ReviewScheduled),
                "event_reminder" => Ok(NotificationType::EventReminder),
                _ => Err(async_graphql::InputValueError::custom(
                    "Invalid notification type",
                )),
            }
        } else {
            Err(async_graphql::InputValueError::custom(
                "Notification type must be a string",
            ))
        }
    }

    fn to_value(&self) -> async_graphql::Value {
        async_graphql::Value::String(self.as_str().to_string())
    }
}

/// Notification category enumeration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "notification_category", rename_all = "lowercase")]
pub enum NotificationCategory {
    System,
    Task,
    Leave,
    Performance,
    Event,
    Document,
    Compliance,
}

impl NotificationCategory {
    pub fn as_str(&self) -> &str {
        match self {
            NotificationCategory::System => "system",
            NotificationCategory::Task => "task",
            NotificationCategory::Leave => "leave",
            NotificationCategory::Performance => "performance",
            NotificationCategory::Event => "event",
            NotificationCategory::Document => "document",
            NotificationCategory::Compliance => "compliance",
        }
    }
}

/// GraphQL scalar for NotificationCategory
#[async_graphql::Scalar]
impl async_graphql::ScalarType for NotificationCategory {
    fn parse(value: async_graphql::Value) -> async_graphql::InputValueResult<Self> {
        if let async_graphql::Value::String(s) = value {
            match s.as_str() {
                "system" => Ok(NotificationCategory::System),
                "task" => Ok(NotificationCategory::Task),
                "leave" => Ok(NotificationCategory::Leave),
                "performance" => Ok(NotificationCategory::Performance),
                "event" => Ok(NotificationCategory::Event),
                "document" => Ok(NotificationCategory::Document),
                "compliance" => Ok(NotificationCategory::Compliance),
                _ => Err(async_graphql::InputValueError::custom(
                    "Invalid notification category",
                )),
            }
        } else {
            Err(async_graphql::InputValueError::custom(
                "Notification category must be a string",
            ))
        }
    }

    fn to_value(&self) -> async_graphql::Value {
        async_graphql::Value::String(self.as_str().to_string())
    }
}

/// Notification resource type enumeration (for related resources in notifications)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "resource_type", rename_all = "lowercase")]
pub enum NotificationResourceType {
    Task,
    #[sqlx(rename = "leave_request")]
    LeaveRequest,
    #[sqlx(rename = "performance_review")]
    PerformanceReview,
    Event,
    User,
    Department,
    Document,
}

impl NotificationResourceType {
    pub fn as_str(&self) -> &str {
        match self {
            NotificationResourceType::Task => "task",
            NotificationResourceType::LeaveRequest => "leave_request",
            NotificationResourceType::PerformanceReview => "performance_review",
            NotificationResourceType::Event => "event",
            NotificationResourceType::User => "user",
            NotificationResourceType::Department => "department",
            NotificationResourceType::Document => "document",
        }
    }
}

/// GraphQL scalar for NotificationResourceType
#[async_graphql::Scalar]
impl async_graphql::ScalarType for NotificationResourceType {
    fn parse(value: async_graphql::Value) -> async_graphql::InputValueResult<Self> {
        if let async_graphql::Value::String(s) = value {
            match s.as_str() {
                "task" => Ok(NotificationResourceType::Task),
                "leave_request" => Ok(NotificationResourceType::LeaveRequest),
                "performance_review" => Ok(NotificationResourceType::PerformanceReview),
                "event" => Ok(NotificationResourceType::Event),
                "user" => Ok(NotificationResourceType::User),
                "department" => Ok(NotificationResourceType::Department),
                "document" => Ok(NotificationResourceType::Document),
                _ => Err(async_graphql::InputValueError::custom(
                    "Invalid notification resource type",
                )),
            }
        } else {
            Err(async_graphql::InputValueError::custom(
                "Notification resource type must be a string",
            ))
        }
    }

    fn to_value(&self) -> async_graphql::Value {
        async_graphql::Value::String(self.as_str().to_string())
    }
}

/// Notification model - maps to hr_public.notifications table
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Notification {
    pub id: Uuid,
    pub recipient_id: Uuid,
    #[sqlx(rename = "type")]
    pub notification_type: NotificationType,
    pub category: NotificationCategory,
    pub title: String,
    pub message: String,
    pub related_resource_type: Option<NotificationResourceType>,
    pub related_resource_id: Option<Uuid>,
    pub read_status: bool,
    pub delivered_at: DateTime<Utc>,
    pub read_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

/// GraphQL Object implementation for Notification
#[Object]
impl Notification {
    /// Unique notification identifier
    async fn id(&self) -> Uuid {
        self.id
    }

    /// Recipient user ID (foreign key)
    async fn recipient_id(&self) -> Uuid {
        self.recipient_id
    }

    /// Notification type (info, warning, success, error, etc.)
    #[graphql(name = "type")]
    async fn notification_type(&self) -> NotificationType {
        self.notification_type
    }

    /// Notification category (system, task, leave, etc.)
    async fn category(&self) -> NotificationCategory {
        self.category
    }

    /// Notification title
    async fn title(&self) -> &str {
        &self.title
    }

    /// Notification message content
    async fn message(&self) -> &str {
        &self.message
    }

    /// Related resource type (if applicable)
    async fn related_resource_type(&self) -> Option<NotificationResourceType> {
        self.related_resource_type
    }

    /// Related resource ID (if applicable)
    async fn related_resource_id(&self) -> Option<Uuid> {
        self.related_resource_id
    }

    /// Whether the notification has been read
    async fn read_status(&self) -> bool {
        self.read_status
    }

    /// Timestamp when notification was delivered
    async fn delivered_at(&self) -> DateTime<Utc> {
        self.delivered_at
    }

    /// Timestamp when notification was read (if read)
    async fn read_at(&self) -> Option<DateTime<Utc>> {
        self.read_at
    }

    /// Record creation timestamp
    async fn created_at(&self) -> DateTime<Utc> {
        self.created_at
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_notification_type_serialization() {
        assert_eq!(NotificationType::Info.as_str(), "info");
        assert_eq!(NotificationType::TaskAssigned.as_str(), "task_assigned");
        assert_eq!(NotificationType::LeaveApproved.as_str(), "leave_approved");
    }

    #[test]
    fn test_notification_category_serialization() {
        assert_eq!(NotificationCategory::System.as_str(), "system");
        assert_eq!(NotificationCategory::Task.as_str(), "task");
        assert_eq!(NotificationCategory::Event.as_str(), "event");
    }

    #[test]
    fn test_notification_resource_type_serialization() {
        assert_eq!(NotificationResourceType::Task.as_str(), "task");
        assert_eq!(NotificationResourceType::LeaveRequest.as_str(), "leave_request");
        assert_eq!(NotificationResourceType::Event.as_str(), "event");
    }
}
