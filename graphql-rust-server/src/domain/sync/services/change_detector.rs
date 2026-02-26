//! ChangeDetector domain service for detecting changes and conflicts.
//!
//! This is a pure domain service with NO I/O - operates only on domain types.

use std::collections::{HashMap, HashSet};

use crate::domain::sync::{
    ChangeSet, Conflict, EntityId, EntitySnapshot, QuickBooksId, SyncEntity,
};

/// Pure domain service for detecting changes and conflicts.
///
/// No I/O - operates only on domain types.
pub struct ChangeDetector;

impl ChangeDetector {
    /// Partition local and remote changes into pushable, pullable, and conflicts.
    ///
    /// Returns: (conflicts, local_only_changes, remote_only_changes)
    pub fn partition_changes(
        local_changes: Vec<SyncEntity>,
        remote_changes: Vec<SyncEntity>,
    ) -> (Vec<SyncEntity>, Vec<SyncEntity>, Vec<SyncEntity>) {
        let mut local_only = Vec::new();
        let mut remote_only = Vec::new();
        let mut conflicts = Vec::new();

        // Index remote changes by their IDs
        let remote_by_local_id: HashMap<&EntityId, &SyncEntity> = remote_changes
            .iter()
            .filter_map(|e| e.local_id.as_ref().map(|id| (id, e)))
            .collect();

        let remote_by_qb_id: HashMap<&QuickBooksId, &SyncEntity> = remote_changes
            .iter()
            .filter_map(|e| e.remote_id.as_ref().map(|id| (id, e)))
            .collect();

        let mut matched_remote_ids: HashSet<String> = HashSet::new();

        // Process local changes
        for local in local_changes {
            let has_remote_match = local
                .local_id
                .as_ref()
                .map(|id| remote_by_local_id.contains_key(id))
                .unwrap_or(false)
                || local
                    .remote_id
                    .as_ref()
                    .map(|id| remote_by_qb_id.contains_key(id))
                    .unwrap_or(false);

            if has_remote_match {
                // Both sides changed - conflict
                conflicts.push(local.clone());

                // Track that we've matched this remote
                if let Some(id) = &local.local_id {
                    matched_remote_ids.insert(id.as_str().to_string());
                }
                if let Some(id) = &local.remote_id {
                    matched_remote_ids.insert(id.as_str().to_string());
                }
            } else {
                // Only local changed - can push
                local_only.push(local);
            }
        }

        // Find remote-only changes (not in conflicts)
        for remote in remote_changes {
            let is_matched = remote
                .local_id
                .as_ref()
                .map(|id| matched_remote_ids.contains(id.as_str()))
                .unwrap_or(false)
                || remote
                    .remote_id
                    .as_ref()
                    .map(|id| matched_remote_ids.contains(id.as_str()))
                    .unwrap_or(false);

            if !is_matched {
                remote_only.push(remote);
            }
        }

        (conflicts, local_only, remote_only)
    }

    /// Detect which fields differ between two snapshots.
    pub fn detect_conflicting_fields(
        local: &EntitySnapshot,
        remote: &EntitySnapshot,
    ) -> Vec<String> {
        let mut conflicting = Vec::new();

        // Check all local fields
        for (key, local_value) in &local.fields {
            if let Some(remote_value) = remote.fields.get(key) {
                if local_value != remote_value {
                    conflicting.push(key.clone());
                }
            }
        }

        conflicting.sort();
        conflicting
    }

    /// Build a ChangeSet from local and remote changes.
    pub fn build_change_set(
        local_changes: Vec<SyncEntity>,
        remote_changes: Vec<SyncEntity>,
        local_snapshots: HashMap<String, EntitySnapshot>,
        remote_snapshots: HashMap<String, EntitySnapshot>,
    ) -> ChangeSet {
        let (conflict_entities, local_only, remote_only) =
            Self::partition_changes(local_changes, remote_changes);

        // Build full Conflict objects with snapshots
        let conflicts: Vec<Conflict> = conflict_entities
            .into_iter()
            .filter_map(|entity| {
                let local_id = entity.local_id.as_ref()?.as_str();
                let remote_id = entity.remote_id.as_ref()?.as_str();

                let local_snapshot = local_snapshots.get(local_id)?;
                let remote_snapshot = remote_snapshots.get(remote_id)?;

                let conflicting_fields =
                    Self::detect_conflicting_fields(local_snapshot, remote_snapshot);

                Some(Conflict::new(
                    entity,
                    local_snapshot.clone(),
                    remote_snapshot.clone(),
                    conflicting_fields,
                ))
            })
            .collect();

        ChangeSet {
            local_changes: local_only,
            remote_changes: remote_only,
            conflicts,
        }
    }

