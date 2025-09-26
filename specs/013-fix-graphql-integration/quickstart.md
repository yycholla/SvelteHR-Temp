# Quickstart Guide: GraphQL Integration Error Resolution

**Date**: 2025-09-25
**Project**: SvelteHR GraphQL Integration Fix
**Audience**: Developers implementing the standardized GraphQL patterns

## Overview

This guide provides step-by-step instructions for implementing the standardized GraphQL error handling patterns across all SvelteHR application pages.

## Prerequisites

- SvelteKit 2.22.0 with Svelte 5 runes syntax
- URQL 5.0.0 GraphQL client configured
- PostGraphile 4.14.1 backend running on localhost:4000
- TypeScript 5.0 development environment

## Quick Start Checklist

### Phase 1: Environment Verification (5 minutes)

- [ ] PostGraphile server running on `http://localhost:4000/graphql`
- [ ] Frontend development server running on `http://localhost:5174`
- [ ] URQL client properly configured with auth and retry exchanges
- [ ] JWT authentication working for test user
- [ ] Browser developer tools open for debugging

### Phase 2: Implement Standardized Operation Pattern (15 minutes per page)

#### Step 1: Update GraphQL Operations File

```typescript
// src/lib/graphql/[page]-operations.ts
import type {
  GetCompleteDashboardDataVariables,
  GetCompleteDashboardDataResponse,
  ErrorResponse
} from '$lib/types/graphql-contracts';

// ✅ CORRECT: Standardized function signature
export async function getCompleteDashboardData(
  userId: string,
  userRole: string
): Promise<GetCompleteDashboardDataResponse> {
  const variables: GetCompleteDashboardDataVariables = {
    userId,
    userRole
  };

  try {
    const result = await client.query(GET_DASHBOARD_QUERY, variables, {
      requestPolicy: 'cache-first',
      timeout: 5000 // 5-second timeout
    }).toPromise();

    if (result.error) {
      throw createStandardizedError(result.error, 'DASHBOARD_LOAD_FAILED');
    }

    return result.data;
  } catch (error) {
    throw handleGraphQLError(error, 'getCompleteDashboardData', variables);
  }
}
```

#### Step 2: Update Svelte Component

```svelte
<!-- src/routes/[page]/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { currentUser } from '$lib/stores/auth';
  import { createErrorHandler, createRetryHandler } from '$lib/utils/graphql-error-handling';

  // State management with Svelte 5 runes
  let loading = $state(true);
  let error = $state<ErrorResponse | null>(null);
  let data = $state<any>(null);
  let retryAttempts = $state(0);

  // Error handling configuration
  const errorHandler = createErrorHandler({
    maxRetries: 3,
    timeoutMs: 5000,
    showUserMessages: true
  });

  const retryHandler = createRetryHandler({
    onRetry: (attempt) => {
      retryAttempts = attempt;
      error = null;
      loading = true;
    },
    onMaxRetriesReached: (finalError) => {
      error = finalError;
      loading = false;
    }
  });

  // Data loading function
  async function loadPageData() {
    if (!$currentUser?.id) {
      error = {
        id: 'AUTH_REQUIRED',
        type: 'authentication',
        userMessage: 'Please log in to access this page',
        suggestedActions: [
          { label: 'Sign In', action: 'redirect_login', isPrimary: true }
        ]
      } as ErrorResponse;
      loading = false;
      return;
    }

    try {
      loading = true;
      error = null;

      // ✅ CORRECT: Use standardized function signature
      const userRole = $currentUser.role || 'employee';
      data = await getPageData($currentUser.id, userRole);

    } catch (err) {
      error = errorHandler.process(err);

      // Automatic retry for retryable errors
      if (error.isRetryable && retryAttempts < 3) {
        retryHandler.scheduleRetry(() => loadPageData(), retryAttempts + 1);
        return;
      }
    } finally {
      loading = false;
    }
  }

  // Mount and reload
  onMount(loadPageData);

  // Manual retry function
  function handleRetry() {
    retryAttempts = 0;
    loadPageData();
  }
</script>

<!-- Loading State -->
{#if loading}
  <div class="loading-container">
    <div class="spinner" />
    <p>Loading your data...</p>
    {#if retryAttempts > 0}
      <p class="retry-info">Retry attempt {retryAttempts} of 3</p>
    {/if}
  </div>

<!-- Error State -->
{:else if error}
  <div class="error-container">
    <h3>Error Loading Data</h3>
    <p class="error-message">{error.userMessage}</p>

    {#if error.technicalDetails && import.meta.env.DEV}
      <details class="technical-details">
        <summary>Technical Details</summary>
        <pre>{error.technicalDetails}</pre>
      </details>
    {/if}

    <!-- Suggested Actions -->
    <div class="action-buttons">
      {#each error.suggestedActions as action}
        <button
          class="btn {action.isPrimary ? 'primary' : 'secondary'}"
          onclick={() => handleAction(action)}
        >
          {action.label}
        </button>
      {/each}
    </div>

    <!-- Retry Button (if retryable) -->
    {#if error.isRetryable}
      <button
        class="btn retry"
        onclick={handleRetry}
        disabled={retryAttempts >= 3}
      >
        Try Again {retryAttempts > 0 ? `(${3 - retryAttempts} attempts left)` : ''}
      </button>
    {/if}
  </div>

<!-- Success State -->
{:else if data}
  <!-- Your page content here -->
  <div class="page-content">
    <!-- Use data normally -->
  </div>
{/if}
```

