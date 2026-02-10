# JWT Authentication Architecture Design

**Date:** 2026-02-10
**Status:** Approved
**Migration Timeline:** 5 weeks

## Executive Summary

This document outlines the migration from session-based authentication to a modern JWT (JSON Web Token) architecture with hybrid token storage. The design prioritizes security, performance, and zero-downtime migration.

**Key Decision:** Hybrid JWT approach with in-memory access tokens (15min) and HTTP-only refresh tokens (7 days).

---

## 1. High-Level Architecture

### Token Types & Lifecycle

**Access Token:**

- **Lifetime:** 15 minutes
- **Storage:** In-memory (Svelte $state)
- **Purpose:** Authorize GraphQL requests
- **Contains:** User ID, email, roles, permissions, department ID
- **Security:** Clears on page refresh, XSS-protected

**Refresh Token:**

- **Lifetime:** 7 days
- **Storage:** HTTP-only cookie (SameSite=Strict)
- **Purpose:** Obtain new access tokens
- **Security:** Not accessible to JavaScript, CSRF-protected, single-use with rotation

### Authentication Flow

```
┌─────────────┐
│ User Login  │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│ Backend validates credentials   │
│ Issues:                         │
│ - Access Token (JWT)            │
│ - Refresh Token (HTTP-only)     │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ Frontend stores:                │
│ - Access Token → Memory         │
│ - Refresh Token → Cookie (auto) │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ GraphQL Requests:               │
│ Authorization: Bearer <token>   │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ Token expires (14min mark)?     │
│ → Auto-refresh transparently    │
│ → New access token issued       │
│ → New refresh token (rotation)  │
└─────────────────────────────────┘
```

### Security Features

1. **XSS Protection:** Access token in memory, not localStorage
2. **CSRF Protection:** Refresh token uses SameSite=Strict + token rotation
3. **Token Replay Detection:** Single-use refresh tokens with family tracking
4. **Emergency Revocation:** Revoke all tokens via `tokens_valid_after` timestamp
5. **Session Management:** Track active devices, revoke individual sessions

---

## 2. JWT Claims & Security Model

### Access Token Payload (15min expiry)

```typescript
{
  // Standard JWT claims
  sub: "user-uuid",              // Subject (user ID)
  email: "admin@mountainhr.dev",
  exp: 1234567890,               // Expiration timestamp
  iat: 1234567000,               // Issued at timestamp
  jti: "token-unique-id",        // JWT ID (for revocation)
  iss: "mountainhr-api",         // Issuer
  aud: "mountainhr-app",         // Audience

  // Custom claims (HR system)
  roles: ["Admin", "HR Manager"],
  permissions: [
    "employees:read:all",
    "employees:write",
    "compensation:read"
  ],
  departmentId: "dept-uuid",     // For RLS filtering
  displayName: "John Admin"
}
```

### Security Analysis

**✅ Safe to Include Roles/Permissions:**

**Pros:**

- **Performance:** No database lookup on every request (saves 50-100ms)
- **Scalability:** Stateless validation, no session store needed
- **Standard Practice:** OAuth2, Auth0, Okta all include claims in tokens
- **Type Safety:** Frontend knows permissions without network call

**Security Safeguards:**

1. **Short Expiration (15 minutes)**
   - Limits stale permissions window
   - If admin revokes role, max 15min delay (acceptable)
   - Critical operations re-validate against database

2. **Strong Signing (RS256)**
   - Asymmetric 2048-bit RSA keys
   - Private key stored securely (secrets manager)
   - Public key can be distributed for validation

3. **Token Versioning**
   - `jti`: Unique token ID for individual revocation
   - `iat`: Issued timestamp for "invalidate all before X"
   - `tokens_valid_after`: Emergency revocation column on users table

4. **Critical Operation Re-Validation**
   - High-risk actions (delete user, change roles, financial) re-query DB
   - "Trust but verify" for sensitive operations

5. **Refresh Token Rotation**
   - Detects token reuse (replay attack)
   - Revokes entire token family if replay detected
   - Forces re-authentication on security breach

