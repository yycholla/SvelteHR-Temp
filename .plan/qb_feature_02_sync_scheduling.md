# Feature 02: Sync Scheduling & Automation

## Overview
Enable automated, scheduled synchronization with QuickBooks based on cron expressions, business hours, and conditional triggers. Eliminate manual sync operations for routine data updates.

## Current System Integration

### Existing Components
- **Manual Sync Endpoint**: `src/routes/api/intuit/sync/+server.ts`
- **GraphQL Sync Mutation**: `graphql-rust-server/src/schema/mutations/intuit.rs`
- **Sync Functions**: `syncNow()`, `pushEmployees()`, `pullEmployees()`, etc.
- **Sync Orchestrator**: `graphql-rust-server/src/services/sync_orchestrator.rs`

### Integration Points
1. New scheduling service in Rust backend
2. Cron job manager (tokio-cron-scheduler or similar)
3. Schedule configuration UI in frontend
4. Integration with existing sync endpoints
5. Notification system for scheduled sync results

## Technical Requirements

### Backend Components (Rust)

#### Job Scheduler
```rust
// Using tokio-cron-scheduler
use tokio_cron_scheduler::{JobScheduler, Job};

struct SyncSchedule {
    id: Uuid,
    name: String,
    cron_expression: String,
    entity_type: EntityType, // Employee, Department, or Both
    sync_direction: SyncDirection, // Push, Pull, or Bidirectional
    enabled: bool,
    last_run_at: Option<DateTime<Utc>>,
    next_run_at: Option<DateTime<Utc>>,
}
```

#### Database Schema
```sql
CREATE TABLE hr_public.sync_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    cron_expression VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    sync_direction VARCHAR(20) NOT NULL,
    enabled BOOLEAN DEFAULT true,
    business_hours_only BOOLEAN DEFAULT false,
    timezone VARCHAR(50) DEFAULT 'UTC',
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    created_by UUID REFERENCES hr_public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_cron CHECK (cron_expression ~ '^[0-9\*\/\,\-]+ [0-9\*\/\,\-]+ [0-9\*\/\,\-]+ [0-9\*\/\,\-]+ [0-9\*\/\,\-]+$')
);

CREATE TABLE hr_public.sync_schedule_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID REFERENCES hr_public.sync_schedules(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL,
    records_synced INTEGER,
    errors_count INTEGER,
    error_message TEXT,
    execution_time_ms INTEGER
);

CREATE INDEX idx_schedule_history_schedule ON hr_public.sync_schedule_history(schedule_id, started_at DESC);
```

### Frontend Components

#### Schedule Management UI
- Schedule list with enable/disable toggles
- Create/edit schedule form with:
  - Cron expression builder (visual + text)
  - Entity type selector
  - Sync direction selector
  - Business hours checkbox
  - Timezone selector
- Schedule preview: "Next 5 runs"
- Execution history view

#### GraphQL Schema
```graphql
type SyncSchedule {
    id: ID!
    name: String!
    description: String
    cronExpression: String!
    entityType: EntityType!
    syncDirection: SyncDirection!
    enabled: Boolean!
    businessHoursOnly: Boolean!
    timezone: String!
    lastRunAt: DateTime
    nextRunAt: DateTime
    createdBy: User
    createdAt: DateTime!
}

type Query {
    syncSchedules: [SyncSchedule!]!
    syncSchedule(id: ID!): SyncSchedule
    syncScheduleHistory(scheduleId: ID!, limit: Int): [SyncScheduleExecution!]!
    previewSchedule(cronExpression: String!, timezone: String!): [DateTime!]!
}

type Mutation {
    createSyncSchedule(input: CreateSyncScheduleInput!): SyncSchedule!
    updateSyncSchedule(id: ID!, input: UpdateSyncScheduleInput!): SyncSchedule!
    deleteSyncSchedule(id: ID!): Boolean!
    toggleSyncSchedule(id: ID!, enabled: Boolean!): SyncSchedule!
    runScheduleNow(id: ID!): SyncScheduleExecution!
}
```

