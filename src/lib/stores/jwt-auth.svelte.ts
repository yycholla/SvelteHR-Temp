/**
 * JWT Authentication Store (Svelte 5 Runes)
 *
 * Manages JWT-based authentication with automatic token refresh,
 * session restoration, and permission/role helpers.
 *
 * Security:
 * - Access tokens stored in memory only (cleared on refresh)
 * - Refresh tokens stored in HTTP-only cookies (backend-managed)
 * - Automatic token rotation on refresh
 */

import { type Client, type CombinedError } from '@urql/core';
import { browser } from '$app/environment';

// ============================================================================
// Types
// ============================================================================

export interface AuthUser {
	id: string;
	email: string;
	displayName: string;
	roles: string[];
	permissions: string[];
	isActive: boolean;
	forcePasswordChange: boolean;
}

export interface TokenPair {
	accessToken: string;
	refreshToken: string;
	refreshTokenPlaintext: string;
	tokenType: string;
	expiresIn: number; // seconds
}

export interface AuthError {
	code: string;
	message: string;
}

// ============================================================================
// GraphQL Operations
// ============================================================================

const LOGIN_MUTATION = `
	mutation Login($email: String!, $password: String!, $deviceInfo: String, $ipAddress: String) {
		login(input: { email: $email, password: $password, deviceInfo: $deviceInfo, ipAddress: $ipAddress }) {
			... on AuthSuccess {
				user {
					id
					email
					displayName
					roles
					permissions
					isActive
					forcePasswordChange
				}
				tokens {
					accessToken
					refreshToken
					refreshTokenPlaintext
					tokenType
					expiresIn
				}
			}
			... on AuthError {
				code
				message
			}
		}
	}
`;

const REFRESH_TOKEN_MUTATION = `
	mutation RefreshToken($refreshToken: String!, $refreshTokenPlaintext: String!, $deviceInfo: String, $ipAddress: String) {
		refreshToken(input: { refreshToken: $refreshToken, refreshTokenPlaintext: $refreshTokenPlaintext, deviceInfo: $deviceInfo, ipAddress: $ipAddress }) {
			... on AuthSuccess {
				user {
					id
					email
					displayName
					roles
					permissions
					isActive
					forcePasswordChange
				}
				tokens {
					accessToken
					refreshToken
					refreshTokenPlaintext
					tokenType
					expiresIn
				}
			}
			... on AuthError {
				code
				message
			}
		}
	}
`;

const LOGOUT_MUTATION = `
	mutation Logout {
		logout {
			success
			message
		}
	}
`;

// ============================================================================
// JWT Auth Store Class
// ============================================================================

class JwtAuthStore {
	// Reactive state using Svelte 5 runes
	accessToken = $state<string | null>(null);
	user = $state<AuthUser | null>(null);
	isLoading = $state(false);
	error = $state<string | null>(null);

	// Derived state
	isAuthenticated = $derived(!!this.accessToken && !!this.user);

	// Private state for token management
	private refreshTokenData = $state<{ jwt: string; plaintext: string } | null>(null);
	private refreshTimer: ReturnType<typeof setTimeout> | null = null;
	private graphqlClient: Client | null = null;

	/**
	 * Initialize the auth store with GraphQL client
	 */
	initialize(client: Client) {
		this.graphqlClient = client;
		if (browser) {
			this.restoreSession();
		}
	}

	/**
	 * Login with email and password
	 */
	async login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
		if (!this.graphqlClient) {
			return { success: false, error: 'GraphQL client not initialized' };
		}

		this.isLoading = true;
		this.error = null;

