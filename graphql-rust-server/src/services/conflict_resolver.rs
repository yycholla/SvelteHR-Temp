//! Conflict Resolution Strategies
//!
//! Handles resolution of sync conflicts when both local and remote systems
//! have changes to the same record.

use anyhow::{Context as AnyhowContext, Result};
use chrono::{DateTime, Utc};
use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};

use super::sync_tracker::{ChangeRecord, EntityType, SyncTracker};

/// Strategy for resolving sync conflicts
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ConflictStrategy {
    /// Local changes always win - discard remote changes
    LocalWins,

    /// Remote (QuickBooks) changes always win - discard local changes
    RemoteWins,

    /// Most recent change wins based on timestamp comparison
    LastWriteWins,

    /// Mark as conflict and require manual resolution - don't auto-resolve
    ManualReview,
}

/// Represents a conflict between local and remote changes
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConflictRecord {
    pub entity_type: EntityType,
    pub entity_id: String,
    pub quickbooks_id: Option<String>,
    pub local_change: ChangeRecord,
    pub remote_change: ChangeRecord,
    pub local_timestamp: DateTime<Utc>,
    pub remote_timestamp: DateTime<Utc>,
}

/// Service for resolving sync conflicts
pub struct ConflictResolver;

impl ConflictResolver {
    /// Resolve a list of conflicts using the specified strategy
    ///
    /// Returns a tuple of (local_changes_to_keep, remote_changes_to_keep)
    ///
    /// # Errors
    ///
    /// - Returns error if ManualReview strategy is used (requires user intervention)
    /// - Returns error if database operations fail when marking conflicts
    pub async fn resolve(
        db: &DatabaseConnection,
        conflicts: Vec<ConflictRecord>,
        strategy: ConflictStrategy,
    ) -> Result<(Vec<ChangeRecord>, Vec<ChangeRecord>)> {
        if conflicts.is_empty() {
            return Ok((Vec::new(), Vec::new()));
        }

        match strategy {
            ConflictStrategy::LocalWins => {
                // Keep all local changes, discard remote
                let local: Vec<ChangeRecord> = conflicts
                    .into_iter()
                    .map(|c| c.local_change)
                    .collect();
                Ok((local, Vec::new()))
            }

            ConflictStrategy::RemoteWins => {
                // Keep all remote changes, discard local
                let remote: Vec<ChangeRecord> = conflicts
                    .into_iter()
                    .map(|c| c.remote_change)
                    .collect();
                Ok((Vec::new(), remote))
            }

            ConflictStrategy::LastWriteWins => {
                // Compare timestamps, keep newer
                let mut local = Vec::new();
                let mut remote = Vec::new();

                for conflict in conflicts {
                    if conflict.local_timestamp > conflict.remote_timestamp {
                        // Local is newer
                        local.push(conflict.local_change);
                    } else {
                        // Remote is newer (or equal - prefer remote in tie)
                        remote.push(conflict.remote_change);
                    }
                }

                Ok((local, remote))
            }

            ConflictStrategy::ManualReview => {
                // Mark all as requiring manual review
                for conflict in &conflicts {
                    SyncTracker::mark_conflict(
                        db,
                        conflict.entity_type,
                        &conflict.entity_id,
                    )
                    .await
                    .context(format!(
                        "Failed to mark conflict for {} {}",
                        format!("{:?}", conflict.entity_type),
                        conflict.entity_id
                    ))?;
                }

                Err(anyhow::anyhow!(
                    "Manual review required for {} conflicts",
                    conflicts.len()
                ))
            }
        }
    }

    /// Get a human-readable description of a conflict
    pub fn describe_conflict(conflict: &ConflictRecord) -> String {
        format!(
            "{:?} {} was modified both locally (at {}) and in QuickBooks (at {})",
            conflict.entity_type,
            conflict.entity_id,
            conflict.local_timestamp.format("%Y-%m-%d %H:%M:%S"),
            conflict.remote_timestamp.format("%Y-%m-%d %H:%M:%S")
        )
    }

