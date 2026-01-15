# Feature 7: Comprehensive Audit Trail - Implementation Prep

## Current State Analysis

### Existing Infrastructure

From `graphql-rust-server/src/models/intuit_sync_log.rs`:

**Current Fields:**

```rust
pub struct Model {
    pub id: Uuid,
    pub user_id: Option<Uuid>,
    pub sync_type: String,           // "Employee", "Department"
    pub direction: String,            // "Pull", "Push", "Bidirectional"
    pub status: String,               // "Success", "Error", "Pending"
    pub error_message: Option<String>,
    pub payload: Option<JsonValue>,   // Basic payload storage

    // Enhanced tracking (recently added)
    pub change_direction: Option<String>,
    pub conflict_detected: bool,
    pub conflict_resolution: Option<String>,
    pub pushed_count: i32,
    pub pulled_count: i32,
    pub updated_count: i32,
    pub skipped_count: i32,
    pub retry_count: i32,
    pub next_retry_at: Option<DateTimeWithTimeZone>,
    pub quickbooks_metadata: Option<JsonValue>,

    pub created_at: DateTimeWithTimeZone,
}
```

### Gaps for Comprehensive Audit

**Missing Critical Features:**

1. ❌ Before/after snapshots of data
2. ❌ Field-level change tracking
3. ❌ Entity-specific audit trails (per employee/department)
4. ❌ Completed_at timestamp (only has created_at)
5. ❌ Operation duration tracking
6. ❌ IP address / user agent
7. ❌ Rollback reference tracking
8. ❌ Data diff visualization

---

## Enhancement Strategy

### Approach: Additive Architecture

**DO NOT replace `intuit_sync_log`** - it serves its purpose well for sync operations.

**ADD NEW TABLES** for comprehensive audit:

1. `sync_audit_snapshots` - Before/after entity state
2. `field_change_audit` - Field-level change tracking
3. `sync_sessions` - Group related operations

---

## Detailed Implementation Plan

### Phase 1: Snapshot System

#### 1.1 Database Migration

```sql
-- Snapshot storage for before/after states
CREATE TABLE hr_public.sync_audit_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_log_id UUID REFERENCES hr_public.intuit_sync_log(id),
    entity_type VARCHAR(50) NOT NULL,  -- 'Employee', 'Department'
    entity_id VARCHAR(255) NOT NULL,   -- QuickBooks ID or local UUID
    snapshot_type VARCHAR(20) NOT NULL, -- 'BEFORE' or 'AFTER'
    snapshot_data JSONB NOT NULL,      -- Full entity state
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_snapshots_sync_log ON hr_public.sync_audit_snapshots(sync_log_id);
CREATE INDEX idx_snapshots_entity ON hr_public.sync_audit_snapshots(entity_type, entity_id);

-- Session grouping for related operations
CREATE TABLE hr_public.sync_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES hr_public.users(id),
    session_type VARCHAR(50) NOT NULL, -- 'MANUAL_SYNC', 'SCHEDULED_SYNC', 'WEBHOOK_TRIGGERED'
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    total_operations INTEGER DEFAULT 0,
    successful_operations INTEGER DEFAULT 0,
    failed_operations INTEGER DEFAULT 0,
    metadata JSONB
);

-- Link sync_log to sessions
ALTER TABLE hr_public.intuit_sync_log
ADD COLUMN sync_session_id UUID REFERENCES hr_public.sync_sessions(id);

-- Enhanced audit trail for compliance
CREATE TABLE hr_public.sync_audit_trail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_log_id UUID REFERENCES hr_public.intuit_sync_log(id),
    entity_type VARCHAR(50),
    entity_id VARCHAR(255),
    action VARCHAR(50) NOT NULL,       -- 'CREATE', 'UPDATE', 'DELETE', 'SYNC'
    user_id UUID REFERENCES hr_public.users(id),
    ip_address INET,
    user_agent TEXT,
    before_state JSONB,                -- Complete before state
    after_state JSONB,                 -- Complete after state
    changes JSONB,                     -- Diff of changes
    rollback_ref UUID,                 -- Reference to rollback operation
    compliance_flags VARCHAR(100)[],   -- ['GDPR_RELEVANT', 'SOX_AUDIT', etc.]
    occurred_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_entity ON hr_public.sync_audit_trail(entity_type, entity_id, occurred_at DESC);
CREATE INDEX idx_audit_user ON hr_public.sync_audit_trail(user_id, occurred_at DESC);
CREATE INDEX idx_audit_date ON hr_public.sync_audit_trail(occurred_at DESC);
```

