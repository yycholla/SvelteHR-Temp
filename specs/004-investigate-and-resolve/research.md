# Research: Authorization System Architecture

**Created**: 2025-09-17
**Status**: Complete

## JWT with PostGraphile Integration

### Decision: PostGraphile Native JWT Authentication
**Rationale**: PostGraphile 4.x has built-in JWT support that integrates directly with PostgreSQL roles and RLS policies, eliminating the need for middleware layers.

**Key Configuration**:
```bash
postgraphile \
  --jwt-secret $JWT_SECRET \
  --jwt-token-identifier public.jwt_token \
  --default-role anonymous \
  --jwt-verify-algorithms HS256,RS256
```

**Alternatives Considered**:
- Custom middleware JWT validation: Rejected due to performance overhead
- Session-based authentication: Rejected due to scaling concerns
- Third-party auth services: Rejected to maintain data sovereignty

### Decision: PostgreSQL RLS for Authorization
**Rationale**: Row-Level Security policies provide database-level security that's enforced regardless of application layer bugs.

**Implementation Pattern**:
```sql
CREATE FUNCTION current_user_id() RETURNS INTEGER AS $$
  SELECT NULLIF(current_setting('jwt.claims.user_id', TRUE), '')::INTEGER;
$$ LANGUAGE SQL STABLE;

CREATE POLICY user_own_data ON users
  FOR ALL USING (id = current_user_id());
```

**Alternatives Considered**:
- Application-level authorization: Rejected due to security bypass risk
- ORM-based policies: Rejected due to PostGraphile's direct SQL approach

## SvelteKit Authentication Patterns

### Decision: HttpOnly Cookies + Server-Side Validation
**Rationale**: HttpOnly cookies prevent XSS attacks while server-side validation ensures security on every request.

**Implementation**:
```typescript
// Secure cookie setting
cookies.set('jwt-token', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 60 * 15 // 15 minutes
});
```

**Alternatives Considered**:
- localStorage: Rejected due to XSS vulnerability
- sessionStorage: Rejected due to same XSS concerns
- Memory-only storage: Rejected due to refresh issues

### Decision: Server-Side Route Guards
**Rationale**: Authentication checks in `hooks.server.ts` provide universal protection before any route rendering.

**Implementation Pattern**:
```typescript
export const handle: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get('jwt-token');
  if (isProtectedPath && !token) {
    throw redirect(302, '/login');
  }
  return resolve(event);
};
```

**Alternatives Considered**:
- Client-side guards: Rejected due to security bypass potential
- Page-level checks only: Rejected due to code duplication

## Token Management Strategy

### Decision: Short-lived Access Tokens with Refresh Rotation
**Rationale**: 15-minute access tokens limit exposure window while refresh token rotation prevents replay attacks.

**Security Model**:
- Access tokens: 15 minutes, stored in httpOnly cookies
- Refresh tokens: 30 days, stored in separate httpOnly cookies
- Token rotation: New refresh token issued with each use

**Alternatives Considered**:
- Long-lived tokens: Rejected due to security exposure
- Stateless refresh: Rejected due to revocation complexity
- Memory-only tokens: Rejected due to UX impact

## Role-Based Access Control

### Decision: Four-Tier Hierarchy with Numeric Levels
**Rationale**: Numeric levels (100, 80, 60, 20) allow both exact role matching and hierarchical permission checks.

**Role Structure**:
- Admin (100): Full system access
- HR (80): Employee lifecycle management
- Manager (60): Team management
- Employee (20): Self-service access

**JWT Claims Structure**:
```typescript
{
  "role": "authenticated",
  "user_id": 123,
  "role_level": 80,
  "permissions": ["read_users", "write_compensation"],
  "exp": 1640995200
}
```

**Alternatives Considered**:
- String-only roles: Rejected due to hierarchy complexity
- Flat permissions: Rejected due to management overhead
- External role service: Rejected due to latency concerns

## Security Architecture

### Decision: Defense in Depth
**Rationale**: Multiple security layers ensure that single points of failure don't compromise the system.

**Security Layers**:
1. Database level: PostgreSQL RLS policies
2. Application level: Server-side route guards
3. Network level: HTTPS, CSRF protection, security headers
4. Token level: Short expiration, secure storage, rotation

### Decision: Structured Security Logging
**Rationale**: Comprehensive audit trails enable security monitoring and incident response.

**Logging Events**:
- Authentication attempts (success/failure)
- Authorization failures
- Token refresh events
- Role escalation attempts
- Suspicious activity patterns

**Alternatives Considered**:
- Basic logging: Rejected due to inadequate security monitoring
- External SIEM only: Rejected due to local forensics needs
- No logging: Rejected due to compliance requirements

## Performance Considerations

### Decision: Token Validation Caching
**Rationale**: Redis caching reduces JWT validation overhead for high-frequency requests.

**Caching Strategy**:
- Valid tokens cached for 5 minutes
- Cache invalidation on role changes
- Fallback to JWT validation on cache miss

### Decision: Connection Pooling
**Rationale**: PostgreSQL connection pooling prevents database exhaustion under load.

**Configuration**:
- PgBouncer transaction-level pooling
- Max 100 connections per instance
- Connection timeout: 30 seconds

**Alternatives Considered**:
- No pooling: Rejected due to scalability limits
- Session-level pooling: Rejected due to RLS context issues
- Application-level pooling: Rejected due to PostGraphile integration

## Implementation Order

1. **Phase 1**: Core JWT infrastructure (tokens, validation, RLS)
2. **Phase 2**: Frontend integration (cookies, guards, stores)
3. **Phase 3**: Role-based authorization (policies, UI access control)
4. **Phase 4**: Security hardening (logging, monitoring, testing)

**Total Estimated Implementation**: 3-4 weeks
**Critical Path**: Database RLS policies + JWT claim integration