**Risk Scenario & Mitigation:**

❌ **Risk:** Admin removes "employees:delete" permission at 10:00 AM. User's token (issued 9:55 AM) still has permission until 10:10 AM.

✅ **Mitigation:**

- Accept 15-minute window for most operations (industry standard)
- For critical mutations, add database check:
  ```rust
  // In delete employee mutation
  let current_permissions = db.get_user_permissions(user_id).await?;
  if !current_permissions.contains(&"employees:delete") {
      return Err("Permission revoked");
  }
  ```

**Token Size:** ~800-1200 bytes with 20 permissions (negligible overhead vs database round-trip)

---

## 3. Database Schema Changes

### New Table: `refresh_tokens`

```sql
CREATE TABLE hr_public.refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES hr_public.users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,           -- SHA256 hash of refresh token
    token_family_id UUID NOT NULL,      -- For rotation detection
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,           -- Single-use enforcement
    revoked_at TIMESTAMPTZ,             -- Manual revocation
    device_info TEXT,                   -- User agent for "devices" page
    ip_address INET,                    -- IP tracking

    INDEX idx_user_tokens (user_id, revoked_at) WHERE revoked_at IS NULL,
    INDEX idx_token_hash (token_hash),
    INDEX idx_expires (expires_at) WHERE revoked_at IS NULL
);

-- Composite index for fast lookups
CREATE INDEX idx_token_lookup ON hr_public.refresh_tokens(token_hash, expires_at, revoked_at);
```

### Update `users` Table

```sql
-- Add emergency revocation timestamp
ALTER TABLE hr_public.users
ADD COLUMN tokens_valid_after TIMESTAMPTZ DEFAULT NOW();

-- Index for fast revocation checks
CREATE INDEX idx_users_token_valid ON hr_public.users(id, tokens_valid_after);
```

### Token Storage Security

- **Refresh tokens:** Store SHA256 hash, not plaintext
- **Token rotation:** New token family per login session
- **Cleanup job:** Delete expired tokens daily (cron job)

---

## 4. Backend Implementation (Rust)

### Dependencies

```toml
# graphql-rust-server/Cargo.toml
[dependencies]
jsonwebtoken = "9.2"      # JWT encoding/decoding
sha2 = "0.10"             # SHA256 hashing for refresh tokens
rand = "0.8"              # Cryptographically secure random
base64 = "0.21"           # Token encoding
```

### Key Components

**1. JWT Service (`src/auth/jwt_service.rs`)**

- `generate_access_token()`: Create JWT with user claims
- `validate_access_token()`: Verify signature, expiration, revocation
- `generate_refresh_token()`: Create random token, store hash
- `refresh_access_token()`: Validate refresh, issue new tokens (rotation)
- `revoke_all_user_tokens()`: Emergency logout from all devices
- `revoke_token_family()`: Revoke on replay attack detection

**2. JWT Middleware (`src/middleware/jwt_auth.rs`)**

- Extract `Authorization: Bearer <token>` header
- Validate token signature and expiration
- Add `UserContext` to request extensions
- Return 401 on invalid/missing token

**3. GraphQL Context (`src/graphql/context.rs`)**

- `UserContext` struct with user ID, roles, permissions
- `from_jwt_claims()`: Convert JWT claims to context
- `has_permission()`: Check authorization
- `get_user_context()`: Extract from GraphQL context

**4. Auth Mutations (`src/schema/mutations/auth.rs`)**

- `login`: Validate credentials, issue tokens
- `refreshToken`: Rotate tokens (single-use)
- `logout`: Revoke current refresh token
- `logoutAllDevices`: Revoke all user tokens

### Token Rotation Security

```rust
// When refresh token is used:
1. Check if already used (last_used_at IS NOT NULL)
   → If yes: REPLAY ATTACK! Revoke entire token family
2. Mark token as used (set last_used_at)
3. Generate new access + refresh tokens
4. Return new tokens to client

// Token family tracking prevents:
- Stolen token reuse after legitimate refresh
- Attacker using old token triggers family revocation
- Legitimate user's new token also revoked (forced re-login)
- Alerts security team of potential breach
```