		try {
			const result = await this.graphqlClient.mutation(LOGIN_MUTATION, {
				email,
				password,
				deviceInfo: this.getDeviceInfo(),
				ipAddress: null // Will be extracted by backend
			});

			if (result.error) {
				const errorMessage = this.formatGraphQLError(result.error);
				this.error = errorMessage;
				return { success: false, error: errorMessage };
			}

			const loginResult = result.data?.login;

			if (loginResult?.__typename === 'AuthError') {
				this.error = loginResult.message;
				return { success: false, error: loginResult.message };
			}

			if (loginResult?.__typename === 'AuthSuccess') {
				this.setAuthData(loginResult.user, loginResult.tokens);
				return { success: true };
			}

			return { success: false, error: 'Unknown login response' };
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Login failed';
			this.error = errorMessage;
			return { success: false, error: errorMessage };
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Refresh access token using stored refresh token
	 */
	async refreshAccessToken(): Promise<boolean> {
		if (!this.graphqlClient || !this.refreshTokenData) {
			return false;
		}

		try {
			const result = await this.graphqlClient.mutation(REFRESH_TOKEN_MUTATION, {
				refreshToken: this.refreshTokenData.jwt,
				refreshTokenPlaintext: this.refreshTokenData.plaintext,
				deviceInfo: this.getDeviceInfo(),
				ipAddress: null
			});

			if (result.error) {
				console.error('[JWT Auth] Token refresh failed:', result.error);
				this.clearAuthData();
				return false;
			}

			const refreshResult = result.data?.refreshToken;

			if (refreshResult?.__typename === 'AuthError') {
				console.error('[JWT Auth] Token refresh error:', refreshResult.message);
				this.clearAuthData();
				return false;
			}

			if (refreshResult?.__typename === 'AuthSuccess') {
				this.setAuthData(refreshResult.user, refreshResult.tokens);
				return true;
			}

			return false;
		} catch (err) {
			console.error('[JWT Auth] Token refresh exception:', err);
			this.clearAuthData();
			return false;
		}
	}

	/**
	 * Logout current session
	 */
	async logout(): Promise<void> {
		if (!this.graphqlClient) {
			this.clearAuthData();
			return;
		}

		try {
			// Call logout mutation (revokes all tokens on backend)
			await this.graphqlClient.mutation(LOGOUT_MUTATION, {});
		} catch (err) {
			console.error('[JWT Auth] Logout error:', err);
		} finally {
			this.clearAuthData();
		}
	}

	/**
	 * Check if user has a specific permission
	 */
	hasPermission(permission: string): boolean {
		return this.user?.permissions.includes(permission) ?? false;
	}

	/**
	 * Check if user has a specific role
	 */
	hasRole(role: string): boolean {
		return this.user?.roles.includes(role) ?? false;
	}

	/**
	 * Check if user has any of the specified roles
	 */
	hasAnyRole(roles: string[]): boolean {
		return roles.some((role) => this.hasRole(role));
	}

	/**
	 * Check if user has all of the specified permissions
	 */
	hasAllPermissions(permissions: string[]): boolean {
		return permissions.every((permission) => this.hasPermission(permission));
	}

	// ============================================================================
	// Private Methods
	// ============================================================================

	/**
	 * Set authentication data and schedule token refresh
	 */
	private setAuthData(user: AuthUser, tokens: TokenPair) {
		this.user = user;
		this.accessToken = tokens.accessToken;
		this.refreshTokenData = {
			jwt: tokens.refreshToken,
			plaintext: tokens.refreshTokenPlaintext
		};

		// Schedule token refresh 1 minute before expiry
		this.scheduleTokenRefresh(tokens.expiresIn);

		console.log('[JWT Auth] Authentication successful');
	}

	/**
	 * Clear all authentication data
	 */
	private clearAuthData() {
		this.user = null;
		this.accessToken = null;
		this.refreshTokenData = null;
		this.error = null;

		if (this.refreshTimer) {
			clearTimeout(this.refreshTimer);
			this.refreshTimer = null;
		}

		console.log('[JWT Auth] Authentication cleared');
	}

	/**
	 * Schedule automatic token refresh
	 */
	private scheduleTokenRefresh(expiresInSeconds: number) {
		// Clear existing timer
		if (this.refreshTimer) {
			clearTimeout(this.refreshTimer);
		}

		// Schedule refresh 1 minute (60 seconds) before expiry
		const refreshInMs = (expiresInSeconds - 60) * 1000;

		if (refreshInMs > 0) {
			this.refreshTimer = setTimeout(async () => {
				console.log('[JWT Auth] Auto-refreshing access token');
				const success = await this.refreshAccessToken();
				if (!success) {
					console.warn('[JWT Auth] Auto-refresh failed, user will need to re-login');
				}
			}, refreshInMs);

			console.log(`[JWT Auth] Token refresh scheduled in ${refreshInMs / 1000}s`);
		}
	}

	/**
	 * Attempt to restore session on page load
	 */
	private async restoreSession() {
		console.log('[JWT Auth] Attempting session restoration');
		const success = await this.refreshAccessToken();
		if (success) {
			console.log('[JWT Auth] Session restored successfully');
		} else {
			console.log('[JWT Auth] No active session to restore');
		}
	}

	/**
	 * Get device information for audit trail
	 */
	private getDeviceInfo(): string {
		if (!browser) return 'SSR';
		return navigator.userAgent;
	}

	/**
	 * Format GraphQL error for display
	 */
	private formatGraphQLError(error: CombinedError): string {
		if (error.networkError) {
			return 'Network error. Please check your connection.';
		}
		if (error.graphQLErrors.length > 0) {
			return error.graphQLErrors[0].message;
		}
		return 'An unexpected error occurred';
	}
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const jwtAuth = new JwtAuthStore();
