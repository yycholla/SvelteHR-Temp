import { writable, derived, type Readable } from 'svelte/store';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { geldbTokenService } from './geldb-token.service.js';

/**
 * Frontend Session Service
 * 
 * Manages session state, authentication status, and user data for the frontend.
 * Coordinates with GelDB token service and provides reactive Svelte stores
 * for authentication state management throughout the application.
 */

export interface SessionUser {
	id: string;
	identity_id: string;
	email: string;
	full_name: string;
	roles: Array<{
		name: string;
		level: number;
		display_name?: string;
	}>;
	department?: string;
	job_title?: string;
	is_active: boolean;
	last_login?: string;
}

export interface SessionState {
	isAuthenticated: boolean;
	isLoading: boolean;
	user: SessionUser | null;
	permissions: string[];
	error: string | null;
}

export class SessionService {
	private readonly tokenKey = 'gel-auth-token';
	private readonly sessionExpiredKey = 'auth-session-expired';

	private sessionStore = writable<SessionState>({
		isAuthenticated: false,
		isLoading: true,
		user: null,
		permissions: [],
		error: null
	});

	// Public reactive stores
	public readonly session: Readable<SessionState> = { subscribe: this.sessionStore.subscribe };
	
	public readonly isAuthenticated = derived(
		this.sessionStore,
		($session) => $session.isAuthenticated
	);

	public readonly user = derived(
		this.sessionStore,
		($session) => $session.user
	);

	public readonly permissions = derived(
		this.sessionStore,
		($session) => $session.permissions
	);

	public readonly isLoading = derived(
		this.sessionStore,
		($session) => $session.isLoading
	);

	constructor() {
		if (browser) {
			this.initializeSession();
		}
	}

	/**
	 * Initialize session on app startup
	 * Checks for existing token and validates it
	 */
	private async initializeSession(): Promise<void> {
		try {
			const token = this.getStoredToken();
			
			if (!token) {
				this.clearSession();
				return;
			}

			// Check if token appears expired before making request
			if (geldbTokenService.isTokenExpired(token)) {
				this.clearSession();
				return;
			}

			// Validate token with backend
			await this.validateTokenAndSetSession(token);
		} catch (error) {
			console.error('Session initialization error:', error);
			this.clearSession();
		}
	}

	/**
	 * Set authentication token and validate session
	 * Called after successful GelDB authentication
	 */
	async setAuthToken(token: string): Promise<boolean> {
		try {
			this.setLoading(true);
			
			// Store token
			this.storeToken(token);
			
			// Validate and set session
			const success = await this.validateTokenAndSetSession(token);
			
			if (success) {
				this.clearSessionExpiredFlag();
			}
			
			return success;
		} catch (error) {
			console.error('Failed to set auth token:', error);
			this.setError('Authentication failed');
			return false;
		} finally {
			this.setLoading(false);
		}
	}

