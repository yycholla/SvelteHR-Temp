# Research: Audit Logging with Rollback Capabilities

**Feature**: 020-we-need-to
**Date**: 2025-10-02
**Status**: Complete

## Research Questions

### Q1: How to implement fail-safe logging with retry in PostgreSQL?

**Decision**: Use PostgreSQL transaction-level retry with exponential backoff

**Rationale**:
- PostgreSQL supports transaction retries via application-level logic
- Exponential backoff (100ms, 500ms, 2s) handles transient failures (network, connection pool exhaustion)
- Transaction rollback ensures no partial state if logging fails
- Better than queue-based async logging for guaranteeing no unlogged actions

**Implementation Approach**:
```typescript
async function logWithRetry(logEntry: ActivityLog, maxRetries = 3) {
  const delays = [100, 500, 2000];

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await db.transaction(async (trx) => {
        await trx.insert(activity_logs).values(logEntry);
        // Original action happens here
      });
      return; // Success
    } catch (error) {
      if (attempt === maxRetries - 1) {
        throw new Error("Action cancelled due to logging failure. Please try again.");
      }
      await sleep(delays[attempt]);
    }
  }
}
```

**Alternatives Considered**:
- **Async queue logging**: Rejected - allows unlogged actions if queue fails
- **Write-ahead logging**: Rejected - adds complexity without guaranteeing atomicity
- **Database triggers**: Rejected - harder to implement retry logic in SQL

---

### Q2: Best approach for storing rollback snapshots in PostgreSQL?

**Decision**: Use JSONB columns for state snapshots with GIN indexing

**Rationale**:
- JSONB provides flexible schema for heterogeneous resource types
- GIN indexes enable fast queries on JSON fields (e.g., searching by changed field)
- Native PostgreSQL type with excellent performance
- Supports up to 1GB per field (far exceeding typical record sizes)
- Built-in JSON diff operators for detecting conflicts

**Schema Design**:
```sql
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES users(id),
  action TEXT NOT NULL CHECK (action IN ('create', 'read', 'update', 'delete')),
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  before_snapshot JSONB,  -- NULL for create operations
  after_snapshot JSONB,   -- NULL for delete operations
  ip_address INET,
  user_agent TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Performance indexes
  INDEX idx_activity_logs_timestamp (created_at DESC),
  INDEX idx_activity_logs_employee (employee_id),
  INDEX idx_activity_logs_resource (resource_type, resource_id),
  INDEX idx_activity_logs_action (action),
  INDEX idx_activity_logs_snapshots USING GIN (before_snapshot, after_snapshot)
);
```

**Alternatives Considered**:
- **Separate snapshot table**: Rejected - adds JOIN overhead for common queries
- **Binary serialization**: Rejected - harder to query and debug
- **Text JSON**: Rejected - slower than JSONB, no indexing support

---

### Q3: How to handle cascading relationships during rollback?

**Decision**: Use recursive snapshot collection with dependency graph

**Rationale**:
- When logging a delete, capture both parent and all cascade-deleted children
- Store relationship metadata in snapshot (foreign keys, cascade rules)
- Rollback reconstructs full object graph in reverse order
- Prevents orphaned records and maintains referential integrity

**Implementation Strategy**:
1. **On Delete Logging**: Traverse foreign keys to find cascade-deleted children
2. **Snapshot Format**: Include relationship metadata:
   ```json
   {
     "entity": { ...parentData },
     "cascaded_deletes": [
       { "table": "child_table", "id": "...", "snapshot": {...} }
     ]
   }
   ```
3. **Rollback Order**: Restore parent first, then children (respects foreign key constraints)

**Alternatives Considered**:
- **Database CASCADE ON DELETE tracking**: Rejected - PostgreSQL doesn't provide cascade log
- **Manual cascade definition**: Rejected - duplicates database constraints
- **Separate cascade logs**: Rejected - complex to reconstruct relationships

---

### Q4: Optimal indexing strategy for 1M+ entry queries with <1s response?

**Decision**: Composite B-tree indexes + partial indexes for common filters

