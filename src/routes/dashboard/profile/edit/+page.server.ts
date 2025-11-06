// Profile edit page - redirects to employee edit page with current user's ID
import type { PageServerLoad } from './$types';
import { redirect, error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	// Ensure user is authenticated
	if (!locals.user || !locals.user.id) {
		error(401, 'Authentication required');
	}

	// Redirect to employee edit page with current user's ID
	redirect(303, `/dashboard/employees/${locals.user.id}/edit`);
};