	/**
	 * Validate token with backend and set session data
	 */
	private async validateTokenAndSetSession(token: string): Promise<boolean> {
		try {
			const validation = await geldbTokenService.validateToken(token);
			
			if (!validation.valid || !validation.identity) {
				this.clearSession();
				return false;
			}

			// Make request to our frontend API to get full user data with RBAC
			const response = await fetch('/api/auth/verify', {
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${token}`,
					'Accept': 'application/json'
				}
			});

			if (!response.ok) {
				this.clearSession();
				return false;
			}

			const userData = await response.json();
			
			this.sessionStore.set({
				isAuthenticated: true,
				isLoading: false,
				user: userData,
				permissions: userData.permissions || [],
				error: null
			});

			return true;
		} catch (error) {
			console.error('Token validation error:', error);
			this.clearSession();
			return false;
		}
	}

	/**
	 * Logout user and clear session
	 */
	async logout(redirectToLogin = true): Promise<void> {
		try {
			const token = this.getStoredToken();
			
			// Revoke token with GelDB if available
			if (token) {
				await geldbTokenService.revokeToken(token);
			}
			
			// Clear local session
			this.clearSession();
			
			// Redirect to login if requested
			if (redirectToLogin && browser) {
				goto('/login');
			}
		} catch (error) {
			console.error('Logout error:', error);
			// Clear session even if revocation fails
			this.clearSession();
			
			if (redirectToLogin && browser) {
				goto('/login');
			}
		}
	}

	/**
	 * Check if user has specific permission
	 */
	hasPermission(permission: string): boolean {
		const session = this.getCurrentSession();
		return session.permissions.includes(permission) || session.permissions.includes('*');
	}

	/**
	 * Check if user has any of the specified roles
	 */
	hasRole(...roleNames: string[]): boolean {
		const session = this.getCurrentSession();
		if (!session.user) return false;
		
		const userRoles = session.user.roles.map(role => role.name);
		return roleNames.some(role => userRoles.includes(role));
	}

	/**
	 * Check if user has role level equal to or greater than specified level
	 */
	hasRoleLevel(minLevel: number): boolean {
		const session = this.getCurrentSession();
		if (!session.user) return false;
		
		const maxUserLevel = Math.max(...session.user.roles.map(role => role.level));
		return maxUserLevel >= minLevel;
	}

	/**
	 * Get current session state (non-reactive)
	 */
	getCurrentSession(): SessionState {
		let currentSession: SessionState = {
			isAuthenticated: false,
			isLoading: true,
			user: null,
			permissions: [],
			error: null
		};
		
		this.sessionStore.subscribe(session => {
			currentSession = session;
		})();
		
		return currentSession;
	}

	/**
	 * Refresh session data
	 */
	async refreshSession(): Promise<boolean> {
		const token = this.getStoredToken();
		if (!token) {
			this.clearSession();
			return false;
		}

		this.setLoading(true);
		const success = await this.validateTokenAndSetSession(token);
		this.setLoading(false);
		
		return success;
	}

	/**
	 * Handle session expiration
	 */
	handleSessionExpired(): void {
		this.setSessionExpiredFlag();
		this.clearSession();
		
		if (browser) {
			goto('/login?reason=expired');
		}
	}

	/**
	 * Private helper methods
	 */
	private storeToken(token: string): void {
		if (!browser) return;
		
		try {
			localStorage.setItem(this.tokenKey, token);
		} catch (error) {
			console.error('Failed to store auth token:', error);
		}
	}

	private getStoredToken(): string | null {
		if (!browser) return null;
		
		try {
			return localStorage.getItem(this.tokenKey);
		} catch (error) {
			console.error('Failed to get stored token:', error);
			return null;
		}
	}

	private clearStoredToken(): void {
		if (!browser) return;
		
		try {
			localStorage.removeItem(this.tokenKey);
		} catch (error) {
			console.error('Failed to clear stored token:', error);
		}
	}

	private setSessionExpiredFlag(): void {
		if (!browser) return;
		
		try {
			sessionStorage.setItem(this.sessionExpiredKey, 'true');
		} catch (error) {
			console.error('Failed to set session expired flag:', error);
		}
	}

	private clearSessionExpiredFlag(): void {
		if (!browser) return;
		
		try {
			sessionStorage.removeItem(this.sessionExpiredKey);
		} catch (error) {
			console.error('Failed to clear session expired flag:', error);
		}
	}

	private clearSession(): void {
		this.clearStoredToken();
		
		this.sessionStore.set({
			isAuthenticated: false,
			isLoading: false,
			user: null,
			permissions: [],
			error: null
		});
	}

	private setLoading(loading: boolean): void {
		this.sessionStore.update(session => ({
			...session,
			isLoading: loading
		}));
	}

	private setError(error: string): void {
		this.sessionStore.update(session => ({
			...session,
			error,
			isLoading: false
		}));
	}

	/**
	 * Development helpers
	 */
	getDebugInfo(): object {
		const session = this.getCurrentSession();
		const token = this.getStoredToken();
		
		return {
			session,
			hasToken: !!token,
			tokenExpired: token ? geldbTokenService.isTokenExpired(token) : null,
			tokenPayload: token ? geldbTokenService.decodeTokenPayload(token) : null
		};
	}
}

// Export singleton instance
export const sessionService = new SessionService();