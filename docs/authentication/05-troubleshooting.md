# JWT Authentication Troubleshooting Guide

## Quick Diagnostics

Before diving into specific issues, try these quick fixes:

### Browser Issues

1. **Clear cache and cookies:**
   - Chrome/Edge: `Ctrl+Shift+Delete`
   - Firefox: `Ctrl+Shift+Delete`
   - Safari: Preferences → Privacy → Manage Website Data

2. **Check browser console for errors:**
   - Open DevTools (`F12` or `Ctrl+Shift+I`)
   - Go to Console tab
   - Look for red error messages

3. **Check HTTPS:**
   - URL should start with `https://`
   - If not in production, HTTP is OK for localhost

4. **Hard refresh:**
   - `Ctrl+Shift+R` (Chrome/Firefox) or `Cmd+Shift+R` (Mac)
   - Clears cache and reloads page

### Server Issues

1. **Check backend is running:**

   ```bash
   curl -X GET http://localhost:8080/graphql
   ```

2. **Check Docker containers:**

   ```bash
   docker ps
   docker logs <container-name>
   ```

3. **Check network connectivity:**
   - Ping backend: `ping localhost:8080`
   - Check firewall rules

---

## User-Facing Issues

### "Invalid email or password"

**What it means:** Login credentials are wrong or user doesn't exist.

**Troubleshooting:**

1. **Verify email address:**
   - Check for typos
   - Confirm correct domain (e.g., @company.com not @email.com)
   - Emails are case-insensitive but verify exact address

2. **Verify password:**
   - Caps Lock is on? (indicator usually shown)
   - Check for accidental spaces
   - Try resetting password if forgot

3. **Account exists:**
   - Contact admin to confirm account created
   - Check if account activated
   - Verify in correct organization

4. **Admin check:**
   ```bash
   # Backend: Check user exists
   SELECT * FROM users WHERE email = 'user@example.com';
   ```

**Solution:** Double-check credentials and try again. Contact HR if account doesn't exist.

---

### "Account is disabled"

**What it means:** Your account is inactive (admin disabled it).

**Troubleshooting:**

1. **Confirm with admin:**
   - Contact HR department
   - Check if employment status changed
   - Verify account wasn't disabled by mistake

2. **Check account status:**

   ```bash
   SELECT email, is_active, status FROM users
   WHERE email = 'user@example.com';
   ```

3. **Re-enable if needed:**
   ```bash
   UPDATE users SET is_active = true
   WHERE email = 'user@example.com';
   ```

**Solution:** Contact HR to re-enable account. Won't be possible to login until account reactivated.

---

### "Too many login attempts"

**What it means:** Rate limiting activated after failed attempts.

**Troubleshooting:**

1. **Wait for lockout to expire:**
   - Default: 15 minutes from first failed attempt
   - Can't bypass rate limiting (security feature)

2. **During lockout:**
   - Verify credentials are correct
   - Check caps lock
   - Try different device if urgent

3. **After lockout expires:**
   - Try login again with correct credentials
   - If still failing, contact admin

**Prevention:**

- Use password manager (avoid typos)
- Write credentials in secure note
- Contact admin if unsure

**Solution:** Wait 15 minutes and try again with correct credentials.

---

### "Session expired" or "You were logged out"

**What it means:** Your tokens expired and you need to login again.

**Possible causes:**

| Cause                        | Timeline             | Solution                      |
| ---------------------------- | -------------------- | ----------------------------- |
| **Refresh token expired**    | 7 days of inactivity | Login again                   |
| **You logged out elsewhere** | Immediate            | Another device logged you out |
| **Admin revoked session**    | Immediate            | Contact admin                 |
| **Password changed**         | Immediate            | Use new password              |
| **System time very wrong**   | Immediate            | Sync system clock             |

**Troubleshooting:**

1. **Check system time:**
   - Windows: Right-click clock → Adjust date/time
   - Mac: System Preferences → Date & Time
   - Sync with internet time server

