// Profile page - redirects to employee detail page with current user's ID
import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/rbac-utils';

export const load: PageServerLoad = async (event) => {
	// Check authentication and permissions
	requireAuth(event, {
		requiredPermissions: ['employees:read', 'employees:read:self', 'employees:read:team', 'employees:read:all']
	});

	// After permission check, re-destructure locals with guaranteed user
	const { locals } = event;

	// Redirect to employee detail page with current user's ID
	redirect(303, `/dashboard/employees/${locals.user.id}`);
};
