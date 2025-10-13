import { dev } from '$app/environment';
import { getGraphQLEndpoint } from './api-url';
import type { Cookies } from '@sveltejs/kit';

export interface GraphQLError {
	message: string;
	extensions?: {
		code?: string;
		[key: string]: any;
	};
	path?: string[];
}

export interface GraphQLResponse<T = any> {
	data?: T;
	errors?: GraphQLError[];
}

export interface GraphQLClientOptions {
	maxRetries?: number;
	retryDelay?: number;
	timeout?: number;
}

export class GraphQLClient {
	private endpoint: string;
	private options: Required<GraphQLClientOptions>;
	private token: string | null = null;

	constructor(options: GraphQLClientOptions = {}) {
		this.endpoint = getGraphQLEndpoint();
		this.options = {
			maxRetries: options.maxRetries ?? 3,
			retryDelay: options.retryDelay ?? 1000,
			timeout: options.timeout ?? 30000
		};
	}

	/**
	 * Set authentication token for requests
	 */
	setToken(token: string | null): void {
		this.token = token;
	}

	/**
	 * Set token from cookies
	 */
	setTokenFromCookies(cookies: Cookies): void {
		const hrToken = cookies.get('hr_token');
		const postgraphileToken = cookies.get('postgraphile-jwt-token');
		const authToken = cookies.get('auth-token');

		const token = hrToken || postgraphileToken || authToken;
		this.token = token || null;

		// Debug JWT token selection
		if (dev) {
			console.log('🔐 JWT Token Debug:', {
				hr_token: hrToken ? 'present' : 'missing',
				postgraphile_jwt_token: postgraphileToken ? 'present' : 'missing',
				auth_token: authToken ? 'present' : 'missing',
				selected: token ? 'token found' : 'no token',
				tokenPrefix: token ? token.substring(0, 20) + '...' : 'none'
			});
		}
	}

	/**
	 * Execute a GraphQL query
	 */
	async query<T = any>(
		query: string,
		variables?: Record<string, any>
	): Promise<GraphQLResponse<T>> {
		return this.execute<T>(query, variables);
	}

	/**
	 * Execute a GraphQL mutation
	 */
	async mutation<T = any>(
		mutation: string,
		variables?: Record<string, any>
	): Promise<GraphQLResponse<T>> {
		return this.execute<T>(mutation, variables);
	}

	/**
	 * Execute a GraphQL operation with retry logic
	 */
	private async execute<T = any>(
		operation: string,
		variables?: Record<string, any>
	): Promise<GraphQLResponse<T>> {
		return this.withRetry(async () => {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);

			try {
				const headers: HeadersInit = {
					'Content-Type': 'application/json',
					'Accept': 'application/json'
				};

				// Add JWT Bearer token for Rust GraphQL API authentication
				if (this.token) {
					headers['Authorization'] = `Bearer ${this.token}`;
				}

				const response = await fetch(this.endpoint, {
					method: 'POST',
					headers,
					body: JSON.stringify({
						query: operation,
						variables
					}),
					signal: controller.signal
				});

				clearTimeout(timeoutId);

				if (!response.ok) {
					// Try to get error details from response body
					const errorText = await response.text();
					console.error(`❌ GraphQL HTTP ${response.status}:`, errorText.substring(0, 500));
					throw new Error(`GraphQL endpoint returned ${response.status}`);
				}

				const result = await response.json();

				// Log GraphQL errors if present
				if (result.errors && result.errors.length > 0) {
					console.error(`❌ GraphQL returned ${result.errors.length} error(s):`);
					result.errors.forEach((err: GraphQLError, idx: number) => {
						console.error(`  Error ${idx + 1}:`, {
							message: err.message,
							path: err.path,
							extensions: err.extensions
						});
					});
				}

				return result as GraphQLResponse<T>;
			} catch (error) {
				clearTimeout(timeoutId);

				if (error instanceof Error && error.name === 'AbortError') {
					throw new Error(`GraphQL request timeout after ${this.options.timeout}ms`);
				}

				throw error;
			}
		});
	}

	/**
	 * Execute an operation with retry logic
	 */
	async withRetry<T>(
		operation: () => Promise<T>,
		retries: number = this.options.maxRetries
	): Promise<T> {
		let lastError: Error | null = null;

		for (let attempt = 0; attempt <= retries; attempt++) {
			try {
				const result = await operation();

				// Check for GraphQL errors that shouldn't be retried
				if (this.isGraphQLResponse(result)) {
					const errors = result.errors;
					if (errors?.some(e => this.isNonRetriableError(e))) {
						return result;
					}
					if (errors?.length && attempt < retries) {
						// GraphQL errors might be retriable (e.g., temporary database issues)
						lastError = new Error(errors[0].message);
						await this.sleep(this.options.retryDelay * Math.pow(2, attempt));
						continue;
					}
				}

				return result;
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error));

				if (dev && attempt < retries) {
					console.log(`🔄 Retrying GraphQL operation (attempt ${attempt + 1}/${retries + 1})`);
				}

				if (attempt < retries) {
					// Exponential backoff
					await this.sleep(this.options.retryDelay * Math.pow(2, attempt));
				}
			}
		}

		throw lastError || new Error('Operation failed after retries');
	}

	/**
	 * Check if a value is a GraphQL response
	 */
	private isGraphQLResponse(value: any): value is GraphQLResponse {
		return value && (typeof value === 'object') && ('data' in value || 'errors' in value);
	}

	/**
	 * Check if an error is non-retriable
	 */
	private isNonRetriableError(error: GraphQLError): boolean {
		const code = error.extensions?.code;
		// Don't retry client errors
		return code === 'BAD_REQUEST' ||
			   code === 'GRAPHQL_VALIDATION_FAILED' ||
			   code === 'FORBIDDEN' ||
			   code === 'UNAUTHENTICATED';
	}

	/**
	 * Handle GraphQL errors
	 */
	handleError(error: unknown): {
		message: string;
		code?: string;
		details?: any;
	} {
		if (error instanceof Error) {
			return {
				message: error.message,
				code: 'NETWORK_ERROR'
			};
		}

		if (this.isGraphQLResponse(error) && error.errors?.length) {
			const firstError = error.errors[0];
			return {
				message: firstError.message,
				code: firstError.extensions?.code,
				details: firstError.extensions
			};
		}

		return {
			message: 'An unknown error occurred',
			code: 'UNKNOWN_ERROR'
		};
	}

	/**
	 * Sleep helper for retry logic
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	/**
	 * Create a client instance with token from cookies
	 */
	static fromCookies(cookies: Cookies, options?: GraphQLClientOptions): GraphQLClient {
		const client = new GraphQLClient(options);
		client.setTokenFromCookies(cookies);
		return client;
	}
}

// Export singleton instance for cases where token isn't needed
export const graphqlClient = new GraphQLClient();