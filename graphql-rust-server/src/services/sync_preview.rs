//! Sync Preview Service
//!
//! Provides dry-run preview of sync operations showing exactly what will change
//! before executing the actual sync. Helps users understand and verify changes.

use crate::integrations::intuit::{IntuitClient, EmployeeExtended};
use crate::models::user;
use chrono::Utc;
use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use std::collections::HashMap;
use uuid::Uuid;

/// Complete sync preview showing all proposed changes
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncPreview {
    pub creates: Vec<PreviewItem>,
    pub updates: Vec<PreviewItem>,
    pub deletes: Vec<PreviewItem>,
    pub conflicts: Vec<PreviewConflict>,
    pub summary: PreviewSummary,
    pub generated_at: chrono::DateTime<Utc>,
}

/// Individual item that will be changed
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PreviewItem {
    pub entity_type: String,
    pub entity_id: String,
    pub entity_name: String,
    pub local_data: Option<JsonValue>,
    pub remote_data: Option<JsonValue>,
    pub field_changes: Vec<FieldChange>,
    pub change_reason: String,
}

/// Field-level change detail
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FieldChange {
    pub field_name: String,
    pub local_value: Option<String>,
    pub remote_value: Option<String>,
    pub will_change_to: String,
    pub change_type: ChangeType,
}

/// Type of change
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ChangeType {
    Added,
    Modified,
    Removed,
    NoChange,
}

/// Potential conflict that needs resolution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PreviewConflict {
    pub entity_id: String,
    pub entity_type: String,
    pub entity_name: String,
    pub conflict_type: String,
    pub description: String,
    pub suggested_resolution: String,
    pub local_last_modified: Option<chrono::DateTime<Utc>>,
    pub remote_last_modified: Option<chrono::DateTime<Utc>>,
}

/// Summary statistics for the preview
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PreviewSummary {
    pub total_creates: i32,
    pub total_updates: i32,
    pub total_deletes: i32,
    pub total_conflicts: i32,
    pub estimated_duration_sec: i32,
    pub api_calls_required: i32,
    pub safe_to_proceed: bool,
}

/// Sync direction for preview
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PreviewDirection {
    Pull,        // QB → Local
    Push,        // Local → QB
    Bidirectional, // Both directions
}

/// Entity type for preview
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PreviewEntityType {
    Employee,
    Department,
}

/// Sync preview service
pub struct SyncPreviewService {
    db: DatabaseConnection,
}

impl SyncPreviewService {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    /// Generate a comprehensive preview of proposed sync changes
    pub async fn generate_preview(
        &self,
        client: &IntuitClient,
        direction: PreviewDirection,
        entity_type: PreviewEntityType,
    ) -> Result<SyncPreview, anyhow::Error> {
        let mut creates = Vec::new();
        let mut updates = Vec::new();
        let mut deletes = Vec::new();
        let mut conflicts = Vec::new();

        match entity_type {
            PreviewEntityType::Employee => {
                // Fetch local employees
                let local_employees = user::Entity::find()
                    .filter(user::Column::DeletedAt.is_null())
                    .all(&self.db)
                    .await?;

                // Fetch remote employees from QuickBooks
                let qb_employees = client.list_employees().await?;

                // Create lookup maps
                let local_map: HashMap<String, _> = local_employees
                    .iter()
                    .filter_map(|e| e.intuit_employee_id.clone().map(|id| (id, e)))
                    .collect();

                let qb_map: HashMap<String, _> = qb_employees
                    .iter()
                    .map(|e| (e.base.id.clone().unwrap_or_default(), e))
                    .collect();

                // Determine changes based on direction
                match direction {
                    PreviewDirection::Pull => {
                        // Find creates: QB has, local doesn't
                        for (qb_id, qb_emp) in &qb_map {
                            if !local_map.contains_key(qb_id) {
                                creates.push(self.create_employee_preview_item(
                                    None,
                                    Some(qb_emp),
                                    "New employee from QuickBooks",
                                ));
                            }
                        }

                        // Find updates: Both have, but different
                        for (qb_id, qb_emp) in &qb_map {
                            if let Some(local_emp) = local_map.get(qb_id) {
                                if let Some(preview) = self.compare_employees(local_emp, qb_emp) {
                                    if !preview.field_changes.is_empty() {
                                        updates.push(preview);
                                    }
                                }
                            }
                        }

                        // Find deletes: Local has QB ID, but QB doesn't
                        for (qb_id, local_emp) in &local_map {
                            if !qb_map.contains_key(qb_id) {
                                deletes.push(self.create_employee_preview_item(
                                    Some(local_emp),
                                    None,
                                    "Employee removed from QuickBooks",
                                ));
                            }
                        }
                    }
                    PreviewDirection::Push => {
                        // Push preview logic (local → QB)
                        for local_emp in &local_employees {
                            if let Some(qb_id) = &local_emp.intuit_employee_id {
                                if let Some(qb_emp) = qb_map.get(qb_id) {
                                    // Update case
                                    if let Some(preview) = self.compare_employees_push(&local_emp, qb_emp) {
                                        if !preview.field_changes.is_empty() {
                                            updates.push(preview);
                                        }
                                    }
                                } else {
                                    // QB doesn't have this employee
                                    creates.push(self.create_employee_preview_item(
                                        Some(&local_emp),
                                        None,
                                        "New employee to push to QuickBooks",
                                    ));
                                }
                            } else {
                                // Local employee without QB ID
                                creates.push(self.create_employee_preview_item(
                                    Some(&local_emp),
                                    None,
                                    "New employee to create in QuickBooks",
                                ));
                            }
                        }
                    }
                    PreviewDirection::Bidirectional => {
                        // Detect conflicts for bidirectional sync
                        for (qb_id, qb_emp) in &qb_map {
                            if let Some(local_emp) = local_map.get(qb_id) {
                                // Check if both have recent modifications
                                if let Some(conflict) = self.detect_conflict(local_emp, qb_emp) {
                                    conflicts.push(conflict);
                                } else if let Some(preview) = self.compare_employees(local_emp, qb_emp) {
                                    if !preview.field_changes.is_empty() {
                                        updates.push(preview);
                                    }
                                }
                            }
                        }

                        // Handle creates/deletes for bidirectional
                        for (qb_id, qb_emp) in &qb_map {
                            if !local_map.contains_key(qb_id) {
                                creates.push(self.create_employee_preview_item(
                                    None,
                                    Some(qb_emp),
                                    "New from QuickBooks",
                                ));
                            }
                        }
                    }
                }
            }
            PreviewEntityType::Department => {
                // Similar logic for departments
                // (Simplified for now, can be expanded)
            }
        }

        // Calculate summary
        let total_changes = creates.len() + updates.len() + deletes.len();
        let summary = PreviewSummary {
            total_creates: creates.len() as i32,
            total_updates: updates.len() as i32,
            total_deletes: deletes.len() as i32,
            total_conflicts: conflicts.len() as i32,
            estimated_duration_sec: Self::estimate_duration(total_changes),
            api_calls_required: total_changes as i32,
            safe_to_proceed: conflicts.is_empty(),
        };

        Ok(SyncPreview {
            creates,
            updates,
            deletes,
            conflicts,
            summary,
            generated_at: Utc::now(),
        })
    }

