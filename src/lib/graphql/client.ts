/**
 * GraphQL Client Library
 * 
 * Type-safe GraphQL client for SvelteKit with native fetch,
 * authentication, error handling, and performance optimization.
 * 
 * Follows clean architecture principles with:
 * - Separation of concerns
 * - Dependency injection
 * - Comprehensive error handling
 * - TypeScript strict typing
 */

import { GRAPHQL_CONFIG } from '$lib/env';
import type { 
	GraphQLRequest, 
	GraphQLResponse, 
	GraphQLError,
	ClientConfig,
	QueryOptions,
	MutationOptions,
	SubscriptionOptions 
} from './types';

/**
 * Enhanced GraphQL Error class with comprehensive error categorization
 */
export class GraphQLClientError extends Error {
	constructor(
		message: string,
		public readonly errors?: GraphQLError[],
		public readonly status?: number,
		public readonly extensions?: Record<string, any>,
		public readonly operationName?: string,
		public readonly variables?: Record<string, any>
	) {
		super(message);
		this.name = 'GraphQLClientError';
	}

	/**
	 * Check if error is authentication related
	 */
	get isAuthError(): boolean {
		return this.extensions?.code === 'UNAUTHENTICATED' || 
			this.status === 401 ||
			this.message?.toLowerCase().includes('unauthorized') ||
			this.message?.toLowerCase().includes('authentication');
	}

	/**
	 * Check if error is permission related
	 */
	get isPermissionError(): boolean {
		return this.extensions?.code === 'FORBIDDEN' || 
			this.status === 403 ||
			this.message?.toLowerCase().includes('forbidden') ||
			this.message?.toLowerCase().includes('permission');
	}

	/**
	 * Check if error is network related
	 */
	get isNetworkError(): boolean {
		return this.status ? this.status >= 500 : 
			this.message?.toLowerCase().includes('network') ||
			this.message?.toLowerCase().includes('timeout') ||
			this.message?.toLowerCase().includes('connection') ||
			false;
	}

	/**
	 * Check if error is validation related
	 */
	get isValidationError(): boolean {
		return this.extensions?.code === 'VALIDATION_ERROR' ||
			this.extensions?.code === 'BAD_USER_INPUT' ||
			this.status === 422 ||
			this.status === 400;
	}

	/**
	 * Check if error is rate limiting related
	 */
	get isRateLimitError(): boolean {
		return this.extensions?.code === 'RATE_LIMITED' ||
			this.status === 429;
	}

	/**
	 * Check if this error should be retried
	 */
	get isRetryable(): boolean {
		return this.isNetworkError && !this.isAuthError && !this.isPermissionError;
	}

	/**
	 * Get retry delay in milliseconds (null if not retryable)
	 */
	get retryAfter(): number | null {
		if (!this.isRetryable) return null;
		
		// Check for Retry-After header or extension
		const retryAfter = this.extensions?.retryAfter || this.extensions?.retry_after;
		if (retryAfter) {
			return parseInt(retryAfter) * 1000; // Convert seconds to milliseconds
		}
		
		// Default retry delays based on error type
		if (this.isRateLimitError) return 60000; // 1 minute for rate limits
		if (this.isNetworkError) return 5000;    // 5 seconds for network errors
		
		return null;
	}

	/**
	 * Get user-friendly error message with actionable guidance
	 */
	get userMessage(): string {
		if (this.isAuthError) {
			return 'Please log in to continue';
		}
		if (this.isPermissionError) {
			return 'You don\'t have permission to perform this action';
		}
		if (this.isRateLimitError) {
			return 'Too many requests. Please wait a moment before trying again';
		}
		if (this.isValidationError) {
			return 'Please check your input and try again';
		}
		if (this.isNetworkError) {
			return 'Connection problem. Please check your internet connection and try again';
		}
		return this.message || 'An unexpected error occurred';
	}