2. **Check logout from other device:**
   - Go to Profile → Security → Active Sessions
   - Did you logout from another device?
   - Were other devices logged out?

3. **Contact admin if unexpected:**
   - Unexpected logout might indicate security incident
   - Check audit log for activity
   - Change password as precaution

**Solution:** Login again. If frequent, check system time or contact admin.

---

### Page keeps refreshing / Infinite redirect loop

**What it means:** Browser stuck between login and dashboard.

**Possible causes:**

1. Login failed but partial data saved
2. Browser cache corrupted
3. Cookie issues
4. Backend communication problem

**Troubleshooting:**

1. **Clear browser cache completely:**

   ```
   Chrome: Ctrl+Shift+Delete → Select All time → Clear data
   Firefox: Ctrl+Shift+Delete → Everything → Clear Now
   Safari: Develop → Empty Web Storage
   ```

2. **Close all browser tabs/windows:**
   - Close browser completely
   - Wait 10 seconds
   - Reopen browser fresh

3. **Disable browser extensions:**
   - Some extensions interfere with cookies
   - Try incognito/private window
   - Disable ad blockers

4. **Check backend logs:**

   ```bash
   docker logs graphql-rust-server | grep -i "error\|login"
   ```

5. **Test API directly:**
   ```bash
   curl -X POST http://localhost:8080/graphql \
     -H "Content-Type: application/json" \
     -d '{"query":"mutation{login(input:{email:\"test@example.com\",password:\"test\"}){...}}"}'
   ```

**Solution:** Clear cache → close browser → reopen → try login

---

### "Unexpected token" or "Invalid token" error

**What it means:** Token is corrupted or invalid.

**Possible causes:**

1. Token tampered with
2. Token from different server
3. Browser cache issue
4. Cross-site cookie issue

**Troubleshooting:**

1. **Clear cookies:**
   - Clear browser cache (see above)
   - Delete refresh_token cookie specifically
   - Restart browser

2. **Check browser DevTools:**
   - Open Console tab
   - Look for detailed error message
   - Screenshot error for admin

3. **Verify same origin:**
   - Are you on correct domain?
   - Check URL matches expected domain
   - Not accessing via IP instead of domain?

4. **Check time sync:**
   - System time very wrong = invalid token
   - Sync with internet time

**Solution:** Clear cache and try again.

---

## Developer Issues

### Login Form Not Working

**Symptom:** Submit button doesn't work or no response.

**Checklist:**

1. **Check browser console:**

   ```javascript
   // Should see GraphQL mutation result
   console.log('Login result:', result);
   ```

2. **Verify jwtAuth is initialized:**

   ```typescript
   import { jwtAuth } from '$lib/stores/jwt-auth.svelte';
   console.log('jwtAuth:', jwtAuth);
   // Should not be undefined
   ```

3. **Check GraphQL endpoint:**

   ```typescript
   // Verify endpoint URL
   const client = createJwtGraphQLClient('http://localhost:8080/graphql');
   // Should be correct backend URL
   ```

4. **Test GraphQL directly:**

   ```bash
   curl -X POST http://localhost:8080/graphql \
     -H "Content-Type: application/json" \
     -d '{
       "query": "mutation Login { login(input:{email:\"test@example.com\",password:\"pass\"}) { ... } }"
     }'
   ```

5. **Check network tab:**
   - Open DevTools → Network tab
   - Try login
   - Should see GraphQL request
   - Check response status (should be 200)
   - Check response body for error message

**Common Issues:**

```typescript
// Issue: jwtAuth not initialized
// Fix: Call initialize() in root layout
jwtAuth.initialize(client);

// Issue: GraphQL URL wrong
// Fix: Check VITE_GRAPHQL_URL env var
const url = import.meta.env.VITE_GRAPHQL_URL;

// Issue: GraphQL mutation wrong
// Fix: Check mutation matches backend schema
mutation Login($email: String!, $password: String!) {
  login(input: { email: $email, password: $password }) {
    ... on AuthSuccess { ... }
    ... on AuthError { ... }
  }
}
```

