/**
 * Environment variable validation and configuration for GraphQL integration
 */

import { env } from '$env/dynamic/private';

// Safe access to potentially undefined environment variables
const getPublicEnv = (key: string): string | undefined => {
	try {
		// Access environment variables through process.env for compatibility
		return process.env[key] || undefined;
	} catch {
		return undefined;
	}
};

// Public environment variables (may not exist in all environments)
const PUBLIC_API_URL = getPublicEnv('PUBLIC_API_URL');
const PUBLIC_GELDB_URL = getPublicEnv('PUBLIC_GELDB_URL');

// Safe environment variable access
const getEnvVar = (key: string, defaultValue = ''): string => {
	return (env as any)[key] ?? defaultValue;
};

const getPublicEnvVar = (value: string | undefined, defaultValue = ''): string => {
	return value ?? defaultValue;
};

// Validate required environment variables
export function validateGraphQLEnvironment() {
	const errors: string[] = [];
	const warnings: string[] = [];

	// Get environment variables with safe access
	const geldbUrl = getPublicEnvVar(PUBLIC_GELDB_URL);
	const geldbSecretKey = getEnvVar('GELDB_SECRET_KEY');
	const complexityLimit = getEnvVar('GRAPHQL_COMPLEXITY_LIMIT', '200');
	const rateLimit = getEnvVar('GRAPHQL_RATE_LIMIT', '100');
	const enableIntrospection = getEnvVar('GRAPHQL_ENABLE_INTROSPECTION', 'false');
	const enablePlayground = getEnvVar('GRAPHQL_ENABLE_PLAYGROUND', 'false');

	// Check GelDB URL (public) - only warn if missing in development
	if (!geldbUrl) {
		if (process.env.NODE_ENV === 'development') {
			warnings.push('PUBLIC_GELDB_URL not set - GraphQL features may be limited');
		} else {
			errors.push('PUBLIC_GELDB_URL is required for GraphQL proxy in production');
		}
	} else {
		try {
			new URL(geldbUrl);
		} catch {
			errors.push('PUBLIC_GELDB_URL must be a valid URL');
		}
	}

	// Check GelDB secret key (private) - only warn if missing in development
	if (!geldbSecretKey) {
		if (process.env.NODE_ENV === 'development') {
			warnings.push('GELDB_SECRET_KEY not set - database authentication may fail');
		} else {
			errors.push('GELDB_SECRET_KEY is required for database authentication in production');
		}
	}

	// Log warnings
	if (warnings.length > 0) {
		console.warn('GraphQL environment warnings:', warnings.join(', '));
	}

	// Only throw on errors, not warnings
	if (errors.length > 0) {
		throw new Error(`GraphQL environment validation failed:\n${errors.join('\n')}`);
	}

	return {
		geldbUrl: geldbUrl || 'http://localhost:9944',
		geldbSecretKey: geldbSecretKey || 'dev-secret',
		complexityLimit: parseInt(complexityLimit),
		rateLimit: parseInt(rateLimit),
		enableIntrospection: enableIntrospection === 'true',
		enablePlayground: enablePlayground === 'true'
	};
}

// Configuration object for GraphQL settings
export const GRAPHQL_CONFIG = {
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

	// Query timeout in milliseconds - environment-specific with proven safe values
	queryTimeout: process.env.NODE_ENV === 'production' 
		? 15000  // Proven safe production value
		: 30000, // Development can be more lenient

	// Enable query caching
	enableCaching: true,

	// Cache TTL in seconds - optimized for real-world usage patterns
	cacheTTL: process.env.NODE_ENV === 'production'
		? 180   // 3 minutes in production for fresher data
		: 300,  // 5 minutes in development

	// Maximum query depth - validated against schema complexity
	maxQueryDepth: 10,

	// Performance monitoring thresholds
	slowQueryThreshold: 5000, // Warn on queries > 5 seconds
	timeoutWarningThreshold: 10000, // Warn at 10s, fail at timeout
	enableTimeoutMetrics: true,

	// Cache optimization
	maxCacheSize: 200, // Increased from 100 for better hit rates
	cacheCleanupInterval: 300000, // Clean up every 5 minutes
};

// Also export with the old name for backward compatibility
export const graphqlConfig = GRAPHQL_CONFIG;

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
	geldb: `${getPublicEnvVar(PUBLIC_GELDB_URL, 'http://localhost:9944')}/db/main/ext/graphql`,
	playground: '/api/graphql/playground',
	introspection: '/api/graphql/introspection',
	api: getPublicEnvVar(PUBLIC_API_URL, 'http://localhost:8080')
};