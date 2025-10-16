# GraphQL API Changes: Session Authentication Migration

## Overview

This document describes the changes to GraphQL API usage following the migration from JWT token-based authentication to session-based authentication.

## Authentication Header Removal

### Before (JWT-based)

```javascript
// GraphQL client configuration
const client = new GraphQLClient('/api/graphql', {
	headers: {
		Authorization: `Bearer ${jwtToken}`,
		'Content-Type': 'application/json'
	}
});
```

### After (Session-based)

```javascript
// GraphQL client configuration - NO Authorization header needed
const client = new GraphQLClient('/api/graphql', {
	headers: {
		'Content-Type': 'application/json'
	}
	// Session cookie is automatically sent by browser
});
```

## Server-Side Context Changes

### Before (JWT parsing)

```typescript
// GraphQL context function
export function createContext({ req }: { req: Request }) {
	const token = req.headers.get('authorization')?.replace('Bearer ', '');
	if (!token) return { user: null };

	try {
		const payload = jwt.verify(token, JWT_SECRET);
		return { user: payload };
	} catch {
		return { user: null };
	}
}
```

### After (Session validation)

```typescript
// GraphQL context function
export function createContext({ req }: { req: Request }) {
	// Session validation handled by axum-login middleware
	// User context provided by request extensions
	const user = req.extensions.get('user');
	return { user };
}
```

## Client-Side Query Changes

### Before (Token management)

```typescript
// Apollo Client setup with token refresh
const client = new ApolloClient({
	link: setContext(async (_, { headers }) => {
		const token = await getValidToken();
		return {
			headers: {
				...headers,
				authorization: token ? `Bearer ${token}` : ''
			}
		};
	}),
	cache: new InMemoryCache()
});
```

### After (Session automatic)

```typescript
// Apollo Client setup - simplified
const client = new ApolloClient({
	uri: '/api/graphql',
	cache: new InMemoryCache()
	// No auth link needed - cookies sent automatically
});
```

## Error Handling Changes

### Before (Token errors)

```typescript
// Handling token expiration
if (error.graphQLErrors?.some((e) => e.message === 'Unauthorized')) {
	// Refresh token or redirect to login
	await refreshToken();
	// Retry query
}
```

### After (Session errors)

```typescript
// Handling session expiration
if (error.graphQLErrors?.some((e) => e.message === 'Unauthorized')) {
	// Redirect to login - session handled server-side
	goto('/login');
}
```

## Schema Changes

No changes to GraphQL schema required. Authentication is handled at the transport level (HTTP cookies) rather than application level (Authorization headers).

## Migration Steps

1. **Remove Authorization headers** from all GraphQL client configurations
2. **Update context functions** to use session-based user extraction
3. **Remove token refresh logic** from client-side code
4. **Update error handling** to redirect to login on auth failures
5. **Test all queries/mutations** to ensure session cookies are sent properly

## Security Benefits

- **No token exposure** in client-side JavaScript
- **Automatic CSRF protection** via SameSite cookies
- **Server-side session invalidation** for immediate logout
- **Reduced attack surface** by removing client-side token storage

## Testing Checklist

- [ ] GraphQL queries work without Authorization headers
- [ ] Session cookies are sent with requests
- [ ] Authentication failures redirect to login
- [ ] Logout invalidates server-side sessions
- [ ] Cross-tab session synchronization works
- [ ] Session expiration handling works correctly
