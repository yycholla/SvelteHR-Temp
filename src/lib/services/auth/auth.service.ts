import { geldbRedirectService } from './geldb-redirect.service.js';
import { geldbTokenService } from './geldb-token.service.js';
import { sessionService } from './session.service.js';
import { goto } from '$app/navigation';
import { browser } from '$app/environment';

/**
 * Auth Service Facade
 * 
 * Main interface for authentication operations in the SvelteHR frontend.
 * Coordinates between GelDB services and session management to provide
 * a unified API for authentication flows throughout the application.
 */
export class AuthService {
	/**
	 * Initiate login flow - redirect to GelDB auth UI if available, fallback to custom form
	 * 
	 * @param redirectTo - Optional URL to redirect to after successful login
	 */
	async login(redirectTo?: string): Promise<void> {
		if (!browser) return;

		try {
			// Try to redirect to GelDB auth UI first
			const geldbAuthUrl = `http://100.74.53.86:5656/db/main/ext/auth/ui/signin${redirectTo ? `?redirect_to=${encodeURIComponent(redirectTo)}` : ''}`;
			
			// Check if GelDB auth UI is available
			try {
				const response = await fetch(geldbAuthUrl, { method: 'HEAD' });
				if (response.status !== 404) {
					window.location.href = geldbAuthUrl;
					return;
				}
			} catch (err) {
				console.log('GelDB auth UI not available, using custom form');
			}

			// Fallback to custom magic link form
			const loginUrl = `/login-magic${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ''}`;
			window.location.href = loginUrl;
		} catch (error) {
			console.error('Login initiation failed:', error);
			throw error;
		}
	}

	/**
	 * Handle callback from GelDB auth flow
	 * Process authorization code and establish frontend session
	 * 
	 * @param authCode - Authorization code from GelDB callback
	 * @param state - Optional state parameter for redirect target
	 * @returns Success status and redirect target
	 */
	async handleCallback(
		authCode: string,
		state?: string | null
	): Promise<{ success: boolean; redirectTo: string; error?: string }> {
		try {
			// Step 1: Exchange auth code for access token with GelDB
			const tokenResponse = await geldbTokenService.exchangeCodeForToken(authCode);
			
			// Step 2: Set token in session service (validates with backend)
			const sessionSuccess = await sessionService.setAuthToken(tokenResponse.access_token);
			
			if (!sessionSuccess) {
				return {
					success: false,
					redirectTo: '/login',
					error: 'Failed to establish session'
				};
			}

			// Step 3: Determine redirect target
			const redirectTo = geldbRedirectService.getRedirectTarget(state);
			
			return {
				success: true,
				redirectTo
			};
		} catch (error) {
			console.error('Callback handling failed:', error);
			
			return {
				success: false,
				redirectTo: '/login?error=callback_failed',
				error: error instanceof Error ? error.message : 'Authentication failed'
			};
		}
	}

	/**
	 * Logout user and redirect appropriately
	 * 
	 * @param redirectToLogin - Whether to redirect to login page (default: true)
	 */
	async logout(redirectToLogin = true): Promise<void> {
		try {
			// Clear frontend session
			await sessionService.logout(false);
			
			// Redirect to login or stay on current page
			if (redirectToLogin && browser) {
				goto('/login?reason=logout');
			}
		} catch (error) {
			console.error('Logout failed:', error);
			// Continue with redirect even if logout fails
			if (redirectToLogin && browser) {
				goto('/login?reason=logout');
			}
		}
	}

	/**
	 * Check if user is currently authenticated
	 */
	get isAuthenticated(): boolean {
		return sessionService.getCurrentSession().isAuthenticated;
	}

	/**
	 * Get current user data
	 */
	get currentUser() {
		return sessionService.getCurrentSession().user;
	}

	/**
	 * Get current user permissions
	 */
	get permissions(): string[] {
		return sessionService.getCurrentSession().permissions;
	}

	/**
	 * Check if user has specific permission
	 */
	hasPermission(permission: string): boolean {
		return sessionService.hasPermission(permission);
	}

	/**
	 * Check if user has any of the specified roles
	 */
	hasRole(...roleNames: string[]): boolean {
		return sessionService.hasRole(...roleNames);
	}

