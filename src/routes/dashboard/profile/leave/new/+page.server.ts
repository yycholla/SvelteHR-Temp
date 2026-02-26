// Profile leave request page - redirects to user leave request page with current user's ID
import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { requireAuth, AccessTier } from '$lib/server/rbac-utils';

export const load: PageServerLoad = async (event) => {
	// Check authentication and permissions
	requireAuth(event, { minTier: AccessTier.SELF });

	// After permission check, re-destructure locals with guaranteed user
	const { locals } = event;

	// Redirect to user leave request page with current user's ID
	redirect(303, `/dashboard/users/${locals.user.id}/leave/new`);
};
