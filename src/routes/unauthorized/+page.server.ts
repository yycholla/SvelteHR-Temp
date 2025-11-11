// T012: Server-side data for unauthorized page
// Provides user context for displaying permission denial information

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	// Get the URL the user attempted to access
	const attemptedUrl = url.searchParams.get('from') || '';

	// Return user info if available (may be null if not authenticated)
	return {
		user: locals.user
			? {
					id: locals.user.id,
					email: locals.user.email,
					displayName: locals.user.display_name || locals.user.email,
					role: locals.roles?.[0] || 'Unknown'
				}
			: null,
		attemptedUrl
	};
};