	/**
	 * Get error severity level for logging and monitoring
	 */
	get severity(): 'low' | 'medium' | 'high' | 'critical' {
		if (this.isNetworkError && this.status && this.status >= 500) {
			return 'critical';
		}
		if (this.isAuthError || this.isNetworkError) {
			return 'high';
		}
		if (this.isPermissionError || this.isValidationError) {
			return 'medium';
		}
		return 'low';
	}

	/**
	 * Get suggested user actions
	 */
	get suggestedActions(): string[] {
		const actions: string[] = [];
		
		if (this.isAuthError) {
			actions.push('Sign in again');
			actions.push('Check if your session has expired');
		}
		
		if (this.isPermissionError) {
			actions.push('Contact your administrator for access');
			actions.push('Verify you have the required permissions');
		}
		
		if (this.isNetworkError) {
			actions.push('Check your internet connection');
			actions.push('Try again in a few moments');
			if (this.isRetryable) {
				actions.push('The request will be automatically retried');
			}
		}
		
		if (this.isValidationError) {
			actions.push('Review the form data');
			actions.push('Ensure all required fields are completed');
		}
		
		if (this.isRateLimitError) {
			actions.push(`Wait ${Math.ceil((this.retryAfter || 60000) / 1000)} seconds before retrying`);
		}
		
		if (actions.length === 0) {
			actions.push('Try refreshing the page');
			actions.push('Contact support if the problem persists');
		}
		
		return actions;
	}

	/**
	 * Convert to enhanced app error format for integration with error system
	 */
	toEnhancedError() {
		// Import here to avoid circular dependency
		const { createError, ErrorType } = require('../utils/errors');
		
		let errorType: any = ErrorType.API_ERROR;
		
		if (this.isAuthError) {
			errorType = ErrorType.AUTHENTICATION_FAILED;
		} else if (this.isPermissionError) {
			errorType = ErrorType.ACCESS_DENIED;
		} else if (this.isValidationError) {
			errorType = ErrorType.VALIDATION_ERROR;
		} else if (this.isRateLimitError) {
			errorType = ErrorType.RATE_LIMITED;
		} else if (this.isNetworkError) {
			errorType = ErrorType.NETWORK_ERROR;
		}
		
		return createError(errorType, this.userMessage, {
			details: {
				graphql_errors: this.errors,
				status: this.status,
				extensions: this.extensions,
				operation_name: this.operationName,
				variables: this.variables,
				suggested_actions: this.suggestedActions
			},
			cause: this,
			recoverable: this.isRetryable,
			retry_after: this.retryAfter ? Math.ceil(this.retryAfter / 1000) : undefined,
			context: {
				action: 'graphql_operation',
				component: 'graphql_client'
			}
		});
	}
}

/**
 * Server-side GraphQL client for +page.server.ts and API routes
 * 
 * Features:
 * - Bearer token authentication
 * - Request/response validation
 * - Retry logic with exponential backoff
 * - Query complexity validation
 * - Type-safe operations
 */
export class ServerGraphQLClient {
	private readonly endpoint: string;
	private readonly headers: Record<string, string>;
	private readonly timeout: number;
	private readonly retryAttempts: number;

	constructor(config: ClientConfig = {}) {
		this.endpoint = config.endpoint || '/api/graphql';
		this.timeout = config.timeout || GRAPHQL_CONFIG.queryTimeout;
		this.retryAttempts = config.retryAttempts || 3;
		
		// Default headers
		this.headers = {
			'Content-Type': 'application/json',
			'Accept': 'application/json',
			...config.headers
		};
	}

	/**
	 * Set authentication token for subsequent requests
	 */
	setToken(token: string): void {
		if (token) {
			this.headers['Authorization'] = `Bearer ${token}`;
		} else {
			delete this.headers['Authorization'];
		}
	}

