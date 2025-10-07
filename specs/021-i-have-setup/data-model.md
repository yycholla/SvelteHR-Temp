# Data Model: Comprehensive Audit Logging

**Feature**: 021-i-have-setup | **Date**: 2025-10-02 | **Phase**: 1

## Entity Relationship Diagram

```
users (existing)
  ├─ 1:N → activity_logs (employee_id)

activity_logs (existing, extended)
  ├─ 1:1 → audit_log_signatures (NEW)
  ├─ 1:1 → activity_logs (rolled_back_log_id, self-ref)
  └─ 1:1 → activity_logs (rollback_of_log_id, self-ref)

rollback_requests (existing from Feature 020)
  └─ N:1 → activity_logs (activity_log_id)
```

## Extended Schema

### activity_logs (Extended)

**Additions to existing table**:
```sql
-- Add signature reference column
ALTER TABLE activity_logs ADD COLUMN signature_id UUID REFERENCES audit_log_signatures(id);

-- Add batch identifier for bulk operations
ALTER TABLE activity_logs ADD COLUMN batch_id UUID;

-- Add performance indexes
CREATE INDEX idx_activity_logs_batch_id ON activity_logs(batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX idx_activity_logs_signature_id ON activity_logs(signature_id);
```

### audit_log_signatures (NEW)

**Purpose**: Cryptographic signatures for tamper detection (FR-022)

```sql
CREATE TABLE audit_log_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_log_id UUID NOT NULL UNIQUE REFERENCES activity_logs(id) ON DELETE CASCADE,
  signature TEXT NOT NULL, -- Base64-encoded ECDSA signature
  signature_algorithm VARCHAR(20) NOT NULL DEFAULT 'ES256',
  public_key_id VARCHAR(50) NOT NULL, -- For key rotation support
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_signature CHECK (length(signature) > 0)
);

CREATE INDEX idx_audit_log_signatures_activity_log_id ON audit_log_signatures(activity_log_id);
CREATE INDEX idx_audit_log_signatures_public_key_id ON audit_log_signatures(public_key_id);
```

**Fields**:
- `signature`: Base64-encoded ECDSA (ES256) signature of audit log entry
- `signature_algorithm`: Algorithm identifier (ES256, future: ES384, ES512)
- `public_key_id`: Identifier for key rotation (e.g., "key-2025-01", "key-2026-01")
- `signed_at`: Timestamp of signature generation (may differ from log creation for async signing)

### audit_retention_archives (NEW)

**Purpose**: Archived audit logs after 1-year retention (FR-026)

```sql
CREATE TABLE audit_retention_archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_log_id UUID NOT NULL,
  archive_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  compressed_data BYTEA NOT NULL, -- Gzip-compressed JSONB
  checksum VARCHAR(64) NOT NULL, -- SHA-256 hash for integrity verification

  CONSTRAINT valid_checksum CHECK (length(checksum) = 64)
);

CREATE INDEX idx_audit_retention_archives_original_log_id ON audit_retention_archives(original_log_id);
CREATE INDEX idx_audit_retention_archives_archive_date ON audit_retention_archives(archive_date DESC);
```

## Validation Rules

### activity_logs Validation

1. **action** must be one of: CREATE, UPDATE, DELETE, ROLLBACK
2. **resource_type** must match an existing table name
3. **resource_id** must be a valid identifier format
4. **before_snapshot** required for UPDATE and DELETE operations
5. **after_snapshot** required for CREATE and UPDATE operations
6. **is_rollback = true** requires **rollback_of_log_id** to be set
7. **rolled_back_log_id** can only be set once (immutable after rollback)

### audit_log_signatures Validation

1. **signature** must be valid Base64 encoding
2. **signature_algorithm** must be supported (currently ES256 only)
3. **public_key_id** must reference an active public key
4. **activity_log_id** must exist and have no existing signature (1:1 relationship)

## State Transitions

### Audit Log Lifecycle

```
[OPERATION OCCURS]
       ↓
[CREATED] (activity_log entry inserted)
       ↓
[PENDING_SIGNATURE] (async worker notified)
       ↓
[SIGNED] (signature added to audit_log_signatures)
       ↓
[ACTIVE] (log available for viewing/rollback)
       ↓
[ROLLED_BACK] (if rollback executed, rolled_back_log_id set)
       ↓
[EXPIRED] (after 1 year, eligible for archival)
       ↓
[ARCHIVED] (moved to audit_retention_archives, original deleted)
```

