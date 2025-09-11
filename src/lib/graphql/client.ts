import { Client, cacheExchange, fetchExchange, subscriptionExchange, errorExchange } from '@urql/core';
import { authExchange } from '@urql/exchange-auth';
import { retryExchange } from '@urql/exchange-retry';
import { createClient as createWSClient } from 'graphql-ws';
import { clientConfig } from '$lib/config.client';
import { goto } from '$app/navigation';
import { browser } from '$app/environment';

/**
 * GraphQL Client Configuration for MountainHR
 * 
 * Provides authenticated GraphQL client with:
 * - JWT authentication with automatic refresh
 * - Real-time subscriptions via WebSocket
 * - Intelligent caching and error handling
 * - Retry logic and rate limiting
 */

// WebSocket client for subscriptions
let wsClient: ReturnType<typeof createWSClient> | null = null;

if (browser) {
  wsClient = createWSClient({
    url: clientConfig.geldbUrl.replace('http://', 'ws://').replace('https://', 'wss://'),
    connectionParams: () => {
      const token = localStorage.getItem('auth-token');
      return token ? { Authorization: `Bearer ${token}` } : {};
    },
    shouldRetry: () => true,
  });
}

// Authentication state management
interface AuthState {
  token: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
}

const getAuthState = (): AuthState => {
  if (!browser) {
    return { token: null, refreshToken: null, expiresAt: null };
  }

  return {
    token: localStorage.getItem('auth-token'),
    refreshToken: localStorage.getItem('refresh-token'),
    expiresAt: localStorage.getItem('auth-expires') 
      ? parseInt(localStorage.getItem('auth-expires')!) 
      : null
  };
};

const setAuthState = (authState: Partial<AuthState>) => {
  if (!browser) return;

  if (authState.token !== undefined) {
    if (authState.token) {
      localStorage.setItem('auth-token', authState.token);
    } else {
      localStorage.removeItem('auth-token');
    }
  }

  if (authState.refreshToken !== undefined) {
    if (authState.refreshToken) {
      localStorage.setItem('refresh-token', authState.refreshToken);
    } else {
      localStorage.removeItem('refresh-token');
    }
  }

  if (authState.expiresAt !== undefined) {
    if (authState.expiresAt) {
      localStorage.setItem('auth-expires', authState.expiresAt.toString());
    } else {
      localStorage.removeItem('auth-expires');
    }
  }
};

// Token refresh mutation
const REFRESH_TOKEN_MUTATION = `
  mutation RefreshToken($refreshToken: String!) {
    refreshToken(refreshToken: $refreshToken) {
      accessToken
      refreshToken
      expiresIn
    }
  }
`;

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
      if (!authState.refreshToken) {
        // No refresh token available, redirect to login
        setAuthState({ token: null, refreshToken: null, expiresAt: null });
        if (browser) {
          goto('/login');
        }
        return;
      }

      try {
        // Create a temporary client for token refresh
        const refreshClient = new Client({
          url: clientConfig.geldbUrl,
          exchanges: [cacheExchange, fetchExchange],
        });

        const result = await refreshClient.mutation(REFRESH_TOKEN_MUTATION, {
          refreshToken: authState.refreshToken
        }).toPromise();

        if (result.data?.refreshToken) {
          const { accessToken, refreshToken: newRefreshToken, expiresIn } = result.data.refreshToken;
          const expiresAt = Date.now() + (expiresIn * 1000);

          authState = {
            token: accessToken,
            refreshToken: newRefreshToken,
            expiresAt
          };

          setAuthState(authState);
        } else {
          // Refresh failed, clear auth and redirect to login
          setAuthState({ token: null, refreshToken: null, expiresAt: null });
          if (browser) {
            goto('/login');
          }
        }
      } catch (error) {
        console.error('Token refresh failed:', error);
        setAuthState({ token: null, refreshToken: null, expiresAt: null });
        if (browser) {
          goto('/login');
        }
      }
    },

    willAuthError() {
      // Check if token is expired or will expire soon (within 5 minutes)
      if (!authState.expiresAt) return false;
      return authState.expiresAt < (Date.now() + 5 * 60 * 1000);
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

  // Add subscription exchange for browser environment
  if (browser && wsClient) {
    exchanges.splice(-1, 0, subscriptionExchange({
      forwardSubscription(request) {
        const input = { ...request, query: request.query || '' };
        return {
          subscribe: (sink) => {
            const unsubscribe = wsClient!.subscribe(input, sink);
            return { unsubscribe };
          },
        };
      },
    }));
  }

  return new Client({
    url: clientConfig.geldbUrl,
    exchanges,
    fetchOptions: () => {
      return {
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Name': 'MountainHR',
          'X-Client-Version': '1.0.0',
        },
      };
    },
  });
};

// Default client instance
export const client = createUrqlClient();

// Authentication helpers
export const setAuthTokens = (tokens: {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}) => {
  const expiresAt = Date.now() + (tokens.expiresIn * 1000);
  
  setAuthState({
    token: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt
  });

  // Reinitialize WebSocket connection with new token
  if (browser && wsClient) {
    wsClient.dispose();
    wsClient = createWSClient({
      url: clientConfig.geldbUrl.replace('http://', 'ws://').replace('https://', 'wss://'),
      connectionParams: () => ({
        Authorization: `Bearer ${tokens.accessToken}`,
      }),
      shouldRetry: () => true,
    });
  }
};

export const clearAuthTokens = () => {
  setAuthState({ token: null, refreshToken: null, expiresAt: null });
  
  // Dispose WebSocket connection
  if (browser && wsClient) {
    wsClient.dispose();
    wsClient = null;
  }
};

export const getAuthToken = (): string | null => {
  return getAuthState().token;
};

export const isAuthenticated = (): boolean => {
  const authState = getAuthState();
  if (!authState.token || !authState.expiresAt) return false;
  
  // Check if token is expired
  return authState.expiresAt > Date.now();
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