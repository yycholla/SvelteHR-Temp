import { 
  Client, 
  cacheExchange, 
  fetchExchange, 
  subscriptionExchange,
  errorExchange,
  type ClientOptions 
} from '@urql/svelte';
import { authExchange } from '@urql/exchange-auth';
import { retryExchange } from '@urql/exchange-retry';
import { createClient as createWSClient } from 'graphql-ws';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { authStore } from '$lib/stores/auth';

/**
 * Hasura GraphQL Client Configuration with Authentication
 * Features: JWT auth, retry logic, caching, subscriptions, error handling
 */

// Environment configuration
const HASURA_GRAPHQL_URL = browser 
  ? 'http://localhost:3001/graphql'  // Proxy through backend 
  : 'http://localhost:8080/v1/graphql'; // Direct for SSR

const HASURA_WS_URL = browser 
  ? 'ws://localhost:8080/v1/graphql'
  : undefined;

// Storage keys
const ACCESS_TOKEN_KEY = 'hr_access_token';
const REFRESH_TOKEN_KEY = 'hr_refresh_token';

/**
 * Authentication utilities for token management
 */
export const authUtils = {
  getAccessToken: (): string | null => {
    if (!browser) return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  setAccessToken: (token: string): void => {
    if (!browser) return;
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  },

  removeAccessToken: (): void => {
    if (!browser) return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  },

  getRefreshToken: (): string | null => {
    if (!browser) return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  setRefreshToken: (token: string): void => {
    if (!browser) return;
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  },

  removeRefreshToken: (): void => {
    if (!browser) return;
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  clearTokens: (): void => {
    if (!browser) return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  /**
   * Refresh access token using refresh token
   */
  refreshAccessToken: async (): Promise<string | null> => {
    const refreshToken = authUtils.getRefreshToken();
    if (!refreshToken || !browser) return null;

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const data = await response.json();
      
      if (data.success && data.accessToken) {
        authUtils.setAccessToken(data.accessToken);
        return data.accessToken;
      }

      throw new Error(data.error || 'Token refresh failed');
    } catch (error) {
      console.error('Token refresh error:', error);
      authUtils.clearTokens();
      authStore.logout(); // Clear auth store
      if (browser) {
        goto('/login');
      }
      return null;
    }
  },

  /**
   * Check if token is expired (basic check)
   */
  isTokenExpired: (token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      return payload.exp < now;
    } catch {
      return true;
    }
  }
};

/**
 * WebSocket client for subscriptions
 */
const wsClient = browser && HASURA_WS_URL ? createWSClient({
  url: HASURA_WS_URL,
  connectionParams: () => {
    const token = authUtils.getAccessToken();
    return {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    };
  },
  shouldRetry: (error) => {
    console.warn('WebSocket error:', error);
    return true;
  },
  retryAttempts: 5,
  retryWait: async (attempt) => {
    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
  },
  on: {
    connecting: () => console.log('WebSocket connecting...'),
    opened: () => console.log('WebSocket connected'),
    closed: () => console.log('WebSocket disconnected'),
    error: (error) => console.error('WebSocket error:', error),
  },
}) : undefined;

/**
 * Create Urql client with all exchanges
 */
export const hasuraClient = new Client({
  url: HASURA_GRAPHQL_URL,
  exchanges: [
    // Error handling exchange
    errorExchange({
      onError: (error) => {
        console.error('GraphQL Error:', error);
        
        // Handle authentication errors
        if (error.graphQLErrors.some(e => e.extensions?.code === 'invalid-jwt')) {
          authUtils.clearTokens();
          authStore.logout();
          if (browser) {
            goto('/login');
          }
        }
        
        // Handle network errors
        if (error.networkError) {
          console.error('Network Error:', error.networkError);
          // Could show a toast notification here
        }
      },
    }),

    // Authentication exchange with token refresh
    authExchange<{ token: string | null }>({
      addAuthToOperation: ({ authState, operation }) => {
        if (!authState?.token) {
          return operation;
        }

        const fetchOptions =
          typeof operation.context.fetchOptions === 'function'
            ? operation.context.fetchOptions()
            : operation.context.fetchOptions || {};

        return {
          ...operation,
          context: {
            ...operation.context,
            fetchOptions: {
              ...fetchOptions,
              headers: {
                ...fetchOptions.headers,
                Authorization: `Bearer ${authState.token}`,
              },
            },
          },
        };
      },

      willAuthError: ({ authState, operation }) => {
        if (!authState?.token) return true;
        
        // Check if token is expired
        return authUtils.isTokenExpired(authState.token);
      },

      didAuthError: ({ error }) => {
        return error.graphQLErrors.some(
          e => e.extensions?.code === 'invalid-jwt' || 
               e.extensions?.code === 'invalid-headers'
        );
      },

      getAuth: async ({ authState, mutate }) => {
        // Initial auth state
        if (!authState) {
          const token = authUtils.getAccessToken();
          return token ? { token } : null;
        }

        // Try to refresh token
        console.log('Attempting token refresh...');
        const newToken = await authUtils.refreshAccessToken();
        
        if (newToken) {
          return { token: newToken };
        }

        // Refresh failed, clear auth state
        authUtils.clearTokens();
        return null;
      },
    }),

    // Retry exchange for network failures
    retryExchange({
      initialDelayMs: 1000,
      maxDelayMs: 15000,
      randomDelay: true,
      maxNumberAttempts: 3,
      retryIf: (error, operation) => {
        // Retry on network errors, but not on auth errors
        return !!(error.networkError && !error.graphQLErrors.some(
          e => e.extensions?.code === 'invalid-jwt'
        ));
      },
    }),

    // Caching exchange
    cacheExchange({
      keys: {
        users: (data) => data.id,
        departments: (data) => data.id,
        user_roles: (data) => data.id,
        notifications: (data) => data.id,
      },
      ttl: 300000, // 5 minutes cache
      updates: {
        Mutation: {
          // Cache invalidation patterns
          update_users_by_pk: (result, args, cache) => {
            // Invalidate user queries when user is updated
            cache.invalidate({ __typename: 'users', id: args.pk_columns.id });
          },
          insert_users_one: (result, args, cache) => {
            // Invalidate user lists when new user is created
            cache.invalidate('Query', 'GetUsersList');
          },
          update_departments_by_pk: (result, args, cache) => {
            cache.invalidate({ __typename: 'departments', id: args.pk_columns.id });
          },
          insert_departments_one: (result, args, cache) => {
            cache.invalidate('Query', 'GetDepartmentsList');
          },
        },
      },
    }),

    // Subscription exchange (only in browser)
    ...(wsClient ? [subscriptionExchange({ forwardSubscription: (operation) => ({
      subscribe: (sink) => ({
        unsubscribe: wsClient.subscribe(operation, sink),
      }),
    })})] : []),

    // Fetch exchange (always last)
    fetchExchange,
  ],
  
  // Default request policy
  requestPolicy: 'cache-first',
  
  // Mask typing issues in development
  suspense: false,
} as ClientOptions);

/**
 * Server-side client for SSR (no auth, direct to Hasura)
 */
export const hasuraSSRClient = new Client({
  url: HASURA_GRAPHQL_URL,
  exchanges: [
    errorExchange({
      onError: (error) => {
        console.error('SSR GraphQL Error:', error);
      },
    }),
    cacheExchange(),
    fetchExchange,
  ],
  requestPolicy: 'network-only', // Always fresh data for SSR
});

/**
 * Admin client with admin secret (for server-side operations)
 */
export const hasuraAdminClient = new Client({
  url: browser ? '/admin/graphql' : HASURA_GRAPHQL_URL,
  exchanges: [
    errorExchange({
      onError: (error) => {
        console.error('Admin GraphQL Error:', error);
      },
    }),
    cacheExchange(),
    fetchExchange,
  ],
  fetchOptions: () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add admin secret for server-side calls
    if (!browser) {
      headers['X-Hasura-Admin-Secret'] = process.env.HASURA_GRAPHQL_ADMIN_SECRET || 'admin-secret';
    }

    return { headers };
  },
  requestPolicy: 'network-only',
});

/**
 * Utility function to get the appropriate client based on context
 */
export const getGraphQLClient = (context: 'user' | 'admin' | 'ssr' = 'user') => {
  switch (context) {
    case 'admin':
      return hasuraAdminClient;
    case 'ssr':
      return hasuraSSRClient;
    case 'user':
    default:
      return hasuraClient;
  }
};

// Export the default client
export default hasuraClient;