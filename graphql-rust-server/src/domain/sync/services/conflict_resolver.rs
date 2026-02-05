//! Pure domain service for resolving sync conflicts.
//!
//! This service contains no I/O and operates only on domain types.
//! It implements various conflict resolution strategies for sync operations.

use chrono::Utc;
use std::collections::HashMap;

use crate::domain::sync::{
    Conflict, ConflictResolution, ConflictStrategy, ConflictWinner, EntitySnapshot,
};

/// Pure domain service for resolving sync conflicts.
///
/// No I/O - operates only on domain types.
pub struct ConflictResolver;

impl ConflictResolver {
    /// Resolve a single conflict using the specified strategy.
    ///
    /// # Arguments
    /// * `conflict` - The conflict to resolve
    /// * `strategy` - The resolution strategy to apply
    ///
    /// # Returns
    /// A `ConflictResolution` indicating the outcome
    pub fn resolve(conflict: &Conflict, strategy: ConflictStrategy) -> ConflictResolution {
        match strategy {
            ConflictStrategy::LocalWins => ConflictResolution::local_wins(),
            ConflictStrategy::RemoteWins => ConflictResolution::remote_wins(),
            ConflictStrategy::LastWriteWins => Self::resolve_last_write_wins(conflict),
            ConflictStrategy::Manual => ConflictResolution {
                winner: ConflictWinner::Pending,
                resolved_at: Utc::now(),
                resolved_by: None,
                field_selections: Default::default(),
                merged_data: None,
            },
        }
    }

    /// Resolve multiple conflicts using the same strategy.
    ///
    /// # Arguments
    /// * `conflicts` - The conflicts to resolve
    /// * `strategy` - The resolution strategy to apply to all conflicts
    ///
    /// # Returns
    /// A vector of tuples containing each conflict and its resolution
    pub fn resolve_all(
        conflicts: &[Conflict],
        strategy: ConflictStrategy,
    ) -> Vec<(Conflict, ConflictResolution)> {
        conflicts
            .iter()
            .map(|c| (c.clone(), Self::resolve(c, strategy)))
            .collect()
    }

    /// Resolve by comparing last modified timestamps.
    ///
    /// The entity with the more recent `captured_at` timestamp wins.
    fn resolve_last_write_wins(conflict: &Conflict) -> ConflictResolution {
        let local_time = conflict.local_data.captured_at;
        let remote_time = conflict.remote_data.captured_at;

        if local_time >= remote_time {
            ConflictResolution::local_wins()
        } else {
            ConflictResolution::remote_wins()
        }
    }

    /// Create a field-level merged resolution.
    ///
    /// This allows selecting which side wins for each conflicting field,
    /// producing a merged result that combines values from both sides.
    ///
    /// # Arguments
    /// * `conflict` - The conflict to merge
    /// * `field_selections` - Map of field names to their winning side
    ///
    /// # Returns
    /// A `ConflictResolution` with merged data from both sides
    pub fn merge_fields(
        conflict: &Conflict,
        field_selections: impl IntoIterator<Item = (String, ConflictWinner)>,
    ) -> ConflictResolution {
        let selections: HashMap<String, ConflictWinner> =
            field_selections.into_iter().collect();

        // Build merged data from selections
        let mut merged_fields = HashMap::new();

        for field in &conflict.conflicting_fields {
            let winner = selections.get(field).unwrap_or(&ConflictWinner::Local);
            let value = match winner {
                ConflictWinner::Local | ConflictWinner::Pending => {
                    conflict.local_data.get_field(field).cloned()
                }
                ConflictWinner::Remote | ConflictWinner::Merged => {
                    conflict.remote_data.get_field(field).cloned()
                }
            };
            if let Some(v) = value {
                merged_fields.insert(field.clone(), v);
            }
        }

        ConflictResolution {
            winner: ConflictWinner::Merged,
            resolved_at: Utc::now(),
            resolved_by: None,
            field_selections: selections,
            merged_data: Some(EntitySnapshot::new(merged_fields)),
        }
    }

