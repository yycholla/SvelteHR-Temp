import type { Actions, PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/rbac-utils';

const TASK_WRITE_PERMISSIONS = [
	'tasks:write',
	'tasks:write:self',
	'tasks:write:team',
	'tasks:write:all'
];

/**
 * Legacy route retained for backwards compatibility.
 * Task creation is now handled by quick-add flows on task pages.
 */
export const load: PageServerLoad = async (event) => {
	requireAuth(event, { requiredPermissions: TASK_WRITE_PERMISSIONS });

	const parentTaskId = event.url.searchParams.get('parent');
	if (parentTaskId) {
		throw redirect(303, `/dashboard/tasks/${parentTaskId}`);
	}

	throw redirect(303, '/dashboard/tasks/my-tasks');
};

export const actions: Actions = {
	default: async (event) => {
		requireAuth(event, { requiredPermissions: TASK_WRITE_PERMISSIONS });
		throw redirect(303, '/dashboard/tasks/my-tasks');
	}
};
