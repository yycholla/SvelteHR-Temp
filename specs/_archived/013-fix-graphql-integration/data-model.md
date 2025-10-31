# Data Model: GraphQL Integration Error Resolution

**Date**: 2025-09-25
**Project**: SvelteHR GraphQL Integration Fix

## Core Entities

### 1. DataRequest

Represents any operation that retrieves information from the GraphQL backend.

**Fields**:

- `id: string` - Unique identifier for the request
- `operationName: string` - GraphQL operation name
- `variables: Record<string, any>` - Query variables
- `userCredentials: UserSession` - Associated user session
- `status: RequestStatus` - Current request state
- `retryAttempts: number` - Current retry count (0-3)
- `createdAt: DateTime` - Request timestamp
- `completedAt: DateTime | null` - Completion timestamp
- `timeoutMs: number` - Request timeout (default 5000)

**States**: `pending`, `loading`, `success`, `error`, `timeout`, `retrying`

**Validation Rules**:

- `retryAttempts` must be between 0-3
- `timeoutMs` must be <= 5000ms
- `operationName` must be non-empty
- `userCredentials` must be valid and authenticated

### 2. ErrorResponse

Contains error details and user-friendly information for handling failures.

**Fields**:

- `id: string` - Unique error identifier
- `type: ErrorType` - Classification of error
- `originalError: any` - Raw GraphQL/network error
- `userMessage: string` - Human-readable error description
- `technicalDetails: string` - Developer information for debugging
- `suggestedActions: ActionOption[]` - Available user recovery options
- `timestamp: DateTime` - When error occurred
- `isRetryable: boolean` - Whether automatic retry is possible
- `severity: ErrorSeverity` - Impact level

**Error Types**: `network`, `graphql`, `authentication`, `permission`, `timeout`, `validation`
**Severity Levels**: `low`, `medium`, `high`, `critical`

**Validation Rules**:

- `userMessage` must be non-empty and user-friendly
- `suggestedActions` must include at least one action
- `timestamp` must be valid ISO datetime
- `severity` determines user interface treatment

### 3. UserSession

Tracks user authentication state and permissions for GraphQL requests.

**Fields**:

- `id: string` - Session identifier
- `userId: string` - User ID from authentication system
- `jwtToken: string` - Bearer token for GraphQL authentication
- `permissions: string[]` - User permission list
- `roles: string[]` - User role assignments
- `isAuthenticated: boolean` - Current auth status
- `expiresAt: DateTime` - Token expiration
- `lastActivity: DateTime` - Most recent request timestamp

**State Transitions**:

- `anonymous` → `authenticating` → `authenticated` → `expired`
- Can transition from any state to `failed` on auth error

**Validation Rules**:

- `jwtToken` must be valid JWT format when authenticated
- `expiresAt` must be in future when authenticated
- `permissions` must be non-empty array for authenticated users
- `userId` must exist when authenticated

### 4. ApplicationPage

Each interface view that requires backend data, with loading and error handling.

**Fields**:

- `id: string` - Page identifier (route path)
- `title: string` - Human-readable page name
- `requiredOperations: string[]` - GraphQL operations needed
- `loadingState: LoadingState` - Current data loading status
- `errorState: ErrorResponse | null` - Active error information
- `cachePolicy: CachePolicy` - Data freshness requirements
- `lastDataRefresh: DateTime | null` - Most recent successful load
- `retryConfiguration: RetryConfig` - Page-specific retry settings

**Loading States**: `idle`, `loading`, `loaded`, `error`, `retrying`

**Validation Rules**:

- `requiredOperations` must be non-empty for pages with data
- `cachePolicy.ttlMinutes` must be <= 30 minutes
- `lastDataRefresh` must be updated on successful operations
- `errorState` must be cleared on successful retry

## Supporting Types

### ActionOption

User-available actions for error recovery.

**Fields**:

- `label: string` - Button/link text
- `action: string` - Action identifier
- `isPrimary: boolean` - Visual emphasis
- `parameters: Record<string, any>` - Action parameters

**Standard Actions**: `retry`, `refresh`, `contact_admin`, `go_back`, `try_later`

### CachePolicy

Data freshness and invalidation rules.

**Fields**:

- `ttlMinutes: number` - Time-to-live in minutes (max 30)
- `invalidateOnChange: boolean` - Auto-invalidate on related data changes
- `staleWhileRevalidate: boolean` - Show stale data during refresh

### RetryConfig

Retry behavior configuration.

**Fields**:

- `maxAttempts: number` - Maximum retry count (max 3)
- `backoffStrategy: string` - Retry delay pattern
- `retryConditions: string[]` - When to automatically retry

## Data Flow Patterns

### Request Lifecycle

1. **Initialize**: Create DataRequest with user session
2. **Validate**: Check authentication and permissions
3. **Execute**: Send GraphQL operation with timeout
4. **Handle Response**: Process success or create ErrorResponse
5. **Cache**: Store successful results per CachePolicy
6. **Retry**: Automatic retry on retryable errors (max 3)
7. **Complete**: Update ApplicationPage state

### Error Handling Flow

1. **Detect**: Capture GraphQL, network, or timeout errors
2. **Classify**: Determine ErrorType and severity
3. **Format**: Create user-friendly error messages
4. **Actions**: Generate appropriate recovery options
5. **Display**: Show error with suggested actions
6. **Track**: Log for monitoring and debugging

### Cache Management

1. **Check**: Verify cached data freshness (30-minute TTL)
2. **Serve**: Return cached data if fresh
3. **Background Refresh**: Update stale data silently
4. **Invalidate**: Clear cache on related data changes
5. **Cleanup**: Remove expired cache entries

## Integration Points

### GraphQL Client Integration

- DataRequest maps to URQL operation context
- ErrorResponse integrates with URQL error exchange
- UserSession provides auth headers for requests
- CachePolicy configures URQL cache exchange

### Svelte Component Integration

- ApplicationPage state drives component rendering
- LoadingState controls UI loading indicators
- ErrorResponse provides component error boundaries
- ActionOption generates user interface elements

### PostGraphile Backend Integration

- UserSession permissions match PostGraphile RLS policies
- GraphQL operations align with PostGraphile schema
- JWT tokens integrate with PostGraphile auth
- Error types map to PostGraphile error codes

---

_Data model supports all functional requirements from feature specification._
