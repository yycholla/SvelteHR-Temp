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
		jwtToken: cookies.get('hr_token') || '',
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

		const headers: Record<string, string> = {
			'Content-Type': 'application/json'
		};

		console.log('[My Tasks] Loading tasks for user:', locals.user.id);

		// Build filter condition - always filter by current user
		const condition: any = {
			assigneeId: locals.user.id
		};

		if (statusFilter) {
			condition.status = statusFilter;
		}

		if (priorityFilter) {
			condition.priority = priorityFilter;
		}

		// Load user's tasks
		// NOTE: Query updated to match new task schema (Feature 028)
		// Removed: reminderTime (field doesn't exist in new schema)
		const tasksResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetMyTasks($first: Int, $condition: TaskCondition) {
						allTasks(
							first: $first
							condition: $condition
							orderBy: [DUE_DATE_ASC, PRIORITY_DESC, CREATED_AT_DESC]
						) {
							nodes {
								id
								nodeId
								title
								description
								status
								priority
								dueDate
								assigneeId
								creatorId
								taskTypeId
								parentTaskId
								requiresManualReassignment
								archived
								createdAt
								updatedAt
								userByAssigneeId {
									id
									displayName
									email
								}
								userByCreatorId {
									id
									displayName
									email
								}
								taskTypeByTaskTypeId {
									id
									name
									description
									isSystem
								}
								taskByParentTaskId {
									id
									title
									status
								}
								tasksByParentTaskId {
									totalCount
								}
								taskDependenciesByBlockedTaskId {
									totalCount
									nodes {
										id
										blockingTaskId
										taskByBlockingTaskId {
											id
											title
											status
										}
									}
								}
							}
							pageInfo {
								hasNextPage
								hasPreviousPage
							}
							totalCount
						}
					}
				`,
				variables: {
					first: 100,
					condition: Object.keys(condition).length > 0 ? condition : null
				}
			})
		});

		const tasksData = await tasksResponse.json();

		if (tasksData.errors) {
			console.error('[My Tasks] GraphQL errors:', tasksData.errors);
			throw new Error(tasksData.errors[0]?.message || 'Failed to load tasks');
		}

		let tasks = tasksData?.data?.allTasks?.nodes || [];

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
		const taskStats = {
			total: tasks.length,
			notStarted: tasks.filter((t: any) => t.status === 'Not Started').length,
			inProgress: tasks.filter((t: any) => t.status === 'In Progress').length,
			blocked: tasks.filter((t: any) => t.status === 'Blocked').length,
			completed: tasks.filter((t: any) => t.status === 'Completed').length,
			overdue: tasks.filter((t: any) => {
				if (!t.dueDate) return false;
				return new Date(t.dueDate) < new Date() && t.status !== 'Completed';
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
