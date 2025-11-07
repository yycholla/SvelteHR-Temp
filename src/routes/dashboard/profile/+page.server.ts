// Profile page - redirects to employee detail page with current user's ID
import type { PageServerLoad } from './$types';
import { redirect, error } from '@sveltejs/kit';
import { PermissionChecks } from '$lib/server/rbac-utils';

export const load: PageServerLoad = async (event) => {
	const { locals } = event;

	// Check authentication and permissions
	PermissionChecks.employeeRead(event);

	// Redirect to employee detail page with current user's ID
	redirect(303, `/dashboard/employees/${locals.user.id}`);
};