    /// Check if a conflict can be auto-resolved (non-overlapping changes).
    ///
    /// A conflict can be auto-merged when there are no overlapping field changes,
    /// meaning both sides modified different fields.
    ///
    /// # Arguments
    /// * `conflict` - The conflict to check
    ///
    /// # Returns
    /// `true` if the conflict can be automatically merged
    pub fn can_auto_merge(conflict: &Conflict) -> bool {
        // If no overlapping field changes, we can auto-merge
        conflict.conflicting_fields.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::sync::SyncEntity;

    fn make_conflict(local_time: i64, remote_time: i64) -> Conflict {
        use chrono::TimeZone;

        let local_data = EntitySnapshot {
            fields: HashMap::from([
                ("name".to_string(), serde_json::json!("Jon")),
                ("email".to_string(), serde_json::json!("jon@local.com")),
            ]),
            captured_at: Utc.timestamp_opt(local_time, 0).unwrap(),
        };

        let remote_data = EntitySnapshot {
            fields: HashMap::from([
                ("name".to_string(), serde_json::json!("John")),
                ("email".to_string(), serde_json::json!("john@remote.com")),
            ]),
            captured_at: Utc.timestamp_opt(remote_time, 0).unwrap(),
        };

        Conflict::new(
            SyncEntity::employee("emp-1", "qb-123"),
            local_data,
            remote_data,
            vec!["name".to_string(), "email".to_string()],
        )
    }

    #[test]
    fn local_wins_strategy() {
        let conflict = make_conflict(1000, 2000);
        let resolution = ConflictResolver::resolve(&conflict, ConflictStrategy::LocalWins);
        assert_eq!(resolution.winner, ConflictWinner::Local);
    }

    #[test]
    fn remote_wins_strategy() {
        let conflict = make_conflict(1000, 2000);
        let resolution = ConflictResolver::resolve(&conflict, ConflictStrategy::RemoteWins);
        assert_eq!(resolution.winner, ConflictWinner::Remote);
    }

    #[test]
    fn last_write_wins_picks_newer_local() {
        let conflict = make_conflict(2000, 1000); // Local is newer
        let resolution = ConflictResolver::resolve(&conflict, ConflictStrategy::LastWriteWins);
        assert_eq!(resolution.winner, ConflictWinner::Local);
    }

    #[test]
    fn last_write_wins_picks_newer_remote() {
        let conflict = make_conflict(1000, 2000); // Remote is newer
        let resolution = ConflictResolver::resolve(&conflict, ConflictStrategy::LastWriteWins);
        assert_eq!(resolution.winner, ConflictWinner::Remote);
    }

    #[test]
    fn manual_strategy_leaves_pending() {
        let conflict = make_conflict(1000, 2000);
        let resolution = ConflictResolver::resolve(&conflict, ConflictStrategy::Manual);
        assert_eq!(resolution.winner, ConflictWinner::Pending);
    }

    #[test]
    fn resolve_all_applies_to_multiple() {
        let conflicts = vec![make_conflict(1000, 2000), make_conflict(3000, 1000)];

        let resolved = ConflictResolver::resolve_all(&conflicts, ConflictStrategy::LocalWins);

        assert_eq!(resolved.len(), 2);
        assert!(resolved.iter().all(|(_, r)| r.winner == ConflictWinner::Local));
    }

    #[test]
    fn merge_fields_creates_merged_data() {
        let conflict = make_conflict(1000, 2000);

        let resolution = ConflictResolver::merge_fields(
            &conflict,
            vec![
                ("name".to_string(), ConflictWinner::Local),
                ("email".to_string(), ConflictWinner::Remote),
            ],
        );

        assert_eq!(resolution.winner, ConflictWinner::Merged);
        assert!(resolution.merged_data.is_some());

        let merged = resolution.merged_data.unwrap();
        assert_eq!(merged.get_string("name"), Some("Jon"));
        assert_eq!(merged.get_string("email"), Some("john@remote.com"));
    }

    #[test]
    fn can_auto_merge_empty_conflicts() {
        let mut conflict = make_conflict(1000, 2000);
        conflict.conflicting_fields = vec![]; // No overlapping changes

        assert!(ConflictResolver::can_auto_merge(&conflict));
    }

    #[test]
    fn cannot_auto_merge_with_conflicts() {
        let conflict = make_conflict(1000, 2000);
        assert!(!ConflictResolver::can_auto_merge(&conflict));
    }
}