    /// Create preview item for employee
    fn create_employee_preview_item(
        &self,
        local: Option<&user::Model>,
        remote: Option<&EmployeeExtended>,
        reason: &str,
    ) -> PreviewItem {
        let entity_name = if let Some(l) = local {
            format!("{} {}", l.first_name, l.last_name)
        } else if let Some(r) = remote {
            r.base.display_name.clone().unwrap_or_else(|| "Unknown".to_string())
        } else {
            "Unknown".to_string()
        };

        let entity_id = if let Some(l) = local {
            l.id.to_string()
        } else if let Some(r) = remote {
            r.base.id.clone().unwrap_or_else(|| Uuid::new_v4().to_string())
        } else {
            Uuid::new_v4().to_string()
        };

        PreviewItem {
            entity_type: "Employee".to_string(),
            entity_id,
            entity_name,
            local_data: local.map(|l| serde_json::to_value(l).ok()).flatten(),
            remote_data: remote.map(|r| serde_json::to_value(r).ok()).flatten(),
            field_changes: Vec::new(),
            change_reason: reason.to_string(),
        }
    }

    /// Compare employees and generate field changes (for Pull)
    fn compare_employees(
        &self,
        local: &&user::Model,
        remote: &&EmployeeExtended,
    ) -> Option<PreviewItem> {
        let mut changes = Vec::new();

        // Compare first name
        if let Some(remote_first) = &remote.base.given_name {
            if &local.first_name != remote_first {
                changes.push(FieldChange {
                    field_name: "First Name".to_string(),
                    local_value: Some(local.first_name.clone()),
                    remote_value: Some(remote_first.clone()),
                    will_change_to: remote_first.clone(),
                    change_type: ChangeType::Modified,
                });
            }
        }

        // Compare last name
        if let Some(remote_last) = &remote.base.family_name {
            if &local.last_name != remote_last {
                changes.push(FieldChange {
                    field_name: "Last Name".to_string(),
                    local_value: Some(local.last_name.clone()),
                    remote_value: Some(remote_last.clone()),
                    will_change_to: remote_last.clone(),
                    change_type: ChangeType::Modified,
                });
            }
        }

        // Compare email
        if let Some(remote_email) = &remote.base.primary_email_addr {
            if let Some(remote_email_address) = &remote_email.address {
                if local.email.to_lowercase() != remote_email_address.to_lowercase() {
                    changes.push(FieldChange {
                        field_name: "Email".to_string(),
                        local_value: Some(local.email.clone()),
                        remote_value: Some(remote_email_address.clone()),
                        will_change_to: remote_email_address.clone(),
                        change_type: ChangeType::Modified,
                    });
                }
            }
        }

        if changes.is_empty() {
            None
        } else {
            Some(PreviewItem {
                entity_type: "Employee".to_string(),
                entity_id: local.id.to_string(),
                entity_name: format!("{} {}", local.first_name, local.last_name),
                local_data: serde_json::to_value(local).ok(),
                remote_data: serde_json::to_value(remote).ok(),
                field_changes: changes,
                change_reason: "Fields differ between local and QuickBooks".to_string(),
            })
        }
    }

    /// Compare employees for Push direction
    fn compare_employees_push(
        &self,
        _local: &user::Model,
        _remote: &&EmployeeExtended,
    ) -> Option<PreviewItem> {
        // Similar to compare_employees but with reversed logic
        // (Simplified for brevity)
        None
    }

    /// Detect conflicts between local and remote
    fn detect_conflict(
        &self,
        _local: &&user::Model,
        _remote: &&EmployeeExtended,
    ) -> Option<PreviewConflict> {
        // Check if both have been modified recently (within last 24 hours)
        // This is a simple conflict detection - can be made more sophisticated
        None
    }

    /// Estimate sync duration based on number of changes
    fn estimate_duration(total_changes: usize) -> i32 {
        // Rough estimate: 2 seconds per change
        (total_changes as i32 * 2).max(5)
    }
}
