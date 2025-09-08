import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { PUBLIC_API_URL } from '$env/static/public';

// Routes that don't require authentication
const publicRoutes = ['/login', '/login-simple', '/login-working', '/privacy', '/terms', '/api'];

// Check if a route is public
function isPublicRoute(pathname: string): boolean {
	return publicRoutes.some((route) => pathname.startsWith(route)) || pathname === '/';
}

export const handle: Handle = async ({ event, resolve }) => {
	const { url, cookies } = event;

	// Get tokens from cookies
	const jwtToken = cookies.get('hr_token') || cookies.get('auth-token');
	const gelToken = cookies.get('gel-auth-token');

	// Initialize locals with RBAC properties
	event.locals.user = null;
	event.locals.isAuthenticated = false;
	event.locals.permissions = [];
	event.locals.roles = [];

	// Check GelDB token first
	if (gelToken) {
		try {
			// Verify GelDB token with our backend
			const response = await fetch(
				`${PUBLIC_API_URL || 'http://localhost:8080'}/api/v2/auth/verify-geldb`,
				{
					headers: {
						Authorization: `Bearer ${gelToken}`,
						'Content-Type': 'application/json'
					}
				}
			);

			if (response.ok) {
				const gelData = await response.json();
				if (gelData.success && gelData.user) {
					event.locals.user = gelData.user;
					event.locals.isAuthenticated = true;
					event.locals.permissions = gelData.user.permissions || [];
					event.locals.roles = gelData.user.roles || [];
					event.locals.token = gelToken;
				} else {
					// Token is invalid, clear it
					cookies.delete('gel-auth-token', { path: '/' });
				}
			} else {
				// Token is invalid, clear it
				cookies.delete('gel-auth-token', { path: '/' });
			}
		} catch (error) {
			console.error('GelDB token verification failed:', error);
			cookies.delete('gel-auth-token', { path: '/' });
		}
	} else if (jwtToken) {
		try {
			// Verify JWT token with backend using the correct endpoint
			const response = await fetch(
				`${PUBLIC_API_URL || 'http://localhost:8080'}/api/v2/auth/verify`,
				{
					headers: {
						Authorization: `Bearer ${jwtToken}`,
						'Content-Type': 'application/json'
					}
				}
			);

			if (response.ok) {
				const rbacData = await response.json();
				event.locals.user = rbacData.user;
				event.locals.isAuthenticated = true;
				event.locals.permissions = rbacData.permissions || [];
				event.locals.roles = rbacData.roles || [];
				event.locals.token = jwtToken; // Add token to locals for tRPC context
			} else {
				// Token is invalid, clear it
				cookies.delete('hr_token', { path: '/' });
				cookies.delete('auth-token', { path: '/' });
			}
		} catch (error) {
			console.error('SSR auth verification failed:', error);
			// Clear invalid tokens
			cookies.delete('hr_token', { path: '/' });
			cookies.delete('auth-token', { path: '/' });
		}
	}

	// Check if route requires authentication
	if (!isPublicRoute(url.pathname) && !event.locals.isAuthenticated) {
		// Redirect to login with return path
		const redirectTo = url.pathname + url.search;
		throw redirect(302, `/login?redirectTo=${encodeURIComponent(redirectTo)}`);
	}

	return resolve(event);
};