### RS256 Key Management

```bash
# Generate keys (run once)
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem

# Store in environment (base64 encoded for multi-line support)
JWT_PRIVATE_KEY=$(cat private.pem | base64)
JWT_PUBLIC_KEY=$(cat public.pem | base64)

# Or use secrets manager (production)
aws secretsmanager create-secret \
  --name mountainhr/jwt-private-key \
  --secret-string file://private.pem
```

---

## 5. Frontend Implementation (SvelteKit + Svelte 5)

### Auth Store (`src/lib/stores/jwt-auth.svelte.ts`)

**Svelte 5 Runes:**

```typescript
class JwtAuthStore {
	accessToken = $state<string | null>(null);
	user = $state<User | null>(null);
	isLoading = $state(false);
	isAuthenticated = $derived(this.accessToken !== null);

	// Reactive methods
	async login(email, password) {
		/* ... */
	}
	async refreshAccessToken() {
		/* ... */
	}
	async logout() {
		/* ... */
	}
	hasPermission(permission: string): boolean {
		/* ... */
	}
}
```

**Key Features:**

1. **Automatic Token Refresh:** Scheduled 1 minute before expiry
2. **Session Restoration:** Attempts refresh on page load (if cookie exists)
3. **Transparent Renewal:** Background refresh, no user interruption
4. **Memory Storage:** Access token cleared on page refresh (security)

### GraphQL Client (`src/lib/graphql/jwt-client.ts`)

**URQL Auth Exchange:**

```typescript
authExchange(async (utils) => {
	return {
		addAuthToOperation(operation) {
			// Add Authorization header
			return utils.appendHeaders(operation, {
				Authorization: `Bearer ${jwtAuth.accessToken}`
			});
		},

		didAuthError(error) {
			// Detect UNAUTHENTICATED errors
			return error.graphQLErrors.some((e) => e.extensions?.code === 'UNAUTHENTICATED');
		},

		async refreshAuth() {
			// Attempt token refresh
			await jwtAuth.refreshAccessToken();
		},

		willAuthError() {
			// Check if token expires in <30 seconds
			const payload = decodeJwt(jwtAuth.accessToken);
			return payload.exp < Date.now() / 1000 + 30;
		}
	};
});
```

**Automatic Retry Flow:**

1. GraphQL query fails with `UNAUTHENTICATED`
2. Auth exchange calls `refreshAuth()`
3. New access token obtained from refresh token
4. Original query retried with new token
5. User never sees error (seamless)

### Login Component (`src/lib/components/auth/LoginForm.svelte`)

```svelte
<script lang="ts">
	import { jwtAuth } from '$lib/stores/jwt-auth.svelte';

	let email = $state('');
	let password = $state('');

	async function handleSubmit() {
		await jwtAuth.login(email, password);
		goto('/dashboard'); // Redirect on success
	}
</script>

<form onsubmit={handleSubmit}>
	<!-- Email/password inputs -->
	<button disabled={jwtAuth.isLoading}>
		{jwtAuth.isLoading ? 'Signing in...' : 'Sign in'}
	</button>
</form>
```

### Server Hooks (`src/hooks.server.ts`)

**JWT-aware hooks:**

```typescript
export const handle: Handle = async ({ event, resolve }) => {
	const pathname = event.url.pathname;

	// Check if public route
	if (PUBLIC_ROUTES.has(pathname)) {
		return resolve(event);
	}

	// For protected routes, ensure refresh token cookie exists
	const hasRefreshToken = event.cookies.get('refresh_token');

	if (!hasRefreshToken) {
		// No refresh token = must login
		redirect(303, `/login?redirectTo=${pathname}`);
	}

	// Backend validates JWT on each request
	return resolve(event);
};
```

**Note:** Frontend hooks are lightweight. Backend middleware does full JWT validation.

---

## 6. Environment Variables

