# Session-Based Authentication Guide

**Migration Status**: ✅ Complete (2025-10-16)
**Branch**: `036-svelte-kit-session`
**Architecture**: SvelteKit + axum-login (Rust backend)

## 📋 Overview

SvelteHR has fully migrated from JWT token-based authentication to session-based authentication using HTTP-only cookies. This migration enhances security by eliminating client-side token storage and simplifies the authentication flow.

## 🔒 Security Benefits

### Before (JWT-based)

- ❌ JWT tokens stored in localStorage (XSS vulnerable)
- ❌ Client-side token parsing and validation
- ❌ Complex token refresh logic
- ❌ Manual Authorization headers
- ❌ Token exposure in client JavaScript

### After (Session-based)

- ✅ HTTP-only session cookies (XSS immune)
- ✅ Server-side session validation only
- ✅ Automatic cookie management by browser
- ✅ Simpler authentication flow
- ✅ No client-side token storage

## 🏗️ Architecture

### Authentication Flow

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Browser   │────────>│  SvelteKit   │────────>│ Rust Backend│
│             │         │ hooks.server │         │ (axum-login)│
└─────────────┘         └──────────────┘         └─────────────┘
      │                        │                         │
      │  1. POST /api/auth/login (credentials)         │
      │──────────────────────────────────────────────>│
      │                        │                         │
      │  2. Set-Cookie: session_id (HTTP-only)         │
      │<───────────────────────────────────────────────│
      │                        │                         │
      │  3. GET /dashboard (with session cookie)       │
      │──────────────────────>│                         │
      │                        │                         │
      │                        │  4. GET /auth/me       │
      │                        │──────────────────────>│
      │                        │                         │
      │                        │  5. User data          │
      │                        │<───────────────────────│
      │                        │                         │
      │  6. Rendered page with user context            │
      │<───────────────────────│                         │
```

### Key Components

1. **Browser**: Stores HTTP-only session cookie automatically
2. **SvelteKit hooks.server.ts**: Validates session on every request
3. **Rust Backend (axum-login)**: Manages sessions in PostgreSQL
4. **PostgreSQL**: Stores session data securely

## 🚀 Authentication Endpoints

### Login

```typescript
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "employee",
    "displayName": "John Doe"
  },
  "sessionExpires": "2025-10-17T12:00:00Z"
}

Cookies Set:
- hr_token: [session_id] (HTTP-only, Secure, SameSite=Lax)
```

### Logout

```typescript
POST /api/auth/logout
Cookie: hr_token=[session_id]

Response:
{
  "success": true,
  "message": "Logout successful"
}

Cookies Cleared:
- hr_token (deleted)
```

### Session Verification

```typescript
GET /api/auth/verify
Cookie: hr_token=[session_id]

Response:
{
  "valid": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "employee"
  },
  "permissions": ["view_users", "update_profile"],
  "sessionExpires": "2025-10-17T12:00:00Z"
}
```

## 💻 Implementation Details

### Server-Side Session Validation

**hooks.server.ts** validates every request:

```typescript
// src/hooks.server.ts
export const handle: Handle = async ({ event, resolve }) => {
	// Skip auth for public routes
	if (isPublicRoute(event.url.pathname)) {
		return resolve(event);
	}

	// Get session cookie
	const sessionCookie = event.cookies.get('hr_token') || event.cookies.get('auth-token');

	if (sessionCookie) {
		try {
			// Validate session with Rust backend
			const response = await fetch(`${backendUrl}/auth/me`, {
				headers: {
					Cookie: `hr_token=${sessionCookie}`
				}
			});

			if (response.ok) {
				const userData = await response.json();

				// Populate locals with user data
				event.locals.user = userData.user;
				event.locals.permissions = userData.permissions || [];
				event.locals.roles = userData.roles || [];
			}
		} catch (error) {
			console.error('Session validation failed:', error);
		}
	}

	// Redirect to login if not authenticated
	if (!event.locals.user) {
		throw redirect(303, `/login?redirectTo=${encodeURIComponent(event.url.pathname)}`);
	}

	return resolve(event);
};
```

### Protected Route Pattern

**+page.server.ts** for protected pages:

```typescript
// src/routes/dashboard/+page.server.ts
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	// Verify user is authenticated via session
	if (!locals.user?.id) {
		throw error(401, 'Authentication required');
	}

	// User is authenticated - locals.user populated by hooks.server.ts
	return {
		user: {
			id: locals.user.id,
			email: locals.user.email,
			role: locals.user.role,
			displayName: locals.user.display_name
		},
		permissions: locals.permissions || []
	};
};
```

### User Context Extraction

**src/lib/auth/context.ts** provides utilities:

```typescript
import type { RequestEvent } from '@sveltejs/kit';

