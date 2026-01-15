# Feature 03: Incremental Sync

## Overview

Optimize synchronization performance by only syncing entities that have changed since the last successful sync, rather than processing the entire dataset every time.

## Current System Integration

### Existing Components

- **Sync Orchestrator**: `graphql-rust-server/src/services/sync_orchestrator.rs`
  - Currently uses `get_all_employees()` and `get_all_departments()` (full syncs)
- **Sync Log**: `intuit_sync_log` table tracks sync history
- **Change Tracking**: `last_synced_at` and `quickbooks_sync_token` fields exist

### Current Behavior

- Every sync fetches ALL employees/departments from QuickBooks
- Compares all records against local database
- Inefficient for large datasets (170 employees = 170 API calls)
- No change detection before fetching

## Technical Requirements

### QuickBooks Change Data Capture (CDC)

#### Using SyncToken

QuickBooks provides a `SyncToken` field that increments on every entity update:

```json
{
	"Employee": {
		"Id": "123",
		"SyncToken": "5", // Increments with each change
		"MetaData": {
			"LastUpdatedTime": "2025-12-29T10:30:00-08:00"
		}
	}
}
```

#### Query API with Filtering

```sql
-- QuickBooks Query API supports filtering by LastUpdatedTime
SELECT * FROM Employee WHERE Metadata.LastUpdatedTime > '2025-12-28T00:00:00'
```

### Database Schema Updates

#### Sync Metadata Table

```sql
CREATE TABLE hr_public.sync_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL,
    last_successful_sync_at TIMESTAMPTZ,
    last_sync_token VARCHAR(255),
    records_synced INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(entity_type)
);

-- Store last known SyncToken for each entity
CREATE TABLE hr_public.entity_sync_state (
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    local_uuid UUID,
    quickbooks_sync_token VARCHAR(50),
    last_synced_at TIMESTAMPTZ,
    PRIMARY KEY(entity_type, entity_id)
);
```

#### Enhanced Sync Log

```sql
ALTER TABLE hr_public.intuit_sync_log
ADD COLUMN sync_mode VARCHAR(20), -- 'full' or 'incremental'
ADD COLUMN changes_detected INTEGER,
ADD COLUMN changes_processed INTEGER,
ADD COLUMN sync_duration_ms INTEGER;
```

### Backend Implementation (Rust)

#### Change Detection Service

```rust
pub struct ChangeDetector {
    db: DatabaseConnection,
    qb_client: QuickBooksClient,
}

impl ChangeDetector {
    // Get entities changed since last sync
    pub async fn get_changed_employees(&self, since: DateTime<Utc>) -> Result<Vec<QBEmployee>> {
        let query = format!(
            "SELECT * FROM Employee WHERE Metadata.LastUpdatedTime > '{}'",
            since.to_rfc3339()
        );
        self.qb_client.query(query).await
    }

    // Compare SyncTokens to detect changes
    pub async fn detect_employee_changes(&self) -> Result<SyncDelta> {
        let last_sync = self.get_last_sync_time("Employee").await?;
        let changed_in_qb = self.get_changed_employees(last_sync).await?;

        // Also check local changes
        let changed_locally = self.get_locally_modified_employees(last_sync).await?;

        Ok(SyncDelta {
            remote_changes: changed_in_qb,
            local_changes: changed_locally,
        })
    }
}

pub struct SyncDelta {
    pub remote_changes: Vec<QBEmployee>,
    pub local_changes: Vec<Employee>,
}
```

#### Optimized Sync Flow

```rust
pub async fn incremental_sync_employees(&self) -> Result<SyncResult> {
    // 1. Get last successful sync timestamp
    let last_sync = self.get_last_sync_metadata("Employee").await?;

    // 2. Detect changes (both directions)
    let delta = self.change_detector.detect_employee_changes().await?;

    // 3. Only process changed records
    if delta.is_empty() {
        return Ok(SyncResult::no_changes());
    }

    // 4. Sync only what changed
    let results = self.process_changes(delta).await?;

    // 5. Update sync metadata
    self.update_sync_metadata("Employee", Utc::now()).await?;

    Ok(results)
}
```

### Frontend Updates

- Display "Incremental" vs "Full" sync mode
- Show change counts: "15 employees changed since last sync"
- Option to force full sync (fallback)
- Sync performance metrics (time saved)

## Dependencies

- [ ] QuickBooks Query API documentation review
- [ ] SyncToken field availability for all entities
- [ ] Date filtering support in QB API
- [ ] Efficient local change detection queries

## Implementation Phases

### Phase 1: Change Detection Infrastructure

