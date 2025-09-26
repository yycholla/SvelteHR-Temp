// Centralized GraphQL configuration for maintainable deployments
// T054: GraphQL Configuration Centralization

import { browser } from '$app/environment';
import { authConfig } from '$lib/auth/config.js';

export interface GraphQLConfig {
	// Endpoint Configuration
	endpoints: {
		primary: string;
		fallback?: string;
		subscription?: string;
	};

	// Request Configuration
	request: {
		timeout: number;
		retries: number;
		retryDelay: number;
		batchSize: number;
		enableBatching: boolean;
	};

	// Security Configuration
	security: {
		enableCSRF: boolean;
		requireAuth: boolean;
		allowIntrospection: boolean;
		maxQueryDepth: number;
		maxQueryComplexity: number;
	};

	// Performance Configuration
	performance: {
		enableCaching: boolean;
		cacheMaxAge: number;
		enablePersistentQueries: boolean;
		enableGzipCompression: boolean;
	};

	// Development Configuration
	development: {
		enablePlayground: boolean;
		enableDebugMode: boolean;
		logQueries: boolean;
		logErrors: boolean;
	};
}

// Environment-based endpoint resolution
function getGraphQLEndpoints() {
	const baseUrl = browser
		? window.location.origin
		: process.env.PUBLIC_API_URL || 'http://localhost:4000';

	// Remove any trailing slash
	const cleanBaseUrl = baseUrl.replace(/\/$/, '');

	return {
		// Primary GraphQL endpoint
		primary: `${cleanBaseUrl}/graphql`,

		// Fallback endpoint (if different)
		fallback: `${cleanBaseUrl}/api/graphql`,

		// WebSocket endpoint for subscriptions
		subscription: `${cleanBaseUrl.replace(/^http/, 'ws')}/graphql`
	};
}

// Default configuration
const defaultConfig: GraphQLConfig = {
	endpoints: getGraphQLEndpoints(),

	request: {
		timeout: 30000, // 30 seconds
		retries: 3,
		retryDelay: 1000, // 1 second
		batchSize: 10,
		enableBatching: false // Disabled by default for simplicity
	},

	security: {
		enableCSRF: authConfig.security.enableCSRF,
		requireAuth: true,
		allowIntrospection: process.env.NODE_ENV !== 'production',
		maxQueryDepth: 15,
		maxQueryComplexity: 1000
	},

	performance: {
		enableCaching: true,
		cacheMaxAge: 300000, // 5 minutes
		enablePersistentQueries: true,
		enableGzipCompression: true
	},

	development: {
		enablePlayground: process.env.NODE_ENV === 'development',
		enableDebugMode: process.env.NODE_ENV === 'development',
		logQueries: process.env.NODE_ENV === 'development',
		logErrors: true
	}
};

// Environment-specific overrides
const environmentConfig: Partial<GraphQLConfig> = {
	// Production overrides
	...(process.env.NODE_ENV === 'production' && {
		request: {
			...defaultConfig.request,
			timeout: 15000, // Shorter timeout in production
			enableBatching: true // Enable batching in production
		},
		security: {
			...defaultConfig.security,
			allowIntrospection: false,
			maxQueryDepth: 10, // More restrictive in production
			maxQueryComplexity: 500
		},
		development: {
			...defaultConfig.development,
			enablePlayground: false,
			enableDebugMode: false,
			logQueries: false
		}
	}),

	// Test environment overrides
	...(process.env.NODE_ENV === 'test' && {
		request: {
			...defaultConfig.request,
			timeout: 5000, // Shorter timeout for tests
			retries: 1
		},
		performance: {
			...defaultConfig.performance,
			enableCaching: false // Disable caching in tests
		},
		development: {
			...defaultConfig.development,
			logQueries: false,
			logErrors: false // Reduce noise in test logs
		}
	}),

	// Staging environment overrides
	...(process.env.NODE_ENV === 'staging' && {
		security: {
			...defaultConfig.security,
			allowIntrospection: true // Allow introspection in staging
		},
		development: {
			...defaultConfig.development,
			enableDebugMode: true,
			logQueries: true
		}
	})
};