### Backend (`.env`)

```bash
# JWT Configuration
JWT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
-----END RSA PRIVATE KEY-----"

JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A...
-----END PUBLIC KEY-----"

JWT_ACCESS_TTL_MINUTES=15
JWT_REFRESH_TTL_DAYS=7
JWT_ISSUER=mountainhr-api
JWT_AUDIENCE=mountainhr-app

# Dual auth during migration (Phase 2)
ENABLE_SESSION_AUTH=true   # Keep until all users migrated
ENABLE_JWT_AUTH=true       # Enable JWT
```

### Frontend (`.env`)

```bash
# No JWT secrets on frontend (security)
PUBLIC_JWT_ISSUER=mountainhr-api
PUBLIC_JWT_AUDIENCE=mountainhr-app

# GraphQL endpoint (unchanged)
PUBLIC_GRAPHQL_URL=/api/graphql
```

### Docker Compose (`dev-containers/docker-compose.dev.yml`)

```yaml
services:
  graphql-rust:
    environment:
      JWT_PRIVATE_KEY: ${JWT_PRIVATE_KEY}
      JWT_PUBLIC_KEY: ${JWT_PUBLIC_KEY}
      JWT_ACCESS_TTL_MINUTES: ${JWT_ACCESS_TTL_MINUTES:-15}
      JWT_REFRESH_TTL_DAYS: ${JWT_REFRESH_TTL_DAYS:-7}
      JWT_ISSUER: ${JWT_ISSUER:-mountainhr-api}
      JWT_AUDIENCE: ${JWT_AUDIENCE:-mountainhr-app}
```

---

## 7. Migration Strategy (Zero-Downtime)

### Phase 1: Preparation (Week 1)

**Tasks:**

- [ ] Add JWT dependencies to Cargo.toml
- [ ] Create `refresh_tokens` table migration
- [ ] Generate RSA key pair (2048-bit)
- [ ] Add keys to environment variables
- [ ] Test key loading on server startup

**Validation:**

```bash
# Test JWT generation/validation
cargo test jwt_service_tests
```

### Phase 2: Dual Authentication (Week 2)

**Backend supports BOTH session and JWT simultaneously.**

**Implementation:**

```rust
// src/middleware/dual_auth.rs
pub async fn dual_auth_middleware(...) {
    // 1. Try JWT first (Authorization header)
    if let Some(jwt_token) = extract_bearer_token(request) {
        if let Ok(claims) = validate_jwt(jwt_token) {
            return Ok(authenticated_request);
        }
    }

    // 2. Fallback to session (Cookie header)
    if let Some(session_id) = extract_session_cookie(request) {
        if let Ok(user) = validate_session(session_id) {
            return Ok(authenticated_request);
        }
    }

    // 3. Unauthenticated
    Err(AuthError::Unauthenticated)
}
```

**Frontend:**

- Add JWT auth store alongside session auth
- Feature flag: `localStorage.getItem('use_jwt_auth')`
- Login returns BOTH session ID and JWT tokens
- Client chooses based on feature flag

**Testing:**

- All existing features work with sessions
- New JWT flow works in parallel
- No user disruption

### Phase 3: User Migration (Week 3-4)

**Automatic migration on next login:**

```rust
async fn login(...) -> LoginResponse {
    // Validate credentials
    let user = authenticate(email, password)?;

    // Issue JWT tokens (NEW)
    let access_token = jwt_service.generate_access_token(...)?;
    let refresh_token = jwt_service.generate_refresh_token(...)?;

    // Keep session for backwards compatibility (OLD)
    let session_id = create_session(user.id)?;

    // Return both
    LoginResponse {
        session_id,      // For old clients
        access_token,    // For new clients
        refresh_token,   // Set as HTTP-only cookie
    }
}
```

**Frontend auto-upgrade:**

```typescript
async function login(email, password) {
    const response = await fetch('/api/auth/login', ...);
    const data = await response.json();

    if (data.accessToken) {
        // Switch to JWT mode
        localStorage.setItem('use_jwt_auth', 'true');
        jwtAuth.setAccessToken(data.accessToken);
    } else {
        // Fallback to session
        sessionAuth.setSession(data.sessionId);
    }
}
```

