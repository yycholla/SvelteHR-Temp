# Feature 13: Reconciliation Dashboard

## Overview
Real-time dashboard showing data consistency between local HR database and QuickBooks, with automated discrepancy detection and one-click reconciliation.

## Current System Integration
- Conflicts page shows sync-time conflicts
- No proactive reconciliation
- No data quality monitoring

## Key Components
- Real-time data comparison
- Discrepancy highlighting
- Field-level diff viewer
- One-click sync/fix buttons
- Historical reconciliation reports
- Automated alerts for drift

## Technical Requirements
### Backend Service
```rust
pub struct ReconciliationService {
    // Compare local vs QB data
    pub async fn compare_entities(&self, entity_type: EntityType) 
        -> Result<ReconciliationReport> {
        // Fetch both datasets
        // Calculate differences
        // Categorize discrepancies
    }
    
    // Auto-fix safe discrepancies
    pub async fn auto_reconcile(&self, discrepancy_ids: Vec<Uuid>) 
        -> Result<ReconciliationResult>
}

pub struct Discrepancy {
    entity_id: String,
    field_name: String,
    local_value: String,
    remote_value: String,
    last_synced: DateTime<Utc>,
    suggested_fix: ReconciliationAction,
}
```

### Dashboard UI
- Summary cards (total records, discrepancies, last sync)
- Discrepancy list with severity indicators
- Drill-down to entity details
- Batch reconciliation actions
- Schedule automatic reconciliation checks

## Dependencies
- Efficient data comparison algorithms
- Real-time data fetching
- Smart conflict resolution logic
- Notification system

## Research Notes
- [ ] Optimal comparison frequency (real-time vs periodic)
- [ ] Performance with large datasets
- [ ] Categorization of discrepancy types
- [ ] Auto-fix safety rules
- [ ] Reconciliation scheduling strategies

## Success Metrics
- Data consistency score > 99%
- Discrepancy detection time < 1 minute
- Auto-fix success rate > 95%
- User satisfaction with dashboard

## Notes
_Research findings and implementation decisions_
