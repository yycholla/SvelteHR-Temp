import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { backendIntegrationService } from '$lib/services/backend-integration.service.js';

/**
 * SvelteKit Authentication Middleware (hooks.server.ts)
 * 
 * Handles authentication for all server-side requests using GelDB integration.
 * Verifies tokens, sets user context, and enforces route protection.
 */

// Routes that don't require authentication
const publicRoutes = [
	'/login', 
	'/login-simple', 
	'/login-working', 
	'/privacy', 
	'/terms', 
	'/api',
	'/auth/callback' // Allow callback to process authentication
];

// Check if a route is public
function isPublicRoute(pathname: string): boolean {
	return publicRoutes.some((route) => pathname.startsWith(route)) || pathname === '/';
}

export const handle: Handle = async ({ event, resolve }) => {
	const { url, cookies } = event;

	// Initialize locals with RBAC properties
	event.locals.user = null;
	event.locals.isAuthenticated = false;
	event.locals.permissions = [];
	event.locals.roles = [];
	event.locals.token = null;

	// Get GelDB auth token from cookies
	const gelToken = cookies.get('gel-auth-token');
	const fallbackToken = cookies.get('hr_token') || cookies.get('auth-token');

	// Primary auth flow: GelDB token
	if (gelToken) {
		try {
			// Verify GelDB token with backend integration service
			const authResponse = await backendIntegrationService.verifyAuthToken(gelToken);
			
			// Set user context in locals for SSR
			event.locals.user = authResponse.user;
			event.locals.isAuthenticated = true;
			event.locals.permissions = authResponse.permissions || [];
			event.locals.roles = authResponse.user.roles || [];
			event.locals.token = gelToken;

		} catch (error: any) {
			console.error('GelDB token verification failed:', error);
			
			// Clear invalid token
			cookies.delete('gel-auth-token', {
				path: '/',
				httpOnly: true,
				secure: true,
				sameSite: 'strict'
			});
		}
	} 
	// Fallback auth flow: Legacy JWT token (for backward compatibility)
	else if (fallbackToken) {
		try {
			// Verify legacy token with backend
			const authResponse = await backendIntegrationService.verifyAuthToken(fallbackToken);
			
			// Set user context in locals
			event.locals.user = authResponse.user;
			event.locals.isAuthenticated = true;
			event.locals.permissions = authResponse.permissions || [];
			event.locals.roles = authResponse.user.roles || [];
			event.locals.token = fallbackToken;

		} catch (error: any) {
			console.error('Legacy token verification failed:', error);
			
			// Clear invalid tokens
			cookies.delete('hr_token', {
				path: '/',
				httpOnly: true,
				secure: true,
				sameSite: 'strict'
			});
			cookies.delete('auth-token', {
				path: '/',
				httpOnly: true,
				secure: true,
				sameSite: 'strict'
			});
		}
	}

	// Route protection: Check if route requires authentication
	if (!isPublicRoute(url.pathname) && !event.locals.isAuthenticated) {
		// Construct redirect URL with return path
		const redirectTo = url.pathname + url.search;
		const loginUrl = `/login?redirectTo=${encodeURIComponent(redirectTo)}`;
		
		console.log(`Unauthenticated access to protected route: ${url.pathname}, redirecting to: ${loginUrl}`);
		throw redirect(302, loginUrl);
	}

	// Add auth context to response headers for debugging (development only)
	const response = await resolve(event);
	
	if (process.env.NODE_ENV === 'development') {
		response.headers.set('X-Auth-Status', event.locals.isAuthenticated ? 'authenticated' : 'anonymous');
		if (event.locals.user) {
			response.headers.set('X-User-ID', event.locals.user.id);
			response.headers.set('X-User-Roles', event.locals.roles.map((r: any) => r.name || r).join(','));
		}
	}

	return response;
};