	/**
	 * Check if user has minimum role level
	 */
	hasRoleLevel(minLevel: number): boolean {
		return sessionService.hasRoleLevel(minLevel);
	}

	/**
	 * Refresh current session
	 */
	async refreshSession(): Promise<boolean> {
		return sessionService.refreshSession();
	}

	/**
	 * Handle authentication errors and token expiration
	 */
	handleAuthError(error: any): void {
		console.error('Authentication error:', error);
		
		// Check if it's a token expiration or unauthorized error
		if (this.isTokenError(error)) {
			sessionService.handleSessionExpired();
		}
	}

	/**
	 * Protect route - redirect to login if not authenticated
	 * 
	 * @param currentPath - Current route path for redirect after login
	 */
	async requireAuth(currentPath?: string): Promise<void> {
		if (!this.isAuthenticated) {
			const redirectParam = currentPath ? `?redirectTo=${encodeURIComponent(currentPath)}` : '';
			
			if (browser) {
				goto(`/login${redirectParam}`);
			}
		}
	}

	/**
	 * Require specific permission - redirect if insufficient permissions
	 * 
	 * @param permission - Required permission
	 * @param currentPath - Current route path
	 */
	async requirePermission(permission: string, currentPath?: string): Promise<void> {
		// First check authentication
		if (!this.isAuthenticated) {
			await this.requireAuth(currentPath);
			return;
		}

		// Then check permission
		if (!this.hasPermission(permission)) {
			if (browser) {
				goto('/unauthorized');
			}
		}
	}

	/**
	 * Require specific role - redirect if insufficient role
	 * 
	 * @param roleName - Required role name
	 * @param currentPath - Current route path
	 */
	async requireRole(roleName: string, currentPath?: string): Promise<void> {
		// First check authentication
		if (!this.isAuthenticated) {
			await this.requireAuth(currentPath);
			return;
		}

		// Then check role
		if (!this.hasRole(roleName)) {
			if (browser) {
				goto('/unauthorized');
			}
		}
	}

	/**
	 * Require minimum role level - redirect if insufficient level
	 * 
	 * @param minLevel - Minimum required role level
	 * @param currentPath - Current route path
	 */
	async requireRoleLevel(minLevel: number, currentPath?: string): Promise<void> {
		// First check authentication
		if (!this.isAuthenticated) {
			await this.requireAuth(currentPath);
			return;
		}

		// Then check role level
		if (!this.hasRoleLevel(minLevel)) {
			if (browser) {
				goto('/unauthorized');
			}
		}
	}

	/**
	 * Get provider information for display purposes
	 */
	getProviderInfo() {
		return geldbRedirectService.getProviderInfo();
	}

	/**
	 * Reactive session store for components
	 */
	get session() {
		return sessionService.session;
	}

	/**
	 * Individual reactive stores for common needs
	 */
	get isAuthenticatedStore() {
		return sessionService.isAuthenticated;
	}

	get userStore() {
		return sessionService.user;
	}

	get permissionsStore() {
		return sessionService.permissions;
	}

	get isLoadingStore() {
		return sessionService.isLoading;
	}

	/**
	 * Private helper methods
	 */
	private isTokenError(error: any): boolean {
		// Check various indicators of token/auth errors
		return (
			error?.status === 401 ||
			error?.status === 403 ||
			error?.code === 'TOKEN_EXPIRED' ||
			error?.code === 'UNAUTHORIZED' ||
			error?.message?.includes('token') ||
			error?.message?.includes('unauthorized')
		);
	}

	/**
	 * Development and debugging helpers
	 */
	getDebugInfo(): object {
		return {
			isAuthenticated: this.isAuthenticated,
			currentUser: this.currentUser,
			permissions: this.permissions,
			sessionDebug: sessionService.getDebugInfo(),
			geldbConfig: geldbRedirectService.getProviderInfo()
		};
	}

	/**
	 * Check service health for monitoring
	 */
	async checkHealth(): Promise<{
		sessionService: boolean;
		geldbRedirect: boolean;
		geldbToken: boolean;
	}> {
		return {
			sessionService: true, // Basic check - service is instantiated
			geldbRedirect: geldbRedirectService.isConfigured(),
			geldbToken: true // Basic check - service is instantiated
		};
	}
}

// Export singleton instance
export const authService = new AuthService();