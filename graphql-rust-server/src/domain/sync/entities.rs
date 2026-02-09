//! Domain entities for the sync module.
//!
//! This module contains the core business entities for Intuit/QuickBooks synchronization.

use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

use super::{
    ChangeType, ConflictWinner, EntityId, EntityType, EntityVersion,
    QuickBooksId, SyncDirection, SyncError, SyncMode, SyncStatus,
};

/// Unique identifier for a sync operation
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct SyncId(pub String);

impl SyncId {
    pub fn new() -> Self {
        Self(uuid::Uuid::new_v4().to_string())
    }
}

impl Default for SyncId {
    fn default() -> Self {
        Self::new()
    }
}

/// Snapshot of entity data at a point in time
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EntitySnapshot {
    pub fields: HashMap<String, serde_json::Value>,
    pub captured_at: DateTime<Utc>,
}

impl EntitySnapshot {
    pub fn new(fields: HashMap<String, serde_json::Value>) -> Self {
        Self {
            fields,
            captured_at: Utc::now(),
        }
    }

    pub fn get_field(&self, name: &str) -> Option<&serde_json::Value> {
        self.fields.get(name)
    }

    pub fn get_string(&self, name: &str) -> Option<&str> {
        self.fields.get(name).and_then(|v| v.as_str())
    }
}

/// Tracks an individual entity's sync state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncEntity {
    pub local_id: Option<EntityId>,
    pub remote_id: Option<QuickBooksId>,
    pub entity_type: EntityType,
    pub change_type: ChangeType,
    pub local_version: Option<EntityVersion>,
    pub remote_version: Option<EntityVersion>,
}

impl SyncEntity {
    pub fn employee(local_id: impl Into<String>, remote_id: impl Into<String>) -> Self {
        Self {
            local_id: Some(EntityId::new(local_id)),
            remote_id: Some(QuickBooksId::new(remote_id)),
            entity_type: EntityType::Employee,
            change_type: ChangeType::Unchanged,
            local_version: None,
            remote_version: None,
        }
    }

    pub fn department(local_id: impl Into<String>, remote_id: impl Into<String>) -> Self {
        Self {
            local_id: Some(EntityId::new(local_id)),
            remote_id: Some(QuickBooksId::new(remote_id)),
            entity_type: EntityType::Department,
            change_type: ChangeType::Unchanged,
            local_version: None,
            remote_version: None,
        }
    }

    pub fn local_only(entity_type: EntityType, local_id: impl Into<String>) -> Self {
        Self {
            local_id: Some(EntityId::new(local_id)),
            remote_id: None,
            entity_type,
            change_type: ChangeType::Created,
            local_version: None,
            remote_version: None,
        }
    }

    pub fn remote_only(entity_type: EntityType, remote_id: impl Into<String>) -> Self {
        Self {
            local_id: None,
            remote_id: Some(QuickBooksId::new(remote_id)),
            entity_type,
            change_type: ChangeType::Created,
            local_version: None,
            remote_version: None,
        }
    }

    pub fn with_change_type(mut self, change_type: ChangeType) -> Self {
        self.change_type = change_type;
        self
    }

    pub fn with_local_version(mut self, version: EntityVersion) -> Self {
        self.local_version = Some(version);
        self
    }

    pub fn with_remote_version(mut self, version: EntityVersion) -> Self {
        self.remote_version = Some(version);
        self
    }

    /// Check if this entity exists on both sides
    pub fn is_linked(&self) -> bool {
        self.local_id.is_some() && self.remote_id.is_some()
    }

    /// Get a display identifier for logging
    pub fn display_id(&self) -> String {
        match (&self.local_id, &self.remote_id) {
            (Some(local), Some(remote)) => format!("{}:{}", local.as_str(), remote.as_str()),
            (Some(local), None) => format!("local:{}", local.as_str()),
            (None, Some(remote)) => format!("remote:{}", remote.as_str()),
            (None, None) => "unknown".to_string(),
        }
    }
}

/// Represents a detected conflict between local and remote data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Conflict {
    pub entity: SyncEntity,
    pub local_data: EntitySnapshot,
    pub remote_data: EntitySnapshot,
    pub detected_at: DateTime<Utc>,
    pub conflicting_fields: Vec<String>,
    pub resolution: Option<ConflictResolution>,
}

