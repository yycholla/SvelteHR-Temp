# Data Model: GelDB Login Integration (Updated)

**Feature**: GelDB Login Page Integration  
**Date**: 2025-01-13  
**Phase**: 1 - Design & Contracts  
**Status**: Updated for existing MountainHR-Backend integration

## Entity Overview

This feature enhances the existing MountainHR-Backend RBAC::User system with minimal schema changes to support GelDB built-in UI authentication. Most authentication infrastructure already exists - we only need to add GelDB identity linking and audit logging.

---

## Existing Entities (Already Implemented) ✅

### 1. RBAC::User (MountainHR-Backend)
**Status**: ✅ **Already exists** - only needs `identity_id` field addition  
**Location**: `/home/yycholla/Documents/MountainHR-Backend/dbschema/rbac.gel`

**Existing Fields** (already implemented):
- `id: uuid` - Primary key
- `identity_id: uuid` - Link to GelDB Identity (NEW FIELD)
- `email: str` - User email address (synchronized from GelDB)
- `full_name: str` - User display name
- `roles: multi RBAC::Role` - User roles for authorization
- `permissions: multi RBAC::Permission` - Direct permissions (inherited from roles)
- `department_id: uuid` - Department assignment
- `is_active: bool` - Account status
- `created_at: datetime` - Account creation timestamp
- `updated_at: datetime` - Last update timestamp
- `last_login: datetime` - Last successful authentication (NEW FIELD)

**Relationships**:
- Links to GelDB `ext::auth::Identity` via `identity_id`
- Many-to-many with `RBAC::Role`
- Many-to-many with `RBAC::Permission`
- Belongs to `Department`

**Validation Rules**:
- Email format validation (synchronized with GelDB)
- At least one role required (default: Employee)
- Active status required for authentication
- Identity ID unique per user

**State Transitions**:
- `inactive` → `active` (account activation)
- Role changes trigger permission recalculation
- Last login updated on successful authentication

---

### 2. AuthSession (New)

**Purpose**: Track active authentication sessions and token lifecycle.

**Fields**:
- `id: uuid` - Primary key
- `user_id: uuid` - Reference to RBAC::User
- `gel_token_hash: str` - Hashed GelDB auth token for validation
- `created_at: datetime` - Session start time
- `expires_at: datetime` - Token expiration time
- `last_activity: datetime` - Last request timestamp
- `ip_address: str` - Client IP address
- `user_agent: str` - Client user agent
- `is_active: bool` - Session status

**Relationships**:
- Belongs to `RBAC::User`

**Validation Rules**:
- Token hash required and unique
- Expiration must be future date
- User must be active
- IP address format validation

**State Transitions**:
- `active` → `expired` (automatic expiration)
- `active` → `revoked` (manual logout)
- Activity timestamp updated on each request

---

### 3. AuthEvent (New)

**Purpose**: Audit log for authentication events and security monitoring.

**Fields**:
- `id: uuid` - Primary key
- `user_id: uuid?` - Reference to RBAC::User (nullable for failed attempts)
- `event_type: AuthEventType` - Type of auth event
- `success: bool` - Event success status
- `ip_address: str` - Client IP address
- `user_agent: str` - Client user agent
- `details: json` - Additional event context
- `timestamp: datetime` - Event occurrence time

**Event Types** (Enum):
- `LOGIN_ATTEMPT` - User initiated login
- `LOGIN_SUCCESS` - Successful authentication
- `LOGIN_FAILURE` - Failed authentication
- `LOGOUT` - User logout
- `TOKEN_REFRESH` - Token renewal
- `SESSION_EXPIRED` - Automatic session expiration
- `PERMISSION_DENIED` - Access denied to protected resource

**Validation Rules**:
- Event type required
- Timestamp required
- IP address format validation
- Details must be valid JSON

---

### 4. PKCESession (New)

**Purpose**: Manage PKCE verifier/challenge pairs for OAuth security.

**Fields**:
- `id: uuid` - Primary key
- `verifier_hash: str` - Hashed PKCE verifier
- `challenge: str` - PKCE challenge sent to GelDB
- `created_at: datetime` - Session creation time
- `expires_at: datetime` - PKCE session expiration
- `used_at: datetime?` - When verifier was consumed
- `ip_address: str` - Client IP address
- `is_used: bool` - Whether verifier has been consumed

