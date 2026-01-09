# Feature 01: Real-Time Sync with Webhooks

## Overview
Implement QuickBooks webhook listeners to enable instant, event-driven synchronization when data changes in QuickBooks, eliminating the need for manual sync operations.

## Current System Integration

### Existing Components
- **Sync Orchestrator**: `graphql-rust-server/src/services/sync_orchestrator.rs`
- **Intuit Integration**: `graphql-rust-server/src/integrations/intuit/`
- **API Endpoints**: `src/routes/api/intuit/`
- **GraphQL Mutations**: `graphql-rust-server/src/schema/mutations/intuit.rs`

### Integration Points
1. New webhook receiver endpoint in Rust backend
2. Event queue/processing system
3. Integration with existing `sync_orchestrator.rs`
4. Real-time notification to frontend via WebSockets/SSE

## Technical Requirements

### QuickBooks Webhook API
- **Endpoint**: POST webhook from QuickBooks Online
- **Supported Entities**: Customer, Employee, Vendor, Department, etc.
- **Event Types**: Create, Update, Delete, Merge
- **Payload Format**: JSON with entity IDs and operation type
- **Verification**: HMAC signature verification for security

### Backend Implementation (Rust)
```rust
// New endpoint: /api/intuit/webhook
// Components needed:
// 1. Webhook verification middleware
// 2. Event parser and validator
// 3. Job queue (using tokio channels or Redis)
// 4. Background processor
```

### Database Schema
```sql
-- New table: intuit_webhook_events
CREATE TABLE hr_public.intuit_webhook_events (
    id UUID PRIMARY KEY,
    event_id VARCHAR(255) UNIQUE,
    entity_type VARCHAR(50),
    entity_id VARCHAR(255),
    operation VARCHAR(20),
    payload JSONB,
    received_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    status VARCHAR(20),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0
);
```

### Frontend Updates
- Real-time notifications when QB data changes
- Toast notifications for automatic syncs
- Live update of data without page refresh

## Dependencies
- [ ] QuickBooks Online webhook subscription (requires app configuration)
- [ ] HMAC signature verification library
- [ ] Background job processing system (tokio::spawn or dedicated queue)
- [ ] WebSocket/SSE implementation for real-time frontend updates
- [ ] Redis (optional, for distributed job queue)

## Implementation Phases

### Phase 1: Webhook Receiver
- [ ] Create `/api/intuit/webhook` endpoint
- [ ] Implement HMAC verification
- [ ] Parse and validate webhook payloads
- [ ] Store events in database

### Phase 2: Event Processing
- [ ] Background job processor
- [ ] Integrate with existing sync_orchestrator
- [ ] Handle different entity types (Employee, Department)
- [ ] Error handling and retry logic

### Phase 3: Real-Time Updates
- [ ] WebSocket/SSE connection to frontend
- [ ] Push notifications to connected clients
- [ ] Automatic data invalidation
- [ ] UI updates without refresh

### Phase 4: Monitoring & Testing
- [ ] Webhook event dashboard
- [ ] Manual replay capability
- [ ] Testing with QuickBooks sandbox
- [ ] Error alerting system

## Research Notes

### QuickBooks Webhook Documentation
- URL: https://developer.intuit.com/app/developer/qbo/docs/develop/webhooks
- Key Points:
  - [ ] Research webhook registration process
  - [ ] Document supported entity types
  - [ ] Understand rate limits and constraints
  - [ ] Review security requirements

### Webhook Verification
- [ ] HMAC-SHA256 signature verification
- [ ] Replay attack prevention
- [ ] IP whitelisting considerations

### Scalability Considerations
- [ ] Expected webhook volume
- [ ] Queue depth management
- [ ] Concurrent processing limits
- [ ] Database growth projections

### Alternative Approaches
- [ ] Polling vs webhooks trade-offs
- [ ] Hybrid approach (webhooks + scheduled sync)
- [ ] Fallback strategy if webhooks fail

## Security Considerations
- [ ] HMAC signature verification mandatory
- [ ] Rate limiting on webhook endpoint
- [ ] Payload size limits
- [ ] SQL injection prevention in event processing
- [ ] Authentication for webhook management UI

## Testing Strategy
- [ ] Mock webhook payloads for unit tests
- [ ] QuickBooks sandbox webhook testing
- [ ] Load testing with high event volume
- [ ] Error scenario testing (malformed payloads, replay attacks)
- [ ] End-to-end testing with real QB data

## Success Metrics
- Webhook processing latency < 5 seconds
- 99.9% event processing success rate
- Zero manual syncs needed for real-time data
- User satisfaction with instant updates

## Open Questions
- [ ] How to handle webhook downtime? (Fallback to polling?)
- [ ] Should we batch multiple events before processing?
- [ ] What's the retry strategy for failed webhook processing?
- [ ] How to handle webhook payload size limits?
- [ ] Do we need a dead letter queue for failed events?

## Related Features
- #3 Incremental Sync (webhooks provide change notifications)
- #14 Sync Health Monitoring (monitor webhook uptime)
- #41 Sync Batching Intelligence (batch webhook events)

## Cost Analysis
- QuickBooks API calls: Webhooks reduce polling calls
- Infrastructure: Minimal (webhook endpoint + processor)
- Development time: ~2-3 weeks
- Maintenance: Low (set and forget)

## Notes
_Add research findings, implementation decisions, and learnings here as you explore this feature._
