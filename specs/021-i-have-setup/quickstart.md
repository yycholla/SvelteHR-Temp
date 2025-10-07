# Quickstart: Comprehensive Audit Logging TDD Workflow

**Feature**: 021-i-have-setup | **Date**: 2025-10-02 | **Phase**: 1

## Prerequisites

- PostgreSQL 14+ database running
- Node.js 20+ with TypeScript 5.0
- SvelteKit 2.22.0 development environment
- Test databases: `sveltekit_hr_test` and `sveltekit_hr_dev`

## TDD Workflow Overview

This feature follows strict Test-Driven Development:
1. **RED**: Write failing test first
2. **GREEN**: Implement minimal code to pass test
3. **REFACTOR**: Optimize while keeping tests green

## Part 1: Database Triggers (Foundation)

### Step 1.1: Write Failing Trigger Test

**File**: `tests/integration/triggers/employee-insert.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDatabase, cleanupTestDatabase } from '../helpers/db';

describe('Employee INSERT trigger', () => {
  let db: TestDatabase;

  beforeEach(async () => {
    db = await createTestDatabase();
  });

  afterEach(async () => {
    await cleanupTestDatabase(db);
  });

  it('should create audit log entry when employee is inserted', async () => {
    // RED: This test WILL FAIL (trigger not implemented yet)

    // Set user context
    await db.query(`SET LOCAL app.current_user_id = $1`, [testUserId]);
    await db.query(`SET LOCAL app.current_ip_address = $1`, ['192.168.1.100']);

    // Insert employee
    const employee = await db.query(`
      INSERT INTO employees (id, first_name, last_name, email, department_id)
      VALUES ($1, 'John', 'Doe', 'john.doe@test.com', $2)
      RETURNING *
    `, [employeeId, departmentId]);

    // Assert audit log was created
    const auditLog = await db.query(`
      SELECT * FROM activity_logs
      WHERE resource_type = 'employees' AND resource_id = $1
    `, [employeeId]);

    expect(auditLog.rows).toHaveLength(1);
    expect(auditLog.rows[0].action).toBe('CREATE');
    expect(auditLog.rows[0].employee_id).toBe(testUserId);
    expect(auditLog.rows[0].before_snapshot).toBeNull();
    expect(auditLog.rows[0].after_snapshot.first_name).toBe('John');
  });
});
```

**Run test**: `npm run test:integration -- employee-insert.test.ts`
**Expected**: ❌ FAIL (no audit log entry created)

### Step 1.2: Implement Trigger (GREEN Phase)

**File**: `database/migrations/00XX_audit_triggers.sql`

```sql
-- Copy trigger function from contracts/audit-triggers.sql
CREATE OR REPLACE FUNCTION audit_trigger_func() RETURNS TRIGGER AS $$
-- ... (full implementation from contract)
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER audit_trigger_employees
AFTER INSERT OR UPDATE OR DELETE ON employees
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
```

**Apply migration**: `npm run db:migrate`
**Run test again**: `npm run test:integration -- employee-insert.test.ts`
**Expected**: ✅ PASS

### Step 1.3: Refactor (Optimize)

- Add indexes if slow
- Optimize JSONB serialization
- Keep tests green

## Part 2: Cryptographic Signing (Security Layer)

### Step 2.1: Write Failing Signature Test

**File**: `tests/unit/crypto-signer.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { signAuditLog, verifySignature, generateKeyPair } from '$lib/server/audit/crypto-signer';

describe('Audit Log Signing', () => {
  it('should generate valid ECDSA signature for audit log', () => {
    // RED: crypto-signer.ts doesn't exist yet

    const { privateKey, publicKey } = generateKeyPair();

    const auditLog = {
      id: 'log-id',
      action: 'CREATE',
      resource_type: 'employees',
      resource_id: 'emp-123',
      created_at: new Date().toISOString()
    };

    const signature = signAuditLog(auditLog, privateKey);

    expect(signature).toBeTruthy();
    expect(signature.length).toBeGreaterThan(50); // Base64 ES256 signature

    const isValid = verifySignature(auditLog, signature, publicKey);
    expect(isValid).toBe(true);
  });
});
```

**Run test**: `npm run test:unit -- crypto-signer.test.ts`
**Expected**: ❌ FAIL (module not found)

### Step 2.2: Implement Signing (GREEN Phase)

