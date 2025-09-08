# Phase 0 Research: GelDB Login Integration (Updated)

**Feature**: GelDB Login Page Integration  
**Date**: 2025-01-13  
**Status**: Updated with MountainHR-Backend Context

## Research Objectives

1. **UPDATED**: Existing MountainHR-Backend GelDB configuration analysis
2. SvelteKit frontend integration with running GelDB backend
3. Existing RBAC::User system enhancement patterns
4. Frontend-backend auth flow without database migrations
5. Schema updates via .gel files (not migrations)

---

## 1. Existing MountainHR-Backend Analysis

### Decision: Leverage Existing GelDB Setup
**Rationale**: 
- **DISCOVERED**: MountainHR-Backend already has GelDB auth extension enabled
- **DISCOVERED**: Existing RBAC::User system with comprehensive role management
- **DISCOVERED**: AuthSession, OAuthConnection, and token management already implemented
- **ADVANTAGE**: Can focus on frontend integration instead of backend setup

**Existing Infrastructure**:
```javascript
// Found in /home/yycholla/Documents/MountainHR-Backend/
// dbschema/default.gel: using extension auth; ✅
// dbschema/rbac.gel: Complete RBAC::User system ✅
// geldb-config.json: Magic Link provider configured ✅
```

**Schema Enhancements Needed**:
```sql
-- RBAC::User needs identity_id for GelDB linking
property identity_id -> uuid;

-- Add auth event logging and PKCE session management
scalar type AuthEventType extending enum<'LOGIN_ATTEMPT', 'LOGIN_SUCCESS', ...>;
type AuthEvent extending Auditable { ... };
type PKCESession extending Auditable { ... };
```

**Frontend Integration Strategy**:
- SvelteKit frontend calls existing MountainHR-Backend API
- Backend handles GelDB auth extension communication
- No direct frontend-to-GelDB calls needed

---

## 2. Twelve-Factor Development Compliance

### Decision: Environment-based Configuration with Development Parity
**Rationale**:
- Factor III (Config): All auth endpoints, keys stored in environment
- Factor X (Dev/prod parity): Same GelDB auth flow in dev/staging/prod
- Factor VII (Port binding): Auth service bound to configurable port
- Factor XI (Logs): Structured logging for auth events

**Configuration Strategy**:
```typescript
// Environment variables (Factor III)
const config = {
  GEL_AUTH_BASE_URL: process.env.GEL_AUTH_BASE_URL,
  GEL_AUTH_SIGNING_KEY: process.env.GEL_AUTH_SIGNING_KEY,
  ALLOWED_REDIRECT_URLS: process.env.ALLOWED_REDIRECT_URLS?.split(','),
  SESSION_COOKIE_SECURE: process.env.NODE_ENV === 'production'
}
```

**Development Parity (Factor X)**:
- Use actual GelDB instance in development (not mocks)
- Same auth flow configuration across environments
- Docker-based development environment matching production
- Environment-specific GelDB credentials, identical auth logic

**Alternatives Considered**:
- Config files: Rejected (violates Factor III)
- Development mocks: Rejected (violates Factor X parity)
- Hardcoded values: Rejected (not twelve-factor compliant)

---

## 3. RBAC Integration with GelDB Identity

### Decision: RBAC::User Entity with GelDB Identity Synchronization
**Rationale**:
- Leverages existing RBAC system architecture
- GelDB identity provides authentication, RBAC::User provides authorization
- Clear separation of concerns: auth vs. authz
- Supports role hierarchy (Admin > HR_Manager > Manager > Employee)

**Synchronization Pattern**:
```sql
-- On successful authentication
WITH identity := <ext::auth::Identity><uuid>$identity_id,
     user := (
       SELECT RBAC::User 
       FILTER .identity_id = identity.id 
       LIMIT 1
     )
SELECT user ?? (
  INSERT RBAC::User {
    identity_id := identity.id,
    email := identity.email,
    roles := { RBAC::Role.Employee }, -- Default role
    created_at := datetime_current()
  }
)
```

**Permission Checking**:
- Server-side middleware validates permissions on each request
- Page-level access control based on user roles
- Hierarchical permissions (higher roles inherit lower role permissions)

**Alternatives Considered**:
- GelDB-only auth without RBAC: Rejected (loses existing role system)
- Custom user table: Rejected (duplicates RBAC::User functionality)
- Client-side only checks: Rejected (security vulnerability)

---

## 4. SvelteKit Auth Middleware

### Decision: Server-side Token Validation in hooks.server.ts
**Rationale**:
- SvelteKit universal middleware pattern
- Server-side validation prevents token tampering
- Automatic redirect handling for unauthenticated users
- Integration with existing load functions

