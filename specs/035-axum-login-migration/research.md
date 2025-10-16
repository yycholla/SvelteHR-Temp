# Research: Axum-Login Migration

**Date**: 2025-10-15
**Purpose**: Resolve technical unknowns and validate architectural decisions for migrating from custom JWT authentication to axum-login

## Research Tasks

### 1. Axum-Login Integration Patterns

**Task**: Research best practices for integrating axum-login with existing axum/GraphQL applications
**Key Questions**:

- How to integrate axum-login middleware with existing authentication flow
- Session store implementation with SeaORM
- Migration path from JWT to session-based authentication
- CSRF protection and secure cookie configuration

### 2. Session Storage Schema

**Task**: Design optimal database schema for axum-login sessions with SeaORM
**Key Questions**:

- Required tables and fields for axum-login session storage
- Relationship between user accounts and sessions
- Session cleanup and expiration handling
- Performance implications of session queries

### 3. Security Architecture

**Task**: Validate security implications of axum-login migration
**Key Questions**:

- Session fixation attack prevention
- Secure cookie configuration (HttpOnly, Secure, SameSite)
- CSRF token handling in GraphQL context
- Rate limiting integration with session management

### 4. Frontend Integration Patterns

**Task**: Research frontend authentication state management for session-based auth
**Key Questions**:

- Cookie-based session handling in SvelteKit
- Authentication state persistence across page reloads
- Logout handling and session cleanup
- Error handling for expired/invalid sessions

### 5. Migration Strategy

**Task**: Develop safe migration approach from JWT to sessions
**Key Questions**:

- Gradual rollout strategy (JWT fallback during transition)
- User session invalidation handling
- Backward compatibility for existing API consumers
- Rollback plan if issues arise

## Findings & Decisions

### Decision: Axum-Login Integration Approach

**Chosen**: Use axum-login with SeaORM session store and tower-sessions for cookie management
**Rationale**: Provides comprehensive session management, CSRF protection, and integrates well with existing axum middleware chain
**Alternatives Considered**:

- Custom session management: Too much security risk, reinventing the wheel
- Different session stores: SeaORM provides best integration with existing codebase

### Decision: Session Schema Design

**Chosen**: Standard axum-login schema with user_sessions table plus audit logging
**Rationale**: Follows axum-login conventions while maintaining audit compliance requirements
**Fields**: session_id (UUID), user_id (UUID), created_at, expires_at, data (JSONB)

### Decision: Security Configuration

**Chosen**: HttpOnly, Secure, SameSite=Strict cookies with CSRF protection
**Rationale**: Maximum security for authentication cookies while maintaining usability
**Rate Limiting**: Per-IP (100/hour) + per-user (10/minute) limits

### Decision: Frontend State Management

**Chosen**: Svelte stores with cookie-based session detection
**Rationale**: Reactive state management that automatically syncs with server session state
**Logout**: Server-side session destruction with client-side cleanup

### Decision: Migration Strategy

**Chosen**: Dual authentication support during transition period
**Rationale**: Allows gradual rollout and easy rollback if issues occur
**Timeline**: JWT fallback for 2 weeks, then full session-based migration
