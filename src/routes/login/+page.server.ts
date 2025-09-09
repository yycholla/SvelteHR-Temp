import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { geldbRedirectService } from '$lib/services/auth/geldb-redirect.service.js';
import { backendIntegrationService } from '$lib/services/backend-integration.service.js';

/**
 * Login Page Server Load
 * 
 * Handles login page logic - redirects authenticated users to dashboard
 * or redirects to GelDB built-in auth UI for authentication.
 */
export const load: PageServerLoad = async ({ url, cookies }) => {
	// Clear any incompatible authentication cookies on login page load
	const cookiesToClear = [
		'next-auth.session-token',
		'next-auth.callback-url', 
		'next-auth.csrf-token',
		'__Secure-next-auth.session-token',
		'__Host-next-auth.csrf-token'
	];

	for (const cookieName of cookiesToClear) {
		if (cookies.get(cookieName)) {
			cookies.delete(cookieName, { path: '/' });
		}
	}

	// Check if user is already authenticated with GelDB token
	const authToken = cookies.get('gel-auth-token') || cookies.get('hr_token');
	
	if (authToken) {
		try {
			// Validate token with backend to ensure it's still valid
			await backendIntegrationService.verifyAuthToken(authToken);
			
			// User is authenticated, redirect to requested page or dashboard
			const redirectTo = url.searchParams.get('redirectTo') || '/dashboard';
			throw redirect(303, redirectTo);
		} catch (error) {
			// Token is invalid, clear it
			cookies.delete('gel-auth-token', {
				path: '/',
				httpOnly: true,
				secure: true,
				sameSite: 'strict'
			});
			cookies.delete('hr_token', {
				path: '/',
				httpOnly: true,
				secure: true,
				sameSite: 'strict'
			});
		}
	}

	// Get redirect target for post-auth redirect
	const redirectTo = url.searchParams.get('redirectTo');
	
	// Check if this is an immediate redirect or if we should show login page
	const autoRedirect = url.searchParams.get('auto') === 'true';
	
	if (autoRedirect) {
		// Immediately redirect to GelDB auth UI
		const authUrl = geldbRedirectService.getAuthUIUrl(redirectTo || undefined);
		throw redirect(303, authUrl);
	}

	// Return data for login page
	return {
		redirectTo,
		geldbAuthUrl: geldbRedirectService.getAuthUIUrl(redirectTo || undefined),
		providerInfo: geldbRedirectService.getProviderInfo(),
		loginReason: url.searchParams.get('reason') || null,
		errorMessage: url.searchParams.get('error') || null
	};
};