**Middleware Pattern**:
```typescript
// hooks.server.ts
export const handle: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get('gel-auth-token');
  
  if (token) {
    // Validate with GelDB /verify endpoint
    // Set event.locals.user and event.locals.permissions
  }
  
  // Redirect unauthenticated users from protected routes
  // Continue with request if authenticated
  
  return resolve(event);
}
```

**Route Protection**:
- `+page.server.ts` load functions check `locals.user`
- Automatic redirect to `/auth/login` for protected routes
- Permission-based data filtering at server level

**Alternatives Considered**:
- Client-side only: Rejected (security issue, SEO problems)
- API route middleware: Rejected (doesn't cover page routes)
- Custom auth stores: Rejected (duplicates SvelteKit patterns)

---

## 5. Production Security Considerations

### Decision: Enhanced Security Configuration
**Rationale**:
- HR applications require high security standards
- Compliance with SOX, GDPR requirements
- Defense in depth approach

**Security Measures**:
- **Cookies**: HttpOnly, Secure, SameSite=Strict
- **HTTPS**: Mandatory in production, cert validation
- **Token Expiration**: Short-lived tokens, re-auth on expiry
- **CSRF Protection**: Built into GelDB auth flow
- **CSP Headers**: Configured for auth redirects
- **Rate Limiting**: Auth endpoint protection
- **Audit Logging**: All auth events logged with context

**Allowed Redirect URLs**:
```sql
-- GelDB Configuration
CONFIGURE CURRENT BRANCH SET
ext::auth::AuthConfig::allowed_redirect_urls := {
    'https://app.sveltehr.com',
    'https://app.sveltehr.com/auth/callback',
    'https://staging.sveltehr.com/auth/callback', -- staging environment
    'http://localhost:5173/auth/callback'  -- development only
};
```

**Alternatives Considered**:
- Relaxed security for development: Rejected (violates dev/prod parity)
- Long-lived tokens: Rejected (increased attack surface)
- Client-side token storage: Rejected (XSS vulnerability)

---

## 6. Integration Testing Strategy

### Decision: Contract-First Testing with Real GelDB
**Rationale**:
- Tests actual GelDB auth flow, not mocked behavior
- Contract tests ensure API compatibility
- Integration tests validate end-to-end flow
- Constitutional requirement for real dependencies

**Test Levels**:
1. **Contract Tests**: GelDB auth endpoints schema validation
2. **Integration Tests**: Full auth flow with real GelDB instance
3. **E2E Tests**: Browser-based login flow testing
4. **Unit Tests**: Individual auth service functions

**Test Environment**:
- Dedicated GelDB test database
- Same auth configuration as production
- Automated test data cleanup
- CI/CD integration with test database

**Alternatives Considered**:
- Mocked GelDB responses: Rejected (constitutional violation)
- Development database testing: Rejected (data pollution)
- Manual testing only: Rejected (not sustainable)

---

## Research Summary

**Key Decisions Made**:
1. **Auth Integration**: Direct GelDB built-in UI with PKCE flow
2. **Development Approach**: Twelve-factor compliant with dev/prod parity
3. **User Management**: RBAC::User entity synchronized with GelDB identity
4. **Security**: Production-grade with HttpOnly cookies, HTTPS, audit logging
5. **Testing**: Contract-first with real GelDB dependencies

**Technical Risks Identified**:
- GelDB service availability during auth flow
- Token synchronization between GelDB and RBAC systems
- Migration from existing auth system

**Mitigation Strategies**:
- Parallel auth systems during migration
- Comprehensive integration testing
- Graceful fallback handling for GelDB unavailability
- Detailed monitoring and alerting

## 7. Updated Implementation Approach

### Decision: Frontend-Backend Integration Focus
**Key Changes from Original Plan**:
1. **No Database Migrations**: Schema changes via direct .gel file updates
2. **Leverage Existing Backend**: Use MountainHR-Backend API as intermediary
3. **Minimal Schema Changes**: Only add identity_id link and audit logging types
4. **Focus on Integration**: Frontend SvelteKit auth flow + existing backend API

### Implementation Phases Adjusted:
- **Phase A**: Schema updates to .gel files (not migrations)
- **Phase B**: Frontend auth service library (SvelteKit integration)  
- **Phase C**: Backend API enhancements (if needed)
- **Phase D**: Frontend-backend integration testing
- **Phase E**: End-to-end authentication flow validation

### Technical Risks Mitigated:
- **REMOVED**: Database setup complexity (already done)
- **REMOVED**: GelDB configuration uncertainty (already configured)
- **ADDED**: Frontend-backend integration complexity
- **ADDED**: Existing API compatibility maintenance

**Next Phase**: Update data models and contracts based on existing backend architecture.