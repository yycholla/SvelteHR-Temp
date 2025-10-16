# Data Model: Axum-Login Migration

**Date**: 2025-10-15
**Purpose**: Define data entities and relationships for axum-login integration

## Core Entities

### User Account

**Purpose**: Represents authenticated system users with role-based access

| Field                 | Type     | Constraints            | Description                                          |
| --------------------- | -------- | ---------------------- | ---------------------------------------------------- |
| id                    | UUID     | Primary Key, Not Null  | Unique user identifier                               |
| email                 | String   | Unique, Not Null       | Login email address                                  |
| password_hash         | String   | Not Null               | Bcrypt-hashed password                               |
| role                  | String   | Not Null, Enum         | User role: employee, manager, hr_admin, system_admin |
| is_active             | Boolean  | Not Null, Default true | Account active status                                |
| created_at            | DateTime | Not Null               | Account creation timestamp                           |
| updated_at            | DateTime | Not Null               | Last update timestamp                                |
| last_login            | DateTime | Nullable               | Last successful login                                |
| failed_login_attempts | Integer  | Not Null, Default 0    | Failed login counter                                 |

**Relationships**:

- One-to-many with UserSession (user can have multiple sessions)
- One-to-many with SecurityEvent (user's auth events)

**Validation Rules**:

- Email must be valid format and unique
- Password must meet complexity requirements (8+ chars, mixed case, numbers)
- Role must be one of defined enum values
- Failed login attempts reset to 0 on successful login

### User Session

**Purpose**: Tracks active user sessions for axum-login

| Field         | Type     | Constraints            | Description               |
| ------------- | -------- | ---------------------- | ------------------------- |
| id            | UUID     | Primary Key, Not Null  | Session identifier        |
| user_id       | UUID     | Foreign Key, Not Null  | Reference to user account |
| session_token | String   | Unique, Not Null       | Secure session token      |
| created_at    | DateTime | Not Null               | Session creation time     |
| expires_at    | DateTime | Not Null               | Session expiration time   |
| last_activity | DateTime | Not Null               | Last user activity        |
| ip_address    | String   | Nullable               | Client IP address         |
| user_agent    | String   | Nullable               | Client user agent         |
| is_active     | Boolean  | Not Null, Default true | Session active status     |

**Relationships**:

- Many-to-one with UserAccount (belongs to user)
- One-to-many with SecurityEvent (session events)

**Validation Rules**:

- Session expires after 30 minutes of inactivity
- Only one active session per user (enforced by business logic)
- Session token must be cryptographically secure random value

### Security Event

**Purpose**: Audit trail for authentication and security events

| Field      | Type     | Constraints           | Description                                                    |
| ---------- | -------- | --------------------- | -------------------------------------------------------------- |
| id         | UUID     | Primary Key, Not Null | Event identifier                                               |
| user_id    | UUID     | Foreign Key, Nullable | Associated user (if applicable)                                |
| session_id | UUID     | Foreign Key, Nullable | Associated session (if applicable)                             |
| event_type | String   | Not Null, Enum        | Event type: login, logout, failed_login, session_expired, etc. |
| event_data | JSONB    | Nullable              | Additional event data                                          |
| ip_address | String   | Nullable              | Client IP address                                              |
| user_agent | String   | Nullable              | Client user agent                                              |
| created_at | DateTime | Not Null              | Event timestamp                                                |
| severity   | String   | Not Null, Enum        | Event severity: info, warning, error                           |

**Relationships**:

- Many-to-one with UserAccount (optional)
- Many-to-one with UserSession (optional)

**Validation Rules**:

- All authentication events must be logged
- Failed login attempts tracked per user
- IP and user agent captured for security analysis

## State Transitions

### User Account States

- **Active**: Normal operational state
- **Locked**: Temporarily locked due to failed login attempts
- **Inactive**: Administratively disabled
- **Pending**: Awaiting activation (if applicable)

### Session States

- **Active**: User can perform authenticated actions
- **Expired**: Session timeout reached, requires re-authentication
- **Terminated**: Explicitly logged out or invalidated
- **Invalid**: Session token compromised or invalid

## Data Integrity Rules

1. **Single Active Session**: Business logic ensures only one active session per user
2. **Session Cleanup**: Expired sessions automatically cleaned up after 24 hours
3. **Audit Trail**: All authentication events preserved for compliance
4. **Password Security**: Passwords hashed with bcrypt, never stored in plain text
5. **Rate Limiting**: Failed login attempts tracked and enforced per user and IP

## Migration Considerations

- **Existing Users**: All current user accounts remain valid
- **Role Mapping**: Existing roles map to new role enum
- **Session Migration**: JWT tokens invalidated, users must re-login
- **Audit History**: Existing audit logs preserved, new events use new schema
