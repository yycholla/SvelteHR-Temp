// Server-side data loading for tasks dashboard page
// Feature: 028-task-system-expansion - Task T035
// Server-side route with RBAC, GraphQL data loading, and filter handling

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { PermissionChecks, getUserPermissions } from '$lib/server/rbac-utils';

export const load: PageServerLoad = async (event) => {
	const { locals, cookies, url } = event;

	// RBAC: Check task read permissions
	// Note: PermissionChecks will throw error if user doesn't have permission
	try {
		// For now, we'll allow all authenticated users to read tasks
		// Later, implement specific task permission checks
		if (!locals.user) {
			throw error(401, { message: 'Authentication required' });
		}
	} catch (err) {
		console.error('[Tasks Dashboard] Permission check failed:', err);
		throw error(403, { message: 'Insufficient permissions to view tasks' });
	}

	// Import required models for standardized error handling
	const { createDataRequest } = await import('$lib/models/data-request');
	const { createErrorResponse } = await import('$lib/models/error-response');
	const { createUserSession } = await import('$lib/models/user-session');

	// Create user session from server locals
	const userSession = createUserSession({
		userId: locals.user.id,
		jwtToken: cookies.get('hr_token') || '',
		roles: [locals.user.role || 'employee'],
		permissions: locals.permissions || [],
		expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
		metadata: {
			userEmail: locals.user.email,
			displayName: locals.user.display_name || locals.user.email
		}
	});

	// Extract search and filter parameters from URL
	const searchTerm = url.searchParams.get('search') || '';
	const statusFilter = url.searchParams.get('status') || ''; // Empty = all statuses
	const priorityFilter = url.searchParams.get('priority') || '';
	const assigneeFilter = url.searchParams.get('assignee') || '';
	const taskTypeFilter = url.searchParams.get('taskType') || '';
	const dueDateStart = url.searchParams.get('dueDateStart') || '';
	const dueDateEnd = url.searchParams.get('dueDateEnd') || '';
	const hasParent = url.searchParams.get('hasParent'); // null, 'true', or 'false'
	const page = parseInt(url.searchParams.get('page') || '1', 10);
	const limit = parseInt(url.searchParams.get('limit') || '20', 10);

	// Create data request for task dashboard
	const dataRequest = createDataRequest({
		operationName: 'GetTaskDashboard',
		variables: {
			searchTerm,
			statusFilter,
			priorityFilter,
			assigneeFilter,
			taskTypeFilter,
			dueDateStart,
			dueDateEnd,
			hasParent,
			page,
			limit
		},
		userCredentials: {
			userId: userSession.userId,
			userEmail: userSession.metadata.userEmail as string,
			roles: userSession.roles,
			permissions: userSession.permissions,
			jwtToken: userSession.jwtToken,
			isAuthenticated: Boolean(userSession.isAuthenticated)
		},
		timeoutMs: 5000,
		retryAttempts: 0,
		maxRetries: 3
	});

	try {
		// Make direct GraphQL calls to PostGraphile backend
		const { getGraphQLEndpoint } = await import('$lib/server/api-url');
		const graphqlEndpoint = getGraphQLEndpoint();

		// Simple headers without JWT authentication (using table-based RLS)
		const headers: Record<string, string> = {
			'Content-Type': 'application/json'
		};

		console.log('[Tasks Dashboard] User role:', locals.user?.role);
		console.log('[Tasks Dashboard] Filters:', {
			searchTerm,
			statusFilter,
			priorityFilter,
			assigneeFilter,
			taskTypeFilter,
			dueDateStart,
			dueDateEnd,
			hasParent
		});

		// Build filter condition
		const condition: any = {};

		if (statusFilter) {
			condition.status = statusFilter;
		}

		if (priorityFilter) {
			condition.priority = priorityFilter;
		}

		if (assigneeFilter) {
			condition.assigneeId = assigneeFilter;
		}

		if (taskTypeFilter) {
			condition.taskTypeId = taskTypeFilter;
		}

		// Handle parent task filter
		if (hasParent === 'true') {
			// Only subtasks (has parent)
			condition.parentTaskId = { isNull: false };
		} else if (hasParent === 'false') {
			// Only top-level tasks (no parent)
			condition.parentTaskId = { isNull: true };
		}

		// Load tasks with full relationships
		// NOTE: Query updated to match new task schema (Feature 028)
		// Removed: reminderTime, organizationId (fields don't exist in new schema)
		const tasksResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetTasksForDashboard($first: Int, $offset: Int, $condition: TaskCondition) {
						allTasks(
							first: $first
							offset: $offset
							condition: $condition
							orderBy: [DUE_DATE_ASC, CREATED_AT_DESC]
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
								taskDependenciesByBlockingTaskId {
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
								startCursor
								endCursor
							}
							totalCount
						}
					}
				`,
				variables: {
					first: limit,
					offset: 0,
					condition: Object.keys(condition).length > 0 ? condition : null
				}
			})
		});

		const tasksData = await tasksResponse.json();
		console.log('[Tasks Dashboard] Tasks response:', tasksData);

		if (tasksData.errors) {
			console.error('[Tasks Dashboard] GraphQL errors:', tasksData.errors);
			throw new Error(tasksData.errors[0]?.message || 'Failed to load tasks');
		}

		let tasks = tasksData?.data?.allTasks?.nodes || [];

		// Client-side filtering for search term
		if (searchTerm) {
			const searchLower = searchTerm.toLowerCase();
			tasks = tasks.filter((task: any) => {
				const title = task.title?.toLowerCase() || '';
				const description = task.description?.toLowerCase() || '';
				return title.includes(searchLower) || description.includes(searchLower);
			});
		}

		// Client-side filtering for due date range
		if (dueDateStart || dueDateEnd) {
			tasks = tasks.filter((task: any) => {
				if (!task.dueDate) return false;
				const taskDate = new Date(task.dueDate);
				if (dueDateStart && taskDate < new Date(dueDateStart)) return false;
				if (dueDateEnd && taskDate > new Date(dueDateEnd)) return false;
				return true;
			});
		}

		// Load assignees (users) for filter dropdown
		const assigneesResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetUsersForAssigneeFilter($first: Int) {
						allUsers(first: $first, condition: { is_active: true }) {
							nodes {
								id
								displayName
								email
								role
							}
						}
					}
				`,
				variables: {
					first: 100
				}
			})
		});

		const assigneesData = await assigneesResponse.json();

		// Load task types for filter dropdown
		const taskTypesResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetTaskTypesForFilter($first: Int) {
						allTaskTypes(first: $first) {
							nodes {
								id
								name
								description
							}
						}
					}
				`,
				variables: {
					first: 100
				}
			})
		});

		const taskTypesData = await taskTypesResponse.json();

		// Get standardized user permissions
		const userPermissions = getUserPermissions(locals);

		// Calculate task statistics
		// NOTE: PostGraphile returns enum values in GraphQL format (SCREAMING_SNAKE_CASE)
		// Database stores: 'To Do', 'In Progress', etc.
		// GraphQL returns: 'TO_DO', 'IN_PROGRESS', etc.
		const taskStats = {
			total: tasks.length,
			notStarted: tasks.filter((t: any) => t.status === 'TO_DO').length,
			inProgress: tasks.filter((t: any) => t.status === 'IN_PROGRESS').length,
			blocked: tasks.filter((t: any) => t.status === 'BLOCKED').length,
			deferred: tasks.filter((t: any) => t.status === 'DEFERRED').length,
			completed: tasks.filter((t: any) => t.status === 'COMPLETED').length
		};

		// Return server-side loaded data
		return {
			user: userPermissions.user,
			userSession: userSession.toJSON(),
			tasks,
			totalTasks: tasks.length,
			assignees: assigneesData?.data?.allUsers?.nodes || [],
			taskTypes: taskTypesData?.data?.allTaskTypes?.nodes || [],
			taskStats,
			filters: {
				searchTerm,
				statusFilter,
				priorityFilter,
				assigneeFilter,
				taskTypeFilter,
				dueDateStart,
				dueDateEnd,
				hasParent,
				page,
				limit
			},
			...userPermissions,
			loadedAt: new Date().toISOString()
		};
	} catch (err) {
		console.error('[Tasks Dashboard Load Error]', err);

		// Create standardized error response
		const errorResponse = createErrorResponse(
			err instanceof Error ? err : new Error('Tasks dashboard load failed'),
			{
				type: 'DATA_LOAD_ERROR',
				userMessage: 'Unable to load tasks dashboard. Please refresh the page or try again later.'
			}
		);

		// Log error details for debugging
		console.error('[Tasks Dashboard Error Details]', {
			userId: locals.user?.id,
			userRole: locals.user?.role,
			filters: { searchTerm, statusFilter, priorityFilter },
			error: errorResponse
		});

		// Throw SvelteKit error with user-friendly message
		throw error(500, {
			message: 'Tasks dashboard temporarily unavailable',
			details: errorResponse.userMessage
		});
	}
};