- [ ] Create sync_metadata table
- [ ] Create entity_sync_state table
- [ ] Implement last sync timestamp tracking
- [ ] Build change detection queries

### Phase 2: Incremental Pull (QB → Local)

- [ ] Modify `get_changed_employees()` to use timestamp filter
- [ ] Update sync orchestrator to use incremental logic
- [ ] Test with various change scenarios
- [ ] Fallback to full sync on errors

### Phase 3: Incremental Push (Local → QB)

- [ ] Track local modifications (updated_at timestamps)
- [ ] Only push changed local records
- [ ] SyncToken conflict handling
- [ ] Optimistic concurrency control

### Phase 4: Optimization & Monitoring

- [ ] Performance metrics collection
- [ ] Sync mode selection UI (auto/incremental/full)
- [ ] Change count displays
- [ ] Analytics dashboard

## Research Notes

### QuickBooks API Capabilities

- [ ] Test date filtering: `WHERE Metadata.LastUpdatedTime > 'X'`
- [ ] Verify SyncToken increments reliably
- [ ] Check deleted entity handling (soft delete tracking)
- [ ] Rate limit implications (fewer calls = better)

### Change Detection Strategies

**Option 1: Timestamp-based**

- Pro: Simple, widely supported
- Con: Clock skew issues, timezone handling

**Option 2: SyncToken-based**

- Pro: Atomic, reliable
- Con: Requires storing all tokens

**Option 3: Hybrid**

- Use timestamps for initial filter
- Verify with SyncToken for safety

### Local Change Tracking

```sql
-- Track local modifications
ALTER TABLE hr_public.users
ADD COLUMN local_modified_at TIMESTAMPTZ,
ADD COLUMN sync_needed BOOLEAN DEFAULT false;

-- Trigger to set flags on update
CREATE TRIGGER mark_sync_needed
AFTER UPDATE ON hr_public.users
FOR EACH ROW
EXECUTE FUNCTION mark_for_sync();
```

### Deleted Entity Handling

- QuickBooks doesn't always provide deleted entity notifications
- Need periodic full sync to catch deletions
- Or use webhook notifications for deletes

## Performance Benchmarks

### Current (Full Sync)

- 170 employees: ~15-20 seconds
- 50 departments: ~5 seconds
- Total API calls: 220+

### Target (Incremental)

- Average changes: 5-10 employees/day
- Expected sync time: ~2-3 seconds
- API calls: 10-15
- **~85% reduction in sync time**

## Security Considerations

- [ ] Prevent sync metadata manipulation
- [ ] Audit trail for sync mode changes
- [ ] Rate limiting still applies (but less pressure)
- [ ] Handle clock skew/timezone attacks

## Testing Strategy

- [ ] Test incremental sync with no changes
- [ ] Test with only remote changes
- [ ] Test with only local changes
- [ ] Test with both directions changed
- [ ] Test with deleted entities
- [ ] Stress test with large change sets
- [ ] Test fallback to full sync

## Success Metrics

- 80%+ reduction in sync time for routine syncs
- 90%+ reduction in API calls
- Zero missed changes (validate against full sync)
- User satisfaction with speed

## Open Questions

- [ ] How often should we force a full sync? (weekly?)
- [ ] How to handle entities deleted in QB?
- [ ] Should we track individual field changes?
- [ ] What's the fallback strategy if incremental fails?
- [ ] How to detect if QB data was bulk-modified outside our app?
- [ ] Do we need a "verify integrity" full sync option?

## Edge Cases

- [ ] **First sync**: No previous sync metadata → full sync
- [ ] **Clock skew**: User changes QB timezone → potential missed changes
- [ ] **Bulk import in QB**: Large change set might overwhelm incremental
- [ ] **Sync failure recovery**: Resume from last successful checkpoint
- [ ] **Concurrent syncs**: Lock mechanism to prevent overlaps

## Cost/Benefit Analysis

### Benefits

- Faster sync operations (happier users)
- Reduced API costs (fewer calls)
- Lower server load
- Better scalability

### Costs

- Development time: ~1-2 weeks
- Additional database storage (sync metadata)
- Complexity in sync logic
- Testing overhead

### ROI

- With 170 employees, ~5 changes/day:
  - Current: 170 API calls/sync
  - Incremental: ~10 API calls/sync
  - **Savings: 94% per sync**

## Related Features

- #1 Real-Time Webhooks (provides change notifications)
- #2 Sync Scheduling (makes scheduled syncs efficient)
- #41 Sync Batching Intelligence (batch incremental changes)
- #14 Sync Health Monitoring (track incremental vs full sync ratio)

## Notes

_Add research findings, implementation decisions, and learnings here as you explore this feature._