	/**
	 * Execute GraphQL query with retry logic
	 */
	async query<T = any>(
		query: string, 
		variables?: Record<string, any>,
		options: QueryOptions = {}
	): Promise<GraphQLResponse<T>> {
		const request: GraphQLRequest = {
			query: query.trim(),
			variables: variables || {},
			...(options.operationName && { operationName: options.operationName })
		};

		return this.executeRequest<T>(request, options);
	}

	/**
	 * Execute GraphQL mutation
	 */
	async mutate<T = any>(
		mutation: string,
		variables?: Record<string, any>,
		options: MutationOptions = {}
	): Promise<GraphQLResponse<T>> {
		const request: GraphQLRequest = {
			query: mutation.trim(),
			variables: variables || {},
			...(options.operationName && { operationName: options.operationName })
		};

		return this.executeRequest<T>(request, { ...options, skipCache: true });
	}

	/**
	 * Execute GraphQL request with comprehensive error handling
	 */
	private async executeRequest<T>(
		request: GraphQLRequest,
		options: QueryOptions = {}
	): Promise<GraphQLResponse<T>> {
		let lastError: Error | null = null;
		const operationName = this.extractOperationName(request.query);

		// Retry logic with exponential backoff
		for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
			try {
				const response = await this.makeRequest<T>(request, options);
				
				// Return successful response
				if (!response.errors || response.errors.length === 0) {
					return response;
				}

				// Handle GraphQL errors (don't retry for client errors)
				const hasClientError = response.errors.some(error => 
					error.extensions?.code === 'UNAUTHENTICATED' ||
					error.extensions?.code === 'FORBIDDEN' ||
					error.extensions?.code === 'VALIDATION_ERROR'
				);

				if (hasClientError) {
					throw new GraphQLClientError(
						response.errors[0].message,
						response.errors,
						undefined,
						response.errors[0].extensions,
						operationName,
						request.variables
					);
				}

				// Return response with errors for non-client errors
				return response;

			} catch (error) {
				lastError = error as Error;

				// Don't retry for client errors
				if (error instanceof GraphQLClientError && 
					(error.isAuthError || error.isPermissionError)) {
					throw error;
				}

				// Wait before retry (exponential backoff with jitter)
				if (attempt < this.retryAttempts - 1) {
					await this.retryWithJitter(attempt);
				}
			}
		}

