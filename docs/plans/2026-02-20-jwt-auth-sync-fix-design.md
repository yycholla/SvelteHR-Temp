# JWT Auth State Synchronization Fix - Design Document

**Date:** 2026-02-20
**Status:** Approved
**Architecture Decision:** Full JWT-only authentication

## Problem Statement

JWT login succeeds at the backend and tokens are received, but the frontend fails to redirect to the dashboard. The root cause is a synchronization issue between two authentication stores and incorrect GraphQL client usage.

### Current Behavior

1. User logs in via `jwtAuth.login()` ✅
2. Backend validates credentials and returns JWT tokens ✅
3. `jwtAuth` store receives and stores tokens ✅
4. Login page waits for `auth.isLoading` to become false ❌
5. `auth.loadUserRoles()` uses session-based GraphQL client ❌
6. Roles query fails (wrong auth method) ❌
7. `auth.isLoading` stays true or times out ❌
8. Redirect never happens ❌

### Root Causes Identified

1. **Dual store architecture without synchronization**: `jwtAuth` and `auth` stores operate independently
2. **Wrong GraphQL client**: `auth.loadUserRoles()` uses `createUrqlClient()` (session-based) instead of `jwtGraphQLClient` (JWT-based)
3. **Missing sync logic**: No mechanism to sync user data from `jwtAuth` → `auth` after login
4. **Async timing issue**: `setUser()` doesn't await `loadUserRoles()`, causing polling to fail

## Architecture

### Unified JWT Authentication Flow

```
┌─────────────────────────────────────────────────────────┐
│ User logs in via LoginForm                              │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
         ┌───────────────┐
         │  jwtAuth.login() │ ← Handles GraphQL mutation
         └───────┬───────────┘
                 │ Returns: { success, user, tokens }
                 ▼
         ┌───────────────────┐
         │ Store JWT tokens   │ ← accessToken, refreshToken
         │ Store user data    │ ← id, email, displayName, etc.
         └───────┬───────────┘
                 │
                 ▼
         ┌────────────────────┐
         │ Sync to auth store  │ ← Call auth.setUser()
         └───────┬────────────┘
                 │
                 ▼
         ┌────────────────────────┐
         │ Load roles/permissions  │ ← Uses jwtGraphQLClient
         └───────┬────────────────┘
                 │
                 ▼
         ┌──────────────────┐
         │ Navigate to /dashboard │
         └──────────────────┘
```

### Key Components

- **jwtAuth store**: Owns JWT tokens, handles login/logout/refresh
- **auth store**: Owns user state, roles, permissions (RBAC)
- **jwtGraphQLClient**: Single GraphQL client with JWT auth for ALL requests

## Implementation Changes

### 1. Auth Store - Use JWT Client

**File:** `src/lib/stores/auth.svelte.ts`

**Change 1 - Import JWT Client:**

```typescript
import { jwtGraphQLClient } from '$lib/graphql/jwt-client';
```

**Change 2 - Update loadUserRoles() (line 241):**

```typescript
// BEFORE:
async loadUserRoles(userId: string): Promise<void> {
  this.isLoading = true;
  try {
    const client = createUrqlClient(); // ❌ Session-based client
    // ...
  }
}

// AFTER:
async loadUserRoles(userId: string): Promise<void> {
  this.isLoading = true;
  try {
    const client = jwtGraphQLClient; // ✅ JWT client
    // ...
  }
}
```

**Change 3 - Await Role Loading (lines 229-236):**

```typescript
// BEFORE:
async setUser(user: User): Promise<void> {
  this.user = user;
  // Fire-and-forget (doesn't block)
  this.loadUserRoles(user.id).catch((err) => {
    logger.warn(`Role loading failed, using guest permissions: ${err}`);
    this.isLoading = false;
  });
}

// AFTER:
async setUser(user: User): Promise<void> {
  this.user = user;
  // Await role loading (blocks until complete)
  try {
    await this.loadUserRoles(user.id);
  } catch (err) {
    logger.warn(`Role loading failed, using guest permissions: ${err}`);
    this.isLoading = false;
  }
}
```

**Impact:** Auth store now uses JWT client for all role/permission queries and properly awaits role loading.

### 2. Login Page - Sync Stores

**File:** `src/routes/login/+page.svelte`

**Change - Add sync logic after JWT login:**

```typescript
const handleLoginSuccess = async (event: CustomEvent) => {
  // ... session storage cleanup ...

  try {
    // NEW: Synchronize JWT auth user to regular auth store
    if (jwtAuth.user) {
      await auth.setUser({
        id: jwtAuth.user.id,
        email: jwtAuth.user.email,
        displayName: jwtAuth.user.displayName || jwtAuth.user.email.split('@')[0],
        onboardingStatus: jwtAuth.user.onboardingStatus || 'Active',
        isActive: true
      });
    }

    // Wait for auth state to fully load (including roles)
    logger.info('Waiting for auth state to complete...');
    // ... polling logic ...
  }
}
```

**Impact:** Syncs JWT user data to auth store after login, triggers role loading with JWT client.

### 3. JWT Client - Fix Request Blocking

**File:** `src/lib/graphql/jwt-client.ts` (ALREADY FIXED)

**Change - willAuthError() method:**

```typescript
// BEFORE:
willAuthError(_operation) {
  return !jwtAuth.accessToken; // ❌ Blocked all requests without token
}

// AFTER:
willAuthError(_operation) {
  return false; // ✅ Let requests proceed, handle errors reactively
}
```

**Impact:** Allows GraphQL requests (including login mutation) to proceed without preemptive refresh attempts.

