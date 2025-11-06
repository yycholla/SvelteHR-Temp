# Remaining Direct Database Access Analysis

**Date:** 2025-11-04
**Scope:** Frontend routes and services bypassing Rust GraphQL backend
**Status:** 8 routes + 6 service files identified

## 📊 Summary

After migrating document API routes, **8 frontend routes** and **6 service/utility files** still make direct PostgreSQL queries bypassing the Rust GraphQL backend.

### Categories

1. **Document-Related Routes** (4 files) - Can be migrated to GraphQL
2. **Employee Routes** (1 file) - Already uses GraphQL ✅
3. **Storage Routes** (2 files) - Legacy/deprecated, can be removed
4. **Audit/Admin Services** (6 files) - Special consideration needed

---

## 🔴 Routes Requiring Migration

### 1. Document Assignment Route
**File:** `/api/employees/[id]/assign-documents/+server.ts`
**Current:** Direct SQL INSERT for document assignments
**GraphQL Available:** ✅ `createDocumentAssignment` mutation exists
**Priority:** HIGH
**Effort:** LOW (15 minutes)

```typescript
// Current: Direct SQL
await client.query(
  `INSERT INTO hr_public.document_assignments
   (document_id, employee_id, assigned_by)
   VALUES ($1, $2, $3)`,
  [docId, employeeId, userId]
);

// Should Use: GraphQL mutation
await urqlClient.mutation(CREATE_DOCUMENT_ASSIGNMENT_MUTATION, {
  input: { documentId: docId, employeeId, assignedBy: userId }
});
```

---

### 2. Document Download Route
**File:** `/api/documents/[id]/download/+server.ts`
**Current:** Direct SQL for encrypted file retrieval
**GraphQL Available:** ✅ Via `document.encryptedFileStorage` relationship (just added)
**Priority:** HIGH
**Effort:** LOW (same pattern as preview route - 20 minutes)

**Migration Pattern:**
```typescript
// Same as preview route - use GetDocumentForPreview query
const result = await urqlClient.query(GET_DOCUMENT_FOR_PREVIEW_QUERY, { id });
const storage = result.data.document.encryptedFileStorage;
const key = await getDecryptionKey(client, storage.encryptionKeyId);
const decrypted = decryptFileFromGraphQL(storage.encryptedData, storage.iv, key);

// Serve with download headers instead of inline
return new Response(decrypted, {
  headers: {
    'Content-Disposition': `attachment; filename="${document.title}"`,
    ...
  }
});
```

---

### 3. Document Detail Page
**File:** `/dashboard/documents/[id]/+page.server.ts`
**Current:** Direct SQL JOIN query for document metadata
**GraphQL Available:** ✅ `document` query with relationships
**Priority:** MEDIUM
**Effort:** MEDIUM (30 minutes)

**Migration:**
```typescript
// Current: SQL JOIN
const docResult = await client.query(`
  SELECT d.*, u.email as uploaded_by_email
  FROM hr_public.documents d
  LEFT JOIN hr_public.users u ON d.uploaded_by = u.id
  WHERE d.id = $1
`);

// Should Use: GraphQL with relationships
const result = await urqlClient.query(GET_DOCUMENT_WITH_UPLOADER, {
  id: documentId
});
const document = result.data.document;
const uploader = document.uploader; // Relationship resolved
```

---

### 4. Document Audit Log Page
**File:** `/dashboard/documents/audit/+page.server.ts`
**Current:** Direct SQL query for document access logs
**GraphQL Available:** ⚠️ Need to check if `documentAccessLogs` query exists
**Priority:** MEDIUM
**Effort:** MEDIUM (45 minutes if query exists, 2 hours if needs resolver)

**Check Backend:**
```bash
grep -n "async fn document_access_logs" graphql-rust-server/src/schema/query.rs
```

If missing, need to add:
```rust
async fn document_access_logs(
    &self,
    ctx: &Context<'_>,
    document_id: Option<Uuid>,
    user_id: Option<Uuid>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<DocumentAccessLog>> {
    // Implementation
}
```

---

