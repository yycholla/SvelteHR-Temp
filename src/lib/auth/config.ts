/**
 * Centralized Authentication Configuration
 *
 * Session-based authentication with HTTP-only cookies.
 * The application uses axum-login backend for secure session management.
 */

import { browser } from '$app/environment';

export interface AuthConfig {
	// API Configuration
	api: {
		baseUrl: string;
		authEndpoint: string;
		logoutEndpoint: string;
		verifyEndpoint: string;
	};

	// Session Cookie Configuration (PRIMARY - session-based auth)
	sessionCookies: {
		cookieName: string;
		cookieOptions: {
			httpOnly: boolean;
			secure: boolean;
			sameSite: 'strict' | 'lax' | 'none';
			path: string;
			maxAge: number; // seconds (30 minutes default)
			domain?: string;
		};
		timeout: number; // minutes
		renewalThreshold: number; // minutes before expiry to renew
	};

	// Security Configuration
	security: {
		requireHttps: boolean;
		enableCSRF: boolean;
		rateLimit: {
			enabled: boolean;
			maxAttempts: number;
			windowMs: number;
		};
	};
}

const isBrowser = typeof browser !== 'undefined' && browser;

// Default configuration - Session-based auth is PRIMARY
const defaultConfig: AuthConfig = {
	api: {
		baseUrl: import.meta.env.PUBLIC_API_URL || 'http://localhost:4000',
		authEndpoint: '/auth/login',
		logoutEndpoint: '/auth/logout',
		verifyEndpoint: '/auth/verify'
	},

	// Session Cookie Configuration (PRIMARY - session-based auth)
	sessionCookies: {
		cookieName: 'hr_token', // Backend sets this cookie name
		cookieOptions: {
			httpOnly: true,
			secure:
				!isBrowser || (typeof window !== 'undefined' && window.location.protocol === 'https:'),
			sameSite: 'lax', // Changed from 'strict' for better compatibility
			path: '/',
			maxAge: 24 * 60 * 60 // 24 hours (backend manages actual expiry)
		},
		timeout: 24 * 60, // 24 hours
		renewalThreshold: 60 // Renew 1 hour before expiry
	},

	security: {
		requireHttps: process.env.NODE_ENV === 'production',
		enableCSRF: true,
		rateLimit: {
			enabled: true,
			maxAttempts: 5,
			windowMs: 15 * 60 * 1000 // 15 minutes
		}
	}
};

// Environment-specific overrides
const environmentConfig: Partial<AuthConfig> = {
	// Development overrides
	...(process.env.NODE_ENV === 'development' && {
		api: {
			baseUrl: import.meta.env.PUBLIC_API_URL || 'http://localhost:4000',
			authEndpoint: '/auth/login',
			logoutEndpoint: '/auth/logout',
			verifyEndpoint: '/auth/verify'
		}
	}),

	// Test overrides
	...(process.env.NODE_ENV === 'test' && {
		sessionCookies: {
			...defaultConfig.sessionCookies,
			timeout: 5, // Short timeout for tests (minutes)
			renewalThreshold: 2 // Renew 2 minutes before expiry in tests
		},
		security: {
			...defaultConfig.security,
			rateLimit: {
				...defaultConfig.security.rateLimit,
				enabled: false // Disable rate limiting in tests
			}
		}
	})
};

// Merge configurations
export const authConfig: AuthConfig = {
	...defaultConfig,
	...environmentConfig,
	// Deep merge nested objects
	api: { ...defaultConfig.api, ...environmentConfig.api },
	sessionCookies: {
		...defaultConfig.sessionCookies,
		...environmentConfig.sessionCookies,
		cookieOptions: {
			...defaultConfig.sessionCookies.cookieOptions,
			...environmentConfig.sessionCookies?.cookieOptions
		}
	},
	security: {
		...defaultConfig.security,
		...environmentConfig.security,
		rateLimit: {
			...defaultConfig.security.rateLimit,
			...environmentConfig.security?.rateLimit
		}
	}
};

/**
 * Validate authentication configuration
 * Focuses on session-based authentication settings
 */
export function validateAuthConfig(config: AuthConfig): void {
	// Session Cookie validation (PRIMARY)
	if (!config.sessionCookies.cookieName) {
		throw new Error('Session cookie name is required');
	}

	if (config.sessionCookies.timeout <= 0) {
		throw new Error('Session timeout must be greater than 0 minutes');
	}

	if (config.sessionCookies.renewalThreshold >= config.sessionCookies.timeout) {
		throw new Error('Session renewal threshold must be less than session timeout');
	}

	// API validation
	if (!config.api.baseUrl) {
		throw new Error('API base URL is required');
	}

	try {
		new URL(config.api.baseUrl);
	} catch {
		throw new Error('API base URL must be a valid URL');
	}

	// Note: We don't validate HTTPS for baseUrl because in Docker/production environments,
	// the backend may use HTTP internally (with Caddy handling HTTPS termination).
	// Client code uses relative URLs (/api/auth/*) which inherit the page's protocol.
}

// Validate configuration on module load
validateAuthConfig(authConfig);

/**
 * Helper Functions
 */

// API endpoint helpers
// Returns SvelteKit API routes (e.g., /api/auth/login) which proxy to backend
// Client-side code should ALWAYS use these routes, never call backend directly
export const getAuthEndpoints = () => ({
	login: '/api/auth/login',
	logout: '/api/auth/logout',
	verify: '/api/auth/verify'
});

// Session cookie helpers
export const getSessionCookieName = () => authConfig.sessionCookies.cookieName;
export const getSessionCookieOptions = () => authConfig.sessionCookies.cookieOptions;

// Environment helpers
export const isDevelopment = () => process.env.NODE_ENV === 'development';
export const isProduction = () => process.env.NODE_ENV === 'production';
export const isTest = () => process.env.NODE_ENV === 'test';
