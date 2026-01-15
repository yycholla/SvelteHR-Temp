# Feature 07: Comprehensive Audit Trail

## Overview

Implement a complete, tamper-proof audit trail that tracks every sync operation, data modification, and user action with full before/after snapshots, ensuring compliance with SOX, GDPR, and other regulatory requirements.

## Current System Integration

### Existing Components

- **Sync Log**: `intuit_sync_log` table (basic logging)
- **Conflict Resolution**: Logs resolution decisions
- **User Authentication**: Tracks who performs actions

### Gaps in Current System

- No before/after snapshots
- Limited field-level change tracking
- No compliance-focused reports
- Missing user action attribution
- No tamper detection

## Technical Requirements

### Database Schema

#### Enhanced Audit Log

```sql
CREATE TABLE hr_public.sync_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_id VARCHAR(255) UNIQUE NOT NULL,  -- Immutable audit ID
    event_type VARCHAR(50) NOT NULL,  -- SYNC_START, SYNC_COMPLETE, CONFLICT_RESOLVED, etc.
    entity_type VARCHAR(50),  -- Employee, Department
    entity_id VARCHAR(255),  -- QuickBooks or local ID
    entity_name VARCHAR(255),  -- For human readability

    -- Who & When
    user_id UUID REFERENCES hr_public.users(id),
    user_email VARCHAR(255),
    user_ip_address INET,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- What Changed
    action VARCHAR(50),  -- CREATE, UPDATE, DELETE, RESOLVE_CONFLICT
    before_snapshot JSONB,  -- Complete state before change
    after_snapshot JSONB,   -- Complete state after change
    field_changes JSONB,    -- Array of {field, oldValue, newValue}

    -- Context
    sync_session_id UUID,  -- Links all actions in one sync
    sync_direction VARCHAR(20),  -- PUSH, PULL, BIDIRECTIONAL
    conflict_resolution VARCHAR(50),  -- If applicable

    -- Metadata
    metadata JSONB,  -- Additional context
    success BOOLEAN,
    error_message TEXT,

    -- Tamper Detection
    previous_audit_id VARCHAR(255),  -- Chain to previous audit entry
    audit_hash VARCHAR(64),  -- SHA-256 hash of audit data

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON hr_public.sync_audit_log(user_id, occurred_at DESC);
CREATE INDEX idx_audit_entity ON hr_public.sync_audit_log(entity_type, entity_id, occurred_at DESC);
CREATE INDEX idx_audit_session ON hr_public.sync_audit_log(sync_session_id);
CREATE INDEX idx_audit_occurred ON hr_public.sync_audit_log(occurred_at DESC);

-- Sync Session table for grouping
CREATE TABLE hr_public.sync_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    user_id UUID REFERENCES hr_public.users(id),
    sync_direction VARCHAR(20),
    entity_type VARCHAR(50),
    status VARCHAR(20),
    total_records INTEGER,
    successful_records INTEGER,
    failed_records INTEGER,
    conflicts_detected INTEGER
);
```

### Backend Implementation (Rust)

#### Audit Service

```rust
pub struct AuditService {
    db: DatabaseConnection,
}

impl AuditService {
    pub async fn log_sync_event(&self, event: AuditEvent) -> Result<String> {
        // Generate audit ID
        let audit_id = format!("AUD-{}", Uuid::new_v4());

        // Calculate hash for tamper detection
        let audit_hash = self.calculate_audit_hash(&event);

        // Get previous audit entry for chaining
        let previous_audit_id = self.get_last_audit_id().await?;

        // Store audit entry
        let entry = sync_audit_log::ActiveModel {
            audit_id: Set(audit_id.clone()),
            event_type: Set(event.event_type),
            entity_type: Set(event.entity_type),
            before_snapshot: Set(event.before_snapshot),
            after_snapshot: Set(event.after_snapshot),
            field_changes: Set(self.calculate_field_changes(&event)),
            user_id: Set(event.user_id),
            audit_hash: Set(audit_hash),
            previous_audit_id: Set(previous_audit_id),
            ..Default::default()
        };

        entry.insert(&self.db).await?;
        Ok(audit_id)
    }

    fn calculate_audit_hash(&self, event: &AuditEvent) -> String {
        use sha2::{Sha256, Digest};
        let mut hasher = Sha256::new();

        // Hash all immutable audit data
        hasher.update(event.audit_id.as_bytes());
        hasher.update(event.occurred_at.to_rfc3339().as_bytes());
        hasher.update(&serde_json::to_vec(&event.before_snapshot).unwrap_or_default());
        hasher.update(&serde_json::to_vec(&event.after_snapshot).unwrap_or_default());

        format!("{:x}", hasher.finalize())
    }

    // Verify audit trail integrity
    pub async fn verify_audit_chain(&self, from: DateTime<Utc>, to: DateTime<Utc>)
        -> Result<AuditVerification> {
        let entries = self.get_audit_entries(from, to).await?;

        let mut valid = true;
        let mut issues = Vec::new();

        for (i, entry) in entries.iter().enumerate() {
            // Verify hash
            if !self.verify_entry_hash(entry) {
                valid = false;
                issues.push(format!("Hash mismatch for audit {}", entry.audit_id));
            }

            // Verify chain
            if i > 0 && entry.previous_audit_id != Some(entries[i-1].audit_id.clone()) {
                valid = false;
                issues.push(format!("Chain broken at audit {}", entry.audit_id));
            }
        }

        Ok(AuditVerification { valid, issues })
    }
}
```

