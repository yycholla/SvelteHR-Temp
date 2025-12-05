// Profile edit page - redirects to employee edit page with current user's ID
import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/rbac-utils';

export const load: PageServerLoad = async (event) => {
	// Check authentication and permissions
	requireAuth(event, {
		requiredPermissions: ['employees:write', 'employees:write:self', 'employees:write:team', 'employees:write:all']
	});

	// After permission check, re-destructure locals with guaranteed user
	const { locals } = event;

	// Redirect to employee edit page with current user's ID
	redirect(303, `/dashboard/employees/${locals.user.id}/edit`);
};