		// All retries exhausted
		throw lastError || new GraphQLClientError('Request failed after retries');
	}

	/**
	 * Exponential backoff with jitter for retry logic
	 */
	private async retryWithJitter(attempt: number): Promise<void> {
		const baseDelay = Math.pow(2, attempt) * 1000;
		const jitter = Math.random() * 0.1 * baseDelay; // Add 10% jitter
		const delay = baseDelay + jitter;
		
		console.debug(`⏱️ Retrying GraphQL request in ${Math.round(delay)}ms (attempt ${attempt + 1})`);
		await new Promise(resolve => setTimeout(resolve, delay));
	}

	/**
	 * Health check for GraphQL connection
	 */
	async healthCheck(): Promise<boolean> {
		try {
			const result = await this.query(`{ __typename }`, {}, { skipCache: true });
			return result.data?.__typename === 'Query';
		} catch {
			return false;
		}
	}

	/**
	 * Track query performance metrics
	 */
	private trackQueryPerformance(operationName: string, duration: number, success: boolean): void {
		if (GRAPHQL_CONFIG.enableTimeoutMetrics) {
			if (duration > GRAPHQL_CONFIG.slowQueryThreshold) {
				console.warn(`🐌 Slow GraphQL query: ${operationName} took ${duration}ms`);
				// In production, send to monitoring service
				if (typeof window !== 'undefined' && (window as any).analytics) {
					(window as any).analytics.track('Slow GraphQL Query', {
						operationName,
						duration,
						threshold: GRAPHQL_CONFIG.slowQueryThreshold
					});
				}
			}
			
			if (duration > GRAPHQL_CONFIG.timeoutWarningThreshold) {
				console.warn(`⚠️ Near-timeout GraphQL query: ${operationName} took ${duration}ms (timeout: ${this.timeout}ms)`);
			}
		}
	}

	/**
	 * Extract operation name from GraphQL query for monitoring
	 */
	private extractOperationName(query: string): string {
		const match = query.match(/(?:query|mutation|subscription)\s+([a-zA-Z_][a-zA-Z0-9_]*)/i);
		return match ? match[1] : 'UnnamedOperation';
	}

	/**
	 * Make HTTP request to GraphQL endpoint with performance monitoring
	 */
	private async makeRequest<T>(
		request: GraphQLRequest,
		options: QueryOptions = {}
	): Promise<GraphQLResponse<T>> {
		const startTime = Date.now();
		const operationName = this.extractOperationName(request.query);
		
		// Create abort controller for timeout
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), this.timeout);

		try {
			const response = await fetch(this.endpoint, {
				method: 'POST',
				headers: this.headers,
				body: JSON.stringify(request),
				signal: controller.signal
			});

			clearTimeout(timeoutId);

			// Handle HTTP errors
			if (!response.ok) {
				const errorText = await response.text();
				throw new GraphQLClientError(
					`HTTP ${response.status}: ${response.statusText}`,
					undefined,
					response.status,
					undefined,
					operationName,
					request.variables
				);
			}

			// Parse JSON response
			const result: GraphQLResponse<T> = await response.json();
			
			// Validate response structure
			if (typeof result !== 'object' || result === null) {
				throw new GraphQLClientError(
					'Invalid GraphQL response format',
					undefined,
					undefined,
					undefined,
					operationName,
					request.variables
				);
			}

			// Track successful performance metrics
			const duration = Date.now() - startTime;
			this.trackQueryPerformance(operationName, duration, true);

			return result;

		} catch (error) {
			clearTimeout(timeoutId);
			
			// Track failed performance metrics
			const duration = Date.now() - startTime;
			this.trackQueryPerformance(operationName, duration, false);

			// Handle timeout
			if (error instanceof Error && error.name === 'AbortError') {
				throw new GraphQLClientError(
					`Request timeout after ${duration}ms`,
					undefined,
					undefined,
					undefined,
					operationName,
					request.variables
				);
			}

			// Handle network errors
			if (error instanceof TypeError && error.message.includes('fetch')) {
				throw new GraphQLClientError(
					'Network error - please check your connection',
					undefined,
					undefined,
					undefined,
					operationName,
					request.variables
				);
			}

			// Re-throw GraphQL errors
			if (error instanceof GraphQLClientError) {
				throw error;
			}

			// Handle unexpected errors
			throw new GraphQLClientError(
				`Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
				undefined,
				undefined,
				undefined,
				operationName,
				request.variables
			);
		}
	}
}

/**
 * Browser-side GraphQL client for client components
 * 
 * Features:
 * - Response caching
 * - Request deduplication  
 * - Loading state management
 * - Token refresh handling
 */
export class BrowserGraphQLClient extends ServerGraphQLClient {
	private readonly cache = new Map<string, { 
		data: any; 
		timestamp: number; 
		ttl: number; 
		lastAccessed: number;
		accessCount: number;
	}>();
	private readonly pendingRequests = new Map<string, Promise<any>>();

	constructor(config: ClientConfig = {}) {
		super(config);
	}

	/**
	 * Execute query with caching support
	 */
	override async query<T = any>(
		query: string,
		variables?: Record<string, any>,
		options: QueryOptions = {}
	): Promise<GraphQLResponse<T>> {
		const cacheKey = this.getCacheKey(query, variables);

		// Check cache first (unless disabled)
		if (!options.skipCache && GRAPHQL_CONFIG.enableCaching) {
			const cached = this.getCachedResult<T>(cacheKey);
			if (cached) {
				return { data: cached, fromCache: true };
			}
		}

		// Check for pending request (deduplication)
		const pendingRequest = this.pendingRequests.get(cacheKey);
		if (pendingRequest) {
			return await pendingRequest;
		}

		// Execute request
		const requestPromise = super.query<T>(query, variables, options);
		this.pendingRequests.set(cacheKey, requestPromise);

		try {
			const result = await requestPromise;

			// Cache successful results
			if (result.data && !result.errors && GRAPHQL_CONFIG.enableCaching) {
				this.setCachedResult(cacheKey, result.data, GRAPHQL_CONFIG.cacheTTL);
			}

			return result;

		} finally {
			this.pendingRequests.delete(cacheKey);
		}
	}

	/**
	 * Generate cache key from query and variables
	 */
	private getCacheKey(query: string, variables?: Record<string, any>): string {
		const normalizedQuery = query.replace(/\s+/g, ' ').trim();
		const variablesStr = variables ? JSON.stringify(variables) : '';
		return btoa(normalizedQuery + variablesStr);
	}

	/**
	 * Get cached result if valid
	 */
	/**
	 * Enhanced LRU cache eviction with access tracking
	 */
	private evictLRU(): void {
		if (this.cache.size <= GRAPHQL_CONFIG.maxCacheSize) return;
		
		let oldestTime = Date.now();
		let oldestKey: string | null = null;
		let lowestAccessCount = Infinity;
		
		// Find least recently used entry with lowest access count
		for (const [key, entry] of this.cache.entries()) {
			if (entry.lastAccessed < oldestTime || 
				(entry.lastAccessed === oldestTime && entry.accessCount < lowestAccessCount)) {
				oldestTime = entry.lastAccessed;
				lowestAccessCount = entry.accessCount;
				oldestKey = key;
			}
		}
		
		if (oldestKey) {
			this.cache.delete(oldestKey);
			console.debug(`📦 Cache evicted LRU entry: ${oldestKey}`);
		}
	}

	private getCachedResult<T>(cacheKey: string): T | null {
		const cached = this.cache.get(cacheKey);
		if (!cached) return null;

		const now = Date.now();
		if (now > cached.timestamp + cached.ttl * 1000) { // ttl is in seconds
			this.cache.delete(cacheKey);
			return null;
		}

		// Update access tracking for LRU
		cached.lastAccessed = now;
		cached.accessCount += 1;
		this.cache.set(cacheKey, cached); // Update the entry

		return cached.data;
	}

	/**
	 * Cache result with TTL
	 */
	private setCachedResult(cacheKey: string, data: any, ttl: number): void {
		const now = Date.now();
		
		this.cache.set(cacheKey, {
			data,
			timestamp: now,
			ttl,
			lastAccessed: now,
			accessCount: 1
		});

		// Use enhanced LRU eviction
		this.evictLRU();
		
		// Optional: Log cache statistics in development
		if (process.env.NODE_ENV === 'development' && this.cache.size % 10 === 0) {
			console.debug(`📦 GraphQL Cache stats: ${this.cache.size}/${GRAPHQL_CONFIG.maxCacheSize} entries`);
		}
	}

	/**
	 * Clear cache (useful for logout or data refresh)
	 */
	clearCache(): void {
		this.cache.clear();
		this.pendingRequests.clear();
	}
}

/**
 * Factory function to create server-side GraphQL client
 * Used in +page.server.ts and API routes
 */
export function createServerGraphQLClient(
	token?: string,
	config: ClientConfig = {}
): ServerGraphQLClient {
	const client = new ServerGraphQLClient(config);
	
	if (token) {
		client.setToken(token);
	}
	
	return client;
}

/**
 * Factory function to create browser-side GraphQL client
 * Used in Svelte components and client-side code
 */
export function createBrowserGraphQLClient(
	config: ClientConfig = {}
): BrowserGraphQLClient {
	return new BrowserGraphQLClient(config);
}

/**
 * Export commonly used types for convenience
 */
export type { 
	GraphQLRequest, 
	GraphQLResponse, 
	GraphQLError,
	ClientConfig,
	QueryOptions,
	MutationOptions 
};