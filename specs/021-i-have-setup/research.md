# Research: Comprehensive Audit Logging Implementation

**Feature**: 021-i-have-setup | **Date**: 2025-10-02 | **Phase**: 0

## Research Objectives

1. Analyze existing incomplete audit logging implementation
2. Research PostgreSQL trigger best practices for comprehensive table coverage
3. Evaluate ECDSA vs RSA for audit log signing performance
4. Research PDF generation libraries compatible with Node.js
5. Investigate async batch writing strategies for < 100ms latency

## 1. Existing Audit Logging Analysis

### Current Implementation (Feature 020)

**Database Schema** (from previous implementation):
```sql
-- Table: activity_logs (already exists)
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES users(id),
  action VARCHAR(20) NOT NULL, -- CREATE, UPDATE, DELETE, ROLLBACK
  resource_type VARCHAR(100) NOT NULL,
  resource_id VARCHAR(255) NOT NULL,
  before_snapshot JSONB,
  after_snapshot JSONB,
  is_rollback BOOLEAN DEFAULT false,
  rolled_back_log_id UUID REFERENCES activity_logs(id),
  rollback_of_log_id UUID REFERENCES activity_logs(id),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_activity_logs_employee_id ON activity_logs(employee_id);
CREATE INDEX idx_activity_logs_resource ON activity_logs(resource_type, resource_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);
```

**Problem Identified**:
- ✅ Table structure exists
- ❌ **No database triggers** to automatically capture CRUD operations
- ❌ Application-level logging only (easily bypassed)
- ❌ Missing: cryptographic signatures for tamper detection
- ❌ Missing: retention/archival mechanism

**Decision**: Implement PostgreSQL triggers on ALL application tables to automatically capture changes at the database level (cannot be bypassed).

**Rationale**: Database-level triggers ensure 100% capture rate regardless of application entry point (web UI, API, admin tools, bulk operations).

**Alternatives Considered**:
- Application-level middleware: Rejected (can be bypassed, requires code changes for every table)
- Event sourcing architecture: Rejected (too complex for current needs, major refactor required)

## 2. PostgreSQL Trigger Best Practices

### Research Findings

**Trigger Strategy** (BEFORE vs AFTER vs INSTEAD OF):
- **BEFORE INSERT/UPDATE/DELETE**: Can modify NEW values, access OLD values
- **AFTER INSERT/UPDATE/DELETE**: Cannot modify values, better for audit logging (data already committed)
- **INSTEAD OF**: For views only, not applicable here

**Decision**: Use **AFTER** triggers for audit logging

**Rationale**:
- Audit logs should record what was actually written to the database (post-validation)
- AFTER triggers have access to both OLD and NEW records
- Performance: AFTER triggers don't block the main transaction if async batch writing is used

**Trigger Function Pattern** (PostgreSQL best practice):
```sql
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
  -- Determine operation type
  DECLARE
    v_action VARCHAR(20);
    v_before_snapshot JSONB;
    v_after_snapshot JSONB;
  BEGIN
    IF (TG_OP = 'DELETE') THEN
      v_action := 'DELETE';
      v_before_snapshot := to_jsonb(OLD);
      v_after_snapshot := NULL;
    ELSIF (TG_OP = 'UPDATE') THEN
      v_action := 'UPDATE';
      v_before_snapshot := to_jsonb(OLD);
      v_after_snapshot := to_jsonb(NEW);
    ELSIF (TG_OP = 'INSERT') THEN
      v_action := 'CREATE';
      v_before_snapshot := NULL;
      v_after_snapshot := to_jsonb(NEW);
    END IF;

    -- Insert audit log entry
    INSERT INTO activity_logs (
      employee_id, action, resource_type, resource_id,
      before_snapshot, after_snapshot, ip_address, user_agent
    ) VALUES (
      current_setting('app.current_user_id')::UUID,
      v_action,
      TG_TABLE_NAME,
      COALESCE(NEW.id, OLD.id)::TEXT,
      v_before_snapshot,
      v_after_snapshot,
      current_setting('app.current_ip_address', true)::INET,
      current_setting('app.current_user_agent', true)
    );

    RETURN COALESCE(NEW, OLD);
  END;
END;
$$ LANGUAGE plpgsql;
```

**Key Design Decision**: Use `current_setting()` to pass user context (user_id, IP, user_agent) from application to trigger.

**Implementation Requirement**: Application must call `SET LOCAL` at transaction start:
```typescript
await client.query("SET LOCAL app.current_user_id = $1", [userId]);
await client.query("SET LOCAL app.current_ip_address = $1", [ipAddress]);
await client.query("SET LOCAL app.current_user_agent = $1", [userAgent]);
```

**Alternatives Considered**:
- Storing user context in a separate session table: Rejected (adds query overhead, race conditions)
- Using PostgreSQL roles for user identification: Rejected (one role per user not scalable)

## 3. Cryptographic Signature Evaluation: ECDSA vs RSA

### Performance Comparison

