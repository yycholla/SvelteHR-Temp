# Document API Migration Plan

## Problem Statement

The SvelteKit frontend is making **direct PostgreSQL queries** for document operations, bypassing the GraphQL Rust backend. This causes:

1. **Authentication failures** - `hr_user` password mismatch between CloudNativePG and application secrets
2. **Security risk** - Frontend has direct database credentials
3. **Architecture violation** - Breaks server-side RBAC API pattern
4. **Maintenance overhead** - Duplicated business logic in frontend and backend

## Current State

### Frontend Direct DB Access Files
```
src/routes/api/documents/+server.ts                    → List documents
src/routes/api/documents/[id]/+server.ts              → Get/Update/Delete document
src/routes/api/documents/upload/+server.ts            → Upload document
src/routes/api/documents/[id]/preview/view/+server.ts → Preview document
src/routes/api/storage/upload/+server.ts              → Storage upload
src/routes/api/employees/[id]/assign-documents/+server.ts → Assign documents
src/routes/dashboard/documents/[id]/+page.server.ts  → Document detail page
src/routes/dashboard/documents/audit/+page.server.ts → Audit logs
src/lib/services/audit-logging.service.ts             → Audit service
src/lib/services/*rollback*.service.ts                → Rollback operations
```

### GraphQL Backend (COMPLETE Coverage)

**Queries:**
- `documents(limit: Int, offset: Int)` - List with pagination
- `document(id: UUID!)` - Single document with full relationships

**Mutations:**
- `uploadDocument(input: UploadDocumentInput!)` - Complete upload with encryption
- `createDocument(input: CreateDocumentInput!)`
- `updateDocument(id: UUID!, input: UpdateDocumentInput!)`
- `deleteDocument(id: UUID!)` - Soft delete
- `createDocumentAssignment(input: CreateDocumentAssignmentInput!)`
- `deleteDocumentAssignment(id: UUID!)`
- `createDocumentAccessLog(input: CreateDocumentAccessLogInput!)`
- Document categories and versions

## Migration Strategy

### Phase 1: Immediate Fix (For Current Deployment)

**Option A: Sync Passwords (Quick Fix)** ⏱️ 5 minutes
```bash
# Get CloudNativePG password
kubectl get secret sveltehr-postgres-app-secret -n sveltehr-prod \
  -o jsonpath='{.data.password}' | base64 -d

# Update sveltehr-secrets to match
kubectl patch secret sveltehr-secrets -n sveltehr-prod \
  --type='json' -p='[{"op":"replace","path":"/data/postgres-password","value":"<base64>"}]'

# Restart frontend
kubectl rollout restart deployment/sveltehr-frontend -n sveltehr-prod
```

**Option B: Use Doppler/External Secrets** ⏱️ 10 minutes
- Sync both secrets from Doppler with same password
- Let External Secrets Operator manage sync

### Phase 2: Remove Direct DB Access (Proper Fix)

#### Step 1: Migrate Document Routes to GraphQL ⏱️ 2-4 hours

**Replace:**
```typescript
// ❌ OLD: Direct DB query in +page.server.ts
import { transaction, setJWTClaims } from '$lib/server/db';
const result = await transaction(async (client) => {
  await setJWTClaims(client, userId, userRole);
  return await client.query('SELECT...');
});
```

**With:**
```typescript
// ✅ NEW: GraphQL query via urql
import { urqlClient } from '$lib/graphql/client';
import { DOCUMENTS_QUERY } from '$lib/graphql/queries';

const result = await urqlClient.query(DOCUMENTS_QUERY, {
  limit: 20,
  offset: 0
});
```

**Files to Update:**
1. `src/routes/api/documents/+server.ts` → Use GraphQL `documents` query
2. `src/routes/api/documents/[id]/+server.ts` → Use GraphQL `document` query + mutations
3. `src/routes/api/documents/upload/+server.ts` → Use GraphQL `uploadDocument` mutation
4. `src/routes/dashboard/documents/[id]/+page.server.ts` → Use GraphQL queries
5. `src/routes/dashboard/documents/audit/+page.server.ts` → Use GraphQL access log queries

#### Step 2: Remove DB Client ⏱️ 30 minutes

1. Remove imports of `$lib/server/db` from document routes
2. Keep `src/lib/server/db.ts` ONLY for non-GraphQL operations (if any exist)
3. Update TypeScript types to match GraphQL schema