**Monitoring:**

```sql
-- Track migration progress
SELECT
    COUNT(*) FILTER (WHERE last_login > NOW() - INTERVAL '7 days') as active_users,
    COUNT(*) FILTER (WHERE id IN (
        SELECT DISTINCT user_id FROM hr_public.refresh_tokens
    )) as jwt_users
FROM hr_public.users;

-- Expected: jwt_users → active_users over 7 days
```

### Phase 4: JWT-Only Mode (Week 5)

**Day 1-3: Disable session creation**

```rust
ENABLE_SESSION_AUTH=false  // Only validate existing sessions
ENABLE_JWT_AUTH=true
```

**Day 4-7: Monitor session usage**

```sql
-- Should decline to zero
SELECT COUNT(*) FROM hr_public.sessions
WHERE expires_at > NOW();
```

**Day 8+: Remove session middleware**

```rust
// Remove dual_auth_middleware
// Use jwt_auth_middleware only

let app = Router::new()
    .route("/graphql", post(graphql_handler))
    .layer(middleware::from_fn(jwt_auth_middleware)); // JWT only
```

**Cleanup (optional):**

```sql
-- Archive sessions for audit trail
CREATE TABLE hr_public.sessions_archive AS
SELECT * FROM hr_public.sessions;

-- Drop old table
DROP TABLE hr_public.sessions;
```

### Rollback Plan

If issues arise during migration:

**Phase 2-3 Rollback:**

```bash
# Revert to session-only
ENABLE_SESSION_AUTH=true
ENABLE_JWT_AUTH=false
```

**Phase 4 Rollback:**

```bash
# Re-enable dual auth
ENABLE_SESSION_AUTH=true
ENABLE_JWT_AUTH=true

# Redeploy dual_auth_middleware
```

**Data Preservation:**

- Keep `refresh_tokens` table even if rolling back
- Keep `sessions` table until 100% confidence
- Archive before deletion

---

## 8. Testing Strategy

### Backend Tests (Rust)

**Unit Tests (`jwt_service_tests.rs`):**

```rust
#[tokio::test]
async fn test_generate_and_validate_access_token() {
    // Generate token with claims
    let token = jwt_service.generate_access_token(...)?;

    // Validate token
    let claims = jwt_service.validate_access_token(&token)?;

    assert_eq!(claims.email, "test@mountainhr.dev");
    assert_eq!(claims.roles, vec!["Admin"]);
}

#[tokio::test]
async fn test_expired_token_rejected() {
    let jwt_service = setup_with_short_ttl(1); // 1 second
    let token = jwt_service.generate_access_token(...)?;

    tokio::time::sleep(Duration::from_secs(2)).await;

    let result = jwt_service.validate_access_token(&token);
    assert!(result.is_err());
}

#[tokio::test]
async fn test_refresh_token_rotation() {
    let token1 = jwt_service.generate_refresh_token(...)?;

    // Use token1 to get new tokens
    let (access2, token2) = jwt_service.refresh_access_token(&token1)?;

    // token1 should be single-use (marked as used)
    let result = jwt_service.refresh_access_token(&token1);
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("reuse detected"));
}

#[tokio::test]
async fn test_token_family_revocation_on_replay() {
    let token1 = jwt_service.generate_refresh_token(...)?;
    let (_, token2) = jwt_service.refresh_access_token(&token1)?;

    // Replay attack: try to reuse token1
    let result = jwt_service.refresh_access_token(&token1);
    assert!(result.is_err());

    // Entire family should be revoked (including token2)
    let result2 = jwt_service.refresh_access_token(&token2);
    assert!(result2.is_err());
}

#[tokio::test]
async fn test_revoke_all_user_tokens() {
    let token = jwt_service.generate_access_token(...)?;
    jwt_service.validate_access_token(&token)?; // Works

    jwt_service.revoke_all_user_tokens(user_id)?;

    let result = jwt_service.validate_access_token(&token);
    assert!(result.is_err());
}
```

