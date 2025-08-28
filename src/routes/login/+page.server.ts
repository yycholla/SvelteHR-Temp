import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	// Clear any incompatible authentication cookies on login page load
	// This prevents conflicts with NextAuth or other auth systems
	
	// Clear NextAuth cookies if present
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
	
	// Check if user has a valid auth token
	const authToken = cookies.get('hr_token');
	if (authToken) {
		try {
			// Validate token format (basic check)
			const parts = authToken.split('.');
			if (parts.length !== 3) {
				// Invalid token format, clear it
				cookies.delete('hr_token', { 
					path: '/',
					httpOnly: true,
					secure: true,
					sameSite: 'strict'
				});
			}
		} catch (error) {
			// Clear invalid token
			cookies.delete('hr_token', { 
				path: '/',
				httpOnly: true,
				secure: true,
				sameSite: 'strict'
			});
		}
	}
	
	// Return empty data - the client will handle the login form
	return {
		// You can add any initial data here if needed
	};
};