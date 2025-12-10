// Server-side data loading for tasks dashboard page
// Feature: 028-task-system-expansion - Task T035
// Server-side route with RBAC, GraphQL data loading, and filter handling

import type { Actions, PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';
import { getUserPermissions, requireAuth } from '$lib/server/rbac-utils';

export const load: PageServerLoad = async (event) => {
	const { cookies, url } = event;

	// RBAC: Check task read permissions
	// All Tasks page requires admin-level access (tasks:read:all)
	// Managers and employees should use My Tasks and Team Tasks instead
	requireAuth(event, {
		requiredPermissions: ['tasks:read:all', 'admin:read']
	});

	// After permission check, re-destructure locals with guaranteed user
	const { locals } = event;

	// Import required models for standardized error handling
	const { createDataRequest } = await import('$lib/models/data-request');
	const { createErrorResponse } = await import('$lib/models/error-response');
	const { createUserSession } = await import('$lib/models/user-session');

	// Create user session from server locals (session-based auth, no JWT token)
	const userSession = createUserSession({
		userId: locals.user.id,
		// jwtToken is optional for session-based authentication
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
			roles: userSession.roles,
			permissions: userSession.permissions,
			// jwtToken omitted for session-based auth
			isAuthenticated: Boolean(userSession.isAuthenticated),
			expiresAt: userSession.expiresAt
		},
		timeoutMs: 5000
	});

	try {
		// Make direct GraphQL calls to Rust GraphQL backend
		const { getGraphQLEndpoint } = await import('$lib/server/api-url');
		const graphqlEndpoint = getGraphQLEndpoint();

		// Headers for session-based authentication (cookies sent automatically)
		const headers: Record<string, string> = {
			'Content-Type': 'application/json'
		};

		console.log('[Tasks Dashboard] User role:', locals.user?.role, '(session-based auth)');
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

		// Load tasks with full relationships
		// NOTE: Rust GraphQL backend does NOT support filter parameter
		// Fetch all tasks and filter client-side
		const tasksResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetTasksForDashboard($limit: Int!, $offset: Int!) {
						tasks(limit: $limit, offset: $offset) {
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
							department {
								id
								name
								description
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
					limit: 1000, // Fetch large dataset for client-side filtering
					offset: 0
				}
			})
		});

		const tasksData = await tasksResponse.json();
		console.log('[Tasks Dashboard] Tasks response:', tasksData);

		if (tasksData.errors) {
			console.error('[Tasks Dashboard] GraphQL errors:', tasksData.errors);
			throw new Error(tasksData.errors[0]?.message || 'Failed to load tasks');
		}

		let tasks = tasksData?.data?.tasks || [];

		// Client-side filtering for status (Rust backend doesn't support filter parameter)
		if (statusFilter) {
			const statusUpper = statusFilter.toUpperCase().replace('-', '_');
			tasks = tasks.filter((task: any) => task.status === statusUpper);
		}

		// Client-side filtering for priority
		if (priorityFilter) {
			const priorityUpper = priorityFilter.toUpperCase();
			tasks = tasks.filter((task: any) => task.priority === priorityUpper);
		}

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

		// Client-side filtering for parent task
		if (hasParent === 'true') {
			// Only subtasks (has parent)
			tasks = tasks.filter((task: any) => task.parentTask != null);
		} else if (hasParent === 'false') {
			// Only top-level tasks (no parent)
			tasks = tasks.filter((task: any) => task.parentTask == null);
		}

		// Client-side filtering for assignee
		if (assigneeFilter) {
			tasks = tasks.filter((task: any) => task.assignee?.id === assigneeFilter);
		}

		// Client-side filtering for task type
		if (taskTypeFilter) {
			tasks = tasks.filter((task: any) => task.taskType?.id === taskTypeFilter);
		}

		// Load assignees (users) for filter dropdown
		const assigneesResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetUsersForAssigneeFilter($limit: Int!) {
						users(limit: $limit) {
							id
							displayName
							email
							roles {
								id
								name
							}
						}
					}
				`,
				variables: {
					limit: 100
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
					query GetTaskTypesForFilter($isActive: Boolean) {
						taskTypes(isActive: $isActive) {
							id
							name
							description
							defaultPriority
							colorCode
							isActive
						}
					}
				`,
				variables: {
					limit: 100
				}
			})
		});

		const taskTypesData = await taskTypesResponse.json();

		// Get standardized user permissions
		const userPermissions = getUserPermissions(locals);

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
			completed: tasks.filter((t: any) => t.status === 'DONE').length
		};

		// Return server-side loaded data
		return {
			userSession: userSession.toJSON(),
			tasks,
			totalTasks: tasks.length,
			assignees: assigneesData?.data?.users || [],
			taskTypes: taskTypesData?.data?.taskTypes || [],
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
			// RBAC: Standardized permission checks (includes user property)
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

		// Return safe fallback data instead of crashing
		return {
			userSession: userSession.toJSON(),
			tasks: [],
			totalTasks: 0,
			assignees: [],
			taskTypes: [],
			taskStats: {
				total: 0,
				notStarted: 0,
				inProgress: 0,
				blocked: 0,
				review: 0,
				completed: 0
			},
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
			// Default permissions if loading failed (includes user property)
			...getUserPermissions(locals),
			loadedAt: new Date().toISOString(),
			error: errorResponse.userMessage
		};
	}
};