### Frontend Tests (Vitest)

```typescript
describe('JWT Auth Store', () => {
	it('should login and set access token', async () => {
		mockFetch({
			data: {
				login: {
					accessToken: 'eyJhbGci...',
					user: { id: 'user-123', email: 'test@mountainhr.dev' }
				}
			}
		});

		await jwtAuth.login('test@mountainhr.dev', 'password');

		expect(jwtAuth.isAuthenticated).toBe(true);
		expect(jwtAuth.user?.email).toBe('test@mountainhr.dev');
	});

	it('should schedule automatic token refresh', async () => {
		vi.useFakeTimers();

		// Set token with 15min expiry
		jwtAuth.setAccessToken(createMockToken({ exp: Date.now() + 15 * 60 * 1000 }));

		// Fast-forward to 14 minutes (1min before expiry)
		vi.advanceTimersByTime(14 * 60 * 1000);

		// Refresh should be triggered
		expect(fetch).toHaveBeenCalledWith(expect.stringContaining('refreshToken'), expect.any(Object));

		vi.useRealTimers();
	});

	it('should restore session on page load', async () => {
		mockFetch({ data: { refreshToken: { accessToken: 'new-token' } } });

		const newStore = new JwtAuthStore(); // Simulates page reload

		await vi.waitFor(() => {
			expect(newStore.isAuthenticated).toBe(true);
		});
	});
});
```

### E2E Tests (Playwright)

```typescript
test('should login with JWT and access protected pages', async ({ page }) => {
	await page.goto('/login');

	await page.fill('input[type="email"]', 'admin@mountainhr.dev');
	await page.fill('input[type="password"]', 'admin123');
	await page.click('button[type="submit"]');

	await expect(page).toHaveURL(/\/dashboard/);

	// Navigate to employees (authenticated request)
	await page.goto('/dashboard/employees');
	await expect(page.locator('text=Employee Directory')).toBeVisible();
});

test('should handle token replay attack', async ({ page, context }) => {
	await loginUser(page);

	const cookies = await context.cookies();
	const refreshToken = cookies.find((c) => c.name === 'refresh_token');

	// Refresh once (normal)
	await page.evaluate(() => jwtAuth.refreshAccessToken());

	// Try to reuse same token (replay attack)
	const response = await fetchWithToken('/api/graphql', refreshToken.value, {
		query: 'mutation { refreshToken { accessToken } }'
	});

	expect(response.errors[0].message).toContain('reuse detected');

	// User should be logged out
	await page.reload();
	await expect(page).toHaveURL(/\/login/);
});

test('should auto-refresh before token expires', async ({ page }) => {
	let refreshCount = 0;

	await page.route('**/api/graphql', (route) => {
		const body = route.request().postData();
		if (body?.includes('refreshToken')) refreshCount++;
		route.continue();
	});

	await loginUser(page);

	// Wait for auto-refresh (should happen at ~14min mark)
	await page.waitForTimeout(2000); // Mocked time

	expect(refreshCount).toBeGreaterThan(0);
});
```

### Load Testing (k6)

