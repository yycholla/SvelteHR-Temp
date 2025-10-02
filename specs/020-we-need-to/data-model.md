# Data Model: Audit Logging with Rollback

**Feature**: 020-we-need-to
**Date**: 2025-10-02
**Status**: Design Complete

## Entity Relationship Diagram

```
┌─────────────────────┐
│   Users (existing)  │
│─────────────────────│
│ id: UUID (PK)       │
│ department_id: UUID │
│ role: TEXT          │
└──────────┬──────────┘
           │
           │ 1:N (employee_id)
           │
┌──────────▼───────────────────────────────────────┐
│          ActivityLogs                             │
│───────────────────────────────────────────────────│
│ id: UUID (PK)                                     │
│ employee_id: UUID (FK → users.id)                │
│ action: TEXT ('create'|'read'|'update'|'delete')  │
│ resource_type: TEXT (e.g., 'employees', 'events') │
│ resource_id: UUID                                 │
│ before_snapshot: JSONB (state before action)     │
│ after_snapshot: JSONB (state after action)       │
│ ip_address: INET                                  │
│ user_agent: TEXT                                  │
│ reason: TEXT (optional context)                   │
│ is_rollback: BOOLEAN (default FALSE)             │
│ rolled_back_log_id: UUID (FK → activity_logs.id) │
│ created_at: TIMESTAMPTZ                           │
└────────────┬──────────────────────────────────────┘
             │
             │ 1:N (activity_log_id)
             │
┌────────────▼─────────────────────────────────────┐
│          RollbackRequests                         │
│───────────────────────────────────────────────────│
│ id: UUID (PK)                                     │
│ activity_log_id: UUID (FK → activity_logs.id)    │
│ requested_by: UUID (FK → users.id)               │
│ requested_at: TIMESTAMPTZ                         │
│ reason: TEXT (why rollback needed)                │
│ status: TEXT ('pending'|'approved'|'rejected')    │
│ reviewed_by: UUID (FK → users.id, nullable)      │
│ reviewed_at: TIMESTAMPTZ (nullable)               │
│ review_reason: TEXT (approval/rejection note)     │
└───────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────┐
│         BulkRollbackBatches                       │
│───────────────────────────────────────────────────│
│ id: UUID (PK)                                     │
│ initiated_by: UUID (FK → users.id)               │
│ activity_log_ids: UUID[] (array of log IDs)      │
│ started_at: TIMESTAMPTZ                           │
│ completed_at: TIMESTAMPTZ (nullable)              │
│ status: TEXT ('queued'|'in_progress'|'completed'  │
│              |'failed')                            │
│ total_count: INTEGER                              │
│ processed_count: INTEGER                          │
│ successful_count: INTEGER                         │
│ failed_count: INTEGER                             │
│ failure_details: JSONB (array of error messages)  │
└───────────────────────────────────────────────────┘
```

## Entity Specifications

### 1. ActivityLogs

**Purpose**: Immutable audit trail of all system actions

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique log entry identifier |
| `employee_id` | UUID | NOT NULL, FK → users.id | User who performed action |
| `action` | TEXT | NOT NULL, CHECK IN ('create','read','update','delete') | Type of operation |
| `resource_type` | TEXT | NOT NULL | Resource being acted upon (e.g., 'employees', 'events') |
| `resource_id` | UUID | NOT NULL | ID of the resource |
| `before_snapshot` | JSONB | NULLABLE | Complete state before action (NULL for create) |
| `after_snapshot` | JSONB | NULLABLE | Complete state after action (NULL for delete) |
| `ip_address` | INET | NULLABLE | IP address of user |
| `user_agent` | TEXT | NULLABLE | Browser/client user agent |
| `reason` | TEXT | NULLABLE | User-provided context for action |
| `is_rollback` | BOOLEAN | NOT NULL, DEFAULT FALSE | Flag indicating this log is from a rollback |
| `rolled_back_log_id` | UUID | NULLABLE, FK → activity_logs.id | If rollback, references original log |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | When action occurred |

**Indexes**:
```sql
CREATE INDEX idx_activity_logs_time ON activity_logs (created_at DESC);
CREATE INDEX idx_activity_logs_employee ON activity_logs (employee_id, created_at DESC);
CREATE INDEX idx_activity_logs_resource ON activity_logs (resource_type, resource_id, created_at DESC);
CREATE INDEX idx_activity_logs_action ON activity_logs (action);
CREATE INDEX idx_activity_logs_mods ON activity_logs (created_at DESC) WHERE action IN ('create','update','delete');
CREATE INDEX idx_activity_logs_snapshots ON activity_logs USING GIN (before_snapshot, after_snapshot);
CREATE INDEX idx_activity_logs_reason ON activity_logs USING GIN (reason gin_trgm_ops);
```