export const actions: Actions = {
	default: async (event) => {
		const { request } = event;

		// Check authentication
		requireAuth(event, {
			requiredPermissions: [
				'tasks:write',
				'tasks:write:self',
				'tasks:write:team',
				'tasks:write:all'
			]
		});

		// After permission check, re-destructure locals
		const { locals } = event;

		try {
			const formData = await request.formData();
			const { getGraphQLEndpoint, authenticatedGraphQLRequest } =
				await import('$lib/server/api-url');
			const graphqlEndpoint = getGraphQLEndpoint();

			// Extract form data
			const title = formData.get('title') as string;
			const description = formData.get('description') as string | null;
			const priority = (formData.get('priority') as string) || 'MEDIUM';
			const assigneeId = formData.get('assigneeId') as string;
			const taskTypeId = formData.get('taskTypeId') as string | null;
			const parentTaskId = formData.get('parentTaskId') as string | null;
			const dueDate = formData.get('dueDate') as string | null;

			console.log('[Quick Add Task] Creating task:', {
				title,
				priority,
				assigneeId,
				dueDate,
				taskTypeId,
				parentTaskId
			});

			// Prepare create input for Rust GraphQL schema
			const createInput: Record<string, any> = {
				title,
				status: 'TODO', // Default status for quick-add
				priority,
				assigneeId,
				requiresManualReassignment: false
			};

			// Only include optional fields if they have valid values
			if (description && description.trim()) {
				createInput.description = description;
			}
			if (taskTypeId && taskTypeId.trim()) {
				createInput.taskTypeId = taskTypeId;
			}
			if (parentTaskId && parentTaskId.trim()) {
				createInput.parentTaskId = parentTaskId;
			}
			if (dueDate && dueDate.trim()) {
				// GraphQL expects full datetime, add end of day
				createInput.dueDate = `${dueDate}T23:59:59Z`;
			}

			// Execute create mutation
			const createResponse = await authenticatedGraphQLRequest(
				graphqlEndpoint,
				`
					mutation CreateTask($input: CreateTaskInput!) {
						createTask(input: $input) {
							id
							title
							status
							createdAt
						}
					}
				`,
				{ input: createInput },
				event.request
			);

			const createData = await createResponse.json();

			if (createData.errors) {
				console.error('[Quick Add Task] Create errors:', createData.errors);
				return fail(400, {
					error: createData.errors[0]?.message || 'Failed to create task'
				});
			}

			const newTask = createData?.data?.createTask;

			if (!newTask) {
				return fail(400, {
					error: 'Task creation failed'
				});
			}

			console.log('[Quick Add Task] Task created successfully:', newTask.id);

			return {
				success: true,
				taskId: newTask.id
			};
		} catch (err) {
			console.error('[Quick Add Task] Create error:', err);

			return fail(500, {
				error: err instanceof Error ? err.message : 'Failed to create task'
			});
		}
	}
};
