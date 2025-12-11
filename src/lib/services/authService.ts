import { logger } from '$lib/utils/logger';
// Authentication service for session-based authentication
// Session management using axum-login backend with HTTP-only cookies

import { browser } from '$app/environment';
import { goto } from '$app/navigation';

// Authentication interfaces
export interface LoginCredentials {
	email: string;
	password: string;
}

export interface LoginResponse {
	success: boolean;
	token?: string;
	user?: {
		id: string;
		email: string;
		displayName: string;
		roles: string[];
	};
	error?: string;
	message?: string;
}

export interface AuthUser {
	id: string;
	email: string;
	displayName: string;
	firstName?: string;
	lastName?: string;
	isActive: boolean;
	onboardingStatus: string;
}

// Auth service configuration for session-based authentication
const AUTH_CONFIG = {
	apiBaseUrl:
		browser && typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000',
	endpoints: {
		login: '/api/auth/login',
		logout: '/api/auth/logout',
		verify: '/api/auth/verify'
	}
};

/**
 * Login function that authenticates with session-based backend
 */
export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
	try {
		logger.info('🔐 AuthService: Attempting login for', credentials.email);

		if (!credentials.email || !credentials.password) {
			return {
				success: false,
				error: 'Invalid credentials',
				message: 'Email and password are required'
			};
		}

		try {
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(credentials),
				credentials: 'include' // Include session cookies
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				return {
					success: false,
					error: errorData.error || 'Authentication failed',
					message: errorData.message || 'Invalid credentials'
				};
			}

			const authData = await response.json();

			// Session cookie is automatically set by backend - no client-side storage needed
			return {
				success: true,
				user: authData.user,
				message: 'Login successful'
			};
		} catch (apiError) {
			logger.error('Authentication API error:', apiError);
			return {
				success: false,
				error: 'Unable to connect to authentication service',
				message: 'Please try again later'
			};
		}
	} catch (error) {
		logger.error('Catch failed', error as Error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Login failed',
			message: 'An error occurred during login'
		};
	}
}

/**
 * Logout function that clears session server-side
 */
export async function logout(): Promise<{ success: boolean; message?: string }> {
	try {
		logger.info('🔓 AuthService: Logging out');

		// Call backend logout endpoint to clear session
		await fetch(AUTH_CONFIG.endpoints.logout, {
			method: 'POST',
			credentials: 'include' // Include session cookies for server-side session clearing
		}).catch((err) => logger.warn('Logout endpoint failed:'.replace(/['`]$/, `: ${err}'`/)));

		return {
			success: true,
			message: 'Logout successful'
		};
	} catch (error) {
		logger.error('Catch failed', error as Error);
		return {
			success: false,
			message: 'An error occurred during logout'
		};
	}
}

/**
 * Verify current session
 */
export async function verifySession(): Promise<{
	valid: boolean;
	user?: AuthUser;
	error?: string;
}> {
	try {
		logger.info('🔍 AuthService: Verifying session');

		const response = await fetch(AUTH_CONFIG.endpoints.verify, {
			method: 'GET',
			credentials: 'include' // Include session cookies
		});

		if (!response.ok) {
			return {
				valid: false,
				error: 'Session invalid or expired'
			};
		}

		const data = await response.json();

		if (data.user) {
			return {
				valid: true,
				user: {
					id: data.user.id,
					email: data.user.email,
					displayName: data.user.displayName || data.user.email.split('@')[0],
					firstName: data.user.firstName,
					lastName: data.user.lastName,
					isActive: data.user.isActive !== false,
					onboardingStatus: data.user.onboardingStatus || 'active'
				}
			};
		}

		return {
			valid: false,
			error: 'No user data in response'
		};
	} catch (error) {
		logger.error('Catch failed', error as Error);
		return {
			valid: false,
			error: error instanceof Error ? error.message : 'Session verification failed'
		};
	}
}

/**
 * Check if user is currently authenticated (via session)
 */
export async function isAuthenticated(): Promise<boolean> {
	const result = await verifySession();
	return result.valid;
}

/**
 * Handle authentication errors and redirect to login if needed
 */
export function handleAuthError(error: any, redirectToLogin = true): void {
	logger.error('Handle auth error failed', error as Error);

	// Redirect to login page if requested and in browser
	if (redirectToLogin && browser) {
		const currentPath = window.location.pathname;
		const returnUrl = currentPath !== '/' ? `?returnUrl=${encodeURIComponent(currentPath)}` : '';
		goto(`/login${returnUrl}`);
	}
}

/**
 * Initialize authentication state
 */
export async function initializeAuth(): Promise<{
	isAuthenticated: boolean;
	user: AuthUser | null;
}> {
	const result = await verifySession();

	logger.info('🔧 AuthService: Initialized', { authenticated: result.valid, user: result.user });

	return {
		isAuthenticated: result.valid,
		user: result.user || null
	};
}

// Export configuration for advanced use cases
export { AUTH_CONFIG };
