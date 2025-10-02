// My Tasks Page Server-Side Data Loading
// Feature: 019-we-need-to - Task T026
// Purpose: Load user's assigned tasks with server-side GraphQL queries

import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { TasksOperations } from '$lib/graphql/tasks-operations';
import { createUrqlClient } from '$lib/graphql/client';
import type { TaskStatus, TaskPriority } from '$lib/graphql/types';

export const load: PageServerLoad = async ({ locals, url, cookies }) => {
	// Check authentication
	if (!locals.user) {
		throw redirect(303, `/login?redirectTo=${url.pathname}`);
	}

	// Get user credentials for GraphQL operations
	const token = cookies.get('hr_token') || cookies.get('auth-token');
	if (!token) {
		throw redirect(303, `/login?redirectTo=${url.pathname}`);
	}

	const userCredentials = {
		jwtToken: token,
		userId: locals.user.id,
		roles: locals.roles || [],
		permissions: locals.permissions || [],
		isAuthenticated: true,
		expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
	};

	try {
		// Initialize GraphQL client and operations
		// For server-side: createUrqlClient(fetchFn?, authToken?)
		const urqlClient = createUrqlClient(undefined, token);
		const tasksOps = new TasksOperations(urqlClient);

		// Get query parameters for filtering and sorting
		const statusFilter = url.searchParams.get('status') as TaskStatus | null;
		const priorityFilter = url.searchParams.get('priority') as TaskPriority | null;
		const sortBy = url.searchParams.get('sort') || 'priority';
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = parseInt(url.searchParams.get('limit') || '20');

		// Build filter for user's assigned tasks
		// PostGraphile's TaskCondition expects direct values, not wrapped in equalTo
		const filter: any = {
			assigneeId: locals.user.id
		};

		if (statusFilter) {
			filter.status = statusFilter;
		}

		if (priorityFilter) {
			filter.priority = priorityFilter;
		}

		// Determine sort order
		let orderBy: any = ['PRIORITY_DESC', 'DUE_DATE_ASC'];
		if (sortBy === 'dueDate') {
			orderBy = ['DUE_DATE_ASC', 'PRIORITY_DESC'];
		} else if (sortBy === 'created') {
			orderBy = ['CREATED_AT_DESC'];
		} else if (sortBy === 'status') {
			orderBy = ['STATUS_ASC', 'PRIORITY_DESC'];
		}

		// Fetch user's tasks using getDepartmentTasks
		const tasksResult = await tasksOps.getDepartmentTasks({
			first: limit,
			offset: (page - 1) * limit,
			filter,
			userCredentials
		});

		// Get task statistics for the user
		const allUserTasksResult = await tasksOps.getDepartmentTasks({
			first: 1000, // Get all for statistics
			offset: 0,
			filter: {
				assigneeId: locals.user.id
			},
			userCredentials
		});

		return {
			tasks: tasksResult.tasks,
			totalCount: tasksResult.totalCount,
			hasNextPage: tasksResult.hasNextPage,
			allTasks: allUserTasksResult.tasks, // For statistics calculation
			currentPage: page,
			limit,
			filters: {
				status: statusFilter,
				priority: priorityFilter,
				sortBy
			},
			user: locals.user
		};
	} catch (err: any) {
		console.error('Error loading tasks:', err);

		// Handle specific error cases
		if (err.message?.includes('unauthorized') || err.message?.includes('authentication')) {
			throw redirect(303, `/login?redirectTo=${url.pathname}`);
		}

		throw error(500, {
			message: 'Failed to load tasks. Please try again later.'
		});
	}
};