#### 1.2 Rust Service: SnapshotService

**File**: `graphql-rust-server/src/services/snapshot_service.rs`

```rust
use sea_orm::{DatabaseConnection, EntityTrait, Set};
use serde_json::Value as JsonValue;
use uuid::Uuid;

pub struct SnapshotService {
    db: DatabaseConnection,
}

impl SnapshotService {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    /// Capture entity state before modification
    pub async fn capture_before(
        &self,
        sync_log_id: Uuid,
        entity_type: &str,
        entity_id: &str,
        entity_data: JsonValue,
    ) -> Result<Uuid> {
        let snapshot = sync_audit_snapshots::ActiveModel {
            id: Set(Uuid::new_v4()),
            sync_log_id: Set(Some(sync_log_id)),
            entity_type: Set(entity_type.to_string()),
            entity_id: Set(entity_id.to_string()),
            snapshot_type: Set("BEFORE".to_string()),
            snapshot_data: Set(entity_data),
            created_at: Set(Utc::now().into()),
        };

        let result = snapshot.insert(&self.db).await?;
        Ok(result.id)
    }

    /// Capture entity state after modification
    pub async fn capture_after(
        &self,
        sync_log_id: Uuid,
        entity_type: &str,
        entity_id: &str,
        entity_data: JsonValue,
    ) -> Result<Uuid> {
        let snapshot = sync_audit_snapshots::ActiveModel {
            id: Set(Uuid::new_v4()),
            sync_log_id: Set(Some(sync_log_id)),
            entity_type: Set(entity_type.to_string()),
            entity_id: Set(entity_id.to_string()),
            snapshot_type: Set("AFTER".to_string()),
            snapshot_data: Set(entity_data),
            created_at: Set(Utc::now().into()),
        };

        let result = snapshot.insert(&self.db).await?;
        Ok(result.id)
    }

    /// Get before/after snapshots for comparison
    pub async fn get_snapshots(
        &self,
        sync_log_id: Uuid,
    ) -> Result<(Option<JsonValue>, Option<JsonValue>)> {
        let snapshots = sync_audit_snapshots::Entity::find()
            .filter(sync_audit_snapshots::Column::SyncLogId.eq(sync_log_id))
            .order_by_asc(sync_audit_snapshots::Column::CreatedAt)
            .all(&self.db)
            .await?;

        let before = snapshots.iter()
            .find(|s| s.snapshot_type == "BEFORE")
            .map(|s| s.snapshot_data.clone());

        let after = snapshots.iter()
            .find(|s| s.snapshot_type == "AFTER")
            .map(|s| s.snapshot_data.clone());

        Ok((before, after))
    }

    /// Generate diff between snapshots
    pub async fn generate_diff(
        &self,
        sync_log_id: Uuid,
    ) -> Result<JsonValue> {
        let (before, after) = self.get_snapshots(sync_log_id).await?;

        match (before, after) {
            (Some(b), Some(a)) => {
                // Use json-patch or custom diff logic
                Ok(create_json_diff(&b, &a))
            },
            _ => Ok(serde_json::json!({"error": "Missing snapshots"})),
        }
    }
}

/// Helper function to create JSON diff
fn create_json_diff(before: &JsonValue, after: &JsonValue) -> JsonValue {
    use serde_json::Map;

    let mut changes = Map::new();

    if let (Some(before_obj), Some(after_obj)) = (before.as_object(), after.as_object()) {
        for (key, after_value) in after_obj {
            if let Some(before_value) = before_obj.get(key) {
                if before_value != after_value {
                    changes.insert(key.clone(), serde_json::json!({
                        "before": before_value,
                        "after": after_value
                    }));
                }
            } else {
                changes.insert(key.clone(), serde_json::json!({
                    "before": null,
                    "after": after_value
                }));
            }
        }

        // Check for removed fields
        for (key, before_value) in before_obj {
            if !after_obj.contains_key(key) {
                changes.insert(key.clone(), serde_json::json!({
                    "before": before_value,
                    "after": null
                }));
            }
        }
    }

    serde_json::json!(changes)
}
```

