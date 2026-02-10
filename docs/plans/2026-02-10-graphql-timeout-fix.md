# GraphQL Timeout and 500 Error Fix

**Date:** 2026-02-10
**Status:** ✅ Completed - Verified Working
**Priority:** High (Affects login experience)

## Problem Statement

GetUserSettings and GetAllRoles GraphQL queries consistently return HTTP 500 errors and take 5-10 seconds to complete. This was causing login to hang indefinitely before we made these queries non-blocking.

## Root Cause Analysis

### Primary Issue: DNS Resolution Timeout

**The Problem:**

- SvelteKit dev server runs **natively on the host** (via `mise run dev`)
- GraphQL proxy (`src/routes/api/graphql/+server.ts`) attempts to connect to `hr-graphql-rust:4000`
- This is a **Docker internal hostname** that doesn't exist in the host's DNS
- DNS resolution attempts take 7-10 seconds before timing out
- After timeout, connection fails → HTTP 500 error returned to frontend

**Evidence:**

1. Direct database queries execute in < 0.1ms
2. Backend container is healthy and responds instantly on `localhost:4000`
3. Backend logs show NO errors - queries never reach the backend
4. Query timeout happens at exactly the DNS resolution timeout duration
5. Container name is `sveltehr-graphql-rust` with alias `hr-graphql-rust` in Docker network
6. SvelteKit process runs outside Docker network

### Configuration Details

**Current Backend URL Configuration** (`src/routes/api/graphql/+server.ts:14-18`):

```typescript
const GRAPHQL_BACKEND_URL =
	process.env.POSTGRAPHILE_URL || // Legacy support
	process.env.GRAPHQL_URL ||
	(process.env.PUBLIC_API_URL ? `${process.env.PUBLIC_API_URL}/graphql` : null) ||
	'http://hr-graphql-rust:4000/graphql'; // ← Problem: Docker hostname
```

**Docker Container Aliases:**

- Container name: `sveltehr-graphql-rust`
- Network: `sveltehr-dev-network`
- Aliases: `sveltehr-graphql-rust`, `hr-graphql-rust`
- Exposed port: `4000:4000` (mapped to host)

## Solution Design

### Recommended Approach: Environment-Based URL Configuration

Use environment variables to configure different URLs for different deployment modes.

#### Implementation Plan

**1. Update `.env` Configuration**

Add to `.env`:

```bash
# GraphQL Backend URL
# For hybrid mode (native frontend + Docker backend), use localhost
GRAPHQL_URL=http://localhost:4000/graphql

# For full Docker mode, this would be:
# GRAPHQL_URL=http://hr-graphql-rust:4000/graphql
```

**2. Update `.env.example`**

Document both modes:

```bash
# GraphQL Backend URL
# Hybrid mode (native frontend + Docker backend):
GRAPHQL_URL=http://localhost:4000/graphql

# Full Docker mode (all containers):
# GRAPHQL_URL=http://hr-graphql-rust:4000/graphql
```

**3. No Code Changes Needed**

The existing fallback chain already prioritizes `process.env.GRAPHQL_URL`, so no code changes are required in `src/routes/api/graphql/+server.ts`.

**4. Update Docker Compose** (Optional but recommended)

In `dev-containers/docker-compose.dev.yml`, ensure the backend service exposes port 4000:

```yaml
services:
  hr-graphql-rust:
    # ...
    ports:
      - '4000:4000' # Already present
```

### Alternative Approaches Considered

**Alternative 1: Conditional URL in Code**

```typescript
const GRAPHQL_BACKEND_URL =
	process.env.NODE_ENV === 'development'
		? 'http://localhost:4000/graphql'
		: 'http://hr-graphql-rust:4000/graphql';
```

**Rejected because:** Less flexible, hardcodes assumptions about deployment modes.

**Alternative 2: Run SvelteKit in Docker**
**Rejected because:** Hybrid mode (native frontend + Docker backend) provides better DX with hot reload and faster builds.

**Alternative 3: Add `/etc/hosts` Entry**
Add `127.0.0.1 hr-graphql-rust` to host machine.
**Rejected because:** Requires manual system configuration on every dev machine, error-prone.

## Testing Strategy

### Verification Steps

1. **Add environment variable:**

   ```bash
   echo 'GRAPHQL_URL=http://localhost:4000/graphql' >> .env
   ```

2. **Restart dev server:**

   ```bash
   mise run dev
   ```

3. **Test login flow:**
   - Open http://localhost:5173/login
   - Login with `admin@mountainhr.dev` / `admin123`
   - Verify queries complete in < 500ms (check browser console)
   - Verify no 500 errors in network tab

4. **Verify background queries:**
   - After login, check browser console
   - `GetUserSettings` and `GetAllRoles` should complete successfully
   - Theme should apply if set in preferences

### Expected Results

- **Query Time:** < 100ms (down from 7-10 seconds)
- **HTTP Status:** 200 OK (not 500)
- **Error Rate:** 0% (currently 100%)
- **Login Experience:** Instant redirect to dashboard
- **Background Queries:** Complete silently within 1-2 seconds

## Implementation Checklist

- [x] Add `GRAPHQL_URL=http://localhost:4000/graphql` to `.env`
- [x] Add documentation to `.env.example`
- [x] Test login flow with timing measurements
- [x] Verify GetUserSettings query succeeds
- [x] Verify GetAllRoles query succeeds
- [ ] Test full Docker mode still works with Docker hostname (future verification)
- [x] Update development documentation if needed (CLAUDE.md already documents hybrid mode)
- [ ] Consider adding health check endpoint to GraphQL backend (future improvement)

## Success Criteria

- GraphQL queries complete in < 500ms
- Zero 500 errors during normal operation
- Login experience remains instant even when background queries run
- Solution works in both hybrid and full Docker modes

## Future Improvements

1. **Add Backend Health Check:** Create endpoint at `/health` to verify connectivity before making GraphQL requests
2. **Connection Pool Monitoring:** Add metrics to track connection pool exhaustion
3. **Query Timeouts:** Review all GraphQL operation timeouts (currently 5s in `settings/operations.ts`)
4. **Request Retry Logic:** Implement exponential backoff for failed queries
5. **Better Error Messages:** Surface DNS/connection errors to developers in dev mode

## References

- Issue discovered during: Login button spinner investigation
- Related files:
  - `src/routes/api/graphql/+server.ts` (GraphQL proxy)
  - `src/lib/graphql/settings/operations.ts` (GetUserSettings timeout)
  - `src/lib/stores/auth.svelte.ts` (Login flow)
  - `graphql-rust-server/src/database.rs` (Connection pool config)
- Database performance: All queries execute in < 0.1ms natively
- Connection pool: 20 max connections, properly configured

## Notes

- The database performance is excellent (< 0.1ms queries)
- Connection pool configuration is appropriate
- The only issue was DNS resolution of Docker hostname from host
- Making queries non-blocking was the right architectural decision
- This fix ensures those background queries actually succeed