**RLS Policies**:
```sql
-- Department-scoped for regular admins
CREATE POLICY admin_dept_logs ON activity_logs
FOR SELECT
USING (
  current_setting('jwt.claims.role') = 'admin'
  AND employee_id IN (
    SELECT id FROM users WHERE department_id = (
      SELECT department_id FROM users WHERE id = current_setting('jwt.claims.user_id')::uuid
    )
  )
);

-- Organization-wide for HR and super admins
CREATE POLICY hr_admin_org_logs ON activity_logs
FOR SELECT
USING (current_setting('jwt.claims.role') IN ('hr_admin', 'super_admin'));
```

**Validation Rules**:
- `before_snapshot` must be NULL when `action = 'create'`
- `after_snapshot` must be NULL when `action = 'delete'`
- Both snapshots required when `action = 'update'`
- `rolled_back_log_id` must be NULL when `is_rollback = FALSE`
- Cannot delete or update existing activity logs (insert-only)

**State Transitions**: None (immutable audit trail)

**Retention Policy**: 3 years, then archive or purge

---

### 2. RollbackRequests

**Purpose**: Workflow for admins to request rollbacks from super admins

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique request identifier |
| `activity_log_id` | UUID | NOT NULL, FK → activity_logs.id | Log entry to rollback |
| `requested_by` | UUID | NOT NULL, FK → users.id | Admin who requested rollback |
| `requested_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | When request was created |
| `reason` | TEXT | NOT NULL | Justification for rollback |
| `status` | TEXT | NOT NULL, DEFAULT 'pending', CHECK IN ('pending','approved','rejected') | Request state |
| `reviewed_by` | UUID | NULLABLE, FK → users.id | Super admin who reviewed |
| `reviewed_at` | TIMESTAMPTZ | NULLABLE | When review occurred |
| `review_reason` | TEXT | NULLABLE | Super admin's approval/rejection note |

**Indexes**:
```sql
CREATE INDEX idx_rollback_requests_status ON rollback_requests (status, requested_at DESC);
CREATE INDEX idx_rollback_requests_log ON rollback_requests (activity_log_id);
CREATE INDEX idx_rollback_requests_requester ON rollback_requests (requested_by);
```

**RLS Policies**:
```sql
-- Admins can view their own requests
CREATE POLICY admin_own_requests ON rollback_requests
FOR SELECT
USING (requested_by = current_setting('jwt.claims.user_id')::uuid);

-- Super admins can view all requests
CREATE POLICY super_admin_all_requests ON rollback_requests
FOR SELECT
USING (current_setting('jwt.claims.role') = 'super_admin');
```

**Validation Rules**:
- Cannot request rollback of a rollback (`activity_log_id` must have `is_rollback = FALSE`)
- `reviewed_by` must be NULL when `status = 'pending'`
- `reviewed_by` must NOT be NULL when `status IN ('approved', 'rejected')`
- `review_reason` required when rejecting

**State Transitions**:
```
pending → approved (by super admin)
pending → rejected (by super admin)
```
No transitions from approved/rejected states (immutable once reviewed).

---

### 3. BulkRollbackBatches

**Purpose**: Track bulk rollback operations with progress

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique batch identifier |
| `initiated_by` | UUID | NOT NULL, FK → users.id | User who started batch |
| `activity_log_ids` | UUID[] | NOT NULL | Array of log IDs to rollback |
| `started_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | When batch began |
| `completed_at` | TIMESTAMPTZ | NULLABLE | When batch finished |
| `status` | TEXT | NOT NULL, DEFAULT 'queued', CHECK IN ('queued','in_progress','completed','failed') | Batch state |
| `total_count` | INTEGER | NOT NULL | Total logs to rollback |
| `processed_count` | INTEGER | NOT NULL, DEFAULT 0 | Logs processed so far |
| `successful_count` | INTEGER | NOT NULL, DEFAULT 0 | Successful rollbacks |
| `failed_count` | INTEGER | NOT NULL, DEFAULT 0 | Failed rollbacks |
| `failure_details` | JSONB | NULLABLE | Array of {log_id, error_message} |

**Indexes**:
```sql
CREATE INDEX idx_bulk_batches_status ON bulk_rollback_batches (status, started_at DESC);
CREATE INDEX idx_bulk_batches_user ON bulk_rollback_batches (initiated_by);
```

