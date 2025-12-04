// Profile edit page - redirects to employee edit page with current user's ID
import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { PermissionChecks } from '$lib/server/rbac-utils';

export const load: PageServerLoad = async (event) => {
	const { locals } = event;

	// Check authentication and permissions
	PermissionChecks.employeeWrite(event);

	// Redirect to employee edit page with current user's ID
	redirect(303, `/dashboard/employees/${locals.user.id}/edit`);
};