## Dependencies
- [ ] `tokio-cron-scheduler` crate (or `cron` + custom scheduler)
- [ ] Cron expression parser and validator
- [ ] Business hours calculation library
- [ ] Timezone handling (`chrono-tz`)
- [ ] Frontend cron expression builder component

## Implementation Phases

### Phase 1: Core Scheduling Engine
- [ ] Add `tokio-cron-scheduler` to Cargo.toml
- [ ] Create sync_schedules database table
- [ ] Implement schedule CRUD operations
- [ ] Start scheduler on server boot
- [ ] Basic cron execution

### Phase 2: Schedule Management
- [ ] GraphQL mutations for schedule management
- [ ] Frontend schedule list page
- [ ] Create/edit schedule form
- [ ] Cron expression builder/validator
- [ ] Enable/disable toggle

### Phase 3: Advanced Features
- [ ] Business hours filtering
- [ ] Timezone support
- [ ] Conditional triggers (e.g., only if >10 changes)
- [ ] Schedule preview (next 5 runs)
- [ ] Execution history view

### Phase 4: Notifications & Monitoring
- [ ] Email notifications for schedule completion
- [ ] Slack/Teams integration
- [ ] Failed schedule alerts
- [ ] Execution metrics dashboard

## Research Notes

### Cron Expression Libraries
- [ ] Compare tokio-cron-scheduler vs custom implementation
- [ ] Research cron expression validation
- [ ] Document supported cron syntax
- [ ] Test edge cases (timezone changes, DST)

### Business Hours Logic
- [ ] Define business hours (9 AM - 5 PM local time?)
- [ ] Handle weekends/holidays
- [ ] Should we skip or delay syncs outside business hours?
- [ ] Timezone considerations for multi-company

### Common Schedule Templates
Document common patterns for users:
- [ ] Every hour: `0 * * * *`
- [ ] Every night at 2 AM: `0 2 * * *`
- [ ] Every weekday at 9 AM: `0 9 * * 1-5`
- [ ] Every 15 minutes: `*/15 * * * *`

## Security Considerations
- [ ] Prevent excessive schedule creation (rate limits)
- [ ] Validate cron expressions (prevent malicious patterns)
- [ ] Restrict schedule management to admins
- [ ] Audit trail for schedule changes
- [ ] Prevent overlapping executions (lock mechanism)

## Testing Strategy
- [ ] Unit tests for cron parser
- [ ] Integration tests for schedule execution
- [ ] Test timezone edge cases
- [ ] Test business hours filtering
- [ ] Load test with many schedules
- [ ] Manual testing in dev environment

## Success Metrics
- Zero manual syncs needed for routine updates
- 99.9% schedule execution success rate
- Schedule execution within 1 minute of scheduled time
- User satisfaction with automation

## Open Questions
- [ ] What happens if a schedule misses its window (server down)?
- [ ] Should we catch up on missed syncs?
- [ ] How many concurrent schedules can we support?
- [ ] Do we need schedule templates/presets?
- [ ] Should schedules be per-user or system-wide?
- [ ] How to handle overlapping schedule executions?

## UI Mockup Ideas
```
Sync Schedules
==============
[+ Create Schedule]

┌─ Active Schedules ─────────────────────────────────┐
│ ⏰ Nightly Employee Sync         [ON]  [Edit] [⋮] │
│    Every day at 2:00 AM UTC                        │
│    Last run: 2 hours ago (171 records synced)      │
│    Next run: in 22 hours                           │
│                                                     │
│ ⏰ Hourly Department Check       [OFF] [Edit] [⋮] │
│    Every hour                                       │
│    Last run: Never                                  │
│    Next run: —                                      │
└────────────────────────────────────────────────────┘
```

## Related Features
- #1 Real-Time Webhooks (alternative/complement to scheduling)
- #3 Incremental Sync (efficient scheduled syncs)
- #33 Email Digest System (notifications for scheduled syncs)
- #14 Sync Health Monitoring (monitor schedule health)

## Cost Analysis
- Development time: ~1-2 weeks
- Infrastructure: Minimal (runs in existing backend)
- QuickBooks API calls: Predictable usage
- Maintenance: Low (automated system)

## Notes
_Add research findings, implementation decisions, and learnings here as you explore this feature._
