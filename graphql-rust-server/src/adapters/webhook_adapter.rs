use base64::{engine::general_purpose, Engine as _};
use hmac::{Hmac, Mac};
use serde::Deserialize;
use sha2::Sha256;
use std::sync::Arc;

use crate::application::SyncService;
use crate::domain::sync::{EntityType, QuickBooksId, SyncError, SyncMode};
use crate::ports::{HealthPort, QuickBooksPort, SyncRepositoryPort};

type HmacSha256 = Hmac<Sha256>;

/// Webhook event representing a change in QuickBooks
#[derive(Debug, Clone)]
pub struct WebhookEvent {
    pub entity_type: EntityType,
    pub entity_id: QuickBooksId,
    pub operation: WebhookOperation,
    pub realm_id: String,
}

/// Operation type from webhook
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum WebhookOperation {
    Create,
    Update,
    Delete,
    Merge,
}

/// Webhook payload from QuickBooks (Legacy format)
#[derive(Debug, Clone, Deserialize)]
pub struct LegacyWebhookPayload {
    #[serde(rename = "eventNotifications")]
    pub event_notifications: Vec<EventNotification>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct EventNotification {
    #[serde(rename = "realmId")]
    pub realm_id: String,
    #[serde(rename = "dataChangeEvent")]
    pub data_change_event: DataChangeEvent,
}

#[derive(Debug, Clone, Deserialize)]
pub struct DataChangeEvent {
    pub entities: Vec<EntityChange>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct EntityChange {
    pub name: String,
    pub id: String,
    pub operation: String,
    #[serde(rename = "lastUpdated")]
    pub last_updated: Option<String>,
}

/// CloudEvents format webhook payload
#[derive(Debug, Clone, Deserialize)]
pub struct CloudEvent {
    pub id: String,
    #[serde(rename = "type")]
    pub event_type: String,
    pub data: serde_json::Value,
}

/// Webhook adapter for processing QuickBooks webhooks
pub struct WebhookAdapter<Q, R, H>
where
    Q: QuickBooksPort,
    R: SyncRepositoryPort,
    H: HealthPort,
{
    sync_service: Arc<SyncService<Q, R, H>>,
}

impl<Q, R, H> WebhookAdapter<Q, R, H>
where
    Q: QuickBooksPort,
    R: SyncRepositoryPort,
    H: HealthPort,
{
    pub fn new(sync_service: Arc<SyncService<Q, R, H>>) -> Self {
        Self { sync_service }
    }

    /// Verify webhook signature using HMAC-SHA256
    pub fn verify_signature(
        &self,
        payload: &str,
        signature: &str,
        verifier_token: &str,
    ) -> Result<bool, SyncError> {
        // Create HMAC instance
        let mut mac = HmacSha256::new_from_slice(verifier_token.as_bytes())
            .map_err(|_| SyncError::InvalidWebhookSignature)?;

        // Update with payload
        mac.update(payload.as_bytes());

        // QuickBooks sends signature as base64-encoded HMAC-SHA256
        let expected_signature = general_purpose::STANDARD.encode(mac.finalize().into_bytes());

        Ok(expected_signature == signature)
    }

    /// Parse webhook payload from JSON string
    pub fn parse_payload(&self, payload: &str) -> Result<Vec<WebhookEvent>, SyncError> {
        // Try CloudEvents format first (array)
        if payload.trim_start().starts_with('[') {
            let cloud_events: Vec<CloudEvent> = serde_json::from_str(payload)
                .map_err(|e| SyncError::WebhookParseError {
                    message: e.to_string(),
                })?;

            Ok(cloud_events
                .into_iter()
                .filter_map(|e| self.parse_cloud_event(e))
                .collect())
        } else {
            // Legacy format (object)
            let legacy: LegacyWebhookPayload = serde_json::from_str(payload)
                .map_err(|e| SyncError::WebhookParseError {
                    message: e.to_string(),
                })?;

            Ok(legacy
                .event_notifications
                .into_iter()
                .flat_map(|n| {
                    let realm_id = n.realm_id.clone();
                    n.data_change_event
                        .entities
                        .into_iter()
                        .filter_map(move |e| self.parse_entity_change(realm_id.clone(), e))
                })
                .collect())
        }
    }

    /// Parse a CloudEvent into a WebhookEvent
    fn parse_cloud_event(&self, event: CloudEvent) -> Option<WebhookEvent> {
        // Parse entity type from event type (e.g., "com.intuit.quickbooks.employee.updated")
        let entity_type = if event.event_type.contains("employee") {
            EntityType::Employee
        } else if event.event_type.contains("department") {
            EntityType::Department
        } else {
            return None; // Unsupported entity type
        };

        // Parse operation
        let operation = if event.event_type.ends_with(".created") {
            WebhookOperation::Create
        } else if event.event_type.ends_with(".updated") {
            WebhookOperation::Update
        } else if event.event_type.ends_with(".deleted") {
            WebhookOperation::Delete
        } else {
            WebhookOperation::Update // Default
        };

        // Extract entity ID and realm ID from data
        let entity_id = event.data.get("id")?.as_str()?;
        let realm_id = event.data.get("realmId")?.as_str()?.to_string();

        Some(WebhookEvent {
            entity_type,
            entity_id: QuickBooksId::new(entity_id),
            operation,
            realm_id,
        })
    }

    /// Parse legacy EntityChange into WebhookEvent
    fn parse_entity_change(&self, realm_id: String, entity: EntityChange) -> Option<WebhookEvent> {
        let entity_type = match entity.name.as_str() {
            "Employee" => EntityType::Employee,
            "Department" => EntityType::Department,
            _ => return None, // Unsupported entity type
        };

        let operation = match entity.operation.as_str() {
            "Create" => WebhookOperation::Create,
            "Update" => WebhookOperation::Update,
            "Delete" => WebhookOperation::Delete,
            "Merge" => WebhookOperation::Merge,
            _ => WebhookOperation::Update, // Default
        };

        Some(WebhookEvent {
            entity_type,
            entity_id: QuickBooksId::new(entity.id),
            operation,
            realm_id,
        })
    }

    /// Process webhook events by triggering sync for affected entity types
    pub async fn process_events(&self, events: Vec<WebhookEvent>) -> Result<(), SyncError> {
        // Group events by entity type
        let has_employees = events
            .iter()
            .any(|e| e.entity_type == EntityType::Employee);
        let has_departments = events
            .iter()
            .any(|e| e.entity_type == EntityType::Department);

        tracing::info!(
            "Processing webhook events: {} employees, {} departments",
            events
                .iter()
                .filter(|e| e.entity_type == EntityType::Employee)
                .count(),
            events
                .iter()
                .filter(|e| e.entity_type == EntityType::Department)
                .count()
        );

        // Trigger incremental sync for affected entity types
        // Use sync_pull for webhook-triggered syncs (prefer remote changes)
        if has_employees {
            tracing::info!("Triggering employee sync due to webhook");
            let _report = self
                .sync_service
                .sync_pull(EntityType::Employee, SyncMode::Incremental)
                .await;
        }

        if has_departments {
            tracing::info!("Triggering department sync due to webhook");
            let _report = self
                .sync_service
                .sync_pull(EntityType::Department, SyncMode::Incremental)
                .await;
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn verify_signature_algorithm() {
        // Test the signature verification algorithm independently
        let payload = r#"{"eventNotifications":[{"realmId":"123"}]}"#;
        let verifier_token = "test-token";

        // Calculate expected signature
        let mut mac = HmacSha256::new_from_slice(verifier_token.as_bytes()).unwrap();
        mac.update(payload.as_bytes());
        let expected_signature = general_purpose::STANDARD.encode(mac.finalize().into_bytes());

        // Verify signature is generated correctly
        assert!(!expected_signature.is_empty());
        assert!(expected_signature.len() > 20);
    }

    #[test]
    fn parse_legacy_webhook_payload() {
        let payload = r#"{
            "eventNotifications": [{
                "realmId": "123456789",
                "dataChangeEvent": {
                    "entities": [{
                        "name": "Employee",
                        "id": "1",
                        "operation": "Update"
                    }]
                }
            }]
        }"#;

        let legacy: LegacyWebhookPayload = serde_json::from_str(payload).unwrap();
        assert_eq!(legacy.event_notifications.len(), 1);
        assert_eq!(
            legacy.event_notifications[0].data_change_event.entities.len(),
            1
        );
        assert_eq!(
            legacy.event_notifications[0]
                .data_change_event
                .entities[0]
                .name,
            "Employee"
        );
    }

    #[test]
    fn parse_cloud_event_payload() {
        let payload = r#"[{
            "id": "event-123",
            "type": "com.intuit.quickbooks.employee.updated",
            "data": {
                "id": "42",
                "realmId": "123456789"
            }
        }]"#;

        let cloud_events: Vec<CloudEvent> = serde_json::from_str(payload).unwrap();
        assert_eq!(cloud_events.len(), 1);
        assert_eq!(cloud_events[0].event_type, "com.intuit.quickbooks.employee.updated");
    }

