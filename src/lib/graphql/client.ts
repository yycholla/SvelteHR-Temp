import { Client, cacheExchange, fetchExchange, errorExchange } from '@urql/core';
import { authExchange } from '@urql/exchange-auth';
import { retryExchange } from '@urql/exchange-retry';
import { goto } from '$app/navigation';
import { browser } from '$app/environment';
import { createPerformanceExchange } from '$lib/performance/graphql-performance-exchange';

/**
 * GraphQL Client Configuration for SvelteHR
 *
 * Provides authenticated GraphQL client with:
 * - Session-based authentication with HTTP-only cookies
 * - Real-time subscriptions via WebSocket
 * - Intelligent caching and error handling
 * - Retry logic and rate limiting
 */

// Default GraphQL endpoint
// Browser: Use relative path (proxied by Caddy) or PUBLIC_API_URL if set
// Server: Use PUBLIC_API_URL from environment or fallback to localhost
const DEFAULT_GRAPHQL_URL = browser
	? (import.meta.env.PUBLIC_API_URL ? `${import.meta.env.PUBLIC_API_URL}/graphql` : '/graphql')
	: 'http://localhost:4000/graphql';
const GRAPHQL_WS_URL = 'ws://localhost:4000/graphql'; // WebSocket endpoint for subscriptions

// Rust GraphQL server uses session-based authorization with HTTP-only cookies
// All GraphQL queries require authentication via session cookies (sent automatically)

// Authentication state management for session-based auth
interface AuthState {
	token: string | null; // Kept for backwards compatibility, but not used for session auth
}

// Session expiration is handled by the server and browser cookies
// No client-side expiration checking needed for session-based auth
let expirationCheckInterval: NodeJS.Timeout | null = null;

const startExpirationCheck = () => {
	// Session-based auth doesn't require client-side expiration checking
	// Server handles session validation and cookie expiration
};

const stopExpirationCheck = () => {
	if (expirationCheckInterval) {
		clearInterval(expirationCheckInterval);
		expirationCheckInterval = null;
	}
};

const getAuthState = (): AuthState => {
	if (!browser) {
		return { token: null };
	}

	// Session-based auth doesn't use client-side tokens
	// Authentication is handled via HTTP-only cookies automatically
	// This function is kept for backwards compatibility
	return { token: null };
};

const setAuthState = (authState: Partial<AuthState>) => {
	if (!browser) return;

	// Session-based auth doesn't store tokens client-side
	// This function is kept for backwards compatibility but does nothing
	// Authentication state is managed server-side via sessions
};

// Session validation via REST API endpoint
const validateTokenViaAPI = async () => {
	const response = await fetch('/api/auth/refresh', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' }
		// No body needed - session cookies are sent automatically
	});

	if (!response.ok) {
		throw new Error('Session validation failed');
	}

	return response.json();
};

// Error exchange for handling GraphQL errors
const customErrorExchange = errorExchange({
	onError: (error, operation) => {
		// Handle authentication errors (session expired/invalid)
		if (
			error.graphQLErrors.some(
				(e) =>
					e.extensions?.code === 'UNAUTHENTICATED' ||
					e.message?.includes('expired') ||
					e.message?.includes('invalid')
			)
		) {
			console.warn('GraphQL authentication error (session expired/invalid):', error.graphQLErrors);

			// Session authentication - redirect to login (server hooks will handle session cleanup)
			if (browser) {
				console.log('🔴 REDIRECT: Session expired/invalid, redirecting to login');

				// Only redirect if we're not already on a login/auth related page
				if (!window.location.pathname.includes('/login')) {
					goto('/login?returnUrl=' + encodeURIComponent(window.location.pathname));
				}
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

// Auth exchange configuration factory (session-based authentication)
const createAuthExchange = (serverSideToken?: string) => {
	return authExchange(async (utils) => {
		return {
			addAuthToOperation(operation) {
				// Session-based authentication uses HTTP-only cookies automatically sent by browser
				// No need to add Authorization headers - cookies are sent automatically
				return operation;
			},

			didAuthError(error) {
				return error.graphQLErrors.some((e) => e.extensions?.code === 'UNAUTHENTICATED');
			},

			async refreshAuth() {
				// Session authentication - if auth fails, redirect to login
				// Session cookies will be cleared by the server hooks
				if (browser) {
					console.log('🔴 REDIRECT: Session authentication failed, redirecting to login');
					goto('/login');
				}
			},

			willAuthError() {
				// Let server handle session validation
				return false;
			}
		};
	});
};

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
export const createUrqlClient = (fetchFn?: typeof fetch, authToken?: string, url?: string) => {
	// Override auth token if provided (for browser)
	if (authToken && browser) {
		setAuthState({ token: authToken });
	}

	// Determine GraphQL URL
	let graphqlUrl = url || DEFAULT_GRAPHQL_URL;

	// If running on server without explicit URL, try to get from environment
	if (!browser && !url) {
		try {
			// Use PUBLIC_API_URL if available (containerized environment)
			const publicApiUrl = process.env.PUBLIC_API_URL;
			if (publicApiUrl) {
				graphqlUrl = `${publicApiUrl}/graphql`;
			}
		} catch {
			// Use default if environment check fails
		}
	}

	const exchanges = [
		cacheExchange,
		customErrorExchange,
		retryConfig,
		createAuthExchange(authToken), // Pass authToken for server-side support
		createPerformanceExchange({
			enabled: true,
			trackAllOperations: true,
			slowQueryThreshold: 200, // 200ms budget
			enableCacheTracking: true,
			enableComplexityAnalysis: true
		}),
		fetchExchange
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
		url: graphqlUrl,
		exchanges,
		fetch: fetchFn,
		fetchOptions: () => {
			const headers: Record<string, string> = {
				'Content-Type': 'application/json'
			};

			// Session-based authentication - no need to add Authorization headers
			// Cookies are sent automatically for both client and server requests
			// IMPORTANT: credentials: 'include' is required to send HTTP-only cookies

			return {
				method: 'POST',
				headers,
				credentials: 'include' as RequestCredentials
			};
		},
		preferGetMethod: false
	});
};

// Default client instance
export const client = createUrqlClient();

// Authentication helpers for session-based auth (backwards compatibility)
export const setJwtToken = (jwtToken: string) => {
	// Session-based auth doesn't use client-side tokens
	// This function is kept for backwards compatibility
	console.warn('setJwtToken called - session-based auth does not use client-side tokens');
};

export const clearAuthTokens = () => {
	// Session cleanup is handled server-side
	stopExpirationCheck();
};

export const getAuthToken = (): string | null => {
	// Session-based auth doesn't expose tokens client-side
	return null;
};

export const isAuthenticated = (): boolean => {
	if (!browser) return false;

	// For session-based auth, we can't easily check authentication status client-side
	// The server hooks handle authentication validation
	// This is a best-effort check - assume authenticated if we have a session cookie
	try {
		return document.cookie.includes('hr_session');
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
export type { Client, CombinedError, Operation, OperationResult } from '@urql/core';

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

// Session-based authentication doesn't require client-side expiration checking
// Authentication is handled server-side via session validation