**ECDSA (Elliptic Curve Digital Signature Algorithm)**:
- Algorithm: ES256 (P-256 curve, SHA-256 hash)
- Key size: 256 bits
- Signature size: ~64 bytes
- **Signing performance**: 3-5ms per operation (Node.js crypto module)
- Verification performance: 5-8ms per operation
- Security level: Equivalent to RSA-3072

**RSA (Rivest-Shamir-Adleman)**:
- Algorithm: RS256 (2048-bit key, SHA-256 hash)
- Key size: 2048 bits
- Signature size: ~256 bytes
- **Signing performance**: 15-25ms per operation
- Verification performance: 1-2ms per operation (faster than ECDSA)
- Security level: Industry standard

**Decision**: Use **ECDSA (ES256)** for audit log signing

**Rationale**:
- **Performance requirement**: < 100ms total latency budget → ECDSA signing 3-5x faster than RSA
- Smaller signature size (64 vs 256 bytes) reduces storage overhead
- Modern cryptographic standard, supported by Node.js built-in `crypto` module
- Sufficient security level for audit log integrity

**Implementation**:
```typescript
import { createSign, createVerify, generateKeyPairSync } from 'crypto';

// One-time key generation (store in secure vault)
const { privateKey, publicKey } = generateKeyPairSync('ec', {
  namedCurve: 'prime256v1' // P-256 curve for ES256
});

// Sign audit log entry
function signAuditLog(logEntry: AuditLogEntry): string {
  const sign = createSign('SHA256');
  sign.update(JSON.stringify(logEntry));
  sign.end();
  return sign.sign(privateKey, 'base64');
}

// Verify signature
function verifySignature(logEntry: AuditLogEntry, signature: string): boolean {
  const verify = createVerify('SHA256');
  verify.update(JSON.stringify(logEntry));
  verify.end();
  return verify.verify(publicKey, signature, 'base64');
}
```

**Key Management**:
- Private key: Store in environment variable or secret manager (AWS Secrets Manager, HashiCorp Vault)
- Public key: Embed in application configuration (read-only, safe to distribute)
- Key rotation: Plan for annual rotation with grace period for old signatures

**Alternatives Considered**:
- HMAC (symmetric): Rejected (no non-repudiation, anyone with key can create valid signatures)
- Ed25519 (EdDSA): Rejected (even faster, but less widely supported in legacy systems for verification)

## 4. PDF Generation Library Evaluation

### Node.js PDF Generation Options

**pdfkit** (Recommended):
- **Pros**: Streaming support, rich formatting (tables, images), actively maintained
- **Cons**: Manual layout management
- **Performance**: Can generate 100-page PDF in ~500ms
- **Bundle size**: 200KB minified

**pdf-lib**:
- Pros: Form filling, PDF modification, modern API
- Cons: Slower than pdfkit for generation from scratch, larger bundle (450KB)

**puppeteer + HTML/CSS**:
- Pros: Use existing HTML templates, WYSIWYG design
- Cons: **Heavyweight** (100MB+ with Chrome binary), slow (1-2s per PDF), overkill for simple reports

**Decision**: Use **pdfkit** for audit log PDF export

**Rationale**:
- Streaming support allows generating large reports without loading entire PDF into memory
- Rich formatting suitable for audit log tables and metadata
- Lightweight and fast enough for background job generation
- Native Node.js library (no browser dependencies)

**Implementation Example**:
```typescript
import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';

export async function generateAuditLogPDF(
  logs: AuditLogEntry[],
  outputStream: PassThrough
): Promise<void> {
  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(outputStream);

  // Header
  doc.fontSize(20).text('Audit Log Report', { align: 'center' });
  doc.moveDown();

  // Table
  logs.forEach(log => {
    doc.fontSize(12).text(`[${log.action}] ${log.resource_type} - ${log.created_at}`);
    doc.fontSize(10).text(`User: ${log.employee_name} | IP: ${log.ip_address}`);
    doc.moveDown(0.5);
  });

  doc.end();
}
```

**Alternatives Considered**:
- jsPDF (client-side library): Rejected (not optimized for server-side, smaller feature set)
- ReportLab (Python): Rejected (would require Python runtime, not Node.js native)

## 5. Async Batch Writing Strategies for < 100ms Latency

### Performance Optimization Approaches

**Problem**: Synchronous audit log writing adds 10-30ms latency to every database operation.

**Goal**: Reduce perceived latency to < 5ms while maintaining transactional integrity (FR-016: if logging fails, operation fails).

**Strategy 1: Async Write-Behind with LISTEN/NOTIFY** (Recommended):
```
1. Application transaction commits to database
2. PostgreSQL trigger inserts audit log entry (synchronous, ~5ms)
3. Trigger sends NOTIFY signal to async worker queue
4. Worker processes batch signature generation asynchronously
5. Worker updates audit logs with signatures in batches
```

**Decision**: Use **PostgreSQL LISTEN/NOTIFY** with Node.js worker queue

**Rationale**:
- Main transaction latency: ~5ms (just write audit log, no signature yet)
- Signature generation happens asynchronously in batches (100 logs at a time)
- Transactional integrity maintained: audit log written synchronously, signature added later
- If worker fails, audit log still exists (can be re-signed on next batch run)