export function extractUserContext(event: RequestEvent) {
	const user = event.locals.user;

	if (!user) {
		return null;
	}

	return {
		user_id: user.id,
		email: user.email,
		role: user.role || 'employee',
		display_name: user.display_name,
		permissions: event.locals.permissions || []
	};
}

export function requireAuth(event: RequestEvent, redirectPath = '/login') {
	if (!event.locals.user) {
		const { redirect } = await import('@sveltejs/kit');
		const returnUrl = encodeURIComponent(event.url.pathname + event.url.search);
		throw redirect(303, `${redirectPath}?redirectTo=${returnUrl}`);
	}
}

export function hasPermission(event: RequestEvent, permission: string): boolean {
	const permissions = event.locals.permissions || [];
	return permissions.includes('*') || permissions.includes(permission);
}
```

## 🔧 Client-Side Usage

### Authentication Store

```typescript
// src/lib/stores/auth.ts
import { writable } from 'svelte/store';

export const authStore = {
	...writable({ isAuthenticated: false, user: null }),

	login: async (email: string, password: string) => {
		const response = await fetch('/api/auth/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password }),
			credentials: 'include' // Include session cookies
		});

		if (response.ok) {
			const data = await response.json();
			// Session cookie set automatically by browser
			return { success: true, user: data.user };
		}

		return { success: false, error: 'Login failed' };
	},

	logout: async () => {
		await fetch('/api/auth/logout', {
			method: 'POST',
			credentials: 'include'
		});

		// Session cookie cleared automatically
		authStore.set({ isAuthenticated: false, user: null });
	}
};
```

### Component Usage

```svelte
<script lang="ts">
  import { authStore } from '$lib/stores/auth';

  let email = '';
  let password = '';

  async function handleLogin() {
    const result = await authStore.login(email, password);

    if (result.success) {
      // Session established - redirect to dashboard
      window.location.href = '/dashboard';
    } else {
      alert('Login failed');
    }
  }
</script>

<form on:submit|preventDefault={handleLogin}>
  <input type="email" bind:value={email} required />
  <input type="password" bind:value={password} required />
  <button type="submit">Login</button>