### 5. Document Listing Page
**File:** `/dashboard/documents/+page.server.ts`
**Current:** Likely uses direct SQL (need to verify)
**GraphQL Available:** ✅ `documents` query exists
**Priority:** MEDIUM
**Effort:** LOW (20 minutes)

---

## 🟢 Routes Already Using GraphQL

### Employee Detail Page ✅
**File:** `/dashboard/employees/[id]/+page.server.ts`
**Status:** Already migrated to Rust GraphQL backend
**Pattern:** Directly calls GraphQL endpoint with session cookies

```typescript
const graphqlEndpoint = getGraphQLEndpoint();
const response = await fetch(graphqlEndpoint, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Cookie': cookieHeader },
  body: JSON.stringify({ query, variables })
});
```

**Note:** This is a good reference pattern for other route migrations.

---

## 🟡 Legacy/Deprecated Storage Routes

### 6. Storage Upload Route
**File:** `/api/storage/upload/+server.ts`
**Current:** Direct BYTEA INSERT for file storage
**Status:** ⚠️ **DEPRECATED** - Replaced by `/api/documents/upload`
**Action:** Can be **DELETED** or marked deprecated

**Reasoning:**
- Document upload now uses GraphQL `uploadDocument` mutation
- This route creates a separate `encrypted_file_storage` table entry
- Overlaps with document upload functionality
- No longer used by frontend (verify with grep)

**Verification:**
```bash
grep -r "/api/storage/upload" src/routes --include="*.svelte" --include="*.ts"
```

---

### 7. Storage Retrieve Route
**File:** `/api/storage/retrieve/+server.ts`
**Current:** Direct BYTEA SELECT for file retrieval
**Status:** ⚠️ **DEPRECATED** - Replaced by document preview/download
**Action:** Can be **DELETED** or marked deprecated

**Reasoning:**
- Preview/download now use GraphQL with `encryptedFileStorage` relationship
- Redundant with document retrieval system
- Verify no usage before deletion

---

## 🔵 Service/Utility Files (Special Consideration)

### 8. Audit Logging Service
**File:** `/lib/services/audit-logging.service.ts`
**Current:** Direct INSERT to `activity_logs` table
**GraphQL Available:** ⚠️ Need to verify if `createActivityLog` mutation exists
**Priority:** LOW (internal service, not user-facing)
**Consideration:** May need to stay as direct DB access for performance/reliability

**Rationale for Keeping Direct DB:**
- Audit logging must never fail silently
- Direct DB access = fewer points of failure
- Performance-critical (called frequently)
- Internal service, not exposed to users

**Alternative:** Expose GraphQL mutation but keep direct DB as fallback

---

### 9. Rollback Services (3 files)
**Files:**
- `/lib/services/rollback-execution.service.ts`
- `/lib/services/rollback-validation.service.ts`
- `/lib/services/bulk-rollback-processor.service.ts`

**Current:** Complex transaction-based rollback logic
**GraphQL Available:** ❓ Unknown - check backend
**Priority:** LOW (admin-only feature)
**Consideration:** **Should likely stay direct DB**

**Rationale:**
- Rollback requires ACID transactions across multiple tables
- GraphQL is not ideal for complex transactional operations
- Admin-only feature with strict access control
- Better suited for direct database transactions

---

### 10. Snapshot Utilities (2 files)
**Files:**
- `/lib/utils/snapshot-capture.ts`
- `/lib/utils/cascade-snapshot.ts`

**Current:** Complex recursive queries for cascade relationships
**GraphQL Available:** ❌ Not applicable
**Priority:** LOW (internal utilities)
**Consideration:** **Must stay direct DB**

**Rationale:**
- Used by audit/rollback system
- Requires complex recursive SQL (CTEs)
- GraphQL cannot efficiently handle this use case
- Internal utility, not user-facing API

---

## 📋 Migration Priority Matrix

