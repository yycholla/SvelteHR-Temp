// Secure Authentication service for session-based authentication
// Session management using axum-login backend with HTTP-only cookies

import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import {
	authConfig,
	getAuthEndpoints
} from './config.js';

export interface AuthState {
	isAuthenticated: boolean;
	user: {
		id: string;
		email: string;
		displayName: string;
		role: string;
	} | null;
	permissions: string[];
	sessionExpires: Date | null;
}

export interface LoginCredentials {
	email: string;
	password: string;
}

export interface LoginResponse {
	success: boolean;
	user?: {
		id: string;
		email: string;
		role: string;
	};
	sessionExpires?: string;
	error?: string;
}

class SecureAuthService {
	private authState: AuthState = {
		isAuthenticated: false,
		user: null,
		permissions: [],
		sessionExpires: null
	};

	private readonly endpoints = getAuthEndpoints();
	private rateLimitMap = new Map<string, { count: number; resetTime: number }>();

	/**
	 * Initialize the auth service and check for existing session
	 */
	async initialize(): Promise<void> {
		if (!browser) return;

		try {
			// Check if we have a valid session by calling the verify endpoint
			const response = await fetch('/api/auth/verify', {
				method: 'GET',
				credentials: 'include'
			});

			if (response.ok) {
				const data = await response.json();
				if (data.user) {
					this.authState.isAuthenticated = true;
					this.authState.user = data.user;
					this.authState.permissions = data.permissions || [];
					this.authState.sessionExpires = data.sessionExpires ? new Date(data.sessionExpires) : null;
				}
			}
		} catch (error) {
			console.error('Auth service initialization failed:', error);
			await this.logout();
		}
	}

	/**
	 * Login with email and password (with rate limiting)
	 */
	async login(credentials: LoginCredentials): Promise<LoginResponse> {
		// Check rate limiting
		if (!this.checkRateLimit(credentials.email)) {
			return {
				success: false,
				error: 'Too many login attempts. Please try again later.'
			};
		}

		try {
			const response = await fetch(this.endpoints.login, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(credentials),
				credentials: 'include'
			});

			const data = await response.json();

			if (!response.ok) {
				this.recordFailedAttempt(credentials.email);
				return {
					success: false,
					error: data.message || 'Login failed'
				};
			}

			// Clear rate limit on successful login
			this.clearRateLimit(credentials.email);

			// For session-based auth, the session cookie is automatically handled by the browser
			// We don't need to store tokens - just update the auth state
			this.authState.isAuthenticated = true;
			this.authState.user = data.user;
			this.authState.sessionExpires = data.sessionExpires ? new Date(data.sessionExpires) : null;

			return {
				success: true,
				user: data.user,
				sessionExpires: data.sessionExpires
			};
		} catch (error) {
			console.error('Login error:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Network error'
			};
		}
	}

	/**
	 * Logout and clear session with server-side invalidation
	 */
	async logout(): Promise<void> {
		try {
			// Call logout endpoint to clear session
			fetch(this.endpoints.logout, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'include'
			}).catch((err) => console.warn('Logout endpoint failed:', err));
		} catch (error) {
			console.warn('Logout request failed:', error);
		} finally {
			// Always clean up local state
			this.resetAuthState();
			this.clearAllRateLimits();

			// Redirect to login page
			if (browser) {
				goto('/login');
			}
		}
	}

	/**
	 * Refresh session (no-op for session-based auth - sessions are automatically refreshed by backend)
	 */
	async refreshSession(): Promise<boolean> {
		// Session-based auth automatically refreshes sessions on the backend
		// No client-side action required
		return true;
	}

	/**
	 * Get current authentication state
	 */
	getAuthState(): AuthState {
		return { ...this.authState };
	}

	/**
	 * Check if user is authenticated
	 */
	isAuthenticated(): boolean {
		return this.authState.isAuthenticated;
	}

	/**
	 * Get current user
	 */
	getCurrentUser() {
		return this.authState.user;
	}

	/**
	 * Get user permissions
	 */
	getPermissions(): string[] {
		return [...this.authState.permissions];
	}

	/**
	 * Check if user has specific permission
	 */
	hasPermission(permission: string): boolean {
		return (
			this.authState.permissions.includes('*') || this.authState.permissions.includes(permission)
		);
	}

	/**
	 * Check if user has any of the specified permissions
	 */
	hasAnyPermission(permissions: string[]): boolean {
		if (this.authState.permissions.includes('*')) return true;
		return permissions.some((permission) => this.authState.permissions.includes(permission));
	}

	/**
	 * Get time remaining until session expiry (in minutes)
	 */
	getSessionTimeRemaining(): number {
		if (!this.authState.sessionExpires) return 0;
		const now = new Date();
		const diff = this.authState.sessionExpires.getTime() - now.getTime();
		return Math.max(0, Math.floor(diff / (1000 * 60)));
	}

	/**
	 * Private: Reset auth state
	 */
	private resetAuthState(): void {
		this.authState = {
			isAuthenticated: false,
			user: null,
			permissions: [],
			sessionExpires: null
		};
	}

	/**
	 * Private: Check rate limiting
	 */
	private checkRateLimit(email: string): boolean {
		if (!authConfig.security.rateLimit.enabled) return true;

		const now = Date.now();
		const rateLimitData = this.rateLimitMap.get(email);

		if (!rateLimitData) return true;

		// Reset if window has passed
		if (now > rateLimitData.resetTime) {
			this.rateLimitMap.delete(email);
			return true;
		}

		// Check if within limits
		return rateLimitData.count < authConfig.security.rateLimit.maxAttempts;
	}

	/**
	 * Private: Record failed login attempt
	 */
	private recordFailedAttempt(email: string): void {
		if (!authConfig.security.rateLimit.enabled) return;

		const now = Date.now();
		const windowMs = authConfig.security.rateLimit.windowMs;
		const rateLimitData = this.rateLimitMap.get(email);

		if (!rateLimitData || now > rateLimitData.resetTime) {
			this.rateLimitMap.set(email, {
				count: 1,
				resetTime: now + windowMs
			});
		} else {
			rateLimitData.count++;
		}
	}

	/**
	 * Private: Clear rate limit for email
	 */
	private clearRateLimit(email: string): void {
		this.rateLimitMap.delete(email);
	}

	/**
	 * Private: Clear all rate limits
	 */
	private clearAllRateLimits(): void {
		this.rateLimitMap.clear();
	}
}

// Create singleton instance
export const secureAuthService = new SecureAuthService();

// Initialize on client-side
if (browser) {
	secureAuthService.initialize().catch(console.error);
}

// Export for testing
export { SecureAuthService };
