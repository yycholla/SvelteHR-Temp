# Feature 05: Sync Preview / Dry Run

## Overview

Allow users to preview exactly what will change before executing a sync operation. Show a side-by-side comparison of local vs QuickBooks data with clear indicators of what will be created, updated, or deleted.

## Current System Integration

### Existing Components

- **Sync Orchestrator**: `graphql-rust-server/src/services/sync_orchestrator.rs`
- **Sync Mutations**: Current sync operations are "destructive" with no preview
- **Conflicts Page**: Shows conflicts after they occur, not before

### Integration Points

1. New "preview" mode in sync orchestrator
2. Diff calculation service
3. Preview UI component
4. Approval workflow (optional)

## Technical Requirements

### Backend Components (Rust)

#### Preview Service

```rust
pub struct SyncPreview {
    pub creates: Vec<PreviewItem>,
    pub updates: Vec<PreviewItem>,
    pub deletes: Vec<PreviewItem>,
    pub conflicts: Vec<PreviewConflict>,
    pub summary: PreviewSummary,
}

pub struct PreviewItem {
    pub entity_type: String,
    pub entity_id: String,
    pub entity_name: String,
    pub local_data: Option<serde_json::Value>,
    pub remote_data: Option<serde_json::Value>,
    pub field_changes: Vec<FieldChange>,
}

pub struct FieldChange {
    pub field_name: String,
    pub local_value: Option<String>,
    pub remote_value: Option<String>,
    pub will_change_to: String,
}

pub struct PreviewConflict {
    pub entity_id: String,
    pub conflict_type: String,
    pub description: String,
    pub suggested_resolution: String,
}
```

#### Sync Orchestrator Extension

```rust
impl SyncOrchestrator {
    // Non-destructive preview mode
    pub async fn preview_sync(&self, direction: SyncDirection, entity_type: EntityType)
        -> Result<SyncPreview> {
        // Fetch data from both sources
        let local_data = self.get_local_entities(entity_type).await?;
        let remote_data = self.get_remote_entities(entity_type).await?;

        // Calculate differences
        let preview = self.calculate_sync_preview(local_data, remote_data, direction).await?;

        Ok(preview)
    }

    // Detailed field-level diff
    fn calculate_field_changes(&self, local: &Employee, remote: &QBEmployee)
        -> Vec<FieldChange> {
        let mut changes = Vec::new();

        if local.first_name != remote.base.given_name {
            changes.push(FieldChange {
                field_name: "First Name".to_string(),
                local_value: Some(local.first_name.clone()),
                remote_value: remote.base.given_name.clone(),
                will_change_to: remote.base.given_name.clone().unwrap_or_default(),
            });
        }

        // ... check all fields

        changes
    }
}
```

### GraphQL Schema

```graphql
type SyncPreview {
	creates: [PreviewItem!]!
	updates: [PreviewItem!]!
	deletes: [PreviewItem!]!
	conflicts: [PreviewConflict!]!
	summary: PreviewSummary!
}

type PreviewItem {
	entityType: String!
	entityId: ID!
	entityName: String!
	localData: JSON
	remoteData: JSON
	fieldChanges: [FieldChange!]!
}

type FieldChange {
	fieldName: String!
	localValue: String
	remoteValue: String
	willChangeTo: String!
	changeType: ChangeType!
}

enum ChangeType {
	ADDED
	MODIFIED
	REMOVED
	NO_CHANGE
}

type PreviewSummary {
	totalCreates: Int!
	totalUpdates: Int!
	totalDeletes: Int!
	totalConflicts: Int!
	estimatedDuration: Int! # seconds
	apiCallsRequired: Int!
}

type Query {
	previewSync(direction: SyncDirection!, entityType: EntityType!): SyncPreview!
}

type Mutation {
	executeSyncFromPreview(previewId: ID!): SyncResult!
}
```

### Frontend Components

#### Preview UI

```svelte
<script lang="ts">
	let preview = $state<SyncPreview | null>(null);
	let loading = $state(false);

	async function generatePreview() {
		loading = true;
		const result = await client.query(PREVIEW_SYNC_QUERY, {
			direction: 'BIDIRECTIONAL',
			entityType: 'EMPLOYEE'
		});
		preview = result.data.previewSync;
		loading = false;
	}
</script>

<div class="preview-container">
	<div class="summary-cards">
		<SummaryCard icon="➕" count={preview.summary.totalCreates} label="Will Create" />
		<SummaryCard icon="✏️" count={preview.summary.totalUpdates} label="Will Update" />
		<SummaryCard icon="🗑️" count={preview.summary.totalDeletes} label="Will Delete" />
		<SummaryCard icon="⚠️" count={preview.summary.totalConflicts} label="Conflicts" />
	</div>

	<Tabs>
		<Tab label="Updates ({preview.updates.length})">
			{#each preview.updates as item}
				<PreviewItem {item} />
			{/each}
		</Tab>
		<Tab label="Creates ({preview.creates.length})">
			<!-- ... -->
		</Tab>
		<Tab label="Conflicts ({preview.conflicts.length})">
			<!-- ... -->
		</Tab>
	</Tabs>

	<div class="actions">
		<Button variant="outline" onclick={cancel}>Cancel</Button>
		<Button onclick={executeSync} disabled={preview.summary.totalConflicts > 0}>
			Execute Sync
		</Button>
	</div>
</div>
```