---

### Token Not Being Sent in Requests

**Symptom:** API returns 401 Unauthenticated even after login.

**Checklist:**

1. **Verify token is stored:**

   ```typescript
   // In browser console
   console.log(jwtAuth.accessToken);
   // Should show JWT token string
   ```

2. **Check auth exchange is configured:**

   ```typescript
   const client = new Client({
   	exchanges: [
   		cacheExchange,
   		jwtAuthExchange, // Must be before fetchExchange!
   		fetchExchange
   	]
   });
   ```

3. **Verify header is added:**

   ```typescript
   // In auth exchange
   return utils.appendHeaders(operation, {
   	Authorization: `Bearer ${token}`
   });
   ```

4. **Test with curl:**

   ```bash
   TOKEN="<your-jwt-token>"
   curl -X POST http://localhost:8080/graphql \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"query":"{me{id}}"}'
   # Should work if token is valid
   ```

5. **Check URQL devtools:**
   - Install URQL devtools extension
   - Check if Authorization header present
   - Check token value

**Common Issues:**

```typescript
// Issue: Auth exchange not in right position
// Wrong:
exchanges: [jwtAuthExchange, cacheExchange, fetchExchange];

// Correct:
exchanges: [cacheExchange, jwtAuthExchange, fetchExchange];

// Issue: Token null after login
// Fix: Ensure login response includes tokens
const result = await jwtAuth.login(email, password);
if (result.success) {
	console.log(jwtAuth.accessToken); // Should be set
}

// Issue: Token not persisted in cookie
// Fix: Check credentials: 'include' in fetch options
fetchOptions: () => ({
	credentials: 'include' // Required for cookies
});
```

---

### "Cannot read property 'accessToken' of null"

**Symptom:** Error in component accessing jwtAuth.

**Cause:** jwtAuth not initialized before first use.

**Fix:**

```typescript
// In root layout (+layout.svelte)
<script>
  import { jwtAuth } from '$lib/stores/jwt-auth.svelte';
  import { jwtGraphQLClient } from '$lib/graphql/jwt-client';

  // Initialize on page load
  onMount(() => {
    jwtAuth.initialize(jwtGraphQLClient);
  });
</script>
```

Or ensure it's already initialized in jwt-client.ts:

```typescript
export const jwtGraphQLClient = browser
	? createJwtGraphQLClient('http://localhost:8080/graphql')
	: ({} as Client);
```

---

### Token Refresh Not Working

**Symptom:** Access token expires, user doesn't auto-refresh.

**Checklist:**

1. **Verify refresh scheduled:**

   ```typescript
   // Console should show
   console.log('[JWT Auth] Token refresh scheduled in 840s');
   ```

2. **Check refresh token exists:**

   ```javascript
   // In DevTools
   document.cookie;
   // Should include 'refresh_token'
   ```

3. **Wait for refresh to trigger:**
   - Auto-refresh happens 1 min before expiry
   - For 15-min token, refresh at 14 minutes
   - Don't wait exactly 15 minutes

4. **Manually test refresh:**

   ```typescript
   const success = await jwtAuth.refreshAccessToken();
   console.log('Refresh success:', success);
   console.log('New token:', jwtAuth.accessToken);
   ```

5. **Check backend refresh endpoint:**
   ```bash
   curl -X POST http://localhost:8080/graphql \
     -H "Content-Type: application/json" \
     -d '{
       "query": "mutation RefreshToken { refreshToken(input:{...}) { ... } }"
     }'
   ```

**Common Issues:**

```typescript
// Issue: Refresh timer not scheduled
// Check: scheduleTokenRefresh() called in setAuthData()
private setAuthData(user: AuthUser, tokens: TokenPair) {
  this.scheduleTokenRefresh(tokens.expiresIn); // Must be called
}

// Issue: Refresh token expired
// Check: Refresh token TTL (default 7 days)
// Need to login again if > 7 days

// Issue: Refresh fails silently
// Check: Backend logs for refresh errors
docker logs graphql-rust-server | grep -i refresh
```

