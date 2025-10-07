import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	// Pass user data from locals to all pages
	return {
		user: locals.user || null,
		roles: locals.roles || [],
		permissions: locals.permissions || []
	};
};
