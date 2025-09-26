// Secure Authentication service with token refresh and secure storage
// T053: Security Hardening - JWT & Token Management

import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import {
	authConfig,
	getAccessTokenName,
	getRefreshTokenName,
	getCookieOptions,
	getAuthEndpoints
} from './config.js';
import {
	verifyJWTToken,
	tokenNeedsRefresh,
	getTokenTimeRemaining,
	type JWTPayload
} from './jwt-utils.js';

export interface AuthState {
	isAuthenticated: boolean;
	user: {
		id: string;
		email: string;
		displayName: string;
		role: string;
	} | null;
	permissions: string[];
	tokenExpiry: Date | null;
	needsRefresh: boolean;
}

export interface LoginCredentials {
	email: string;
	password: string;
}

export interface LoginResponse {
	success: boolean;
	accessToken?: string;
	refreshToken?: string;
	user?: {
		id: string;
		email: string;
		displayName: string;
		role: string;
	};
	error?: string;
}

class SecureAuthService {
	private authState: AuthState = {
		isAuthenticated: false,
		user: null,
		permissions: [],
		tokenExpiry: null,
		needsRefresh: false
	};

	private refreshTimer: NodeJS.Timeout | null = null;
	private readonly endpoints = getAuthEndpoints();
	private rateLimitMap = new Map<string, { count: number; resetTime: number }>();