#### Step 3: Create Error Handling Utilities

```typescript
// src/lib/utils/graphql-error-handling.ts
import type { ErrorResponse, ActionOption } from '$lib/types/graphql-contracts';

export function createStandardizedError(
  originalError: any,
  operationName: string,
  variables?: any
): ErrorResponse {
  const baseError: ErrorResponse = {
    id: generateErrorId(),
    type: classifyError(originalError),
    originalError,
    userMessage: createUserMessage(originalError),
    technicalDetails: JSON.stringify({ originalError, operationName, variables }, null, 2),
    suggestedActions: generateSuggestedActions(originalError),
    timestamp: new Date(),
    isRetryable: isRetryableError(originalError),
    severity: determineSeverity(originalError),
    operationId: operationName
  };

  // Add retry delay for rate limiting
  if (originalError.graphQLErrors?.some(e => e.extensions?.code === 'RATE_LIMIT_EXCEEDED')) {
    baseError.retryAfter = 5; // 5 seconds
  }

  return baseError;
}

function createUserMessage(error: any): string {
  if (error.networkError) {
    return "We're having trouble connecting to our servers. Please check your internet connection and try again.";
  }

  if (error.graphQLErrors?.length > 0) {
    const graphqlError = error.graphQLErrors[0];

    switch (graphqlError.extensions?.code) {
      case 'UNAUTHENTICATED':
        return 'Your session has expired. Please sign in again.';
      case 'FORBIDDEN':
        return "You don't have permission to access this information. Contact your administrator if you believe this is an error.";
      case 'RATE_LIMIT_EXCEEDED':
        return 'Too many requests. Please wait a moment before trying again.';
      default:
        return 'Something went wrong while loading your data. Our team has been notified.';
    }
  }

  return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
}

function generateSuggestedActions(error: any): ActionOption[] {
  const actions: ActionOption[] = [];

  if (error.networkError) {
    actions.push({
      label: 'Try Again',
      action: 'retry',
      isPrimary: true
    });
    actions.push({
      label: 'Check Connection',
      action: 'check_network',
      isPrimary: false
    });
  } else if (error.graphQLErrors?.some(e => e.extensions?.code === 'UNAUTHENTICATED')) {
    actions.push({
      label: 'Sign In',
      action: 'redirect_login',
      isPrimary: true
    });
  } else if (error.graphQLErrors?.some(e => e.extensions?.code === 'FORBIDDEN')) {
    actions.push({
      label: 'Contact Administrator',
      action: 'contact_admin',
      isPrimary: true
    });
    actions.push({
      label: 'Go Back',
      action: 'go_back',
      isPrimary: false
    });
  } else {
    actions.push({
      label: 'Try Again',
      action: 'retry',
      isPrimary: true
    });
    actions.push({
      label: 'Contact Support',
      action: 'contact_support',
      isPrimary: false
    });
  }

  return actions;
}

export function createRetryHandler(config: {
  onRetry: (attempt: number) => void;
  onMaxRetriesReached: (error: ErrorResponse) => void;
}) {
  return {
    scheduleRetry(retryFn: () => void, attempt: number) {
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s

      setTimeout(() => {
        config.onRetry(attempt);
        retryFn();
      }, delay);
    }
  };
}
```