**Rationale**:
- Composite index on (created_at DESC, employee_id) covers 80% of queries
- Partial index on (created_at DESC) WHERE action != 'read' speeds up non-read queries
- GIN index on JSONB snapshots for field-level searches
- Redis caching for filter dropdowns (users, resource types)

**Index Strategy**:
```sql
-- Primary timestamp index (most common sort)
CREATE INDEX idx_logs_time DESC ON activity_logs (created_at DESC);

-- Department-scoped queries (admin role)
CREATE INDEX idx_logs_dept_time ON activity_logs (employee_id, created_at DESC);

-- Resource-specific lookups
CREATE INDEX idx_logs_resource ON activity_logs (resource_type, resource_id, created_at DESC);

-- Non-read operations (exclude read logs from most queries)
CREATE INDEX idx_logs_mods_time ON activity_logs (created_at DESC)
WHERE action IN ('create', 'update', 'delete');

-- Full-text search on reason field
CREATE INDEX idx_logs_reason_trgm ON activity_logs USING GIN (reason gin_trgm_ops);
```

**Query Performance**:
- 1M entries: ~800MB table size with indexes
- Paginated query (50 entries): <50ms with proper index
- Filtered query (date + user): <100ms
- Full-text search: <200ms with trigram index

**Alternatives Considered**:
- **Single-column indexes**: Rejected - requires multiple index scans
- **Materialized views**: Rejected - adds write overhead for real-time logging
- **Partitioning by month**: Considered for future (3-year retention = 36 partitions)

---

### Q5: How to implement bulk rollback with progress tracking?

**Decision**: Background job with server-sent events (SSE) for progress updates

**Rationale**:
- Bulk rollback can take 10-60 seconds for 100 operations
- SSE provides real-time progress without WebSocket complexity
- Background job prevents HTTP timeout
- Atomic batching (commit after each successful rollback) enables partial recovery

**Implementation Approach**:
```typescript
// API endpoint
POST /api/rollback/bulk
{
  "log_ids": ["uuid1", "uuid2", ...],
  "reason": "Batch import error correction"
}

Response: { "batch_id": "uuid" }

// Progress endpoint (SSE)
GET /api/rollback/bulk/:batch_id/progress
Stream:
data: {"processed": 10, "total": 100, "status": "in_progress"}
data: {"processed": 100, "total": 100, "status": "completed", "failed": 2}
```

**Progress States**:
- `queued`: Batch created, waiting for worker
- `in_progress`: Actively processing rollbacks
- `completed`: All rollbacks attempted (check failed count)
- `failed`: Critical error prevented completion

**Alternatives Considered**:
- **Synchronous HTTP**: Rejected - risk of timeout, no progress feedback
- **WebSockets**: Rejected - overkill for unidirectional progress updates
- **Polling**: Rejected - less efficient than SSE, higher server load

---

### Q6: RBAC implementation for department-scoped vs organization-wide logs?

**Decision**: PostgreSQL Row-Level Security (RLS) policies with role-based filtering

**Rationale**:
- RLS enforces access control at database level (defense in depth)
- Role-based policies: admin sees department only, hr_admin/super_admin see all
- PostGraphile automatically applies RLS to GraphQL queries
- No application-level filtering needed (reduces bugs)

**RLS Policy**:
```sql
-- Enable RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy for department-scoped admins
CREATE POLICY admin_dept_scope ON activity_logs
FOR SELECT
USING (
  current_setting('jwt.claims.role') IN ('admin')
  AND employee_id IN (
    SELECT id FROM users
    WHERE department_id = (
      SELECT department_id FROM users
      WHERE id = current_setting('jwt.claims.user_id')::uuid
    )
  )
);

-- Policy for organization-wide access
CREATE POLICY hr_admin_org_scope ON activity_logs
FOR SELECT
USING (
  current_setting('jwt.claims.role') IN ('hr_admin', 'super_admin')
);
```

**Alternatives Considered**:
- **Application-level filtering**: Rejected - easier to bypass, harder to audit
- **Separate tables per department**: Rejected - management overhead, query complexity
- **GraphQL field resolvers**: Rejected - doesn't prevent direct SQL access