    #[test]
    fn parse_entity_change_creates_webhook_event() {
        use crate::ports::quickbooks::mock::MockQuickBooksPort;
        use crate::ports::health::mock::MockHealthPort;
        use crate::ports::sync_repository::mock::MockSyncRepositoryPort;

        let qb = Arc::new(MockQuickBooksPort::new());
        let repo = Arc::new(MockSyncRepositoryPort::new());
        let health = Arc::new(MockHealthPort::new());
        let sync_service = Arc::new(SyncService::new(qb, repo, health));
        let adapter = WebhookAdapter::new(sync_service);

        let entity_change = EntityChange {
            name: "Employee".to_string(),
            id: "123".to_string(),
            operation: "Update".to_string(),
            last_updated: None,
        };

        let event = adapter.parse_entity_change("realm-123".to_string(), entity_change);
        assert!(event.is_some());

        let event = event.unwrap();
        assert_eq!(event.entity_type, EntityType::Employee);
        assert_eq!(event.operation, WebhookOperation::Update);
        assert_eq!(event.entity_id.as_str(), "123");
    }

    #[test]
    fn parse_entity_change_ignores_unsupported_types() {
        use crate::ports::quickbooks::mock::MockQuickBooksPort;
        use crate::ports::health::mock::MockHealthPort;
        use crate::ports::sync_repository::mock::MockSyncRepositoryPort;

        let qb = Arc::new(MockQuickBooksPort::new());
        let repo = Arc::new(MockSyncRepositoryPort::new());
        let health = Arc::new(MockHealthPort::new());
        let sync_service = Arc::new(SyncService::new(qb, repo, health));
        let adapter = WebhookAdapter::new(sync_service);

        let entity_change = EntityChange {
            name: "Invoice".to_string(), // Unsupported
            id: "123".to_string(),
            operation: "Update".to_string(),
            last_updated: None,
        };

        let event = adapter.parse_entity_change("realm-123".to_string(), entity_change);
        assert!(event.is_none());
    }