---

### Permission Check Always Returns False

**Symptom:** `jwtAuth.hasPermission()` always returns false.

**Checklist:**

1. **Verify user loaded:**

   ```typescript
   console.log('User:', jwtAuth.user);
   // Should show user object with permissions array
   ```

2. **Check permission string:**

   ```typescript
   console.log('Permissions:', jwtAuth.user?.permissions);
   // Should be array like ["employees:read", "employees:edit"]

   // Check exact match
   console.log('Has permission:', jwtAuth.hasPermission('employees:read'));
   // Exact string must match
   ```

3. **Verify GraphQL returns permissions:**

   ```graphql
   query Me {
   	me {
   		id
   		permissions # Must be in query
   		roles # Must be in query
   	}
   }
   ```

4. **Check JWT claims:**
   ```typescript
   // Decode JWT to see claims
   const parts = jwtAuth.accessToken.split('.');
   const decoded = JSON.parse(atob(parts[1]));
   console.log('Claims:', decoded);
   // Should include permissions array
   ```

**Common Issues:**

```typescript
// Issue: User not loaded after login
// Fix: Ensure login response includes user object
const result = await jwtAuth.login(email, password);
// Must return user with permissions

// Issue: Permission string mismatch
// Check: Case sensitivity
jwtAuth.hasPermission('Employees:Read')  // Wrong
jwtAuth.hasPermission('employees:read')  // Correct

// Issue: Permissions array empty
// Check: Backend returns permissions in token
// Check: User has roles assigned
// Check: Roles have permissions
SELECT * FROM user_role_assignments
WHERE user_id = '...'
```

---

### Server-Side (SSR) Issues

**Symptom:** Server can't access user data in load function.

**Problem:** Token not passed to server-side client.

**Fix:**

```typescript
// src/routes/+layout.server.ts
import { createServerJwtClient } from '$lib/graphql/jwt-client';

export const load: LayoutServerLoad = async ({ fetch, cookies }) => {
	// Get token from cookie
	const accessToken = cookies.get('access_token');

	// Create authenticated client
	const client = createServerJwtClient(fetch, accessToken);

	// Query user
	const result = await client.query(ME_QUERY).toPromise();

	return {
		user: result.data?.me
	};
};
```

**Common Issues:**

```typescript
// Issue: Token not in cookie
// Check: JWT middleware sets cookie with HttpOnly flag
// Check: Browser sends cookie with fetch requests
// Fix: Ensure credentials: 'include' in fetch options

// Issue: Server can't read cookie
// Check: Cookie set with correct path (/)
// Check: Cookie path matches request URL
// Debug: console.log(cookies.getAll())

// Issue: SSR query fails
// Check: GraphQL endpoint accessible from server
// Check: Server can reach backend (network connectivity)
```

---

## Backend Issues

### JWT Middleware Returns 401 on Valid Token

**Symptom:** Middleware rejects token that looks valid.

**Checklist:**

1. **Check token signature:**

   ```rust
   let token_data = decode::<AccessTokenClaims>(
     &token,
     &DecodingKey::from_rsa_pem(&public_key)?,
     &Validation::new(Algorithm::RS256)
   )?;
   ```

   If this fails: token signature invalid or wrong public key.

2. **Verify token not expired:**

   ```rust
   let now = Utc::now().timestamp();
   if claims.exp < now {
     return Err(JwtError::TokenExpired);
   }
   ```

3. **Check token revocation:**

   ```rust
   let user = User::find_by_id(claims.sub).one(db).await?;
   if claims.iat < user.tokens_valid_after.timestamp() {
     return Err(JwtError::TokenRevoked);
   }
   ```

