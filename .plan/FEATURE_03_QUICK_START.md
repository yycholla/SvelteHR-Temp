# Feature 03: Incremental Sync - Quick Start Guide

## For Developers

### Running Migrations

```bash
cd graphql-rust-server
cargo run --bin migration -- up
```

### Using Incremental Sync in Code

```rust
use crate::services::{SyncOrchestrator, SyncMode, EntityType};
use crate::integrations::intuit::IntuitClient;

// Automatic mode (recommended - system decides)
let report = SyncOrchestrator::sync_bidirectional_intelligent(
    &db,
    &client,
    EntityType::Employee,
    ConflictStrategy::QuickBooksWins,
    SyncMode::Auto  // Let system decide
).await?;

println!("Sync completed: {} mode", report.sync_mode);
println!("Changes detected: {}", report.changes_detected);
println!("Changes processed: {}", report.changes_processed);
println!("Pushed: {}, Pulled: {}", report.pushed_count, report.pulled_count);

// Force incremental sync
let report = SyncOrchestrator::sync_bidirectional_intelligent(
    &db,
    &client,
    EntityType::Department,
    ConflictStrategy::QuickBooksWins,
    SyncMode::Incremental  // Force incremental (fallback to full if not viable)
).await?;

// Force full sync (integrity check)
let report = SyncOrchestrator::sync_bidirectional_intelligent(
    &db,
    &client,
    EntityType::Employee,
    ConflictStrategy::QuickBooksWins,
    SyncMode::Full  // Force full sync
).await?;
```

### Decision Logic

The system automatically decides sync mode based on:

1. **No Previous Sync?** → Full Sync
2. **Last Sync > 7 Days Ago?** → Full Sync (integrity check)
3. **All Checks Pass?** → Incremental Sync

### Key Files

```
graphql-rust-server/
├── migration/
│   └── m20251229_004_incremental_sync.rs    # Database schema
├── src/
│   ├── models/
│   │   ├── intuit_sync_log.rs               # Enhanced with sync metrics
│   │   └── intuit_connection.rs             # Enhanced with sync state
│   ├── services/
│   │   ├── incremental_sync.rs              # NEW: Core logic
│   │   └── sync_orchestrator.rs             # Enhanced with incremental methods
│   └── integrations/intuit/
│       └── client.rs                         # Enhanced with timestamp queries
```

## For GraphQL API Implementers

### Next Steps

1. **Add GraphQL Mutations:**
```graphql
mutation SyncEmployees($mode: SyncMode!) {
  syncEmployees(mode: $mode) {
    syncMode
    changesDetected
    changesProcessed
    pushedCount
    pulledCount
    errors {
      entityId
      errorMessage
    }
  }
}
```

2. **Add GraphQL Queries:**
```graphql
query SyncMetadata($entityType: EntityType!) {
  syncMetadata(entityType: $entityType) {
    lastSyncAt
    syncToken
    shouldUseIncremental
    reason
  }
}
```

## For Frontend Developers

### UI Elements Needed

1. **Sync Status Display:**
   - "Last synced 2 hours ago (Incremental)"
   - "15 employees changed since last sync"

2. **Sync Button Options:**
   - Default: "Sync Now" (Auto mode)
   - Advanced: "Force Full Sync" (Full mode)

3. **Performance Metrics:**
   - Sync duration
   - API calls saved
   - Time saved vs full sync

## Performance Expectations

### Before (Full Sync):
- **170 employees:** 15-20 seconds
- **API calls:** 220+
- **Database queries:** High volume

### After (Incremental Sync):
- **5-10 changed employees:** 2-3 seconds
- **API calls:** 10-15
- **Database queries:** 90%+ reduction

## Testing

### Unit Tests:
```bash
cd graphql-rust-server
cargo test incremental_sync
```

### Integration Testing:
1. Create test employees in QuickBooks sandbox
2. Run full sync
3. Modify 2-3 employees in QuickBooks
4. Run incremental sync
5. Verify only modified employees are synced

## Monitoring

### Key Metrics to Track:
- Sync mode distribution (incremental vs full ratio)
- Average sync duration by mode
- Changes detected vs processed
- Fallback frequency (incremental → full)

### Logging:
All sync operations log to:
- Level: INFO for normal operations
- Level: WARN for fallbacks
- Level: ERROR for failures

Search logs for:
```
"Sync mode decision"
"Incremental sync completed"
"Incremental sync failed, falling back"
```

## Troubleshooting

### Issue: Always using full sync
**Check:**
1. Last sync timestamp in intuit_connections table
2. Sync age (forces full if > 7 days)
3. Error logs for incremental sync failures

### Issue: Missing changes
**Cause:** Clock skew between systems
**Solution:** System already has 5-minute buffer built in

### Issue: Performance not improved
**Check:**
1. Verify incremental mode is actually being used
2. Check number of changes detected
3. If many changes, incremental may be slower (rare)

## Database Schema

### New Fields in `intuit_sync_log`:
- `sync_mode`: "full" | "incremental" | "full_fallback"
- `changes_detected`: Total changes found
- `changes_processed`: Successfully synced changes
- `sync_duration_ms`: Duration in milliseconds

### New Fields in `intuit_connections`:
- `employee_sync_token`: Last employee sync state
- `department_sync_token`: Last department sync state
- `last_employee_sync_at`: Last employee sync timestamp
- `last_department_sync_at`: Last department sync timestamp

## Advanced Usage

### Manual Sync Metadata Update:
```rust
IncrementalSyncService::update_sync_metadata(
    &db,
    EntityType::Employee,
    Utc::now(),
    Some("custom_token".to_string())
).await?;
```

### Custom Timestamp Calculation:
```rust
let since = IncrementalSyncService::calculate_since_timestamp(last_sync);
// Subtracts 5 minutes for clock skew buffer
```

### Check Sync Viability:
```rust
let metadata = IncrementalSyncService::get_sync_metadata(
    &db,
    EntityType::Employee
).await?;

if metadata.should_use_incremental {
    println!("Ready for incremental sync: {}", metadata.reason);
} else {
    println!("Must use full sync: {}", metadata.reason);
}
```

## Related Documentation

- Feature Spec: `.plan/qb_feature_03_incremental_sync.md`
- Implementation Summary: `.plan/FEATURE_03_INCREMENTAL_SYNC_IMPLEMENTATION.md`
- QuickBooks Query API: https://developer.intuit.com/app/developer/qbo/docs/api/accounting/most-commonly-used/query