    #[tokio::test]
    async fn parse_payload_with_legacy_format() {
        use crate::ports::quickbooks::mock::MockQuickBooksPort;
        use crate::ports::health::mock::MockHealthPort;
        use crate::ports::sync_repository::mock::MockSyncRepositoryPort;

        let qb = Arc::new(MockQuickBooksPort::new());
        let repo = Arc::new(MockSyncRepositoryPort::new());
        let health = Arc::new(MockHealthPort::new());
        let sync_service = Arc::new(SyncService::new(qb, repo, health));
        let adapter = WebhookAdapter::new(sync_service);

        let payload = r#"{
            "eventNotifications": [{
                "realmId": "123456789",
                "dataChangeEvent": {
                    "entities": [
                        {
                            "name": "Employee",
                            "id": "1",
                            "operation": "Update"
                        },
                        {
                            "name": "Department",
                            "id": "2",
                            "operation": "Create"
                        }
                    ]
                }
            }]
        }"#;

        let events = adapter.parse_payload(payload).unwrap();
        assert_eq!(events.len(), 2);
        assert_eq!(events[0].entity_type, EntityType::Employee);
        assert_eq!(events[1].entity_type, EntityType::Department);
    }

    #[tokio::test]
    async fn verify_signature_with_valid_token() {
        use crate::ports::quickbooks::mock::MockQuickBooksPort;
        use crate::ports::health::mock::MockHealthPort;
        use crate::ports::sync_repository::mock::MockSyncRepositoryPort;

        let qb = Arc::new(MockQuickBooksPort::new());
        let repo = Arc::new(MockSyncRepositoryPort::new());
        let health = Arc::new(MockHealthPort::new());
        let sync_service = Arc::new(SyncService::new(qb, repo, health));
        let adapter = WebhookAdapter::new(sync_service);

        let payload = r#"{"eventNotifications":[]}"#;
        let verifier_token = "test-secret-token";

        // Calculate correct signature
        let mut mac = HmacSha256::new_from_slice(verifier_token.as_bytes()).unwrap();
        mac.update(payload.as_bytes());
        let signature = general_purpose::STANDARD.encode(mac.finalize().into_bytes());

        // Verify
        let result = adapter.verify_signature(payload, &signature, verifier_token);
        assert!(result.is_ok());
        assert!(result.unwrap());
    }

    #[tokio::test]
    async fn verify_signature_with_invalid_signature() {
        use crate::ports::quickbooks::mock::MockQuickBooksPort;
        use crate::ports::health::mock::MockHealthPort;
        use crate::ports::sync_repository::mock::MockSyncRepositoryPort;

        let qb = Arc::new(MockQuickBooksPort::new());
        let repo = Arc::new(MockSyncRepositoryPort::new());
        let health = Arc::new(MockHealthPort::new());
        let sync_service = Arc::new(SyncService::new(qb, repo, health));
        let adapter = WebhookAdapter::new(sync_service);

        let payload = r#"{"eventNotifications":[]}"#;
        let verifier_token = "test-secret-token";
        let wrong_signature = "invalid-signature";

        // Verify
        let result = adapter.verify_signature(payload, wrong_signature, verifier_token);
        assert!(result.is_ok());
        assert!(!result.unwrap()); // Should return false, not error
    }
}