### Phase 3: Test Error Scenarios (10 minutes per page)

#### Test Checklist:

- [ ] **Network Error**: Disconnect internet, verify error message and retry button
- [ ] **Authentication Error**: Clear JWT token, verify redirect to login
- [ ] **Timeout Error**: Simulate slow backend, verify 5-second timeout
- [ ] **Permission Error**: Test with limited permissions, verify contact admin option
- [ ] **Retry Logic**: Force error, verify 3 retry attempts with backoff
- [ ] **Loading States**: Verify loading spinner and retry attempt counter
- [ ] **Success Path**: Verify normal data loading works correctly

### Phase 4: Performance Validation (5 minutes per page)

#### Performance Checklist:

- [ ] **Cache Hit**: Verify 30-minute cache TTL working
- [ ] **Response Time**: GraphQL responses under 200ms p95
- [ ] **Memory Usage**: No memory leaks during error/retry cycles
- [ ] **Network Requests**: No duplicate requests during retry
- [ ] **Bundle Size**: No significant bundle size increase

## Common Patterns

### Dashboard Page Implementation
```typescript
// Specific implementation for dashboard
export async function getCompleteDashboardData(userId: string, userRole: string) {
  // Implementation matches the contract exactly
  return executeStandardizedOperation('GetCompleteDashboardData', { userId, userRole });
}
```

### Employee List Page Implementation
```typescript
// Pagination and filtering support
export async function getEmployees(variables: GetEmployeesVariables) {
  return executeStandardizedOperation('GetEmployees', variables);
}
```

### Department Management Implementation
```typescript
// Department hierarchy with permissions
export async function getDepartments(variables: GetDepartmentsVariables = {}) {
  return executeStandardizedOperation('GetDepartments', variables);
}
```

## Debugging Guide

### Common Issues and Solutions

#### Issue: "$.get(...).map is not a function"
**Cause**: Function signature mismatch between component call and operation function
**Solution**: Ensure operation function accepts correct parameters (userId, userRole)

#### Issue: Authentication errors on page load
**Cause**: JWT token expired or invalid
**Solution**: Verify token refresh logic and redirect handling

#### Issue: Infinite retry loops
**Cause**: Retryable errors not properly classified
**Solution**: Check `isRetryableError()` logic for specific error types

#### Issue: Cache not invalidating
**Cause**: Cache policy not configured correctly
**Solution**: Verify 30-minute TTL and invalidation triggers

### Debugging Commands

```bash
# Check PostGraphile server
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"query":"{ __schema { queryType { name } } }"}'

# Check frontend build
npm run check && npm run lint

# Run specific tests
npm run test:graphql
npm run test:e2e:dashboard
```

## Success Criteria

### Page-Level Success Criteria
- ✅ All GraphQL operations use standardized signatures
- ✅ Error handling follows consistent patterns
- ✅ Loading states provide user feedback
- ✅ Retry logic works with 3-attempt limit
- ✅ Timeout handling at 5-second limit
- ✅ Cache TTL set to 30 minutes
- ✅ User-friendly error messages displayed
- ✅ Technical details available in development mode

### System-Level Success Criteria
- ✅ No "$.get(...).map is not a function" errors
- ✅ No authentication redirect loops
- ✅ No network request duplication
- ✅ Performance metrics meet targets (<200ms p95)
- ✅ All E2E tests passing
- ✅ Type checking passes without errors

## Next Steps

After completing the quickstart implementation:

1. **Run full test suite**: `npm run test`
2. **Performance validation**: Check response times and cache hit rates
3. **User acceptance testing**: Test with actual user workflows
4. **Documentation updates**: Update component documentation
5. **Monitoring setup**: Configure error tracking and performance monitoring

---
*Implementation time estimate: 30 minutes per page + 15 minutes setup*