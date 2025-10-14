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

// Default GraphQL endpoint for browser (Rust GraphQL API with JWT authentication)
const DEFAULT_GRAPHQL_URL = 'http://localhost:4000/graphql';
const GRAPHQL_WS_URL = 'ws://localhost:4000/graphql'; // WebSocket endpoint for subscriptions

// Rust GraphQL server uses Guard-based authorization with JWT Bearer tokens
// All GraphQL queries require authentication via Authorization: Bearer <token> header

// Authentication state management for PostGraphile JWT
interface AuthState {
	token: string | null;
}

// JWT expiration checker
let expirationCheckInterval: NodeJS.Timeout | null = null;

const startExpirationCheck = () => {
	if (!browser || expirationCheckInterval) return;

	expirationCheckInterval = setInterval(() => {
		const token = getAuthState().token;
		if (!token) return;

		try {
			// Parse JWT to check expiration
			const [, payload] = token.split('.');
			const decodedPayload = JSON.parse(atob(payload));
			const currentTime = Math.floor(Date.now() / 1000);

			if (decodedPayload.exp && decodedPayload.exp <= currentTime) {
				console.log('⏰ JWT token expired, redirecting to login');
				setAuthState({ token: null });
				localStorage.removeItem('postgraphile-jwt-token');

				if (!window.location.pathname.includes('/login')) {
					goto('/login?returnUrl=' + encodeURIComponent(window.location.pathname));
				}
			}
		} catch (error) {
			console.error('Error checking JWT expiration:', error);
		}
	}, 30000); // Check every 30 seconds
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

	// Get JWT token from localStorage or cookies (Rust server uses hr_token cookie)
	// Try localStorage first for backwards compatibility, then check cookies
	let token = localStorage.getItem('postgraphile-jwt-token');

	// If no token in localStorage, try to get from cookie
	if (!token && document.cookie) {
		const cookies = document.cookie.split(';').map((c) => c.trim());
		const hrTokenCookie = cookies.find((c) => c.startsWith('hr_token='));
		if (hrTokenCookie) {
			token = hrTokenCookie.split('=')[1];
		}
	}

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
		// Handle authentication errors (including expired tokens)
		if (
			error.graphQLErrors.some(
				(e) =>
					e.extensions?.code === 'UNAUTHENTICATED' ||
					e.message?.includes('expired') ||
					e.message?.includes('invalid')
			)
		) {
			console.warn('GraphQL authentication error (token expired/invalid):', error.graphQLErrors);

			// Clear invalid token and redirect to login
			if (browser) {
				console.log('🔴 REDIRECT: Token expired/invalid, clearing auth and redirecting to login');
				setAuthState({ token: null });
				localStorage.removeItem('postgraphile-jwt-token');

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

// Auth exchange configuration factory (creates auth exchange with server-side token support)
const createAuthExchange = (serverSideToken?: string) => {
	return authExchange(async (utils) => {
		return {
			addAuthToOperation(operation) {
				// On server-side, use the provided token parameter
				// On client-side, get token from localStorage/cookies
				let token: string | null = null;

				if (!browser && serverSideToken) {
					// Server-side: use token passed to createUrqlClient
					token = serverSideToken;
				} else {
					// Client-side: get from storage
					const authState = getAuthState();
					token = authState.token;
				}

				if (!token) return operation;

				return utils.appendHeaders(operation, {
					Authorization: `Bearer ${token}`
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
			// Use VITE_API_URL if available (containerized environment)
			const viteApiUrl = process.env.VITE_API_URL;
			if (viteApiUrl) {
				graphqlUrl = `${viteApiUrl}/graphql`;
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

			// For server-side requests, add auth token directly to headers
			if (!browser && authToken) {
				headers['Authorization'] = `Bearer ${authToken}`;
			}

			return {
				method: 'POST',
				headers
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
	stopExpirationCheck();

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

// Start JWT expiration checking
if (browser) {
	startExpirationCheck();
}

// Start JWT expiration checking
if (browser) {
	startExpirationCheck();
}
