# Data Model: Authentication Redirect Loop Fix

## Core Entities

### User Session
**Purpose**: Represents an authenticated user's active session state
**Fields**:
- `isAuthenticated: boolean` - Whether user has valid authentication
- `user: User | null` - User information and role data
- `isLoading: boolean` - Whether auth validation is in progress
- `error: string | null` - Last authentication error message
- `roles: UserRoleAssignment[]` - User's role assignments for authorization

**State Transitions**:
- `INITIALIZING` → `AUTHENTICATED` (successful login/validation)
- `INITIALIZING` → `UNAUTHENTICATED` (failed validation/no token)
- `AUTHENTICATED` → `UNAUTHENTICATED` (logout/token expiration)
- `UNAUTHENTICATED` → `AUTHENTICATED` (successful login)

**Validation Rules**:
- `isAuthenticated` must be false when `user` is null
- `isLoading` should be false when auth state is stable
- `error` should be cleared on successful authentication

### Authentication Token
**Purpose**: JWT security credential for user identity validation
**Fields**:
- `token: string` - JWT token string stored in localStorage
- `payload: JWTPayload` - Decoded token payload with user claims
- `expiration: Date` - Token expiration timestamp
- `isValid: boolean` - Whether token is structurally valid and not expired

**Validation Rules**:
- Token must have valid signature when verified by PostGraphile
- Expiration must be checked before making authenticated requests
- Must include required claims: `user_id`, `role`, `aud`, `exp`

### Navigation State
**Purpose**: Tracks user's navigation flow to prevent redirect loops
**Fields**:
- `currentPath: string` - Current route pathname
- `intendedDestination: string | null` - Where user was trying to go before auth
- `redirectAttempts: number` - Count of consecutive redirects
- `lastRedirectTime: Date` - Timestamp of last redirect attempt

**Anti-Loop Rules**:
- `redirectAttempts` must not exceed 3 consecutive attempts
- Minimum 100ms between redirect attempts
- Reset counters on successful navigation
- Track session storage flags to prevent cross-tab conflicts

### Role Permissions
**Purpose**: Defines access control for different user roles
**Fields**:
- `role: string` - Role name (admin, hr_admin, manager, employee)
- `level: number` - Numeric permission level (100=admin, 80=hr, 60=manager, 20=employee)
- `permissions: string[]` - Specific permission strings
- `allowedRoutes: string[]` - Route patterns accessible to role

**Authorization Rules**:
- Higher level numbers include lower level permissions
- Route access determined by role level and specific permissions
- Admin role (level 100) has access to all routes
- Employee role (level 20) limited to basic dashboard and profile

## Entity Relationships

```
User Session
├── contains → Authentication Token
├── references → Role Permissions
└── manages → Navigation State

Authentication Token
├── validated by → PostGraphile JWT verification
└── contains → Role claims for database RLS

Navigation State
├── influenced by → User Session state
└── prevents → Redirect loops

Role Permissions
├── enforced by → PostGraphile RLS policies
└── determines → Route access patterns
```

## State Management Flow

### Authentication Initialization
1. **App Start**: AuthGuard component initializes auth state
2. **Token Check**: Validate JWT from localStorage if present
3. **State Update**: Set user session based on token validation
4. **Route Decision**: Navigate to appropriate dashboard or login

### Login Flow
1. **Credentials Submit**: User provides username/password
2. **PostGraphile Auth**: Backend validates and returns JWT
3. **Token Storage**: Store JWT in localStorage
4. **State Update**: Update user session with auth data
5. **Navigation**: Redirect to role-appropriate dashboard

### Route Protection
1. **Route Access**: User navigates to protected route
2. **Auth Check**: Validate current session state
3. **Permission Check**: Verify role permissions for route
4. **Action Decision**: Allow access or redirect to login/unauthorized

### Logout Flow
1. **Logout Trigger**: User initiates logout
2. **Token Cleanup**: Remove JWT from localStorage
3. **State Reset**: Clear user session data
4. **Navigation**: Redirect to login page

## Error Handling States

### Authentication Errors
- **Invalid Credentials**: Clear state, show error, stay on login
- **Expired Token**: Clear state, redirect to login once
- **Network Error**: Retry with backoff, show error if persistent
- **Malformed Token**: Clear state, redirect to login once

### Navigation Errors
- **Redirect Loop**: Stop redirects, log error, show fallback page
- **Unauthorized Access**: Show 403 page, don't redirect
- **Route Not Found**: Show 404 page, maintain auth state

## Performance Constraints

### Response Times
- **Auth Validation**: <200ms for token verification
- **Route Navigation**: <100ms for auth state checks
- **State Updates**: <50ms for reactive store updates

### Memory Usage
- **Token Storage**: Minimize localStorage usage
- **State Caching**: Cache validation results for 30-60 seconds
- **Error Logging**: Limit error history to last 10 entries

## Security Considerations

### Token Security
- Store JWT in localStorage (not sessionStorage for persistence)
- Validate token expiration before API calls
- Clear tokens on any security-related errors
- Never log or expose token contents

### Route Security
- Always validate server-side through PostGraphile
- Don't rely solely on client-side route protection
- Use database RLS policies as ultimate security enforcement
- Log authorization failures for security monitoring