```javascript
// Test token refresh under load
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
	stages: [
		{ duration: '2m', target: 100 }, // Ramp up
		{ duration: '5m', target: 100 }, // Steady state
		{ duration: '2m', target: 0 } // Ramp down
	]
};

export default function () {
	// Login
	let loginRes = http.post(
		'http://localhost:4000/graphql',
		JSON.stringify({
			query: 'mutation { login(email: "test@mountainhr.dev", password: "test") { accessToken } }'
		}),
		{ headers: { 'Content-Type': 'application/json' } }
	);

	check(loginRes, { 'login successful': (r) => r.status === 200 });

	let accessToken = loginRes.json().data.login.accessToken;

	// Make authenticated requests
	for (let i = 0; i < 10; i++) {
		let res = http.post(
			'http://localhost:4000/graphql',
			JSON.stringify({
				query: 'query { users(limit: 20) { id email } }'
			}),
			{
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${accessToken}`
				}
			}
		);

		check(res, { 'query successful': (r) => r.status === 200 });
		sleep(1);
	}
}
```

---

## 9. Security Checklist

Before production deployment:

- [ ] **Keys Generated:** RS256 2048-bit keys created securely
- [ ] **Keys Stored:** Private key in secrets manager (not .env in git)
- [ ] **Token Lifetimes:** 15min access, 7 day refresh (configurable)
- [ ] **Refresh Token Storage:** SHA256 hash only, not plaintext
- [ ] **Cookie Security:** HTTP-only, Secure, SameSite=Strict
- [ ] **Token Rotation:** Single-use refresh tokens with family tracking
- [ ] **Replay Detection:** `last_used_at` and family revocation implemented
- [ ] **Emergency Revocation:** `tokens_valid_after` column functional
- [ ] **HTTPS Only:** Cookies only sent over HTTPS in production
- [ ] **Rate Limiting:** Login attempts limited (5 per 15min)
- [ ] **Audit Logging:** Token issuance, refresh, revocation logged
- [ ] **Device Tracking:** User can see "active sessions" in settings
- [ ] **Tests Passing:** All security tests (replay, revocation) passing
- [ ] **Load Tested:** 1000 concurrent users tested
- [ ] **Monitoring:** Alerts for high token failure rates
- [ ] **Docs Updated:** API docs show JWT auth flow

---

## 10. Performance Metrics

**Expected Improvements:**

| Metric          | Session-Based             | JWT-Based                       | Improvement                     |
| --------------- | ------------------------- | ------------------------------- | ------------------------------- |
| Auth Validation | ~50-100ms (DB query)      | ~2-5ms (signature verification) | **20-50x faster**               |
| Token Refresh   | ~200ms (DB + Redis)       | ~50ms (validate + sign)         | **4x faster**                   |
| Scalability     | Limited (session store)   | Unlimited (stateless)           | **Infinite horizontal scaling** |
| Memory Usage    | ~1KB per session (server) | ~800 bytes (client-side)        | **Less server memory**          |

**Measured Baselines (to track):**

- P50 auth latency: < 5ms
- P99 auth latency: < 20ms
- Token refresh latency: < 100ms
- Login flow (full): < 500ms

---

## 11. Monitoring & Alerts

### Key Metrics to Track

```yaml
# Prometheus metrics
- mountainhr_jwt_validation_duration_ms
- mountainhr_jwt_validation_failures_total
- mountainhr_jwt_refresh_total
- mountainhr_jwt_refresh_failures_total
- mountainhr_jwt_replay_attacks_detected_total
- mountainhr_active_refresh_tokens_count
```

### Alerts

```yaml
# High token validation failure rate
- alert: HighJWTFailureRate
  expr: rate(mountainhr_jwt_validation_failures_total[5m]) > 0.05
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: 'JWT validation failure rate > 5%'

# Replay attacks detected
- alert: JWTReplayAttackDetected
  expr: increase(mountainhr_jwt_replay_attacks_detected_total[5m]) > 0
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: 'JWT replay attack detected - possible security breach'

