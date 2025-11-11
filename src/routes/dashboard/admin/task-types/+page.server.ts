// Task Types Management admin page - server-side data loading
// Admin-only page for managing task types

import type { PageServerLoad } from './$types';
import { createUrqlClient, executeQuery, serializeCookies } from '$lib/graphql/client';
import { PermissionChecks } from '$lib/server/rbac-utils';
import { GET_TASK_TYPES } from '$lib/graphql/tasks-operations';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async (event) => {
	const { locals, cookies, fetch: fetchFn } = event;

	// Check authentication and permissions
	PermissionChecks.adminRead(event);

	try {
		// Create GraphQL client with server-side fetch and forward session cookies
		const cookieHeader = serializeCookies(cookies);
		const client = createUrqlClient(fetchFn, undefined, undefined, cookieHeader);

		// Fetch all task types (both active and inactive for admin management)
		const taskTypesData = await executeQuery(client, GET_TASK_TYPES, { isActive: null });

		const taskTypes = taskTypesData?.taskTypes || [];

		// Sort by name for better UI
		const sortedTaskTypes = taskTypes.sort((a: any, b: any) =>
			a.name.localeCompare(b.name)
		);

		return {
			taskTypes: sortedTaskTypes,
			totalCount: sortedTaskTypes.length
		};
	} catch (err) {
		console.error('[ADMIN TASK TYPES] Load error:', err);
		return {
			taskTypes: [],
			totalCount: 0,
			error: 'Failed to load task types'
		};
	}
};