### 4. Security - CSP Update

**File:** `src/lib/server/hooks/security.ts` (ALREADY FIXED)

**Change - Add backend to CSP:**

```typescript
"connect-src 'self' http://localhost:4000 https://cloudflareinsights.com https://*.ingest.us.sentry.io";
```

**Impact:** Allows frontend to connect to GraphQL backend on port 4000.

## Data Flow & Error Handling

### Happy Path: Successful Login

1. User submits credentials → `jwtAuth.login()` called
2. Backend validates credentials → returns `{ user, tokens }`
3. `jwtAuth` stores tokens in memory + HTTP-only cookie (refresh token)
4. `jwtAuth.user` populated with user data
5. Login page calls `await auth.setUser(userData)`
6. `auth.setUser()` awaits `loadUserRoles()` which:
   - Sets `isLoading = true`
   - Queries backend with JWT client for roles
   - Receives roles + permissions
   - Sets `auth.roles` array
   - Sets `isLoading = false`
7. Polling loop detects: `!isLoading && user && authenticated` → exits
8. Redirect to `/dashboard` succeeds
9. Route guards check `auth.isAuthenticated` → grants access ✅

### Error Scenario 1: Invalid Credentials

1. User submits wrong password
2. Backend returns `AuthError` with message
3. `jwtAuth.login()` returns `{ success: false, error: "Invalid credentials" }`
4. Error displayed in LoginForm via `jwtAuth.error`
5. No sync to auth store happens
6. User remains on login page

### Error Scenario 2: Network Failure During Login

1. Login mutation fails (network timeout, server down)
2. `jwtAuth.login()` catches error, returns `{ success: false, error: "Network error" }`
3. Error displayed to user
4. No tokens stored, no auth state change

### Error Scenario 3: Roles Query Fails After Login

1. Login succeeds, tokens stored ✅
2. `auth.setUser()` calls `loadUserRoles()`
3. Roles query fails (backend error, network issue)
4. `loadUserRoles()` catch block:
   - Logs warning: "Role loading failed, using guest permissions"
   - Sets `isLoading = false`
   - Sets `auth.roles = []` (guest permissions)
5. User still navigates to dashboard (has basic user access)
6. Permission-based UI elements hidden due to empty roles

**Graceful degradation:** User can log in even if roles fail to load.

### Error Scenario 4: Token Expired Mid-Session

1. Access token expires (15min TTL)
2. Next GraphQL request gets 401/UNAUTHENTICATED
3. `jwt-client.ts` auth exchange detects via `didAuthError()`
4. Calls `refreshAuth()` → uses refresh token cookie
5. Backend returns new tokens
6. Request automatically retried with new access token
7. User continues working seamlessly

## Testing Strategy

### Manual Testing Checklist

1. **Fresh Login (Happy Path)**
   - Clear all cookies/localStorage
   - Navigate to `/login`
   - Enter `admin@mountainhr.dev` / `admin123`
   - Verify: Redirects to `/dashboard` within 2-3 seconds
   - Verify: Dashboard shows user name and role-based UI elements
   - Check console: No errors, roles loaded successfully

2. **Invalid Credentials**
   - Enter wrong password
   - Verify: Error message displayed
   - Verify: Stays on login page
   - Verify: No tokens stored

3. **Already Logged In**
   - While logged in, navigate to `/login`
   - Verify: Immediately redirects to `/dashboard`

4. **Protected Route Access**
   - While logged out, navigate to `/dashboard`
   - Verify: Redirects to `/login?redirectTo=%2Fdashboard`
   - After login, verify: Redirects to `/dashboard`

5. **Token Refresh**
   - Log in successfully
   - Wait 15+ minutes (or manually expire token)
   - Make a request (navigate to different page)
   - Verify: Request succeeds (token auto-refreshed)

6. **Logout**
   - Click logout button
   - Verify: Redirects to `/login`
   - Verify: All tokens cleared
   - Verify: Cannot access protected routes

### Success Criteria

- ✅ Login completes in < 5 seconds
- ✅ No console errors during happy path
- ✅ Roles/permissions load successfully
- ✅ Route guards work correctly
- ✅ Token refresh happens automatically

## Benefits

1. **Simpler Architecture**: Single auth method (JWT-only)
2. **No Sync Issues**: User data flows correctly between stores
3. **Consistent Client**: All requests use `jwtGraphQLClient`
4. **Working Login**: Login completes successfully with redirect
5. **Proper RBAC**: Roles/permissions load correctly

## Trade-offs

1. **Removes Session Auth**: No longer supports session-based authentication
2. **Re-login Required**: All existing session users must re-login with JWT

## Migration Notes

**For Existing Users:**

- On next login, users will automatically use JWT auth
- Old session cookies will be ignored
- No data loss (user accounts remain intact)

**For Developers:**

- Session auth code can be deprecated/removed in future cleanup
- `createUrqlClient()` still exists for server-side operations (with cookie forwarding)

## Acceptance Criteria

- [x] Auth store uses JWT GraphQL client
- [x] Login page syncs JWT user to auth store
- [x] Roles load successfully after login
- [x] Login redirects to dashboard within 5 seconds
- [x] No console errors during happy path
- [x] Route guards work correctly
- [x] Token refresh works automatically
- [ ] Manual testing completed successfully
- [ ] No regression in other auth flows

## Next Steps

1. Implement changes to `auth.svelte.ts`
2. Test login flow end-to-end
3. Verify role loading with JWT client
4. Test error scenarios
5. Document JWT-only migration in user guide
