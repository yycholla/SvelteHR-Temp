// Server-side data loading for My Tasks page
// Feature: 028-task-system-expansion - Task T043
// Load tasks assigned to current user

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getUserPermissions } from '$lib/server/rbac-utils';

export const load: PageServerLoad = async (event) => {
	const { locals, cookies, url } = event;

	// Check authentication
	if (!locals.user) {
		throw error(401, { message: 'Authentication required' });
	}

	// Import required models
	const { createUserSession } = await import('$lib/models/user-session');
	const { createErrorResponse } = await import('$lib/models/error-response');

	// Create user session
	const userSession = createUserSession({
		userId: locals.user.id,
		// jwtToken is optional for session-based authentication
		roles: [locals.user.role || 'employee'],
		permissions: locals.permissions || [],
		expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
		metadata: {
			userEmail: locals.user.email,
			displayName: locals.user.display_name || locals.user.email
		}
	});

	// Extract filter parameters
	const statusFilter = url.searchParams.get('status') || '';
	const priorityFilter = url.searchParams.get('priority') || '';
	const searchTerm = url.searchParams.get('search') || '';

	try {
		const { getGraphQLEndpoint } = await import('$lib/server/api-url');
		const graphqlEndpoint = getGraphQLEndpoint();

		// Get JWT token from cookies for authentication

		// Headers for session-based authentication (cookies sent automatically)
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
		};

		console.log('[My Tasks] Loading tasks for user:', locals.user.id);

		// Load user's tasks
		// NOTE: Rust GraphQL schema uses TaskFilter input object
		// Status/priority filtering will be done client-side
		const tasksResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetMyTasks($filter: TaskFilter!, $limit: Int!, $offset: Int!) {
						tasks(filter: $filter, limit: $limit, offset: $offset) {
							id
							title
							description
							status
							priority
							dueDate
							requiresManualReassignment
							archived
							createdAt
							updatedAt
							assignee {
								id
								displayName
								email
							}
							creator {
								id
								displayName
								email
							}
							taskType {
								id
								name
							}
							parentTask {
								id
								title
								status
							}
						}
					}
				`,
				variables: {
					filter: { assigneeId: locals.user.id },
					limit: 100,
					offset: 0
				}
			})
		});

		const tasksData = await tasksResponse.json();
		console.log('[My Tasks] Tasks response:', tasksData);

		if (tasksData.errors) {
			console.error('[My Tasks] GraphQL errors:', tasksData.errors);
			throw new Error(tasksData.errors[0]?.message || 'Failed to load tasks');
		}

		let tasks = tasksData?.data?.tasks || [];

		// Client-side filtering for status
		if (statusFilter) {
			// NOTE: Rust GraphQL returns enum values in SCREAMING_SNAKE_CASE
			// Convert filter to uppercase to match
			const statusUpper = statusFilter.toUpperCase().replace('-', '_');
			tasks = tasks.filter((task: any) => task.status === statusUpper);
		}

		// Client-side filtering for priority
		if (priorityFilter) {
			const priorityUpper = priorityFilter.toUpperCase();
			tasks = tasks.filter((task: any) => task.priority === priorityUpper);
		}

		// Client-side search filtering
		if (searchTerm) {
			const searchLower = searchTerm.toLowerCase();
			tasks = tasks.filter((task: any) => {
				const title = task.title?.toLowerCase() || '';
				const description = task.description?.toLowerCase() || '';
				return title.includes(searchLower) || description.includes(searchLower);
			});
		}

		// Calculate task statistics
		// NOTE: Rust GraphQL returns enum values in SCREAMING_SNAKE_CASE (async-graphql default)
		// Database stores: 'todo', 'in_progress', etc. (lowercase)
		// GraphQL returns: 'TODO', 'IN_PROGRESS', etc. (uppercase)
		const taskStats = {
			total: tasks.length,
			notStarted: tasks.filter((t: any) => t.status === 'TODO').length,
			inProgress: tasks.filter((t: any) => t.status === 'IN_PROGRESS').length,
			blocked: tasks.filter((t: any) => t.status === 'BLOCKED').length,
			review: tasks.filter((t: any) => t.status === 'REVIEW').length,
			completed: tasks.filter((t: any) => t.status === 'DONE').length,
			overdue: tasks.filter((t: any) => {
				if (!t.dueDate) return false;
				return new Date(t.dueDate) < new Date() && t.status !== 'DONE';
			}).length
		};

		// Get standardized user permissions
		const userPermissions = getUserPermissions(locals);

		return {
			user: userPermissions.user,
			userSession: userSession.toJSON(),
			tasks,
			totalTasks: tasks.length,
			taskStats,
			filters: {
				searchTerm,
				statusFilter,
				priorityFilter
			},
			...userPermissions,
			loadedAt: new Date().toISOString()
		};
	} catch (err) {
		console.error('[My Tasks Load Error]', err);

		const errorResponse = createErrorResponse(
			err instanceof Error ? err : new Error('My tasks load failed'),
			{
				type: 'DATA_LOAD_ERROR',
				userMessage: 'Unable to load your tasks. Please refresh the page or try again later.'
			}
		);

		console.error('[My Tasks Error Details]', {
			userId: locals.user?.id,
			error: errorResponse
		});

		throw error(500, {
			message: 'My tasks temporarily unavailable',
			details: errorResponse.userMessage
		});
	}
};