#### Step 3: Update Kubernetes Deployments ⏱️ 15 minutes

Remove DB credentials from frontend:

```yaml
# k8s/base/frontend-deployment.yaml
# DELETE these environment variables:
- name: DB_HOST
- name: DB_PORT
- name: DB_NAME
- name: DB_USER
- name: DB_PASSWORD
```

Update ArgoCD:
```bash
git add k8s/base/frontend-deployment.yaml
git commit -m "security: remove direct DB access from frontend"
git push origin main
# ArgoCD will auto-sync
```

#### Step 4: Testing ⏱️ 1 hour

**Test Checklist:**
- [ ] Document listing with filters (`/dashboard/documents`)
- [ ] Document detail page (`/dashboard/documents/[id]`)
- [ ] Document upload with encryption
- [ ] Document assignment to employees/departments
- [ ] Document access logging
- [ ] Audit trail viewing
- [ ] RBAC: Admin can see all, Employee sees only assigned
- [ ] Soft delete functionality

**Test Commands:**
```bash
# Port-forward to test in K8s
kubectl port-forward -n sveltehr-prod svc/sveltehr-frontend 3000:3000

# Run E2E tests
npm run test:documents
```

### Phase 3: Audit Other Direct DB Usage ⏱️ 2-4 hours

**Other services using direct DB:**
- `src/lib/services/audit-logging.service.ts` → Move to GraphQL mutations
- `src/lib/services/rollback-*.service.ts` → Check if backend has rollback API
- `src/lib/utils/cascade-snapshot.ts` → May need backend support
- `src/lib/utils/snapshot-capture.ts` → May need backend support

**Decision:** Keep or migrate based on:
- Does GraphQL backend have equivalent API?
- Is this admin-only functionality that needs direct DB access?
- Can we add GraphQL mutations if needed?

## Timeline Estimate

| Phase | Task | Duration | Priority |
|-------|------|----------|----------|
| **Phase 1** | Sync passwords (Option A) | 5 min | 🔴 Critical |
| **Phase 2** | Migrate document routes | 2-4 hours | 🟠 High |
| **Phase 2** | Remove DB credentials | 15 min | 🟠 High |
| **Phase 2** | Testing | 1 hour | 🟠 High |
| **Phase 3** | Audit other services | 2-4 hours | 🟡 Medium |

**Total: ~6-10 hours** for complete migration

## Deployment Plan

### Immediate (Today)
1. ✅ **Phase 1** - Sync passwords to unblock deployment
2. 📋 Create detailed migration tasks
3. 📝 Document current GraphQL schema

### Sprint 1 (This Week)
1. 🔨 **Phase 2** - Migrate document routes to GraphQL
2. 🧪 Test document functionality end-to-end
3. 🚀 Deploy to dev environment

### Sprint 2 (Next Week)
1. 🔍 **Phase 3** - Audit and migrate remaining direct DB usage
2. 🔐 Remove DB credentials from frontend completely
3. 🚀 Deploy to production

## Rollback Plan

If GraphQL migration causes issues:

1. **Revert frontend deployment:**
   ```bash
   kubectl rollout undo deployment/sveltehr-frontend -n sveltehr-prod
   ```

2. **Re-add DB credentials temporarily:**
   ```bash
   kubectl patch deployment sveltehr-frontend -n sveltehr-prod \
     --type='json' -p='[{"op":"add","path":"/spec/template/spec/containers/0/env/-","value":{"name":"DB_USER","value":"hr_user"}}]'
   ```

3. **Debug GraphQL issues:**
   ```bash
   kubectl logs -f -n sveltehr-prod deployment/sveltehr-backend
   ```

## Security Benefits

After migration:
- ✅ Frontend has **zero** database credentials
- ✅ All data access goes through **RBAC-enforced** GraphQL API
- ✅ **Centralized** audit logging in backend
- ✅ **Single source of truth** for business logic
- ✅ Easier to add **rate limiting** and **caching**
- ✅ CloudNativePG password changes don't break frontend

## Next Steps

**Now:** Choose Phase 1 option (A or B) to unblock deployment

**Ask:**
1. Do you want to sync passwords now (Option A)?
2. Should I start Phase 2 migration immediately after?
3. Are there other features besides documents using direct DB that I should check?
