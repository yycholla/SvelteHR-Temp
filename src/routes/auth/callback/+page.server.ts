import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { geldbTokenService } from '$lib/services/auth/geldb-token.service.js';
import { geldbRedirectService } from '$lib/services/auth/geldb-redirect.service.js';
import { identitySyncService } from '$lib/services/identity-sync.service.js';
import { backendIntegrationService } from '$lib/services/backend-integration.service.js';

/**
 * Auth Callback Handler
 * 
 * Processes the OAuth callback from GelDB built-in auth UI.
 * Handles the complete authentication flow:
 * 1. Exchange authorization code for access token
 * 2. Sync GelDB identity with RBAC user
 * 3. Set session cookie
 * 4. Redirect to target page
 */
export const load: PageServerLoad = async ({ url, cookies }) => {
	try {
		// Extract authorization code from query parameters
		const authCode = url.searchParams.get('code');
		const state = url.searchParams.get('state');
		const error = url.searchParams.get('error');

		console.log('Callback server load - URL:', url.href);
		console.log('Auth code:', authCode ? 'present' : 'missing');
		console.log('State:', state);

		// Handle OAuth errors from GelDB
		if (error) {
			console.error('GelDB OAuth error:', error);
			const errorDescription = url.searchParams.get('error_description');
			
			throw redirect(303, `/login?error=oauth_error&message=${encodeURIComponent(errorDescription || error)}`);
		}

		// Validate authorization code is present
		if (!authCode) {
			console.error('Missing authorization code in callback');
			throw redirect(303, '/login?error=missing_code');
		}

		// Step 1: Exchange authorization code for access token with GelDB
		console.log('Step 1: Exchanging code for token...');
		
		// Check if we have a PKCE verifier (might be needed for some flows)
		const verifier = cookies.get('gel-pkce-verifier');
		if (verifier) {
			console.log('Found PKCE verifier, using it for token exchange');
		}
		
		const tokenResponse = await geldbTokenService.exchangeCodeForToken(authCode, verifier || undefined);
		console.log('Token exchange successful');

		// Step 2: Validate token and get identity information
		console.log('Step 2: Validating token...');
		const validation = await geldbTokenService.validateToken(tokenResponse.access_token);

		if (!validation.valid || !validation.identity) {
			console.error('Token validation failed:', validation.error);
			throw redirect(303, '/login?error=invalid_token');
		}
		console.log('Token validation successful, identity:', validation.identity.email);

		// Step 3: Sync GelDB identity with RBAC user
		console.log('Step 3: Syncing identity to RBAC user...');
		const syncResponse = await identitySyncService.syncIdentityToUser(
			tokenResponse.access_token,
			validation.identity
		);
		console.log('Identity sync successful, user ID:', syncResponse.user.id, 'New user:', syncResponse.isNewUser);

		// Step 4: Set secure session cookie
		cookies.set('gel-auth-token', tokenResponse.access_token, {
			path: '/',
			httpOnly: true,
			secure: true,
			sameSite: 'strict',
			maxAge: tokenResponse.expires_in || 3600 // Default to 1 hour if not specified
		});

		// Clear any old auth cookies
		cookies.delete('gel-pkce-verifier', { path: '/' });
		cookies.delete('hr_token', { path: '/' });

		// Step 5: Create audit event for successful login
		await identitySyncService.createAuditEvent(
			'IDENTITY_SYNC',
			validation.identity.id,
			syncResponse.user.id,
			{
				isNewUser: syncResponse.isNewUser,
				email: validation.identity.email,
				syncedAt: syncResponse.syncedAt
			}
		);

		// Step 6: Determine redirect target
		const redirectTarget = geldbRedirectService.getRedirectTarget(state);
		console.log('Authentication successful, redirecting to:', redirectTarget);

		// Successful authentication - redirect to target page
		throw redirect(303, redirectTarget);

	} catch (err: any) {
		console.error('Auth callback error:', err);

		// If this is already a redirect, re-throw it
		if (err.status === 303) {
			throw err;
		}

		// Handle different types of errors
		if (err.message?.includes('Token exchange failed')) {
			console.error('Token exchange failed:', err.message);
			throw redirect(303, '/login?error=token_exchange_failed');
		}

		if (err.message?.includes('Identity sync failed')) {
			console.error('Identity sync failed:', err.message);
			throw redirect(303, '/login?error=sync_failed');
		}

		if (backendIntegrationService.isNetworkError(err)) {
			console.error('Network error during callback:', err.message);
			throw redirect(303, '/login?error=service_unavailable');
		}

		// Generic error - redirect to login with error
		console.error('Generic callback error:', err.message);
		throw redirect(303, '/login?error=callback_failed');
	}
};
