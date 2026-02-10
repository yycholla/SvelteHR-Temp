# JWT Authentication Security Guide

## Executive Summary

SvelteHR implements JWT authentication following industry best practices with:

- ✅ **RS256 (RSA-2048)** asymmetric signing
- ✅ **Token rotation** with single-use refresh tokens
- ✅ **Memory storage** for access tokens (XSS-safe)
- ✅ **HTTP-only cookies** for refresh tokens
- ✅ **Automatic token revocation** on logout
- ✅ **Replay attack detection** via token family tracking
- ✅ **Rate limiting** on login attempts
- ✅ **HTTPS enforcement** in production

## Token Storage

### Access Token (Short-lived, 15 minutes)

**Storage Location:** Browser memory (JavaScript variable)

**Security:**

- ✅ Never persisted to disk
- ✅ Cleared on page refresh
- ✅ Vulnerable to XSS but limited exposure (15 min max)
- ✅ Cannot be stolen via localStorage/sessionStorage vulnerabilities

**Advantages:**

- Survives navigation within same page
- Lost on hard refresh (requires re-login)
- Minimal XSS window (15 minutes)

**Disadvantages:**

- Lost on page refresh (unless refresh token available)
- Vulnerable to XSS attacks (but limited to 15 minutes)

```typescript
// Frontend token storage (memory only)
class JwtAuthStore {
	accessToken = $state<string | null>(null); // Memory only
	refreshTokenData = $state<{ jwt: string; plaintext: string } | null>(null); // For refresh only
}
```

### Refresh Token (Long-lived, 7 days)

**Storage Location:** HTTP-only, Secure, SameSite cookie

**Security:**