# High refresh token count (possible leak)
- alert: UnusuallyHighRefreshTokenCount
  expr: mountainhr_active_refresh_tokens_count > 10000
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: 'Unusually high number of active refresh tokens'
```

---

## 12. Documentation Updates

**API Documentation:**

- Update GraphQL schema docs with JWT authentication
- Add examples showing `Authorization: Bearer <token>` header
- Document token refresh flow

**User Documentation:**

- "Active Sessions" page showing logged-in devices
- "Logout from all devices" feature explanation
- Security best practices (don't share tokens)

**Developer Documentation:**

- Update README with JWT setup instructions
- Add "Authentication" section to CONTRIBUTING.md
- Document environment variables for JWT

---

## 13. Rollout Checklist

**Pre-Production (Staging):**

- [ ] All tests passing (unit, integration, E2E)
- [ ] Load testing completed (1000 concurrent users)
- [ ] Security audit passed (external review recommended)
- [ ] Monitoring dashboards created
- [ ] Alerts configured
- [ ] Rollback plan documented and tested
- [ ] Team training completed

**Production Rollout:**

- [ ] Phase 1: Preparation (Week 1)
- [ ] Phase 2: Dual auth enabled (Week 2)
- [ ] Phase 3: User migration (Week 3-4)
- [ ] Phase 4: JWT-only mode (Week 5)
- [ ] Cleanup: Remove session code (Week 6)

**Post-Rollout:**

- [ ] Monitor for 1 week (no alerts)
- [ ] User feedback collected (no auth issues)
- [ ] Performance metrics validated (20x improvement confirmed)
- [ ] Security audit post-migration
- [ ] Update disaster recovery plan

---

## 14. Future Enhancements

**Post-Migration Improvements:**

1. **OAuth2 / SSO Integration**
   - JWT architecture makes this easier
   - Support Google Workspace, Microsoft AD

2. **Mobile App Support**
   - JWT access tokens work perfectly for native apps
   - Refresh token rotation already mobile-friendly

3. **Microservices Auth**
   - Shared public key for JWT validation across services
   - No central session store needed

4. **Fine-Grained Permissions**
   - Add more granular permissions to JWT claims
   - Example: `employees:read:department:123`

5. **API Key Authentication**
   - Long-lived tokens for service accounts
   - Same JWT infrastructure, different TTL

---

## Appendix A: Code References

**Backend Files to Create:**

- `graphql-rust-server/src/auth/jwt_config.rs`
- `graphql-rust-server/src/auth/jwt_claims.rs`
- `graphql-rust-server/src/auth/jwt_service.rs`
- `graphql-rust-server/src/middleware/jwt_auth.rs`
- `graphql-rust-server/src/models/refresh_token.rs`
- `graphql-rust-server/src/schema/mutations/auth.rs` (update)

**Frontend Files to Create:**

- `src/lib/stores/jwt-auth.svelte.ts`
- `src/lib/graphql/jwt-client.ts`

**Frontend Files to Update:**

- `src/hooks.server.ts` (JWT-aware hooks)
- `src/lib/components/auth/LoginForm.svelte` (use JWT store)
- `src/routes/dashboard/+layout.server.ts` (use JWT client)

**Database Migrations:**

- `migration/m20260210_001_create_refresh_tokens.rs`
- `migration/m20260210_002_add_tokens_valid_after.rs`

---

## Appendix B: Troubleshooting

**Common Issues:**

1. **"Invalid token signature"**
   - Cause: Public key mismatch
   - Fix: Ensure JWT_PUBLIC_KEY matches JWT_PRIVATE_KEY

2. **"Token reuse detected"**
   - Cause: Refresh token used twice (normal for retry logic)
   - Fix: Frontend should not retry refresh on 401

3. **"No refresh token found"**
   - Cause: Cookie not set or expired
   - Fix: Check cookie settings (Domain, SameSite, Secure)

4. **High memory usage**
   - Cause: Expired refresh tokens not cleaned up
   - Fix: Add cron job to delete expired tokens daily

5. **Token validation slow (>20ms)**
   - Cause: Database query for revocation check on every request
   - Fix: Cache `tokens_valid_after` in Redis (5min TTL)

---

## Conclusion

This JWT authentication architecture provides a secure, scalable, and performant foundation for the MountainHR application. The hybrid approach balances security (HTTP-only refresh tokens) with usability (automatic token refresh), while the zero-downtime migration strategy ensures no disruption to existing users.

**Next Steps:**

1. Review and approve this design document
2. Create implementation tasks in project tracker
3. Assign developers to Phase 1 (Preparation)
4. Schedule security review before production rollout

**Estimated Timeline:** 5 weeks from start to production
**Estimated Effort:** 80-120 developer hours

---

**Document Version:** 1.0
**Last Updated:** 2026-02-10
**Status:** Approved for Implementation
