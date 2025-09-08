import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { geldbTokenService } from '$lib/services/auth/geldb-token.service.js';
import { backendIntegrationService } from '$lib/services/backend-integration.service.js';

/**
 * POST /auth/logout
 * 
 * Logout handler that clears session and revokes tokens
 * Handles both frontend session cleanup and backend notification
 */
export const POST: RequestHandler = async ({ cookies, url }) => {
	try {
		// Get current auth token
		const authToken = cookies.get('gel-auth-token');

		if (authToken) {
			try {
				// Revoke token with GelDB (best effort)
				await geldbTokenService.revokeToken(authToken);
			} catch (error) {
				console.warn('Token revocation failed (continuing with logout):', error);
				// Continue with logout even if revocation fails
			}

			try {
				// Notify backend of logout for audit logging (best effort)
				await backendIntegrationService.handleLogout(authToken);
			} catch (error) {
				console.warn('Backend logout notification failed (continuing):', error);
				// Continue with logout even if backend notification fails
			}
		}

		// Clear all auth cookies
		const cookiesToClear = [
			'gel-auth-token',
			'hr_token',
			'auth-session',
			'gel-pkce-verifier'
		];

		for (const cookieName of cookiesToClear) {
			cookies.delete(cookieName, {
				path: '/',
				httpOnly: true,
				secure: true,
				sameSite: 'strict'
			});
		}

		// Get redirect target from query params or default to login
		const redirectTo = url.searchParams.get('redirectTo') || '/login';
		const reason = 'logout';

		// Redirect to login page with logout reason
		throw redirect(303, `${redirectTo}?reason=${reason}`);

	} catch (error: any) {
		console.error('Logout error:', error);

		// If this is already a redirect, re-throw it
		if (error.status === 303) {
			throw error;
		}

		// Clear cookies anyway on error and redirect to login
		const cookiesToClear = [
			'gel-auth-token',
			'hr_token',
			'auth-session',
			'gel-pkce-verifier'
		];

		for (const cookieName of cookiesToClear) {
			cookies.delete(cookieName, {
				path: '/',
				httpOnly: true,
				secure: true,
				sameSite: 'strict'
			});
		}

		// Redirect to login with error
		throw redirect(303, '/login?reason=logout&error=logout_failed');
	}
};

/**
 * GET /auth/logout
 * 
 * Alternative logout endpoint for GET requests
 * Redirects to same POST handler logic
 */
export const GET: RequestHandler = async ({ cookies, url }) => {
	// Reuse POST logic for GET requests
	return POST({ cookies, url } as any);
};