</form>
```

## 🛡️ Security Configuration

### Cookie Settings

```typescript
// Backend (Rust/axum-login) sets cookies with:
{
  httpOnly: true,      // Prevents JavaScript access (XSS protection)
  secure: true,        // HTTPS only in production
  sameSite: 'lax',     // CSRF protection
  maxAge: 86400,       // 24 hours
  path: '/',           // Available to all routes
  domain: undefined    // Current domain only
}
```

### Session Storage

- **Backend**: PostgreSQL table stores session data
- **Session ID**: Cryptographically random identifier
- **Expiration**: 24-hour sliding window (extends on activity)
- **Invalidation**: Server-side logout clears session immediately

## 📊 Performance Considerations

### Session Validation Caching

The backend uses in-memory caching for session validation:

```
Request 1: Validate session (database query ~10ms)
Request 2-10: Use cached session (memory lookup ~1ms)
Request 11: Re-validate if > 60 seconds old
```

### Connection Pooling

- PostgreSQL connection pool (10 connections)
- Redis session cache (optional, for scale)
- Session validation < 5ms average

## 🔄 Migration from JWT

### What Changed

1. **Removed JWT Files**:
   - `src/lib/auth/jwt-utils.ts` (deprecated with notice)
   - `src/lib/auth/migration.ts` (deprecated - only cleanup utility remains)
   - `src/routes/api/test-auth/+server.ts` (deprecated)

2. **Updated Services**:
   - `src/lib/auth/secure-auth-service.ts` - Session-based methods
   - `src/lib/services/authService.ts` - Session-based methods
   - `src/lib/stores/auth.ts` - Removed JWT refresh logic

3. **API Routes Updated**:
   - `src/routes/api/notifications/*` - Session-based auth only
   - All notification endpoints now use `event.locals.user`

4. **Dependencies Removed**:
   - `@urql/exchange-auth` (JWT auth exchange)

### Legacy Token Cleanup

If users have old JWT tokens:

```typescript
// Automatically cleared on logout
import { cleanupLegacyJWTTokens } from '$lib/auth/migration';

cleanupLegacyJWTTokens(); // Removes old localStorage tokens
```

## 🧪 Testing

### Manual Testing

```bash
# 1. Login
curl -X POST http://localhost:5173/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}' \
  -c cookies.txt

# 2. Access protected endpoint
curl http://localhost:5173/dashboard \
  -b cookies.txt

# 3. Logout
curl -X POST http://localhost:5173/api/auth/logout \
  -b cookies.txt
```

### Automated Tests

```typescript
// tests/auth.test.ts
import { expect, test } from '@playwright/test';

test('session authentication flow', async ({ page, context }) => {
	// Login
	await page.goto('/login');
	await page.fill('input[name="email"]', 'test@example.com');
	await page.fill('input[name="password"]', 'password123');
	await page.click('button[type="submit"]');

	// Verify session cookie set
	const cookies = await context.cookies();
	const sessionCookie = cookies.find((c) => c.name === 'hr_token');
	expect(sessionCookie).toBeDefined();
	expect(sessionCookie.httpOnly).toBe(true);

	// Access protected page
	await page.goto('/dashboard');
	await expect(page).toHaveURL('/dashboard');

	// Logout
	await page.click('button:has-text("Logout")');
	await expect(page).toHaveURL('/login');

	// Session cookie cleared
	const cookiesAfterLogout = await context.cookies();
	const sessionCookieAfter = cookiesAfterLogout.find((c) => c.name === 'hr_token');
	expect(sessionCookieAfter).toBeUndefined();
});
```

## 🐛 Troubleshooting

### Session Not Persisting

**Problem**: User logged out on page refresh

**Solutions**:

1. Check cookie domain matches current domain
2. Verify `credentials: 'include'` in fetch calls
3. Check browser allows third-party cookies
4. Verify backend sets `Set-Cookie` header correctly

### CORS Issues

**Problem**: Session cookies not sent cross-origin

**Solution**: Configure CORS in backend:

```rust
// Rust backend CORS configuration
let cors = CorsLayer::new()
    .allow_origin("http://localhost:5173".parse::<HeaderValue>()?)
    .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
    .allow_credentials(true) // CRITICAL for cookies
    .allow_headers([CONTENT_TYPE, AUTHORIZATION, COOKIE]);
```

### Session Expiry Too Soon

**Problem**: Users logged out too frequently

**Solution**: Adjust session timeout in backend:

```rust
// Increase session timeout to 7 days
let session_layer = SessionManagerLayer::new(session_store)
    .with_expiry(Expiry::OnInactivity(Duration::days(7)));
```

## 📚 Additional Resources

- **Specification**: `/specs/036-svelte-kit-session/spec.md`
- **Implementation Plan**: `/specs/036-svelte-kit-session/plan.md`
- **Tasks**: `/specs/036-svelte-kit-session/tasks.md`
- **Research**: `/specs/036-svelte-kit-session/research.md`
- **axum-login Docs**: https://docs.rs/axum-login/

## 🎯 Best Practices

1. **Always use `credentials: 'include'`** in fetch calls
2. **Never store session data client-side** (browser handles cookies)
3. **Check `event.locals.user`** for authentication in load functions
4. **Use `requireAuth()` helper** for consistent auth checks
5. **Log out server-side** to invalidate sessions properly
6. **Test with cookies enabled** in browser
7. **Use HTTPS in production** for secure cookies

## ✅ Migration Checklist

If migrating from JWT to sessions:

- [x] Update hooks.server.ts for session validation
- [x] Remove JWT token storage from client code
- [x] Update API routes to use event.locals.user
- [x] Remove Authorization headers from GraphQL client
- [x] Deprecate JWT utility files
- [x] Update authentication store to session-based
- [x] Remove JWT dependencies from package.json
- [x] Test login/logout flow with session cookies
- [x] Verify protected routes work with sessions
- [x] Update documentation

---

**Last Updated**: 2025-10-16
**Migration Branch**: `036-svelte-kit-session`
**Status**: ✅ Production Ready
