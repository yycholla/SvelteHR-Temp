import { dev } from '$app/environment';
import { PUBLIC_GELDB_URL } from '$env/static/public';
import { browser } from '$app/environment';

/**
 * GelDB Redirect Service
 * 
 * Handles redirects to GelDB's built-in auth extension UI.
 * This service constructs proper URLs for GelDB authentication flow
 * and manages redirect parameters like callback URLs and state.
 */
export class GelDBRedirectService {
	private readonly geldbAuthBaseUrl: string;
	private readonly frontendBaseUrl: string;

	constructor() {
		// GelDB auth extension base URL - use environment variable
		this.geldbAuthBaseUrl = `${PUBLIC_GELDB_URL || 'http://localhost:5656'}/db/main/ext/auth`;
		
		// Frontend callback URL - dynamically determine based on current host
		if (browser && typeof window !== 'undefined') {
			// Use current browser location for dynamic host support
			this.frontendBaseUrl = `${window.location.protocol}//${window.location.host}`;
		} else {
			// Fallback for server-side rendering
			this.frontendBaseUrl = dev 
				? 'http://localhost:5173'
				: 'https://app.sveltehr.com';
		}
	}

	/**
	 * Get GelDB built-in auth UI URL
	 * 
	 * @param redirectTo - Optional URL to redirect to after successful auth
	 * @returns Complete URL to GelDB built-in auth UI
	 */
	getAuthUIUrl(redirectTo?: string): string {
		const authUIUrl = new URL(`${this.geldbAuthBaseUrl}/ui/signin`);
		
		// Set callback URL for GelDB to redirect back to our app
		const callbackUrl = `${this.frontendBaseUrl}/auth/callback`;
		authUIUrl.searchParams.set('redirect_to', callbackUrl);
		
		// Preserve original redirect target in state parameter
		if (redirectTo) {
			authUIUrl.searchParams.set('state', redirectTo);
		}
		
		return authUIUrl.toString();
	}

	/**
	 * Get GelDB logout URL
	 * 
	 * @returns URL to terminate GelDB session
	 */
	getLogoutUrl(): string {
		return `${this.geldbAuthBaseUrl}/logout`;
	}

	/**
	 * Build callback URL that GelDB will redirect to
	 * 
	 * @param state - Optional state parameter to preserve redirect target
	 * @returns Callback URL for GelDB to use
	 */
	getCallbackUrl(state?: string): string {
		const callbackUrl = new URL(`${this.frontendBaseUrl}/auth/callback`);
		
		if (state) {
			callbackUrl.searchParams.set('state', state);
		}
		
		return callbackUrl.toString();
	}

	/**
	 * Extract redirect target from callback state
	 * 
	 * @param state - State parameter from GelDB callback
	 * @returns Redirect target URL or default dashboard
	 */
	getRedirectTarget(state?: string | null): string {
		if (state && this.isValidRedirectTarget(state)) {
			return state;
		}
		
		// Default redirect target
		return '/dashboard';
	}

	/**
	 * Validate redirect target for security
	 * 
	 * @param redirectTo - URL to validate
	 * @returns True if redirect target is safe
	 */
	private isValidRedirectTarget(redirectTo: string): boolean {
		try {
			// Must be relative URL or same origin
			if (redirectTo.startsWith('/')) {
				return true;
			}
			
			const url = new URL(redirectTo);
			const frontendUrl = new URL(this.frontendBaseUrl);
			
			return url.origin === frontendUrl.origin;
		} catch {
			return false;
		}
	}

	/**
	 * Get GelDB provider configuration info
	 * 
	 * @returns Information about configured auth providers
	 */
	getProviderInfo() {
		return {
			magicLink: {
				enabled: true,
				provider: 'geldb_magic_link',
				description: 'Magic Link authentication via GelDB'
			},
			authUIUrl: `${this.geldbAuthBaseUrl}/ui`,
			callbackUrl: this.getCallbackUrl()
		};
	}

	/**
	 * Check if current environment supports GelDB auth
	 * 
	 * @returns True if GelDB auth is properly configured
	 */
	isConfigured(): boolean {
		return !!(PUBLIC_GELDB_URL && this.geldbAuthBaseUrl);
	}

	/**
	 * Create login redirect response
	 * 
	 * Helper for SvelteKit route handlers to redirect to GelDB auth UI
	 * 
	 * @param redirectTo - Optional URL to redirect to after auth
	 * @returns Redirect response
	 */
	createLoginRedirect(redirectTo?: string): Response {
		const authUrl = this.getAuthUIUrl(redirectTo);
		
		return new Response(null, {
			status: 302,
			headers: {
				Location: authUrl,
				// Prevent caching of redirect responses
				'Cache-Control': 'no-cache, no-store, must-revalidate'
			}
		});
	}

	/**
	 * Create logout redirect response
	 * 
	 * Helper for SvelteKit route handlers to redirect to GelDB logout
	 * 
	 * @returns Redirect response
	 */
	createLogoutRedirect(): Response {
		const logoutUrl = this.getLogoutUrl();
		
		return new Response(null, {
			status: 302,
			headers: {
				Location: logoutUrl,
				'Cache-Control': 'no-cache, no-store, must-revalidate'
			}
		});
	}
}

// Export singleton instance
export const geldbRedirectService = new GelDBRedirectService();