impl Conflict {
    pub fn new(
        entity: SyncEntity,
        local_data: EntitySnapshot,
        remote_data: EntitySnapshot,
        conflicting_fields: Vec<String>,
    ) -> Self {
        Self {
            entity,
            local_data,
            remote_data,
            detected_at: Utc::now(),
            conflicting_fields,
            resolution: None,
        }
    }

    pub fn is_resolved(&self) -> bool {
        self.resolution.is_some()
    }

    pub fn resolve(&mut self, resolution: ConflictResolution) {
        self.resolution = Some(resolution);
    }
}

/// Resolution of a conflict
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConflictResolution {
    pub winner: ConflictWinner,
    pub resolved_at: DateTime<Utc>,
    pub resolved_by: Option<String>,
    pub field_selections: HashMap<String, ConflictWinner>,
    pub merged_data: Option<EntitySnapshot>,
}

impl ConflictResolution {
    pub fn local_wins() -> Self {
        Self {
            winner: ConflictWinner::Local,
            resolved_at: Utc::now(),
            resolved_by: None,
            field_selections: HashMap::new(),
            merged_data: None,
        }
    }

    pub fn remote_wins() -> Self {
        Self {
            winner: ConflictWinner::Remote,
            resolved_at: Utc::now(),
            resolved_by: None,
            field_selections: HashMap::new(),
            merged_data: None,
        }
    }

    pub fn with_resolver(mut self, resolver: impl Into<String>) -> Self {
        self.resolved_by = Some(resolver.into());
        self
    }

    pub fn with_field_selection(mut self, field: impl Into<String>, winner: ConflictWinner) -> Self {
        self.field_selections.insert(field.into(), winner);
        self
    }
}

/// Record of a successfully synced entity
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncedEntity {
    pub entity: SyncEntity,
    pub synced_at: DateTime<Utc>,
    pub direction: SyncDirection,
}

impl SyncedEntity {
    pub fn pushed(entity: SyncEntity) -> Self {
        Self {
            entity,
            synced_at: Utc::now(),
            direction: SyncDirection::Push,
        }
    }

    pub fn pulled(entity: SyncEntity) -> Self {
        Self {
            entity,
            synced_at: Utc::now(),
            direction: SyncDirection::Pull,
        }
    }
}

/// Report of a completed sync operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncReport {
    pub id: SyncId,
    pub entity_type: EntityType,
    pub direction: SyncDirection,
    pub mode: SyncMode,
    pub started_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
    pub pushed: Vec<SyncedEntity>,
    pub pulled: Vec<SyncedEntity>,
    pub conflicts_detected: usize,
    pub conflicts_resolved: usize,
    #[serde(skip)]
    pub errors: Vec<SyncError>,
    pub status: SyncStatus,
}

impl SyncReport {
    pub fn new(entity_type: EntityType, direction: SyncDirection, mode: SyncMode) -> Self {
        Self {
            id: SyncId::new(),
            entity_type,
            direction,
            mode,
            started_at: Utc::now(),
            completed_at: None,
            pushed: Vec::new(),
            pulled: Vec::new(),
            conflicts_detected: 0,
            conflicts_resolved: 0,
            errors: Vec::new(),
            status: SyncStatus::InProgress,
        }
    }

    pub fn add_pushed(&mut self, entity: SyncEntity) {
        self.pushed.push(SyncedEntity::pushed(entity));
    }

    pub fn add_pulled(&mut self, entity: SyncEntity) {
        self.pulled.push(SyncedEntity::pulled(entity));
    }

    pub fn add_error(&mut self, error: SyncError) {
        self.errors.push(error);
    }

    pub fn complete(&mut self) {
        self.completed_at = Some(Utc::now());
        let total = self.pushed.len() + self.pulled.len() + self.errors.len();
        self.status = SyncStatus::from_error_count(total, self.errors.len());
    }

    pub fn total_synced(&self) -> usize {
        self.pushed.len() + self.pulled.len()
    }

    pub fn has_errors(&self) -> bool {
        !self.errors.is_empty()
    }