4. **Verify bearer token format:**

   ```rust
   let auth_header = req.headers().get("Authorization")?;
   let bearer_token = auth_header
     .to_str()?
     .strip_prefix("Bearer ")?;
   // Must be exactly "Bearer <token>"
   ```

5. **Check Authorization header:**
   ```bash
   curl -X GET http://localhost:8080/graphql \
     -H "Authorization: Bearer $TOKEN" \
     -v
   # Should show Authorization header in request
   ```

**Common Issues:**

```rust
// Issue: Wrong public key
// Check: Public key matches private key used to sign
// Fix: Regenerate key pair if mismatch

// Issue: Token format wrong
// Example wrong:
// Authorization: $TOKEN (missing "Bearer ")
// Example correct:
// Authorization: Bearer eyJhbGc...

// Issue: Header case sensitive?
// Check: Authorization vs authorization
// Standard is Authorization (capitalized)

// Issue: Token whitespace
// Check: No leading/trailing spaces in token
// Fix: token.trim() when extracting
```

---

### Login Mutation Returns Error

**Symptom:** Login mutation fails or returns error.

**Debug Steps:**

1. **Check error message:**

   ```graphql
   mutation {
   	login(input: { email: "test@example.com", password: "pass" }) {
   		... on AuthError {
   			code
   			message
   		}
   	}
   }
   ```

2. **Check backend logs:**

   ```bash
   docker logs graphql-rust-server
   # Look for error messages
   grep -i "login\|error" logs.txt
   ```

3. **Verify user exists:**

   ```sql
   SELECT id, email, is_active, password_hash
   FROM users
   WHERE email = 'test@example.com';
   ```

4. **Verify password correct:**

   ```rust
   // Backend hashes password and compares
   let valid = bcrypt::verify(&password, &stored_hash)?;
   if !valid {
     return Err("Invalid credentials");
   }
   ```

5. **Check user is active:**
   ```sql
   SELECT is_active FROM users WHERE email = 'test@example.com';
   -- Should be true
   ```

**Common Issues:**

```rust
// Issue: "Invalid credentials"
// Check: Email exists in database
// Check: Password matches (case-sensitive)
// Check: User is active (is_active = true)

// Issue: "User not found"
// Check: Email in correct table (users)
// Check: Database connectivity

// Issue: "Database error"
// Check: Database running
// Check: Connection string correct
// Check: Migrations applied (refresh_tokens table exists)

// Issue: "Token generation failed"
// Check: JWT private key loaded
// Check: JwtConfig initialized
// Check: JWT_PRIVATE_KEY env var set
```

---

### Refresh Token Mutation Fails

**Symptom:** Refresh token mutation returns error.

**Debug Steps:**

1. **Check refresh token in database:**

   ```sql
   SELECT * FROM refresh_tokens
   WHERE user_id = '<user-id>'
   ORDER BY issued_at DESC
   LIMIT 1;
   ```

2. **Verify token not revoked:**

   ```sql
   SELECT is_revoked FROM refresh_tokens
   WHERE id = '<token-id>';
   -- Should be false
   ```

3. **Verify token not expired:**

   ```sql
   SELECT expires_at FROM refresh_tokens
   WHERE id = '<token-id>';
   -- Should be in future
   ```

4. **Check token not used yet:**

   ```sql
   SELECT used_at FROM refresh_tokens
   WHERE id = '<token-id>';
   -- Should be NULL (not used yet)
   ```

5. **Test token validation:**
   ```rust
   let token_data = jwt_service.validate_refresh_token(&token).await?;
   // Should succeed if token valid
   ```

**Common Issues:**

```sql
-- Issue: Token already used (replay attack detected)
-- This is security feature - token is single-use
-- Solution: User must login again to get new token family

-- Issue: Token expired
-- This is normal after 7 days
-- Solution: User must login again

-- Issue: Token revoked
-- Happens after logout or password change
-- Solution: User must login again

-- Issue: Signature invalid
-- Token tampered with or wrong key
-- Solution: Return error, user logs out
```

