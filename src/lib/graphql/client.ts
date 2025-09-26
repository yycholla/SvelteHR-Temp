import { Client, cacheExchange, fetchExchange, errorExchange } from '@urql/core';
import { authExchange } from '@urql/exchange-auth';
import { retryExchange } from '@urql/exchange-retry';
import { goto } from '$app/navigation';
import { browser } from '$app/environment';
import { createPerformanceExchange } from '$lib/performance/graphql-performance-exchange';

/**
 * PostGraphile GraphQL Client Configuration for SvelteHR
 *
 * Provides authenticated GraphQL client with:
 * - JWT authentication with PostGraphile permissions
 * - Real-time subscriptions via WebSocket
 * - Intelligent caching and error handling
 * - Retry logic and rate limiting
 */

// PostGraphile GraphQL endpoint - use directly for better integration
const POSTGRAPHILE_GRAPHQL_URL = browser
	? 'http://localhost:4000/graphql' // Direct to PostGraphile in browser
	: 'http://localhost:4000/graphql'; // Direct to PostGraphile on server
const POSTGRAPHILE_GRAPHQL_WS_URL = 'ws://localhost:4000/graphql'; // Direct to PostGraphile for WebSockets if needed

// WebSocket subscriptions are disabled for PostGraphile (doesn't support WebSockets by default)

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

	// Get JWT token from localStorage
	const token = localStorage.getItem('postgraphile-jwt-token');
	return { token };
};

const setAuthState = (authState: Partial<AuthState>) => {
	if (!browser) return;

	if (authState.token !== undefined) {
		if (authState.token) {
			localStorage.setItem('postgraphile-jwt-token', authState.token);
		} else {
			localStorage.removeItem('postgraphile-jwt-token');
		}
	}
};

// Token validation via REST API endpoint (PostGraphile uses longer-lived JWTs)
const validateTokenViaAPI = async () => {
	const response = await fetch('/api/auth/refresh', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' }
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
		if (error.graphQLErrors.some((e) => e.extensions?.code === 'UNAUTHENTICATED')) {
			console.warn('GraphQL UNAUTHENTICATED error:', error.graphQLErrors);

			// Only redirect if we're not already on a login/auth related page
			// This prevents redirect loops when the user is already authenticated
			if (
				browser &&
				!window.location.pathname.includes('/login') &&
				!window.location.pathname.includes('/admin')
			) {
				console.log('🔴 REDIRECT: GraphQL client UNAUTHENTICATED error calling goto("/login")');
				setAuthState({ token: null });
				goto('/login?returnUrl=' + encodeURIComponent(window.location.pathname));
			} else {
				console.log('Not redirecting - already on auth-related page or admin page');
			}
		}

		// Handle rate limiting
		if (error.graphQLErrors.some((e) => e.extensions?.code === 'RATE_LIMIT_EXCEEDED')) {
			console.warn('Rate limit exceeded for operation:', operation.key);
		}

		// Handle network errors
		if (error.networkError) {
			console.error('Network error:', error.networkError);

			// Dispatch custom event for offline handling
			if (browser) {
				window.dispatchEvent(
					new CustomEvent('network-error', {
						detail: { error: error.networkError, operation }
					})
				);
			}
		}

		// Log other GraphQL errors
		error.graphQLErrors.forEach(({ message, extensions }) => {
			console.error('GraphQL error:', message, extensions);
		});
	}
});

// Auth exchange configuration for PostGraphile
const authConfig = authExchange(async (utils) => {
	return {
		addAuthToOperation(operation) {
			const authState = getAuthState();
			if (!authState.token) return operation;

			return utils.appendHeaders(operation, {
				Authorization: `Bearer ${authState.token}`
			});
		},

		didAuthError(error) {
			return error.graphQLErrors.some((e) => e.extensions?.code === 'UNAUTHENTICATED');
		},

		async refreshAuth() {
			// With PostGraphile, JWT tokens are self-contained and don't refresh
			// If authentication fails, clear token and redirect to login
			setAuthState({ token: null });
			if (browser) {
				console.log('🔴 REDIRECT: GraphQL client refreshAuth function calling goto("/login")');
				goto('/login');
			}
		},

		willAuthError() {
			// Let PostGraphile handle JWT validation
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
		return !!(
			error.networkError ||
			error.graphQLErrors.some(
				(e) =>
					e.extensions?.code === 'INTERNAL_ERROR' || e.extensions?.code === 'RATE_LIMIT_EXCEEDED'
			)
		);
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
		createPerformanceExchange({
			enabled: true,
			trackAllOperations: true,
			slowQueryThreshold: 200, // 200ms budget
			enableCacheTracking: true,
			enableComplexityAnalysis: true
		}),
		fetchFn ? fetchExchange.bind(null, fetchFn) : fetchExchange
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
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				}
			};
		},
		preferGetMethod: false
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
};

export const getAuthToken = (): string | null => {
	return getAuthState().token;
};

export const isAuthenticated = (): boolean => {
	if (!browser) return false;

	const token = getAuthState().token;
	if (!token) return false;

	try {
		const [, payload] = token.split('.');
		const decodedPayload = JSON.parse(atob(payload));
		const currentTime = Math.floor(Date.now() / 1000);

		return decodedPayload.exp ? decodedPayload.exp > currentTime : false;
	} catch {
		return false;
	}
};

// Network status monitoring
export const networkStatus = {
	isOnline: browser ? navigator.onLine : true,
	lastError: null as Error | null
};

if (browser) {
	window.addEventListener('online', () => {
		networkStatus.isOnline = true;
		window.dispatchEvent(
			new CustomEvent('network-status-change', {
				detail: { isOnline: true }
			})
		);
	});

	window.addEventListener('offline', () => {
		networkStatus.isOnline = false;
		window.dispatchEvent(
			new CustomEvent('network-status-change', {
				detail: { isOnline: false }
			})
		);
	});

	window.addEventListener('network-error', ((event: CustomEvent) => {
		networkStatus.lastError = event.detail.error;
	}) as EventListener);
}

// Export types for TypeScript support
export type { Client, CombinedError } from '@urql/core';
export type { Operation, OperationResult, Exchange } from '../types/urql.js';

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