**Validation Rules**:
- Verifier hash required and unique
- Challenge required and unique
- Expiration must be future date (15 minutes max)
- Cannot be reused after consumption

**State Transitions**:
- `active` → `used` (successful token exchange)
- `active` → `expired` (timeout)

---

## RBAC Entities (Existing - Referenced)

### RBAC::Role
- `Admin` - Full system access
- `HR_Manager` - HR operations and employee management
- `Manager` - Team and department management
- `Employee` - Self-service and basic access

### RBAC::Permission
- `employees:read` - View employee data
- `employees:write` - Create/edit employee data
- `employees:delete` - Remove employee data
- `departments:*` - Department management
- `reports:hr` - HR reporting access
- `auth:admin` - Authentication administration

---

## Integration Points

### GelDB Identity Integration

**Synchronization Flow**:
1. User authenticates via GelDB built-in UI
2. GelDB returns `identity_id` in auth token
3. System looks up `RBAC::User` by `identity_id`
4. If not found, create new `RBAC::User` with default Employee role
5. Update `last_login` timestamp
6. Create `AuthSession` record

**Data Consistency**:
- Email synchronized from GelDB identity on each login
- GelDB identity is source of truth for authentication
- RBAC::User is source of truth for authorization
- Audit trail maintained in AuthEvent

### Session Management

**Token Lifecycle**:
1. Successful auth creates `AuthSession` with hashed token
2. Each request validates token against `AuthSession`
3. Session activity updated on valid requests
4. Expired sessions automatically marked inactive
5. Logout revokes session and creates audit event

**Security Considerations**:
- Tokens stored as hashes, never plaintext
- Session IP/user agent validation
- Automatic cleanup of expired sessions
- Comprehensive audit logging

---

## Database Schema Changes

### New Tables
```sql
-- AuthSession table
CREATE TYPE AuthSession {
  REQUIRED user: RBAC::User;
  REQUIRED gel_token_hash: str;
  REQUIRED created_at: datetime;
  REQUIRED expires_at: datetime;
  REQUIRED last_activity: datetime;
  REQUIRED ip_address: str;
  REQUIRED user_agent: str;
  REQUIRED is_active: bool;
};

-- AuthEvent table
CREATE TYPE AuthEvent {
  user: RBAC::User;  -- nullable
  REQUIRED event_type: AuthEventType;
  REQUIRED success: bool;
  REQUIRED ip_address: str;
  REQUIRED user_agent: str;
  REQUIRED details: json;
  REQUIRED timestamp: datetime;
};

-- PKCESession table
CREATE TYPE PKCESession {
  REQUIRED verifier_hash: str;
  REQUIRED challenge: str;
  REQUIRED created_at: datetime;
  REQUIRED expires_at: datetime;
  used_at: datetime;
  REQUIRED ip_address: str;
  REQUIRED is_used: bool;
};

-- Enum for auth events
CREATE SCALAR TYPE AuthEventType EXTENDING enum<
  'LOGIN_ATTEMPT', 'LOGIN_SUCCESS', 'LOGIN_FAILURE',
  'LOGOUT', 'TOKEN_REFRESH', 'SESSION_EXPIRED',
  'PERMISSION_DENIED'
>;
```

### Modified Tables
```sql
-- Add identity_id to RBAC::User
ALTER TYPE RBAC::User {
  CREATE PROPERTY identity_id: uuid;
  CREATE PROPERTY last_login: datetime;
};

-- Add unique constraint on identity_id
ALTER TYPE RBAC::User {
  CREATE CONSTRAINT exclusive ON (identity_id);
};
```

---

## Migration Strategy

### Phase 1: Schema Update
1. Add new fields to RBAC::User
2. Create new auth-related types
3. Set up database constraints

### Phase 2: Data Migration
1. Create RBAC::User records for existing GelDB identities
2. Map existing users to appropriate roles
3. Initialize audit trail

### Phase 3: Validation
1. Verify data integrity
2. Test authentication flow
3. Validate RBAC permissions

**Rollback Plan**: Preserve existing auth system during migration, with ability to revert if needed.