// Profile leave request page - redirects to user leave request page with current user's ID
import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { PermissionChecks } from '$lib/server/rbac-utils';

export const load: PageServerLoad = async (event) => {
	const { locals } = event;

	// Check authentication and permissions
	PermissionChecks.leaveRead(event);

	// Redirect to user leave request page with current user's ID
	redirect(303, `/dashboard/users/${locals.user.id}/leave/new`);
};
