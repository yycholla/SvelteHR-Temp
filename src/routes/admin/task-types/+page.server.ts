// Task Types Management admin page - server-side data loading
// Admin-only page for managing task types

import type { PageServerLoad } from './$types';
import { logger } from '$lib/utils/logger';
import { createUrqlClient, executeQuery, serializeCookies } from '$lib/graphql/client';
import { PermissionChecks } from '$lib/server/rbac-utils';
import { GET_TASK_TYPES } from '$lib/graphql/tasks-operations';

interface TaskTypeRecord {
	id: string;
	name: string;
	description?: string | null;
	defaultPriority?: string | null;
	colorCode?: string | null;
	isActive: boolean;
	createdAt?: string;
}

export const load: PageServerLoad = async (event) => {
	const { cookies, fetch: fetchFn } = event;

	// Check authentication and permissions
	PermissionChecks.adminRead(event);

	try {
		// Create GraphQL client with server-side fetch and forward session cookies
		const cookieHeader = serializeCookies(cookies);
		const client = createUrqlClient(fetchFn, undefined, undefined, cookieHeader);

		// Fetch all task types (both active and inactive for admin management)
		const taskTypesData = await executeQuery(client, GET_TASK_TYPES, { isActive: null });

		const taskTypes: TaskTypeRecord[] = taskTypesData?.taskTypes || [];

		// Sort by name for better UI
		const sortedTaskTypes = taskTypes.sort((a, b) => a.name.localeCompare(b.name));

		return {
			taskTypes: sortedTaskTypes,
			totalCount: sortedTaskTypes.length
		};
	} catch (err) {
		logger.error('[ADMIN TASK TYPES] Load error:', err as Error);
		return {
			taskTypes: [],
			totalCount: 0,
			error: 'Failed to load task types'
		};
	}
};