    pub fn is_success(&self) -> bool {
        matches!(self.status, SyncStatus::Completed | SyncStatus::CompletedWithErrors)
    }
}

/// A set of changes to be synced
#[derive(Debug, Clone, Default)]
pub struct ChangeSet {
    pub local_changes: Vec<SyncEntity>,
    pub remote_changes: Vec<SyncEntity>,
    pub conflicts: Vec<Conflict>,
}

impl ChangeSet {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn is_empty(&self) -> bool {
        self.local_changes.is_empty() && self.remote_changes.is_empty() && self.conflicts.is_empty()
    }

    pub fn total_changes(&self) -> usize {
        self.local_changes.len() + self.remote_changes.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sync_entity_employee_builder() {
        let entity = SyncEntity::employee("local-1", "qb-123");
        assert_eq!(entity.entity_type, EntityType::Employee);
        assert!(entity.is_linked());
    }

    #[test]
    fn sync_entity_local_only() {
        let entity = SyncEntity::local_only(EntityType::Employee, "local-1");
        assert!(!entity.is_linked());
        assert!(entity.remote_id.is_none());
    }

    #[test]
    fn conflict_resolution_field_selection() {
        let resolution = ConflictResolution::local_wins()
            .with_field_selection("email", ConflictWinner::Remote)
            .with_field_selection("name", ConflictWinner::Local);

        assert_eq!(resolution.winner, ConflictWinner::Local);
        assert_eq!(
            resolution.field_selections.get("email"),
            Some(&ConflictWinner::Remote)
        );
    }

    #[test]
    fn sync_report_lifecycle() {
        let mut report = SyncReport::new(
            EntityType::Employee,
            SyncDirection::Bidirectional,
            SyncMode::Incremental,
        );

        assert_eq!(report.status, SyncStatus::InProgress);

        report.add_pushed(SyncEntity::employee("1", "qb-1"));
        report.add_pulled(SyncEntity::employee("2", "qb-2"));
        report.add_error(SyncError::EntityNotFound {
            entity_type: EntityType::Employee,
            id: "3".to_string(),
        });

        report.complete();

        assert_eq!(report.total_synced(), 2);
        assert!(report.has_errors());
        assert_eq!(report.status, SyncStatus::CompletedWithErrors);
    }

    #[test]
    fn change_set_empty_by_default() {
        let set = ChangeSet::new();
        assert!(set.is_empty());
        assert_eq!(set.total_changes(), 0);
    }
}

// ============================================================================
// TimeEntry Domain Entity
// ============================================================================

/// Hours value object with validation
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct Hours(Decimal);

impl Hours {
    /// Create Hours with validation (0 < hours <= 24)
    pub fn new(value: f64) -> Result<Self, SyncError> {
        if value <= 0.0 || value > 24.0 {
            return Err(SyncError::validation(
                "time_entry",
                vec![crate::domain::sync::Violation::new(
                    "hours",
                    format!("Hours must be between 0 and 24, got {}", value),
                    "INVALID_HOURS",
                )],
            ));
        }
        Ok(Hours(
            Decimal::from_f64_retain(value).ok_or_else(|| {
                SyncError::validation(
                    "time_entry",
                    vec![crate::domain::sync::Violation::new(
                        "hours",
                        "Invalid decimal value",
                        "INVALID_DECIMAL",
                    )],
                )
            })?,
        ))
    }

    pub fn as_decimal(&self) -> Decimal {
        self.0
    }

    pub fn as_f64(&self) -> f64 {
        use rust_decimal::prelude::ToPrimitive;
        self.0.to_f64().unwrap_or(0.0)
    }
}

/// Time entry approval workflow states
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ApprovalStatus {
    Draft,      // Can be edited, cannot be synced
    Submitted,  // Pending approval, cannot be edited
    Approved,   // Can be synced to QuickBooks
    Rejected,   // Cannot be synced
}

impl ApprovalStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            ApprovalStatus::Draft => "draft",
            ApprovalStatus::Submitted => "submitted",
            ApprovalStatus::Approved => "approved",
            ApprovalStatus::Rejected => "rejected",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "draft" => ApprovalStatus::Draft,
            "submitted" => ApprovalStatus::Submitted,
            "approved" => ApprovalStatus::Approved,
            "rejected" => ApprovalStatus::Rejected,
            _ => ApprovalStatus::Draft,
        }
    }
}

