# Data Model: SvelteKit Session Authentication Migration

## Overview

This document describes the data entities required for session-based authentication in the SvelteKit application, replacing the previous JWT token-based system.

## Entities

### User Session

Represents an active authenticated session stored server-side with axum-login.

**Fields:**

- `session_id`: UUID, primary key, unique identifier
- `user_id`: UUID, foreign key to user table
- `created_at`: Timestamp, when session was created
- `expires_at`: Timestamp, when session expires
- `last_activity`: Timestamp, last user activity
- `ip_address`: String, client IP for security tracking
- `user_agent`: String, browser/client info
- `is_active`: Boolean, whether session is currently valid

**Relationships:**

- Belongs to: User (many-to-one)
- No direct child entities (session data is minimal)

**Validation Rules:**

- `session_id`: Required, unique, UUID format
- `user_id`: Required, must reference existing user
- `created_at`: Required, cannot be in future
- `expires_at`: Required, must be after created_at, max 24 hours from creation
- `last_activity`: Optional, updated on user actions
- `is_active`: Defaults to true, set to false on logout

**State Transitions:**

- `created` → `active` (on successful login)
- `active` → `expired` (on timeout or manual logout)
- `expired` → `terminated` (cleanup)

### Authentication State (Client-Side)

Represents the current authentication status in the client application.

**Fields:**

- `is_authenticated`: Boolean, whether user is logged in
- `user`: Object, basic user information (id, name, role)
- `last_checked`: Timestamp, when auth was last validated
- `session_expires_at`: Timestamp, when current session expires

**Relationships:**

- Mirrors server-side User Session data
- No database persistence (client-side only)

**Validation Rules:**

- `is_authenticated`: Boolean, derived from session validation
- `user`: Object with id, name, role fields when authenticated
- `last_checked`: Timestamp, updated on auth checks
- `session_expires_at`: Timestamp, used for renewal warnings

**State Transitions:**

- `unauthenticated` → `authenticated` (on successful login)
- `authenticated` → `expired` (on session timeout)
- `expired` → `unauthenticated` (on logout or redirect)

### Session Cookie

HTTP-only cookie containing session identifier sent with requests.

**Fields:**

- `name`: String, cookie name (e.g., "session")
- `value`: String, session ID
- `domain`: String, cookie domain
- `path`: String, cookie path ("/")
- `secure`: Boolean, HTTPS only flag
- `http_only`: Boolean, JavaScript access prevention
- `same_site`: String, CSRF protection ("lax")
- `max_age`: Integer, expiration in seconds

**Relationships:**

- References User Session via value field
- No direct database storage (HTTP header only)

**Validation Rules:**

- `name`: Required, alphanumeric with underscores
- `value`: Required, UUID format
- `secure`: Required true in production
- `http_only`: Required true
- `same_site`: Must be "lax" or "strict"
- `max_age`: Positive integer, max 86400 (24 hours)

### User Context (Server-Side)

Server-side user information extracted from validated session.

**Fields:**

- `user_id`: UUID, authenticated user identifier
- `username`: String, user's login name
- `email`: String, user's email address
- `role`: String, user's permission level
- `permissions`: Array<String>, specific permissions
- `session_id`: UUID, current session identifier
- `authenticated_at`: Timestamp, when authentication occurred

**Relationships:**

- Derived from User Session and User entities
- Passed to SvelteKit load functions and GraphQL resolvers

**Validation Rules:**

- `user_id`: Required, must exist in users table
- `username`: Required, non-empty string
- `role`: Required, must be valid role from roles table
- `permissions`: Array of strings, validated against role permissions
- `session_id`: Required, must reference active session

## Data Flow

1. **Login**: User credentials → axum-login validation → User Session created → Session Cookie set → User Context available
2. **Request**: Session Cookie → Server validation → User Context extracted → Page/component access
3. **Activity**: User actions → Session last_activity updated → Expiration extended if needed
4. **Logout**: Session marked inactive → Cookie cleared → User Context cleared

## Migration Considerations

- **JWT Cleanup**: Existing JWT tokens in localStorage will be detected and migrated to sessions
- **Session Persistence**: Sessions survive server restarts through database storage
- **Concurrent Sessions**: Multiple sessions per user allowed with proper cleanup
- **Security**: All sensitive data remains server-side, cookies are httpOnly

## Performance Considerations

- Session validation cached per request
- Database queries optimized with proper indexing
- Session cleanup runs periodically to prevent table bloat
- Client-side state synchronized with server via load functions