---

### Replay Attack Detected

**Symptom:** Backend returns "token reused" or "family revoked" error.

**What happened:**

1. Attacker stole refresh token
2. Attacker used token to get new tokens
3. User tried to use original token
4. Backend detected: "already used"
5. Entire token family revoked (security feature)

**User's device behavior:**

- User suddenly logged out
- Next API call fails with 401
- User must login again

**Investigation:**

```sql
-- Find affected token family
SELECT * FROM refresh_tokens
WHERE family_id = '<family-id>'
ORDER BY issued_at DESC;

-- Check if all revoked
SELECT is_revoked FROM refresh_tokens
WHERE family_id = '<family-id>';
-- Should all be true

-- Check audit logs
SELECT * FROM audit_logs
WHERE user_id = '<user-id>'
  AND event_type = 'ReplayAttackDetected'
ORDER BY timestamp DESC;
```

**Response:**

1. **Immediate:**
   - Revoke user's tokens ✅ (automatic)
   - Force user to re-login ✅ (automatic)

2. **Security team:**
   - Review login history for suspicious IPs
   - Check if other users affected
   - Determine attack vector

3. **User notification:**
   - Alert user of potential breach
   - Require password reset
   - Ask about device security

**Prevention:**

See [Security Guide - Replay Attack Detection](03-security-guide.md#replay-attack-detection)

---

## Performance Issues

### Slow Login Response

**Symptom:** Login takes 5+ seconds.

**Bottleneck Analysis:**

```
Network: ~50ms (frontend → backend)
Database (user lookup): ~50-100ms
Password verification (bcrypt): ~100-200ms
JWT signing: ~10-20ms
Database (roles/permissions): ~50-100ms
Return response: ~50ms
Total: ~310-520ms (normal)
```

**If slower than 1 second:**

1. **Check database performance:**

   ```sql
   -- Should be < 50ms
   SELECT * FROM users WHERE email = 'test@example.com';
   EXPLAIN ANALYZE ...
   ```

2. **Check network latency:**

   ```bash
   ping <backend-server>
   # Should be < 50ms
   ```

3. **Check backend load:**

   ```bash
   docker stats graphql-rust-server
   # CPU and memory usage
   ```

4. **Check database load:**

   ```sql
   SHOW PROCESSLIST;
   -- Look for slow queries
   ```

5. **Enable logging:**
   ```rust
   // Log timing
   let start = Instant::now();
   let user = User::find_by_id(user_id).one(db).await?;
   println!("DB query took: {:?}", start.elapsed());
   ```

---

### Token Validation Slow on Every Request

**Symptom:** API requests take longer than before JWT migration.

**Analysis:**

RS256 signature verification is fast (~2ms), but database lookups still needed:

```
Token validation overhead:
├─ Extract token: <1ms
├─ Verify signature: ~2ms
├─ Database query (revocation check): ~5-10ms
└─ Total: ~8-12ms (per request)
```

This is **faster than session auth** (15-20ms), so if slower something else is wrong.

**Debugging:**

1. **Check database performance:**

   ```sql
   SELECT * FROM users WHERE id = '<uuid>';
   -- Should be ~5ms
   ```

2. **Add indexes:**

   ```sql
   CREATE INDEX idx_users_id_tokens_valid_after
   ON users(id, tokens_valid_after);
   ```

3. **Cache user context:**
   ```rust
   // Cache user data for token lifetime
   let cache_key = format!("user_context:{}", claims.sub);
   let cached = redis.get(&cache_key)?;
   if let Some(cached) = cached {
     return Ok(cached);
   }
   ```

---

## Multi-Device Issues

### Logged Out Unexpectedly on Another Device

**Symptom:** Device 1 logs out, Device 2 also logged out.

**Cause:** User logged out from Device 1 (which revokes all tokens).

**This is expected behavior** - logout on one device logs out all devices.

**To logout only current device:**

```rust
// Logout specific device (not implemented yet)
pub async fn logout_device(
  user_id: Uuid,
  device_id: String,
) {
  // Revoke only this device's tokens
  UPDATE refresh_tokens
  SET is_revoked = true
  WHERE user_id = ? AND device_id = ?;
}
```

Currently, logout revokes all devices. To keep other devices logged in, use "Logout from This Device" feature if available.

---

### Login Works on Desktop but Not Mobile

**Symptom:** Desktop can login, mobile can't.

**Possible Causes:**

| Cause                     | Solution                            |
| ------------------------- | ----------------------------------- |
| **Different backend URL** | Check VITE_GRAPHQL_URL env var      |
| **Mixed HTTP/HTTPS**      | Use HTTPS on both                   |
| **Mobile browser cache**  | Clear browser data                  |
| **Different network**     | Try same WiFi as desktop            |
| **Mobile auth disabled**  | Check backend allows mobile clients |

**Debugging Mobile:**

1. **Check browser console on mobile:**
   - Open DevTools (varies by browser)
   - Look for network errors

2. **Test with curl on mobile:**

   ```bash
   # Via SSH or mobile terminal
   curl -X POST https://example.com/graphql \
     -H "Content-Type: application/json" \
     -d '{"query":"mutation Login { ... }"}'
   ```

3. **Check User-Agent:**

   ```rust
   // Backend sees mobile vs desktop
   println!("User-Agent: {}", req.headers().get("User-Agent")?);
   ```

4. **Try incognito mode:**
   - Clears cache and cookies
   - Rules out browser state issues

---

## Common Error Messages

| Error                     | Cause                | Solution                        |
| ------------------------- | -------------------- | ------------------------------- |
| **`INVALID_CREDENTIALS`** | Wrong email/password | Check credentials               |
| **`ACCOUNT_DISABLED`**    | User not active      | Contact admin                   |
| **`TOKEN_EXPIRED`**       | Access token old     | Auto-refresh should trigger     |
| **`UNAUTHENTICATED`**     | No token or invalid  | Login again                     |
| **`FORBIDDEN`**           | Missing permission   | Contact admin for permission    |
| **`TOKEN_REVOKED`**       | Token invalidated    | Login again                     |
| **`REPLAY_ATTACK`**       | Token reused         | Login again, check security     |
| **`NETWORK_ERROR`**       | Can't reach backend  | Check connection, server status |

---

## Contacting Support

### Information to Provide

When reporting authentication issues:

1. **Error message** (exact text)
2. **Steps to reproduce**
3. **Device/OS/Browser** (e.g., Chrome 120 on Windows 10)
4. **Screenshots** (blur sensitive data)
5. **Browser console errors** (F12 → Console tab)
6. **Backend logs** (last 100 lines)
7. **Network logs** (F12 → Network tab, failed requests)

### Internal Support

- **Auth issues:** Contact security@company.com
- **Account problems:** Contact HR
- **API problems:** Contact backend team
- **Bugs:** File issue with details above

### Log Collection

```bash
# Frontend logs (browser console)
F12 → Console → Right-click → Save as...

# Backend logs (Docker)
docker logs graphql-rust-server > backend_logs.txt

# Database logs (PostgreSQL)
SELECT * FROM pg_log ORDER BY timestamp DESC LIMIT 100;
```

---

## Escalation

If issue not resolved:

1. **Verify you've tried all troubleshooting steps above**
2. **Collect relevant logs and error messages**
3. **Contact support team with info**
4. **Include attempt log (what you tried)**
5. **Wait for response (typically < 24 hours)**

## Related Documentation

- **User Guide:** [01-user-guide.md](01-user-guide.md)
- **Developer Guide:** [02-developer-guide.md](02-developer-guide.md)
- **Security Guide:** [03-security-guide.md](03-security-guide.md)
- **Error Handling:** [02-developer-guide.md#error-handling](02-developer-guide.md#error-handling)