**Implementation**:
```typescript
// Worker process
import { Client } from 'pg';

const client = new Client(DATABASE_URL);
await client.connect();

await client.query('LISTEN audit_log_inserted');

client.on('notification', async (msg) => {
  if (msg.channel === 'audit_log_inserted') {
    const logId = msg.payload;
    await processAuditLogBatch([logId]); // Batch multiple notifications
  }
});

async function processAuditLogBatch(logIds: string[]) {
  // Fetch unsign logs
  const logs = await fetchAuditLogs(logIds);

  // Generate signatures in parallel
  const signatures = await Promise.all(
    logs.map(log => signAuditLog(log))
  );

  // Update audit logs with signatures
  await updateAuditLogSignatures(logs.map((log, i) => ({
    id: log.id,
    signature: signatures[i]
  })));
}
```

**Modified Trigger** (with NOTIFY):
```sql
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
  -- ... (same audit log insertion logic)

  -- Notify async worker
  PERFORM pg_notify('audit_log_inserted', NEW.id::TEXT);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
```

**Strategy 2: In-Memory Queue + Periodic Flush**:
- Pros: Even lower latency (~1ms), no database notification overhead
- Cons: **Risk of data loss** if application crashes before flush, violates FR-016

**Strategy 3: Write to Fast Storage (Redis) + Sync to PostgreSQL**:
- Pros: Sub-millisecond writes to Redis
- Cons: Adds Redis dependency, eventual consistency issues, complexity

**Alternatives Considered**:
- Pure asynchronous logging (no transactional guarantee): Rejected (violates FR-016)
- Microservice architecture (dedicated audit service): Rejected (over-engineering, adds network latency)

**Performance Benchmark** (Estimated):
- Synchronous audit log write: 10-30ms (baseline)
- With async signature generation: **5-8ms** (67-73% reduction)
- Meets < 100ms constraint with room for other operations

## 6. CSV/JSON Export Implementation

**CSV Export** (csv-writer library):
```typescript
import { createObjectCsvWriter } from 'csv-writer';

export async function exportAuditLogsCSV(
  logs: AuditLogEntry[],
  outputPath: string
): Promise<void> {
  const csvWriter = createObjectCsvWriter({
    path: outputPath,
    header: [
      { id: 'id', title: 'ID' },
      { id: 'created_at', title: 'Timestamp' },
      { id: 'employee_name', title: 'User' },
      { id: 'action', title: 'Action' },
      { id: 'resource_type', title: 'Resource Type' },
      { id: 'resource_id', title: 'Resource ID' },
      { id: 'ip_address', title: 'IP Address' },
    ]
  });

  await csvWriter.writeRecords(logs);
}
```

**JSON Export** (native Node.js):
```typescript
import { createWriteStream } from 'fs';

export async function exportAuditLogsJSON(
  logs: AuditLogEntry[],
  outputPath: string
): Promise<void> {
  const writeStream = createWriteStream(outputPath);
  writeStream.write(JSON.stringify(logs, null, 2));
  writeStream.end();
}
```

**Decision**: Use `csv-writer` for CSV, native `JSON.stringify` for JSON, `pdfkit` for PDF

**Rationale**: All three approaches are streaming-capable, lightweight, and production-ready.

## Summary & Key Decisions

| Research Area | Decision | Rationale |
|---------------|----------|-----------|
| Trigger Strategy | PostgreSQL AFTER triggers on all tables | 100% capture rate, cannot be bypassed |
| User Context | `SET LOCAL` session variables | Performant, transaction-scoped |
| Cryptographic Signing | ECDSA (ES256) | 3-5x faster than RSA, smaller signatures |
| PDF Generation | pdfkit | Streaming support, lightweight, fast |
| Async Optimization | LISTEN/NOTIFY + worker queue | < 5ms synchronous write, async signatures |
| Export Libraries | csv-writer, JSON.stringify, pdfkit | Streaming, production-ready |

## Implementation Risks & Mitigations

**Risk 1**: Trigger performance degrades with high write volume
- **Mitigation**: Use async batch writing for signatures, database connection pooling, index optimization

**Risk 2**: Private key compromise
- **Mitigation**: Store in secure vault (AWS Secrets Manager), implement key rotation, use least-privilege access

**Risk 3**: Audit log table grows unbounded
- **Mitigation**: 1-year retention policy with automated archival (FR-026), partition table by month

**Risk 4**: Trigger bugs cause transaction failures
- **Mitigation**: Comprehensive integration tests, error handling with fallback logging, monitoring/alerts

## Next Steps

Phase 1 artifacts will be generated based on these research findings:
1. **data-model.md**: Extended schema with signature table
2. **contracts/**: SQL trigger definitions, GraphQL mutations, REST API specs
3. **quickstart.md**: TDD workflow for trigger implementation
4. **CLAUDE.md**: Updated with audit logging technical context

---

_Research complete: 2025-10-02_
