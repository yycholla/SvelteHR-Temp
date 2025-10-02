// Profile page - redirects to employee detail page with current user's ID
import type { PageServerLoad } from './$types';
import { redirect, error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	// Ensure user is authenticated
	if (!locals.user || !locals.user.id) {
		throw error(401, 'Authentication required');
	}

	// Redirect to employee detail page with current user's ID
	throw redirect(303, `/dashboard/employees/${locals.user.id}`);
};
