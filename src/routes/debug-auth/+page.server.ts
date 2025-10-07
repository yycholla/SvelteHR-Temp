// Debug authentication status
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, cookies }) => {
	const hrToken = cookies.get('hr_token');
	const postgraphileToken = cookies.get('postgraphile-jwt-token');

	return {
		hasHrToken: !!hrToken,
		hasPostgraphileToken: !!postgraphileToken,
		hrTokenPreview: hrToken ? hrToken.substring(0, 50) + '...' : null,
		localsUser: locals.user || null,
		localsRoles: locals.roles || [],
		localsPermissions: locals.permissions || []
	};
};
