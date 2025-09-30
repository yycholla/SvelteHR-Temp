// Standardized server load helpers for consistent error handling and data loading
// T055: Error Handling Standardization - CRITICAL

import type { RequestEvent } from '@sveltejs/kit';
import { safeServerLoad, throwStandardError } from '$lib/utils/error-handling.js';

/**
 * Standardized server load wrapper with authentication and error handling
 */
export async function createServerLoad<T>(
	loadFn: (event: RequestEvent) => Promise<T>,
	options: {
		requireAuth?: boolean;
		requiredPermissions?: string[];
		operation?: string;
	} = {}
) {
	return async (event: RequestEvent) => {
		const { requireAuth = true, requiredPermissions = [], operation } = options;

		// Authentication check
		if (requireAuth && !event.locals.user) {
			throwStandardError(new Error('Authentication required'), {
				userId: undefined,
				path: event.url.pathname,
				operation: operation || `Load ${event.url.pathname}`
			});
		}

		// Permission check
		if (requiredPermissions.length > 0 && event.locals.permissions) {
			const permissions = event.locals.permissions || [];
			const hasPermission = requiredPermissions.some(
				(permission) =>
					permissions.includes(permission) || permissions.includes('*')
			);

			if (!hasPermission) {
				throwStandardError(
					new Error(`Insufficient permissions. Required: ${requiredPermissions.join(', ')}`),
					{
						userId: event.locals.user?.id,
						path: event.url.pathname,
						operation: operation || `Access ${event.url.pathname}`
					}
				);
			}
		}

		// Execute load function with error handling
		return safeServerLoad(() => loadFn(event), {
			userId: event.locals.user?.id,
			path: event.url.pathname,
			operation: operation || `Load ${event.url.pathname}`
		});
	};
}

/**
 * GraphQL query helper with standardized error handling and timeout
 */
export async function executeGraphQLQuery<T>(
	query: string,
	variables?: Record<string, any>,
	options: {
		timeout?: number;
		retries?: number;
		context?: {
			userId?: string;
			operation?: string;
		};
	} = {}
): Promise<T> {
	const { timeout = 30000, retries = 3, context } = options;

	// TODO: Replace with actual GraphQL client when integrated
	// For now, simulate GraphQL query execution
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeout);

	try {
		// Simulate API call with timeout
		const response = await fetch('/api/graphql', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ query, variables }),
			signal: controller.signal
		});

		clearTimeout(timeoutId);

		if (!response.ok) {
			throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`);
		}

		const result = await response.json();

		// Check for GraphQL errors
		if (result.errors) {
			throw new Error(`GraphQL errors: ${result.errors.map((e: any) => e.message).join(', ')}`);
		}

		return result.data;
	} catch (error) {
		clearTimeout(timeoutId);

		// Handle timeout errors
		if (error instanceof Error && error.name === 'AbortError') {
			throwStandardError(new Error('Request timeout'), {
				...context,
				operation: `GraphQL Query${context?.operation ? ` - ${context.operation}` : ''}`
			});
		}

		// Handle other errors
		throwStandardError(error, {
			...context,
			operation: `GraphQL Query${context?.operation ? ` - ${context.operation}` : ''}`
		});
	}
}

/**
 * Database operation helper with standardized error handling
 */
export async function executeDatabaseOperation<T>(
	operation: () => Promise<T>,
	context: {
		userId?: string;
		operation: string;
		tableName?: string;
	}
): Promise<T> {
	try {
		return await operation();
	} catch (error) {
		// Enhance error context with database information
		const enhancedContext = {
			...context,
			operation: `Database ${context.operation}${context.tableName ? ` on ${context.tableName}` : ''}`
		};

		throwStandardError(error, enhancedContext);
	}
}

/**
 * Permission checker helper
 */
export function checkPermissions(
	userPermissions: string[] | undefined,
	requiredPermissions: string[]
): boolean {
	if (!userPermissions) return false;

	// Admin permission grants access to everything
	if (userPermissions.includes('*')) return true;

	// Check if user has any of the required permissions
	return requiredPermissions.some((permission) => userPermissions.includes(permission));
}

/**
 * Role checker helper
 */
export function checkRoles(userRoles: string[] | undefined, requiredRoles: string[]): boolean {
	if (!userRoles) return false;

	// Check if user has any of the required roles
	return requiredRoles.some((role) => userRoles.includes(role));
}

/**
 * Data validation helper with standardized error handling
 */
export async function validateData<T>(
	data: unknown,
	validator: (data: unknown) => Promise<T> | T,
	context: {
		userId?: string;
		operation: string;
		field?: string;
	}
): Promise<T> {
	try {
		return await validator(data);
	} catch (error) {
		const enhancedContext = {
			...context,
			operation: `Data Validation${context.field ? ` for ${context.field}` : ''} - ${context.operation}`
		};

		throwStandardError(error, enhancedContext);
	}
}

/**
 * Cache helper with error handling
 */
export class ServerCache {
	private static cache = new Map<string, { data: any; expiry: number }>();

	static async get<T>(
		key: string,
		fetcher: () => Promise<T>,
		options: {
			ttl?: number; // Time to live in milliseconds
			context?: {
				userId?: string;
				operation?: string;
			};
		} = {}
	): Promise<T> {
		const { ttl = 300000, context } = options; // Default 5 minutes
		const now = Date.now();
		const cached = this.cache.get(key);

		// Return cached data if valid
		if (cached && cached.expiry > now) {
			return cached.data;
		}

		// Fetch new data with error handling
		try {
			const data = await fetcher();

			// Cache the result
			this.cache.set(key, {
				data,
				expiry: now + ttl
			});

			return data;
		} catch (error) {
			throwStandardError(error, {
				...context,
				operation: `Cache Fetch - ${context?.operation || key}`
			});
		}
	}

	static clear(pattern?: string): void {
		if (pattern) {
			// Clear keys matching pattern
			for (const key of this.cache.keys()) {
				if (key.includes(pattern)) {
					this.cache.delete(key);
				}
			}
		} else {
			// Clear all cache
			this.cache.clear();
		}
	}

	static delete(key: string): void {
		this.cache.delete(key);
	}
}

/**
 * Rate limiting helper for server load functions
 */
export class ServerRateLimit {
	private static attempts = new Map<string, { count: number; resetTime: number }>();

	static check(
		identifier: string,
		options: {
			maxAttempts?: number;
			windowMs?: number;
			context?: {
				userId?: string;
				operation?: string;
			};
		} = {}
	): void {
		const { maxAttempts = 100, windowMs = 60000, context } = options; // Default: 100 requests per minute
		const now = Date.now();
		const key = `rate_limit_${identifier}`;

		const attempt = this.attempts.get(key);

		// Reset if window has expired
		if (!attempt || now > attempt.resetTime) {
			this.attempts.set(key, { count: 1, resetTime: now + windowMs });
			return;
		}

		// Check if limit exceeded
		if (attempt.count >= maxAttempts) {
			throwStandardError(new Error('Rate limit exceeded'), {
				...context,
				operation: `Rate Limit Check - ${context?.operation || identifier}`
			});
		}

		// Increment counter
		attempt.count++;
	}

	static clear(identifier?: string): void {
		if (identifier) {
			this.attempts.delete(`rate_limit_${identifier}`);
		} else {
			this.attempts.clear();
		}
	}
}

/**
 * Response timing helper
 */
export function measureResponseTime() {
	const start = Date.now();

	return {
		end: () => Date.now() - start,
		addToHeaders: (headers: Headers) => {
			headers.set('X-Response-Time', `${Date.now() - start}ms`);
		}
	};
}