#### 1.3 Integration Points

**Update `sync_orchestrator.rs`**:

```rust
use crate::services::snapshot_service::SnapshotService;

impl SyncOrchestrator {
    async fn pull_employee_change(&self, ...) -> SyncResult {
        let snapshot_service = SnapshotService::new(self.db.clone());

        // 1. Capture BEFORE state
        if let Some(existing_employee) = local_employee {
            let before_data = serde_json::to_value(&existing_employee)?;
            snapshot_service.capture_before(
                sync_log_id,
                "Employee",
                &existing_employee.id.to_string(),
                before_data
            ).await?;
        }

        // 2. Perform sync operation
        let result = self.perform_employee_sync(...).await?;

        // 3. Capture AFTER state
        let updated_employee = Employee::find_by_id(employee_id).one(&self.db).await?;
        if let Some(emp) = updated_employee {
            let after_data = serde_json::to_value(&emp)?;
            snapshot_service.capture_after(
                sync_log_id,
                "Employee",
                &emp.id.to_string(),
                after_data
            ).await?;
        }

        result
    }
}
```

---

### Phase 2: Field-Level Change Tracking

#### 2.1 Database Migration

```sql
CREATE TABLE hr_public.field_change_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_log_id UUID REFERENCES hr_public.intuit_sync_log(id),
    sync_audit_id UUID REFERENCES hr_public.sync_audit_trail(id),
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    field_path VARCHAR(255),          -- For nested fields: 'address.street'
    old_value TEXT,
    new_value TEXT,
    value_type VARCHAR(50),           -- 'string', 'number', 'boolean', 'object'
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    changed_by UUID REFERENCES hr_public.users(id)
);

CREATE INDEX idx_field_changes_entity ON hr_public.field_change_audit(entity_type, entity_id, changed_at DESC);
CREATE INDEX idx_field_changes_field ON hr_public.field_change_audit(field_name);
CREATE INDEX idx_field_changes_log ON hr_public.field_change_audit(sync_log_id);
```

#### 2.2 Field Change Extractor

```rust
pub fn extract_field_changes(
    before: &JsonValue,
    after: &JsonValue,
) -> Vec<FieldChange> {
    let mut changes = Vec::new();

    fn extract_recursive(
        before: &JsonValue,
        after: &JsonValue,
        path: &str,
        changes: &mut Vec<FieldChange>,
    ) {
        match (before, after) {
            (Value::Object(b_map), Value::Object(a_map)) => {
                for (key, a_val) in a_map {
                    let current_path = if path.is_empty() {
                        key.clone()
                    } else {
                        format!("{}.{}", path, key)
                    };

                    if let Some(b_val) = b_map.get(key) {
                        if b_val != a_val {
                            extract_recursive(b_val, a_val, &current_path, changes);
                        }
                    } else {
                        changes.push(FieldChange {
                            field_name: key.clone(),
                            field_path: Some(current_path.clone()),
                            old_value: None,
                            new_value: Some(a_val.to_string()),
                        });
                    }
                }
            },
            (b, a) if b != a => {
                changes.push(FieldChange {
                    field_name: path.split('.').last().unwrap_or(path).to_string(),
                    field_path: Some(path.to_string()),
                    old_value: Some(b.to_string()),
                    new_value: Some(a.to_string()),
                });
            },
            _ => {}
        }
    }

    extract_recursive(before, after, "", &mut changes);
    changes
}
```

---

### Phase 3: GraphQL Schema Extensions

