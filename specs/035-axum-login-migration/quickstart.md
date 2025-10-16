# Quick Start: Axum-Login Migration

**Feature**: 035-axum-login-migration
**Date**: 2025-10-15

## Overview

This guide helps developers quickly understand and start working on the axum-login authentication migration. The migration replaces custom JWT authentication with axum-login's comprehensive session management system.

## Prerequisites

- Rust 1.75+
- PostgreSQL database
- Basic understanding of axum and authentication concepts

## Architecture Overview

```
Frontend (SvelteKit) ← HTTP requests with session cookies
       ↓
Backend (axum-login) ← Session validation & user context
       ↓
Database (SeaORM) ← User accounts & session storage
```

## Key Components

### Backend Changes

1. **Dependencies**: Add `axum-login` and `tower-sessions` to Cargo.toml
2. **Session Store**: Implement `axum_login::AuthnBackend` with SeaORM
3. **Middleware**: Replace JWT middleware with axum-login session middleware
4. **Handlers**: Update login/logout handlers to use session management

### Frontend Changes

1. **State Management**: Replace JWT token storage with cookie-based session detection
2. **API Calls**: Remove manual Authorization headers (handled by cookies)
3. **Route Guards**: Update authentication checks to use session state
4. **Logout**: Implement server-side session destruction

## Development Setup

### 1. Database Migration

Run the session table migration:

```sql
-- Creates user_sessions table for axum-login
-- Adds session-related fields to existing user table
```

### 2. Backend Configuration

```rust
// In main.rs - configure axum-login
let session_store = SeaOrmSessionStore::new(db_conn);
let auth_layer = AuthManagerLayerBuilder::new(auth_backend, session_store).build();

// Add to middleware stack
let app = Router::new()
    .layer(auth_layer)
    .layer(SessionManagerLayer::new(session_store));
```

### 3. Frontend Integration

```typescript
// In auth store - detect session from cookies
const authStore = writable({
	isAuthenticated: false,
	user: null,
	checkStatus: async () => {
		const response = await fetch('/auth/me');
		if (response.ok) {
			const data = await response.json();
			authStore.set({ isAuthenticated: true, user: data.user });
		}
	}
});
```

## Testing Strategy

### Unit Tests

- Session creation/validation logic
- Authentication backend implementation
- Middleware behavior

### Integration Tests

- Complete login/logout flows
- Session persistence across requests
- Rate limiting behavior

### Contract Tests

- API response formats
- Error handling scenarios
- Authentication state transitions

## Common Pitfalls

1. **Cookie Security**: Ensure HttpOnly, Secure, SameSite flags are set correctly
2. **Session Cleanup**: Implement proper expired session cleanup to prevent database bloat
3. **CSRF Protection**: Verify CSRF tokens are properly validated for state-changing operations
4. **Migration Period**: Handle both JWT and session-based auth during transition

## Security Checklist

- [ ] Session cookies configured with security flags
- [ ] Rate limiting implemented for auth endpoints
- [ ] Account lockout after failed attempts
- [ ] Audit logging for all auth events
- [ ] Secure password hashing maintained
- [ ] CSRF protection enabled

## Next Steps

1. Review the [implementation plan](plan.md) for detailed tasks
2. Check the [data model](data-model.md) for schema details
3. Review [API contracts](contracts/) for integration points
4. Run `/speckit.tasks` to generate detailed task breakdown
