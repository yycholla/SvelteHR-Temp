# Research: Authentication Redirect Loop Fix

## SvelteKit Authentication Patterns

### Decision: Use handle hooks for server-side authentication with conditional logic
**Rationale**: SvelteKit's handle hooks provide the most robust server-side authentication pattern for preventing redirect loops while maintaining security.

**Key Findings**:
- Handle hooks run on every server request and must use conditional logic to prevent infinite redirects
- The sequence helper from @sveltejs/kit/hooks allows chaining authentication and authorization handlers
- Server hooks should be in `hooks.server.ts`, not `hooks.ts` (which is ignored by SvelteKit)
- Protected route lists help avoid redirecting from login/auth pages

**Implementation Pattern**:
```typescript
const unProtectedRoutes = ['/', '/login', '/auth/callback'];
if (!session && !unProtectedRoutes.includes(event.url.pathname)) {
  return redirect('/login');
}
```

**Alternatives considered**:
- Client-side only authentication (rejected: less secure, poor UX)
- Layout-based protection (rejected: not guaranteed to propagate to all routes)

### Decision: Separate authentication from authorization logic
**Rationale**: Cleaner code structure and easier debugging of redirect issues.

**Pattern**:
- Authentication handle: Validates JWT tokens, sets user in locals
- Authorization handle: Checks route permissions, handles redirects
- Use sequence() to chain them properly

**Alternatives considered**: Combined auth/authz in single handle (rejected: harder to debug, violates SRP)

## PostGraphile JWT Integration

### Decision: Leverage PostGraphile's built-in JWT verification
**Rationale**: PostGraphile has native JWT support that automatically sets database session claims from validated tokens.

**Key Findings**:
- PostGraphile requires `--jwt-secret` CLI option or `jwtSecret` library option
- JWT claims like `{"aud": "postgraphile", "role": "app_user", "user_id": 27}` are automatically set on database sessions
- No need for custom JWT verification logic in SvelteKit when using PostGraphile
- Supports stateless authentication without database queries for token validation

**Implementation Approach**:
- Configure PostGraphile with JWT secret
- SvelteKit handles token extraction and forwarding to PostGraphile
- Database-level row-level security (RLS) policies use JWT claims for authorization

**Alternatives considered**:
- Custom JWT verification in SvelteKit (rejected: duplicates PostGraphile functionality)
- Session-based auth (rejected: stateful, doesn't leverage PostGraphile strengths)

## Redirect Loop Prevention

### Decision: Implement multi-layer redirect protection
**Rationale**: Multiple causes can create redirect loops; need defense in depth.

**Protection Layers**:
1. **Route-based protection**: Unprotected route arrays in handle hooks
2. **State-based protection**: Check authentication state before triggering redirects
3. **Cache headers**: Set `cache-control: no-cache` to prevent stale redirect loops
4. **Client-side debouncing**: Prevent multiple simultaneous navigation attempts

**Key Anti-patterns to Avoid**:
- Redirecting from login page to login page
- Multiple handle hooks without proper sequencing
- Missing conditional logic in handle functions
- Cached responses with redirect headers

### Decision: Use browser localStorage for client-side auth state management
**Rationale**: Provides fast client-side auth checks while maintaining security through server-side validation.

**Pattern**:
- Store JWT token in localStorage for client-side access
- Validate token expiration client-side before making requests
- Always verify server-side through PostGraphile JWT validation
- Clear localStorage on logout to prevent stale sessions

**Alternatives considered**:
- HttpOnly cookies only (rejected: requires server round-trip for every auth check)
- SessionStorage (rejected: doesn't persist across tabs)

## Testing Approach

### Decision: Playwright for E2E testing with real browser interactions
**Rationale**: Redirect loops are browser-specific behaviors that require full browser testing to reproduce accurately.

**Testing Strategy**:
1. **Reproduction Tests**: First create failing tests that demonstrate the redirect loop
2. **Integration Tests**: Test full auth flow from login to dashboard
3. **Edge Case Tests**: Multiple tabs, browser navigation, network interruptions
4. **Performance Tests**: Measure auth validation timing

**Test Environment**:
- Real PostgreSQL database with PostGraphile
- SvelteKit dev server
- Multiple browser engines (Chromium, Firefox, WebKit)

**Alternatives considered**:
- Unit tests only (rejected: can't reproduce browser redirect behavior)
- Manual testing only (rejected: not repeatable, can't catch regressions)

## Common Redirect Loop Causes

### Root Cause Analysis
Based on research and current codebase analysis:

1. **Multiple validation calls**: AuthGuard, root page, and layout all calling validateSession()
2. **Race conditions**: Auth state not stabilized before navigation decisions
3. **Reactive statement loops**: Svelte stores triggering multiple re-evaluations
4. **Session storage conflicts**: Multiple redirect flags not being cleared properly

### Solution Approach
1. **Single source of truth**: Only AuthGuard should call validateSession() on app init
2. **State stabilization**: Add delays and polling for auth state completion
3. **Proper cleanup**: Clear all session storage flags on successful auth
4. **Defensive programming**: Check for existing auth state before re-validating

## Performance Considerations

### Decision: Optimize auth validation frequency
**Rationale**: Excessive validation calls create performance issues and potential race conditions.

**Optimization Strategy**:
- Single validateSession() call per app initialization
- Cache validation results for short periods (30-60 seconds)
- Use JWT expiration time to determine when re-validation is needed
- Debounce rapid auth state changes

**Target Metrics**:
- <200ms for authentication validation
- <100ms for client-side auth state checks
- Zero redirect loops under normal operation
- Graceful degradation under network issues

## Technology Integration Points

### SvelteKit + PostGraphile + JWT Integration Flow
1. **Login**: User submits credentials via SvelteKit form
2. **Authentication**: PostGraphile validates credentials and issues JWT
3. **Storage**: SvelteKit stores JWT in localStorage and sets auth state
4. **Navigation**: SvelteKit checks auth state and redirects appropriately
5. **API Calls**: JWT automatically included in GraphQL requests to PostGraphile
6. **Validation**: PostGraphile validates JWT and sets database session claims

### Error Handling Strategy
- Network failures: Graceful degradation with retry logic
- Invalid tokens: Clear state and redirect to login exactly once
- Expired tokens: Silent refresh if possible, otherwise clear state
- Permission errors: Show appropriate error page, don't redirect loop