### Rollback State Machine

```
[NORMAL_LOG]
       ↓
[ROLLBACK_REQUESTED] (rollback_requests.status = PENDING)
       ↓
[ROLLBACK_APPROVED] (rollback_requests.status = APPROVED)
       ↓
[ROLLBACK_EXECUTED] (rolled_back_log_id set, new ROLLBACK log created)
```

## Performance Considerations

### Indexes

**Primary Query Patterns**:
1. **Time-based queries**: `idx_activity_logs_created_at` (DESC)
2. **User activity**: `idx_activity_logs_employee_id`
3. **Resource tracking**: `idx_activity_logs_resource` (composite: resource_type, resource_id)
4. **Batch operations**: `idx_activity_logs_batch_id`
5. **Signature lookup**: `idx_audit_log_signatures_activity_log_id` (UNIQUE)

### Table Partitioning (Future Optimization)

For high-volume deployments (>10M logs/year), consider monthly partitioning:

```sql
-- Example partition strategy (PostgreSQL 10+)
CREATE TABLE activity_logs_2025_01 PARTITION OF activity_logs
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE activity_logs_2025_02 PARTITION OF activity_logs
FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- etc.
```

### Storage Estimates

**Per audit log entry**:
- activity_logs row: ~500 bytes (with JSONB snapshots)
- audit_log_signatures row: ~200 bytes
- **Total**: ~700 bytes/log

**Annual storage** (assuming 1M operations/year):
- Uncompressed: 700 MB/year
- Compressed (archives): ~200 MB/year (70% compression ratio)

## Data Types

### JSONB Snapshot Format

**before_snapshot / after_snapshot**:
```json
{
  "id": "uuid-string",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "department_id": "uuid-string",
  "role": "employee",
  "created_at": "2025-10-02T12:34:56Z",
  "updated_at": "2025-10-02T12:34:56Z"
}
```

**Type Preservation**:
- UUIDs stored as strings
- Timestamps stored in ISO 8601 format
- Numbers preserved as JSON numbers
- NULL values explicitly stored as `null`
- Arrays and nested objects supported

### Signature Format

**Base64-encoded ECDSA signature**:
```
Input: JSON string of audit log entry (deterministic ordering)
Algorithm: SHA-256 hash → ECDSA P-256 signing
Output: Base64 string (~88 characters for ES256)
Example: "MEUCIQDx1...7gIgK8Rw=="
```

## Referential Integrity

### Foreign Key Constraints

1. **activity_logs.employee_id** → users.id (ON DELETE SET NULL)
   - Preserve audit trail even if user deleted

2. **activity_logs.signature_id** → audit_log_signatures.id (ON DELETE SET NULL)
   - Optional signature (async generation)

3. **activity_logs.rolled_back_log_id** → activity_logs.id (ON DELETE SET NULL)
   - Self-reference for rollback chain

4. **audit_log_signatures.activity_log_id** → activity_logs.id (ON DELETE CASCADE)
   - Cascade delete signatures when log is archived

### Cascade Rules

**When activity_log is deleted** (during archival):
- Signature is cascaded (deleted automatically)
- Rollback references preserved (SET NULL)
- Archive record created with compressed data

## Migration Strategy

### Step 1: Add New Tables (Non-breaking)
```sql
CREATE TABLE audit_log_signatures (...);
CREATE TABLE audit_retention_archives (...);
```

### Step 2: Extend Existing Tables (Non-breaking)
```sql
ALTER TABLE activity_logs ADD COLUMN signature_id UUID;
ALTER TABLE activity_logs ADD COLUMN batch_id UUID;
```

### Step 3: Backfill Signatures (Background Job)
```sql
-- Generate signatures for existing logs (async)
-- Not required for MVP, can be done incrementally
```

### Step 4: Enable Triggers (Feature Complete)
```sql
CREATE TRIGGER audit_trigger_employees AFTER INSERT OR UPDATE OR DELETE...
-- Repeat for all application tables
```

---

_Data model complete: 2025-10-02_
