import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	// Check if user is authenticated
	if (!locals.user) {
		throw redirect(303, '/auth/login?redirectTo=/dashboard/teams');
	}

	// Check if user has admin role or higher for teams management
	const userRole = locals.user.role;
	const allowedRoles = ['hr_manager', 'hr_admin', 'hr_super_admin', 'admin'];

	if (!allowedRoles.includes(userRole)) {
		throw redirect(303, '/unauthorized');
	}

	// Return user data for client-side use
	return {
		user: locals.user,
		permissions: locals.permissions || []
	};
};
