import type { Actions, PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { requireAuth, AccessTier } from '$lib/server/rbac-utils';

/**
 * Legacy route retained for backwards compatibility.
 * Task creation is now handled by quick-add flows on task pages.
 */
export const load: PageServerLoad = async (event) => {
	requireAuth(event, { minTier: AccessTier.SELF });

	const parentTaskId = event.url.searchParams.get('parent');
	if (parentTaskId) {
		throw redirect(303, `/dashboard/tasks/${parentTaskId}`);
	}

	throw redirect(303, '/dashboard/tasks/my-tasks');
};

export const actions: Actions = {
	default: async (event) => {
		requireAuth(event, { minTier: AccessTier.SELF });
		throw redirect(303, '/dashboard/tasks/my-tasks');
	}
};