/// Time entry domain entity
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeEntry {
    // Identity
    pub id: Uuid,
    pub employee_id: Uuid,

    // Core data
    pub entry_date: NaiveDate,
    pub hours: Hours,
    pub project_id: Option<Uuid>,
    pub description: Option<String>,
    pub is_billable: bool,

    // Workflow state
    pub approval_status: ApprovalStatus,
    pub approved_by: Option<Uuid>,
    pub approved_at: Option<DateTime<Utc>>,

    // Sync metadata
    pub quickbooks_id: Option<QuickBooksId>,
    pub last_modified_at: DateTime<Utc>,
    pub version: EntityVersion,
}

impl TimeEntry {
    /// Check if this time entry is eligible for sync
    pub fn is_syncable(&self) -> bool {
        self.approval_status == ApprovalStatus::Approved && self.project_id.is_some()
    }

    /// Check if entry can be edited (not synced, not approved)
    pub fn can_edit(&self) -> bool {
        self.quickbooks_id.is_none() && self.approval_status != ApprovalStatus::Approved
    }

    /// Check if entry can be deleted (not synced)
    pub fn can_delete(&self) -> bool {
        self.quickbooks_id.is_none()
    }
}

#[cfg(test)]
mod time_entry_tests {
    use super::*;

    #[test]
    fn hours_validates_positive() {
        assert!(Hours::new(0.0).is_err());
        assert!(Hours::new(-1.0).is_err());
        assert!(Hours::new(0.5).is_ok());
    }

    #[test]
    fn hours_validates_max() {
        assert!(Hours::new(24.0).is_ok());
        assert!(Hours::new(24.1).is_err());
        assert!(Hours::new(25.0).is_err());
    }

    #[test]
    fn hours_decimal_conversion() {
        let hours = Hours::new(7.5).unwrap();
        assert_eq!(hours.as_f64(), 7.5);
    }

    #[test]
    fn approval_status_string_conversion() {
        assert_eq!(ApprovalStatus::Approved.as_str(), "approved");
        assert_eq!(ApprovalStatus::from_str("approved"), ApprovalStatus::Approved);
    }

    #[test]
    fn time_entry_syncable_requires_approved_and_project() {
        let entry = TimeEntry {
            id: Uuid::new_v4(),
            employee_id: Uuid::new_v4(),
            entry_date: NaiveDate::from_ymd_opt(2026, 2, 6).unwrap(),
            hours: Hours::new(8.0).unwrap(),
            project_id: Some(Uuid::new_v4()),
            description: None,
            is_billable: false,
            approval_status: ApprovalStatus::Approved,
            approved_by: None,
            approved_at: None,
            quickbooks_id: None,
            last_modified_at: Utc::now(),
            version: EntityVersion::new(Utc::now()),
        };

        assert!(entry.is_syncable());

        let mut draft = entry.clone();
        draft.approval_status = ApprovalStatus::Draft;
        assert!(!draft.is_syncable());

        let mut no_project = entry.clone();
        no_project.project_id = None;
        assert!(!no_project.is_syncable());
    }

    #[test]
    fn time_entry_can_edit_rules() {
        let mut entry = TimeEntry {
            id: Uuid::new_v4(),
            employee_id: Uuid::new_v4(),
            entry_date: NaiveDate::from_ymd_opt(2026, 2, 6).unwrap(),
            hours: Hours::new(8.0).unwrap(),
            project_id: None,
            description: None,
            is_billable: false,
            approval_status: ApprovalStatus::Draft,
            approved_by: None,
            approved_at: None,
            quickbooks_id: None,
            last_modified_at: Utc::now(),
            version: EntityVersion::new(Utc::now()),
        };

        assert!(entry.can_edit());

        entry.approval_status = ApprovalStatus::Approved;
        assert!(!entry.can_edit());

        entry.approval_status = ApprovalStatus::Draft;
        entry.quickbooks_id = Some(QuickBooksId::new("qb-123"));
        assert!(!entry.can_edit());
    }
}