**RLS Policies**:
```sql
-- Only super admins can view bulk batches
CREATE POLICY super_admin_bulk_batches ON bulk_rollback_batches
FOR SELECT
USING (current_setting('jwt.claims.role') = 'super_admin');
```

**Validation Rules**:
- `total_count` must equal `array_length(activity_log_ids, 1)`
- `processed_count = successful_count + failed_count`
- `completed_at` must be NULL when `status IN ('queued', 'in_progress')`
- `completed_at` must NOT be NULL when `status IN ('completed', 'failed')`
- Maximum 100 log IDs per batch

**State Transitions**:
```
queued → in_progress (worker picks up batch)
in_progress → completed (all logs processed)
in_progress → failed (critical error)
```
No transitions from completed/failed states.

---

## Snapshot Schema Standards

### Employee Resource Snapshot Example
```json
{
  "id": "uuid",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@company.com",
  "department_id": "uuid",
  "manager_id": "uuid",
  "hire_date": "2020-01-15",
  "salary": 75000,
  "employment_status": "active",
  "_metadata": {
    "table": "employees",
    "version": 1,
    "captured_at": "2025-10-02T10:30:00Z"
  },
  "_relationships": {
    "department": { "id": "uuid", "name": "Engineering" },
    "manager": { "id": "uuid", "full_name": "Jane Smith" }
  }
}
```

### Cascade Delete Snapshot Example
```json
{
  "parent": {
    "table": "events",
    "id": "uuid",
    "data": { ... }
  },
  "cascaded_deletes": [
    {
      "table": "event_attendees",
      "parent_fk": "event_id",
      "records": [
        { "id": "uuid", "data": { ... } }
      ]
    },
    {
      "table": "event_tasks",
      "parent_fk": "event_id",
      "records": [
        { "id": "uuid", "data": { ... } }
      ]
    }
  ]
}
```

## GraphQL Type Definitions

```graphql
enum ActivityAction {
  CREATE
  READ
  UPDATE
  DELETE
}

type ActivityLog {
  id: UUID!
  employeeId: UUID!
  employee: User!
  action: ActivityAction!
  resourceType: String!
  resourceId: UUID!
  beforeSnapshot: JSON
  afterSnapshot: JSON
  ipAddress: String
  userAgent: String
  reason: String
  isRollback: Boolean!
  rolledBackLogId: UUID
  rolledBackLog: ActivityLog
  createdAt: DateTime!
}

enum RollbackRequestStatus {
  PENDING
  APPROVED
  REJECTED
}

type RollbackRequest {
  id: UUID!
  activityLogId: UUID!
  activityLog: ActivityLog!
  requestedBy: UUID!
  requester: User!
  requestedAt: DateTime!
  reason: String!
  status: RollbackRequestStatus!
  reviewedBy: UUID
  reviewer: User
  reviewedAt: DateTime
  reviewReason: String
}

enum BulkRollbackStatus {
  QUEUED
  IN_PROGRESS
  COMPLETED
  FAILED
}

type BulkRollbackBatch {
  id: UUID!
  initiatedBy: UUID!
  initiator: User!
  activityLogIds: [UUID!]!
  startedAt: DateTime!
  completedAt: DateTime
  status: BulkRollbackStatus!
  totalCount: Int!
  processedCount: Int!
  successfulCount: Int!
  failedCount: Int!
  failureDetails: JSON
}
```

## Migration Strategy

1. **Migration 001**: Create `activity_logs` table with indexes
2. **Migration 002**: Create `rollback_requests` table with indexes
3. **Migration 003**: Create `bulk_rollback_batches` table with indexes
4. **Migration 004**: Add RLS policies to all three tables
5. **Migration 005**: Add validation functions (`validate_rollback_target`, `validate_snapshot_structure`)
6. **Migration 006**: Create triggers for automatic snapshot capture on existing tables

## Performance Considerations

**Write Performance**:
- Activity log insert: <10ms (6 indexes total)
- Batch inserts acceptable due to audit-heavy (90% read, 10% write)

**Read Performance**:
- 50-entry paginated query: <100ms (covered by `idx_activity_logs_time`)
- Filtered query (user + date): <200ms (covered by `idx_activity_logs_employee`)
- Full-text search on reason: <300ms (GIN trigram index)

**Storage Estimates** (3-year retention):
- ~5,000 actions/day for medium org
- ~5.5 million total logs over 3 years
- Average snapshot size: 5KB
- Total size: ~30GB (table + indexes)

## Next Steps

Data model complete. Ready to proceed to:
1. API contract generation (GraphQL operations)
2. Contract test creation
3. Quickstart.md with example workflows