    /// Check if an entity needs syncing based on timestamps.
    ///
    /// Returns: (local_changed, remote_changed)
    pub fn needs_sync(
        local_modified: Option<chrono::DateTime<chrono::Utc>>,
        remote_modified: Option<chrono::DateTime<chrono::Utc>>,
        last_synced: Option<chrono::DateTime<chrono::Utc>>,
    ) -> (bool, bool) {
        let local_changed = match (local_modified, last_synced) {
            (Some(modified), Some(synced)) => modified > synced,
            (Some(_), None) => true, // Never synced
            _ => false,
        };

        let remote_changed = match (remote_modified, last_synced) {
            (Some(modified), Some(synced)) => modified > synced,
            (Some(_), None) => true, // Never synced
            _ => false,
        };

        (local_changed, remote_changed)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::sync::{ChangeType, EntityType};
    use chrono::{TimeZone, Utc};

    fn entity(local: &str, remote: &str, change: ChangeType) -> SyncEntity {
        SyncEntity::employee(local, remote).with_change_type(change)
    }

    fn local_only_entity(local: &str) -> SyncEntity {
        SyncEntity::local_only(EntityType::Employee, local)
    }

    fn remote_only_entity(remote: &str) -> SyncEntity {
        SyncEntity::remote_only(EntityType::Employee, remote)
    }

    #[test]
    fn partition_no_overlap() {
        let local = vec![local_only_entity("local-1")];
        let remote = vec![remote_only_entity("remote-1")];

        let (conflicts, local_only, remote_only) = ChangeDetector::partition_changes(local, remote);

        assert!(conflicts.is_empty());
        assert_eq!(local_only.len(), 1);
        assert_eq!(remote_only.len(), 1);
    }

    #[test]
    fn partition_with_conflict() {
        let local = vec![entity("emp-1", "qb-1", ChangeType::Updated)];
        let remote = vec![entity("emp-1", "qb-1", ChangeType::Updated)];

        let (conflicts, local_only, remote_only) = ChangeDetector::partition_changes(local, remote);

        assert_eq!(conflicts.len(), 1);
        assert!(local_only.is_empty());
        assert!(remote_only.is_empty());
    }

    #[test]
    fn partition_mixed() {
        let local = vec![
            entity("emp-1", "qb-1", ChangeType::Updated), // Conflict
            local_only_entity("emp-2"),                   // Local only
        ];
        let remote = vec![
            entity("emp-1", "qb-1", ChangeType::Updated), // Conflict
            remote_only_entity("qb-3"),                   // Remote only
        ];

        let (conflicts, local_only, remote_only) = ChangeDetector::partition_changes(local, remote);

        assert_eq!(conflicts.len(), 1);
        assert_eq!(local_only.len(), 1);
        assert_eq!(remote_only.len(), 1);
    }

    #[test]
    fn detect_conflicting_fields_finds_differences() {
        let local = EntitySnapshot::new(HashMap::from([
            ("name".to_string(), serde_json::json!("Jon")),
            ("email".to_string(), serde_json::json!("same@test.com")),
            ("title".to_string(), serde_json::json!("Dev")),
        ]));

        let remote = EntitySnapshot::new(HashMap::from([
            ("name".to_string(), serde_json::json!("John")),
            ("email".to_string(), serde_json::json!("same@test.com")),
            ("title".to_string(), serde_json::json!("Engineer")),
        ]));

        let conflicts = ChangeDetector::detect_conflicting_fields(&local, &remote);

        assert_eq!(conflicts.len(), 2);
        assert!(conflicts.contains(&"name".to_string()));
        assert!(conflicts.contains(&"title".to_string()));
        assert!(!conflicts.contains(&"email".to_string()));
    }

    #[test]
    fn needs_sync_local_changed() {
        let last_synced = Utc.timestamp_opt(1000, 0).unwrap();
        let local_modified = Utc.timestamp_opt(2000, 0).unwrap();

        let (local, remote) =
            ChangeDetector::needs_sync(Some(local_modified), None, Some(last_synced));

        assert!(local);
        assert!(!remote);
    }

    #[test]
    fn needs_sync_both_changed() {
        let last_synced = Utc.timestamp_opt(1000, 0).unwrap();
        let local_modified = Utc.timestamp_opt(2000, 0).unwrap();
        let remote_modified = Utc.timestamp_opt(1500, 0).unwrap();

        let (local, remote) = ChangeDetector::needs_sync(
            Some(local_modified),
            Some(remote_modified),
            Some(last_synced),
        );

        assert!(local);
        assert!(remote);
    }

    #[test]
    fn needs_sync_never_synced() {
        let local_modified = Utc.timestamp_opt(1000, 0).unwrap();

        let (local, remote) = ChangeDetector::needs_sync(Some(local_modified), None, None);

        assert!(local); // Has local data, never synced
        assert!(!remote);
    }
}
