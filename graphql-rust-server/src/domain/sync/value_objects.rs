use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::fmt;

/// Types of entities that can be synced
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum EntityType {
    Employee,
    Department,
}

impl fmt::Display for EntityType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            EntityType::Employee => write!(f, "Employee"),
            EntityType::Department => write!(f, "Department"),
        }
    }
}

/// Direction of sync operation
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SyncDirection {
    Push,
    Pull,
    Bidirectional,
}

impl fmt::Display for SyncDirection {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            SyncDirection::Push => write!(f, "Push"),
            SyncDirection::Pull => write!(f, "Pull"),
            SyncDirection::Bidirectional => write!(f, "Bidirectional"),
        }
    }
}

/// Sync operation mode
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SyncMode {
    Full,
    Incremental,
}

/// Current status of a sync operation
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SyncStatus {
    Pending,
    InProgress,
    Completed,
    CompletedWithErrors,
    Failed,
}

impl SyncStatus {
    /// Determine status based on error count
    pub fn from_error_count(total: usize, errors: usize) -> Self {
        if errors == 0 {
            SyncStatus::Completed
        } else if errors < total {
            SyncStatus::CompletedWithErrors
        } else {
            SyncStatus::Failed
        }
    }
}

/// Type of change detected for an entity
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ChangeType {
    Created,
    Updated,
    Deleted,
    Unchanged,
}

/// Strategy for resolving conflicts
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ConflictStrategy {
    LocalWins,
    RemoteWins,
    LastWriteWins,
    Manual,
}

impl Default for ConflictStrategy {
    fn default() -> Self {
        ConflictStrategy::Manual
    }
}

/// Winner of a conflict resolution
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ConflictWinner {
    Local,
    Remote,
    Merged,
    Pending,
}

/// Unique identifier for a local entity
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct EntityId(pub String);

impl EntityId {
    pub fn new(id: impl Into<String>) -> Self {
        Self(id.into())
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl From<uuid::Uuid> for EntityId {
    fn from(id: uuid::Uuid) -> Self {
        Self(id.to_string())
    }
}

/// Unique identifier for a QuickBooks entity
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct QuickBooksId(pub String);

impl QuickBooksId {
    pub fn new(id: impl Into<String>) -> Self {
        Self(id.into())
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

/// Version information for optimistic concurrency
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct EntityVersion {
    pub sync_token: Option<String>,
    pub last_modified: DateTime<Utc>,
}

impl EntityVersion {
    pub fn new(last_modified: DateTime<Utc>) -> Self {
        Self {
            sync_token: None,
            last_modified,
        }
    }

    pub fn with_sync_token(mut self, token: impl Into<String>) -> Self {
        self.sync_token = Some(token.into());
        self
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sync_status_from_no_errors() {
        assert_eq!(SyncStatus::from_error_count(10, 0), SyncStatus::Completed);
    }

    #[test]
    fn sync_status_from_some_errors() {
        assert_eq!(
            SyncStatus::from_error_count(10, 3),
            SyncStatus::CompletedWithErrors
        );
    }

    #[test]
    fn sync_status_from_all_errors() {
        assert_eq!(SyncStatus::from_error_count(10, 10), SyncStatus::Failed);
    }

    #[test]
    fn entity_id_from_uuid() {
        let uuid = uuid::Uuid::new_v4();
        let entity_id = EntityId::from(uuid);
        assert_eq!(entity_id.as_str(), uuid.to_string());
    }

    #[test]
    fn entity_type_display() {
        assert_eq!(format!("{}", EntityType::Employee), "Employee");
        assert_eq!(format!("{}", EntityType::Department), "Department");
    }
}