// Merge configurations with deep merge for nested objects
export const graphqlConfig: GraphQLConfig = {
	...defaultConfig,
	...environmentConfig,
	// Deep merge nested objects
	endpoints: { ...defaultConfig.endpoints, ...environmentConfig.endpoints },
	request: { ...defaultConfig.request, ...environmentConfig.request },
	security: { ...defaultConfig.security, ...environmentConfig.security },
	performance: { ...defaultConfig.performance, ...environmentConfig.performance },
	development: { ...defaultConfig.development, ...environmentConfig.development }
};

// Configuration validation
export function validateGraphQLConfig(config: GraphQLConfig): void {
	// Endpoint validation
	if (!config.endpoints.primary) {
		throw new Error('Primary GraphQL endpoint is required');
	}

	try {
		new URL(config.endpoints.primary);
	} catch {
		throw new Error('Primary GraphQL endpoint must be a valid URL');
	}

	// Request validation
	if (config.request.timeout <= 0) {
		throw new Error('Request timeout must be greater than 0');
	}

	if (config.request.retries < 0) {
		throw new Error('Request retries cannot be negative');
	}

	if (config.request.batchSize <= 0) {
		throw new Error('Batch size must be greater than 0');
	}

	// Security validation
	if (config.security.maxQueryDepth <= 0) {
		throw new Error('Max query depth must be greater than 0');
	}

	if (config.security.maxQueryComplexity <= 0) {
		throw new Error('Max query complexity must be greater than 0');
	}

	// Performance validation
	if (config.performance.cacheMaxAge < 0) {
		throw new Error('Cache max age cannot be negative');
	}
}

// Helper functions for common use cases
export const getGraphQLEndpoint = () => graphqlConfig.endpoints.primary;
export const getGraphQLSubscriptionEndpoint = () => graphqlConfig.endpoints.subscription;
export const getFallbackEndpoint = () => graphqlConfig.endpoints.fallback;

// Request configuration helpers
export const getRequestTimeout = () => graphqlConfig.request.timeout;
export const getMaxRetries = () => graphqlConfig.request.retries;
export const getRetryDelay = () => graphqlConfig.request.retryDelay;
export const isBatchingEnabled = () => graphqlConfig.request.enableBatching;
export const getBatchSize = () => graphqlConfig.request.batchSize;

// Security configuration helpers
export const isIntrospectionAllowed = () => graphqlConfig.security.allowIntrospection;
export const getMaxQueryDepth = () => graphqlConfig.security.maxQueryDepth;
export const getMaxQueryComplexity = () => graphqlConfig.security.maxQueryComplexity;
export const isAuthRequired = () => graphqlConfig.security.requireAuth;

// Performance configuration helpers
export const isCachingEnabled = () => graphqlConfig.performance.enableCaching;
export const getCacheMaxAge = () => graphqlConfig.performance.cacheMaxAge;
export const isPersistentQueriesEnabled = () => graphqlConfig.performance.enablePersistentQueries;
export const isGzipCompressionEnabled = () => graphqlConfig.performance.enableGzipCompression;

// Development configuration helpers
export const isPlaygroundEnabled = () => graphqlConfig.development.enablePlayground;
export const isDebugModeEnabled = () => graphqlConfig.development.enableDebugMode;
export const isQueryLoggingEnabled = () => graphqlConfig.development.logQueries;
export const isErrorLoggingEnabled = () => graphqlConfig.development.logErrors;

// Environment helpers
export const isDevelopment = () => process.env.NODE_ENV === 'development';
export const isProduction = () => process.env.NODE_ENV === 'production';
export const isTest = () => process.env.NODE_ENV === 'test';
export const isStaging = () => process.env.NODE_ENV === 'staging';

// Request headers factory
export function createGraphQLHeaders(
	additionalHeaders: Record<string, string> = {}
): Record<string, string> {
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		...additionalHeaders
	};

	// Add CSRF protection if enabled
	if (graphqlConfig.security.enableCSRF && browser) {
		// Get CSRF token from meta tag or cookie
		const csrfToken =
			document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ||
			document.cookie
				.split('; ')
				.find((row) => row.startsWith('csrf-token='))
				?.split('=')[1];

		if (csrfToken) {
			headers['X-CSRF-Token'] = csrfToken;
		}
	}

	// Add compression headers
	if (graphqlConfig.performance.enableGzipCompression) {
		headers['Accept-Encoding'] = 'gzip, deflate, br';
	}

	return headers;
}

// Validate configuration on module load
validateGraphQLConfig(graphqlConfig);

// Export the complete configuration
export default graphqlConfig;