	/**
	 * Initialize the auth service and check for existing tokens
	 */
	async initialize(): Promise<void> {
		if (!browser) return;

		try {
			const token = this.getStoredToken();
			if (token) {
				const isValid = await this.validateToken(token);
				if (isValid) {
					await this.setupAuthState(token);
					this.scheduleTokenRefresh();
				} else {
					await this.logout();
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

			// Store tokens securely
			if (data.accessToken) {
				this.storeToken(data.accessToken, 'access');
			}

			if (data.refreshToken) {
				this.storeToken(data.refreshToken, 'refresh');
			}

			// Set up auth state
			await this.setupAuthState(data.accessToken);
			this.scheduleTokenRefresh();

			return {
				success: true,
				accessToken: data.accessToken,
				refreshToken: data.refreshToken,
				user: this.authState.user || undefined
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
	 * Logout and clean up tokens with server-side invalidation
	 */
	async logout(): Promise<void> {
		try {
			// Call logout endpoint if token exists
			const token = this.getStoredToken();
			if (token) {
				fetch(this.endpoints.logout, {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json'
					},
					credentials: 'include'
				}).catch((err) => console.warn('Logout endpoint failed:', err));
			}
		} catch (error) {
			console.warn('Logout request failed:', error);
		} finally {
			// Always clean up local state
			this.clearStoredTokens();
			this.clearRefreshTimer();
			this.resetAuthState();
			this.clearAllRateLimits();

			// Redirect to login page
			if (browser) {
				goto('/login');
			}
		}
	}

	/**
	 * Refresh the access token using refresh token
	 */
	async refreshToken(): Promise<boolean> {
		try {
			const refreshToken = this.getStoredToken('refresh');
			if (!refreshToken) {
				throw new Error('No refresh token available');
			}

			const response = await fetch(this.endpoints.refresh, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${refreshToken}`,
					'Content-Type': 'application/json'
				},
				credentials: 'include'
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || 'Token refresh failed');
			}

			// Store new access token
			if (data.accessToken) {
				this.storeToken(data.accessToken, 'access');
				await this.setupAuthState(data.accessToken);
				this.scheduleTokenRefresh();
				return true;
			}

			throw new Error('No access token in refresh response');
		} catch (error) {
			console.error('Token refresh failed:', error);
			await this.logout();
			return false;
		}
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
	 * Get time remaining until token expiry (in minutes)
	 */
	getTokenTimeRemaining(): number {
		if (!this.authState.tokenExpiry) return 0;
		const now = new Date();
		const diff = this.authState.tokenExpiry.getTime() - now.getTime();
		return Math.max(0, Math.floor(diff / (1000 * 60)));
	}

	/**
	 * Private: Store token securely
	 */
	private storeToken(token: string, type: 'access' | 'refresh' = 'access'): void {
		if (!browser) return;

		const tokenName = type === 'access' ? getAccessTokenName() : getRefreshTokenName();
		const cookieOptions = getCookieOptions();

		// For secure storage, we rely on httpOnly cookies set by the server
		// This is a fallback for client-side token management
		if (cookieOptions.httpOnly) {
			// In production with httpOnly cookies, tokens are managed server-side
			// We just store a flag to indicate authentication state
			localStorage.setItem('auth_state', 'authenticated');
		} else {
			// Development mode: store in secure cookie
			const secure = cookieOptions.secure ? 'secure;' : '';
			document.cookie = `${tokenName}=${token}; path=${cookieOptions.path}; max-age=${cookieOptions.maxAge}; ${secure} samesite=${cookieOptions.sameSite}`;
		}
	}

	/**
	 * Private: Get stored token
	 */
	private getStoredToken(type: 'access' | 'refresh' = 'access'): string | null {
		if (!browser) return null;

		const tokenName = type === 'access' ? getAccessTokenName() : getRefreshTokenName();

		// Try to get from cookie first
		const cookies = document.cookie.split(';');
		for (const cookie of cookies) {
			const [name, value] = cookie.trim().split('=');
			if (name === tokenName) {
				return decodeURIComponent(value);
			}
		}

		return null;
	}

	/**
	 * Private: Clear stored tokens
	 */
	private clearStoredTokens(): void {
		if (!browser) return;

		const accessTokenName = getAccessTokenName();
		const refreshTokenName = getRefreshTokenName();

		// Clear cookies
		document.cookie = `${accessTokenName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
		document.cookie = `${refreshTokenName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
		document.cookie = `postgraphile-jwt-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;

		// Clear localStorage
		localStorage.removeItem('auth_state');
	}

	/**
	 * Private: Validate token
	 */
	private async validateToken(token: string): Promise<boolean> {
		try {
			const validationResult = verifyJWTToken(token);
			return validationResult.isValid;
		} catch (error) {
			console.error('Token validation failed:', error);
			return false;
		}
	}

	/**
	 * Private: Setup auth state from token
	 */
	private async setupAuthState(token: string): Promise<void> {
		try {
			const validationResult = verifyJWTToken(token);
			if (!validationResult.isValid || !validationResult.payload) {
				throw new Error('Invalid token');
			}

			const payload = validationResult.payload;

			this.authState = {
				isAuthenticated: true,
				user: {
					id: payload.user_id,
					email: payload.email,
					displayName: payload.display_name || payload.email.split('@')[0],
					role: payload.role || 'employee'
				},
				permissions: payload.permissions || [],
				tokenExpiry: new Date(payload.exp * 1000),
				needsRefresh: validationResult.needsRefresh || false
			};
		} catch (error) {
			console.error('Failed to setup auth state:', error);
			throw error;
		}
	}

	/**
	 * Private: Reset auth state
	 */
	private resetAuthState(): void {
		this.authState = {
			isAuthenticated: false,
			user: null,
			permissions: [],
			tokenExpiry: null,
			needsRefresh: false
		};
	}

	/**
	 * Private: Schedule token refresh
	 */
	private scheduleTokenRefresh(): void {
		this.clearRefreshTimer();

		if (!this.authState.tokenExpiry) return;

		const timeRemaining = this.getTokenTimeRemaining();
		const refreshThreshold = authConfig.jwt.refreshThreshold;

		// Schedule refresh when we're within the refresh threshold
		if (timeRemaining > refreshThreshold) {
			const refreshIn = (timeRemaining - refreshThreshold) * 60 * 1000; // Convert to milliseconds
			this.refreshTimer = setTimeout(() => {
				this.refreshToken();
			}, refreshIn);
		} else if (timeRemaining > 0) {
			// Token expires soon, try to refresh immediately
			setTimeout(() => this.refreshToken(), 1000);
		}
	}

	/**
	 * Private: Clear refresh timer
	 */
	private clearRefreshTimer(): void {
		if (this.refreshTimer) {
			clearTimeout(this.refreshTimer);
			this.refreshTimer = null;
		}
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
