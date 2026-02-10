# JWT Authentication User Guide

## What is JWT?

**JWT (JSON Web Token)** is a secure way to identify yourself to the application. Instead of the server keeping track of your session, a JWT token acts like an encrypted ID card that you carry with you.

### Key Benefits

- ✅ **Secure:** Digitally signed to prevent tampering
- ✅ **Stateless:** No server-side session storage needed
- ✅ **Efficient:** Works well across distributed systems
- ✅ **User-Friendly:** Automatic token refresh means fewer re-logins

## Getting Started - Login

### Logging In

1. Navigate to the login page (`/auth/login`)
2. Enter your **email** and **password**
3. Click **Login**

### What Happens Behind the Scenes

```
You enter credentials
     ↓
Application sends to backend
     ↓
Backend verifies email & password
     ↓
Backend generates JWT token
     ↓
You receive token + session restored
     ↓
You're logged in! ✅
```

### Login Form UI

```svelte
<LoginForm />
```

**Fields:**

- Email: Your company email address
- Password: Your secure password

**Options:**

- No "Remember Me" checkbox (JWT handles this automatically)
- Password recovery link (if enabled)

**Error Messages:**

- "Invalid email or password" - Check credentials and try again
- "Account is disabled" - Contact HR administrator
- "Too many login attempts" - Try again later (rate limiting)

## JWT Tokens Explained

### Access Token

Your primary authentication credential:

- **What it is:** Encrypted proof of your identity
- **Stored:** In browser memory (secure)
- **Valid for:** 15 minutes (by default)
- **Use case:** Included with every API request

**Example Flow:**

```
Access token issued at 10:00 AM
     ↓
Valid until 10:15 AM
     ↓
At 10:14 AM, token auto-refreshes (1 min before expiry)
     ↓
New token valid until 10:29 AM
     ↓
Process repeats automatically
```

### Refresh Token

Allows you to get a new access token without re-entering password:

- **What it is:** Long-lived credential for token renewal
- **Stored:** In HTTP-only cookie (backend-managed, you can't see it)
- **Valid for:** 7 days (by default)
- **Use case:** Automatically used in background to refresh access token

**Example Flow:**

```
Login at 10:00 AM
     ↓
Receive access token (15 min) + refresh token (7 days)
     ↓
At 10:14 AM: Auto-refresh using refresh token
     ↓
New access token issued (valid 15 more minutes)
     ↓
At 10:29 AM: Auto-refresh again
     ↓
After 7 days: Refresh token expires
     ↓
You must login again
```

## Token Lifecycle

### Automatic Token Refresh

You **never see** token refresh in the UI:

1. Application tracks access token expiry
2. **1 minute before expiry**, background refresh starts
3. Old token replaced with new one automatically
4. You stay logged in seamlessly

### No Page Refresh Needed

Even if your access token expires:

1. You're still using the app
2. Next API call detects expired token
3. Refresh happens automatically
4. Your request retries automatically
5. You see the results (you didn't notice anything!)

### What If Refresh Token Expires?

After **7 days** without logging out:

1. Refresh token becomes invalid
2. Access token becomes invalid too
3. You're logged out automatically
4. Redirect to login page
5. You must re-login with email & password

## Session Management

### Session Restoration

When you reload the page:

1. Application checks for valid refresh token (in cookie)
2. Automatically requests new access token
3. If successful, you're logged back in instantly
4. No need to enter credentials again

### Session Duration

**How long can you stay logged in?**

- **Without activity:** Up to 7 days (refresh token valid)
- **With activity:** Infinite (tokens refresh automatically)
- **After browser close:** Token remembered in cookie, you stay logged in on next visit

**Example:**

```
Monday 9 AM: Login with email & password
     ↓
Monday 5 PM: Close browser (still logged in on cookie)
     ↓
Tuesday 9 AM: Open browser, app auto-restores session
     ↓
You're logged in without entering password! ✅
     ↓
Friday 5 PM: Still logged in (auto-refresh running)
     ↓
Monday 5 PM: Refresh token expired (7 days old)
     ↓
You're logged out, must re-login ❌
```

## Logout

### Logging Out

1. Click **Profile** menu → **Logout**
2. Application sends logout request to backend
3. Server revokes all your tokens
4. Redirect to login page
5. You're logged out

### What Gets Cleared?

- ✅ Access token in memory (cleared)
- ✅ Refresh token in cookie (cleared)
- ✅ User info in application (cleared)
- ✅ All sessions on other devices (revoked)

### Logout on Other Devices

If you logout, **all your sessions everywhere are terminated:**

```
Device 1: Click Logout
     ↓
Backend revokes tokens for all sessions
     ↓
Device 2: Next API call fails with "Unauthenticated"
     ↓
Device 2: Automatically logged out
     ↓
Device 3: Next API call fails with "Unauthenticated"
     ↓
Device 3: Automatically logged out
```

## Security & Privacy

### Your Tokens Are Secure Because

1. **Access token stored in memory only**
   - Can't be stolen via XSS (not on disk)
   - Lost on page refresh (you must login again)
   - Never stored in localStorage/cookies

2. **Refresh token in HTTP-only cookie**
   - JavaScript can't access it (XSS-safe)
   - Only sent to your company's backend
   - Encrypted and signed by server

3. **Tokens are digitally signed**
   - Tampered tokens are rejected
   - Server validates signature on every request
   - Invalid signature = unauthorized

4. **Token rotation**
   - Each refresh generates brand new tokens
   - Old tokens become invalid immediately
   - Prevents replay attacks

### Best Practices

**Do:**

- ✅ Use HTTPS/secure connection (required in production)
- ✅ Keep credentials private
- ✅ Logout when using shared computers
- ✅ Report suspicious activity to IT

**Don't:**

- ❌ Share your password with anyone
- ❌ Commit tokens to version control
- ❌ Paste tokens in chat/email
- ❌ Use the app on untrusted networks (public WiFi)

## Troubleshooting

### "You are logged out" - Unexpected Logout

**Possible causes:**

1. Refresh token expired (7 days old)
2. Admin revoked your tokens
3. Your password was changed
4. Session cleared on another device with force logout

**Solutions:**

- Login again with email & password
- Contact HR if you believe this is an error

### "Page keeps refreshing" / "Infinite redirect"

**Possible causes:**

1. Login failed but token partially saved
2. Browser cache corrupted
3. Server communication issue

**Solutions:**

1. Clear browser cache:
   - Chrome: Ctrl+Shift+Delete (or Cmd+Shift+Delete on Mac)
   - Firefox: Ctrl+Shift+Delete
   - Select "Cookies and cached images"
2. Close all browser tabs
3. Close browser completely
4. Reopen and try login again

### "Authentication error" on specific action

**Possible causes:**

1. Your token expired between requests
2. Your role/permissions changed (admin update)
3. Your account was disabled

**Solutions:**

- Wait a few seconds and try again
- Logout and login again
- Contact HR if permission error persists

### "Session restored but showing old data"

**Possible causes:**

1. Browser cache showing old data
2. Application state not updated after restore

**Solutions:**

- Press Ctrl+Shift+R (hard refresh with cache clear)
- Close browser completely and reopen
- Clear browser cache and cookies

## Permissions & Roles

### What are Roles?

A role is a group of permissions that define what you can do:

- **Employee:** Basic access (view own data)
- **Manager:** Additional access (view team)
- **HR Manager:** Full HR access
- **Admin:** Complete system access

### What are Permissions?

Specific actions you're allowed to perform:

- `employees:read` - View employee data
- `employees:edit` - Edit employee information
- `employees:delete` - Delete employee records
- `departments:manage` - Manage departments

### Checking Your Permissions

1. Click your **Profile**
2. View your **Role** and **Permissions**
3. Permissions determine what you can see/do in the app

**Example:**

```
Your Role: Manager
Your Permissions:
  - employees:read
  - employees:edit
  - departments:read

You CAN:
  ✅ View all employees
  ✅ Edit employee names, emails

You CAN'T:
  ❌ Delete employees (needs employees:delete)
  ❌ Edit departments (needs departments:edit)
```

## Multi-Device Login

You can be logged in on **multiple devices at the same time**:

- Desktop computer
- Laptop
- Tablet
- Phone

### Device Tracking

The app tracks your login devices:

1. **Device name:** Browser type and OS
2. **Last activity:** When you last used this device
3. **IP address:** Where you logged in from (for security audit)

### Managing Sessions

**View your active sessions:**

1. Go to **Profile → Security → Active Sessions**
2. See all devices you're logged into
3. Click **Logout** on any device to revoke that session

## Performance & Data

### Token Size

JWTs are small and efficient:

- Access token: ~500 bytes
- Included in every API request
- Minimal overhead (< 1KB per request)

### Offline Access

**Can you work without internet?**

No, tokens require server validation:

- Every request must validate your JWT
- Token validation requires server connection
- Offline work not supported

### Token Expiry

**Why does your token expire?**

1. **Security:** Limits damage if token compromised
2. **Freshness:** Ensures permissions stay current
3. **Performance:** Server can revoke old tokens

**Can you extend token lifetime?**

- Contact IT to adjust settings (requires admin)
- Default: 15 minutes access, 7 days refresh

## FAQ

**Q: Why do I have to login if I close my browser?**
A: You don't! If your refresh token is valid, you stay logged in on the next visit (via cookie).

**Q: Can I stay logged in forever?**
A: No. Refresh token expires after 7 days. You must login at least once per week.

**Q: What happens to my JWT when I close my browser?**
A: Your access token (in memory) is cleared. But your refresh token (in cookie) remains, so you auto-login next visit.

**Q: Is it safe to be logged in on multiple devices?**
A: Yes! Each device has its own tokens. Logging out on one device doesn't affect others.

**Q: Can I use the same JWT on multiple websites?**
A: No! JWTs are signed specifically for this application. Other sites can't use your tokens.

**Q: What if someone hacks my token?**
A: Access tokens are short-lived (15 min). Refresh tokens can be revoked. Report suspicious activity immediately.

**Q: Why is my token invalid?**
A: Most common reasons:

- Token expired (15+ minutes old)
- Token revoked (you logged out elsewhere)
- Token tampered with (invalid signature)
- Browser time is very wrong (sync system time)

**Q: Can I see my JWT?**
A: Technical users can view it in browser DevTools, but you shouldn't share it with anyone.

## Related

- **For Developers:** See [Developer Guide](02-developer-guide.md)
- **Security Details:** See [Security Guide](03-security-guide.md)
- **Migration Notes:** See [Migration Guide](04-migration-guide.md)
