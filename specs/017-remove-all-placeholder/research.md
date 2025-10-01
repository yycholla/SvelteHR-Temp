# Phase 0: Technical Research

**Feature**: Replace Placeholder Data with Database Integration
**Date**: 2025-01-23
**Status**: Complete

## Executive Summary

This research phase investigated the current state of data loading in the SvelteHR application, identified placeholder data patterns, analyzed backend integration issues, and determined the optimal approach for comprehensive data replacement and backend stabilization.

## Key Findings

### 1. Current Data Architecture

**Decision**: Maintain PostGraphile GraphQL API as primary data source
**Rationale**:
- Already integrated throughout the application
- Provides automatic GraphQL schema from PostgreSQL
- Includes built-in JWT authentication and RLS
- No evidence of MountainHR Go backend being active (port 8080 unused)
**Alternatives Considered**:
- MountainHR Go backend (mentioned in docs but not implemented)
- Direct PostgreSQL connections (violates architecture patterns)
- REST API migration (would require complete rewrite)

### 2. Placeholder Data Locations

**Decision**: Target specific files with mock/calculated data for replacement
**Rationale**: Analysis identified exact locations needing attention:
- `/dashboard/admin/analytics/+page.server.ts` - Mock department distribution
- `/dashboard/management/+page.server.ts` - Fallback employee statistics
- `/dashboard/+page.server.ts` - May contain placeholder calculations
**Alternatives Considered**:
- Global search/replace (too risky, might break working code)
- Complete rewrite (unnecessary, most data loading works correctly)

### 3. Backend Initialization Issues

**Decision**: Implement health check and retry mechanism for PostGraphile
**Rationale**:
- HTTP 500 errors occur when backend isn't fully initialized
- Container startup race condition between SvelteKit and PostGraphile
- Need graceful degradation during initialization
**Alternatives Considered**:
- Delay frontend startup (poor user experience)
- Cache all data (complex and doesn't solve initial load)

### 4. Database Seeding Strategy

**Decision**: Create comprehensive seed data system with 10-50 records per entity
**Rationale**:
- Meets testing requirements from specification
- Allows verification of all UI states and edge cases
- Provides realistic data relationships
**Alternatives Considered**:
- Minimal seed data (insufficient for testing)
- Production data copy (security/privacy concerns)
- Random data generation (lacks realistic relationships)

### 5. Error Handling Approach

**Decision**: Enhance existing error handling with retry buttons and empty states
**Rationale**:
- Specification requires error messages with retry capability
- "No data available" message for sections with <5 records
- Builds on existing error-handling.ts infrastructure
**Alternatives Considered**:
- Auto-retry (could overwhelm backend)
- Hide errors (poor user experience)

### 6. API Client Consolidation

**Decision**: Create unified GraphQL client to replace duplicated fetch logic
**Rationale**:
- Current pattern duplicates code across 20+ server files
- Inconsistent error handling and JWT management
- Single point for retry logic and error handling
**Alternatives Considered**:
- Keep current pattern (technical debt accumulation)
- Use existing GraphQL client library (adds dependency)

## Technical Specifications

### Database Entities Requiring Seed Data

Based on GraphQL schema analysis:

1. **Users/Auth** (30-50 records)
   - Different roles (Admin, HR, Manager, Employee)
   - Various departments and teams
   - Active and inactive states

2. **Departments** (10-15 records)
   - Hierarchical structure
   - Different sizes and types
   - Manager assignments

3. **Employee Data** (40-50 records)
   - Complete profiles with all fields
   - Various employment statuses
   - Tenure distribution

4. **HR Transactions** (30-50 records each)
   - Leave requests (various types and states)
   - Performance reviews
   - Goals and objectives
   - Time-off balances

5. **Analytics Data**
   - Department metrics
   - Performance indicators
   - Activity logs

### Backend Health Check Implementation

```typescript
// Health check endpoint structure
interface HealthCheckResponse {
  status: 'healthy' | 'initializing' | 'error';
  services: {
    database: boolean;
    graphql: boolean;
    auth: boolean;
  };
  timestamp: string;
}
```

### Unified API Client Structure

```typescript
interface UnifiedGraphQLClient {
  query<T>(query: string, variables?: Record<string, any>): Promise<T>;
  mutation<T>(mutation: string, variables?: Record<string, any>): Promise<T>;
  withRetry<T>(operation: () => Promise<T>, maxRetries: number): Promise<T>;
  handleError(error: unknown): ErrorResponse;
}
```

## Implementation Priority

1. **Critical** - Backend health check and initialization handler
2. **Critical** - Database seed data system
3. **High** - Replace mock data in analytics dashboard
4. **High** - Replace fallback data in management dashboard
5. **Medium** - Unified GraphQL client
6. **Medium** - Enhanced error handling with retry
7. **Low** - Performance optimizations

## Risk Mitigation

### Identified Risks

1. **Data Loss Risk**: Replacing working queries with broken ones
   - Mitigation: Comprehensive E2E tests before changes

2. **Performance Degradation**: New queries might be slower
   - Mitigation: Query optimization and monitoring

3. **Breaking Changes**: GraphQL schema might change
   - Mitigation: Type generation and contract tests

4. **Initialization Timing**: Race conditions during startup
   - Mitigation: Proper health checks and retry logic

## Validation Criteria

- All pages load without placeholder data
- Backend initialization completes without manual intervention
- Error states display appropriate messages with retry
- Empty states show "No data available" for <5 records
- 10-50 seed records per entity type available
- All E2E tests pass with real data

## Next Steps

1. Design data models for seed system (Phase 1)
2. Create API contracts for health check and retry (Phase 1)
3. Generate contract tests for data endpoints (Phase 1)
4. Update CLAUDE.md with project context (Phase 1)
5. Plan task decomposition for implementation (Phase 2)

---

*Research completed with comprehensive codebase analysis and architecture review*