| Route/Service | Priority | Effort | GraphQL Ready | Action |
|---------------|----------|--------|---------------|--------|
| `/api/employees/[id]/assign-documents` | HIGH | LOW | ✅ | Migrate |
| `/api/documents/[id]/download` | HIGH | LOW | ✅ | Migrate |
| `/dashboard/documents/[id]` | MEDIUM | MEDIUM | ✅ | Migrate |
| `/dashboard/documents/audit` | MEDIUM | MEDIUM | ⚠️ | Check backend first |
| `/dashboard/documents` (list) | MEDIUM | LOW | ✅ | Migrate |
| `/api/storage/upload` | N/A | N/A | N/A | **DELETE** |
| `/api/storage/retrieve` | N/A | N/A | N/A | **DELETE** |
| Audit logging service | LOW | N/A | ⚠️ | **Keep as-is** |
| Rollback services (3) | LOW | N/A | ❌ | **Keep as-is** |
| Snapshot utilities (2) | LOW | N/A | ❌ | **Keep as-is** |

---

## ✅ Recommended Immediate Actions

### Phase 1: Quick Wins (1-2 hours)
1. **Migrate document assignment route** (15 min)
2. **Migrate document download route** (20 min)
3. **Migrate document detail page** (30 min)
4. **Migrate document listing page** (20 min)

### Phase 2: Verify & Clean (30 minutes)
1. **Verify storage routes are unused** - grep for usage
2. **Delete `/api/storage/upload`** if unused
3. **Delete `/api/storage/retrieve`** if unused

### Phase 3: Audit Logs (1-2 hours)
1. **Check if `documentAccessLogs` query exists** in Rust backend
2. **Add query if missing** (Rust resolver)
3. **Migrate audit log page** to GraphQL

### Phase 4: Decision on Services (Discussion Needed)
1. **Audit logging service** - Decide: Keep direct DB or add GraphQL fallback?
2. **Rollback services** - Recommend: Keep direct DB (transactional integrity)
3. **Snapshot utilities** - Recommend: Keep direct DB (complex SQL required)

---

## 🔧 Implementation Patterns

### For Document Routes (Replicate Preview Pattern)
```typescript
// 1. Create GraphQL client with session cookies
const urqlClient = createUrqlClient(fetch, undefined, undefined, cookies.get('hr_session'));

// 2. Query document with relationships
const result = await urqlClient.query(GET_DOCUMENT_QUERY, { id });

// 3. RBAC checks (temporary until server-side)
if (userRole !== 'admin' && document.uploaderId !== userId) {
  throw error(403, 'Insufficient permissions');
}

// 4. Additional operations (assignments, audit logs) via mutations
await urqlClient.mutation(CREATE_ASSIGNMENT_MUTATION, { input });
```

### For Service Files (If Migrating)
```typescript
// Keep direct DB as fallback for reliability
try {
  // Try GraphQL first
  await urqlClient.mutation(CREATE_AUDIT_LOG, { input });
} catch (err) {
  console.warn('GraphQL audit log failed, using direct DB fallback');
  // Fallback to direct DB
  await transaction(async (client) => {
    await client.query('INSERT INTO activity_logs...');
  });
}
```

---

## 📊 Estimated Total Migration Effort

- **High Priority Routes:** 1-2 hours
- **Storage Route Cleanup:** 30 minutes
- **Audit Log Migration:** 1-2 hours (backend work needed)
- **Total for User-Facing Routes:** ~3-5 hours

**Services/Utilities:** Recommend keeping as direct DB access (no migration needed)

---

## 🎯 Success Criteria

After Phase 1-3 migration:
- ✅ All user-facing document routes use GraphQL
- ✅ No more direct SQL queries in API routes (except encryption keys)
- ✅ Deprecated storage routes removed
- ✅ Audit/rollback services documented as "intentional direct DB access"
- ✅ Frontend can run with minimal DB credentials (only for encryption keys)

---

## 🔒 Security Notes

**Encryption Keys Will Still Need DB Access:**
- Keys are stored **encrypted** in PostgreSQL using pgcrypto
- Direct DB access required to call `hr_public.decrypt_key_data()` function
- This is **by design** - keeps encryption keys secure
- Alternative would be exposing decrypted keys via GraphQL (security risk)

**Recommendation:** Keep encryption key retrieval as direct DB access, remove all other direct queries.