#### Diff Viewer Component

```svelte
<!-- Field-level diff display -->
<div class="diff-viewer">
	<div class="entity-header">
		<h3>{item.entityName}</h3>
		<Badge>{item.fieldChanges.length} changes</Badge>
	</div>

	{#each item.fieldChanges as change}
		<div class="field-diff" class:modified={change.changeType === 'MODIFIED'}>
			<div class="field-name">{change.fieldName}</div>
			<div class="value-comparison">
				<div class="old-value">
					<span class="label">Current:</span>
					<span class="value">{change.localValue || '(empty)'}</span>
				</div>
				<ArrowRight />
				<div class="new-value">
					<span class="label">Will become:</span>
					<span class="value highlight">{change.willChangeTo}</span>
				</div>
			</div>
		</div>
	{/each}
</div>
```

## Dependencies

- [ ] Diff calculation library (consider `similar` crate for Rust)
- [ ] JSON comparison utilities
- [ ] Preview state management (cache preview for execution)
- [ ] UI components for diff visualization

## Implementation Phases

### Phase 1: Backend Preview Logic

- [ ] Implement preview mode in sync orchestrator
- [ ] Build diff calculation functions
- [ ] Create preview data structures
- [ ] Add GraphQL preview query

### Phase 2: Frontend Preview UI

- [ ] Summary cards component
- [ ] Tabbed preview interface
- [ ] Field-level diff viewer
- [ ] Expand/collapse functionality

### Phase 3: Execution from Preview

- [ ] Store preview results (short-term cache)
- [ ] Execute sync based on preview
- [ ] Validate preview still valid before execution
- [ ] Show execution progress

### Phase 4: Advanced Features

- [ ] Filter preview by change type
- [ ] Search within preview results
- [ ] Export preview as report
- [ ] Approval workflow integration

## Research Notes

### Diff Calculation Approaches

- [ ] **Full comparison**: Load both datasets, compare all fields
- [ ] **Incremental**: Use change detection from Feature #3
- [ ] **Sampling**: Preview subset for large datasets
- [ ] **Cost**: How many API calls needed for preview?

### Preview Caching

- [ ] Store preview results in Redis (5-minute TTL)
- [ ] Validate preview before execution (check timestamps)
- [ ] Handle stale previews (warn user)

### Large Dataset Handling

- [ ] Pagination for preview results (show 50 at a time)
- [ ] Summary-first approach (show counts before details)
- [ ] Progressive loading (fetch details on demand)

## Security Considerations

- [ ] Preview should be read-only (no modifications)
- [ ] Sensitive data masking in previews
- [ ] Access control (who can preview syncs?)
- [ ] Rate limiting on preview requests

## Testing Strategy

- [ ] Unit tests for diff calculation
- [ ] Test with various entity types
- [ ] Test create/update/delete scenarios
- [ ] Test conflict detection in preview
- [ ] Performance test with 1000+ items

## Success Metrics

- Zero unexpected changes after sync
- User confidence improvement (survey)
- Reduced rollback requests
- Preview accuracy: 99.9%

## Open Questions

- [ ] How long to cache preview results?
- [ ] Should preview block actual sync operations?
- [ ] Do we preview both directions separately or combined?
- [ ] How to handle preview invalidation (data changed during preview)?
- [ ] Should we allow partial sync execution (only some items)?

## UI Mockup

```
Sync Preview - Employees (Bidirectional)
========================================

Summary:
  ➕ 3 will be created
  ✏️ 15 will be updated
  🗑️ 1 will be deleted
  ⚠️ 2 conflicts require resolution

Estimated: 45 seconds, 25 API calls

[Updates (15)] [Creates (3)] [Deletes (1)] [⚠️ Conflicts (2)]

┌─ John Smith (Update) ──────────────────────────┐
│ 📧 Email                                        │
│   Current: john.smith@example.com              │
│         → john.s@company.com (QuickBooks)      │
│                                                 │
│ 📞 Phone                                        │
│   Current: (555) 123-4567                      │
│         → (555) 987-6543 (QuickBooks)          │
│                                                 │
│ 💰 Hourly Rate                                  │
│   Current: $45.00                              │
│         → $47.50 (QuickBooks)                  │
└─────────────────────────────────────────────────┘

[Cancel] [Resolve Conflicts] [Execute Sync]
```

## Related Features

- #3 Incremental Sync (provides efficient data for preview)
- #7 Comprehensive Audit Trail (preview is part of audit)
- #43 Conflict Prediction (preview shows conflicts early)
- #44 Sync Insurance/Backup (preview + backup = safe syncs)

## Cost Analysis

- Development time: ~1 week
- API calls: Preview requires extra calls (acceptable trade-off)
- User benefit: High (confidence in sync operations)

## Notes

_Add research findings, implementation decisions, and learnings here as you explore this feature._
