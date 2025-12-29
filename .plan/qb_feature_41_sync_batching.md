# Feature 41: Sync Batching Intelligence

## Overview
Intelligent batching system that groups related sync operations, optimizes API call efficiency, and reduces QuickBooks API costs through smart request consolidation.

## Current System Integration
- Individual API calls per entity
- No batching or grouping
- Inefficient API usage
- High API call counts

## Key Components
- Request batching engine
- Smart grouping algorithms
- Rate limit management
- API call optimization
- Batch size tuning
- Concurrent request management
- Retry batching for failures

## Technical Requirements
### Batching Engine
```rust
pub struct BatchingEngine {
    db: DatabaseConnection,
    qb_client: QuickBooksClient,
    config: BatchConfig,
}

pub struct BatchConfig {
    pub max_batch_size: usize,      // Max entities per batch
    pub max_concurrent_batches: usize, // Parallel batch limit
    pub batch_timeout_ms: u64,      // Time to wait for more items
    pub retry_strategy: RetryStrategy,
}

impl BatchingEngine {
    // Collect changes and batch them efficiently
    pub async fn batch_sync(&self, changes: Vec<SyncChange>) 
        -> Result<Vec<SyncResult>> {
        // Group by entity type and operation
        let batches = self.create_optimal_batches(changes);
        
        // Process batches concurrently (respecting rate limits)
        let results = self.process_batches_parallel(batches).await?;
        
        Ok(results)
    }
    
    fn create_optimal_batches(&self, changes: Vec<SyncChange>) 
        -> Vec<Batch> {
        let mut batches = Vec::new();
        
        // Group by entity type
        let by_type = self.group_by_entity_type(changes);
        
        for (entity_type, items) in by_type {
            // Further group by operation (Create, Update, Delete)
            let by_operation = self.group_by_operation(items);
            
            for (operation, batch_items) in by_operation {
                // Split into optimal batch sizes
                for chunk in batch_items.chunks(self.config.max_batch_size) {
                    batches.push(Batch {
                        entity_type,
                        operation,
                        items: chunk.to_vec(),
                    });
                }
            }
        }
        
        batches
    }
    
    async fn process_batches_parallel(&self, batches: Vec<Batch>) 
        -> Result<Vec<SyncResult>> {
        use futures::stream::{self, StreamExt};
        
        let results = stream::iter(batches)
            .map(|batch| self.process_single_batch(batch))
            .buffer_unordered(self.config.max_concurrent_batches)
            .collect::<Vec<_>>()
            .await;
        
        Ok(results.into_iter().flatten().collect())
    }
}
```

### Batching Strategies
**1. Time-based Batching:**
- Wait up to 5 seconds to collect more changes
- Process batch when timeout expires

**2. Size-based Batching:**
- Process immediately when batch reaches max size (100 items)

**3. Smart Batching:**
- Combine both strategies
- Dynamic batch size based on change rate
- Adaptive timeout based on urgency

### Database Schema
```sql
CREATE TABLE hr_public.sync_batches (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    entity_type VARCHAR(50),
    operation VARCHAR(20),
    batch_size INTEGER,
    status VARCHAR(20),
    api_calls_used INTEGER,
    success_count INTEGER,
    failure_count INTEGER
);

CREATE TABLE hr_public.batch_items (
    id UUID PRIMARY KEY,
    batch_id UUID REFERENCES hr_public.sync_batches(id),
    entity_id VARCHAR(255),
    status VARCHAR(20),
    error_message TEXT
);
```

### API Call Optimization
**Before Batching:**
- 170 employees = 170 API calls
- 50 departments = 50 API calls
- Total: 220 API calls

**After Batching:**
- 170 employees / 25 per batch = 7 API calls
- 50 departments / 25 per batch = 2 API calls
- Total: 9 API calls
- **Savings: 96%**

## Dependencies
- Rate limiter library
- Async runtime (tokio)
- Queue system (optional: Redis)
- Concurrent processing utilities

## Implementation Phases
### Phase 1: Basic Batching
- Group entities by type
- Fixed batch size (25 items)
- Sequential processing

### Phase 2: Parallel Processing
- Concurrent batch execution
- Rate limit enforcement
- Error handling per batch

### Phase 3: Intelligence
- Dynamic batch sizing
- Adaptive timeouts
- Priority batching
- Cost optimization

## Research Notes
- [ ] QuickBooks API batch endpoints
- [ ] Optimal batch size (testing needed)
- [ ] Rate limit thresholds
- [ ] Error handling in batches (partial failures)
- [ ] Transaction boundaries

## Batching Algorithms
**Greedy Batching:**
- Fill batches to maximum size
- Simple but may delay small changes

**Priority Batching:**
- High-priority changes in small batches (fast)
- Low-priority changes in large batches (efficient)

**Adaptive Batching:**
- Machine learning to predict optimal batch size
- Learn from historical performance
- Adjust based on current load

## Success Metrics
- API call reduction: > 90%
- Cost savings: > $500/month
- Sync latency increase: < 10%
- Batch success rate: > 99%

## Open Questions
- [ ] How to handle batch partial failures?
- [ ] Should we prioritize certain entity types?
- [ ] What's the maximum acceptable latency?
- [ ] Do we need real-time override for urgent changes?

## Related Features
- #3 Incremental Sync (provides changes to batch)
- #1 Real-Time Webhooks (may bypass batching)
- #14 Sync Health Monitoring (monitor batch efficiency)

## Notes
_Research findings and implementation decisions_
