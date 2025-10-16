# Quick Start: SvelteKit Session Authentication Migration

## Overview

This guide provides a quick start for implementing session-based authentication in SvelteKit, migrating from JWT token-based auth to secure server-side sessions using axum-login.

## Prerequisites

- SvelteKit application with existing JWT authentication
- Rust backend with axum-login configured
- PostgreSQL database for session storage
- Basic understanding of HTTP cookies and server-side sessions

## Key Changes Summary

### Before (JWT-based)

- Client stores JWT tokens in localStorage
- Authorization: `Bearer ${token}` headers on all requests
- Client-side token validation and refresh
- Security vulnerabilities from client-side token storage

### After (Session-based)

- Server manages sessions with HTTP-only cookies
- No Authorization headers needed
- Automatic session validation server-side
- Enhanced security with proper session management

## Implementation Steps

### 1. Backend Session Setup

Ensure axum-login is properly configured:

```rust
// In your axum main.rs
use axum_login::{AuthManagerLayer, AuthSession, MemoryStore};
use tower_sessions::SessionManagerLayer;

let session_store = MemoryStore::default();
let auth_layer = AuthManagerLayerBuilder::new(backend, session_layer)
    .with_secure(true)  // HTTPS in production
    .build();

let app = Router::new()
    .route("/api/auth/login", post(login_handler))
    .route("/api/auth/logout", post(logout_handler))
    .layer(auth_layer);
```

### 2. Frontend Authentication Removal

Remove JWT-related code from client:

```typescript
// Remove from stores/auth.ts
- localStorage.getItem('auth-token')
- Authorization headers in GraphQL requests
- JWT parsing and validation logic
- Token refresh intervals
```

### 3. Server Hook Updates

Update `src/hooks.server.ts` for session validation:

```typescript
// Before: JWT parsing
const token = event.cookies.get('primaryTokenName');
const authResult = await authenticateUser(token);

// After: Session validation (handled by axum-login)
// User context available in event.locals.user
export async function handle({ event, resolve }) {
	// Session validation happens automatically
	// User data available via event.locals.user
	return resolve(event);
}
```

### 4. Load Function Updates

Update page load functions to use session data:

```typescript
// +page.server.ts
export async function load({ locals }) {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	return {
		user: locals.user
		// Other page data
	};
}
```

### 5. Component Updates

Update components to use session-based auth state:

```svelte
<script>
	import { page } from '$app/stores';

	$: user = $page.data.user;
	$: isAuthenticated = !!user;
</script>

{#if isAuthenticated}
	<p>Welcome, {user.username}!</p>
	<button on:click={logout}>Logout</button>
{:else}
	<a href="/login">Login</a>
{/if}
```

## Migration Checklist

### Backend Changes

- [ ] axum-login properly configured
- [ ] Session storage (database/Redis) set up
- [ ] Authentication endpoints working
- [ ] Session cleanup configured

### Frontend Changes

- [ ] JWT token storage removed
- [ ] Authorization headers removed from GraphQL
- [ ] Server hooks updated for session validation
- [ ] Load functions use `locals.user`
- [ ] Components use `$page.data.user`

### Testing

- [ ] Login creates session cookie
- [ ] Protected pages require authentication
- [ ] Logout clears session
- [ ] Session expires properly
- [ ] Multiple tabs synchronize

## Common Issues & Solutions

### Issue: Sessions not persisting

**Solution**: Ensure session store is properly configured and database connections are working.

### Issue: Components not updating on auth changes

**Solution**: Use `$page.data.user` instead of local stores for server-provided user data.

### Issue: GraphQL requests failing

**Solution**: Remove Authorization headers - cookies are sent automatically.

### Issue: Session expiration not handled

**Solution**: Implement proper error boundaries and redirect to login on 401 responses.

## Security Benefits

1. **No client-side token storage** - Eliminates XSS vulnerabilities
2. **HTTP-only cookies** - Prevents JavaScript access to session data
3. **Automatic CSRF protection** - SameSite cookie attributes
4. **Server-side session invalidation** - Immediate logout capability
5. **Secure session management** - Proper expiration and cleanup

## Performance Improvements

- Reduced client-side JavaScript bundle size (no JWT libraries)
- Server-side session validation (faster than JWT verification)
- Automatic session cleanup prevents database bloat
- Edge caching compatibility for authenticated content

## Next Steps

1. **Test thoroughly** - Ensure all authentication flows work
2. **Monitor performance** - Check session validation impact
3. **Update documentation** - Remove JWT-related guides
4. **Train team** - Session-based auth concepts and debugging
5. **Plan rollback** - Have JWT fallback ready if needed

## Resources

- [axum-login documentation](https://docs.rs/axum-login)
- [SvelteKit session handling](https://kit.svelte.dev/docs/hooks)
- [HTTP cookie security](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
- [OWASP session management](https://owasp.org/www-chapter-london/assets/slides/OWASP_London_20171130_Session_Management.pdf)