---

### Q7: How to prevent rollback of rollback operations (infinite chains)?

**Decision**: Flag rollback operations with `is_rollback` column and validation check

**Rationale**:
- Rollback operations logged with `is_rollback = true`
- GraphQL mutation checks this flag before allowing rollback
- UI hides rollback button for rollback entries
- Clear error message if attempted: "Cannot rollback a rollback operation"

**Schema Addition**:
```sql
ALTER TABLE activity_logs ADD COLUMN is_rollback BOOLEAN DEFAULT FALSE;
ALTER TABLE activity_logs ADD COLUMN rolled_back_log_id UUID REFERENCES activity_logs(id);

-- Validation function
CREATE FUNCTION validate_rollback_target(target_log_id UUID) RETURNS BOOLEAN AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM activity_logs WHERE id = target_log_id AND is_rollback = TRUE) THEN
    RAISE EXCEPTION 'Cannot rollback a rollback operation';
  END IF;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

**Alternatives Considered**:
- **Action type check**: Rejected - not semantic enough (rollback creates/updates/deletes)
- **Separate rollback table**: Rejected - complicates audit trail queries
- **Parent-child relationship**: Considered but `rolled_back_log_id` achieves same result

---

### Q8: Conflict detection for rollback of modified resources?

**Decision**: JSONB diff comparison with three resolution strategies

**Rationale**:
- Compare current state to rollback target's `before_snapshot`
- If different: resource modified since original action
- Offer three strategies: force (overwrite), cancel (abort), manual merge (show diff)

**Conflict Detection**:
```typescript
async function detectRollbackConflicts(logId: string) {
  const log = await getActivityLog(logId);
  const current = await getResourceCurrent(log.resource_type, log.resource_id);

  const conflicts = jsonbDiff(current, log.before_snapshot);

  if (conflicts.length > 0) {
    return {
      hasConflicts: true,
      conflicts: conflicts,
      strategies: ['force', 'cancel', 'merge']
    };
  }

  return { hasConflicts: false };
}
```

**Resolution UI Flow**:
1. User initiates rollback
2. System detects conflicts
3. Modal shows:
   - Original change (what rollback would restore)
   - Current state (what exists now)
   - Conflicting fields highlighted
   - Resolution options (force/cancel/merge)
4. User selects strategy
5. System executes with confirmation

**Alternatives Considered**:
- **Automatic merge**: Rejected - too risky for data integrity
- **Block all rollbacks if modified**: Rejected - too restrictive
- **Version numbers**: Rejected - requires schema changes across all tables

---

## Summary of Decisions

| Area | Decision | Key Benefit |
|------|----------|-------------|
| Retry Logic | Transaction-level exponential backoff | Guarantees no unlogged actions |
| Snapshot Storage | JSONB with GIN indexes | Flexible, performant, query-able |
| Cascade Handling | Recursive snapshot with dependency graph | Maintains referential integrity |
| Query Performance | Composite B-tree + partial indexes | <1s queries for 1M entries |
| Bulk Rollback | Background job + SSE progress | Real-time feedback, no timeouts |
| RBAC | PostgreSQL RLS policies | Database-level security enforcement |
| Rollback Prevention | `is_rollback` flag + validation | Clear prevention of infinite chains |
| Conflict Detection | JSONB diff with 3 strategies | User control over conflict resolution |

## Performance Validation

**Expected Metrics** (1M entry dataset):
- Single log write: <10ms
- Paginated query (50 entries): <100ms
- Filtered query (date + user): <200ms
- Rollback operation: <500ms (includes validation + write)
- Bulk rollback (100): 10-30s (100-300ms per operation)

**Indexing Overhead**:
- 5 indexes per table ≈ 2x storage size
- Write penalty: ~20% slower inserts (acceptable for read-heavy audit logs)
- Query speedup: 10-100x faster on filtered queries

## Next Phase

All research questions resolved. Ready to proceed to **Phase 1: Design & Contracts**.

No NEEDS CLARIFICATION markers remain in Technical Context.
