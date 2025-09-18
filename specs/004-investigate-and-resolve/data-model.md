# Data Model: Authorization System

**Created**: 2025-09-17
**Source**: Extracted from feature specification requirements

## Core Entities

### User Account
**Purpose**: Represents authenticated users with credentials and role assignments

**Fields**:
- `id`: UUID (primary key)
- `email`: string (unique, not null) - Login identifier
- `password_hash`: string (not null) - bcrypt hashed password
- `display_name`: string - Human-readable name
- `is_active`: boolean (default: true) - Account status
- `onboarding_status`: enum ['Pending', 'Active', 'Completed'] - User lifecycle state
- `last_login`: timestamp - Security audit trail
- `created_at`: timestamp (auto)
- `updated_at`: timestamp (auto)

**Validation Rules**:
- Email must be valid format and unique
- Password hash must be bcrypt with salt rounds ≥ 10
- Display name required for active users
- Soft delete only (set is_active = false)

**Relationships**:
- One-to-many: User → UserRoleAssignments
- One-to-many: User → AuthSessions
- One-to-many: User → RefreshTokens

### User Role
**Purpose**: Defines permission levels and access rights in four-tier hierarchy

**Fields**:
- `id`: UUID (primary key)
- `name`: string (unique) - Role identifier ['admin', 'hr', 'manager', 'employee']
- `description`: string - Human-readable description
- `level`: integer (unique) - Numeric hierarchy [100, 80, 60, 20]
- `permissions`: jsonb - Array of permission strings
- `is_system_role`: boolean (default: false) - Prevents deletion
- `created_at`: timestamp (auto)

**Validation Rules**:
- Name must be lowercase, alphanumeric + underscore
- Level must be unique and between 1-100
- System roles cannot be deleted or modified
- Permissions must be valid permission strings

**Relationships**:
- One-to-many: Role → UserRoleAssignments

### User Role Assignment
**Purpose**: Links users to roles with temporal validity and audit trail

**Fields**:
- `id`: UUID (primary key)
- `user_id`: UUID (foreign key → users.id)
- `role_id`: UUID (foreign key → user_roles.id)
- `assigned_by`: UUID (foreign key → users.id) - Audit trail
- `is_active`: boolean (default: true) - Assignment status
- `valid_from`: timestamp (default: now()) - Start date
- `valid_until`: timestamp (nullable) - End date
- `created_at`: timestamp (auto)

**Validation Rules**:
- User must exist and be active
- Role must exist
- Assigned_by must be admin or higher
- valid_until must be after valid_from
- One active assignment per user-role pair

**Relationships**:
- Many-to-one: Assignment → User (user_id)
- Many-to-one: Assignment → Role (role_id)
- Many-to-one: Assignment → User (assigned_by)

### Authentication Session
**Purpose**: Tracks active user sessions with JWT tokens and security metadata

**Fields**:
- `id`: UUID (primary key)
- `user_id`: UUID (foreign key → users.id)
- `token_hash`: string - SHA256 hash of JWT token
- `expires_at`: timestamp - Token expiration
- `created_at`: timestamp (auto) - Session start
- `last_accessed`: timestamp - Last token validation
- `ip_address`: inet - Client IP for security
- `user_agent`: string - Browser fingerprint
- `is_revoked`: boolean (default: false) - Manual revocation

**Validation Rules**:
- Token hash must be SHA256 format
- Expires_at must be future timestamp
- IP address must be valid IPv4/IPv6
- Revoked sessions cannot be reactivated

**Relationships**:
- Many-to-one: Session → User

### Refresh Token
**Purpose**: Manages long-lived refresh tokens for seamless authentication

**Fields**:
- `id`: UUID (primary key)
- `user_id`: UUID (foreign key → users.id)
- `token_hash`: string - SHA256 hash of refresh token
- `expires_at`: timestamp - Token expiration (30 days)
- `created_at`: timestamp (auto)
- `last_used`: timestamp - Rotation tracking
- `replaced_by`: UUID (nullable, foreign key → refresh_tokens.id) - Token chain
- `is_revoked`: boolean (default: false) - Revocation status
- `revoked_at`: timestamp (nullable) - Revocation timestamp

**Validation Rules**:
- Token hash must be SHA256 format
- Expires_at must be future timestamp (max 30 days)
- Replaced_by must reference valid refresh token
- Revoked tokens cannot be reactivated

**Relationships**:
- Many-to-one: RefreshToken → User
- Self-referential: RefreshToken → RefreshToken (replacement chain)

### OAuth2 Provider
**Purpose**: Configuration for external authentication sources (future enhancement)

**Fields**:
- `id`: UUID (primary key)
- `name`: string (unique) - Provider identifier ['google', 'microsoft', 'github']
- `display_name`: string - UI display name
- `client_id`: string - OAuth2 client identifier
- `authorization_url`: string - OAuth2 authorization endpoint
- `token_url`: string - OAuth2 token endpoint
- `user_info_url`: string - User profile endpoint
- `scopes`: jsonb - Array of OAuth2 scopes
- `is_enabled`: boolean (default: true) - Provider status
- `role_mapping`: jsonb - Map OAuth groups to internal roles
- `created_at`: timestamp (auto)
- `updated_at`: timestamp (auto)

**Validation Rules**:
- Name must be unique and lowercase
- URLs must be valid HTTPS endpoints
- Client_id required when enabled
- Role mapping must reference valid role names

**Relationships**:
- One-to-many: Provider → OAuth2Authentications (future)

## State Transitions

### User Lifecycle
```
Registration → Pending → Active → [Suspended] → Inactive
                  ↓
               Completed (onboarding)
```

### Session Lifecycle
```
Created → Active → [Refreshed] → Expired/Revoked
```

### Token Rotation
```
RefreshToken → Used → Replaced → [Chain continues] → Expired
```

## Security Constraints

### Database Level (PostgreSQL RLS)
```sql
-- Users can only see their own data unless admin/HR
CREATE POLICY user_own_data ON users
  FOR ALL USING (
    id = current_user_id() OR
    current_user_role_level() >= 80
  );

-- Role assignments visible to admins and assignees
CREATE POLICY role_assignment_visibility ON user_role_assignments
  FOR SELECT USING (
    user_id = current_user_id() OR
    current_user_role_level() >= 100
  );
```

### Application Level
- Password hashing: bcrypt with minimum 10 rounds
- JWT tokens: HS256 algorithm, 15-minute expiration
- Refresh tokens: Cryptographically secure random, 30-day max
- Session tracking: IP and user agent validation

### Audit Requirements
- All authentication attempts logged
- Role changes require admin approval
- Token refresh events tracked
- Suspicious activity alerts (multiple failed logins, role escalation attempts)

## Performance Considerations

### Indexing Strategy
- `users.email` - Unique index for login queries
- `auth_sessions.token_hash` - Index for token validation
- `user_role_assignments.user_id` - Index for role lookups
- `refresh_tokens.token_hash` - Index for refresh operations

### Caching Strategy
- User role data cached in Redis (5-minute TTL)
- JWT validation results cached (token lifetime)
- Session data cached for frequently accessed users

### Scalability Limits
- Target: 10,000 concurrent users
- JWT validation: <50ms per request
- Role lookups: <25ms per request
- Database connections: Max 100 per instance via connection pooling