```rust
// In schema/queries/audit.rs

#[derive(SimpleObject)]
pub struct AuditLog {
    pub id: String,
    pub entity_type: String,
    pub entity_id: String,
    pub action: String,
    pub user: Option<User>,
    pub before_state: Option<JsonValue>,
    pub after_state: Option<JsonValue>,
    pub changes: Vec<FieldChange>,
    pub occurred_at: DateTime<Utc>,
}

#[derive(SimpleObject)]
pub struct FieldChange {
    pub field_name: String,
    pub field_path: Option<String>,
    pub old_value: Option<String>,
    pub new_value: Option<String>,
}

#[derive(SimpleObject)]
pub struct SyncSession {
    pub id: String,
    pub session_type: String,
    pub started_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
    pub total_operations: i32,
    pub successful_operations: i32,
    pub failed_operations: i32,
    pub operations: Vec<AuditLog>,
}

impl QueryRoot {
    async fn audit_trail(
        &self,
        ctx: &Context<'_>,
        entity_type: Option<String>,
        entity_id: Option<String>,
        start_date: Option<DateTime<Utc>>,
        end_date: Option<DateTime<Utc>>,
        limit: Option<i32>,
    ) -> Result<Vec<AuditLog>> {
        // Implementation
    }

    async fn sync_session(
        &self,
        ctx: &Context<'_>,
        session_id: String,
    ) -> Result<SyncSession> {
        // Implementation
    }

    async fn compare_snapshots(
        &self,
        ctx: &Context<'_>,
        sync_log_id: String,
    ) -> Result<AuditComparison> {
        // Implementation
    }
}
```

---

### Phase 4: Frontend Components

#### Audit Trail Viewer

**File**: `src/lib/components/sync/AuditTrailViewer.svelte`

```svelte
<script lang="ts">
	import { formatDate } from '$lib/utils/date';
	import { Badge } from '$lib/components/ui/badge';
	import { Card } from '$lib/components/ui/card';

	let { auditLogs = [] } = $props();

	function getActionColor(action: string) {
		switch (action) {
			case 'CREATE':
				return 'green';
			case 'UPDATE':
				return 'blue';
			case 'DELETE':
				return 'red';
			case 'SYNC':
				return 'purple';
			default:
				return 'gray';
		}
	}
</script>

<div class="audit-trail">
	<h2>Audit Trail</h2>

	{#each auditLogs as log}
		<Card class="mb-4">
			<div class="flex justify-between items-start">
				<div>
					<Badge variant={getActionColor(log.action)}>
						{log.action}
					</Badge>
					<span class="text-sm ml-2">{log.entityType}</span>
				</div>
				<span class="text-xs text-gray-500">
					{formatDate(log.occurredAt)}
				</span>
			</div>

			{#if log.changes.length > 0}
				<div class="mt-3">
					<strong class="text-sm">Changes:</strong>
					<ul class="mt-2 space-y-1">
						{#each log.changes as change}
							<li class="text-sm">
								<span class="font-medium">{change.fieldName}:</span>
								<span class="text-red-600 line-through">{change.oldValue || 'null'}</span>
								→
								<span class="text-green-600">{change.newValue || 'null'}</span>
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			{#if log.user}
				<div class="mt-2 text-xs text-gray-600">
					by {log.user.email}
				</div>
			{/if}
		</Card>
	{/each}
</div>
```

---

## Integration Checklist

- [ ] Create migrations for new audit tables
- [ ] Create SeaORM entity models
- [ ] Implement SnapshotService
- [ ] Integrate snapshot capture into sync_orchestrator
- [ ] Add field-level change extraction
- [ ] Create GraphQL schema extensions
- [ ] Add audit trail queries
- [ ] Build frontend audit viewer component
- [ ] Add before/after comparison UI
- [ ] Create compliance report export
- [ ] Add retention policy for old audits
- [ ] Write comprehensive tests
- [ ] Performance test with large datasets
- [ ] Add caching for frequently accessed audits

---

## Performance Considerations

1. **Snapshot Storage**: JSONB is indexed but can be large
   - Consider compression for old snapshots
   - Archive snapshots older than 90 days to cold storage

2. **Query Optimization**:
   - Partition audit tables by date
   - Use materialized views for common queries
   - Add composite indexes on frequent query patterns

3. **Data Retention**:
   - Keep 90 days of full audits online
   - Archive 91-365 days to S3
   - Keep metadata indefinitely for compliance

---

## Next Steps After Implementation

1. **Monitoring Dashboard**: Real-time audit activity
2. **Compliance Reports**: Automated SOX/GDPR reports
3. **Anomaly Detection**: Flag unusual sync patterns
4. **Rollback System**: Use audit trail for rollbacks
5. **Data Lineage**: Track field changes across time (Feature 45)