### GraphQL Schema

```graphql
type AuditEntry {
	id: ID!
	auditId: String!
	eventType: String!
	entityType: String
	entityId: String
	entityName: String
	user: User
	occurredAt: DateTime!
	action: String
	beforeSnapshot: JSON
	afterSnapshot: JSON
	fieldChanges: [FieldChange!]!
	syncSessionId: ID
	success: Boolean!
	errorMessage: String
}

type FieldChange {
	fieldName: String!
	oldValue: String
	newValue: String
	changeType: ChangeType!
}

type AuditQuery {
	auditHistory(
		entityType: String
		entityId: String
		userId: ID
		from: DateTime
		to: DateTime
		limit: Int
	): [AuditEntry!]!

	auditTimeline(entityId: String!): [AuditEntry!]!
	complianceReport(from: DateTime!, to: DateTime!): ComplianceReport!
	verifyAuditIntegrity(from: DateTime!, to: DateTime!): AuditVerification!
}

type ComplianceReport {
	period: DateRange!
	totalActions: Int!
	userActivity: [UserActivity!]!
	dataModifications: Int!
	failedOperations: Int!
	exportUrl: String
}
```

## Dependencies

- [ ] `sha2` crate for hashing
- [ ] JSON diff library for change tracking
- [ ] PDF generation for compliance reports
- [ ] Encryption for sensitive snapshots

## Implementation Phases

### Phase 1: Core Audit Logging

- [ ] Create enhanced audit tables
- [ ] Implement audit service
- [ ] Add logging to all sync operations
- [ ] Store before/after snapshots

### Phase 2: Compliance Features

- [ ] Tamper detection (hash chain)
- [ ] User attribution tracking
- [ ] IP address logging
- [ ] Compliance report generation

### Phase 3: Audit UI

- [ ] Audit timeline view
- [ ] Entity history view
- [ ] Search and filter
- [ ] Export capabilities

### Phase 4: Advanced Features

- [ ] Automated compliance reports
- [ ] Anomaly detection
- [ ] Retention policies
- [ ] Data anonymization for old audits

## Research Notes

### Compliance Requirements

- [ ] SOX: Document data change controls
- [ ] GDPR: Track data access and modifications
- [ ] HIPAA: (if applicable) Audit trail requirements
- [ ] Industry standards: ISO 27001

### Data Retention

- [ ] Legal requirements: 7 years for financial data?
- [ ] Storage costs for long-term audit data
- [ ] Archive strategy (compress old audits)
- [ ] GDPR right to deletion implications

### Tamper Detection

- [ ] Hash chaining (blockchain-like)
- [ ] Digital signatures (optional)
- [ ] Periodic integrity checks
- [ ] Alert on tampering attempts

## Success Metrics

- 100% of sync operations logged
- Zero tamper detection failures
- Compliance audit pass rate: 100%
- Audit query performance < 1 second

## Open Questions

- [ ] How long to retain detailed audit logs?
- [ ] Should we encrypt sensitive data in audit logs?
- [ ] Do we need write-once storage (WORM)?
- [ ] Should audit logs be in separate database?
- [ ] How to handle GDPR deletion requests with audit trail?

## Related Features

- #15 Compliance Reports (uses audit trail)
- #40 Role-Based Permissions (audit tracks permission usage)
- #45 Data Lineage Tracking (extended audit trail)

## Cost Analysis

- Storage: ~1KB per audit entry, ~10K entries/month = 120MB/year
- Development time: ~1.5 weeks
- Maintenance: Low

## Notes

_Add research findings, implementation decisions, and learnings here._