- ✅ Backend-managed (frontend can't access via JavaScript)
- ✅ XSS-safe (JavaScript can't read it)
- ✅ CSRF-safe (SameSite=Lax flag)
- ✅ Only sent over HTTPS
- ✅ Rotation on each use (single-use tokens)

**Cookie Flags:**

```
Set-Cookie: refresh_token=<jwt>;
  HttpOnly;           # JavaScript cannot access
  Secure;             # HTTPS only
  SameSite=Lax;       # CSRF protection
  Path=/;             # All routes
  Max-Age=604800;     # 7 days
```

**Implementation:**

```rust
// Backend sets secure cookie
response.set_cookie(
  Cookie::new("refresh_token", token)
    .http_only(true)
    .secure(cfg!(not(debug_assertions)))
    .same_site(SameSite::Lax)
    .path("/")
    .max_age(Duration::days(7))
);
```

## Signature Verification

### RS256 Algorithm

Uses **RSA-2048** asymmetric cryptography:

- **Private Key:** Only on backend, signs tokens
- **Public Key:** Can be shared, verifies tokens
- **Algorithm:** RS256 (SHA-256 + RSA)

### Signature Generation

```rust
// Backend signs token with private key
let token = encode(
  &Header::new(Algorithm::RS256),
  &claims,
  &EncodingKey::from_rsa_pem(private_key)?
)?;
```

### Signature Verification

```rust
// Validate signature with public key
let token_data = decode::<AccessTokenClaims>(
  &token,
  &DecodingKey::from_rsa_pem(public_key)?,
  &Validation::new(Algorithm::RS256)
)?;
```

**Security Properties:**

- ✅ Tampered tokens are rejected
- ✅ Attacker can't forge tokens without private key
- ✅ No shared secret needed for verification
- ✅ Public key can be safely shared

## Token Rotation

### Single-Use Refresh Tokens

Each refresh generates **new access + refresh tokens**:

```
Refresh Token #1 (7 days) ─ USED ONCE ─ gets new tokens
                ↓
        New Refresh Token #2 (7 days) ─ USED ONCE ─ gets new tokens
                ↓
        New Refresh Token #3 (7 days) ─ USED ONCE ─ gets new tokens
```

**Implementation:**

```rust
// Backend tracks token family
pub struct RefreshTokenRecord {
  id: Uuid,
  token_family_id: Uuid,        // Links all tokens in rotation
  token_hash: String,            // Hashed token
  used_at: Option<DateTime>,     // Marked when used
  is_revoked: bool,
}

// On each refresh:
// 1. Validate old token signature
// 2. Check it hasn't been used yet
// 3. If used: REPLAY ATTACK! Revoke entire family
// 4. Mark old token as used
// 5. Issue new token with same family_id
```

### Replay Attack Detection

**Scenario:** Attacker steals refresh token and tries to reuse it

**Detection:**

1. Token used to get new tokens
2. Attacker tries to use same old token
3. Backend checks: "Already marked as used!"
4. Return error and revoke entire family
5. User's tokens invalidated (forced logout)
6. User must re-login

```rust
// Check if token already used
if token_record.used_at.is_some() {
  // Token was already used! Revoke family
  revoke_token_family(token_record.family_id).await?;
  return Err(TokenReplayed);
}
```

## Token Expiration

### Access Token Expiration

**TTL:** 15 minutes (configurable)

**Why short?**

- Limits damage if compromised
- Requires frequent refresh (detects stolen tokens quickly)
- User can't stay logged in without refresh token

**Check Implementation:**

```rust
// Validate expiration
let now = Utc::now().timestamp();
if claims.exp < now {
  return Err(JwtError::TokenExpired);
}
```

### Refresh Token Expiration

**TTL:** 7 days (configurable)

**Why 7 days?**

- Balance between security and convenience
- Automatic refresh happens invisibly (once per 14.5 min)
- Requires explicit re-login after 7 days
- Old tokens automatically invalid

**Expiration Check:**

```rust
// Check in database
if token_record.expires_at < Utc::now() {
  return Err(JwtError::TokenExpired);
}
```

## Token Revocation

### Logout (Immediate Revocation)

When user clicks logout:

```rust
// Revoke all tokens for this user
UPDATE users
SET tokens_valid_after = NOW()
WHERE id = ?;
```

**Effect:**

- All existing tokens invalid
- All devices logged out
- Tokens still technically valid (not expired)
- But `token.iat < user.tokens_valid_after` fails validation

**Validation:**

```rust
// Check revocation
let user = User::find_by_id(token_user_id).one(db).await?;
if token.iat < user.tokens_valid_after.timestamp() {
  return Err(JwtError::TokenRevoked);
}
```

### Batch Revocation (Security Incident)

If private key compromised:

```rust
// Admin triggers emergency revocation
UPDATE users
SET tokens_valid_after = NOW()
WHERE department_id = ? OR organization_id = ?;
```

**Effect:**

- All users in department/org forced to re-login
- Attacker's stolen tokens useless
- New tokens signed with new private key

### Token Family Revocation

If replay attack detected:

```rust
// Revoke entire token family
UPDATE refresh_tokens
SET is_revoked = true
WHERE family_id = ? AND is_revoked = false;
```

**Effect:**

- Attacker can't get new tokens
- User alerted to security incident
- User forced to re-login
- Unusual activity logged for audit

## Vulnerability Prevention

### Cross-Site Scripting (XSS)

**Vulnerability:** Attacker injects JavaScript to steal tokens

**Mitigation:**

1. **Access Token in Memory** ✅
   - Stolen only if XSS executes in your browser
   - Lost on refresh (limited window)
   - Can't be stolen via localStorage vulnerabilities

2. **Refresh Token in HTTP-only Cookie** ✅
   - JavaScript can't read it (XSS-safe)
   - Backend retrieves it automatically
   - Can only be stolen via CSRF (prevented by SameSite)

3. **Content Security Policy (CSP)** 📋
   ```
   Content-Security-Policy:
     default-src 'self';
     script-src 'self';
     style-src 'self' 'unsafe-inline';
   ```

**Remaining Risk:** XSS in trusted code can steal access token (15 min max)

### Cross-Site Request Forgery (CSRF)

**Vulnerability:** Attacker tricks user into making request from attacker's site

**Mitigation:**

1. **SameSite Cookie Flag** ✅

   ```
   Set-Cookie: refresh_token=...; SameSite=Lax
   ```

   - Cookie not sent to cross-site requests
   - Only sent from same-site navigation

2. **Bearer Token Auth** ✅
   - Token in Authorization header (not cookie)
   - CSRF can't add arbitrary headers (same-origin policy)
   - Requires JavaScript to send (not automatic like cookies)

**Result:** CSRF attacks can't use your tokens

### Token Tampering

**Vulnerability:** Attacker modifies token to change claims

**Mitigation:**

1. **Digital Signature** ✅
   - RS256 signature validates token integrity
   - Tampered tokens rejected immediately
   - Signature verified on every request

2. **Signature Algorithm:** RS256 (RSA-2048) ✅
   - Industry standard
   - Secure against known attacks
   - No weaker algorithms used

### Man-in-the-Middle (MITM)

**Vulnerability:** Attacker intercepts tokens in transit

**Mitigation:**

1. **HTTPS Required** ✅
   - Enforced via secure cookie flags
   - TLS 1.2+ encryption
   - Certificate pinning (optional, for critical apps)

2. **HTTP Strict Transport Security (HSTS)** 📋

   ```
   Strict-Transport-Security: max-age=31536000; includeSubDomains
   ```

   - Browser refuses HTTP connections
   - Prevents downgrade attacks

3. **Certificate Validation** ✅
   - Browser validates server certificate
   - Man-in-the-middle can't intercept HTTPS

### Token Theft/Compromise

**Vulnerability:** Attacker gains access to token (via MITM, XSS, or stolen device)

**Mitigation:**

1. **Short Token Lifetime** ✅
   - Access token: 15 minutes
   - Stolen token has limited window
   - Auto-refresh detects theft quickly

2. **Token Rotation** ✅
   - Each refresh generates new tokens
   - Old tokens become invalid
   - Stolen token can't be used twice

3. **Revocation on Logout** ✅
   - User logout revokes all tokens
   - Removes stolen tokens from circulation
   - Can logout from specific device

4. **Rate Limiting** ✅
   - Limits login attempts
   - Prevents brute force attacks
   - Slows down automated attacks

## Rate Limiting

### Login Rate Limiting

Prevents brute force attacks:

```rust
// Pseudo-code: Rate limit per IP
let login_attempts = cache.get(&ip_address).unwrap_or(0);

if login_attempts > 5 {
  return Err("Too many login attempts. Try again in 15 minutes");
}

login_attempts += 1;
cache.set(&ip_address, login_attempts, Duration::minutes(15));

// Verify credentials...
```

**Configuration:**

- Max 5 attempts per IP
- 15-minute lockout
- Logged for audit trail

### Token Refresh Rate Limiting

Prevents refresh attack amplification:

```rust
// Token refresh limited to once per minute per user
let last_refresh = user.last_token_refresh;
if Utc::now() - last_refresh < Duration::minutes(1) {
  return Err("Refresh too frequent");
}
```

## Password Security

### Password Storage

**Algorithm:** Bcrypt (recommended)

```rust
use bcrypt::{hash, verify, DEFAULT_COST};

// Hash password on registration
let password_hash = hash(password, DEFAULT_COST)?;

// Verify on login
let valid = verify(password, &password_hash)?;
```

**Security:**

- ✅ One-way hashing (can't decrypt)
- ✅ Salted (prevents rainbow tables)
- ✅ Slow (prevents brute force)
- ✅ Adaptive (cost can increase over time)

### Password Requirements

Enforce during registration:

- Minimum 12 characters
- Mix of uppercase, lowercase, numbers
- At least one special character
- No common passwords (dictionary check)

### Password Reset

Implement secure flow:

1. User requests password reset
2. Backend generates token (short-lived, single-use)
3. Send reset link to email
4. User sets new password
5. Invalidate all tokens (force re-login)

```rust
// Reset token
pub struct PasswordResetToken {
  user_id: Uuid,
  token_hash: String,        // Hash of random token
  expires_at: DateTime,
  used_at: Option<DateTime>, // Prevent reuse
}

// Validation
if token_record.used_at.is_some() {
  return Err("Token already used");
}
if token_record.expires_at < Utc::now() {
  return Err("Token expired");
}
```

## Device Security

### Device Registration

Track devices for security:

```rust
pub struct Device {
  user_id: Uuid,
  device_id: String,
  device_name: String,       // "Chrome on Windows 10"
  last_active_at: DateTime,
  ip_address: String,
  user_agent: String,
}
```

### Suspicious Device Detection

Alert on unusual activity:

1. **New location:** Device from new country
2. **New device:** Unknown device type
3. **Rapid-fire logins:** Multiple IPs in short time
4. **Failed attempts:** Multiple failed logins

```rust
// Detect suspicious login
let last_login_location = user.last_login_ip;
let current_location = geoip.lookup(request.ip);

if is_geographically_impossible(last_login_location, current_location) {
  // Require additional verification (2FA)
}
```

### Logout from Other Devices

Allow user to revoke specific device tokens:

```rust
// User clicks "Logout from all other devices"
UPDATE refresh_tokens
SET is_revoked = true
WHERE user_id = ? AND device_id != ?;
```

## Audit Logging

### Log Events

Track security-relevant events:

```rust
pub enum AuditEvent {
  UserLogin { user_id: Uuid, ip: String, device: String },
  UserLogout { user_id: Uuid, ip: String },
  TokenRefresh { user_id: Uuid, ip: String },
  FailedLogin { email: String, ip: String, reason: String },
  SuspiciousActivity { user_id: Uuid, event: String },
  PermissionChanged { user_id: Uuid, old: Vec<String>, new: Vec<String> },
  PasswordChanged { user_id: Uuid, ip: String },
  ReplayAttackDetected { user_id: Uuid, token_family: Uuid },
}

// Log to database
pub async fn log_audit_event(db: &Database, event: AuditEvent) {
  audit_log::ActiveModel {
    user_id: Set(event.user_id),
    event_type: Set(event.event_type()),
    details: Set(serde_json::to_string(&event)?),
    ip_address: Set(event.ip()),
    timestamp: Set(Utc::now().naive_utc()),
    ..Default::default()
  }
  .insert(db)
  .await?;
}
```

### Audit Trail Queries

For incident response:

```sql
-- Find all logins for user in last 24 hours
SELECT * FROM audit_logs
WHERE user_id = ? AND event_type = 'UserLogin'
AND timestamp > NOW() - INTERVAL 24 HOUR;

-- Find failed login attempts
SELECT * FROM audit_logs
WHERE event_type = 'FailedLogin'
AND timestamp > NOW() - INTERVAL 1 HOUR;

-- Find replay attacks
SELECT * FROM audit_logs
WHERE event_type = 'ReplayAttackDetected';
```

## Secret Management

### Private Key Security

**Development:**

- Generate locally, never share
- Store in `.env` (git-ignored)
- Each developer uses own keys

**Production:**

- Store in AWS Secrets Manager
- Rotate every 90 days
- Restrict IAM access
- Audit all access

See [JWT Secrets Management](../security/jwt-secrets-management.md) for details.

## Compliance

### GDPR

**Right to be forgotten:**

- User requests deletion
- Revoke all tokens immediately
- User can't re-authenticate
- Clean personal data from audit logs

```rust
// On user deletion
pub async fn delete_user(user_id: Uuid, db: &Database) {
  // 1. Revoke all tokens
  jwt_service.revoke_user_tokens(user_id).await?;

  // 2. Delete user record
  User::delete_by_id(user_id).exec(db).await?;

  // 3. Clean audit logs
  AuditLog::delete()
    .filter(audit_log::Column::UserId.eq(user_id))
    .exec(db)
    .await?;
}
```

### SOC 2

**Security criteria:**

- ✅ Access controls enforced (JWT verification)
- ✅ Encryption in transit (HTTPS)
- ✅ Audit logging enabled
- ✅ Incident response plan

### PCI DSS

**Payment security:**

- ✅ Strong cryptography (RS256)
- ✅ Secure key management (Secrets Manager)
- ✅ Access controls (RBAC)
- ✅ Audit logging

## Incident Response

### Token Compromise

**If user's token is compromised:**

1. **Immediate:**
   - Revoke user's refresh tokens
   - User logged out automatically
   - Force re-login required

2. **Investigate:**
   - Check audit logs for suspicious activity
   - Determine if other users affected
   - Identify compromise vector

3. **Response:**
   - Reset user's password
   - Require 2FA (if available)
   - Notify user of compromise

### Private Key Compromise

**If private key is exposed:**

1. **Immediate:**
   - Revoke all tokens: `UPDATE users SET tokens_valid_after = NOW()`
   - Generate new key pair
   - Deploy new keys

2. **Investigate:**
   - Determine how key was exposed
   - Check for token forgery in logs
   - Identify attackers

3. **Recovery:**
   - All users forced to re-login
   - Implement dual-key support (new + old key for 7 days)
   - Grace period for legitimate tokens to refresh
   - Remove old key after grace period

### Replay Attack Detected

**If token replay detected:**

1. **Automatic:**
   - Revoke entire token family
   - User logged out
   - Attempt to refresh triggers error

2. **Investigation:**
   - User alerted of compromise
   - Audit log examined
   - Device revoked if necessary

3. **Recovery:**
   - User must re-login
   - Force password change
   - Enable additional security

## Best Practices Summary

**Do:**

- ✅ Use HTTPS in production
- ✅ Validate tokens on every request
- ✅ Rotate tokens regularly
- ✅ Log security events
- ✅ Implement rate limiting
- ✅ Monitor for suspicious activity
- ✅ Keep dependencies updated
- ✅ Regular security audits

**Don't:**

- ❌ Store tokens in localStorage
- ❌ Log tokens in error messages
- ❌ Use weak password hashing
- ❌ Share private keys
- ❌ Disable HTTPS
- ❌ Commit secrets to git
- ❌ Ignore security warnings
- ❌ Skip token validation

## Security Checklist

- [ ] HTTPS enforced in production
- [ ] JWT private key secured
- [ ] Tokens signed with RS256
- [ ] Access token TTL < 1 hour
- [ ] Refresh token rotation enabled
- [ ] Replay attack detection working
- [ ] Rate limiting configured
- [ ] Audit logging enabled
- [ ] Password hashing with bcrypt
- [ ] Account lockout on failed attempts
- [ ] Session audit trail available
- [ ] Incident response plan documented

## References

- [OWASP JWT Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [RFC 7519 - JSON Web Token](https://tools.ietf.org/html/rfc7519)
- [RFC 7518 - JSON Web Algorithms](https://tools.ietf.org/html/rfc7518)
- [NIST Password Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)
- [Secure Cookie Attributes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie)

## Related Documentation

- **User Guide:** [01-user-guide.md](01-user-guide.md)
- **Developer Guide:** [02-developer-guide.md](02-developer-guide.md)
- **Migration Guide:** [04-migration-guide.md](04-migration-guide.md)
- **Secrets Management:** `docs/security/jwt-secrets-management.md`
