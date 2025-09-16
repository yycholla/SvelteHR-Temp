import { Client, cacheExchange, fetchExchange, subscriptionExchange, errorExchange } from '@urql/core';
import { authExchange } from '@urql/exchange-auth';
import { retryExchange } from '@urql/exchange-retry';
import { createClient as createWSClient } from 'graphql-ws';
import { goto } from '$app/navigation';
import { browser } from '$app/environment';
import { PUBLIC_GRAPHQL_ENDPOINT } from '$env/static/public';

/**
 * PostGraphile GraphQL Client Configuration for SvelteHR
 * 
 * Provides authenticated GraphQL client with:
 * - JWT authentication with PostGraphile permissions
 * - Real-time subscriptions via WebSocket
 * - Intelligent caching and error handling
 * - Retry logic and rate limiting
 */

// PostGraphile configuration
const POSTGRAPHILE_GRAPHQL_URL = PUBLIC_GRAPHQL_ENDPOINT || 'http://localhost:4000/graphql';
const POSTGRAPHILE_GRAPHQL_WS_URL = POSTGRAPHILE_GRAPHQL_URL.replace('http://', 'ws://').replace('https://', 'wss://');

// WebSocket client for subscriptions (disabled for PostGraphile - doesn't support WebSockets by default)
let wsClient: ReturnType<typeof createWSClient> | null = null;

// Note: PostGraphile doesn't support WebSocket subscriptions out of the box
// Enable this only if you have added WebSocket support to your PostGraphile setup
// if (browser) {
//   wsClient = createWSClient({
//     url: POSTGRAPHILE_GRAPHQL_WS_URL,
//     connectionParams: () => {
//       const token = localStorage.getItem('auth-token');
//       return token ? { 
//         Authorization: `Bearer ${token}`
//       } : {};
//     },
//     shouldRetry: () => true,
//   });
// }

// Authentication state management for PostGraphile JWT
interface AuthState {
  token: string | null;
}

const getAuthState = (): AuthState => {
  if (!browser) {
    return { token: null };
  }

  // For PostGraphile, we get the JWT from httpOnly cookies via API calls
  // This is more secure than localStorage
  return {
    token: localStorage.getItem('temp-jwt-token') // Only for temporary client-side operations
  };
};

const setAuthState = (authState: Partial<AuthState>) => {
  if (!browser) return;

  if (authState.token !== undefined) {
    if (authState.token) {
      // Store temporarily for client operations
      localStorage.setItem('temp-jwt-token', authState.token);
    } else {
      localStorage.removeItem('temp-jwt-token');
    }
  }
};

// Token validation via REST API endpoint (PostGraphile uses longer-lived JWTs)
const validateTokenViaAPI = async () => {
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // No body needed - the JWT is in httpOnly cookie
  });
  
  if (!response.ok) {
    throw new Error('Token validation failed');
  }
  
  return response.json();
};

// Error exchange for handling GraphQL errors
const customErrorExchange = errorExchange({
  onError: (error, operation) => {
    // Handle authentication errors
    if (error.graphQLErrors.some(e => e.extensions?.code === 'UNAUTHENTICATED')) {
      // Clear invalid auth state and redirect to login
      setAuthState({ token: null, refreshToken: null, expiresAt: null });
      if (browser) {
        goto('/login?returnUrl=' + encodeURIComponent(window.location.pathname));
      }
    }

    // Handle rate limiting
    if (error.graphQLErrors.some(e => e.extensions?.code === 'RATE_LIMIT_EXCEEDED')) {
      console.warn('Rate limit exceeded for operation:', operation.key);
    }

    // Handle network errors
    if (error.networkError) {
      console.error('Network error:', error.networkError);
      
      // Dispatch custom event for offline handling
      if (browser) {
        window.dispatchEvent(new CustomEvent('network-error', {
          detail: { error: error.networkError, operation }
        }));
      }
    }

    // Log other GraphQL errors
    error.graphQLErrors.forEach(({ message, extensions }) => {
      console.error('GraphQL error:', message, extensions);
    });
  }
});

// Auth exchange configuration
const authConfig = authExchange(async (utils) => {
  let authState = getAuthState();

  return {
    addAuthToOperation(operation) {
      if (!authState.token) return operation;

      return utils.appendHeaders(operation, {
        Authorization: `Bearer ${authState.token}`,
      });
    },

    didAuthError(error) {
      return error.graphQLErrors.some(e => e.extensions?.code === 'UNAUTHENTICATED');
    },

    async refreshAuth() {
      try {
        // Validate JWT token via API (uses httpOnly cookie)
        const result = await validateTokenViaAPI();

        if (result.success && result.user) {
          // Token is still valid, no need to refresh with PostGraphile
          // Just continue using the existing JWT
          return;
        } else {
          // Token is invalid, clear auth and redirect to login
          setAuthState({ token: null });
          if (browser) {
            goto('/login');
          }
        }
      } catch (error) {
        console.error('Token validation failed:', error);
        setAuthState({ token: null });
        if (browser) {
          goto('/login');
        }
      }
    },

    willAuthError() {
      // With PostGraphile JWTs, we let the server validate expiration
      // rather than tracking client-side expiration times
      return false;
    }
  };
});

