/**
 * Authentication Service for PostGraphile HR Application
 *
 * Handles authentication operations including login, logout, token management,
 * and integration with the PostGraphile backend authentication system.
 */

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

// Auth service configuration
const AUTH_CONFIG = {
	apiBaseUrl: browser ? window.location.origin : 'http://localhost:4000',
	endpoints: {
		login: '/api/auth/login',
		logout: '/api/auth/logout',
		verify: '/api/auth/verify',
		refresh: '/api/auth/refresh'
	},
	tokenStorage: {
		key: 'postgraphile-jwt-token',
		cookieName: 'hr_token'
	}
};

/**
 * Login function that authenticates with PostGraphile backend
 */
export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
	try {
		// For now, return a mock successful login response
		// In a real implementation, this would make an API call to PostGraphile
		console.log('🔐 AuthService: Attempting login for', credentials.email);

		// Mock authentication - in real implementation this would be an API call
		if (credentials.email && credentials.password) {
			const mockToken = 'mock-jwt-token-' + Date.now();
			const mockUser = {
				id: '1',
				email: credentials.email,
				displayName: credentials.email.split('@')[0],
				roles: ['Employee']
			};

			// Store token if in browser
			if (browser) {
				localStorage.setItem(AUTH_CONFIG.tokenStorage.key, mockToken);
			}

			return {
				success: true,
				token: mockToken,
				user: mockUser,
				message: 'Login successful'
			};
		} else {
			return {
				success: false,
				error: 'Invalid credentials',
				message: 'Email and password are required'
			};
		}
	} catch (error) {
		console.error('🔴 AuthService: Login error:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Login failed',
			message: 'An error occurred during login'
		};
	}
}

/**
 * Logout function that clears authentication state
 */
export async function logout(): Promise<{ success: boolean; message?: string }> {
	try {
		console.log('🔓 AuthService: Logging out');

		// Clear stored token
		if (browser) {
			localStorage.removeItem(AUTH_CONFIG.tokenStorage.key);

			// Clear any auth cookies
			document.cookie = `${AUTH_CONFIG.tokenStorage.cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
		}

		// In a real implementation, this would also call the backend logout endpoint
		// await fetch(AUTH_CONFIG.endpoints.logout, { method: 'POST' });

		return {
			success: true,
			message: 'Logout successful'
		};
	} catch (error) {
		console.error('🔴 AuthService: Logout error:', error);
		return {
			success: false,
			message: 'An error occurred during logout'
		};
	}
}

/**
 * Verify current authentication token
 */
export async function verifyToken(token?: string): Promise<{
	valid: boolean;
	user?: AuthUser;
	error?: string;
}> {
	try {
		const authToken = token || (browser ? localStorage.getItem(AUTH_CONFIG.tokenStorage.key) : null);

		if (!authToken) {
			return {
				valid: false,
				error: 'No token provided'
			};
		}

		// For now, return a mock verification response
		// In a real implementation, this would validate the JWT token
		console.log('🔍 AuthService: Verifying token');

		// Mock token validation
		if (authToken.startsWith('mock-jwt-token')) {
			return {
				valid: true,
				user: {
					id: '1',
					email: 'user@example.com',
					displayName: 'Mock User',
					firstName: 'Mock',
					lastName: 'User',
					isActive: true,
					onboardingStatus: 'completed'
				}
			};
		}

		return {
			valid: false,
			error: 'Invalid token format'
		};
	} catch (error) {
		console.error('🔴 AuthService: Token verification error:', error);
		return {
			valid: false,
			error: error instanceof Error ? error.message : 'Token verification failed'
		};
	}
}

/**
 * Get current authentication token
 */
export function getAuthToken(): string | null {
	if (!browser) return null;
	return localStorage.getItem(AUTH_CONFIG.tokenStorage.key);
}

/**
 * Check if user is currently authenticated
 */
export function isAuthenticated(): boolean {
	const token = getAuthToken();
	return !!token;
}

/**
 * Refresh authentication token
 */
export async function refreshToken(): Promise<{
	success: boolean;
	token?: string;
	error?: string;
}> {
	try {
		console.log('🔄 AuthService: Refreshing token');

		// For now, return the existing token
		// In a real implementation, this would call the refresh endpoint
		const currentToken = getAuthToken();

		if (currentToken) {
			return {
				success: true,
				token: currentToken
			};
		}

		return {
			success: false,
			error: 'No token to refresh'
		};
	} catch (error) {
		console.error('🔴 AuthService: Token refresh error:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Token refresh failed'
		};
	}
}

/**
 * Handle authentication errors and redirect to login if needed
 */
export function handleAuthError(error: any, redirectToLogin = true): void {
	console.error('🔴 AuthService: Authentication error:', error);

	// Clear invalid tokens
	if (browser) {
		localStorage.removeItem(AUTH_CONFIG.tokenStorage.key);
	}

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
export function initializeAuth(): {
	isAuthenticated: boolean;
	token: string | null;
} {
	const token = getAuthToken();
	const authenticated = isAuthenticated();

	console.log('🔧 AuthService: Initialized', { authenticated, hasToken: !!token });

	return {
		isAuthenticated: authenticated,
		token
	};
}

// Export configuration for advanced use cases
export { AUTH_CONFIG };