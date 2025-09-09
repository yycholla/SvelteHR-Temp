/**
 * Environment variable validation and configuration for GraphQL integration
 */

import { env } from '$env/dynamic/private';
import { PUBLIC_GELDB_URL } from '$env/static/public';

// Validate required environment variables
export function validateGraphQLEnvironment() {
	const errors: string[] = [];

	// Check GelDB URL (public)
	if (!PUBLIC_GELDB_URL) {
		errors.push('PUBLIC_GELDB_URL is required for GraphQL proxy');
	} else {
		try {
			new URL(PUBLIC_GELDB_URL);
		} catch {
			errors.push('PUBLIC_GELDB_URL must be a valid URL');
		}
	}

	// Check GelDB secret key (private)
	if (!env.GELDB_SECRET_KEY) {
		errors.push('GELDB_SECRET_KEY is required for database authentication');
	}

	// Check GraphQL-specific settings
	if (!env.GRAPHQL_COMPLEXITY_LIMIT) {
		console.warn('GRAPHQL_COMPLEXITY_LIMIT not set, using default: 200');
	}

	if (!env.GRAPHQL_RATE_LIMIT) {
		console.warn('GRAPHQL_RATE_LIMIT not set, using default: 100 queries/hour');
	}

	if (errors.length > 0) {
		throw new Error(`GraphQL environment validation failed:\n${errors.join('\n')}`);
	}

	return {
		geldbUrl: PUBLIC_GELDB_URL,
		geldbSecretKey: env.GELDB_SECRET_KEY,
		complexityLimit: parseInt(env.GRAPHQL_COMPLEXITY_LIMIT || '200'),
		rateLimit: parseInt(env.GRAPHQL_RATE_LIMIT || '100'),
		enableIntrospection: env.GRAPHQL_ENABLE_INTROSPECTION === 'true',
		enablePlayground: env.GRAPHQL_ENABLE_PLAYGROUND === 'true'
	};
}

// Configuration object for GraphQL settings
export const graphqlConfig = {
	// Default complexity limits by role
	complexityLimits: {
		Admin: 1000,
		HR_Manager: 500,
		Manager: 300,
		Employee: 200
	},
	
	// Rate limits by role (queries per hour)
	rateLimits: {
		Admin: 1000,
		HR_Manager: 500,
		Manager: 300,
		Employee: 100
	},

	// Query timeout in milliseconds
	queryTimeout: 30000,

	// Enable query caching
	enableCaching: true,

	// Cache TTL in seconds
	cacheTTL: 300,

	// Maximum query depth
	maxQueryDepth: 10
};

// Development utilities
export function isDevelopment(): boolean {
	return process.env.NODE_ENV === 'development';
}

export function isProduction(): boolean {
	return process.env.NODE_ENV === 'production';
}

// GraphQL endpoint URLs
export const graphqlEndpoints = {
	proxy: '/api/graphql',
	geldb: `${PUBLIC_GELDB_URL}/db/main/ext/graphql`,
	playground: '/api/graphql/playground',
	introspection: '/api/graphql/introspection'
};