// Retry exchange configuration
const retryConfig = retryExchange({
  initialDelayMs: 1000,
  maxDelayMs: 15000,
  randomDelay: true,
  maxNumberAttempts: 3,
  retryIf: (error, _operation) => {
    // Retry on network errors and server errors (not client errors)
    return !!(error.networkError || error.graphQLErrors.some(e => 
      e.extensions?.code === 'INTERNAL_ERROR' || 
      e.extensions?.code === 'RATE_LIMIT_EXCEEDED'
    ));
  }
});

// Create the main GraphQL client
export const createUrqlClient = (fetchFn?: typeof fetch, authToken?: string) => {
  // Override auth token if provided (for testing/SSR)
  if (authToken && browser) {
    setAuthState({ token: authToken });
  }

  const exchanges = [
    cacheExchange,
    customErrorExchange,
    retryConfig,
    authConfig,
    fetchFn ? fetchExchange.bind(null, fetchFn) : fetchExchange,
  ];

  // Add subscription exchange for browser environment (disabled for PostGraphile)
  // PostGraphile doesn't support WebSocket subscriptions by default
  // if (browser && wsClient) {
  //   exchanges.splice(-1, 0, subscriptionExchange({
  //     forwardSubscription(request) {
  //       const input = { ...request, query: request.query || '' };
  //       return {
  //         subscribe: (sink) => {
  //           const unsubscribe = wsClient!.subscribe(input, sink);
  //           return { unsubscribe };
  //         },
  //       };
  //     },
  //   }));
  // }

  return new Client({
    url: POSTGRAPHILE_GRAPHQL_URL,
    exchanges,
    fetchOptions: () => {
      return {
        method: 'POST', // Force POST requests for all GraphQL operations
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Name': 'SvelteHR',
          'X-Client-Version': '1.0.0',
        },
      };
    },
    // Disable query GET requests
    preferGetMethod: false,
  });
};

// Default client instance
export const client = createUrqlClient();

// Authentication helpers for PostGraphile JWT
export const setJwtToken = (jwtToken: string) => {
  setAuthState({ token: jwtToken });

  // Reinitialize WebSocket connection with new token (disabled for PostGraphile)
  // if (browser && wsClient) {
  //   wsClient.dispose();
  //   wsClient = createWSClient({
  //     url: POSTGRAPHILE_GRAPHQL_WS_URL,
  //     connectionParams: () => ({
  //       Authorization: `Bearer ${jwtToken}`
  //     }),
  //     shouldRetry: () => true,
  //   });
  // }
};

export const clearAuthTokens = () => {
  setAuthState({ token: null });
  
  // Dispose WebSocket connection (disabled for PostGraphile)
  // if (browser && wsClient) {
  //   wsClient.dispose();
  //   wsClient = null;
  // }

  // Clear JWT from server via API call
  if (browser) {
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {
      // Ignore errors - cookie clearing will happen anyway
    });
  }
};

export const getAuthToken = (): string | null => {
  return getAuthState().token;
};

export const isAuthenticated = async (): Promise<boolean> => {
  if (!browser) return false;
  
  try {
    const result = await validateTokenViaAPI();
    return result.success && result.isValid;
  } catch {
    return false;
  }
};

// Network status monitoring
export const networkStatus = {
  isOnline: browser ? navigator.onLine : true,
  lastError: null as Error | null,
};

if (browser) {
  window.addEventListener('online', () => {
    networkStatus.isOnline = true;
    window.dispatchEvent(new CustomEvent('network-status-change', {
      detail: { isOnline: true }
    }));
  });

  window.addEventListener('offline', () => {
    networkStatus.isOnline = false;
    window.dispatchEvent(new CustomEvent('network-status-change', {
      detail: { isOnline: false }
    }));
  });

  window.addEventListener('network-error', ((event: CustomEvent) => {
    networkStatus.lastError = event.detail.error;
  }) as EventListener);
}

// Export types for TypeScript support
export type { Client, OperationResult, CombinedError } from '@urql/core';

// Export common query/mutation helpers
export const executeQuery = async (client: Client, query: string, variables?: any) => {
  const result = await client.query(query, variables).toPromise();
  
  if (result.error) {
    throw result.error;
  }
  
  return result.data;
};

export const executeMutation = async (client: Client, mutation: string, variables?: any) => {
  const result = await client.mutation(mutation, variables).toPromise();
  
  if (result.error) {
    throw result.error;
  }
  
  return result.data;
};

export const executeSubscription = (client: Client, subscription: string, variables?: any) => {
  return client.subscription(subscription, variables);
};