**File**: `src/lib/server/audit/crypto-signer.ts`

```typescript
import { createSign, createVerify, generateKeyPairSync } from 'crypto';

export function generateKeyPair() {
  return generateKeyPairSync('ec', {
    namedCurve: 'prime256v1' // P-256 for ES256
  });
}

export function signAuditLog(logEntry: any, privateKey: any): string {
  const sign = createSign('SHA256');
  sign.update(JSON.stringify(logEntry));
  sign.end();
  return sign.sign(privateKey, 'base64');
}

export function verifySignature(logEntry: any, signature: string, publicKey: any): boolean {
  const verify = createVerify('SHA256');
  verify.update(JSON.stringify(logEntry));
  verify.end();
  return verify.verify(publicKey, signature, 'base64');
}
```

**Run test**: `npm run test:unit -- crypto-signer.test.ts`
**Expected**: ✅ PASS

## Part 3: Rollback Operation (E2E Test)

### Step 3.1: Write Failing E2E Test

**File**: `tests/e2e/audit-logging.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Audit Logging with Rollback', () => {
  test('should rollback employee update', async ({ page }) => {
    // RED: Rollback mutation not implemented yet

    // 1. Login as super_admin
    await page.goto('/login');
    await page.fill('[name="email"]', 'superadmin@test.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');

    // 2. Update employee
    await page.goto('/dashboard/employees/emp-123/edit');
    await page.fill('[name="first_name"]', 'Jane');
    await page.click('button[type="submit"]');

    // 3. Navigate to audit logs
    await page.goto('/dashboard/activities/logs');

    // 4. Find the UPDATE log and click rollback
    await page.click('[data-testid="audit-log-item"]:first-child [data-testid="rollback-button"]');

    // 5. Confirm rollback
    await page.fill('[name="reason"]', 'Testing rollback');
    await page.click('[data-testid="confirm-rollback"]');

    // 6. Verify success toast
    await expect(page.locator('.sonner-toast')).toContainText('Rollback completed');

    // 7. Verify employee name reverted
    await page.goto('/dashboard/employees/emp-123');
    await expect(page.locator('[data-testid="employee-name"]')).toContainText('John');
  });
});
```

**Run test**: `npm run test:e2e -- audit-logging.spec.ts`
**Expected**: ❌ FAIL (rollback mutation not found)

### Step 3.2: Implement Rollback Mutation (GREEN Phase)

**File**: `src/lib/server/graphql/rollback-mutation.ts`

```typescript
export async function rollbackAuditLog(
  activityLogId: string,
  reason: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Fetch original audit log
    const logResult = await client.query(
      'SELECT * FROM activity_logs WHERE id = $1',
      [activityLogId]
    );

    if (logResult.rows.length === 0) {
      throw new Error('Audit log not found');
    }

    const originalLog = logResult.rows[0];

    // 2. Restore data from before_snapshot
    const restoreQuery = buildRestoreQuery(
      originalLog.resource_type,
      originalLog.resource_id,
      originalLog.before_snapshot
    );

    await client.query(restoreQuery);

    // 3. Mark original log as rolled back
    await client.query(
      'UPDATE activity_logs SET rolled_back_log_id = $1 WHERE id = $2',
      [rollbackLogId, activityLogId]
    );

    await client.query('COMMIT');
    return { success: true };
  } catch (error) {
    await client.query('ROLLBACK');
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}
```

**Run test**: `npm run test:e2e -- audit-logging.spec.ts`
**Expected**: ✅ PASS

## Part 4: Verification Steps

### Run All Tests
```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# All tests
npm run test
```

### Manual Verification

1. **Create employee**: Verify audit log appears
2. **Update employee**: Verify before/after snapshots
3. **Delete employee**: Verify delete log with snapshot
4. **Rollback**: Verify data restored correctly
5. **Export**: Generate CSV/JSON/PDF exports

### Performance Verification

```bash
# Run performance benchmark
npm run test:performance -- audit-logging-benchmark

# Expected: < 100ms per logged operation
# Expected: < 200ms for GraphQL audit log query
```

## Next Steps After Quickstart

1. Run `/tasks` command to generate full task list
2. Execute tasks in TDD order (tests first, implementation second)
3. Verify all 28 functional requirements are met
4. Complete E2E test coverage for all scenarios

---

_Quickstart guide complete: 2025-10-02_
