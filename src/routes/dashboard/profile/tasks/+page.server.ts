// Profile tasks page - redirects to user tasks page with current user's ID
import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/rbac-utils';

export const load: PageServerLoad = async (event) => {
	// Check authentication and permissions
	requireAuth(event, {
		requiredPermissions: ['tasks:read', 'tasks:read:self', 'tasks:read:team', 'tasks:read:all']
	});

	// After permission check, re-destructure locals with guaranteed user
	const { locals } = event;

	// Redirect to user tasks page with current user's ID
	redirect(303, `/dashboard/users/${locals.user.id}/tasks`);
};
