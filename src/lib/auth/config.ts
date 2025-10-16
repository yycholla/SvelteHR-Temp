// Centralized authentication configuration
// T052: Authentication System Unification

import { browser } from '$app/environment';

export interface AuthConfig {
	// JWT Configuration
	jwt: {
		issuer: string;
		audience: string;
		algorithm: string;
		expirationTime: string;
		refreshThreshold: number; // Minutes before expiry to refresh
	};

	// Token Storage Configuration (JWT - legacy)
	tokens: {
		accessTokenName: string;
		refreshTokenName: string;
		storageType: 'cookie' | 'localStorage' | 'sessionStorage';
		cookieOptions: {
			httpOnly: boolean;
			secure: boolean;
			sameSite: 'strict' | 'lax' | 'none';
			path: string;
			maxAge: number; // seconds
		};
	};

	// API Configuration
	api: {
		baseUrl: string;
		authEndpoint: string;
		refreshEndpoint: string;
		logoutEndpoint: string;
		verifyEndpoint: string;
	};

	// Session Management Configuration (JWT session behavior)
	sessionManagement: {
		timeout: number; // minutes
		warningTime: number; // minutes before timeout to warn
		extendOnActivity: boolean;
	};

	// Session Cookie Configuration (new session-based auth)
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

// Default configuration
const defaultConfig: AuthConfig = {
	jwt: {
		issuer: 'postgraphile-hr',
		audience: 'postgraphile-hr',
		algorithm: 'HS256',
		expirationTime: '1h',
		refreshThreshold: 5 // Refresh 5 minutes before expiry
	},

	tokens: {
		accessTokenName: 'hr_token',
		refreshTokenName: 'hr_refresh_token',
		storageType: 'cookie',
		cookieOptions: {
			httpOnly: true,
			secure: !browser || window.location.protocol === 'https:',
			sameSite: 'lax',
			path: '/',
			maxAge: 60 * 60 * 24 * 7 // 7 days
		}
	},

	api: {
		baseUrl:
			process.env.NODE_ENV === 'production'
				? 'https://api.postgraphile-hr.com'
				: 'http://localhost:4000',
		authEndpoint: '/auth/login',
		refreshEndpoint: '/auth/refresh',
		logoutEndpoint: '/auth/logout',
		verifyEndpoint: '/auth/verify'
	},

	// Session Management Configuration (JWT session behavior)
	sessionManagement: {
		timeout: 60 * 8, // 8 hours
		warningTime: 5, // Warn 5 minutes before timeout
		extendOnActivity: true
	},

	// Session Cookie Configuration (new session-based auth)
	sessionCookies: {
		cookieName: 'hr_session',
		cookieOptions: {
			httpOnly: true,
			secure: !browser || window.location.protocol === 'https:',
			sameSite: 'strict',
			path: '/',
			maxAge: 30 * 60 // 30 minutes
		},
		timeout: 30, // 30 minutes
		renewalThreshold: 5 // Renew 5 minutes before expiry
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
			...defaultConfig.api,
			baseUrl: process.env.PUBLIC_API_URL || 'http://localhost:4000'
		},
		security: {
			...defaultConfig.security,
			requireHttps: false
		}
	}),

	// Test overrides
	...(process.env.NODE_ENV === 'test' && {
		sessionManagement: {
			...defaultConfig.sessionManagement,
			timeout: 5 // Short timeout for tests
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
	jwt: { ...defaultConfig.jwt, ...environmentConfig.jwt },
	tokens: {
		...defaultConfig.tokens,
		...environmentConfig.tokens,
		cookieOptions: {
			...defaultConfig.tokens.cookieOptions,
			...environmentConfig.tokens?.cookieOptions
		}
	},
	api: { ...defaultConfig.api, ...environmentConfig.api },
	sessionManagement: { ...defaultConfig.sessionManagement, ...environmentConfig.sessionManagement },
	sessionCookies: { ...defaultConfig.sessionCookies, ...environmentConfig.sessionCookies },
	security: {
		...defaultConfig.security,
		...environmentConfig.security,
		rateLimit: {
			...defaultConfig.security.rateLimit,
			...environmentConfig.security?.rateLimit
		}
	}
};

// Configuration validation
export function validateAuthConfig(config: AuthConfig): void {
	// JWT validation
	if (!config.jwt.issuer) {
		throw new Error('JWT issuer is required');
	}

	if (!config.jwt.audience) {
		throw new Error('JWT audience is required');
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

	// Security validation
	if (config.security.requireHttps && !config.api.baseUrl.startsWith('https://')) {
		throw new Error('HTTPS is required in production but API base URL is not HTTPS');
	}

	// Session validation
	if (config.sessionManagement.timeout <= config.sessionManagement.warningTime) {
		throw new Error('Session timeout must be greater than warning time');
	}

	if (config.jwt.refreshThreshold >= 60) {
		throw new Error('JWT refresh threshold must be less than 60 minutes');
	}
}

// Validate configuration on module load
validateAuthConfig(authConfig);

// Token name helpers
export const getAccessTokenName = () => authConfig.tokens.accessTokenName;
export const getRefreshTokenName = () => authConfig.tokens.refreshTokenName;

// API endpoint helpers
export const getAuthEndpoints = () => ({
	login: `${authConfig.api.baseUrl}${authConfig.api.authEndpoint}`,
	refresh: `${authConfig.api.baseUrl}${authConfig.api.refreshEndpoint}`,
	logout: `${authConfig.api.baseUrl}${authConfig.api.logoutEndpoint}`,
	verify: `${authConfig.api.baseUrl}${authConfig.api.verifyEndpoint}`
});

// Cookie options helper
export const getCookieOptions = () => authConfig.tokens.cookieOptions;

// Environment helpers
export const isDevelopment = () => process.env.NODE_ENV === 'development';
export const isProduction = () => process.env.NODE_ENV === 'production';
export const isTest = () => process.env.NODE_ENV === 'test';