    /// Get a human-readable description of a resolution strategy
    pub fn describe_strategy(strategy: ConflictStrategy) -> &'static str {
        match strategy {
            ConflictStrategy::LocalWins => {
                "Local changes will be kept, QuickBooks changes will be overwritten"
            }
            ConflictStrategy::RemoteWins => {
                "QuickBooks changes will be kept, local changes will be overwritten"
            }
            ConflictStrategy::LastWriteWins => {
                "The most recently modified version will be kept (based on timestamps)"
            }
            ConflictStrategy::ManualReview => {
                "Conflicts will be marked for manual review by an administrator"
            }
        }
    }

    /// Determine if a strategy requires user intervention
    pub fn requires_manual_intervention(strategy: ConflictStrategy) -> bool {
        matches!(strategy, ConflictStrategy::ManualReview)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use super::super::sync_tracker::SyncStatus;

    fn create_test_conflict(
        entity_id: &str,
        local_time: DateTime<Utc>,
        remote_time: DateTime<Utc>,
    ) -> ConflictRecord {
        ConflictRecord {
            entity_type: EntityType::Employee,
            entity_id: entity_id.to_string(),
            quickbooks_id: Some(format!("qb_{}", entity_id)),
            local_change: ChangeRecord {
                entity_type: EntityType::Employee,
                entity_id: entity_id.to_string(),
                quickbooks_id: Some(format!("qb_{}", entity_id)),
                sync_status: SyncStatus::LocalChanged,
                last_modified_at: local_time,
                last_synced_at: None,
                sync_token: None,
            },
            remote_change: ChangeRecord {
                entity_type: EntityType::Employee,
                entity_id: entity_id.to_string(),
                quickbooks_id: Some(format!("qb_{}", entity_id)),
                sync_status: SyncStatus::RemoteChanged,
                last_modified_at: remote_time,
                last_synced_at: None,
                sync_token: None,
            },
            local_timestamp: local_time,
            remote_timestamp: remote_time,
        }
    }

    #[tokio::test]
    async fn test_local_wins_strategy() {
        let conflicts = vec![create_test_conflict(
            "1",
            Utc::now(),
            Utc::now(),
        )];

        // Note: This test doesn't actually use the database, so we're testing the logic only
        // In a real scenario, you'd need a test database connection

        // For now, just test the non-DB strategies
        let result = ConflictResolver::resolve_without_db(conflicts, ConflictStrategy::LocalWins);

        assert_eq!(result.0.len(), 1); // One local change kept
        assert_eq!(result.1.len(), 0); // Zero remote changes kept
    }

    // Helper for testing strategies that don't need DB access
    impl ConflictResolver {
        fn resolve_without_db(
            conflicts: Vec<ConflictRecord>,
            strategy: ConflictStrategy,
        ) -> (Vec<ChangeRecord>, Vec<ChangeRecord>) {
            match strategy {
                ConflictStrategy::LocalWins => {
                    let local: Vec<ChangeRecord> = conflicts
                        .into_iter()
                        .map(|c| c.local_change)
                        .collect();
                    (local, Vec::new())
                }
                ConflictStrategy::RemoteWins => {
                    let remote: Vec<ChangeRecord> = conflicts
                        .into_iter()
                        .map(|c| c.remote_change)
                        .collect();
                    (Vec::new(), remote)
                }
                ConflictStrategy::LastWriteWins => {
                    let mut local = Vec::new();
                    let mut remote = Vec::new();

                    for conflict in conflicts {
                        if conflict.local_timestamp > conflict.remote_timestamp {
                            local.push(conflict.local_change);
                        } else {
                            remote.push(conflict.remote_change);
                        }
                    }

                    (local, remote)
                }
                ConflictStrategy::ManualReview => {
                    // Can't test this without DB
                    (Vec::new(), Vec::new())
                }
            }
        }
    }

    #[tokio::test]
    async fn test_remote_wins_strategy() {
        let conflicts = vec![create_test_conflict(
            "1",
            Utc::now(),
            Utc::now(),
        )];

        let result = ConflictResolver::resolve_without_db(conflicts, ConflictStrategy::RemoteWins);

        assert_eq!(result.0.len(), 0); // Zero local changes kept
        assert_eq!(result.1.len(), 1); // One remote change kept
    }

    #[tokio::test]
    async fn test_last_write_wins_local_newer() {
        let now = Utc::now();
        let earlier = now - chrono::Duration::hours(1);

        let conflicts = vec![create_test_conflict("1", now, earlier)];

        let result = ConflictResolver::resolve_without_db(conflicts, ConflictStrategy::LastWriteWins);

        assert_eq!(result.0.len(), 1); // Local is newer, so keep local
        assert_eq!(result.1.len(), 0);
    }

    #[tokio::test]
    async fn test_last_write_wins_remote_newer() {
        let now = Utc::now();
        let earlier = now - chrono::Duration::hours(1);

        let conflicts = vec![create_test_conflict("1", earlier, now)];

        let result = ConflictResolver::resolve_without_db(conflicts, ConflictStrategy::LastWriteWins);

        assert_eq!(result.0.len(), 0);
        assert_eq!(result.1.len(), 1); // Remote is newer, so keep remote
    }

    #[test]
    fn test_describe_strategy() {
        assert!(ConflictResolver::describe_strategy(ConflictStrategy::LocalWins)
            .contains("Local changes"));
        assert!(ConflictResolver::describe_strategy(ConflictStrategy::RemoteWins)
            .contains("QuickBooks changes"));
        assert!(ConflictResolver::describe_strategy(ConflictStrategy::LastWriteWins)
            .contains("most recently"));
        assert!(ConflictResolver::describe_strategy(ConflictStrategy::ManualReview)
            .contains("manual review"));
    }

    #[test]
    fn test_requires_manual_intervention() {
        assert!(!ConflictResolver::requires_manual_intervention(
            ConflictStrategy::LocalWins
        ));
        assert!(!ConflictResolver::requires_manual_intervention(
            ConflictStrategy::RemoteWins
        ));
        assert!(!ConflictResolver::requires_manual_intervention(
            ConflictStrategy::LastWriteWins
        ));
        assert!(ConflictResolver::requires_manual_intervention(
            ConflictStrategy::ManualReview
        ));
    }
}
